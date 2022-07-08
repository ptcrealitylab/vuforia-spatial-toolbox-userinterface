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
    let selectedGroupKey = null;
    let initialLocalMatrix = null;
    let isFirstDragUpdate = false;
    let originColor = 0xffffff;
    let mouseCursorMesh = null;
    let initialCalculationMesh = null;
    let transformControls = {};

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

        realityEditor.gui.buttons.registerCallbackForButton('setting', function(_params) {
            updatePositioningMode(); // check if positioning mode needs update due to settings menu state
        });

        updatePositioningMode();
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
                if (frameKey === selectedGroupKey) { continue; } // don't update tools currently being dragged

                let frame = realityEditor.getFrame(objectKey, frameKey);
                if (!frame) { continue; }
                updateFrame(frameKey);
            }
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

        threejsGroups[frameKey].position.set(relativeMatrix[12], 0, relativeMatrix[14]);

        // update the size of the anchor based on the inverse of its distance to the camera
        // such that it matches the size of the transformControls gizmos
        let cameraPosition = realityEditor.gui.threejsScene.getCameraPosition();
        // need localToWorld to convert anchor position into same reference frame as camera position
        let anchorPosition = threejsGroups[frameKey].localToWorld(threejsGroups[frameKey].position.clone());
        let distance = cameraPosition.distanceTo(anchorPosition);
        let scale = distance/6000;
        threejsGroups[frameKey].scale.set(scale, scale, scale);
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

    // the initial calculation mesh stays in the location a tool's surface anchor was at when you first started dragging it.
    function getInitialCalculationMesh() {
        if (!initialCalculationMesh) {
            const THREE = realityEditor.gui.threejsScene.THREE;
            let size = 100;
            initialCalculationMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size),new THREE.MeshBasicMaterial({color: 0xffffff, opacity: 0.3, transparent: true}));
            initialCalculationMesh.name = 'initialCalculationMesh';
            initialCalculationMesh.visible = isPositioningMode;
            realityEditor.gui.threejsScene.addToScene(initialCalculationMesh); // this adds it to the ground plane group by default
        }
        return initialCalculationMesh;
    }

    // helper function to create the geometry for a surface anchor, including its X-Z axis handles
    function createAnchorGroup(frameKey) {
        const THREE = realityEditor.gui.threejsScene.THREE;

        let originSize = 100;
        const group = new THREE.Mesh(new THREE.BoxGeometry(originSize, originSize, originSize), new THREE.MeshBasicMaterial({color: originColor}));
        group.name = getElementName(frameKey) + '_group';
        group.visible = isPositioningMode;

        const options = {
            size: realityEditor.device.environment.variables.transformControlsSize || 1,
            hideY: true
        }

        let transformControl = realityEditor.gui.threejsScene.addTransformControlsTo(group, options, (e) => {
            onChange(e);
        }, (e) => {
            onDraggingChanged(e);
        });
        transformControl.attachedGroupName = group.name;
        transformControl.attachedFrameKey = frameKey;

        transformControls[frameKey] = transformControl;

        if (!isPositioningMode || globalStates.settingsButtonState) {
            group.visible = false;
            transformControl.visible = false;
        }

        return group;
    }

    // helper function to get a consistent name for a scenegraph node for the given frame's surface anchor
    function getElementName(frameKey) {
        return frameKey + '_groundPlaneAnchor';
    }

    // show and hide the anchors as well as the touch event catcher
    function togglePositioningMode() {
        isPositioningMode = !isPositioningMode;
        updatePositioningMode(); // refreshes the effects of the current mode
    }

    // we only render everything if the settings menu isn't shown, so as not to interfere with settings touch events
    // as a result, this needs to also be called every time the settings menu shows or hides
    function updatePositioningMode() {
        for (let key in threejsGroups) {
            updateGroupVisibility(threejsGroups[key], key);
        }
        if (mouseCursorMesh) { mouseCursorMesh.visible = false; }
        if (initialCalculationMesh) { initialCalculationMesh.visible = false; }
    }

    function updateGroupVisibility(group, key) {
        group.visible = isPositioningMode && !globalStates.settingsButtonState;

        // hide if it belongs to a closed envelope
        let hiddenInEnvelope = false;
        let knownEnvelopes = realityEditor.envelopeManager.getKnownEnvelopes();
        Object.keys(knownEnvelopes).forEach(function(envelopeKey) {
            if (hiddenInEnvelope) { return; }
            let envelopeInfo = knownEnvelopes[envelopeKey];
            let containsThisGroup = envelopeInfo.containedFrameIds.includes(key);
            if (containsThisGroup && !envelopeInfo.isOpen) {
                hiddenInEnvelope = true;
            }
        });

        if (hiddenInEnvelope) {
            group.visible = false;
        }

        transformControls[key].visible = group.visible;
    }

    // helper function to get the x,z coords of a threejs object based on its matrix
    function getPositionXZ(threeJsObject) {
        if (!threeJsObject || typeof threeJsObject.matrix === 'undefined') { return null; }
        return {
            x: threeJsObject.matrix.elements[12],
            z: threeJsObject.matrix.elements[14]
        };
    }

    function onChange(e) {
        if (e.target.attachedFrameKey === selectedGroupKey) {

            // move tool to correct position
            let oldAnchorLocalPosition = getPositionXZ(getInitialCalculationMesh());
            let newAnchorLocalPosition = getPositionXZ(threejsGroups[selectedGroupKey]); //getAnchorMeshByFrameKey(selectedGroupKey));
            
            console.log(newAnchorLocalPosition);

            let dx = newAnchorLocalPosition.x - oldAnchorLocalPosition.x;
            let dz = newAnchorLocalPosition.z - oldAnchorLocalPosition.z;
            
            if (isFirstDragUpdate) {
                dx = 0;
                dz = 0;
                isFirstDragUpdate = false;
            }

            let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(selectedGroupKey);
            let localMatrix = realityEditor.gui.ar.utilities.copyMatrix(initialLocalMatrix);
            localMatrix[12] += dx;
            localMatrix[14] += dz;
            frameSceneNode.setLocalMatrix(localMatrix);
        }
    }

    function onDraggingChanged(e) {
        if (e.value) {
            console.log('started drag on ' + e.target.attachedGroupName);
            selectedGroupKey = e.target.attachedFrameKey;
            let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(selectedGroupKey);
            if (frameSceneNode) {
                initialLocalMatrix = realityEditor.gui.ar.utilities.copyMatrix(frameSceneNode.localMatrix)
            }
            let initialMesh = getInitialCalculationMesh();
            initialMesh.visible = true;
            let anchorGroupPosition = getPositionXZ(threejsGroups[selectedGroupKey]);
            initialMesh.position.set(anchorGroupPosition.x, 0, anchorGroupPosition.z);
            isFirstDragUpdate = true;
        } else {
            console.log('stopped drag on ' + e.target.attachedGroupName);

            realityEditor.device.sendEditingStateToFrameContents(selectedGroupKey, false);

            // post its position to the server so it persists
            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(selectedGroupKey);
            if (sceneNode && sceneNode.linkedVehicle) {
                realityEditor.network.postVehiclePosition(sceneNode.linkedVehicle);
                console.log('post vehicle position');
            }

            selectedGroupKey = null;
            initialLocalMatrix = null;
            isFirstDragUpdate = false;
            getInitialCalculationMesh().visible = false;
        }
    }

    exports.initService = initService;
    exports.getMatrix = getMatrix;
    exports.sceneNodeAdded = sceneNodeAdded;
    exports.togglePositioningMode = togglePositioningMode;
}(realityEditor.gui.ar.groundPlaneAnchors));
