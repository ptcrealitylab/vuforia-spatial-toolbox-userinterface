createNameSpace("realityEditor.avatar");

/**
 * @fileOverview realityEditor.avatar
 * When the app successfully localizes within a world, checks if this device has a "avatar" representation saved on that
 * world object's server. If not, create one. Continuously updates this object's position in the scene graph to match
 * the camera position, and broadcasts that position over the realtime sockets.
 */

(function(exports) {

    let debugMode = false; // can be toggled from menu

    let initializedId = null;
    let myAvatarObject = null;
    let avatarObjectInitialized = false;
    let avatarObjects = {}; // avatar objects are stored in the regular global "objects" variable, but also in here
    let avatarTouchStates = {};
    let otherAvatarNames = {};
    let isPointerDown = false;
    let isUsernameActive = false;
    let currentUsername = null;

    let sendTimeout = null;
    let receiveTimeout = null;

    let cachedWorldObject = null;
    let cachedOcclusionObject = null;

    let connectionStatus = {
        // these are used to establish a connection and create the avatar object:
        isLocalized: false,
        isMyAvatarCreated: false,
        isMyAvatarInitialized: false,
        isWorldOcclusionObjectAdded: false,
        // the rest are just used for debugging purposes:
        subscribedToHowMany: 0,
        didReceiveAnything: false,
        didJustReceive: false,
        didSendAnything: false,
        didJustSend: false
    }

    function initService() {
        // begin creating our own avatar object when we localize within a world object
        realityEditor.worldObjects.onLocalizedWithinWorld(function(worldObjectKey) {
            if (worldObjectKey === realityEditor.worldObjects.getLocalWorldId()) { return; }

            connectionStatus.isLocalized = true;
            realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);
            realityEditor.avatar.network.checkPendingAvatarSubscriptions(connectionStatus, cachedWorldObject, onOtherAvatarInitialized);

            // in theory there shouldn't be an avatar object for this device on the server yet, but verify that before creating a new one
            let thisAvatarName = realityEditor.avatar.utils.getAvatarName();
            let worldObject = realityEditor.getObject(worldObjectKey);

            realityEditor.avatar.network.verifyObjectNameNotOnWorldServer(worldObject, thisAvatarName, () => {
                realityEditor.avatar.network.addAvatarObject(worldObjectKey, thisAvatarName, (data) => {
                    console.log('added new avatar object', data);
                    initializedId = data.id;
                    avatarObjectInitialized = true;
                    connectionStatus.isMyAvatarCreated = true;
                    realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);
                }, (err) => {
                    console.warn('unable to add avatar object to server', err);
                });
            }, () => {
                console.warn('avatar already exists on server');
            });
        });
        
        realityEditor.avatar.network.onAvatarDiscovered((object, objectKey) => {
            handleDiscoveredObject(object, objectKey);
        });

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            realityEditor.avatar.draw.renderOtherAvatars(avatarTouchStates, otherAvatarNames);

            if (!avatarObjectInitialized || globalStates.freezeButtonState) { return; }

            try {
                updateMyAvatar();
            } catch (e) {
                console.warn('error updating my avatar', e);
            }
        });
        
        realityEditor.avatar.network.onLoadOcclusionObject((worldObject, occlusionObject) => {
            cachedWorldObject = worldObject;
            cachedOcclusionObject = occlusionObject;

            connectionStatus.isWorldOcclusionObjectAdded = true;
            realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);

            // we have a cachedWorldObject here, so it's also a good point to check pending subscriptions for that world
            realityEditor.avatar.network.checkPendingAvatarSubscriptions();
        });
    }

    function handleDiscoveredObject(object, objectKey) {
        if (!realityEditor.avatar.utils.isAvatarObject(object)) { return; }
        if (typeof avatarObjects[objectKey] !== 'undefined') { return; }
        avatarObjects[objectKey] = object; // keep track of which avatar objects we've processed so far

        if (objectKey === initializedId) {
            myAvatarObject = object;
            onMyAvatarInitialized();
        } else {
            onOtherAvatarInitialized(object);
        }
    }

    // update the avatar object to match the camera position each frame (if it exists), and realtime broadcast to others
    function updateMyAvatar() {
        let avatarObject = realityEditor.getObject(initializedId);
        if (!avatarObject) { return; }

        let avatarSceneNode = realityEditor.sceneGraph.getSceneNodeById(initializedId);
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.CAMERA);
        if (!avatarSceneNode || !cameraNode) { return; }

        // my avatar should always be positioned exactly at the camera
        avatarSceneNode.setPositionRelativeTo(cameraNode, realityEditor.gui.ar.utilities.newIdentityMatrix());
        avatarSceneNode.updateWorldMatrix(); // immediately process instead of waiting for next frame

        let worldObjectId = realityEditor.sceneGraph.getWorldId();
        let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
        let relativeMatrix = avatarSceneNode.getMatrixRelativeTo(worldNode);
        
        realityEditor.avatar.network.realtimeSendAvatarPosition(avatarObject, relativeMatrix);
    }

    function onOtherAvatarInitialized(thatAvatarObject) {
        if (!connectionStatus.isLocalized || !cachedWorldObject) {
            realityEditor.avatar.network.addPendingAvatarSubscription(thatAvatarObject.worldId, thatAvatarObject.objectId);
            return;
        }

        let subscriptionCallbacks = {};

        subscriptionCallbacks[realityEditor.avatar.utils.PUBLIC_DATA_KEYS.touchState] = (msgContent) => {
            avatarTouchStates[msgContent.object] = msgContent.publicData.touchState;
            debugDataReceived();
        };

        subscriptionCallbacks[realityEditor.avatar.utils.PUBLIC_DATA_KEYS.username] = (msgContent) => {
            let name = msgContent.publicData.username.name;
            otherAvatarNames[msgContent.object] = name;
            realityEditor.avatar.draw.updateAvatarName(msgContent.object, name);
            debugDataReceived();
        };

        realityEditor.avatar.network.subscribeToAvatarPublicData(thatAvatarObject, subscriptionCallbacks);

        connectionStatus.subscribedToHowMany += 1;
        realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);
    }

    function getRaycastCoordinates(screenX, screenY) {
        let worldIntersectPoint = null;

        // if (!cachedWorldObject) {
        //     cachedWorldObject = realityEditor.worldObjects.getBestWorldObject();
        // }
        // if (cachedWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
        //     cachedWorldObject = null; // don't accept the local world object
        // }
        // if (cachedWorldObject && !cachedOcclusionObject) {
        //     cachedOcclusionObject = realityEditor.gui.threejsScene.getObjectForWorldRaycasts(cachedWorldObject.objectId);
        //     if (cachedOcclusionObject) {
        //         connectionStatus.isWorldOcclusionObjectAdded = true;
        //         realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);
        //     }
        // }

        if (cachedWorldObject && cachedOcclusionObject) {
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [cachedOcclusionObject]);
            if (raycastIntersects.length > 0) {
                // multiplying the point by the inverse world matrix seems to get it in the right coordinate system
                let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
                let matrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                realityEditor.gui.threejsScene.setMatrixFromArray(matrix, worldSceneNode.worldMatrix);
                matrix.invert();
                raycastIntersects[0].point.applyMatrix4(matrix);
                worldIntersectPoint = raycastIntersects[0].point;
            }
        }

        return worldIntersectPoint; // these are relative to the world object
    }

    function onMyAvatarInitialized() {
        connectionStatus.isMyAvatarInitialized = true;
        realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);

        document.body.addEventListener('pointerdown', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) { return; }
            if (realityEditor.device.utilities.isEventHittingBackground(e)) {
                setBeamOn(e.pageX, e.pageY);
            }
        });

        ['pointerup', 'pointercancel', 'pointerleave'].forEach(eventName => {
            document.body.addEventListener(eventName, (e) => {
                if (realityEditor.device.isMouseEventCameraControl(e)) { return; }
                setBeamOff();
            });
        });

        document.body.addEventListener('pointermove', (e) => {
            if (!isPointerDown || realityEditor.device.isMouseEventCameraControl(e)) { return; }
            // update the beam position even if not hitting background, as long as we started on the background
            setBeamOn(e.pageX, e.pageY);
        });

        realityEditor.gui.settings.addToggleWithText('User Name', 'toggle on to show name to other users', 'myUserName',  '../../../svg/object.svg', false, '', (isToggled) => {
            console.log('user name toggled', isToggled);
            isUsernameActive = isToggled;
            if (isToggled) {
                writeUsername(currentUsername);
            } else {
                writeUsername(null);
            }
        }, (text) => {
            currentUsername = text;
            if (!isUsernameActive) { return; }
            writeUsername(currentUsername);
        });
    }

    function writeUsername(name) {
        let info = realityEditor.avatar.utils.getAvatarNodeInfo(myAvatarObject);
        if (info) {
            realityEditor.avatar.network.sendUserName(info, name);
        }
    }

    function getAvatarObjects() {
        return avatarObjects;
    }

    function setBeamOn(screenX, screenY) {
        isPointerDown = true;

        let touchState = {
            isPointerDown: isPointerDown,
            screenX: screenX,
            screenY: screenY,
            worldIntersectPoint: getRaycastCoordinates(screenX, screenY),
            timestamp: Date.now()
        }

        // TODO: change this so we still send if click on nothing (the other side just renders an infinite beam in that direction or raycast against the groundplane)
        if (touchState.isPointerDown && !touchState.worldIntersectPoint) { return; } // don't send if click on nothing

        let info = realityEditor.avatar.utils.getAvatarNodeInfo();
        if (info) {
            realityEditor.avatar.draw.renderCursorOverlay(true, screenX, screenY, realityEditor.avatar.utils.getColor(myAvatarObject));
            realityEditor.avatar.network.sendTouchState(info, touchState, { limitToFps: true });
        }

        debugDataSent();
    }

    function setBeamOff(screenX, screenY) {
        // console.log('document.body.pointerup', screenX, screenY);
        isPointerDown = false;

        let touchState = {
            isPointerDown: isPointerDown,
            screenX: screenX,
            screenY: screenY,
            worldIntersectPoint: getRaycastCoordinates(screenX, screenY),
            timestamp: Date.now()
        }

        // we still send if click on nothing, as opposed to setBeamOn which uncomments:
        // if (touchState.isPointerDown && !touchState.worldIntersectPoint) { return; }

        let info = getAvatarNodeInfo();
        if (info) {
            realityEditor.avatar.draw.renderCursorOverlay(false, screenX, screenY, realityEditor.avatar.utils.getColor(myAvatarObject));
            realityEditor.avatar.network.sendTouchState(info, touchState);
        }

        debugDataSent();
    }

    function toggleDebugMode(showDebug) {
        debugMode = showDebug;
        realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);
    }

    function debugDataReceived() {
        // this is just for debugMode, could be removed to simplify a lot
        if (!connectionStatus.didReceiveAnything) {
            connectionStatus.didReceiveAnything = true;
            realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);
        }
        if (!connectionStatus.didJustReceive && !receiveTimeout) {
            connectionStatus.didJustReceive = true;
            realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);

            receiveTimeout = setTimeout(() => {
                connectionStatus.didJustReceive = false;
                realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);
                clearTimeout(receiveTimeout);
                receiveTimeout = null;
            }, 1000);
        }
    }

    function debugDataSent() {
        if (!connectionStatus.didSendAnything) {
            connectionStatus.didSendAnything = true;
            realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);
        }
        if (!connectionStatus.didJustSend && !sendTimeout) {
            connectionStatus.didJustSend = true;
            realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);

            sendTimeout = setTimeout(() => {
                connectionStatus.didJustSend = false;
                realityEditor.avatar.draw.renderConnectionStatus(connectionStatus, debugMode);
                clearTimeout(sendTimeout);
                sendTimeout = null;
            }, 1000);
        }
    }

    exports.initService = initService;
    exports.getAvatarObjects = getAvatarObjects;
    exports.setBeamOn = setBeamOn;
    exports.setBeamOff = setBeamOff;
    exports.toggleDebugMode = toggleDebugMode;

}(realityEditor.avatar));
