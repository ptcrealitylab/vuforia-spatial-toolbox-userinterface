/*
 *  MIT License
 *  Copyright (c) 2023 Kevin Kwok
 *
 *  Use of the original version of this source code is governed by a license
 *  that can be found in the LICENSE_splat file in the thirdPartyCode directory.
 */
import * as THREE from '../../thirdPartyCode/three/three.module.js';
import GUI from '../../thirdPartyCode/lil-gui.esm.js';
import { getPendingCapture } from '../gui/sceneCapture.js';
import { remap } from "../utilities/MathUtils.js";

let gsInitialized = false;
let gsActive = false;
let gsContainer;
let gsSettingsPanel;
let isGSRaycasting = false;

let labelInitialized = false;

/** iPhoneVerticalFOV, projectionMatrixFrom(), makePerspective() come from desktopAdapter in remote operator addon. */

const iPhoneVerticalFOV = 41.22673; // https://discussions.apple.com/thread/250970597

let USE_MANUAL_ALIGNMENT_FOR_ALL = false;
let USE_MANUAL_ALIGNMENT_FOR_SPECIFIED = true;
let HARDCODED_SPLAT_COUNTS_ALIGNMENTS = {};

// NOTE: this is a somewhat-fragile method included to support manually aligning particular splats.
// How to hard-code a splat's alignment:
// 1. console.log the splatCount after adding a splat to toolbox
// 2. add an entry to HARDCODED_SPLAT_COUNTS_ALIGNMENTS with the matrix that corresponds with that splat
// 3. turn on USE_MANUAL_ALIGNMENT_FOR_ALL to apply manualAlignmentMatrix to everything, or
//    USE_MANUAL_ALIGNMENT_FOR_SPECIFIED to pick the matrix from the SPLAT_COUNT_ALIGNMENTS
// This assumes/hopes that multiple splat files don't by coincidence have the same number of splats
const manualAlignmentMatrix =
    [   -0.061740851923088896,  -1.605035129459561,     0.11744258386357077,    0,
        -1.3163664239481947,    -0.01724431166120183,   -0.9276985133744583,    0,
        0.9258023359257972,     -0.13155731456696773,   -1.3112304022856882,    0,
        0.7588661310195932,     -0.3383481348010016,    0.697548483268128,      1];

const manualAlignmentMatrix_ptcFurniture1 = manualAlignmentMatrix;
HARDCODED_SPLAT_COUNTS_ALIGNMENTS[1682141] = manualAlignmentMatrix_ptcFurniture1;

/**
 * Builds a projection matrix from field of view, aspect ratio, and near and far planes
 */
function projectionMatrixFrom(vFOV, aspect, near, far) {
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
function makePerspective ( left, right, top, bottom, near, far ) {

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
function multiply4(a, b) {
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

function multiply4v(m, v) {
    return [
        v[0] * m[0] + v[1] * m[4] + v[2] * m[8] + v[3] * m[12],
        v[0] * m[1] + v[1] * m[5] + v[2] * m[9] + v[3] * m[13],
        v[0] * m[2] + v[1] * m[6] + v[2] * m[10] + v[3] * m[14],
        v[0] * m[3] + v[1] * m[7] + v[2] * m[11] + v[3] * m[15]
    ]
}

function invert4(a) {
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

function ApplyTransMatrix(sourceMatrix, transMatrix, scaleF)
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

function createWorker(self) {
    let buffer;
    let vertexCount = 0;
    let doneLoading = false;
    let viewProj;
    // 6*4 + 4 + 4 = 8*4
    // XYZ - Position (Float32)
    // XYZ - Scale (Float32)
    // RGBA - colors (uint8)
    // IJKL - quaternion/rot (uint8)
    // const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
    const rowLength = 3 * 4 + 3 * 4 + 4 + 4 + 4;
    let lastProj = [];
    let depthIndex = new Uint32Array();
    let lastVertexCount = 0;

    var _floatView = new Float32Array(1);
    var _int32View = new Int32Array(_floatView.buffer);

    function floatToHalf(float) {
        _floatView[0] = float;
        var f = _int32View[0];

        var sign = (f >> 31) & 0x0001;
        var exp = (f >> 23) & 0x00ff;
        var frac = f & 0x007fffff;

        var newExp;
        if (exp == 0) {
            newExp = 0;
        } else if (exp < 113) {
            newExp = 0;
            frac |= 0x00800000;
            frac = frac >> (113 - exp);
            if (frac & 0x01000000) {
                newExp = 1;
                frac = 0;
            }
        } else if (exp < 142) {
            newExp = exp - 112;
        } else {
            newExp = 31;
            frac = 0;
        }

        return (sign << 15) | (newExp << 10) | (frac >> 13);
    }

    function packHalf2x16(x, y) {
        return (floatToHalf(x) | (floatToHalf(y) << 16)) >>> 0;
    }

    function generateTexture() {
        if (!buffer) return;
        const f_buffer = new Float32Array(buffer);
        const u_buffer = new Uint8Array(buffer);

        var texwidth = 1024 * 2; // Set to your desired width
        var texheight = Math.ceil((2 * vertexCount) / texwidth); // Set to your desired height
        var texdata = new Uint32Array(texwidth * texheight * 4); // 4 components per pixel (RGBA)
        var texdata_c = new Uint8Array(texdata.buffer);
        var texdata_f = new Float32Array(texdata.buffer);

        let center_map = new Map();
        // console.log(vertexCount);

        // Here we convert from a .splat file buffer into a texture
        // With a little bit more foresight perhaps this texture file
        // should have been the native format as it'd be very easy to
        // load it into webgl.
        for (let i = 0; i < vertexCount; i++) {
            // x, y, z
            texdata_f[8 * i + 0] = f_buffer[9 * i + 0];
            texdata_f[8 * i + 1] = f_buffer[9 * i + 1];
            texdata_f[8 * i + 2] = f_buffer[9 * i + 2];

            // r, g, b, a
            texdata_c[4 * (8 * i + 7) + 0] = u_buffer[36 * i + 24 + 0];
            texdata_c[4 * (8 * i + 7) + 1] = u_buffer[36 * i + 24 + 1];
            texdata_c[4 * (8 * i + 7) + 2] = u_buffer[36 * i + 24 + 2];
            texdata_c[4 * (8 * i + 7) + 3] = u_buffer[36 * i + 24 + 3];

            // cx, cy, cz, label (cluster center (x, y, z) and splat label/category)
            // todo Steve: cx, cy, cz is read as Uint8 , therefore not accurate, need to find a way to read / parse & store them as actual Float32 values, just like x, y, z.
            //  need a way to make up the missing digits and convert Uint8 back to Float32 in the shader, or find a way to smartly pack them to Half16 / Uint8 and restore them in shader, just like rot and scale
            texdata_c[4 * (8 * i + 3) + 0] = u_buffer[36 * i + 28 + 0]; // cx
            texdata_c[4 * (8 * i + 3) + 1] = u_buffer[36 * i + 28 + 1]; // cy
            texdata_c[4 * (8 * i + 3) + 2] = u_buffer[36 * i + 28 + 2]; // cz
            texdata_c[4 * (8 * i + 3) + 3] = u_buffer[36 * i + 28 + 3]; // label

            if (doneLoading) {
                let label = u_buffer[36 * i + 28 + 3];
                if (!center_map.has(label)) {
                    center_map.set(
                        label,
                        {
                            x: f_buffer[9 * i + 0],
                            y: f_buffer[9 * i + 1],
                            z: f_buffer[9 * i + 2],
                            count: 1,
                        }
                    )
                } else {
                    let info = center_map.get(label);
                    info.x += f_buffer[9 * i + 0];
                    info.y += f_buffer[9 * i + 1];
                    info.z += f_buffer[9 * i + 2];
                    info.count++;
                }
            }

            // quaternions
            let scale = [
                f_buffer[9 * i + 3 + 0],
                f_buffer[9 * i + 3 + 1],
                f_buffer[9 * i + 3 + 2],
            ];
            let rot = [
                (u_buffer[36 * i + 32 + 0] - 128) / 128,
                (u_buffer[36 * i + 32 + 1] - 128) / 128,
                (u_buffer[36 * i + 32 + 2] - 128) / 128,
                (u_buffer[36 * i + 32 + 3] - 128) / 128,
            ];

            // Compute the matrix product of S and R (M = S * R)
            const M = [
                1.0 - 2.0 * (rot[2] * rot[2] + rot[3] * rot[3]),
                2.0 * (rot[1] * rot[2] + rot[0] * rot[3]),
                2.0 * (rot[1] * rot[3] - rot[0] * rot[2]),

                2.0 * (rot[1] * rot[2] - rot[0] * rot[3]),
                1.0 - 2.0 * (rot[1] * rot[1] + rot[3] * rot[3]),
                2.0 * (rot[2] * rot[3] + rot[0] * rot[1]),

                2.0 * (rot[1] * rot[3] + rot[0] * rot[2]),
                2.0 * (rot[2] * rot[3] - rot[0] * rot[1]),
                1.0 - 2.0 * (rot[1] * rot[1] + rot[2] * rot[2]),
            ].map((k, i) => k * scale[Math.floor(i / 3)]);

            const sigma = [
                M[0] * M[0] + M[3] * M[3] + M[6] * M[6],
                M[0] * M[1] + M[3] * M[4] + M[6] * M[7],
                M[0] * M[2] + M[3] * M[5] + M[6] * M[8],
                M[1] * M[1] + M[4] * M[4] + M[7] * M[7],
                M[1] * M[2] + M[4] * M[5] + M[7] * M[8],
                M[2] * M[2] + M[5] * M[5] + M[8] * M[8],
            ];

            texdata[8 * i + 4] = packHalf2x16(4 * sigma[0], 4 * sigma[1]);
            texdata[8 * i + 5] = packHalf2x16(4 * sigma[2], 4 * sigma[3]);
            texdata[8 * i + 6] = packHalf2x16(4 * sigma[4], 4 * sigma[5]);
        }

        if (doneLoading) {
            center_map.forEach(info => {
                info.x /= info.count;
                info.y /= info.count;
                info.z /= info.count;
            })
        }
        self.postMessage({ texdata, texwidth, texheight, center_map }, [texdata.buffer]);
    }

    function runSort(viewProj) {
        if (!buffer) return;
        const f_buffer = new Float32Array(buffer);
        if (lastVertexCount === vertexCount) {
            let dot =
                lastProj[2] * viewProj[2] +
                lastProj[6] * viewProj[6] +
                lastProj[10] * viewProj[10];
            if (Math.abs(dot - 1) < 0.01) {
                return;
            }
        } else {
            generateTexture();
            lastVertexCount = vertexCount;
        }

        // console.time("sort");
        let maxDepth = -Infinity;
        let minDepth = Infinity;
        let sizeList = new Int32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) {
            let depth =
                ((viewProj[2] * f_buffer[9 * i + 0] +
                        viewProj[6] * f_buffer[9 * i + 1] +
                        viewProj[10] * f_buffer[9 * i + 2]) *
                    4096) |
                0;
            sizeList[i] = depth;
            if (depth > maxDepth) maxDepth = depth;
            if (depth < minDepth) minDepth = depth;
        }

        // This is a 16 bit single-pass counting sort
        let depthInv = (256 * 256) / (maxDepth - minDepth);
        let counts0 = new Uint32Array(256 * 256);
        for (let i = 0; i < vertexCount; i++) {
            sizeList[i] = ((sizeList[i] - minDepth) * depthInv) | 0;
            counts0[sizeList[i]]++;
        }
        let starts0 = new Uint32Array(256 * 256);
        for (let i = 1; i < 256 * 256; i++)
            starts0[i] = starts0[i - 1] + counts0[i - 1];
        depthIndex = new Uint32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++)
            depthIndex[starts0[sizeList[i]]++] = i;

        // console.timeEnd("sort");

        lastProj = viewProj;
        self.postMessage({ depthIndex, viewProj, vertexCount }, [
            depthIndex.buffer,
        ]);
    }

    function processPlyBuffer(inputBuffer) {
        const ubuf = new Uint8Array(inputBuffer);
        // 10KB ought to be enough for a header...
        const header = new TextDecoder().decode(ubuf.slice(0, 1024 * 10));
        const header_end = "end_header\n";
        const header_end_index = header.indexOf(header_end);
        if (header_end_index < 0)
            throw new Error("Unable to read .ply file header");
        const vertexCount = parseInt(/element vertex (\d+)\n/.exec(header)[1]);
        console.log("Vertex Count", vertexCount);
        let row_offset = 0,
            offsets = {},
            types = {};
        const TYPE_MAP = {
            double: "getFloat64",
            int: "getInt32",
            uint: "getUint32",
            float: "getFloat32",
            short: "getInt16",
            ushort: "getUint16",
            uchar: "getUint8",
        };
        for (let prop of header
            .slice(0, header_end_index)
            .split("\n")
            .filter((k) => k.startsWith("property "))) {
            const [_p, type, name] = prop.split(" ");
            const arrayType = TYPE_MAP[type] || "getInt8";
            types[name] = arrayType;
            offsets[name] = row_offset;
            row_offset += parseInt(arrayType.replace(/[^\d]/g, "")) / 8;
        }
        console.log("Bytes per row", row_offset, types, offsets);

        let dataView = new DataView(
            inputBuffer,
            header_end_index + header_end.length,
        );
        let row = 0;
        const attrs = new Proxy(
            {},
            {
                get(target, prop) {
                    if (!types[prop]) throw new Error(prop + " not found");
                    return dataView[types[prop]](
                        row * row_offset + offsets[prop],
                        true,
                    );
                },
            },
        );

        console.time("calculate importance");
        let sizeList = new Float32Array(vertexCount);
        let sizeIndex = new Uint32Array(vertexCount);
        for (row = 0; row < vertexCount; row++) {
            sizeIndex[row] = row;
            if (!types["scale_0"]) continue;
            const size =
                Math.exp(attrs.scale_0) *
                Math.exp(attrs.scale_1) *
                Math.exp(attrs.scale_2);
            const opacity = 1 / (1 + Math.exp(-attrs.opacity));
            sizeList[row] = size * opacity;
        }
        console.timeEnd("calculate importance");

        // console.time("sort");
        sizeIndex.sort((b, a) => sizeList[a] - sizeList[b]);
        // console.timeEnd("sort");

        // 6*4 + 4 + 4 = 8*4
        // XYZ - Position (Float32)
        // XYZ - Scale (Float32)
        // RGBA - colors (uint8)
        // IJKL - quaternion/rot (uint8)

        // const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
        const rowLength = 3 * 4 + 3 * 4 + 4 + 4 + 4;
        const buffer = new ArrayBuffer(rowLength * vertexCount);

        console.time("build buffer");
        for (let j = 0; j < vertexCount; j++) {
            row = sizeIndex[j];

            const position = new Float32Array(buffer, j * rowLength, 3);
            const scales = new Float32Array(buffer, j * rowLength + 4 * 3, 3);
            const rgba = new Uint8ClampedArray(
                buffer,
                j * rowLength + 4 * 3 + 4 * 3,
                4,
            );
            const f_rgba = new Uint8ClampedArray(
                buffer,
                j * rowLength + 4 * 3 + 4 * 3 + 4,
                4,
            );
            const rot = new Uint8ClampedArray(
                buffer,
                j * rowLength + 4 * 3 + 4 * 3 + 4 + 4,
                4,
            );

            if (types["scale_0"]) {
                const qlen = Math.sqrt(
                    attrs.rot_0 ** 2 +
                    attrs.rot_1 ** 2 +
                    attrs.rot_2 ** 2 +
                    attrs.rot_3 ** 2,
                );

                rot[0] = (attrs.rot_0 / qlen) * 128 + 128;
                rot[1] = (attrs.rot_1 / qlen) * 128 + 128;
                rot[2] = (attrs.rot_2 / qlen) * 128 + 128;
                rot[3] = (attrs.rot_3 / qlen) * 128 + 128;

                scales[0] = Math.exp(attrs.scale_0);
                scales[1] = Math.exp(attrs.scale_1);
                scales[2] = Math.exp(attrs.scale_2);
            } else {
                scales[0] = 0.01;
                scales[1] = 0.01;
                scales[2] = 0.01;

                rot[0] = 255;
                rot[1] = 0;
                rot[2] = 0;
                rot[3] = 0;
            }

            position[0] = attrs.x;
            position[1] = attrs.y;
            position[2] = attrs.z;

            if (types["f_dc_0"]) {
                const SH_C0 = 0.28209479177387814;
                rgba[0] = (0.5 + SH_C0 * attrs.f_dc_0) * 255;
                rgba[1] = (0.5 + SH_C0 * attrs.f_dc_1) * 255;
                rgba[2] = (0.5 + SH_C0 * attrs.f_dc_2) * 255;
            } else {
                const SH_C0 = 0.28209479177387814;
                rgba[0] = (0.5 + SH_C0 * attrs.r) * 255;
                rgba[1] = (0.5 + SH_C0 * attrs.g) * 255;
                rgba[2] = (0.5 + SH_C0 * attrs.b) * 255;

                f_rgba[0] = attrs.cx;
                f_rgba[1] = attrs.cy;
                f_rgba[2] = attrs.cz;
            }
            if (types["opacity"]) {
                rgba[3] = (1 / (1 + Math.exp(-attrs.opacity))) * 255;

                f_rgba[3] = attrs.label;
            } else {
                rgba[3] = 255;

                f_rgba[3] = attrs.label;
            }
        }
        console.timeEnd("build buffer");
        return buffer;
    }

    const throttledSort = () => {
        if (!sortRunning) {
            sortRunning = true;
            let lastView = viewProj;
            runSort(lastView);
            setTimeout(() => {
                sortRunning = false;
                if (lastView !== viewProj) {
                    throttledSort();
                }
            }, 0);
        }
    };

    let sortRunning;
    self.onmessage = (e) => {
        if (e.data.ply) {
            vertexCount = 0;
            doneLoading = false;
            runSort(viewProj);
            buffer = processPlyBuffer(e.data.ply);
            vertexCount = Math.floor(buffer.byteLength / rowLength);
            doneLoading = true;
            postMessage({ buffer: buffer });
        } else if (e.data.buffer) {
            buffer = e.data.buffer;
            vertexCount = e.data.vertexCount;
        } else if (e.data.vertexCount) {
            vertexCount = e.data.vertexCount;
        } else if (e.data.view) {
            viewProj = e.data.view;
            throttledSort();
        } else if (e.data.doneLoading) {
            doneLoading = e.data.doneLoading;
        }
    };
}

const vertexShaderSource = `
#version 300 es
precision highp float;
precision highp int;

uniform highp usampler2D u_texture;
uniform mat4 projection, view;
uniform vec2 focal;
uniform vec2 viewport;
uniform vec2 uMouse;

// visibility settings
uniform bool uToggleBoundary;
uniform float uWorldLowAlpha;

uniform int uCollideIndex;
uniform bool uShouldDraw;

uniform float mode;
uniform float uLabel;

in vec2 position;
in int index;

out vec4 vColor;
out vec4 vFBOPosColor;
out vec2 vPosition;
out vec4 vDebug2;
out float vShouldDisplay;
out float vIndex;

vec3 randomNoiseVec3(float seed) {
    float x = fract(sin(seed * 34.678 + 23.458) * 41.89);
    float y = fract(cos(sin(seed + seed * seed * seed) * 56.743 + 18.794) * 93.37);
    float z = fract(sin(cos(seed * 89.32 + seed * seed) * 23.167 + 28.842) * 84.273);
    return vec3(x, y, z);
}

void main () {
    uvec4 cen = texelFetch(u_texture, ivec2((uint(index) & 0x3ffu) << 1, uint(index) >> 10), 0);
    vec4 cam = view * vec4(uintBitsToFloat(cen.xyz), 1);
    vec4 pos2d = projection * cam;

    float clip = 1.2 * pos2d.w;
    if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        vShouldDisplay = 0.;
        return;
    }

    uvec4 cov = texelFetch(u_texture, ivec2(((uint(index) & 0x3ffu) << 1) | 1u, uint(index) >> 10), 0);
    vec2 u1 = unpackHalf2x16(cov.x), u2 = unpackHalf2x16(cov.y), u3 = unpackHalf2x16(cov.z);
    mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);

    mat3 J = mat3(
        focal.x / cam.z, 0., -(focal.x * cam.x) / (cam.z * cam.z),
        0., -focal.y / cam.z, (focal.y * cam.y) / (cam.z * cam.z),
        0., 0., 0.
    );

    mat3 T = transpose(mat3(view)) * J;
    mat3 cov2d = transpose(T) * Vrk * T;

    float mid = (cov2d[0][0] + cov2d[1][1]) / 2.0;
    float radius = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
    float lambda1 = mid + radius, lambda2 = mid - radius;

    if(lambda2 < 0.0) return;
    vec2 diagonalVector = normalize(vec2(cov2d[0][1], lambda1 - cov2d[0][0]));
    vec2 majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

    // vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu) / 255.0;
    float label = float((cen.w >> 24) & 0xffu);
    bool dont_render = (uLabel != -1.) && (uLabel != label);
    // dont_render = false;
    if (mode == 0.) { // normal color mode
        vec3 color = vec3((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu) / 255.0;
        float opacity = float((cov.w >> 24) & 0xffu) / 255.0;
        if (dont_render) {
            color = vec3(0.);
            opacity = 0.;
        }
        vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4(color, opacity);
    } else if (mode == 1.) { // label color mode
        // vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cen.w) & 0xffu, (cen.w >> 8) & 0xffu, (cen.w >> 16) & 0xffu, (cen.w >> 24) & 0xffu) / 255.0;
        vec3 color = randomNoiseVec3(label);
        float opacity = float((cov.w >> 24) & 0xffu) / 255.0;
        if (dont_render) {
            color = vec3(0.);
            opacity = 0.;
        }
        vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4(color, opacity);
    }
    vPosition = position;

    vec2 vCenter = vec2(pos2d) / pos2d.w;
    
    
    // output cam space z depth for accurate mouse raycasting, also output splat index for raycast highlighting --- if want to do it in the future
    vFBOPosColor = vec4(cam.z, index, 0., 1.);
    
    if (index == uCollideIndex) {
        vIndex = 1.;
    } else {
        vIndex = 0.;
    }
    
    bool isOutOfAlpha = uToggleBoundary ? vColor.a < uWorldLowAlpha : false;
    vShouldDisplay = 1.;
    if (!isOutOfAlpha) {
        vShouldDisplay = 1.;
    } else {
        vShouldDisplay = 0.;
    }
    
    gl_Position = vec4(
        vCenter
        + position.x * majorAxis / viewport
        + position.y * minorAxis / viewport, (vShouldDisplay == 1. ? 0. : 2.), 1.0);
}
`.trim();

const fragmentShaderSource = `
#version 300 es
precision highp float;

uniform bool uShouldDraw;

uniform bool uIsGSRaycasting;

in vec4 vColor;
in vec4 vFBOPosColor;
in vec2 vPosition;
in float vShouldDisplay;
in float vIndex;

out vec4 fragColor;

void main () {
    
    if (uIsGSRaycasting) {
        fragColor = vFBOPosColor; // correct color w/o index
        return;
    }
    
    if (!uShouldDraw) {
        discard;
    }
    
    float A = -dot(vPosition, vPosition);
    if (A < -4.0) discard;
    float B = exp(A) * vColor.a;
    
    vec3 col = vShouldDisplay > 0.5 ? B * vColor.rgb : vec3(0.); // original color
    float a = vShouldDisplay > 0.5 ? B : 0.; // original alpha
    
    bool isMouseCollided = vIndex > 0.5 ? true : false;
    
    if ( isMouseCollided && (vShouldDisplay > 0.5) ) {
        // disable splat highlighting for now
        // col = vec3(1.);
        // a = 1.;
    }
    
    fragColor = vec4(col, a);
    // fragColor = vFBOPosColor;
    return;
}

`.trim();

async function main(initialFilePath) {

    // const url = new URL('http://192.168.0.12:8080/obj/_WORLD_test/target/target.splat');
    const url = new URL(initialFilePath);
    const req = await fetch(url, {
        mode: "cors", // no-cors, *cors, same-origin
        credentials: "omit", // include, *same-origin, omit
    });
    if (req.status != 200) {
        throw new Error(req.status + " Unable to load " + req.url);
    }

    const reader = req.body.getReader();
    // calculate number of splats in the scene 
    // const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
    const rowLength = 3 * 4 + 3 * 4 + 4 + 4 + 4;
    let splatData = new Uint8Array(req.headers.get("content-length"));
    let splatCount = splatData.length / rowLength

    let downsample = splatCount > 500000 ? 1 : 1 / window.devicePixelRatio;

    const worker = new Worker(
        URL.createObjectURL(
            new Blob(["(", createWorker.toString(), ")(self)"], {
                type: "application/javascript",
            }),
        ),
    );

    const fps = document.getElementById("gsFps");
    const canvas = document.getElementById("gsCanvas");

    const gl = canvas.getContext("webgl2", {
        antialias: false,
    });

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(vertexShader));

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(fragmentShader));

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.error(gl.getProgramInfoLog(program));

    gl.disable(gl.DEPTH_TEST); // Disable depth testing

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(
        gl.ONE_MINUS_DST_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_DST_ALPHA,
        gl.ONE,
    );

    gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

    const u_projection = gl.getUniformLocation(program, "projection");
    const u_viewport = gl.getUniformLocation(program, "viewport");
    const u_focal = gl.getUniformLocation(program, "focal");
    const u_view = gl.getUniformLocation(program, "view");
    const u_mouse = gl.getUniformLocation(program, "uMouse");
    const u_collideIndex = gl.getUniformLocation(program, "uCollideIndex");
    const u_shouldDraw = gl.getUniformLocation(program, "uShouldDraw");
    const u_uIsGSRaycasting = gl.getUniformLocation(program, "uIsGSRaycasting");
    const u_toggleBoundary = gl.getUniformLocation(program, "uToggleBoundary");
    const u_worldLowAlpha = gl.getUniformLocation(program, "uWorldLowAlpha");

    let uMode = 0;
    const u_mode = gl.getUniformLocation(program, "mode");
    gl.uniform1f(u_mode, uMode);

    window.addEventListener("keydown", (e) => {
        if (e.key === 'j' || e.key === 'J') {
            uMode = uMode === 1 ? 0 : 1;
            gl.uniform1f(u_mode, uMode);
        }
    });

    let uLabel = -1;
    const u_label = gl.getUniformLocation(program, "uLabel");
    gl.uniform1f(u_label, uLabel);

    let labelContainer = document.createElement('div');
    labelContainer.id = 'label-container';
    document.body.append(labelContainer);
    
    window.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.id.includes('label_')) {
            uLabel = parseFloat(e.target.id.slice(6));
            gl.uniform1f(u_label, uLabel);
        } else {
            uLabel = -1;
            gl.uniform1f(u_label, uLabel);
        }
    })

    let center_map_from_worker;

    // positions
    const triangleVertices = new Float32Array([-2, -2, 2, -2, 2, 2, -2, 2]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    const a_position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    var texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    var u_textureLocation = gl.getUniformLocation(program, "u_texture");
    gl.uniform1i(u_textureLocation, 0);

    const indexBuffer = gl.createBuffer();
    const a_index = gl.getAttribLocation(program, "index");
    gl.enableVertexAttribArray(a_index);
    gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
    gl.vertexAttribIPointer(a_index, 1, gl.INT, false, 0, 0);
    gl.vertexAttribDivisor(a_index, 1);

    let actualViewMatrix;
    let projectionMatrix;
    let camNear, camNearWidth, camNearHeight;

    // set up an off-screen frame buffer object texture
    let offscreenTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, offscreenTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, innerWidth, innerHeight, 0, gl.RGBA, gl.FLOAT, null);
    // Set texture parameters as needed
    // Check and enable the EXT_color_buffer_float extension in WebGL2
    const extColorBufferFloat = gl.getExtension('EXT_color_buffer_float');
    if (!extColorBufferFloat) {
        console.error('32-bit floating point linear filtering not supported');
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // create frame buffer object
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, offscreenTexture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer is incomplete');
        console.log(gl.checkFramebufferStatus(gl.FRAMEBUFFER));
        return;
    }

    let resizeId = null;
    const onResizeEnd = () => {
        // delete, create, and bind the new texture for FBO
        gl.deleteTexture(offscreenTexture);
        offscreenTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_2D, offscreenTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, innerWidth, innerHeight, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, offscreenTexture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer is incomplete');
            console.log(gl.checkFramebufferStatus(gl.FRAMEBUFFER));
        }
    }

    const resize = () => {

        const canvas = document.getElementById("gsCanvas");
        canvas.width = window.innerWidth / downsample;
        canvas.height = window.innerHeight / downsample;

        // near and far plane defined in mm as in the rest of Toolbox
        projectionMatrix = projectionMatrixFrom(iPhoneVerticalFOV, window.innerWidth / window.innerHeight, 10, 300000);

        camNear = 10 / 1000;
        camNearHeight = camNear * Math.tan(iPhoneVerticalFOV * (Math.PI / 180) / 2) * 2;
        camNearWidth = camNearHeight / window.innerHeight * window.innerWidth;

        // compute horizontal and vertical focal length in pixels from projection matrix. This is needed in shaders.
        const fx = projectionMatrix[0] * window.innerWidth / 2.0;
        const fy = projectionMatrix[5] * -window.innerHeight / 2.0;

        gl.uniform2fv(u_focal, new Float32Array([fx, fy]));

        gl.uniform2fv(u_viewport, new Float32Array([window.innerWidth, window.innerHeight]));

        gl.canvas.width = Math.round(window.innerWidth / downsample);
        gl.canvas.height = Math.round(window.innerHeight / downsample);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.uniformMatrix4fv(u_projection, false, projectionMatrix);

        if (resizeId !== null) {
            clearTimeout(resizeId);
        }
        resizeId = setTimeout(() => {
            onResizeEnd();
        }, 150);
    };

    window.addEventListener("resize", resize);
    resize();

    const clamp = (x, low, high) => {
        return Math.min(Math.max(x, low), high);
    }

    const remap01 = (x, low, high) => {
        return clamp((x - low) / (high - low), 0, 1);
    }
    
    const _remap01Curve1 = (x, low, high) => {
        let r = remap01(x, low, high);
        let a = 2;
        return (1 - r) * Math.pow(r, a) + r * (-Math.pow(r - 1, a) + 1);
    }

    const remap01Curve2 = (x, low, high) => {
        let r = remap01(x, low, high);
        let a = 2;
        return -Math.pow(r - 1, a) + 1;
    }

    const _remap = (x, lowIn, highIn, lowOut, highOut) => {
        return lowOut + (highOut - lowOut) * remap01(x, lowIn, highIn);
    }

    const remapCurve = (x, lowIn, highIn, lowOut, highOut) => {
        return lowOut + (highOut - lowOut) * remap01Curve2(x, lowIn, highIn);
    }

    function loopThroughLabels() {
        let minCount = Infinity, maxCount = 0;
        for (let value of center_map_from_worker.values()) {
            if (value.count < minCount) minCount = value.count;
            if (value.count > maxCount) maxCount = value.count;
        }
        for (let [key, value] of center_map_from_worker.entries()) {
            let label = document.getElementById(`label_${key}`);
            if (label === null) {
                label = document.createElement('div');
                label.classList.add('cluster-label');
                label.innerHTML = `.`;
                label.id = `label_${key}`;
                let scaleFactor = remapCurve(value.count, minCount, maxCount, 1, 8);
                label.style.fontSize = `${scaleFactor}rem`;
                
                let label_number = document.createElement('div')
                label_number.classList.add('cluster-label-number');
                label_number.innerHTML = `${key}`;
                label.append(label_number);
                
                labelContainer.append(label);
            }
            let pos = [value.x, value.y, value.z, 1];
            let pos2d = multiply4v(multiply4(projectionMatrix, actualViewMatrix), pos);
            let clip = 1.2 * pos2d[3];
            if (uLabel !== -1) {
                if (uLabel !== key) {
                    label.style.visibility = 'hidden';
                    continue;
                }
            }
            if (pos2d[2] < -clip || pos2d[0] < -clip || pos2d[0] > clip || pos2d[1] < -clip || pos2d[1] > clip) {
                label.style.visibility = 'hidden';
            } else {
                label.style.visibility = 'visible';
                let ndcXY = [pos2d[0] / pos2d[3], pos2d[1] / pos2d[3]];
                let screenXY = [(ndcXY[0] + 1) / 2 * innerWidth, (-ndcXY[1] + 1) / 2 * innerHeight];
                label.style.transform = `translate(-50%, -50%) translate(${screenXY[0]}px, ${screenXY[1]}px)`;
            }
        }
    }

    function clearLabels() {
        labelContainer.innerHTML = '';
    }

    function addLabels() {
        if (center_map_from_worker.size === 0 || labelInitialized) return; // todo Steve: figure out why there is ONLY 256 instead of 265 clusters
        labelInitialized = true;
        loopThroughLabels();
        renderLabels();
    }

    function renderLabels() {
        requestAnimationFrame(renderLabels);
        loopThroughLabels();
    }

    worker.onmessage = (e) => {
        if (e.data.buffer) {
            splatData = new Uint8Array(e.data.buffer);
            const blob = new Blob([splatData.buffer], {
                type: "application/octet-stream",
            });
            // TODO (Dan): don't download, send to server
            const link = document.createElement("a");
            link.download = "model.splat";
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } else if (e.data.texdata) {
            const { texdata, texwidth, texheight } = e.data;
            labelInitialized = false;
            center_map_from_worker = e.data.center_map;
            clearLabels();
            addLabels();
            // console.log(texdata)
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_S,
                gl.CLAMP_TO_EDGE,
            );
            gl.texParameteri(
                gl.TEXTURE_2D,
                gl.TEXTURE_WRAP_T,
                gl.CLAMP_TO_EDGE,
            );
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            gl.texImage2D(
                gl.TEXTURE_2D,
                0,
                gl.RGBA32UI,
                texwidth,
                texheight,
                0,
                gl.RGBA_INTEGER,
                gl.UNSIGNED_INT,
                texdata,
            );
            gl.bindTexture(gl.TEXTURE_2D, texture);
        } else if (e.data.depthIndex) {
            const { depthIndex, _viewProj } = e.data;
            gl.bindBuffer(gl.ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, depthIndex, gl.DYNAMIC_DRAW);
            vertexCount = e.data.vertexCount;
        }
    };

    let vertexCount = 0;
    let lastFrame = 0;
    let avgFps = 0;
    // let start = 0;

    let isLowFPS = false;
    let lowFPSId = null;
    function lowFPSMode() {
        isLowFPS = true;
        if (lowFPSId !== null) {
            clearTimeout(lowFPSId);
        }
        lowFPSId = setTimeout(() => {
            isLowFPS = false;
        }, 500);
    }

    const frame = (now) => {

        // obtain camera pose from Toolbox scene graph 
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');
        let gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE + realityEditor.sceneGraph.TAGS.ROTATE_X);
        if (!gpNode) {
            gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE);
        }
        // transformation from camera CS to ground plane CS
        let newCamMatrix = cameraNode.getMatrixRelativeTo(gpNode);

        const scaleF = 1.0;  // extra scaling factor in target CS
        const offset_x = 0;  // extra offset in target CS (in meter units)
        const offset_y = 0;
        const offset_z = 0;

        const SCALE = 1 / 1000; // conversion from mm (Toolbox) to meters (GS renderer) 
        const floorOffset = realityEditor.gui.ar.areaCreator.calculateFloorOffset() // in mm units
        // update translation vector (camera wrt. world CS)
        newCamMatrix[12] = (newCamMatrix[12]*SCALE + offset_x) * scaleF;
        newCamMatrix[13] = ((newCamMatrix[13] + floorOffset)*SCALE + offset_y)*scaleF;
        newCamMatrix[14] = (newCamMatrix[14]*SCALE + offset_z)*scaleF;

        // flip the y, z axes (OpenGL to Colmap camera CS)
        const flipMatrix =   
            [1, 0, 0, 0,
             0,-1, 0, 0,
             0, 0,-1, 0,
             0, 0, 0, 1];

        let resultMatrix_1 = multiply4(newCamMatrix, flipMatrix);
        // inversion is needed
        actualViewMatrix = invert4(resultMatrix_1);

        let useManualAlignment = USE_MANUAL_ALIGNMENT_FOR_ALL ||
            (USE_MANUAL_ALIGNMENT_FOR_SPECIFIED && typeof HARDCODED_SPLAT_COUNTS_ALIGNMENTS[splatCount] !== 'undefined');
        if (useManualAlignment) {
            // let resultMatrix_manualAlign = multiply4(resultMatrix_1, manualAlignmentMatrix);
            // actualViewMatrix = invert4(resultMatrix_manualAlign);
            let alignmentMatrix = HARDCODED_SPLAT_COUNTS_ALIGNMENTS[splatCount] || manualAlignmentMatrix;
            let resultMatrix_manualAlign = ApplyTransMatrix(resultMatrix_1, alignmentMatrix, scaleF);
            actualViewMatrix = invert4(resultMatrix_manualAlign);
        }

        const viewProj = multiply4(projectionMatrix, actualViewMatrix);
        worker.postMessage({ view: viewProj });

        const currentFps = 1000 / (now - lastFrame) || 0;
        avgFps = avgFps * 0.9 + currentFps * 0.1;

        if (vertexCount > 0 && realityEditor.spatialCursor.isGSActive()) {
            document.getElementById("gsSpinner").style.display = "none";
            gl.uniformMatrix4fv(u_view, false, actualViewMatrix);
            gl.uniform2fv(u_mouse, new Float32Array(uMouse));
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1i(u_shouldDraw, 0);
            FBORendering: if (isGSRaycasting && !isLowFPS) {
                // if average FPS is lower than 40, then switch back to default ray-casting method
                if (avgFps < 30) {
                    // console.warn('Low FPS, stop gs raycasting for now.');
                    lowFPSMode();
                    realityEditor.spatialCursor.gsToggleRaycast(false);
                    break FBORendering;
                }
                realityEditor.spatialCursor.gsToggleRaycast(true);
                // render to frame buffer object texture
                gl.uniform1i(u_uIsGSRaycasting, 1);
                gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
                gl.viewport(0, 0, innerWidth, innerHeight);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, vertexCount);
                // read the texture
                const pixelBuffer = new Float32Array(4); // 4 components for RGBA
                gl.readPixels(Math.floor(uMouseScreen[0]), Math.floor(innerHeight - uMouseScreen[1]), 1, 1, gl.RGBA, gl.FLOAT, pixelBuffer);
                let camDepth = pixelBuffer[0];
                let xOffset = remap(uMouse[0], -1, 1, -camNearWidth / 2, camNearWidth / 2) / camNear * camDepth;
                let yOffset = remap(uMouse[1], -1, 1, camNearHeight / 2, -camNearHeight / 2) / camNear * camDepth;
                let camSpacePosition = [xOffset, yOffset, camDepth, 1];
                let worldSpacePosition = multiply4v(resultMatrix_1, camSpacePosition);
                vWorld.set(worldSpacePosition[0], worldSpacePosition[1], worldSpacePosition[2]);
                gl.uniform1i(u_collideIndex, pixelBuffer[1]);
                vWorld.x = (vWorld.x / scaleF - offset_x) / SCALE;
                vWorld.y = (vWorld.y / scaleF - offset_y) / SCALE - floorOffset;
                vWorld.z = (vWorld.z / scaleF - offset_z) / SCALE;
                if (pixelBuffer[3] !== 0) {
                    realityEditor.spatialCursor.gsSetPosition(vWorld);
                }
            }
            // render to screen
            gl.uniform1i(u_uIsGSRaycasting, 0);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, innerWidth, innerHeight);
            gl.uniform1i(u_shouldDraw, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, vertexCount);

            let pendingCapture = getPendingCapture('gsCanvas');
            if (pendingCapture) {
                pendingCapture.performCapture();
            }

        } else {
            gl.clear(gl.COLOR_BUFFER_BIT);
            document.getElementById("gsSpinner").style.display = "";
            // start = Date.now() + 2000;
        }
        const progress = (100 * vertexCount) / splatCount;
        if (progress < 100) {
            document.getElementById("gsProgress").style.width = progress + "%";
        } else {
            document.getElementById("gsProgress").style.display = "none";
        }
        fps.innerText = Math.round(avgFps) + " fps";
        lastFrame = now;
        window.requestAnimationFrame(frame);
    };

    frame();

    /** Loads GS file dropped into the window. */
    /*
    const selectFile = (file) => {
        const fr = new FileReader();
        stopLoading = true;
        fr.onload = () => {
            splatData = new Uint8Array(fr.result);
            console.log("Loaded", Math.floor(splatCount));
        
            if (splatData[0] === 112 && splatData[1] === 108 && splatData[2] === 121 && splatData[3] === 10) {
                // ply file magic header means it should be handled differently
                worker.postMessage({ ply: splatData.buffer });
            } else {
                worker.postMessage({
                    buffer: splatData.buffer,
                    vertexCount: Math.floor(splatCount),
                });
            }
        };
        fr.readAsArrayBuffer(file);
    };
    */

    let uMouse = [0, 0];
    let uMouseScreen = [0, 0];
    let uLastMouse = [0, 0];
    let uLastMouseScreen = [0, 0];
    let vWorld = new THREE.Vector3();
    window.addEventListener("pointermove", (e) => {
        if (isFlying) return;
        // uMouseScreen = [e.clientX, e.clientY];
        // uMouse = [(e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1];
        uMouseScreen = [Math.round(e.clientX), Math.round(e.clientY)];
        uMouse = [(uMouseScreen[0] / innerWidth) * 2 - 1, -(uMouseScreen[1] / innerHeight) * 2 + 1];
    })
    // add fly mode support
    let isFlying = false;
    realityEditor.device.keyboardEvents.registerCallback('enterFlyMode', function (params) {
        isFlying = params.isFlying;
        let mousePosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
        uLastMouseScreen = [mousePosition.x, mousePosition.y];
        uLastMouse = [(mousePosition.x / innerWidth) * 2 - 1, -(mousePosition.y / innerHeight) * 2 + 1]
        uMouseScreen = [innerWidth / 2, innerHeight / 2];
        uMouse = [0, 0];
    });
    realityEditor.device.keyboardEvents.registerCallback('enterNormalMode', function (params) {
        isFlying = params.isFlying;
        uMouseScreen[0] = uLastMouseScreen[0];
        uMouseScreen[1] = uLastMouseScreen[1];
        uMouse[0] = uLastMouse[0];
        uMouse[1] = uLastMouse[1];
    });

    // lil GUI settings
    gsSettingsPanel = new GUI({width: 300});
    gsSettingsPanel.domElement.style.zIndex = '10001';
    gsSettingsPanel.domElement.style.display = 'none';
    let uToggleBoundary = true;
    let uWorldLowAlpha = 0.3;
    const folder = gsSettingsPanel.addFolder('Visibility');
    let settings = {
        "toggle boundary": uToggleBoundary,
        "world low alpha": uWorldLowAlpha,
    }
    folder.add(settings, 'toggle boundary').onChange((value) => {
        uToggleBoundary = value;
        gl.uniform1f(u_toggleBoundary, uToggleBoundary ? 1 : 0);
    });
    gl.uniform1f(u_toggleBoundary, uToggleBoundary ? 1 : 0);
    let d1 = folder.add(settings, 'world low alpha', 0, 1).onChange((value) => {
        uWorldLowAlpha = value;
        gl.uniform1f(u_worldLowAlpha, uWorldLowAlpha);
    });
    d1.step(0.1);
    gl.uniform1f(u_worldLowAlpha, uWorldLowAlpha);
    folder.close();

    const preventDefault = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    gsContainer.addEventListener("dragenter", preventDefault);
    gsContainer.addEventListener("dragover", preventDefault);
    gsContainer.addEventListener("dragleave", preventDefault);
    /*
    gsContainer.addEventListener("drop", (e) => {
        preventDefault(e);
        selectFile(e.dataTransfer.files[0]);
    }); */

    let bytesRead = 0;
    let lastVertexCount = -1;
    let stopLoading = false;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { done, value } = await reader.read();
        if (done || stopLoading) {
            worker.postMessage({
                doneLoading: true,
            })
            break;
        }

        splatData.set(value, bytesRead);
        bytesRead += value.length;

        if (vertexCount > lastVertexCount) {
            worker.postMessage({
                buffer: splatData.buffer,
                vertexCount: Math.floor(bytesRead / rowLength),
            });
            lastVertexCount = vertexCount;
        }
    }
    if (!stopLoading) {
        worker.postMessage({
            buffer: splatData.buffer,
            vertexCount: Math.floor(bytesRead / rowLength),
        });
    }
}

// The comma key can be used to toggle the splat rendering visibility after it's been loaded at least once
window.addEventListener("keydown", e => {
    if (e.key === ',') {
        if (!gsInitialized) {
            return; // must be initialized using UI button before comma key can be used
        }
        gsContainer.classList.toggle('hidden');
        gsActive = !gsContainer.classList.contains('hidden');
        if(gsActive)
        {
            realityEditor.gui.threejsScene.enableExternalSceneRendering(true);
            realityEditor.spatialCursor.gsToggleActive(true);
            callbacks.onSplatShown.forEach(cb => {
                cb();
            });
        }
        else
        {
            realityEditor.gui.threejsScene.disableExternalSceneRendering(true);
            realityEditor.spatialCursor.gsToggleActive(false);
            callbacks.onSplatHidden.forEach(cb => {
                cb();
            });
        }
    }
});

function showSplatRenderer(filePath, options = { broadcastToOthers: false }) {
    if (realityEditor.device.environment.isWithinToolboxApp()) {
        return; // for now, disable the gaussian splat renderer within our AR app
    }
    if (!gsInitialized) {
        gsInitialized = true;
        gsContainer = document.querySelector('#gsContainer');
        main(filePath).catch((err) => {
            document.getElementById("gsSpinner").style.display = "none";
            document.getElementById("gsMessage").innerText = err.toString();
        });
    }
    gsContainer.classList.remove('hidden');
    gsActive = true;
    // tell the mainThreejsScene to hide the mesh model
    realityEditor.gui.threejsScene.enableExternalSceneRendering(options.broadcastToOthers);
}

function hideSplatRenderer(options = { broadcastToOthers: false }) {
    if (realityEditor.device.environment.isWithinToolboxApp()) {
        return; // for now, disable the gaussian splat renderer within our AR app
    }
    if (!gsContainer) return;
    gsContainer.classList.add('hidden');
    gsActive = false;
    // tell the mainThreejsScene to show the mesh model
    realityEditor.gui.threejsScene.disableExternalSceneRendering(options.broadcastToOthers);
}

let callbacks = {
    onSplatShown: [],
    onSplatHidden: []
}

export default {
    hideSplatRenderer,
    showSplatRenderer,
    onSplatShown(callback) {
        callbacks.onSplatShown.push(callback);
    },
    onSplatHidden(callback) {
        callbacks.onSplatHidden.push(callback);
    },
    toggleGSRaycast(flag) {
        isGSRaycasting = flag;
    },
    showGSSettingsPanel() {
        gsSettingsPanel.domElement.style.display = 'flex';
    },
    hideGSSettingsPanel() {
        gsSettingsPanel.domElement.style.display = 'none';
    },
}
