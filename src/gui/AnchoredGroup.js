import * as THREE from '../../thirdPartyCode/three/three.module.js';

class AnchoredGroup {
    constructor() {
        /** @type {THREE.Group} */
        this.threejsContainerObj = new THREE.Group();
        this.threejsContainerObj.matrixAutoUpdate = false; // this is needed to position it directly with matrices
    }

    /**
     * 
     * @param {THREE.Object3D} obj 
     */
    add(obj) {
        this.threejsContainerObj.add(obj);
    }

    /**
     * 
     * @param {THREE.Object3D} obj 
     */
    attach(obj) {
        this.threejsContainerObj.attach(obj);
    }

    /**
     * 
     * @param {THREE.Object3D} obj 
     */
    remove(obj) {
        this.threejsContainerObj.remove(obj);
    }

    /**
     * 
     * @param {Float32Array} matrix 
     */
    setMatrix(matrix) {
        this.setMatrixFromArray(this.threejsContainerObj.matrix, matrix);
    }

    /**
     * 
     * @returns {THREE.Group}
     */
    getInternalObject() {
        return this.threejsContainerObj;
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

export { AnchoredGroup }
