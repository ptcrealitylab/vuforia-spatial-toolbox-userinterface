createNameSpace("realityEditor.spatialCursor");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {

    const SNAP_CURSOR_TO_TOOLS = true;

    let isCursorEnabled = true;
    let isUpdateLoopRunning = false;

    let cachedWorldObject;
    let cachedOcclusionObject;
    let occlusionDownloadInterval = null;
    let worldIntersectPoint = {};
    let indicator1;
    let indicator2;
    let overlapped = false;

    let clock = new THREE.Clock();
    let uniforms = {
        'time': {value: 0},
    };
    
    // offset the spatial cursor with the worldIntersectPoint to avoid clipping plane issues
    const worldIntersectOffsetDist = 15;
    const indicatorAxis = new THREE.Vector3(0, 0, 1);
    // const normalCursorMaterial = new THREE.ShaderMaterial({
    //     vertexShader: realityEditor.spatialCursor.shader.vertexShader.vertexShaderCode,
    //     fragmentShader: realityEditor.spatialCursor.shader.normalCursorFragmentShader.normalCursorFragmentShaderCode,
    //     uniforms: uniforms,
    //     transparent: true,
    //     side: THREE.DoubleSide,
    // });
    const vertexShader = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
    `;
    const normalFragmentShader = `
    uniform float time;
    varying vec2 vUv;
    
    void main(void) {
        vec2 position = -1.0 + 2.0 * vUv;
        vec2 origin = vec2(0.0);
        float color = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
        float alpha = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
        gl_FragColor = vec4(color, color, color, alpha);
    }
    `;
    const colorFragmentShader = `
    uniform float time;
    varying vec2 vUv;
    
    void main(void) {
        vec2 position = -1.0 + 2.0 * vUv;
        vec2 translate = vec2(-0.5, 0);
        position += translate;
    
        float r = abs(sin(position.x * position.y + time / 2.0));
        float g = abs(sin(position.x * position.y + time / 4.0));
        float b = abs(sin(position.x * position.y + time / 6.0));
    
        gl_FragColor = vec4(r, g, b, 1.0);
    }
    `;
    const normalCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: normalFragmentShader,
        uniforms: uniforms,
        transparent: true,
        side: THREE.DoubleSide,
    });
    const colorCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: colorFragmentShader,
        uniforms: uniforms,
        transparent: true,
        side: THREE.DoubleSide,
    });

    function initService() {
        onLoadOcclusionObject((worldObject, occlusionObject) => {
            cachedWorldObject = worldObject;
            cachedOcclusionObject = occlusionObject;
        });
        
        addSpatialCursor();
        addTestSpatialCursor();
        toggleDisplaySpatialCursor(false);

        // begin update loop
        update();
        
        const ADD_SEARCH_TOOL_WITH_CURSOR = false;
        
        if (ADD_SEARCH_TOOL_WITH_CURSOR) {
            document.addEventListener('pointerdown', (e) => {
                if (!indicator2 || !indicator2.visible) return;
                if (realityEditor.device.isMouseEventCameraControl(e)) return;
                if (e.target.tagName !== 'CANVAS') return; // if clicking on a button, etc, don't trigger this

                // raycast against the spatial cursor
                let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY, [indicator2]);
                if (intersects.length > 0) {
                    addToolAtScreenCenter('searchDigitalThread');
                }
            });
        }
    }

    // copied from pop-up-onboarding addon – should we refactor somewhere convenient to both?
    function addToolAtScreenCenter(toolName) {
        let touchPosition = {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        };

        // parameters for createFrame function. all can be undefined except name, x, y, noUserInteraction
        let startPositionOffset, width, height, nodesList, x, y, noUserInteraction, objectKeyToAddTo;
        x = touchPosition.x;
        y = touchPosition.y;
        noUserInteraction = true;

        let addedElement = realityEditor.gui.pocket.createFrame(toolName, startPositionOffset, width, height, nodesList, x, y, noUserInteraction, objectKeyToAddTo);

        if (typeof realityEditor.spatialCursor !== 'undefined' && realityEditor.spatialCursor.getOrientedCursorRelativeToWorldObject()) {
            realityEditor.device.resetEditingState();
        } else {
            realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid, 400);
        }

        // make sure tool is created and uploaded before we send the position, otherwise it won't save
        setTimeout(function() {
            realityEditor.network.postVehiclePosition(addedElement);
        }, 1000);
    }

    function update() {
        if (!isCursorEnabled) {
            isUpdateLoopRunning = false;
            return; // need to call update() again when isCursorEnabled gets toggled on again
        }
        isUpdateLoopRunning = true;

        try {
            let screenX = window.innerWidth / 2;
            let screenY = window.innerHeight / 2;
            if (realityEditor.device.environment.requiresMouseEvents()) {
                let mousePosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                screenX = mousePosition.x;
                screenY = mousePosition.y;
            }
            worldIntersectPoint = getRaycastCoordinates(screenX, screenY);
            updateSpatialCursor();
            updateTestSpatialCursor();
            uniforms['time'].value = clock.getElapsedTime() * 10;

            if (SNAP_CURSOR_TO_TOOLS) {
                trySnappingCursorToTools();
            }
        } catch (e) {
            console.warn('error in spatialCursor', e);
        }
        window.requestAnimationFrame(update);
    }

    function trySnappingCursorToTools() {
        // constantly check if the screen center overlaps any iframes
        let overlappingDivs = realityEditor.device.utilities.getAllDivsUnderCoordinate(screenX, screenY);
        // console.log(overlappingDivs);
        overlapped = overlappingDivs.some(element => {
            return element.tagName === 'IFRAME' && typeof element.dataset.objectKey !== 'undefined';
        });
        if (overlapped) {
            let overlappingIframe = overlappingDivs.find(element => element.tagName === 'IFRAME');
            let tool = realityEditor.getFrame(overlappingIframe.dataset.objectKey, overlappingIframe.dataset.frameKey);
            if (tool.fullScreen) {
                overlapped = false;
            } else {
                let position = getToolPosition(overlappingIframe.dataset.frameKey);
                indicator1.position.set(position.x, position.y, position.z);
                indicator1.quaternion.setFromUnitVectors(indicatorAxis, getToolDirection(overlappingIframe.dataset.frameKey));
            }
        }
    }

    function addSpatialCursor() {
        const geometryLength = 50;
        const geometry = new THREE.CircleGeometry(geometryLength, 32);
        indicator1 = new THREE.Mesh(geometry, normalCursorMaterial);
        realityEditor.gui.threejsScene.addToScene(indicator1);
    }
    
    function addTestSpatialCursor() {
        const geometryLength = 50;
        const geometry = new THREE.CircleGeometry(geometryLength, 32);
        const material = new THREE.MeshBasicMaterial({color: new THREE.Color(0x006fff)})
        indicator2 = new THREE.Mesh(geometry, material);
        realityEditor.gui.threejsScene.addToScene(indicator2);
    }
    
    function updateSpatialCursor() {
        if (typeof worldIntersectPoint.point !== 'undefined') {
            indicator1.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
            let offset = worldIntersectPoint.normalVector.clone().multiplyScalar(worldIntersectOffsetDist);
            indicator1.position.add(offset);
            indicator1.quaternion.setFromUnitVectors(indicatorAxis, worldIntersectPoint.normalVector);
        }
        indicator1.material = overlapped ? colorCursorMaterial : normalCursorMaterial;
    }

    function updateTestSpatialCursor() {
        if (typeof worldIntersectPoint.point !== 'undefined') {
            indicator2.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
            indicator2.quaternion.setFromUnitVectors(indicatorAxis, worldIntersectPoint.normalVector);
        }
    }

    function toggleDisplaySpatialCursor(newValue) {
        isCursorEnabled = newValue;
        indicator1.visible = newValue;
        indicator2.visible = newValue;
        
        if (newValue) {
            document.getElementById('canvas').style.cursor = 'none';
        } else {
            document.getElementById('canvas').style.cursor = 'auto';
        }

        if (isCursorEnabled && !isUpdateLoopRunning) {
            update(); // restart the update loop
        }
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

    function getRaycastCoordinates(screenX, screenY) {

        let objectsToCheck = [];
        if (cachedOcclusionObject) {
            objectsToCheck.push(cachedOcclusionObject);
        }
        // if (realityEditor.gui.threejsScene.getGroundPlaneCollider()) {
        //     objectsToCheck.push(realityEditor.gui.threejsScene.getGroundPlaneCollider());
        // }
        if (cachedWorldObject && objectsToCheck.length > 0) {
            // by default, three.js raycast returns coordinates in the top-level scene coordinate system
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, objectsToCheck);
            if (raycastIntersects.length > 0) {
                let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
                let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
                inverseGroundPlaneMatrix.invert();
                raycastIntersects[0].point.applyMatrix4(inverseGroundPlaneMatrix);
                let trInvGroundPlaneMat = inverseGroundPlaneMatrix.clone().transpose();
                worldIntersectPoint = {
                    point: raycastIntersects[0].point,
                    normalVector: raycastIntersects[0].face.normal.clone().applyMatrix4(trInvGroundPlaneMat).normalize(),
                }
            }
        }
        return worldIntersectPoint; // these are relative to the world object
    }

    // gets the position relative to groundplane (common coord system for threejsScene)
    function getToolPosition(toolId) {
        let toolSceneNode = realityEditor.sceneGraph.getSceneNodeById(toolId);
        let groundPlaneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        return realityEditor.sceneGraph.convertToNewCoordSystem({x: 0, y: 0, z: 0}, toolSceneNode, groundPlaneNode);
    }

    // gets the direction the tool is facing, within the coordinate system of the groundplane
    function getToolDirection(toolId) {
        let toolSceneNode = realityEditor.sceneGraph.getSceneNodeById(toolId);
        let groundPlaneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        let toolMatrix = realityEditor.sceneGraph.convertToNewCoordSystem(realityEditor.gui.ar.utilities.newIdentityMatrix(), toolSceneNode, groundPlaneNode);
        let forwardVector = realityEditor.gui.ar.utilities.getForwardVector(toolMatrix);
        return new THREE.Vector3(forwardVector[0], forwardVector[1], forwardVector[2]);
    }

    function getCursorRelativeToWorldObject() {
        if (!cachedWorldObject || !cachedOcclusionObject) { return null; }

        let cursorMatrix = indicator1.matrixWorld.clone(); // in ROOT coordinates
        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        return realityEditor.sceneGraph.convertToNewCoordSystem(cursorMatrix, realityEditor.sceneGraph.getSceneNodeById('ROOT'), worldSceneNode);
    }

    // we need to apply multiple transformations to rotate the spatial cursor so that its local up vector is
    // best aligned with the global up, it faces towards the camera rather than away, and if it's on a
    // horizontal surface, it rotates so that its local up vector is in line with the camera forward vector
    function getOrientedCursorRelativeToWorldObject() {
        if (!indicator1.visible) { return null; }

        let spatialCursorMatrix = getCursorRelativeToWorldObject();
        if (spatialCursorMatrix) {
            const utils = realityEditor.gui.ar.utilities;
            let rotatedMatrix = utils.copyMatrix(spatialCursorMatrix.elements);
            let forwardVector = utils.getForwardVector(rotatedMatrix);
            // TODO: may need to convert this relative to world object, but for now global up and world up are aligned anyways
            let globalUpVector = [0, -1, 0];

            // crossing forward vector with desired up vector yields new right vector
            // then cross new right with forward to get orthogonal local up vector (similar to camera lookAt math)

            let newRightVector = utils.normalize(utils.crossProduct(forwardVector, globalUpVector));
            // handle co-linear case by reverting to original axis
            if (isNaN(newRightVector[0])) { newRightVector = utils.getRightVector(rotatedMatrix); }

            let newUpVector = utils.normalize(utils.crossProduct(newRightVector, forwardVector));
            if (isNaN(newUpVector[0])) { newUpVector = utils.getUpVector(rotatedMatrix); }

            let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
            let cameraRelativeToWorldObject = realityEditor.sceneGraph.convertToNewCoordSystem(utils.newIdentityMatrix(), realityEditor.sceneGraph.getCameraNode(), worldSceneNode);

            // compute dot product of camera forward and new tool forward to see whether it's facing towards or away from you
            let cameraForward = utils.normalize(utils.getForwardVector(cameraRelativeToWorldObject));

            // check if it is upright enough to be considered on a horizontal surface – 0.9 seems to work well
            if (Math.abs(utils.dotProduct(forwardVector, globalUpVector)) > 0.9) {
                // math works out same as above, except the camera forward is the desired "up vector" in this case
                newRightVector = utils.normalize(utils.crossProduct(forwardVector, cameraForward));
                if (isNaN(newRightVector[0])) { newRightVector = utils.getRightVector(rotatedMatrix); }

                newUpVector = utils.normalize(utils.crossProduct(newRightVector, forwardVector));
                if (isNaN(newUpVector[0])) { newUpVector = utils.getUpVector(rotatedMatrix); }
            }

            // if normals are inverted and tool ends up facing away from camera instead of towards it, flip it left-right again
            let dotProduct = utils.dotProduct(cameraForward, forwardVector);

            // assign the new right and up vectors to the tool matrix, keeping its forward the same
            rotatedMatrix[0] = newRightVector[0] * Math.sign(dotProduct);
            rotatedMatrix[1] = newRightVector[1] * Math.sign(dotProduct);
            rotatedMatrix[2] = newRightVector[2] * Math.sign(dotProduct);
            rotatedMatrix[4] = newUpVector[0];
            rotatedMatrix[5] = newUpVector[1];
            rotatedMatrix[6] = newUpVector[2];

            return rotatedMatrix;
        }

        return null;
    }

    exports.initService = initService;
    exports.getOrientedCursorRelativeToWorldObject = getOrientedCursorRelativeToWorldObject;
    exports.toggleDisplaySpatialCursor = toggleDisplaySpatialCursor;
    exports.isSpatialCursorEnabled = () => { return isCursorEnabled; }
}(realityEditor.spatialCursor));
