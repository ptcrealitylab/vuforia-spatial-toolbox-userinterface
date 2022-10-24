createNameSpace("realityEditor.spatialCursor");

import * as THREE from '../thirdPartyCode/three/three.module.js'

(function(exports) {

    let cachedWorldObject;
    let cachedOcclusionObject;
    let occlusionDownloadInterval = null;
    let worldIntersectPoint = {};
    let indicator;

    const indicatorAxis = new THREE.Vector3(0, 0, 1);

    function initService() {
        onLoadOcclusionObject((worldObject, occlusionObject) => {
            cachedWorldObject = worldObject;
            cachedOcclusionObject = occlusionObject;
        });

        indicator = addSpatialCursor();

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            worldIntersectPoint = getRaycastCoordinates(window.innerWidth / 2, window.innerHeight / 2);
            updateSpatialCursor();
        });
    }

    function addSpatialCursor() {
        const geometryLength = 50;
        const geometry1 = new THREE.CircleGeometry(geometryLength, 32);
        const material1 = new THREE.MeshStandardMaterial({
            color: 0x0000ff,
            side: THREE.DoubleSide,
        });
        const circle1 = new THREE.Mesh(geometry1, material1);
        realityEditor.gui.threejsScene.addToScene(circle1);
        return circle1;
    }

    function updateSpatialCursor() {
        if (typeof worldIntersectPoint.point !== 'undefined') {
            indicator.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
            indicator.quaternion.setFromUnitVectors(indicatorAxis, worldIntersectPoint.normalVector);
            // indicator.updateMatrix();
            // indicator.translateZ(-10); // helps with z-fighting on remote operator
        }
    }

    // polls the three.js scene every 1 second to see if the gltf for the world object has finished loading
    function onLoadOcclusionObject(callback) {
        occlusionDownloadInterval = setInterval(() => {
            if (!cachedWorldObject) {
                cachedWorldObject = realityEditor.worldObjects.getBestWorldObject();
            }
            if (!cachedWorldObject) {
                return;
            }
            if (cachedWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
                cachedWorldObject = null; // don't accept the local world object
            }
            if (cachedWorldObject && !cachedOcclusionObject) {
                cachedOcclusionObject = realityEditor.gui.threejsScene.getObjectForWorldRaycasts(cachedWorldObject.objectId);
                if (cachedOcclusionObject) {
                    // trigger the callback and clear the interval
                    callback(cachedWorldObject, cachedOcclusionObject);
                    clearInterval(occlusionDownloadInterval);
                    occlusionDownloadInterval = null;
                }
            }
        }, 1000);
    }

    function getRaycastCoordinates(screenX, screenY) {

        let objectsToCheck = [];
        if (cachedOcclusionObject) {
            objectsToCheck.push(cachedOcclusionObject);
        }
        // if (realityEditor.gui.threejsScene.getGroundPlaneCollider()) {
        //     objectsToCheck.push(realityEditor.gui.threejsScene.getGroundPlaneCollider());
        // }
        if (cachedWorldObject && objectsToCheck.length > 0) {
            // by default, three.js raycast returns coordinates in the top-level scene coordinate system
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, objectsToCheck);
            if (raycastIntersects.length > 0) {
                let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
                let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
                inverseGroundPlaneMatrix.invert();
                raycastIntersects[0].point.applyMatrix4(inverseGroundPlaneMatrix);
                let trInvGroundPlaneMat = inverseGroundPlaneMatrix.clone().transpose();
                worldIntersectPoint = {
                    point: raycastIntersects[0].point,
                    normalVector: raycastIntersects[0].face.normal.clone().applyMatrix4(trInvGroundPlaneMat).normalize(),
                }
            }
        }
        // console.log(`%c ${worldIntersectPoint.point}`, 'color: orange');
        return worldIntersectPoint; // these are relative to the world object
    }
    
    exports.getCursorRelativeToWorldObject = function() {
        if (!cachedWorldObject || !cachedOcclusionObject) { return null; }

        let cursorMatrix = indicator.matrixWorld.clone(); // in ROOT coordinates
        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        return realityEditor.sceneGraph.convertToNewCoordSystem(cursorMatrix, realityEditor.sceneGraph.getSceneNodeById('ROOT'), worldSceneNode);
    }

    exports.initService = initService;
}(realityEditor.spatialCursor));
