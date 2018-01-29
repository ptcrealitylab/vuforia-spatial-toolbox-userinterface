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
 * @return {Number|Array} m16 matrix result of the muliplication
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
 * @desc mutpliply m4 matrix with m16 matrix
 * @param  m1 origin m4 matrix
 * @param m2 m16 matrix to multiplay with
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

// realityEditor.gui.ar.utilities.scalarMultiplyVector = function(vector4, scalar) {
//     var r = [];
//     r[0] = vector4[0] * scalar;
//     r[1] = vector4[1] * scalar;
//     r[2] = vector4[2] * scalar;
//     r[3] = vector4[3] * scalar;
//     return r;
// };

// realityEditor.gui.ar.utilities.scalarMultiplyMatrix = function(matrix, scalar) {
//     var r = [];
//     r[0] = matrix[0] * scalar;
//     r[1] = matrix[1] * scalar;
//     r[2] = matrix[2] * scalar;
//     r[3] = matrix[3] * scalar;
//     r[4] = matrix[4] * scalar;
//     r[5] = matrix[5] * scalar;
//     r[6] = matrix[6] * scalar;
//     r[7] = matrix[7] * scalar;
//     r[8] = matrix[8] * scalar;
//     r[9] = matrix[9] * scalar;
//     r[10] = matrix[10] * scalar;
//     r[11] = matrix[11] * scalar;
//     r[12] = matrix[12] * scalar;
//     r[13] = matrix[13] * scalar;
//     r[14] = matrix[14] * scalar;
//     r[15] = matrix[15] * scalar;
//     return r;
// };

realityEditor.gui.ar.utilities.prettyPrintMatrix = function(matrix) {

    // Note that this assumes, row-major order, while CSS 3D matrices actually use column-major
    console.log("[ " + matrix[0] + ", " + matrix[1] + ", " + matrix[2] + ", " + matrix[3] + ", \n" +
                "  " + matrix[4] + ", " + matrix[5] + ", " + matrix[6] + ", " + matrix[7] + ", \n" +
                "  " + matrix[8] + ", " + matrix[9] + ", " + matrix[10] + ", " + matrix[11] + ", \n" +
                "  " + matrix[12] + ", " + matrix[13] + ", " + matrix[14] + ", " + matrix[15] + " ]" );
    
};

realityEditor.gui.ar.utilities.insidePoly = function(point, vs) {
    // ray-casting algorithm based on
    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
    // Copyright (c) 2016 James Halliday
    // The MIT License (MIT)

    var x = point[0], y = point[1];

    if(x <=0 || y <= 0) return false;

    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

// TODO: update with actual screen width and height regardless of device
realityEditor.gui.ar.utilities.isNodeWithinScreen = function(thisObject, nodeKey) {
    var thisNode = thisObject.nodes[nodeKey];
    var screenCorners = [
        [0,0],
        [568,0],
        [568,320],
        [0,320]
    ];
    var isInsideScreen = this.insidePoly([thisNode.screenX, thisNode.screenY],screenCorners, true);
    //console.log(thisNode.name, [thisNode.screenX, thisNode.screenY], isInsideScreen);
    return isInsideScreen;
};

realityEditor.gui.ar.utilities.newIdentityMatrix = function() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
};

realityEditor.gui.ar.utilities.isGlobalFrame = function(objectKey) {
    return objectKey === globalFramePrefix;
};

/**********************************************************************************************************************
 **********************************************************************************************************************/

// @author Ben Reynolds
// private helper functions for realityEditor.gui.ar.utilities.estimateIntersection
(function(exports) {

    function screenCoordinatesToMatrixXY(thisObject, touch, absoluteNotRelative) {

        var positionData;
        var previousPosition;
        var updatedCssMatrix;
        
        // first undo the frame's relative position, so that the result will be absolute position compared to marker, not div
        if (absoluteNotRelative) {
            positionData = tempThisObject;
            if (tempThisObject.hasOwnProperty('visualization')) {
                positionData = (tempThisObject.visualization === "ar") ? tempThisObject.ar : tempThisObject.screen;
            }
            previousPosition = {
                x: positionData.x,
                y: positionData.y
            };
            positionData.x = 0;
            positionData.y = 0;
            var draw = realityEditor.gui.ar.draw;
            updatedCssMatrix = draw.recomputeTransformMatrix(draw.visibleObjects, frame.objectId, frame.uuid, 'ui', frame, false, globalDOMCache, globalStates, globalCanvas, draw.activeObjectMatrix, draw.matrix, draw.finalMatrix, draw.utilities, draw.nodeCalculations, cout);
        }
        
        var projectedXY = solveProjectedCoordinatesInFrame(thisObject, screenX, screenY, updatedCssMatrix);
        
        // restore the frame's relative position that nothing visually changes due to this computation
        if (previousPosition) {
            positionData.x = previousPosition.x;
            positionData.y = previousPosition.y;
        }
        
        return [projectedXY.x, projectedXY.y];
    }

    function moveFrameToScreenCoordinate(frame, screenX, screenY) {

        frame.ar.x = 0;
        frame.ar.y = 0;

        // recompute css3D matrix for this frame

        var draw = realityEditor.gui.ar.draw;
        var updatedCssMatrix = draw.recomputeTransformMatrix(draw.visibleObjects, frame.objectId, frame.uuid, 'ui', frame, false, globalDOMCache, globalStates, globalCanvas, draw.activeObjectMatrix, draw.matrix, draw.finalMatrix, draw.utilities, draw.nodeCalculations, cout);

        // solve projected touch relative to marker (0,0)

        var results = solveProjectedCoordinatesInFrame(frame, screenX, screenY, updatedCssMatrix);

        // update the x and y with new translations. rendering with an updated css3D matrix will happen automatically.

        frame.ar.x = results.point.x - results.left;// - initialFramePosition.x;
        frame.ar.y = results.point.y - results.top;// - initialFramePosition.y;

    }

    function solveProjectedCoordinatesInFrame(frame, screenX, screenY, cssMatrixToUse) {

        var overlayDomElement = globalDOMCache[frame.uuid];
        var projectedZ = 0; // You are looking for the x, y coordinates at z=0 on the frame
        var point = solveProjectedCoordinates(overlayDomElement, screenX, screenY, projectedZ, cssMatrixToUse);
        var offsetLeft = parseInt(overlayDomElement.style.left);
        var offsetTop = parseInt(overlayDomElement.style.top);

        return {
            point: point,
            left: offsetLeft,
            top: offsetTop
        }
    }

    function solveProjectedCoordinates(childDiv, screenX, screenY, projectedZ, cssMatrixToUse) {

        // projectedZ lets you find the projected x,y coordinates that occur on the frame at screenX, screenZ, and that z coordinate
        if (projectedZ === undefined) { projectedZ = 0; }

        var dt = 0.1;

        var p0 = convertScreenPointToLocalCoordinatesRelativeToDivParent_fast(childDiv, childDiv.parentElement, screenX, screenY, projectedZ, cssMatrixToUse);
        var p2 = convertScreenPointToLocalCoordinatesRelativeToDivParent_fast(childDiv, childDiv.parentElement, screenX, screenY, (projectedZ + dt), cssMatrixToUse);
        //
        // console.log('first point = ', p0);
        // console.log('second point = ', p2);

        var dx = (p2[0] - p0[0]) / dt;
        var dy = (p2[1] - p0[1]) / dt;
        var dz = (p2[2] - p0[2]) / dt;

        var neededDt = (p0[2]) / dz;

        var x = p0[0] - dx * neededDt;
        var y = p0[1] - dy * neededDt;
        var z = p0[2] - dz * neededDt;

        return {
            x: x,
            y: y,
            z: z
        }
    }

    function convertScreenPointToLocalCoordinatesRelativeToDivParent_fast(childDiv, transformedDiv, screenX, screenY, screenZ, cssMatrixToUse) {
        var originTranslationVector = getTransformOrigin_fast(transformedDiv);
        var fullTx = computeTransformationData_fast(cssMatrixToUse, originTranslationVector);
        var fullTx_inverse = realityEditor.gui.ar.utilities.invertMatrix(fullTx);
        var fullTx_normalized_inverse = perspectiveDivideMatrix(fullTx_inverse);
        var screenPoint = [screenX, screenY, screenZ, 1];
        var resultingPoint = perspectiveDivideMatrix(transformVertex_fast(fullTx_normalized_inverse, screenPoint));
        return resultingPoint;
    }

    function computeTransformationData_fast(cssMatrixToUse, originTranslationVector) {
        var tranformationMatrix = getTransformFromCssMatrix_fast(cssMatrixToUse);
        var fullTx = computeTransformMatrix_fast(tranformationMatrix, originTranslationVector);
        return fullTx;
    }

    function getTransformFromCssMatrix_fast(cssMatrixToUse) {
        return cssMatrixToUse.split('(')[1].split(')')[0].split(',').map(function(element) {
            return parseFloat(element);
        });
    }

    // TODO: find out why we need to compute N = T^{-1}MT
    function computeTransformMatrix_fast(tranformationMatrix, originTranslationVector)
    {
        var x = originTranslationVector[0];
        var y = originTranslationVector[1];
        var z = originTranslationVector[2];
        var undoTranslationMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -x, -y, -z, 1];
        var redoTranslationMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
        var temp1 = [];
        var out = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(undoTranslationMatrix, tranformationMatrix, temp1);
        realityEditor.gui.ar.utilities.multiplyMatrix(temp1, redoTranslationMatrix, out);
        return out;
    }

    function getTransformOrigin_fast(element) {
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

    function transformVertex_fast(mat, vert) {
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

    function perspectiveDivideMatrix(matrix) {
        var lastElement = matrix[matrix.length-1];
        var r = [];
        for (var i = 0; i < matrix.length; i++) {
            r[i] = matrix[i] / lastElement;
        }
        return r;
    }
    
    exports.moveFrameToScreenCoordinate = moveFrameToScreenCoordinate;
    exports.screenCoordinatesToMatrixXY = screenCoordinatesToMatrixXY;
    exports.perspectiveDivideMatrix = perspectiveDivideMatrix;
    
}(realityEditor.gui.ar.utilities));



/**********************************************************************************************************************
 **********************************************************************************************************************/

// @author Ben Reynolds
// private helper functions for realityEditor.gui.ar.utilities.estimateIntersection
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
     * @desc
     * @param
     * @param
     * @return
     **/
    
    function areCornersEqual(corner1, corner2) {
        return (corner1[0] === corner2[0] && corner1[1] === corner2[1]);
    }
    
    /**
     * @desc
     * @param
     * @param
     * @return
     **/
    
    function areCornerPairsIdentical(c1a, c1b, c2a, c2b) {
        return (areCornersEqual(c1a, c2a) && areCornersEqual(c1b, c2b));
    }
    
    /**
     * @desc
     * @param
     * @param
     * @return
     **/
    
    function areCornerPairsSymmetric(c1a, c1b, c2a, c2b) {
        return (areCornersEqual(c1a, c2b) && areCornersEqual(c1b, c2a));
    }
    
    /**
     * @desc
     * @param
     * @param
     * @return
     **/
    
    function areCornersAdjacent(corner1, corner2) {
        return (corner1[0] === corner2[0] || corner1[1] === corner2[1]);
    }
    
    /**
     * @desc
     * @param
     * @param
     * @return
     **/
    
    function areCornersOppositeZ(corner1, corner2) {
        var z1 = corner1[2];
        var z2 = corner2[2];
        var oppositeSign = ((z1 * z2) < 0);
        return oppositeSign;
    }
    
    /**
     * @desc
     * @param
     * @param
     * @return
     **/
    // makes sure we don't add symmetric pairs to list
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
        return canvas.toDataURL() == blank.toDataURL();
    }
    
    /**
     * @desc
     * @param
     * @param
     * @return
     **/
    
    function estimateIntersection(activeKey, mCanvas, activeVehicle) {
        
        var isFullyBehindPlane = false;
        
        var thisCanvas = globalDOMCache["canvas" + activeKey];
        if(!mCanvas){
            // if(!activeVehicle.hasCTXContent) {
            //     activeVehicle.hasCTXContent = true;
            if (!activeVehicle.hasCTXContent) { //} || isCanvasBlank(thisCanvas)) {
                activeVehicle.hasCTXContent = true;
                var ctx = thisCanvas.getContext("2d");
                var diagonalLineWidth = 22;
                ctx.lineWidth = diagonalLineWidth;
                ctx.strokeStyle = '#01FFFC';
                for (var i = -thisCanvas.height; i < thisCanvas.width; i += 2.5 * diagonalLineWidth) {
                    ctx.beginPath();
                    ctx.moveTo(i, -diagonalLineWidth / 2);
                    ctx.lineTo(i + thisCanvas.height + diagonalLineWidth / 2, thisCanvas.height + diagonalLineWidth / 2);
                    ctx.stroke();
                }
            }
            return;
        } else {
            activeVehicle.hasCTXContent = false;
        }
    
        if (globalStates.pointerPosition[0] === -1) return;
        
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
    
            if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
                // console.log("dx");
                var slope = ((z2 - z1) / (x2 - x1));
                var x_intercept = x1 - (z1 / slope);
                interceptPoints.push([x_intercept, y1]);
            } else {
                // console.log("dy");
                var slope = ((z2 - z1) / (y2 - y1));
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
        var ctx = thisCanvas.getContext("2d");
        ctx.clearRect(0, 0, thisCanvas.width, thisCanvas.height);
        activeVehicle.hasCTXContent = false;
    
        var diagonalLineWidth = 22;
        ctx.lineWidth = diagonalLineWidth;
        ctx.strokeStyle = '#01FFFC';
        for (var i = -thisCanvas.height; i < thisCanvas.width; i += 2.5 * diagonalLineWidth) {
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
    
        var diagonalLineWidth = 22;
        ctx.lineWidth = diagonalLineWidth;
        ctx.strokeStyle = '#FF01FC';
        for (var i = -thisCanvas.height; i < thisCanvas.width; i += 2.5 * diagonalLineWidth) {
            ctx.beginPath();
            ctx.moveTo(i, -diagonalLineWidth / 2);
            ctx.lineTo(i + thisCanvas.height + diagonalLineWidth / 2, thisCanvas.height + diagonalLineWidth / 2);
            ctx.stroke();
        }
    
        // Undo the clipping
        ctx.restore();
        
        activeVehicle.hasCTXContent = true;
        
        return isFullyBehindPlane;
    }
    
    exports.estimateIntersection = estimateIntersection;

}(realityEditor.gui.ar.utilities));
