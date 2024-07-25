createNameSpace("realityEditor.avatar");

/**
 * @fileOverview realityEditor.avatar
 * When the app successfully localizes within a world, checks if this device has a "avatar" representation saved on that
 * world object's server. If not, create one. Continuously updates this object's position in the scene graph to match
 * the camera position, and broadcasts that position over the realtime sockets. On click-and-drag, sends this avatar's
 * touchState to other clients via the avatar's node's publicData, and renders laser beams coming from other avatars.
 */

(function(exports) {

    let network, draw, iconMenu, utils; // shortcuts to access realityEditor.avatar._____

    const KEEP_ALIVE_HEARTBEAT_INTERVAL = 3 * 1000; // should be a small fraction of the keep-alive timeout on the server (currently 15 seconds)
    const AVATAR_CREATION_TIMEOUT_LENGTH = 10 * 1000; // handle if avatar takes longer than 10 seconds to load
    const RAYCAST_AGAINST_GROUNDPLANE = true;

    let linkCanvas = null, linkCanvasCtx = null;
    let linkCanvasNeedsClear = true;
    
    let myAvatarId = null;
    let myAvatarObject = null;
    let avatarObjects = {}; // avatar objects are stored here, so that we know which ones we've discovered/initialized
    let avatarTouchStates = {}; // data received from avatars' touchState property in their storage node
    let myAvatarTouchState = null;
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
    let myUsername = window.localStorage.getItem('manuallyEnteredUsername') || null;
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
    };

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
    };

    let callbacks = {
        onMyAvatarInitialized: []
    };

    let isDesktop = false;

    function initService() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'g' || e.key === 'G') {
                console.log(connectedAvatarUserProfiles);
            }
        })
        network = realityEditor.avatar.network;
        draw = realityEditor.avatar.draw;
        iconMenu = realityEditor.avatar.iconMenu;
        utils = realityEditor.avatar.utils;

        iconMenu.initService();

        // begin creating our own avatar object when we localize within a world object
        realityEditor.worldObjects.onLocalizedWithinWorld(function(worldObjectKey) {
            if (worldObjectKey === realityEditor.worldObjects.getLocalWorldId()) { return; }

            if (!cachedWorldObject) {
                // ensure we keep a reference to the world object even if no mesh file loads
                cachedWorldObject = realityEditor.getObject(worldObjectKey);
            }

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
            window.addEventListener('resize', () => {
                realityEditor.avatar.setLinkCanvasNeedsClear(true);
                resizeLinkCanvas();
            });
        }

        network.onAvatarDiscovered((object, objectKey) => {
            handleDiscoveredObject(object, objectKey);
            iconMenu.renderAvatarIconList(connectedAvatarUserProfiles);
        });

        network.onAvatarDeleted((objectKey) => {
            delete avatarObjects[objectKey];
            delete connectedAvatarUserProfiles[objectKey];
            delete avatarTouchStates[objectKey];
            delete avatarCursorStates[objectKey];
            delete avatarNames[objectKey];
            draw.deleteAvatarMeshes(objectKey);
            iconMenu.renderAvatarIconList(connectedAvatarUserProfiles);
            realityEditor.avatar.setLinkCanvasNeedsClear(true);
            realityEditor.spatialCursor.deleteOtherSpatialCursor(objectKey);

            if (objectKey === myAvatarId) {
                myAvatarId = null;
                myAvatarObject = null;
            }
        });

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            if (linkCanvasNeedsClear) {
                clearLinkCanvas();
            }

            draw.renderOtherAvatars(avatarTouchStates, avatarNames, avatarCursorStates);
            draw.renderMyAvatar(myAvatarObject, myAvatarTouchState);

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

        //full path is used here as network variable may not be initialised before this function runs
        realityEditor.avatar.network.onLoadOcclusionObject((worldObject, occlusionObject) => {
            cachedWorldObject = worldObject;
            cachedOcclusionObject = occlusionObject;

            connectionStatus.isWorldOcclusionObjectAdded = true;
            refreshStatusUI();

            // we have a cachedWorldObject here, so it's also a good point to check pending subscriptions for that world
            network.processPendingAvatarInitializations(connectionStatus, cachedWorldObject, onOtherAvatarInitialized);
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
    
    // todo Steve: a function that subscribes to different users, so that whenever me / another user perform some actions, the user info should be included as part of the info in the action message,
    //  eg: when added a frame, realityEditor.gui.pocket.callbackHandler.triggerCallbacks('frameAdded', callback) should include who added the frame in the callback parameter.
    //  very similar to the function above 'getUserDetails'
    
    // todo Steve: object.json, last editor
    
    function addLinkCanvas() {
        let linkCanvasContainer = document.createElement('div');
        linkCanvasContainer.className = 'link-canvas-container';
        linkCanvasContainer.style.position = 'absolute';
        linkCanvasContainer.style.top = '0';
        linkCanvasContainer.style.left = '0';
        linkCanvasContainer.style.pointerEvents = 'none';
        linkCanvasContainer.style.zIndex = '3001';
        linkCanvasContainer.style.transform = 'translateZ(3001px)';
        document.body.appendChild(linkCanvasContainer);

        linkCanvas = document.createElement('canvas');
        linkCanvas.className = 'link-canvas';
        linkCanvas.style.position = 'absolute';
        linkCanvas.style.top = '0';
        linkCanvas.style.left = '0';
        linkCanvas.style.zIndex = '3001';
        linkCanvas.style.transform = 'translateZ(3001px)';
        linkCanvasContainer.appendChild(linkCanvas);

        linkCanvasCtx = linkCanvas.getContext("2d");
    }

    function resizeLinkCanvas() {
        if (linkCanvas !== undefined) {
            linkCanvas.width = window.innerWidth;
            linkCanvas.height = window.innerHeight;
        }
    }

    function clearLinkCanvas() {
        linkCanvasCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        linkCanvasNeedsClear = false;
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

        // cachedWorldObject = worldObject;
        realityEditor.network.utilities.verifyObjectNameNotOnWorldServer(worldObject, thisAvatarName, () => {
            network.addAvatarObject(worldObjectKey, thisAvatarName, (data) => {
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
        connectedAvatarUserProfiles[objectKey] = new utils.UserProfile(null, '', null, globalStates.tempUuid);

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
            isColored: realityEditor.spatialCursor.isSpatialCursorOnGroundPlane(),
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
            if (avatarNames[msgContent.object] !== userProfile.name) {
                // realityEditor.ai.onAvatarChangeName(avatarNames[msgContent.object], userProfile.name);
                console.log('TODO: refactor realityEditor.ai.onAvatarChangeName(connectedAvatarUserProfiles[myAvatarId].name, name)');
            }
            avatarNames[msgContent.object] = userProfile.name;
            if (!connectedAvatarUserProfiles[msgContent.object]) {
                connectedAvatarUserProfiles[msgContent.object] = new utils.UserProfile(null, '', null);
            }

            // Copy over any present keys
            Object.assign(connectedAvatarUserProfiles[msgContent.object], userProfile);

            draw.updateAvatarName(msgContent.object, userProfile.name);
            iconMenu.renderAvatarIconList(connectedAvatarUserProfiles);
            debugDataReceived();
        };
        
        subscriptionCallbacks[utils.PUBLIC_DATA_KEYS.aiDialogue] = (msgContent) => {
            // console.log(msgContent.publicData.aiDialogue);
            console.log("push other's ai dialogue");
            console.log('TODO: refactor realityEditor.ai.pushDialogueFromOtherUser(msgContent.publicData.aiDialogue)', msgContent);
            // realityEditor.ai.pushDialogueFromOtherUser(msgContent.publicData.aiDialogue);
        }
        
        subscriptionCallbacks[utils.PUBLIC_DATA_KEYS.aiApiKeys] = (msgContent) => {
            let endpoint = msgContent.publicData.aiApiKeys.endpoint;
            let azureApiKey = msgContent.publicData.aiApiKeys.azureApiKey;
            // realityEditor.network.postAiApiKeys(endpoint, azureApiKey, false); // TODO: bring this back if needed
        }

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

        if (cachedWorldObject) {
            // by default, three.js raycast returns coordinates in the top-level scene coordinate system
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, objectsToCheck);
            if (raycastIntersects.length > 0) {
                worldIntersectPoint = raycastIntersects[0].scenePoint;

            // if we don't hit against the area target mesh, try colliding with the ground plane (if mode is enabled)
            } else if (RAYCAST_AGAINST_GROUNDPLANE) {
                let groundPlane = realityEditor.gui.threejsScene.getGroundPlaneCollider();
                raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [groundPlane.getInternalObject()]);
                groundPlane.updateWorldMatrix(true, false);
                if (raycastIntersects.length > 0) {
                    worldIntersectPoint = raycastIntersects[0].scenePoint;
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
        
        callbacks.onMyAvatarInitialized.forEach(cb => {
            cb(myAvatarObject);
        });
    }
    /**
     * Sets my username – you can set this even before the avatar has been created
     * @param {string} name
     */
    function setMyUsername(name) {
        myUsername = name;
    }
    /**
     * Note: Avatar has to exist before calling this (call setMyUsername before it exists, or both for safety)
     * Stores the avatar's name as one property within the avatar node's userProfile public data
     * @param name
     */
    function writeUsername(name) {
        if (!myAvatarObject) { return; }
        // realityEditor.ai.onAvatarChangeName(connectedAvatarUserProfiles[myAvatarId].name, name);
        console.log('TODO: refactor realityEditor.ai.onAvatarChangeName(connectedAvatarUserProfiles[myAvatarId].name, name)');

        connectedAvatarUserProfiles[myAvatarId].name = name;
        let sessionId = globalStates.tempUuid;
        connectedAvatarUserProfiles[myAvatarId].sessionId = sessionId;
        draw.updateAvatarName(myAvatarId, name);
        iconMenu.renderAvatarIconList(connectedAvatarUserProfiles);

        let info = utils.getAvatarNodeInfo(myAvatarObject);
        if (info) {
            network.sendUserProfile(info, connectedAvatarUserProfiles[myAvatarId]); // name, myProviderId);
        }
    }
    /**
     * Stores who myAvatar is following in publicData.userProfile.lockOnMode, and sends that data to all other clients
     * @param {string} objectId
     */
    function writeMyLockOnMode(objectId) {
        if (!myAvatarObject) { return; }
        writeLockOnMode(myAvatarId, objectId);
    }
    /**
     * Sends a message to otherAvatarId telling them that they are now following myAvatarId (via lockOnMode in publicData)
     * @param {string} otherAvatarId
     */
    function writeLockOnToMe(otherAvatarId) {
        if (!myAvatarId) { return; }
        writeLockOnMode(otherAvatarId, myAvatarId);
    }

    /**
     * Helper function used by writeMyLockOnMode and writeLockOnToMe, to actually write the data and refresh the UI
     * @param {string} avatarId - the "follower" - whose userProfile to modify
     * @param {string} targetAvatarId - the "leader" - the avatar that will be stored in that userProfile
     */
    function writeLockOnMode(avatarId, targetAvatarId) {
        try {
            let object = realityEditor.getObject(avatarId);
            if (!object) { return; }
            connectedAvatarUserProfiles[avatarId].lockOnMode = targetAvatarId;
            iconMenu.renderAvatarIconList(connectedAvatarUserProfiles); // refresh the UI
            let info = utils.getAvatarNodeInfo(object);
            if (info) {
                network.sendUserProfile(info, connectedAvatarUserProfiles[avatarId]);
            }
        } catch (e) {
            console.warn('error writing lockOnMode to avatar', e);
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

            // show your own beam, so you can tell what you're pointing at
            myAvatarTouchState = touchState;
        }

        // snaps the spatial cursor to the beam endpoint on all devices until you stop the beam
        realityEditor.spatialCursor.updatePointerSnapMode(true);

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

            // stop showing your own beam
            myAvatarTouchState = touchState;
        }

        // ensure that on non-desktop devices, the spatial cursor position resets to center of view
        realityEditor.spatialCursor.updatePointerSnapMode(false);

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

    function getAvatarObjectKeyFromSessionId(sessionId) {
        for (let objectKey in connectedAvatarUserProfiles) {
            if (!connectedAvatarUserProfiles[objectKey]) {
                return;
            }
            let userProfile = connectedAvatarUserProfiles[objectKey];
            if (userProfile.sessionId !== sessionId) {
                continue;
            }
            return objectKey;
        }
    }
    
    function getAvatarNameFromObjectKey(objectKey) {
        if (!connectedAvatarUserProfiles[objectKey]) {
            return;
        }
        return connectedAvatarUserProfiles[objectKey].name;
    }
    
    function getMyAvatarNodeInfo() {
        return utils.getAvatarNodeInfo(myAvatarObject);
    }
    
    function getLinkCanvasInfo() {
        return {
            canvas: linkCanvas,
            ctx: linkCanvasCtx,
            // linkObject: linkObject
        };
    }
    
    function registerOnMyAvatarInitializedCallback(callback) {
        callbacks.onMyAvatarInitialized.push(callback);
        if (myAvatarObject) {
            callback(myAvatarObject);
        }
    }

    exports.initService = initService;
    exports.registerOnMyAvatarInitializedCallback = registerOnMyAvatarInitializedCallback;
    exports.setBeamOn = setBeamOn;
    exports.setBeamOff = setBeamOff;
    exports.toggleDebugMode = toggleDebugMode;
    exports.getMyAvatarColor = getMyAvatarColor;
    exports.getAvatarColorFromProviderId = getAvatarColorFromProviderId;
    exports.getAvatarObjectKeyFromSessionId = getAvatarObjectKeyFromSessionId;
    exports.getAvatarNameFromObjectKey = getAvatarNameFromObjectKey;
    exports.setMyUsername = setMyUsername; // this sets it preemptively if it doesn't exist yet
    exports.writeUsername = writeUsername; // this propagates the data if it already exists
    exports.writeMyLockOnMode = writeMyLockOnMode;
    exports.writeLockOnToMe = writeLockOnToMe;
    exports.clearLinkCanvas = clearLinkCanvas;
    exports.getLinkCanvasInfo = getLinkCanvasInfo;
    exports.isDesktop = function() {return isDesktop};
    exports.getConnectedAvatarList = () => { return connectedAvatarUserProfiles; };
    exports.setLinkCanvasNeedsClear = (value) => { linkCanvasNeedsClear = value; };
    exports.getMyAvatarId = () => {  return myAvatarId; };
    exports.getMyAvatarNodeInfo = getMyAvatarNodeInfo;

}(realityEditor.avatar));
