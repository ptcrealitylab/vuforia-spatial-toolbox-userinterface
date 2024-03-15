import * as THREE from "../../../thirdPartyCode/three/three.module.js"

/**
 * @typedef {number[]} MatrixAsArray - a 4x4 matrix representated as an column-mayor array of 16 numbers 
 */

/**
 * Basic camera class
 */
class Camera {
    #camera;

    /**
     * 
     * @param {string} name 
     * @param {number} aspectRatio 
     */
    constructor(name, aspectRatio) {
        // setup an initial configuration fro the camera, both camera matrix and projection matrix will be calculated externaly and applied to this camera
        this.#camera = new THREE.PerspectiveCamera(70, aspectRatio, 1, 1000);
        // do not recalculate matrices, we will set them our selves
        this.#camera.matrixAutoUpdate = false;
        this.#camera.name = name;
    }

    /**
     * 
     * @param {MatrixAsArray} matrix 
     */
    setProjectionMatrixFromArray(matrix) {
        Camera.setMatrixFromArray(this.#camera.projectionMatrix, matrix);
        this.#camera.projectionMatrixInverse.copy(this.#camera.projectionMatrix).invert();
    }

    /**
     * 
     * @param {MatrixAsArray} matrix 
     */
    setCameraMatrixFromArray(matrix) {
        Camera.setMatrixFromArray(this.#camera.matrix, matrix);
        this.#camera.updateMatrixWorld(true);
    }

    /**
     * 
     * @param {THREE.Object3D} object 
     */
    attach(object) {
        this.#camera.attach(object);
    }

    /**
     * 
     * @param {THREE.Object3D} object 
     */
    add(object) {
        this.#camera.add(object);
    }

    /**
     * source: https://github.com/mrdoob/three.js/issues/78
     * @param {THREE.Vector3} meshPosition
     */ 
    getScreenXY = function(meshPosition) {
        let pos = meshPosition.clone();
        let projScreenMat = new THREE.Matrix4();
        projScreenMat.multiplyMatrices(this.#camera.projectionMatrix, this.#camera.matrixWorldInverse);
        pos.applyMatrix4(projScreenMat);
        
        // check if the position is behind the camera, if so, manually flip the screen position, b/c the screen position somehow is inverted when behind the camera
        let meshPosWrtCamera = meshPosition.clone();
        meshPosWrtCamera.applyMatrix4(this.#camera.matrixWorldInverse);
        if (meshPosWrtCamera.z > 0) {
            pos.negate();
        }

        return {
            x: ( pos.x + 1 ) * window.innerWidth / 2,
            y: ( -pos.y + 1) * window.innerHeight / 2
        };
    };

    /**
     * source: https://stackoverflow.com/questions/29758233/three-js-check-if-object-is-still-in-view-of-the-camera
     * @param {THREE.Vector3} pointPosition
     */ 
    isPointOnScreen = function(pointPosition) {
        let frustum = new THREE.Frustum();
        let matrix = new THREE.Matrix4();
        matrix.multiplyMatrices(this.#camera.projectionMatrix, this.#camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);
        if (frustum.containsPoint(pointPosition)) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * @param {THREE.Vector3}
     * @returns {THREE.Vector3}
     */
    getWorldDirection(cameraDirection) {
        return this.#camera.getWorldDirection(cameraDirection);
    }

    /**
     * 
     * @param {THREE.Vector3} cameraPosition 
     * @returns {THREE.Vector3}
     */
    getWorldPosition(cameraPosition) {
        return this.#camera.getWorldPosition(cameraPosition);
    }

    getNear() {
        return this.#camera.near;
    }

    getFar() {
        return this.#camera.far;
    }

    /**
     * 
     * @returns {THREE.Camera}
     */
    getInternalObject() {
        return this.#camera;
    }

    /**
      * small helper function for setting three.js matrices from the custom format we use
      * @param {THREE.Matrix} matrix
      * @param {MatrixAsArray} array
      */
    static setMatrixFromArray(matrix, array) {
        matrix.set( array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }
}

export default Camera;
