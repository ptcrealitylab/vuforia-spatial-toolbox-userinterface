import * as THREE from "../../../thirdPartyCode/three/three.module.js"
import {setMatrixFromArray} from "./utils.js"

/**
 * @typedef {import("./utils.js").MatrixAsArray} MatrixAsArray
 */

/**
 * the tracked environment, everything placed in the environment should be attached to this
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
        setMatrixFromArray(this.#group.matrix, array)
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
}

export default AnchoredGroup;
