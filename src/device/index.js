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
        type: null,
        touches:[
            {
                screenX: 0,
                screenY: 0,
                type:null
            }, 
            {
                screenX: 0,
                screenY: 0,
                type:null
            }
        ]
};

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
 * Triggered from the javascript API when you tap and hold on an object to begin to move it
 * @param target
 */
/*
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
    } else {
	    globalStates.pocketEditingMode = true;
    }

	realityEditor.device.activateMultiTouch();
	if (target.nodeId) {
        realityEditor.device.activateNodeMove(target.nodeId);
    } else {
        realityEditor.device.activateFrameMove(target.frameId);
    }
	// Only display the trash can if it's something we can delete (a frame)
	if (target.frameId !== target.nodeId) {
	    if(realityEditor.getFrame(target.objectId, target.frameId).location === "global") {
            realityEditor.gui.menus.on("bigTrash", []);
        }
		//realityEditor.gui.pocket.pocketOnMemoryDeletionStart();
	}

	// realityEditor.device.onMultiTouchStart({
	// 	currentTarget: target
	// });
};
*/

/**
 * @returns {*} the object, frame, or node currently being edited (repositioned)
 */
realityEditor.device.getEditingModeObject = function() {
    var objectId = globalStates.editingModeObject;
    var frameId = globalStates.editingModeFrame;
    var nodeId = globalStates.editingModeLocation;
    
    if (globalStates.editingModeKind === 'ui') {
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

realityEditor.device.trashActivated = true;

realityEditor.device.onDocumentMultiTouchMove = function (evt) {
    realityEditor.device.touchEventObject(evt, "touchmove", realityEditor.device.touchInputs.screenTouchMove);
};
realityEditor.device.onDocumentMultiTouchStart = function (evt) {
    realityEditor.device.touchEventObject(evt, "touchstart", realityEditor.device.touchInputs.screenTouchStart);
};
realityEditor.device.onDocumentMultiTouchEnd = function (evt) {
    realityEditor.device.touchEventObject(evt, "touchend", realityEditor.device.touchInputs.screenTouchEnd);
};

realityEditor.device.touchEventObject = function (evt, type, cb) {
    if(!evt.touches) return;
    if (evt.touches.length >= 1) {
        realityEditor.device.eventObject.x = evt.touches[0].screenX;
        realityEditor.device.eventObject.y = evt.touches[0].screenY;
        realityEditor.device.eventObject.type = type;
        realityEditor.device.eventObject.touches[0].screenX = evt.touches[0].screenX;
        realityEditor.device.eventObject.touches[0].screenY = evt.touches[0].screenY;
        realityEditor.device.eventObject.touches[0].type = type;

        if (type === 'touchstart') {
            realityEditor.device.eventObject.object = null;
            realityEditor.device.eventObject.frame = null;
            var ele = evt.target;
            while (ele && ele.tagName !== "BODY" && ele.tagName !== "HTML") {
                if (ele.objectId && ele.frameId) {
                    realityEditor.device.eventObject.object = ele.objectId;
                    realityEditor.device.eventObject.frame = ele.frameId;
                    break;
                }
                ele = ele.parentElement;
            }
        }

        
    }
    if (evt.touches.length >= 2) {
        realityEditor.device.eventObject.touches[1].screenX = evt.touches[1].screenX;
        realityEditor.device.eventObject.touches[1].screenY = evt.touches[1].screenY;
        realityEditor.device.eventObject.touches[1].type = type;
    } else if (type === 'touchend') {
        realityEditor.device.eventObject.x = evt.pageX;
        realityEditor.device.eventObject.y = evt.pageY;
        realityEditor.device.eventObject.type = type;
        realityEditor.device.eventObject.touches[0].screenX = evt.pageX;
        realityEditor.device.eventObject.touches[0].screenY = evt.pageY;
        realityEditor.device.eventObject.touches[0].type = type;
    } else {
        realityEditor.device.eventObject.touches[1] = {};
    }
    cb(realityEditor.device.eventObject);
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
