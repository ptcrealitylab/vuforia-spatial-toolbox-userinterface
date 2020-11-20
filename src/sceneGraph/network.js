/*
* Created by Ben Reynolds on 07/13/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.sceneGraph.network");

/**
 * This is the new positioning API for objects, tools, and nodes
 * Scene Graph implementation was inspired by:
 * https://webglfundamentals.org/webgl/lessons/webgl-scene-graph.html
 */
(function(exports) {

    let SceneNode = realityEditor.sceneGraph.SceneNode;
    let utils = realityEditor.gui.ar.utilities;
    let sceneGraph = realityEditor.sceneGraph;
    
    let uploadInfo = {};
    
    const synchronizationDelay = 1000; // waits 3 second between uploads

    function initService() {
        // every three seconds, send out an update to the server's sceneGraph with any updates to object positions
        setInterval(function() {
            uploadChangesToServers();
        }, synchronizationDelay);
    }

    function uploadChangesToServers() {
        // TODO: ensure that worldId belongs to the server of the object localized relative to it
        
        if (!realityEditor.sceneGraph.getWorldId())  { return; }
        
        realityEditor.forEachObject(function(object, objectKey) {
            let sceneNode = sceneGraph.getSceneNodeById(objectKey);
            sceneNode.needsUploadToServer = true; // TODO ben: fix this in a better way
            if (sceneNode.needsUploadToServer) {
                uploadSceneNode(sceneNode);
                sceneNode.needsUploadToServer = false;
            }
        });
    }
    
    function uploadSceneNode(sceneNode) {
        // only do this for objects
        let object = realityEditor.getObject(sceneNode.id);
        if (!object) { return; }
        
        let previousUploadInfo = uploadInfo[sceneNode.id];
        if (previousUploadInfo) {
            // the less distance it's moved, the more time needs to pass between uploads
            let timeSinceLastUpload = (Date.now() - previousUploadInfo.timestamp) / 1000;
            let distanceMoved = distance(sceneGraph.getWorldPosition(sceneNode.id), previousUploadInfo.worldPosition) / 1000;
            if (distanceMoved > 0.001) {
                // console.log(sceneNode.id + ' has moved ' + distanceMoved + ' meters in the last ' + timeSinceLastUpload + ' seconds');
            }
            if (distanceMoved === 0) {
                return;
            }
            // needs to wait 1 second if it moves 10cm, 0.1 second if moves 1m, 10 sec if moves only 1cm
            if (distanceMoved * timeSinceLastUpload < 0.1) {
                return;
            }
        }
        uploadInfo[sceneNode.id] = {
            localMatrix: sceneNode.localMatrix,
            worldPosition: sceneGraph.getWorldPosition(sceneNode.id),
            timestamp: Date.now()
        };
        
        console.log('uploading scene graph object position for ' + sceneNode.id);
        
        // if it's an object, post object position relative to a world object
        let worldObjectId = sceneGraph.getWorldId();
        let worldNode = sceneGraph.getSceneNodeById(worldObjectId);
        let relativeMatrix = sceneNode.getMatrixRelativeTo(worldNode);
        realityEditor.network.postObjectPosition(object.ip, sceneNode.id, relativeMatrix, worldObjectId);
    }
    
    function distance(pos1, pos2) {
        let dx = pos2.x - pos1.x;
        let dy = pos2.y - pos1.y;
        let dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    function uploadObjectPosition(objectId) {
        let objectNode = sceneGraph.getSceneNodeById(objectId);
        if (objectNode) {
            uploadSceneNode(objectNode);
        }
        // upload to the server for persistence
        // if it's an object, post object position relative to a world object
        // let worldObjectId = realityEditor.sceneGraph.getWorldId();
        // let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
        // let anchorNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
        // let relativeMatrix = anchorNode.getMatrixRelativeTo(worldNode);
        //
        // realityEditor.sceneGraph.network.uploadObjectPosition(objectKey);
        //
        // realityEditor.network.postObjectPosition(anchorObject.ip, objectKey, anchorObject.matrix, worldObjectId);
    }

    // public init method
    exports.initService = initService;
    exports.uploadObjectPosition = uploadObjectPosition;

})(realityEditor.sceneGraph.network);
