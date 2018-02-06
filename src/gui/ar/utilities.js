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

realityEditor.gui.ar.utilities.timeSynchronizer = function(timeing) {
	timeing.now = Date.now();
	timeing.delta = (timeing.now - timeing.then) / 198;
	timeing.then = timeing.now;
};

/**
 * @desc
 * @param
 * @param
 * @return {Number}
 **/

realityEditor.gui.ar.utilities.map = function(x, in_min, in_max, out_min, out_max) {
	if (x > in_max) x = in_max;
	if (x < in_min) x = in_min;
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};



/**
 * @desc This function multiplies one m16 matrix with a second m16 matrix
 * @param m2 origin matrix to be multiplied with
 * @param m1 second matrix that multiplies.
 * @return {Number|Array} m16 matrix result of the multiplication
 **/

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
 * @param m1 origin m4 matrix
 * @param m2 m16 matrix to multiply with
 * @return {Number|Array} is m16 matrix
 **/

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
 * @param matrix source matrix
 * @return {Number|Array} resulting copy of the matrix
 **/

realityEditor.gui.ar.utilities.copyMatrix = function(matrix) {
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
 * @desc inverting a matrix
 * @param a origin matrix
 * @return {Number|Array} a inverted copy of the origin matrix
 **/

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
 * @param {Array.<Number>} vector4
 * @param {Number} scalar
 * @return {Array.<Number>}
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
 * @param {Array.<Number>} matrix
 * @param {Number} scalar
 * @return {Array.<Number>}
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
 * @param {Array.<Number>} matrix - can have any length (so it works for vectors and matrices)
 * @return {Array.<Number>}
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
 * @param {Array.<Number>} matrix
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
 * Returns whether or not the given point is inside the polygon formed by the given vertices.
 * @param {Array.<Number>} point - [x,y]
 * @param {Array.<Array.<Number>>} vertices - [[x0, y0], [x1, y1], ... ]
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
    var isInsideScreen = this.insidePoly([thisNode.screenX, thisNode.screenY],screenCorners, true);
    //console.log(thisNode.name, [thisNode.screenX, thisNode.screenY], isInsideScreen);
    return isInsideScreen;
};

/**
 * Helper method for creating a new 4x4 identity matrix
 * @return {Number[]}
 */
realityEditor.gui.ar.utilities.newIdentityMatrix = function() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
};

/**********************************************************************************************************************
 **********************************************************************************************************************/

// @author Ben Reynolds
// private helper functions for realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY and realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY (which is used by moveVehicleToScreenCoordinate)
(function(exports) {

    /**
     * 
     * @param {Frame|Node} thisObject - 
     * @param {Number} screenX - x coordinate on the screen plane
     * @param {Number} screenY - y coordinate on the screen plane
     * @param {boolean} relativeToMarker - true if you want the position relative to (0,0) on the marker, not thisObject's existing translation
     * @return {{point, offsetLeft, offsetTop}}
     */
    function screenCoordinatesToMatrixXY(thisObject, screenX, screenY, relativeToMarker) {

        var positionData;
        var previousPosition;
        var updatedCssMatrix;
        
        // first undo the frame's relative position, so that the result will be absolute position compared to marker, not div
        if (relativeToMarker) {
            positionData = realityEditor.gui.ar.positioning.getPositionData(thisObject);

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
                updatedCssMatrix = draw.recomputeTransformMatrix(draw.visibleObjects, thisObject.objectId, thisObject.uuid, thisObject.type, thisObject, false, globalDOMCache, globalStates, globalCanvas, draw.activeObjectMatrix, draw.matrix, draw.finalMatrix, draw.utilities, draw.nodeCalculations, cout);
            }
        }
        
        var results = solveProjectedCoordinatesInFrame(thisObject, screenX, screenY, updatedCssMatrix);
        
        // restore the frame's relative position that nothing visually changes due to this computation
        if (previousPosition) {
            positionData.x = previousPosition.x;
            positionData.y = previousPosition.y;
            positionData.scale = previousPosition.scale;
        }
        
        return results; // [projectedXY.x, projectedXY.y]; // TODO: update invokers to use new data format { point: { x, y }, offsetLeft, offsetTop } 
    }

    // TODO: does this work for things other than frames? should I make assumptions?
    function solveProjectedCoordinatesInFrame(frame, screenX, screenY, cssMatrixToUse) {

        var overlayDomElement = globalDOMCache[frame.uuid];
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
        
        tr = ele.style.webkitTransform;

        var values = tr.split('(')[1],
            values = values.split(')')[0],
            values = values.split(',');
        
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

    function transformVertex(mat, vert) {
        out = [0,0,0,0];

        for (var i = 0; i < 4; i++) {
            var sum = 0;
            for (var j = 0; j < 4; j++) {
                sum += mat[i + j * 4] * vert[j];
            }
            out[i] = sum;
        }

        return out;
    }

    exports.screenCoordinatesToMatrixXY = screenCoordinatesToMatrixXY;
    
}(realityEditor.gui.ar.utilities));

/**********************************************************************************************************************
 **********************************************************************************************************************/

// @author Ben Reynolds
// private helper functions for realityEditor.gui.ar.utilities.drawMarkerPlaneIntersection
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
     * @param {Object} thisCanvas
     **/
    
    function getCornersClockwise(thisCanvas) {
        return [[0, 0, 0],
            [thisCanvas.width, 0, 0],
            [thisCanvas.width, thisCanvas.height, 0],
            [0, thisCanvas.height, 0]];
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
        var oppositeSign = ((z1 * z2) < 0);
        return oppositeSign;
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

    var blank = document.createElement('canvas');

    /**
     * Taken from https://stackoverflow.com/questions/17386707/how-to-check-if-a-canvas-is-blank
     * @param canvas
     * @returns {boolean}
     */
    function isCanvasBlank(canvas) {
        blank.width = canvas.width;
        blank.height = canvas.height;
        return canvas.toDataURL() === blank.toDataURL();
    }
    
    function hasBeenUnconstrainedPositioned(matrix) {
        var approximateMatrix = matrix.map(function(elt) {
            return parseFloat(elt.toFixed(3)); // round to prevent floating point precision errors
        });
        return !(approximateMatrix[0] === 1 &&
                approximateMatrix[1] === 0 &&
                approximateMatrix[2] === 0 &&
                approximateMatrix[3] === 0 &&
                approximateMatrix[4] === 0 &&
                approximateMatrix[5] === 1 &&
                approximateMatrix[6] === 0 &&
                approximateMatrix[7] === 0 &&
                approximateMatrix[8] === 0 &&
                approximateMatrix[9] === 0 &&
                approximateMatrix[10] === 1 &&
                approximateMatrix[11] === 0 &&
                approximateMatrix[12] === 0 &&
                approximateMatrix[13] === 0 &&
                approximateMatrix[14] === 0 &&
                approximateMatrix[15] === 1);
        
    }
    
    function renderDefaultCanvas(activeVehicle, thisCanvas, diagonalLineWidth, ctx) {
        activeVehicle.hasCTXContent = true;
        ctx.lineWidth = diagonalLineWidth;
        ctx.strokeStyle = '#01FFFC';
        for (i = -thisCanvas.height; i < thisCanvas.width; i += 2.5 * diagonalLineWidth) {
            ctx.beginPath();
            ctx.moveTo(i, -diagonalLineWidth / 2);
            ctx.lineTo(i + thisCanvas.height + diagonalLineWidth / 2, thisCanvas.height + diagonalLineWidth / 2);
            ctx.stroke();
        }
    }

    /**
     * 
     * @param activeKey
     * @param mCanvas
     * @param activeVehicle
     * @return {boolean}
     */
    
    function drawMarkerPlaneIntersection(activeKey, mCanvas, activeVehicle) {
        
        var isFullyBehindPlane = false;
        
        var thisCanvas = globalDOMCache["canvas" + activeKey];
        var diagonalLineWidth = 22;
        var ctx = thisCanvas.getContext("2d");
        var i;

        if(!mCanvas) { // || !activeVehicle.hasCTXContent){
            // if(!activeVehicle.hasCTXContent) {
            //     activeVehicle.hasCTXContent = true;
            if (!activeVehicle.hasCTXContent) { //} || isCanvasBlank(thisCanvas)) {
                renderDefaultCanvas(activeVehicle, thisCanvas, diagonalLineWidth, ctx);
                // activeVehicle.hasCTXContent = true;
                // ctx.lineWidth = diagonalLineWidth;
                // ctx.strokeStyle = '#01FFFC';
                // for (i = -thisCanvas.height; i < thisCanvas.width; i += 2.5 * diagonalLineWidth) {
                //     ctx.beginPath();
                //     ctx.moveTo(i, -diagonalLineWidth / 2);
                //     ctx.lineTo(i + thisCanvas.height + diagonalLineWidth / 2, thisCanvas.height + diagonalLineWidth / 2);
                //     ctx.stroke();
                // }
            }
            return;
        } else {
            activeVehicle.hasCTXContent = false;
        }
    
        if (globalStates.pointerPosition[0] === -1 && activeVehicle.hasCTXContent) return; // TODO: why did I put this here?
        
        var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
        if (!hasBeenUnconstrainedPositioned(positionData.matrix)) {
            renderDefaultCanvas(activeVehicle, thisCanvas, diagonalLineWidth, ctx);
            return;
        }
        
        var corners = getCornersClockwise(thisCanvas);
        var out = [0, 0, 0, 0];
        corners.forEach(function (corner, index) {
            var x = corner[0] - thisCanvas.width / 2;
            var y = corner[1] - thisCanvas.height / 2;
            var input = [x, y, 0, 1]; // assumes z-position of corner is always 0
            // console.log(out, input, mCanvas);
    
            out = realityEditor.gui.ar.utilities.multiplyMatrix4(input, mCanvas);
            // var z = getTransformedZ(matrix,x,y)
            corner[2] = out[2]; // sets z position of corner to its eventual transformed value
        });
        
        var oppositeCornerPairs = [];
        corners.forEach(function (corner1) {
            corners.forEach(function (corner2) {
                // only check adjacent pairs of corners
                // ignore same corner
                if (areCornersEqual(corner1, corner2)) {
                    return;
                }
    
                // x or y should be the same
                if (areCornersAdjacent(corner1, corner2)) {
                    if (areCornersOppositeZ(corner1, corner2)) {
                        addCornerPairToOppositeCornerPairs([corner1, corner2], oppositeCornerPairs);
                    }
                }
            });
        });
    
        // console.log("oppositeCornerPairs", oppositeCornerPairs);
    
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

        if (numBehindMarkerPlane === 4) { //interceptPoints.length
            // console.log('fully behind plane - send to screen!');
            isFullyBehindPlane = true;
        }
        
        var sortedPoints = sortPointsClockwise(interceptPoints);
    
        // draws blue and purple diagonal lines to mask the image
        ctx.clearRect(0, 0, thisCanvas.width, thisCanvas.height);
        activeVehicle.hasCTXContent = false;
    
        ctx.lineWidth = diagonalLineWidth;
        ctx.strokeStyle = '#01FFFC';
        for (i = -thisCanvas.height; i < thisCanvas.width; i += 2.5 * diagonalLineWidth) {
            ctx.beginPath();
            ctx.moveTo(i, -diagonalLineWidth / 2);
            ctx.lineTo(i + thisCanvas.height + diagonalLineWidth / 2, thisCanvas.height + diagonalLineWidth / 2);
            ctx.stroke();
        }
    
        // Save the state, so we can undo the clipping
        ctx.save();
    
        // Create a circle
        ctx.beginPath();
    
        if (sortedPoints.length > 2) {
            ctx.beginPath();
            ctx.moveTo(sortedPoints[0][0], sortedPoints[0][1]);
            sortedPoints.forEach(function (point) {
                ctx.lineTo(point[0], point[1]);
            });
            ctx.closePath();
            // ctx.fill();
        }
        // Clip to the current path
        ctx.clip();
    
        // draw whatever needs to get masked here!
        ctx.lineWidth = diagonalLineWidth;
        ctx.strokeStyle = '#FF01FC';
        for (i = -thisCanvas.height; i < thisCanvas.width; i += 2.5 * diagonalLineWidth) {
            ctx.beginPath();
            ctx.moveTo(i, -diagonalLineWidth / 2);
            ctx.lineTo(i + thisCanvas.height + diagonalLineWidth / 2, thisCanvas.height + diagonalLineWidth / 2);
            ctx.stroke();
        }
    
        // Undo the clipping
        ctx.restore();
        
        activeVehicle.hasCTXContent = true;
        // activeVehicle.forceRedrawRepositionOnce = 
        
        return isFullyBehindPlane;
    }
    
    exports.drawMarkerPlaneIntersection = drawMarkerPlaneIntersection;

}(realityEditor.gui.ar.utilities));
