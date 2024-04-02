/**
 *
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
 * @fileOverview realityEditor.device.index.js
 * Implements the touch event handlers for all major AR user interactions,
 * keeping track of the editingState and modifying state of Objects, Frames, and Nodes as necessary.
 */

/**
 * @typedef {Object} TouchEditingTimer
 * @desc All the necessary state to track a tap-and-hold gesture that triggers a timeout callback.
 * @property {number} startX
 * @property {number} startY
 * @property {number} moveToleranceSquared
 * @property {Function} timeoutFunction 
 */

/**
 * @type {TouchEditingTimer|null}
 */
realityEditor.device.touchEditingTimer = null;

/**
 * @type {number} How long in ms you need to tap and hold on a frame to start moving it.
 */
realityEditor.device.defaultMoveDelay = 400;

/**
 * @type {Array.<string>} List of each current touch on the screen, using the id of the touch event target.
 */
realityEditor.device.currentScreenTouches = [];

/**
 * @type {THREE.Mesh} Area target GLTF to raycast against
 */
realityEditor.device.cachedOcclusionObject = null;

/**
 * @type {Object} cached result of getBestWorldObject(), corresponding to the cachedOcclusionObject
 */
realityEditor.device.cachedWorldObject = null;

/**
 * @typedef {Object} EditingState
 * @desc All the necessary state about what's currently being repositioned. Everything else can be calculated from these.
 * @property {string|null} object - objectId of the selected vehicle
 * @property {string|null} frame - frameId of the selected vehicle
 * @property {string|null} node - nodeIf of the selected node (null if vehicle is a frame, not a node)
 * @property {{x: number, y: number, z: number}|null} touchOffset - relative position of the touch to the vehicle when you start repositioning
 * @property {boolean} unconstrained - iff the current reposition is temporarily unconstrained (globalStates.unconstrainedEditing is used for permanent unconstrained repositioning)
 * @property {number|null} initialCameraPosition - initial camera position used for calculating popping into unconstrained
 * @property {Array.<number>|null} startingMatrix - stores the previous vehicle matrix while unconstrained editing, so that it can be returned to its original position if dropped in an invalid location
 * @property {Array.<number>|null} startingTransform - stores the matrix encoding (x,y,scale) at time of startingMatrix
 * @property {boolean} unconstrainedDisabled - iff unconstrained is temporarily disabled (e.g. if changing distance threshold)
 * @property {boolean} preDisabledUnconstrained - the unconstrained state before we disabled, so that we can go back to that when we're done
 * @property {boolean} pinchToScaleDisabled - iff pinch to scale is temporarily disabled (e.g. if changing distance threshold)
 * @property {{startX: number, startY: number}} - if not null, drag gesture turns into pinch gesture with these start coordinates
 */

/**
 * @type {EditingState}
 */
realityEditor.device.editingState = {
    object: null,
    frame: null,
    node: null,
    touchOffset: null,
    unconstrained: false,
    initialCameraPosition: null,
    startingMatrix: null,
    startingTransform: null,
    unconstrainedDisabled: false,
    preDisabledUnconstrained: undefined,
    pinchToScaleDisabled: false,
    syntheticPinchInfo: null
};

/**
 * Used to prevent duplicate pointermove events from triggering if the touch position didn't actually change
 * @type {{x: number, y: number}|null}
 */
realityEditor.device.previousPointerMove = null;

/**
 * @type {CallbackHandler}
 */
realityEditor.device.callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('device/index');

/**
 * Adds a callback function that will be invoked when the specified function is called
 * @param {string} functionName
 * @param {function} callback
 */
realityEditor.device.registerCallback = function(functionName, callback) {
    if (!this.callbackHandler) {
        this.callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('device/index');
    }
    this.callbackHandler.registerCallback(functionName, callback);
};

/**
 * Initialize the device module by registering callbacks to other modules
 */
realityEditor.device.initService = function() {

    realityEditor.gui.buttons.registerCallbackForButton('gui', resetEditingOnButtonUp);
    realityEditor.gui.buttons.registerCallbackForButton('logic', resetEditingOnButtonUp);
    realityEditor.gui.buttons.registerCallbackForButton('setting', resetEditingOnButtonUp);

    function resetEditingOnButtonUp(params) {
        if (params.newButtonState === 'up') {
            realityEditor.device.resetEditingState();
        }
    }
};

/**
 * Sets the global editingMode and updates the svg overlay visibility for frames and nodes.
 * @param {boolean} newEditingMode
 */
realityEditor.device.setEditingMode = function(newEditingMode) {
    globalStates.editingMode = newEditingMode;
    
    // also turn off unconstrained
    if (!newEditingMode) {
        globalStates.unconstrainedPositioning = false;
    }
    
    // TODO: how will svg overlays update when toggle between frames and nodes?
    
    // var newDisplay = newEditingMode ? 'inline' : 'none';
    realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
        var svg = document.getElementById('svg' + frameKey);
        if (svg && globalStates.guiState === "ui") {  // don't show green outline for frames if in node view
            // svg.style.display = newDisplay;
            if (newEditingMode) {
                svg.classList.add('visibleEditingSVG');
                globalDOMCache[frameKey].querySelector('.corners').style.visibility = 'visible';
            } else {
                svg.classList.remove('visibleEditingSVG');
                globalDOMCache[frameKey].querySelector('.corners').style.visibility = 'hidden';
            }
        }
        realityEditor.forEachNodeInFrame(objectKey, frameKey, function(objectKey, frameKey, nodeKey) {
            svg = document.getElementById('svg' + nodeKey);
            if (svg) {
                // svg.style.display = newDisplay;
                if (newEditingMode) {
                    svg.classList.add('visibleEditingSVG');
                    globalDOMCache[nodeKey].querySelector('.corners').style.visibility = 'visible';
                } else {
                    svg.classList.remove('visibleEditingSVG');
                    globalDOMCache[nodeKey].querySelector('.corners').style.visibility = 'hidden';
                }
            }
        });
    });

    this.callbackHandler.triggerCallbacks('setEditingMode', {newEditingMode: newEditingMode});
    
};

/**
 * Returns the frame or node that is currently being edited, if one exists.
 * @return {Frame|Node|null}
 */
realityEditor.device.getEditingVehicle = function() {
    return realityEditor.getVehicle(this.editingState.object, this.editingState.frame, this.editingState.node);
};

/**
 * Returns true iff the vehicle is the active editing vehicle, and being unconstrained edited
 * @param {Frame|Node} vehicle
 * @return {boolean}
 */
realityEditor.device.isEditingUnconstrained = function(vehicle) {
    if (vehicle === this.getEditingVehicle() && (realityEditor.device.editingState.unconstrained || globalStates.unconstrainedPositioning) && !realityEditor.device.editingState.unconstrainedDisabled) {
        // staticCopy frames cannot be unconstrained edited
        if (typeof vehicle.staticCopy !== 'undefined') {
            if (vehicle.staticCopy) {
                return false;
            }
        }
        // only frames and logic nodes can be unconstrained edited
        return realityEditor.gui.ar.positioning.isVehicleUnconstrainedEditable(vehicle);
    }
    return false;
};

/**
 * Finds the closest frame to the camera and moves the pocket node from the pocketItem storage to that frame.
 * @param {Logic} pocketNode
 */
realityEditor.device.addPocketNodeToClosestFrame = function(pocketNode) {

    // find the closest frame
    var closestKeys = realityEditor.gui.ar.getClosestFrame();
    var closestObjectKey = closestKeys[0];
    var closestFrameKey = closestKeys[1];

    // TODO: look up why it can't equal 2... it might not be correct anymore
    if (closestFrameKey && pocketNode.screenZ && pocketNode.screenZ !== 2) {
        
        // update the pocket node with values from its new parent frame
        pocketNode.objectId = closestObjectKey;
        pocketNode.frameId = closestFrameKey;

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

            globalDOMCache['iframe' + pocketItemId].setAttribute("data-object-key", closestObjectKey);
            globalDOMCache['iframe' + pocketItemId].setAttribute("data-frame-key", closestFrameKey);
            globalDOMCache['iframe' + pocketItemId].setAttribute("onload", 'realityEditor.network.onElementLoad("' + closestObjectKey + '","' + closestFrameKey + '","' + pocketItemId + '")');

            // post new object, frame, node, name into the logicNode iframe
            realityEditor.network.onElementLoad(closestObjectKey, closestFrameKey, pocketItemId);
            
            // upload it to the server
            realityEditor.network.postNewLogicNode(objects[closestObjectKey].ip, closestObjectKey, closestFrameKey, pocketItemId, pocketNode);

            // realityEditor.network.postNewNodeName(objects[closestObjectKey].ip, closestObjectKey, closestFrameKey, pocketItemId, pocketNode.name);
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
 * @return {boolean}
 */
realityEditor.device.shouldPostEventsIntoIframe = function() {
    var editingVehicle = this.getEditingVehicle();
    return !(globalStates.editingMode || editingVehicle /*|| this.touchEditingTimer */); // TODO: pointerup never gets posted if this last isnt commented out... was it doing anything?
};

/**
 * Post a fake PointerEvent into the provided frame or node's iframe.
 * @param {PointerEvent} event
 * @param {string} frameKey
 * @param {string|undefined} nodeKey
 */
realityEditor.device.postEventIntoIframe = function(event, frameKey, nodeKey) {
    var iframe = document.getElementById('iframe' + (nodeKey || frameKey));
    var newCoords = webkitConvertPointFromPageToNode(iframe, new WebKitPoint(event.pageX, event.pageY));
    if (!newCoords) { return }

    let projectedZ;
    let worldIntersectPoint;
    let threejsIntersectPoint;

    if (!this.cachedWorldObject) {
        this.cachedWorldObject = realityEditor.worldObjects.getBestWorldObject();
    }

    if (this.cachedWorldObject && !this.cachedOcclusionObject) {
        this.cachedOcclusionObject = realityEditor.gui.threejsScene.getObjectForWorldRaycasts(this.cachedWorldObject.objectId);
        if (this.cachedOcclusionObject) {
            this.cachedOcclusionObject.updateMatrixWorld();
        }
    }

    // if there's a ground plane or an area target mesh, compute the projectedZ, worldIntersectPoint, and threejsIntersectPoint
    if ((this.cachedWorldObject && this.cachedOcclusionObject) || realityEditor.gui.threejsScene.isGroundPlanePositionSet()) {
        let objectsToCheck = [];
        if (this.cachedOcclusionObject) {
            objectsToCheck.push(this.cachedOcclusionObject);
        }
        // pass correct coordinate into tools even if there's no world mesh, if we raycast against the groundplane
        if (realityEditor.gui.threejsScene.isGroundPlanePositionSet()) {
            objectsToCheck.push(realityEditor.gui.threejsScene.getGroundPlaneCollider().getInternalObject());
        }

        let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(event.pageX, event.pageY, objectsToCheck);
        if (raycastIntersects.length > 0) {
            projectedZ = raycastIntersects[0].distance;

            // multiply intersect, which is in ROOT coordinates, by the relative world matrix (ground plane) to ROOT
            let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, realityEditor.sceneGraph.getGroundPlaneModelViewMatrix())
            inverseGroundPlaneMatrix.invert();
            let intersect1 = raycastIntersects[0].point.clone().applyMatrix4(inverseGroundPlaneMatrix);

            // transpose of the inverse of the ground-plane model-view matrix
            let trInvGroundPlaneMat = inverseGroundPlaneMatrix.clone().transpose();

            worldIntersectPoint = {
                x: intersect1.x,
                y: intersect1.y,
                z: intersect1.z,
                // NOTE: to transform a normal, you must multiply by the transpose of the inverse of the model-view matrix
                normalVector: raycastIntersects[0].face.normal.clone().applyMatrix4(trInvGroundPlaneMat).normalize(),
                // the ray direction is just a vector, so we don't need the transpose matrix
                rayDirection: raycastIntersects[0].rayDirection.clone().applyMatrix4(inverseGroundPlaneMatrix).normalize()
            };
            
            // compared to worldIntersectPoint, threejsSceneIntersectPoint returns the intersect point in three js container object coordinates
            realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix)
            inverseGroundPlaneMatrix.invert();
            let intersect2 = raycastIntersects[0].point.clone().applyMatrix4(inverseGroundPlaneMatrix);

            threejsIntersectPoint = {
                x: intersect2.x,
                y: intersect2.y,
                z: intersect2.z,
            };
        }
    }
    let eventData = {
        type: event.type,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        button: event.button,
        x: newCoords.x,
        y: newCoords.y
    }
    if (typeof projectedZ !== 'undefined') {
        eventData.projectedZ = projectedZ;
    }
    if (typeof worldIntersectPoint !== 'undefined') {
        eventData.worldIntersectPoint = worldIntersectPoint;
    }
    if (typeof threejsIntersectPoint !== 'undefined') {
        eventData.threejsIntersectPoint = threejsIntersectPoint;
    }
    iframe.contentWindow.postMessage(JSON.stringify({
        event: eventData
    }), '*');
};

/**
 * Stop and reset the touchEditingTimer if it's in progress.
 */
realityEditor.device.clearTouchTimer = function() {
    if (this.touchEditingTimer) {
        clearTimeout(this.touchEditingTimer.timeoutFunction);
        this.touchEditingTimer = null;
    }
};

/**
 * Reset all state related to the link being created.
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
 * Reset full editing state so that no object is set as being edited.
 */
realityEditor.device.resetEditingState = function() {
    this.sendEditingStateToFrameContents(this.editingState.frame, false); // TODO: move to a callback

    // gets triggered before state gets reset, so that subscribed modules can respond based on what is about to be reset
    this.callbackHandler.triggerCallbacks('resetEditingState');
    
    // properly write the vehicle position to the server if it's been moved relative to another parent
    if (this.getEditingVehicle() && this.isEditingUnconstrained(this.getEditingVehicle())) {
        let activeVehicle = this.getEditingVehicle();
        let vehicleParentId = realityEditor.isVehicleAFrame(activeVehicle) ? activeVehicle.objectId : activeVehicle.frameId;
        let sceneNode = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid);
        if (sceneNode.parent && sceneNode.parent.id !== vehicleParentId) {
            let parentId = realityEditor.isVehicleAFrame(activeVehicle) ? activeVehicle.objectId : activeVehicle.frameId;
            realityEditor.sceneGraph.changeParent(sceneNode, parentId, true);
            realityEditor.gui.ar.positioning.setPositionDataMatrix(this.getEditingVehicle(), sceneNode.localMatrix, false);
            sceneNode.needsUploadToServer = true;
        }
    }

    this.editingState.object = null;
    this.editingState.frame = null;
    this.editingState.node = null;
    this.editingState.touchOffset = null;
    this.editingState.unconstrained = false;
    this.editingState.initialCameraPosition = null;
    this.editingState.startingMatrix = null;
    this.editingState.startingTransform = null;
    this.editingState.syntheticPinchInfo = null;

    this.previousPointerMove = null;

    globalStates.inTransitionObject = null;
    globalStates.inTransitionFrame = null;
    pocketFrame.vehicle = null;

    realityEditor.gui.ar.positioning.stopRepositioning();
};

/**
 * Sets up the PointerEvent and TouchEvent listeners for the entire document.
 * (now includes events that used to take effect on the background canvas)
 */
realityEditor.device.addDocumentTouchListeners = function() {
    document.addEventListener('pointerdown', this.onDocumentPointerDown.bind(this));
    document.addEventListener('pointermove', this.onDocumentPointerMove.bind(this));
    document.addEventListener('pointerup', this.onDocumentPointerUp.bind(this));
    
    if (realityEditor.device.environment.requiresMouseEvents()) {
        document.addEventListener('mousedown', this.onDocumentMultiTouchStart.bind(this));
        document.addEventListener('mousemove', this.onDocumentMultiTouchMove.bind(this));
        document.addEventListener('mouseup', this.onDocumentMultiTouchEnd.bind(this));
        // document.addEventListener('touchcancel', this.onDocumentMultiTouchEnd.bind(this));
    } else {
        document.addEventListener('touchstart', this.onDocumentMultiTouchStart.bind(this));
        document.addEventListener('touchmove', this.onDocumentMultiTouchMove.bind(this));
        document.addEventListener('touchend', this.onDocumentMultiTouchEnd.bind(this));
        document.addEventListener('touchcancel', this.onDocumentMultiTouchEnd.bind(this));
    }
};

/**
 * Sets up PointerEvent and TouchEvent listeners for the provided frame or node's DOM element.
 * @param {HTMLElement} overlayDomElement
 * @param {Frame|Node} activeVehicle
 */
realityEditor.device.addTouchListenersForElement = function(overlayDomElement, activeVehicle) {

    // use PointerEvents for movement events except for dragging
    overlayDomElement.addEventListener('pointerdown', this.onElementTouchDown.bind(this));
    overlayDomElement.addEventListener('pointermove', this.onElementTouchMove.bind(this));
    overlayDomElement.addEventListener('pointerup', this.onElementTouchUp.bind(this));
    overlayDomElement.addEventListener('gotpointercapture', function(evt) {
        evt.target.releasePointerCapture(evt.pointerId);
    });

    if (realityEditor.device.environment.requiresMouseEvents()) {
        // use TouchEvents for dragging because it keeps its original target even if you leave the bounds of the target
        overlayDomElement.addEventListener('mouseup', this.onElementMultiTouchEnd.bind(this));
        // overlayDomElement.addEventListener('touchcancel', this.onElementMultiTouchEnd.bind(this));
    } else {
        // use TouchEvents for dragging because it keeps its original target even if you leave the bounds of the target
        overlayDomElement.addEventListener('touchend', this.onElementMultiTouchEnd.bind(this));
        overlayDomElement.addEventListener('touchcancel', this.onElementMultiTouchEnd.bind(this));
    }
    
    // give enter and leave events to nodes for when you draw links between them
    if (activeVehicle.type !== 'ui') {
        overlayDomElement.addEventListener('pointerenter', this.onElementTouchEnter.bind(this));
        overlayDomElement.addEventListener('pointerout', this.onElementTouchOut.bind(this));
    }
};

/**
 * Set the specified frame or node as the editingMode target and update the UI.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string|undefined} nodeKey
 */
realityEditor.device.beginTouchEditing = function(objectKey, frameKey, nodeKey) {
    
    var activeVehicle = realityEditor.getVehicle(objectKey, frameKey, nodeKey);

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
            realityEditor.gui.menus.switchToMenu("trashOrSave"); // TODO: use this to enable logic node pocket again
            // realityEditor.gui.menus.switchToMenu("bigTrash");

        }

    } else if (globalStates.guiState === "ui") {
        
        if (activeVehicle.location === "global") {
            // show the trash if this is a reusable frame
            realityEditor.gui.menus.switchToMenu("bigTrash");            
        }

    }
    
    var activeObject = realityEditor.getObject(this.editingState.object);
    if (activeObject.isWorldObject) {
        // check if only world objects are visible
        // one way to do this is to get the closest object and see it it's a world object
        var closestObject = realityEditor.getObject(realityEditor.gui.ar.getClosestObject()[0]);
        if (closestObject.isWorldObject) {
            globalStates.inTransitionObject = objectKey;
            globalStates.inTransitionFrame = frameKey;
        }
    }
    
    realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;
    // store this so we can undo the move if needed (e.g. image target disappears)
    realityEditor.device.editingState.startingMatrix = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid).localMatrix;
    realityEditor.device.editingState.startingTransform = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid).getTransformMatrix();

    globalDOMCache[(nodeKey || frameKey)].querySelector('.corners').style.visibility = 'visible';

    this.sendEditingStateToFrameContents(frameKey, true);

    this.callbackHandler.triggerCallbacks('beginTouchEditing');
};

/**
 * post beginTouchEditing and endTouchEditing event into frame so that 3d object can highlight to show that it's being moved
 * @param frameKey
 * @param frameIsMoving
 */
realityEditor.device.sendEditingStateToFrameContents = function(frameKey, frameIsMoving) {
    if (!frameKey) return;
    var iframe = document.getElementById('iframe' + frameKey);
    if (!iframe) return;
    
    iframe.contentWindow.postMessage(JSON.stringify({
        frameIsMoving: frameIsMoving
    }), '*');
};

/**
 * Stop disabling unconstrained mode (gets disabled when you are changing the distance visibility threshold)
 */
realityEditor.device.enableUnconstrained = function() {
    
    // only do this once, otherwise it will undo the effects of saving the previous value
    if (this.editingState.unconstrainedDisabled) {
        if (typeof this.editingState.preDisabledUnconstrained !== "undefined") {
            this.editingState.unconstrained = this.editingState.preDisabledUnconstrained;
            delete this.editingState.preDisabledUnconstrained; // get only works once per set
        } else {
            this.editingState.unconstrained = false;
        }
    }
    this.editingState.unconstrainedDisabled = false;
    this.editingState.initialCameraPosition = null;
};

/**
 * Disable unconstrained editing mode so that the frame/node doesn't move when you pull the phone away from it
 * (Useful when you want to adjust the distance visibility threshold of the frame by walking away from it)
 */
realityEditor.device.disableUnconstrained = function() {
    this.editingState.unconstrainedDisabled = true;
    this.editingState.preDisabledUnconstrained = this.editingState.unconstrained;
    this.editingState.unconstrained = false;
};

/**
 * Re-enable pinch to scale (gets disabled when you are changing the distance visibility threshold)
 */
realityEditor.device.enablePinchToScale = function() {
    this.editingState.pinchToScaleDisabled = false;
};

/**
 * Disable pinch to scale
 * @todo: is this necessary anymore? This was added because we added a new 3-finger pinch gesture to adjust distance visibility threshold, but we removed that pinch gesture now so it might be ok for this to always be enabled?
 */
realityEditor.device.disablePinchToScale = function() {
    this.editingState.pinchToScaleDisabled = true;
};

/**
 * @return {boolean} If the event is intended to control the camera and not the
 *   AR elements
 */
realityEditor.device.isMouseEventCameraControl = function(event) {
  // If mouse events are enabled ignore right clicks and middle clicks
  return realityEditor.device.environment.requiresMouseEvents() &&
    (event.button === 2 || event.button === 1);
};

/**
 * Begin the touchTimer to enable editing mode if the user doesn't move too much before it finishes.
 * Also set point A of the globalProgram so we can start creating a link if this is a node.
 * @param {PointerEvent} event
 */
realityEditor.device.onElementTouchDown = function(event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }

    var target = event.currentTarget;
    var activeVehicle = realityEditor.getVehicle(target.objectId, target.frameId, target.nodeId);
    
    // how long it takes to move the element:
    // instant if editing mode on, 400ms if not (or touchMoveDelay if specially configured for that element)
    var moveDelay = this.defaultMoveDelay;
    // take a lot longer to move nodes, otherwise it's hard to draw links
    if (globalStates.guiState === "node") {
        moveDelay = this.defaultMoveDelay * 3;
    }
    if (globalStates.editingMode) {
        moveDelay = 0;
    } else if (activeVehicle.moveDelay) {
        moveDelay = activeVehicle.moveDelay; // This gets set from the JavaScript API
    }
    
    // set point A of the link you are starting to create
    if (globalStates.guiState === "node" && !globalProgram.objectA) {
        globalProgram.objectA = target.objectId;
        globalProgram.frameA = target.frameId;
        globalProgram.nodeA = target.nodeId;
        globalProgram.logicA = activeVehicle.type === "logic" ? 0 : false;
    }

    // Post event into iframe
    if (this.shouldPostEventsIntoIframe()) {
        this.postEventIntoIframe(event, target.frameId, target.nodeId);
    }

    // after a certain amount of time, start editing this element
    if (moveDelay >= 0) {
        var timeoutFunction = setTimeout(function () {

            var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();

            // send a pointercancel event into the frame so it doesn't get stuck thinking you're clicking in it
            var syntheticPointerCancelEvent = {
                pageX: touchPosition.x || 0,
                pageY: touchPosition.y || 0,
                type: 'pointercancel',
                pointerId: event.pointerId,
                pointerType: event.pointerType
            };
            realityEditor.device.postEventIntoIframe(syntheticPointerCancelEvent, target.frameId, target.nodeId);
            
            realityEditor.device.beginTouchEditing(target.objectId, target.frameId, target.nodeId);
        }, moveDelay);
    }
    
    this.touchEditingTimer = {
        startX: event.pageX,
        startY: event.pageY,
        moveToleranceSquared: (activeVehicle.type === "logic" ? 900 : 100), // make logic nodes easier to move
        timeoutFunction: timeoutFunction
    };

    this.previousPointerMove = {x: event.pageX, y: event.pageY};

    cout("onElementTouchDown");
};

// Tracks pointer move events with no buttons pressed to limit their frequency
realityEditor.device.moveLiftedLast = 0;
realityEditor.device.moveLiftedMsLimit = 100;

/**
 * When touch move that originated on a frame or node, do any of the following:
 * 1. show visual feedback if you move over the trash
 * 2. if move more than a certain threshold, cancel touchTimer
 * @param {PointerEvent} event
 */
realityEditor.device.onElementTouchMove = function(event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
        return;
    }
    if (event.button === -1) {
        if (Date.now() - realityEditor.device.moveLiftedLast < realityEditor.device.moveLiftedMsLimit) {
            return;
        }
        realityEditor.device.moveLiftedLast = Date.now();
    }

    if (this.previousPointerMove && this.previousPointerMove.x === event.pageX && this.previousPointerMove.y === event.pageY) {
        return; // ensure that we ignore supposed "move" events if position didn't change
    }

    var target = event.currentTarget;
    
    // cancel the touch hold timer if you move more than a negligible amount
    if (this.touchEditingTimer) {
        
        var dx = event.pageX - this.touchEditingTimer.startX;
        var dy = event.pageY - this.touchEditingTimer.startY;
        if (dx * dx + dy * dy > this.touchEditingTimer.moveToleranceSquared) {
            this.clearTouchTimer();
        }
    
    }
    
    if (this.shouldPostEventsIntoIframe()) {
        this.postEventIntoIframe(event, target.frameId, target.nodeId);
    }

    this.previousPointerMove = {x: event.pageX, y: event.pageY};

    cout("onElementTouchMove");
};


/**
 * When touch enters a node that didn't originate in it,
 * Show visual feedback based on whether you are allowed to create a link to this new node
 * @param {PointerEvent} event
 */
realityEditor.device.onElementTouchEnter = function(event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }

    var target = event.currentTarget;
    
    // show visual feedback for nodes unless you are dragging something around
    if (target.type !== "ui" && !this.getEditingVehicle()) {
        var contentForFeedback;

        // if exactly one of objectA and objectB is the localWorldObject of the phone, prevent the link from being made
        var localWorldObjectKey = realityEditor.worldObjects.getLocalWorldId();
        var isBetweenLocalWorldAndOtherServer = (globalProgram.objectA === localWorldObjectKey && target.objectId !== localWorldObjectKey) ||
            (globalProgram.objectA !== localWorldObjectKey && target.objectId === localWorldObjectKey);

        // when over the same node you started with
        if (globalProgram.nodeA === target.nodeId || globalProgram.nodeA === false) {
            contentForFeedback = 3; // TODO: replace ints with a human-readable enum/encoding
            overlayDiv.classList.add('overlayAction');

        } else if (realityEditor.network.checkForNetworkLoop(globalProgram.objectA, globalProgram.frameA, globalProgram.nodeA, globalProgram.logicA, target.objectId, target.frameId, target.nodeId, 0) && !isBetweenLocalWorldAndOtherServer) {
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
 * @param {PointerEvent} event
 */
realityEditor.device.onElementTouchOut = function(event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }

    var target = event.currentTarget;
    if (target.type !== "ui") {

        // stop node hold timer // TODO: handle node move same as frame by calculating dist^2 > threshold
        this.clearTouchTimer();

        // if (this.editingState.node) {
        //     realityEditor.gui.menus.buttonOn([]); // endTrash // TODO: need a new method to end trash programmatically ??? 
        // }

        globalProgram.logicSelector = 4; // 4 means default link (not one of the colored ports)

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

/**
 * When touch up on a frame or node, do any of the following if necessary:
 * 1. Open the crafting board
 * 2. Create and upload a new link
 * 3. Reset various editingMode state
 * 4. Delete logic node dragged into trash
 * 5. delete resuable frame dragged onto trash
 * @param {PointerEvent} event
 */
realityEditor.device.onElementTouchUp = function(event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }

    const target = event.currentTarget;

    if (this.shouldPostEventsIntoIframe()) {
        this.postEventIntoIframe(event, target.frameId, target.nodeId);

        if (!target.nodeId) {
            this.toolInteractionCallbacks.forEach(function(callback) {
                callback(target.objectId, target.frameId, 'touchUp');
            });
        }
    }

    // var didDisplayCrafting = false;
    if (globalStates.guiState === "node") {

        if (globalProgram.objectA) {

            // open the crafting board if you tapped on a logic node
            if (target.nodeId === globalProgram.nodeA && target.type === "logic" && !globalStates.editingMode && !this.getEditingVehicle()) {
                realityEditor.gui.crafting.craftingBoardVisible(target.objectId, target.frameId, target.nodeId);
                // didDisplayCrafting = true;
            }

            globalProgram.objectB = target.objectId;
            globalProgram.frameB = target.frameId;
            globalProgram.nodeB = target.nodeId;
            
            if (target.type !== "logic") {
                globalProgram.logicB = false;
            }

            realityEditor.network.postLinkToServer(globalProgram);

            this.resetGlobalProgram();

        }

    }

    // force the canvas to re-render
    globalCanvas.hasContent = true;

    cout("onElementTouchUp");
};

/**
 * Once a frame has been decided to be deleted, this fully deletes it
 * removing links to and from it, removing it from the DOM and objects data structure, and clearing related state 
 * @param {Frame} frameToDelete
 * @param {string} objectKeyToDelete
 * @param {string} frameKeyToDelete
 */
realityEditor.device.deleteFrame = function(frameToDelete, objectKeyToDelete, frameKeyToDelete) {
        
    // delete links to and from the frame
    realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
        var thisFrame = realityEditor.getFrame(objectKey, frameKey);
        Object.keys(thisFrame.links).forEach(function(linkKey) {
            var thisLink = thisFrame.links[linkKey];
            if (((thisLink.objectA === objectKeyToDelete) && (thisLink.frameA === frameKeyToDelete)) ||
                ((thisLink.objectB === objectKeyToDelete) && (thisLink.frameB === frameKeyToDelete))) {
                delete thisFrame.links[linkKey];
                realityEditor.network.deleteLinkFromObject(objects[objectKey].ip, objectKey, frameKey, linkKey);
            }
        });
    });

    // remove it from the DOM
    realityEditor.gui.ar.draw.killElement(frameKeyToDelete, frameToDelete, globalDOMCache);
    // delete it from the server
    realityEditor.network.deleteFrameFromObject(objects[objectKeyToDelete].ip, objectKeyToDelete, frameKeyToDelete);

    globalStates.inTransitionObject = null;
    globalStates.inTransitionFrame = null;

    delete objects[objectKeyToDelete].frames[frameKeyToDelete];
};

/**
 * 1. update the counter to keep track of how many touches are on the screen right now
 * 2. upload new position data to server
 * 3. drop inTransition frame onto closest object
 * @param {TouchEvent} event
 */
realityEditor.device.onElementMultiTouchEnd = function(event) {
    
    var activeVehicle = this.getEditingVehicle();
    
    var isOverTrash = false;
    if (this.isPointerInTrashZone(event.pageX, event.pageY)) {
        if (globalStates.guiState === "ui" && activeVehicle && activeVehicle.location === "global") {
            isOverTrash = true;
        } else if (activeVehicle && activeVehicle.type === "logic") {
            isOverTrash = true;
        }
    }
    
    if (isOverTrash) return;
    
    if (activeVehicle && !isOverTrash) {
        var ignoreMatrix = !(this.editingState.unconstrained || globalStates.unconstrainedPositioning);
        realityEditor.network.postVehiclePosition(activeVehicle, ignoreMatrix);
    }
    
    // drop frame onto closest object if we have pulled one away from a previous object
    if (globalStates.inTransitionObject && globalStates.inTransitionFrame) {

        // allow scaling with multiple fingers without dropping the frame in motion
        var touchesOnActiveVehicle = this.currentScreenTouches.map(function(elt){ return elt.targetId; }).filter(function(touchTarget) {
            return (touchTarget === this.editingState.frame || touchTarget === this.editingState.node || touchTarget === "pocket-element");
        }.bind(this));
        if (touchesOnActiveVehicle.length > 1) {
            return;
        }

        var frameBeingMoved = realityEditor.getFrame(globalStates.inTransitionObject, globalStates.inTransitionFrame);

        var closestObjectKey = realityEditor.network.availableFrames.getBestObjectInfoForFrame(frameBeingMoved.src);
        
        // TODO: when moving a frame from an object to the world, that the world doesn't support... you shouldnt be able to do that... right now it breaks
        // var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];

        if (closestObjectKey) {

            if (closestObjectKey !== globalStates.inTransitionObject) {
                console.log('there is an object to drop this frame onto');

                var newFrameKey = closestObjectKey + frameBeingMoved.name;

                realityEditor.gui.ar.draw.moveTransitionFrameToObject(globalStates.inTransitionObject, globalStates.inTransitionFrame, closestObjectKey, newFrameKey);

                var newFrame = realityEditor.getFrame(closestObjectKey, newFrameKey);
                realityEditor.network.postVehiclePosition(newFrame);
            }

        } else {

            console.log('there are no visible objects - return this frame to its previous object');
            realityEditor.gui.ar.draw.returnTransitionFrameBackToSource();

        }
    }

};

/**
 * Show the touch overlay, and start drawing the dot line to cut links (in node guiState)
 * @param {PointerEvent} event
 */
realityEditor.device.onDocumentPointerDown = function(event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }

    globalStates.pointerPosition = [event.clientX, event.clientY];

    if (realityEditor.device.utilities.isEventHittingBackground(event)) {

        if (globalStates.guiState === "node" && !globalStates.editingMode) {

            if (!globalProgram.objectA) {
                globalStates.drawDotLine = true;
                globalStates.drawDotLineX = event.clientX;
                globalStates.drawDotLineY = event.clientY;
            }
        }

    }

    cout("onDocumentPointerDown");
};

// TODO: add in functionality from onMultiTouchCanvasMove to onDocumentPointerMove
// TODO: 1. reposition frame that was just pulled out of a screen

// TODO: position the pocket nodes the same way that we position pocket frames?
/**
 * Move the touch overlay and move the pocket node if one is being dragged in.
 * @param {PointerEvent} event
 */
realityEditor.device.onDocumentPointerMove = function(event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }

    event.preventDefault(); //TODO: why is this here but not in other document events?

    globalStates.pointerPosition = [event.clientX, event.clientY];

    // if we are dragging a node in using the pocket, moves that element to this position
    realityEditor.gui.pocket.setPocketPosition(event);

    cout("onDocumentPointerMove");
};

/**
 * When touch up anywhere, do any of the following if necessary:
 * 1. Add the pocket node to the closest frame
 * 2. Stop drawing link
 * 3. Delete links crossed by dot line
 * 4. Hide touch overlay, reset menu, and clear memory
 * @param {PointerEvent} event
 */
realityEditor.device.onDocumentPointerUp = function(event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }

    // add the pocket node to the closest frame
    if (realityEditor.gui.buttons.getButtonState('pocket') === 'down') {

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

    // if over the trash icon we need to delete it, but this is handled in onElementTouchUp
    //  which wont naturally trigger if we just added the element from the pocket
    if (pocketFrame.vehicle) {
        var syntheticPointerEvent = {
            pageX: event.pageX || 0,
            pageY: event.pageY || 0,
            type: 'pointerup',
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            currentTarget: globalDOMCache[pocketFrame.vehicle.uuid]
        };
        realityEditor.device.onElementTouchUp(syntheticPointerEvent);
    }

    // delete the tool if you are over a defined trash zone
    if (this.editingState.frame && this.isPointerInTrashZone(event.pageX, event.pageY)) {
        this.tryToDeleteSelectedVehicle();
    }

    // clear state that may have been set during a touchdown or touchmove event
    this.clearTouchTimer();
    realityEditor.gui.ar.positioning.initialScaleData = null;
    
    // force redraw the background canvas to remove links
    globalCanvas.hasContent = true;

    // hide and reset the overlay divs
    [overlayDiv, overlayDiv2].forEach(overlay => {
        overlay.style.display = "none";
        overlay.classList.remove('overlayMemory');
        overlay.classList.remove('overlayLogicNode');
        overlay.classList.remove('overlayAction');
        overlay.classList.remove('overlayPositive');
        overlay.classList.remove('overlayNegative');
        overlay.classList.remove('overlayScreenFrame');
        overlay.innerHTML = '';
    });

    // if not in crafting board, reset menu back to main
    if (globalStates.guiState !== "logic" && this.currentScreenTouches.length === 1) {
        var didDisplayGroundplane = realityEditor.gui.settings.toggleStates.visualizeGroundPlane;
        if (didDisplayGroundplane) {
            realityEditor.gui.menus.switchToMenu('groundPlane');
        } else {
            realityEditor.gui.menus.switchToMenu('main');
        }
    }

    // clear the memory being saved in the touch overlay
    if (overlayDiv.style.backgroundImage !== '' && overlayDiv.style.backgroundImage !== 'none') {
        overlayDiv.style.backgroundImage = 'none';
        realityEditor.app.appFunctionCall("clearMemory");
    }
    
    cout("onDocumentPointerUp");
};

realityEditor.device.isPointerInTrashZone = function(x, y) {
    let customTrashZone = realityEditor.device.layout.getCustomTrashZone();
    if (customTrashZone) {
        return (x > customTrashZone.x && x < (customTrashZone.x + customTrashZone.width) &&
            y > customTrashZone.y && y < (customTrashZone.y + customTrashZone.height));
    } else {
        return x > realityEditor.device.layout.getTrashThresholdX(); // by default, just uses right edge of screen
    }
};

/**
 * By default, we can exclude the specifiedVehicle and it will try to delete the editingVehicle,
 * but you can pass in a specific vehicle if you want to delete that one
 * @param {Frame|Node} specifiedVehicle
 */
realityEditor.device.tryToDeleteSelectedVehicle = function(specifiedVehicle) {
    let activeVehicle = specifiedVehicle || this.getEditingVehicle();
    if (!activeVehicle) return;

    const isFrame = realityEditor.isVehicleAFrame(activeVehicle);
    const additionalInfo = isFrame ? { frameType: activeVehicle.src } : {};
    const objectId = activeVehicle.objectId;
    const frameId = isFrame ? activeVehicle.uuid : activeVehicle.frameId;
    const nodeId = (isFrame) ? null : activeVehicle.uuid;
    let didDelete = false;

    if (isFrame && activeVehicle.location === 'global') {
        // delete frame after a slight delay so that DOM changes don't mess with touch event propagation
        setTimeout(function() {
            realityEditor.device.deleteFrame(activeVehicle, objectId, frameId);
        }, 10);
        didDelete = true;
    }

    if (nodeId && activeVehicle.type === 'logic') {
        // delete links to and from the node
        realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
            let thisFrame = realityEditor.getFrame(objectKey, frameKey);
            Object.keys(thisFrame.links).forEach(linkKey => {
                let thisLink = thisFrame.links[linkKey];
                if (((thisLink.objectA === objectId) && (thisLink.frameA === frameId) && (thisLink.nodeA === nodeId)) ||
                    ((thisLink.objectB === objectId) && (thisLink.frameB === frameId) && (thisLink.nodeB === nodeId))) {
                    delete thisFrame.links[linkKey];
                    realityEditor.network.deleteLinkFromObject(objects[objectKey].ip, objectKey, frameKey, linkKey);
                }
            });
        });
        // delete node after a slight delay so DOM changes don't mess with touch event propagation
        setTimeout(() => {
            realityEditor.gui.ar.draw.deleteNode(objectId, frameId, nodeId); 
            realityEditor.network.deleteNodeFromObject(objects[objectId].ip, objectId, frameId, nodeId);
        }, 10);
        didDelete = true;
    }

    if (!didDelete) return;

    this.resetEditingState();
    this.callbackHandler.triggerCallbacks('vehicleDeleted', {
        objectKey: objectId,
        frameKey: frameId,
        nodeKey: nodeId,
        additionalInfo: additionalInfo
    });
};

/**
 * Converts MouseEvents from a desktop screen to one touch in a multi-touch data structure (TouchEvents),
 * so that they can be handled by the same functions that expect multi-touch
 * @param {MouseEvent} event
 */
function modifyTouchEventIfDesktop(event) {
    if (realityEditor.device.environment.requiresMouseEvents()) {
        event.touches = [];
        event.touches[0] = {
            altitudeAngle: 0,
            azimuthAngle: 0,
            clientX: event.clientX,
            clientY: event.clientY,
            force: 0,
            identifier: event.timeStamp,
            pageX: event.pageX,
            pageY: event.pageY,
            radiusX: 20,
            radiusY: 20,
            rotationAngle: 0,
            screenX: event.screenX,
            screenY: event.screenY,
            target: event.target,
            touchType: 'direct'
        };
    }
}

/**
 * Exposes all touchstart events to the touchInputs module for additional functionality (e.g. screens).
 * Also keeps track of how many touches are down on the screen right now.
 * if its down on the background create a memory (in ui guiState)
 * @param {TouchEvent} event
 */
realityEditor.device.onDocumentMultiTouchStart = function (event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }

    if (typeof event.touches !== 'undefined') {
        if (event.touches.length === 1) {
            overlayDiv.style.display = 'inline';
            overlayDiv.style.transform = `translate3d(${event.touches[0].clientX}px, ${event.touches[0].clientY}px, 1200px)`;
        } else if (event.touches.length === 2) {
            overlayDiv2.style.display = 'inline';
            overlayDiv2.style.transform = `translate3d(${event.touches[1].clientX}px, ${event.touches[1].clientY}px, 1200px)`;
        }
    } else {
        overlayDiv.style.display = 'inline';
        overlayDiv.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 1200px)`;
    }

    modifyTouchEventIfDesktop(event);

    realityEditor.device.touchEventObject(event, "touchstart", realityEditor.device.touchInputs.screenTouchStart);
    cout("onDocumentMultiTouchStart");
    
    Array.from(event.touches).forEach(function(touch) {
        if (realityEditor.device.currentScreenTouches.map(function(elt) { return elt.identifier; }).indexOf(touch.identifier) === -1) {
            realityEditor.device.currentScreenTouches.push({
                targetId: realityEditor.device.utilities.getVehicleIdFromTargetId(touch.target.id), //touch.target.id.replace(/^(svg)/,""),
                identifier: touch.identifier,
                position: {
                    x: touch.pageX,
                    y: touch.pageY
                }
            });
        }
    });

    // If the event is hitting the background and it isn't the multi-touch to scale an object
    if (realityEditor.device.utilities.isEventHittingBackground(event)) {
        if (event.touches.length < 2) {
            var didTouchScreen = this.checkIfTouchWithinScreenBounds(event.pageX, event.pageY);

            if (!didTouchScreen && realityEditor.gui.memory.memoryCanCreate()) { // && window.innerWidth - event.clientX > 65) {

                if (!realityEditor.gui.settings.toggleStates.groupingEnabled) {
                    
                    // try only doing it for double taps now....
                    if (!this.isDoubleTap) { // on first tap
                        this.isDoubleTap = true;
                        // if no follow up tap within time reset
                        setTimeout(function() {
                            this.isDoubleTap = false;
                        }.bind(this), 300);
                    } else { // registered double tap and create memory
                        if (realityEditor.device.environment.variables.supportsMemoryCreation) {
                            realityEditor.gui.menus.switchToMenu("bigPocket");
                            realityEditor.gui.memory.createMemory();
                        }
                    }

                }
                
            }
        }
    }

    this.callbackHandler.triggerCallbacks('onDocumentMultiTouchStart', {event: event});
};

/**
 * 1. Exposes all touchmove events to the touchInputs module for additional functionality (e.g. screens).
 * 2. If there is an active editingMode target, drag it when one finger moves on canvas, or scale when two fingers.
 * @param {TouchEvent} event
 */
realityEditor.device.onDocumentMultiTouchMove = function (event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }
    modifyTouchEventIfDesktop(event);

    // if it's a mouse event, move the first touch overlay div
    if (typeof event.touches === 'undefined') {
        overlayDiv.style.transform = 'translate3d(' + event.pageX + 'px,' + event.pageY + 'px, 1200px)';
    }

    realityEditor.device.touchEventObject(event, "touchmove", realityEditor.device.touchInputs.screenTouchMove);
    cout("onDocumentMultiTouchMove");
    
    Array.from(event.touches).forEach(function(touch, index) {
        realityEditor.device.currentScreenTouches.filter(function(currentScreenTouch) {
            return touch.identifier === currentScreenTouch.identifier;
        }).forEach(function(currentScreenTouch) {
            currentScreenTouch.position.x = touch.pageX;
            currentScreenTouch.position.y = touch.pageY;
        });

        // if it's a touch event, move the touch overlay div for the corresponding finger
        if (index === 0) {
            overlayDiv.style.transform = 'translate3d(' + touch.pageX + 'px,' + touch.pageY + 'px, 1200px)';
        } else if (index === 1) {
            overlayDiv2.style.transform = 'translate3d(' + touch.pageX + 'px,' + touch.pageY + 'px, 1200px)';
        }
    });
    
    var activeVehicle = this.getEditingVehicle();
    
    if (activeVehicle) {

        let syntheticPinch = realityEditor.device.editingState.syntheticPinchInfo;
        // scale the element if you make a pinch gesture
        if ((event.touches.length === 2 || syntheticPinch) && !realityEditor.device.editingState.pinchToScaleDisabled) {

            if (syntheticPinch) { // happens for example on remote operator, holding a keyboard key rather than 2-finger pinch

                // try to center the pinch around center of tool in screen coordinates,
                // but use the startX/Y from synthetic pinch event as a backup value
                let centerTouch = {
                    x: syntheticPinch.startX,
                    y: syntheticPinch.startY
                }
                let bounds = globalDOMCache[activeVehicle.uuid].getClientRects()[0];
                if (bounds) {
                    centerTouch = {
                        x: bounds.left + bounds.width / 2,
                        y: bounds.top + bounds.height / 2
                    };
                }

                let outerTouch = {
                    x: event.pageX,
                    y: event.pageY
                }
                realityEditor.gui.ar.positioning.scaleVehicle(activeVehicle, centerTouch, outerTouch);

            } else {

                // consider a touch on 'object__frameKey__' and 'svgobject__frameKey__' to be on the same target
                // also consider a touch that started on pocket-element to be on the frame element
                var touchTargets = Array.from(event.touches).map(function(touch) {
                    var targetId = realityEditor.device.utilities.getVehicleIdFromTargetId(touch.target.id);
                    if (targetId === 'pocket-element') {
                        targetId = activeVehicle.uuid;
                    }
                    return targetId;
                });

                var areBothOnElement = touchTargets[0] === touchTargets[1];

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
                } else {
                    // if you have two fingers on the screen (one on the frame, one on the canvas)
                    // make sure the scale event is centered around the frame
                    Array.from(event.touches).forEach(function(touch){

                        let targetId = realityEditor.device.utilities.getVehicleIdFromTargetId(touch.target.id);
                        var didTouchOnFrame = targetId === activeVehicle.uuid;
                        var didTouchOnNode = targetId === activeVehicle.frameId + activeVehicle.name;
                        var didTouchOnPocketContainer = touch.target.className === "element-template";
                        if (didTouchOnFrame || didTouchOnNode || didTouchOnPocketContainer) {
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
            }

        // otherwise, if you just have one finger on the screen, move the frame you're on if you can
        } else if (event.touches.length === 1) {
            
            // cannot move static copy frames
            if (activeVehicle.staticCopy) {
                return;
            }
            
            // cannot move nodes inside static copy frames
            if (typeof activeVehicle.objectId !== "undefined" && typeof activeVehicle.frameId !== "undefined") {
                var parentFrame = realityEditor.getFrame(activeVehicle.objectId, activeVehicle.frameId);
                if (parentFrame && parentFrame.staticCopy) {
                    return;
                }
            }

            realityEditor.gui.ar.positioning.y =event.touches[0].pageY;
                realityEditor.gui.ar.positioning.x =   event.touches[0].pageX;
            realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.touches[0].pageX, event.touches[0].pageY, true);
            
            var isDeletableVehicle = activeVehicle.type === 'logic' || (globalStates.guiState === "ui" && activeVehicle && activeVehicle.location === "global");
            
            // visual feedback if you move over the trash
            if (this.isPointerInTrashZone(event.pageX, event.pageY) && isDeletableVehicle) {
                overlayDiv.classList.add('overlayNegative');
            } else {
                overlayDiv.classList.remove('overlayNegative');
            }
            
        }
    }

    this.callbackHandler.triggerCallbacks('onDocumentMultiTouchMove', {event: event});
};

/**
 * Determines if the x, y position on the phone screen falls on top of any visible screen
 * (Can be used to make sure grouping or memory creation don't happen when you're trying to interact with a screen)
 * @param {number} screenX
 * @param {number} screenY
 * @return {boolean}
 */
realityEditor.device.checkIfTouchWithinScreenBounds = function(screenX, screenY) {

    var isWithinBounds = false;
    
    // for every visible screen, calculate this touch's exact x,y coordinate within that screen plane
    for (var frameKey in realityEditor.gui.screenExtension.visibleScreenObjects) {
        if (!realityEditor.gui.screenExtension.visibleScreenObjects.hasOwnProperty(frameKey)) continue;
        var visibleScreenObject = realityEditor.gui.screenExtension.visibleScreenObjects[frameKey];
        var point = realityEditor.gui.ar.utilities.screenCoordinatesToTargetXY(visibleScreenObject.object, screenX, screenY);
        // visibleScreenObject.x = point.x;
        // visibleScreenObject.y = point.y;
        
        let targetSize = realityEditor.gui.utilities.getTargetSize(visibleScreenObject.object);
        var isWithinWidth = Math.abs(point.x) < (targetSize.width * 1000)/2;
        var isWithinHeight = Math.abs(point.y) < (targetSize.height * 1000)/2;

        console.log(point, isWithinWidth, isWithinHeight);
        
        if (isWithinWidth && isWithinHeight) {
            isWithinBounds = true;
        }

    }
    
    return isWithinBounds;

};

/**
 * pop into unconstrained mode if pull out z > threshold
 * @param {Frame|Node} activeVehicle
 */
realityEditor.device.checkIfFramePulledIntoUnconstrained = function(activeVehicle) {

    // many conditions to check to see if it has this feature enabled
    var ableToBePulled = !(this.editingState.unconstrained || globalStates.unconstrainedPositioning) && 
                            (!globalStates.freezeButtonState || realityEditor.device.environment.ignoresFreezeButton()) &&
                            realityEditor.gui.ar.positioning.isVehicleUnconstrainedEditable(activeVehicle);
    
    if (!ableToBePulled) { return; }
        
    if (!this.editingState.initialCameraPosition) {
        this.editingState.initialCameraPosition = realityEditor.sceneGraph.getWorldPosition('CAMERA');
    
    } else {
        let camPos = realityEditor.sceneGraph.getWorldPosition('CAMERA');
        let dx = camPos.x - this.editingState.initialCameraPosition.x;
        let dy = camPos.y - this.editingState.initialCameraPosition.y;
        let dz = camPos.z - this.editingState.initialCameraPosition.z;

        let cameraMoveDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // TODO ben: for frames on screen object, if direction is towards screen then push into screen instead
        
        if (cameraMoveDistance > globalStates.framePullThreshold) {
            console.log('pop into unconstrained editing mode');

            realityEditor.app.tap();

            // create copy of static frame when it gets pulled out
            if (activeVehicle.staticCopy) {
                realityEditor.network.createCopyOfFrame(objects[this.editingState.object].ip, this.editingState.object, this.editingState.frame);
                activeVehicle.staticCopy = false;
            }

            this.editingState.unconstrained = true;
            this.editingState.initialCameraPosition = null;

            // tell the renderer to freeze the current matrix as the unconstrained position on the screen
            realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;
            // store this so we can undo the move if needed (e.g. image target disappears)
            realityEditor.device.editingState.startingMatrix = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid).localMatrix;
            realityEditor.device.editingState.startingTransform = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid).getTransformMatrix();

            this.callbackHandler.triggerCallbacks('onFramePulledIntoUnconstrained', {activeVehicle: activeVehicle});
        }
    }
};

/**
 * Exposes all touchend events to the touchInputs module for additional functionality (e.g. screens).
 * Keeps track of how many touches are currently on the screen.
 * If this touch was the last one on the editingMode element, stop editing it.
 * @param {TouchEvent} event
 */
realityEditor.device.onDocumentMultiTouchEnd = function (event) {
    if (realityEditor.device.isMouseEventCameraControl(event)) {
      return;
    }
    modifyTouchEventIfDesktop(event);

    realityEditor.device.touchEventObject(event, "touchend", realityEditor.device.touchInputs.screenTouchEnd);
    cout("onDocumentMultiTouchEnd");
    
    // if you started editing with beginTouchEditing instead of touchevent on element, programmatically trigger onElementMultiTouchEnd
    var editingVehicleTouchIndex = this.currentScreenTouches.map(function(elt) { return elt.targetId; }).indexOf((this.editingState.node || this.editingState.frame));
    if (editingVehicleTouchIndex === -1) {
        realityEditor.device.onElementMultiTouchEnd(event);
    }

    // if multitouch, stop tracking the touches that were removed but keep tracking the ones still there
    if (event.touches.length > 0) {
        // find which touch to remove from the currentScreenTouches
        var remainingTouches = Array.from(event.touches).map(function(touch) {
            return touch.identifier; //touch.target.id.replace(/^(svg)/,"")
        });
        
        var indicesToRemove = [];
        this.currentScreenTouches.forEach(function(elt, index) {
            // this touch isn't here anymore
            if (remainingTouches.indexOf(elt.identifier) === -1) {
                indicesToRemove.push(index);
            }
        });
        
        // remove them in a separate loop because it can cause problems to remove elements from the same loop you're iterating over
        indicesToRemove.forEach(function(index) {
            realityEditor.device.currentScreenTouches.splice(index, 1);
        });
    } else {
        this.currentScreenTouches = [];

        // realityEditor.gui.menus.buttonOn([]);
        var didDisplayCrafting = globalStates.currentLogic; // proxy to determine if crafting board is open / we shouldn't reset the menu
        if (!didDisplayCrafting) {
            var didDisplayGroundplane = realityEditor.gui.settings.toggleStates.visualizeGroundPlane;
            if (didDisplayGroundplane) {
                realityEditor.gui.menus.switchToMenu('groundPlane');
            } else {
                realityEditor.gui.menus.switchToMenu('main');
            }
        }
    }
    
    // stop editing the active frame or node if there are no more touches on it
    if (this.editingState.object) {
        // TODO: touchesOnActiveVehicle returns 0 if you tapped through a fullscreen frame, because the touch targetId doesnt update to be the thing behind it
        var touchesOnActiveVehicle = this.currentScreenTouches.map(function(elt) { return elt.targetId; }).filter(function(touchTarget) {
            return (touchTarget === this.editingState.frame || touchTarget === this.editingState.node || touchTarget === "pocket-element");
        }.bind(this));

        var activeVehicle = this.getEditingVehicle();

        if (touchesOnActiveVehicle.length === 0) {
            console.log('this is the last touch - hide editing overlay');
            
            // TODO: if pocketNode.node === activeVehicle, move node to closestFrameToScreenPosition upon dropping it
            // if (activeVehicle === pocketNode.node) {
            //
            //     var closest = realityEditor.gui.ar.getClosestFrameToScreenCoordinates(event.pageX, event.pageY);
            //
            //     // set the name of the node by counting how many logic nodes the frame already has
            //     var closestFrame = realityEditor.getFrame(closest[0], closest[1]);
            //     var logicCount = Object.values(closestFrame.nodes).filter(function (node) {
            //         return node.type === 'logic'
            //     }).length;
            //     pocketNode.name = "LOGIC" + logicCount;
            //
            // }

            if (activeVehicle && !globalStates.editingMode) {
                globalDOMCache[(this.editingState.node || this.editingState.frame)].querySelector('.corners').style.visibility = 'hidden';
            }

            this.resetEditingState();

        } else {
            // if there's still a touch on it (it was being scaled), reset touch offset so vehicle doesn't jump
            this.editingState.touchOffset = null;
            realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.touches[0].pageX, event.touches[0].pageY, true);

        }
    }
    
    // if tap on background when no visible objects, auto-focus camera
    // if (event.target.id === 'canvas') {
    //     if (Object.keys(realityEditor.gui.ar.draw.visibleObjects).length === 0) {
    //         realityEditor.app.focusCamera();
    //     }
    // }
    
    this.callbackHandler.triggerCallbacks('onDocumentMultiTouchEnd', {event: event});
};

/**
 * @typedef {Object} ScreenEventObject
 * @desc Data structure to hold touch events to be sent to screens
 * @property {number|null} version
 * @property {string|null} object 
 * @property {string|null} frame
 * @property {string|null} node
 * @property {number} x
 * @property {number} y
 * @property {number} type
 * @property {Array.<{screenX: number, screenY: number, type: string}>} touches
 */

/**
 * @type {ScreenEventObject}
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
 * @param {TouchEvent} evt
 * @param {string} type
 * @param {Function} cb
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
            
            var didJustAddPocket = false;
            if (realityEditor.device.eventObject.object && realityEditor.device.eventObject.frame) {
                var existingEventFrame = realityEditor.getFrame(realityEditor.device.eventObject.object, realityEditor.device.eventObject.frame);
                didJustAddPocket = (existingEventFrame && existingEventFrame === pocketFrame.vehicle && pocketFrame.waitingToRender);
            }
            
            if (!didJustAddPocket) {
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

realityEditor.device.toolInteractionCallbacks = [];
realityEditor.device.onToolInteraction = function(callback) {
    this.toolInteractionCallbacks.push(callback);
};
