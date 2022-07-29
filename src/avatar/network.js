createNameSpace("realityEditor.avatar.network");

(function(exports) {
    const DATA_SEND_FPS_LIMIT = 30;

    /**
     * Check if an object with this name exists on the server
     * @param {Objects} serverWorldObject
     * @param {string} objectName
     * @param {function} onDoesntExist
     * @param {function} onExists
     */
    exports.verifyObjectNameNotOnWorldServer = function(serverWorldObject, objectName, onDoesntExist, onExists) {
        let downloadUrl = realityEditor.network.getURL(serverWorldObject.ip, realityEditor.network.getPort(serverWorldObject), '/object/' + objectName);
        realityEditor.network.getData(null, null, null, downloadUrl, (objectKey, _frameKey, _nodeKey, msg) => {
            if (msg) {
                onExists(msg);
            } else {
                onDoesntExist();
            }
        });
    }

    /**
    * Tell the server (corresponding to this world object) to create a new avatar object with the specified ID
    * @param {string} worldId
    * @param {string} clientId
    * @param {function} onSuccess
    * @param {function} onError
    */
    exports.addAvatarObject = function(worldId, clientId, onSuccess, onError) {
        let worldObject = realityEditor.getObject(worldId);
        if (!worldObject) {
            console.warn('Unable to add avatar object because no world with ID: ' + worldId);
            return;
        }

        let postUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/');
        let params = {action: 'new', name: clientId, isAvatar: true, worldId: worldId};
        fetch(postUrl, {
            method: 'POST',
            body: params
        }).then(response => response.json())
            .then(onSuccess)
            .catch(onError);
    }
    
    exports.onAvatarDiscovered = function(callback) {
        // first check if any previously discovered objects are avatars
        for (let [objectKey, object] of Object.entries(objects)) {
            if (realityEditor.avatar.utils.isAvatarObject(object)) {
                callback(object, objectKey);
            }
        }
        
        // next, listen to newly discovered objects
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            if (realityEditor.avatar.utils.isAvatarObject(object)) {
                callback(object, objectKey);
            }
        });
    }
    
    let occlusionDownloadInterval = null;
    let cachedOcclusionObject = null;
    let cachedWorldObject = null;
    exports.onLoadOcclusionObject = function(callback) {
        occlusionDownloadInterval = setInterval(() => {
            if (!cachedWorldObject) {
                cachedWorldObject = realityEditor.worldObjects.getBestWorldObject();
            }
            if (!cachedWorldObject) {
                return;
            }
            if (cachedWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
                cachedWorldObject = null; // don't accept the local world object
            }
            if (cachedWorldObject && !cachedOcclusionObject) {
                cachedOcclusionObject = realityEditor.gui.threejsScene.getObjectForWorldRaycasts(cachedWorldObject.objectId);
                if (cachedOcclusionObject) {
                    // trigger the callback and clear the interval
                    callback(cachedWorldObject, cachedOcclusionObject);
                    clearInterval(occlusionDownloadInterval);
                    occlusionDownloadInterval = null;
                }
            }
        }, 1000);
    }

    let lastBroadcastPositionTimestamp = Date.now();
    let lastWritePublicDataTimestamp = Date.now();
    exports.realtimeSendAvatarPosition = function(avatarObject, matrix) {
        // only send a data update if the matrix has changed since last time
        if (avatarObject.matrix.length !== 16) { avatarObject.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
        let totalDifference = realityEditor.avatar.utils.sumOfElementDifferences(avatarObject.matrix, matrix);
        if (totalDifference < 0.00001) {
            return;
        }

        // already gets uploaded to server but isn't set locally yet
        avatarObject.matrix = matrix;

        // sceneGraph uploads object position to server every 1 second via REST, but we can stream updates in realtime here
        if (Date.now() - lastBroadcastPositionTimestamp < (1000 / DATA_SEND_FPS_LIMIT)) {
            return;
        }
        realityEditor.network.realtime.broadcastUpdate(avatarObject.objectId, null, null, 'matrix', matrix);
        lastBroadcastPositionTimestamp = Date.now();
    }

    exports.sendTouchState = function(keys, touchState, options) {
        let sendData = !(options && options.limitToFps) || (Date.now() - lastWritePublicDataTimestamp > (1000 / DATA_SEND_FPS_LIMIT));
        if (sendData) {
            realityEditor.network.realtime.writePublicData(keys.objectKey, keys.frameKey, keys.nodeKey, realityEditor.avatar.utils.PUBLIC_DATA_KEYS.touchState, touchState);
        }
        lastWritePublicDataTimestamp = Date.now();
    }
    
    exports.sendUserName = function(keys, name) {
        realityEditor.network.realtime.writePublicData(keys.objectKey, keys.frameKey, keys.nodeKey, realityEditor.avatar.utils.PUBLIC_DATA_KEYS.username, {
            name: name
        });
    }

    let pendingSubscriptions = {};

    // if we discover other avatar objects before we're localized in a world, queue them up to be initialized later
    exports.checkPendingAvatarSubscriptions = function(connectionStatus, cachedWorldObject, callback) {
        if (!connectionStatus.isLocalized || !cachedWorldObject) {
            return; // don't process until we're properly localized
        }

        let objectIdList = pendingSubscriptions[cachedWorldObject.objectId];
        if (!(objectIdList && objectIdList.length > 0)) { return; }

        while (objectIdList.length > 0) {
            let thatAvatarObject = realityEditor.getObject(objectIdList.pop());
            if (thatAvatarObject) {
                // onOtherAvatarInitialized(thatAvatarObject); // subscribe to the publicData of its avatar node
                callback(thatAvatarObject); // subscribe to the publicData of its avatar node
            }
        }
    }
    
    exports.addPendingAvatarSubscription = function(worldId, objectId) {
        if (typeof pendingSubscriptions[worldId] === 'undefined') {
            pendingSubscriptions[worldId] = [];
        }
        pendingSubscriptions[worldId].push(objectId);
        console.log('added pending subscription for ' + objectId);
    }
    
    exports.subscribeToAvatarPublicData = function(avatarObject, subscriptionCallbacks) {
        let avatarObjectKey = avatarObject.objectId;
        let avatarFrameKey = Object.keys(avatarObject.frames).find(name => name.includes(realityEditor.avatar.utils.TOOL_NAME));
        let thatAvatarTool = realityEditor.getFrame(avatarObjectKey, avatarFrameKey);
        let avatarNodeKey = Object.keys(thatAvatarTool.nodes).find(name => name.includes(realityEditor.avatar.utils.NODE_NAME));
        
        Object.keys(subscriptionCallbacks).forEach((publicDataKey) => {
            let callback = subscriptionCallbacks[publicDataKey];

            realityEditor.network.realtime.subscribeToPublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, publicDataKey, (msg) => {
                callback(JSON.parse(msg));
            });
        });
    }

}(realityEditor.avatar.network));
