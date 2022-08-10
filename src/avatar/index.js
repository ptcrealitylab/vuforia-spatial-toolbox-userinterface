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
    let avatarUserProfiles = {}; // data received from avatars' userProfile property in their storage node
    let connectedAvatarNames = {}; // similar to avatarObjects, but maps objectKey -> name or null
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
            refreshStatusUI();
            network.processPendingAvatarInitializations(connectionStatus, cachedWorldObject, onOtherAvatarInitialized);

            // in theory there shouldn't be an avatar object for this device on the server yet, but verify that before creating a new one
            let thisAvatarName = utils.getAvatarName();
            let worldObject = realityEditor.getObject(worldObjectKey);
            network.verifyObjectNameNotOnWorldServer(worldObject, thisAvatarName, () => {
                network.addAvatarObject(worldObjectKey, thisAvatarName, (data) => {
                    console.log('added new avatar object', data);
                    myAvatarId = data.id;
                    connectionStatus.isMyAvatarCreated = true;
                    refreshStatusUI();
                }, (err) => {
                    console.warn('unable to add avatar object to server', err);
                });
            }, () => {
                console.warn('avatar already exists on server');
            });
        });

        network.onAvatarDiscovered((object, objectKey) => {
            handleDiscoveredObject(object, objectKey);
            draw.renderAvatarIconList(connectedAvatarNames);
        });

        network.onAvatarDeleted((objectKey) => {
            delete avatarObjects[objectKey];
            delete connectedAvatarNames[objectKey];
            draw.renderAvatarIconList(connectedAvatarNames);
        });

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            draw.renderOtherAvatars(avatarTouchStates, avatarUserProfiles);

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
            refreshStatusUI();

            // we have a cachedWorldObject here, so it's also a good point to check pending subscriptions for that world
            network.processPendingAvatarInitializations(connectionStatus, cachedWorldObject, onOtherAvatarInitialized);
        });

        const description = 'toggle on to show name to other users';
        const propertyName = 'myUserName';
        const iconSrc = '../../../svg/object.svg';
        const defaultValue = false;
        const placeholderText = '';
        realityEditor.gui.settings.addToggleWithText('User Name', description, propertyName, iconSrc, defaultValue, placeholderText, (isToggled) => {
            isUsernameActive = isToggled;
            writeUsername(isToggled ? myUsername : null);
        }, (text) => {
            myUsername = text;
            if (isUsernameActive) {
                writeUsername(myUsername);
            }
        });
    }

    // initialize the avatar object representing my own device, and those representing other devices
    function handleDiscoveredObject(object, objectKey) {
        if (!utils.isAvatarObject(object)) { return; }
        if (typeof avatarObjects[objectKey] !== 'undefined') { return; }
        avatarObjects[objectKey] = object; // keep track of which avatar objects we've processed so far
        connectedAvatarNames[objectKey] = { name: null };

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

    // subscribe to the node's public data of a newly discovered avatar
    function onOtherAvatarInitialized(thatAvatarObject) {
        if (!connectionStatus.isLocalized || !cachedWorldObject) {
            network.addPendingAvatarInitialization(thatAvatarObject.worldId, thatAvatarObject.objectId);
            return;
        }

        let subscriptionCallbacks = {};

        subscriptionCallbacks[utils.PUBLIC_DATA_KEYS.touchState] = (msgContent) => {
            avatarTouchStates[msgContent.object] = msgContent.publicData.touchState;
            debugDataReceived();
        };

        subscriptionCallbacks[utils.PUBLIC_DATA_KEYS.userProfile] = (msgContent) => {
            let name = msgContent.publicData.userProfile.name;
            avatarUserProfiles[msgContent.object] = name;
            connectedAvatarNames[msgContent.object].name = name;
            draw.updateAvatarName(msgContent.object, name);
            draw.renderAvatarIconList(connectedAvatarNames);
            debugDataReceived();
        };

        network.subscribeToAvatarPublicData(thatAvatarObject, subscriptionCallbacks);

        debugConnectionStatus.subscribedToHowMany += 1;
        refreshStatusUI();
    }

    // checks where the click intersects with the area target, or the groundplane, and returns {x,y,z} relative to the world object origin 
    function getRaycastCoordinates(screenX, screenY) {
        let worldIntersectPoint = null;

        let objectsToCheck = [];
        if (cachedOcclusionObject) {
            objectsToCheck.push(cachedOcclusionObject);
        }
        if (realityEditor.gui.threejsScene.getGroundPlaneCollider()) {
            objectsToCheck.push(realityEditor.gui.threejsScene.getGroundPlaneCollider());
        }
        if (cachedWorldObject && objectsToCheck.length > 0) {
            // by default, three.js raycast returns coordinates in the top-level scene coordinate system
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, objectsToCheck);
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

    // add pointer events to turn on and off my own avatar's laser beam (therefore sending my touchState to other users)
    function onMyAvatarInitialized() {
        connectionStatus.isMyAvatarInitialized = true;
        refreshStatusUI();

        if (isUsernameActive && myUsername) {
            writeUsername(myUsername);
        }

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
    }

    // name is one property within the avatar node's userProfile public data 
    function writeUsername(name) {
        if (!myAvatarObject) { return; }
        connectedAvatarNames[myAvatarId].name = name;
        draw.updateAvatarName(myAvatarId, name);
        draw.renderAvatarIconList(connectedAvatarNames);

        let info = utils.getAvatarNodeInfo(myAvatarObject);
        if (info) {
            network.sendUserProfile(info, name);
        }
    }

    // send touch intersect to other users via the public data node, and show visual feedback on your cursor
    function setBeamOn(screenX, screenY) {
        isPointerDown = true;

        let touchState = {
            isPointerDown: isPointerDown,
            screenX: screenX,
            screenY: screenY,
            worldIntersectPoint: getRaycastCoordinates(screenX, screenY),
            timestamp: Date.now()
        }

        if (touchState.isPointerDown && !touchState.worldIntersectPoint) { return; } // don't send if click on nothing

        let info = utils.getAvatarNodeInfo(myAvatarObject);
        if (info) {
            draw.renderCursorOverlay(true, screenX, screenY, utils.getColor(myAvatarObject));
            network.sendTouchState(info, touchState, { limitToFps: true });
        }

        debugDataSent();
    }

    // send touchState: {isPointerDown: false} to other users, so they'll stop showing this avatar's laser beam
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

    // settings menu can toggle this if desired
    function toggleDebugMode(showDebug) {
        DEBUG_MODE = showDebug;
        refreshStatusUI();
    }

    // highlight the debugText for 1 second upon receiving data
    function debugDataReceived() {
        if (!debugConnectionStatus.didReceiveAnything) {
            debugConnectionStatus.didReceiveAnything = true;
            refreshStatusUI();
        }
        if (!debugConnectionStatus.didRecentlyReceive && !debugReceiveTimeout) {
            debugConnectionStatus.didRecentlyReceive = true;
            refreshStatusUI();

            debugReceiveTimeout = setTimeout(() => {
                debugConnectionStatus.didRecentlyReceive = false;
                clearTimeout(debugReceiveTimeout);
                debugReceiveTimeout = null;
                refreshStatusUI();
            }, 1000);
        }
    }

    // highlight the debugText for 1 second upon sending data
    function debugDataSent() {
        if (!debugConnectionStatus.didSendAnything) {
            debugConnectionStatus.didSendAnything = true;
            refreshStatusUI();
        }
        if (!debugConnectionStatus.didRecentlySend && !debugSendTimeout) {
            debugConnectionStatus.didRecentlySend = true;
            refreshStatusUI();

            debugSendTimeout = setTimeout(() => {
                debugConnectionStatus.didRecentlySend = false;
                clearTimeout(debugSendTimeout);
                debugSendTimeout = null;
                refreshStatusUI();
            }, 1000);
        }
    }

    // update the simple UI that shows "connecting..." --> "connected!" (and update debug text if DEBUG_MODE is true)
    function refreshStatusUI() {
        draw.renderConnectionDebugInfo(connectionStatus, debugConnectionStatus, myAvatarId, DEBUG_MODE);

        // render a simple UI to show while we establish the avatar (only show after we've connected to a world)
        if (connectionStatus.isLocalized) {
            let isConnectionReady = connectionStatus.isLocalized &&
                connectionStatus.isMyAvatarCreated &&
                connectionStatus.isMyAvatarInitialized &&
                connectionStatus.isWorldOcclusionObjectAdded && myAvatarId;
            draw.renderConnectionFeedback(isConnectionReady);
        }
    }

    exports.initService = initService;
    exports.setBeamOn = setBeamOn;
    exports.setBeamOff = setBeamOff;
    exports.toggleDebugMode = toggleDebugMode;

}(realityEditor.avatar));
