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

createNameSpace("realityEditor.gui.ar.draw");

/**
 * @fileOverview realityEditor.gui.ar.draw.js
 * Contains the main rendering code for rendering frames and nodes into the 3D scene.
 * Also determines when visual elements need to be hidden or shown, and has code for creating
 * the DOM elements for new frames and nodes.
 */

/**********************************************************************************************************************
 ******************************************** update and draw the 3D Interface ****************************************
 **********************************************************************************************************************/


realityEditor.gui.ar.draw.globalCanvas = globalCanvas;
/**
 * @type {Object.<string, Array.<number>>}
 */
realityEditor.gui.ar.draw.visibleObjects = {};
realityEditor.gui.ar.draw.globalStates = globalStates;
realityEditor.gui.ar.draw.globalDOMCache = globalDOMCache;
realityEditor.gui.ar.draw.activeObject = {};
realityEditor.gui.ar.draw.activeFrame = {};
realityEditor.gui.ar.draw.activeNode = {};
realityEditor.gui.ar.draw.activeVehicle = {};
realityEditor.gui.ar.draw.activeObjectMatrix = [];
realityEditor.gui.ar.draw.finalMatrix = [];
realityEditor.gui.ar.draw.rotateX = rotateX;
realityEditor.gui.ar.draw.nodeCalculations = {
    size: 0, // TODO: only rectPoints is used, we can get rid of other properties in here
    x: 0,
    y: 0,
    rectPoints: []
};
/**
 * @type {{temp: number[], begin: number[], end: number[], r: number[], r2: number[], r3: number[]}}
 */
realityEditor.gui.ar.draw.matrix = {
    temp: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    begin: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    end: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    r: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    r2: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    r3 :[
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]
};
realityEditor.gui.ar.draw.objectKey = "";
realityEditor.gui.ar.draw.frameKey = "";
realityEditor.gui.ar.draw.nodeKey = "";
realityEditor.gui.ar.draw.activeKey = "";
realityEditor.gui.ar.draw.type = "";
realityEditor.gui.ar.draw.notLoading = "";
realityEditor.gui.ar.draw.utilities = realityEditor.gui.ar.utilities;

/**
 * don't render the following node types:
 * @type {Array.<string>}
 */
realityEditor.gui.ar.draw.hiddenNodeTypes = [
    'storeData',
    'invisible'
];

/**
 * Array of registered callbacks for the update function
 * @type {Array}
 */
realityEditor.gui.ar.draw.updateListeners = [];

/**
 * Registers a callback from an external module to be updated every frame with the visibleObjects matrices
 * @param {function} callback
 */
realityEditor.gui.ar.draw.addUpdateListener = function (callback) {
    this.updateListeners.push(callback);
};

/**
 * The most recently received set of matrices for the currently visible objects.
 * A set of {objectId: matrix} pairs, one per recognized marker
 * @type {Object.<string, Array.<number>>}
 */
realityEditor.gui.ar.draw.visibleObjectsCopy = {};

/**
 * The most recently received camera matrix
 * @type {Array.<number>}
 */
realityEditor.gui.ar.draw.cameraMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

/**
 * Main update loop.
 * A wrapper for the real realityEditor.gui.ar.draw.update update function.
 * Calling it this way, using requestAnimationFrame, makes it render more smoothly.
 * (A different update loop inside of desktopAdapter is used on desktop devices to include camera manipulations)
 */
realityEditor.gui.ar.draw.updateLoop = function () {
    realityEditor.gui.ar.draw.update(JSON.parse(JSON.stringify(realityEditor.gui.ar.draw.visibleObjectsCopy)));
    requestAnimationFrame(realityEditor.gui.ar.draw.updateLoop);
};

function extractRotation(matrix, flipX, flipY, flipZ) {
    // gives correct rotation
    var q = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(matrix);
    // var invQ = realityEditor.gui.ar.utilities.invertQuaternion(q);
    // realityEditor.gui.ar.utilities.normalizeQuaternion()

    var eulerAngles = realityEditor.gui.ar.utilities.quaternionToEulerAngles(q);
    if (flipX) {
        eulerAngles.theta *= -1; // flips one axis of rotation
    }
    if (flipY) {
        eulerAngles.psi *= -1; // flips another axis of rotation
    }
    if (flipZ) {
        eulerAngles.phi *= -1; // etc
    }
    var invQ = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(eulerAngles.theta, eulerAngles.psi, eulerAngles.phi);
    var rotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(invQ);
    
    return rotationMatrix;
}

function extractTranslation(matrix, flipX, flipY, flipZ) {
    var translationMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
    translationMatrix[12] = matrix[12]; 
    translationMatrix[13] = matrix[13]; 
    translationMatrix[14] = matrix[14]; 

    if (flipX) {
        translationMatrix[12] *= -1; // flips one axis of translation
    }
    if (flipY) {
        translationMatrix[13] *= -1; // flips another axis of translation
    }
    if (flipZ) {
        translationMatrix[14] *= -1; // etc
    }

    return translationMatrix;
}


/**
 * Takes a (mostly) unmodified Vuforia PositionalDeviceTracker pose matrix and converts to correct format for Reality Editor ModelView Matrix
 * cameraMatrix = realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(unmodifiedCameraMatrix));
 * @param {Array.<number>} originalCameraMatrix
 */
function correctCameraMatrix(originalCameraMatrix) {
    
    try {
        // var m1 = originalCameraMatrix; //realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(originalCameraMatrix));

        // // calculate rotation component of the transformation matrix
        // var q = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(m1);
        // var eulerAngles = realityEditor.gui.ar.utilities.quaternionToEulerAngles(q);
        // // eulerAngles.theta *= -1;
        // eulerAngles.psi *= -1;
        // var q2 = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(eulerAngles.theta, eulerAngles.psi, eulerAngles.phi);
        // var rotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(q2);
        //
        // // add the translation component
        // var translation = realityEditor.gui.ar.utilities.newIdentityMatrix();
        // translation[12] = m1[12];
        // translation[13] = m1[13];
        // translation[14] = m1[14];
        // translation[15] = m1[15];
        //
        // // translation[3] = realityEditor.gui.ar.draw.cameraMatrix[3];
        // // translation[7] = realityEditor.gui.ar.draw.cameraMatrix[7];
        // // translation[11] = realityEditor.gui.ar.draw.cameraMatrix[11];
        // // translation[15] = realityEditor.gui.ar.draw.cameraMatrix[15];
        //
        // // translation[12] = realityEditor.gui.ar.draw.cameraMatrix[3];
        // // translation[13] = realityEditor.gui.ar.draw.cameraMatrix[7];
        // // translation[14] = realityEditor.gui.ar.draw.cameraMatrix[11];
        // // translation[15] = realityEditor.gui.ar.draw.cameraMatrix[15];
        //
        // // var transformationMatrix = rotationMatrix;
        // var transformationMatrix = [];
        // realityEditor.gui.ar.utilities.multiplyMatrix(rotationMatrix, translation, transformationMatrix);
        //
        // // visibleObjects[worldObjectKey] = realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(transformationMatrix));
        //
        // visibleObjects[worldObjectKey] = realityEditor.gui.ar.utilities.invertMatrix(transformationMatrix);
        //
        //
        // // visibleObjects[worldObjectKey] = realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.draw.cameraMatrix);
        //
        //
        // // flips x-rotation but messes up y-rotation later
        // // visibleObjects[worldObjectKey][2] *= -1;
        // // visibleObjects[worldObjectKey][6] *= -1;
        // // visibleObjects[worldObjectKey][8] *= -1;
        // // visibleObjects[worldObjectKey][9] *= -1;
        //
        // var consoleElement = document.getElementById('speechConsole');
        // if (consoleElement) {
        //     consoleElement.innerHTML = '';
        //     var numDecimals = 3;
        //     consoleElement.innerHTML =
        //         'X:' + (realityEditor.gui.ar.draw.cameraMatrix[3]).toFixed(numDecimals) + '<br>' +
        //         'Y:' + (realityEditor.gui.ar.draw.cameraMatrix[7]).toFixed(numDecimals) + '<br>' +
        //         'Z:' + (realityEditor.gui.ar.draw.cameraMatrix[11]).toFixed(numDecimals);
        //
        //     // consoleElement.innerHTML = prettyPrint(this.activeObjectMatrix, 3);
        // }
        //
        //
        // // var consoleElement = document.getElementById('speechConsole');
        // // if (consoleElement) {
        // //     consoleElement.innerHTML = '';
        // //     var numDecimals = 3;
        // //     consoleElement.innerHTML =
        // //         'X:' + realityEditor.gui.ar.utilities.getRotationAboutAxisX(realityEditor.gui.ar.draw.cameraMatrix).toFixed(numDecimals) + '<br>' +
        // //         'Y:' + realityEditor.gui.ar.utilities.getRotationAboutAxisY(realityEditor.gui.ar.draw.cameraMatrix).toFixed(numDecimals) + '<br>' +
        // //         'Z:' + realityEditor.gui.ar.utilities.getRotationAboutAxisZ(realityEditor.gui.ar.draw.cameraMatrix).toFixed(numDecimals);
        // //
        // //     // consoleElement.innerHTML = prettyPrint(this.activeObjectMatrix, 3);
        // // }

        // // gives correct rotation
        // var q = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(originalCameraMatrix);
        // // var invQ = realityEditor.gui.ar.utilities.invertQuaternion(q);
        // // realityEditor.gui.ar.utilities.normalizeQuaternion()
        //
        // var eulerAngles = realityEditor.gui.ar.utilities.quaternionToEulerAngles(q);
        // eulerAngles.theta *= -1; // flips one axis of rotation
        // eulerAngles.psi *= -1; // flips another axis of rotation
        // // eulerAngles.phi *= -1; // (don't flip the third!)
        // var invQ = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(eulerAngles.theta, eulerAngles.psi, eulerAngles.phi);
        // var rotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(invQ);
        
        var rotationMatrix = extractRotation(originalCameraMatrix, true, true, false);

        // visibleObjects[worldObjectKey][12] = realityEditor.gui.ar.draw.cameraMatrix[3];
        // visibleObjects[worldObjectKey][13] = realityEditor.gui.ar.draw.cameraMatrix[7];
        // visibleObjects[worldObjectKey][14] = -1 * realityEditor.gui.ar.draw.cameraMatrix[11];

        // add the translation component
        // var invM1 = realityEditor.gui.ar.utilities.invertMatrix(originalCameraMatrix);
        // var translationMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
        // translationMatrix[12] = invM1[12]; //originalCameraMatrix[3];
        // translationMatrix[13] = -1 * invM1[13]; //originalCameraMatrix[7]; // flips one axis of translation
        // translationMatrix[14] = -1 * invM1[14]; //originalCameraMatrix[11]; // flips another axis of translation
        
        var translationMatrix = extractTranslation(realityEditor.gui.ar.utilities.invertMatrix(originalCameraMatrix), false, true, true);
        
        var correctedTransformationMatrix = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(rotationMatrix, translationMatrix, correctedTransformationMatrix);
        return correctedTransformationMatrix;
        
    } catch (e) {
        console.warn('error correcting camera matrix', originalCameraMatrix);
    }
}

// function calculateModelViewMatrix(modelMatrix, cameraMatrix) {
//
//     var modelViewMatrix = [];
//
//     // var modelMatrix = correctCameraMatrix(realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(this.visibleObjects[objectKey])));
//     // var modelMatrix = realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(correctCameraMatrix(this.visibleObjects[objectKey])));
//     // modelViewMatrix = modelMatrix;
//
//     // modelViewMatrix = this.visibleObjects[objectKey];
//
//
//     // var modelMatrix = correctCameraMatrix(realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(this.visibleObjects[objectKey])));
//
//     // var worldOriginMatrix = correctCameraMatrix(realityEditor.gui.ar.draw.cameraMatrix);
//
//     this.ar.utilities.multiplyMatrix(cameraMatrix, modelMatrix, modelViewMatrix);
//     // this.ar.utilities.multiplyMatrix(worldOriginMatrix, this.visibleObjects[objectKey], modelViewMatrix);
//     // this.ar.utilities.multiplyMatrix(this.ar.utilities.invertMatrix(worldOriginMatrix), this.visibleObjects[objectKey], modelViewMatrix);
//
//     return modelViewMatrix;
// }

var calculateModelViewMatrix = function(modelMatrix, cameraMatrix) {
    var modelViewMatrix = [];
    // modelMatrix = realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(modelMatrix));
    modelMatrix = correctCameraMatrix(realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(modelMatrix)));
    // modelMatrix = correctCameraMatrix(modelMatrix);
    // modelMatrix = realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(modelMatrix));
    
    // gives correct rotation
    var q = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(modelMatrix);
    var eulerAngles = realityEditor.gui.ar.utilities.quaternionToEulerAngles(q);
    eulerAngles.theta *= -1; // flips one axis of rotation
    eulerAngles.psi *= -1; // flips another axis of rotation
    // eulerAngles.phi *= -1; // (don't flip the third!)
    var invQ = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(eulerAngles.theta, eulerAngles.psi, eulerAngles.phi);
    var rotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(invQ);

    // add the translation component
    var translationMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
    translationMatrix[12] = modelMatrix[3];
    translationMatrix[13] = -1 * modelMatrix[7]; // flips one axis of translation
    translationMatrix[14] = -1 * modelMatrix[11]; // flips another axis of translation

    var correctedTransformationMatrix = [];
    realityEditor.gui.ar.utilities.multiplyMatrix(rotationMatrix, translationMatrix, correctedTransformationMatrix);
    modelMatrix = correctedTransformationMatrix;
    
    realityEditor.gui.ar.utilities.multiplyMatrix(cameraMatrix, modelMatrix, modelViewMatrix);
    
    modelViewMatrix = cameraMatrix;
    
    return modelViewMatrix;
};

var mmToMeterScale = 2000; // 1000; // changed from 1000 to 2000 to cut everything's size in half (draws them as if they were twice as far away)

/**
 * Previously triggered directly by the native app when the AR engine updates with a new set of recognized markers,
 * But now gets called 60FPS regardless of the AR engine, and just uses the most recent set of matrices.
 * @param {Object.<string, Array.<number>>} visibleObjects - set of {objectId: matrix} pairs, one per recognized marker
 */
realityEditor.gui.ar.draw.update = function (visibleObjects) {
    var objectKey;
    var frameKey;
    var nodeKey;
    var continueUpdate = true;
    
    this.ar.utilities.timeSynchronizer(timeCorrection);
    
    if (globalStates.guiState === "logic") {
        this.gui.crafting.redrawDataCrafting();  // todo maybe animrealityEditor.gui.ar.draw.cameraMatrixation frame
    }
    
    realityEditor.worldObjects.getWorldObjectKeys().forEach(function(worldObjectKey) {
        visibleObjects[worldObjectKey] = correctCameraMatrix(realityEditor.gui.ar.draw.cameraMatrix);
    });
    
    this.visibleObjects = visibleObjects;

    // TODO: push into an updateListener so that there isn't a circular dependency with desktopAdapter
    if (this.globalStates.matrixBroadcastEnabled) {
        realityEditor.device.desktopAdapter.broadcastMatrices(visibleObjects);
    }
    
    // scale x, y, and z elements of matrix for mm to meter conversion ratio
    for (objectKey in this.visibleObjects) {
        if (!this.visibleObjects.hasOwnProperty(objectKey)) continue;
        // TODO: infer if it is in mm or meter scale and only multiply by 1000 if needs it
        this.visibleObjects[objectKey][14] *= mmToMeterScale;
        this.visibleObjects[objectKey][13] *= mmToMeterScale;
        this.visibleObjects[objectKey][12] *= mmToMeterScale;
    }
    
    // erases anything on the background canvas
    if (this.globalCanvas.hasContent === true) {
        this.globalCanvas.context.clearRect(0, 0, this.globalCanvas.canvas.width, this.globalCanvas.canvas.height);
        this.globalCanvas.hasContent = false;
    }
    
    // checks if you detect an object with no frames within the viewport, so that you can provide haptic feedback
    var isObjectWithNoFramesVisible = false;
    if (Object.keys(visibleObjects).length > 0) {
        if (realityEditor.gui.ar.utilities.getAllVisibleFrames().length === 0) {
            isObjectWithNoFramesVisible = true;
        }
    }
    
    // TODO: push more edge-case functionality from this function into extensible callbacks
    // make the update loop extensible by additional features that wish to subscribe to matrix updates
    this.updateListeners.forEach(function(callback) {
        // send a deep clone of the list so that extensible features can't break the render loop by modifying the original
        callback( JSON.parse(JSON.stringify( realityEditor.gui.ar.draw.visibleObjects )) );
    });
    
    // iterate over every object and decide whether or not to render it based on what the AR engine has detected
    for (objectKey in objects) {
        if (!objects.hasOwnProperty(objectKey)) { continue; }
        
        this.activeObject = realityEditor.getObject(objectKey);
        if (!this.activeObject) { continue; }
        
        // if this object was detected by the AR engine this frame, render its nodes and/or frames
        if (this.visibleObjects.hasOwnProperty(objectKey)) {

            // make the object visible
            this.activeObject.visibleCounter = timeForContentLoaded;
            this.setObjectVisible(this.activeObject, true);
            
            var modelViewMatrix = [];
            if (this.activeObject.isWorldObject) {
                
                // don't start rendering world frames until we've received a valid camera matrix
                if (realityEditor.gui.ar.utilities.isIdentityMatrix(this.cameraMatrix)) {
                    continue;
                }
                modelViewMatrix = this.visibleObjects[objectKey];
                
            } else {
                // compute the ModelView matrix by multiplying the object matrix (model) with the camera matrix (view)

                // var modelMatrix = correctCameraMatrix(realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(this.visibleObjects[objectKey])));
                // // var modelMatrix = realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(correctCameraMatrix(this.visibleObjects[objectKey])));
                // // modelViewMatrix = modelMatrix;
                //
                // // modelViewMatrix = this.visibleObjects[objectKey];
                //
                //
                // // var modelMatrix = correctCameraMatrix(realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(this.visibleObjects[objectKey])));
                //
                // var worldOriginMatrix = correctCameraMatrix(realityEditor.gui.ar.draw.cameraMatrix);
                //
                // this.ar.utilities.multiplyMatrix(worldOriginMatrix, modelMatrix, modelViewMatrix);
                // this.ar.utilities.multiplyMatrix(worldOriginMatrix, this.visibleObjects[objectKey], modelViewMatrix);
                // this.ar.utilities.multiplyMatrix(this.ar.utilities.invertMatrix(worldOriginMatrix), this.visibleObjects[objectKey], modelViewMatrix);

                // var tempMat = [];
                // realityEditor.gui.ar.utilities.multiplyMatrix(this.visibleObjects[objectKey], realityEditor.gui.ar.draw.cameraMatrix, tempMat);
                // modelViewMatrix = correctCameraMatrix(tempMat);
                
                // modelViewMatrix = calculateModelViewMatrix(this.visibleObjects[objectKey], correctCameraMatrix(realityEditor.gui.ar.draw.cameraMatrix));
                
                // already includes camera matrix in objc calculations
                // modelViewMatrix = correctCameraMatrix(this.visibleObjects[objectKey]);

                // don't start rendering object frames until we've received a valid camera matrix
                if (realityEditor.gui.ar.utilities.isIdentityMatrix(this.cameraMatrix)) {
                    continue;
                }

                // var consoleElement = document.getElementById('speechConsole');
                // if (consoleElement) {
                //     consoleElement.innerHTML = '';
                //
                //     function prettyPrint(matrix, numDecimals) {
                //         return ("[ " + matrix[0].toFixed(numDecimals) + ", " + matrix[1].toFixed(numDecimals) + ", " + matrix[2].toFixed(numDecimals) + ", " + matrix[3].toFixed(numDecimals) + ", <br>" +
                //             "  " + matrix[4].toFixed(numDecimals) + ", " + matrix[5].toFixed(numDecimals) + ", " + matrix[6].toFixed(numDecimals) + ", " + matrix[7].toFixed(numDecimals) + ", <br>" +
                //             "  " + matrix[8].toFixed(numDecimals) + ", " + matrix[9].toFixed(numDecimals) + ", " + matrix[10].toFixed(numDecimals) + ", " + matrix[11].toFixed(numDecimals) + ", <br>" +
                //             "  " + matrix[12].toFixed(numDecimals) + ", " + matrix[13].toFixed(numDecimals) + ", " + matrix[14].toFixed(numDecimals) + ", " + matrix[15].toFixed(numDecimals) + " ]" )
                //     }
                //
                //     consoleElement.innerHTML = prettyPrint(this.visibleObjects[objectKey], 3) + '<br><br>' + prettyPrint(this.cameraMatrix, 3);
                //     // consoleElement.innerHTML = prettyPrint(this.activeObjectMatrix, 3);
                // }
                
                // var temp = [];
                // // realityEditor.gui.ar.utilities.multiplyMatrix(this.visibleObjects[objectKey], this.cameraMatrix, temp);
                //
                // this.visibleObjects[objectKey][13] *= -1;
                //
                
                
                // this.cameraMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
                // realityEditor.gui.ar.utilities.multiplyMatrix(this.visibleObjects[objectKey], correctCameraMatrix(this.cameraMatrix),modelViewMatrix);
                // // modelViewMatrix[13] *= -1;

                // var camRot = extractRotation(this.cameraMatrix, true, true, false);
                // // var camTx = extractTranslation(this.cameraMatrix, false, true, false);
                // var camTx = extractTranslation(realityEditor.gui.ar.utilities.invertMatrix(this.cameraMatrix), false, true, true);

                // var camRot = extractRotation(correctCameraMatrix(this.cameraMatrix), true, true, true);
                // var camTx = extractTranslation(correctCameraMatrix(this.cameraMatrix), false, false, false);


                var camRot = extractRotation(this.cameraMatrix, true, true, false);
                var camTx = extractTranslation(correctCameraMatrix(this.cameraMatrix), false, false, false);
                
                camTx[12] *= mmToMeterScale;
                camTx[13] *= mmToMeterScale;
                camTx[14] *= mmToMeterScale;
                
                // todo: try using correct camera matrix first (use result of world object visibleObject, and then extract *that* one's rotation/translation and multiply in the rotation/translation of the object/image model matrix

                //
                var modelMatrix = this.visibleObjects[objectKey]; //realityEditor.gui.ar.utilities.invertMatrix(this.visibleObjects[objectKey]);
                //
                var modelRot = extractRotation(modelMatrix, true, true, true);
                var modelTx = extractTranslation(modelMatrix, true, false, false);
                // var m = [];
                // realityEditor.gui.ar.utilities.multiplyMatrix(modelRot, modelTx, m);
                // modelViewMatrix = m;
                
                
                // order 1
                // var rot = [];
                // var tx = [];
                // realityEditor.gui.ar.utilities.multiplyMatrix(modelRot, camRot, rot);
                // realityEditor.gui.ar.utilities.multiplyMatrix(modelTx, camTx, tx);
                // realityEditor.gui.ar.utilities.multiplyMatrix(rot, tx, modelViewMatrix);
                
                
                // order 2
                var m1 = [];
                var m2 = [];
                realityEditor.gui.ar.utilities.multiplyMatrix(modelRot, modelTx, m1);
                realityEditor.gui.ar.utilities.multiplyMatrix(camRot, camTx, m2);
                realityEditor.gui.ar.utilities.multiplyMatrix(m1, m2, modelViewMatrix);



                // modelViewMatrix = correctCameraMatrix(this.visibleObjects[objectKey]);
                
                this.visibleObjects[objectKey] = modelViewMatrix;

            }

            // compute its ModelViewProjection matrix
            this.activeObjectMatrix = [];
            // this.ar.utilities.multiplyMatrix(/*this.visibleObjects[objectKey]*/ m2, this.globalStates.projectionMatrix, this.matrix.r);
            
            // this.ar.utilities.multiplyMatrix(this.visibleObjects[objectKey], this.globalStates.projectionMatrix, this.matrix.r);
            this.ar.utilities.multiplyMatrix(modelViewMatrix, this.globalStates.projectionMatrix, this.matrix.r);
            
            this.ar.utilities.multiplyMatrix(this.rotateX, this.matrix.r, this.activeObjectMatrix);
            // this.activeObjectMatrix = this.ar.utilities.copyMatrix(this.matrix.r);

            // this.activeObjectMatrix = this.ar.utilities.transposeMatrix(this.activeObjectMatrix);

            // var consoleElement = document.getElementById('speechConsole');
            // if (consoleElement) {
            //     consoleElement.innerHTML = '';
            //    
            //     function prettyPrint(matrix, numDecimals) {
            //         return ("[ " + matrix[0].toFixed(numDecimals) + ", " + matrix[1].toFixed(numDecimals) + ", " + matrix[2].toFixed(numDecimals) + ", " + matrix[3].toFixed(numDecimals) + ", <br>" +
            //             "  " + matrix[4].toFixed(numDecimals) + ", " + matrix[5].toFixed(numDecimals) + ", " + matrix[6].toFixed(numDecimals) + ", " + matrix[7].toFixed(numDecimals) + ", <br>" +
            //             "  " + matrix[8].toFixed(numDecimals) + ", " + matrix[9].toFixed(numDecimals) + ", " + matrix[10].toFixed(numDecimals) + ", " + matrix[11].toFixed(numDecimals) + ", <br>" +
            //             "  " + matrix[12].toFixed(numDecimals) + ", " + matrix[13].toFixed(numDecimals) + ", " + matrix[14].toFixed(numDecimals) + ", " + matrix[15].toFixed(numDecimals) + " ]" )
            //     }
            //
            //     consoleElement.innerHTML = prettyPrint(this.visibleObjects[objectKey], 3);
            //     // consoleElement.innerHTML = prettyPrint(this.activeObjectMatrix, 3);
            // }
            
            // extract its projected (x,y) screen coordinates from the matrix
            objects[objectKey].screenX = this.activeObjectMatrix[12] / this.activeObjectMatrix[15] + (globalStates.height / 2);
            objects[objectKey].screenY = this.activeObjectMatrix[13] / this.activeObjectMatrix[15] + (globalStates.width / 2);
            
            // iterate over every frame it contains, add iframes if necessary, and update the iframe CSS3D matrix to render in correct position
            for (frameKey in objects[objectKey].frames) {
                if (!objects[objectKey].frames.hasOwnProperty(frameKey)) { continue; }
                
                this.activeFrame = realityEditor.getFrame(objectKey, frameKey);
                
                // allows backwards compatibility for frames that don't have a visualization property
                if (!this.activeFrame.hasOwnProperty('visualization')) {
                    this.activeFrame.visualization = "ar";
                }

                this.activeKey = frameKey;
                this.activeVehicle = this.activeFrame;
                this.activeType = "ui";
                
                // perform all the 3D calculations and CSS updates to actually show the frame and render in the correct position
                continueUpdate = this.drawTransformed(this.visibleObjects, objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,
                    this.globalDOMCache, this.globalStates, this.globalCanvas,
                    this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                    this.nodeCalculations, this.cout);

                // currently there is no way that this will trigger, but it may be used in future
                if (globalStates.guiState === 'ui' && !continueUpdate) { return; }

                // if a DOM element hasn't been added for this frame yet, add it and load the correct src into an iframe
                var frameUrl = "http://" + this.activeObject.ip + ":" + httpPort + "/obj/" + this.activeObject.name + "/frames/" + this.activeFrame.name + "/";
                this.addElement(frameUrl, objectKey, frameKey, null, this.activeType, this.activeVehicle);
                
                // if we're not viewing frames (e.g. should be viewing nodes instead), hide the frame
                if (globalStates.guiState !== 'ui') {
                    this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCache, this.cout);
                }

                // iterate over every node in this frame, and perform the same rendering process as for the frames
                for (nodeKey in this.activeFrame.nodes) {
                    if (!this.activeFrame.nodes.hasOwnProperty(nodeKey)) { continue; }
                    
                    // render the nodes if we're in node/logic viewing mode
                    if (globalStates.guiState === "node" || globalStates.guiState === "logic") {
                        
                        this.activeNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
                        this.activeKey = nodeKey;
                        this.activeVehicle = this.activeNode;
                        this.activeType = this.activeNode.type;

                        // nodes of certain types are invisible and don't need to be rendered (e.g. storeData nodes) 
                        if (this.hiddenNodeTypes.indexOf(this.activeType) > -1) { continue; }

                        // perform all the 3D calculations and CSS updates to actually show the node and render in the correct position
                        continueUpdate = this.drawTransformed(this.visibleObjects, objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,
                            this.globalDOMCache, this.globalStates, this.globalCanvas,
                            this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                            this.nodeCalculations, this.cout);

                        // currently there is no way that this will trigger, but it may be used in future
                        if (!continueUpdate) { return; }

                        // if a DOM element hasn't been added for this node yet, add it and load the correct src into an iframe
                        var nodeUrl = "nodes/" + this.activeType + "/index.html";
                        this.addElement(nodeUrl, objectKey, frameKey, nodeKey, this.activeType, this.activeVehicle);

                    } else {
                        
                        // if we're not in node/logic viewing mode, hide the nodes
                        this.activeNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
                        this.activeKey = nodeKey;
                        this.activeVehicle = this.activeNode;
                        this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCache, this.cout);
                        
                    }
                }
            }
        
        // if this object was NOT detected by the AR engine, hide its nodes and frames or perform edge-case functionality
        // check if objectVisible so that this only happens once for each object
        } else if (this.activeObject.objectVisible) {

            // setting objectVisible = false makes sure we don't unnecessarily repeatedly hide it
            realityEditor.gui.ar.draw.setObjectVisible(this.activeObject, false);
            
            var wereAnyFramesMovedToGlobal = false;
            
            for (frameKey in objects[objectKey].frames) {
                if (!objects[objectKey].frames.hasOwnProperty(frameKey)) { continue; }
                
                this.activeFrame = realityEditor.getFrame(objectKey, frameKey);
                if (!this.activeFrame) { continue; }
                
                this.activeKey = frameKey;
                this.activeVehicle = this.activeFrame;
                this.activeType = "ui";

                // preserve frame globally when its object disappears if it is being moved in unconstrained editing
                if (realityEditor.device.isEditingUnconstrained(this.activeVehicle) && this.activeVehicle.location === 'global') {
                    
                    wereAnyFramesMovedToGlobal = true;
                    globalStates.inTransitionObject = objectKey;
                    globalStates.inTransitionFrame = frameKey;
                    
                // if not unconstrained editing a global frame, hide it
                } else {
                    
                    var startingMatrix;
                
                    // unconstrained editing local frame - can't transition to global, but reset its matrix to what it was before starting to edit
                    if (realityEditor.device.isEditingUnconstrained(this.activeVehicle)) {
                        startingMatrix = realityEditor.device.editingState.startingMatrix || [];
                        realityEditor.gui.ar.positioning.setPositionDataMatrix(this.activeVehicle, startingMatrix);
                    }

                    // hide the frame
                    this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCache, this.cout);

                    // hide each node within this frame
                    for (nodeKey in this.activeFrame.nodes) {
                        if (!this.activeFrame.nodes.hasOwnProperty(nodeKey)) { continue; }

                        this.activeNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
                        this.activeKey = nodeKey;
                        this.activeVehicle = this.activeNode;
                        this.activeType = this.activeNode.type;

                        // unconstrained editing local node - can't transition to global, but reset its matrix to what it was before starting to edit
                        if (realityEditor.device.isEditingUnconstrained(this.activeNode)) {
                            startingMatrix = realityEditor.device.editingState.startingMatrix || [];
                            realityEditor.gui.ar.positioning.setPositionDataMatrix(this.activeNode, startingMatrix);
                        }
                        
                        // hide the node
                        this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCache, this.cout);
                    }
                    
                }
                
            }
            
            // remove editing states related to this object (unless transitioned a frame to global)
            if (!wereAnyFramesMovedToGlobal && realityEditor.device.editingState.object === objectKey) {
                realityEditor.device.resetEditingState();
            }

        // if this object was NOT detected by the AR engine, AND its frames/nodes have already been hidden, continuously
        // continuously check if enough time has passed to completely kill its content from the DOM
        } else {
            this.killObjects(this.activeKey, this.activeObject, this.globalDOMCache);
        }

    }

    // draw all lines - links and cutting lines
    if ((globalStates.guiState === "node" || globalStates.guiState === "logic")) {
        
        // render each link 
        realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
            realityEditor.gui.ar.lines.drawAllLines(realityEditor.getFrame(objectKey, frameKey), globalCanvas.context);
        });
        
        // render the cutting line if you are dragging on the background (not in editing mode)
        if (!globalStates.editingMode) {
            this.ar.lines.drawInteractionLines();
        }
    }

    // render the frame that was pulled off of one object and is being moved through global space to a new object
    if (globalStates.inTransitionObject && globalStates.inTransitionFrame) {

        this.activeObject = objects[globalStates.inTransitionObject];
        this.activeObject.visibleCounter = timeForContentLoaded;
        this.activeObject.objectVisible = true;

        objectKey = globalStates.inTransitionObject;
        frameKey = globalStates.inTransitionFrame;

        this.activeObjectMatrix = [];
        
        // TODO: finish this new method of transferring frames immediately so they can be pushed into screens in one motion
        /*
        var numObjectsVisible =  Object.keys(this.visibleObjects).length;
        var areAnyObjectsVisible = numObjectsVisible > 0;
        var isSingleObjectVisible = numObjectsVisible === 1;
        var isSingleScreenObjectVisible = false;
        var isDifferentSingleScreenObjectVisible = false;
        
        if (isSingleObjectVisible) {
            var visibleObjectKey = Object.keys(this.visibleObjects)[0];
            var visibleObject = realityEditor.getObject(visibleObjectKey);
            isSingleScreenObjectVisible = visibleObject.visualization === 'screen';
            isDifferentObjectVisible = visibleObjectKey !== globalStates.inTransitionObject;
            if (isSingleScreenObjectVisible && isDifferentObjectVisible) {
                console.log('should attach to new object now');
            }
        }
        */

        // render the transition frame even if its object is not visible
        if (!this.visibleObjects.hasOwnProperty(objectKey)) {

            this.activeFrame = this.activeObject.frames[frameKey];
            this.activeKey = frameKey;
            this.activeObjectMatrix = this.activeFrame.temp;
            
            continueUpdate = this.drawTransformed(this.visibleObjects, objectKey, this.activeKey, this.activeType, this.activeFrame, this.notLoading, this.globalDOMCache, this.globalStates, this.globalCanvas, this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities, this.nodeCalculations, this.cout);

            if (!continueUpdate) { return; }
        }

    }

    // if needed, reset acceleration data from devicemotion events
    if (globalStates.acceleration.motion !== 0) {
        globalStates.acceleration = {
            x: 0,
            y: 0,
            z: 0,
            alpha: 0,
            beta: 0,
            gamma: 0,
            motion: 0
        }
    }
    
    // Adds a pulsing vibration that you can feel when you are looking at an object that has no frames.
    // Provides haptic feedback to give you the confidence that you can add frames to what you are looking at.
    if (isObjectWithNoFramesVisible) {
        if (!visibleObjectTapInterval) {
            
            // tap once, immediately
            realityEditor.app.tap();
            
            // then tap every 2 seconds
            visibleObjectTapInterval = setInterval(function() {
                realityEditor.app.tap();
            }, 500);
        }
    } else {
        if (visibleObjectTapInterval) {
            clearInterval(visibleObjectTapInterval);
            visibleObjectTapInterval = null;
        }
    }
};

/**
 * Detach the oldFrameKey frame from oldObjectKey object,
 * and attach instead to newObjectKey object, assigning it a new uuid of newFrameKey.
 * Also needs to rename all of its nodes with correct paths,
 * update all relevant DOM element ids,
 * possibly update the editing state and screen object pointers,
 * delete the old frame from the old object server and upload to the new object server,
 * and modify all of the links going to and from its nodes,
 * syncing links with the server so that data gets routed correctly.
 * @param {string} oldObjectKey
 * @param {string} oldFrameKey
 * @param {string} newObjectKey
 * @param {string} newFrameKey
 */
realityEditor.gui.ar.draw.moveFrameToNewObject = function(oldObjectKey, oldFrameKey, newObjectKey, newFrameKey) {
    
    if (oldObjectKey === newObjectKey && oldFrameKey === newFrameKey) return; // don't need to do anything
    
    var oldObject = realityEditor.getObject(oldObjectKey);
    var newObject = realityEditor.getObject(newObjectKey);
    
    var frame = realityEditor.getFrame(oldObjectKey, oldFrameKey);
    
    if (frame.location !== 'global') {
        console.warn('WARNING: TRYING TO DELETE A LOCAL FRAME');
        return;
    }

    // rename nodes and give new keys
    var newNodes = {};
    for (var oldNodeKey in frame.nodes) {
        if (!frame.nodes.hasOwnProperty(oldNodeKey)) continue;
        var node = frame.nodes[oldNodeKey];
        var newNodeKey = newFrameKey + node.name;
        node.objectId = newObjectKey;
        node.frameId = newFrameKey;
        node.uuid = newNodeKey;
        newNodes[node.uuid] = node;
        delete frame.nodes[oldNodeKey];

        // update the DOM elements for each node
        // (only if node has been loaded to DOM already - doesn't happen if haven't ever switched to node view)
        if (globalDOMCache[oldNodeKey]) {
            // update their keys in the globalDOMCache 
            globalDOMCache['object' + newNodeKey] = globalDOMCache['object' + oldNodeKey];
            globalDOMCache['iframe' + newNodeKey] = globalDOMCache['iframe' + oldNodeKey];
            globalDOMCache[newNodeKey] = globalDOMCache[oldNodeKey];
            globalDOMCache['svg' + newNodeKey] = globalDOMCache['svg' + oldNodeKey];
            delete globalDOMCache['object' + oldNodeKey];
            delete globalDOMCache['iframe' + oldNodeKey];
            delete globalDOMCache[oldNodeKey];
            delete globalDOMCache['svg' + oldNodeKey];
            
            // re-assign ids to DOM elements
            globalDOMCache['object' + newNodeKey].id = 'object' + newNodeKey;
            globalDOMCache['iframe' + newNodeKey].id = 'iframe' + newNodeKey;
            globalDOMCache[newNodeKey].id = newNodeKey;
            globalDOMCache[newNodeKey].objectId = newObjectKey;
            globalDOMCache[newNodeKey].frameId = newFrameKey;
            globalDOMCache[newNodeKey].nodeId = newNodeKey;
            globalDOMCache['svg' + newNodeKey].id = 'svg' + newNodeKey;

            // update iframe attributes
            globalDOMCache['iframe' + newNodeKey].setAttribute("data-frame-key", newFrameKey);
            globalDOMCache['iframe' + newNodeKey].setAttribute("data-object-key", newObjectKey);
            globalDOMCache['iframe' + newNodeKey].setAttribute("data-node-key", newNodeKey);

            globalDOMCache['iframe' + newNodeKey].setAttribute("onload", 'realityEditor.network.onElementLoad("' + newObjectKey + '","' + newFrameKey + '","' + newNodeKey + '")');
            globalDOMCache['iframe' + newNodeKey].contentWindow.location.reload(); // TODO: is there a way to update realityInterface of the frame without reloading?
        } else {
            node.loaded = false;
        }
        
    }

    frame.nodes = newNodes;
    frame.objectId = newObjectKey;
    frame.uuid = newFrameKey;
    
    // update any variables in the application with the old keys to use the new keys
    if (realityEditor.device.editingState.object === oldObjectKey) {
        realityEditor.device.editingState.object = newObjectKey;
    }
    if (realityEditor.device.editingState.frame === oldFrameKey) {
        realityEditor.device.editingState.frame = newFrameKey;
        realityEditor.gui.ar.draw.pushEditedFrameToFront(newFrameKey);
    }
    if (realityEditor.gui.screenExtension.screenObject.object === oldObjectKey) {
        realityEditor.gui.screenExtension.screenObject.object = newObjectKey;
    }
    if (realityEditor.gui.screenExtension.screenObject.frame === oldFrameKey) {
        realityEditor.gui.screenExtension.screenObject.frame = newFrameKey;
    }
    
    // update the DOM elements for the frame with new ids
    // (only if node has been loaded to DOM already - doesn't happen if haven't ever switched to ui view)
    if (globalDOMCache[oldFrameKey]) {
        // update their keys in the globalDOMCache 
        globalDOMCache['object' + newFrameKey] = globalDOMCache['object' + oldFrameKey];
        globalDOMCache['iframe' + newFrameKey] = globalDOMCache['iframe' + oldFrameKey];
        globalDOMCache[newFrameKey] = globalDOMCache[oldFrameKey];
        globalDOMCache['svg' + newFrameKey] = globalDOMCache['svg' + oldFrameKey];
        delete globalDOMCache['object' + oldFrameKey];
        delete globalDOMCache['iframe' + oldFrameKey];
        delete globalDOMCache[oldFrameKey];
        delete globalDOMCache['svg' + oldFrameKey];

        // re-assign ids to DOM elements
        globalDOMCache['object' + newFrameKey].id = 'object' + newFrameKey;
        globalDOMCache['iframe' + newFrameKey].id = 'iframe' + newFrameKey;
        globalDOMCache[newFrameKey].id = newFrameKey;
        globalDOMCache[newFrameKey].objectId = newObjectKey;
        globalDOMCache[newFrameKey].frameId = newFrameKey;
        globalDOMCache['svg' + newFrameKey].id = 'svg' + newFrameKey;

        // update iframe attributes
        globalDOMCache['iframe' + newFrameKey].setAttribute("data-frame-key", newFrameKey);
        globalDOMCache['iframe' + newFrameKey].setAttribute("data-object-key", newObjectKey);

        globalDOMCache['iframe' + newFrameKey].setAttribute("onload", 'realityEditor.network.onElementLoad("' + newObjectKey + '","' + newFrameKey + '","' + null + '")');
        globalDOMCache['iframe' + newFrameKey].contentWindow.location.reload(); // TODO: is there a way to update realityInterface of the frame without reloading?
    } else {
        frame.loaded = false;
    }
    
    // add the frame to the new object and post the new frame on the server (must exist there before we can update the links)
    objects[newObjectKey].frames[newFrameKey] = frame;
    var newObjectIP = realityEditor.getObject(newObjectKey).ip;
    realityEditor.network.postNewFrame(newObjectIP, newObjectKey, frame, function(err, res) {
        
        if (!err) {
            console.log('successfully created frame on new object');
        } else {
            console.warn('server returned error when moving frame to new object');
        }

        // update all links locally and on the server
        // loop through all frames
        realityEditor.forEachFrameInAllObjects(function(thatObjectKey, thatFrameKey) {
            var thatFrame = realityEditor.getFrame(thatObjectKey, thatFrameKey);

            // loop through all links in that frame
            for (var linkKey in thatFrame.links) {
                var link = thatFrame.links[linkKey];
                var didLinkChange = false;

                // update the start of the link
                if (link.objectA === oldObjectKey && link.frameA === oldFrameKey) {
                    link.objectA = newObjectKey;
                    link.frameA = newFrameKey;
                    link.nodeA = newFrameKey + link.namesA[2];
                    link.namesA[0] = newObject.name;
                    didLinkChange = true;
                }

                // update the end of the link
                if (link.objectB === oldObjectKey && link.frameB === oldFrameKey) {
                    link.objectB = newObjectKey;
                    link.frameB = newFrameKey;
                    link.nodeB = newFrameKey + link.namesB[2];
                    link.namesB[0] = newObject.name;
                    didLinkChange = true;
                }

                // only change the link on the server if its objectA or objectB changed
                if (didLinkChange) {
                    var linkObjectIP = realityEditor.getObject(thatObjectKey).ip;
                    // remove link from old frame (locally and on the server)
                    delete thatFrame.links[linkKey];
                    realityEditor.network.deleteLinkFromObject(linkObjectIP, thatObjectKey, thatFrameKey, linkKey);
                    // add link to new frame (locally and on the server -- post link to server adds it locally too)
                    realityEditor.network.postLinkToServer(link, linkKey);
                }

            }
        });
        
        // update the publicData on the server to point to the new path
        if (publicDataCache.hasOwnProperty(oldFrameKey)) {
            console.log('moving public data from ' + oldFrameKey);

            // update locally
            publicDataCache[newFrameKey] = publicDataCache[oldFrameKey];
            delete publicDataCache[oldFrameKey];

            // update on the server
            realityEditor.network.deletePublicData(oldObject.ip, oldObjectKey, oldFrameKey);
            realityEditor.network.postPublicData(newObject.ip, newObjectKey, newFrameKey, publicDataCache[newFrameKey]);

            console.log('to ' + newFrameKey);
        }

        // remove the frame from the old object
        delete objects[oldObjectKey].frames[oldFrameKey];
        realityEditor.gui.ar.draw.removeFromEditedFramesList(oldFrameKey);
        realityEditor.network.deleteFrameFromObject(oldObject.ip, oldObjectKey, oldFrameKey); 
    });
};

/**
 * When a transition frame is dropped somewhere it cannot be transferred to (empty space, no object visible),
 * returns the frame back to the position where it came from. Update state and remove DOM elements if necessary.
 */
realityEditor.gui.ar.draw.returnTransitionFrameBackToSource = function() {
    
    // (activeKey, activeVehicle, globalDOMCache, cout
    var frameInMotion = realityEditor.getFrame(globalStates.inTransitionObject, globalStates.inTransitionFrame);
    realityEditor.gui.ar.draw.hideTransformed(globalStates.inTransitionFrame, frameInMotion, globalDOMCache, cout);

    var startingMatrix = realityEditor.device.editingState.startingMatrix || [];
    realityEditor.gui.ar.positioning.setPositionDataMatrix(frameInMotion, startingMatrix);
    
    // var positionData = realityEditor.gui.ar.positioning.getPositionData(frameInMotion);
    // positionData.matrix = [];
    
    frameInMotion.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();
    frameInMotion.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();

    // update any variables in the application with the old keys to use the new keys
    // TODO: do these need to be set here or will they update automatically elsewhere?
    if (realityEditor.gui.screenExtension.screenObject.object === globalStates.inTransitionObject)
        realityEditor.gui.screenExtension.screenObject.object = null;
    if (realityEditor.gui.screenExtension.screenObject.frame === globalStates.inTransitionFrame)
        realityEditor.gui.screenExtension.screenObject.frame = null;

    globalStates.inTransitionObject = null;
    globalStates.inTransitionFrame = null;
};

/**
 * When an inTransitionFrame is dropped onto an object, assign it new matrices to try to preserve its position,
 * and call the moveFrameToNewObject function to do the majority of the work of reassigning it to the new object
 * @param {string} oldObjectKey
 * @param {string} oldFrameKey
 * @param {string} newObjectKey
 * @param {string} newFrameKey
 * @param {{x: number, y: number}|undefined} optionalPosition - if provided, translate to that (x,y) otherwise use (0,0)
 */
realityEditor.gui.ar.draw.moveTransitionFrameToObject = function(oldObjectKey, oldFrameKey, newObjectKey, newFrameKey, optionalPosition) {
    
    var oldObjectTargetWidth = realityEditor.getObject(oldObjectKey).targetSize.width;
    var newObjectTargetWidth = realityEditor.getObject(newObjectKey).targetSize.width;
    
    console.log('moving frame from an object of size ' + oldObjectTargetWidth + ' to one of size ' + newObjectTargetWidth);
    
    this.moveFrameToNewObject(oldObjectKey, oldFrameKey, newObjectKey, newFrameKey);
    
    var frame = realityEditor.getFrame(newObjectKey, newFrameKey);
    
    globalStates.inTransitionObject = null;
    globalStates.inTransitionFrame = null;
    
    var newObject = realityEditor.getObject(newObjectKey);
    
    var scaleFactor = 1;
    if (typeof oldObjectTargetWidth !== 'undefined' && typeof newObjectTargetWidth !== 'undefined') {
        scaleFactor = (newObjectTargetWidth/oldObjectTargetWidth);
        frame.ar.scale *= scaleFactor;
    }
    
    // TODO: bugfix this
    // fixme: quick fix to allow better pushing into screens
    // screen interactions break when we use the slightly buggy matrix computed in the other case, so if the new object
    // is a screen object, instead we reset its matrix to the marker plane.
    if (newObject.visualization === 'screen') {

        frame.ar.x = 0;
        frame.ar.y = 0;

        if (optionalPosition) {
            frame.ar.x = optionalPosition.x;
            frame.ar.y = optionalPosition.y;
        }

        frame.ar.matrix = [];
        frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
        frame.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();
        
    } else {
        
        // try to calculate the matrix that preserves the frame's visual location relative to the camera,
        // but placed on the new object rather than its old object
        frame.ar.x = 0;
        frame.ar.y = 0;
        
        // calculate new scale based on the difference between the frame's old object marker and the new one, so the distance is preserved
        // var oldTargetSize = realityEditor.getObject(oldObjectKey).targetSize;
        // var newTargetSize = realityEditor.getObject(newObjectKey).targetSize;
        // var scaleFactor = oldTargetSize.width / newTargetSize.width;
        //
        // realityEditor.gui.ar.positioning.getPositionData(frame).scale *= scaleFactor;

        // recompute frame.temp for the new object
        this.ar.utilities.multiplyMatrix(this.visibleObjects[newObjectKey], this.globalStates.projectionMatrix, this.matrix.r);
        this.ar.utilities.multiplyMatrix(this.rotateX, this.matrix.r, frame.temp);

        // frame.begin[0] /= scaleFactor;
        // frame.begin[5] /= scaleFactor;
        // frame.begin[10] /= scaleFactor;

        // compute frame.matrix based on new object
        var resultMatrix = [];
        this.utilities.multiplyMatrix(frame.begin, this.utilities.invertMatrix(frame.temp), resultMatrix);
        realityEditor.gui.ar.positioning.setPositionDataMatrix(frame, resultMatrix); // TODO: fix this somehow, make it more understandable
        
        // reset frame.begin
        frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
        
        // realityEditor.device.videoRecording.moveFrameToCamera(newObjectKey, newFrameKey);
        
    }
    
};

/**
 * (One of the most important and heavily-used functions in the Editor.)
 * Renders a specific frame or node with the correct CSS3D transformations based on all application state.
 * Also determines if the DOM element needs to be shown or hidden.
 * The long list of parameters is for optimization purposes. Using a local variable is faster than a global one,
 *   so references to many global variables are passed in as shortcuts. This function gets called 60 FPS for every
 *   frame and node on any currently-visible objects, so small optimizations here make a big difference on performance.
 * @param visibleObjects - contains the modelview matrices for visible objects
 * @param objectKey - the uuid of the object that this frame or node belongs to
 * @param activeKey - the uuid of the frame or node to render
 * @param activeType - 'node' or 'ui' depending on if it's a node or frame element
 * @param activeVehicle - the Frame or Node reference. "Vehicle" means "Frame or Node". (something you can move)
 * @param notLoading - starts false when this vehicle's element is initialized. gets set to the vehicle's uuid when it loads
 * @param globalDOMCache - reference to global variable
 * @param globalStates - reference to global variable
 * @param globalCanvas - reference to global variable
 * @param activeObjectMatrix - the result of multiplying the object's modelview matrix, the projection matrix, and the screen rotation matrix
 * @param matrix - object containing several matrix references that can be used as temporary registers for multiplication results.
 *      includes matrix.temp, matrix.begin, matrix.end, matrix.r, matrix.r2, and matrix.r3
 * @param finalMatrix - stores the resulting final CSS3D matrix for the vehicle @todo this doesnt seem to be used anywhere?
 * @param utilities - reference to realityEditor.gui.ar.utilities
 * @param nodeCalculations - reference to realityEditor.gui.ar.draw.nodeCalculations
 * @param cout - reference to debug logging function
 * @return {boolean} whether to continue the update loop (defaults true, return false if you remove the activeVehicle during this loop)
 * @todo finish documenting function
 */
realityEditor.gui.ar.draw.drawTransformed = function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCache, globalStates, globalCanvas, activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {
    //console.log(JSON.stringify(activeObjectMatrix));

    // it's ok if the frame isn't visible anymore if we're in the node view - render it anyways
    var shouldRenderFramesInNodeView = (globalStates.guiState === 'node' && activeType === 'ui'); // && globalStates.renderFrameGhostsInNodeViewEnabled;

    if (notLoading !== activeKey && activeVehicle.loaded === true && activeVehicle.visualization !== "screen") {

        var editingVehicle = realityEditor.device.getEditingVehicle();
        var thisIsBeingEdited = (editingVehicle === activeVehicle);

        var activePocketFrameWaiting = activeVehicle === pocketFrame.vehicle && pocketFrame.waitingToRender;
        var activePocketNodeWaiting = activeVehicle === pocketNode.vehicle && pocketNode.waitingToRender;
        
        // make visible a frame or node if it was previously hidden
        // waits to make visible until positionOnLoad has been applied, to avoid one frame rendered in wrong position
        if (!shouldRenderFramesInNodeView && !activeVehicle.visible && !(activePocketFrameWaiting || activePocketNodeWaiting)) {
            
            activeVehicle.visible = true;
            
            var container = globalDOMCache["object" + activeKey];
            var iFrame = globalDOMCache["iframe" + activeKey];
            var overlay = globalDOMCache[activeKey];
            var canvas = globalDOMCache["svg" + activeKey];
            
            if (!container) {
                activeVehicle.loaded = false;
                return true;
            }
            
            if (activeType === 'ui') {
                container.classList.remove('hiddenFrameContainer');
                container.classList.add('visibleFrameContainer');
                container.classList.remove('displayNone');

            } else {
                container.classList.remove('hiddenNodeContainer');
                container.classList.add('visibleNodeContainer');

            }
            
            iFrame.classList.remove('hiddenFrame');
            iFrame.classList.add('visibleFrame');
            
            overlay.style.visibility = 'visible';
            
            if (globalStates.editingMode || thisIsBeingEdited) {
                canvas.classList.add('visibleEditingSVG');
                // canvas.style.visibility = 'visible';
                // canvas.style.display = 'inline';
            } else {
                // canvas.style.display = 'none';
                canvas.classList.remove('visibleEditingSVG');
            }
            
            iFrame.contentWindow.postMessage(
                JSON.stringify(
                    {
                        visibility: "visible",
                        interface: globalStates.interface,
                        search: realityEditor.gui.search.getSearch()
                    }), '*');
            
            if (activeType !== "ui") {
                activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
            }

            if (activeType === "logic" && objectKey !== "pocket") {
                if(activeVehicle.animationScale === 1) {
                    globalDOMCache["logic" + nodeKey].className = "mainEditing scaleOut";
                    thisObject.animationScale = 0;
                }
            }
            
            // re-activate the activeScreenObject when it reappears
            var screenExtension = realityEditor.gui.screenExtension;
            if (screenExtension.registeredScreenObjects[activeKey]) {

                if (!screenExtension.visibleScreenObjects.hasOwnProperty(activeKey)) {
                    screenExtension.visibleScreenObjects[activeKey] = {
                        object: objectKey,
                        frame: activeKey,
                        node: null,
                        x: 0,
                        y: 0,
                        touches: null
                    };
                }
            }

        }

        if ((activeVehicle.visible || shouldRenderFramesInNodeView) || activePocketFrameWaiting || activePocketNodeWaiting) {
            
            // safety mechanism to prevent bugs where tries to manipulate a DOM element that doesn't exist
            if (!globalDOMCache["object" + activeKey]) {
                activeVehicle.visible = false;
                return true;
            }
            
            if (shouldRenderFramesInNodeView) {
                globalDOMCache["object" + activeKey].classList.remove('displayNone');
            }
            
            if (activeKey === globalStates.inTransitionFrame) {
                globalDOMCache["iframe" + activeKey].classList.add('inTransitionFrame');
            } else {
                globalDOMCache["iframe" + activeKey].classList.remove('inTransitionFrame');
            }

            // fade out frames when they move beyond a certain distance
            if (activeType === "ui"){ // && !thisIsBeingEdited ) {
                if (realityEditor.getObject(objectKey).isWorldObject) {
                    if (typeof activeVehicle.visibleDistance === 'undefined') {
                        activeVehicle.visibleDistance = globalStates.defaultVisibleDistance;
                    }
                    var scale = realityEditor.gui.ar.positioning.getPositionData(activeVehicle).scale;
                    var distance = realityEditor.gui.ar.utilities.getDistanceToWorldFrame(objectKey, activeKey);
                    // var distanceThreshold = (activeVehicle.visibleDistance * Math.max(1.0, scale / globalStates.defaultScale) );
                    // var distanceThreshold = ((activeVehicle.distanceScale || 1.0) * (scale / globalStates.defaultScale) * realityEditor.device.orientation.defaultDistance);  // 2000 is default min distance
                    var distanceThreshold = ((activeVehicle.distanceScale || 1.0) * realityEditor.device.distanceScaling.defaultDistance);  // 2000 is default min distance
                    var isDistantFrame = distance > distanceThreshold;
                    var isAlmostDistantFrame = distance > (distanceThreshold * 0.8);
                    if (isDistantFrame) {
                        globalDOMCache["object" + activeKey].classList.add('distantFrame'); // hide visuals
                    } else {
                        globalDOMCache["object" + activeKey].classList.remove('distantFrame'); // 
                        if (isAlmostDistantFrame) {
                            globalDOMCache["iframe" + activeKey].style.opacity = 1.0 - ((distance - 0.8 * distanceThreshold) / (0.2 * distanceThreshold));
                        } else {
                            globalDOMCache["iframe" + activeKey].style.opacity = 1.0;
                        }
                    }
                }
            }


            if (true) { // TODO: simplify

                var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);

                // set initial position of frames and nodes placed in from pocket
                // 1. drop directly onto marker plane if in freeze state (or quick-tapped the frame)
                // 2. otherwise float in unconstrained slightly in front of the editor camera
                // 3. animate so it looks like it is being pushed from pocket
                if (activePocketNodeWaiting && typeof activeVehicle.mostRecentFinalMatrix !== 'undefined') {
                    console.log('just added pocket node');
                    this.addPocketVehicle(pocketNode, matrix);
                }
                if (activePocketFrameWaiting && typeof activeVehicle.mostRecentFinalMatrix !== 'undefined') {
                    console.log('just added pocket frame');
                    this.addPocketVehicle(pocketFrame, matrix);
                }
                
                var finalOffsetX = positionData.x;
                var finalOffsetY = positionData.y;
                var finalScale = positionData.scale;

                // TODO: move this around to other location so that translations get applied in different order as compared to parent frame matrix composition
                // add node's position to its frame's position to gets its actual offset
                if (activeType !== "ui" && activeType !== "logic") {
                    var frameKey = activeVehicle.frameId;
                    var frame = realityEditor.getFrame(objectKey, frameKey);
                    if (frame) {
                        var parentFramePositionData = realityEditor.gui.ar.positioning.getPositionData(frame);
                        if (frame.location !== 'local') {
                            finalOffsetX = finalOffsetX /* * (parentFramePositionData.scale/globalStates.defaultScale) */ + parentFramePositionData.x;
                            finalOffsetY = finalOffsetY /* * (parentFramePositionData.scale/globalStates.defaultScale) */ + parentFramePositionData.y;
                        }
                        finalScale *= (parentFramePositionData.scale/globalStates.defaultScale);
                    }
                }
                
                // TODO: also multiply node's unconstrained matrix by frame's unconstrained matrix if necessary
                
                matrix.r3 = [
                    finalScale, 0, 0, 0,
                    0, finalScale, 0, 0,
                    0, 0, 1, 0,
                    // positionData.x, positionData.y, 0, 1
                    finalOffsetX, finalOffsetY, 0, 1
                ];

                if (globalStates.editingMode || thisIsBeingEdited) {

                    // show the svg overlay if needed (doesn't always get added correctly in the beginning so this is the safest way to ensure it appears)
                    var svg = globalDOMCache["svg" + activeKey];
                    if (svg.children.length === 0) {
                        console.log('retroactively creating the svg overlay');
                        var iFrame = globalDOMCache["iframe" + activeKey];
                        svg.style.width = iFrame.style.width;
                        svg.style.height = iFrame.style.height;
                        realityEditor.gui.ar.moveabilityOverlay.createSvg(svg);
                    }

                    // todo test if this can be made touch related
                    if (activeType === "logic") {
                        activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
                    }

                    if (realityEditor.device.isEditingUnconstrained(activeVehicle)) {

                        activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);

                        // do this one time when you first tap down on something unconstrained, to preserve its current matrix
                        if (matrix.copyStillFromMatrixSwitch) {
                            matrix.visual = utilities.copyMatrix(activeObjectMatrix);
                            
                            var matrixToUse = positionData.matrix;
                            
                            if (typeof matrixToUse === "object") {
                                if (matrixToUse.length > 0) {
                                    utilities.multiplyMatrix(matrixToUse, activeVehicle.temp, activeVehicle.begin);
                                } else {
                                    activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);
                                }
                            } else {
                                activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);
                            }
                            
                            var resultMatrix = [];
                            utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), resultMatrix);
                            realityEditor.gui.ar.positioning.setPositionDataMatrix(activeVehicle, resultMatrix); // TODO: fix this somehow, make it more understandable
                            
                            matrix.copyStillFromMatrixSwitch = false;
                            
                        // if this isn't the first frame of unconstrained editing, just use the previously stored begin and temp
                        } else {
                            var resultMatrix = [];
                            realityEditor.gui.ar.utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), resultMatrix);
                            realityEditor.gui.ar.positioning.setPositionDataMatrix(activeVehicle, resultMatrix);
                        }

                        // TODO: this never seems to be triggered, can it be removed?
                        // if (globalStates.unconstrainedPositioning && matrix.copyStillFromMatrixSwitch) {
                        //     activeObjectMatrix = matrix.visual;
                        // }

                    }
                    
                    if (typeof positionData.matrix !== "undefined" && positionData.matrix.length > 0) {
                        if (realityEditor.device.isEditingUnconstrained(activeVehicle) && !(activeVehicle === pocketFrame.vehicle || activeVehicle === pocketNode.vehicle)) {
                            utilities.multiplyMatrix(positionData.matrix, activeVehicle.temp, activeVehicle.begin);
                        }
                        
                        utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
                        utilities.multiplyMatrix(matrix.r3, matrix.r, matrix.r2);
                        utilities.drawMarkerPlaneIntersection(activeKey, matrix.r2, activeVehicle);
                        
                        // // calculate center Z of frame to know if it is mostly in front or behind the marker plane
                        // var projectedPoint = realityEditor.gui.ar.utilities.multiplyMatrix4([activeVehicle.ar.x, activeVehicle.ar.y, 0, 1], matrix.r);
                        // activeVehicle.originCoordinates = {
                        //     x: projectedPoint[0],
                        //     y: projectedPoint[1],
                        //     z: projectedPoint[2]
                        // }
                        
                    } else {
                        utilities.drawMarkerPlaneIntersection(activeKey, null, activeVehicle);
                    }
                    
                }

                if (typeof positionData.matrix !== "undefined") {
                    if (positionData.matrix.length < 13) {
                        // utilities.multiplyMatrix(matrix.r3, activeObjectMatrix, finalMatrix);

                        // if (parentFramePositionData && parentFramePositionData.matrix.length === 16) {
                        //     // This is a node - position relative to parent frame unconstrained editing
                        //     utilities.multiplyMatrix(parentFramePositionData.matrix, activeObjectMatrix, matrix.r);
                        //     utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
                        // } else {
                            utilities.multiplyMatrix(matrix.r3, activeObjectMatrix, finalMatrix);
                        // }

                    } else {
                        utilities.multiplyMatrix(positionData.matrix, activeObjectMatrix, matrix.r);
                        utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
                    }
                }
                
                
                // multiply in the animation matrix if you are editing this frame in unconstrained mode.
                // in the future this can be expanded but currently this is the only time it gets animated.
                if (realityEditor.device.isEditingUnconstrained(activeVehicle)) {
                    var animatedFinalMatrix = [];
                    utilities.multiplyMatrix(finalMatrix, editingAnimationsMatrix, animatedFinalMatrix);
                    finalMatrix = utilities.copyMatrix(animatedFinalMatrix);
                }
                
                // TODO: do this on frame touch up (snap position when editing ends), or if unconstrained editing (visual feedback when ready to snap)
                // this.snapFrameMatrixIfNecessary(activeVehicle, activeKey);
                
                // we want nodes closer to camera to have higher z-coordinate, so that they are rendered in front
                // but we want all of them to have a positive value so they are rendered in front of background canvas
                // and frames with developer=false should have the lowest positive value

                // calculate center Z of frame to know if it is mostly in front or behind the marker plane
                var projectedPoint = realityEditor.gui.ar.utilities.multiplyMatrix4([0, 0, 0, 1], activeObjectMatrix);
                // activeVehicle.originCoordinates = {
                //     x: projectedPoint[0],
                //     y: projectedPoint[1],
                //     z: projectedPoint[2]
                // };

                activeVehicle.screenZ = finalMatrix[14]; // but save pre-processed z position to use later to calculate screenLinearZ

                var activeElementZIncrease = thisIsBeingEdited ? 100 : 0;
                
                // var editedOrderData = (activeType === "ui") ? this.getFrameRenderPriority(activeKey) : this.getNodeRenderPriority(activeKey);
                // var editedOrderZIncrease = (editedOrderData.length > 0) ? 50 * (editedOrderData.index / editedOrderData.length) : 0;
                
                var editedOrderZIncrease = 0;
                if (activeType !== "ui") {
                    var editedOrderData = this.getNodeRenderPriority(activeKey);
                    editedOrderZIncrease = (editedOrderData.length > 0) ? 50 * (editedOrderData.index / editedOrderData.length) : 0;
                }
                
                finalMatrix[14] = 200 + activeElementZIncrease + editedOrderZIncrease + 1000000 / Math.max(10, projectedPoint[2]);

                //move non-developer frames to the back so they don't steal touches from interactable frames //TODO: test if this is still working for three.js content / use a different property other than developer
                // if (activeVehicle.developer === false) {
                //     finalMatrix[14] = 100;
                // }

                // put frames all the way in the back if you are in node view
                if (shouldRenderFramesInNodeView) {
                    finalMatrix[14] = 100;
                }
                
                activeVehicle.mostRecentFinalMatrix = finalMatrix;
                activeVehicle.originMatrix = activeObjectMatrix;
                
                // flip horizontally here?
                // var renderedMatrix = [];
                // this.ar.utilities.multiplyMatrix(this.rotateX, finalMatrix, renderedMatrix);
                
                // draw transformed
                if (activeVehicle.fullScreen !== true && activeVehicle.fullScreen !== 'sticky') {
                    globalDOMCache["object" + activeKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';
                }

                // this is for later
                // The matrix has been changed from Vuforia 3 to 4 and 5. Instead of  finalMatrix[3][2] it is now finalMatrix[3][3]
                activeVehicle.screenX = finalMatrix[12] / finalMatrix[15] + (globalStates.height / 2);
                activeVehicle.screenY = finalMatrix[13] / finalMatrix[15] + (globalStates.width / 2);
                // activeVehicle.screenZ = finalMatrix[14];
                
                if (thisIsBeingEdited) {
                    realityEditor.device.checkIfFramePulledIntoUnconstrained(activeVehicle);
                }

            }
            // if (activeVehicle.fullScreen === true) {
            //     if (thisIsBeingEdited) {
            //         realityEditor.device.checkIfFramePulledIntoUnconstrained(activeVehicle);
            //     }
            // }
            
            if (activeType === "ui") {

                if (activeVehicle.sendMatrix === true || activeVehicle.sendAcceleration === true) {

                    var thisMsg = {};

                    if (activeVehicle.sendMatrix === true) {
                        var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
                        thisMsg.modelViewMatrix = this.getFinalMatrixForFrame(this.visibleObjects[objectKey], positionData.matrix, positionData.x, positionData.y, positionData.scale);
                    }

                    if (activeVehicle.sendAcceleration === true) {
                        thisMsg.acceleration = globalStates.acceleration;
                    }

                    // also try sending screen position if asking for matrix... // TODO: in the future create another switch like sendMatrix and sendAcceleration
                    var frameScreenPosition = realityEditor.gui.ar.positioning.getFrameScreenCoordinates(objectKey, activeKey);
                    thisMsg.frameScreenPosition = frameScreenPosition;

                    // cout(thisMsg);
                    globalDOMCache["iframe" + activeKey].contentWindow.postMessage(JSON.stringify(thisMsg), '*');

                }
            } //else {

                activeVehicle.screenLinearZ = (((10001 - (20000 / activeVehicle.screenZ)) / 9999) + 1) / 2;
                // map the linearized zBuffer to the final ball size
                activeVehicle.screenLinearZ = utilities.map(activeVehicle.screenLinearZ, 0.996, 1, 50, 1);
                
            //}


            if (activeType === "logic" && objectKey !== "pocket") {

                if (globalStates.pointerPosition[0] > -1 && globalProgram.objectA) {

                    var size = (activeVehicle.screenLinearZ * 40) * (activeVehicle.scale);
                    var x = activeVehicle.screenX;
                    var y = activeVehicle.screenY;

                    globalCanvas.hasContent = true;

                    nodeCalculations.rectPoints = [
                        [x - (-1 * size), y - (-0.42 * size)],
                        [x - (-1 * size), y - (0.42 * size)],
                        [x - (-0.42 * size), y - (size)],
                        [x - (0.42 * size), y - (size)],
                        [x - (size), y - (0.42 * size)],
                        [x - (size), y - (-0.42 * size)],
                        [x - (0.42 * size), y - (-1 * size)],
                        [x - (-0.42 * size), y - (-1 * size)]
                    ];
                    /* var context = globalCanvas.context;
                     context.setLineDash([]);
                     // context.restore();
                     context.beginPath();
                     context.moveTo(nodeCalculations.rectPoints[0][0], nodeCalculations.rectPoints[0][1]);
                     context.lineTo(nodeCalculations.rectPoints[1][0], nodeCalculations.rectPoints[1][1]);
                     context.lineTo(nodeCalculations.rectPoints[2][0], nodeCalculations.rectPoints[2][1]);
                     context.lineTo(nodeCalculations.rectPoints[3][0], nodeCalculations.rectPoints[3][1]);
                     context.lineTo(nodeCalculations.rectPoints[4][0], nodeCalculations.rectPoints[4][1]);
                     context.lineTo(nodeCalculations.rectPoints[5][0], nodeCalculations.rectPoints[5][1]);
                     context.lineTo(nodeCalculations.rectPoints[6][0], nodeCalculations.rectPoints[6][1]);
                     context.lineTo(nodeCalculations.rectPoints[7][0], nodeCalculations.rectPoints[7][1]);
                     context.closePath();

                     if (nodeCalculations.farFrontElement === activeKey) {
                     context.strokeStyle = "#ff0000";
                     } else {
                     context.strokeStyle = "#f0f0f0";
                     }*/
                    
                    
                    // don't show the logic ports if you are dragging anything around, or if this logic is locked
                    if (utilities.insidePoly(globalStates.pointerPosition, nodeCalculations.rectPoints) && !activeVehicle.lockPassword && !editingVehicle) {
                        if (activeVehicle.animationScale === 0 && !globalStates.editingMode)
                            globalDOMCache["logic" + activeKey].className = "mainEditing scaleIn";
                        activeVehicle.animationScale = 1;
                    }
                    else {
                        if (activeVehicle.animationScale === 1)
                            globalDOMCache["logic" + activeKey].className = "mainEditing scaleOut";
                        activeVehicle.animationScale = 0;
                    }

                    // context.stroke();
                } else {
                    if (activeVehicle.animationScale === 1) {
                        globalDOMCache["logic" + activeKey].className = "mainEditing scaleOut";
                        activeVehicle.animationScale = 0;
                    }
                }
            }
            
            // temporary UI styling to visualize locks

            var LOCK_FEATURE_ENABLED = false;
            
            if (LOCK_FEATURE_ENABLED) {
                if (activeType !== "ui") {
                    if (!!activeVehicle.lockPassword && activeVehicle.lockType === "full") {
                        globalDOMCache["iframe" + activeKey].style.opacity = 0.25;
                    } else if (!!activeVehicle.lockPassword && activeVehicle.lockType === "half") {
                        globalDOMCache["iframe" + activeKey].style.opacity = 0.75;
                    } else {
                        globalDOMCache["iframe" + activeKey].style.opacity = 1.0;
                    }
                }                
            }

        }
    
    } else if (activeType === "ui" && activeVehicle.visualization === "screen") {
        // if (shouldRenderFramesInNodeView) {
        this.hideScreenFrame(activeKey);
        // }
    }
    
    if (shouldRenderFramesInNodeView && !globalStates.renderFrameGhostsInNodeViewEnabled) {
        this.hideScreenFrame(activeKey);
    }
    
    return true;

};

/**
 * Temporarily disabled function that will snap the frame to the marker plane
 * (by removing its rotation components) if the amount of rotation is very small
 * @todo: only do this if it is also close to the marker plane in the Z direction
 * @param {Frame|Node} activeVehicle
 * @param {string} activeKey
 */
realityEditor.gui.ar.draw.snapFrameMatrixIfNecessary = function(activeVehicle, activeKey) {
    var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
    
    // start with the frame's matrix
    var snappedMatrix = this.ar.utilities.copyMatrix(positionData.matrix);

    // calculate its rotation in Euler Angles about the X and Y axis, using a bunch of quaternion math in the background
    var xRotation = this.ar.utilities.getRotationAboutAxisX(snappedMatrix);
    var yRotation = this.ar.utilities.getRotationAboutAxisY(snappedMatrix);
    var snapX = false;
    var snapY = false;

    // see if the xRotation is close enough to neutral
    if (0.5 - Math.abs( Math.abs(xRotation) / Math.PI - 0.5) < 0.05) {
        // globalDOMCache["iframe" + activeKey].classList.add('snapX');
        snapX = true;
    } else {
        // globalDOMCache["iframe" + activeKey].classList.remove('snapX');
    }

    // see if the yRotation is close enough to neutral
    if (0.5 - Math.abs( Math.abs(yRotation) / Math.PI - 0.5) < 0.05) {
        // globalDOMCache["iframe" + activeKey].classList.add('snapY');
        snapY = true;
    } else {
        // globalDOMCache["iframe" + activeKey].classList.remove('snapY');
    }

    /**
     * Removes all rotation components from a modelView matrix
     * Given a modelview matrix, computes its rotation as a quaternion, find the inverse, and multiplies the original
     * matrix by that inverse rotation to remove its rotation
     * @param {Array.<number>} mat
     * @return {Array}
     */
    function computeSnappedMatrix(mat) {
        var res = [];
        var rotationQuaternion = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(mat);
        var inverseRotationQuaternion = realityEditor.gui.ar.utilities.invertQuaternion(rotationQuaternion);
        var inverseRotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(inverseRotationQuaternion);
        realityEditor.gui.ar.utilities.multiplyMatrix(snappedMatrix, inverseRotationMatrix, res);
        return res;
    }

    
    globalDOMCache["iframe" + activeKey].classList.remove('snappableFrame');

    if ( !realityEditor.device.isEditingUnconstrained(activeVehicle) && snapX && snapY) {
        
        // actually update the frame's matrix if meets the conditions
        snappedMatrix = computeSnappedMatrix(this.ar.utilities.copyMatrix(positionData.matrix));
        realityEditor.gui.ar.positioning.setPositionDataMatrix(activeVehicle, snappedMatrix);
        console.log('snapped');
        
    } else if (snapX && snapY) {
        
        // otherwise if it is close but you are still moving it, show some visual feedback to warn you it will snap
        globalDOMCache["iframe" + activeKey].classList.add('snappableFrame');
    }
};

/**
 * Given the vuforia matrix for the marker, and the transformation of the frame relative to that, gives a final composite matrix
 * @param {Array.<number>} visibleObjectMatrix
 * @param {Array.<number>} frameMatrix
 * @param {number} frameX
 * @param {number} frameY
 * @param {number} frameScale
 * @return {Array}
 * @todo: still unsure if this is completely correct. order of rotation, scale, and translation matters.
 */
realityEditor.gui.ar.draw.getFinalMatrixForFrame = function(visibleObjectMatrix, frameMatrix, frameX, frameY, frameScale) {
    var utils = realityEditor.gui.ar.utilities;
    var r1 = [];
    var r2 = [];
    var r3 = [];
    var finalMatrix = [];

    // 1. Rotate visibleObjects[objectKey] for screen orientation.
    utils.multiplyMatrix(rotateX, visibleObjectMatrix, r1);

    // // 2. Translate by the drag amount. Dividing by the scale seems to fix the magnitude.
    // var translation = [
    //     1, 0, 0, 0,
    //     0, 1, 0, 0,
    //     0, 0, 1, 0,
    //     -frameX/frameScale, -frameY/frameScale, 0, 1
    // ];
    // utils.multiplyMatrix(r1, translation, r2);

    r2 = utils.copyMatrix(r1);


    // 3. include positionData if it exists, to match unconstrained position.
    if (frameMatrix.length === 16) {
        utils.multiplyMatrix(frameMatrix, r2, r3);
    } else {
        r3 = utils.copyMatrix(r2);
    }

    // 4. Scale the final result.
    var scale = [
        frameScale, 0, 0, 0,
        0, frameScale, 0, 0,
        0, 0, frameScale, 0,
        frameX/frameScale, frameY/frameScale, 0, 1
    ];
    utils.multiplyMatrix(scale, r3, finalMatrix);
    
    return finalMatrix;
};

/**
 * Ensures that a frame gets display:none applied to it when it is pushed into the screen.
 * @param {string} activeKey
 */
realityEditor.gui.ar.draw.hideScreenFrame = function(activeKey) {
    if (globalDOMCache["object" + activeKey]) {
        globalDOMCache["object" + activeKey].classList.add('displayNone');
    }
};

/**
 * Triggered when a frame gets pulled into AR.
 * Removes the display:none applied to a frame by the corresponding hideScreenFrame call.
 * @param {string} activeKey
 */
realityEditor.gui.ar.draw.showARFrame = function(activeKey) {
    if (globalDOMCache["object" + activeKey]) {
        globalDOMCache["object" + activeKey].classList.remove('displayNone');
    }
};

/**
 * A one-time action that sets up the frame or node added from the pocket in the correct place and begins editing it
 * @param {PocketContainer} pocketContainer - either pocketFrame or pocketNode
 * @param {Object.<string, Array.<number>>} matrix - reference to realityEditor.gui.ar.draw.matrix collection of matrices
 */
realityEditor.gui.ar.draw.addPocketVehicle = function(pocketContainer, matrix) {
    
    // drop frames in from pocket, floating in front of screen in unconstrained mode, aligned with the touch position

    // align with touch (x,y)
    var scaleRatio = 1.4; // TODO: this is an approximation that roughly places the pocket frame in the correct spot. find a complete solution.
    var positionData = realityEditor.gui.ar.positioning.getPositionData(pocketContainer.vehicle);
    positionData.x = (pocketContainer.positionOnLoad.pageX - globalStates.height/2) * scaleRatio;
    positionData.y = (pocketContainer.positionOnLoad.pageY - globalStates.width/2) * scaleRatio;
    
    // immediately start placing the pocket frame in unconstrained mode
    realityEditor.device.editingState.unconstrained = true;

    // still need to set touchOffset...
    realityEditor.device.editingState.touchOffset = {
        x: parseFloat(pocketContainer.vehicle.frameSizeX)/2,
        y: parseFloat(pocketContainer.vehicle.frameSizeY)/2
    };

    // only start editing it if you didn't do a quick tap that already released by the time it loads
    if (pocketContainer.type !== 'ui' || realityEditor.device.currentScreenTouches.map(function(elt){return elt.targetId;}).indexOf("pocket-element") > -1) {

        var activeFrameKey = pocketContainer.vehicle.frameId || pocketContainer.vehicle.uuid;
        var activeNodeKey = pocketContainer.vehicle.uuid === activeFrameKey ? null : pocketContainer.vehicle.uuid;

        realityEditor.device.beginTouchEditing(pocketContainer.vehicle.objectId, activeFrameKey, activeNodeKey);
        // animate it as flowing out of the pocket
        this.startPocketDropAnimation(250, 0.7, 1.0);

        // these lines assign the frame a preset matrix hovering slightly in front of editor
        matrix.copyStillFromMatrixSwitch = false;
        pocketContainer.vehicle.begin = realityEditor.gui.ar.utilities.copyMatrix(pocketBegin);
    }

    pocketContainer.positionOnLoad = null;
    pocketContainer.waitingToRender = false;
};

/**
 * Run an animation on the frame being dropped in from the pocket, performing a smooth tweening of its last matrix element
 * The frame scales down (moves away from camera) the bigger that 15th element is
 * @param {number} timeInMilliseconds - how long the animation takes (default 250ms)
 * @param {number} startPerspectiveDivide - the frame starts out (1 / this) times as big as usual (default 0.7)
 * @param {number} endPerspectiveDivide - the frame ends up (1 / this) times as big as usual (default 1)
 */
realityEditor.gui.ar.draw.startPocketDropAnimation = function(timeInMilliseconds, startPerspectiveDivide, endPerspectiveDivide) {
    var duration = timeInMilliseconds || 250;
    var zStart = startPerspectiveDivide || 0.7;
    var zEnd = endPerspectiveDivide || 1.0;
    
    // reset this so that the initial distance to screens gets calculated when the pocketAnimation ends
    // (or else it automatically gets pushed in by its own animation)
    if (globalStates.initialDistance) {
        globalStates.initialDistance = null;
    }
    
    var position = {x: 0, y: 0, z: zStart};
    pocketDropAnimation = new TWEEN.Tween(position)
        .to({z: zEnd}, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate( function(t) {
            editingAnimationsMatrix[15] = position.z;
        }).onComplete(function() {
            editingAnimationsMatrix[15] = zEnd;
            pocketDropAnimation = null;
        }).onStop(function() {
            editingAnimationsMatrix[15] = zEnd;
            pocketDropAnimation = null;
        })
        .start();
};

/**
 * Hides the DOM elements for a specified frame or node if they still exist and are visible
 * @param {string} activeKey
 * @param {Frame|Node} activeVehicle
 * @param {Object} globalDOMCache
 * @param {function} cout
 */
realityEditor.gui.ar.draw.hideTransformed = function (activeKey, activeVehicle, globalDOMCache, cout) {
    
    var doesDOMElementExist = !!globalDOMCache['object' + activeKey];
    if (!doesDOMElementExist && activeVehicle.visible === true) {
        console.warn('trying to hide a frame that doesn\'t exist');
        return;
    }
    
    if (activeVehicle.hasOwnProperty('fullScreen')) {
        if (activeVehicle.fullScreen === 'sticky') {
            console.log('dont hide sticky frame');
            return;
        }
    }
    
    var isVisible = activeVehicle.visible === true;
    
    // TODO: this makes frames disappear when object becomes invisible, but it's making the visibility message keep posting into the frame, which in response makes the node socket keep sending on loop while in the node view... 
    /*
    if (!isVisible) {
        var isPartiallyHiddenFrame = (activeVehicle.type === 'ui' || typeof activeVehicle.type === 'undefined') &&
                                     !globalDOMCache['object' + activeKey].classList.contains('displayNone');
        if (isPartiallyHiddenFrame) {
            isVisible = true;
        }
    }
    */

    if (isVisible) {
        
        if (activeVehicle.type === 'ui' || typeof activeVehicle.type === 'undefined') {
            globalDOMCache['object' + activeKey].classList.remove('visibleFrameContainer');
            globalDOMCache['object' + activeKey].classList.add('hiddenFrameContainer');
            
            var shouldReallyHide = !this.visibleObjects.hasOwnProperty(activeVehicle.objectId) || activeVehicle.visualization === 'screen';
            if (shouldReallyHide) {
                globalDOMCache['object' + activeKey].classList.add('displayNone');
            }
            
        } else {
            globalDOMCache['object' + activeKey].classList.remove('visibleNodeContainer');
            globalDOMCache['object' + activeKey].classList.add('hiddenNodeContainer');

        }

        globalDOMCache['iframe' + activeKey].classList.remove('visibleFrame');
        globalDOMCache['iframe' + activeKey].classList.add('hiddenFrame');
        
        globalDOMCache["iframe" + activeKey].contentWindow.postMessage(
            JSON.stringify(
                {
                    visibility: "hidden"
                }), '*');

        activeVehicle.visible = false;
        activeVehicle.visibleEditing = false;

        globalDOMCache[activeKey].style.visibility = 'hidden';
        // globalDOMCache["svg" + activeKey].style.display = 'none';
        globalDOMCache["svg" + activeKey].classList.remove('visibleEditingSVG');
        
        // reset the active screen object when it disappears
        if (realityEditor.gui.screenExtension.visibleScreenObjects[activeKey]) {
            delete realityEditor.gui.screenExtension.visibleScreenObjects[activeKey];
        }

        cout("hideTransformed");
    }
};

/**
 * If needed, creates the DOM element for a given frame or node
 * Can be safely called multiple times for the same element (knows to ignore if its already been loaded)
 * @param {string} thisUrl - the iframe src url
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} activeType - 'ui', 'node', 'logic', etc, to tag the element with
 * @param {Frame|Node} activeVehicle - reference to the frame or node to create.
 *                                     it's properties are used to instantiate the correct DOM element.
 */
realityEditor.gui.ar.draw.addElement = function(thisUrl, objectKey, frameKey, nodeKey, activeType, activeVehicle) {

    var activeKey = (!!nodeKey) ? nodeKey : frameKey;
    var isFrameElement = activeKey === frameKey;
    
    if (this.notLoading !== true && this.notLoading !== activeKey && activeVehicle.loaded !== true) {
        
        console.log("loading " + objectKey + "/" + frameKey + "/" + (nodeKey||"null"));

        this.notLoading = activeKey;
        
        // assign the element some default properties if they don't exist
        if (typeof activeVehicle.frameSizeX === 'undefined') {
            activeVehicle.frameSizeX = activeVehicle.width || 220;
        } 
        if (typeof activeVehicle.width === 'undefined') {
            activeVehicle.width = activeVehicle.frameSizeX;
        }
        if (typeof activeVehicle.frameSizeY === 'undefined') {
            activeVehicle.frameSizeY = activeVehicle.height || 220;
        }
        if (typeof activeVehicle.height === 'undefined') {
            activeVehicle.height = activeVehicle.frameSizeY;
        }
        if (typeof activeVehicle.begin !== "object") {
            activeVehicle.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
        }
        if (typeof activeVehicle.temp !== "object") {
            activeVehicle.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();
        }
        activeVehicle.animationScale = 0;
        activeVehicle.loaded = true;
        activeVehicle.visibleEditing = false;
        
        // determine if the frame should be loaded locally or from the server (by default thisUrl points to server)
        if (isFrameElement && activeVehicle.location === 'global') {
            thisUrl = 'frames/' + activeVehicle.src + '.html'; // loads the frame locally from the /frames/ directory
        }

        // Create DOM elements for everything associated with this frame/node
        var domElements = this.createSubElements(thisUrl, objectKey, frameKey, nodeKey, activeVehicle);
        var addContainer = domElements.addContainer;
        var addIframe = domElements.addIframe;
        var addOverlay = domElements.addOverlay;
        var addSVG = domElements.addSVG;
        // var addDistanceUI = domElements.addDistanceUI;

        addOverlay.objectId = objectKey;
        addOverlay.frameId = frameKey;
        addOverlay.nodeId = nodeKey;
        addOverlay.type = activeType;
        
        // todo the event handlers need to be bound to non animated ui elements for fast movements.
        // todo the lines need to end at the center of the square.

        if (activeType === "logic") {
            
            // add the 4-quadrant animated SVG overlay for the logic nodes
            var addLogic = this.createLogicElement(activeVehicle, activeKey);
            addOverlay.appendChild(addLogic);
            globalDOMCache["logic" + activeKey] = addLogic;
        }

        // append all the created elements to the DOM in the correct order...
        document.getElementById("GUI").appendChild(addContainer);
        addContainer.appendChild(addIframe);
        addContainer.appendChild(addOverlay);
        addOverlay.appendChild(addSVG);
        // document.getElementById("GUI").appendChild(addDistanceUI);
        // addOverlay.appendChild(addDistanceUI);

        // cache references to these elements to more efficiently retrieve them in the future
        globalDOMCache[addContainer.id] = addContainer;
        globalDOMCache[addIframe.id] = addIframe;
        globalDOMCache[addOverlay.id] = addOverlay;
        globalDOMCache[addSVG.id] = addSVG;
        
        // add touch event listeners
        realityEditor.device.addTouchListenersForElement(addOverlay, activeVehicle);
    }
};

/**
 * Instantiates the many different DOM elements that make up a frame or node.
 *      addContainer - holds all the different pieces of this element
 *      addIframe - loads in the content for this frame, e.g. a graph or three.js scene, or a node graphic
 *      addOverlay - an invisible overlay that catches touch events and passes into the iframe if needed
 *      addSVG - a visual feedback image that displays when you are dragging the element around
 * @param {string} iframeSrc
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {Frame|Node} activeVehicle
 * @return {{addContainer: HTMLDivElement, addIframe: HTMLIFrameElement, addOverlay: HTMLDivElement, addSVG: HTMLElement, addDistanceUI: HTMLElement}}
 */
realityEditor.gui.ar.draw.createSubElements = function(iframeSrc, objectKey, frameKey, nodeKey, activeVehicle) {

    var activeKey = (!!nodeKey) ? nodeKey : frameKey;

    var addContainer = document.createElement('div');
    addContainer.id = "object" + activeKey;
    addContainer.className = "main";
    addContainer.style.width = globalStates.height + "px";
    addContainer.style.height = globalStates.width + "px";
    if (!!nodeKey) {
        addContainer.classList.add('hiddenNodeContainer');
    } else {
        addContainer.classList.add('hiddenFrameContainer');
    }
    addContainer.style.border = 0;
    addContainer.classList.add('ignorePointerEvents'); // don't let invisible background from container intercept touches

    var addIframe = document.createElement('iframe');
    addIframe.id = "iframe" + activeKey;
    addIframe.className = "main";
    addIframe.frameBorder = 0;
    addIframe.style.width = (activeVehicle.width || activeVehicle.frameSizeX) + "px";
    addIframe.style.height = (activeVehicle.height || activeVehicle.frameSizeY) + "px";
    addIframe.style.left = ((globalStates.height - activeVehicle.frameSizeX) / 2) + "px";
    addIframe.style.top = ((globalStates.width - activeVehicle.frameSizeY) / 2) + "px";
    addIframe.classList.add('hiddenFrame');
    addIframe.src = iframeSrc;
    addIframe.setAttribute("data-frame-key", frameKey);
    addIframe.setAttribute("data-object-key", objectKey);
    addIframe.setAttribute("data-node-key", nodeKey);
    addIframe.setAttribute("onload", 'realityEditor.network.onElementLoad("' + objectKey + '","' + frameKey + '","' + nodeKey + '")');
    addIframe.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts");
    addIframe.classList.add('usePointerEvents'); // override parent (addContainer) pointerEvents value

    var addOverlay = document.createElement('div');
    addOverlay.id = activeKey;
    addOverlay.className = (globalStates.editingMode && activeVehicle.developer) ? "mainEditing" : "mainProgram";
    addOverlay.frameBorder = 0;
    addOverlay.style.width = activeVehicle.frameSizeX + "px";
    addOverlay.style.height = activeVehicle.frameSizeY + "px";
    addOverlay.style.left = ((globalStates.height - activeVehicle.frameSizeX) / 2) + "px";
    addOverlay.style.top = ((globalStates.width - activeVehicle.frameSizeY) / 2) + "px";
    addOverlay.style.visibility = "hidden";
    addOverlay.style.zIndex = "3";
    if (activeVehicle.developer) {
        addOverlay.style["touch-action"] = "none";
    }
    addOverlay.classList.add('usePointerEvents'); // override parent (addContainer) pointerEvents value

    var addSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    addSVG.id = "svg" + activeKey;
    addSVG.className = "mainCanvas";
    addSVG.style.width = "100%";
    addSVG.style.height = "100%";
    addSVG.style.zIndex = "3";
    // addSVG.style.display = 'none';
    addSVG.classList.add('svgDefaultState');
    addSVG.classList.add('usePointerEvents'); // override parent (addContainer) pointerEvents value
    addSVG.setAttribute('shape-rendering','geometricPrecision'); //'optimizeSpeed'
    
    // var addDistanceUI = document.createElement('div');
    // addDistanceUI.id = 'distance' + activeKey;
    // addDistanceUI.classList.add('main');
    // addDistanceUI.classList.add('distanceUI');
    
    return {
        addContainer: addContainer,
        addIframe: addIframe,
        addOverlay: addOverlay,
        addSVG: addSVG
        // addDistanceUI: addDistanceUI
    };
};

/**
 * Gets the correct iconImage url for the logic node and posts it into the logic node iframe to be displayed.
 * its iconImage property is either 'auto', 'custom', or 'none'
 * @param {Logic} activeVehicle
 */
realityEditor.gui.ar.draw.updateLogicNodeIcon = function(activeVehicle) {
    // add the icon image for the logic nodes
    var logicIconSrc = realityEditor.gui.crafting.getLogicNodeIcon(activeVehicle);
    var nodeDom = globalDOMCache["iframe" + activeVehicle.uuid];
    if (nodeDom) {
        nodeDom.contentWindow.postMessage( JSON.stringify({ iconImage: logicIconSrc }) , "*");
    }
};

/**
 * Creates the DOM element for a Logic Node
 * @param {Frame|Node} activeVehicle
 * @param {string} activeKey
 * @return {HTMLDivElement}
 */
realityEditor.gui.ar.draw.createLogicElement = function(activeVehicle, activeKey) {
    var size = 200;
    var addLogic = document.createElement('div');
    addLogic.id = "logic" + activeKey;
    addLogic.className = "mainEditing";
    addLogic.style.width = size + "px";
    addLogic.style.height = size + "px";
    addLogic.style.left = 0; //((activeVehicle.frameSizeX - size) / 2) + "px";
    addLogic.style.top = 0; //((activeVehicle.frameSizeY - size) / 2) + "px";
    addLogic.style.visibility = "hidden";

    var svgContainer = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    svgContainer.setAttributeNS(null, "viewBox", "0 0 100 100");

    var svgElement = [];
    svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    svgElement[0].setAttributeNS(null, "fill", "#00ffff");
    svgElement[0].setAttributeNS(null, "d", "M50,0V50H0V30A30,30,0,0,1,30,0Z");
    svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    svgElement[1].setAttributeNS(null, "fill", "#00ff00");
    svgElement[1].setAttributeNS(null, "d", "M100,30V50H50V0H70A30,30,0,0,1,100,30Z");
    svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    svgElement[2].setAttributeNS(null, "fill", "#ffff00");
    svgElement[2].setAttributeNS(null, "d", "M100,50V70a30,30,0,0,1-30,30H50V50Z");
    svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    svgElement[3].setAttributeNS(null, "fill", "#ff007c");
    svgElement[3].setAttributeNS(null, "d", "M50,50v50H30A30,30,0,0,1,0,70V50Z");

    for (var i = 0; i < svgElement.length; i++) {
        svgContainer.appendChild(svgElement[i]);
        svgElement[i].number = i;
        svgElement[i].addEventListener('pointerenter', function () {
            globalProgram.logicSelector = this.number;

            if (globalProgram.nodeA === activeKey)
                globalProgram.logicA = this.number;
            else
                globalProgram.logicB = this.number;

            console.log(globalProgram.logicSelector);
        });
        addLogic.appendChild(svgContainer);
    }
    
    return addLogic;
};

/**
 * Helper function checks if the specified object contains any frame with sticky fullscreen property.
 * @param {string} objectKey
 * @return {boolean}
 */
realityEditor.gui.ar.draw.doesObjectContainStickyFrame = function(objectKey) {
    var object = realityEditor.getObject(objectKey);
    return Object.keys(object.frames).map(function(frameKey) {
        return realityEditor.getFrame(objectKey, frameKey).fullScreen;
    }).some(function(fullScreen) {
        return fullScreen === 'sticky';
    });
};

/**
 * Fully deletes DOM elements and unloads frames and nodes if they have been invisible for 3+ seconds
 * @param {string} activeKey
 * @param {string} activeVehicle
 * @param {Object} globalDOMCache
 */
realityEditor.gui.ar.draw.killObjects = function (activeKey, activeVehicle, globalDOMCache) {
    if(!activeVehicle.visibleCounter) {
        return;
    }
    if (this.doesObjectContainStickyFrame(activeVehicle.objectId)) {
        console.log('dont kill object with sticky frame');
        return;
    }

    if (activeVehicle.visibleCounter > 1) {
        activeVehicle.visibleCounter--;
    } else {
        activeVehicle.visibleCounter--;
        for (var activeFrameKey in activeVehicle.frames) {
            if (!activeVehicle.frames.hasOwnProperty(activeFrameKey)) continue;

            // don't kill inTransitionFrame or its nodes
            if (activeFrameKey === globalStates.inTransitionFrame) continue;
            
            try {
                globalDOMCache["object" + activeFrameKey].parentNode.removeChild(globalDOMCache["object" + activeFrameKey]);
                delete globalDOMCache["object" + activeFrameKey];
                delete globalDOMCache["iframe" + activeFrameKey];
                delete globalDOMCache[activeFrameKey];
                delete globalDOMCache["svg" + activeFrameKey];
                activeVehicle.frames[activeFrameKey].loaded = false;
            } catch (err) {
                this.cout("could not find any frames")
            }


            for (var activeNodeKey in activeVehicle.frames[activeFrameKey].nodes) {
                if (!activeVehicle.frames[activeFrameKey].nodes.hasOwnProperty(activeNodeKey)) continue;
                try {
                    globalDOMCache["object" + activeNodeKey].parentNode.removeChild(globalDOMCache["object" + activeNodeKey]);
                    delete globalDOMCache["object" + activeNodeKey];
                    delete globalDOMCache["iframe" + activeNodeKey];
                    delete globalDOMCache[activeNodeKey];
                    delete globalDOMCache["svg" + activeNodeKey];
                    activeVehicle.frames[activeFrameKey].nodes[activeNodeKey].loaded = false;
                } catch (err) {
                    this.cout("could not find any nodes");
                }
            }
        }
        this.cout("killObjects");
    }
};

/**
 * Fully delete the DOM element for a specific frame or node
 * (to be triggered when that frame or node is dropped on the trash)
 * @param {string} thisActiveVehicleKey
 * @param {Frame|Node} thisActiveVehicle
 */
realityEditor.gui.ar.draw.killElement = function (thisActiveVehicleKey, thisActiveVehicle) {
    thisActiveVehicle.loaded = false;
    globalDOMCache["object" + thisActiveVehicleKey].parentNode.removeChild(globalDOMCache["object" + thisActiveVehicleKey]);
    delete globalDOMCache["object" + thisActiveVehicleKey];
    delete globalDOMCache["iframe" + thisActiveVehicleKey];
    delete globalDOMCache[thisActiveVehicleKey];
    delete globalDOMCache["svg" + thisActiveVehicleKey];
    delete globalDOMCache[thisActiveVehicleKey];
};

/**
 * Delete a node from a frame. Remove it from the frame's nodes list, and remove the DOM elements.
 * @param {string} objectId
 * @param {string} frameId
 * @param {string} nodeId
 */
realityEditor.gui.ar.draw.deleteNode = function (objectId, frameId, nodeId) {
    var thisFrame = realityEditor.getFrame(objectId, frameId);
    if (!thisFrame) return;

    delete thisFrame.nodes[nodeId];
    if (this.globalDOMCache["object" + nodeId]) {
        if (this.globalDOMCache["object" + nodeId].parentNode) {
            this.globalDOMCache["object" + nodeId].parentNode.removeChild(this.globalDOMCache["object" + nodeId]);
        }
        delete this.globalDOMCache["object" + nodeId];
    }
    delete this.globalDOMCache["iframe" + nodeId];
    delete this.globalDOMCache[nodeId];
    delete this.globalDOMCache["svg" + nodeId];
};

/**
 * Delete a frame from an object. Remove it from the objects's frames list, and remove the DOM elements.
 * @param {string} objectId
 * @param {string} frameId
 */
realityEditor.gui.ar.draw.deleteFrame = function (objectId, frameId) {
    
    realityEditor.forEachNodeInFrame(objectId, frameId, realityEditor.gui.ar.draw.deleteNode);

    delete objects[objectId].frames[frameId];
    this.globalDOMCache["object" + frameId].parentNode.removeChild(this.globalDOMCache["object" + frameId]);
    delete this.globalDOMCache["object" + frameId];
    delete this.globalDOMCache["iframe" + frameId];
    delete this.globalDOMCache[frameId];
    delete this.globalDOMCache["svg" + frameId];

};

/**
 * Sets the objectVisible property of not only the object, but also all of its frames
 * @param {Object} object - reference to the object whose property you wish to set
 * @param {boolean} shouldBeVisible - objects that are not visible do not render their interfaces, nodes, links.
 */
realityEditor.gui.ar.draw.setObjectVisible = function (object, shouldBeVisible) {
    if (!object) return;
    object.objectVisible = shouldBeVisible;
    for (var frameKey in object.frames) {
        if (!object.frames.hasOwnProperty(frameKey)) continue;
        object.frames[frameKey].objectVisible = shouldBeVisible;
    }
};

////////////////////////////////////////////////////////////////////////////////////////
// Not used currently, but maintains a stack of the most recently dragged frames/nodes,
// can be used for z-index depth issues, e.g. render more recently editing frames on top
////////////////////////////////////////////////////////////////////////////////////////

/**
 * Moves the frame reference from its current spot to the front of the stack
 * @param {string} frameKey
 */
realityEditor.gui.ar.draw.pushEditedFrameToFront = function(frameKey) {
    this.removeFromEditedFramesList(frameKey);
    globalStates.mostRecentlyEditedFrames.push(frameKey);
};

/**
 * Moves the node reference from its current spot to the front of the stack
 * @param {string} nodeKey
 */
realityEditor.gui.ar.draw.pushEditedNodeToFront = function(nodeKey) {
    this.removeFromEditedNodesList(nodeKey);
    globalStates.mostRecentlyEditedNodes.push(nodeKey);
};

/**
 * Removes the frame reference from the stack
 * @param frameKey
 */
realityEditor.gui.ar.draw.removeFromEditedFramesList = function(frameKey) {
    var existingIndex = globalStates.mostRecentlyEditedFrames.indexOf(frameKey);
    if (existingIndex > -1) {
        globalStates.mostRecentlyEditedFrames.splice(existingIndex, 1);
    }
};

/**
 * Removes the node reference from the stack
 * @param {string} nodeKey
 */
realityEditor.gui.ar.draw.removeFromEditedNodesList = function(nodeKey) {
    var existingIndex = globalStates.mostRecentlyEditedNodes.indexOf(nodeKey);
    if (existingIndex > -1) {
        globalStates.mostRecentlyEditedNodes.splice(existingIndex, 1);
    }
};

/**
 * Tells how recently a frame has been edited, so that more recent ones can be rendered on top of less recent ones.
 * An index of 0 means rendered on top. Index of length-1 means render in back.
 * Also returns length of edited frames so that it can be handled differently if no frames have been edited (length=0)
 * @param {string} frameKey
 * @return {{index: number, length: number}}
 */
realityEditor.gui.ar.draw.getFrameRenderPriority = function(frameKey) {
    return {
        index: globalStates.mostRecentlyEditedFrames.indexOf(frameKey),
        length: globalStates.mostRecentlyEditedFrames.length
    }
};

/**
 * See documentation for getFrameRenderPriority. Same but for nodes.
 * @param {string} nodeKey
 * @return {{index: number, length: number}}
 */
realityEditor.gui.ar.draw.getNodeRenderPriority = function(nodeKey) {
    return {
        index: globalStates.mostRecentlyEditedNodes.indexOf(nodeKey),
        length: globalStates.mostRecentlyEditedNodes.length
    }
};

////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////

// simulates drawing... TODO: simplify this and make it only work for frames? or maybe nodes too...

/**
 * Simulates the calculations from drawTransformed, for the purpose of updating a frame's mostRecentFinalMatrix,
 * but without changing the CSS. Necessary for the moveVehicleToScreenCoordinate calculations, which reset the frame's
 * ar.x and ar.y coordinates before moving, so we need to calculate the final matrix without x and y.
 * @param visibleObjects
 * @param objectKey
 * @param activeKey
 * @param activeType
 * @param activeVehicle
 * @param notLoading
 * @param globalDOMCache
 * @param globalStates
 * @param globalCanvas
 * @param activeObjectMatrix
 * @param matrix
 * @param finalMatrix
 * @param utilities
 * @param nodeCalculations
 * @param cout
 * @return {*}
 * @todo: simplify this! there shouldnt be a need for so much duplicate code. might even be a simple matrix multiplication to take
 * @todo:       mostRecentFinalMatrix * translation^-1    which would give the same result as this function for the use cases I'm doing
 */
realityEditor.gui.ar.draw.recomputeTransformMatrix = function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCache, globalStates, globalCanvas, activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {

    if (activeVehicle.fullScreen !== true && activeVehicle.fullScreen !== 'sticky') {

        // recompute activeObjectMatrix for the current object
        var activeObjectMatrixCopy = [];
        if (visibleObjects[objectKey]) {
            this.ar.utilities.multiplyMatrix(visibleObjects[objectKey], globalStates.projectionMatrix, matrix.r);
            this.ar.utilities.multiplyMatrix(rotateX, matrix.r, activeObjectMatrixCopy);
        } else {
            activeObjectMatrixCopy = utilities.copyMatrix(activeObjectMatrix);
        }
        
        var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);

        var finalOffsetX = positionData.x;
        var finalOffsetY = positionData.y;
        var finalScale = positionData.scale;
        
        // // add node's position to its frame's position to gets its actual offset
        
        if (activeType !== "ui" && activeType !== "logic") {
            var frameKey = activeVehicle.frameId;
            var frame = realityEditor.getFrame(objectKey, frameKey);
            if (frame) {
                var parentFramePositionData = realityEditor.gui.ar.positioning.getPositionData(frame);
                if (frame.location !== 'local') {
                    finalOffsetX = finalOffsetX /* * (parentFramePositionData.scale/globalStates.defaultScale) */ + parentFramePositionData.x;
                    finalOffsetY = finalOffsetY /* * (parentFramePositionData.scale/globalStates.defaultScale) */ + parentFramePositionData.y;
                }
                finalScale *= 1.0; //(parentFramePositionData.scale/globalStates.defaultScale);
            }
        }

        matrix.r3 = [
            finalScale, 0, 0, 0,
            0, finalScale, 0, 0,
            0, 0, 1, 0,
            // positionData.x, positionData.y, 0, 1
            finalOffsetX, finalOffsetY, 0, 1
        ];
        
        realityEditor.gui.ar.positioning.getPositionData(activeVehicle);

        var matrixToUse = realityEditor.gui.ar.utilities.copyMatrix(positionData.matrix); // defaults to positionData.matrix for all but a special case of node

        if (typeof matrixToUse !== "undefined" && matrixToUse.length > 0 && typeof matrixToUse[1] !== "undefined") {
            // if (globalStates.unconstrainedPositioning === false) {
            //     //activeVehicle.begin = copyMatrix(multiplyMatrix(activeVehicle.matrix, activeVehicle.temp));
            //     utilities.multiplyMatrix(matrixToUse, activeVehicle.temp, activeVehicle.begin);
            // }
            // utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
            // utilities.multiplyMatrix(matrix.r3, matrix.r, matrix.r2);
            
            var tempBegin = [];
            utilities.multiplyMatrix(matrixToUse, activeVehicle.temp, tempBegin);
            utilities.multiplyMatrix(tempBegin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
        }

        if (typeof matrixToUse !== "undefined") {
            if (matrixToUse.length < 13) {
                utilities.multiplyMatrix(matrix.r3, activeObjectMatrixCopy, finalMatrix);

            } else {
                utilities.multiplyMatrix(matrixToUse, activeObjectMatrixCopy, matrix.r);
                utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
            }
        }

        // var editingVehicle = realityEditor.device.getEditingVehicle();
        // var thisIsBeingEdited = (editingVehicle === activeVehicle);

        // multiply in the animation matrix if you are editing this frame in unconstrained mode.
        // in the future this can be expanded but currently this is the only time it gets animated.
        // if (thisIsBeingEdited && (realityEditor.device.editingState.unconstrained || globalStates.unconstrainedPositioning)) {
        //     var animatedFinalMatrix = [];
        //     utilities.multiplyMatrix(finalMatrix, editingAnimationsMatrix, animatedFinalMatrix);
        //     finalMatrix = utilities.copyMatrix(animatedFinalMatrix);
        // }

        // we want nodes closer to camera to have higher z-coordinate, so that they are rendered in front
        // but we want all of them to have a positive value so they are rendered in front of background canvas
        // and frames with developer=false should have the lowest positive value
        
        // if (finalMatrix[14] < 10) {
        //     finalMatrix[14] = 10;
        // }
        // finalMatrix[14] = 200 + 100000 / finalMatrix[14]; // TODO: does this mess anything up? it should fix the z-order problems
        //
        // //move non-developer frames to the back so they don't steal touches from interactable frames
        // if (activeVehicle.developer === false) {
        //     finalMatrix[14] = 100;
        // }

        activeVehicle.mostRecentFinalMatrix = finalMatrix;

        // draw transformed
        // globalDOMCache["object" + activeKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';

        // return 'matrix3d(' + finalMatrix.toString() + ')';

        return finalMatrix;

    }
};
