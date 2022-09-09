createNameSpace("realityEditor.avatar.network");

/**
 * @fileOverview realityEditor.avatar.network
 * Contains a variety of helper functions for avatar/index.js to create and discover avatar objects,
 * realtime broadcast my avatar's state, and subscribe to the state of other avatars
 */

(function(exports) {
    const DATA_SEND_FPS_LIMIT = 30;
    let occlusionDownloadInterval = null;
    let cachedOcclusionObject = null;
    let cachedWorldObject = null;
    let lastBroadcastPositionTimestamp = Date.now();
    let lastWritePublicDataTimestamp = Date.now();
    let pendingAvatarInitializations = {};

    // Check if an object with this name exists on the server
    function verifyObjectNameNotOnWorldServer(serverWorldObject, objectName, onDoesntExist, onExists) {
        let downloadUrl = realityEditor.network.getURL(serverWorldObject.ip, realityEditor.network.getPort(serverWorldObject), '/object/' + objectName);
        realityEditor.network.getData(null, null, null, downloadUrl, (objectKey, _frameKey, _nodeKey, msg) => {
            if (msg) {
                onExists(msg);
            } else {
                onDoesntExist();
            }
        });
    }

    // Tell the server (corresponding to this world object) to create a new avatar object with the specified ID
    function addAvatarObject(worldId, clientId, onSuccess, onError) {
        let worldObject = realityEditor.getObject(worldId);
        if (!worldObject) {
            console.warn('Unable to add avatar object because no world with ID: ' + worldId);
            return;
        }

        let postUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/');
        let params = new URLSearchParams({action: 'new', name: clientId, isAvatar: true, worldId: worldId});
        fetch(postUrl, {
            method: 'POST',
            body: params
        }).then(response => response.json())
            .then(data => {
                onSuccess(data);
            }).catch(err => {
            onError(err);
        });
    }

    // helper function that will trigger the callback for each avatar object previously or in-future discovered
    function onAvatarDiscovered(callback) {
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

    function onAvatarDeleted(callback) {
        realityEditor.network.registerCallback('objectDeleted', (params) => {
            callback(params.objectKey);
        });
    }

    // polls the three.js scene every 1 second to see if the gltf for the world object has finished loading
    function onLoadOcclusionObject(callback) {
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

    // if the object has moved at all, and enough time has passed (FPS_LIMIT), realtime broadcast the new avatar matrix
    function realtimeSendAvatarPosition(avatarObject, matrix) {
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

    // write the touchState into the avatar object's storage node (internally limits data rate to FPS_LIMIT)
    function sendTouchState(keys, touchState, options) {
        let sendData = !(options && options.limitToFps) || !isTouchStateFpsLimited();
        if (sendData) {
            realityEditor.network.realtime.writePublicData(keys.objectKey, keys.frameKey, keys.nodeKey, realityEditor.avatar.utils.PUBLIC_DATA_KEYS.touchState, touchState);
            lastWritePublicDataTimestamp = Date.now();
        }
    }

    /**
     * Helper function to provide insight into the fps limiter
     * @return {boolean}
     */
    function isTouchStateFpsLimited() {
        return Date.now() - lastWritePublicDataTimestamp < (1000 / DATA_SEND_FPS_LIMIT);
    }

    // write the username into the avatar object's storage node
    function sendUserProfile(keys, name) {
        realityEditor.network.realtime.writePublicData(keys.objectKey, keys.frameKey, keys.nodeKey, realityEditor.avatar.utils.PUBLIC_DATA_KEYS.userProfile, {
            // right now the profile only contains a name, but this can be extended in the future
            name: name
        });
    }

    // if we discover other avatar objects before we're localized in a world, queue them up to be initialized later
    function processPendingAvatarInitializations(connectionStatus, cachedWorldObject, callback) {
        if (!connectionStatus.isLocalized || !cachedWorldObject) {
            return; // don't process until we're properly localized
        }

        let objectIdList = pendingAvatarInitializations[cachedWorldObject.objectId];
        if (!(objectIdList && objectIdList.length > 0)) { return; }

        while (objectIdList.length > 0) {
            let thatAvatarObject = realityEditor.getObject(objectIdList.pop());
            if (thatAvatarObject) {
                callback(thatAvatarObject); // callback can be used to initialize and subscribe to the publicData of the avatar
            }
        }
    }

    // remember this object so that if we localize against this world in the future, we can subscribe to its node's public data
    function addPendingAvatarInitialization(worldId, objectId) {
        if (typeof pendingAvatarInitializations[worldId] === 'undefined') {
            pendingAvatarInitializations[worldId] = [];
        }
        pendingAvatarInitializations[worldId].push(objectId);
    }

    // given a data structure of { PUBLIC_DATA_KEYS: callbacks }, adds the callbacks to the provided avatarObject's avatar node,
    // so that the corresponding callback will be triggered iff the corresponding data key is changed by another user
    function subscribeToAvatarPublicData(avatarObject, subscriptionCallbacks) {
        let avatarObjectKey = avatarObject.objectId;
        let avatarFrameKey = Object.keys(avatarObject.frames).find(name => name.includes(realityEditor.avatar.utils.TOOL_NAME));
        let thatAvatarTool = realityEditor.getFrame(avatarObjectKey, avatarFrameKey);
        if (!thatAvatarTool) {
            console.warn('cannot find Avatar tool on Avatar object named ' + avatarObjectKey);
            return;
        }
        let avatarNodeKey = Object.keys(thatAvatarTool.nodes).find(name => name.includes(realityEditor.avatar.utils.NODE_NAME));

        Object.keys(subscriptionCallbacks).forEach((publicDataKey) => {
            let callback = subscriptionCallbacks[publicDataKey];

            realityEditor.network.realtime.subscribeToPublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, publicDataKey, (msg) => {
                callback(JSON.parse(msg));
            });
        });
    }

    exports.verifyObjectNameNotOnWorldServer = verifyObjectNameNotOnWorldServer
    exports.addAvatarObject = addAvatarObject;
    exports.onAvatarDiscovered = onAvatarDiscovered;
    exports.onAvatarDeleted = onAvatarDeleted;
    exports.onLoadOcclusionObject = onLoadOcclusionObject;
    exports.realtimeSendAvatarPosition = realtimeSendAvatarPosition;
    exports.isTouchStateFpsLimited = isTouchStateFpsLimited;
    exports.sendTouchState = sendTouchState;
    exports.sendUserProfile = sendUserProfile;
    exports.processPendingAvatarInitializations = processPendingAvatarInitializations;
    exports.addPendingAvatarInitialization = addPendingAvatarInitialization;
    exports.subscribeToAvatarPublicData = subscribeToAvatarPublicData;

}(realityEditor.avatar.network));
