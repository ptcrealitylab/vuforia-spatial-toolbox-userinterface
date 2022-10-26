/**
 * @preserve
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *      ╦═╗┌─┐┌─┐┬  ┬┌┬┐┬ ┬  ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐  ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *      ╠╦╝├┤ ├─┤│  │ │ └┬┘  ║╣  │││ │ │ │├┬┘  ╠═╝├┬┘│ │ │├┤ │   │
 *      ╩╚═└─┘┴ ┴┴─┘┴ ┴  ┴   ╚═╝─┴┘┴ ┴ └─┘┴└─  ╩  ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2015 Valentin Heun
 * Modified by Valentin Heun 2014, 2015, 2016, 2017
 * Modified by Benjamin Reynholds 2016, 2017
 * Modified by James Hobin 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

createNameSpace("realityEditor.gui.ar.utilities");

/**
 * @fileOverview realityEditor.gui.ar.utilities.js
 * Various utility functions, mostly mathematical, for calculating AR geometry.
 * Includes simply utilities like multiplying and inverting a matrix,
 * as well as sophisticated algorithms for marker-plane intersections and raycasting points onto a plane.
 */

/**
 * Updates the timing object with the current timestamp and delta since last frame.
 * @param {{delta: number, now: number, then: number}} timing - reference to the timing object to modify
 */
realityEditor.gui.ar.utilities.timeSynchronizer = function(timing) {
    timing.now = Date.now();
    timing.delta = (timing.now - timing.then) / 198;
    timing.then = timing.now;
};

/**
 * Rescales x from the original range (in_min, in_max) to the new range (out_min, out_max)
 * @example map(5, 0, 10, 100, 200) would return 150, because 5 is halfway between 0 and 10, so it finds the number halfway between 100 and 200
 * 
 * @param {number} x
 * @param {number} in_min
 * @param {number} in_max
 * @param {number} out_min
 * @param {number} out_max
 * @return {number}
 */
realityEditor.gui.ar.utilities.map = function(x, in_min, in_max, out_min, out_max) {
	if (x > in_max) x = in_max;
	if (x < in_min) x = in_min;
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};

/**
 * @desc This function multiplies one m16 matrix with a second m16 matrix
 * @param {Array.<number>} m2 - origin matrix to be multiplied with
 * @param {Array.<number>} m1 - second matrix that multiplies.
 * @return {Array.<number>} m16 matrix result of the multiplication
 */
realityEditor.gui.ar.utilities.multiplyMatrix = function(m2, m1, r) {
	// var r = [];
	// Cm1che only the current line of the second mm1trix
	r[0] = m2[0] * m1[0] + m2[1] * m1[4] + m2[2] * m1[8] + m2[3] * m1[12];
	r[1] = m2[0] * m1[1] + m2[1] * m1[5] + m2[2] * m1[9] + m2[3] * m1[13];
	r[2] = m2[0] * m1[2] + m2[1] * m1[6] + m2[2] * m1[10] + m2[3] * m1[14];
	r[3] = m2[0] * m1[3] + m2[1] * m1[7] + m2[2] * m1[11] + m2[3] * m1[15];

	r[4] = m2[4] * m1[0] + m2[5] * m1[4] + m2[6] * m1[8] + m2[7] * m1[12];
	r[5] = m2[4] * m1[1] + m2[5] * m1[5] + m2[6] * m1[9] + m2[7] * m1[13];
	r[6] = m2[4] * m1[2] + m2[5] * m1[6] + m2[6] * m1[10] + m2[7] * m1[14];
	r[7] = m2[4] * m1[3] + m2[5] * m1[7] + m2[6] * m1[11] + m2[7] * m1[15];

	r[8] = m2[8] * m1[0] + m2[9] * m1[4] + m2[10] * m1[8] + m2[11] * m1[12];
	r[9] = m2[8] * m1[1] + m2[9] * m1[5] + m2[10] * m1[9] + m2[11] * m1[13];
	r[10] = m2[8] * m1[2] + m2[9] * m1[6] + m2[10] * m1[10] + m2[11] * m1[14];
	r[11] = m2[8] * m1[3] + m2[9] * m1[7] + m2[10] * m1[11] + m2[11] * m1[15];

	r[12] = m2[12] * m1[0] + m2[13] * m1[4] + m2[14] * m1[8] + m2[15] * m1[12];
	r[13] = m2[12] * m1[1] + m2[13] * m1[5] + m2[14] * m1[9] + m2[15] * m1[13];
	r[14] = m2[12] * m1[2] + m2[13] * m1[6] + m2[14] * m1[10] + m2[15] * m1[14];
	r[15] = m2[12] * m1[3] + m2[13] * m1[7] + m2[14] * m1[11] + m2[15] * m1[15];
	// return r;
};

/**
 * Utility to subtract one m16 from another
 * @param {Array.<number>} m1
 * @param {Array.<number>} m2
 * @return {Array.<number>} = m1 - m2
 */
realityEditor.gui.ar.utilities.subtractMatrix = function(m1, m2) {
    var r = [];
    r[0] = m1[0] - m2[0];
    r[1] = m1[1] - m2[1];
    r[2] = m1[2] - m2[2];
    r[3] = m1[3] - m2[3];
    r[4] = m1[4] - m2[4];
    r[5] = m1[5] - m2[5];
    r[6] = m1[6] - m2[6];
    r[7] = m1[7] - m2[7];
    r[8] = m1[8] - m2[8];
    r[9] = m1[9] - m2[9];
    r[10] = m1[10] - m2[10];
    r[11] = m1[11] - m2[11];
    r[12] = m1[12] - m2[12];
    r[13] = m1[13] - m2[13];
    r[14] = m1[14] - m2[14];
    r[15] = m1[15] - m2[15];
    return r;
};

/**
 * @desc multiply m4 matrix with m16 matrix
 * @param {Array.<number>} m1 - origin m4 matrix
 * @param {Array.<number>} m2 - m16 matrix to multiply with
 * @return {Array.<number>} is m16 matrix
 */
realityEditor.gui.ar.utilities.multiplyMatrix4 = function(m1, m2) {
	var r = [];
	var x = m1[0], y = m1[1], z = m1[2], w = m1[3];
	r[0] = m2[0] * x + m2[4] * y + m2[8] * z + m2[12] * w;
	r[1] = m2[1] * x + m2[5] * y + m2[9] * z + m2[13] * w;
	r[2] = m2[2] * x + m2[6] * y + m2[10] * z + m2[14] * w;
	r[3] = m2[3] * x + m2[7] * y + m2[11] * z + m2[15] * w;
	return r;
};

/**
 * @desc copies one m16 matrix in to another m16 matrix
 * @param {Array.<number>}matrix - source matrix
 * @return {Array.<number>} resulting copy of the matrix
 */
realityEditor.gui.ar.utilities.copyMatrix = function(matrix) {
    if (matrix.length === 0) return [];

    var r = []; //new Array(16);
    r[0] = matrix[0];
    r[1] = matrix[1];
    r[2] = matrix[2];
    r[3] = matrix[3];
    r[4] = matrix[4];
    r[5] = matrix[5];
    r[6] = matrix[6];
    r[7] = matrix[7];
    r[8] = matrix[8];
    r[9] = matrix[9];
    r[10] = matrix[10];
    r[11] = matrix[11];
    r[12] = matrix[12];
    r[13] = matrix[13];
    r[14] = matrix[14];
    r[15] = matrix[15];
    return r;
};

/**
 * @desc copies one m16 matrix in to another m16 matrix
 * Use instead of copyMatrix function when speed is very important - this is faster
 * @param {Array.<number>} m1 - source matrix
 * @param {Array.<number>} m2 - resulting copy of the matrix
 */
realityEditor.gui.ar.utilities.copyMatrixInPlace = function(m1, m2) {
    m2[0] = m1[0];
    m2[1] = m1[1];
    m2[2] = m1[2];
    m2[3] = m1[3];
    m2[4] = m1[4];
    m2[5] = m1[5];
    m2[6] = m1[6];
    m2[7] = m1[7];
    m2[8] = m1[8];
    m2[9] = m1[9];
    m2[10] = m1[10];
    m2[11] = m1[11];
    m2[12] = m1[12];
    m2[13] = m1[13];
    m2[14] = m1[14];
    m2[15] = m1[15];
};

/**
 * Returns a matrix that linearly interpolated each element of two matrices
 * @param {Array.<number>} existingMatrix - source matrix
 * @param {Array.<number>} newMatrix - new value
 * @param {number} alpha - if 0, sets to existing matrix, if 1, sets to new matrix, if 0.5, averages the two
 * @return {Array.<number>} resulting interpolated matrix
 */
realityEditor.gui.ar.utilities.lerpMatrices = function(existingMatrix, newMatrix, alpha) {
    if (existingMatrix.length !== newMatrix.length) {
        console.warn('trying to lerp incompatible matrices');
        return;
    }
    if (typeof alpha === 'undefined' || alpha < 0 || alpha > 1) {
        console.log('lerping with incompatible alpha value (' + alpha + ') -> using 0.5 instead');
        alpha = 0.5;
    }

    var r = [];
    r[0] = newMatrix[0] * alpha + existingMatrix[0] * (1 - alpha);
    r[1] = newMatrix[1] * alpha + existingMatrix[1] * (1 - alpha);
    r[2] = newMatrix[2] * alpha + existingMatrix[2] * (1 - alpha);
    r[3] = newMatrix[3] * alpha + existingMatrix[3] * (1 - alpha);
    r[4] = newMatrix[4] * alpha + existingMatrix[4] * (1 - alpha);
    r[5] = newMatrix[5] * alpha + existingMatrix[5] * (1 - alpha);
    r[6] = newMatrix[6] * alpha + existingMatrix[6] * (1 - alpha);
    r[7] = newMatrix[7] * alpha + existingMatrix[7] * (1 - alpha);
    r[8] = newMatrix[8] * alpha + existingMatrix[8] * (1 - alpha);
    r[9] = newMatrix[9] * alpha + existingMatrix[9] * (1 - alpha);
    r[10] = newMatrix[10] * alpha + existingMatrix[10] * (1 - alpha);
    r[11] = newMatrix[11] * alpha + existingMatrix[11] * (1 - alpha);
    r[12] = newMatrix[12] * alpha + existingMatrix[12] * (1 - alpha);
    r[13] = newMatrix[13] * alpha + existingMatrix[13] * (1 - alpha);
    r[14] = newMatrix[14] * alpha + existingMatrix[14] * (1 - alpha);
    r[15] = newMatrix[15] * alpha + existingMatrix[15] * (1 - alpha);
    return r;
};

/**
 * @desc inverting a matrix
 * @param {Array.<number>} a origin matrix
 * @return {Array.<number>} a inverted copy of the origin matrix
 */
realityEditor.gui.ar.utilities.invertMatrix = function (a) {
    var b = [];
	var c = a[0], d = a[1], e = a[2], g = a[3], f = a[4], h = a[5], i = a[6], j = a[7], k = a[8], l = a[9], o = a[10], m = a[11], n = a[12], p = a[13], r = a[14], s = a[15], A = c * h - d * f, B = c * i - e * f, t = c * j - g * f, u = d * i - e * h, v = d * j - g * h, w = e * j - g * i, x = k * p - l * n, y = k * r - o * n, z = k * s - m * n, C = l * r - o * p, D = l * s - m * p, E = o * s - m * r, q = 1 / (A * E - B * D + t * C + u * z - v * y + w * x);
	b[0] = (h * E - i * D + j * C) * q;
	b[1] = ( -d * E + e * D - g * C) * q;
	b[2] = (p * w - r * v + s * u) * q;
	b[3] = ( -l * w + o * v - m * u) * q;
	b[4] = ( -f * E + i * z - j * y) * q;
	b[5] = (c * E - e * z + g * y) * q;
	b[6] = ( -n * w + r * t - s * B) * q;
	b[7] = (k * w - o * t + m * B) * q;
	b[8] = (f * D - h * z + j * x) * q;
	b[9] = ( -c * D + d * z - g * x) * q;
	b[10] = (n * v - p * t + s * A) * q;
	b[11] = ( -k * v + l * t - m * A) * q;
	b[12] = ( -f * C + h * y - i * x) * q;
	b[13] = (c * C - d * y + e * x) * q;
	b[14] = ( -n * u + p * B - r * A) * q;
	b[15] = (k * u - l * B + o * A) * q;
	return b;
};

/**
 * Returns the transpose of a 4x4 matrix
 * @param {Array.<number>} matrix
 * @return {Array.<number>}
 */
realityEditor.gui.ar.utilities.transposeMatrix = function(matrix) {
    var r = [];
    r[0] = matrix[0];
    r[1] = matrix[4];
    r[2] = matrix[8];
    r[3] = matrix[12];
    r[4] = matrix[1];
    r[5] = matrix[5];
    r[6] = matrix[9];
    r[7] = matrix[13];
    r[8] = matrix[2];
    r[9] = matrix[6];
    r[10] = matrix[10];
    r[11] = matrix[14];
    r[12] = matrix[3];
    r[13] = matrix[7];
    r[14] = matrix[11];
    r[15] = matrix[15];
    return r;
};

/**
 * Efficient method for multiplying each element in a length 4 array by the same number
 * @param {Array.<number>} vector4
 * @param {number} scalar
 * @return {Array.<number>}
 */
realityEditor.gui.ar.utilities.scalarMultiplyVector = function(vector4, scalar) {
    var r = [];
    r[0] = vector4[0] * scalar;
    r[1] = vector4[1] * scalar;
    r[2] = vector4[2] * scalar;
    r[3] = vector4[3] * scalar;
    return r;
};

/**
 * Efficient method for multiplying each element in a length 16 array by the same number
 * @param {Array.<number>} matrix
 * @param {number} scalar
 * @return {Array.<number>}
 */
realityEditor.gui.ar.utilities.scalarMultiplyMatrix = function(matrix, scalar) {
    var r = [];
    r[0] = matrix[0] * scalar;
    r[1] = matrix[1] * scalar;
    r[2] = matrix[2] * scalar;
    r[3] = matrix[3] * scalar;
    r[4] = matrix[4] * scalar;
    r[5] = matrix[5] * scalar;
    r[6] = matrix[6] * scalar;
    r[7] = matrix[7] * scalar;
    r[8] = matrix[8] * scalar;
    r[9] = matrix[9] * scalar;
    r[10] = matrix[10] * scalar;
    r[11] = matrix[11] * scalar;
    r[12] = matrix[12] * scalar;
    r[13] = matrix[13] * scalar;
    r[14] = matrix[14] * scalar;
    r[15] = matrix[15] * scalar;
    return r;
};

/**
 * Divides every element in a vector or matrix by its last element so that the last element becomes 1.
 * (see explanation of homogeneous coordinates http://robotics.stanford.edu/~birch/projective/node4.html)
 * @param {Array.<number>} matrix - can have any length (so it works for vectors and matrices)
 * @return {Array.<number>}
 */
realityEditor.gui.ar.utilities.perspectiveDivide = function(matrix) {
    var lastElement = matrix[matrix.length-1];
    var r = [];
    for (var i = 0; i < matrix.length; i++) {
        r[i] = matrix[i] / lastElement;
    }
    return r;
};

/**
 * Helper function for printing a matrix in human-readable format
 * Note that this assumes, row-major order, while CSS 3D matrices actually use column-major
 * Interpret column-major matrices as the transpose of what is printed
 * @param {Array.<number>} matrix
 * @param {number} precision - the number of decimal points to include
 * @param {boolean} htmlLineBreaks - use html line breaks instead of newline characters
 * @return {string}
 */
realityEditor.gui.ar.utilities.prettyPrintMatrix = function(matrix, precision, htmlLineBreaks) {
    if (typeof precision === 'undefined') precision = 3;
    
    var lineBreakSymbol = htmlLineBreaks ? '<br>' : '\n';
    
    return "[ " + matrix[0].toFixed(precision) + ", " + matrix[1].toFixed(precision) + ", " + matrix[2].toFixed(precision) + ", " + matrix[3].toFixed(precision) + ", " + lineBreakSymbol +
                "  " + matrix[4].toFixed(precision) + ", " + matrix[5].toFixed(precision) + ", " + matrix[6].toFixed(precision) + ", " + matrix[7].toFixed(precision) + ", " + lineBreakSymbol +
                "  " + matrix[8].toFixed(precision) + ", " + matrix[9].toFixed(precision) + ", " + matrix[10].toFixed(precision) + ", " + matrix[11].toFixed(precision) + ", " + lineBreakSymbol +
                "  " + matrix[12].toFixed(precision) + ", " + matrix[13].toFixed(precision) + ", " + matrix[14].toFixed(precision) + ", " + matrix[15].toFixed(precision) + " ]";
};

/**
 * Returns the dot product of the two vectors
 */
realityEditor.gui.ar.utilities.dotProduct = function(v1, v2) {
    if (v1.length !== v2.length) {
        console.warn('trying to dot two vectors of different lengths');
        return 0;
    }
    var sum = 0;
    for (var i = 0; i < v1.length; i++) {
        sum += v1[i] * v2[i];
    }
    return sum;
};

/**
 * Utility that returns true if the rectangle formed by topLeft and bottomRight A overlaps B
 * https://www.geeksforgeeks.org/find-two-rectangles-overlap/
 * 
 *  topLeftA ----------------
 *  |                       |
 *  |                       |
 *  |                       |
 *  ------------ bottomRightA
 *  
 * topLeftB -----------------
 *  |                       |
 *  |                       |
 *  |                       |
 *  ------------ bottomRightB
 * 
 * @param {{x: number, y: number}} topLeftA
 * @param {{x: number, y: number}} bottomRightA
 * @param {{x: number, y: number}} topLeftB
 * @param {{x: number, y: number}} bottomRightB
 * @return {boolean}
 */
realityEditor.gui.ar.utilities.areRectsOverlapping = function(topLeftA, bottomRightA, topLeftB, bottomRightB) {

    // can't overlap if one is completely to the left of the other
    if (topLeftA.x > bottomRightB.x || topLeftB.x > bottomRightA.x) {
        return false;
    }
    
    // can't overlap is one is completely above the other
    if (topLeftA.y > bottomRightB.y || topLeftB.y > bottomRightA.y) {
        return false;
    }
    
    // must overlap if neither of the above conditions are true
    return true;
};

/**
 * Returns whether or not the given point is inside the polygon formed by the given vertices.
 * @param {Array.<number>} point - [x,y]
 * @param {Array.<Array.<number>>} vertices - [[x0, y0], [x1, y1], ... ]
 * @return {boolean}
 */
realityEditor.gui.ar.utilities.insidePoly = function(point, vertices) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    // Copyright (c) 2016 James Halliday
    // The MIT License (MIT)

    var x = point[0], y = point[1];

    if(x <=0 || y <= 0) return false;

    var inside = false;
    for (var i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        var xi = vertices[i][0], yi = vertices[i][1];
        var xj = vertices[j][0], yj = vertices[j][1];

        var intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

/**
 * Returns whether or not the given node's center is within the screen bounds
 * @param {Frame} thisObject - frame containing the node // TODO: does this work with frames now or does it still expect an object?
 * @param {string} nodeKey
 * @return {boolean}
 */
realityEditor.gui.ar.utilities.isNodeWithinScreen = function(thisObject, nodeKey) {
    var thisNode = thisObject.nodes[nodeKey];

    // This is correct, globalStates.height is actually the width (568), while globalStates.width is the height (320)
    // noinspection JSSuspiciousNameCombination
    var screenWidth = globalStates.height;
    // noinspection JSSuspiciousNameCombination
    var screenHeight = globalStates.width;
    
    var screenCorners = [
        [0,0],
        [screenWidth,0],
        [screenWidth,screenHeight],
        [0,screenHeight]
    ];
    return this.insidePoly([thisNode.screenX, thisNode.screenY],screenCorners);
    //console.log(thisNode.name, [thisNode.screenX, thisNode.screenY], isInsideScreen);
};

/**
 * Uses isOutsideViewport to determine which frames are currently visible across all visible objects
 * @return {Array.<string>} - returns frameKeys of all visible frames
 */
realityEditor.gui.ar.utilities.getAllVisibleFramesFast = function() {
    
    var visibleFrameKeys = [];

    var visibleObjects = realityEditor.gui.ar.draw.visibleObjects;
    for (var objectKey in visibleObjects) {
        if (objects[objectKey]) {
            for (var frameKey in objects[objectKey].frames) {
                var frame = realityEditor.getFrame(objectKey, frameKey);
                if (frame) {
                    if (frame.visualization !== 'ar') { continue; }
                    if (!frame.isOutsideViewport) {
                        visibleFrameKeys.push(frameKey);
                    }
                }
            }
        }

    }
    
    return visibleFrameKeys;
};

/**
 * Efficient calculation to determine which frames are visible within the screen bounds.
 * Only AR frames are counted. Considered visible if the rectangular bounding-box of the
 * 3d-transformed div overlaps with the screen bounds at all.
 * @return {Array.<Frame>}
 */
realityEditor.gui.ar.utilities.getAllVisibleFrames = function() {
    // TODO currently this function requires to many resources. It can take up to 5ms to just calculate if frames are visible
   // return true;
    
    var visibleFrames = [];
    
    var visibleObjects = realityEditor.gui.ar.draw.visibleObjects;
    for (var objectKey in visibleObjects) {
        if (!visibleObjects.hasOwnProperty(objectKey)) continue;
        realityEditor.forEachFrameInObject(objectKey, function(objectKey, frameKey) {
            
            var thisFrame = realityEditor.getFrame(objectKey, frameKey);
            
            if (thisFrame.visualization !== 'ar') {
                return;
            }
            
            if (globalDOMCache['iframe' + frameKey]) {
                
                // Use the getBoundingClientRect to check approximate overlap between frame bounds and screen bounds

                var upperLeftScreen = {
                    x: 0,
                    y: 0
                };

                // noinspection JSSuspiciousNameCombination - This is correct, globalStates.height is actually the width
                var bottomRightScreen = {
                    x: globalStates.height,
                    y: globalStates.width
                };

                var frameClientRect = globalDOMCache['iframe' + frameKey].getBoundingClientRect();

                var upperLeftFrame = {
                    x: frameClientRect.left,
                    y: frameClientRect.top
                };

                var bottomRightFrame = {
                    x: frameClientRect.right,
                    y: frameClientRect.bottom
                };

                if (realityEditor.gui.ar.utilities.areRectsOverlapping(upperLeftScreen, bottomRightScreen, upperLeftFrame, bottomRightFrame)) {
                    visibleFrames.push(frameKey);
                }
            }

        });
    }
    
    return visibleFrames;
};

/**
 * Helper method for creating a new 4x4 identity matrix
 * @return {Array.<number>}
 */
realityEditor.gui.ar.utilities.newIdentityMatrix = function() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
};

/**
 * Checks if a 4x4 matrix is the identity matrix.
 * optimized for the cases when it is not, as that is more common in this application.
 * @param {Array.<number>} matrix
 * @param {number|undefined} precision - how many digits  to when checking (to prevent small rounding errors)
 * @return {boolean}
 */
realityEditor.gui.ar.utilities.isIdentityMatrix = function(matrix, precision) {
    precision = precision || 3; // defaults to 3 digits of precision
    // unrolled loop to be faster at expense of longer function body
    if (parseFloat(matrix[0].toFixed(precision)) !== 1) {
        return false;
    }
    if (parseFloat(matrix[1].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[2].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[3].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[4].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[5].toFixed(precision)) !== 1) {
        return false;
    }
    if (parseFloat(matrix[6].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[7].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[8].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[9].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[10].toFixed(precision)) !== 1) {
        return false;
    }
    if (parseFloat(matrix[11].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[12].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[13].toFixed(precision)) !== 0) {
        return false;
    }
    if (parseFloat(matrix[14].toFixed(precision)) !== 0) {
        return false;
    }
    return parseFloat(matrix[15].toFixed(precision)) === 1; // if it got this far, it's the identity iff the last element is 1
};

/**
 * Updates the averageScale property of the object by averaging the scale properties of all its frames and nodes
 * @todo move to another file
 * @param object
 */
realityEditor.gui.ar.utilities.setAverageScale = function(object) {
  var amount = 0;
  var sum = 0;
//  if(!object.frames) return;
    
    if (Object.keys(object.frames).length === 0) {
        object.averageScale = globalStates.defaultScale;
        return; // use default scale if there are no existing frames
    }
    
  for(var frameKey in object.frames){
      if(!object.frames.hasOwnProperty(frameKey)) continue;
     // if(!object.frames[frameKey].ar.size) continue;
      amount++;
      sum = sum+ object.frames[frameKey].ar.scale;
     // if(!object.frames[frameKey].nodes) continue;
      for(var nodeKey in object.frames[frameKey].nodes){
          if(!object.frames[frameKey].nodes.hasOwnProperty(nodeKey)) continue;
        //  if(!object.frames[frameKey].nodes) continue;
          amount++;
          sum = sum+ object.frames[frameKey].nodes[nodeKey].scale; 
      }
  }
    object.averageScale = Math.max(0.01, sum/amount); // TODO: put more thought into minimum scale
};

/**
 * Creates and returns a div with the CSS3D transform needed to position it at an image target's origin
 * @param {string} objectKey
 * @return {HTMLElement}
 */
realityEditor.gui.ar.utilities.getDivWithMarkerTransformation = function(objectKey) {

    let matrixComputationDiv = globalDOMCache['matrixComputationDivForObjects'];
    if (!matrixComputationDiv) {
        // create it if needed
        matrixComputationDiv = document.createElement('div');
        matrixComputationDiv.id = 'matrixComputationDivForObjects';
        matrixComputationDiv.classList.add('main');
        matrixComputationDiv.classList.add('ignorePointerEvents');

        // 3D transforms only apply correctly if it's a child of the GUI container (like the rest of the tools/nodes)
        document.getElementById('GUI').appendChild(matrixComputationDiv);
        globalDOMCache['matrixComputationDivForObjects'] = matrixComputationDiv;
    }

    if (matrixComputationDiv.style.display === 'none') {
        matrixComputationDiv.style.display = '';
    }

    // the computation is only correct if it has the same width/height as the vehicle's transformed element
    matrixComputationDiv.style.width = window.innerWidth + 'px';
    matrixComputationDiv.style.height = window.innerHeight + 'px';

    let untransformedMatrix = realityEditor.sceneGraph.getCSSMatrixWithoutTranslation(objectKey);
    matrixComputationDiv.style.transform = 'matrix3d(' + untransformedMatrix.toString() + ')';

    return matrixComputationDiv;
};

/**
 * tapping on the center of the object matrix should yield (0,0). ranges from [-targetSize/2, targetSize/2]
 * @param {string} objectKey
 * @param {number} screenX
 * @param {number} screenY
 * @return {{x: number, y: number}}
 */
realityEditor.gui.ar.utilities.screenCoordinatesToTargetXY = function(objectKey, screenX, screenY) {

    // set dummy div transform to iframe without x,y,scale
    let matrixComputationDiv = this.getDivWithMarkerTransformation(objectKey);
    let newPosition = webkitConvertPointFromPageToNode(matrixComputationDiv, new WebKitPoint(screenX, screenY));

    return {
        x: newPosition.x - window.innerWidth / 2,
        y: newPosition.y - window.innerHeight / 2
    }
};

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * private helper functions for realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY and realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY (which is used by moveVehicleToScreenCoordinate)
 * @author Ben Reynolds
 * @todo: simplify and then document individually
 */
(function(exports) {

    function solveProjectedCoordinatesInVehicle(thisVehicle, screenX, screenY, cssMatrixToUse) {

        var elementUuid = thisVehicle.uuid || thisVehicle.frameId + thisVehicle.name;
        var overlayDomElement = globalDOMCache[elementUuid];

        // we are looking for the x, y coordinates at z = 0 on the frame
        var point = solveProjectedCoordinates(overlayDomElement, screenX, screenY, 0, cssMatrixToUse);

        return {
            x: point.x,
            y: point.y
        }
    }

    function solveProjectedCoordinates(childDiv, screenX, screenY, projectedZ, cssMatrixToUse) {

        // projectedZ lets you find the projected x,y coordinates that occur on the frame at screenX, screenZ, and that z coordinate
        if (projectedZ === undefined) {
            projectedZ = 0;
        }

        // raycast isn't perfect, so project two rays from screenX, screenY. project from a different Z each time, because they will land on the same line. 
        var dt = 0.1;
        var p0 = convertScreenPointToLocalCoordinatesRelativeToDivParent(childDiv, childDiv.parentElement, screenX, screenY, projectedZ, cssMatrixToUse);
        var p2 = convertScreenPointToLocalCoordinatesRelativeToDivParent(childDiv, childDiv.parentElement, screenX, screenY, (projectedZ + dt), cssMatrixToUse);

        // interpolate to calculate the x,y coordinate that corresponds to z = 0 on the projected plane, based on the two samples

        var dx = (p2[0] - p0[0]) / dt;
        var dy = (p2[1] - p0[1]) / dt;
        var dz = (p2[2] - p0[2]) / dt;
        var neededDt = (p0[2]) / dz;

        return {
            x: p0[0] - dx * neededDt,
            y: p0[1] - dy * neededDt,
            z: p0[2] - dz * neededDt
        }
    }

    function convertScreenPointToLocalCoordinatesRelativeToDivParent(childDiv, transformedDiv, screenX, screenY, screenZ, cssMatrixToUse) {

        // it can either use the hard-coded css 3d matrix provided in the last parameter, or extract one from the transformedDiv element  // TODO: just pass around matrices, not the full css transform... then we can just use the mostRecentFinalMatrix from the frame, or compute based on a matrix without a corresponding DOM element
        if (!cssMatrixToUse) {
            cssMatrixToUse = getTransform(transformedDiv);
        }

        // translation matrix if the element has a different transform origin
        var originTranslationVector = getTransformOrigin(transformedDiv);

        // compute a matrix that fully describes the transformation, including a nonzero origin translation // TODO: learn why this works
        // var fullTx = computeTransformationData(cssMatrixToUse, originTranslationVector);
        var fullTx = computeTransformMatrix(cssMatrixToUse, originTranslationVector);

        // invert and normalize the matrix
        var fullTx_inverse = realityEditor.gui.ar.utilities.invertMatrix(fullTx);
        var fullTx_normalized_inverse = realityEditor.gui.ar.utilities.perspectiveDivide(fullTx_inverse);

        var screenPoint = [screenX, screenY, screenZ, 1];

        // multiply the screen point by the inverse matrix, and divide by the W coordinate to get the real position
        return realityEditor.gui.ar.utilities.perspectiveDivide(transformVertex(fullTx_normalized_inverse, screenPoint));
    }

    // TODO: find out why we need to compute N = T^{-1}MT
    function computeTransformMatrix(transformationMatrix, originTranslationVector)
    {
        var x = originTranslationVector[0];
        var y = originTranslationVector[1];
        var z = originTranslationVector[2];
        var undoTranslationMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1];
        var redoTranslationMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
        var temp1 = [];
        var out = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(undoTranslationMatrix, transformationMatrix, temp1);
        realityEditor.gui.ar.utilities.multiplyMatrix(temp1, redoTranslationMatrix, out);
        return out;
    }

    /**
     * Helper function that extracts a 4x4 matrix from the element's CSS matrix3d
     * @param {HTMLElement} ele
     * @return {Array.<number>}
     */
    function getTransform(ele) {
        // var st = window.getComputedStyle(ele, null);
        // tr = st.getPropertyValue("-webkit-transform") ||
        //     st.getPropertyValue("-moz-transform") ||
        //     st.getPropertyValue("-ms-transform") ||
        //     st.getPropertyValue("-o-transform") ||
        //     st.getPropertyValue("transform");

        var tr = ele.style.webkitTransform;
        if (!tr) {
            return realityEditor.gui.ar.utilities.newIdentityMatrix();
        }

        var values = tr.split('(')[1].split(')')[0].split(',');

        var out = [ 0, 0, 0, 1 ];
        for (var i = 0; i < values.length; ++i) {
            out[i] = parseFloat(values[i]);
        }

        return out;
    }

    function getTransformOrigin(element) {

        var out = [ 0, 0, 0, 1 ];

        // this is a speedup that works for the frames we currently use. might need to remove in the future if it messes anything up
        if (element.style.transformOrigin) {
            var st = window.getComputedStyle(element, null);
            var tr = st.getPropertyValue("-webkit-transform-origin") ||
                st.getPropertyValue("-moz-transform-origin") ||
                st.getPropertyValue("-ms-transform-origin") ||
                st.getPropertyValue("-o-transform-origin") ||
                st.getPropertyValue("transform-origin");

            var values = tr.split(' ');

            for (var i = 0; i < values.length; ++i) {
                out[i] = parseInt(values[i]);
            }
        } else {
            out[0] = parseInt(element.style.width)/2;
            out[1] = parseInt(element.style.height)/2;
        }

        return out;
    }

    function transformVertex(mat, ver) {
        var out = [0,0,0,0];

        for (var i = 0; i < 4; i++) {
            var sum = 0;
            for (var j = 0; j < 4; j++) {
                sum += mat[i + j * 4] * ver[j];
            }
            out[i] = sum;
        }

        return out;
    }

    exports.getTransform = getTransform;
    exports.solveProjectedCoordinatesInVehicle = solveProjectedCoordinatesInVehicle;

}(realityEditor.gui.ar.utilities));

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc Uses Pythagorean theorem to return the 3D distance to the origin of the transformation matrix.
 * @param {Array} matrix of the point - should be provided in the format taken from gui.ar.draw.modelViewMatrices
 * @return {number} distance
 */
realityEditor.gui.ar.utilities.distance = function (matrix) {
    var distance = 1000; // for now give a valid value as a fallback
    try {
        if (realityEditor.device.environment.distanceRequiresCameraTransform()) {
            // calculate distance to camera
            var matrixToCamera = [];
            realityEditor.gui.ar.utilities.multiplyMatrix(matrix, realityEditor.sceneGraph.getViewMatrix(), matrixToCamera);
            matrix = matrixToCamera;
        }
        distance = Math.sqrt(Math.pow(matrix[12], 2) + Math.pow(matrix[13], 2) + Math.pow(matrix[14], 2));
    } catch (e) {
        console.warn('trying to calculate distance of ', matrix);
    }
    return distance;
};

/**
 * Returns a matrix containing the inverse rotation of the 4x4 matrix passed in
 * @param {Array.<number>} m
 * @return {Array.<number>}
 */
realityEditor.gui.ar.utilities.invertRotationMatrix = function(m) {
    var mInv = [];
    
    // transpose the first 3x3, identity for the rest
    mInv[0] = m[0];
    mInv[1] = m[4];
    mInv[2] = m[8];
    mInv[3] = 0;
    mInv[4] = m[1];
    mInv[5] = m[5];
    mInv[6] = m[9];
    mInv[7] = 0;
    mInv[8] = m[2];
    mInv[9] = m[6];
    mInv[10] = m[10];
    mInv[11] = 0;
    mInv[12] = 0;
    mInv[13] = 0;
    mInv[14] = 0;
    mInv[15] = 1;
    
    return mInv;
};

/**
 * Extracts rotation information from a 4x4 transformation matrix
 * @param {Array.<number>} m - a 4x4 transformation matrix
 * @author https://answers.unity.com/questions/11363/converting-matrix4x4-to-quaternion-vector3.html
 */
realityEditor.gui.ar.utilities.getQuaternionFromMatrix = function(m) {

    // create identity Quaternion structure as a placeholder
    var q = { x: 0, y: 0, z: 0, w: 1 };
    
    if (m.length === 0) { return q; } // also works to set m = this.newIdentityMatrix();

    q.w = Math.sqrt( Math.max( 0, 1 + m[0] + m[5] + m[10] ) ) / 2;
    q.x = Math.sqrt( Math.max( 0, 1 + m[0] - m[5] - m[10] ) ) / 2;
    q.y = Math.sqrt( Math.max( 0, 1 - m[0] + m[5] - m[10] ) ) / 2;
    q.z = Math.sqrt( Math.max( 0, 1 - m[0] - m[5] + m[10] ) ) / 2;
    q.x *= Math.sign( q.x * ( m[6] - m[9] ) );
    q.y *= Math.sign( q.y * ( m[8] - m[2] ) );
    q.z *= Math.sign( q.z * ( m[1] - m[4] ) );
    
    return q;
};

realityEditor.gui.ar.utilities.convertQuaternionHandedness = function(q) {
    q.x *= -1;
    q.y *= -1;
    q.z *= -1;
    return q;
};

// realityEditor.gui.ar.utilities.quaternionMagnitude = function(q) {
//     // var identity = { x: 0, y: 0, z: 0, w: 1 };
//     // qRot = q * inverse(identity); // identity inversed is still identity. identity multiplied by q gives q.
//     var magnitude = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
//     var pureMagnitude = 2 * Math.atan2(magnitude, q.w);
//     return pureMagnitude;
//     // var mappedMagnitude = (pureMagnitude / (2 * Math.atan2(1, 1)));
//     // return Math.sqrt( Math.max(0, Math.min(1, (mappedMagnitude - 1.0) * 4)) );
// };

realityEditor.gui.ar.utilities.quaternionToEulerAngles = function(q) { // TODO: rename to getEulerAnglesFromQuaternion to be consistent
    var phi = Math.atan2(q.z * q.w + q.x * q.y, 0.5 - (q.y * q.y + q.z * q.z));
    var theta = Math.asin(-2 * (q.y * q.w - q.x * q.z));
    var psi = Math.atan2(q.y * q.z + q.x * q.w, 0.5 - (q.z * q.z + q.w * q.w));
    return {
        phi: phi,
        theta: theta,
        psi: psi
    }
};

/**
 * Tells you how much the frame was rotated by twisting the x-axis
 * @param m
 * @return {number}
 */
realityEditor.gui.ar.utilities.getRotationAboutAxisX = function(m) {
    var q = this.getQuaternionFromMatrix(m);
    var angles = this.quaternionToEulerAngles(q);
    return angles.theta;
};

/**
 * Tells you how much the frame was rotated by twisting the y-axis
 * @param m
 * @return {number}
 */
realityEditor.gui.ar.utilities.getRotationAboutAxisY = function(m) {
    var q = this.getQuaternionFromMatrix(m);
    var angles = this.quaternionToEulerAngles(q);
    return angles.psi;
};

/**
 * Tells you how much the frame was rotated by twisting the z-axis
 * @param m
 * @return {number}
 */
realityEditor.gui.ar.utilities.getRotationAboutAxisZ = function(m) {
    var q = this.getQuaternionFromMatrix(m);
    var angles = this.quaternionToEulerAngles(q);
    return angles.phi;
};


realityEditor.gui.ar.utilities.getMatrixFromQuaternion = function(q) {

    // Matrix<float, 4>(
    //     1.0f - 2.0f*qy*qy - 2.0f*qz*qz, 2.0f*qx*qy - 2.0f*qz*qw, 2.0f*qx*qz + 2.0f*qy*qw, 0.0f,
    //     2.0f*qx*qy + 2.0f*qz*qw, 1.0f - 2.0f*qx*qx - 2.0f*qz*qz, 2.0f*qy*qz - 2.0f*qx*qw, 0.0f,
    //     2.0f*qx*qz - 2.0f*qy*qw, 2.0f*qy*qz + 2.0f*qx*qw, 1.0f - 2.0f*qx*qx - 2.0f*qy*qy, 0.0f,
    //     0.0f, 0.0f, 0.0f, 1.0f);

    var m = [];
    m[0] = 1.0 - 2.0 * q.y * q.y - 2.0 * q.z * q.z;
    m[1] = 2.0 * q.x * q.y - 2.0 * q.z * q.w;
    m[2] = 2.0 * q.x * q.z + 2.0 * q.y * q.w;
    m[3] = 0;
    
    m[4] = 2.0 * q.x * q.y + 2.0 * q.z * q.w;
    m[5] = 1.0 - 2.0 * q.x * q.x - 2.0 * q.z * q.z;
    m[6] = 2.0 * q.y * q.z - 2.0 * q.x * q.w;
    m[7] = 0;
    
    m[8] = 2.0 * q.x * q.z - 2.0 * q.y * q.w;
    m[9] = 2.0 * q.y * q.z + 2.0 * q.x * q.w;
    m[10] = 1.0 - 2.0 * q.x * q.x - 2.0 * q.y * q.y;
    m[11] = 0;

    m[12] = 0;
    m[13] = 0;
    m[14] = 0;
    m[15] = 1;

    return m;
};

realityEditor.gui.ar.utilities.normalizeQuaternion = function(q) {
    var n = 1.0 / Math.sqrt(q.x*q.x + q.y*q.y + q.z*q.z + q.w*q.w);
    q.x *= n;
    q.y *= n;
    q.z *= n;
    q.w *= n;
    return q;
};

realityEditor.gui.ar.utilities.invertQuaternion = function(q) {
    var d = q.x*q.x + q.y*q.y + q.z*q.z + q.w*q.w;
    return {
        x: q.x/d,
        y: -q.y/d,
        z: -q.z/d,
        w: -q.w/d
    }
};

/**
 * @author https://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles
 * @param {number} pitch
 * @param {number} roll
 * @param {number} yaw
 * @return {q}
 */
realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw = function(pitch, roll, yaw) {

    // create identity Quaternion structure as a placeholder
    var q = { x: 0, y: 0, z: 0, w: 1 };
    
    // Abbreviations for the various angular functions
    var cy = Math.cos(yaw * 0.5);
    var sy = Math.sin(yaw * 0.5);
    var cr = Math.cos(roll * 0.5);
    var sr = Math.sin(roll * 0.5);
    var cp = Math.cos(pitch * 0.5);
    var sp = Math.sin(pitch * 0.5);

    q.w = cy * cr * cp + sy * sr * sp;
    q.x = cy * sr * cp - sy * cr * sp;
    q.y = cy * cr * sp + sy * sr * cp;
    q.z = sy * cr * cp - cy * sr * sp;
    return q;
};

/**
 * Normalizes a 4x4 transformation matrix by dividing by the last element
 * @param m
 * @return {Array<number>}
 */
realityEditor.gui.ar.utilities.normalizeMatrix = function(m) {
    var divisor = m[15];
    return this.scalarMultiplyMatrix(m, (1.0/divisor));
};

/**
 * A helper function that extracts the rotation matrix from a 4x4 transformation matrix,
 * and optionally inverts any combination of the axes of rotation
 * @param {Array.<number>} matrix
 * @param {boolean} flipX
 * @param {boolean} flipY
 * @param {boolean} flipZ
 * @return {Array.<number>}
 */
realityEditor.gui.ar.utilities.extractRotation = function(matrix, flipX, flipY, flipZ) {
    var q = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(matrix);
    if (flipX || flipY || flipZ) {
        var eulerAngles = realityEditor.gui.ar.utilities.quaternionToEulerAngles(q);
        if (flipX) {
            eulerAngles.theta *= -1; // flips first axis of rotation (yaw)
        }
        if (flipY) {
            eulerAngles.psi *= -1; // flips second axis of rotation (pitch)
        }
        if (flipZ) {
            eulerAngles.phi *= -1; // flips third axis of rotation (roll)
        }
        q = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(eulerAngles.theta, eulerAngles.psi, eulerAngles.phi);
    }
    return realityEditor.gui.ar.utilities.getMatrixFromQuaternion(q);
};

/**
 * A helper function that extracts the rotation matrix from a 4x4 transformation matrix,
 * and optionally inverts any combination of the axes of rotation
 * @param {Array.<number>} matrix
 * @return {Array.<number>}
 */
realityEditor.gui.ar.utilities.extractRotationTemp = function(matrix) {
    var q = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(matrix);
    return realityEditor.gui.ar.utilities.getMatrixFromQuaternion(this.convertQuaternionHandedness(q));
};

/**
 * Helper function that extracts the x,y,z translation elements from a 4x4 transformation matrix,
 * and optionally inverts any combination of the axes of translation
 * @param {Array.<number>} matrix
 * @param {boolean} flipX
 * @param {boolean} flipY
 * @param {boolean} flipZ
 * @return {Array.<number>}
 */
realityEditor.gui.ar.utilities.extractTranslation = function(matrix, flipX, flipY, flipZ) {
    var translationMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
    translationMatrix[12] = matrix[12];
    translationMatrix[13] = matrix[13];
    translationMatrix[14] = matrix[14];

    if (flipX) {
        translationMatrix[12] *= -1; // flips first axis of translation
    }
    if (flipY) {
        translationMatrix[13] *= -1; // flips second axis of translation
    }
    if (flipZ) {
        translationMatrix[14] *= -1; // flips third axis of translation
    }
    
    return translationMatrix;
};

realityEditor.gui.ar.utilities.mToggle_YZ = [
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, 1, 0, 0,
    0, 0, 0, 1
];

/**
 * @param matrix
 * @return {*}
 */
realityEditor.gui.ar.utilities.convertMatrixHandedness = function(matrix) {
    var m2 = [];
    this.multiplyMatrix(this.mToggle_YZ, matrix, m2);
    return m2;
};

realityEditor.gui.ar.utilities.tweenMatrix = function(currentMatrix, destination, tweenSpeed) {
    if (typeof tweenSpeed === 'undefined') { tweenSpeed = 0.5; } // default value

    if (currentMatrix.length !== destination.length) {
        console.warn('matrices are inequal lengths. cannot be tweened so just assigning current=destination');
        return realityEditor.gui.ar.utilities.copyMatrix(destination);
    }
    if (tweenSpeed <= 0 || tweenSpeed >= 1) {
        return realityEditor.gui.ar.utilities.copyMatrix(destination);
    }

    let m = [];
    for (let i = 0; i < currentMatrix.length; i++) {
        m[i] = destination[i] * tweenSpeed + currentMatrix[i] * (1.0 - tweenSpeed);
    }
    return m;
}

realityEditor.gui.ar.utilities.animationVectorLinear = function(currentVector, newVector, maxSpeed) {
    if (typeof maxSpeed === 'undefined') { maxSpeed = 100; } // default value

    if (currentVector.length !== newVector.length) {
        console.warn('matrices are inequal lengths. cannot be tweened so just assigning current=destination');
        return JSON.parse(JSON.stringify(newVector));
    }
    if (maxSpeed <= 0) {
        return JSON.parse(JSON.stringify(currentVector));
    }

    let diff = [];
    for (let i = 0; i < currentVector.length; i++) {
        diff[i] = newVector[i] - currentVector[i];
    }
    let distanceSquared = 0;
    for (let i = 0; i < diff.length; i++) {
        distanceSquared += diff[i] * diff[i];
    }
    let distance = Math.sqrt(distanceSquared);
    if (distance === 0) {
        return JSON.parse(JSON.stringify(currentVector));
    }
    
    let percentMotion = Math.max(0, Math.min(1, maxSpeed / distance));
    let result = [];
    for (let i = 0; i < currentVector.length; i++) {
        result[i] = newVector[i] * percentMotion + currentVector[i] * (1.0 - percentMotion);
    }
    return result;
}

/**
 * Simple, custom made Matrix data structure for working with transformation matrices
 * 
 * @param {Array.<number>} array
 * @param {number|undefined} numRows - can be omitted if matrix is square
 * @param {number|undefined} numCols - can be omitted if matrix is square
 * @param {boolean} isRowMajor - by default, we use column-major matrices. pass in true if array is in row-major form
 * @constructor
 */
function Matrix(array, numRows, numCols, isRowMajor) {
    
    if (typeof numRows === 'undefined' && typeof numCols === 'undefined') {
        if (array.length > 0 && Math.sqrt(array.length) % 1 === 0) {
            numRows = Math.sqrt(array.length);
            numCols = Math.sqrt(array.length);
        } else {
            throw new Error('cannot create non-square Matrix without specifying shape!');
        }
    } else if (numRows * numCols !== array.length) {
        throw new Error('invalid shape (' + numRows + ' x ' + numCols + ') to form Matrix from array of length ' + array.length);
    }
    
    this.array = array;
    this.numRows = numRows;
    this.numCols = numCols;
    this.isRowMajor = isRowMajor;
    
    this.isSquare = numRows === numCols;
    
    // create un-flattened representation of the matrix from the flattened array
    this.mat = [];
    if (isRowMajor) {
        for (let r = 0; r < numRows; r++) {
            var row = [];
            for (let c = 0; c < numCols; c++) {
                row[c] = array[r * numCols + c];
            }
            this.mat.push(row);
        }
    } else {
        for (let c = 0; c < numCols; c++) {
            var col = [];
            for (let r = 0; r < numRows; r++) {
                col[r] = array[r * numCols + c];
            }
            this.mat.push(col);
        }
    }
}

Matrix.prototype.determinant = function() {
    if (!this.isSquare) { throw new Error('cannot calculate determinant of non-square Matrix'); }
    
    // base case
    if (this.numRows === 2) {
        return this.mat[0][0] * this.mat[1][1] - this.mat[0][1] * this.mat[1][0];
    }
};

Matrix.prototype.arrayIndex = function(row, col) {
    if (this.isRowMajor) {
        return row * this.numCols + col;
    } else {
        return col * this.numRows + row;
    }
};

Matrix.prototype.clone = function() {
    return new Matrix(this.array, this.numRows, this.numCols, this.isRowMajor);
};

Matrix.prototype.unflattened = function() {
    return this.mat;
};

// polyfill webkit functions on Chrome browser
if (typeof window.webkitConvertPointFromPageToNode === 'undefined') {
    console.log('Polyfilling webkitConvertPointFromPageToNode for this browser');

    polyfillWebkitConvertPointFromPageToNode();

    var ssEl = document.createElement('style'),
        css = '.or{position:absolute;opacity:0;height:33.333%;width:33.333%;top:0;left:0}.or.r-2{left:33.333%}.or.r-3{left:66.666%}.or.r-4{top:33.333%}.or.r-5{top:33.333%;left:33.333%}.or.r-6{top:33.333%;left:66.666%}.or.r-7{top:66.666%}.or.r-8{top:66.666%;left:33.333%}.or.r-9{top:66.666%;left:66.666%}';
    ssEl.type = 'text/css';
    (ssEl.styleSheet) ?
        ssEl.styleSheet.cssText = css :
        ssEl.appendChild(document.createTextNode(css));
    document.getElementsByTagName('head')[0].appendChild(ssEl);
}

/**
 * Based off of https://gist.github.com/Yaffle/1145197 with modifications to
 * support more complex matrices
 */
function polyfillWebkitConvertPointFromPageToNode() {
    const identity = new DOMMatrix([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);

    if (!window.WebKitPoint) {
        window.WebKitPoint = DOMPoint;
    }

    function getTransformationMatrix(element) {
        var transformationMatrix = identity;
        var x = element;

        while (x !== undefined && x !== x.ownerDocument.documentElement) {
            var computedStyle = window.getComputedStyle(x);
            var transform = computedStyle.transform || "none";
            var c = transform === "none" ? identity : new DOMMatrix(transform);

            transformationMatrix = c.multiply(transformationMatrix);
            x = x.parentNode;
        }

        // Normalize current matrix to have m44=1 (w = 1). Math does not work
        // otherwise because nothing knows how to scale based on w
        let baseArr = transformationMatrix.toFloat64Array();
        baseArr = baseArr.map(b => b / baseArr[15]);
        transformationMatrix = new DOMMatrix(baseArr);

        var w = element.offsetWidth;
        var h = element.offsetHeight;
        var i = 4;
        var left = +Infinity;
        var top = +Infinity;
        while (--i >= 0) {
            var p = transformationMatrix.transformPoint(new DOMPoint(i === 0 || i === 1 ? 0 : w, i === 0 || i === 3 ? 0 : h, 0));
            if (p.x < left) {
                left = p.x;
            }
            if (p.y < top) {
                top = p.y;
            }
        }
        var rect = element.getBoundingClientRect();
        transformationMatrix = identity.translate(window.pageXOffset + rect.left - left, window.pageYOffset + rect.top - top, 0).multiply(transformationMatrix);
        return transformationMatrix;
    }

    window.convertPointFromPageToNode = window.webkitConvertPointFromPageToNode = function (element, point) {
        let mati = getTransformationMatrix(element).inverse();
        // This involves a lot of math, sorry.
        // Given $v = M^{-1}p$ we have p.x, p.y, p.w, M^{-1}, and know that v.z
        // should be equal to 0.
        // Solving for p.z we get the following:
        let projectedZ = -(mati.m13 * point.x + mati.m23 * point.y + mati.m43) / mati.m33;
        return mati.transformPoint(new DOMPoint(point.x, point.y, projectedZ));
    };

    window.convertPointFromNodeToPage = function (element, point) {
        return getTransformationMatrix(element).transformPoint(point);
    };
}

(function(exports) {
    function lookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ) {
        var ev = [eyeX, eyeY, eyeZ];
        var cv = [centerX, centerY, centerZ];
        var uv = [upX, upY, upZ];

        var n = normalize(add(ev, negate(cv))); // vector from the camera to the center point
        var u = normalize(crossProduct(uv, n)); // a "right" vector, orthogonal to n and the lookup vector
        var v = crossProduct(n, u); // resulting orthogonal vector to n and u, as the up vector isn't necessarily one anymore

        return [u[0], v[0], n[0], 0,
            u[1], v[1], n[1], 0,
            u[2], v[2], n[2], 0,
            dotProduct(negate(u), ev), dotProduct(negate(v), ev), dotProduct(negate(n), ev), 1];
    }

    function _scalarMultiply(A, x) {
        return [A[0] * x, A[1] * x, A[2] * x];
    }

    function negate(A) {
        return [-A[0], -A[1], -A[2]];
    }

    function add(A, B) {
        return [A[0] + B[0], A[1] + B[1], A[2] + B[2]];
    }

    function magnitude(A) {
        return Math.sqrt(A[0] * A[0] + A[1] * A[1] + A[2] * A[2]);
    }

    function normalize(A) {
        var mag = magnitude(A);
        return [A[0] / mag, A[1] / mag, A[2] / mag];
    }

    function crossProduct(A, B) {
        var a = A[1] * B[2] - A[2] * B[1];
        var b = A[2] * B[0] - A[0] * B[2];
        var c = A[0] * B[1] - A[1] * B[0];
        return [a, b, c];
    }

    function dotProduct(A, B) {
        return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
    }

    function getRightVector(M) {
        return normalize([M[0], M[1], M[2]]);
    }

    function getUpVector(M) {
        return normalize([M[4], M[5], M[6]]);
    }

    function getForwardVector(M) {
        return normalize([M[8], M[9], M[10]]);
    }

    exports.lookAt = lookAt;
    exports.negate = negate;
    exports.add = add;
    exports.magnitude = magnitude;
    exports.normalize = normalize;
    exports.crossProduct = crossProduct;
    exports.dotProduct = dotProduct;
    exports.getRightVector = getRightVector;
    exports.getUpVector = getUpVector;
    exports.getForwardVector = getForwardVector;
})(realityEditor.gui.ar.utilities);
