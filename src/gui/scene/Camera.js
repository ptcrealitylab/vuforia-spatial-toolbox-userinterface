import * as THREE from "../../../thirdPartyCode/three/three.module.js"
import {setMatrixFromArray} from "./utils.js"

/**
 * @typedef {{x: number, y: number}} Coordinate
 */

class LayerConfig {
    static LAYER_DEFAULT = 0;
    static LAYER_LEFT_EYE = 1; 
    static LAYER_RIGHT_EYE = 2; 
    static LAYER_SCAN = 3;
    static LAYER_BACKGROUND = 4;

    #global = new THREE.Layers();
    #left = new THREE.Layers();
    #right = new THREE.Layers();

    constructor(global, left = global, right = global) {
        this.#global = global;
        this.#left = left;
        this.#right = right;
    }

    configurCamera(camera) {
        camera.layers.mask = this.#global.mask;
        if (camera instanceof THREE.ArrayCamera) {
            camera.cameras[0].layers.mask = this.#left.mask;
            camera.cameras[1].layers.mask = this.#right.mask;
        }
    } 

    static createFromCamera(camera) {
        const global = new THREE.Layers();
        global.mask = camera.layers.mask;
        if (camera instanceof THREE.ArrayCamera) {
            const left = new THREE.Layers();
            left.mask = camera.cameras[0].layers.mask;
            const right = new THREE.Layers();
            right.mask = camera.cameras[1].layers.mask;
            return new LayerConfig(global, left, right);
        }
        return new LayerConfig(global);
    }

    clone() {
        const global = new THREE.Layers();
        global.mask = this.#global.mask;
        const left = new THREE.Layers();
        left.mask = this.#left.mask;
        const right = new THREE.Layers();
        right.mask = this.#right.mask;
        return new LayerConfig(global, left, right);
    }

    setGlobal(layer) {
        this.#global.set(layer);
        this.#left.set(layer);
        this.#right.set(layer);
    }
}

class Camera {
    /**
     * @type {THREE.PerspectiveCamera}
     */
    _camera;

    constructor(camera) {
        this._camera = camera;
    }

    /**
     * 
     * @param {MatrixAsArray} _ 
     */
    setProjectionMatrixFromArray(_) {}

    /**
     * 
     * @param {MatrixAsArray} _ 
     */
    setCameraMatrixFromArray(_) {}

    /**
     *
     * @param {THREE.Object3D} object 
     */
    attach(object) {
        this._camera.attach(object);
    }

    /**
     *
     * @param {THREE.Object3D} object 
     */
    add(object) {
        this._camera.add(object);
    }

    /**
     * source: https://github.com/mrdoob/three.js/issues/78
     * @override
     * @param {THREE.Vector3} meshPosition
     * @returns {Coordinate}
     */ 
    getScreenXY(meshPosition) {
        let pos = meshPosition.clone();
        let projScreenMat = new THREE.Matrix4();
        projScreenMat.multiplyMatrices(this._camera.projectionMatrix, this._camera.matrixWorldInverse);
        pos.applyMatrix4(projScreenMat);
        
        // check if the position is behind the camera, if so, manually flip the screen position, b/c the screen position somehow is inverted when behind the camera
        let meshPosWrtCamera = meshPosition.clone();
        meshPosWrtCamera.applyMatrix4(this._camera.matrixWorldInverse);
        if (meshPosWrtCamera.z > 0) {
            pos.negate();
        }

        return {
            x: ( pos.x + 1 ) * window.innerWidth / 2,
            y: ( -pos.y + 1) * window.innerHeight / 2
        };
    }

    /**
     * source: https://stackoverflow.com/questions/29758233/three-js-check-if-object-is-still-in-view-of-the-camera
     * @override
     * @param {THREE.Vector3} pointPosition
     * @returns {boolean}
     */ 
    isPointOnScreen(pointPosition) {
        let frustum = new THREE.Frustum();
        let matrix = new THREE.Matrix4();
        matrix.multiplyMatrices(this._camera.projectionMatrix, this._camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);
        if (frustum.containsPoint(pointPosition)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @override
     * @param {THREE.Vector3}
     * @returns {THREE.Vector3}
     */
    getWorldDirection(cameraDirection) {
        return this._camera.getWorldDirection(cameraDirection);
    }

    /**
     * @override
     * @param {THREE.Vector3} cameraPosition
     * @returns {THREE.Vector3}
     */
    getWorldPosition(cameraPosition) {
        return this._camera.getWorldPosition(cameraPosition);
    }

    /**
     * @inheritdoc
     */
    getNear() {
        return this._camera.near;
    }

    /**
     * @inheritdoc
     */
    getFar() {
        return this._camera.far;
    }

    /**
     * 
     * @returns {LayerConfig}
     */
    getLayerConfig() {
        return LayerConfig.createFromCamera(this._camera);
    }

    /**
     * 
     * @param {LayerConfig} layerConfig 
     */
    setLayerConfig(layerConfig) {
        layerConfig.configurCamera(this._camera);
    }

    /**
     * @inheritdoc
     */
    getInternalObject() {
        return this._camera;
    }
}

/**
 * Default camera class
 */
class DefaultCamera extends Camera {

    /**
     * 
     * @param {string} name 
     * @param {number} aspectRatio 
     */
    constructor(name, aspectRatio) {
        // setup an initial configuration fro the camera, both camera matrix and projection matrix will be calculated externaly and applied to this camera 
        const camera = new THREE.PerspectiveCamera(70, aspectRatio, 1, 1000); 
        // do not recalculate matrices, we will set them our selves
        camera.matrixAutoUpdate = false;
        camera.name = name;
        camera.layers.enable(LayerConfig.LAYER_SCAN);
        camera.layers.enable(LayerConfig.LAYER_BACKGROUND);
        super(camera);
    }

    /**
     * @override
     * @param {MatrixAsArray} matrix 
     */
    setProjectionMatrixFromArray(matrix) {
        setMatrixFromArray(this._camera.projectionMatrix, matrix);
        this._camera.projectionMatrixInverse.copy(this._camera.projectionMatrix).invert();
    }

    /**
     * @override
     * @param {MatrixAsArray} matrix 
     */
    setCameraMatrixFromArray(matrix) {
        setMatrixFromArray(this._camera.matrix, matrix);
        this._camera.updateMatrixWorld(true);
    }
}

class XRCamera extends Camera {

    constructor(name, renderer) {
        /** @type {THREE.ArrayCamera} */
        const camera = renderer.xr.getCamera();
        camera.layers.enable(LayerConfig.LAYER_SCAN);
        camera.layers.enable(LayerConfig.LAYER_BACKGROUND);
        for (const cameraEntry of camera.cameras) {
            cameraEntry.layers.enable(LayerConfig.LAYER_SCAN);
            cameraEntry.layers.enable(LayerConfig.LAYER_BACKGROUND);
        }
        camera.name = name;
        super(camera);
    }
}

export {Camera, DefaultCamera, XRCamera, LayerConfig};
