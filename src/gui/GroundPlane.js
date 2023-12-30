import * as THREE from '../../thirdPartyCode/three/three.module.js';

/** 
 * @typedef {number} MiliMeters 
*/

class GroundPlane {
    /**
     * 
     * @param { MiliMeters } size 
     */
    constructor(size) {
        /** @type {THREE.PlaneGeometry} */
        const geometry = new THREE.PlaneGeometry( size, size );
        /** @type {THREE.MeshBasicMaterial} */
        const material = new THREE.MeshBasicMaterial( {color: 0x88ffff, side: THREE.DoubleSide} );
        /** @type {THREE.Mesh} */
        this.plane = new THREE.Mesh( geometry, material );
        this.plane.rotateX(Math.PI/2);
        this.plane.visible = false;
        this.plane.name = 'groundPlaneCollider';
    }

    /**
     * 
     * @param {boolean} updateParents 
     * @param {boolean} updateChildren 
     */
    updateWorldMatrix(updateParents, updateChildren) {
        this.plane.updateWorldMatrix(updateParents, updateChildren);
    }

    /**
     * 
     * @returns {THREE.Mesh}
     */
    getInternalObject() {
        return this.plane;
    }
}

export {GroundPlane}
