/*
* Created by Ben Reynolds on 07/13/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/**
 * This is the new positioning API for objects, tools, and nodes
 * Scene Graph implementation was inspired by:
 * https://webglfundamentals.org/webgl/lessons/webgl-scene-graph.html
 */
(function(exports) {

    let utils = realityEditor.gui.ar.utilities;
    let sceneGraph = {};
    let rootNode;
    let cameraNode;
    let groundPlaneNode;
    // TODO: use these cached values when possible instead of recomputing
    let relativeToCamera = {};
    let finalCSSMatrices = {};
    let finalCSSMatricesWithoutTransform = {};

    let numWorldComputations = 0;
    let numLocalComputations = 0;
    let numRelativeComputations = 0;
    let numDistanceComputations = 0;
    let numFrameCSSComputations = 0;
    let numNodeCSSComputations = 0;
    
    // TODO ben: use this enum in other modules instead of having any string names
    const NAMES = Object.freeze({
        ROOT: 'ROOT',
        CAMERA: 'CAMERA',
        GROUNDPLANE: 'GROUNDPLANE'
    });
    exports.NAMES = NAMES;
    
    exports.printInfo = false;

    function initService() {
        // create root node for scene located at phone's (0,0,0) coordinate system
        rootNode = new SceneNode(NAMES.ROOT);
        sceneGraph[NAMES.ROOT] = rootNode;

        // create node for camera outside the tree of the main scene
        cameraNode = new SceneNode(NAMES.CAMERA);
        sceneGraph[NAMES.CAMERA] = cameraNode;
        
        // create a node representing the ground plane coordinate system
        groundPlaneNode = new SceneNode(NAMES.GROUNDPLANE);
        groundPlaneNode.needsRotateX = true;
        addRotateX(groundPlaneNode, NAMES.GROUNDPLANE, true);
        sceneGraph[NAMES.GROUNDPLANE] = groundPlaneNode;
        
        setInterval(function() {
            if (exports.printInfo) {
                let totalComputations = numWorldComputations + numLocalComputations + numRelativeComputations + numDistanceComputations + numFrameCSSComputations + numNodeCSSComputations;
                console.log('\n' + totalComputations + ' computations');
                console.log('world: ' + numWorldComputations);
                console.log('local: ' + numLocalComputations);
                console.log('relative: ' + numRelativeComputations);
                console.log('distance: ' + numDistanceComputations);
                console.log('frameCSS: ' + numFrameCSSComputations);
                console.log('nodeCSS: ' + numNodeCSSComputations);

                numWorldComputations = 0;
                numLocalComputations = 0;
                numRelativeComputations = 0;
                numDistanceComputations = 0;
                numFrameCSSComputations = 0;
                numNodeCSSComputations = 0;
            }
        }, 1000);
    }

    /**
     * Defines a node in our scene graph
     * @constructor
     */
    function SceneNode(id) {
        this.localMatrix = utils.newIdentityMatrix();
        this.worldMatrix = utils.newIdentityMatrix();
        this.children = [];
        this.id = id; // mostly attached for debugging
        this.parent = null;
        
        // if true, any nodes added to this will instead be added to a child of this rotating 90deg
        this.needsRotateX = false;
        
        this.needsRecompute = true; // if true, triggers recompute on sub-tree
        this.needsRerender = true;
        this.anythingInSubtreeNeedsRerender = true;
        this.anythingInSubtreeNeedsRecompute = true;

        // if a vehicle is linked, updating the sceneNode position will set the linkedVehicle position?
        this.linkedVehicle = null;
    }

    /**
     * Sets the parent node of this node, so that it is positioned relative to that
     * @param {SceneNode} parent
     */
    SceneNode.prototype.setParent = function(parent) {
        if (parent && this.parent && parent === this.parent) {
            return; // ignore duplicate function calls
        }

        // remove us from our parent
        if (this.parent) {
            let index = this.parent.children.indexOf(this);
            if (index > -1) {
                this.parent.children.splice(index, 1);
            }
        }

        // add us to our new parent
        if (parent) {
            parent.children.push(this);
        }
        this.parent = parent;
        
        // recompute now that we're part of a new parent subtree
        this.flagForRecompute();
    };

    /**
     * Compute where this node is relative to the scene origin
     * @param {Array.<number>} parentWorldMatrix
     */
    SceneNode.prototype.updateWorldMatrix = function(parentWorldMatrix) {
        if (this.needsRecompute) {
            if (parentWorldMatrix) {
                // this.worldMatrix stores fully-multiplied position relative to origin
                utils.multiplyMatrix(this.localMatrix, parentWorldMatrix, this.worldMatrix);
            } else {
                // if no parent, localMatrix is worldMatrix
                utils.copyMatrixInPlace(this.localMatrix, this.worldMatrix);
            }

            this.needsRecompute = false; // reset dirty flag so we don't repeat this redundantly
            this.flagForRerender();
            numWorldComputations++;
        }

        // process all of its children to update entire subtree
        if (this.anythingInSubtreeNeedsRecompute) {
            this.children.forEach(function(childNode) {
                childNode.updateWorldMatrix(this.worldMatrix);
            }.bind(this));
        }
        
        this.anythingInSubtreeNeedsRecompute = false;

    };

    SceneNode.prototype.setLocalMatrix = function(matrix) {
        if (!matrix || matrix.length !== 16) { return; } // ignore malformed/empty input
        utils.copyMatrixInPlace(matrix, this.localMatrix);
        
        if (this.linkedVehicle) {
            realityEditor.gui.ar.positioning.setPositionDataMatrix(this.linkedVehicle, matrix);
        }
        
        // flagging this will eventually set the other necessary flags for this and parent/children nodes
        this.flagForRecompute();

        numLocalComputations++;
    };
    
    SceneNode.prototype.flagForRerender = function() {
        this.needsRerender = true;
        this.flagContainingSubtreeForRerender();
    };
    
    SceneNode.prototype.flagContainingSubtreeForRerender = function() {
        this.anythingInSubtreeNeedsRerender = true;
        if (this.parent) {
            this.parent.flagContainingSubtreeForRerender();
        }
    };
    
    SceneNode.prototype.flagForRecompute = function() {
        this.needsRecompute = true;
        this.flagContainingSubtreeForRecompute();
        
        // make sure all children get recomputed too, because they are relative to this
        this.children.forEach(function(childNode) {
            childNode.flagForRecompute();
        }.bind(this));
    };

    SceneNode.prototype.flagContainingSubtreeForRecompute = function() {
        this.anythingInSubtreeNeedsRecompute = true;
        if (this.parent && !this.parent.anythingInSubtreeNeedsRecompute) {
            this.parent.flagContainingSubtreeForRecompute();
        }
    };
    
    SceneNode.prototype.getMatrixRelativeTo = function(otherNode) {
        numRelativeComputations++;
        
        // note that this could be one frame out-of-date if this is flaggedForRecompute
        let thisWorldMatrix = this.worldMatrix;
        let thatWorldMatrix = otherNode.worldMatrix;

        // if they're the same, we should get identity matrix
        let relativeMatrix = [];
        utils.multiplyMatrix(thisWorldMatrix, utils.invertMatrix(thatWorldMatrix), relativeMatrix);

        return relativeMatrix;
    };

    SceneNode.prototype.getDistanceTo = function(otherNode) {
        numDistanceComputations++;

        return realityEditor.gui.ar.utilities.distance(this.getMatrixRelativeTo(otherNode));
    };
    
    // figures out what local matrix this node would need to position it globally at the provided world matrix
    SceneNode.prototype.calculateLocalMatrix = function(worldMatrix) {
        // get the world matrix of the node's parent = parentWorldMatrix
        let parentWorldMatrix = this.parent.worldMatrix;
        // compute the difference between desired worldMatrix and parentWorldMatrix
        let relativeMatrix = [];
        utils.multiplyMatrix(worldMatrix, utils.invertMatrix(parentWorldMatrix), relativeMatrix);
        // return that difference
        
        return relativeMatrix;
    };

    /**
     * Moves the node in the scene graph to be located relative to a new parent
     * @param {string} newParentId - sceneNode ID that this should become a child of
     * @param {boolean} preserveWorldPosition - if true, will recompute a new localMatrix so that its worldMatrix will
     * stay the same. if false, will keep the same localMatrix and compute a new worldMatrix
     */
    SceneNode.prototype.changeParent = function(newParentId, preserveWorldPosition) {
        let parentNode = getSceneNodeById(newParentId);
        if (!parentNode) {
            console.warn('can\'t find the parent SceneNode to add this to');
        }
        // check if the parent needs all of its children to be added to a rotateX node inside of it instead
        parentNode = getNodeOrRotateXChild(parentNode);
        this.setParent(parentNode);

        if (preserveWorldPosition) {
            let desiredWorldMatrix = this.worldMatrix;
            let newParentWorldMatrix = this.parent.worldMatrix;
            let requiredLocalMatrix = [];
            // utils.multiplyMatrix(utils.invertMatrix(newParentWorldMatrix), desiredWorldMatrix, requiredLocalMatrix);
            utils.multiplyMatrix(desiredWorldMatrix, utils.invertMatrix(newParentWorldMatrix), requiredLocalMatrix);
            this.setLocalMatrix(requiredLocalMatrix);
        }

        this.flagForRecompute();
    };
    
    SceneNode.prototype.changeId = function(newId) {
        let oldId = this.id;
        this.id = newId;

        sceneGraph[this.id] = this;
        delete sceneGraph[oldId];

        delete relativeToCamera[oldId];
        delete finalCSSMatrices[oldId];
        delete finalCSSMatricesWithoutTransform[oldId];
        
        // this.dirty = true;
        // this.flagAsDirty(); // this will make sure computations get computed/cached with new ID
        this.flagForRecompute(); // TODO: might not be necessary? just say e.g. data[new] = data[old]; delete data[old];
    };

    exports.addObject = function(objectId, initialLocalMatrix, needsRotateX) {
        let sceneNodeObject;
        if (typeof sceneGraph[objectId] !== 'undefined') {
            console.warn('trying to add duplicate object to scene graph');
            sceneNodeObject = sceneGraph[objectId];
        } else {
            sceneNodeObject = new SceneNode(objectId);
            // let _object = realityEditor.getObject(objectId);
            sceneGraph[objectId] = sceneNodeObject;
        }

        if (typeof rootNode !== 'undefined') {
            sceneNodeObject.setParent(rootNode);
            console.log('SceneGraph: added object ' + objectId + ' to root');
        }

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNodeObject.setLocalMatrix(initialLocalMatrix);
        }

        if (needsRotateX) {
            sceneNodeObject.needsRotateX = true;
            addRotateX(sceneNodeObject, objectId);
        }
    };

    var makeGroundPlaneRotationX =  function ( theta ) {
        var c = Math.cos( theta ), s = Math.sin( theta );
        return [  1, 0, 0, 0,
            0, c, - s, 0,
            0, s, c, 0,
            0, 0, 0, 1];
    };
    
    function addRotateX(sceneNodeObject, objectId, groundPlaneVariation) {
        let sceneNodeRotateX;
        let thisNodeId = objectId + 'rotateX';
        if (typeof sceneGraph[thisNodeId] !== 'undefined') {
            console.warn('trying to add duplicate rotateX to scene graph');
            sceneNodeRotateX = sceneGraph[thisNodeId];
        } else {
            sceneNodeRotateX = new SceneNode(thisNodeId);
            // let _object = realityEditor.getObject(objectId);
            sceneGraph[thisNodeId] = sceneNodeRotateX;
        }

        sceneNodeRotateX.setParent(sceneNodeObject);
        console.log('SceneGraph: added rotateX to object ' + objectId);

        // image target objects require one coordinate system rotation. ground plane requires another.
        if (groundPlaneVariation) {
            sceneNodeRotateX.setLocalMatrix( makeGroundPlaneRotationX(-(Math.PI/2)) );
        } else {
            sceneNodeRotateX.setLocalMatrix([ // transform coordinate system by rotateX
                1, 0, 0, 0,
                0, -1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
        }
        
        return sceneNodeRotateX;
    }
    
    function getNodeOrRotateXChild(sceneNode) {
        if (sceneNode.needsRotateX) {
            let childRotateXId = sceneNode.id + 'rotateX';
            return getSceneNodeById(childRotateXId);
        }
        return sceneNode;
    }

    exports.addFrame = function(objectId, frameId, linkedFrame, initialLocalMatrix) {
        let sceneNodeFrame;
        if (typeof sceneGraph[frameId] !== 'undefined') {
            console.warn('trying to add duplicate frame to scene graph');
            sceneNodeFrame = sceneGraph[frameId];
        } else {
            sceneNodeFrame = new SceneNode(frameId);
            // let _frame = realityEditor.getFrame(objectId, frameId);
            sceneGraph[frameId] = sceneNodeFrame;
        }

        if (typeof sceneGraph[objectId] !== 'undefined') {
            if (sceneGraph[objectId].needsRotateX) {
                sceneNodeFrame.setParent(sceneGraph[objectId + 'rotateX']);
                console.log('SceneGraph: added frame ' + frameId + ' to rotateX of object ' + objectId);
            } else {
                sceneNodeFrame.setParent(sceneGraph[objectId]);
                console.log('SceneGraph: added frame ' + frameId + ' to object ' + objectId);
            }
        }
        
        if (typeof linkedFrame !== 'undefined') {
            sceneNodeFrame.linkedVehicle = linkedFrame;
        }

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNodeFrame.setLocalMatrix(initialLocalMatrix);
        }
    };

    exports.addNode = function(objectId, frameId, nodeId, linkedNode, initialLocalMatrix) {
        let sceneNodeNode;
        if (typeof sceneGraph[nodeId] !== 'undefined') {
            console.warn('trying to add duplicate node to scene graph');
            sceneNodeNode = sceneGraph[nodeId];
        } else {
            sceneNodeNode = new SceneNode(nodeId);
            // let _frame = realityEditor.getFrame(objectId, frameId);
            sceneGraph[nodeId] = sceneNodeNode;
        }

        if (typeof sceneGraph[frameId] !== 'undefined') {
            sceneNodeNode.setParent(sceneGraph[frameId]);
            console.log('SceneGraph: added node ' + nodeId + ' to frame ' + frameId);
        }

        if (typeof linkedNode !== 'undefined') {
            sceneNodeNode.linkedVehicle = linkedNode;
        }

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNodeNode.setLocalMatrix(initialLocalMatrix);
        }
    };

    exports.setCameraPosition = function(cameraMatrix) {
        cameraNode.setLocalMatrix(cameraMatrix);
    };
    
    exports.setGroundPlanePosition = function(groundPlaneMatrix) {
        groundPlaneNode.setLocalMatrix(groundPlaneMatrix);
    };

    // TODO: implement remove scene node (removes from parent, etc, and all children)
    
    exports.getDistanceToCamera = function(id) {
        let sceneNode = getSceneNodeById(id);
        if (sceneNode && cameraNode) {
            return sceneNode.getDistanceTo(cameraNode);
        }
        return realityEditor.gui.ar.MAX_DISTANCE;
    };

    /**
     * @param {string} id
     * @return {SceneNode}
     */
    const getSceneNodeById = function(id) {
        return sceneGraph[id];
    };
    exports.getSceneNodeById = getSceneNodeById;
    
    const recomputeScene = function() {
        rootNode.updateWorldMatrix(); // todo: if only camera is dirty, don't recompute this
        cameraNode.updateWorldMatrix();
        
        // update separately unless it has become a child of a world object
        if (groundPlaneNode && !groundPlaneNode.parent) {
            groundPlaneNode.updateWorldMatrix();
        }
    };
    exports.recomputeScene = recomputeScene;
    
    const getDirtyNodes = function() {
        return Object.keys(sceneGraph).filter( function(id) {
            return sceneGraph[id].dirty;
        });
    };
    exports.getDirtyNodes = getDirtyNodes;
    
    const calculateFinalMatrices = function(visibleObjectIds) {
        // ensure all worldMatrix reflects latest localMatrix
        recomputeScene(); 
        
        const didCameraUpdate = cameraNode.needsRerender;

        // update ground plane
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
        
        visibleObjectIds.forEach( function(objectKey) {
            let object = realityEditor.getObject(objectKey);
            let objectSceneNode = getSceneNodeById(objectKey); // todo: error handle
            
            if (didCameraUpdate || objectSceneNode.needsRerender) {
                relativeToCamera[objectKey] = objectSceneNode.getMatrixRelativeTo(cameraNode);
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
                    let modelViewProjection = [];
                    let scale = frame.ar.scale * globalScaleAdjustment;
                    let transform = [
                        scale, 0, 0, 0,
                        0, scale, 0, 0,
                        0, 0, scale, 0,
                        frame.ar.x, frame.ar.y, 0, 1];
                    let transformedFrameMat = [];
                    utils.multiplyMatrix(transform, relativeToCamera[frameKey], transformedFrameMat);
                    utils.multiplyMatrix(transformedFrameMat, globalStates.projectionMatrix, modelViewProjection);

                    // TODO: find better place for these animations to fit into sceneGraph
                    if (realityEditor.device.isEditingUnconstrained(frame) && pocketDropAnimation) {
                        var animatedFinalMatrix = [];
                        utils.multiplyMatrix(modelViewProjection, editingAnimationsMatrix, animatedFinalMatrix);
                        utils.copyMatrixInPlace(animatedFinalMatrix, modelViewProjection);
                        frameSceneNode.needsRerender = true;
                    } else {
                        frameSceneNode.needsRerender = false;
                    }
                    
                    finalCSSMatrices[frameKey] = realityEditor.gui.ar.utilities.copyMatrix(modelViewProjection);

                    finalCSSMatricesWithoutTransform[frameKey] = [];
                    utils.multiplyMatrix(relativeToCamera[frameKey], globalStates.projectionMatrix, finalCSSMatricesWithoutTransform[frameKey]);

                    numFrameCSSComputations++;
                }

                // skip this frame if neither it or the camera have changed
                if (!didCameraUpdate && !frameSceneNode.anythingInSubtreeNeedsRerender) { return; }

                // TODO: only compute nodes when not in UI mode? if so we need to be sure to compute when switch mode
                Object.keys(frame.nodes).forEach( function(nodeKey) {
                    let node = realityEditor.getNode(objectKey, frameKey, nodeKey);
                    let nodeSceneNode = getSceneNodeById(nodeKey);
                    
                    if (!nodeSceneNode) { return; } // skip nodes without sceneNodes (true for hiddenNodeTypes)

                    if (didCameraUpdate || nodeSceneNode.needsRerender) {
                        relativeToCamera[nodeKey] = nodeSceneNode.getMatrixRelativeTo(cameraNode);
                        let modelViewProjection = [];
                        let nodeScale = node.scale * globalScaleAdjustment * (frame.ar.scale / globalStates.defaultScale);
                        let transform = [
                            nodeScale, 0, 0, 0,
                            0, nodeScale, 0, 0,
                            0, 0, nodeScale, 0,
                            frame.ar.x + node.x, frame.ar.y + node.y, 0, 1];
                        let transformedNodeMat = [];
                        utils.multiplyMatrix(transform, relativeToCamera[nodeKey], transformedNodeMat);
                        utils.multiplyMatrix(transformedNodeMat, globalStates.projectionMatrix, modelViewProjection);
                        finalCSSMatrices[nodeKey] = realityEditor.gui.ar.utilities.copyMatrix(modelViewProjection);

                        finalCSSMatricesWithoutTransform[nodeKey] = [];
                        // TODO: this multiplication can be removed if the previous two are done in different order and
                        //  intermediate result is preserved
                        utils.multiplyMatrix(relativeToCamera[nodeKey], globalStates.projectionMatrix, finalCSSMatricesWithoutTransform[nodeKey]);

                        numNodeCSSComputations++;
                        nodeSceneNode.needsRerender = false;
                    }
                    
                    nodeSceneNode.anythingInSubtreeNeedsRerender = false;
                });

                frameSceneNode.anythingInSubtreeNeedsRerender = false;
            });

            objectSceneNode.anythingInSubtreeNeedsRerender = false;
        });
        
        cameraNode.needsRerender = false;
    };
    exports.calculateFinalMatrices = calculateFinalMatrices;
    
    exports.getCSSMatrix = function(activeKey) {
        if (typeof finalCSSMatrices[activeKey] === 'undefined') {
            return realityEditor.gui.ar.utilities.newIdentityMatrix();
        }
        return finalCSSMatrices[activeKey];
    };

    exports.moveSceneNodeToCamera = function(activeKey, faceTowardsCamera) {
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
    };
    
    SceneNode.prototype.setPositionRelativeTo = function(otherSceneNode, relativeMatrix) {
        if (typeof relativeMatrix === 'undefined') { relativeMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix(); }
        
        // compute new localMatrix so that
        // this.localMatrix * parentNode.worldMatrix = relativeMatrix * otherSceneNode.worldMatrix
        // solving for localMatrix yields:
        // this.localMatrix = relativeMatrix * otherSceneNode.worldMatrix * inv(parentNode.worldMatrix)
        
        let temp = [];
        let result = [];
        utils.multiplyMatrix(otherSceneNode.worldMatrix, utils.invertMatrix(this.parent.worldMatrix), temp);
        utils.multiplyMatrix(relativeMatrix, temp, result);
        
        this.setLocalMatrix(result);
    };
    
    // TODO: actively compute here when needed, not in the main update loop
    exports.getCSSMatrixWithoutTranslation = function(activeKey) {
        if (typeof finalCSSMatricesWithoutTransform[activeKey] === 'undefined') {
            return realityEditor.gui.ar.utilities.newIdentityMatrix();
        }
        return finalCSSMatricesWithoutTransform[activeKey];
    };
    
    exports.updatePositionData = function(activeKey) {
        let sceneNode = getSceneNodeById(activeKey);
        if (sceneNode) {
            sceneNode.flagForRecompute();
        }
    };
    
    // look at implementation of realityEditor.gui.ar.positioning.getScreenPosition to get other coordinates
    exports.getScreenPosition = function(activeKey, frameCoordinateVector) {
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
    };
    
    exports.getWorldPosition = function(activeKey) {
        let sceneNode = getSceneNodeById(activeKey);
        return {
            // TODO: should we normalize all of these by default?
            x: sceneNode.worldMatrix[12]/sceneNode.worldMatrix[15],
            y: sceneNode.worldMatrix[13]/sceneNode.worldMatrix[15],
            z: sceneNode.worldMatrix[14]/sceneNode.worldMatrix[15]
        }
    };
    
    exports.getPositionRelativeToCamera = function(activeKey) {
        let relativePosition = relativeToCamera[activeKey];
        return {
            x: relativePosition[12]/relativePosition[15],
            y: relativePosition[13]/relativePosition[15],
            z: relativePosition[14]/relativePosition[15]
        }
    };
    
    function transformFrameModelView(frame, untransformedModelView, includeScale, includeTranslation) {
        let scale = includeScale ? (frame.ar.scale /* * globalScaleAdjustment */) : 1.0;
        let x = includeTranslation ? frame.ar.x : 0;
        let y = includeTranslation ? frame.ar.y : 0;
        let transform = [
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, scale, 0,
            x, y, 0, 1];
        let transformedFrameMat = [];
        utils.multiplyMatrix(transform, untransformedModelView, transformedFrameMat);
        return transformedFrameMat;
    }
    
    // function transformNodeModelView(node, untransformedModelView) {
    //     let nodeScale = node.scale * globalScaleAdjustment * (frame.ar.scale / globalStates.defaultScale);
    //     let transform = [
    //         nodeScale, 0, 0, 0,
    //         0, nodeScale, 0, 0,
    //         0, 0, nodeScale, 0,
    //         frame.ar.x + node.x, frame.ar.y + node.y, 0, 1];
    //     let transformedNodeMat = [];
    //     utils.multiplyMatrix(transform, relativeToCamera[nodeKey], transformedNodeMat);
    // }
    
    exports.getModelViewMatrix = function(activeKey, includeScale, includeTranslation) {
        if (includeScale || includeTranslation) {
            let sceneNode = getSceneNodeById(activeKey);
            if (sceneNode && sceneNode.linkedVehicle && realityEditor.isVehicleAFrame(sceneNode.linkedVehicle)) {
                return transformFrameModelView(sceneNode.linkedVehicle, relativeToCamera[activeKey], includeScale, includeTranslation);
            }
        }
        return relativeToCamera[activeKey];
    };
    
    exports.getGroundPlaneModelViewMatrix = function() {
        return relativeToCamera[NAMES.GROUNDPLANE];
    };
    
    exports.isInFrontOfCamera = function(activeKey) {
        let positionRelativeToCamera = realityEditor.gui.ar.sceneGraph.getPositionRelativeToCamera(activeKey);
        // z axis faces opposite direction as expected so this distance is negative if in front, positive if behind
        return positionRelativeToCamera.z < 0;
    };
    
    exports.attachToGroundPlane = function(objectKey, frameKey, nodeKey) {
        let vehicle = realityEditor.getVehicle(objectKey, frameKey, nodeKey);
        if (vehicle) {
            vehicle.attachToGroundPlane = true;
            let vehicleSceneNode = realityEditor.gui.ar.sceneGraph.getSceneNodeById(vehicle.uuid);
            if (groundPlaneNode && vehicleSceneNode) {
                // using changeParent instead of setParent automatically adds to rotateX node inside groundPlane
                vehicleSceneNode.changeParent(NAMES.GROUNDPLANE, false);
            }
        }
    };

    exports.SceneNode = SceneNode;
    exports.initService = initService;
})(realityEditor.gui.ar.sceneGraph);
