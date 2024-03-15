import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import { RoomEnvironment } from '../../../thirdPartyCode/three/RoomEnvironment.module.js';
import { acceleratedRaycast } from '../../../thirdPartyCode/three-mesh-bvh.module.js';
import Camera from './Camera.js'
import AnchoredGroup from './AnchoredGroup.js'

class Renderer {
    /** @type {THREE.WebGLRenderer} */
    #renderer

    /** @type {Camera} */
    #camera

    /** @type {THREE.Scene} */
    #scene

    /** @type {THREE.Raycaster} */
    #raycaster
    

    /**
     * 
     * @param {HTMLCanvasElement} domElement 
     */
    constructor(domElement) {
        this.#renderer = new THREE.WebGLRenderer({canvas: domElement, alpha: true, antialias: false});
        this.#renderer.setPixelRatio(window.devicePixelRatio);
        this.#renderer.setSize(window.innerWidth, window.innerHeight);
        this.#renderer.outputEncoding = THREE.sRGBEncoding;
        this.#renderer.autoClear = false;

        this.#scene = new THREE.Scene();

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
    }
    
    /**
     * use this helper function to update the camera matrix using the camera matrix from the sceneGraph
     */
    #setupLighting() {
        // This doesn't seem to work with the area target model material, but adding it for everything else
        let ambLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.#scene.add(ambLight);

        // attempts to light the scene evenly with directional lights from each side, but mostly from the top
        let dirLightTopDown = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLightTopDown.position.set(0, 1, 0); // top-down
        dirLightTopDown.lookAt(0, 0, 0);
        this.#scene.add(dirLightTopDown);

        // let dirLightXLeft = new THREE.DirectionalLight(0xffffff, 0.5);
        // dirLightXLeft.position.set(1, 0, 0);
        // scene.add(dirLightXLeft);

        // let dirLightXRight = new THREE.DirectionalLight(0xffffff, 0.5);
        // dirLightXRight.position.set(-1, 0, 0);
        // scene.add(dirLightXRight);

        // let dirLightZLeft = new THREE.DirectionalLight(0xffffff, 0.5);
        // dirLightZLeft.position.set(0, 0, 1);
        // scene.add(dirLightZLeft);

        // let dirLightZRight = new THREE.DirectionalLight(0xffffff, 0.5);
        // dirLightZRight.position.set(0, 0, -1);
        // scene.add(dirLightZRight);
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
            this.#camera = obj;
        } else if (obj instanceof AnchoredGroup) {
            this.#scene.add(obj.getInternalObject());
        } else if (obj instanceof THREE.Object3D) {
            this.#scene.add(obj)
        }
    }

    render() {
        this.#renderer.render(this.#scene, this.#camera.getInternalObject());
    }

    /**
     * 
     * @param {string} name 
     */
    getObjectByName(name) {
        return this.#scene.getObjectByName(name);
    }
    
    /**
     * return all objects with the name
     * @param {string} name 
     * @returns 
     */
    getObjectsByName(name) {
        if (name === undefined) return;
        const objects = [];
        this.#scene.traverse((object) => {
            if (object.name === name) objects.push(object);
        })
        return objects;
    }

    // this module exports this utility so that other modules can perform hit tests
    // objectsToCheck defaults to scene.children (all objects in the scene) if unspecified
    // NOTE: returns the coordinates in threejs scene world coordinates:
    //       may need to call objectToCheck.worldToLocal(results[0].point) to get the result in the right system
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
        let results = this.#raycaster.intersectObjects( objectsToCheck || this.#scene.children, true );
        results.forEach(intersection => {
            intersection.rayDirection = this.#raycaster.ray.direction;
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
     * 
     * @returns {THREE.Scene}
     */
    getInternalScene() {
        return this.#scene;
    }

    getInternalCanvas() {
        return this.#renderer.domElement;
    }
}

export default Renderer;
