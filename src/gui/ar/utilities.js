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

realityEditor.gui.ar.utilities.multiplyVectorByMatrix = function(vector4, matrix4) {
    
    var result = [0,0,0,0];

    result[0] = matrix4[0] * vector4[0] + matrix4[1] * vector4[1] + matrix4[2] * vector4[2] + matrix4[3] * vector4[3];
    result[1] = matrix4[4] * vector4[0] + matrix4[5] * vector4[1] + matrix4[6] * vector4[2] + matrix4[7] * vector4[3];
    result[2] = matrix4[8] * vector4[0] + matrix4[9] * vector4[1] + matrix4[10] * vector4[2] + matrix4[11] * vector4[3];
    result[3] = matrix4[12] * vector4[0] + matrix4[13] * vector4[1] + matrix4[14] * vector4[2] + matrix4[15] * vector4[3];
    
    return result;
};

realityEditor.gui.ar.utilities.scalarMultiplyVector = function(vector4, scalar) {
    var r = [];
    r[0] = vector4[0] * scalar;
    r[1] = vector4[1] * scalar;
    r[2] = vector4[2] * scalar;
    r[3] = vector4[3] * scalar;
    return r;
};

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
 * @desc returns the x and y angles from origin matrix. todo needs some improvement
 * @param  matrix origin m16 matrix
 * @return {Number|Array}
 **/

realityEditor.gui.ar.utilities.toAxisAngle = function(matrix) {
	var rX = Math.atan(matrix[6], matrix[10]);
	var rY = Math.atan(matrix[2], matrix[10]);
	var rZ = Math.atan2(matrix[1], matrix[5]);

	return [rX, rY, rZ];
};

realityEditor.gui.ar.utilities.normalizeMatrix = function(matrix) {
    var lastElement = matrix[15];
    var r = [];
    for (var i = 0; i < matrix.length; i++) {
        r[i] = matrix[i] / lastElement;
    }
    return r;
};

realityEditor.gui.ar.utilities.extractTranslation = function(transformationMatrix) {
    return {
        x: transformationMatrix[12],
        y: transformationMatrix[13],
        z: transformationMatrix[14]
    };
};


// realityEditor.gui.ar.utilities.extractTranslation = function(transformationMatrix) {
//     return {
//         x: transformationMatrix[3],
//         y: transformationMatrix[7],
//         z: transformationMatrix[11]
//     };
// };

realityEditor.gui.ar.utilities.getVectorLength = function(vector3) {
    return Math.abs(vector3[0] * vector3[0] + vector3[1] * vector3[1] + vector3[2] * vector3[2]);
};

// realityEditor.gui.ar.utilities.extractScale = function(transformationMatrix) {
//     var column0 = [transformationMatrix[0], transformationMatrix[4], transformationMatrix[8]];
//     var column1 = [transformationMatrix[1], transformationMatrix[5], transformationMatrix[9]];
//     var column2 = [transformationMatrix[2], transformationMatrix[6], transformationMatrix[10]];
//     return {
//         x: this.getVectorLength(column0),
//         y: this.getVectorLength(column1),
//         z: this.getVectorLength(column2)
//     };
// };

realityEditor.gui.ar.utilities.extractScale = function(transformationMatrix) {
    var row0 = [transformationMatrix[0], transformationMatrix[1], transformationMatrix[2]];
    var row1 = [transformationMatrix[4], transformationMatrix[5], transformationMatrix[6]];
    var row2 = [transformationMatrix[8], transformationMatrix[9], transformationMatrix[10]];
    return {
        x: this.getVectorLength(row0),
        y: this.getVectorLength(row1),
        z: this.getVectorLength(row2)
    };
};

// realityEditor.gui.ar.utilities.extractRotationMatrix = function(transformationMatrix) {
//     var scale = this.extractScale(transformationMatrix);
//     var rotationMatrix = this.newIdentityMatrix();
//    
//     rotationMatrix[0] = transformationMatrix[0] / scale.x;
//     rotationMatrix[4] = transformationMatrix[4] / scale.x;
//     rotationMatrix[8] = transformationMatrix[8] / scale.x;
//    
//     rotationMatrix[1] = transformationMatrix[1] / scale.y;
//     rotationMatrix[5] = transformationMatrix[5] / scale.y;
//     rotationMatrix[9] = transformationMatrix[9] / scale.y;
//    
//     rotationMatrix[2] = transformationMatrix[2] / scale.z;
//     rotationMatrix[6] = transformationMatrix[6] / scale.z;
//     rotationMatrix[10] = transformationMatrix[10] / scale.z;
//
//     return rotationMatrix;
// };

realityEditor.gui.ar.utilities.extractRotationMatrix = function(transformationMatrix) {
    var scale = this.extractScale(transformationMatrix);
    var rotationMatrix = this.newIdentityMatrix();

    rotationMatrix[0] = transformationMatrix[0] / scale.x;
    rotationMatrix[1] = transformationMatrix[1] / scale.x;
    rotationMatrix[2] = transformationMatrix[2] / scale.x;

    rotationMatrix[4] = transformationMatrix[4] / scale.y;
    rotationMatrix[5] = transformationMatrix[5] / scale.y;
    rotationMatrix[6] = transformationMatrix[6] / scale.y;

    rotationMatrix[8] = transformationMatrix[8] / scale.z;
    rotationMatrix[6] = transformationMatrix[6] / scale.z;
    rotationMatrix[10] = transformationMatrix[10] / scale.z;

    return rotationMatrix;
};

realityEditor.gui.ar.utilities.multiplyPointByTransformations = function(point, scale, rotate, translate) {



};


/*
realityEditor.gui.ar.utilities.toAxisAngle = function(matrix) {
	// var rX = Math.atan2(matrix[9], matrix[10]);
	// var rY = Math.atan2(-1 * matrix[8], Math.sqrt(matrix[9]*matrix[9] + matrix[10]*matrix[10]));
	// var rZ = Math.atan2(matrix[4], matrix[0]);

    var Yaw, Pitch, Roll;
    
    if (matrix[0] === 1.0) 
    {
        Yaw = Math.atan2(matrix[2], matrix[11]);
        Pitch = 0;
        Roll = 0;

    }else if (matrix[0] === -1.0)
    {
        Yaw = Math.atan2(matrix[2], matrix[11]);
        Pitch = 0;
        Roll = 0;
    }else
    {

        Yaw = Math.atan2(-1 * matrix[8], matrix[0]);
        Pitch = Math.asin(matrix[4]);
        Roll = Math.atan2(-1 * matrix[6], matrix[5]);
    }
    
    var rX = Yaw;
    var rY = Pitch;
    var rZ = Roll;
    
	return [rX, rY, rZ];
};
*/


// realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY_new = function(thisObject, touch) {
//    
//     var element = globalDOMCache['object' + thisObject.objectId + thisObject.name];
//     var convertedPoint = window.convertPointFromPageToNode(element, touch[0], touch[1]);
//    
//     // console.log(convertedPoint);
//     return [convertedPoint.x, convertedPoint.y];
//    
// };
//
// realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY = function(thisObject, touch) {
//
//     // process arguments
//     var objectMatrix = (globalStates.unconstrainedPositioning === true) ? this.copyMatrix(thisObject.begin) : this.copyMatrix(thisObject.temp);
//     var touchX = touch[0];
//     var touchY = touch[1];
//
//     // calculate angles
//     var rX = Math.atan2(objectMatrix[6], objectMatrix[10]);
//     var rY = Math.atan2(objectMatrix[2], objectMatrix[10]);
//     var rZ = Math.atan2(objectMatrix[1], objectMatrix[5]);
//
//     var angX = rX * Math.sin(rZ) + rY * Math.cos(rZ);
//     var angY = rX * Math.cos(rZ) - rY * Math.sin(rZ);
//
//     // var rotationMatrix = this.extractRotationMatrix(objectMatrix);
//     // var angles = this.toAxisAngle(rotationMatrix);
//     // console.log(angles);
//     // var angX = angles[0];
//     // var angY = angles[1];
//
//     // calculate new x and y.
// // needs to subtract width/2 and height/2 to translate touch origin to center of screen (because object’s origin is in center)
//     var positionX = objectMatrix[14] * ((touchX - globalStates.height / 2) * (Math.abs(angX / 2) + 1));
//     var positionY = objectMatrix[14] * ((touchY - globalStates.width / 2) * (Math.abs(angY / 2) + 1));
//
//     // replace old x and y with new
//     var tempObjectMatrix = this.copyMatrix(objectMatrix);
//     tempObjectMatrix [12] = positionX;
//     tempObjectMatrix [13] = positionY;
//
// // and multiply this manipulated matrix with its original inverted.
//     // result of tempObjectMatrix times this.invertMatrix(objectMatrix) gets stored in resultMatrix
//     var resultMatrix = [];
//     this.multiplyMatrix(tempObjectMatrix, this.invertMatrix(objectMatrix), resultMatrix);
//
//     // results in the new x and y
//     if (typeof resultMatrix[12] === "number" && typeof resultMatrix[13] === "number") {
//         return [resultMatrix[12], resultMatrix[13]];
//     }
//     return null;
// };

// realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY = function(thisObject, touch){
//
// 	var tempMatrix;
// 	if (globalStates.unconstrainedPositioning === true)
// 		tempMatrix = this.copyMatrix(thisObject.begin);
// 	else
// 		tempMatrix = this.copyMatrix(thisObject.temp);
//
// 	// console.log(tempMatrix);
//
// 	// calculate angles
// 	var angles = this.toAxisAngle(tempMatrix);
//
// 	var angX = angles[0] * Math.sin(angles[2]) + angles[1] * Math.cos(angles[2]);
// 	var angY = angles[0] * Math.cos(angles[2]) - angles[1] * Math.sin(angles[2]); // TODO: is this calculation correct? 
//
// 	// calculate new x and y
// 	var positionX =  tempMatrix[14] * ((touch[0] - globalStates.height / 2) * (Math.abs(angX/2)+1));
// 	var positionY = tempMatrix[14]  * ((touch[1] - globalStates.width / 2) * (Math.abs(angY/2)+1));
//
// 	// replace old x and y with new
//
// 	var tempObjectMatrix = [
// 		tempMatrix[0], tempMatrix[1], tempMatrix[2], tempMatrix[3],
// 		tempMatrix[4], tempMatrix[5], tempMatrix[6], tempMatrix[7],
// 		tempMatrix[8], tempMatrix[9], tempMatrix[10], tempMatrix[11],
// 		positionX, positionY, tempMatrix[14], tempMatrix[15]
// 	];
//
// 	// and multiply this manipulated matrix with its original inverted.
//
// 	// var invertedObjectMatrix = invertMatrix(tempMatrix);
// 	var resultMatrix = [];
// 	this.multiplyMatrix(tempObjectMatrix, this.invertMatrix(tempMatrix), resultMatrix);
//
// 	// results in the new x and y
//
// 	if (typeof resultMatrix[12] === "number" && typeof resultMatrix[13] === "number")
// 		return [resultMatrix[12],resultMatrix[13]];
// 	else
// 		return null;
//
// };

/**
 * Peforms the dot product of vectorA and vectorB
 * @param vectorA - an array of numbers with length 3
 * @param vectorB - an array of numbers with length 3
 * @return {number}
 */
realityEditor.gui.ar.utilities.dotProduct3 = function(vectorA, vectorB) {
    return (vectorA[0] * vectorB[0]) + (vectorA[1] * vectorB[1]) + (vectorA[2] * vectorB[2]);
};

// realityEditor.gui.ar.utilities.addVector3 = function(vectorA, vectorB) {
//     return [vectorA[0] + vectorB[0], vectorA[1] + vectorB[1], vectorA[2] + vectorB[2]];
// };

/**
 * Subtracts vectorB from vectorA
 * @param vectorA - an array of numbers with length 3
 * @param vectorB - an array of numbers with length 3
 * @return {*[]}
 */
realityEditor.gui.ar.utilities.subtractVector3 = function(vectorA, vectorB) {
    return [vectorA[0] - vectorB[0], vectorA[1] - vectorB[1], vectorA[2] - vectorB[2]];
};

// ****
// if origins are in same place
// ****

realityEditor.gui.ar.utilities.getLocalPointFromScreenPoint = function(object, x, y) {

    var modelViewMatrix = realityEditor.gui.ar.draw.visibleObjects[object.objectId]; //frame.objectId
    var screenMatrix = this.newIdentityMatrix();
    // screenMatrix[0] = -1;
    // screenMatrix[5] = -1;

    var xAxis = [screenMatrix[0], screenMatrix[1], screenMatrix[2]]; //[1,0,0];
    var yAxis =  [screenMatrix[4], screenMatrix[5], screenMatrix[6]]; //[0,1,0];
    var xAxisP = [modelViewMatrix[0], modelViewMatrix[1], modelViewMatrix[2]];
    var yAxisP = [modelViewMatrix[4], modelViewMatrix[5], modelViewMatrix[6]];
    // var zAxisP = [modelViewMatrix[8],modelViewMatrix[9],modelViewMatrix[10]];

    var a = this.dotProduct3(xAxisP, xAxis); // x' dot x
    var b = this.dotProduct3(yAxisP, xAxis); // y' dot x
    var c = this.dotProduct3(xAxisP, yAxis); // x' dot y
    var d = this.dotProduct3(yAxisP, yAxis); // y' dot y

    var yPrime = (a * y - c * x) / (a * d - c * b);
    var xPrime = (x - b * yPrime) / (a);

    var aspectRatio = { x: 1.775, y: 2.998 }; //{x: globalStates.realProjectionMatrix[0], y: globalStates.realProjectionMatrix[5]};
    // var origin = {x: globalStates.width/2+100, y: globalStates.height/2};

    // return {
    //     x: -1 * xPrime * aspectRatio.x - origin.x * aspectRatio.x,
    //     y: yPrime * aspectRatio.y - origin.y
    // };

    return {
        x: -1 * xPrime * aspectRatio.x,
        y: yPrime * aspectRatio.y
    };

    // return {
    //     x: x,
    //     y: y
    // };
};

// ****
// even if origins differ
// ****

realityEditor.gui.ar.utilities.getLocalPointFromScreenPointDiffOrigin = function(object, x, y) {

    var modelViewMatrix = realityEditor.gui.ar.draw.visibleObjects[object.objectId]; //frame.objectId
    var screenMatrix = this.invertMatrix(globalStates.realProjectionMatrix); //this.newIdentityMatrix();

    var xAxis = [screenMatrix[0], screenMatrix[1], screenMatrix[2]]; //[1,0,0];
    var yAxis =  [screenMatrix[4], screenMatrix[5], screenMatrix[6]]; //[0,1,0];
    var xAxisP = [modelViewMatrix[0], modelViewMatrix[1], modelViewMatrix[2]]; // "P" in name stands for "Prime" (projected coordinate space)
    var yAxisP = [modelViewMatrix[4], modelViewMatrix[5], modelViewMatrix[6]];
    // var zAxisP = [modelViewMatrix[8],modelViewMatrix[9],modelViewMatrix[10]];

    var origin = [screenMatrix[12], screenMatrix[13], screenMatrix[14]];
    // var MARKER_SIZE = 300;
    var originP = [screenMatrix[12], screenMatrix[13], screenMatrix[14]]; //[modelViewMatrix[12] / MARKER_SIZE, modelViewMatrix[13] / MARKER_SIZE, modelViewMatrix[14] / MARKER_SIZE];
    var deltaOrigin = this.subtractVector3(originP, origin);

    var a = this.dotProduct3(xAxisP, xAxis); // x' dot x
    var b = this.dotProduct3(yAxisP, xAxis); // y' dot x
    var c = this.dotProduct3(xAxisP, yAxis); // x' dot y
    var d = this.dotProduct3(yAxisP, yAxis); // y' dot y
    var e = this.dotProduct3(deltaOrigin, xAxis);
    var f = this.dotProduct3(deltaOrigin, yAxis); 

    var yPrime = (a * (y - f) - c * (x + e)) / (a * d - c * b);
    var xPrime = (x - b * yPrime - e) / (a);

    // var aspectRatio = { x: 1.775, y: 2.998 };
    
    return {
        x: xPrime, // * -1 * aspectRatio.x,
        y: yPrime //* aspectRatio.y
    };
};

realityEditor.gui.ar.utilities.multiplyPointByMatrix4 = function(point, mat) {
    
    var r = [];
    r[0] = mat[0] * point[0] + mat[4] * point[1] + mat[8] * point[2] + mat[12] * point[3];
    r[1] = mat[1] * point[0] + mat[5] * point[1] + mat[9] * point[2] + mat[13] * point[3];
    r[2] = mat[2] * point[0] + mat[6] * point[1] + mat[10] * point[2] + mat[14] * point[3];
    r[3] = mat[3] * point[0] + mat[7] * point[1] + mat[11] * point[2] + mat[15] * point[3];
    return r;
    
};

realityEditor.gui.ar.utilities.moveFrameToScreenCoordinate = function(frame, screenX, screenY) {

    // var overlayDomElement = globalDOMCache[frame.uuid];

    // gauge1.ar.x = 87.52006490007885 - parseInt(framePalette2io9kdgazn9drgaugeDe73r895869u.style.left)


    // var matrixBefore = getTransform(overlayDomElement);
    // var r = [];
    // this.multiplyMatrix();

    var results = this.solveProjectedCoordinatesInFrame(frame, screenX, screenY);

    frame.ar.x = results.point.x - results.left;
    frame.ar.y = results.point.y - results.top;

};

// realityEditor.gui.ar.utilities.solveProjectedCoordinatesInFrame = function(frame, screenX, screenY) {

realityEditor.gui.ar.utilities.solveProjectedCoordinatesInFrame = function(frame, screenX, screenY) {
    
    var overlayDomElement = globalDOMCache[frame.uuid];
    var point = this.solveProjectedCoordinates(overlayDomElement, screenX, screenY);
    var offsetLeft = parseInt(overlayDomElement.style.left);
    var offsetTop = parseInt(overlayDomElement.style.top);
    
    return {
        point: point,
        left: offsetLeft,
        top: offsetTop
    }
};

realityEditor.gui.ar.utilities.solveProjectedCoordinates = function(childDiv, screenX, screenY) {
    
    var dt = 0.1;

    var p0 = this.convertScreenPointToLocalCoordinatesRelativeToDivParent(childDiv, screenX, screenY, 0);
    var p2 = this.convertScreenPointToLocalCoordinatesRelativeToDivParent(childDiv, screenX, screenY, dt);
    
    console.log('first point = ', p0);
    console.log('second point = ', p2);

    var dx = (p2[0] - p0[0]) / dt;
    var dy = (p2[1] - p0[1]) / dt;
    var dz = (p2[2] - p0[2]) / dt;
    
    var neededDt = (p0[2]) / dz;  //(p2[2] - p0[2]) * dt / p0[2];

    var x = p0[0] - dx * neededDt; //dt / neededDt
    var y = p0[1] - dy * neededDt;
    var z = p0[2] - dz * neededDt;
    
    return {
        x: x,
        y: y,
        z: z
    }
};

realityEditor.gui.ar.utilities.convertScreenPointToLocalCoordinatesRelativeToDivParent = function (childDiv, screenX, screenY, screenZ) {
    
    var transformationData = this.testPoints(childDiv);
    var fullTx_flat = convertMatrixToEditorFormat(transformationData.fullTx);
    var fullTx_inverse_flat = this.invertMatrix(fullTx_flat);
    var fullTx_normalized_inverse_flat = this.normalizeMatrix(fullTx_inverse_flat);
    var fullTx_normalized_inverse = convertMatrixToNestedFormat(fullTx_normalized_inverse_flat);
    var resultingPoint = projectVertex(transformVertex(fullTx_normalized_inverse, [screenX, screenY, screenZ, 1]));
    return resultingPoint;
    
};

realityEditor.gui.ar.utilities.convertLocalCoordinatesRelativeToDivParentToScreenPoint = function (childDiv, localX, localY, localZ) {

    var transformationData = this.testPoints(childDiv);
    var resultingPoint = projectVertex(transformVertex(transformationData.fullTx, [localX, localY, localZ, 1]));
    return resultingPoint;

};


realityEditor.gui.ar.utilities.testPoints = function(transformedDiv) {
    // 1. Get the untransformed bounds of the transformed parent element in the document coordinate system.
    // 2. Get the untransformed bounds of the target element in the document coordinate system.
    // 3. Compute the target's untransformed bounds relative to the parent's untransformed bounds.
    //     a. Subtract the top/left offset of (1) from the bounds of (2).
    // 4. Get the css transform of the parent element.
    // 5. Get the transform-origin of the parent element (defaults to (50%, 50%)).
    // 6. Get the actual applied transform (-origin * css transform * origin)
    // 7. Multiply the four vertices from (3) by the computed transform from (6).
    // 8. Perform the homogeneous divide (divide x, y, z by the w component) to apply perspective.
    // 9. Transform the projected vertices back into the document coordinate system.
    // 10. Fun!

    return performComputations();

    function performComputations() {

        // $(".target").on('click', function(){
        //     $(".vertex").remove();

        // Note: The 'parentOrigin' and 'rect' are computed relative to their offsetParent rather than in doc
        //       coordinates. You would need to change how these offsets are computed to make this work in a
        //       more complicated page. In particular, if txParent becomes the offsetParent of 'this', then the
        //       origin will be wrong.

        // (1) Get the untransformed bounds of the parent element. Here we only care about the relative offset
        //     of the parent element to its offsetParent rather than it's full bounding box. This is the origin
        //     that the target elements are relative to.
        var txParent = transformedDiv.parentElement; //document.getElementById('transformed');

        var parentOrigin = [ txParent.offsetLeft, txParent.offsetTop, 0, 0 ];
        console.log('Parent Origin: ', parentOrigin);

        // (2) Get the untransformed bounding box of the target elements. This will be the box that is transformed.
        var rect = { left: transformedDiv.offsetLeft, top: transformedDiv.offsetTop, right: transformedDiv.offsetLeft + transformedDiv.offsetWidth, bottom: transformedDiv.offsetTop + transformedDiv.offsetHeight };

        // Create the vertices in the coordinate system of their offsetParent - in this case <body>.
        var vertices =
            [
                [ rect.left, rect.top, 0, 1 ],
                [ rect.right, rect.bottom, 0, 1 ],
                [ rect.right, rect.top, 0, 1 ],
                [ rect.left, rect.bottom, 0, 1 ]
            ];
        console.log('Original: ', vertices);

        // (3) Transform the vertices to be relative to transformed parent (the element with
        //     the CSS transform on it).
        var relVertices = [ [], [], [], [] ];
        for (var i = 0; i < 4; ++i)
        {
            relVertices[i][0] = vertices[i][0] - parentOrigin[0];
            relVertices[i][1] = vertices[i][1] - parentOrigin[1];
            relVertices[i][2] = vertices[i][2];
            relVertices[i][3] = vertices[i][3];
        }

        // (4) Get the CSS transform from the transformed parent
        var tx = getTransform(txParent);
        console.log('Transform: ', tx);

        // (5) Get the CSS transform origin from the transformed parent - default is '50% 50%'
        var txOrigin = getTransformOrigin(txParent);
        console.log('Transform Origin: ', txOrigin);

        // (6) Compute the full transform that is applied to the transformed parent (-origin * tx * origin)
        var fullTx = computeTransformMatrix(tx, txOrigin);
        console.log('Full Transform: ', fullTx);

        // (7) Transform the vertices from the target element's bounding box by the full transform
        var txVertices = [ ];
        for (var i = 0; i < 4; ++i)
        {
            txVertices[i] = transformVertex(fullTx, relVertices[i]);
        }

        console.log('Transformed: ', txVertices);
        
        // (8) Perform the homogeneous divide to apply perspective to the points (divide x,y,z by the w component).
        var projectedVertices = [ ];
        for (var i = 0; i < 4; ++i)
        {
            projectedVertices[i] = projectVertex(txVertices[i]);
        }

        console.log('Projected: ', projectedVertices);

        // console.log('Projected Origin: ', projectVertex(transformVertex(fullTx, [0, 0, 0, 1])));

        // (9) After the transformed vertices have been computed, transform them back into the coordinate
        // system of the offsetParent.
        var finalVertices = [ [], [], [], [] ];
        for (var i = 0; i < 4; ++i)
        {
            finalVertices[i][0] = projectedVertices[i][0] + parentOrigin[0];
            finalVertices[i][1] = projectedVertices[i][1] + parentOrigin[1];
            finalVertices[i][2] = projectedVertices[i][2];
            finalVertices[i][3] = projectedVertices[i][3];
        }

        // // (10) And then add the vertex elements in the 'offsetParent' coordinate system (in this case again
        // //      it is <body>).
        // for (var i = 0; i < 4; ++i)
        // {
        //     $("<div></div>").addClass("vertex")
        //         .css('position', 'absolute')
        //         .css('left', finalVertices[i][0])
        //         .css('top', finalVertices[i][1])
        //         .appendTo('body');
        // }
        
        return {
            vertices: vertices,
            relVertices: relVertices,
            tx: tx,
            txOrigin: txOrigin,
            fullTx: fullTx,
            txVertices: txVertices,
            projectedVertices: projectedVertices,
            finalVertices: finalVertices
        }
    }//);
};

    function printMatrix(mat)
    {
        var str = '';
        for (var i = 0; i < 4; ++i)
        {
            for (var j = 0; j < 4; ++j)
            {
                str += (' ' + mat[i][j]);
            }

            str += '\r\n';
        }

        console.log(str);
    }

    function getTransform(ele)
    {
        var st = window.getComputedStyle(ele, null);

        var tr = st.getPropertyValue("-webkit-transform") ||
            st.getPropertyValue("-moz-transform") ||
            st.getPropertyValue("-ms-transform") ||
            st.getPropertyValue("-o-transform") ||
            st.getPropertyValue("transform");

        var values = tr.split('(')[1],
            values = values.split(')')[0],
            values = values.split(',');

        var mat = [ [1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1] ];
        if (values.length === 16)
        {
            for (var i = 0; i < 4; ++i)
            {
                for (var j = 0; j < 4; ++j)
                {
                    mat[j][i] = +values[i * 4 + j];
                }
            }
        }
        else
        {
            for (var i = 0; i < 3; ++i)
            {
                for (var j = 0; j < 2; ++j)
                {
                    mat[j][i] = +values[i * 2 + j];
                }
            }
        }

        return mat;
    }

    function getTransformOrigin(ele)
    {
        var st = window.getComputedStyle(ele, null);

        var tr = st.getPropertyValue("-webkit-transform-origin") ||
            st.getPropertyValue("-moz-transform-origin") ||
            st.getPropertyValue("-ms-transform-origin") ||
            st.getPropertyValue("-o-transform-origin") ||
            st.getPropertyValue("transform-origin");

        var values = tr.split(' ');

        var out = [ 0, 0, 0, 1 ];
        for (var i = 0; i < values.length; ++i)
        {
            out[i] = parseInt(values[i]);
        }

        return out;
    }

    function createTranslateMatrix(x, y, z)
    {
        var out =
            [
                [1, 0, 0, x],
                [0, 1, 0, y],
                [0, 0, 1, z],
                [0, 0, 0, 1]
            ];

        return out;
    }

    function multiply(pre, post)
    {
        var out = [ [], [], [], [] ];

        for (var i = 0; i < 4; ++i)
        {
            for (var j = 0; j < 4; ++j)
            {
                var sum = 0;

                for (var k = 0; k < 4; ++k)
                {
                    sum += (pre[k][i] * post[j][k]);
                }

                out[j][i] = sum;
            }
        }

        return out;
    }

    function computeTransformMatrix(tx, origin)
    {
        var out;

        var preMul = createTranslateMatrix(-origin[0], -origin[1], -origin[2]);
        var postMul = createTranslateMatrix(origin[0], origin[1], origin[2]);

        var temp1 = multiply(preMul, tx);

        out = multiply(temp1, postMul);

        return out;
    }

    function transformVertex(mat, vert)
    {
        var out = [ ];

        for (var i = 0; i < 4; ++i)
        {
            var sum = 0;
            for (var j = 0; j < 4; ++j)
            {
                sum += +mat[i][j] * vert[j];
            }

            out[i] = sum;
        }

        return out;
    }

    function projectVertex(vert)
    {
        var out = [ ];

        for (var i = 0; i < 4; ++i)
        {
            out[i] = vert[i] / vert[3];
        }

        return out;
    }

//[[853.0175882675201, -81.558026445504, -715.716688451392, 402193.69740545773], [-60.27586696832, 909.4247975884799, -432.38280259712, 248266.05348174588], [-0.323089532888, -0.24763677828400002, -1.9622245246080001, 388.8231925613869], [-0.322444, -0.247142, -1.958304, 1872.464106]]

// -->

// [[853.0175882675201, -81.558026445504, -715.716688451392, 402193.69740545773], [-60.27586696832, 909.4247975884799, -432.38280259712, 248266.05348174588], [-0.323089532888, -0.24763677828400002, -1.9622245246080001, 388.8231925613869], [-0.322444, -0.247142, -1.958304, 1872.464106]]

function convertMatrixToEditorFormat(mat) {
    r = [];
    r[0] = mat[0][0];
    r[1] = mat[1][0];
    r[2] = mat[2][0];
    r[3] = mat[3][0];

    r[4] = mat[0][1];
    r[5] = mat[1][1];
    r[6] = mat[2][1];
    r[7] = mat[3][1];

    r[8] = mat[0][2];
    r[9] = mat[1][2];
    r[10] = mat[2][2];
    r[11] = mat[3][2];

    r[12] = mat[0][3];
    r[13] = mat[1][3];
    r[14] = mat[2][3];
    r[15] = mat[3][3];
    return r;
}

function convertMatrixToNestedFormat(mat) {
    r = [[],[],[],[]];
    r[0][0] = mat[0];
    r[1][0] = mat[1];
    r[2][0] = mat[2];
    r[3][0] = mat[3];

    r[0][1] = mat[4];
    r[1][1] = mat[5];
    r[2][1] = mat[6];
    r[3][1] = mat[7];

    r[0][2] = mat[8];
    r[1][2] = mat[9];
    r[2][2] = mat[10];
    r[3][2] = mat[11];

    r[0][3] = mat[12];
    r[1][3] = mat[13];
    r[2][3] = mat[14];
    r[3][3] = mat[15];
    return r;
}

realityEditor.gui.ar.utilities.transposeMatrix = function(mat) {
    var r = [];
    r[0] = mat[0];
    r[1] = mat[4];
    r[2] = mat[8];
    r[3] = mat[12];

    r[4] = mat[1];
    r[5] = mat[5];
    r[6] = mat[9];
    r[7] = mat[13];

    r[8] = mat[2];
    r[9] = mat[6];
    r[10] = mat[10];
    r[11] = mat[14];

    r[12] = mat[3];
    r[13] = mat[7];
    r[14] = mat[11];
    r[15] = mat[15];

    return r;
};

realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY = function(thisObject, touch) {

    // var point = this.getLocalPointFromScreenPoint(thisObject, touch[0], touch[1]); 
    var point = this.getLocalPointFromScreenPointDiffOrigin(thisObject, touch[0], touch[1]);
    return [point.x, point.y];

    // var tempMatrix;
    // if (globalStates.unconstrainedPositioning === true)
    //     tempMatrix = this.copyMatrix(thisObject.begin);
    // else
    //     tempMatrix = this.copyMatrix(thisObject.temp);
    //
    // // console.log(tempMatrix);
    //
    // // calculate angles
    // var angles = this.toAxisAngle(tempMatrix);
    //
    // var angX = angles[0] * Math.sin(angles[2]) + angles[1] * Math.cos(angles[2]);
    // var angY = angles[0] * Math.cos(angles[2]) - angles[1] * Math.sin(angles[2]); // TODO: is this calculation correct? 
    //
    // // calculate new x and y
    // var positionX =  tempMatrix[14] * ((touch[0] - globalStates.height / 2) * (Math.abs(angX/2)+1));
    // var positionY = tempMatrix[14]  * ((touch[1] - globalStates.width / 2) * (Math.abs(angY/2)+1));
    //
    // // replace old x and y with new
    //
    // var tempObjectMatrix = [
    //     tempMatrix[0], tempMatrix[1], tempMatrix[2], tempMatrix[3],
    //     tempMatrix[4], tempMatrix[5], tempMatrix[6], tempMatrix[7],
    //     tempMatrix[8], tempMatrix[9], tempMatrix[10], tempMatrix[11],
    //     positionX, positionY, tempMatrix[14], tempMatrix[15]
    // ];
    //
    // // and multiply this manipulated matrix with its original inverted.
    //
    // // var invertedObjectMatrix = invertMatrix(tempMatrix);
    // var resultMatrix = [];
    // this.multiplyMatrix(tempObjectMatrix, this.invertMatrix(tempMatrix), resultMatrix);
    //
    // // results in the new x and y
    //
    // if (typeof resultMatrix[12] === "number" && typeof resultMatrix[13] === "number")
    //     return [resultMatrix[12],resultMatrix[13]];
    // else
    //     return null;

};

realityEditor.gui.ar.utilities.visibleObjectMatrixToMVP = function(visibleObjectMatrix) {
    var unrotatedResult = [];
    realityEditor.gui.ar.utilities.multiplyMatrix(visibleObjectMatrix, globalStates.realProjectionMatrix, unrotatedResult);
    // var result = [];
    // realityEditor.gui.ar.utilities.multiplyMatrix(rotateX, unrotatedResult, result);
    
    result = this.copyMatrix(unrotatedResult);
    // result[0] = -1;
    return result;
};

// realityEditor.gui.ar.utilities.getLocalPointFromScreenPoint = function(object, x, y) {
//
//     var modelViewMatrix = realityEditor.gui.ar.draw.visibleObjects[object.objectId]; //frame.objectId
//     // var modelViewProjectionMatrix = [];
//     // this.multiplyMatrix(modelViewMatrix, globalStates.realProjectionMatrix, modelViewProjectionMatrix);
//     var modelViewProjectionMatrix = this.visibleObjectMatrixToMVP(modelViewMatrix);
//     var screenMatrix = this.newIdentityMatrix();
//     screenMatrix[0] = -1;
//     // screenMatrix[0] = 568;
//     // screenMatrix[5] = 320;
//
//
//     var HEIGHT_DIV_2 = globalStates.width / 2;
//     var WIDTH_DIV_2 = globalStates.height / 2;
//     // var ASPECT = globalStates.width / globalStates.height;
//
//     // var dx = (x / WIDTH_DIV_2 - 1.0) / ASPECT;
//     // var dy = 1.0 - y / HEIGHT_DIV_2;
//     var dx = (x / WIDTH_DIV_2) - 1; // TODO: divide this all by ASPECT if it isnt scaled correctly
//     var dy = (y / HEIGHT_DIV_2) - 1;
//
//     // var Z = modelViewMatrix[14];
//     // var dist = Z * tan ( FOV / 2 )
//
//     // console.log(dx, dy);
//
//     var point = this.convertPointBetweenCoordinateSystems(screenMatrix, modelViewProjectionMatrix, dx, dy);
//
//     point.x *= 568;
//     point.y *= 320;
//
//     return point;
// };

realityEditor.gui.ar.utilities.getScreenPointFromLocalPoint = function(object, x, y) {
    var modelViewMatrix = realityEditor.gui.ar.draw.visibleObjects[object.objectId]; //frame.objectId
    // var modelViewProjectionMatrix = [];
    // this.multiplyMatrix(modelViewMatrix, globalStates.realProjectionMatrix, modelViewProjectionMatrix);
    var modelViewProjectionMatrix = this.visibleObjectMatrixToMVP(modelViewMatrix);
    var screenMatrix = this.newIdentityMatrix();
    // screenMatrix[0] = 568;
    // screenMatrix[5] = 320;
    return this.convertPointBetweenCoordinateSystems(modelViewProjectionMatrix, screenMatrix, x, y);
};

realityEditor.gui.ar.utilities.convertPointBetweenCoordinateSystems = function(matrixFrom, matrixTo, x, y) {

    // var xAxis = [matrixFrom[0], matrixFrom[1], matrixFrom[2]]; //[1,0,0];
    // var yAxis =  [matrixFrom[4], matrixFrom[5], matrixFrom[6]]; //[0,1,0];
    // var xAxisP = [matrixTo[0], matrixTo[1], matrixTo[2]]; // "P" in name stands for "Prime" (projected coordinate space)
    // var yAxisP = [matrixTo[4], matrixTo[5], matrixTo[6]];
    // // var zAxisP = [modelViewMatrix[8],modelViewMatrix[9],modelViewMatrix[10]];
    
    var xAxis = [matrixFrom[0], matrixFrom[4], matrixFrom[8]]; //[1,0,0];
    var yAxis =  [matrixFrom[1], matrixFrom[5], matrixFrom[9]]; //[0,1,0];
    var xAxisP = [matrixTo[0], matrixTo[4], matrixTo[8]]; // "P" in name stands for "Prime" (projected coordinate space)
    var yAxisP = [matrixTo[1], matrixTo[5], matrixTo[9]];
    // var zAxisP = [modelViewMatrix[8],modelViewMatrix[9],modelViewMatrix[10]];

    // var origin = [matrixFrom[12], matrixFrom[13], matrixFrom[14]];
    // var originP = [matrixTo[12], matrixTo[13], matrixTo[14]];
    var origin = [matrixFrom[3], matrixFrom[7], matrixFrom[11]];
    var originP = [matrixTo[3], matrixTo[7], matrixTo[11]];
    var deltaOrigin = this.subtractVector3(originP, origin);

    var a = this.dotProduct3(xAxisP, xAxis); // x' dot x
    var b = this.dotProduct3(yAxisP, xAxis); // y' dot x
    var c = this.dotProduct3(xAxisP, yAxis); // x' dot y
    var d = this.dotProduct3(yAxisP, yAxis); // y' dot y
    var e = this.dotProduct3(deltaOrigin, xAxis);
    var f = this.dotProduct3(deltaOrigin, yAxis);

    var yPrime = (a * (y - f) - c * (x + e)) / (a * d - c * b);
    var xPrime = (x - b * yPrime - e) / (a);

    return {
        x: -1 * xPrime,
        y: yPrime
    };
};

realityEditor.gui.ar.utilities.prettyPrintMatrix = function(matrix) {

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


/*jslint plusplus: true, vars: true, indent: 2 */

/*
  convertPointFromPageToNode(element, event.pageX, event.pageY) -> {x, y}
  returns coordinate in element's local coordinate system (works properly with css transforms without perspective projection)

  convertPointFromNodeToPage(element, offsetX, offsetY) -> {x, y}
  returns coordinate in window's coordinate system (works properly with css transforms without perspective projection)
*/
(function () {
    "use strict";

    function Point(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    function CSSMatrix(data) {
        this.data = data;
    }

    CSSMatrix.fromString = function (s) {
        var c = s.match(/matrix3?d?\(([^\)]+)\)/i)[1].split(",");
        if (c.length === 6) {
            c = [c[0], c[1], "0", "0", c[2], c[3], "0", "0", "0", "0", "1", "0", c[4], c[5], "0", "1"];
        }
        return new CSSMatrix([
            parseFloat(c[0 * 4 + 0]),
            parseFloat(c[1 * 4 + 0]),
            parseFloat(c[2 * 4 + 0]),
            parseFloat(c[3 * 4 + 0]),

            parseFloat(c[0 * 4 + 1]),
            parseFloat(c[1 * 4 + 1]),
            parseFloat(c[2 * 4 + 1]),
            parseFloat(c[3 * 4 + 1]),

            parseFloat(c[0 * 4 + 2]),
            parseFloat(c[1 * 4 + 2]),
            parseFloat(c[2 * 4 + 2]),
            parseFloat(c[3 * 4 + 2]),

            parseFloat(c[0 * 4 + 3]),
            parseFloat(c[1 * 4 + 3]),
            parseFloat(c[2 * 4 + 3]),
            parseFloat(c[3 * 4 + 3]),
        ]);
    };

    CSSMatrix.prototype.multiply = function (m) {
        var a = this.data;
        var b = m.data;
        return new CSSMatrix([
            a[0 * 4 + 0] * b[0 * 4 + 0] + a[0 * 4 + 1] * b[1 * 4 + 0] + a[0 * 4 + 2] * b[2 * 4 + 0] + a[0 * 4 + 3] * b[3 * 4 + 0],
            a[0 * 4 + 0] * b[0 * 4 + 1] + a[0 * 4 + 1] * b[1 * 4 + 1] + a[0 * 4 + 2] * b[2 * 4 + 1] + a[0 * 4 + 3] * b[3 * 4 + 1],
            a[0 * 4 + 0] * b[0 * 4 + 2] + a[0 * 4 + 1] * b[1 * 4 + 2] + a[0 * 4 + 2] * b[2 * 4 + 2] + a[0 * 4 + 3] * b[3 * 4 + 2],
            a[0 * 4 + 0] * b[0 * 4 + 3] + a[0 * 4 + 1] * b[1 * 4 + 3] + a[0 * 4 + 2] * b[2 * 4 + 3] + a[0 * 4 + 3] * b[3 * 4 + 3],

            a[1 * 4 + 0] * b[0 * 4 + 0] + a[1 * 4 + 1] * b[1 * 4 + 0] + a[1 * 4 + 2] * b[2 * 4 + 0] + a[1 * 4 + 3] * b[3 * 4 + 0],
            a[1 * 4 + 0] * b[0 * 4 + 1] + a[1 * 4 + 1] * b[1 * 4 + 1] + a[1 * 4 + 2] * b[2 * 4 + 1] + a[1 * 4 + 3] * b[3 * 4 + 1],
            a[1 * 4 + 0] * b[0 * 4 + 2] + a[1 * 4 + 1] * b[1 * 4 + 2] + a[1 * 4 + 2] * b[2 * 4 + 2] + a[1 * 4 + 3] * b[3 * 4 + 2],
            a[1 * 4 + 0] * b[0 * 4 + 3] + a[1 * 4 + 1] * b[1 * 4 + 3] + a[1 * 4 + 2] * b[2 * 4 + 3] + a[1 * 4 + 3] * b[3 * 4 + 3],

            a[2 * 4 + 0] * b[0 * 4 + 0] + a[2 * 4 + 1] * b[1 * 4 + 0] + a[2 * 4 + 2] * b[2 * 4 + 0] + a[2 * 4 + 3] * b[3 * 4 + 0],
            a[2 * 4 + 0] * b[0 * 4 + 1] + a[2 * 4 + 1] * b[1 * 4 + 1] + a[2 * 4 + 2] * b[2 * 4 + 1] + a[2 * 4 + 3] * b[3 * 4 + 1],
            a[2 * 4 + 0] * b[0 * 4 + 2] + a[2 * 4 + 1] * b[1 * 4 + 2] + a[2 * 4 + 2] * b[2 * 4 + 2] + a[2 * 4 + 3] * b[3 * 4 + 2],
            a[2 * 4 + 0] * b[0 * 4 + 3] + a[2 * 4 + 1] * b[1 * 4 + 3] + a[2 * 4 + 2] * b[2 * 4 + 3] + a[2 * 4 + 3] * b[3 * 4 + 3],

            a[3 * 4 + 0] * b[0 * 4 + 0] + a[3 * 4 + 1] * b[1 * 4 + 0] + a[3 * 4 + 2] * b[2 * 4 + 0] + a[3 * 4 + 3] * b[3 * 4 + 0],
            a[3 * 4 + 0] * b[0 * 4 + 1] + a[3 * 4 + 1] * b[1 * 4 + 1] + a[3 * 4 + 2] * b[2 * 4 + 1] + a[3 * 4 + 3] * b[3 * 4 + 1],
            a[3 * 4 + 0] * b[0 * 4 + 2] + a[3 * 4 + 1] * b[1 * 4 + 2] + a[3 * 4 + 2] * b[2 * 4 + 2] + a[3 * 4 + 3] * b[3 * 4 + 2],
            a[3 * 4 + 0] * b[0 * 4 + 3] + a[3 * 4 + 1] * b[1 * 4 + 3] + a[3 * 4 + 2] * b[2 * 4 + 3] + a[3 * 4 + 3] * b[3 * 4 + 3],
        ]);
    };
    CSSMatrix.prototype.translate = function (tx, ty, tz) {
        var z = new CSSMatrix([1, 0, 0, tx, 0, 1, 0, ty, 0, 0, 1, tz, 0, 0, 0, 1]);
        return this.multiply(z);
    };
    CSSMatrix.prototype.inverse = function () {
        var m = this.data;
        var a = m[0 * 4 + 0];
        var b = m[0 * 4 + 1];
        var c = m[0 * 4 + 2];
        var d = m[1 * 4 + 0];
        var e = m[1 * 4 + 1];
        var f = m[1 * 4 + 2];
        var g = m[2 * 4 + 0];
        var h = m[2 * 4 + 1];
        var k = m[2 * 4 + 2];
        var A = e * k - f * h;
        var B = f * g - d * k;
        var C = d * h - e * g;
        var D = c * h - b * k;
        var E = a * k - c * g;
        var F = b * g - a * h;
        var G = b * f - c * e;
        var H = c * d - a * f;
        var K = a * e - b * d;
        var det = a * A + b * B + c * C;
        var X = new CSSMatrix([A / det, D / det, G / det, 0,
            B / det, E / det, H / det, 0,
            C / det, F / det, K / det, 0,
            0,       0,       0, 1]);
        var Y = new CSSMatrix([1, 0, 0, -m[0 * 4 + 3],
            0, 1, 0, -m[1 * 4 + 3],
            0, 0, 1, -m[2 * 4 + 3],
            0, 0, 0,            1]);
        return X.multiply(Y);
    };
    CSSMatrix.prototype.transformPoint = function (p) {
        var m = this.data;
        return new Point(m[0 * 4 + 0] * p.x + m[0 * 4 + 1] * p.y + m[0 * 4 + 2] * p.z + m[0 * 4 + 3],
            m[1 * 4 + 0] * p.x + m[1 * 4 + 1] * p.y + m[1 * 4 + 2] * p.z + m[1 * 4 + 3],
            m[2 * 4 + 0] * p.x + m[2 * 4 + 1] * p.y + m[2 * 4 + 2] * p.z + m[2 * 4 + 3]);
    };

    var isBuggy = false; // Firefox < 12 (https://bugzilla.mozilla.org/show_bug.cgi?id=591718)
    var initialized = false;

    var buggy = function (doc) {
        if (initialized) {
            return isBuggy;
        }
        initialized = true;
        var div = doc.createElement("div");
        div.style.cssText = "width:200px;height:200px;position:fixed;-moz-transform:scale(2);";
        doc.body.appendChild(div);
        var rect = div.getBoundingClientRect();
        isBuggy = getComputedStyle(div, undefined).MozTransform != undefined && (rect.bottom - rect.top < 300);
        div.parentNode.removeChild(div);
        return isBuggy;
    };

    function getTransformationMatrix(element) {
        var identity = CSSMatrix.fromString("matrix(1,0,0,1,0,0)");
        var transformationMatrix = identity;
        var x = element;
        var isBuggy = buggy(x.ownerDocument);

        while (x != undefined && x !== x.ownerDocument.documentElement) {
            var computedStyle = window.getComputedStyle(x, undefined);
            var c = CSSMatrix.fromString((computedStyle.transform || computedStyle.OTransform || computedStyle.WebkitTransform || computedStyle.msTransform ||  computedStyle.MozTransform || "none").replace(/^none$/, "matrix(1,0,0,1,0,0)"));

            if (isBuggy) {
                var r = x.getBoundingClientRect();
                var parentRect = x.parentNode != undefined && x.parentNode.getBoundingClientRect != undefined ? x.parentNode.getBoundingClientRect() : rect;
                var t = identity.translate(r.left - parentRect.left, r.top - parentRect.top, 0);

                var origin = computedStyle.MozTransformOrigin;
                origin = origin.indexOf("%") !== -1 ? "" : origin;
                origin = CSSMatrix.fromString("matrix3d(1,0,0,0,0,1,0,0,0,0,1,0," + ((origin || "0 0") + " 0").split(" ").slice(0, 3) + ",1)");

                transformationMatrix = t.multiply(origin).multiply(c).multiply(origin.inverse()).multiply(transformationMatrix);
            } else {
                transformationMatrix = c.multiply(transformationMatrix);
            }

            x = x.parentNode;
        }

        if (!isBuggy) {
            
            // console.log(transformationMatrix.data);
            if (transformationMatrix.data[15] !== 1 || transformationMatrix.data[15] !== 0) {
                transformationMatrix.data = realityEditor.gui.ar.utilities.scalarMultiplyMatrix(transformationMatrix.data, 1.0/transformationMatrix.data[15]);
            }
            
            var w = element.offsetWidth;
            var h = element.offsetHeight;
            var i = 4;
            var left = +Infinity;
            var top = +Infinity;
            while (--i >= 0) {
                var p = transformationMatrix.transformPoint(new Point(i === 0 || i === 1 ? 0 : w, i === 0 || i === 3 ? 0 : h, 0));
                if (p.x < left) {
                    left = p.x;
                }
                if (p.y < top) {
                    top = p.y;
                }
            }
            var rect = element.getBoundingClientRect();
            transformationMatrix = identity.translate(window.pageXOffset + rect.left - left, window.pageYOffset + rect.top - top, 0).multiply(transformationMatrix);
        }

        return transformationMatrix;
    }

    window.convertPointFromPageToNode = function (element, pageX, pageY) {
        return getTransformationMatrix(element).inverse().transformPoint(new Point(pageX, pageY, 0));
    };

    window.convertPointFromNodeToPage = function (element, offsetX, offsetY) {
        return getTransformationMatrix(element).transformPoint(new Point(offsetX, offsetY, 0));
    };

}());
