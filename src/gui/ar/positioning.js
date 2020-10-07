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


createNameSpace("realityEditor.gui.ar.positioning");

/**
 * @fileOverview realityEditor.gui.ar.positioning.js
 * Contains all functions relating to repositioning or rescaling a frame or node.
 */

/**
 * @typedef initialScaleData
 * @property {number} radius - how far apart in pixels the two touches are to begin with
 * @property {number} scale - the frame or node's initial scale value before the gesture, to use as a base multiplier
 */
realityEditor.gui.ar.positioning.initialScaleData = null;

/**
 * Scales the specified frame or node using the first two touches.
 * The new scale starts at the initial scale and varies linearly with the changing touch radius.
 * @param {Frame|Node} activeVehicle - the frame or node you are scaling
 * @param {Object.<x,y>} centerTouch - the first touch event, where the scale is centered from
 * @param {Object.<x,y>} outerTouch - the other touch, where the scale extends to
 */
realityEditor.gui.ar.positioning.scaleVehicle = function(activeVehicle, centerTouch, outerTouch) {
    
    if (!centerTouch || !outerTouch || !centerTouch.x || !centerTouch.y || !outerTouch.x || !outerTouch.y) {
        console.warn('trying to scale vehicle using improperly formatted touches');
        return;
    }

    var dx = centerTouch.x - outerTouch.x;
    var dy = centerTouch.y - outerTouch.y;
    var radius = Math.sqrt(dx * dx + dy * dy);

    var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);

    if (!this.initialScaleData) {
        this.initialScaleData = {
            radius: radius,
            scale: positionData.scale
        };
        return;
    }

    // calculate the new scale based on the radius between the two touches
    var newScale = this.initialScaleData.scale + (radius - this.initialScaleData.radius) / 300;
    if (typeof newScale !== 'number') return;

    // TODO ben: low priority: re-implement scaling gesture to preserve touch location rather than scaling center 
    // TODO: this only works for frames right now, not nodes (at least not after scaling nodes twice in one gesture)
    // manually calculate positionData.x and y to keep centerTouch in the same place relative to the vehicle
    // var overlayDiv = document.getElementById(activeVehicle.uuid);
    // var touchOffset = realityEditor.device.editingState.touchOffset;
    // if (overlayDiv && touchOffset) {
    //     var touchOffsetFromCenter = {
    //         x: overlayDiv.clientWidth/2 - touchOffset.x,
    //         y: overlayDiv.clientHeight/2 - touchOffset.y
    //     };
    //     var scaleDifference = Math.max(0.2, newScale) - positionData.scale;
    //     positionData.x += touchOffsetFromCenter.x * scaleDifference;
    //     positionData.y += touchOffsetFromCenter.y * scaleDifference;
    // }
    
    positionData.scale = Math.max(0.2, newScale); // 0.2 is the minimum scale allowed
    
    realityEditor.gui.ar.sceneGraph.updatePositionData(activeVehicle.uuid);

    // redraw circles to visualize the new scaling
    globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);

    // draw a blue circle visualizing the initial radius
    var circleCenterCoordinates = [centerTouch.x, centerTouch.y];
    realityEditor.gui.ar.lines.drawBlue(globalCanvas.context, circleCenterCoordinates, this.initialScaleData.radius);

    // draw a red or green circle visualizing the new radius
    if (radius < this.initialScaleData.radius) {
        realityEditor.gui.ar.lines.drawRed(globalCanvas.context, circleCenterCoordinates, radius);
    } else {
        realityEditor.gui.ar.lines.drawGreen(globalCanvas.context, circleCenterCoordinates, radius);
    }
    
    var keys = realityEditor.getKeysFromVehicle(activeVehicle);
    var propertyPath = activeVehicle.hasOwnProperty('visualization') ? 'ar.scale' : 'scale';
    realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, propertyPath, positionData.scale);
};

/**
 * Creates and returns a div with the same CSS3D transform as the provided vehicle, but with all x/y/scale removed
 * @param {Frame|Node} activeVehicle
 * @param {boolean} isContinuous
 * @return {HTMLElement}
 */
realityEditor.gui.ar.positioning.getDivWithUntransformedMatrix = function(activeVehicle, isContinuous) {
    let activeKey = activeVehicle.uuid;
    
    let matrixComputationDiv = globalDOMCache['matrixComputationDiv'];
    if (!matrixComputationDiv) {
        // create it if needed
        matrixComputationDiv = document.createElement('div');
        matrixComputationDiv.id = 'matrixComputationDiv';
        matrixComputationDiv.classList.add('main');
        matrixComputationDiv.classList.add('ignorePointerEvents');
        // matrixComputationDiv.style.visibility = 'visible';
        // matrixComputationDiv.style.backgroundColor = 'rgba(255,0,0,0.2)';
        
        // 3D transforms only apply correctly if it's a child of the GUI container (like the rest of the tools/nodes)
        document.getElementById('GUI').appendChild(matrixComputationDiv);
        globalDOMCache['matrixComputationDiv'] = matrixComputationDiv;
    }
    
    // optimize dragging same element around while frozen by not recomputing matrix
    // let matrixCantChange = !realityEditor.device.isEditingUnconstrained(activeVehicle) || globalStates.freezeButtonState;
    if (/*matrixCantChange &&*/ isContinuous && globalStates.lastRepositionedUuid === activeKey) {
        // console.log('optimized reposition');
        return matrixComputationDiv;
    }
    
    if (matrixComputationDiv.style.display === 'none') {
        matrixComputationDiv.style.display = '';
    }
    
    // the computation is only correct if it has the same width/height as the vehicle's transformed element
    let vehicleContainer = globalDOMCache['object' + activeKey];
    matrixComputationDiv.style.width = vehicleContainer.style.width;
    matrixComputationDiv.style.height = vehicleContainer.style.height;

    let untransformedMatrix = realityEditor.gui.ar.sceneGraph.getCSSMatrixWithoutTranslation(activeKey);
    matrixComputationDiv.style.transform = 'matrix3d(' + untransformedMatrix.toString() + ')';
    
    return matrixComputationDiv;
};

realityEditor.gui.ar.positioning.stopRepositioning = function() {
    if (globalDOMCache['matrixComputationDiv']) {
        globalDOMCache['matrixComputationDiv'].style.display = 'none'; // hide it after use so it doesn't consume resources
        globalStates.lastRepositionedUuid = null;
    }
};

/**
 * Primary method to move a transformed frame or node to the (x,y) point on its plane where the (screenX,screenY) ray cast intersects
 * @param {Frame|Node} activeVehicle
 * @param {number} screenX
 * @param {number} screenY
 * @param {boolean} useTouchOffset - if false, puts (0,0) coordinate of frame/node at the resulting point.
 *                                   if true, the first time you call it, it determines the x,y offset to drag the frame/node
 *                                   from the ray cast without it jumping, and subsequently drags it from that point
 * @param {boolean} isContinuous - true to optimize calculations for this being triggered multiple times in a row
 *                                 if true, you are expected to manually call stopRepositioning when done
 */
realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate = function(activeVehicle, screenX, screenY, useTouchOffset, isContinuous) {
    
    var newPosition;
    try {
        // set dummy div transform to iframe without x,y,scale
        let matrixComputationDiv = this.getDivWithUntransformedMatrix(activeVehicle, isContinuous);
        newPosition = webkitConvertPointFromPageToNode(matrixComputationDiv, new WebKitPoint(screenX, screenY));
        if (!isContinuous) {
            realityEditor.gui.ar.positioning.stopRepositioning();
        } else {
            globalStates.lastRepositionedUuid = activeVehicle.uuid;
        }
    } catch (e) {
        console.warn('Error computing untransformed matrix or in webkitConvertPointFromPageToNode while trying to' +
            ' move vehicle', e);
        return;
    }

    var positionData = this.getPositionData(activeVehicle);

    if (useTouchOffset) {

        var changeInPosition = {
            x: newPosition.x - positionData.x,
            y: newPosition.y - positionData.y
        };

        if (!realityEditor.device.editingState.touchOffset) {
            realityEditor.device.editingState.touchOffset = changeInPosition;
        } else {
            positionData.x = newPosition.x - realityEditor.device.editingState.touchOffset.x;
            positionData.y = newPosition.y - realityEditor.device.editingState.touchOffset.y;
        }

    } else {

        realityEditor.device.editingState.touchOffset = null;
        positionData.x = newPosition.x;
        positionData.y = newPosition.y;
        
    }

    // flags the sceneNode as dirty so it gets rendered again with the new x/y position
    realityEditor.gui.ar.sceneGraph.updatePositionData(activeVehicle.uuid); 

    // broadcasts this to the realtime system if it's enabled
    if (!realityEditor.gui.settings.toggleStates.realtimeEnabled) { return; }

    var keys = realityEditor.getKeysFromVehicle(activeVehicle);
    var propertyPath = activeVehicle.hasOwnProperty('visualization') ? 'ar.x' : 'x';
    realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, propertyPath, positionData.x);
    propertyPath = activeVehicle.hasOwnProperty('visualization') ? 'ar.y' : 'y';
    realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, propertyPath, positionData.y);
};

/**
 * Because node positions are affected by scale of parent while rendering, divide by scale of parent while dragging
 * @param {Frame|Node} activeVehicle
 * @param {{x: number, y: number}} pointReference - object containing the x and y values you want to adjust
 * @todo: currently not in use. re-enable later once node position dragging gets fixed
 */
realityEditor.gui.ar.positioning.applyParentScaleToDragPosition = function(activeVehicle, pointReference) {

    if (!realityEditor.gui.ar.positioning.isVehicleUnconstrainedEditable(activeVehicle)) {
        // position is affected by parent frame scale
        var parentFrame = realityEditor.getFrame(activeVehicle.objectId, activeVehicle.frameId);
        if (parentFrame) {
            var parentFramePositionData = realityEditor.gui.ar.positioning.getPositionData(parentFrame);
            pointReference.x /= (parentFramePositionData.scale/globalStates.defaultScale);
            pointReference.y /= (parentFramePositionData.scale/globalStates.defaultScale);
        }
    }
    
};

/**
 * Gets the object reference containing 'x', 'y', 'scale', and 'matrix' variables describing this vehicle's position
 *  - frames: return position data within 'ar' property (no need to return 'screen' anymore since that never happens within the editor)
 *  - nodes that aren't unconstrained editable: return the parent frame's matrix but the node's x, y, and scale
 *  - unconstrained editable frames: return their own x, y, scale, and matrix
 * @param {Frame|Node} activeVehicle
 * @return {{x: number, y: number, scale: number, matrix: Array.<number>, ...}}
 */
realityEditor.gui.ar.positioning.getPositionData = function(activeVehicle) {

    // frames use their AR data

    if (activeVehicle.hasOwnProperty('visualization')) {
        return activeVehicle.ar;
    }

    // nodes on global frames use their x, y, scale and their parent frame's matrix

    if (!realityEditor.gui.ar.positioning.isVehicleUnconstrainedEditable(activeVehicle)) {
        var frame = realityEditor.getFrame(activeVehicle.objectId, activeVehicle.frameId);
        if (frame) {
            var parentFramePositionData = realityEditor.gui.ar.positioning.getPositionData(frame);
            // only parent frame has matrix -> just use that
            realityEditor.gui.ar.utilities.copyMatrixInPlace(parentFramePositionData.matrix, activeVehicle.matrix);
        }
    }

    // logic nodes and nodes on local frames just use their own x, y, and matrix

    return activeVehicle;
};

/**
 * Sets the correct matrix for this vehicle's position data to the new value.
 * @param {Frame|Node} activeVehicle
 * @param {Array.<number>} newMatrixValue
 * @todo: ensure fully implemented
 */
realityEditor.gui.ar.positioning.setPositionDataMatrix = function(activeVehicle, newMatrixValue) {

    if (realityEditor.isVehicleAFrame(activeVehicle)) {
        realityEditor.gui.ar.utilities.copyMatrixInPlace(newMatrixValue, activeVehicle.ar.matrix);
    } else {
        realityEditor.gui.ar.utilities.copyMatrixInPlace(newMatrixValue, activeVehicle.matrix);
    }

    // if (shouldBroadcastUpdate) {
    //     var keys = realityEditor.getKeysFromVehicle(activeVehicle);
    //     var propertyPath = activeVehicle.hasOwnProperty('visualization') ? 'ar.matrix' : 'matrix';
    //     realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, propertyPath, newMatrixValue);
    // }
};

/**
 * Returns the last position that was touched, by extracting the CSS location of the touch overlay div.
 * @todo: WARNING this doesn't always work as intended if there are more than one touches on the screen....
 * @todo: it will jump back and forth between the two fingers depending on which one moved last
 * @return {{x: number, y: number}}
 */
realityEditor.gui.ar.positioning.getMostRecentTouchPosition = function() {
    var touchX = globalStates.height/2; // defaults to center of screen;
    var touchY = globalStates.width/2;
    
    try {
        var translate3d = overlayDiv.style.transform.split('(')[1].split(')')[0].split(',').map(function(elt){return parseInt(elt);});
        touchX = translate3d[0];
        touchY = translate3d[1];
    } catch (e) {
        console.log('no touches on screen yet, so defaulting to center');
    }
    
    return {
        x: touchX,
        y: touchY
    }
};

/**
 * Able to unconstrained edit:
 * - all logic nodes
 * - all frames
 * - nodes on local frames
 * @param {Frame|Node} activeVehicle
 * @return {boolean}
 */
realityEditor.gui.ar.positioning.isVehicleUnconstrainedEditable = function(activeVehicle) {
    
    if (activeVehicle.type === 'node') {
        var parentFrame = realityEditor.getFrame(activeVehicle.objectId, activeVehicle.frameId);
        if (parentFrame) {
            return parentFrame.location === 'local';
        }
    }
    
    return  (typeof activeVehicle.type === 'undefined' || activeVehicle.type === 'ui' || activeVehicle.type === 'logic');
};

/**
 * A super-optimized version of realityEditor.gui.ar.positioning.getScreenPosition that specifically computes the
 * upperLeft, center, and lowerRight screen coordinates of a frame or node using as few arithmetic operations as possible,
 * using only the final CSS matrix of the vehicle, and its half width and height
 * Return value includes center even if not needed, because faster to compute lowerRight using center than without it
 * 
 * @param {Array.<number>} finalMatrix - the CSS transform3d matrix
 * @param {number} vehicleHalfWidth - get from frameSizeX (scale is already stored separately in the matrix)
 * @param {number} vehicleHalfHeight - get from frameSizeY
 * @param {boolean} onlyCenter - if defined, doesn't waste resources computing upperLeft and lowerRight
 * @return {{ center: {x: number, y: number}, upperLeft: {x: number, y: number}|undefined, lowerRight: {x: number, y: number}|undefined }}
 */
realityEditor.gui.ar.positioning.getVehicleBoundingBoxFast = function(finalMatrix, vehicleHalfWidth, vehicleHalfHeight, onlyCenter) {
    
    // compute the screen coordinates for various points within the frame
    var screenCoordinates = {};

    // var halfWidth = parseInt(frame.frameSizeX)/2;
    // var halfHeight = parseInt(frame.frameSizeY)/2;
    
    // super optimized version of getProjectedCoordinates (including multiplyMatrix4 and perspectiveDivide) for the 0,0 coordinate
    screenCoordinates.center = {
        x: (globalStates.height / 2) + (finalMatrix[12] / finalMatrix[15]),
        y: (globalStates.width / 2) + (finalMatrix[13] / finalMatrix[15])
    };
    
    if (typeof onlyCenter === 'undefined') {
        // perspective divide is more complicated for point not at 0,0 ... but still pretty optimized
        var perspectiveDivide = finalMatrix[3] * (-1 * vehicleHalfWidth) + finalMatrix[7] * (-1 * vehicleHalfHeight) + finalMatrix[15];
        screenCoordinates.upperLeft = {
            x: (globalStates.height / 2) + ((finalMatrix[0] * (-1 * vehicleHalfWidth) + finalMatrix[4] * (-1 * vehicleHalfHeight) + finalMatrix[12]) / perspectiveDivide),
            y: (globalStates.width / 2) + ((finalMatrix[1] * (-1 * vehicleHalfWidth) + finalMatrix[5] * (-1 * vehicleHalfHeight) + finalMatrix[13]) / perspectiveDivide)
        };

        // don't calculate lowerRight with expensive matrix multiplications, it can be deduced from center and upperLeft because it is the reflection of upperLeft across the center
        var dx = screenCoordinates.center.x - screenCoordinates.upperLeft.x;
        var dy = screenCoordinates.center.y - screenCoordinates.upperLeft.y;

        screenCoordinates.lowerRight = {
            x: screenCoordinates.center.x + dx,
            y: screenCoordinates.center.y + dy
        };
    }

    return screenCoordinates;
};

/**
 * Provides the screen coordinates of the center, upperLeft and lowerRight coordinates of the provided frame
 * (enough points to determine whether the frame overlaps with any rectangular region of the screen)
 * @param {string} objectKey
 * @param {string} frameKey
 * @return {{ center: {x: number, y: number}, upperLeft: {x: number, y: number}, lowerRight: {x: number, y: number} }}
 */
realityEditor.gui.ar.positioning.getFrameScreenCoordinates = function(objectKey, frameKey) {
    return this.getScreenPosition(objectKey, frameKey, true, true, false, false, true);
};

/**
 * Calculates the exact screen coordinates corresponding to the center and corner points of the provided frame.
 * Passing in true or false for the last 5 arguments controls which points to calculate and include in the result.
 * (if omitted, they default to true to include everything)
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {boolean|undefined} includeCenter
 * @param {boolean|undefined} includeUpperLeft
 * @param {boolean|undefined} includeUpperRight
 * @param {boolean|undefined} includeLowerLeft
 * @param {boolean|undefined} includeLowerRight
 * @param {number|undefined} buffer - extra padding to extend corner positions by, defaults to 0
 */
realityEditor.gui.ar.positioning.getScreenPosition = function(objectKey, frameKey, includeCenter, includeUpperLeft, includeUpperRight, includeLowerLeft, includeLowerRight, buffer) {
    if (typeof includeCenter === 'undefined') { includeCenter = true; }
    if (typeof includeUpperLeft === 'undefined') { includeUpperLeft = true; }
    if (typeof includeUpperRight === 'undefined') { includeUpperRight = true; }
    if (typeof includeLowerLeft === 'undefined') { includeLowerLeft = true; }
    if (typeof includeLowerRight === 'undefined') { includeLowerRight = true; }
    if (typeof buffer === 'undefined') { buffer = 0; }

    var utils = realityEditor.gui.ar.utilities;
    var draw = realityEditor.gui.ar.draw;
    
    // 1. recompute the ModelViewProjection matrix for the marker
    var activeObjectMatrix = [];
    utils.multiplyMatrix(draw.visibleObjects[objectKey], globalStates.projectionMatrix, activeObjectMatrix);
    
    // 2. Get the matrix of the frame and compute the composed matrix of the frame relative to the object.
    //   *the order of multiplications is important*
    var frame = realityEditor.getFrame(objectKey, frameKey);
    var positionData = realityEditor.gui.ar.positioning.getPositionData(frame);
    var positionDataMatrix = positionData.matrix.length === 16 ? positionData.matrix : utils.newIdentityMatrix();
    var frameMatrixTemp = [];
    var frameMatrix = [];
    utils.multiplyMatrix(positionDataMatrix, activeObjectMatrix, frameMatrixTemp);
    
    // 4. Scale/translate the final result.
    var scale = [
        positionData.scale, 0, 0, 0,
        0, positionData.scale, 0, 0,
        0, 0, positionData.scale, 0,
        positionData.x, positionData.y, 0, 1
    ];
    utils.multiplyMatrix(scale, frameMatrixTemp, frameMatrix);
    
    // compute the screen coordinates for various points within the frame
    var screenCoordinates = {};
    
    var halfWidth = parseInt(frame.frameSizeX)/2;
    var halfHeight = parseInt(frame.frameSizeY)/2;

    // start with coordinates in frame-space -> compute coordinates in screen space
    
    // for each "include..." parameter, add a value to the result with that coordinate
    if (includeCenter) {
        var center = [0, 0, 0, 1];
        screenCoordinates.center = this.getProjectedCoordinates(center, frameMatrix);
    }

    if (includeUpperLeft) {
        var upperLeft = [-1 * halfWidth - buffer, -1 * halfHeight - buffer, 0, 1];
        screenCoordinates.upperLeft = this.getProjectedCoordinates(upperLeft, frameMatrix);
    }

    if (includeUpperRight) {
        var upperRight = [halfWidth + buffer, -1 * halfHeight - buffer, 0, 1];
        screenCoordinates.upperRight = this.getProjectedCoordinates(upperRight, frameMatrix);
    }

    if (includeLowerLeft) {
        var lowerLeft = [-1 * halfWidth - buffer, halfHeight + buffer, 0, 1];
        screenCoordinates.lowerLeft = this.getProjectedCoordinates(lowerLeft, frameMatrix);
    }

    if (includeLowerRight) {
        var lowerRight = [halfWidth + buffer, halfHeight + buffer, 0, 1];
        screenCoordinates.lowerRight = this.getProjectedCoordinates(lowerRight, frameMatrix);
    }
    
    return screenCoordinates;
};

/**
 * Converts [frameX, frameY, 0, 1] into screen coordinates based on the provided ModelViewProjection matrix
 * @param {Array.<number>} frameCoordinateVector - a length-4 vector [x, y, 0, 1] of the position in frame space
 *      e.g. [0, 0, 0, 1] represents the center of the frame and [-halfWidth, -halfHeight, 0, 1] represents the top-left
 * @param {Array.<number>} frameMatrix - 4x4 MVP matrix, composition of the object and frame transformations
 * @return {{x: number, y: number}}
 */
realityEditor.gui.ar.positioning.getProjectedCoordinates = function(frameCoordinateVector, frameMatrix) {
    var utils = realityEditor.gui.ar.utilities;
    var projectedCoordinateVector = utils.perspectiveDivide(utils.multiplyMatrix4(frameCoordinateVector, frameMatrix));
    projectedCoordinateVector[0] += (globalStates.height / 2);
    projectedCoordinateVector[1] += (globalStates.width / 2);
    return {
        x: projectedCoordinateVector[0],
        y: projectedCoordinateVector[1]
    };
};

/**
 * Instantly moves the frame to the pocketBegin matrix, so it's floating right in front of the camera
 * @param objectKey
 * @param frameKey
 */
realityEditor.gui.ar.positioning.moveFrameToCamera = function(objectKey, frameKey) {

    var frame = realityEditor.getFrame(objectKey, frameKey);
    
    // recompute frame.temp for the new object
    realityEditor.gui.ar.utilities.multiplyMatrix(realityEditor.gui.ar.draw.modelViewMatrices[objectKey], globalStates.projectionMatrix, frame.temp);

    console.log('temp', frame.temp);
    frame.begin = realityEditor.gui.ar.utilities.copyMatrix(pocketBegin);
    
    // compute frame.matrix based on new object
    var resultMatrix = [];
    realityEditor.gui.ar.utilities.multiplyMatrix(frame.begin, realityEditor.gui.ar.utilities.invertMatrix(frame.temp), resultMatrix);
    realityEditor.gui.ar.positioning.setPositionDataMatrix(frame, resultMatrix); // TODO: fix this somehow, make it more understandable

    // reset frame.begin
    frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
};

/**
 * Given the final transform3d matrix representing where a frame or node is rendered on the screen,
 * determines if it is sufficiently outside the viewport to be able to entirely unloaded from view.
 * The size of the viewport can depend on various factors, e.g. powerSave mode.
 * @param {string} activeKey - frame/node key to lookup sceneGraph information
 * @param {Array.<number>} finalMatrix - the CSS transform3d matrix
 * @param {number} vehicleHalfWidth - get from frameSizeX (scale is already stored separately in the matrix)
 * @param {number} vehicleHalfHeight - get from frameSizeY
 * @param {number?} maxDistance - if further away than this, unload. (unit scale: 1000=1meter)
 * @return {boolean}
 */
realityEditor.gui.ar.positioning.canUnload = function(activeKey, finalMatrix, vehicleHalfWidth, vehicleHalfHeight, maxDistance) {
    // // if it's fully behind the viewport, it can be unloaded
    if (!realityEditor.gui.ar.sceneGraph.isInFrontOfCamera(activeKey)) {
        return true;
    }
    
    // if a distance threshold is provided, unload if it is too far away
    if (typeof maxDistance !== 'undefined') {
        if (realityEditor.gui.ar.sceneGraph.getDistanceToCamera(activeKey) > maxDistance) {
            return true;
        }
    }
    
    // get a rough estimation of screen position so we can see if it overlaps with viewport
    var frameScreenPosition = this.getVehicleBoundingBoxFast(finalMatrix, vehicleHalfWidth, vehicleHalfHeight);
    var left = frameScreenPosition.upperLeft.x;
    var right = frameScreenPosition.lowerRight.x;
    var top = frameScreenPosition.upperLeft.y;
    var bottom = frameScreenPosition.lowerRight.y;

    // usually (in powerSave mode) remove if frame is slightly outside screen bounds
    let viewportBounds = {
        left: 0,
        right: globalStates.height,
        top: 0,
        bottom: globalStates.width
    };

    // if not in powerSave mode, be more generous about keeping frames loaded
    // adds a buffer on each side of the viewport equal to the size of the screen
    if (!realityEditor.gui.settings.toggleStates.powerSaveMode) {
        let additionalBuffer = {
            x: globalStates.height,
            y: globalStates.width
        };
        viewportBounds.left -= additionalBuffer.x;
        viewportBounds.right += additionalBuffer.x;
        viewportBounds.top -= additionalBuffer.y;
        viewportBounds.bottom += additionalBuffer.y;
    }

    // if it is fully beyond any edge of the viewport, it can be unloaded
    return bottom < viewportBounds.top || top > viewportBounds.bottom ||
        right < viewportBounds.left || left > viewportBounds.right;
};
