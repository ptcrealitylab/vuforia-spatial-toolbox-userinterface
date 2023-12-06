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
     * Prepares the main scene with lighting to be renered into the given canvas
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
        // temporary vr button
        this.renderer.xr.enabled = true;

        /** @type {THREE.Scene} */
        this.scene = new THREE.Scene();

        // This doesn't seem to work with the area target model material, but adding it for everything else
        /** @type {THREE.AmbientLight} */
        let ambLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambLight);

        // lights the scene from above
        /** @type {THREE.DirectionalLight} */
        let dirLightTopDown = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLightTopDown.position.set(0, 1, 0); // top-down
        dirLightTopDown.lookAt(0, 0, 0);
        this.scene.add(dirLightTopDown);

        /** @type {THREE.PMREMGenerator} */
        let pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        /** @type {THREE.WebGLRenderTarget} */
        let neutralEnvironment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.scene.environment = neutralEnvironment;

        this.setSize(window.innerWidth, window.innerHeight);
        realityEditor.device.layout.onWindowResized(({width, height}) => {this.setSize(width, height)});
    }

    /**
     * sets the size of the renderer
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
     * returns the size of the renderer
     * @returns {{width: PixelCount, height: PixelCount}}
     */
    getSize() {
        return {width: this.width, height: this.height};
    }

    /**
     * renders the scene using the given camera
     * @param {THREE.Scene} scene 
     * @param {Camera3D} camera 
     * @param {boolean} hasGltfScene 
     */
    render(camera) {
        this.renderer.render(this.scene, camera.getInternalObject());
    }

    /**
     * 
     * @param {function():void} func 
     */
    setAnimationLoop(func) {
        this.renderer.setAnimationLoop(func);
    }

    /**
     * adds an object to the main scene
     * @param {THREE.Object3D} obj 
     */
    add(obj) {
        this.scene.add(obj);
    }

    /**
     * Gets an object from the main scene by name
     * @param {string} name 
     * @returns {ObjectD|undefined}
     */
    getObjectByName(name) {
        return this.scene.getObjectByName(name);
    }

    /**
     * Returns all objects by name in a scene recursive
     * @param {string} name 
     * @returns {Object3D[]}
     */
    getObjectsByNameRecursive(name) {
        if (name === undefined) return;
        const objects = [];
        this.scene.traverse((object) => {
            if (object.name === name) objects.push(object);
        })
        return objects;
    }

    /**
     * 
     * @returns {HTMLCanvasElement}
     */
    getCanvasElement() {
        return this.canvasElement;
    }

    /**
     * 
     * @returns {THREE.Scene}
     */
    getInternalScene() {
        return this.scene;
    }
}

export {Renderer3D};
