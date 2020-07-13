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

    /**
     * Defines a node in our scene graph
     * @constructor
     */
    function SceneNode() {
        this.localMatrix = utils.newIdentityMatrix();
        this.worldMatrix = utils.newIdentityMatrix();
        this.children = [];
        this.associatedObject = null;
        this.parent = null;
    }

    /**
     * Sets the parent node of this node, so that it is positioned relative to that
     * @param {SceneNode} parent
     */
    SceneNode.prototype.setParent = function(parent) {
        // remove us from our parent
        if (this.parent) {
            let index = this.parent.children.indexOf(this);
            if (index > -1) {
                this.parent.children.splice(index, 1);
            }
        }

        // add us to our new parent
        if (parent) {
            parent.children.append(this);
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

        // process all of its children to update entire subtree
        this.children.forEach(function(childNode) {
            childNode.updateWorldMatrix(this.worldMatrix);
        }.bind(this));
    };

    exports.SceneNode = SceneNode;
})(realityEditor.gui.ar.sceneGraph);
