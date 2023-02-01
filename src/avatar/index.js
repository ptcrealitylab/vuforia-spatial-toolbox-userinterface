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

    const KEEP_ALIVE_HEARTBEAT_INTERVAL = 10 * 1000; // once per 10 seconds
    const AVATAR_CREATION_TIMEOUT_LENGTH = 10 * 1000; // handle if avatar takes longer than 10 seconds to load
    const RAYCAST_AGAINST_GROUNDPLANE = false;

    let myAvatarId = null;
    let myAvatarObject = null;
    let avatarObjects = {}; // avatar objects are stored here, so that we know which ones we've discovered/initialized
    let avatarTouchStates = {}; // data received from avatars' touchState property in their storage node
    let avatarUserProfiles = {}; // data received from avatars' userProfile property in their storage node
    let connectedAvatarNames = {}; // similar to avatarObjects, but maps objectKey -> name or null
    let isPointerDown = false;
    let lastPointerState = {
        position: null,
        timestamp: Date.now(),
        viewMatrixChecksum: null
    };
    let lastBeamOnTimestamp = null;

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
        isWorldOcclusionObjectAdded: false,
        didCreationFail: false
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

            // todo: for now, we don't create a new avatar object for each world we see, but in future we may want to
            //       migrate our existing avatar to the server hosting the current world object that we're looking at
            if (myAvatarObject || myAvatarId) { return; }

            connectionStatus.isLocalized = true;
            refreshStatusUI();
            network.processPendingAvatarInitializations(connectionStatus, cachedWorldObject, onOtherAvatarInitialized);

            // in theory there shouldn't be an avatar object for this device on the server yet, but verify that before creating a new one
            let thisAvatarName = utils.getAvatarName();
            let worldObject = realityEditor.getObject(worldObjectKey);
            // cachedWorldObject = worldObject;
            realityEditor.network.utilities.verifyObjectNameNotOnWorldServer(worldObject, thisAvatarName, () => {
                network.addAvatarObject(worldObjectKey, thisAvatarName, (data) => {
                    console.log('added new avatar object', data);
                    myAvatarId = data.id;
                    connectionStatus.isMyAvatarCreated = true;
                    refreshStatusUI();

                    // ping the server to discover the object more quickly
                    for (let i = 0; i < 3; i++) {
                        setTimeout(() => realityEditor.app.sendUDPMessage({action: 'ping'}), 300 * i * i);
                    }
                }, (err) => {
                    console.warn('unable to add avatar object to server', err);
                    connectionStatus.didCreationFail = true;
                    refreshStatusUI();
                });
            }, () => {
                console.warn('avatar already exists on server');
                connectionStatus.didCreationFail = true;
                refreshStatusUI();
            });

            // if it takes longer than 10 seconds to load the avatar, hide the "loading" UI - todo: retry if timeout
            setTimeout(() => {
                if (myAvatarId) return;
                connectionStatus.didCreationFail = true;
                refreshStatusUI();
            }, AVATAR_CREATION_TIMEOUT_LENGTH);
        });

        network.onAvatarDiscovered((object, objectKey) => {
            handleDiscoveredObject(object, objectKey);
            draw.renderAvatarIconList(connectedAvatarNames);
        });

        network.onAvatarDeleted((objectKey) => {
            delete avatarObjects[objectKey];
            delete connectedAvatarNames[objectKey];
            delete avatarTouchStates[objectKey];
            delete avatarUserProfiles[objectKey];
            draw.deleteAvatarMeshes(objectKey);
            draw.renderAvatarIconList(connectedAvatarNames);
        });

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            draw.renderOtherAvatars(avatarTouchStates, avatarUserProfiles);

            if (!myAvatarObject || globalStates.freezeButtonState) { return; }

            try {
                updateMyAvatar();

                // send updated ray even if the touch doesn't move, because the camera might have moved
                // Limit to 10 FPS because this is a bit CPU-intensive
                if (isPointerDown) {
                    let needsUpdate = lastPointerState.position &&
                        Date.now() - lastPointerState.timestamp > 100 &&
                        Date.now() - lastBeamOnTimestamp > 100;
                    if (!needsUpdate) return;
                    // this is a quick way to check for changes to the camera - in very rare instances this can be incorrect
                    // but because this is just for performance optimizations that is an ok tradeoff
                    let checksum = realityEditor.sceneGraph.getCameraNode().worldMatrix.reduce((sum, a) => sum + a, 0);
                    needsUpdate = lastPointerState.viewMatrixChecksum !== checksum;
                    if (!needsUpdate) return;
                    setBeamOn(lastPointerState.position.x, lastPointerState.position.y);
                    lastPointerState.viewMatrixChecksum = checksum;
                }
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

        setInterval(() => {
            if (myAvatarId && myAvatarObject) {
                network.keepObjectAlive(myAvatarId);
            }
        }, KEEP_ALIVE_HEARTBEAT_INTERVAL);
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

    // return a vector relative to the world object
    function getRayDirection(screenX, screenY) {
        if (!realityEditor.sceneGraph.getWorldId()) return null;

        let cameraNode = realityEditor.sceneGraph.getCameraNode();
        let worldObjectNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        const SEGMENT_LENGTH = 1000; // arbitrary, just need to calculate one point so we can solve parametric equation
        let testPoint = realityEditor.sceneGraph.getPointAtDistanceFromCamera(screenX, screenY, SEGMENT_LENGTH, worldObjectNode);
        let cameraRelativeToWorldObject = realityEditor.sceneGraph.convertToNewCoordSystem({x: 0, y: 0, z: 9}, cameraNode, worldObjectNode);
        let rayOrigin = [cameraRelativeToWorldObject.x, cameraRelativeToWorldObject.y, cameraRelativeToWorldObject.z];
        let arUtils = realityEditor.gui.ar.utilities;
        return arUtils.normalize(arUtils.subtract([testPoint.x, testPoint.y, testPoint.z], rayOrigin));
    }

    // checks where the click intersects with the area target, or the groundplane, and returns {x,y,z} relative to the world object origin 
    function getRaycastCoordinates(screenX, screenY) {
        let worldIntersectPoint = null;

        let objectsToCheck = [];
        if (cachedOcclusionObject) {
            objectsToCheck.push(cachedOcclusionObject);
        }

        if (cachedWorldObject && objectsToCheck.length > 0) {
            // by default, three.js raycast returns coordinates in the top-level scene coordinate system
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, objectsToCheck);
            if (raycastIntersects.length > 0) {
                worldIntersectPoint = raycastIntersects[0].point;
                
            // if we don't hit against the area target mesh, try colliding with the ground plane (if mode is enabled)
            } else if (RAYCAST_AGAINST_GROUNDPLANE) {
                let groundPlane = realityEditor.gui.threejsScene.getGroundPlaneCollider();
                raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [groundPlane]);
                if (raycastIntersects.length > 0) {
                    worldIntersectPoint = raycastIntersects[0].point;
                }
            }

            if (worldIntersectPoint) {
                // multiplying the point by the inverse world matrix seems to get it in the right coordinate system
                let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
                let matrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                realityEditor.gui.threejsScene.setMatrixFromArray(matrix, worldSceneNode.worldMatrix);
                matrix.invert();
                worldIntersectPoint.applyMatrix4(matrix);
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
                lastPointerState.position = {
                    x: e.pageX,
                    y: e.pageY
                };
                lastPointerState.timestamp = Date.now();
            }
        });

        ['pointerup', 'pointercancel', 'pointerleave'].forEach(eventName => {
            document.body.addEventListener(eventName, (e) => {
                if (realityEditor.device.isMouseEventCameraControl(e)) { return; }
                setBeamOff();
                lastPointerState.position = null;
            });
        });

        document.body.addEventListener('pointermove', (e) => {
            if (!isPointerDown || realityEditor.device.isMouseEventCameraControl(e)) { return; }
            if (network.isTouchStateFpsLimited()) {
                return;
            }
            // update the beam position even if not hitting background, as long as we started on the background
            setBeamOn(e.pageX, e.pageY);

            lastPointerState.position = {
                x: e.pageX,
                y: e.pageY
            };
            lastPointerState.timestamp = Date.now();
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
            rayDirection: getRayDirection(screenX, screenY),
            timestamp: Date.now()
        }

        lastBeamOnTimestamp = Date.now();

        if (touchState.isPointerDown && !(touchState.worldIntersectPoint || touchState.rayDirection)) { return; } // don't send if click on nothing

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
            worldIntersectPoint: null,
            rayDirection: null,
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
                connectionStatus.isMyAvatarInitialized && myAvatarId;
            // && connectionStatus.isWorldOcclusionObjectAdded;
            draw.renderConnectionFeedback(isConnectionReady);
        }

        if (connectionStatus.didCreationFail) {
            draw.renderConnectionFeedback(false, connectionStatus.didCreationFail);
        }
    }
    
    function getMyAvatarColor() {
        return new Promise((resolve) => {
            let id = setInterval(() => {
                if (myAvatarObject !== null) {
                    clearInterval(id);
                    resolve({
                        color: utils.getColor(myAvatarObject),
                        colorLighter: utils.getColorLighter(myAvatarObject)
                    });
                }
            }, 100);
        });
    }

    exports.initService = initService;
    exports.setBeamOn = setBeamOn;
    exports.setBeamOff = setBeamOff;
    exports.toggleDebugMode = toggleDebugMode;
    exports.getMyAvatarColor = getMyAvatarColor;

}(realityEditor.avatar));
