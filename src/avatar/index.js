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

    const KEEP_ALIVE_HEARTBEAT_INTERVAL = 3 * 1000; // should be a small fraction of the keep-alive timeout on the server (currently 15 seconds)
    const AVATAR_CREATION_TIMEOUT_LENGTH = 10 * 1000; // handle if avatar takes longer than 10 seconds to load
    const RAYCAST_AGAINST_GROUNDPLANE = false;

    let linkCanvas = null, linkCanvasCtx = null;
    let linkObject = {
        ballAnimationCount: 0
    };
    let menuBarHeight;
    
    let myAvatarId = null;
    let myAvatarObject = null;
    let avatarObjects = {}; // avatar objects are stored here, so that we know which ones we've discovered/initialized
    let avatarTouchStates = {}; // data received from avatars' touchState property in their storage node
    let avatarCursorStates = {}; // data received from avatars' cursorState property in their storage node
    let avatarNames = {}; // names received from avatars' userProfile property in their storage node
    let connectedAvatarUserProfiles = {}; // similar to avatarObjects, but maps objectKey -> user profile or undefined
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
    let myProviderId = '';

    // these are used for raycasting against the environment when sending laser beams
    let cachedWorldObject = null;
    let cachedOcclusionObject = null;

    // these are used to establish a connection and create the avatar object
    let connectionStatus = {
        isLocalized: false,
        isMyAvatarCreated: false,
        isMyAvatarInitialized: false,
        isWorldOcclusionObjectAdded: false,
        didCreationFail: false,
        isConnectionAttemptInProgress: false
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

    let isDesktop = false;

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

            attemptToCreateAvatarOnServer(worldObjectKey);

            setInterval(() => {
                try {
                    reestablishAvatarIfNeeded();
                } catch (e) {
                    console.warn('error trying to reestablish avatar', e);
                }
            }, 1000);

            // if it takes longer than 10 seconds to load the avatar, hide the "loading" UI - todo: retry if timeout
            setTimeout(() => {
                if (myAvatarId) return;
                connectionStatus.didCreationFail = true;
                refreshStatusUI();
            }, AVATAR_CREATION_TIMEOUT_LENGTH);
        });

        if (document.getElementsByClassName('link-canvas-container')[0] === undefined) {
            isDesktop = realityEditor.device.environment.isDesktop();
            addLinkCanvas();
            resizeLinkCanvas();
            translateLinkCanvas();
            window.addEventListener('resize', () => {
                clearLinkCanvas();
                resizeLinkCanvas();
            });
        }

        network.onAvatarDiscovered((object, objectKey) => {
            handleDiscoveredObject(object, objectKey);
            draw.renderAvatarIconList(connectedAvatarUserProfiles);
        });

        network.onAvatarDeleted((objectKey) => {
            delete avatarObjects[objectKey];
            delete connectedAvatarUserProfiles[objectKey];
            delete avatarTouchStates[objectKey];
            delete avatarCursorStates[objectKey];
            delete avatarNames[objectKey];
            draw.deleteAvatarMeshes(objectKey);
            draw.renderAvatarIconList(connectedAvatarUserProfiles);
            clearLinkCanvas();
            realityEditor.spatialCursor.deleteOtherSpatialCursor(objectKey);

            if (objectKey === myAvatarId) {
                myAvatarId = null;
                myAvatarObject = null;
            }
        });

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            draw.renderOtherAvatars(avatarTouchStates, avatarNames, avatarCursorStates);

            if (!myAvatarObject || globalStates.freezeButtonState) { return; }

            try {
                updateMyAvatar();

                sendMySpatialCursorPosition();

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

        realityEditor.app.promises.getProviderId().then(providerId => {
            myProviderId = providerId;
            // write user name will also persist providerId
            writeUsername(myUsername);
        });

        realityEditor.network.addPostMessageHandler('getUserDetails', (_, fullMessageData) => {
            realityEditor.network.postMessageIntoFrame(fullMessageData.frame, {
                userDetails: {
                    name: myUsername,
                    providerId: myProviderId,
                    sessionId: globalStates.tempUuid
                }
            });
        });
    }
    
    function addLinkCanvas() {
        let linkCanvasContainer = document.createElement('div');
        linkCanvasContainer.className = 'link-canvas-container';
        linkCanvasContainer.style.position = 'absolute';
        linkCanvasContainer.style.top = '0';
        linkCanvasContainer.style.left = '0';
        linkCanvasContainer.style.pointerEvents = 'none';
        document.body.appendChild(linkCanvasContainer);

        linkCanvas = document.createElement('canvas');
        linkCanvas.className = 'link-canvas';
        linkCanvas.style.position = 'absolute';
        menuBarHeight = realityEditor.device.environment.variables.screenTopOffset;
        linkCanvas.style.top = `${menuBarHeight}px`;
        linkCanvas.style.left = '0';
        linkCanvas.style.zIndex = '3001';
        linkCanvasContainer.appendChild(linkCanvas);

        linkCanvasCtx = linkCanvas.getContext("2d");
    }

    function resizeLinkCanvas() {
        if (linkCanvas !== undefined) {
            linkCanvas.width = window.innerWidth;
            linkCanvas.height = window.innerHeight - menuBarHeight;
        }
    }
    
    function translateLinkCanvas() {
        linkCanvasCtx.translate(0, -menuBarHeight);
    }

    function clearLinkCanvas() {
        linkCanvasCtx.clearRect(0, menuBarHeight, window.innerWidth, window.innerHeight - menuBarHeight);
    }

    function reestablishAvatarIfNeeded() {
        if (myAvatarId || myAvatarObject) return;
        if (connectionStatus.isConnectionAttemptInProgress) return;
        let worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (!worldObject || worldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) return;

        attemptToCreateAvatarOnServer(worldObject.objectId);
    }

    function attemptToCreateAvatarOnServer(worldObjectKey) {
        if (!worldObjectKey) return;

        // in theory there shouldn't be an avatar object for this device on the server yet, but verify that before creating a new one
        let thisAvatarName = utils.getAvatarName();
        let worldObject = realityEditor.getObject(worldObjectKey);

        if (!worldObject) return;

        connectionStatus.isConnectionAttemptInProgress = true;
        console.log('attempt to create new avatar on server');

        // cachedWorldObject = worldObject;
        realityEditor.network.utilities.verifyObjectNameNotOnWorldServer(worldObject, thisAvatarName, () => {
            network.addAvatarObject(worldObjectKey, thisAvatarName, (data) => {
                console.log('added new avatar object', data);
                myAvatarId = data.id;
                connectionStatus.isMyAvatarCreated = true;
                connectionStatus.isConnectionAttemptInProgress = false;
                refreshStatusUI();

                // ping the server to discover the object more quickly
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => realityEditor.app.sendUDPMessage({action: 'ping'}), 300 * i * i);
                }
            }, (err) => {
                console.warn('unable to add avatar object to server', err);
                connectionStatus.didCreationFail = true;
                connectionStatus.isConnectionAttemptInProgress = false;
                refreshStatusUI();
            });
        }, () => {
            console.warn('avatar already exists on server');
            connectionStatus.didCreationFail = true;
            connectionStatus.isConnectionAttemptInProgress = false;
            refreshStatusUI();
        });
    }

    // initialize the avatar object representing my own device, and those representing other devices
    function handleDiscoveredObject(object, objectKey) {
        if (!utils.isAvatarObject(object)) { return; }

        // ignore objects from other worlds if we have a primaryWorld set
        let primaryWorldInfo = realityEditor.network.discovery.getPrimaryWorldInfo();
        if (primaryWorldInfo && primaryWorldInfo.id &&
            object.worldId && object.worldId !== primaryWorldInfo.id) {
            return;
        }

        if (typeof avatarObjects[objectKey] !== 'undefined') { return; }
        avatarObjects[objectKey] = object; // keep track of which avatar objects we've processed so far
        connectedAvatarUserProfiles[objectKey] = {
            name: null,
            providerId: '',
        };

        function finalizeAvatar() {
            // There is a race between object discovery here and object
            // discovery as a result of creation which sets myAvatarId
            if (!myAvatarId) {
                setTimeout(finalizeAvatar, 500);
            }

            if (objectKey === myAvatarId) {
                myAvatarObject = object;
                onMyAvatarInitialized();
            } else {
                onOtherAvatarInitialized(object);
            }
        }
        finalizeAvatar();
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
    
    function sendMySpatialCursorPosition() {
        if (!myAvatarObject) return;

        let avatarSceneNode = realityEditor.sceneGraph.getSceneNodeById(myAvatarId);
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.CAMERA);
        if (!avatarSceneNode || !cameraNode) { return; }

        let spatialCursorMatrix = realityEditor.spatialCursor.getCursorRelativeToWorldObject();
        let worldId = realityEditor.sceneGraph.getWorldId();
        
        if (!spatialCursorMatrix || !worldId || worldId === realityEditor.worldObjects.getLocalWorldId()) return;
        
        let cursorState = {
            matrix: spatialCursorMatrix,
            colorHSL: utils.getColor(myAvatarObject),
            worldId: worldId
        }

        let info = utils.getAvatarNodeInfo(myAvatarObject);
        if (info) {
            network.sendSpatialCursorState(info, cursorState, { limitToFps: true });
        }

        debugDataSent();
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
        
        subscriptionCallbacks[utils.PUBLIC_DATA_KEYS.cursorState] = (msgContent) => {
            avatarCursorStates[msgContent.object] = msgContent.publicData.cursorState;
            debugDataReceived();
        };

        subscriptionCallbacks[utils.PUBLIC_DATA_KEYS.userProfile] = (msgContent) => {
            const userProfile = msgContent.publicData.userProfile;
            avatarNames[msgContent.object] = userProfile.name;
            if (!connectedAvatarUserProfiles[msgContent.object]) {
                connectedAvatarUserProfiles[msgContent.object] = {};
            }

            // Copy over any present keys
            Object.assign(connectedAvatarUserProfiles[msgContent.object], userProfile);

            draw.updateAvatarName(msgContent.object, userProfile.name);
            draw.renderAvatarIconList(connectedAvatarUserProfiles);
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

        writeUsername(myUsername);

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

    // you can set this even before the avatar has been created
    function setMyUsername(name) {
        myUsername = name;
    }

    // name is one property within the avatar node's userProfile public data
    // avatar has to exist before calling this
    function writeUsername(name) {
        if (!myAvatarObject) { return; }
        connectedAvatarUserProfiles[myAvatarId].name = name;
        draw.updateAvatarName(myAvatarId, name);
        draw.renderAvatarIconList(connectedAvatarUserProfiles);

        let info = utils.getAvatarNodeInfo(myAvatarObject);
        if (info) {
            network.sendUserProfile(info, name, myProviderId);
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

    /**
     * @param {string} providerId
     * @return {string?} color
     */
    function getAvatarColorFromProviderId(providerId) {
        for (let objectKey in connectedAvatarUserProfiles) {
            if (!connectedAvatarUserProfiles[objectKey]) {
                return;
            }
            let userProfile = connectedAvatarUserProfiles[objectKey];
            if (userProfile.providerId !== providerId) {
                continue;
            }
            return utils.getColor(realityEditor.getObject(objectKey));
        }
    }
    
    function getLinkCanvasInfo() {
        return {
            canvas: linkCanvas,
            ctx: linkCanvasCtx,
            linkObject: linkObject
        };
    }

    exports.initService = initService;
    exports.setBeamOn = setBeamOn;
    exports.setBeamOff = setBeamOff;
    exports.toggleDebugMode = toggleDebugMode;
    exports.getMyAvatarColor = getMyAvatarColor;
    exports.getAvatarColorFromProviderId = getAvatarColorFromProviderId;
    exports.setMyUsername = setMyUsername;
    exports.clearLinkCanvas = clearLinkCanvas;
    exports.getLinkCanvasInfo = getLinkCanvasInfo;
    exports.isDesktop = function() {return isDesktop};

}(realityEditor.avatar));
