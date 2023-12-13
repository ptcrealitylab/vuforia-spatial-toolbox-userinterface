import * as THREE from '../../thirdPartyCode/three/three.module.js';

class Camera3D {
    /**
     * creates a default camera
     * @param {width: PixelCount} width initial width
     * @param {height: PixelCount} height initial height
     */
    constructor(width, height) {
        /**
         * Construct a default camera, the camera and projectionMatrices will be updated
         * @type {THREE.Camera}
         */
        this.camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
        this.camera.matrixAutoUpdate = false;
        /**
         * when the camera matrix changes these functions will be called
         * @type {[function(Float32Array):void]}
         */
        this.cameraMatrixListeners = [];
        /**
         * @type {boolean}
         */
        this.projectionMatrixSet = false;
    }

    /**
     * 
     * @returns wether the camera is ready to be used
     */
    isInitialized() {
        return this.projectionMatrixSet;
    }

    /**
     * 
     * @param {PixelCount} _width 
     * @param {PixelCount} _height 
     */
    setSize(_width, _height) {
        // don't change the width or height set by the projection matrix
    }

    /**
     * 
     * @param {function(Float32Array):void} func 
     */
    addCameraMatrixListener(func) {
        this.cameraMatrixListeners.push(func);
    }

    /**
     * 
     * @param {Float32Array} matrix 
     */
    setCameraMatrix(matrix) {
        this.setMatrixFromArray(this.camera.matrix, matrix);
        this.camera.updateMatrixWorld(true);
        for (const func of this.cameraMatrixListeners) {
            func(matrix);
        }
    }

    /**
     * 
     * @param {Float32Array} matrix 
     */
    setProjectionMatrix(matrix) {
        this.setMatrixFromArray(this.camera.projectionMatrix, matrix);
        this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
        this.projectionMatrixSet = true;
    }

    /**
     * 
     * @param {THREE.Object3D} obj 
     */
    add(obj) {
        this.camera.add(obj);
    }

    /**
     * 
     * @param {THREE.Object3D} obj 
     */
    attach(obj) {
        this.camera.attach(obj);
    }

    /**
     * Used to attach the threejs camera to the scene
     * @returns {THREE.PerspectiveCamera}
     */
    getInternalObject() {
        return this.camera;
    }

    /**
     * copies the world direction into target
     * @param {THREE.Vector3} target 
     */
    getWorldDirection(target) {
        this.camera.getWorldDirection(target);
    }

    /**
     * small helper function for setting three.js matrices from the custom format we use
     * @param {THREE.Matrix} matrix
     * @param {Float32Array} array
     */ 
    setMatrixFromArray(matrix, array) {
        matrix.set( array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }
}

export { Camera3D }
