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
            if (doesObjectNeedUpload(sceneNode)) {
                uploadObjectSceneNode(sceneNode);
            }
            
            realityEditor.forEachFrameInObject(objectKey, (objectKey, frameKey) => {
                let sceneNode = sceneGraph.getSceneNodeById(frameKey);
                if (doesFrameNeedUpload(sceneNode)) {
                    uploadFrameSceneNode(sceneNode);
                }
            });
        });
    }

    /**
     * Uploads sceneNode iff: it's an object && (was specifically marked for upload || moved significantly)
     * "moved significantly" is a combination of how far it moved and how long since its last upload
     * @param {SceneNode} sceneNode
     * @return {boolean}
     */
    function doesObjectNeedUpload(sceneNode) {
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
    function uploadObjectSceneNode(sceneNode) {
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

        // check if it's an origin object that matches a world object
        if (object.type === 'origin') {
            // if so, upload the originOffset instead of the position, so we can load it the next time the app opens
            let matchingWorld = realityEditor.worldObjects.getMatchingWorldObject(sceneNode.id);
            if (typeof matchingWorld.originOffset !== 'undefined') {
                relativeMatrix = matchingWorld.originOffset;
            }
        }

        realityEditor.network.postObjectPosition(object.ip, sceneNode.id, relativeMatrix, worldObjectId);

        objectLocalizedCallbacks.forEach(function(callback) {
            callback(sceneNode.id, worldObjectId);
        });

        sceneNode.needsUploadToServer = false;
    }

    // Similar to doesObjectNeedUpload, but for frames. Determines eligibility by measuring change in localMatrix
    // (not worldPosition like in doesNeedObjectUpload)
    function doesFrameNeedUpload(sceneNode) {
        // only do this for frames
        let frame = sceneNode.linkedVehicle;
        if (!frame) { return false; }

        // if the frame specifically marked itself as needing to upload, upload it
        if (sceneNode.needsUploadToServer) { return true; }

        // otherwise check that it's moved since the last upload
        let previousUploadInfo = uploadInfo[sceneNode.id];
        if (previousUploadInfo) {
            // the less distance it's moved, the more time needs to pass between uploads
            let timeSinceLastUpload = (Date.now() - previousUploadInfo.timestamp) / 1000;
            // let distanceMoved = distance(sceneGraph.getWorldPosition(sceneNode.id), previousUploadInfo.worldPosition) / 1000;
            let currentPosition = { x: sceneNode.localMatrix[12], y: sceneNode.localMatrix[13], z: sceneNode.localMatrix[14] };
            let previousPosition = { x: previousUploadInfo.localMatrix[12], y: previousUploadInfo.localMatrix[13], z: previousUploadInfo.localMatrix[14] };
            let distanceMoved = distance(currentPosition, previousPosition) / 1000;
            
            if (distanceMoved === 0) { return false; }
            // needs to wait 1 second if it moves 10cm, 0.1 second if moves 1m, 10 sec if moves only 1cm
            return (distanceMoved * timeSinceLastUpload) > 0.1;
        }

        return true;
    }

    // similar to uploadObjectSceneNode, but for frames.
    // simpler upload because just updating localMatrix, not computing relative to world
    function uploadFrameSceneNode(sceneNode) {
        let frame = sceneNode.linkedVehicle;
        if (!frame) { return; }

        uploadInfo[sceneNode.id] = {
            localMatrix: sceneNode.localMatrix,
            timestamp: Date.now()
        };

        console.log('uploading scene graph frame position for ' + sceneNode.id);

        realityEditor.network.postVehiclePosition(frame, false);

        sceneNode.needsUploadToServer = false;
    }

    // helps us from re-uploading frame position when the frame is initially loaded, by keeping track of its initial
    // position, so that we only have to upload if it moves from the position last stored in the server
    function recordInitialFramePosition(sceneNode) {
        if (!sceneNode.linkedVehicle) { return; } // only work for frames

        uploadInfo[sceneNode.id] = {
            localMatrix: sceneNode.localMatrix,
            timestamp: Date.now()
        };
    }

    /**
     * Public function for other modules to trigger an upload instead of waiting for this module to eventually do it
     * @param {string} objectId
     */
    function uploadObjectPosition(objectId) {
        let objectNode = sceneGraph.getSceneNodeById(objectId);
        if (objectNode) {
            uploadObjectSceneNode(objectNode);
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
    exports.recordInitialFramePosition = recordInitialFramePosition;

})(realityEditor.sceneGraph.network);
