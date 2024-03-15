import * as THREE from "../../../thirdPartyCode/three/three.module.js"

/**
 * @typedef {number} Milimeters
 */

/**
 * Ground plane occlusion object, evrything placed on the ground should be attached to this
 */
class GroundPlane {
    /** @type {THREE.Mesh} */
    #plane;

    /**
     * 
     * @param {Milimeters} size 
     */
    constructor(size) {
        const geometry = new THREE.PlaneGeometry(size, size);
        geometry.rotateX(Math.PI / 2); // directly set the geometry's rotation to get the desired visual rotation & raycast direction. Otherwise setting mesh's rotation & run updateWorldMatrix(true, false) looks correct, but has wrong raycast direction
        const material = new THREE.MeshBasicMaterial({color: 0x88ffff, side: THREE.DoubleSide, wireframe: true});
        this.#plane = new THREE.Mesh(geometry, material);
        // plane.rotateX(Math.PI/2);
        this.#plane.visible = false;
        // plane.position.set(0, -10, 0); // todo Steve: figure out a way to raycast on mesh first & if no results, raycast on ground plane next. Figure out a way to do it in one go (possibly using depth tests & stuff), instead of using 2 raycasts, to improve performance
        this.#plane.name = 'groundPlaneCollider';
    }

    tryUpdatingGroundPlanePosition(areaTargetMesh, areaTargetNavmesh) {
        this.#plane.remove(this.#plane);
        areaTargetMesh.add(this.#plane);
        let areaTargetMeshScale = Math.max(areaTargetMesh.matrixWorld.elements[0], areaTargetMesh.matrixWorld.elements[5], areaTargetMesh.matrixWorld.elements[10]);
        let floorOffset = (areaTargetNavmesh.floorOffset * 1000) / areaTargetMeshScale;
        this.#plane.position.set(0, floorOffset, 0);
        this.#plane.updateMatrix();
        this.#plane.updateWorldMatrix(true);
        console.log(this.#plane.matrixWorld);

         // update the groundPlane sceneNode to match the position of the new groundplane collider
         let groundPlaneRelativeOrigin = areaTargetMesh.localToWorld(this.#plane.position.clone());
         let groundPlaneRelativeMatrix = new THREE.Matrix4().setPosition(groundPlaneRelativeOrigin); //.copyPosition(groundPlaneRelativeOrigin);
         realityEditor.sceneGraph.setGroundPlanePosition(groundPlaneRelativeMatrix.elements);
    }

    /**
     * 
     * @param {boolean} updateParents 
     * @param {boolean} updateChildren 
     */
    updateWorldMatrix(updateParents, updateChildren) {
        this.#plane.updateWorldMatrix(updateParents, updateChildren);
    }

    /**
     * this function is used to connect the groundplane to the three.js scene
     * @returns {THREE.Mesh}
     */
    getInternalObject() {
        return this.#plane;
    }
}

export default GroundPlane;
