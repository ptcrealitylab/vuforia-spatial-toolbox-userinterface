import * as THREE from '../../../thirdPartyCode/three/three.module.js';

/**
 * @typedef {import("/objectDefaultFiles/scene/BaseNode.js").default} BaseNode
 * @typedef {number[]} MatrixAsArray - a 4x4 matrix representated as an column-mayor array of 16 numbers 
 */

/**
 * small helper function for setting three.js matrices from the custom format we use
 * @param {THREE.Matrix4} matrix
 * @param {MatrixAsArray} array
 */
function setMatrixFromArray(matrix, array) {
    matrix.set( array[0], array[4], array[8], array[12],
        array[1], array[5], array[9], array[13],
        array[2], array[6], array[10], array[14],
        array[3], array[7], array[11], array[15]
    );
}

function decomposeMatrix(matrix) {
    const threeMatrix = new THREE.Matrix4();
    setMatrixFromArray(threeMatrix, matrix);
    const ret = {
        position: new THREE.Vector3(),
        rotation: new THREE.Quaternion(),
        scale: new THREE.Vector3()
    }
    threeMatrix.decompose(ret.position, ret.rotation, ret.scale);
    return ret;
}

/**
 * 
 * @param {BaseNode} node 
 * @returns {BaseNode}
 */
function getRoot(node) {
    if (node.getParent()) {
        return getRoot(node.getParent());
    } else {
        return node;
    }
}

export { setMatrixFromArray, decomposeMatrix, getRoot }
