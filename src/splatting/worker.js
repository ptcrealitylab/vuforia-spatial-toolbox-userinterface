import { multiply3v, quaternionToRotationMatrix } from "./math.js";

let buffer;
let vertexCount = 0;
let doneLoading = false;
let vertexCountArray = null;
let regionIdArray = null;
let rowLengthArray = null;
let splatRegionInfos = {};
let forceSort = false;
let viewProj;
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

var texdata;
var texwidth;
var texheight;
function generateTexture() {
    if (!buffer) return;
    const f_buffer = new Float32Array(buffer);
    const u_buffer = new Uint8Array(buffer);

    texwidth = 1024 * 2; // splat texture width is 2048. Every two consecutive texture blocks contains all information for a single splat
    texheight = Math.ceil((2 * vertexCount) / texwidth);
    texdata = new Uint32Array(texwidth * texheight * 4); // 4 components per pixel, b/c of type Uint32
    let texdata_c = new Uint8Array(texdata.buffer);
    let texdata_f = new Float32Array(texdata.buffer);


    // based on vertex index, we load the data differently, b/c different splat region have different row lengths
    let vertexCountAccumulatedArray = [];
    let vertexCountAccumulated = 0;
    for (let i = 0; i < vertexCountArray.length; i++) {
        vertexCountAccumulated += vertexCountArray[i];
        vertexCountAccumulatedArray.push(vertexCountAccumulated);
    }
    let rowLengthArrayCopy = [...rowLengthArray];
    let thisRegionRowLength = rowLengthArrayCopy.shift();

    let f_offset = 0;
    let u_offset = 0;
    for (let i = 0; i < vertexCount; i++) {
        if (i >= vertexCountAccumulatedArray[0]) { // finish up this splat region & continue to process the next splat region
            vertexCountAccumulatedArray.shift();
            thisRegionRowLength = rowLengthArrayCopy.shift();
        }

        // x, y, z
        texdata_f[8 * i + 0] = f_buffer[f_offset + 0];
        texdata_f[8 * i + 1] = f_buffer[f_offset + 1];
        texdata_f[8 * i + 2] = f_buffer[f_offset + 2];

        // r, g, b, a
        texdata_c[4 * (8 * i + 7) + 0] = u_buffer[u_offset + 24 + 0];
        texdata_c[4 * (8 * i + 7) + 1] = u_buffer[u_offset + 24 + 1];
        texdata_c[4 * (8 * i + 7) + 2] = u_buffer[u_offset + 24 + 2];
        texdata_c[4 * (8 * i + 7) + 3] = u_buffer[u_offset + 24 + 3];

        // quaternions
        let scale = [
            f_buffer[f_offset + 3 + 0],
            f_buffer[f_offset + 3 + 1],
            f_buffer[f_offset + 3 + 2],
        ];
        let rot = [
            (u_buffer[u_offset + 28 + 0] - 128) / 128,
            (u_buffer[u_offset + 28 + 1] - 128) / 128,
            (u_buffer[u_offset + 28 + 2] - 128) / 128,
            (u_buffer[u_offset + 28 + 3] - 128) / 128,
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

        f_offset += thisRegionRowLength / 4;
        u_offset += thisRegionRowLength;
    }

    if (doneLoading) {
        generateRegionAndLabels(texdata_c, u_buffer, f_buffer);
    }

    self.postMessage({ texdata, texwidth, texheight });
}

function updateEditedSplatTexture(hiddenSplatIndexSet) {
    let texdata_c = new Uint8Array(texdata.buffer);
    let hiddenSplatIndexArr = Array.from(hiddenSplatIndexSet);
    for (let i = 0; i < hiddenSplatIndexArr.length; i++) {
        let index = hiddenSplatIndexArr[i];
        texdata_c[4 * (8 * index + 3) + 1] = 0; // display or hidden, cen.w >> 8
    }
    self.postMessage({ texdata, texwidth, texheight });
}

function generateRegionAndLabels(texdata_c, u_buffer, f_buffer) {
    let center_maps = new Map(); // a map storing info pairs [regionId, center_map_for_this_splat_region]
    let boundary_maps = new Map(); // a map storing info pairs [regionId, boundary_for_this_splat_region]
    let vertexCountAccumulatedArray = [];
    let vertexCountAccumulated = 0;
    for (let i = 0; i < vertexCountArray.length; i++) {
        vertexCountAccumulated += vertexCountArray[i];
        vertexCountAccumulatedArray.push(vertexCountAccumulated);
    }
    let regionIdArrayCopy = [...regionIdArray];
    let rowLengthArrayCopy = [...rowLengthArray];
    let thisRegionRowLength = rowLengthArrayCopy.shift();

    // add 1st center_map for 1st region in the regionIdArrayCopy
    let center_map = new Map(); // a map storing info about splat center for each splat region
    center_maps.set(regionIdArrayCopy[0], center_map);

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    // let centerX = 0, centerY = 0, centerZ = 0;

    let f_offset = 0;
    let u_offset = 0;
    // iterate through all the vertices, and add to their corresponding region's center_map
    for (let i = 0; i < vertexCount; i++) {
        if (i >= vertexCountAccumulatedArray[0]) { // finish up this splat region & continue to process the next splat region
            vertexCountAccumulatedArray.shift();
            let lastRegionId = regionIdArrayCopy.shift();
            thisRegionRowLength = rowLengthArrayCopy.shift();

            center_map = new Map();
            center_maps.set(regionIdArrayCopy[0], center_map);

            boundary_maps.set(
                lastRegionId,
                {
                    min: [minX, minY, minZ],
                    max: [maxX, maxY, maxZ],
                    // center: [centerX, centerY, centerZ]
                }
            );
            minX = Infinity; minY = Infinity; minZ = Infinity;
            maxX = -Infinity; maxY = -Infinity; maxZ = -Infinity;
            // centerX = 0; centerY = 0; centerZ = 0;
        }
        // get position, regionId, and label info
        let x = f_buffer[f_offset + 0];
        let y = f_buffer[f_offset + 1];
        let z = f_buffer[f_offset + 2];
        let regionId = regionIdArrayCopy[0];
        let label = thisRegionRowLength === 36 ? u_buffer[u_offset + 32 + 3] : -1;

        // assign regionId and label info to WebGL texture
        texdata_c[4 * (8 * i + 3) + 1] = 1; // splat displayed ( 1 ) or hidden ( 0 )
        texdata_c[4 * (8 * i + 3) + 2] = regionId; // region id, cen.w >> 16
        texdata_c[4 * (8 * i + 3) + 3] = label; // label, cen.w >> 24

        // update center_map and min/max boundary for this splat region
        if (!center_map.has(label)) {
            center_map.set(
                label,
                {
                    x: x,
                    y: y,
                    z: z,
                    points: [{x, y, z}],
                    count: 1,
                    userData: [],
                }
            )
        } else {
            let info = center_map.get(label);
            info.x += x;
            info.y += y;
            info.z += z;
            if (info.count % 50 === 0 && info.count < 20000) {
                info.points.push({x, y, z});
            }
            info.count++;
        }

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
        // centerX += x / vertexCountAccumulatedArray[0];
        // centerY += y / vertexCountAccumulatedArray[0];
        // centerZ += z / vertexCountAccumulatedArray[0];

        f_offset += thisRegionRowLength / 4;
        u_offset += thisRegionRowLength;
    }

    center_maps.forEach((center_map) => {
        center_map.forEach(info => {
            info.x /= info.count;
            info.y /= info.count;
            info.z /= info.count;
        });
    });

    // add in the boundary map for last region in the regionIdArrayCopy
    let lastRegionId = regionIdArrayCopy.shift();
    boundary_maps.set(
        lastRegionId,
        {
            min: [minX, minY, minZ],
            max: [maxX, maxY, maxZ],
            // center: [centerX, centerY, centerZ]
        }
    );

    self.postMessage({center_maps, boundary_maps});
}

function runSort(viewProj) {
    if (!buffer) return;
    const f_buffer = new Float32Array(buffer);
    let forceSortDone = false;
    if (forceSort) {
        forceSort = false;
        forceSortDone = true;
    } else if (lastVertexCount === vertexCount) {
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
    
    let vertexCountAccumulatedArray = [];
    let vertexCountAccumulated = 0;
    for (let i = 0; i < vertexCountArray.length; i++) {
        vertexCountAccumulated += vertexCountArray[i];
        vertexCountAccumulatedArray.push(vertexCountAccumulated);
    }
    let regionIdArrayCopy = [...regionIdArray];
    let rowLengthArrayCopy = [...rowLengthArray];
    let thisRegionRowLength = rowLengthArrayCopy.shift();

    // console.log('running sort.');
    // console.time("sort");
    let behindCameraAmount = 0;
    let outOfBoundaryAmount = 0;
    let maxDepth = -Infinity;
    let minDepth = Infinity;
    let sizeList = new Int32Array(vertexCount); // z depth of all the splats in clip space
    // todo Steve: modify this for loop here, to enable octree-like loading based on camera position
    //  instead of iterating through the entire vertex count array, we can choose to iterate through a fixed amount of arrays, skipping unused regions, to save performance
    let f_offset = 0;
    for (let i = 0; i < vertexCount; i++) {
        if (i >= vertexCountAccumulatedArray[0]) {
            vertexCountAccumulatedArray.shift();
            regionIdArrayCopy.shift();
            thisRegionRowLength = rowLengthArrayCopy.shift();
        }
        // check if each splat local position is within splat region boundary
        let pos = [f_buffer[f_offset + 0], f_buffer[f_offset + 1], f_buffer[f_offset + 2]];
        f_offset += thisRegionRowLength / 4;
        let bMin = splatRegionInfos[`${regionIdArrayCopy[0]}`] === undefined ? [-Infinity, -Infinity, -Infinity] : splatRegionInfos[`${regionIdArrayCopy[0]}`].boundaryMin;
        let bMax = splatRegionInfos[`${regionIdArrayCopy[0]}`] === undefined ? [Infinity, Infinity, Infinity] : splatRegionInfos[`${regionIdArrayCopy[0]}`].boundaryMax;
        if (pos[0] < bMin[0] || pos[1] < bMin[1] || pos[2] < bMin[2] || pos[0] > bMax[0] || pos[1] > bMax[1] || pos[2] > bMax[2]) { // out of boundary
            outOfBoundaryAmount++;
            sizeList[i] = -Infinity; // send it to the very back of camera
            continue;
        }
        // compute each splat world position, when applied splat region trasform, and compute un-normalized clip-space depth
        let posOffset = splatRegionInfos[`${regionIdArrayCopy[0]}`] === undefined ? [0, 0, 0] : splatRegionInfos[`${regionIdArrayCopy[0]}`].positionOffset;
        let q = splatRegionInfos[`${regionIdArrayCopy[0]}`] === undefined ? [0, 0, 0, 1] : splatRegionInfos[`${regionIdArrayCopy[0]}`].quaternion;
        pos = multiply3v(quaternionToRotationMatrix(q), pos);
        pos[0] += posOffset[0];
        pos[1] += posOffset[1];
        pos[2] += posOffset[2];
        // un-normalized depth in clip space, +z pointing into the screen, so that
        // the furthest splat in front of camera gets maxDepth
        // the furthest splat behind the camera gets minDepth
        let depth = viewProj[2] * pos[0] + viewProj[6] * pos[1] + viewProj[10] * pos[2] + viewProj[14] * 1;
        if (depth < 1) {
            behindCameraAmount++;
            sizeList[i] = -Infinity;
            continue;
        }
        depth = depth * 4096 | 0;
        sizeList[i] = depth;
        if (depth > maxDepth) maxDepth = depth;
        if (depth < minDepth) minDepth = depth;
    }

    // This is a 16 bit single-pass counting sort
    let depthInv = (256 * 256) / (maxDepth - minDepth);
    let counts0 = new Uint32Array(256 * 256);
    for (let i = 0; i < vertexCount; i++) {
        // remap sizeList depth from arbitrary range [minDepth, maxDepth] to [65536, 0], so that
        // 1. the furthest splat in front of camera gets 0
        // 2. the nearest splat in front of the camera & all splats that should be hidden (whose clip space depth < 1) gets 65536
        // To prepare for Painter's algorithm
        if (sizeList[i] === -Infinity) sizeList[i] = 65536;
        else sizeList[i] = 65536 - ((sizeList[i] - minDepth) * depthInv) | 0;
        counts0[sizeList[i]]++;
    }
    let starts0 = new Uint32Array(256 * 256);
    for (let i = 1; i < 256 * 256; i++)
        starts0[i] = starts0[i - 1] + counts0[i - 1];
    depthIndex = new Uint32Array(vertexCount); // indices of all the splats in the sizeList array, ordered from smallest (0) to biggest (65536)
    for (let i = 0; i < vertexCount; i++)
        depthIndex[starts0[sizeList[i]]++] = i;

    // console.timeEnd("sort");

    lastProj = viewProj;
    // console.log('sorting end');
    // console.log(depthIndex.length, vertexCount, behindCameraAmount, outOfBoundaryAmount);
    self.postMessage({ depthIndex, viewProj, vertexCount, behindCameraAmount, outOfBoundaryAmount, forceSortDone }, [
        depthIndex.buffer,
    ]);
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
let forceSortTimeoutId = null;
self.onmessage = (e) => {
    if (e.data.doneLoading) {
        doneLoading = e.data.doneLoading;
        vertexCountArray = e.data.vertexCountArray;
        regionIdArray = e.data.regionIdArray;
        rowLengthArray = e.data.rowLengthArray;
        vertexCount = e.data.vertexCount;
        buffer = e.data.buffer;
    } else if (e.data.buffer) {
        buffer = e.data.buffer;
        vertexCount = e.data.vertexCount;
        vertexCountArray = e.data.vertexCountArray;
        regionIdArray = e.data.regionIdArray;
        rowLengthArray = e.data.rowLengthArray;
    } else if (e.data.view) {
        viewProj = e.data.view;
        throttledSort();
    } else if (e.data.splatRegionInfo) {
        console.log('%c worker get splat region info', 'color: orange');
        console.log(e.data.regionId, e.data.splatRegionInfo);
        splatRegionInfos[`${e.data.regionId}`] = e.data.splatRegionInfo;
        if (forceSortTimeoutId !== null) {
            clearTimeout(forceSortTimeoutId);
        }
        forceSortTimeoutId = setTimeout(() => {
            forceSort = true;
            runSort(viewProj);
        }, 0);
    } else if (e.data.isSplatEdited) {
        updateEditedSplatTexture(e.data.hiddenSplatIndexSet);
    } else if (e.data.forceSort) {
        if (forceSortTimeoutId !== null) {
            clearTimeout(forceSortTimeoutId);
        }
        forceSortTimeoutId = setTimeout(() => {
            forceSort = true;
            runSort(viewProj);
        }, 0);
    }
};
