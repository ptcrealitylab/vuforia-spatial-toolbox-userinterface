createNameSpace("realityEditor.avatar");

/**
 * @fileOverview realityEditor.avatar
 * When the app successfully localizes within a world, checks if this device has a "avatar" representation saved on that
 * world object's server. If not, create one. Continuously updates this object's position in the scene graph to match
 * the camera position, and broadcasts that position over the realtime sockets. On click-and-drag, sends this avatar's
 * touchState to other clients via the avatar's node's publicData, and renders laser beams coming from other avatars.
 */

(function(exports) {

    let network, draw, utils; // shortcuts to access realityEditor.avatar._____

    let myAvatarId = null;
    let myAvatarObject = null;
    let avatarObjects = {}; // avatar objects are stored here, so that we know which ones we've discovered/initialized
    let avatarTouchStates = {}; // data received from avatars' touchState property in their storage node
    let otherAvatarNames = {}; // data received from avatars' username property in their storage node
    let isPointerDown = false;

    // if you set your name, and other clients will see your initials near the endpoint of your laser beam
    let isUsernameActive = false;
    let myUsername = null;

    // these are used for raycasting against the environment when sending laser beams
    let cachedWorldObject = null;
    let cachedOcclusionObject = null;

    // these are used to establish a connection and create the avatar object
    let connectionStatus = {
        isLocalized: false,
        isMyAvatarCreated: false,
        isMyAvatarInitialized: false,
        isWorldOcclusionObjectAdded: false
    }

    // these are just used for debugging purposes
    let DEBUG_MODE = false; // can be toggled from remote operator's Develop menu
    let debugSendTimeout = null;
    let debugReceiveTimeout = null;
    let debugConnectionStatus = {
        subscribedToHowMany: 0,
        didReceiveAnything: false,
        didRecentlyReceive: false,
        didSendAnything: false,
        didRecentlySend: false
    }

    function initService() {
        network = realityEditor.avatar.network;
        draw = realityEditor.avatar.draw;
        utils = realityEditor.avatar.utils;

        // begin creating our own avatar object when we localize within a world object
        realityEditor.worldObjects.onLocalizedWithinWorld(function(worldObjectKey) {
            if (worldObjectKey === realityEditor.worldObjects.getLocalWorldId()) { return; }

            connectionStatus.isLocalized = true;
            refreshDebugUI();
            network.checkPendingAvatarSubscriptions(connectionStatus, cachedWorldObject, onOtherAvatarInitialized);

            // in theory there shouldn't be an avatar object for this device on the server yet, but verify that before creating a new one
            let thisAvatarName = utils.getAvatarName();
            let worldObject = realityEditor.getObject(worldObjectKey);

            network.verifyObjectNameNotOnWorldServer(worldObject, thisAvatarName, () => {
                network.addAvatarObject(worldObjectKey, thisAvatarName, (data) => {
                    console.log('added new avatar object', data);
                    myAvatarId = data.id;
                    connectionStatus.isMyAvatarCreated = true;
                    refreshDebugUI();
                }, (err) => {
                    console.warn('unable to add avatar object to server', err);
                });
            }, () => {
                console.warn('avatar already exists on server');
            });
        });

        network.onAvatarDiscovered((object, objectKey) => {
            handleDiscoveredObject(object, objectKey);
        });

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            draw.renderOtherAvatars(avatarTouchStates, otherAvatarNames);

            if (!myAvatarObject || globalStates.freezeButtonState) { return; }

            try {
                updateMyAvatar();
            } catch (e) {
                console.warn('error updating my avatar', e);
            }
        });

        network.onLoadOcclusionObject((worldObject, occlusionObject) => {
            cachedWorldObject = worldObject;
            cachedOcclusionObject = occlusionObject;

            connectionStatus.isWorldOcclusionObjectAdded = true;
            refreshDebugUI();

            // we have a cachedWorldObject here, so it's also a good point to check pending subscriptions for that world
            network.checkPendingAvatarSubscriptions(connectionStatus, cachedWorldObject, onOtherAvatarInitialized);
        });
    }

    function handleDiscoveredObject(object, objectKey) {
        if (!utils.isAvatarObject(object)) { return; }
        if (typeof avatarObjects[objectKey] !== 'undefined') { return; }
        avatarObjects[objectKey] = object; // keep track of which avatar objects we've processed so far

        if (objectKey === myAvatarId) {
            myAvatarObject = object;
            onMyAvatarInitialized();
        } else {
            onOtherAvatarInitialized(object);
        }
    }

    // update the avatar object to match the camera position each frame (if it exists), and realtime broadcast to others
    function updateMyAvatar() {
        let avatarSceneNode = realityEditor.sceneGraph.getSceneNodeById(myAvatarId);
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.CAMERA);
        if (!avatarSceneNode || !cameraNode) { return; }

        // my avatar should always be positioned exactly at the camera
        avatarSceneNode.setPositionRelativeTo(cameraNode, realityEditor.gui.ar.utilities.newIdentityMatrix());
        avatarSceneNode.updateWorldMatrix(); // immediately process instead of waiting for next frame

        let worldObjectId = realityEditor.sceneGraph.getWorldId();
        let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
        let relativeMatrix = avatarSceneNode.getMatrixRelativeTo(worldNode);

        network.realtimeSendAvatarPosition(myAvatarObject, relativeMatrix);
    }

    function onOtherAvatarInitialized(thatAvatarObject) {
        if (!connectionStatus.isLocalized || !cachedWorldObject) {
            network.addPendingAvatarSubscription(thatAvatarObject.worldId, thatAvatarObject.objectId);
            return;
        }

        let subscriptionCallbacks = {};

        subscriptionCallbacks[utils.PUBLIC_DATA_KEYS.touchState] = (msgContent) => {
            avatarTouchStates[msgContent.object] = msgContent.publicData.touchState;
            debugDataReceived();
        };

        subscriptionCallbacks[utils.PUBLIC_DATA_KEYS.username] = (msgContent) => {
            let name = msgContent.publicData.username.name;
            otherAvatarNames[msgContent.object] = name;
            draw.updateAvatarName(msgContent.object, name);
            debugDataReceived();
        };

        network.subscribeToAvatarPublicData(thatAvatarObject, subscriptionCallbacks);

        debugConnectionStatus.subscribedToHowMany += 1;
        refreshDebugUI();
    }

    function getRaycastCoordinates(screenX, screenY) {
        let worldIntersectPoint = null;

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
        refreshDebugUI();

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

        // TODO: should this be added at the beginning, or only when done initializing avatar?
        realityEditor.gui.settings.addToggleWithText('User Name', 'toggle on to show name to other users', 'myUserName',  '../../../svg/object.svg', false, '', (isToggled) => {
            console.log('user name toggled', isToggled);
            isUsernameActive = isToggled;
            if (isToggled) {
                writeUsername(myUsername);
            } else {
                writeUsername(null);
            }
        }, (text) => {
            myUsername = text;
            if (!isUsernameActive) { return; }
            writeUsername(myUsername);
        });
    }

    function writeUsername(name) {
        let info = utils.getAvatarNodeInfo(myAvatarObject);
        if (info) {
            network.sendUserName(info, name);
        }
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

        let info = utils.getAvatarNodeInfo(myAvatarObject);
        if (info) {
            draw.renderCursorOverlay(true, screenX, screenY, utils.getColor(myAvatarObject));
            network.sendTouchState(info, touchState, { limitToFps: true });
        }

        debugDataSent();
    }

    function setBeamOff(screenX, screenY) {
        isPointerDown = false;

        let touchState = {
            isPointerDown: isPointerDown,
            screenX: screenX,
            screenY: screenY,
            worldIntersectPoint: getRaycastCoordinates(screenX, screenY),
            timestamp: Date.now()
        }

        let info = utils.getAvatarNodeInfo(myAvatarObject);
        if (info) {
            draw.renderCursorOverlay(false, screenX, screenY, utils.getColor(myAvatarObject));
            network.sendTouchState(info, touchState);
        }

        debugDataSent();
    }

    function toggleDebugMode(showDebug) {
        DEBUG_MODE = showDebug;
        refreshDebugUI();
    }

    // highlight the debugText for 1 second upon receiving data
    function debugDataReceived() {
        if (!debugConnectionStatus.didReceiveAnything) {
            debugConnectionStatus.didReceiveAnything = true;
            refreshDebugUI();
        }
        if (!debugConnectionStatus.didRecentlyReceive && !debugReceiveTimeout) {
            debugConnectionStatus.didRecentlyReceive = true;
            refreshDebugUI();

            debugReceiveTimeout = setTimeout(() => {
                debugConnectionStatus.didRecentlyReceive = false;
                clearTimeout(debugReceiveTimeout);
                debugReceiveTimeout = null;
                refreshDebugUI();
            }, 1000);
        }
    }

    // highlight the debugText for 1 second upon sending data
    function debugDataSent() {
        if (!debugConnectionStatus.didSendAnything) {
            debugConnectionStatus.didSendAnything = true;
            refreshDebugUI();
        }
        if (!debugConnectionStatus.didRecentlySend && !debugSendTimeout) {
            debugConnectionStatus.didRecentlySend = true;
            refreshDebugUI();

            debugSendTimeout = setTimeout(() => {
                debugConnectionStatus.didRecentlySend = false;
                clearTimeout(debugSendTimeout);
                debugSendTimeout = null;
                refreshDebugUI();
            }, 1000);
        }
    }

    function refreshDebugUI() {
        draw.renderConnectionStatus(connectionStatus, debugConnectionStatus, myAvatarId, DEBUG_MODE);
    }

    exports.initService = initService;
    exports.setBeamOn = setBeamOn;
    exports.setBeamOff = setBeamOff;
    exports.toggleDebugMode = toggleDebugMode;

}(realityEditor.avatar));
