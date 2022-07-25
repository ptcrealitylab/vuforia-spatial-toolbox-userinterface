createNameSpace("realityEditor.avatarObjects");

/**
 * @fileOverview realityEditor.avatarObjects
 * When the app successfully localizes within a world, checks if this device has a "avatar" representation saved on that
 * world object's server. If not, create one. Continuously updates this object's position in the scene graph to match
 * the camera position, and broadcasts that position over the realtime sockets.
 */

(function(exports) {

    const UPDATE_FPS = 10;
    const DEBUG_CONNECTION_STATUS = false;

    const idPrefix = '_AVATAR_';
    let initializedId = null;
    let myAvatarObject = null;
    let avatarObjectInitialized = false;
    let avatarObjects = {}; // avatar objects are stored in the regular global "objects" variable, but also in here
    let allAvatarStates = {};
    let avatarMeshes = {};
    let isPointerDown = false;

    let sendTimeout = null;
    let receiveTimeout = null;
    let occlusionDownloadInterval = null;

    let cachedWorldObject = null;
    let cachedOcclusionObject = null;
    let lastBroadcastPositionTimestamp = Date.now();
    let lastWritePublicDataTimestamp = Date.now();
    
    let pendingSubscriptions = {};

    let connectionStatus = {
        isLocalized: false,
        isMyAvatarCreated: false,
        isMyAvatarInitialized: false,
        isWorldOcclusionObjectAdded: false,
        subscribedToHowMany: 0,
        didReceiveAnything: false,
        didJustReceive: false,
        didSendAnything: false,
        didJustSend: false
    }

    function initService() {
        console.log('initService: avatar objects');
        
        setInterval(() => {
            checkPendingSubscriptions();
        }, 1000);

        realityEditor.worldObjects.onLocalizedWithinWorld(function(worldObjectKey) {
            if (worldObjectKey === realityEditor.worldObjects.getLocalWorldId()) {
                return; // skip local world
            }

            console.log('avatarObjects module onLocalizedWithinWorld: ' + worldObjectKey);
            
            connectionStatus.isLocalized = true;
            renderConnectionStatus();

            let thisAvatarName = getAvatarName();

            // check if avatarObject for this device exists on server?
            let worldObject = realityEditor.getObject(worldObjectKey);
            let downloadUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/object/' + thisAvatarName);

            realityEditor.network.getData(null,  null, null, downloadUrl, function (_objectKey, _frameKey, _nodeKey, msg) {
                if (msg) {
                    console.log('found avatarObject', msg);
                    avatarObjectInitialized = true;
                } else {
                    console.log('cant find avatarObject - try creating it');
                    addAvatarObject(worldObjectKey, thisAvatarName);
                }
            });

        });

        // when an object is detected, check if we need to add a world object for its server
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            console.log('avatar: handling newly loaded object');
            handleDiscoveredObject(object, objectKey);
        });

        for (let [key, object] of Object.entries(objects)) {
            console.log('avatar: handling previously loaded object');
            handleDiscoveredObject(object, key);
        }

        realityEditor.gui.ar.draw.addUpdateListener(function(_visibleObjects) {
            try {
                renderOtherAvatars();
            } catch (e) {
                console.warn('error rendering other avatars', e);
            }

            if (!avatarObjectInitialized || globalStates.freezeButtonState) { return; }

            try {
                updateMyAvatar();
            } catch (e) {
                console.warn('error updating my avatar', e);
            }
        });

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
                    connectionStatus.isWorldOcclusionObjectAdded = true;
                    renderConnectionStatus();
                }
            }
            if (cachedOcclusionObject) {
                clearInterval(occlusionDownloadInterval);
                occlusionDownloadInterval = null;
            }
        }, 1000);
    }

    function handleDiscoveredObject(object, objectKey) {
        if (isAvatarObject(object)) {
            if (typeof avatarObjects[objectKey] === 'undefined') {
                avatarObjects[objectKey] = object;
                
                // further initialize discovered avatar objects
                if (objectKey === initializedId) {
                    myAvatarObject = object;
                    onMyAvatarInitialized();
                } else {
                    onOtherAvatarInitialized(object);
                }
            }
        }
    }

    function renderOtherAvatars() {
        for (const [objectKey, avatarState] of Object.entries(allAvatarStates)) {
            let touchState = avatarState.publicData.touchState;
            if (!touchState) { continue; }

            // if that device isn't touching down, hide its laser beam and ignore the rest
            if (!touchState.isPointerDown) {
                if (avatarMeshes[objectKey]) {
                    // avatarMeshes[objectKey].device.visible = false;
                    avatarMeshes[objectKey].pointer.visible = false;
                    avatarMeshes[objectKey].beam.visible = false;
                }
                continue;
            }

            const THREE = realityEditor.gui.threejsScene.THREE;

            const RENDER_DEVICE_CUBE = false;

            const color = getColor(avatarObjects[objectKey]) || '#ffff00';

            // show a three.js cube at the avatar's matrix, and a beam that goes from the device to its destination point
            if (typeof avatarMeshes[objectKey] === 'undefined') {
                avatarMeshes[objectKey] = {
                    // device: boxMesh('#ffff00', objectKey + 'device'),
                    pointer: sphereMesh(color, objectKey + 'pointer', 25),
                    beam: cylinderMesh(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0), color)
                }
                if (RENDER_DEVICE_CUBE) {
                    avatarMeshes[objectKey].device = boxMesh(color, objectKey + 'device')
                    avatarMeshes[objectKey].device.matrixAutoUpdate = false;
                    realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].device);
                }
                avatarMeshes[objectKey].beam.name = objectKey + 'beam';
                realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].pointer);
                realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
            }

            // get the real position of the avatar by multiplying the avatar matrix (which is relative to world) by the world origin matrix
            let thatAvatarSceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
            let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
            let worldMatrixThree = new THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(worldMatrixThree, worldSceneNode.worldMatrix);
            let avatarObjectMatrixThree = new THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(avatarObjectMatrixThree, thatAvatarSceneNode.worldMatrix);
            avatarObjectMatrixThree.premultiply(worldMatrixThree);

            // then transform the final avatar position into groundplane coordinates since the threejsScene is relative to groundplane
            let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
            let groundPlaneMatrix = new THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneMatrix, groundPlaneSceneNode.worldMatrix);
            avatarObjectMatrixThree.premultiply(groundPlaneMatrix.invert());

            if (RENDER_DEVICE_CUBE) {
                avatarMeshes[objectKey].device.visible = true;
                avatarMeshes[objectKey].device.matrixAutoUpdate = false
                avatarMeshes[objectKey].device.matrix.copy(avatarObjectMatrixThree);
            }
            avatarMeshes[objectKey].pointer.visible = true;
            avatarMeshes[objectKey].beam.visible = true;

            if (touchState.worldIntersectPoint) {
                // worldIntersectPoint was converted to world coordinates
                // need to convert back to groundPlane coordinates in this system
                let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
                let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
                let groundPlaneRelativeToWorldToolbox = worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode);
                let groundPlaneRelativeToWorldThree = new realityEditor.gui.threejsScene.THREE.Matrix4();
                realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneRelativeToWorldThree, groundPlaneRelativeToWorldToolbox);
                let convertedEndPosition = new THREE.Vector3(touchState.worldIntersectPoint.x, touchState.worldIntersectPoint.y, touchState.worldIntersectPoint.z);
                convertedEndPosition.applyMatrix4(groundPlaneRelativeToWorldThree);

                avatarMeshes[objectKey].pointer.position.set(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);

                let startPosition = new THREE.Vector3(avatarObjectMatrixThree.elements[12], avatarObjectMatrixThree.elements[13], avatarObjectMatrixThree.elements[14]);
                let endPosition = new THREE.Vector3(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);
                avatarMeshes[objectKey].beam = updateCylinderMesh(avatarMeshes[objectKey].beam, startPosition, endPosition, color);
                avatarMeshes[objectKey].beam.name = objectKey + 'beam';
                realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
            }
        }
    }

    // helper function to generate an integer hash from a string (https://stackoverflow.com/a/15710692)
    function hashCode(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    }

    function getColor(avatarObject) {
        let editorId = avatarObject.objectId.split('_AVATAR_')[1].split('_')[0];
        let id = Math.abs(hashCode(editorId));
        return `hsl(${(id % Math.PI) * 360 / Math.PI}, 100%, 50%)`;
    }

    function boxMesh(color, name) {
        const THREE = realityEditor.gui.threejsScene.THREE;

        const geo = new THREE.BoxGeometry(100, 100, 100);
        const mat = new THREE.MeshBasicMaterial({color: color});
        const box = new THREE.Mesh(geo, mat);
        box.name = name;

        return box;
    }

    function sphereMesh(color, name, radius) {
        const THREE = realityEditor.gui.threejsScene.THREE;

        const geo = new THREE.SphereGeometry((radius || 50), 8, 6, 0, Math.PI, 0, Math.PI);
        const mat = new THREE.MeshBasicMaterial({color: color});
        const sphere = new THREE.Mesh(geo, mat);
        sphere.name = name;

        return sphere;
    }

    function cylinderMesh(startPoint, endPoint, color) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        // edge from X to Y
        // console.log(endPoint, startPoint);
        let length = 0;
        if (startPoint && endPoint) {
            let direction = new THREE.Vector3().subVectors(endPoint, startPoint);
            length = direction.length();
        }
        const material = getBeamMaterial(color);
        // Make the geometry (of "direction" length)
        var geometry = new THREE.CylinderGeometry(6, 6, length, 6, 2, false);
        // shift it so one end rests on the origin
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, length / 2, 0));
        // rotate it the right way for lookAt to work
        geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(90)));
        // Make a mesh with the geometry
        var mesh = new THREE.Mesh(geometry, material);
        if (startPoint) {
            // Position it where we want
            mesh.position.copy(startPoint);
        }
        if (endPoint) {
            // And make it point to where we want
            mesh.lookAt(endPoint);
        }

        return mesh;
    }

    // TODO: make this return a material using a custom shader to fade out the opacity
    // ideally the opacity will be close to 1 where the beam hits the area target,
    // and fades out to 0 or 0.1 after a meter or two, so that it just indicates the direction without being too intense
    function getBeamMaterial(color) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        return new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
    }

    function updateCylinderMesh(obj, startPoint, endPoint, color) {
        obj.geometry.dispose();
        obj.material.dispose();

        realityEditor.gui.threejsScene.removeFromScene(obj);
        return cylinderMesh(startPoint, endPoint, color);
    }

    function updateMyAvatar() {
        // update the avatar object to match the camera position each frame (if it exists)
        let avatarObject = realityEditor.getObject(initializedId);
        if (!avatarObject) { return; }

        let avatarSceneNode = realityEditor.sceneGraph.getSceneNodeById(initializedId);
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.CAMERA);
        if (!avatarSceneNode || !cameraNode) { return; }

        // place it in front of the camera, facing towards the camera
        let distanceInFrontOfCamera = 0;

        let initialVehicleMatrix = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, -1 * distanceInFrontOfCamera, 1
        ];

        avatarSceneNode.setPositionRelativeTo(cameraNode, initialVehicleMatrix);
        avatarSceneNode.updateWorldMatrix();
        // avatarSceneNode.needsUploadToServer = true;

        let worldObjectId = realityEditor.sceneGraph.getWorldId();
        let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
        let relativeMatrix = avatarSceneNode.getMatrixRelativeTo(worldNode);

        if (avatarObject.matrix.length !== 16) { avatarObject.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
        let totalDifference = sumOfElementDifferences(avatarObject.matrix, relativeMatrix);
        if (totalDifference < 0.00001) {
            return; // don't update if matrix hasn't really changed
        }

        // already gets uploaded to server but isn't set locally yet
        avatarObject.matrix = relativeMatrix;

        // console.log('avatar position = ' + avatarSceneNode.worldMatrix);

        // sceneGraph uploads it to server every 1 second via REST, but we can stream updates in realtime here
        // let dontBroadcast = false;
        // if (!dontBroadcast) {
        if (Date.now() - lastBroadcastPositionTimestamp < (1000 / UPDATE_FPS)) { // limit to 10
            return;
        }
        realityEditor.network.realtime.broadcastUpdate(initializedId, null, null, 'matrix', relativeMatrix);
        // }

        lastBroadcastPositionTimestamp = Date.now();
    }

    function sumOfElementDifferences(M1, M2) {
        // assumes M1 and M2 are of equal length
        let sum = 0;
        for (let i = 0; i < M1.length; i++) {
            sum += Math.abs(M1[i] - M2[i]);
        }
        return sum;
    }

    function getAvatarName() {
        const deviceSuffix = realityEditor.device.environment.variables.supportsAreaTargetCapture ? '_iOS' : '_desktop';
        return idPrefix + globalStates.tempUuid + deviceSuffix;
    }
    
    function checkPendingSubscriptions() {
        if (!connectionStatus.isLocalized || !cachedWorldObject) {
            console.log('cant process pending subscriptions yet');
            return; // don't process until we're properly localized
        }
        
        let objectIdList = pendingSubscriptions[cachedWorldObject.objectId];
        if (objectIdList && objectIdList.length > 0) {
            console.log('processing pending subscriptions for world ' + cachedWorldObject.objectId, objectIdList);
            while (objectIdList.length > 0) {
                let nextObjectId = objectIdList.pop();
                let thatAvatarObject = realityEditor.getObject(nextObjectId);
                if (thatAvatarObject) {
                    console.log('process subscription: ' + thatAvatarObject.objectId);
                    onOtherAvatarInitialized(thatAvatarObject);
                }
            }
        }
    }

    function onOtherAvatarInitialized(thatAvatarObject) {
        if (!connectionStatus.isLocalized || !cachedWorldObject) {
            if (typeof pendingSubscriptions[thatAvatarObject.worldId] === 'undefined') {
                pendingSubscriptions[thatAvatarObject.worldId] = [];
            }
            pendingSubscriptions[thatAvatarObject.worldId].push(thatAvatarObject.objectId);
            console.log('added pending subscription for ' + thatAvatarObject.objectId);
            return;
        }
        
        const TOOL_NAME = 'Avatar'; // these need to match the way the server intializes the tool and node
        const NODE_NAME = 'storage';

        let avatarObjectKey = thatAvatarObject.objectId;
        let avatarFrameKey = Object.keys(thatAvatarObject.frames).find(name => name.includes(TOOL_NAME));
        let thatAvatarTool = realityEditor.getFrame(avatarObjectKey, avatarFrameKey);
        let avatarNodeKey = Object.keys(thatAvatarTool.nodes).find(name => name.includes(NODE_NAME));

        console.log('subscribe to publicData from ' + avatarObjectKey);

        connectionStatus.subscribedToHowMany += 1;
        renderConnectionStatus();

        realityEditor.network.realtime.subscribeToPublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, 'touchState', (msg) => {
            let msgContent = JSON.parse(msg);
            // console.log('avatarObjects.js received publicData', msgContent);

            allAvatarStates[msgContent.object] = msgContent;

            if (!connectionStatus.didReceiveAnything) {
                connectionStatus.didReceiveAnything = true;
                renderConnectionStatus();
            }
            if (!connectionStatus.didJustReceive && !receiveTimeout) {
                connectionStatus.didJustReceive = true;
                renderConnectionStatus();

                receiveTimeout = setTimeout(() => {
                    connectionStatus.didJustReceive = false;
                    renderConnectionStatus();
                    clearTimeout(receiveTimeout);
                    receiveTimeout = null;
                }, 1000);
            }
        });
    }

    function getRaycastCoordinates(screenX, screenY) {
        let worldIntersectPoint = null;
        // let cameraWorldPoint = null;

        if (!cachedWorldObject) {
            cachedWorldObject = realityEditor.worldObjects.getBestWorldObject();
        }
        if (cachedWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
            cachedWorldObject = null; // don't accept the local world object
        }
        if (cachedWorldObject && !cachedOcclusionObject) {
            cachedOcclusionObject = realityEditor.gui.threejsScene.getObjectForWorldRaycasts(cachedWorldObject.objectId);
            if (cachedOcclusionObject) {
                connectionStatus.isWorldOcclusionObjectAdded = true;
                renderConnectionStatus();
            }
        }

        if (cachedWorldObject && cachedOcclusionObject) {
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [cachedOcclusionObject]);
            if (raycastIntersects.length > 0) {
                // raycastIntersects[0].point is in the groundPlane coordinate system
                // we want to convert it to the world coordinate system

                // TODO: BEN – the remote operator only sends the right coordinates if we comment this out. (otherwise 1286mm too low)
                // TODO:     - but the iOS app only sends the right coordinates if we leave it in. (otherwise totally wrong)
                // TODO:     - figure out how to make both work – do we just multiply by inverse ground plane, or inverse world, rather than include both?
                ///////////////////////////////
                // This is the one that is working!
                let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
                // let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
                // let worldRelativeToGroundOldCalculations = worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode);
                // let worldRelativeToGround = groundPlaneSceneNode.getMatrixRelativeTo(worldSceneNode);
                let matrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                // realityEditor.gui.threejsScene.setMatrixFromArray(matrix, worldRelativeToGround);
                realityEditor.gui.threejsScene.setMatrixFromArray(matrix, worldSceneNode.worldMatrix);
                matrix.invert();
                raycastIntersects[0].point.applyMatrix4(matrix);
                ///////////////////////////////

                // multiply intersect, which is in ROOT coordinates, by the relative world matrix (ground plane) to ROOT
                // let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                // // realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, realityEditor.sceneGraph.getGroundPlaneModelViewMatrix())
                // let groundPlaneNode = realityEditor.sceneGraph.getGroundPlaneNode();
                // realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneNode.worldMatrix);
                // inverseGroundPlaneMatrix.invert();

                // let inverseWorldMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                // let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
                // realityEditor.gui.threejsScene.setMatrixFromArray(inverseWorldMatrix, worldSceneNode.worldMatrix);
                // inverseWorldMatrix.invert();

                // raycastIntersects[0].point.applyMatrix4(inverseGroundPlaneMatrix);
                // raycastIntersects[0].point.applyMatrix4(inverseWorldMatrix);
                worldIntersectPoint = raycastIntersects[0].point;

                // // calculate the camera position in the correct coordinate system
                // let cameraPos = realityEditor.sceneGraph.getWorldPosition(realityEditor.sceneGraph.NAMES.CAMERA);
                // cameraWorldPoint = new realityEditor.gui.threejsScene.THREE.Vector3(cameraPos.x, cameraPos.y, cameraPos.z);
                // // cameraWorldPoint.applyMatrix4(inverseGroundPlaneMatrix);
            }
        }

        return worldIntersectPoint; // these are relative to the world object
    }

    function onMyAvatarInitialized() {
        console.log('add touch subscriptions to write screenX, screenY to publicData');

        connectionStatus.isMyAvatarInitialized = true;
        renderConnectionStatus();

        document.body.addEventListener('pointerdown', (e) => {
            if (realityEditor.device.environment.requiresMouseEvents() && (e.button === 2 || e.button === 1)) { return; } // ignore right-clicks
            setBeamOn(e.pageX, e.pageY);
        });

        let pointerUpHandler = (e) => {
            if (realityEditor.device.environment.requiresMouseEvents() && (e.button === 2 || e.button === 1)) { return; } // ignore right-clicks
            setBeamOff();
        }
        document.body.addEventListener('pointerup', pointerUpHandler);
        document.body.addEventListener('pointercancel', pointerUpHandler);
        document.body.addEventListener('pointerleave', pointerUpHandler);

        document.body.addEventListener('pointermove', (e) => {
            if (!isPointerDown) { return; }
            if (realityEditor.device.environment.requiresMouseEvents() && (e.button === 2 || e.button === 1)) { return; } // ignore right-clicks

            if (Date.now() - lastWritePublicDataTimestamp < (1000 / UPDATE_FPS)) { // limit to 10 FPS
                return;
            }

            setBeamOn(e.pageX, e.pageY); // updates the beam position

            lastWritePublicDataTimestamp = Date.now();
        });
    }

    function refreshConnectionStatus() {
        if (!connectionStatus.didSendAnything) {
            connectionStatus.didSendAnything = true;
            renderConnectionStatus();
        }
        if (!connectionStatus.didJustSend && !sendTimeout) {
            connectionStatus.didJustSend = true;
            renderConnectionStatus();

            sendTimeout = setTimeout(() => {
                connectionStatus.didJustSend = false;
                renderConnectionStatus();
                clearTimeout(sendTimeout);
                sendTimeout = null;
            }, 1000);
        }
    }

    /**
     * Tell the server (corresponding to this world object) to create a new avatar object with the specified ID
     * @param {string} worldId
     * @param {string} clientId
     * @return {boolean}
     */
    function addAvatarObject(worldId, clientId) {
        let worldObject = realityEditor.getObject(worldId);
        if (!worldObject) {
            console.warn('Unable to add avatar object', worldId);
            return;
        }

        let postUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/');
        let params = new URLSearchParams({action: 'new', name: clientId, isAvatar: true, worldId: worldId});
        return fetch(postUrl, {
            method: 'POST',
            body: params
        }).then(response => response.json())
            .then((data) => {
                console.log('added new avatar object', data);
                initializedId = data.id;
                avatarObjectInitialized = true;

                connectionStatus.isMyAvatarCreated = true;
                renderConnectionStatus();
        }).catch(e => {
            console.error('Unable to add avatar object', e);
        });
    }

    function getAvatarObjects() {
        return avatarObjects;
    }
    
    function getAvatarNodeInfo() {
        if (!myAvatarObject) { return null; }

        const TOOL_NAME = 'Avatar'; // these need to match the way the server intializes the tool and node
        const NODE_NAME = 'storage';

        let avatarObjectKey = myAvatarObject.objectId;
        let avatarFrameKey = Object.keys(myAvatarObject.frames).find(name => name.includes(TOOL_NAME));
        let myAvatarTool = realityEditor.getFrame(avatarObjectKey, avatarFrameKey);
        if (!myAvatarTool) { return null; }

        let avatarNodeKey = Object.keys(myAvatarTool.nodes).find(name => name.includes(NODE_NAME));
        if (!avatarNodeKey) { return null; }

        return {
            objectKey: avatarObjectKey,
            frameKey: avatarFrameKey,
            nodeKey: avatarNodeKey
        }
    }
    
    function setBeamOn(screenX, screenY) {
        // console.log('document.body.pointerdown', screenX, screenY);
        isPointerDown = true;

        let touchState = {
            isPointerDown: isPointerDown,
            screenX: screenX,
            screenY: screenY,
            worldIntersectPoint: getRaycastCoordinates(screenX, screenY),
            timestamp: Date.now()
        }

        if (touchState.isPointerDown && !touchState.worldIntersectPoint) { return; } // don't send if click on nothing

        let info = getAvatarNodeInfo();
        if (info) {
            realityEditor.network.realtime.writePublicData(info.objectKey, info.frameKey, info.nodeKey, 'touchState', touchState);
            renderCursorOverlay(true, screenX, screenY);
        }

        refreshConnectionStatus();

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
            realityEditor.network.realtime.writePublicData(info.objectKey, info.frameKey, info.nodeKey, 'touchState', touchState);
            renderCursorOverlay(false, screenX, screenY);
        }

        refreshConnectionStatus();
    }

    function renderConnectionStatus() {
        if (!DEBUG_CONNECTION_STATUS) { return; }

        let gui = document.getElementById('avatarConnectionStatus');
        if (!gui) {
            gui = document.createElement('div');
            gui.id = 'avatarConnectionStatus';
            gui.style.position = 'absolute';
            gui.style.width = '100vw';
            gui.style.height = '100px';
            gui.style.left = '0';
            gui.style.top = realityEditor.device.environment.variables.screenTopOffset + 'px';
            gui.style.zIndex = '3000';
            gui.style.transform = 'translateZ(3000px)';
            document.body.appendChild(gui);
        }
        let sendText = connectionStatus.didSendAnything && connectionStatus.didJustSend ? 'TRUE' : connectionStatus.didSendAnything ? 'true' : 'false';
        let receiveText = connectionStatus.didReceiveAnything && connectionStatus.didJustReceive ? 'TRUE' : connectionStatus.didReceiveAnything ? 'true' : 'false';

        gui.innerHTML = 'Localized? (' + connectionStatus.isLocalized +').  ' +
            'Created? (' + connectionStatus.isMyAvatarCreated + ').' +
            '<br/>' +
            'Verified? (' + connectionStatus.isMyAvatarInitialized + ').  ' +
            'Occlusion? (' + connectionStatus.isWorldOcclusionObjectAdded + ').' +
            '<br/>' +
            'Subscribed? (' + connectionStatus.subscribedToHowMany + ').  ' +
            '<br/>' +
            'Did Send? (' + sendText + ').  ' +
            'Did Receive? (' + receiveText + ')' +
            '<br/>' +
            'My ID: ' + (myAvatarObject ? myAvatarObject.objectId : 'null');
    }
    
    // when sending a beam, highlight your cursor
    function renderCursorOverlay(isVisible, screenX, screenY) {
        let overlay = document.getElementById('beamOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'beamOverlay';
            overlay.style.position = 'absolute';
            overlay.style.left = '-10px';
            overlay.style.top = '-10px';
            overlay.style.pointerEvents = 'none';
            overlay.style.width = '20px';
            overlay.style.height = '20px';
            overlay.style.borderRadius = '10px';
            overlay.style.backgroundColor = getColor(myAvatarObject);
            overlay.style.opacity = '0.5';
            document.body.appendChild(overlay);
        }
        overlay.style.transform = 'translate3d(' + screenX + 'px, ' + screenY + 'px, 1201px)';
        overlay.style.display = isVisible ? 'inline' : 'none';
    }

    function isAvatarObject(object) {
        return object.type === 'avatar' || object.objectId.indexOf('_AVATAR_') === 0;
    }

    exports.initService = initService;
    exports.getAvatarObjects = getAvatarObjects;
    exports.setBeamOn = setBeamOn;
    exports.setBeamOff = setBeamOff;
    exports.isAvatarObject = isAvatarObject;

}(realityEditor.avatarObjects));
