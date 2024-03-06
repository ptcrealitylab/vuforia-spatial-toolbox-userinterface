import * as THREE from "../../../thirdPartyCode/three/three.module.js"

/**
 * @typedef {number[]} MatrixAsArray - a 4x4 matrix representated as an column-mayor array of 16 numbers 
 */

class AnchoredGroup {
    /**
     * @type {THREE.Group}
     */
    #group;

    /**
     * 
     * @param {string} name 
     */
    constructor(name) {
        this.#group = new THREE.Group();
        this.#group.matrixAutoUpdate = false; // this is needed to position it directly with matrices
        this.#group.name = name;
    }

    /**
     * 
     * @param {MatrixAsArray} array 
     */
    setMatrixFromArray(array) {
        AnchoredGroup.setMatrixFromArray(this.#group.matrix, array)
    }

    /**
     * 
     * @param {THREE.Object3D} object 
     */
    attach(object) {
        this.#group.attach(object);
    }

    /**
     * 
     * @param {THREE.Object3D} object 
     */
    add(object) {
        this.#group.add(object);
    }

    /**
     * 
     * @param {THREE.Object3D} object 
     */
    remove(object) {
        this.#group.remove(object);
    }

    /**
     * 
     * @returns {THREE.Group}
     */
    getInternalObject() {
        return this.#group;
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

export default AnchoredGroup;
