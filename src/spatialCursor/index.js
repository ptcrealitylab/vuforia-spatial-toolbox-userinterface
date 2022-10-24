createNameSpace("realityEditor.spatialCursor");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {

    let cachedWorldObject;
    let cachedOcclusionObject;
    let occlusionDownloadInterval = null;
    let worldIntersectPoint = {};
    let indicator;
    let overlapped = false;

    let clock = new THREE.Clock();
    let uniforms = {
        'time': {value: 0},
    };
    
    // offset the spatial cursor with the worldIntersectPoint to avoid clipping plane issues
    const worldIntersectOffsetDist = 15;
    const indicatorAxis = new THREE.Vector3(0, 0, 1);
    // const normalCursorMaterial = new THREE.ShaderMaterial({
    //     vertexShader: realityEditor.spatialCursor.shader.vertexShader.vertexShaderCode,
    //     fragmentShader: realityEditor.spatialCursor.shader.normalCursorFragmentShader.normalCursorFragmentShaderCode,
    //     uniforms: uniforms,
    //     transparent: true,
    //     side: THREE.DoubleSide,
    // });
    const vertexShader = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
    `;
    const normalFragmentShader = `
    uniform float time;
    varying vec2 vUv;
    
    void main(void) {
        vec2 position = -1.0 + 2.0 * vUv;
        vec2 origin = vec2(0.0);
        float color = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
        float alpha = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
        gl_FragColor = vec4(color, color, color, alpha);
    }
    `;
    const colorFragmentShader = `
    uniform float time;
    varying vec2 vUv;
    
    void main(void) {
        vec2 position = -1.0 + 2.0 * vUv;
        vec2 translate = vec2(-0.5, 0);
        position += translate;
    
        float r = abs(sin(position.x * position.y + time / 2.0));
        float g = abs(sin(position.x * position.y + time / 4.0));
        float b = abs(sin(position.x * position.y + time / 6.0));
    
        gl_FragColor = vec4(r, g, b, 1.0);
    }
    `;
    const normalCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: normalFragmentShader,
        uniforms: uniforms,
        transparent: true,
        side: THREE.DoubleSide,
    });
    const colorCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: colorFragmentShader,
        uniforms: uniforms,
        transparent: true,
        side: THREE.DoubleSide,
    });

    function initService() {
        onLoadOcclusionObject((worldObject, occlusionObject) => {
            cachedWorldObject = worldObject;
            cachedOcclusionObject = occlusionObject;
        });

        indicator = addSpatialCursor();

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            let screenX = window.innerWidth / 2;
            let screenY = window.innerHeight / 2;
            worldIntersectPoint = getRaycastCoordinates(window.innerWidth / 2, window.innerHeight / 2);
            updateSpatialCursor();
            uniforms['time'].value = clock.getElapsedTime() * 10;
            // constantly check if the screen center overlaps any iframes
            let overlappingDivs = realityEditor.device.utilities.getAllDivsUnderCoordinate(screenX, screenY);
            // console.log(overlappingDivs);
            overlapped = overlappingDivs.some(element => element.tagName === 'IFRAME');
        });
    }

    function addSpatialCursor() {
        const geometryLength = 50;
        const geometry1 = new THREE.CircleGeometry(geometryLength, 32);
        const circle1 = new THREE.Mesh(geometry1, normalCursorMaterial);
        realityEditor.gui.threejsScene.addToScene(circle1);
        return circle1;
    }

    function updateSpatialCursor() {
        if (typeof worldIntersectPoint.point !== 'undefined') {
            let position = new THREE.Vector3(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
            position.add(worldIntersectPoint.normalVector.multiplyScalar(worldIntersectOffsetDist));
            indicator.position.set(position.x, position.y, position.z);
            indicator.quaternion.setFromUnitVectors(indicatorAxis, worldIntersectPoint.normalVector);
        }
        indicator.material = overlapped ? colorCursorMaterial : normalCursorMaterial;
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

    exports.initService = initService;
}(realityEditor.spatialCursor));
