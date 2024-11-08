/** iPhoneVerticalFOV, projectionMatrixFrom(), makePerspective() come from desktopAdapter in remote operator addon. */

export const iPhoneVerticalFOV = 41.22673; // https://discussions.apple.com/thread/250970597

/**
 * Builds a projection matrix from field of view, aspect ratio, and near and far planes
 */
export function projectionMatrixFrom(vFOV, aspect, near, far) {
    var top = near * Math.tan((Math.PI / 180) * 0.5 * vFOV );
    var height = 2 * top;
    var width = aspect * height;
    var left = -0.5 * width;
    // return makePerspective( left, left + width, top, top - height, near, far );

    // conversion to the convention used in GS rendering here
    let mat = makePerspective( left, left + width, top, top - height, near, far );

    // flip y and z axes
    mat[4] *= -1; mat[5] *= -1; mat[6] *= -1; mat[7] *= -1;
    mat[8] *= -1; mat[9] *= -1; mat[10] *= -1; mat[11] *= -1;
    // mm to meter units
    mat[14] *= 0.001;

    return mat;
}

/**
 * Helper function for creating a projection matrix
 */
export function makePerspective ( left, right, top, bottom, near, far ) {

    var te = [];
    var x = 2 * near / ( right - left );
    var y = 2 * near / ( top - bottom );

    var a = ( right + left ) / ( right - left );
    var b = ( top + bottom ) / ( top - bottom );
    var c = - ( far + near ) / ( far - near );
    var d = - 2 * far * near / ( far - near );

    te[ 0 ] = x;    te[ 4 ] = 0;    te[ 8 ] = a;    te[ 12 ] = 0;
    te[ 1 ] = 0;    te[ 5 ] = y;    te[ 9 ] = b;    te[ 13] = 0;
    te[ 2 ] = 0;    te[ 6 ] = 0;    te[ 10 ] = c;   te[ 14 ] = d;
    te[ 3 ] = 0;    te[ 7 ] = 0;    te[ 11 ] = - 1; te[ 15 ] = 0;

    return te;

}

/** Original calculation of projection and view matrices (left for reference) */
/* 
function getProjectionMatrix(fx, fy, width, height) {
    const znear = 0.2;
    const zfar = 200;
    return [
        [(2 * fx) / width, 0, 0, 0],
        [0, -(2 * fy) / height, 0, 0],
        [0, 0, zfar / (zfar - znear), 1],
        [0, 0, -(zfar * znear) / (zfar - znear), 0],
    ].flat();
}

function getViewMatrix(camera) {
    const R = camera.rotation.flat();
    const t = camera.position;
    const camToWorld = [
        [R[0], R[1], R[2], 0],
        [R[3], R[4], R[5], 0],
        [R[6], R[7], R[8], 0],
        [
            -t[0] * R[0] - t[1] * R[3] - t[2] * R[6],
            -t[0] * R[1] - t[1] * R[4] - t[2] * R[7],
            -t[0] * R[2] - t[1] * R[5] - t[2] * R[8],
            1,
        ],
    ].flat();
    return camToWorld;
}
*/


/** Multiplication (a * b) of matrices stored column-by-column */
export function multiply4(a, b) {
    return [
        b[0] * a[0] + b[1] * a[4] + b[2] * a[8] + b[3] * a[12],
        b[0] * a[1] + b[1] * a[5] + b[2] * a[9] + b[3] * a[13],
        b[0] * a[2] + b[1] * a[6] + b[2] * a[10] + b[3] * a[14],
        b[0] * a[3] + b[1] * a[7] + b[2] * a[11] + b[3] * a[15],
        b[4] * a[0] + b[5] * a[4] + b[6] * a[8] + b[7] * a[12],
        b[4] * a[1] + b[5] * a[5] + b[6] * a[9] + b[7] * a[13],
        b[4] * a[2] + b[5] * a[6] + b[6] * a[10] + b[7] * a[14],
        b[4] * a[3] + b[5] * a[7] + b[6] * a[11] + b[7] * a[15],
        b[8] * a[0] + b[9] * a[4] + b[10] * a[8] + b[11] * a[12],
        b[8] * a[1] + b[9] * a[5] + b[10] * a[9] + b[11] * a[13],
        b[8] * a[2] + b[9] * a[6] + b[10] * a[10] + b[11] * a[14],
        b[8] * a[3] + b[9] * a[7] + b[10] * a[11] + b[11] * a[15],
        b[12] * a[0] + b[13] * a[4] + b[14] * a[8] + b[15] * a[12],
        b[12] * a[1] + b[13] * a[5] + b[14] * a[9] + b[15] * a[13],
        b[12] * a[2] + b[13] * a[6] + b[14] * a[10] + b[15] * a[14],
        b[12] * a[3] + b[13] * a[7] + b[14] * a[11] + b[15] * a[15],
    ];
}

export function multiply4v(m, v) {
    return [
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]* v[3],
        m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3]
    ]
}

export function multiply3v(m, v) {
    return [
        m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
        m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
        m[2] * v[0] + m[5] * v[1] + m[8] * v[2]
    ]
}

export function quaternionToRotationMatrix(q) {
    let l = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    let x = -q[0] / l; // same as shader, need conjugate to work properly
    let y = -q[1] / l;
    let z = -q[2] / l;
    let w = q[3] / l;
    return [
        1. - 2.*y*y - 2.*z*z, 2.*x*y - 2.*w*z, 2.*x*z + 2.*w*y,
        2.*x*y + 2.*w*z, 1. - 2.*x*x - 2.*z*z, 2.*y*z - 2.*w*x,
        2.*x*z - 2.*w*y, 2.*y*z + 2.*w*x, 1. - 2.*x*x - 2.*y*y
    ]
}

export function invert4(a) {
    let b00 = a[0] * a[5] - a[1] * a[4];
    let b01 = a[0] * a[6] - a[2] * a[4];
    let b02 = a[0] * a[7] - a[3] * a[4];
    let b03 = a[1] * a[6] - a[2] * a[5];
    let b04 = a[1] * a[7] - a[3] * a[5];
    let b05 = a[2] * a[7] - a[3] * a[6];
    let b06 = a[8] * a[13] - a[9] * a[12];
    let b07 = a[8] * a[14] - a[10] * a[12];
    let b08 = a[8] * a[15] - a[11] * a[12];
    let b09 = a[9] * a[14] - a[10] * a[13];
    let b10 = a[9] * a[15] - a[11] * a[13];
    let b11 = a[10] * a[15] - a[11] * a[14];
    let det =
        b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    return [
        (a[5] * b11 - a[6] * b10 + a[7] * b09) / det,
        (a[2] * b10 - a[1] * b11 - a[3] * b09) / det,
        (a[13] * b05 - a[14] * b04 + a[15] * b03) / det,
        (a[10] * b04 - a[9] * b05 - a[11] * b03) / det,
        (a[6] * b08 - a[4] * b11 - a[7] * b07) / det,
        (a[0] * b11 - a[2] * b08 + a[3] * b07) / det,
        (a[14] * b02 - a[12] * b05 - a[15] * b01) / det,
        (a[8] * b05 - a[10] * b02 + a[11] * b01) / det,
        (a[4] * b10 - a[5] * b08 + a[7] * b06) / det,
        (a[1] * b08 - a[0] * b10 - a[3] * b06) / det,
        (a[12] * b04 - a[13] * b02 + a[15] * b00) / det,
        (a[9] * b02 - a[8] * b04 - a[11] * b00) / det,
        (a[5] * b07 - a[4] * b09 - a[6] * b06) / det,
        (a[0] * b09 - a[1] * b07 + a[2] * b06) / det,
        (a[13] * b01 - a[12] * b03 - a[14] * b00) / det,
        (a[8] * b03 - a[9] * b01 + a[10] * b00) / det,
    ];
}

export function ApplyTransMatrix(sourceMatrix, transMatrix, scaleF)
{
    let resultMatrix = new Array(16).fill(0);

    for(let row = 0; row < 4; row++) {
        for(let col = 0; col < 4; col++) {
            let sum = 0; // Initialize sum for each element
            for(let k = 0; k < 4; k++) {
                sum += sourceMatrix[row * 4 + k] * transMatrix[k * 4 + col];
            }
            resultMatrix[row * 4 + col] = sum; // Assign the calculated value
        }
    }
    resultMatrix[12] = resultMatrix[12] * scaleF;
    resultMatrix[13] = resultMatrix[13] * scaleF;
    resultMatrix[14] = resultMatrix[14] * scaleF;

    return resultMatrix
}
