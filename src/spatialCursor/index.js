createNameSpace("realityEditor.spatialCursor");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {

    const SNAP_CURSOR_TO_TOOLS = false; // the snapping doesn't do anything yet, so turn off for now
    const DEFAULT_SPATIAL_CURSOR_ON = true; // applied after we localize within a target / download occlusion mesh

    let isCursorEnabled = false; // always starts off, turns on after localize
    let isUpdateLoopRunning = false;
    let occlusionDownloadInterval = null;
    let cachedOcclusionObject = null;
    let cachedWorldObject = null;
    
    let opacityFactor = 1;
    let indicator1;
    let indicator2;
    let overlapped = false;
    let isMyColorDetermined = false;

    // contains spatial cursors of other users – updated by their avatar's publicData
    let otherSpatialCursors = {};

    let clock = new THREE.Clock();
    let uniforms = {
        'EPSILON': {value: Number.EPSILON},
        'time': {value: 0},
        'opacityFactor': {value: opacityFactor},
    };
    
    // offset the spatial cursor with the worldIntersectPoint to avoid clipping plane issues
    const topCursorOffset = 15;
    const bottomCursorOffset = 1;
    const indicatorAxis = new THREE.Vector3(0, 0, 1);
    // const normalCursorMaterial = new THREE.ShaderMaterial({
    //     vertexShader: realityEditor.spatialCursor.shader.vertexShader.vertexShaderCode,
    //     fragmentShader: realityEditor.spatialCursor.shader.normalCursorFragmentShader.normalCursorFragmentShaderCode,
    //     uniforms: uniforms,
    //     transparent: true,
    //     side: THREE.DoubleSide,
    // });
    const vertexShader = `
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
    varying vec2 vUv;
    //uniform EPSILON;
    
    void main() {
        ${THREE.ShaderChunk.logdepthbuf_vertex}
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
    `;
    const normalFragmentShader = `
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    varying vec2 vUv;
    uniform float opacityFactor;
    
    void main(void) {
        ${THREE.ShaderChunk.logdepthbuf_fragment}
        vec2 position = -1.0 + 2.0 * vUv;
        vec2 origin = vec2(0.0);
        float color = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
        float alpha = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
        gl_FragColor = vec4(color, color, color, alpha * opacityFactor);
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
    // remember to set depthTest=false and depthWrite=false after creating the material, to prevent visual glitches
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


    let color = 'rgb(0, 255, 255)', colorLighter = 'rgb(255, 255, 255)';
    let finalColor = [{
        color: new THREE.Color(color),
        colorLighter: new THREE.Color(colorLighter)
    }];
    let uniforms2 = {
        'EPSILON': {value: Number.EPSILON},
        'avatarColor': {value: finalColor},
        'opacityFactor': {value: opacityFactor},
    };
    const testCursorFragmentShader = `
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    varying vec2 vUv;
    uniform float opacityFactor;
    
    // set up color uniforms
    struct AvatarColor {
        vec3 color;
        vec3 colorLighter;
    };
    uniform AvatarColor avatarColor[1];
    
    void main(void) {
        ${THREE.ShaderChunk.logdepthbuf_fragment}
        vec3 color = avatarColor[0].color;
        gl_FragColor = vec4(color, 0.5 * opacityFactor);
    }
    `;
    const testCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: testCursorFragmentShader,
        uniforms: uniforms2,
        transparent: true,
        // blending: THREE.CustomBlending,
        // blendEquation: THREE.AddEquation,
        // blendSrc: THREE.SrcColorFactor,
        // blendDst: THREE.OneMinusSrcAlphaFactor,
        side: THREE.DoubleSide,
    });
    // const testCursorMaterial = new THREE.ShaderMaterial({
    //     vertexShader: vertexShader,
    //     fragmentShader: testCursorFragmentShader,
    //     uniforms: uniforms2,
    //     transparent: true,
    //     blending: THREE.AdditiveBlending,
    //     side: THREE.DoubleSide,
    // });

    const clamp = (x, low, high) => {
        return Math.min(Math.max(x, low), high);
    }

    const remap01 = (x, low, high) => {
        return clamp((x - low) / (high - low), 0, 1);
    }

    const remap = (x, lowIn, highIn, lowOut, highOut) => {
        return lowOut + (highOut - lowOut) * remap01(x, lowIn, highIn);
    }

    async function getMyAvatarColor() {
        let myAvatarColor = await realityEditor.avatar.getMyAvatarColor();
        color = `${myAvatarColor.color}`;
        colorLighter = `${myAvatarColor.colorLighter}`;
        finalColor[0] = {
            color: new THREE.Color(color),
            colorLighter: new THREE.Color(colorLighter)
        };

        // show the cursor if it was hidden while this function resolves
        isMyColorDetermined = true;
        if (isCursorEnabled && !isUpdateLoopRunning) {
            update(); // restart the update loop
        }
    }

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

    async function initService() {
        onLoadOcclusionObject((worldObject, occlusionObject) => {
            cachedWorldObject = worldObject;
            cachedOcclusionObject = occlusionObject;

            if (DEFAULT_SPATIAL_CURSOR_ON) {
                toggleDisplaySpatialCursor(true);
            }
        });
        
        addSpatialCursor();
        addTestSpatialCursor();
        toggleDisplaySpatialCursor(false);

        await getMyAvatarColor();
        uniforms2['avatarColor'].value = finalColor;

        const ADD_SEARCH_TOOL_WITH_CURSOR = false;

        if (ADD_SEARCH_TOOL_WITH_CURSOR) {
            document.addEventListener('pointerdown', (e) => {
                if (!indicator2 || !indicator2.visible) return;
                if (realityEditor.device.isMouseEventCameraControl(e)) return;
                if (!realityEditor.device.utilities.isEventHittingBackground(e)) return; // if clicking on a button, etc, don't trigger this

                // raycast against the spatial cursor
                let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY, [indicator2]);
                if (intersects.length > 0) {
                    addToolAtScreenCenter('searchDigitalThread', { moveToCursor: true });
                }
            });
        }
    }

    // publicly accessible function to add a tool at the spatial cursor position (or floating in front of you)
    function addToolAtScreenCenter(toolName, { moveToCursor = false } = {}) {
        
        let spatialCursorMatrix = null;
        if (moveToCursor) {
            spatialCursorMatrix = realityEditor.spatialCursor.getOrientedCursorRelativeToWorldObject();
        } else {
            spatialCursorMatrix = realityEditor.spatialCursor.getOrientedCursorIfItWereAtScreenCenter();
        }

        let addedElement = realityEditor.gui.pocket.createFrame(toolName, {
            noUserInteraction: true,
            pageX: window.innerWidth / 2,
            pageY: window.innerHeight / 2,
            initialMatrix: (spatialCursorMatrix) ? spatialCursorMatrix : undefined,
            onUploadComplete: () => {
                realityEditor.network.postVehiclePosition(addedElement);
            }
        });

        if (!moveToCursor && !spatialCursorMatrix) {
            let mmInFrontOfCamera = 400 * realityEditor.device.environment.variables.newFrameDistanceMultiplier
            realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid, mmInFrontOfCamera);
        }

        return addedElement;
    }

    function update() {
        if (!isCursorEnabled || !isMyColorDetermined) {
            isUpdateLoopRunning = false;
            indicator1.visible = false;
            indicator2.visible = false;
            return; // need to call update() again when isCursorEnabled gets toggled on again
        }
        isUpdateLoopRunning = true;

        try {
            // for iPhone usage, keep spatial cursor at the center of the screen
            let screenX = window.innerWidth / 2;
            let screenY = window.innerHeight / 2;
            if (realityEditor.device.environment.requiresMouseEvents()) {
                let mousePosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                screenX = mousePosition.x;
                screenY = mousePosition.y;
            }
            let worldIntersectPoint = getRaycastCoordinates(screenX, screenY);
            updateOpacityFactor(worldIntersectPoint);
            updateSpatialCursor(worldIntersectPoint);
            updateTestSpatialCursor(worldIntersectPoint);
            uniforms['time'].value = clock.getElapsedTime() * 10;

            if (SNAP_CURSOR_TO_TOOLS) {
                trySnappingCursorToTools(screenX, screenY);
            }
        } catch (e) {
            console.warn('error in spatialCursor', e);
        }
        window.requestAnimationFrame(update);
    }

    function trySnappingCursorToTools(screenX, screenY) {
        // todo Steve: when viewing the tool from different angles, the tool changes direction to face user, but
        // todo Steve: the spatial cursor snaps doesn't change direction, should fix it, that would also affect the
        // todo Steve: getToolDirection() function inside spatial search in remote operator
        // constantly check if the screen center overlaps any iframes
        let overlappingDivs = realityEditor.device.utilities.getAllDivsUnderCoordinate(screenX, screenY);
        overlapped = overlappingDivs.some(element => {
            return element.tagName === 'IFRAME' && typeof element.dataset.objectKey !== 'undefined';
        });
        if (overlapped) {
            let overlappingIframe = overlappingDivs.find(element => element.tagName === 'IFRAME');
            let tool = realityEditor.getFrame(overlappingIframe.dataset.objectKey, overlappingIframe.dataset.frameKey);
            if (tool.fullScreen) {
                overlapped = false;
            } else {
                let position = realityEditor.gui.threejsScene.getToolPosition(overlappingIframe.dataset.frameKey);
                indicator1.position.set(position.x, position.y, position.z);
                indicator1.quaternion.setFromUnitVectors(indicatorAxis, realityEditor.gui.threejsScene.getToolDirection(overlappingIframe.dataset.frameKey));
            }
        }
    }

    /**
     * Moves the spatial cursor for this avatar to the specified position.
     * Creates the spatial cursor if it doesn't exist yet.
     * @param {string} objectKey
     * @param {number[]} cursorMatrix
     * @param {string} cursorColorHSL - hsl string of color
     * @param {string} relativeToWorldId
     */
    function renderOtherSpatialCursor(objectKey, cursorMatrix, cursorColorHSL, relativeToWorldId) {
        if (relativeToWorldId !== realityEditor.sceneGraph.getWorldId()) return; // ignore cursors in other worlds
        if (typeof cursorColorHSL !== 'string') return; // color is required to initialize the material

        if (typeof otherSpatialCursors[objectKey] === 'undefined') {
            let cursorGroup = addOtherSpatialCursor(cursorColorHSL);
            otherSpatialCursors[objectKey] = {
                group: cursorGroup,
                worldId: relativeToWorldId,
                matrix: cursorMatrix
            }
            realityEditor.gui.threejsScene.addToScene(cursorGroup);
        }

        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(relativeToWorldId);
        let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();

        if (!worldSceneNode || !groundPlaneSceneNode) return;

        otherSpatialCursors[objectKey].group.matrix = realityEditor.sceneGraph.convertToNewCoordSystem(
            cursorMatrix, worldSceneNode, groundPlaneSceneNode);
    }

    /**
     * Helper function to create and return the THREE.Group for another client's cursor
     * The material is more transparent than your own cursor.
     * @returns {Group}
     */
    function addOtherSpatialCursor(cursorColorHSL) {
        const geometry1 = new THREE.CircleGeometry(geometryLength, 32);
        const indicator1 = new THREE.Mesh(geometry1, normalCursorMaterial);

        const geometry2 = new THREE.CircleGeometry(geometryLength, 32);
        const material2 = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: testCursorFragmentShader,
            uniforms: {
                'EPSILON': {value: Number.EPSILON},
                'avatarColor': {value: [{
                        color: new THREE.Color(cursorColorHSL),
                        colorLighter: new THREE.Color(cursorColorHSL)
                    }]
                },
                'opacityFactor': { value: 0.4 } // alpha = 0.5 * opacityFactor
            },
            transparent: true,
            side: THREE.DoubleSide,
        });

        const indicator2 = new THREE.Mesh(geometry2, material2);
        indicator2.name = 'coloredCursorMesh';

        const cursorGroup = new THREE.Group();
        cursorGroup.add(indicator1);
        cursorGroup.add(indicator2);

        cursorGroup.matrixAutoUpdate = false;

        return cursorGroup;
    }

    function deleteOtherSpatialCursor(objectKey) {
        if (typeof otherSpatialCursors[objectKey] !== 'undefined') {
            realityEditor.gui.threejsScene.removeFromScene(otherSpatialCursors[objectKey].group);
            delete otherSpatialCursors[objectKey];
        }
    }

    const geometryLength = 50;
    
    function addSpatialCursor() {
        const geometry = new THREE.CircleGeometry(geometryLength, 32);
        indicator1 = new THREE.Mesh(geometry, normalCursorMaterial);
        indicator1.material.depthTest = false; // fixes visual glitch by preventing occlusion from area target
        indicator1.material.depthWrite = false;
        realityEditor.gui.threejsScene.addToScene(indicator1);
    }
    
    function addTestSpatialCursor() {
        const geometry = new THREE.CircleGeometry(geometryLength, 32);
        indicator2 = new THREE.Mesh(geometry, testCursorMaterial);
        indicator2.material.depthTest = false; // fixes visual glitch by preventing occlusion from area target
        indicator2.material.depthWrite = false;
        realityEditor.gui.threejsScene.addToScene(indicator2);
    }

    let fadeOutDistance = 500, maxOpacityDistance = 1000;
    let opacityLow = 0.1, opacityHigh = 1;
    
    function updateOpacityFactor(worldIntersectPoint) {
        if (worldIntersectPoint && typeof worldIntersectPoint.distance !== 'undefined') {
            opacityFactor = remap(worldIntersectPoint.distance, fadeOutDistance, maxOpacityDistance, opacityLow, opacityHigh);
        }
    }
    
    function updateSpatialCursor(worldIntersectPoint) {
        if (worldIntersectPoint) {
            if (!indicator1.visible || !indicator2.visible) {
                indicator1.visible = true;
                indicator2.visible = true;
            }
            indicator1.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
            let offset = worldIntersectPoint.normalVector.clone().multiplyScalar(topCursorOffset);
            indicator1.position.add(offset);
            indicator1.quaternion.setFromUnitVectors(indicatorAxis, worldIntersectPoint.normalVector);
        } else {
            indicator1.visible = false;
            indicator2.visible = false;
        }
        indicator1.material = overlapped ? colorCursorMaterial : normalCursorMaterial;
        indicator1.material.uniforms.opacityFactor.value = opacityFactor;
    }

    function updateTestSpatialCursor(worldIntersectPoint) {
        if (!worldIntersectPoint) return;
        indicator2.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
        let offset = worldIntersectPoint.normalVector.clone().multiplyScalar(bottomCursorOffset);
        indicator2.position.add(offset);
        indicator2.quaternion.setFromUnitVectors(indicatorAxis, worldIntersectPoint.normalVector);
        indicator2.material.uniforms.opacityFactor.value = opacityFactor;
    }

    function toggleDisplaySpatialCursor(newValue) {
        isCursorEnabled = newValue;
        indicator1.visible = newValue;
        indicator2.visible = newValue;

        if (isCursorEnabled && !isUpdateLoopRunning) {
            update(); // restart the update loop
        }
    }

    function getRaycastCoordinates(screenX, screenY) {
        let worldIntersectPoint = null;
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
                    distance: raycastIntersects[0].distance,
                }
            }
        }
        return worldIntersectPoint; // these are relative to the world object
    }

    function getCursorRelativeToWorldObject() {
        if (!cachedWorldObject || !cachedOcclusionObject) { return null; }

        let cursorMatrix = indicator1.matrixWorld.clone(); // in ROOT coordinates
        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        return realityEditor.sceneGraph.convertToNewCoordSystem(cursorMatrix, realityEditor.sceneGraph.getSceneNodeById('ROOT'), worldSceneNode);
    }

    function getOrientedCursorIfItWereAtScreenCenter() {
        // move cursor to center, then get the matrix, then move the cursor back to where it was
        let worldIntersectPoint = getRaycastCoordinates(window.innerWidth / 2, window.innerHeight / 2);
        updateSpatialCursor(worldIntersectPoint);
        updateTestSpatialCursor(worldIntersectPoint);
        indicator1.updateMatrixWorld(); // update immediately before doing the calculations

        let result = getOrientedCursorRelativeToWorldObject();

        // move it back
        let pointerPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
        let prevWorldIntersectPoint = getRaycastCoordinates(pointerPosition.x, pointerPosition.y);
        updateSpatialCursor(prevWorldIntersectPoint);
        updateTestSpatialCursor(prevWorldIntersectPoint);
        indicator1.updateMatrixWorld();

        return result;
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
    exports.getCursorRelativeToWorldObject = getCursorRelativeToWorldObject;
    exports.getOrientedCursorRelativeToWorldObject = getOrientedCursorRelativeToWorldObject;
    exports.getOrientedCursorIfItWereAtScreenCenter = getOrientedCursorIfItWereAtScreenCenter;
    exports.toggleDisplaySpatialCursor = toggleDisplaySpatialCursor;
    exports.isSpatialCursorEnabled = () => { return isCursorEnabled; }
    exports.addToolAtScreenCenter = addToolAtScreenCenter;
    exports.renderOtherSpatialCursor = renderOtherSpatialCursor;
    exports.deleteOtherSpatialCursor = deleteOtherSpatialCursor;
}(realityEditor.spatialCursor));
