/*
* Created by Ben Reynolds on 11/20/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.sceneGraph.network");

/**
 * This module interfaces and synchronizes the local scene graph with the scene graphs of any edge servers.
 * Only uploads if everything has been localized to a world object.
 * Periodically uploads any updated objects' positions, and provides public functions to immediately upload positions.
 */
(function(exports) {
    let sceneGraph = realityEditor.sceneGraph;
    let uploadInfo = {};
    const synchronizationDelay = 1000; // waits 1 second between potential uploads

    function initService() {
        // every X seconds, send out an update to the server's sceneGraph with any updates to object positions
        setInterval(function() {
            uploadChangesToServers();
        }, synchronizationDelay);
    }

    /**
     * Scans thru all objects and uploads the positions of objects it decides need to be updated
     */
    function uploadChangesToServers() {
        // certain environments (e.g. VR) might only be viewers of object scene graph, not authors
        if (!realityEditor.device.environment.isSourceOfObjectPositions()) { return; }
        
        // don't upload if we haven't localized everything to a world object yet
        if (!realityEditor.sceneGraph.getWorldId())  { return; }
        
        realityEditor.forEachObject(function(object, objectKey) {
            let sceneNode = sceneGraph.getSceneNodeById(objectKey);
            if (doesNeedUpload(sceneNode)) {
                uploadSceneNode(sceneNode);
            }
        });
    }

    /**
     * Uploads sceneNode iff: it's an object && (was specifically marked for upload || moved significantly)
     * "moved significantly" is a combination of how far it moved and how long since its last upload
     * @param {SceneNode} sceneNode
     * @return {boolean}
     */
    function doesNeedUpload(sceneNode) {
        // only do this for objects
        let object = realityEditor.getObject(sceneNode.id);
        if (!object) { return false; }
        
        // if the object specifically marked itself as needing to upload, upload it
        if (sceneNode.needsUploadToServer) { return true; }

        // otherwise check that it's moved since the last upload
        let previousUploadInfo = uploadInfo[sceneNode.id];
        if (previousUploadInfo) {
            // the less distance it's moved, the more time needs to pass between uploads
            let timeSinceLastUpload = (Date.now() - previousUploadInfo.timestamp) / 1000;
            let distanceMoved = distance(sceneGraph.getWorldPosition(sceneNode.id), previousUploadInfo.worldPosition) / 1000;
            if (distanceMoved === 0) { return false; }
            // needs to wait 1 second if it moves 10cm, 0.1 second if moves 1m, 10 sec if moves only 1cm
            return (distanceMoved * timeSinceLastUpload) > 0.1;
        }

        return true;
    }

    function distance(pos1, pos2) {
        let dx = pos2.x - pos1.x;
        let dy = pos2.y - pos1.y;
        let dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Computes object position relative to world, and uploads that position to the server
     * Stores some metadata locally in uploadInfo so that we can compare to decide when to upload again
     * @param {SceneNode} sceneNode
     */
    function uploadSceneNode(sceneNode) {
        // don't upload if we haven't localized everything to a world object yet
        if (!realityEditor.sceneGraph.getWorldId())  { return; }

        let object = realityEditor.getObject(sceneNode.id);
        if (!object) { return; }

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

        objectLocalizedCallbacks.forEach(function(callback) {
            callback(sceneNode.id, worldObjectId);
        });

        sceneNode.needsUploadToServer = false;
    }

    /**
     * Public function for other modules to trigger an upload instead of waiting for this module to eventually do it
     * @param {string} objectId
     */
    function uploadObjectPosition(objectId) {
        let objectNode = sceneGraph.getSceneNodeById(objectId);
        if (objectNode) {
            uploadSceneNode(objectNode);
        }
    }

    let objectLocalizedCallbacks = [];
    function onObjectLocalized(callback) {
        objectLocalizedCallbacks.push(callback);
    }

    function triggerLocalizationCallbacks(objectId) {
        // check what it's best worldId should be
        let worldObjectId = sceneGraph.getWorldId();

        objectLocalizedCallbacks.forEach(function(callback) {
            callback(objectId, worldObjectId);
        });
    }

    exports.initService = initService;
    exports.uploadObjectPosition = uploadObjectPosition;
    exports.onObjectLocalized = onObjectLocalized;
    exports.triggerLocalizationCallbacks = triggerLocalizationCallbacks;

})(realityEditor.sceneGraph.network);
