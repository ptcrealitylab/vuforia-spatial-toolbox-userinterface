import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { RoomEnvironment } from '../../thirdPartyCode/three/RoomEnvironment.module.js';
import { Camera3D } from './Camera3D.js'

/**
 @typedef {number} PixelCount 
 @typedef {number} UnitsPerMeter
 @typedef {number} MetersPerUnit
 @typedef {number} UnitsPerUnit
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
        /** @type {UnitsPerMeter} standard device is in mm */
        this.deviceScale = 1000;
        /** @type {MetersPerUnit} our scene is in mm */
        this.sceneScale = 0.001;
        /** @type {PixelCount} */
        this.width = 0;
        /** @type {PixelCount} */
        this.height = 0;
        /** @type {HTMLCanvasElement} */
        this.canvasElement = canvasElement; 
        /** @type {THREE.WebGLRenderer} */
        this.renderer = new THREE.WebGLRenderer({canvas: canvasElement, alpha: true, antialias: false});
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        // enable webxr
        this.renderer.xr.enabled = true;

        /** @type {THREE.Scene} */
        this.scene = new THREE.Scene();

         /** @type {THREE.Group} */
         this.worldScaleNode = new THREE.Group();
         this.worldScaleNode.scale.set(this.sceneScale * this.deviceScale, this.sceneScale * this.deviceScale, this.sceneScale * this.deviceScale);
         this.scene.add(this.worldScaleNode);

        // This doesn't seem to work with the area target model material, but adding it for everything else
        /** @type {THREE.AmbientLight} */
        let ambLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.add(ambLight);

        // lights the scene from above
        /** @type {THREE.DirectionalLight} */
        let dirLightTopDown = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLightTopDown.position.set(0, 1, 0); // top-down
        dirLightTopDown.lookAt(0, 0, 0);
        this.add(dirLightTopDown);

        /** @type {THREE.PMREMGenerator} */
        let pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();

        /** @type {THREE.WebGLRenderTarget} */
        let neutralEnvironment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.scene.environment = neutralEnvironment;

        this.setSize(window.innerWidth, window.innerHeight);
        realityEditor.device.layout.onWindowResized(({width, height}) => {this.setSize(width, height)});

        /** @type {Camera3D} */
        this.camera = null;    

        /** @type {THREE.Raycaster} */
        this.raycaster = new THREE.Raycaster();

        /** @type {[(deviceScale: UnitsPerMeter, sceneScale: MetersPerUnit) => void]} */
        this.scaleListeners = [];
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
        if (this.camera) {
            this.camera.setSize(width, height);
        }
    }

    /**
     * returns the size of the renderer
     * @returns {{width: PixelCount, height: PixelCount}}
     */
    getSize() {
        return {width: this.width, height: this.height};
    }

    /**
     * 
     * @returns {UnitsPerUnit}
     */
    getWorldScale() {
        return this.sceneScale * this.deviceScale;
    }

    /**
     * @returns {UnitsPerMeter}
     */
    getDeviceScale() {
        return this.deviceScale;
    }

    /**
     * @returns {MetersPerUnit}
     */
    getSceneScale() {
        return this.sceneScale;
    }

    /**
     * 
     * @param {UnitsPerMeter} scale 
     */
    setDeviceScale(scale) {
        this.deviceScale = scale;
        this.worldScaleNode.scale.set(this.sceneScale * this.deviceScale, this.sceneScale * this.deviceScale, this.sceneScale * this.deviceScale);
        for (const func of this.scaleListeners) {
            func(scale, this.sceneScale);
        }
    }

    /**
     * renders the scene using the given camera
     * @param {THREE.Scene} scene 
     * @param {boolean} hasGltfScene 
     */
    render() {
        // only render the scene if the camera is initialized
        if (this.camera.isInitialized()) {
            this.renderer.render(this.scene, this.camera.getInternalObject());
        }
    }

    /**
     * 
     * @returns {boolean}
     */
    isInWebXRMode() {
        return this.renderer.xr.isPresenting;
    }

    /**
     * 
     * @param {() => void} func 
     */
    setAnimationLoop(func) {
        this.renderer.setAnimationLoop(func);
    }

    /**
     * adds an object to the main scene
     * @param {THREE.Object3D} obj 
     */
    add(obj) {
        this.worldScaleNode.add(obj);
    }

    /**
     * removes an object form the scene
     * @param {THREE.Object3D} obj 
     */
    remove(obj) {
        this.worldScaleNode.remove(obj);
    }

    /**
     * Gets an object from the main scene by name
     * @param {string} name 
     * @returns {ObjectD|undefined}
     */
    getObjectByName(name) {
        return this.worldScaleNode.getObjectByName(name);
    }

    /**
     * Returns all objects by name in a scene recursive
     * @param {string} name 
     * @returns {Object3D[]}
     */
    getObjectsByNameRecursive(name) {
        if (name === undefined) return;
        const objects = [];
        this.worldScaleNode.traverse((object) => {
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

    /**
     * set the camera used for rendering this scene
     * @param {Camera3D} camera 
     */
    setCamera(camera) {
        if (this.camera !== null) {
            this.remove(this.camera.getInternalObject());
        }
        this.camera = camera;
        this.add(this.camera.getInternalObject()); // Normally not needed, but needed in order to add child objects relative to camera
    }

    /**
     * this module exports this utility so that other modules can perform hit tests
     * objectsToCheck defaults to scene.children (all objects in the scene) if unspecified
     * NOTE: returns the coordinates in threejs scene world coordinates:
     *       may need to call objectToCheck.worldToLocal(results[0].point) to get the result in the right system
     * @param {PixelCount} clientX 
     * @param {PixelCount} clientY 
     * @param {[THREE.Object3D]} objectsToCheck 
     * @returns 
     */
    getRaycastIntersects(clientX, clientY, objectsToCheck) {
        let mouse = new THREE.Vector2();
        mouse.x = ( clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( clientY / window.innerHeight ) * 2 + 1;

        //2. set the picking ray from the camera position and mouse coordinates
        this.raycaster.setFromCamera( mouse, this.camera.getInternalObject() );

        this.raycaster.firstHitOnly = true; // faster (using three-mesh-bvh)

        //3. compute intersections
        // add object layer to raycast layer mask
        objectsToCheck.forEach(obj => {
           this.raycaster.layers.mask = this.raycaster.layers.mask | obj.layers.mask; 
        });
        let results = this.raycaster.intersectObjects( objectsToCheck || this.worldScaleNode.children, true );
        results.forEach(intersection => {
            intersection.rayDirection = this.raycaster.ray.direction;
        });
        return results;
    }

    addScaleListener(func) {
        this.scaleListeners.push(func);
    }
}

export {Renderer3D};
