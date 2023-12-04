import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { RoomEnvironment } from '../../thirdPartyCode/three/RoomEnvironment.module.js';

/**
 @typedef {number} PixelCount 
 */

/**
 * This class manages the main scene including the rendering
 */
class Renderer3D {
    /**
     * 
     * @param {HTMLCanvasElement} canvasElement 
     */
    constructor(canvasElement) {
        /** @type {PixelCount} */
        this.width = 0;
        /** @type {PixelCount} */
        this.height = 0;
        /** @type {HTMLCanvasElement} */
        this.canvasElement = canvasElement; 
        /** @type {THREE.WebGLRenderer} */
        this.renderer = new THREE.WebGLRenderer({canvas: canvasElement, alpha: true, antialias: false});
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.autoClear = false;
        /** @type {THREE.Scene} */
        this.scene = new THREE.Scene();

        // This doesn't seem to work with the area target model material, but adding it for everything else
        let ambLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambLight);

        // attempts to light the scene evenly with directional lights from each side, but mostly from the top
        let dirLightTopDown = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLightTopDown.position.set(0, 1, 0); // top-down
        dirLightTopDown.lookAt(0, 0, 0);
        this.scene.add(dirLightTopDown);

        let pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        let neutralEnvironment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.scene.environment = neutralEnvironment;

        this.setSize(window.innerWidth, window.innerHeight);
        realityEditor.device.layout.onWindowResized(({width, height}) => {this.setSize(width, height)});
    }

    /**
     * 
     * @param {PixelCount} width 
     * @param {PixelCount} height 
     */
    setSize(width, height) {
        this.width = width;
        this.height = height;
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    /**
     * 
     * @returns {{width: PixelCount, height: PixelCount}}
     */
    getSize() {
        return {width: this.width, height: this.height};
    }

    /**
     * 
     * @param {THREE.Scene} scene 
     * @param {Camera3D} camera 
     * @param {boolean} hasGltfScene 
     */
    render(camera, hasGltfScene) {
        this.renderer.clear();
        if (hasGltfScene) {
            // Set rendered layer to 1: only the background, i.e. the
            // static gltf mesh
            camera.setLayers(1);
            this.renderer.render(this.scene, camera.getInternalObject());
            // Leaves only the color from the render, discarding depth and
            // stencil
            this.renderer.clear(false, true, true);
        }
        // Set layer to 0: everything but the background
        camera.setLayers(0);
        this.renderer.render(this.scene, camera.getInternalObject());
    }

    add(obj) {
        this.scene.add(obj);
    }

    getObjectByName(name) {
        return this.scene.getObjectByName(name);
    }

    getObjectsByNameRecursive(name) {
        if (name === undefined) return;
        const objects = [];
        this.scene.traverse((object) => {
            if (object.name === name) objects.push(object);
        })
        return objects;
    }

    getCanvasElement() {
        return this.canvasElement;
    }

    getInternalScene() {
        return this.scene;
    }
}

export {Renderer3D};
