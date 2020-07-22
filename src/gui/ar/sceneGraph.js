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

    function initService() {
        // create root node for scene located at phone's (0,0,0) coordinate system
        rootNode = new SceneNode('ROOT');

        // create node for camera outside the tree of the main scene
        cameraNode = new SceneNode('CAMERA');
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
        cameraNode.localMatrix = cameraMatrix;
    };

    // TODO: implement remove scene node (removes from parent, etc, and all children)

    exports.getSceneNodeById = function(id) {
        return sceneGraph[id];
    };

    exports.recomputeScene = function() {
        rootNode.updateWorldMatrix();
        cameraNode.updateWorldMatrix();
    };

    exports.getDirtyNodes = function() {
        return Object.keys(sceneGraph).filter(function(id) {
            return sceneGraph[id].dirty;
        });
    };

    exports.SceneNode = SceneNode;
    exports.initService = initService;
})(realityEditor.gui.ar.sceneGraph);
