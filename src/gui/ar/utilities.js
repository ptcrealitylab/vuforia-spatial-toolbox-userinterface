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
 * @param {Array.<number>} matrix
 */
realityEditor.gui.ar.utilities.prettyPrintMatrix = function(matrix) {
    // Note that this assumes, row-major order, while CSS 3D matrices actually use column-major
    // Interpret column-major matrices as the transpose of what is printed
    
    console.log("[ " + matrix[0] + ", " + matrix[1] + ", " + matrix[2] + ", " + matrix[3] + ", \n" +
                "  " + matrix[4] + ", " + matrix[5] + ", " + matrix[6] + ", " + matrix[7] + ", \n" +
                "  " + matrix[8] + ", " + matrix[9] + ", " + matrix[10] + ", " + matrix[11] + ", \n" +
                "  " + matrix[12] + ", " + matrix[13] + ", " + matrix[14] + ", " + matrix[15] + " ]" );
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
 * Efficient calculation to determine which frames are visible within the screen bounds.
 * Only AR frames are counted. Considered visible if the rectangular bounding-box of the
 * 3d-transformed div overlaps with the screen bounds at all.
 * @return {Array.<Frame>}
 */
realityEditor.gui.ar.utilities.getAllVisibleFrames = function() {
    
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

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * private helper functions for realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY and realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY (which is used by moveVehicleToScreenCoordinate)
 * @author Ben Reynolds
 * @todo: simplify and then document individually
 */
(function(exports) {

    function screenCoordinatesToMarkerXY(objectKey, screenX, screenY, unconstrainedMatrix) {
        
        var visibleObjectMatrix = realityEditor.gui.ar.draw.visibleObjects[objectKey];
        if (visibleObjectMatrix) {
            
            var point = {
                x: 0,
                y: 0
            };
            
            if (unconstrainedMatrix) {
                var finalMatrix = unconstrainedMatrix;
                point = screenCoordinatesToMatrixXY_finalMatrix(finalMatrix, screenX, screenY, true);
            } else {
                var finalMatrix = computeFinalMatrixFromMarkerMatrix(visibleObjectMatrix);
                point = screenCoordinatesToMatrixXY_finalMatrix(finalMatrix, screenX, screenY, true);
            }
            
            return {
                x: point.x - globalStates.height/2, // 284
                y: point.y - globalStates.width/2 // 160
            }
        }
        
        else {
            console.warn('this object is not visible, cannot determine its ray projection');
            return {
                x: 0,
                y: 0
            }
        }
    }
    
    function computeFinalMatrixFromMarkerMatrix(markerMatrix) {
        var finalMatrix = [];

        var draw = realityEditor.gui.ar.draw;
        var activeObjectMatrix = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(markerMatrix, globalStates.projectionMatrix, draw.matrix.r);
        realityEditor.gui.ar.utilities.multiplyMatrix(draw.rotateX, draw.matrix.r, activeObjectMatrix);

        // console.log(activeObjectMatrix);
        
        // TODO: can we remove this last multiplication since the marker always has pos (0,0) and scale 1 ??
        var positionData = {
            scale: 1.0,
            x: 0,
            y: 0
        };
        draw.matrix.r3 = [
            positionData.scale, 0, 0, 0,
            0, positionData.scale, 0, 0,
            0, 0, 1, 0,
            positionData.x, positionData.y, 0, 1
        ];
        realityEditor.gui.ar.utilities.multiplyMatrix(draw.matrix.r3, activeObjectMatrix, finalMatrix);
        
        return finalMatrix;
    }
    
    function undoTranslationAndScale(finalMatrix) {
        return finalMatrix;
    }
    
    function screenCoordinatesToMatrixXY_finalMatrix(finalMatrix, screenX, screenY, relativeToMarker) {
        if (relativeToMarker) {
            finalMatrix = undoTranslationAndScale(finalMatrix);
        }
        // var results = {};

        // var point = solveProjectedCoordinates(overlayDomElement, screenX, screenY, projectedZ, cssMatrixToUse);
        // projectedZ lets you find the projected x,y coordinates that occur on the frame at screenX, screenZ, and that z coordinate

        var screenZ = 0; // You are looking for the x, y coordinates at z = 0 on the frame

        // raycast isn't perfect, so project two rays from screenX, screenY. project from a different Z each time, because they will land on the same line. 
        var dt = 0.1;
        // var p0 = convertScreenPointToLocalCoordinatesRelativeToDivParent(childDiv, childDiv.parentElement, screenX, screenY, projectedZ, cssMatrixToUse);

        // it can either use the hard-coded css 3d matrix provided in the last parameter, or extract one from the transformedDiv element  // TODO: just pass around matrices, not the full css transform... then we can just use the mostRecentFinalMatrix from the frame, or compute based on a matrix without a corresponding DOM element
        
        // translation matrix if the element has a different transform origin
        // var originTranslationVector = getTransformOrigin(transformedDiv);
        var originTranslationVector = [284, 160, 0, 1];

        // compute a matrix that fully describes the transformation, including a nonzero origin translation // TODO: learn why this works
        // var fullTx = computeTransformationData(cssMatrixToUse, originTranslationVector);
        var fullTx = computeTransformMatrix(finalMatrix, originTranslationVector);
        // var fullTx = finalMatrix;

        // invert and normalize the matrix
        var fullTx_inverse = realityEditor.gui.ar.utilities.invertMatrix(fullTx);
        var fullTx_normalized_inverse = realityEditor.gui.ar.utilities.perspectiveDivide(fullTx_inverse);

        var screenPoint0 = [screenX, screenY, screenZ, 1];
        // multiply the screen point by the inverse matrix, and divide by the W coordinate to get the real position
        p0 = realityEditor.gui.ar.utilities.perspectiveDivide(transformVertex(fullTx_normalized_inverse, screenPoint0));
        
        var screenPoint2 = [screenX, screenY, screenZ + dt, 1];
        p2 = realityEditor.gui.ar.utilities.perspectiveDivide(transformVertex(fullTx_normalized_inverse, screenPoint2));

        // interpolate to calculate the x,y coordinate that corresponds to z = 0 on the projected plane, based on the two samples

        var dx = (p2[0] - p0[0]) / dt;
        var dy = (p2[1] - p0[1]) / dt;
        var dz = (p2[2] - p0[2]) / dt;
        var neededDt = (p0[2]) / dz; // TODO: make sure I don't divide by zero
        var x = p0[0] - dx * neededDt;
        var y = p0[1] - dy * neededDt;
        var z = p0[2] - dz * neededDt;

        point = {
            x: x,
            y: y,
            z: z
        };

        // var left = parseInt(overlayDomElement.style.left);
        // if (isNaN(left)) {
        //     left = 0;
        // }
        // var top = parseInt(overlayDomElement.style.top);
        // if (isNaN(top)) {
        //     top = 0;
        // }

        // return {
        //     point: point,
        //     offsetLeft: left,
        //     offsetTop: top
        // }
        
        return {
            x: point.x,
            y: point.y
        }
    }

    /**
     * 
     * @param {Frame|Node} thisVehicle - 
     * @param {Number} screenX - x coordinate on the screen plane
     * @param {Number} screenY - y coordinate on the screen plane
     * @param {boolean} relativeToMarker - true if you want the position relative to (0,0) on the marker, not thisVehicle's existing translation
     * @return {{point (x,y,z), offsetLeft, offsetTop}}
     */
    function screenCoordinatesToMatrixXY(thisVehicle, screenX, screenY, relativeToMarker) {

        var positionData;
        var previousPosition;
        var updatedCssMatrix;
        
        // first undo the frame's relative position, so that the result will be absolute position compared to marker, not div
        if (relativeToMarker) {
            positionData = realityEditor.gui.ar.positioning.getPositionData(thisVehicle);

            if (positionData.x !== 0 || positionData.y !== 0 || positionData.scale !== 1) {
                previousPosition = {
                    x: positionData.x,
                    y: positionData.y,
                    scale: positionData.scale
                };
                positionData.x = 0;
                positionData.y = 0;
                positionData.scale = 1;
                var draw = realityEditor.gui.ar.draw;
                var elementUuid = thisVehicle.uuid || thisVehicle.frameId + thisVehicle.name;
                updatedCssMatrix = draw.recomputeTransformMatrix(draw.visibleObjects, thisVehicle.objectId, elementUuid, thisVehicle.type, thisVehicle, false, globalDOMCache, globalStates, globalCanvas, draw.activeObjectMatrix, draw.matrix, draw.finalMatrix, draw.utilities, draw.nodeCalculations, cout);
            }
        }
        
        var results = solveProjectedCoordinatesInVehicle(thisVehicle, screenX, screenY, updatedCssMatrix);
        
        // restore the frame's relative position that nothing visually changes due to this computation
        if (previousPosition) {
            positionData.x = previousPosition.x;
            positionData.y = previousPosition.y;
            positionData.scale = previousPosition.scale;
        }
        
        return results;
    }
    
    function solveProjectedCoordinatesInVehicle(thisVehicle, screenX, screenY, cssMatrixToUse) {

        var elementUuid = thisVehicle.uuid || thisVehicle.frameId + thisVehicle.name;
        var overlayDomElement = globalDOMCache[elementUuid];
        
        var projectedZ = 0; // You are looking for the x, y coordinates at z = 0 on the frame
        var point = solveProjectedCoordinates(overlayDomElement, screenX, screenY, projectedZ, cssMatrixToUse);

        var left = parseInt(overlayDomElement.style.left);
        if (isNaN(left)) {
            left = 0;
        }
        var top = parseInt(overlayDomElement.style.top);
        if (isNaN(top)) {
            top = 0;
        }
        
        return {
            point: point,
            offsetLeft: left,
            offsetTop: top
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
        var neededDt = (p0[2]) / dz; // TODO: make sure I don't divide by zero
        var x = p0[0] - dx * neededDt;
        var y = p0[1] - dy * neededDt;
        var z = p0[2] - dz * neededDt;

        return {
            x: x,
            y: y,
            z: z
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

    function getTransform(ele) {
        // var st = window.getComputedStyle(ele, null);
        // tr = st.getPropertyValue("-webkit-transform") ||
        //     st.getPropertyValue("-moz-transform") ||
        //     st.getPropertyValue("-ms-transform") ||
        //     st.getPropertyValue("-o-transform") ||
        //     st.getPropertyValue("transform");
        
        var tr = ele.style.webkitTransform;

        var values = tr.split('(')[1].split(')')[0].split(',');
        
        var out = [ 0, 0, 0, 1 ];
        for (var i = 0; i < values.length; ++i) {
            out[i] = parseFloat(values[i]);
        }

        return out;
    }

    function getTransformOrigin(element) {
        var st = window.getComputedStyle(element, null);
        var tr = st.getPropertyValue("-webkit-transform-origin") ||
            st.getPropertyValue("-moz-transform-origin") ||
            st.getPropertyValue("-ms-transform-origin") ||
            st.getPropertyValue("-o-transform-origin") ||
            st.getPropertyValue("transform-origin");

        var values = tr.split(' ');

        var out = [ 0, 0, 0, 1 ];
        for (var i = 0; i < values.length; ++i) {
            out[i] = parseInt(values[i]);
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

    exports.screenCoordinatesToMatrixXY = screenCoordinatesToMatrixXY;
    exports.screenCoordinatesToMarkerXY = screenCoordinatesToMarkerXY;
    exports.screenCoordinatesToMatrixXY_finalMatrix = screenCoordinatesToMatrixXY_finalMatrix;
    exports.computeFinalMatrixFromMarkerMatrix = computeFinalMatrixFromMarkerMatrix;
    
}(realityEditor.gui.ar.utilities));

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * private helper functions for realityEditor.gui.ar.utilities.drawMarkerPlaneIntersection
 * @author Ben Reynolds
 * @todo: simplify and then document individually
 */
(function(exports) {
    
    /**
     * @desc Given a 4x4 transformation matrix and an x, y coordinate pair,
     calculates the z-position of the ring point
     * @return {Number|Array} the ring z-coordinate
     * @author Ben Reynolds
     **/
    function getCenterOfPoints(points) {
        if (points.length < 1) {
            return [0, 0];
        }
        var sumX = 0;
        var sumY = 0;
        points.forEach(function (point) {
            sumX += point[0];
            sumY += point[1];
        });
        var avgX = sumX / points.length;
        var avgY = sumY / points.length;
        return [avgX, avgY];
    }
    
    /**
     * @desc
     * @param {Number|Array} points
     * @return {Number|Array}
     **/
    
    function sortPointsClockwise(points) {
        var centerPoint = getCenterOfPoints(points);
        var centerX = centerPoint[0];
        var centerY = centerPoint[1];
        return points.sort(function (a, b) {
            var atanA = Math.atan2(a[1] - centerY, a[0] - centerX);
            var atanB = Math.atan2(b[1] - centerY, b[0] - centerX);
            if (atanA < atanB) return -1;
            else if (atanB > atanA) return 1;
            return 0;
        });
    }
    
    /**
     * @desc
     * @param {Object} thisSVG
     **/
    
    function getCornersClockwise(thisSVG) {

        var w = parseInt(thisSVG.style.width, 10);
        var h = parseInt(thisSVG.style.height, 10);
        
        return [[0, 0, 0],
            [w, 0, 0],
            [w, h, 0],
            [0, h, 0]];
    }

    /**
     * 
     * @param corner1
     * @param corner2
     * @return {boolean}
     */
    
    function areCornersEqual(corner1, corner2) {
        return (corner1[0] === corner2[0] && corner1[1] === corner2[1]);
    }

    /**
     * 
     * @param c1a
     * @param c1b
     * @param c2a
     * @param c2b
     * @return {boolean}
     */
    
    function areCornerPairsIdentical(c1a, c1b, c2a, c2b) {
        return (areCornersEqual(c1a, c2a) && areCornersEqual(c1b, c2b));
    }

    /**
     * 
     * @param c1a
     * @param c1b
     * @param c2a
     * @param c2b
     * @return {boolean}
     */
    
    function areCornerPairsSymmetric(c1a, c1b, c2a, c2b) {
        return (areCornersEqual(c1a, c2b) && areCornersEqual(c1b, c2a));
    }

    /**
     * 
     * @param corner1
     * @param corner2
     * @return {boolean}
     */
    
    function areCornersAdjacent(corner1, corner2) {
        return (corner1[0] === corner2[0] || corner1[1] === corner2[1]);
    }

    /**
     * 
     * @param corner1
     * @param corner2
     * @return {boolean}
     */
    
    function areCornersOppositeZ(corner1, corner2) {
        var z1 = corner1[2];
        var z2 = corner2[2];
        return ((z1 * z2) < 0);
    }

    /**
     * makes sure we don't add symmetric pairs to list
     * @param cornerPair
     * @param oppositeCornerPairs
     */
    
    function addCornerPairToOppositeCornerPairs(cornerPair, oppositeCornerPairs) {
        var corner1 = cornerPair[0];
        var corner2 = cornerPair[1];
        var safeToAdd = true;
        if (oppositeCornerPairs.length > 0) {
            oppositeCornerPairs.forEach(function (pairList) {
                var existingCorner1 = pairList[0];
                var existingCorner2 = pairList[1];
                if (areCornerPairsSymmetric(existingCorner1, existingCorner2, corner1, corner2)) {
                    // console.log("symmetric", existingCorner1, existingCorner2, corner1, corner2);
                    safeToAdd = false;
                    return;
                }
                if (areCornerPairsIdentical(existingCorner1, existingCorner2, corner1, corner2)) {
                    // console.log("identical", existingCorner1, existingCorner2, corner1, corner2);
                    safeToAdd = false;
                }
            });
        }
        if (safeToAdd) {
            oppositeCornerPairs.push([corner1, corner2]);
        }
    }
    
    /**
     * Taken from https://stackoverflow.com/questions/17386707/how-to-check-if-a-canvas-is-blank
     * @param canvas
     * @returns {boolean}
     */
    /*
    function isCanvasBlank(canvas) {
        blank.width = canvas.width;
        blank.height = canvas.height;
        return canvas.toDataURL() === blank.toDataURL();
    }
    */

    /**
     * Shortcut approximately detects if it has been unconstrained moved with only a few comparisons
     * @param matrix
     * @return {boolean}
     */
    function hasBeenUnconstrainedPositioned(matrix) {
        if (!matrix || matrix.length < 15) {
            return false;
        }
        if (parseFloat(matrix[1].toFixed(3)) !== 0) {
            return true;
        }
        if (parseFloat(matrix[2].toFixed(3)) !== 0) {
            return true;
        }
        if (parseFloat(matrix[14].toFixed(3)) !== 0) {
            return true;
        }
        return false;
    }
    
    /**
     * 
     * @param activeKey
     * @param matrixSVG
     * @param activeVehicle
     * @return {boolean}
     */
    
    function drawMarkerPlaneIntersection(activeKey, matrixSVG, activeVehicle) {
        
        // don't draw red lines unless it is something you are able to unconstrained reposition (frames and logic nodes)
        if (!realityEditor.gui.ar.positioning.isVehicleUnconstrainedEditable(activeVehicle)) {
            return;
        }
        
        // don't draw lines unless the marker has been unconstrained edited
        if (!hasBeenUnconstrainedPositioned(matrixSVG)) {
            return;
        }
        
        // if (globalStates.inTransitionFrame) return false;
        var thisSVG = globalDOMCache["svg" + activeKey];

        // check if css is a percentage (handle differently so we don't convert 100% to 100px)
        if (thisSVG.style.width[thisSVG.style.width.length-1] === "%") {
            return;
        }
        
        var shadowObject = shadowObjects["svg" + activeKey] = {};
        // console.log(activeVehicle);
        if (!thisSVG.getElementById("lineID")) {
            realityEditor.gui.ar.moveabilityOverlay.createSvg(thisSVG, activeVehicle.width, activeVehicle.height);
        }
        
        if (matrixSVG) {
            var w = parseInt(thisSVG.style.width, 10);
            var h = parseInt(thisSVG.style.height, 10);

            var corners = getCornersClockwise(thisSVG);
            var out = [0, 0, 0, 0];
            corners.forEach(function (corner) {
                var x = corner[0] - w / 2;
                var y = corner[1] - h / 2;
                var input = [x, y, 0, 1]; // assumes z-position of corner is always 0

                out = realityEditor.gui.ar.utilities.multiplyMatrix4(input, matrixSVG);
                corner[2] = out[2]; // sets z position of corner to its eventual transformed value
            });

            var oppositeCornerPairs = [];
            corners.forEach(function (corner1) {
                corners.forEach(function (corner2) {
                    // only check adjacent pairs of corners
                    // ignore same corner
                    if (areCornersEqual(corner1, corner2)) {
                        return false;
                    }
                    // x or y should be the same
                    if (areCornersAdjacent(corner1, corner2)) {
                        if (areCornersOppositeZ(corner1, corner2)) {
                            addCornerPairToOppositeCornerPairs([corner1, corner2], oppositeCornerPairs);
                        }
                    }
                });
            });
            
            // for each opposite corner pair, binary search for the x,y location that will correspond with 0 z-pos
            // .... or can it be calculated directly....? it's just a linear equation!!!
            var interceptPoints = [];
            oppositeCornerPairs.forEach(function (cornerPair) {
                var c1 = cornerPair[0];
                var c2 = cornerPair[1];
                var x1 = c1[0];
                var y1 = c1[1];
                var z1 = c1[2];
                var x2 = c2[0];
                var y2 = c2[1];
                var z2 = c2[2];
                var slope;

                if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
                    // console.log("dx");
                    slope = ((z2 - z1) / (x2 - x1));
                    var x_intercept = x1 - (z1 / slope);
                    interceptPoints.push([x_intercept, y1]);
                } else {
                    // console.log("dy");
                    slope = ((z2 - z1) / (y2 - y1));
                    var y_intercept = y1 - (z1 / slope);
                    interceptPoints.push([x1, y_intercept]);
                }
            });

            var numBehindMarkerPlane = 0;
            // get corners, add in correct order so they get drawn clockwise

            corners.forEach(function (corner) {
                if (corner[2] < 0) {
                    interceptPoints.push(corner);
                }

                if (corner[2] < -100) {
                    numBehindMarkerPlane++;
                }
            });
            
            var sortedPoints = sortPointsClockwise(interceptPoints);

            var allPoints = "";

            if (sortedPoints.length > 2) {
                allPoints += sortedPoints[0][0] + "," + sortedPoints[0][1];
                sortedPoints.forEach(function (point) {
                    allPoints += "," + point[0] + "," + point[1];
                });
                shadowObject.clippingState = false;
                realityEditor.gui.ar.moveabilityOverlay.changeClipping(thisSVG, allPoints);
            } else {
          
                if(!activeVehicle.clippingState) {
                    shadowObject.clippingState = true;
                    realityEditor.gui.ar.moveabilityOverlay.changeClipping(thisSVG, 0 + "," + 0 + "," + 0 + "," + 0 + "," + 0 + "," + 0);
                }
            }
            if (numBehindMarkerPlane === 4) { //interceptPoints.length
                // console.log('fully behind plane - send to screen!');
               return true;
            }
        } else {
            if(!activeVehicle.clippingState) {
                shadowObject.clippingState = true;
                realityEditor.gui.ar.moveabilityOverlay.changeClipping(thisSVG, 0 + "," + 0 + "," + 0 + "," + 0 + "," + 0 + "," + 0);
            }
        }
        return false;
    }
    
    exports.drawMarkerPlaneIntersection = drawMarkerPlaneIntersection;

}(realityEditor.gui.ar.utilities));

/**
 * @desc Returns a matrix that has the correct positioning of an object in real world space.
 * It is not multiplied by the projection matrix. It only works for getting the real distance to an object.
 * @param {Array} matrix of the object
 * @param {Object} object that is used for calculation
 * @return {Array} calculated array
 */
realityEditor.gui.ar.utilities.repositionedMatrix = function (matrix, object) {
    var intermediateMatrix = [];
    var intermediateMatrix2 = [];
    var correctedMatrix = [];
    var obj = {};
    
    if(object.ar) obj = object.ar;
    else obj = object;
    
    var possitionMatrix = [
        obj.scale, 0, 0, 0,
        0, obj.scale, 0, 0,
        0, 0, 1, 0,
        obj.x, obj.y, 0, 1
    ];

    this.multiplyMatrix(realityEditor.gui.ar.draw.rotateX, matrix, intermediateMatrix2);

    if (obj.matrix.length < 13) {
        this.multiplyMatrix(possitionMatrix, intermediateMatrix2, correctedMatrix);

    } else {
        this.multiplyMatrix(obj.matrix, matrix, intermediateMatrix);
        this.multiplyMatrix(possitionMatrix, intermediateMatrix, correctedMatrix);
    }
    return correctedMatrix;
};

/**
 * @desc Uses Pythagorean theorem to return the 3D distance to the origin of the transformation matrix.
 * @param {Array} matrix of the point - should be provided in the format taken from realityEditor.gui.ar.draw.visibleObjects
 * @return {number} distance
 */
realityEditor.gui.ar.utilities.distance = function (matrix) {
    return   Math.sqrt(Math.pow(matrix[12], 2) + Math.pow(matrix[13], 2) + Math.pow(matrix[14], 2));
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
        y: q.y/d,
        z: q.z/d,
        w: q.w/d
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
