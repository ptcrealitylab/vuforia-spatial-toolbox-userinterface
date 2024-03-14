import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {ShaderMode} from './Shaders.js';

const DEBUG = false;

const vertexShader = `
varying vec2 vUv;
void main() {
vUv = uv;
gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

const fragmentShader = `
// base rt texture
uniform sampler2D mapBase;
// camera rt texture
uniform sampler2D mapCamera;

// uv (0.0-1.0) texture coordinates
varying vec2 vUv;

void main() {
vec4 colorBase = texture2D(mapBase, vUv);
vec4 colorCamera = texture2D(mapCamera, vUv);

vec3 diffC = abs(colorBase.rgb - colorCamera.rgb);
float alpha = colorBase.a * colorCamera.a;

alpha = alpha * step(0.5, dot(diffC, diffC));
gl_FragColor = vec4(0.7, 0.0, 0.7, alpha);
}`;

const fragmentShaderDepth = `
#include <packing>

// base rt texture
uniform sampler2D mapBase;
// camera rt texture
uniform sampler2D mapCamera;

// base rt depth texture
uniform sampler2D mapBaseDepth;
// camera rt depth texture
uniform sampler2D mapCameraDepth;

// uv (0.0-1.0) texture coordinates
varying vec2 vUv;

// position in local space
varying vec4 pos;

uniform float cameraNear;
uniform float cameraFar;

float readDepth(sampler2D depthSampler, vec2 coord) {
    float fragCoordZ = texture2D(depthSampler, coord).x;
    // return fragCoordZ;
    float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
    return viewZ;
    // return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
}

void main() {
    vec4 colorBase = texture2D(mapBase, vUv);
    vec4 colorCamera = texture2D(mapCamera, vUv);

    float depthBase = readDepth(mapBaseDepth, vUv);
    float depthCamera = readDepth(mapCameraDepth, vUv);

    float alpha = 1.0; // colorBase.a * colorCamera.a;
    // gl_FragColor = vec4(-pos.z / 1000.0, 0.0, 0.0, alpha);
    // gl_FragColor = vec4(-depthBase / 1000.0, 0.0, 0.0, alpha);
    float diff = (-depthBase + pos.z) / 10.0; // cm
    gl_FragColor = vec4(-diff / 100.0, diff / 100.0, 0.0, 100.0 + diff);
}`;

function makeDepthTexture(width, height) {
    let depthTexture = new THREE.DepthTexture(width, height);
    return depthTexture;
}
export class VisualDiff {
    constructor(cameraVis) {
        this.cameraVis = cameraVis;
        this.rtBase = null;
        this.rtCamera = null;
    }

    init() {
        let width = 640; // window.innerWidth;
        let height = 360; // window.innerHeight;

        this.rtBase = new THREE.WebGLRenderTarget(width, height);
        this.rtBase.depthTexture = makeDepthTexture(width, height);
        this.rtCamera = new THREE.WebGLRenderTarget(width, height);
        this.rtCamera.depthTexture = makeDepthTexture(width, height);

        if (DEBUG) {
            let matBase = new THREE.MeshBasicMaterial({
                map: this.rtBase.texture,
                transparent: false,
            });
            let cubeBase = new THREE.Mesh(new THREE.PlaneGeometry(500, 500 * height / width), matBase);
            realityEditor.gui.threejsScene.addToScene(cubeBase);
            cubeBase.position.set(400, 250, -1000);

            let matCamera = new THREE.MeshBasicMaterial({
                map: this.rtCamera.texture,
                transparent: false,
            });
            let cubeCamera = new THREE.Mesh(new THREE.PlaneGeometry(500, 500 * height / width), matCamera);
            realityEditor.gui.threejsScene.addToScene(cubeCamera);
            cubeCamera.position.set(-400, 250, -1000);

            const camera = realityEditor.gui.threejsScene.getInternals().mainCamera;

            let matDiff = new THREE.ShaderMaterial({
                uniforms: {
                    mapBase: {value: this.rtBase.texture},
                    mapBaseDepth: {value: this.rtBase.depthTexture},
                    mapCamera: {value: this.rtCamera.texture},
                    mapCameraDepth: {value: this.rtCamera.depthTexture},
                    cameraNear: {value: camera.getNear()},
                    cameraFar: {value: camera.getFar()},
                },
                vertexShader,
                fragmentShader: fragmentShaderDepth,
                transparent: false,
            });
            let cubeDiff = new THREE.Mesh(new THREE.PlaneGeometry(500, 500 * height / width), matDiff);
            realityEditor.gui.threejsScene.addToScene(cubeDiff);
            cubeDiff.position.set(-900, 550, -1000);
        }
    }

    /**
     * Get the diff material based on a given standard CameraVis/Patch material
     * @param {THREE.Material} material
     * @param {ShaderMode} shaderMode
     * @return {THREE.Material}
     */
    getMaterial(material, shaderMode) {
        if (!this.rtBase) {
            this.init();
        }

        const camera = realityEditor.gui.threejsScene.getInternals().mainCamera;

        let matDiff = material.clone();
        matDiff.fragmentShader = shaderMode === ShaderMode.DIFF ?
            fragmentShader : fragmentShaderDepth;
        matDiff.uniforms = material.uniforms;
        matDiff.uniforms.mapBase = {value: this.rtBase.texture};
        matDiff.uniforms.mapBaseDepth =  {value: this.rtBase.depthTexture};
        matDiff.uniforms.mapCamera = {value: this.rtCamera.texture};
        matDiff.uniforms.mapCameraDepth =  {value: this.rtCamera.depthTexture};
        matDiff.uniforms.cameraNear = {value: camera.getNear()};
        matDiff.uniforms.cameraFar = {value: camera.getFar()};
        return matDiff;
    }

    showCameraVisDiff(cameraVis) {
        if (cameraVis.shaderMode !== ShaderMode.DIFF &&
            cameraVis.shaderMode !== ShaderMode.DIFF_DEPTH) {
            console.error('VisualDiff called without shader mode being DIFF or DIFF_DEPTH');
            return;
        }

        if (!cameraVis.matDiff) {
            let matDiff = this.getMaterial(cameraVis.material, cameraVis.shaderMode);
            cameraVis.matDiff = matDiff;
        }

        let sceneNodeMatrix = cameraVis.getSceneNodeMatrix();
        this.showDiff(cameraVis.mesh, sceneNodeMatrix, cameraVis.matDiff, cameraVis.material);
    }

    showDiff(mesh, sceneNodeMatrix, matDiff, matBase) {
        // Set standard material to draw normally for visual difference
        mesh.material = matBase;

        let {scene, mainCamera, renderer} = realityEditor.gui.threejsScene.getInternals();
        let camera = mainCamera.getInternalObject();

        let originalCameraMatrix = camera.matrix.clone();
        realityEditor.sceneGraph.setCameraPosition(sceneNodeMatrix.elements);

        // Move camera to match CameraVis position exactly (not pointing up)
        // Turn off everything but base mesh
        camera.layers.set(1);
        renderer.setRenderTarget(this.rtBase);
        renderer.clear();
        renderer.render(scene, camera);
        // Now draw only the cameravis
        camera.layers.set(2);
        renderer.setRenderTarget(this.rtCamera);
        renderer.clear();
        renderer.render(scene, camera);
        // rt diff is the diff, draw it on the cameravis sort of
        renderer.setRenderTarget(null);

        realityEditor.sceneGraph.setCameraPosition(originalCameraMatrix.elements);

        // Now set diff material to draw the diff on screen
        mesh.material = matDiff;
    }
}
