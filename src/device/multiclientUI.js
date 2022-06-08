/*
* Copyright © 2018 PTC
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace('realityEditor.device.multiclientUI');

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {
    let allConnectedCameras = {};
    let isCameraSubscriptionActiveForObject = {};

    function initService() {
        // if (!realityEditor.device.desktopAdapter.isDesktop()) { return; }
        console.log('multiclientUI it begins');

        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            setTimeout(function() {
                setupWorldSocketSubscriptionsIfNeeded(objectKey);
            }, 100); // give time for bestWorldObject to update before checking
        });


        update();
    }

    function setupWorldSocketSubscriptionsIfNeeded(objectKey) {
        if (isCameraSubscriptionActiveForObject[objectKey]) {
            return;
        }

        // subscribe to remote operator camera positions
        // right now this assumes there will only be one world object in the network
        let object = realityEditor.getObject(objectKey);
        if (object && (object.isWorldObject || object.type === 'world')) {
            console.log('multiclientUI subscribing', objectKey);
            realityEditor.network.realtime.subscribeToCameraMatrices(objectKey, onCameraMatrix);
            isCameraSubscriptionActiveForObject[objectKey] = true;
        }
    }

    function onCameraMatrix(data) {
        console.log('multiclientUI onCameraMatrix', data);
        let msgData = JSON.parse(data);
        if (typeof msgData.cameraMatrix !== 'undefined' && typeof msgData.editorId !== 'undefined') {
            allConnectedCameras[msgData.editorId] = msgData.cameraMatrix;
        }
    }

    // helper function to generate an integer hash from a string (https://stackoverflow.com/a/15710692)
    function hashCode(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    }

    function update() {
        // this remote operator's camera position already gets sent in desktopCamera.js
        // here we render boxes at the location of each other camera...

        try {
            Object.keys(allConnectedCameras).forEach(function(editorId) {
                let cameraMatrix = allConnectedCameras[editorId];
                let existingMesh = realityEditor.gui.threejsScene.getObjectByName('camera_' + editorId);
                if (!existingMesh) {
                    // each client gets a random but consistent color based on their editorId
                    let id = Math.abs(hashCode(editorId));
                    const color = `hsl(${(id % Math.PI) * 360 / Math.PI}, 100%, 50%)`;
                    const geo = new THREE.BoxGeometry(150, 150, 150);
                    const mat = new THREE.MeshBasicMaterial({color: color});
                    existingMesh = new THREE.Mesh(geo, mat);
                    existingMesh.name = 'camera_' + editorId;
                    existingMesh.matrixAutoUpdate = false;
                    realityEditor.gui.threejsScene.addToScene(existingMesh);
                }
                realityEditor.gui.threejsScene.setMatrixFromArray(existingMesh.matrix, cameraMatrix);
            });
        } catch (e) {
            console.warn(e);
        }

        requestAnimationFrame(update);
    }

    exports.initService = initService;
})(realityEditor.device.multiclientUI);

