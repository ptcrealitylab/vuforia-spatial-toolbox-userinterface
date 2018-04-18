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

var touchEditingTimer = null;
var trashActivated = false;
var defaultMoveDelay = 400;
var touchMoveTolerance = 100;

// realityEditor.device.touchTimer = null;
// realityEditor.device.trashActivated = false;

function getActiveVehicle(objectKey, frameKey, nodeKey) {
    var vehicle = realityEditor.getNode(objectKey, frameKey, nodeKey);
    if (!vehicle) {
        vehicle = realityEditor.getFrame(objectKey, frameKey);
    }
    return vehicle;
}

// function setEditingModeStates(editingModeObject, editingModeFrame, editingModeNode) {
//     globalStates.editingModeObject = editingModeObject;
//     globalStates.editingModeFrame = editingModeFrame;
//     globalStates.editingModeNode = editingModeNode;
// }

/**
 * Sets up the PointerEvent and TouchEvent listeners for the entire document
 * (now includes events that used to take effect on the background canvas)
 */
realityEditor.device.addDocumentTouchListeners = function() {
    document.addEventListener('pointerdown', this.onDocumentPointerDown.bind(this));
    document.addEventListener('pointermove', this.onDocumentPointerMove.bind(this));
    document.addEventListener('pointerup', this.onDocumentPointerUp.bind(this));

    document.addEventListener('touchstart', this.onDocumentMultiTouchStart.bind(this));
    document.addEventListener('touchmove', this.onDocumentMultiTouchMove.bind(this));
    document.addEventListener('touchend', this.onDocumentMultiTouchEnd.bind(this));
};

/**
 * Sets up PointerEvent and TouchEvent listeners for the provided frame or node's DOM element
 * @param overlayDomElement {HTMLElement} 
 * @param activeVehicle {Frame|Node}
 */
realityEditor.device.addTouchListenersForElement = function(overlayDomElement, activeVehicle) {
    overlayDomElement.addEventListener('pointerdown', this.onElementTouchDown.bind(this));
    // use pointermove for movement events except for dragging
    overlayDomElement.addEventListener('pointermove', this.onElementTouchMove.bind(this));
    // use touchmove for dragging instead of pointermove because it keeps its original target even if you leave the bounds of the target
    overlayDomElement.addEventListener('touchmove', this.onElementMultiTouchMove.bind(this));
    if (activeVehicle.type === 'node' || activeVehicle.type === 'logic') {
        overlayDomElement.addEventListener('pointerenter', this.onElementTouchEnter.bind(this));
        overlayDomElement.addEventListener('pointerout', this.onElementTouchOut.bind(this));
    }
    overlayDomElement.addEventListener('pointerup', this.onElementTouchUp.bind(this));
};

/**
 * Begin the touchTimer to enable editing mode if the user doesn't move too much before it finishes.
 * Also set point A of the globalProgram so we can start creating a link if this is a node.
 * @param event {PointerEvent}
 */
realityEditor.device.onElementTouchDown = function(event) {
    var target = event.currentTarget;
    var moveDelay = globalStates.editingMode ? 10 : defaultMoveDelay;
    var activeVehicle = getActiveVehicle(target.objectId, target.frameId, target.nodeId);
    
    // set point A of the link you are starting to create
    if (globalStates.guiState === "node" && !globalProgram.objectA) {
        globalProgram.objectA = target.objectId;
        globalProgram.frameA = target.frameId;
        globalProgram.nodeA = target.nodeId;
        globalProgram.logicA = activeVehicle.type === "logic" ? 0 : false;
    }
    
    // after a certain amount of time, start editing this element
    var timeoutFunction = setTimeout(function () {
        
        globalStates.editingModeFrame = target.frameId;
        globalStates.editingModeObject = target.objectId;
        
        if (globalStates.guiState === "node") {
            globalStates.editingModeNode = target.nodeId;
            
            // reset link creation state
            resetGlobalProgram();
            
            // show the trash and pocket
            if (activeVehicle.type === "logic") {
                realityEditor.gui.menus.on("trashOrSave", []);
            }

            // move element to front of nodes so that touches don't get blocked by other nodes
            // TODO: make this work for frames too and move outside of this if statement
            var element = target.parentElement;
            if (element && element.id === "thisObject" + target.nodeId) {
                while(element.nextElementSibling && element.nextElementSibling.id !== 'craftingBoard') {
                    element.parentNode.insertBefore(element.nextElementSibling, element);
                }
            }
            
        } else if (globalStates.guiState === "ui" && activeVehicle.location === "global") {
            // show the trash if this is a reusable frame
            realityEditor.gui.menus.on("bigTrash", []);
        }

        // TODO: decide if these are needed anymore or can be inferred
        realityEditor.gui.ar.draw.matrix.matrixtouchOn = target.nodeId || target.frameId;
        realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;

        document.getElementById('svg' + activeVehicle.uuid).style.display = 'inline';

    }, moveDelay);
    
    touchEditingTimer = {
        startX: event.pageX,
        startY: event.pageY,
        timeoutFunction: timeoutFunction
    };
    
    cout("onElementTouchDown");
};

function clearTouchTimer() {
    if (touchEditingTimer) {
        clearTimeout(touchEditingTimer.timeoutFunction);
        touchEditingTimer = null;
    }
}

// TODO: implement beginTouchEditing

/**
 * When touch move that originated on a frame or node, do any of the following:
 * 1. show visual feedback if you move over the trash
 * 2. if move more than a certain threshold, cancel touchTimer //and drag the element
 * @param event
 */
realityEditor.device.onElementTouchMove = function(event) {
    var target = event.currentTarget;
    
    // visual feedback if you move over the trash
    if (event.pageX >= (globalStates.height - 60)) {
        if (!trashActivated) {
            overlayDiv.classList.remove('overlayAction');
            overlayDiv.classList.add('overlayNegative');
            trashActivated = true;
        }
    } else {
        if (trashActivated) {
            overlayDiv.classList.remove('overlayNegative');
            overlayDiv.classList.add('overlayAction');
            trashActivated = false;
        }
    }
    
    // drag and/or scale nodes and (TODO) frames
    
    // var activeVehicle = getActiveVehicle(target.objectId, target.frameId, target.nodeId);
    
    // TODO: unconstrained positioning
    /*
    var unrotatedResult = [
        1, 0, 0, 0,
        0, -1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
    realityEditor.gui.ar.utilities.multiplyMatrix(realityEditor.gui.ar.draw.visibleObjects[target.objectId], globalStates.projectionMatrix, unrotatedResult);
    realityEditor.gui.ar.utilities.multiplyMatrix(rotateX, unrotatedResult, tempThisObject.temp);
    */

    // TODO: move here, or only in onMultiTouchMove ? 
    // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.pageX, event.pageY, true);

    // TODO: decide if this is still the right place to reposition frames from the pocket, or if it should go with the node pocket reposition code
    /*
    if (globalStates.guiState === "ui" && globalStates.editingModeFrame && globalStates.pocketEditingMode) {
        realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(frame, evt.pageX, evt.pageY, true);
    }
    */
    
    if (touchEditingTimer) {
        var dx = event.pageX - touchEditingTimer.startX;
        var dy = event.pageY - touchEditingTimer.startY;
        if (dx * dx + dy * dy > touchMoveTolerance) {
            clearTouchTimer(); // TODO: add a distance threshold around here
        }
    }

    cout("onElementTouchMove");
};

/**
 * When touch move on a frame or node, do any of the following if it is currently the editingMode target:
 * 1. If pinch with two fingers on the element, move and scale it
 * 2. If pinch with one finger on it and one on background canvas, just scale it
 * 3. If drag with only one finger on it, just move it (and if screen pulls out enough, pop it into unconstrained)
 * @param event
 */
realityEditor.device.onElementMultiTouchMove = function(event) {
    event.preventDefault();

    var target = event.currentTarget;
    
    if (target.objectId === globalStates.editingModeObject &&
        target.frameId === globalStates.editingModeFrame &&
        (!target.nodeId || target.nodeId === globalStates.editingModeNode)) {
        
        var activeVehicle = getActiveVehicle(globalStates.editingModeObject, globalStates.editingModeFrame, globalStates.editingModeNode);
        
        var isPinch = event.touches.length === 2;
        var areBothOnElement = event.targetTouches.length === 2;
        
        if (isPinch) {
            
            var centerTouch;
            var outerTouch;
            
            if (areBothOnElement) {

                // if you do a pinch gesture with both fingers on the frame
                // center the scale event around the first touch the user made
                centerTouch = {
                    x: event.targetTouches[0].pageX,
                    y: event.targetTouches[0].pageY
                };

                outerTouch = {
                    x: event.targetTouches[1].pageX,
                    y: event.targetTouches[1].pageY
                };
                
                // also move the element in addition to scaling if both touches are on it

                realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.pageX, event.pageY, true);
                
                // TODO: also unconstrained positioning ?

            } else {

                // if you have two fingers on the screen (one on the frame, one on the canvas)
                // make sure the scale event is centered around the frame
                [].slice.call(event.touches).forEach(function(touch){
                    if (touch.target.id === event.targetTouches[0].id) {
                        centerTouch = touch;
                    } else {
                        outerTouch = touch;
                    }
                });
                
            }
            
            realityEditor.gui.ar.positioning.scaleVehicle(activeVehicle, centerTouch, outerTouch);

            // otherwise, if you just have one finger on the screen, move the frame you're on if you can
        } else if (event.touches.length === 1) {

            realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.pageX, event.pageY, true);
            
            if (globalStates.unconstrainedPositioning) {
                // TODO: unconstrained positioning
            
            } else if (!globalStates.freezeButtonState && ((globalStates.guiState === "ui" && activeVehicle.visualization === "ar") || activeVehicle.type === "node" || activeVehicle.type === "logic")) {
                
                // TODO: pop into unconstrained mode if pull out z > threshold

                var screenFrameMatrix = realityEditor.gui.ar.utilities.repositionedMatrix(realityEditor.gui.ar.draw.visibleObjects[activeVehicle.objectId], activeVehicle);
                var distanceToFrame = screenFrameMatrix[14];
                // if (!globalStates.unconstrainedSnapInitialPosition) {
                //     globalStates.unconstrainedSnapInitialPosition = distanceToFrame;
                // } else {
                //     var threshold = 100;
                //     if (distanceToFrame - globalStates.unconstrainedSnapInitialPosition > threshold) {
                //         console.log('pop into unconstrained editing mode');
                //         realityEditor.app.tap();
                //         globalStates.unconstrainedSnapInitialPosition = null;
                //         globalStates.unconstrainedPositioning = true;
                //         globalStates.editingMode = true;
                //         realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;
                //         realityEditor.gui.ar.draw.matrix.matrixtouchOn = tempThisObject.uuid;
                //         globalStates.tempUnconstrainedPositioning = true;
                //         // realityEditor.gui.menus.on("editing", ["unconstrained"]);
                //     }
                // }
                console.log(distanceToFrame);
                
            }
        }
    }

    cout("onElementMultiTouchMove");
};

/**
 * When touch enters a node that didn't originate in it,
 * Show visual feedback based on whether you are allowed to create a link to this new node
 * @param event
 */
realityEditor.device.onElementTouchEnter = function(event) {
    var target = event.currentTarget;

    if (target.type === "node" || target.type === "logic") {
        var contentForFeedback;

        if (globalProgram.nodeA === target.nodeId || globalProgram.nodeA === false) {
            contentForFeedback = 3; // TODO: replace ints with a human-readable enum/encoding
            overlayDiv.classList.add('overlayAction');

        } else if (realityEditor.network.checkForNetworkLoop(globalProgram.objectA, globalProgram.frameA, globalProgram.nodeA, globalProgram.logicA, target.objectId, target.frameId, target.nodeId, 0)) {
            contentForFeedback = 2;
            overlayDiv.classList.add('overlayPositive');

        } else {
            contentForFeedback = 0;
            overlayDiv.classList.add('overlayNegative');
        }

        if (globalDOMCache["iframe" + target.nodeId]) {
            globalDOMCache["iframe" + target.nodeId].contentWindow.postMessage(
                JSON.stringify( { uiActionFeedback: contentForFeedback }) , "*");
        }
    }

    cout("onElementTouchEnter");
};

/**
 * When touch leaves a node,
 * Stop the touchTimer and reset the visual feedback for that node
 * @param event
 */
realityEditor.device.onElementTouchOut = function(event) {
    var target = event.currentTarget;

    if (target.type === "node" || target.type === "logic") {

        // stop node hold timer // TODO: handle node move same as frame by calculating dist^2 > threshold
        clearTouchTimer()
        
        if (globalStates.editingModeNode) { //TODO: do i need to add editingModeKind back in to handle node vs logic? or can it be calculated by another method?
            realityEditor.gui.menus.buttonOn("main",[]); // endTrash 
        }
        
        globalProgram.logicSelector = 4; // TODO: why 4?

        // reset touch overlay
        overlayDiv.classList.remove('overlayPositive');
        overlayDiv.classList.remove('overlayNegative');
        overlayDiv.classList.remove('overlayAction');

        if (globalDOMCache["iframe" + target.nodeId]) {
            globalDOMCache["iframe" + target.nodeId].contentWindow.postMessage(
                JSON.stringify( { uiActionFeedback: 1 }) , "*");
        }
    }

    cout("onElementTouchOut");
};

function resetGlobalProgram() {
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

// TODO: add functionality from onMultiTouchEnd to onElementTouchUp
// 1. hide editing mode UI for temp-edited elements
// 2. reset various editingMode state
// 3. upload new position data to server
// 4. delete resuable frame dragged onto trash
// 5. drop inTransitionFrame onto new object

/**
 * When touch up on a frame or node, do any of the following if necessary:
 * 1. Open the crafting board
 * 2. Create and upload a new link
 * 3. Reset various editingMode state
 * 4. Delete logic node dragged into trash
 * @param event
 */
realityEditor.device.onElementTouchUp = function(event) {
    var target = event.currentTarget;

    if (globalStates.guiState === "node") {
        
        if (globalProgram.objectA) {
            
            // open the crafting board if you tapped on a logic node
            if (target.nodeId === globalProgram.nodeA && target.type === "logic") {
                realityEditor.gui.crafting.craftingBoardVisible(target.objectId, target.frameId, target.nodeId);
            }

            globalProgram.objectB = target.objectId;
            globalProgram.frameB = target.frameId;
            globalProgram.nodeB = target.nodeId;
            
            realityEditor.network.postLinkToServer(globalProgram);

            resetGlobalProgram();
        
        }
        
    } else if (globalStates.guiState === "ui") {
        
        var thisFrame = realityEditor.getFrame(globalStates.editingModeObject, globalStates.editingModeFrame);
        if (thisFrame) {
            thisFrame.currentTouchOffset = null;
        }
        
    }

    var activeVehicle = getActiveVehicle(globalStates.editingModeObject, globalStates.editingModeFrame, globalStates.editingModeNode);
    if (activeVehicle) {
        document.getElementById('svg' + activeVehicle.uuid).style.display = 'none';
    }

    globalStates.editingModeObject = null;
    globalStates.editingModeFrame = null;
    globalStates.editingModeNode = null;


    // TODO: also reset editingPulledScreenFrame, tempUnconstrainedPositioning, and unconstrainedSnapInitialPosition
    /*
    globalStates.editingPulledScreenFrame = false;
    globalStates.pocketEditingMode = false;
    globalStates.tempUnconstrainedPositioning = false;
    globalStates.unconstrainedSnapInitialPosition = null;
    
    if (globalStates.tempUnconstrainedPositioning) {
        this.onMultiTouchEnd(evt);
        globalStates.tempEditingMode = false;
    }
    */
    
    // force the canvas to re-render
    globalCanvas.hasContent = true;

    realityEditor.gui.ar.draw.matrix.matrixtouchOn = ''; // TODO: simplify this
    
    // realityEditor.device.endTrash(target.nodeId);
        realityEditor.gui.menus.buttonOn("main",[]); // TODO: does endTrash need anything else than this replacement ?
    
    // delete logic node
    if (target.type === "logic" && event.pageX >= (globalStates.height - 60)) {
        
        // delete links to and from the node
        realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
            var thisFrame = realityEditor.getFrame(objectKey, frameKey);
            Object.keys(thisFrame.links).forEach(function(linkKey) {
                var thisLink = thisFrame.links[linkKey];
                if (((thisLink.objectA === target.objectId) && (thisLink.frameA === target.frameId) && (thisLink.nodeA === target.nodeId)) ||
                    ((thisLink.objectB === target.objectId) && (thisLink.frameB === target.frameId) && (thisLink.nodeB === target.nodeId))) {
                    delete thisFrame.links[linkKey];
                    realityEditor.network.deleteLinkFromObject(objects[objectKey].ip, objectKey, frameKey, linkKey);
                }
            });
        });
        
        // remove it from the DOM
        realityEditor.gui.ar.draw.deleteNode(target.objectId, target.frameId, target.nodeId);
        
        // delete it from the server
        realityEditor.network.deleteNodeFromObject(objects[target.objectId].ip, target.objectId, target.frameId, target.nodeId);
    }

    cout("onElementTouchUp");
};

// TODO: trigger here or in another event?
/**
 * Begins drawing the dot line to cut existing links if you touch down on the background canvas
 * @param event
 */
// realityEditor.device.onCanvasPointerDown = function(event) {
//     event.preventDefault();
//    
//     if (globalStates.guiState === "node" && !globalStates.editingMode) {
//         if (!globalProgram.objectA) {
//             globalStates.drawDotLine = true;
//             globalStates.drawDotLineX = evt.clientX;
//             globalStates.drawDotLineY = evt.clientY;
//         }
//     }
//    
// };

/**
 * Show the touch overlay, and if its down on the background create a memory (in ui guiState) or
 * start drawing the dot line to cut links (in node guiState)
 * @param event
 */
realityEditor.device.onDocumentPointerDown = function(event) {

    globalStates.pointerPosition = [event.clientX, event.clientY];

    overlayDiv.style.display = "inline";
    // Translate up 6px to be above pocket layer
    overlayDiv.style.transform = 'translate3d(' + event.clientX + 'px,' + event.clientY + 'px, 6px)';

    // If the event is hitting the background
    if (event.target.id === "canvas") {

        if (globalStates.guiState === "ui" && !globalStates.freezeButtonState) {
            
            overlayDiv.classList.add('overlayMemory');

        } else if (globalStates.guiState === "node" && !globalStates.editingMode) {

            if (!globalProgram.objectA) {
                globalStates.drawDotLine = true;
                globalStates.drawDotLineX = event.clientX;
                globalStates.drawDotLineY = event.clientY;
            }
        }

        if (realityEditor.gui.memory.memoryCanCreate() && window.innerWidth - event.clientX > 65) {
            realityEditor.gui.menus.on("bigPocket", []);
        }
        
    }

    cout("onDocumentPointerDown");
};

// TODO: add in functionality from onMultiTouchCanvasMove to onDocumentPointerMove
// 1. reposition frame that was just pulled out of a screen
// 2. if there is an active editingMode target, scale it when one finger moves on canvas

/**
 * Move the touch overlay and move the pocket node if one is being dragged in
 * TODO: position the pocket frames with the same method?
 * @param event
 */
realityEditor.device.onDocumentPointerMove = function(event) {
    event.preventDefault(); //TODO: why is this here but not in other document events?

    globalStates.pointerPosition = [event.clientX, event.clientY];

    // Translate up 6px to be above pocket layer
    overlayDiv.style.transform = 'translate3d(' + event.clientX + 'px,' + event.clientY + 'px, 6px)';

    // if we are dragging a node in using the pocket, moves that element to this position
    realityEditor.gui.pocket.setPocketPosition(event);

    cout("onDocumentPointerMove");
};

//TODO: add in functionarlity from onMultiTouchCanvasEnd -> reset all editingModeState
/**
 * When touch up anywhere, do any of the following if necessary:
 * 1. Add the pocket node to the closest frame
 * 2. Stop drawing link
 * 3. Delete links crossed by dot line
 * 4. Hide touch overlay, reset menu, and clear memory
 * @param event
 */
realityEditor.device.onDocumentPointerUp = function(event) {
    
    // add the pocket node to the closest frame
    if (globalStates.pocketButtonDown) {

        // hide the pocket node
        realityEditor.gui.ar.draw.setObjectVisible(pocketItem["pocket"], false);
        
        var pocketNode = pocketItem["pocket"].frames["pocket"].nodes[pocketItemId];
        if (pocketNode) {

            // find the closest frame
            var closestKeys = realityEditor.gui.ar.getClosestFrame();
            var closestObjectKey = closestKeys[0];
            var closestFrameKey = closestKeys[1];

            // TODO: look up why it can't equal 2... it might not be correct anymore
            if (closestFrameKey && pocketNode.screenZ && pocketNode.screenZ !== 2) {

                // set the name of the node by counting how many logic nodes the frame already has
                var closestFrame = realityEditor.getFrame(closestObjectKey, closestFrameKey);
                var logicCount = Object.values(closestFrame.nodes).filter(function (node) {
                    return node.type === 'logic'
                }).length;
                pocketNode.name = "LOGIC" + logicCount;

                // make sure that logic nodes only stick to 2.0 server version
                if (realityEditor.network.testVersion(closestObjectKey) > 165) {

                    // add the node to that frame
                    closestFrame.nodes[pocketItemId] = pocketNode;
                    
                    // post the new object/frame/node keys into the existing iframe
                    var pocketNodeIframe = document.getElementById("iframe" + pocketItemId);
                    if (pocketNodeIframe && pocketNodeIframe.loaded) {
                        realityEditor.network.onElementLoad(closestObjectKey, closestFrameKey, pocketItemId);
                    }

                    globalDOMCache[pocketItemId].objectId = closestObjectKey;
                    globalDOMCache[pocketItemId].frameId = closestFrameKey;

                    realityEditor.network.postNewLogicNode(objects[closestObjectKey].ip, closestObjectKey, closestFrameKey, pocketItemId, pocketNode);

                }

            }

            realityEditor.gui.ar.draw.hideTransformed(pocketItemId, pocketNode, globalDOMCache, cout);
            delete pocketItem["pocket"].frames["pocket"].nodes[pocketItemId];
        }
    }
    
    // TODO: check if globalStates.overlay is used anywhere else. I removed setting it to 0 here
    
    if (globalStates.guiState === "node") {

        // stop drawing current link
        resetGlobalProgram();

        // delete links
        if (globalStates.drawDotLine) {
            realityEditor.gui.ar.lines.deleteLines(globalStates.drawDotLineX, globalStates.drawDotLineY, event.clientX, event.clientY);
            globalStates.drawDotLine = false;
        }
    }

    // clear state that may have been set during a touchdown or touchmove event
    clearTouchTimer();
    realityEditor.gui.ar.positioning.initialScaleData = null;
    
    // force redraw the background canvas to remove links
    globalCanvas.hasContent = true;

    // hide and reset the overlay div
    overlayDiv.style.display = "none";
    overlayDiv.classList.remove('overlayMemory');
    overlayDiv.classList.remove('overlayLogicNode');
    overlayDiv.classList.remove('overlayAction');
    overlayDiv.classList.remove('overlayPositive');
    overlayDiv.classList.remove('overlayNegative');
    overlayDiv.innerHTML = '';
    
    // if not in crafting board, reset menu back to main
    if (globalStates.guiState !== "logic") {
        realityEditor.gui.menus.on("main",[]);
    }

    // clear the memory being saved in the touch overlay
    if (overlayDiv.style.backgroundImage !== '' && overlayDiv.style.backgroundImage !== 'none') {
        overlayDiv.style.backgroundImage = 'none';
        realityEditor.app.appFunctionCall("clearMemory");
    }

    // this is relevant for the pocket button to be interacted with
    globalStates.pocketButtonDown = false;
    globalStates.pocketButtonUp = false; // TODO: pocketButtonUp doesn't seem to be used for anything anymore

    cout("onDocumentPointerUp");
};

/**
 * Exposes all touchstart events to the touchInputs module for additional functionality (e.g. screens)
 * @param event
 */
realityEditor.device.onDocumentMultiTouchStart = function (event) {
    realityEditor.device.touchEventObject(event, "touchstart", realityEditor.device.touchInputs.screenTouchStart);
    cout("onDocumentMultiTouchStart");
};

/**
 * Exposes all touchmove events to the touchInputs module for additional functionality (e.g. screens)
 * @param event
 */
realityEditor.device.onDocumentMultiTouchMove = function (event) {
    realityEditor.device.touchEventObject(event, "touchmove", realityEditor.device.touchInputs.screenTouchMove);
    cout("onDocumentMultiTouchMove");

    // If the event is hitting the background
    if (event.target.id === "canvas") {

        var activeVehicle = getActiveVehicle(globalStates.editingModeObject, globalStates.editingModeFrame, globalStates.editingModeNode);

        if (activeVehicle && event.targetTouches.length === 1) {

            // if you do a pinch gesture with one on the frame and one on the background
            // center the scale event around the frame the user made
            var centerTouch;
            var outerTouch;

            [].slice.call(event.touches).forEach(function(touch){
                if (touch.target.id === event.targetTouches[0].id) {
                    centerTouch = {
                        x: touch.pageX,
                        y: touch.pageY
                    };
                } else {
                    outerTouch = {
                        x: touch.pageX,
                        y: touch.pageY
                    };
                }
            });

            if (centerTouch && outerTouch) {
                realityEditor.gui.ar.positioning.scaleVehicle(activeVehicle, centerTouch, outerTouch);
            }
        }

    }
};

/**
 * Exposes all touchend events to the touchInputs module for additional functionality (e.g. screens)
 * @param event
 */
realityEditor.device.onDocumentMultiTouchEnd = function (event) {
    realityEditor.device.touchEventObject(event, "touchend", realityEditor.device.touchInputs.screenTouchEnd);
    cout("onDocumentMultiTouchEnd");
};

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

/**
 * Parses a TouchEvent into a useful format for the screenExtension module and sends it via the callback
 * @param evt
 * @param type
 * @param cb
 */
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

// // // // MISC. Device Functionality // // // //

/**
 * Sets the global device name to the internal hardware string of the iOS device
 * @param deviceName {string} phone or tablet identifier
 * e.g. iPhone 6s is "iPhone8,1", iPhone 6s Plus is "iPhone8,2", iPhoneX is "iPhone10,3"
 * see: https://gist.github.com/adamawolf/3048717#file-ios_device_types-txt
 * or:  https://support.hockeyapp.net/kb/client-integration-ios-mac-os-x-tvos/ios-device-types
 */
realityEditor.device.setDeviceName = function(deviceName) {
    globalStates.device = deviceName;
    console.log("The Reality Editor is loaded on a " + globalStates.device);
    cout("setDeviceName");
};

/**
 * Sets the persistent global settings of the Reality Editor based on the state saved in iOS storage.
 * @param developerState
 * @param extendedTrackingState
 * @param clearSkyState
 * @param instantState
 * @param speechState
 * @param externalState
 * @param discoveryState
 * @param realityState
 * @param zoneText
 * @param zoneState
 */
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
    
    cout("setStates");
};

