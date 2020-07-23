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
    let relativeToCamera = {};
    let finalCSSMatrices = {};

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
        this.dirty = true; // if true, triggers recompute on sub-tree
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
     */
    SceneNode.prototype.updateWorldMatrix = function(parentWorldMatrix) {
        if (parentWorldMatrix) {
            // this.worldMatrix stores fully-multiplied position relative to origin
            utils.multiplyMatrix(this.localMatrix, parentWorldMatrix, this.worldMatrix);
        } else {
            // if no parent, localMatrix is worldMatrix
            utils.copyMatrixInPlace(this.localMatrix, this.worldMatrix);
        }

        this.dirty = false; // reset dirty flag so we don't repeat this redundantly

        // process all of its children to update entire subtree
        this.children.forEach(function(childNode) {
            childNode.updateWorldMatrix(this.worldMatrix);
        }.bind(this));
    };

    SceneNode.prototype.setLocalMatrix = function(matrix) {
        if (!matrix || matrix.length !== 16) { return; } // ignore malformed/empty input
        utils.copyMatrixInPlace(matrix, this.localMatrix);

        console.log('set local matrix of ' + this.id + ' to ' + realityEditor.gui.ar.utilities.prettyPrintMatrix(matrix, 2, false));

        this.dirty = true; // requires updateWorldMatrix on sub-tree
    };
    
    SceneNode.prototype.getMatrixRelativeTo = function(otherNode) {
        //  TODO: call updateWorldMatrix on the root to ensure everything is up to date
        let thisWorldMatrix = this.worldMatrix;
        let thatWorldMatrix = otherNode.worldMatrix;

        // if they're the same, we should get identity matrix
        let relativeMatrix = [];
        utils.multiplyMatrix(thisWorldMatrix, utils.invertMatrix(thatWorldMatrix), relativeMatrix);

        return relativeMatrix;
    };

    SceneNode.prototype.getDistanceTo = function(otherNode) {
        return realityEditor.gui.ar.utilities.distance(this.getMatrixRelativeTo(otherNode));
    };

    exports.addObject = function(objectId, initialLocalMatrix) {
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
    };

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
            sceneNodeFrame.setParent(sceneGraph[objectId]);
            console.log('SceneGraph: added frame ' + frameId + ' to object ' + objectId);
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

    const getSceneNodeById = function(id) {
        return sceneGraph[id];
    };
    exports.getSceneNodeById = getSceneNodeById;
    
    const recomputeScene = function() {
        rootNode.updateWorldMatrix();
        cameraNode.updateWorldMatrix();
    };
    exports.recomputeScene = recomputeScene;
    
    const getDirtyNodes = function() {
        return Object.keys(sceneGraph).filter( function(id) {
            return sceneGraph[id].dirty;
        });
    };
    exports.getDirtyNodes = getDirtyNodes;
    
    exports.calculateFinalMatrices = function(visibleObjectIds) {
        if (getDirtyNodes().length > 0) {
            recomputeScene(); // ensure all worldMatrix reflects latest localMatrix
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
            relativeToCamera[objectKey] = objectSceneNode.getMatrixRelativeTo(cameraNode);

            Object.keys(object.frames).forEach( function(frameKey) {
                let frame = realityEditor.getFrame(objectKey, frameKey);
                let frameSceneNode = getSceneNodeById(frameKey);
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
                finalCSSMatrices[frameKey] = modelViewProjection;

                Object.keys(frame.nodes).forEach( function(nodeKey) {
                   let node = realityEditor.getNode(objectKey, frameKey, nodeKey);
                   let nodeSceneNode = getSceneNodeById(nodeKey);
                   relativeToCamera[nodeKey] = nodeSceneNode.getMatrixRelativeTo(cameraNode);

                   utils.multiplyMatrix(relativeToCamera[nodeKey], globalStates.projectionMatrix, modelViewProjection);
                   finalCSSMatrices[nodeKey] = modelViewProjection;
                });
            });
        });
    };

    exports.SceneNode = SceneNode;
    exports.initService = initService;
})(realityEditor.gui.ar.sceneGraph);
