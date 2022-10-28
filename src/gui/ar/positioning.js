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
    
    positionData.scale = Math.max(0.1, newScale); // 0.1 is the minimum scale allowed
    
    realityEditor.sceneGraph.updatePositionData(activeVehicle.uuid);

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

// we can use either of two different implementations for moveVehicleToScreenCoordinate by toggling this
// both are working but further investigation is needed to determine if one is always better than the other
realityEditor.gui.ar.positioning.useWebkitForProjectedCoordinates = true;

/**
 * Removes the x and y translation offsets from the vehicle so that its position is purely determined by its matrix
 * This should be done if you want to directly set the position of a tool to a given matrix
 * @param {Frame|Node} activeVehicle
 */
realityEditor.gui.ar.positioning.resetVehicleTranslation = function(activeVehicle) {
    let positionData = this.getPositionData(activeVehicle);
    positionData.x = 0;
    positionData.y = 0;

    // flags the sceneNode as dirty so it gets rendered again with the new x/y position
    realityEditor.sceneGraph.updatePositionData(activeVehicle.uuid);

    // broadcasts this to the realtime system if it's enabled
    if (!realityEditor.gui.settings.toggleStates.realtimeEnabled) { return; }

    let keys = realityEditor.getKeysFromVehicle(activeVehicle);
    let propertyPath = activeVehicle.hasOwnProperty('visualization') ? 'ar.x' : 'x';
    realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, propertyPath, positionData.x);
    propertyPath = activeVehicle.hasOwnProperty('visualization') ? 'ar.y' : 'y';
    realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, propertyPath, positionData.y);
}

let storedOffset = null;
let storedDistance = null;
let storedToolOriginInObject = null;

/**
 * Moves the tool to be centered on the screen (x,y) position, keeping it the same distance from the camera as before
 * @param {Frame|Node} activeVehicle
 * @param {number} screenX
 * @param {number} screenY
 */
realityEditor.gui.ar.positioning.moveVehiclePreservingDistance = function(activeVehicle, screenX, screenY, useTouchOffset = false) {
    // return movePreservingDistance(activeVehicle, screenX, screenY);
    const utils = realityEditor.gui.ar.utilities;

    let toolNode = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid);
    let rootNode = realityEditor.sceneGraph.getSceneNodeById('ROOT');

    if (!storedOffset) {
        let pointInObject = getLocalPointAtScreenXY(activeVehicle, screenX, screenY);
        storedToolOriginInObject = realityEditor.sceneGraph.convertToNewCoordSystem(realityEditor.sceneGraph.getWorldPosition(activeVehicle.uuid), rootNode, toolNode.parent);
        storedOffset = utils.subtract([pointInObject.x, pointInObject.y, pointInObject.z], [storedToolOriginInObject.x, storedToolOriginInObject.y, storedToolOriginInObject.z]);  // realityEditor.sceneGraph.convertToNewCoordSystem(pointInObject, toolNode.parent, toolNode);
        console.log('set storedOffset to ', storedOffset);
    }

    if (!storedDistance) {
        let worldPoint = realityEditor.sceneGraph.convertToNewCoordSystem(storedOffset, toolNode, rootNode);
        let cameraPoint = realityEditor.sceneGraph.getWorldPosition('CAMERA');
        let pointToCamera = utils.subtract(worldPoint, [cameraPoint.x, cameraPoint.y, cameraPoint.z]);
        storedDistance = utils.magnitude(pointToCamera);
        console.log('set storedDistance to ', storedDistance);
        // this is the distance from the camera to the point at (toolOrigin + storedOffset)
    }

    // let distanceToCamera = realityEditor.sceneGraph.getDistanceToCamera(activeVehicle.uuid);
    let outputCoordinateSystem = toolNode.parent;
    let point = realityEditor.sceneGraph.getPointAtDistanceFromCamera(screenX, screenY, storedDistance, outputCoordinateSystem);
    
    // TODO: set localMatrix of tool such that the localPoint that intersects with the ray stays at the same distance to the camera as the first tap down
    

    /* TODO: figure out how to re-enable touchOffset without adding drift - all the methods i've tried so far are 
        slightly incorrect because subtracting the offset increasingly shifts the distanceToCamera each frame */

    let offset = this.computeTouchOffset(toolNode, point, useTouchOffset);

    let positionData = this.getPositionData(activeVehicle);
    if (positionData.x !== 0 || positionData.y !== 0) {
        this.resetVehicleTranslation(activeVehicle);
    }

    // keep the rotation and scale the same but update the translation elements of the matrix
    let matrixCopy = realityEditor.gui.ar.utilities.copyMatrix(toolNode.localMatrix);
    matrixCopy[12] = point.x - offset.x;
    matrixCopy[13] = point.y - offset.y;
    matrixCopy[14] = point.z - offset.z;
    toolNode.setLocalMatrix(matrixCopy);
}

/*
function movePreservingDistance(activeVehicle, screenX, screenY) {
    const utils = realityEditor.gui.ar.utilities;
    let toolNode = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid);
    let rootNode = realityEditor.sceneGraph.getSceneNodeById('ROOT');

    let toolOriginInObject = realityEditor.sceneGraph.convertToNewCoordSystem(realityEditor.sceneGraph.getWorldPosition(activeVehicle.uuid), rootNode, toolNode.parent);

    if (!storedOffset) {
        let pointInObject = getLocalPointAtScreenXY(activeVehicle, screenX, screenY);
        storedToolOriginInObject = realityEditor.sceneGraph.convertToNewCoordSystem(realityEditor.sceneGraph.getWorldPosition(activeVehicle.uuid), rootNode, toolNode.parent);
        storedOffset = utils.subtract([pointInObject.x, pointInObject.y, pointInObject.z], [storedToolOriginInObject.x, storedToolOriginInObject.y, storedToolOriginInObject.z]);  // realityEditor.sceneGraph.convertToNewCoordSystem(pointInObject, toolNode.parent, toolNode);
        console.log('set storedOffset to ', storedOffset);
    }
    
     // TODO: not quite working – maybe because we're utilizing the tool's frame of reference, which is moving... can we do it using only the object frame of reference?
     //    or if this won't work, try going back to the `offset = this.computeTouchOffset(toolNode, point, useTouchOffset);`
     //    and then subtract the offset from the final position.. since we are guaranteeing the distance won't drift
     //
    
    // calculate currentOffset
    // let currentPointInObject = getLocalPointAtScreenXY(activeVehicle, screenX, screenY);
    // let toolOriginInObject = realityEditor.sceneGraph.convertToNewCoordSystem(realityEditor.sceneGraph.getWorldPosition(activeVehicle.uuid), rootNode, toolNode.parent);
    // let currentOffset = utils.subtract([currentPointInObject.x, currentPointInObject.y, currentPointInObject.z], [toolOriginInObject.x, toolOriginInObject.y, toolOriginInObject.z]);  // realityEditor.sceneGraph.convertToNewCoordSystem(pointInObject, toolNode.parent, toolNode);
    // console.log('set currentOffset to ', storedOffset);

    if (!storedDistance) {
        let worldPoint = realityEditor.sceneGraph.convertToNewCoordSystem(storedOffset, toolNode, rootNode);
        let cameraPoint = realityEditor.sceneGraph.getWorldPosition('CAMERA');
        let pointToCamera = utils.subtract(worldPoint, [cameraPoint.x, cameraPoint.y, cameraPoint.z]);
        storedDistance = utils.magnitude(pointToCamera);
        console.log('set storedDistance to ', storedDistance);
        // this is the distance from the camera to the point at (toolOrigin + storedOffset)
    }

    // let distanceToCamera = realityEditor.sceneGraph.getDistanceToCamera(activeVehicle.uuid);
    let pointAtStoredDistance = realityEditor.sceneGraph.getPointAtDistanceFromCamera(screenX, screenY, storedDistance, toolNode.parent);
    console.log('pointAtStoredDistance = ', pointAtStoredDistance);
    
    // convert pointAtStoredDistance to position within tool frame-of-reference
    // let toolOriginInObject = realityEditor.sceneGraph.convertToNewCoordSystem(realityEditor.sceneGraph.getWorldPosition(activeVehicle.uuid), rootNode, toolNode.parent);
    // let relativePoint = utils.subtract([pointAtStoredDistance.x, pointAtStoredDistance.y, pointAtStoredDistance.z], [toolOriginInObject.x, toolOriginInObject.y, toolOriginInObject.z]);  // realityEditor.sceneGraph.convertToNewCoordSystem(pointInObject, toolNode.parent, toolNode);
    // let newToolOrigin = utils.add(relativePoint, storedOffset);
    // console.log(newToolOrigin);
    
    let toolOriginInTool = realityEditor.sceneGraph.convertToNewCoordSystem(realityEditor.sceneGraph.getWorldPosition(activeVehicle.uuid), rootNode, toolNode); // should = (0,0,0)
    let pointInTool = realityEditor.sceneGraph.convertToNewCoordSystem(pointAtStoredDistance, toolNode.parent, toolNode);
    let newOrigin = utils.add([pointInTool.x, pointInTool.y, pointInTool.z], storedOffset); // utils.subtract(currentOffset, storedOffset));
    // pointInTool = realityEditor.sceneGraph.convertToNewCoordSystem(pointAtStoredDistance, toolNode.parent, toolNode);
    // newOrigin = utils.subtract([pointInTool.x, pointInTool.y, pointInTool.z], storedOffset)
    let originInObject = realityEditor.sceneGraph.convertToNewCoordSystem(newOrigin, toolNode, toolNode.parent)
    
    // keep the rotation and scale the same but update the translation elements of the matrix
    let matrixCopy = realityEditor.gui.ar.utilities.copyMatrix(toolNode.localMatrix);
    matrixCopy[12] = originInObject[0];
    matrixCopy[13] = originInObject[1];
    matrixCopy[14] = originInObject[2];
    toolNode.setLocalMatrix(matrixCopy);
}
*/

function getLocalPointAtScreenXY(activeVehicle, screenX, screenY) {
    const utils = realityEditor.gui.ar.utilities;

    let toolNode = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid);
    let toolPoint = realityEditor.sceneGraph.getWorldPosition(activeVehicle.uuid);
    let planeOrigin = [toolPoint.x, toolPoint.y, toolPoint.z];
    let planeNormal = utils.getForwardVector(toolNode.worldMatrix);
    let cameraPoint = realityEditor.sceneGraph.getWorldPosition('CAMERA');
    let rootCoordinateSystem = realityEditor.sceneGraph.getSceneNodeById('ROOT'); // camera is in this system
    const SEGMENT_LENGTH = 1000; // arbitrary, just need to calculate one point so we can solve parametric equation
    let testPoint = realityEditor.sceneGraph.getPointAtDistanceFromCamera(screenX, screenY, SEGMENT_LENGTH, rootCoordinateSystem);

    let rayOrigin = [cameraPoint.x, cameraPoint.y, cameraPoint.z];
    let rayDirection = utils.normalize(utils.subtract([testPoint.x, testPoint.y, testPoint.z], rayOrigin));

    let planeIntersection = utils.rayPlaneIntersect(planeOrigin, planeNormal, rayOrigin, rayDirection);
    if (!planeIntersection) return; // can't move if plane is parallel to ray

    let worldCoordinates = {x: planeIntersection[0], y: planeIntersection[1], z: planeIntersection[2]};
    let objectCoordinateSystem = toolNode.parent;
    let localPoint = realityEditor.sceneGraph.convertToNewCoordSystem(worldCoordinates, rootCoordinateSystem, objectCoordinateSystem);
    return localPoint;
}

/**
 * Translates the tool along its local XY plane such that it moves to the screen (x,y) position
 * @param {Frame|Node} activeVehicle
 * @param {number} screenX
 * @param {number} screenY
 * @param {boolean} useTouchOffset - if false, jumps to center on pointer. if true, translates relative to pointerdown position
 */
realityEditor.gui.ar.positioning.moveVehicleAlongPlane = function(activeVehicle, screenX, screenY, useTouchOffset = false) {
    // const utils = realityEditor.gui.ar.utilities;
    //
    let toolNode = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid);
    // let toolPoint = realityEditor.sceneGraph.getWorldPosition(activeVehicle.uuid);
    // let planeOrigin = [toolPoint.x, toolPoint.y, toolPoint.z];
    // let planeNormal = utils.getForwardVector(toolNode.worldMatrix);
    // let cameraPoint = realityEditor.sceneGraph.getWorldPosition('CAMERA');
    // let rootCoordinateSystem = realityEditor.sceneGraph.getSceneNodeById('ROOT'); // camera is in this system
    // const SEGMENT_LENGTH = 1000; // arbitrary, just need to calculate one point so we can solve parametric equation
    // let testPoint = realityEditor.sceneGraph.getPointAtDistanceFromCamera(screenX, screenY, SEGMENT_LENGTH, rootCoordinateSystem);
    //
    // let rayOrigin = [cameraPoint.x, cameraPoint.y, cameraPoint.z];
    // let rayDirection = utils.normalize(utils.subtract([testPoint.x, testPoint.y, testPoint.z], rayOrigin));
    //
    // let planeIntersection = utils.rayPlaneIntersect(planeOrigin, planeNormal, rayOrigin, rayDirection);
    // if (!planeIntersection) return; // can't move if plane is parallel to ray
    //
    // let worldCoordinates = {x: planeIntersection[0], y: planeIntersection[1], z: planeIntersection[2]};
    // let objectCoordinateSystem = toolNode.parent;
    // let localPoint = realityEditor.sceneGraph.convertToNewCoordSystem(worldCoordinates, rootCoordinateSystem, objectCoordinateSystem);

    let localPoint = getLocalPointAtScreenXY(activeVehicle, screenX, screenY);

    // this makes it so the center of the tool doesn't snap to the pointer location
    let offset = this.computeTouchOffset(toolNode, localPoint, useTouchOffset);

    // we don't need the separate x and y components anymore
    let positionData = this.getPositionData(activeVehicle);
    if (positionData.x !== 0 || positionData.y !== 0) {
        this.resetVehicleTranslation(activeVehicle);
    }

    // keep the rotation and scale the same but update the translation elements of the matrix
    let matrixCopy = realityEditor.gui.ar.utilities.copyMatrix(toolNode.localMatrix);
    matrixCopy[12] = localPoint.x - offset.x;
    matrixCopy[13] = localPoint.y - offset.y;
    matrixCopy[14] = localPoint.z - offset.z;
    toolNode.setLocalMatrix(matrixCopy);
}

/**
 * Prevents the tool from jumping so that its center is on your pointer – offsets it relative to your cursor.
 * Returns the difference between the sceneNode's localMatrix origin and the newOrigin.
 * @param {SceneNode} sceneNode
 * @param {{x: number, y: number, z: number}} newOrigin
 * @param {boolean} useTouchOffset - if false, always return (0,0,0)
 * @returns {{x: number, y: number, z: number}}
 */
realityEditor.gui.ar.positioning.computeTouchOffset = function(sceneNode, newOrigin, useTouchOffset) {
    let editingState = realityEditor.device.editingState;
    if (!useTouchOffset) {
        editingState.offset = null;
        return { x: 0, y: 0, z: 0 };
    }
    if (editingState.touchOffset) return editingState.touchOffset; // return existing offset unless it gets reset to null
    editingState.touchOffset = {
        x: newOrigin.x - sceneNode.localMatrix[12],
        y: newOrigin.y - sceneNode.localMatrix[13],
        z: newOrigin.z - sceneNode.localMatrix[14]
    }
    return editingState.touchOffset; // return newly calculated offset at the start of each drag
}

/**
 * Determines whether to translate tool along its local plane, or parallel to camera (preserving distance to camera)
 * @param {Frame|Node} activeVehicle
 * @returns {boolean}
 */
realityEditor.gui.ar.positioning.shouldPreserveDistanceWhileMoving = function(activeVehicle) {
    // always move 3D tools
    if (activeVehicle.fullScreen) return true;

    // preserve distance while moving a 2D tool if the plane that the tool sits on isn't roughly parallel to the camera
    const DIRECTION_SIMILARITY_THRESHOLD = 0.8;
    const utils = realityEditor.gui.ar.utilities;
    let toolDirection = utils.getForwardVector(realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid).worldMatrix);
    let cameraDirection = utils.getForwardVector(realityEditor.sceneGraph.getCameraNode().worldMatrix);
    let dotProduct = utils.dotProduct(toolDirection, cameraDirection); // 1=parallel, 0=perpendicular
    return (Math.abs(dotProduct) < DIRECTION_SIMILARITY_THRESHOLD);
}

/**
 * Primary method to move a transformed frame or node to the (x,y) point on its plane where the (screenX,screenY) ray cast intersects
 * @param {Frame|Node} activeVehicle
 * @param {number} screenX
 * @param {number} screenY
 * @param {boolean} useTouchOffset - if false, puts (0,0) coordinate of frame/node at the resulting point.
 *                                   if true, the first time you call it, it determines the x,y offset to drag the frame/node
 *                                   from the ray cast without it jumping, and subsequently drags it from that point
 */
realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate = function(activeVehicle, screenX, screenY, useTouchOffset) {
    // if (realityEditor.device.isEditingUnconstrained(activeVehicle)) {
    //     // realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;
    //     realityEditor.gui.ar.draw.matrix.recomputeUnconstrainedMatrix = true;
    //     return;
    // }

    if (this.shouldPreserveDistanceWhileMoving(activeVehicle)) {
        this.moveVehiclePreservingDistance(activeVehicle, screenX, screenY, true);
    } else {
        this.moveVehicleAlongPlane(activeVehicle, screenX, screenY, useTouchOffset);
    }

    // recompute the unconstrained editing matrix so they don't conflict
    if (realityEditor.device.isEditingUnconstrained(activeVehicle)) {
        // realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;
        realityEditor.gui.ar.draw.matrix.recomputeUnconstrainedMatrix = true;
    }
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

    // nodes have x, y, scale directly as properties
    return activeVehicle;
};

/**
 * Sets the correct matrix for this vehicle's position data to the new value.
 * @param {Frame|Node} activeVehicle
 * @param {Array.<number>} newMatrixValue
 * @param {boolean|undefined} dontBroadcast – pass true to prevent realtime broadcasting this update
 * @todo: ensure fully implemented
 */
realityEditor.gui.ar.positioning.setPositionDataMatrix = function(activeVehicle, newMatrixValue, dontBroadcast) {

    if (realityEditor.isVehicleAFrame(activeVehicle)) {
        realityEditor.gui.ar.utilities.copyMatrixInPlace(newMatrixValue, activeVehicle.ar.matrix);
    } else {
        realityEditor.gui.ar.utilities.copyMatrixInPlace(newMatrixValue, activeVehicle.matrix);
    }

    if (!dontBroadcast) {
        var keys = realityEditor.getKeysFromVehicle(activeVehicle);
        var propertyPath = activeVehicle.hasOwnProperty('visualization') ? 'ar.matrix' : 'matrix';
        realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, propertyPath, newMatrixValue);
    }
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
 * Instantly moves the frame so it's floating right in front of the camera
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {number} mmInFrontOfCamera - e.g. 400 = 0.4 meters. default 0
 */
realityEditor.gui.ar.positioning.moveFrameToCamera = function(objectKey, frameKey, mmInFrontOfCamera) {

    // reset the (x, y) position so it will move to center of screen
    let frame = realityEditor.getFrame(objectKey, frameKey);
    if (frame) {
        frame.ar.x = 0;
        frame.ar.y = 0;
    }

    // place it in front of the camera, facing towards the camera
    let sceneNode = realityEditor.sceneGraph.getSceneNodeById(frameKey);
    let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');
    let distanceInFrontOfCamera = mmInFrontOfCamera || 0; // 0.4 meters

    let initialVehicleMatrix = [
        -1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, -1, 0,
        0, 0, -1 * distanceInFrontOfCamera, 1
    ];

    let additionalRotation = realityEditor.device.environment.getInitialPocketToolRotation();
    if (additionalRotation) {
        let temp = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(additionalRotation, initialVehicleMatrix, temp);
        initialVehicleMatrix = temp;
    }

    // needs to be flipped in some environments with different camera systems
    if (realityEditor.device.environment.isCameraOrientationFlipped()) {
        initialVehicleMatrix[0] *= -1;
        initialVehicleMatrix[5] *= -1;
        initialVehicleMatrix[10] *= -1;
    }

    sceneNode.setPositionRelativeTo(cameraNode, initialVehicleMatrix);

    setTimeout(function() {
        realityEditor.network.realtime.broadcastUpdate(objectKey, frameKey, null, 'ar.matrix', sceneNode.localMatrix);
    }, 300);
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
    if (!realityEditor.sceneGraph.isInFrontOfCamera(activeKey)) {
        return true;
    }
    
    // if a distance threshold is provided, unload if it is too far away
    if (typeof maxDistance !== 'undefined') {
        if (realityEditor.sceneGraph.getDistanceToCamera(activeKey) > maxDistance) {
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

/**
 * Constructs a dataset of the positions of the relevant objects and their tools
 * @param {Object.<string, boolean>} objectTypesToSend
 * @param {boolean} includeToolPositions - defaults to true
 * @returns {{}}
 * @example getObjectPositionsOfTypes({'human': true}) returns:
 * { 'human': { 'objectId1': { matrix: [worldMatrix], worldId: '_WORLD_xyz', tools: { 'toolId1': [localMatrix], 'toolId2': [localMatrix] }}}}
 */
realityEditor.gui.ar.positioning.getObjectPositionsOfTypes = function(objectTypesToSend, includeToolPositions = true) {
    let dataToSend = {};
    realityEditor.forEachObject((object, objectKey) => {
        if (objectTypesToSend[object.type]) {
            if (typeof dataToSend[object.type] === 'undefined') {
                dataToSend[object.type] = {};
            }

            // only works if it's localized against a world object
            if (object.worldId) {
                let objectSceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
                let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(object.worldId);
                let relativeMatrix = objectSceneNode.getMatrixRelativeTo(worldSceneNode);
                dataToSend[object.type][objectKey] = {
                    matrix: relativeMatrix,
                    worldId: object.worldId
                };

                if (includeToolPositions) {
                    dataToSend[object.type][objectKey].tools = {};
                    realityEditor.forEachFrameInObject(objectKey, (_, frameKey) => {
                        let toolSceneNode = realityEditor.sceneGraph.getSceneNodeById(frameKey);
                        dataToSend[object.type][objectKey].tools[frameKey] = toolSceneNode.localMatrix;
                    });
                }
            }
        }
    });
    return dataToSend;
};
