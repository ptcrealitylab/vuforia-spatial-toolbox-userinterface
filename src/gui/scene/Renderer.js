import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import { RoomEnvironment } from '../../../thirdPartyCode/three/RoomEnvironment.module.js';
import { acceleratedRaycast } from '../../../thirdPartyCode/three-mesh-bvh.module.js';
import { WebXRVRButton } from './WebXRVRButton.js';
import { Camera } from './Camera.js';
import AnchoredGroup from './AnchoredGroup.js';
import {ToolManager} from './ToolManager.js';

/**
 * @typedef {number} pixels
 * @typedef {number} DeviceUnitsPerMeter
 * @typedef {number} MetersPerSceneUnit
 * @typedef {number} DeviceUnitsPerSceneUnit
 * @typedef {number} SceneUnitsPerDeviceUnit
 * @typedef {number} SceneUnits
 * @typedef {(globalScale: GlobalScale) => void} GlobalScaleListener
 * @typedef {{a: number, b: number, c: number, normal: THREE.Vector3, materialIndex: number}} Face
 * @typedef {{distance: number, distanceToRay?: number|undefined, point: THREE.Vector3, index?: number | undefined, face?: Face | null | undefined, faceIndex?: number | undefined, object: THREE.Object3D, uv?: THREE.Vector2 | undefined, uv1?: THREE.Vector2 | undefined, normal?: THREE.Vector3, instanceId?: number | undefined, pointOnLine?: THREE.Vector3, batchId?: number, scenePoint: THREE.Vector3, sceneDistance: SceneUnits}} Intersection
 */

class GlobalScale {
    /** @type {DeviceUnitsPerMeter} */
    #deviceScale;

    /** @type {MetersPerSceneUnit} */
    #sceneScale;

    /** @type {THREE.Group} */
    #node;

    /** @type {GlobalScaleListener[]} */
    #listeners;
    
    /**
     * 
     * @param {DeviceUnitsPerMeter} deviceScale 
     * @param {MetersPerSceneUnit} sceneScale 
     */
    constructor(deviceScale, sceneScale) {
        this.#deviceScale = deviceScale;
        this.#sceneScale = sceneScale;
        this.#listeners = [];

        this.#node = new THREE.Group();
        this.#node.name = "worldScaleNode";
        this.#node.scale.setScalar(this.getGlobalScale());
    }

    getDeviceScale() {
        return this.#deviceScale;
    }

    /**
     * 
     * @param {DeviceUnitsPerMeter} scale 
     */
    setDeviceScale(scale) {
        this.#deviceScale = scale;
        this.#node.scale.setScalar(this.getGlobalScale());
        this.#notifyListeners();
    }

    getSceneScale() {
        return this.#sceneScale;
    }

    /**
     * 
     * @returns {DeviceUnitsPerSceneUnit}
     */
    getGlobalScale() {
        return this.#deviceScale * this.#sceneScale;
    }

    /**
     * 
     * @returns {SceneUnitsPerDeviceUnit}
     */
    getInvGlobalScale() {
        return 1.0 / this.getGlobalScale();
    }

    getNode() {
        return this.#node;
    }

    /**
     * 
     * @param {GlobalScaleListener} func 
     */
    addListener(func) {
        this.#listeners.push(func);
    }

    #notifyListeners() {
        for (const listener of this.#listeners) {
            listener(this);
        }
    }
}

/**
 * Manages the rendering of the main scene
 */
class Renderer {
    /** @type {THREE.WebGLRenderer} */
    #renderer

    /** @type {Camera} */
    #camera

    /** @type {THREE.Scene} */
    #scene

    /** @type {THREE.Raycaster} */
    #raycaster

    /** @type {GlobalScale} */
    #globalScale

     /** @type {ToolManager} */
     #tools;

    /**
     * 
     * @param {HTMLCanvasElement} domElement 
     */
    constructor(domElement) {
        this.#renderer = new THREE.WebGLRenderer({canvas: domElement, alpha: true, antialias: true});
        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.outputEncoding = THREE.sRGBEncoding;
        if (this.#renderer.xr && !realityEditor.device.environment.isARMode()) {
            this.#renderer.xr.enabled = true;
            if (realityEditor.gui.getMenuBar) {
                const menuBar = realityEditor.gui.getMenuBar();
                menuBar.addItemToMenu(realityEditor.gui.MENU.Develop, WebXRVRButton.createButton(this.#renderer));
            }
        }

        this.#scene = new THREE.Scene();

        // in the webbrowser we work with milimeters so 1000 browserunits are 1 meter and 0.001 meter is one scene unit (effectively canceling each other out)
        // we use this for headsets, in order to change the deviceScale
        this.#globalScale = new GlobalScale(1000, 0.001);
        this.#scene.add(this.#globalScale.getNode());

        realityEditor.device.layout.onWindowResized(({width, height}) => {
            this.#renderer.setSize(width, height);
        });

        this.#setupLighting();

        let pmremGenerator = new THREE.PMREMGenerator(this.#renderer);
        pmremGenerator.compileEquirectangularShader();

        let neutralEnvironment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.#scene.environment = neutralEnvironment;

        // Add the BVH optimized raycast function from three-mesh-bvh.module.js
        // Assumes the BVH is available on the `boundsTree` variable
        THREE.Mesh.prototype.raycast = acceleratedRaycast;
        this.#raycaster = new THREE.Raycaster();

        this.#tools = new ToolManager(this);
    }
    
    /**
     * use this helper function to update the camera matrix using the camera matrix from the sceneGraph
     */
    #setupLighting() {
        // This doesn't seem to work with the area target model material, but adding it for everything else
        let ambLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.#globalScale.getNode().add(ambLight);

        // attempts to light the scene evenly with directional lights from each side, but mostly from the top
        let dirLightTopDown = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLightTopDown.position.set(0, 1, 0); // top-down
        dirLightTopDown.lookAt(0, 0, 0);
        this.#globalScale.getNode().add(dirLightTopDown);
    }

    /**
     * 
     * @param {Camera|AnchoredGroup|THREE.Object3D} obj 
     */
    add(obj) {
        if (obj instanceof Camera) {
            if (this.#camera) {
                this.#scene.remove(this.#camera.getInternalObject());
            }
            this.#scene.add(obj.getInternalObject());
        } else if (obj instanceof AnchoredGroup) {
            this.#globalScale.getNode().add(obj.getInternalObject());
        } else if (obj instanceof THREE.Object3D) {
            this.#globalScale.getNode().add(obj)
        }
    }

    /**
     * 
     * @param {string} toolId 
     */
    addTool(toolId) {
        this.#tools.add(toolId);
    }

    /**
     * 
     * @param {string} toolId 
     */
    removeTool(toolId) {
        this.#tools.remove(toolId);
    }

    /**
     * 
     * @param {AnchoredGroup} anchoredGroup 
     */
    setAnchoredGroupForTools(anchoredGroup) {
        this.#tools.setAnchoredGroup(anchoredGroup);
    }

    /**
     * 
     * @returns {boolean}
     */
    isInWebXRMode() {
        return this.webXRAvailable() && this.#renderer.xr.isPresenting;
    }

    webXRAvailable() {
        return this.#renderer.xr && this.#renderer.xr.enabled === true;
    }

    /**
     * 
     * @param {Camera} camera 
     */
    setCamera(camera) {
        this.#camera = camera;
    }

    render() {
        this.#renderer.render(this.#scene, this.#camera.getInternalObject());
    }

    /**
     * 
     * @param {THREE.WebGLRenderTarget} renderTexture 
     * @param {THREE.Scene} customScene
     */
    renderToTexture(renderTexture) {
        this.#renderer.setRenderTarget(renderTexture);
        this.#renderer.render(this.#scene, this.#camera.getInternalObject());
        this.#renderer.setRenderTarget(null);
    }

    /**
     * 
     * @param {() => void} func 
     */
    setAnimationLoop(func) {
        this.#renderer.setAnimationLoop(func);
    }

    /**
     * 
     * @param {string} name 
     * @returns {THREE.Object3D|undefined}
     */
    getObjectByName(name) {
        return this.#globalScale.getNode().getObjectByName(name);
    }
    
    /**
     * return all objects with the name
     * @param {string} name 
     * @returns {THREE.Object3D[]}
     */
    getObjectsByName(name) {
        if (name === undefined) return;
        /** @type {THREE.Object3D[]} */
        const objects = [];
        this.#globalScale.getNode().traverse((object) => {
            if (object.name === name) objects.push(object);
        })
        return objects;
    }

    /**
     * this module exports this utility so that other modules can perform hit tests
     * objectsToCheck defaults to scene.children (all objects in the scene) if unspecified
     * NOTE: returns the coordinates in threejs scene world coordinates:
     *       may need to call objectToCheck.worldToLocal(results[0].point) to get the result in the right system
     * @param {pixels} clientX - screen coordinate left to right
     * @param {pixels} clientY - screen coordinate top to bottom
     * @param {THREE.Object3D[]} objectsToCheck
     * @returns {Intersection[]}
     */
    getRaycastIntersects(clientX, clientY, objectsToCheck) {
        let mouse = new THREE.Vector2();
        mouse.x = ( clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( clientY / window.innerHeight ) * 2 + 1;

        //2. set the picking ray from the camera position and mouse coordinates
        this.#raycaster.setFromCamera( mouse, this.#camera.getInternalObject() );

        this.#raycaster.firstHitOnly = true; // faster (using three-mesh-bvh)

        //3. compute intersections
        // add object layer to raycast layer mask
        objectsToCheck.forEach(obj => {
            this.#raycaster.layers.mask = this.#raycaster.layers.mask | obj.layers.mask;
        });
        let results = this.#raycaster.intersectObjects( objectsToCheck || this.#globalScale.getNode().children, true );
        results.forEach(intersection => {
            intersection.rayDirection = this.#raycaster.ray.direction;
            intersection.scenePoint = intersection.point.clone();
            intersection.scenePoint.multiplyScalar(this.#globalScale.getInvGlobalScale());
            intersection.sceneDistance = intersection.distance / this.#globalScale.getGlobalScale();
        });
        return results;
    }

    /**
     * 
     * @returns {THREE.Renderer}
     */
    getInternalRenderer() {
        return this.#renderer;
    }

    /**
     * 
     * @returns {Camera}
     */
    getCamera() {
        return this.#camera;
    }

    /**
     * @returns {GlobalScale}
     */
    getGlobalScale() {
        return this.#globalScale;
    }

    /**
     * 
     * @returns {THREE.Scene}
     */
    getInternalScene() {
        return this.#scene;
    }

    /**
     * 
     * @returns {HTMLCanvasElement}
     */
    getInternalCanvas() {
        return this.#renderer.domElement;
    }
}

export { Renderer, GlobalScale };
