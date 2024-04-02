/**
 * @typedef {number[]} MatrixAsArray - a 4x4 matrix representated as an column-mayor array of 16 numbers 
 */

/**
 * small helper function for setting three.js matrices from the custom format we use
 * @param {import('../../../thirdPartyCode/three/three.module.js').Matrix} matrix
 * @param {MatrixAsArray} array
 */
function setMatrixFromArray(matrix, array) {
    matrix.set( array[0], array[4], array[8], array[12],
        array[1], array[5], array[9], array[13],
        array[2], array[6], array[10], array[14],
        array[3], array[7], array[11], array[15]
    );
}

export { setMatrixFromArray }
