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
    
    exports.printInfo = true;

    function initService() {
        // create root node for scene located at phone's (0,0,0) coordinate system
        rootNode = new SceneNode('ROOT');
        // rootNode.setLocalMatrix([ // transform coordinate system by rotateX
        //     1, 0, 0, 0,
        //     0, -1, 0, 0,
        //     0, 0, 1, 0,
        //     0, 0, 0, 1
        // ]);
        sceneGraph['ROOT'] = rootNode;

        // create node for camera outside the tree of the main scene
        cameraNode = new SceneNode('CAMERA');
        sceneGraph['CAMERA'] = cameraNode;
        
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
        // this.associatedObject = null;
        this.id = id; // mostly attached for debugging
        this.parent = null;
        
        this.needsRecompute = true; // if true, triggers recompute on sub-tree
        this.needsRerender = true;
        this.anythingInSubtreeNeedsRerender = true;
        this.anythingInSubtreeNeedsRecompute = true;
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
    };

    /**
     * Compute where this node is relative to the scene origin
     * @param {Array.<number>} parentWorldMatrix
     * @todo - only update dirty subtrees of this
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

        // console.log('set local matrix of ' + this.id + ' to ' + realityEditor.gui.ar.utilities.prettyPrintMatrix(matrix, 2, false));

        // this.dirty = true; // requires updateWorldMatrix on sub-tree
        // this.flagAsDirty();
        // this.needsRecompute = true;
        // this.needsRerender = true;
        
        this.flagForRecompute();
        // this.flagForRerender();

        numLocalComputations++;
    };
    
    // SceneNode.prototype.flagAsDirty = function() {
    //     this.dirty = true;
    //     // if (this.parent) {
    //     //     this.parent.flagAsDirty();
    //     // }
    //     // mark children as dirty because their positions are relative to this
    //     this.children.forEach(function(childNode) {
    //         childNode.flagAsDirty();
    //     }.bind(this));
    // };
    
    SceneNode.prototype.flagForRerender = function() {
        this.needsRerender = true;
        this.flagContainingSubtreeForRerender();
        // if (this.parent) {
        //     this.parent.flagForRerender();
        // }
        // this.children.forEach(function(childNode) {
        //     childNode.flagForRerender();
        // }.bind(this));
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
        // if (this.parent) {
        //     this.parent.flagForRecompute();
        // }
        // this.children.forEach(function(childNode) {
        //     childNode.flagForRecompute();
        // }.bind(this));
    };

    SceneNode.prototype.flagContainingSubtreeForRecompute = function() {
        this.anythingInSubtreeNeedsRecompute = true;
        if (this.parent) {
            this.parent.flagContainingSubtreeForRecompute();
        }
    };
    
    SceneNode.prototype.getMatrixRelativeTo = function(otherNode) {
        numRelativeComputations++;

        //  TODO: call updateWorldMatrix on the root to ensure everything is up to date
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
        
        // this.dirty = true;
        // this.flagAsDirty();
        
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

    function addRotateX(sceneNodeObject, objectId) {
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

        sceneNodeRotateX.setLocalMatrix([ // transform coordinate system by rotateX
            1, 0, 0, 0,
            0, -1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }
    
    function getNodeOrRotateXChild(sceneNode) {
        if (sceneNode.needsRotateX) {
            let childRotateXId = sceneNode.id + 'rotateX';
            return getSceneNodeById(childRotateXId);
        }
        return sceneNode;
    }

    exports.addFrame = function(objectId, frameId, initialLocalMatrix) {
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

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNodeFrame.setLocalMatrix(initialLocalMatrix);
        }
    };

    exports.addNode = function(objectId, frameId, nodeId, initialLocalMatrix) {
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

        if (typeof initialLocalMatrix !== 'undefined') {
            sceneNodeNode.setLocalMatrix(initialLocalMatrix);
        }
    };

    exports.setCameraPosition = function(cameraMatrix) {
        cameraNode.setLocalMatrix(cameraMatrix);
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
    };
    exports.recomputeScene = recomputeScene;
    
    const getDirtyNodes = function() {
        return Object.keys(sceneGraph).filter( function(id) {
            return sceneGraph[id].dirty;
        });
    };
    exports.getDirtyNodes = getDirtyNodes;
    
    const calculateFinalMatrices = function(visibleObjectIds) {
        // let dirtyNodeList = getDirtyNodes();
        // if (dirtyNodeList.length > 0) {
            recomputeScene(); // ensure all worldMatrix reflects latest localMatrix
        // }
        
        const didCameraUpdate = cameraNode.needsRerender;
        
        // let dirtyNodes = {};
        // dirtyNodeList.forEach(function(key) {
        //     dirtyNodes[key] = true;
        // });

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
            
            // skip this object if neither it or the camera have changed
            // if (!(dirtyNodes[objectKey] || dirtyNodes['CAMERA'])) { return; }
            
            if (didCameraUpdate || objectSceneNode.needsRerender) {
                relativeToCamera[objectKey] = objectSceneNode.getMatrixRelativeTo(cameraNode);
                objectSceneNode.needsRerender = false;
            }

            // skip this object if neither it or the camera have changed
            if (!didCameraUpdate && !objectSceneNode.anythingInSubtreeNeedsRerender) { return; }

            Object.keys(object.frames).forEach( function(frameKey) {
                let frame = realityEditor.getFrame(objectKey, frameKey);
                let frameSceneNode = getSceneNodeById(frameKey);

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
                    finalCSSMatrices[frameKey] = realityEditor.gui.ar.utilities.copyMatrix(modelViewProjection);

                    finalCSSMatricesWithoutTransform[frameKey] = [];
                    utils.multiplyMatrix(relativeToCamera[frameKey], globalStates.projectionMatrix, finalCSSMatricesWithoutTransform[frameKey]);

                    numFrameCSSComputations++;
                    frameSceneNode.needsRerender = false;
                }

                // skip this frame if neither it or the camera have changed
                if (!didCameraUpdate && !frameSceneNode.anythingInSubtreeNeedsRerender) { return; }

                Object.keys(frame.nodes).forEach( function(nodeKey) {
                    let node = realityEditor.getNode(objectKey, frameKey, nodeKey);
                    let nodeSceneNode = getSceneNodeById(nodeKey);

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
        
        // get worldMatrix of otherSceneNode
        // get worldMatrix of this.parentNode
        
        // compute new localMatrix so that
        // this.localMatrix * parentNode.worldMatrix = relativeMatrix * otherSceneNode.worldMatrix
        
        // this.localMatrix = relativeMatrix * otherSceneNode.worldMatrix * inv(parentNode.worldMatrix)
        
        let temp = [];
        let result = [];
        utils.multiplyMatrix(otherSceneNode.worldMatrix, utils.invertMatrix(this.parent.worldMatrix), temp);
        utils.multiplyMatrix(relativeMatrix, temp, result);
        
        this.setLocalMatrix(result);
    };
    
    // TODO: actively compute when needed, not every single frame
    exports.getCSSMatrixWithoutTranslation = function(activeKey) {
        if (typeof finalCSSMatricesWithoutTransform[activeKey] === 'undefined') {
            return realityEditor.gui.ar.utilities.newIdentityMatrix();
        }
        return finalCSSMatricesWithoutTransform[activeKey];
    };
    
    exports.updatePositionData = function(activeKey) {
        let sceneNode = getSceneNodeById(activeKey);
        if (sceneNode) {
            // sceneNode.flagAsDirty();
            sceneNode.flagForRerender();
        }
    };

    exports.SceneNode = SceneNode;
    exports.initService = initService;
})(realityEditor.gui.ar.sceneGraph);
