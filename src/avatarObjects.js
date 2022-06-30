createNameSpace("realityEditor.avatarObjects");

/**
 * @fileOverview realityEditor.avatarObjects
 * When the app successfully localizes within a world, checks if this device has a "avatar" representation saved on that
 * world object's server. If not, create one. Continuously updates this object's position in the scene graph to match
 * the camera position, and broadcasts that position over the realtime sockets.
 */

(function(exports) {

    const idPrefix = '_AVATAR_'
    let initializedId = null;
    let myAvatarObject = null;
    let avatarObjectInitialized = false;
    let avatarObjects = {}; // avatar objects are stored in the regular global "objects" variable, but also in here
    let allAvatarStates = {};
    let avatarMeshes = {};

    /**
     * Init avatar object module
     */
    function initService() {
        console.log('initService: avatar objects');

        realityEditor.worldObjects.onLocalizedWithinWorld(function(worldObjectKey) {
            if (worldObjectKey === realityEditor.worldObjects.getLocalWorldId()) {
                return; // skip local world
            }

            console.log('avatarObjects module onLocalizedWithinWorld: ' + worldObjectKey);

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

        function handleDiscoveredObject(object, objectKey) {
            if (object.type === 'avatar') {
                // add to the internal world objects
                if (typeof avatarObjects[objectKey] === 'undefined') {
                    avatarObjects[objectKey] = object;
                    // TODO: further initialize discovered avatar objects?

                    if (objectKey === initializedId) {
                        myAvatarObject = object;
                        onMyAvatarInitialized();
                    } else {
                        onOtherAvatarInitialized(object);
                    }
                }
            }
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

        function renderOtherAvatars() {
            for (const [objectKey, avatarState] of Object.entries(allAvatarStates)) {
                let touchState = avatarState.publicData.touchState;
                if (!touchState) { continue; }

                // if (touchState.isPointerDown) {
                    const THREE = realityEditor.gui.threejsScene.THREE;

                    // show a three.js cube at the avatar's matrix
                    if (typeof avatarMeshes[objectKey] === 'undefined') {
                        avatarMeshes[objectKey] = {
                            device: boxMesh('#ffff00', objectKey + 'device'),
                            pointer: boxMesh('#ff00ff', objectKey + 'pointer'),
                            beam: cylinderMesh(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1000, 0, 0), '#ff00ff')
                        }
                        avatarMeshes[objectKey].device.matrixAutoUpdate = false;
                        // avatarMeshes[objectKey].pointer.matrixAutoUpdate = true; // true by default

                        avatarMeshes[objectKey].beam.name = objectKey + 'beam';

                        realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].device);
                        realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].pointer);
                        realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
                    }

                    avatarMeshes[objectKey].device.visible = true;
                    avatarMeshes[objectKey].pointer.visible = true;
                    avatarMeshes[objectKey].beam.visible = true;

                    // let thatAvatarObject = realityEditor.getObject(objectKey);
                    // TODO: check if sceneGraph is updating the avatar matrices even though they're not part of the visibleObjects
                    let thatAvatarSceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
                    // let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
                    let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
                    let relativeMatrix = thatAvatarSceneNode.getMatrixRelativeTo(groundPlaneSceneNode);
                    // let relativeMatrix = thatAvatarSceneNode.getMatrixRelativeTo(worldSceneNode);
                    // let matrix = thatAvatarSceneNode.worldMatrix;
                    // avatarMeshes[objectKey].position.set(relativeMatrix[12], relativeMatrix[13], relativeMatrix[14]);
                    // let groundplaneRelativeToWorld = groundPlaneSceneNode.getMatrixRelativeTo(worldSceneNode);

                    realityEditor.gui.threejsScene.setMatrixFromArray(avatarMeshes[objectKey].device.matrix, relativeMatrix);

                    if (touchState.isPointerDown) {
                        
                        // worldIntersectPoint was converted to world coordinates
                        // need to convert back to groundPlane coordinates in this system
                        
                        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
                        let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
                        // let groundPlaneRelativeToWorld = groundPlaneSceneNode.getMatrixRelativeTo(worldSceneNode);
                        let groundPlaneRelativeToWorld = worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode);
                        let matrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                        realityEditor.gui.threejsScene.setMatrixFromArray(matrix, groundPlaneRelativeToWorld);
                        let convertedEndPosition = new THREE.Vector3(touchState.worldIntersectPoint.x, touchState.worldIntersectPoint.y, touchState.worldIntersectPoint.z);
                        convertedEndPosition.applyMatrix4(matrix);

                        avatarMeshes[objectKey].pointer.position.set(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);

                        // realityEditor.gui.threejsScene.setMatrixFromArray(avatarMeshes[objectKey].pointer.matrix)
                        // avatarMeshes[objectKey].pointer.position.set(touchState.worldIntersectPoint.x, touchState.worldIntersectPoint.y, touchState.worldIntersectPoint.z);

                        let startPosition = new THREE.Vector3(relativeMatrix[12], relativeMatrix[13], relativeMatrix[14]);
                        // let endPosition = new THREE.Vector3(touchState.worldIntersectPoint.x, touchState.worldIntersectPoint.y, touchState.worldIntersectPoint.z);
                        let endPosition = new THREE.Vector3(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);
                        avatarMeshes[objectKey].beam = updateCylinderMesh(avatarMeshes[objectKey].beam, startPosition, endPosition, '#ff00ff');
                        avatarMeshes[objectKey].beam.name = objectKey + 'beam';
                        realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
                    }

                // } else {
                    // hide the three.js cube
                    if (avatarMeshes[objectKey]) {
                        // avatarMeshes[objectKey].device.visible = false;
                        if (!touchState.isPointerDown) {
                            avatarMeshes[objectKey].pointer.visible = false;
                            avatarMeshes[objectKey].beam.visible = false;
                        }
                    }
                // }
            }

            // allAvatarStates._AVATAR_Dk1mqddd_Qctecqyvrj1.publicData.touchState.isPointerDown
        }

        const boxMesh = function(color, name) {
            const THREE = realityEditor.gui.threejsScene.THREE;

            const geo = new THREE.BoxGeometry(100, 100, 100);
            const mat = new THREE.MeshBasicMaterial({color: color});
            const box = new THREE.Mesh(geo, mat);
            box.name = name;

            return box;
        }

        const cylinderMesh = function (startPoint, endPoint, color) {
            const THREE = realityEditor.gui.threejsScene.THREE;
            // edge from X to Y
            // console.log(endPoint, startPoint);
            let length = 0;
            if (startPoint && endPoint) {
                let direction = new THREE.Vector3().subVectors(endPoint, startPoint);
                length = direction.length();
            }
            const material = new THREE.MeshBasicMaterial({ color: (color || 0xff0000) });
            // Make the geometry (of "direction" length)
            var geometry = new THREE.CylinderGeometry(10, 10, length, 6, 2, false);
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

        const updateCylinderMesh = function (obj, startPoint, endPoint, color) {
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
            let dontBroadcast = false;
            if (!dontBroadcast) {
                realityEditor.network.realtime.broadcastUpdate(initializedId, null, null, 'matrix', relativeMatrix);
            }
        }
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
        return idPrefix + globalStates.tempUuid;
    }

    function onOtherAvatarInitialized(thatAvatarObject) {
        const TOOL_NAME = 'Avatar'; // these need to match the way the server intializes the tool and node
        const NODE_NAME = 'storage';

        let avatarObjectKey = thatAvatarObject.objectId;
        let avatarFrameKey = Object.keys(thatAvatarObject.frames).find(name => name.includes(TOOL_NAME));
        let thatAvatarTool = realityEditor.getFrame(avatarObjectKey, avatarFrameKey);
        let avatarNodeKey = Object.keys(thatAvatarTool.nodes).find(name => name.includes(NODE_NAME));

        console.log('subscribe to publicData from ' + avatarObjectKey);

        realityEditor.network.realtime.subscribeToPublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, 'touchState', (msg) => {
            let msgContent = JSON.parse(msg);
            // console.log('avatarObjects.js received publicData', msgContent);

            allAvatarStates[msgContent.object] = msgContent;
        });
    }

    let cachedWorldObject = null;
    let cachedOcclusionObject = null;

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
        }

        if (cachedWorldObject && cachedOcclusionObject) {
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [cachedOcclusionObject]);
            if (raycastIntersects.length > 0) {
                // raycastIntersects[0].point is in the groundPlane coordinate system
                // we want to convert it to the world coordinate system

                ///////////////////////////////////
                // This is the one that is working!
                // let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
                // let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
                // // let worldRelativeToGroundOldCalculations = worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode);
                // let worldRelativeToGround = groundPlaneSceneNode.getMatrixRelativeTo(worldSceneNode);
                // let matrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                // realityEditor.gui.threejsScene.setMatrixFromArray(matrix, worldRelativeToGround);
                // raycastIntersects[0].point.applyMatrix4(matrix);
                ///////////////////////////////////

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

        const TOOL_NAME = 'Avatar'; // these need to match the way the server intializes the tool and node
        const NODE_NAME = 'storage';

        let avatarObjectKey = myAvatarObject.objectId;
        let avatarFrameKey = Object.keys(myAvatarObject.frames).find(name => name.includes(TOOL_NAME));
        let myAvatarTool = realityEditor.getFrame(avatarObjectKey, avatarFrameKey);
        let avatarNodeKey = Object.keys(myAvatarTool.nodes).find(name => name.includes(NODE_NAME));

        let isPointerDown = false;
        document.body.addEventListener('pointerdown', (e) => {
            console.log('document.body.pointerdown', e.pageX, e.pageY);
            isPointerDown = true;

            let touchState = {
                isPointerDown: isPointerDown,
                screenX: e.pageX,
                screenY: e.pageY,
                worldIntersectPoint: getRaycastCoordinates(e.pageX, e.pageY)
            }

            realityEditor.network.realtime.writePublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, 'touchState', touchState);
        });

        let pointerUpHandler = (e) => {
            console.log('document.body.pointerup', e.pageX, e.pageY);
            isPointerDown = false;

            let touchState = {
                isPointerDown: isPointerDown,
                screenX: e.pageX,
                screenY: e.pageY,
                worldIntersectPoint: getRaycastCoordinates(e.pageX, e.pageY)
            }

            realityEditor.network.realtime.writePublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, 'touchState', touchState);
        }
        document.body.addEventListener('pointerup', pointerUpHandler);
        document.body.addEventListener('pointercancel', pointerUpHandler);
        document.body.addEventListener('pointerleave', pointerUpHandler);

        document.body.addEventListener('pointermove', (e) => {
            if (!isPointerDown) { return; }
            console.log('document.body.pointermove', e.pageX, e.pageY);

            let touchState = {
                isPointerDown: isPointerDown,
                screenX: e.pageX,
                screenY: e.pageY,
                worldIntersectPoint: getRaycastCoordinates(e.pageX, e.pageY)
            }

            realityEditor.network.realtime.writePublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, 'touchState', touchState);
        });
    }

    /**
     * Tell the server (corresponding to this world object) to create a new avatar object with the specified ID
     * @param {string} worldId
     * @param {string} clientId
     * @return {boolean}
     */
    function addAvatarObject(worldId, clientId) {
        let worldObject = realityEditor.getObject(worldId);
        if (!worldObject) { return; }

        let postUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/');
        let params = new URLSearchParams({action: 'new', name: clientId, isAvatar: true, worldId: worldId});
        fetch(postUrl, {
            method: 'POST',
            body: params
        }).then(response => response.json())
            .then((data) => {
                console.log('added new avatar object', data);
                initializedId = data.id;
                avatarObjectInitialized = true;
            });
        return false;
    }

    function getAvatarObjects() {
        return avatarObjects;
    }

    exports.initService = initService;
    exports.getAvatarObjects = getAvatarObjects;

}(realityEditor.avatarObjects));
