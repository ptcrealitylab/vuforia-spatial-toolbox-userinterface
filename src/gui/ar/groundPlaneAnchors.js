/*
* Created by Ben Reynolds on 10/08/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.gui.ar.groundPlaneAnchors");

/**
 * @fileOverview realityEditor.gui.ar.groundPlaneAnchors
 * A surface anchor is generated for each tool by calculating its position relative to the groundplane and projecting that onto the groundplane.
 * Dragging a surface anchor sends a raycast into the scene, which reports the position it collides with the groundplane or world gltf model...
 * ... based on this point's relative position to the surface anchor, the tool's localMatrix is updated, which in effect moves the anchor to that spot.
 */

(function(exports) {
    let knownAnchorNodes = {};
    let threejsGroups = {};
    let isPositioningMode = false;
    let touchEventCatcher = null;
    let isPointerDown = false;

    let selectedGroupKey = null;
    let selectedMeshName = null;
    let constrainToX = false;
    let constrainToZ = false;
    let initialAnchorPosition = null;
    let initialLocalMatrix = null;

    let originColor = 0xffffff;
    let xBoxColor = 0xff0000;
    let zBoxColor = 0x0000ff;
    let selectionColor = 0xffff00;
    let mouseCursorColor = 0xffffff;
    let mouseCursorMesh = null;
    let initialCalculationMesh = null;

    const REALTIME_DRAG_UPDATE = false; // TODO: this looks a bit jittery for now, turn on if we improve its performance

    let destinationMatrices = {};

    function initService() {
        // Note that, currently, positioningMode blocks touch events from reaching anything else, so it should be toggled off when not in use
        realityEditor.gui.settings.addToggle('Reposition Ground Anchors', 'surface anchors can be dragged to move tools', 'repositionGroundAnchors',  '../../../svg/move.svg', false, function(newValue) {
            if (isPositioningMode !== newValue) {
                togglePositioningMode();
            }
        });

        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
            try {
                update(visibleObjects);
            } catch (e) {
                console.warn(e);
            }
        });
    }

    /**
     * Public function that the APIs can use to retrieve the modelView of a tool's surface anchor
     * @param {string} vehicleId
     * @returns {Array.<number>}
     */
    function getMatrix(vehicleId) {
        if (knownAnchorNodes[vehicleId]) {
            return realityEditor.sceneGraph.getModelViewMatrix(knownAnchorNodes[vehicleId].id);
        }
        return null;
    }

    function update(visibleObjects) {
        for (let objectKey in visibleObjects) {
            let object = realityEditor.getObject(objectKey);
            if (!object) { continue; }

            for (let frameKey in object.frames) {
                let frame = realityEditor.getFrame(objectKey, frameKey);
                if (!frame) { continue; }
                updateFrame(frameKey);
            }
        }

        for (let frameKey in destinationMatrices) {
            const alpha = 0.5;
            let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(frameKey);
            let currentMatrix = realityEditor.gui.ar.utilities.copyMatrix(frameSceneNode.localMatrix);
            let destinationMatrix = destinationMatrices[frameKey];
            let animatedMatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
            for (let i = 0; i < currentMatrix.length; i++) {
                animatedMatrix[i] = (destinationMatrix[i] * alpha) + (currentMatrix[i] * (1 - alpha));
            }
            frameSceneNode.setLocalMatrix(animatedMatrix);
        }

    }

    function updateFrame(frameKey) {
        if (!knownAnchorNodes[frameKey]) { return; }
        if (!threejsGroups[frameKey]) { return; }

        // get world matrix of frame
        let frameNode = realityEditor.sceneGraph.getSceneNodeById(frameKey);
        // get world matrix of ground plane
        let groundPlaneNode = realityEditor.sceneGraph.getSceneNodeById('GROUNDPLANE');

        // calculate frame relative to ground plane
        let relativeMatrix = frameNode.getMatrixRelativeTo(groundPlaneNode);
        let anchoredMatrix = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            relativeMatrix[12], 0, relativeMatrix[14], 1
        ];

        // set the anchor matrix by taking the x, z position
        knownAnchorNodes[frameKey].setLocalMatrix(anchoredMatrix);

        // we use localMatrix, not world matrix, because mesh is already a child of the ground plane
        realityEditor.gui.threejsScene.setMatrixFromArray(threejsGroups[frameKey].matrix, knownAnchorNodes[frameKey].localMatrix);
    }

    // when we add a sceneNode for a tool, also add one to the groundplane that is associated with it
    function sceneNodeAdded(objectKey, frameKey, _thisFrame, _matrix) {

        // elementName, optionalParent, linkedDataObject, initialLocalMatrix
        let elementName = getElementName(frameKey);
        // let linkedDataObject = thisFrame;
        let parentNode = realityEditor.sceneGraph.getSceneNodeById('GROUNDPLANE');
        let sceneNodeId = realityEditor.sceneGraph.addVisualElement(elementName, parentNode); //, linkedDataObject);

        knownAnchorNodes[frameKey] = realityEditor.sceneGraph.getSceneNodeById(sceneNodeId);

        // add an element to the three.js scene
        let group = createAnchorGroup(frameKey);
        realityEditor.gui.threejsScene.addToScene(group); // this adds it to the ground plane group by default
        threejsGroups[frameKey] = group;
    }

    // the mouse cursor mesh sticks to groundplane but moves to follow the mouse when dragging a surface anchor. used for coordinate system calculations.
    function getMouseCursorMesh() {
        if (!mouseCursorMesh) {
            const THREE = realityEditor.gui.threejsScene.THREE;
            let size = 100;
            mouseCursorMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size),new THREE.MeshBasicMaterial({color: mouseCursorColor}));
            mouseCursorMesh.name = 'mouseCursorMesh';
            // mouseCursorMesh.matrixAutoUpdate = false; // this is needed to position it directly with matrices
            mouseCursorMesh.visible = isPositioningMode;
            realityEditor.gui.threejsScene.addToScene(mouseCursorMesh); // this adds it to the ground plane group by default
        }
        return mouseCursorMesh;
    }

    // the initial calculation mesh stays in the location a tool's surface anchor was at when you first started dragging it. used for coordinate system calculations.
    function getInitialCalculationMesh() {
        if (!initialCalculationMesh) {
            const THREE = realityEditor.gui.threejsScene.THREE;
            let size = 100;
            initialCalculationMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size),new THREE.MeshBasicMaterial({color: 0xffffff, opacity: 0.3, transparent: true}));
            initialCalculationMesh.name = 'initialCalculationMesh';
            // mouseCursorMesh.matrixAutoUpdate = false; // this is needed to position it directly with matrices
            initialCalculationMesh.visible = isPositioningMode;
            initialCalculationMesh.matrixAutoUpdate = false;
            realityEditor.gui.threejsScene.addToScene(initialCalculationMesh); // this adds it to the ground plane group by default
        }
        return initialCalculationMesh;
    }

    // helper function to create the geometry for a surface anchor, including its X-Z axis handles
    function createAnchorGroup(frameKey) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const group = new THREE.Group();
        group.name = getElementName(frameKey) + '_group';
        group.matrixAutoUpdate = false; // this is needed to position it directly with matrices
        group.visible = isPositioningMode;
        let originSize = 100, axisSize = 50;
        const originBox = new THREE.Mesh(new THREE.BoxGeometry(originSize, originSize, originSize),new THREE.MeshBasicMaterial({color: originColor}));
        originBox.name = getElementName(frameKey) + '_originBox';
        const xBox = new THREE.Mesh(new THREE.BoxGeometry(axisSize, axisSize, axisSize),new THREE.MeshBasicMaterial({color: xBoxColor}));
        xBox.name = getElementName(frameKey) + '_xBox';
        // const yBox = new THREE.Mesh(new THREE.BoxGeometry(axisSize, axisSize, axisSize),new THREE.MeshBasicMaterial({color:0x00ff00}));
        // yBox.name = getElementName(frameKey) + '_yBox';
        const zBox = new THREE.Mesh(new THREE.BoxGeometry(axisSize, axisSize, axisSize),new THREE.MeshBasicMaterial({color: zBoxColor}));
        zBox.name = getElementName(frameKey) + '_zBox';
        xBox.position.x = 150;
        // yBox.position.y = 150;
        zBox.position.z = 150;
        group.add(originBox);
        originBox.add(xBox);
        // originBox.add(yBox);
        originBox.add(zBox);
        return group;
    }

    // helper function to get a consistent name for a scenegraph node for the given frame's surface anchor
    function getElementName(frameKey) {
        return frameKey + '_groundPlaneAnchor';
    }

    // show and hide the anchors as well as the touch event catcher
    function togglePositioningMode() {
        isPositioningMode = !isPositioningMode;
        for (let key in threejsGroups) {
            threejsGroups[key].visible = isPositioningMode;
        }
        if (mouseCursorMesh) { mouseCursorMesh.visible = false; }
        if (initialCalculationMesh) { initialCalculationMesh.visible = false; }

        if (isPositioningMode) {
            getTouchEventCatcher().style.display = '';
            getTouchEventCatcher().style.pointerEvents = 'auto';
        } else {
            getTouchEventCatcher().style.display = 'none';
            getTouchEventCatcher().style.pointerEvents = 'none';
        }
    }

    // ensures there's a div on top of everything that blocks touch events from reaching the tools when we're in this mode
    function getTouchEventCatcher() {
        if (!touchEventCatcher) {
            touchEventCatcher = document.createElement('div');
            touchEventCatcher.style.position = 'absolute';
            touchEventCatcher.style.left = '0';
            touchEventCatcher.style.top = '0';
            touchEventCatcher.style.width = '100vw';
            touchEventCatcher.style.height = '100vh';
            let zIndex = 2900;
            touchEventCatcher.style.zIndex = zIndex + 'px';
            touchEventCatcher.style.transform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + zIndex + ',1)';
            document.body.appendChild(touchEventCatcher);

            touchEventCatcher.addEventListener('pointerdown', onPointerDown);
            touchEventCatcher.addEventListener('pointerup', onPointerUp);
            touchEventCatcher.addEventListener('pointercancel', onPointerUp);
            touchEventCatcher.addEventListener('pointermove', onPointerMove);
        }
        return touchEventCatcher;
    }

    // hit test threeJsScene to see if we hit any of the anchor threeJsGroups
    // if we are, keep track of it so we can move it on pointermove. also give visual feedback
    function onPointerDown(e) {
        isPointerDown = true;

        let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY);

        intersects.forEach(function(intersect) {
            if (selectedGroupKey) { return; }

            let meshName = intersect.object.name;
            let matchingKey = Object.keys(threejsGroups).find(function(key) {
                return meshName.includes(key);
            });
            if (!matchingKey) { return; }

            constrainToX = meshName.includes('_xBox');
            constrainToZ = meshName.includes('_zBox');

            selectedMeshName = meshName;
            selectedGroupKey = matchingKey;

            intersect.object.material.color.setHex(selectionColor);

            initialAnchorPosition = getPositionXZ(threejsGroups[selectedGroupKey]);
            let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(selectedGroupKey);
            if (frameSceneNode) {
                initialLocalMatrix = realityEditor.gui.ar.utilities.copyMatrix(frameSceneNode.localMatrix)
            }

            let initialMesh = getInitialCalculationMesh();
            initialMesh.visible = true;
            realityEditor.gui.threejsScene.setMatrixFromArray(initialMesh.matrix, threejsGroups[selectedGroupKey].matrix.elements);

            realityEditor.device.sendEditingStateToFrameContents(selectedGroupKey, true);

            // stop propagation if we hit anything, otherwise pass the event on to the rest of the application
            e.stopPropagation();
        });
    }

    // helper function to get the x,z coords of a threejs object based on its matrix
    function getPositionXZ(threeJsObject) {
        if (!threeJsObject || typeof threeJsObject.matrix === 'undefined') { return null; }
        return {
            x: threeJsObject.matrix.elements[12],
            z: threeJsObject.matrix.elements[14]
        };
    }

    // sets the localMatrix of a tool's scene node such that its surface anchor will move to the mouseCursor mesh's position
    function moveSelectedToolToMouseCursor(animated) {
        if (!initialAnchorPosition || !initialLocalMatrix || !selectedGroupKey) { return; }

        // move tool to correct position
        let oldAnchorLocalPosition = initialAnchorPosition;
        let newAnchorLocalPosition = getPositionXZ(getMouseCursorMesh());

        let dx = newAnchorLocalPosition.x - oldAnchorLocalPosition.x;
        let dz = newAnchorLocalPosition.z - oldAnchorLocalPosition.z;

        let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(selectedGroupKey);
        let localMatrix = realityEditor.gui.ar.utilities.copyMatrix(initialLocalMatrix);
        localMatrix[12] += dx;
        localMatrix[14] += dz;

        if (animated) {
            destinationMatrices[selectedGroupKey] = localMatrix;
        } else {
            frameSceneNode.setLocalMatrix(localMatrix);
        }
    }

    // when we touch up, move the selected anchor's tool to match the movement of the mouse cursor mesh relative to its anchor
    function onPointerUp(_e) {
        // e.stopPropagation(); // we can propagate touch up/cancel events in case gui is stuck in state before catcher shows
        isPointerDown = false;

        // reset mesh color
        if (selectedGroupKey && threejsGroups[selectedGroupKey]) {
            let group = threejsGroups[selectedGroupKey];
            let mesh = group.getObjectByName(selectedMeshName);
            if (mesh) {
                if (constrainToX) {
                    mesh.material.color.setHex(xBoxColor);
                } else if (constrainToZ) {
                    mesh.material.color.setHex(zBoxColor);
                } else {
                    mesh.material.color.setHex(originColor);
                }
            }

            // move tool to correct position
            moveSelectedToolToMouseCursor(false);
            delete destinationMatrices[selectedGroupKey];

            realityEditor.device.sendEditingStateToFrameContents(selectedGroupKey, false);
        }

        // reset any editing state
        selectedGroupKey = null;
        selectedMeshName = null;
        constrainToX = false;
        constrainToZ = false;
        initialAnchorPosition = null;
        initialLocalMatrix = null;

        getMouseCursorMesh().visible = false;
        getInitialCalculationMesh().visible = false;
    }

    // if we touched down on anything, calculate where to move mesh along its x-z plane so that it lines up with mouse position
    function onPointerMove(e) {
        // e.stopPropagation();
        if (!isPointerDown) { return; }
        if (!selectedGroupKey) { return; }

        let thisGroup = threejsGroups[selectedGroupKey];
        let thisAnchorNode = knownAnchorNodes[selectedGroupKey];
        if (!thisGroup || !thisAnchorNode) { return; }

        let cursorMesh = getMouseCursorMesh();

        let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY);

        let areaTargetIntersect = null;
        intersects.forEach(function(intersect) {
            if (areaTargetIntersect) { return; }
            if (intersect.object.name === 'mesh_0' || intersect.object.name === 'groundPlaneElement') {
                areaTargetIntersect = intersect;
            }
        });

        if (!areaTargetIntersect) { return; }

        let result = realityEditor.gui.threejsScene.getPointAtDistanceFromCamera(e.clientX, e.clientY, areaTargetIntersect.distance);
        let relativePosition = getInitialCalculationMesh().worldToLocal(result);
        let initialPosition = getPositionXZ(getInitialCalculationMesh());
        // adjust the initial position by relativePosition (but snap to axis if one is selected)
        let newX = constrainToZ ? initialPosition.x : relativePosition.x + initialPosition.x;
        let newZ = constrainToX ? initialPosition.z : relativePosition.z + initialPosition.z;
        cursorMesh.position.set(newX, 0, newZ);
        cursorMesh.visible = true;

        if (REALTIME_DRAG_UPDATE) {
            moveSelectedToolToMouseCursor(true);
        }
    }

    exports.initService = initService;
    exports.getMatrix = getMatrix;
    exports.sceneNodeAdded = sceneNodeAdded;
    exports.togglePositioningMode = togglePositioningMode;
}(realityEditor.gui.ar.groundPlaneAnchors));
