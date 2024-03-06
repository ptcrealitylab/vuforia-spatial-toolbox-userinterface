import * as THREE from "../../../thirdPartyCode/three/three.module.js"

/**
 * @typedef {number[]} MatrixAsArray - a 4x4 matrix representated as an column-mayor array of 16 numbers 
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
