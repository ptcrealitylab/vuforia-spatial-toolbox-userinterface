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

/**
 * @typedef touchEditingTimer
 * @property startX {number}
 * @property startY {number}
 * @property moveTolerance {number}
 * @property timeoutFunction {Function}
 */
realityEditor.device.touchEditingTimer = null;

/**
 * @type {number} How long in ms you need to tap and hold on a frame to start moving it
 */
realityEditor.device.defaultMoveDelay = 400;

/**
 * @type {Array.<string>} List of each current touch on the screen, using the id of the touch event target
 */
realityEditor.device.currentScreenTouches = [];

/**
 * @typedef editingState
 * All the necessary state about what's currently being repositioned. Everything else can be calculated from these.
 * @property object {string|null}
 * @property frame {string|null}
 * @property node {string|null}
 * @property touchOffset {{x: number, y: number}|null}
 * @property unconstrained {boolean}
 */
realityEditor.device.editingState = {
    object: null,
    frame: null,
    node: null,
    touchOffset: null,
    unconstrained: false,
    unconstrainedOffset: null
};

/**
 * Sets the global editingMode and updates the svg overlay visibility for frames and nodes
 * @param newEditingMode {boolean}
 */
realityEditor.device.setEditingMode = function(newEditingMode) {
    globalStates.editingMode = newEditingMode;
    
    // also turn off unconstrained
    if (!newEditingMode) {
        globalStates.unconstrainedPositioning = false;
    }
    
    // TODO: how will svg overlays update when toggle between frames and nodes?
    
    var newDisplay = newEditingMode ? 'inline' : 'none';
    realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
        var svg = document.getElementById('svg' + frameKey);
        if (svg) {
            svg.style.display = newDisplay;
        }
        realityEditor.forEachNodeInFrame(objectKey, frameKey, function(objectKey, frameKey, nodeKey) {
            svg = document.getElementById('svg' + nodeKey);
            if (svg) {
                svg.style.display = newDisplay;
            }
        });
    });
    
};

/**
 * Returns the frame or node specified by the path, if one exists
 * @param objectKey {string}
 * @param frameKey {string}
 * @param nodeKey {string|undefined}
 * @return {Frame|Node|null}
 */
realityEditor.device.getActiveVehicle = function(objectKey, frameKey, nodeKey) {
    var vehicle = realityEditor.getNode(objectKey, frameKey, nodeKey);
    if (!vehicle) {
        vehicle = realityEditor.getFrame(objectKey, frameKey);
    }
    return vehicle;
};

/**
 * Returns the frame or node that is currently being edited, if one exists
 * @return {Frame|Node|null}
 */
realityEditor.device.getEditingVehicle = function() {
    return this.getActiveVehicle(this.editingState.object, this.editingState.frame, this.editingState.node);
};

/**
 * Finds the closest frame to the camera and moves the pocket node from the pocketItem storage to that frame
 * @param pocketNode {Logic}
 */
realityEditor.device.addPocketNodeToClosestFrame = function(pocketNode) {

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
};

/**
 * Don't post touches into the iframe if any are true:
 * 1. we're in editing mode
 * 2. we're dragging the current vehicle around, or
 * 3. we're waiting for the touchEditing timer to either finish or be cleared by moving/releasing
 * @param event {PointerEvent}
 * @return {boolean}
 */
realityEditor.device.shouldPostEventIntoIframe = function(event) {
    var target = event.currentTarget;

    var activeVehicleIsEditing =    target.objectId === this.editingState.object &&
                                    target.frameId === this.editingState.frame &&
                                    (target.nodeId === this.editingState.node ||
                                        (!target.nodeId && !this.editingState.node));
    
    return !(globalStates.editingMode || activeVehicleIsEditing || this.touchEditingTimer);
};

/**
 * Post a fake PointerEvent into the provided frame or node's iframe
 * @param event {PointerEvent}
 * @param frameKey {string}
 * @param nodeKey {string|undefined}
 */
realityEditor.device.postEventIntoIframe = function(event, frameKey, nodeKey) {
    var iframe = document.getElementById('iframe' + (nodeKey || frameKey));
    var newCoords = webkitConvertPointFromPageToNode(iframe, new WebKitPoint(event.pageX, event.pageY));
    iframe.contentWindow.postMessage(JSON.stringify({
        event: {
            type: event.type,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            x: newCoords.x,
            y: newCoords.y
        }
    }), '*');
};

/**
 * Stop and reset the touchEditingTimer if it's in progress
 */
realityEditor.device.clearTouchTimer = function() {
    if (this.touchEditingTimer) {
        clearTimeout(this.touchEditingTimer.timeoutFunction);
        this.touchEditingTimer = null;
    }
};

/**
 * Reset all state related to the link being created
 */
realityEditor.device.resetGlobalProgram = function() {
    globalProgram.objectA = false;
    globalProgram.frameA = false;
    globalProgram.nodeA = false;
    globalProgram.logicA = false;
    globalProgram.objectB = false;
    globalProgram.frameB = false;
    globalProgram.nodeB = false;
    globalProgram.logicB = false;
    globalProgram.logicSelector = 4;
};

/**
 * Reset full editing state so that no object is set as being edited
 */
realityEditor.device.resetEditingState = function() {
    this.editingState.object = null;
    this.editingState.frame = null;
    this.editingState.node = null;
    this.editingState.touchOffset = null;
    this.editingState.unconstrained = false;
    this.editingState.unconstrainedOffset = null;
};

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
    document.addEventListener('touchcancel', this.onDocumentMultiTouchEnd.bind(this));
};

/**
 * Sets up PointerEvent and TouchEvent listeners for the provided frame or node's DOM element
 * @param overlayDomElement {HTMLElement} 
 * @param activeVehicle {Frame|Node}
 */
realityEditor.device.addTouchListenersForElement = function(overlayDomElement, activeVehicle) {

    // use PointerEvents for movement events except for dragging
    overlayDomElement.addEventListener('pointerdown', this.onElementTouchDown.bind(this));
    overlayDomElement.addEventListener('pointermove', this.onElementTouchMove.bind(this));
    overlayDomElement.addEventListener('pointerup', this.onElementTouchUp.bind(this));

    // use TouchEvents for dragging because it keeps its original target even if you leave the bounds of the target
    overlayDomElement.addEventListener('touchstart', this.onElementMultiTouchStart.bind(this));
    overlayDomElement.addEventListener('touchmove', this.onElementMultiTouchMove.bind(this));
    overlayDomElement.addEventListener('touchend', this.onElementMultiTouchEnd.bind(this));
    overlayDomElement.addEventListener('touchcancel', this.onElementMultiTouchEnd.bind(this));
    
    // give enter and leave events to nodes for when you draw links between them
    if (activeVehicle.type === 'node' || activeVehicle.type === 'logic') {
        overlayDomElement.addEventListener('pointerenter', this.onElementTouchEnter.bind(this));
        overlayDomElement.addEventListener('pointerout', this.onElementTouchOut.bind(this));
    }
};

/**
 * Set the specified frame or node as the editingMode target and update the UI
 * @param objectKey {string}
 * @param frameKey {string}
 * @param nodeKey {string|undefined}
 */
realityEditor.device.beginTouchEditing = function(objectKey, frameKey, nodeKey) {
    
    var activeVehicle = this.getActiveVehicle(objectKey, frameKey, nodeKey);

    // if you're already editing another object (or can't find this one) don't let you start editing this one
    if (this.editingState.object || !activeVehicle) { return; }

    this.editingState.object = objectKey;
    this.editingState.frame = frameKey;

    if (globalStates.guiState === "node") {
        this.editingState.node = nodeKey;

        // reset link creation state
        this.resetGlobalProgram();

        // show the trash and pocket
        if (activeVehicle.type === "logic") {
            //realityEditor.gui.menus.on("trashOrSave", []); // TODO: use this to enable logic node pocket again
            realityEditor.gui.menus.on("bigTrash", []);

        }

    } else if (globalStates.guiState === "ui" && activeVehicle.location === "global") {
        // show the trash if this is a reusable frame
        realityEditor.gui.menus.on("bigTrash", []);
    }

    // move element to front of nodes or frames so that touches don't get blocked by other nodes
    // var element = document.getElementById('object' + (nodeKey || frameKey));
    // if (element) {
    //     while(element.nextElementSibling && element.nextElementSibling.id !== 'craftingBoard') {
    //         element.parentNode.insertBefore(element.nextElementSibling, element); // TODO: this doesn't actually work with 3d transforms involved
    //     }
    // }

    // TODO: decide if these are needed anymore or can be inferred
    // realityEditor.gui.ar.draw.matrix.matrixtouchOn = nodeKey || frameKey;
    realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;

    document.getElementById('svg' + activeVehicle.uuid).style.display = 'inline';
    
};

/**
 * Begin the touchTimer to enable editing mode if the user doesn't move too much before it finishes.
 * Also set point A of the globalProgram so we can start creating a link if this is a node.
 * @param event {PointerEvent}
 */
realityEditor.device.onElementTouchDown = function(event) {
    var target = event.currentTarget;
    var activeVehicle = this.getActiveVehicle(target.objectId, target.frameId, target.nodeId);
    
    // how long it takes to move the element:
    // instant if editing mode on, 400ms if not (or touchMoveDelay if specially configured for that element)
    var moveDelay = this.defaultMoveDelay;
    if (globalStates.editingMode) {
        moveDelay = 0;
    } else if (activeVehicle.touchMoveDelay) {
        moveDelay = activeVehicle.touchMoveDelay; // TODO: set this from the javascript API
    }
    
    // set point A of the link you are starting to create
    if (globalStates.guiState === "node" && !globalProgram.objectA) {
        globalProgram.objectA = target.objectId;
        globalProgram.frameA = target.frameId;
        globalProgram.nodeA = target.nodeId;
        globalProgram.logicA = activeVehicle.type === "logic" ? 0 : false;
    }

    // Post event into iframe
    if (this.shouldPostEventIntoIframe(event)) {
        this.postEventIntoIframe(event, target.frameId, target.nodeId);
    }
    
    // after a certain amount of time, start editing this element
    var timeoutFunction = setTimeout(function () {
        realityEditor.device.beginTouchEditing(target.objectId, target.frameId, target.nodeId);
    }, moveDelay); 
    
    this.touchEditingTimer = {
        startX: event.pageX,
        startY: event.pageY,
        moveTolerance: 100,
        timeoutFunction: timeoutFunction
    };
    
    cout("onElementTouchDown");
};

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
        if (overlayDiv.classList.contains('overlayAction')) {
            overlayDiv.classList.remove('overlayAction');
            overlayDiv.classList.add('overlayNegative');
        }
    } else {
        if (overlayDiv.classList.contains('overlayNegative')) {
            overlayDiv.classList.remove('overlayNegative');
            overlayDiv.classList.add('overlayAction');
        }
    }
    
    // drag and/or scale nodes and (TODO) frames
    
    // var activeVehicle = this.getActiveVehicle(target.objectId, target.frameId, target.nodeId);

    // TODO: decide if this is still the right place to reposition frames from the pocket, or if it should go with the node pocket reposition code
    /*
    if (globalStates.guiState === "ui" && this.editingState.frame && globalStates.pocketEditingMode) {
        realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(frame, evt.pageX, evt.pageY, true);
    }
    */
    
    // cancel the touch hold timer if you move more than a negligible amount
    if (this.touchEditingTimer) {
        
        var dx = event.pageX - this.touchEditingTimer.startX;
        var dy = event.pageY - this.touchEditingTimer.startY;
        if (dx * dx + dy * dy > this.touchEditingTimer.moveTolerance) {
            this.clearTouchTimer();
        }
    
    }
    
    if (this.shouldPostEventIntoIframe(event)) {
        this.postEventIntoIframe(event, target.frameId, target.nodeId);
    }

    cout("onElementTouchMove");
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
        this.clearTouchTimer();

        if (this.editingState.node) { //TODO: do i need to add editingModeKind back in to handle node vs logic? or can it be calculated by another method?
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
    var activeVehicle = this.getEditingVehicle();

    if (this.shouldPostEventIntoIframe(event)) {
        this.postEventIntoIframe(event, target.frameId, target.nodeId);
    }

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

            this.resetGlobalProgram();

        }

    }

    // touch up over the trash
    if (event.pageX >= (globalStates.height - 60)) {

        // delete logic node
        if (target.type === "logic") {

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

            // delete frame
        } else if (globalStates.guiState === "ui" && activeVehicle && activeVehicle.location === "global") {

            // delete links to and from the frame
            realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
                var thisFrame = realityEditor.getFrame(objectKey, frameKey);
                Object.keys(thisFrame.links).forEach(function(linkKey) {
                    var thisLink = thisFrame.links[linkKey];
                    if (((thisLink.objectA === target.objectId) && (thisLink.frameA === target.frameId)) ||
                        ((thisLink.objectB === target.objectId) && (thisLink.frameB === target.frameId))) {
                        delete thisFrame.links[linkKey];
                        realityEditor.network.deleteLinkFromObject(objects[objectKey].ip, objectKey, frameKey, linkKey);
                    }
                });
            });

            realityEditor.gui.ar.draw.killElement(this.editingState.frame, activeVehicle, globalDOMCache);

            realityEditor.network.deleteFrameFromObject(objects[this.editingState.object].ip, this.editingState.object, this.editingState.frame);

            delete objects[this.editingState.object].frames[this.editingState.frame];
        }
    }

    // var touchesOnActiveVehicle = this.currentScreenTouches.filter(function(touchTarget) {
    //     return (touchTarget === this.editingState.frame || touchTarget === this.editingState.node);
    // });
    //
    // if (touchesOnActiveVehicle.length === 0) {
    //     console.log('this is the last touch');
    //     var activeVehicle = this.getActiveVehicle(this.editingState.object, this.editingState.frame, this.editingState.node);
    //     if (activeVehicle) {
    //         document.getElementById('svg' + activeVehicle.uuid).style.display = 'none';
    //     }
    //
    //     this.editingState.object = null;
    //     this.editingState.frame = null;
    //     this.editingState.node = null;
    // }

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

    realityEditor.gui.ar.draw.matrix.matrixtouchOn = ''; // TODO: simplify this, can probably be inferred by editingModeFrame/Node

    // realityEditor.device.endTrash(target.nodeId);
    realityEditor.gui.menus.buttonOn("main",[]); // TODO: does endTrash need anything else than this replacement ?

    cout("onElementTouchUp");
};

realityEditor.device.onElementMultiTouchStart = function(event) {
    this.currentScreenTouches.push(event.target.id.replace(/^(svg)/,""));
    console.log(this.currentScreenTouches);
};

realityEditor.device.onElementMultiTouchEnd = function(event) {
    var index = this.currentScreenTouches.indexOf(event.target.id.replace(/^(svg)/,""));
    if (index !== -1) this.currentScreenTouches.splice(index, 1);
    console.log(this.currentScreenTouches);

    // TODO: only if last touch?
    realityEditor.device.editingState.touchOffset = null;
    
    // TODO: upload position to server
    var activeVehicle = this.getEditingVehicle();
    if (activeVehicle) {
        var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
        var content = {};
        content.x = positionData.x;
        content.y = positionData.y;
        content.scale = positionData.scale;
        if (this.editingState.unconstrained) {
            content.matrix = positionData.matrix;
        }
        content.lastEditor = globalStates.tempUuid;
        
        var routeSuffix = (this.editingState.node) ? "/nodeSize/" : "/size/";
        var urlEndpoint = 'http://' + objects[this.editingState.object].ip + ':' + httpPort + '/object/' + this.editingState.object + "/frame/" + this.editingState.frame + "/node/" + this.editingState.node + routeSuffix;
        realityEditor.network.postData(urlEndpoint, content);
    }

    // TODO: drop inTransitionFrame onto closest object

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
    
    if (target.objectId === this.editingState.object &&
        target.frameId === this.editingState.frame &&
        (!target.nodeId || target.nodeId === this.editingState.node)) {
        
        var activeVehicle = this.getEditingVehicle();
        
        var isPinch = event.touches.length === 2;
        
        if (isPinch) {

            // consider a touch on 'object__frameKey__' and 'svgobject__frameKey__' to be on the same target
            var touchTargets = [].slice.call(event.touches).map(function(touch){return touch.target.id.replace(/^(svg)/,"")});
            var areBothOnElement = touchTargets[0] === touchTargets[1]; //event.targetTouches.length === 2;
            
            var centerTouch;
            var outerTouch;
            
            if (areBothOnElement) {

                // if you do a pinch gesture with both fingers on the frame
                // center the scale event around the first touch the user made
                centerTouch = {
                    x: event.touches[0].pageX,
                    y: event.touches[0].pageY
                };

                outerTouch = {
                    x: event.touches[1].pageX,
                    y: event.touches[1].pageY
                };
                
                // TODO: decide if it feels better to also move the element in addition to scaling if both touches are on it
                // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.pageX, event.pageY, true);
                
                // TODO: also unconstrained positioning ?

            } else {

                // if you have two fingers on the screen (one on the frame, one on the canvas)
                // make sure the scale event is centered around the frame
                [].slice.call(event.touches).forEach(function(touch){
                    if (touch.target.id === event.targetTouches[0].target.id) {
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
                
            }
            
            realityEditor.gui.ar.positioning.scaleVehicle(activeVehicle, centerTouch, outerTouch);

            // otherwise, if you just have one finger on the screen, move the frame you're on if you can
        } else if (event.touches.length === 1) {

            realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.pageX, event.pageY, true);
            
            if (this.editingState.unconstrained) {
                // TODO: unconstrained positioning
            
            } else if (!globalStates.freezeButtonState &&
                ((globalStates.guiState === "ui" && activeVehicle.visualization === "ar") ||
                    activeVehicle.type === "node" ||
                    activeVehicle.type === "logic")) {
                
                // TODO: pop into unconstrained mode if pull out z > threshold

                var screenFrameMatrix = realityEditor.gui.ar.utilities.repositionedMatrix(realityEditor.gui.ar.draw.visibleObjects[activeVehicle.objectId], activeVehicle);
                var distanceToFrame = screenFrameMatrix[14];
                
                if (!this.editingState.unconstrainedOffset) {
                    this.editingState.unconstrainedOffset = distanceToFrame;
                    
                } else {
                    
                    var zPullThreshold = 100;
                    var amountPulled = distanceToFrame - this.editingState.unconstrainedOffset;
                    if (amountPulled > zPullThreshold) {
                        console.log('pop into unconstrained editing mode');
                        realityEditor.app.tap();
                        
                        this.editingState.unconstrained = true;
                        this.editingState.unconstrainedOffset = null;
                        
                        realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true; // TODO: remove these if possible
                        // realityEditor.gui.ar.draw.matrix.matrixtouchOn = activeVehicle.uuid;
                        
                    }
                    
                }
                
                // console.log(distanceToFrame);
                
            }
        }
    }

    cout("onElementMultiTouchMove");
};

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
    
    var activeVehicle = this.getEditingVehicle();
    
    // If the event is hitting the background and it isn't the multi-touch to scale an object
    if (event.target.id === "canvas" && !activeVehicle) {

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

    // numTouchesOnScreen++;
    // this.currentScreenTouches.push(event.target.id);
    // console.log(numTouchesOnScreen, this.currentScreenTouches);

    cout("onDocumentPointerDown");
};

// TODO: add in functionality from onMultiTouchCanvasMove to onDocumentPointerMove
// 1. reposition frame that was just pulled out of a screen

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

//TODO: add in functionality from onMultiTouchCanvasEnd -> reset all editingModeState
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
            this.addPocketNodeToClosestFrame(pocketNode);
        }
    }
    
    if (globalStates.guiState === "node") {

        // stop drawing current link
        this.resetGlobalProgram();

        // delete links
        if (globalStates.drawDotLine) {
            realityEditor.gui.ar.lines.deleteLines(globalStates.drawDotLineX, globalStates.drawDotLineY, event.clientX, event.clientY);
            globalStates.drawDotLine = false;
        }
    }

    // clear state that may have been set during a touchdown or touchmove event
    this.clearTouchTimer();
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
    if (globalStates.guiState !== "logic" && this.currentScreenTouches.length === 0) {
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
    
    // stop editing the active frame or node if there are no more touches on it

    if (this.editingState.object) {
        var touchesOnActiveVehicle = this.currentScreenTouches.filter(function(touchTarget) {
            return (touchTarget === this.editingState.frame || touchTarget === this.editingState.node);
        }.bind(this));

        if (touchesOnActiveVehicle.length === 0) {
            console.log('this is the last touch - hide editing overlay');
            
            var activeVehicle = this.getEditingVehicle();
            if (activeVehicle && !globalStates.editingMode) {
                document.getElementById('svg' + activeVehicle.uuid).style.display = 'none';
            }

            this.resetEditingState();
        
        } else {
            // if there's still a touch on it (it was being scaled), reset touch offset so vehicle doesn't jump
            this.editingState.touchOffset = null;
        }
    }

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
 * 1. Exposes all touchmove events to the touchInputs module for additional functionality (e.g. screens)
 * 2. if there is an active editingMode target, scale it when one finger moves on canvas
 * @param event
 */
realityEditor.device.onDocumentMultiTouchMove = function (event) {
    realityEditor.device.touchEventObject(event, "touchmove", realityEditor.device.touchInputs.screenTouchMove);
    cout("onDocumentMultiTouchMove");
    
    var targetId = event.target.id.replace(/^(svg)/,"");
    var touchingOtherElement = !(targetId === this.editingState.frame || targetId === this.editingState.node);
    
    // If the event is hitting the background
    if (touchingOtherElement) {

        var activeVehicle = this.getEditingVehicle();

        if (activeVehicle && event.targetTouches.length === 1) {

            // if you do a pinch gesture with one on the frame and one on the background
            // center the scale event around the frame the user made
            var centerTouch;
            var outerTouch;

            [].slice.call(event.touches).forEach(function(touch){
                if (touch.target.id === event.targetTouches[0].target.id) {
                    outerTouch = {
                        x: touch.pageX,
                        y: touch.pageY
                    };
                } else {
                    centerTouch = {
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

/**
 * @typedef eventObject
 * Data structure to hold touch events to be sent to screens
 * @property version {number|null}
 * @property object {string|null}
 * @property frame {string|null}
 * @property node {string|null}
 * @property x {number}
 * @property y {number}
 * @property type {number}
 * @property touches {Array.<{screenX: number, screenY: number, type: string}>}
 */
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

