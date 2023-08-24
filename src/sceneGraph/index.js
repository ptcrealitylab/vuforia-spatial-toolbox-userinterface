/*
* Created by Ben Reynolds on 07/13/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.sceneGraph");

/**
 * This is the new positioning API for objects, tools, and nodes
 * Scene Graph implementation was inspired by:
 * https://webglfundamentals.org/webgl/lessons/webgl-scene-graph.html
 */
(function(exports) {

    let SceneNode = realityEditor.sceneGraph.SceneNode;

    let utils = realityEditor.gui.ar.utilities;
    let sceneGraph = {};
    const DEBUG = false;
    const DEBUG_SCENE_GRAPH = true;
    if (DEBUG_SCENE_GRAPH) {
        window.globalSceneGraph = sceneGraph;
    }
    let rootNode;
    let cameraNode;
    let deviceNode;
    let groundPlaneNode;
    // TODO: use these cached values when possible instead of recomputing
    let relativeToCamera = {};
    let finalCSSMatrices = {};
    let finalCSSMatricesWithoutTransform = {};
    let visualElements = {};

    // TODO ben: use this enum in other modules instead of having any string names
    const NAMES = Object.freeze({
        ROOT: 'ROOT',
        CAMERA: 'CAMERA',
        DEVICE: 'DEVICE',
        GROUNDPLANE: 'GROUNDPLANE'
    });
    exports.NAMES = NAMES;

    const TAGS = Object.freeze({
        OBJECT: 'object',
        TOOL: 'tool',
        NODE: 'node',
        ROTATE_X: 'rotateX'
    });
    exports.TAGS = TAGS;

    function initService() {
        // create root node for scene located at phone's (0,0,0) coordinate system
        rootNode = new SceneNode(NAMES.ROOT);
        sceneGraph[NAMES.ROOT] = rootNode;

        // create node for camera outside the tree of the main scene
        cameraNode = new SceneNode(NAMES.CAMERA);
        sceneGraph[NAMES.CAMERA] = cameraNode;
        cameraNode.setParent(rootNode);

        // create a node representing the ground plane coordinate system
        groundPlaneNode = new SceneNode(NAMES.GROUNDPLANE);
        // groundPlaneNode.needsRotateX = true;
        // addRotateX(groundPlaneNode, NAMES.GROUNDPLANE, true);
        sceneGraph[NAMES.GROUNDPLANE] = groundPlaneNode;
        groundPlaneNode.setParent(rootNode);

        deviceNode = new SceneNode(NAMES.DEVICE);
        sceneGraph[NAMES.DEVICE] = deviceNode;
        deviceNode.setParent(rootNode);

        // also init the network service when this starts
        realityEditor.sceneGraph.network.initService();
    }

    function addObject(objectId, initialLocalMatrix, needsRotateX) {
        let sceneNodeObject;
        if (typeof sceneGraph[objectId] !== 'undefined') {
            sceneNodeObject = sceneGraph[objectId];
        } else {
            sceneNodeObject = new SceneNode(objectId);
            sceneNodeObject.addTag(TAGS.OBJECT);
            sceneGraph[objectId] = sceneNodeObject;
        }

        if (typeof rootNode !== 'undefined') {
            sceneNodeObject.setParent(rootNode);
        }

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNodeObject.setLocalMatrix(initialLocalMatrix);
        }

        if (needsRotateX) {
            sceneNodeObject.needsRotateX = true;
            addRotateX(sceneNodeObject, objectId);
        }
    }

    function addFrame(objectId, frameId, linkedFrame, initialLocalMatrix) {
        let sceneNodeFrame;
        if (typeof sceneGraph[frameId] !== 'undefined') {
            sceneNodeFrame = sceneGraph[frameId];
        } else {
            sceneNodeFrame = new SceneNode(frameId);
            sceneNodeFrame.addTag(TAGS.TOOL);
            sceneGraph[frameId] = sceneNodeFrame;
        }

        if (typeof sceneGraph[objectId] !== 'undefined') {
            if (sceneGraph[objectId].needsRotateX) {
                sceneNodeFrame.setParent(sceneGraph[objectId + 'rotateX']);
            } else {
                sceneNodeFrame.setParent(sceneGraph[objectId]);
            }
        }

        if (typeof linkedFrame !== 'undefined') {
            sceneNodeFrame.linkedVehicle = linkedFrame;
        }

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNodeFrame.setLocalMatrix(initialLocalMatrix);
            realityEditor.sceneGraph.network.recordInitialFramePosition(sceneNodeFrame);
        }
    }

    function addNode(objectId, frameId, nodeId, linkedNode, initialLocalMatrix) {
        let sceneNodeNode;
        if (typeof sceneGraph[nodeId] !== 'undefined') {
            sceneNodeNode = sceneGraph[nodeId];
        } else {
            sceneNodeNode = new SceneNode(nodeId);
            sceneNodeNode.addTag(TAGS.NODE);
            sceneGraph[nodeId] = sceneNodeNode;
        }

        if (typeof sceneGraph[frameId] !== 'undefined') {
            sceneNodeNode.setParent(sceneGraph[frameId]);
        }

        if (typeof linkedNode !== 'undefined') {
            sceneNodeNode.linkedVehicle = linkedNode;
        }

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNodeNode.setLocalMatrix(initialLocalMatrix);
        }
    }

    function setCameraPosition(cameraMatrix) {
        if (!cameraNode) { return; }
        cameraNode.setLocalMatrix(cameraMatrix, { recomputeImmediately: true });
        if (realityEditor.gui.threejsScene.setCameraPosition) {
            realityEditor.gui.threejsScene.setCameraPosition(cameraMatrix);
        }
    }

    // this is the true position of the device, even if we are in VR mode
    function setDevicePosition(cameraMatrix) {
        if (!deviceNode) { return; }
        deviceNode.setLocalMatrix(cameraMatrix);
    }

    function setGroundPlanePosition(groundPlaneMatrix) {
        groundPlaneNode.setLocalMatrix(groundPlaneMatrix);
        groundPlaneNode.updateWorldMatrix(); // immediately process instead of waiting for next frame
    }

    // TODO: implement remove scene node (removes from parent, etc, and all children)

    function getDistanceToCamera(id) {
        let sceneNode = getSceneNodeById(id);
        if (sceneNode && cameraNode) {
            return sceneNode.getDistanceTo(cameraNode);
        }
        return realityEditor.gui.ar.MAX_DISTANCE;
    }

    /**
     * @param {string} id
     * @return {SceneNode}
     */
    function getSceneNodeById(id) {
        return sceneGraph[id];
    }
    
    function getCameraNode() {
        return sceneGraph[NAMES.CAMERA];
    }

    function getDeviceNode() {
        return sceneGraph[NAMES.DEVICE];
    }

    function getGroundPlaneNode() {
        return sceneGraph[NAMES.GROUNDPLANE];
    }

    function calculateFinalMatrices(visibleObjectIds) {
        // ensure all worldMatrix reflects latest localMatrix
        recomputeScene();

        const didCameraUpdate = cameraNode.needsRerender;

        // update ground plane first, in case frames/nodes/etc are relative to it
        if (didCameraUpdate || groundPlaneNode.needsRerender) {
            relativeToCamera[NAMES.GROUNDPLANE] = groundPlaneNode.getMatrixRelativeTo(cameraNode);
            groundPlaneNode.needsRerender = false;
            // TODO: if anything can become a child of the groundPlane then we'll need to process its subtree correctly
        }

        // for each visible object

        // .. calculate and store where it is relative to camera
        // .. get the scene node of each of its frames

        // .. for each frame

        // .... calculate and store where it is relative to camera
        // .... multiply by projection matrix etc to get CSS matrix
        // .... get the scene node of each of its nodes

        // .... for each node

        // ...... calculate and store where it is relative to camera
        // ...... multiply by projection matrix etc to get CSS matrix

        visibleObjectIds.forEach(function(objectKey) {
            let object = realityEditor.getObject(objectKey);
            let objectSceneNode = getSceneNodeById(objectKey); // todo: error handle
            if (!object || !objectSceneNode) {
                if (DEBUG) {
                    console.warn('missing sceneNode', objectKey, object, objectSceneNode);
                }
                return;
            }

            if (didCameraUpdate || objectSceneNode.needsRerender) {
                relativeToCamera[objectKey] = objectSceneNode.getMatrixRelativeTo(cameraNode);
                finalCSSMatrices[objectKey] = [];
                utils.multiplyMatrix(relativeToCamera[objectKey], globalStates.projectionMatrix, finalCSSMatrices[objectKey]);
                objectSceneNode.needsRerender = false;
            }

            // skip this object if neither it or the camera have changed
            if (!didCameraUpdate && !objectSceneNode.anythingInSubtreeNeedsRerender) { return; }

            Object.keys(object.frames).forEach( function(frameKey) {
                let frame = realityEditor.getFrame(objectKey, frameKey);
                let frameSceneNode = getSceneNodeById(frameKey);

                if (!frameSceneNode) { return; }

                if (didCameraUpdate || frameSceneNode.needsRerender) {
                    relativeToCamera[frameKey] = frameSceneNode.getMatrixRelativeTo(cameraNode);

                    // add in animations after everything else to get a new modelView matrix
                    if (realityEditor.device.isEditingUnconstrained(frame) && pocketDropAnimation) {
                        var animatedFinalMatrix = [];
                        utils.multiplyMatrix(relativeToCamera[frameKey], editingAnimationsMatrix, animatedFinalMatrix);
                        utils.copyMatrixInPlace(animatedFinalMatrix, relativeToCamera[frameKey]);
                        frameSceneNode.needsRerender = true;
                    } else {
                        frameSceneNode.needsRerender = false;
                    }

                    finalCSSMatrices[frameKey] = [];
                    utils.multiplyMatrix(relativeToCamera[frameKey], globalStates.projectionMatrix, finalCSSMatrices[frameKey]);

                    frameSceneNode.needsRerender = false;
                }

                // skip this frame if neither it or the camera have changed
                if (!didCameraUpdate && !frameSceneNode.anythingInSubtreeNeedsRerender) { return; }

                // TODO: only compute nodes when not in UI mode? if so we need to be sure to compute when switch mode
                Object.keys(frame.nodes).forEach( function(nodeKey) {
                    let node = realityEditor.getNode(objectKey, frameKey, nodeKey);
                    let nodeSceneNode = getSceneNodeById(nodeKey);

                    if (!nodeSceneNode) { return; } // skip nodes without sceneNodes (true for invisible nodes)

                    if (didCameraUpdate || nodeSceneNode.needsRerender) {
                        relativeToCamera[nodeKey] = nodeSceneNode.getMatrixRelativeTo(cameraNode);

                        // add in animations after everything else to get a new modelView matrix
                        if (realityEditor.device.isEditingUnconstrained(node) && pocketDropAnimation) {
                            var animatedFinalMatrix = [];
                            utils.multiplyMatrix(relativeToCamera[nodeKey], editingAnimationsMatrix, animatedFinalMatrix);
                            utils.copyMatrixInPlace(animatedFinalMatrix, relativeToCamera[nodeKey]);
                            frameSceneNode.needsRerender = true;
                        } else {
                            frameSceneNode.needsRerender = false;
                        }
                        
                        finalCSSMatrices[nodeKey] = [];
                        utils.multiplyMatrix(relativeToCamera[nodeKey], globalStates.projectionMatrix, finalCSSMatrices[nodeKey]);

                        // TODO: what to do about this? is this really needed? maybe only compute when needed
                        // finalCSSMatricesWithoutTransform[nodeKey] = realityEditor.gui.ar.utilities.copyMatrix(finalCSSMatrices[nodeKey]);

                        nodeSceneNode.needsRerender = false;
                    }

                    nodeSceneNode.anythingInSubtreeNeedsRerender = false;
                });

                frameSceneNode.anythingInSubtreeNeedsRerender = false;
            });

            objectSceneNode.anythingInSubtreeNeedsRerender = false;
        });

        if (cameraNode.anythingInSubtreeNeedsRerender) {
            cameraNode.children.forEach(childNode => {
                relativeToCamera[childNode.id] = childNode.getMatrixRelativeTo(cameraNode);
                finalCSSMatrices[childNode.id] = [];
                utils.multiplyMatrix(relativeToCamera[childNode.id], globalStates.projectionMatrix, finalCSSMatrices[childNode.id]);
                childNode.needsRerender = false;
            });
            cameraNode.anythingInSubtreeNeedsRerender = false;
        }

        // process additional visual elements at the end, in case they are relative to groundPlane/frames/nodes
        for (let elementId in visualElements) {
            let miscellaneousElementNode = visualElements[elementId];
            if (didCameraUpdate || miscellaneousElementNode.needsRerender) {
                relativeToCamera[elementId] = miscellaneousElementNode.getMatrixRelativeTo(cameraNode);
                finalCSSMatrices[elementId] = [];
                utils.multiplyMatrix(relativeToCamera[elementId], globalStates.projectionMatrix, finalCSSMatrices[elementId]);
                miscellaneousElementNode.needsRerender = false;
            }
        }

        cameraNode.needsRerender = false;
    }

    function getCSSMatrix(activeKey) {
        if (typeof finalCSSMatrices[activeKey] === 'undefined') {
            return realityEditor.gui.ar.utilities.newIdentityMatrix();
        }
        return finalCSSMatrices[activeKey];
    }

    function moveSceneNodeToCamera(activeKey, faceTowardsCamera) {
        let sceneNode = getSceneNodeById(activeKey);
        let requiredWorldMatrix = cameraNode.worldMatrix;
        let requiredLocalMatrix = sceneNode.calculateLocalMatrix(requiredWorldMatrix);

        if (faceTowardsCamera) {
            // flip it so it faces towards the camera instead of away from the camera
            let unflippedLocalMatrix = realityEditor.gui.ar.utilities.copyMatrix(requiredLocalMatrix);
            // let q = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(Math.PI, Math.PI, 0);
            let q = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(0, Math.PI, Math.PI);
            let rotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(q);
            realityEditor.gui.ar.utilities.multiplyMatrix(rotationMatrix, unflippedLocalMatrix, requiredLocalMatrix);
        }

        sceneNode.setLocalMatrix(requiredLocalMatrix);
    }

    // TODO: cache after calculating, invalidate if finalCSSMatrices[activeKey] changes
    function getCSSMatrixWithoutTranslation(activeKey) {
        if (typeof finalCSSMatricesWithoutTransform[activeKey] === 'undefined') {
            finalCSSMatricesWithoutTransform[activeKey] = [];
        }

        let sceneNode = getSceneNodeById(activeKey);
        let transform = sceneNode.getTransformMatrix();
        let inverseTransform = utils.invertMatrix(transform);

        utils.multiplyMatrix(inverseTransform, finalCSSMatrices[activeKey], finalCSSMatricesWithoutTransform[activeKey]);

        return finalCSSMatricesWithoutTransform[activeKey];
    }

    function updatePositionData(activeKey, dontBroadcastNext) {
        let sceneNode = getSceneNodeById(activeKey);
        if (sceneNode) {
            sceneNode.flagForRecompute();
            if (typeof dontBroadcastNext !== 'undefined') {
                sceneNode.dontBroadcastNext = dontBroadcastNext;
            }
        }
    }

    // look at implementation of realityEditor.gui.ar.positioning.getScreenPosition to get other coordinates
    function getScreenPosition(activeKey, frameCoordinateVector) {
        if (typeof frameCoordinateVector === 'undefined') {
            frameCoordinateVector = [0,0,0,1]; // defaults to center. [-halfWidth, -halfHeight, 0, 1] is upperLeft
        }
        if (finalCSSMatrices[activeKey]) {
            return realityEditor.gui.ar.positioning.getProjectedCoordinates(frameCoordinateVector, finalCSSMatrices[activeKey]);
        }
        console.warn(activeKey + ' hasn\'t been processed in the sceneGraph yet in order to get correct screen position');
        return {
            x: window.innerWidth/2,
            y: window.innerHeight/2
        }
    }

    function getWorldPosition(activeKey) {
        let sceneNode = getSceneNodeById(activeKey);
        return {
            // TODO: should we normalize all of these by default?
            x: sceneNode.worldMatrix[12]/sceneNode.worldMatrix[15],
            y: sceneNode.worldMatrix[13]/sceneNode.worldMatrix[15],
            z: sceneNode.worldMatrix[14]/sceneNode.worldMatrix[15]
        }
    }

    function getPositionRelativeToCamera(activeKey) {
        let relativePosition = relativeToCamera[activeKey];
        if (!relativePosition) {
            let objectSceneNode = getSceneNodeById(activeKey); // todo: error handle
            if (objectSceneNode) {
                relativeToCamera[activeKey] = objectSceneNode.getMatrixRelativeTo(cameraNode);
                relativePosition = relativeToCamera[activeKey];
            } else {
                console.warn("Error, no scene node for " + activeKey);
                return { x: 0, y: 0, z: 0 };
            }
        }
        return {
            x: relativePosition[12]/relativePosition[15],
            y: relativePosition[13]/relativePosition[15],
            z: relativePosition[14]/relativePosition[15]
        }
    }

    function getModelViewMatrix(activeKey) {
        return relativeToCamera[activeKey];
    }

    function getGroundPlaneModelViewMatrix() {
        let gpRX = getSceneNodeById(NAMES.GROUNDPLANE + TAGS.ROTATE_X);
        if (gpRX) {
            return gpRX.getMatrixRelativeTo(cameraNode);
        }
        return relativeToCamera[NAMES.GROUNDPLANE];
    }

    function isInFrontOfCamera(activeKey) {
        let positionRelativeToCamera = realityEditor.sceneGraph.getPositionRelativeToCamera(activeKey);
        // z axis faces opposite direction as expected so this distance is negative if in front, positive if behind
        return positionRelativeToCamera.z < 0;
    }

    function attachToGroundPlane(objectKey, frameKey, nodeKey) {
        let vehicle = realityEditor.getVehicle(objectKey, frameKey, nodeKey);
        if (vehicle) {
            vehicle.attachToGroundPlane = true;
            let vehicleSceneNode = realityEditor.sceneGraph.getSceneNodeById(vehicle.uuid);
            if (groundPlaneNode && vehicleSceneNode) {
                // using changeParent instead of setParent automatically adds to rotateX node inside groundPlane
                changeParent(vehicleSceneNode, NAMES.GROUNDPLANE, false);
            }
        }
    }

    function setLoyalty(loyaltyString, objectKey, frameKey, nodeKey) {
        if (!loyaltyString) { return; }

        let vehicle = realityEditor.getVehicle(objectKey, frameKey, nodeKey);
        if (vehicle) {
            vehicle.spatialLoyalty = loyaltyString;
            let vehicleSceneNode = realityEditor.sceneGraph.getSceneNodeById(vehicle.uuid);

            // get newParentId from loyaltyString
            let newParentId = null;
            if (loyaltyString === 'world') {
                newParentId = realityEditor.worldObjects.getBestWorldObject().objectId;
            } else if (loyaltyString === 'groundplane') {
                newParentId = NAMES.GROUNDPLANE;
            } else if (loyaltyString === 'object') {
                newParentId = realityEditor.network.availableFrames.getBestObjectInfoForFrame(realityEditor.getFrame(objectKey, frameKey).src);
            }

            if (newParentId && vehicleSceneNode) {
                // using changeParent instead of setParent automatically adds to rotateX node inside groundPlane
                changeParent(vehicleSceneNode, newParentId, true);
            }
        }
    }

    // a helper function for adding generic/miscellaneous elements to the sceneGraph that will be used for 3D UI
    function addVisualElement(elementName, optionalParent, linkedDataObject, initialLocalMatrix) {
        let nodeId = elementName + '_VISUAL_ELEMENT'; // help prevent naming collisions

        let sceneNode;
        if (typeof sceneGraph[nodeId] !== 'undefined') {
            sceneNode = sceneGraph[nodeId];
        } else {
            sceneNode = new SceneNode(nodeId);
            sceneGraph[nodeId] = sceneNode;
            visualElements[nodeId] = sceneNode;
        }

        if (typeof optionalParent !== 'undefined') {
            // sceneNode.setParent(optionalParent);
            changeParent(sceneNode, optionalParent.id);
        }

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNode.setLocalMatrix(initialLocalMatrix);
        }

        if (typeof linkedDataObject !== 'undefined') {
            sceneNode.linkedVehicle = linkedDataObject;
        }

        return nodeId;
    }

    function getVisualElement(elementName) {
        let nodeId = elementName + '_VISUAL_ELEMENT';
        return getSceneNodeById(nodeId);
    }

    function getViewMatrix() {
        return utils.invertMatrix(cameraNode.localMatrix);
    }

    /**
     * Moves the node in the scene graph to be located relative to a new parent
     * @param {SceneNode} sceneNode
     * @param {string} newParentId - sceneNode ID that this should become a child of
     * @param {boolean} preserveWorldPosition - if true, will recompute a new localMatrix so that its worldMatrix will
     * stay the same. if false, will keep the same localMatrix and compute a new worldMatrix
     */
    function changeParent(sceneNode, newParentId, preserveWorldPosition) {
        let parentNode = getSceneNodeById(newParentId);
        if (!parentNode) {
            console.warn('can\'t find the parent SceneNode to add this to');
        }
        // check if the parent needs all of its children to be added to a rotateX node inside of it instead
        parentNode = getNodeOrRotateXChild(parentNode);
        sceneNode.setParent(parentNode);

        if (preserveWorldPosition) {
            let desiredWorldMatrix = sceneNode.worldMatrix;
            let newParentWorldMatrix = sceneNode.parent.worldMatrix;
            let requiredLocalMatrix = [];
            utils.multiplyMatrix(desiredWorldMatrix, utils.invertMatrix(newParentWorldMatrix), requiredLocalMatrix);
            let transform = sceneNode.getTransformMatrix();
            let inverseTransform = utils.invertMatrix(transform);
            let untransformed = [];
            utils.multiplyMatrix(inverseTransform, requiredLocalMatrix, untransformed);
            sceneNode.setLocalMatrix(untransformed);
        }

        sceneNode.flagForRecompute();
    }

    function changeId(sceneNode, newId) {
        let oldId = sceneNode.id;
        sceneNode.id = newId;

        sceneGraph[sceneNode.id] = sceneNode;
        delete sceneGraph[oldId];

        delete relativeToCamera[oldId];
        delete finalCSSMatrices[oldId];
        delete finalCSSMatricesWithoutTransform[oldId];

        // this.dirty = true;
        // this.flagAsDirty(); // this will make sure computations get computed/cached with new ID
        sceneNode.flagForRecompute(); // TODO: might not be necessary? just say e.g. data[new] = data[old]; delete data[old];
    }

    function removeElementAndChildren(id) {
        let sceneNode = getSceneNodeById(id);
        if (sceneNode) {
            // remove from parent
            let parentNode = sceneNode.parent;
            if (parentNode) {
                let index = parentNode.children.indexOf(sceneNode);
                if (index > -1) {
                    parentNode.children.splice(index, 1);
                }
            }
            // delete from graph
            delete sceneGraph[id];
        }
    }

    /**
     * Gets the world object to which everything else is localized.
     * If it's the _WORLD_local then return null, since that isn't a permanent world.
     * @return {string|null}
     */
    function getWorldId() {
        let bestWorldObject = realityEditor.worldObjects.getBestWorldObject();
        if (bestWorldObject && bestWorldObject.objectId !== realityEditor.worldObjects.getLocalWorldId()) {
            return bestWorldObject.objectId;
        }
        return null;
    }

    /**
     * Helper function to convert a point or matrix from one coordinate system to another
     * Input can be one of four formats: length-16 toolbox matrix, THREE.Matrix4, length-3 position vector, or {x,y,z}
     * @param {Matrix4|{x: number, y: number, z: number}|number[]} input
     * @param {SceneNode} currentParentSceneNode
     * @param {SceneNode} newParentSceneNode
     * @returns {Matrix4|{x: number, y: number, z: number}|number[]}
     */
    function convertToNewCoordSystem(input, currentParentSceneNode, newParentSceneNode) {
        let processedInput = [];
        let inputType;
        if (typeof input.length !== 'undefined' && input.length === 16) {
            inputType = 'matrix4x4';
            processedInput = input;
        } else if (typeof input.elements !== 'undefined' && input.elements.length === 16) {
            inputType = 'THREE.Matrix4';
            processedInput = input.elements;
        } else if (typeof input.length !== 'undefined' && input.length === 3) {
            inputType = 'vector3';
            processedInput = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                input[0], input[1], input[2], 1
            ];
        } else if (typeof input.x !== 'undefined' && typeof input.y !== 'undefined' && typeof input.z !== 'undefined') {
            inputType = 'position';
            processedInput = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                input.x, input.y, input.z, 1
            ];
        }

        let relativeMatrix = currentParentSceneNode.getMatrixRelativeTo(newParentSceneNode);
        let output = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(processedInput, relativeMatrix, output);

        if (inputType === 'matrix4x4') {
            return output;
        } else if (inputType === 'THREE.Matrix4') {
            let matrixThree = new realityEditor.gui.threejsScene.THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(matrixThree, output);
            return matrixThree;
        } else if (inputType === 'vector3') {
            return [output[12]/output[15], output[13]/output[15], output[14]/output[15]];
        } else if (inputType === 'position') {
            return { x: output[12]/output[15], y: output[13]/output[15], z: output[14]/output[15] };
        }
    }

    /**
     * Returns the 3D coordinate which is [distance] mm in front of the screen pixel coordinates [clientX, clientY]
     * @param {number} screenX - in screen pixels
     * @param {number} screenY - in screen pixels
     * @param {number} distance - in millimeters
     * @param {SceneNode} coordinateSystem - which coordinate system you want the result calculated relative to
     * @param {SceneNode} camNode - which node should act as the cameraNode
     * @returns {{x: number, y: number, z: number}} - position in ROOT coordinates, or whatever coordinateSystem is specified
     */
    function getPointAtDistanceFromCamera(screenX, screenY, distance, coordinateSystem = rootNode, camNode = cameraNode) {
        let distanceRaycastVector = [
            (screenX / window.innerWidth) * 2.0 - 1,
            - (screenY / window.innerHeight) * 2.0 + 1,
            0,
            1
        ];
        let unprojectedVector = utils.multiplyMatrix4(distanceRaycastVector, utils.invertMatrix(globalStates.realProjectionMatrix));
        let localDistanceVector = utils.scalarMultiply(utils.normalize([unprojectedVector[0], unprojectedVector[1], unprojectedVector[2]]), distance);
        let inputPosition = {x: localDistanceVector[0], y: localDistanceVector[1], z: localDistanceVector[2]};
        return convertToNewCoordSystem(inputPosition, camNode, coordinateSystem);
    }

    // preserves the position and scale of the sceneNode[id] and rotates it to look at sceneNode[idToLookAt]
    // if resulting matrix is looking away from target instead of towards, or is flipped upside-down, use flipX, flipY to correct it
    function getModelMatrixLookingAt(id, idToLookAt, {flipX = true, flipY = true, includeScale = true} = {}) {
        let utils = realityEditor.gui.ar.utilities;

        // convert everything into a consistent reference frame, regardless of remote operator vs AR platform
        let worldNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        let sourceNode = realityEditor.sceneGraph.getSceneNodeById(id);
        let mSource = sourceNode.getMatrixRelativeTo(worldNode);
        let mTarget = realityEditor.sceneGraph.getSceneNodeById(idToLookAt).getMatrixRelativeTo(worldNode);

        let sourcePosition = { x: mSource[12] / mSource[15], y: mSource[13] / mSource[15], z: mSource[14] / mSource[15] };
        let targetPosition = { x: mTarget[12] / mTarget[15], y: mTarget[13] / mTarget[15], z: mTarget[14] / mTarget[15] };
        let lookAtMatrix = utils.lookAt(sourcePosition.x, sourcePosition.y, sourcePosition.z, targetPosition.x, targetPosition.y, targetPosition.z, 0, 1, 0);
        let correspondingModelMatrix = utils.invertMatrix(lookAtMatrix); // lookAt returns a ~"view" matrix, invert to get the model matrix

        // ensure we preserve the scale from before
        let scaledModelMatrix = [];
        if (includeScale) {
            let scale = sourceNode.getVehicleScale();
            let transformMatrix = utils.newIdentityMatrix();
            [0, 5, 10].forEach(index => transformMatrix[index] = scale);
            utils.multiplyMatrix(transformMatrix, correspondingModelMatrix, scaledModelMatrix);
        } else {
            scaledModelMatrix = correspondingModelMatrix;
        }

        // lookAtMatrix is calculated in coordinates relative to the world object, so we convert from world to ROOT
        let modelMatrix = [];
        utils.multiplyMatrix(scaledModelMatrix, worldNode.worldMatrix, modelMatrix);

        // flip the element upside-down or left-right if needed
        let flipMatrix = utils.newIdentityMatrix();
        flipMatrix[0] = (flipX ? -1 : 1);
        flipMatrix[5] = (flipY ? -1 : 1);
        let flippedModelMatrix = [];
        utils.multiplyMatrix(flipMatrix, modelMatrix, flippedModelMatrix);
        // modelMatrix = flippedModelMatrix;

        return flippedModelMatrix;
    }

    /************ Private Functions ************/
    function addRotateX(sceneNodeObject, objectId, groundPlaneVariation) {
        let sceneNodeRotateX;
        let thisNodeId = objectId + 'rotateX';
        if (typeof sceneGraph[thisNodeId] !== 'undefined') {
            sceneNodeRotateX = sceneGraph[thisNodeId];
        } else {
            sceneNodeRotateX = new SceneNode(thisNodeId);
            sceneNodeRotateX.addTag(TAGS.ROTATE_X);
            sceneGraph[thisNodeId] = sceneNodeRotateX;
        }

        sceneNodeRotateX.setParent(sceneNodeObject);

        // image target objects require one coordinate system rotation. ground plane requires another.
        if (groundPlaneVariation) {
            sceneNodeRotateX.setLocalMatrix(realityEditor.gui.ar.utilities.makeGroundPlaneRotationX(-(Math.PI/2)));
        } else {
            sceneNodeRotateX.setLocalMatrix([ // transform coordinate system by rotateX
                1, 0, 0, 0,
                0, -1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
        }
    }

    function getNodeOrRotateXChild(sceneNode) {
        if (sceneNode.needsRotateX) {
            let childRotateXId = sceneNode.id + 'rotateX';
            return getSceneNodeById(childRotateXId);
        }
        return sceneNode;
    }

    function recomputeScene() {
        if (rootNode) {
            rootNode.updateWorldMatrix(); // updates everything that is a child of the root, too (objects, camera, groundPlane, etc)
        }

        // just in case, iterate over all miscellaneous visual elements (they are ignored if they've already been
        // processed by one of the recursive calls above because .needsRecompute gets reset
        for (let elementId in visualElements) {
            let visualElementNode = visualElements[elementId];
            visualElementNode.updateWorldMatrix();
        }
    }

    function getObjects() {
        return Object.values(sceneGraph).filter(function(sceneNode) {
            return sceneNode.tags[TAGS.OBJECT];
        });
    }

    function getTools() {
        return Object.values(sceneGraph).filter(function(sceneNode) {
            return sceneNode.tags[TAGS.TOOL];
        });
    }

    function getNodes() {
        return Object.values(sceneGraph).filter(function(sceneNode) {
            return sceneNode.tags[TAGS.NODE];
        });
    }

    function getObjectsWithinCameraDistance(maxDistance) {
        return getObjects().filter(function(sceneNode) {
            let distance = sceneNode.getDistanceTo(cameraNode);
            return distance < maxDistance
        });
    }

    function getToolsWithinCameraDistance(maxDistance) {
        return getTools().filter(function(sceneNode) {
            let distance = sceneNode.getDistanceTo(cameraNode);
            return distance < maxDistance
        });
    }

    function getNodesWithinCameraDistance(maxDistance) {
        return getNodes().filter(function(sceneNode) {
            let distance = sceneNode.getDistanceTo(cameraNode);
            return distance < maxDistance
        });
    }

    /*******************************************/

    // public init method
    exports.initService = initService;

    // public methods to add new things to the sceneGraph
    exports.addObject = addObject;
    exports.addFrame = addFrame;
    exports.addNode = addNode;
    exports.addVisualElement = addVisualElement;

    // public methods to update the positions of things in the sceneGraph
    exports.setCameraPosition = setCameraPosition;
    exports.setDevicePosition = setDevicePosition;
    exports.setGroundPlanePosition = setGroundPlanePosition;
    exports.moveSceneNodeToCamera = moveSceneNodeToCamera;
    exports.updatePositionData = updatePositionData;
    exports.attachToGroundPlane = attachToGroundPlane;
    exports.setLoyalty = setLoyalty;
    exports.changeParent = changeParent;
    exports.changeId = changeId;
    exports.removeElementAndChildren = removeElementAndChildren;

    // public methods to compute calculations based on the sceneGraph
    exports.getDistanceToCamera = getDistanceToCamera;
    exports.getCSSMatrix = getCSSMatrix;
    exports.getCSSMatrixWithoutTranslation = getCSSMatrixWithoutTranslation;
    exports.getScreenPosition = getScreenPosition;
    exports.getWorldPosition = getWorldPosition;
    exports.getPositionRelativeToCamera = getPositionRelativeToCamera;
    exports.getModelViewMatrix = getModelViewMatrix;
    exports.getGroundPlaneModelViewMatrix = getGroundPlaneModelViewMatrix;
    exports.isInFrontOfCamera = isInFrontOfCamera;
    exports.getViewMatrix = getViewMatrix;
    exports.getModelMatrixLookingAt = getModelMatrixLookingAt;
    exports.convertToNewCoordSystem = convertToNewCoordSystem;
    exports.getPointAtDistanceFromCamera = getPointAtDistanceFromCamera;

    // public method to recompute sceneGraph for all visible entities
    exports.calculateFinalMatrices = calculateFinalMatrices;
    
    // public function to get the worldId to which everything is localized
    exports.getWorldId = getWorldId;

    // TODO: can we get rid of full/direct access to sceneGraph?
    exports.getSceneNodeById = getSceneNodeById;
    exports.getCameraNode = getCameraNode;
    exports.getDeviceNode = getDeviceNode;
    exports.getGroundPlaneNode = getGroundPlaneNode;
    exports.getVisualElement = getVisualElement;

    exports.getObjects = getObjects;
    exports.getTools = getTools;
    exports.getNodes = getNodes;
    exports.getObjectsWithinCameraDistance = getObjectsWithinCameraDistance;
    exports.getToolsWithinCameraDistance = getToolsWithinCameraDistance;
    exports.getNodesWithinCameraDistance = getNodesWithinCameraDistance;

})(realityEditor.sceneGraph);
