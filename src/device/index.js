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

createNameSpace("realityEditor.device");

realityEditor.device.eventObject = {
    version : null,
        object: null,
        frame : null,
        node : null,
        x: 0,
        y: 0,
        type: null
};

/**
 * @desc
 **/


realityEditor.device.activateNodeMove = function(nodeKey) {
    
    console.log('activateNodeMove');

    var nodeOverlayElement = document.getElementById(nodeKey);
	//globalStates.editingModeHaveObject = true;
	if (nodeOverlayElement) {
		
		if (nodeOverlayElement.type === 'ui') {
			nodeOverlayElement.style.visibility = 'visible';
		}

		//nodeOverlayElement.className = "mainProgram";
		var nodeCanvasElement = document.getElementById("canvas" + nodeKey);
		nodeCanvasElement.style.display = "inline";
		
		realityEditor.device.utilities.addBoundListener(nodeOverlayElement, 'touchstart', realityEditor.device.onMultiTouchStart, realityEditor.device);
		realityEditor.device.utilities.addBoundListener(nodeOverlayElement, 'touchmove', realityEditor.device.onMultiTouchMove, realityEditor.device);
        realityEditor.device.utilities.addBoundListener(nodeOverlayElement, 'touchend', realityEditor.device.onMultiTouchEnd, realityEditor.device);
        realityEditor.device.utilities.addBoundListener(nodeOverlayElement, 'pointerup', realityEditor.device.onMultiTouchEnd, realityEditor.device);
        
	}
};

realityEditor.device.deactivateNodeMove = function(nodeKey) {

    console.log('deactivateNodeMove');

    var nodeOverlayElement = document.getElementById(nodeKey);
    if (nodeOverlayElement) {
        
		if (nodeOverlayElement.type === 'ui') {
			nodeOverlayElement.style.visibility = 'hidden';
		}

		//nodeOverlayElement.className = "mainEditing";
        var nodeCanvasElement = document.getElementById("canvas" + nodeKey);
        nodeCanvasElement.style.display = "none";

        realityEditor.device.utilities.removeBoundListener(nodeOverlayElement, 'touchstart', realityEditor.device.onMultiTouchStart);
        realityEditor.device.utilities.removeBoundListener(nodeOverlayElement, 'touchmove', realityEditor.device.onMultiTouchMove);
        realityEditor.device.utilities.removeBoundListener(nodeOverlayElement, 'touchend', realityEditor.device.onMultiTouchEnd);
        realityEditor.device.utilities.removeBoundListener(nodeOverlayElement, 'pointerup', realityEditor.device.onMultiTouchEnd);

	}
};

realityEditor.device.activateFrameMove = function(frameKey) {

    console.log('activateFrameMove');

    var frameOverlayElement = document.getElementById(frameKey);
    //globalStates.editingModeHaveObject = true;
    if (frameOverlayElement) {

        if (frameOverlayElement.type === 'ui') {
            frameOverlayElement.style.visibility = 'visible';
        }

        //frameOverlayElement.className = "mainProgram";
        var frameCanvasElement = document.getElementById("canvas" + frameKey);
        frameCanvasElement.style.display = "inline";

        var frame = realityEditor.getFrame(frameOverlayElement.objectId, frameKey);
        frame.hasCTXContent = false;
        frame.visible = false;
        frame.visibleEditing = false;

        realityEditor.gui.ar.draw.utilities.drawMarkerPlaneIntersection(frameKey, null, frame);
    }
};

realityEditor.device.deactivateFrameMove = function(frameKey) {

    console.log('deactivateFrameMove');

    var frameOverlayElement = document.getElementById(frameKey);
    //globalStates.editingModeHaveObject = true;
    if (frameOverlayElement) {

        if (frameOverlayElement.type === 'ui') {
            frameOverlayElement.style.visibility = 'hidden';
        }

        var frameCanvasElement = document.getElementById("canvas" + frameKey);
        frameCanvasElement.style.display = "none";
    }
};

realityEditor.device.activateMultiTouch = function() {
    realityEditor.device.utilities.addBoundListener(globalCanvas.canvas, 'touchstart', realityEditor.device.onMultiTouchCanvasStart, realityEditor.device);
    realityEditor.device.utilities.addBoundListener(globalCanvas.canvas, 'touchmove', realityEditor.device.onMultiTouchCanvasMove, realityEditor.device);
    realityEditor.device.utilities.addBoundListener(globalCanvas.canvas, 'touchend', realityEditor.device.onMultiTouchCanvasEnd, realityEditor.device);
};

realityEditor.device.deactivateMultiTouch = function() {
    // there doesnt seem to be a reason to remove these, because the functions already check to make sure they're in an ok state to perform multi touch
    // realityEditor.device.utilities.removeBoundListener(globalCanvas.canvas, 'touchstart', realityEditor.device.onMultiTouchCanvasStart);
    // realityEditor.device.utilities.removeBoundListener(globalCanvas.canvas, 'touchmove', realityEditor.device.onMultiTouchCanvasMove);
    // realityEditor.device.utilities.addBoundListener(globalCanvas.canvas, 'touchend', realityEditor.device.onMultiTouchCanvasEnd, realityEditor.device);
};

// TODO: we need the equivalent for 'deactivateNodeMove' for each frame, that gets triggered when leaving move move

realityEditor.device.endTrash = function(nodeKey) {

	realityEditor.device.deactivateMultiTouch();
	if (!globalStates.editingMode) {
		realityEditor.device.deactivateNodeMove(nodeKey);
	}
	setTimeout(function() {
        realityEditor.gui.menus.buttonOn("main",[]);
		//realityEditor.gui.pocket.pocketOnMemoryDeletionStop();
        globalStates.editingNode = null;
    }, 0);
};


/**
 * @desc
 * @param evt
 **/


realityEditor.device.touchTimer = null;

realityEditor.device.onTouchDown = function(evt) {
    var target = evt.currentTarget;
	console.log(target.nodeId);

	if (target.nodeId) {
        if (!realityEditor.device.security.isNodeActionAllowed(target.objectId, target.frameId, target.nodeId, "edit")) {
            return;
        }
    }
    
	if (globalStates.editingMode) {
	    
        globalStates.editingModeObject = target.objectId;
        globalStates.editingModeFrame = target.frameId;
        globalStates.editingModeLocation = target.nodeId;
        globalStates.editingModeKind = target.type;
        globalStates.editingFrame = target.frameId;
        globalStates.editingNode = target.nodeId;
        globalStates.editingModeHaveObject = true;
        realityEditor.gui.ar.draw.matrix.matrixtouchOn = target.nodeId || target.frameId;
        realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;
        
    } else {
		if (globalStates.guiState ==="node") {
			if (!globalProgram.objectA) {

                var thisNode = realityEditor.getNode(target.objectId, target.frameId, target.nodeId);

                globalProgram.objectA = target.objectId;
                globalProgram.frameA = target.frameId;
				globalProgram.nodeA = target.nodeId;

				var type = thisNode.type;

				if (type === "logic" || type === "node") {

					if(!globalStates.editingMode) {
						this.touchTimer = setTimeout(function () {
							globalProgram.objectA = false;
                            globalProgram.frameA = false;
							globalProgram.nodeA = false;
							globalStates.editingNode = target.nodeId;
                            globalStates.editingFrame = target.frameId;
                            
							//globalStates.editingMode = true;
							console.log("hello");

                            // move element to front of nodes so that touches don't get blocked by other nodes
                            var element = target.parentElement;
                            if (element && element.id === "thisObject" + target.nodeId) {
                                while(element.nextElementSibling && element.nextElementSibling.id !== 'craftingBoard') {
                                    element.parentNode.insertBefore(element.nextElementSibling, element);
                                }
                            }
							
							globalStates.editingModeObject = target.objectId;
							realityEditor.device.activateMultiTouch();
							realityEditor.device.activateNodeMove(target.nodeId);
							if (type === "logic") {
								// realityEditor.gui.menus.on("bigTrash",[]);
                                realityEditor.gui.menus.on("trashOrSave", []);
							}
							//realityEditor.gui.pocket.pocketOnMemoryDeletionStart();

						}, globalStates.moveDelay);
					}


                    if (type === "node") {
                        globalProgram.logicA = false;
                    }
					 else {
                        globalProgram.logicA = 0;
                    }
				}

				// if(this.type === "logic")
				//   globalProgram.logicA = globalProgram.logicSelector;
			}
		}
	}
	cout("touchDown");
};

/**
 * Triggered from the javascript API when you tap and hold on an object to begin to move it
 * @param target
 */
realityEditor.device.beginTouchEditing = function(target, source) {
	globalProgram.objectA = false;
    globalProgram.frameA = false;
	globalProgram.nodeA = false;

	globalStates.editingNode = target.nodeId;
    globalStates.editingFrame = target.frameId;
	globalStates.editingModeObject = target.objectId;
    globalStates.editingModeFrame = target.frameId;
	globalStates.editingModeLocation = target.nodeId;
	globalStates.editingModeKind = target.type;
	globalStates.editingModeHaveObject = true;
	
	if (source !== 'pocket') {
        globalStates.tempEditingMode = true;
    }

	realityEditor.device.activateMultiTouch();
	if (target.nodeId) {
        realityEditor.device.activateNodeMove(target.nodeId);
    } else {
	    realityEditor.device.activateFrameMove(target.frameId);
    }
	// Only display the trash can if it's something we can delete (a frame)
	if (target.frameId !== target.nodeId) {
        realityEditor.gui.menus.on("bigTrash",[]);
		//realityEditor.gui.pocket.pocketOnMemoryDeletionStart();
	}

	// realityEditor.device.onMultiTouchStart({
	// 	currentTarget: target
	// });
};

/**
 * Returns whether or not the object is the "global frame container" for when frames are dis-associated from a marker
 * @param objectKey
 * @return {boolean}
 */
realityEditor.device.isGlobalFrame = function(objectKey) {
    return objectKey === globalFramePrefix;
};

/**
 * @returns {*} the object, frame, or node currently being edited (repositioned)
 */
realityEditor.device.getEditingModeObject = function() {
    var objectId = globalStates.editingModeObject;
    var frameId = globalStates.editingModeFrame;
    var nodeId = globalStates.editingModeLocation;
    
    if (globalStates.editingModeKind === 'ui') {
        // edge case for editing frames dis-associated from any object
        if (this.isGlobalFrame(objectId)) {
            return globalFrames[frameId];
        }
        // edge case for pocket frames
        if (objectId && objectId in pocketItem) {
            return pocketItem[objectId].frames[frameId];
        }
        return objects[objectId].frames[frameId];
        
    } else if (globalStates.editingModeKind === 'node' || globalStates.editingModeKind === 'logic') {
        // edge case for pocket frames
        if (objectId && objectId in pocketItem) {
            return pocketItem[objectId].frames[frameId].nodes[nodeId];
        }
        return objects[objectId].frames[frameId].nodes[nodeId];
        
    } else {
        // edge case for pocket objects
        if (objectId && objectId in pocketItem) {
            return pocketItem[objectId];
        }
        return objects[objectId];
    }
};

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 **/

realityEditor.device.onFalseTouchUp= function() {
	if (globalStates.guiState ==="node") {
		globalProgram.objectA = false;
        globalProgram.frameA = false;
		globalProgram.nodeA = false;
		globalProgram.logicA = false;
		globalProgram.logicSelector = 4;
    }
	globalCanvas.hasContent = true;
	cout("falseTouchUp");
};

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 **/

realityEditor.device.onTrueTouchUp = function(evt){
    var target = evt.currentTarget;
	if (globalStates.guiState ==="node") {
		if (globalProgram.objectA) {

			if(target.nodeId === globalProgram.nodeA && target.type === "logic"){
                if (realityEditor.device.security.isNodeActionAllowed(target.objectId, target.frameId, target.nodeId, "edit")) {
                    realityEditor.gui.crafting.craftingBoardVisible(target.objectId, target.frameId, target.nodeId);
                }
			}

			globalProgram.objectB = target.objectId;
            globalProgram.frameB = target.frameId;
			globalProgram.nodeB = target.nodeId;

            if (realityEditor.device.security.isNodeActionAllowed(target.objectId, target.frameId, target.nodeId, "create")) {
                realityEditor.network.postLinkToServer(globalProgram);
            }

			// set everything back to false
			globalProgram.objectA = false;
            globalProgram.frameA = false;
			globalProgram.nodeA = false;
			globalProgram.logicA = false;
			globalProgram.objectB = false;
            globalProgram.frameB = false;
			globalProgram.nodeB = false;
			globalProgram.logicB = false;
			globalProgram.logicSelector = 4;
        }

        globalStates.editingNode = null;
        globalStates.editingModeLocation = null;
        globalStates.editingFrame = null;
        globalStates.editingModeFrame = null;
        globalStates.editingModeHaveObject = false;
        globalStates.editingModeKind = null;
        globalStates.editingModeObject = null;
	
	} else if (globalStates.guiState === 'ui') {
        if (globalStates.editingFrame && globalStates.editingModeObject && !globalStates.editingMode && !globalStates.tempEditingMode && globalStates.guiState === 'ui') {
            this.deactivateFrameMove(globalStates.editingFrame);
            var activeVehicle = realityEditor.getFrame(globalStates.editingModeObject, globalStates.editingFrame);
            // realityEditor.device.deactivateMultiTouch();
            globalStates.editingFrame = null;
            globalStates.editingModeFrame = null;
            globalStates.editingModeHaveObject = false;
            globalStates.editingModeKind = null;
            globalStates.editingModeObject = null;
        }
    }

	globalCanvas.hasContent = true;

    realityEditor.gui.ar.draw.matrix.matrixtouchOn = '';

    realityEditor.device.endTrash(target.nodeId);

    if(target.type === 'logic' && evt.pageX >= (globalStates.height-60)) {
        
        if (evt.pageY < 160) {
            console.log("...save node in pocket");
            
        } else {
            console.log("...delete node");

            for(var objectKey in objects){
                var thisObject = realityEditor.getObject(objectKey);
                for (var frameKey in objects[objectKey].frames) {
                    var thisFrame = realityEditor.getFrame(objectKey, frameKey);
                    for (linkKey in thisFrame.links) {
                        var thisLink = thisFrame.links[linkKey];
                        if (((thisLink.objectA === target.objectId) && (thisLink.frameA === target.frameId) && (thisLink.nodeA === target.nodeId)) ||
                            ((thisLink.objectB === target.objectId) && (thisLink.frameB === target.frameId) && (thisLink.nodeB === target.nodeId))) {
                            delete thisLink;
                            realityEditor.network.deleteLinkFromObject(thisObject.ip, objectKey, frameKey, linkKey);
                        }
                    }
                }
            }
            
            realityEditor.gui.ar.draw.deleteNode(target.objectId, target.frameId, target.nodeId);

            realityEditor.network.deleteNodeFromObject(objects[target.objectId].ip, target.objectId, target.frameId, target.nodeId);
        }

    } else if (target.type === 'logic' || target.type === 'node') {
        if (target.objectId !== "pocket") {
            realityEditor.network.sendResetContent(target.objectId, target.frameId, target.nodeId, target.type);
        }
    }

	cout("trueTouchUp");
};



realityEditor.device.onTouchEnter = function(evt) {
    var target = evt.currentTarget;

    if (target.nodeId) {
        var contentForFeedback;

        if (globalProgram.nodeA === this.id || globalProgram.nodeA === false) {
            contentForFeedback = 3;

            // todo why is the globalDomCash not used?

            overlayDiv.classList.add('overlayAction');
        } else {

            if (realityEditor.network.checkForNetworkLoop(globalProgram.objectA,globalProgram.frameA, globalProgram.nodeA, globalProgram.logicA, target.objectId, target.frameId, target.nodeId, 0)) {
                contentForFeedback = 2; // overlayImg.src = overlayImage[2].src;
                overlayDiv.classList.add('overlayPositive');
            }

            else {
                contentForFeedback = 0; // overlayImg.src = overlayImage[0].src;
                overlayDiv.classList.add('overlayNegative');
            }
        }

        globalDOMCache["iframe" + target.nodeId].contentWindow.postMessage(
            JSON.stringify(
                {
                    uiActionFeedback: contentForFeedback
                })
            , "*");

        //   document.getElementById('overlayImg').src = overlayImage[contentForFeedback].src;
    }
};

realityEditor.device.onTouchOut = function(evt) {
    var target = evt.currentTarget;
    
    if (target.nodeId) {


        if(!globalStates.editingMode) {
            clearTimeout(realityEditor.device.touchTimer);

            if(globalStates.editingNode) {
                if (globalStates.editingModeKind === 'logic') {
                    realityEditor.device.endTrash(target.nodeId);
                }
            }
        }

        globalProgram.logicSelector = 4;

        overlayDiv.classList.remove('overlayPositive');
        overlayDiv.classList.remove('overlayNegative');
        overlayDiv.classList.remove('overlayAction');

        cout("leave");

        if(globalDOMCache["iframe" + target.nodeId]) {
            globalDOMCache["iframe" + target.nodeId].contentWindow.postMessage(
                JSON.stringify(
                    {
                        uiActionFeedback: 1
                    })
                , "*");

        }        
        
    }

};

realityEditor.device.trashActivated = true;

realityEditor.device.onTouchMove = function(evt) {
    var target = evt.currentTarget;
    
    if(evt.pageX >= (globalStates.height-60)){
        
        if(!realityEditor.device.trashActivated) {
            overlayDiv.classList.remove('overlayAction');
            overlayDiv.classList.add('overlayNegative');
            realityEditor.device.trashActivated = true;
        }

    } else {
        
        if(realityEditor.device.trashActivated) {
            overlayDiv.classList.remove('overlayNegative');
            overlayDiv.classList.add('overlayAction');
            realityEditor.device.trashActivated = false;
        }

    }

    // if we're dragging a node and not scaling it, move it to the new touch location
    if( globalStates.editingNode && globalStates.editingNode === target.nodeId && !globalStates.editingScaleDistance) {

        globalStates.editingModeObjectX = evt.pageX;
        globalStates.editingModeObjectY = evt.pageY;

        var tempThisObject = null;

        if (target.type === 'logic' || target.type === 'node') {
            tempThisObject = realityEditor.getNode(target.objectId, target.frameId, target.nodeId);
            
        } else {
            tempThisObject = realityEditor.device.getEditingModeObject();
            // tempThisObject.temp = realityEditor.gui.ar.draw.visibleObjects[target.objectId];
            var unrotatedResult = [
                1, 0, 0, 0,
                0, -1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ];
            realityEditor.gui.ar.utilities.multiplyMatrix(realityEditor.gui.ar.draw.visibleObjects[target.objectId], globalStates.projectionMatrix, unrotatedResult);
            realityEditor.gui.ar.utilities.multiplyMatrix(rotateX, unrotatedResult, tempThisObject.temp);

        }

        realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(tempThisObject, evt.pageX, evt.pageY, true);

    // drag and reposition a frame from the pocket
    } else if (globalStates.editingFrame && globalStates.editingModeObject && !globalStates.editingMode && !globalStates.tempEditingMode && globalStates.guiState === 'ui') {
        
        console.log('move pocket frame!');
        var frame = realityEditor.getFrame(globalStates.editingModeObject, globalStates.editingFrame);
        realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(frame, evt.pageX, evt.pageY, true);
        
    }

    if(!globalStates.editingMode) {
        clearTimeout(realityEditor.device.touchTimer);
    }
};

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param evt
 **/

realityEditor.device.onCanvasPointerDown = function(evt) {
	evt.preventDefault();
	if (globalStates.guiState ==="node" && !globalStates.editingMode) {
		if (!globalProgram.objectA) {
			globalStates.drawDotLine = true;
			globalStates.drawDotLineX = evt.clientX;
			globalStates.drawDotLineY = evt.clientY;

		}
	}

	cout("canvasPointerDown");
};

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param evt
 **/

realityEditor.device.onDocumentPointerMove = function (evt) {
	evt.preventDefault();

    realityEditor.device.eventObject.x = evt.clientX;
    realityEditor.device.eventObject.y = evt.clientY;
    realityEditor.device.eventObject.type = "touchmove";
    realityEditor.device.touchInputs.screenTouchMove(realityEditor.device.eventObject);
    
	globalStates.pointerPosition = [evt.clientX, evt.clientY];

	// Translate up 6px to be above pocket layer
	overlayDiv.style.transform = 'translate3d(' + evt.clientX + 'px,' + evt.clientY + 'px,6px)';

    realityEditor.gui.pocket.setPocketPosition(evt);
};


/**********************************************************************************************************************
 **********************************************************************************************************************/

// TODO: implement this in a smart way that determines which frame is on top and closer to middle of view
function getFarFrontFrame(objectKey) {
    for (var frameKey in objects[objectKey].frames) {
        return frameKey;
    }
    return null;
}

/**
 * @desc
 * @param evt
 **/

realityEditor.device.onDocumentPointerUp = function(evt) {

    realityEditor.device.eventObject.x = evt.clientX;
    realityEditor.device.eventObject.y = evt.clientY;
    realityEditor.device.eventObject.type = "touchend";
    realityEditor.device.touchInputs.screenTouchEnd(realityEditor.device.eventObject);


    var nodeCalculations = realityEditor.gui.ar.draw.nodeCalculations;

	globalStates.pointerPosition = [-1, -1];

	// clear the timeout that makes the logic nodes moveable.
	clearTimeout(realityEditor.device.touchTimer);
    
	if (globalStates.pocketButtonDown) {
		// pocketItem["pocket"].objectVisible = false;
        realityEditor.gui.ar.draw.setObjectVisible(pocketItem["pocket"], false);

		if (pocketItem["pocket"].frames["pocket"].nodes[pocketItemId]) {

			nodeCalculations.farFrontElement = "";
			nodeCalculations.frontDepth = 10000000000;
            
			// todo this needs to be checked against the far front frame.
			
			for (var thisOtherKey in realityEditor.gui.ar.draw.visibleObjects) {
				if (realityEditor.gui.ar.draw.visibleObjects[thisOtherKey][14] < nodeCalculations.frontDepth) {
					nodeCalculations.frontDepth = realityEditor.gui.ar.draw.visibleObjects[thisOtherKey][14];
					nodeCalculations.farFrontElement = thisOtherKey;
					nodeCalculations.farFrontFrame = getFarFrontFrame(thisOtherKey);
				}
			}

			var thisItem = pocketItem["pocket"].frames["pocket"].nodes[pocketItemId];

			if (nodeCalculations.farFrontElement !== "" && thisItem.screenZ !== 2 && thisItem.screenZ) {

				var logicCount = 0;
				for(var nodeKey in objects[nodeCalculations.farFrontElement].frames[nodeCalculations.farFrontFrame].nodes) {
					if(objects[nodeCalculations.farFrontElement].frames[nodeCalculations.farFrontFrame].nodes[nodeKey].type === "logic"){
						logicCount++;
					}
				}
				thisItem.name = "LOGIC"+logicCount;

				// make sure that logic nodes only stick to 2.0 server version
                if(realityEditor.network.testVersion(nodeCalculations.farFrontElement)>165) {
                    objects[nodeCalculations.farFrontElement].frames[nodeCalculations.farFrontFrame].nodes[pocketItemId] = thisItem;

                    var _thisNode = document.getElementById("iframe" + pocketItemId);
                    if (_thisNode) {
                        if (_thisNode._loaded)
                            realityEditor.network.onElementLoad(nodeCalculations.farFrontElement, nodeCalculations.farFrontFrame, pocketItemId);
                    }
                    
                    // TODO: it never gets added... maybe add globalDOMCache[pocketItemId] = // or something...

                    globalDOMCache[pocketItemId].objectId = nodeCalculations.farFrontElement;
                    globalDOMCache[pocketItemId].frameId = nodeCalculations.farFrontFrame;

                    realityEditor.network.postNewLogicNode(objects[nodeCalculations.farFrontElement].ip, nodeCalculations.farFrontElement, nodeCalculations.farFrontFrame, pocketItemId, thisItem);
                    
                }

			}
            // realityEditor.gui.ar.draw.hideTransformed("pocket", pocketItemId, pocketItem["pocket"].frames["pocket"].nodes[pocketItemId], "logic");
            realityEditor.gui.ar.draw.hideTransformed(pocketItemId, pocketItem["pocket"].frames["pocket"].nodes[pocketItemId], globalDOMCache, cout);
			delete pocketItem["pocket"].frames["pocket"].nodes[pocketItemId];
		}
	}


	globalStates.overlay = 0;

	if (globalStates.guiState ==="node") {
		realityEditor.device.onFalseTouchUp();
		if (!globalProgram.objectA && globalStates.drawDotLine) {
			realityEditor.gui.ar.lines.deleteLines(globalStates.drawDotLineX, globalStates.drawDotLineY, evt.clientX, evt.clientY);
		}
		globalStates.drawDotLine = false;
	}
	globalCanvas.hasContent = true;

	// todo why is this just hidden and not display none??

	overlayDiv.style.display = "none";
    
	overlayDiv.classList.remove('overlayMemory');
	overlayDiv.classList.remove('overlayLogicNode');
	overlayDiv.classList.remove('overlayAction');
	overlayDiv.classList.remove('overlayPositive');
	overlayDiv.classList.remove('overlayNegative');

    overlayDiv.innerHTML = '';

    if (globalStates.guiState !== "logic" && !globalStates.realityState) {
        realityEditor.gui.menus.on("main",[]);
    }
	
    //realityEditor.gui.pocket.pocketOnMemoryCreationStop();
	if (overlayDiv.style.backgroundImage !== '' && overlayDiv.style.backgroundImage !== 'none') {
		overlayDiv.style.backgroundImage = 'none';
        realityEditor.app.appFunctionCall("clearMemory");
    }

	cout("documentPointerUp");


// this is relevant for the pocket button to be interact with
	globalStates.pocketButtonDown = false;
	globalStates.pocketButtonUp = false;


};

/**
 * When the pointer goes down, show the overlay and position it at the
 * pointer's location. If in GUI mode, mark the overlay as holding a memory
 * Save its location to globalStates.pointerPosition
 * @param evt
 */
realityEditor.device.onDocumentPointerDown = function(evt) {

    realityEditor.device.eventObject.x = evt.clientX;
    realityEditor.device.eventObject.y = evt.clientY;
    realityEditor.device.eventObject.type = "touchstart";
    realityEditor.device.touchInputs.screenTouchStart(realityEditor.device.eventObject);
    
    globalStates.pointerPosition = [evt.clientX, evt.clientY];

	overlayDiv.style.display = "inline";
	// Translate up 6px to be above pocket layer
	overlayDiv.style.transform = 'translate3d(' + evt.clientX + 'px,' + evt.clientY + 'px,6px)';
	if (globalStates.guiButtonState && !globalStates.freezeButtonState) {
		// If the event is hitting the background
		if (evt.target.id === 'canvas') {
			overlayDiv.classList.add('overlayMemory');
		}
	}
    
    // when in locking mode, don't start the pocket if you tap on the area over the locking buttons
    var ignoreLockingButtons = true;
    if (globalStates.lockingMode) {
        ignoreLockingButtons = (window.innerWidth - evt.clientX > 255) || (window.innerHeight - evt.clientY > 65);
    }

	if (realityEditor.gui.memory.memoryCanCreate() && !globalStates.realityState && window.innerWidth - evt.clientX > 65) {
            realityEditor.gui.menus.on("bigPocket", []);
	}

	cout("documentPointerDown");
};

/**
 * @desc
 * @param evt
 **/

realityEditor.device.onMultiTouchStart = function(evt) {
	if (evt.preventDefault) {
		evt.preventDefault();
	}
	var target = evt.currentTarget;
    // generate action for all links to be reloaded after upload

	if ((globalStates.editingMode || globalStates.tempEditingMode) && evt.targetTouches && evt.targetTouches.length === 1) {
		console.log("--------------------------------"+target.objectId);
		globalStates.editingModeObject = target.objectId;
        globalStates.editingModeFrame = target.frameId;
		globalStates.editingModeLocation = target.nodeId;
		globalStates.editingModeKind = target.type;
		globalStates.editingModeHaveObject = true;
		if(target.type === "logic") {
            // realityEditor.gui.menus.on("bigTrash",[]);
            realityEditor.gui.menus.on("trashOrSave", []);
            //realityEditor.gui.pocket.pocketOnMemoryDeletionStart();
        }
	}
	
	var activeKey = target.nodeId || target.frameId;
	realityEditor.gui.ar.draw.matrix.matrixtouchOn = activeKey; //target.nodeId;
	realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;
	cout("MultiTouchStart");
};

/**
 * @desc
 * @param evt
 **/

realityEditor.device.onMultiTouchMove = function(evt) {
    console.log('onMultiTouchMove');
    if (!evt.hasOwnProperty('touches') && (evt.hasOwnProperty('pageX') || evt.hasOwnProperty('pageY'))) {
        evt.touches = [{}];
        evt.targetTouches = [{}];
    }
	if(evt.pageX) {
		// evt.touches = [{},{}];
		evt.touches[0].pageX = evt.pageX;
		// evt.targetTouches = [1,1];
        evt.targetTouches[0].pageX = evt.pageX;
	}
	if(evt.pageY) {
		// evt.touches = [{},{}];
		evt.touches[0].pageY = evt.pageY;
		// evt.targetTouches = [1,1];
        evt.targetTouches[0].pageY = evt.pageY;
    }

	evt.preventDefault();

// generate action for all links to be reloaded after upload

    // if you do a pinch gesture with both fingers on the frame, scale it and move it with the touches
    if (globalStates.editingModeHaveObject && globalStates.editingMode && evt.targetTouches.length === 2) {
        var firstTouch = evt.touches[0];
        globalStates.editingModeObjectX = firstTouch.pageX;
        globalStates.editingModeObjectY = firstTouch.pageY;
        globalStates.editingModeObjectCenterX = firstTouch.pageX;
        globalStates.editingModeObjectCenterY = firstTouch.pageY;
        var tempThisObject = realityEditor.device.getEditingModeObject();
        realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(tempThisObject, evt.pageX, evt.pageY, true);
        var positionData = realityEditor.gui.ar.positioning.getPositionData(tempThisObject);
        if (globalStates.unconstrainedPositioning === true) {
            realityEditor.gui.ar.utilities.multiplyMatrix(tempThisObject.begin, realityEditor.gui.ar.utilities.invertMatrix(tempThisObject.temp), positionData.matrix);
        }
        var secondTouch = evt.touches[1];
        realityEditor.gui.ar.positioning.onScaleEvent(secondTouch);
    
    } else {

        // otherwise, if you just have one finger on the screen, move the frame you're on if you can

        // cout(globalStates.editingModeHaveObject + " " + globalStates.editingMode + " " + globalStates.editingModeHaveObject + " " + globalStates.editingMode);
        if (globalStates.editingModeHaveObject && (globalStates.editingMode || globalStates.tempEditingMode) && evt.touches.length === 1) {
            // if (globalStates.editingModeHaveObject && (globalStates.editingMode || globalStates.tempEditingMode) && (evt.targetTouches.length === 1 || (evt.pageX && evt.pageY))) {
            var touch = evt.touches[0];

            globalStates.editingModeObjectX = touch.pageX;
            globalStates.editingModeObjectY = touch.pageY;
            globalStates.editingModeObjectCenterX = touch.pageX;
            globalStates.editingModeObjectCenterY = touch.pageY;

            var tempThisObject = realityEditor.device.getEditingModeObject();

            // TODO: re-enable to move frame while scaling
            realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(tempThisObject, evt.pageX, evt.pageY, true);

            var positionData = realityEditor.gui.ar.positioning.getPositionData(tempThisObject);

            if (globalStates.unconstrainedPositioning === true) {
                // console.log('unconstrained move');
                realityEditor.gui.ar.utilities.multiplyMatrix(tempThisObject.begin, realityEditor.gui.ar.utilities.invertMatrix(tempThisObject.temp), positionData.matrix);
            }
        }

        // if you have two fingers on the screen (one on the frame, one on the canvas) then just scale it
        
        else if (globalStates.editingModeHaveObject && (globalStates.editingMode || globalStates.tempEditingMode) && evt.touches.length === 2) {
            //
            // globalStates.editingModeObjectX = evt.touches[0].pageX; //touch.pageX;
            // globalStates.editingModeObjectY = evt.touches[0].pageY; //touch.pageY;
            //
            // realityEditor.gui.ar.positioning.onScaleEvent(evt.touches[1]);

            var frameTouch;
            var canvasTouch;
            [].slice.call(evt.touches).forEach(function(touch){
                if (touch.target.id === evt.targetTouches[0].id) {
                    frameTouch = touch;
                } else {
                    canvasTouch = touch;
                }
            });

            if (frameTouch) {
                globalStates.editingModeObjectX = frameTouch.pageX;
                globalStates.editingModeObjectY = frameTouch.pageY;
            }

            // canvasTouch.pageX 

            if (canvasTouch) {
                realityEditor.gui.ar.positioning.onScaleEvent(canvasTouch);
            }
        }
        
    }
    
	cout("MultiTouchMove");
};

/**
 * @desc
 * @param evt
 **/

realityEditor.device.onMultiTouchEnd = function(evt) {
	if (evt.preventDefault) {
		evt.preventDefault();
	}
	
	if (globalStates.editingScaleDistance) {
	    globalStates.editingScaleDistance = null;
        globalStates.editingModeObjectCenterX = null;
        globalStates.editingModeObjectCenterY = null;
    }

    // generate action for all links to be reloaded after upload
	if (globalStates.editingModeHaveObject) {
		if (globalStates.editingMode) {
            realityEditor.gui.menus.on("main",[]);
			//realityEditor.gui.pocket.pocketOnMemoryDeletionStop();
		}
		if (globalStates.editingNode) {
			if ((!globalStates.editingMode) && globalStates.editingModeKind === 'ui') {
				globalDOMCache[globalStates.editingNode].style.visibility = 'hidden';
			}
			realityEditor.device.onTrueTouchUp(evt);
		}

		cout("start");
		// this is where it should be send to the object..

		var tempThisObject = realityEditor.device.getEditingModeObject();
		
		if (!tempThisObject) {
            globalStates.editingModeObject = null;
            globalStates.editingModeFrame = null;
            globalStates.editingFrame = null;
            globalStates.editingModeHaveObject = false;
            globalCanvas.hasContent = true;
            realityEditor.gui.ar.draw.matrix.matrixtouchOn = "";
            return;
        }
		
        var positionData = realityEditor.gui.ar.positioning.getPositionData(tempThisObject);

        if (tempThisObject.currentTouchOffset) {
		    tempThisObject.currentTouchOffset = null;
        }

		var content = {};
		content.x = positionData.x;
		content.y = positionData.y;
		content.scale = positionData.scale;

		if (globalStates.unconstrainedPositioning === true) {
			realityEditor.gui.ar.utilities.multiplyMatrix(tempThisObject.begin, realityEditor.gui.ar.utilities.invertMatrix(tempThisObject.temp), positionData.matrix);
			content.matrix = positionData.matrix;
		}
		content.lastEditor = globalStates.tempUuid;

		// todo for now we just send nodes but no logic locations. ---- Became obsolete because the logic nodes are now normal nodes
		//  if(globalStates.editingModeKind=== "node") {
        // if (globalStates.editingModeKind === 'ui' && globalStates.editingModeFrame !== globalStates.editingModeLocation) {
         //    // TODO: reimplement widget frames (uncomment frame.js)
         //    // realityEditor.gui.frame.update(globalStates.editingModeObject, globalStates.editingModeLocation);
         //    // // reposition all of this frame's nodes relative to their parent
         //    // var object = objects[globalStates.editingModeObject];
         //    // var frameId = globalStates.editingModeLocation;
         //    // var frame = tempThisObject;
         //    //
         //    // for (var nodeId in object.nodes) {
         //     //    var node = object.nodes[nodeId];
         //     //    if (node.frame !== frameId) {
         //     //        continue;
         //     //    }
         //     //    node.x = frame.x + (Math.random() - 0.5) * 160;
         //     //    node.y = frame.y + (Math.random() - 0.5) * 160;
         //    // }
         //    //
		// 	// if (evt.pageX > window.innerWidth - 60) {
		// 	// 	realityEditor.gui.frame.delete(globalStates.editingModeObject, frameId);
		// 	// }
		// } else 
        
        if (globalStates.tempEditingMode && globalStates.editingModeKind === 'ui' && globalStates.editingModeFrame && globalStates.guiState === 'ui') {
            if (evt.pageX > window.innerWidth - 60) {
                
                console.log('~~ delete frame ~~');
                
                var thisObject = realityEditor.getObject(tempThisObject.objectId);
                var thisFrame = realityEditor.getFrame(tempThisObject.objectId, tempThisObject.uuid);

                // TODO: delete links to and from this object from their respective servers
                realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
                    var tempObject = realityEditor.getObject(objectKey);
                    var tempFrame = realityEditor.getFrame(objectKey, frameKey);
                    for (var linkKey in tempFrame.links) {
                        if (!tempFrame.links.hasOwnProperty(linkKey)) continue;
                        var link = tempFrame.links[linkKey];
                        // console.log(link);
                        if (link.frameA === thisFrame.uuid || link.frameB === thisFrame.uuid) {
                            // console.log("should be deleted");
                            realityEditor.network.deleteLinkFromObject(tempObject.ip, objectKey, frameKey, linkKey);
                        }
                    }
                });

                realityEditor.gui.ar.draw.killObjects(tempThisObject.uuid, thisFrame, globalDOMCache);
                
                realityEditor.network.deleteFrameFromObject(thisObject.ip, tempThisObject.objectId, tempThisObject.uuid);

                delete thisObject.frames[tempThisObject.uuid];

                globalStates.editingModeFrame = null;
                globalStates.editingModeObject = null;
                globalStates.editingFrame = null;
                globalStates.editingModeHaveObject = false;

                return false;
            }
        }
        
        if (this.isGlobalFrame(globalStates.editingModeObject)) {
            
            // TODO: try to drop the frame into an object underneath, or if there isn't one, return it to its starting position in its old object (need to remember this somewhere)
            
            var closestObjectKey = null;
            var visibleObjectKeys = realityEditor.device.speechProcessor.getVisibleObjectKeys(); // TODO: use valentin's new code for finding closest/frontmost
            if (visibleObjectKeys.length > 0) {
                closestObjectKey = visibleObjectKeys[0];
                if (closestObjectKey && objects[closestObjectKey]) {

                    console.log('there is an object to drop this frame onto');
                    var newFrameKey = realityEditor.gui.ar.draw.moveFrameToObjectSpace(closestObjectKey, globalStates.editingModeFrame, globalFrames[globalStates.editingModeFrame]);

                    // var frame = realityEditor.getFrame(closestObjectKey, newFrameKey);
                    // frame.ar.x = 0;
                    // frame.ar.y = 0;
                    // frame.ar.scale = 1;
                    // frame.ar.matrix = []; //realityEditor.gui.ar.utilities.newIdentityMatrix();

                }
            
            } else {
                
                // TODO: if there are no visible objects, return the frame to its previous object
                var frame = globalFrames[globalStates.editingModeFrame];
                var newFrameKey = realityEditor.gui.ar.draw.moveFrameToObjectSpace(frame.sourceObject, globalStates.editingModeFrame, globalFrames[globalStates.editingModeFrame]);

            }

            globalStates.editingModeObject = null;
            globalStates.editingModeFrame = null;
            globalStates.editingFrame = null;
            

        } else {

            if (typeof content.x === "number" && typeof content.y === "number" && typeof content.scale === "number") {
                var urlEndpoint;
                if (globalStates.editingModeKind === 'node' || globalStates.editingModeKind === 'logic') {
                    urlEndpoint = 'http://' + objects[globalStates.editingModeObject].ip + ':' + httpPort + '/object/' + globalStates.editingModeObject + "/frame/" + globalStates.editingModeFrame + "/node/" + globalStates.editingModeLocation + "/nodeSize/";
                } else {
                    urlEndpoint = 'http://' + objects[globalStates.editingModeObject].ip + ':' + httpPort + '/object/' + globalStates.editingModeObject + "/frame/" + globalStates.editingModeFrame + "/node/" + globalStates.editingModeLocation + "/size/";
                }
                console.log('url endpoint = ' + urlEndpoint);
                realityEditor.network.postData(urlEndpoint, content);
            }
            
        }
        
		globalStates.editingModeHaveObject = false;
		globalCanvas.hasContent = true;
		realityEditor.gui.ar.draw.matrix.matrixtouchOn = "";
	}
	cout("MultiTouchEnd");
};

/**
 * @desc
 * @param evt
 **/

realityEditor.device.onMultiTouchCanvasStart = function(evt) {

	globalStates.overlay = 1;

	evt.preventDefault();
// generate action for all links to be reloaded after upload
    /*
	if (globalStates.editingModeHaveObject && globalStates.editingMode && evt.targetTouches.length === 1) {

//todo this will move in to the virtual pocket.
		var touch = evt.touches[0];


		globalStates.editingScaleX = touch.pageX;
		globalStates.editingScaleY = touch.pageY;
		globalStates.editingScaleDistance = Math.sqrt(Math.pow((globalStates.editingModeObjectX - globalStates.editingScaleX), 2) + Math.pow((globalStates.editingModeObjectY - globalStates.editingScaleY), 2));

		var tempThisObject = realityEditor.device.getEditingModeObject();
        var positionData = tempThisObject;
        if (tempThisObject.hasOwnProperty('visualization')) {
            positionData = (tempThisObject.visualization === "ar") ? (tempThisObject.ar) : (tempThisObject.screen);
        }
        globalStates.editingScaleDistanceOld = positionData.scale;
	}
	*/
	cout("MultiTouchCanvasStart");
};

/**
 * @desc
 * @param evt
 **/

realityEditor.device.onMultiTouchCanvasMove = function(evt) {
	evt.preventDefault();
// generate action for all links to be reloaded after upload
	if (globalStates.editingModeHaveObject && globalStates.editingMode && evt.targetTouches.length === 1) {
        // var touch = evt.touches[0];
        var touch = evt.targetTouches[0];

        // var canvasTouch;
        // [].slice.call(evt.touches).forEach(function(touch){
        //     console.log(touch.target);
        //     if (touch.target.id === 'canvas') {
        //         canvasTouch = touch;
        //     }
        // });
        //
        // if (canvasTouch) {
        //     realityEditor.gui.ar.positioning.onScaleEvent(canvasTouch);
        // }
        
        realityEditor.gui.ar.positioning.onScaleEvent(touch);

	}
	cout("MultiTouchCanvasMove");
};

realityEditor.device.onMultiTouchCanvasEnd = function(evt) {
    evt.preventDefault();
    if (globalStates.editingModeHaveObject && globalStates.editingMode && evt.targetTouches.length === 0) {
        if (globalStates.editingScaleDistance) {
            globalStates.editingScaleDistance = null;
            globalStates.editingModeObjectCenterX = null;
            globalStates.editingModeObjectCenterY = null;
        }
    }
    cout("MultiTouchCanvasEnd");
};


/**
 * @desc
 * @param deviceName
 **/

realityEditor.device.setDeviceName = function(deviceName) {
	globalStates.device = deviceName;
	console.log("The Reality Editor is loaded on a " + globalStates.device);
};

/**
 * updates editing mode and resets all frames' visible properties so they re-render with correct editing mode elements
 * @param newEditingMode
 */
realityEditor.device.setEditingMode = function(newEditingMode) {
    if (globalStates.editingMode !== newEditingMode) {
        // reset all object's .visible property to false so they re-render with correct editing DOM elements
        // for (var objectKey in objects) {
        //     if (!objects.hasOwnProperty(objectKey)) continue;
        //     for (var frameKey in objects[objectKey].frames) {
        //         if (!objects[objectKey].frames.hasOwnProperty(frameKey)) continue;
        //         objects[objectKey].frames[frameKey].visible = false;
        //         objects[objectKey].frames[frameKey].visibleEditing = false;
        //         objects[objectKey].frames[frameKey].hasCTXContent = false;
        //     }
        // }

        realityEditor.gui.ar.draw.resetFrameRepositionCanvases();
        realityEditor.gui.ar.draw.resetNodeRepositionCanvases();
    }
    globalStates.editingMode = newEditingMode;
};

/**
 * @desc
 * @param developerState
 * @param extendedTrackingState
 * @param clearSkyState
 * @param externalState
 **/
realityEditor.device.setStates = function (developerState, extendedTrackingState, clearSkyState, instantState, speechState, externalState, discoveryState, realityState, zoneText, zoneState) {

    globalStates.extendedTrackingState = extendedTrackingState;
    globalStates.developerState = developerState;
    globalStates.clearSkyState = clearSkyState;
    globalStates.instantState = instantState;
    globalStates.speechState = speechState;
    globalStates.externalState = externalState;
    globalStates.discoveryState = discoveryState;
    globalStates.realityState = realityState;
    globalStates.zoneText = zoneText;
    globalStates.zoneState = zoneState;
    
    if (globalStates.clearSkyState) {
        document.getElementById("UIButtons").classList.add('clearSky');
    } else {
        document.getElementById("UIButtons").classList.remove('clearSky');
    }

	if (globalStates.realityState) {
            realityEditor.gui.menus.on("realityInfo",["realityGui"]);
            globalStates.realityState = true;
	} else {
            realityEditor.gui.menus.off("main",["gui","reset","unconstrained"]);
            realityEditor.gui.menus.on("main",["gui"]);
            globalStates.realityState = false;
	}

    if (developerState) {
        realityEditor.device.addEventHandlers();
        realityEditor.device.setEditingMode(true);
    }

    if (extendedTrackingState) {
        globalStates.extendedTracking = true;
    }

    if (globalStates.editingMode) {
        realityEditor.gui.menus.on("editing", []);
    }
};

/**
 * @desc
 **/

realityEditor.device.addEventHandlers = function() {
    
    console.log("addEventHandlers");

    realityEditor.device.activateMultiTouch();
    
    realityEditor.forEachFrameInAllObjects( function (objectKey, frameKey) {
        realityEditor.device.addEventHandlersForFrame(objectKey, frameKey);
    });

    cout("addEventHandlers");
};

realityEditor.device.addEventHandlersForFrame = function(objectKey, frameKey) {
    var thisFrame = realityEditor.getFrame(objectKey, frameKey);
    var frameOverlayElement = document.getElementById(frameKey);

    if (frameOverlayElement && (typeof frameOverlayElement.objectId !== 'undefined') && thisFrame.developer) {

        frameOverlayElement.style.visibility = "visible";
        var frameCanvasElement = document.getElementById("canvas" + frameKey);
        frameCanvasElement.style.display = "inline";

        realityEditor.device.utilities.addBoundListener(frameOverlayElement, 'touchstart', realityEditor.device.onMultiTouchStart, realityEditor.device);
        realityEditor.device.utilities.addBoundListener(frameOverlayElement, 'touchmove', realityEditor.device.onMultiTouchMove, realityEditor.device);
        realityEditor.device.utilities.addBoundListener(frameOverlayElement, 'touchend', realityEditor.device.onMultiTouchEnd, realityEditor.device);

        for (var nodeKey in thisFrame.nodes) {
            realityEditor.device.activateNodeMove(nodeKey);
        }
    }
};

/**
 * @desc
 **/

realityEditor.device.removeEventHandlers = function() {

    console.log("removeEventHandlers");

    realityEditor.device.deactivateMultiTouch();
	
	realityEditor.forEachFrameInAllObjects( function (objectKey, frameKey) {

        var thisFrame = realityEditor.getFrame(objectKey, frameKey);
        var frameOverlayElement = document.getElementById(frameKey);

        if (frameOverlayElement && (typeof frameOverlayElement.objectId !== 'undefined') && thisFrame.developer) {

            frameOverlayElement.style.visibility = "hidden";
            // this is a typo but maybe relevant?
            //  frameOverlayElement.className = "mainEditing";

            var frameCanvasElement = document.getElementById("canvas" + frameKey);
            frameCanvasElement.style.display = "none";

            realityEditor.device.utilities.removeBoundListener(frameOverlayElement, 'touchstart', realityEditor.device.onMultiTouchStart);
            realityEditor.device.utilities.removeBoundListener(frameOverlayElement, 'touchmove', realityEditor.device.onMultiTouchMove);
            realityEditor.device.utilities.removeBoundListener(frameOverlayElement, 'touchend', realityEditor.device.onMultiTouchEnd);

            for (var nodeKey in thisFrame.nodes) {
                realityEditor.device.deactivateNodeMove(nodeKey);
            }
            
        }
        
    });

	cout("removeEventHandlers");
};

realityEditor.device.addTouchListenersForElement = function(overlayDomElement, activeVehicle) {
    
    if (activeVehicle.developer || (activeVehicle.type === 'node' || activeVehicle.type === 'logic')) {
        realityEditor.device.utilities.addBoundListener(overlayDomElement, 'pointerdown', realityEditor.device.onTouchDown, realityEditor.device);
        realityEditor.device.utilities.addBoundListener(overlayDomElement, 'pointerup', realityEditor.device.onTrueTouchUp, realityEditor.device);
        realityEditor.device.utilities.addBoundListener(overlayDomElement, 'pointerenter', realityEditor.device.onTouchEnter, realityEditor.device);
        realityEditor.device.utilities.addBoundListener(overlayDomElement, 'pointerout', realityEditor.device.onTouchOut, realityEditor.device);
        realityEditor.device.utilities.addBoundListener(overlayDomElement, 'pointermove', realityEditor.device.onTouchMove, realityEditor.device);

        if (globalStates.editingMode) {
            console.log('adding touch listeners specifically for repositioning');
            realityEditor.device.utilities.addBoundListener(overlayDomElement, 'touchstart', realityEditor.device.onMultiTouchStart, realityEditor.device);
            realityEditor.device.utilities.addBoundListener(overlayDomElement, 'touchmove', realityEditor.device.onMultiTouchMove, realityEditor.device);
            realityEditor.device.utilities.addBoundListener(overlayDomElement, 'touchend', realityEditor.device.onMultiTouchEnd, realityEditor.device);
        }
    }
    
};


/**
 * Adds handlers that switch into effect when a new frame is created to continue dragging it
 */
// realityEditor.device.addFrameEventHandlers = function() {
//     var frameParentDiv = document.querySelector('#GUI');
//     frameParentDiv.addEventListener('pointermove', realityEditor.device.onFrameTouchMove.bind(realityEditor.device), false);
//     console.log('added frame event handlers');
// };
//
// realityEditor.device.onFrameTouchMove = function(evt) {
//     console.log('onFrameTouchMove: ' + evt.pageX + ', ' + evt.pageY);
// };

/*
realityEditor.device.addEventHandlers = function() {

	realityEditor.device.activateMultiTouch();

    for (var objectKey in objects) {
        for (var frameKey in objects[objectKey].frames) {
            var thisFrame = realityEditor.getFrame(objectKey, frameKey);

            if (thisFrame.developer) {

                if (document.getElementById(objectKey)) {
                    var thisObject3 = document.getElementById(objectKey);
                    //  if (globalStates.guiState) {
                    thisObject3.style.visibility = "visible";

                    var thisObject4 = document.getElementById("canvas" + objectKey);
                    thisObject4.style.display = "inline";

                    // }

                    // thisObject3.className = "mainProgram";

                    thisObject3.addEventListener("touchstart", realityEditor.device.onMultiTouchStart.bind(realityEditor.device), false);
                    ec++;
                    thisObject3.addEventListener("touchmove", realityEditor.device.onMultiTouchMove.bind(realityEditor.device), false);
                    ec++;
                    thisObject3.addEventListener("touchend", realityEditor.device.onMultiTouchEnd.bind(realityEditor.device), false);
                    ec++;
                    //}
                }

                for (var nodeKey in thisFrame.nodes) {
                    //	console.log("nodes: "+thisSubKey);
                    realityEditor.device.activateNodeMove(nodeKey);
                }

                for (var frameKey in thisFrame.frames) {
                    var elt = document.getElementById(frameKey);
                    if (!elt) {
                        continue;
                    }
                    elt.style.visibility = "visible";

                    var canvas = document.getElementById("canvas" + frameKey);
                    canvas.style.display = "inline";

                    elt.addEventListener("touchstart", realityEditor.device.onMultiTouchStart);
                    ec++;
                    elt.addEventListener("touchmove", realityEditor.device.onMultiTouchMove);
                    ec++;
                    elt.addEventListener("touchend", realityEditor.device.onMultiTouchEnd);
                    ec++;
                }
            }
        }
    }

    cout("addEventHandlers");
};
 */
