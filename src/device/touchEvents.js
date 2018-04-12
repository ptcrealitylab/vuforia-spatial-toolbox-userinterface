createNameSpace("realityEditor.device.touchEvents");

/*
        Event Caches - one array for each multi-touch target
 */

realityEditor.device.touchEvents.documentEventCache = [];
realityEditor.device.touchEvents.canvasEventCache = [];
realityEditor.device.touchEvents.elementEventCaches = {};
realityEditor.device.touchEvents.touchMoveTolerance = 100;

/*
        Misc. variables for touch interactions
 */

realityEditor.device.touchEvents.overlayDivs = {};
realityEditor.device.touchEvents.vehiclesBeingEdited = [];
realityEditor.device.touchEvents.touchEditingTimers = {};

/**
 * Finds the correct cache in which to store this event (based on its target), and adds it to that array.
 * @param event {PointerEvent}
 */
realityEditor.device.touchEvents.addEventToCache = function(event) {
    var thisCache = this.getCacheForEvent(event);
    if (thisCache && thisCache.constructor === Array) {
        thisCache.push(event);
        return;
    }
    console.warn('cannot find cache for this event', event);
};

/**
 * Removes the event from the cache it belongs to, if any.
 * @param event {PointerEvent}
 */
realityEditor.device.touchEvents.removeEventFromCache = function(event) {
    var thisCache = this.getCacheForEvent(event);
    if (thisCache && thisCache.constructor === Array) {
        var index = thisCache.map(function(pointerEvent){ return pointerEvent.pointerId; }).indexOf(event.pointerId);
        if (index !== -1) {
            thisCache.splice(index, 1);
            return;
        }
    }
    console.warn('could not find this event in any caches', event);
};

/**
 * Helper function for finding the correct cache for this event, based on its currentTarget.id
 * @param event {PointerEvent}
 * @return {Array} cache containing other events with the same target as the argument
 */
realityEditor.device.touchEvents.getCacheForEvent = function(event) {
    var eventTargetId = event.currentTarget.id;
    
    if (this.isDocumentEvent(event)) {
        return this.documentEventCache;
    } else if (eventTargetId === 'canvas') {
        return this.canvasEventCache;
    } else {
        return this.elementEventCaches[eventTargetId];
    }
};

/**
 * Helper function to get a flattened array of all current PointerEvents stored in any cache
 * @return {Array}
 */
realityEditor.device.touchEvents.getAllCachedEvents = function() {
    var allEventsList = [];
    allEventsList.push.apply(allEventsList, this.documentEventCache);
    allEventsList.push.apply(allEventsList, this.canvasEventCache);
    
    for (var eventTarget in this.elementEventCaches) {
        if (!this.elementEventCaches.hasOwnProperty(eventTarget)) continue;
        if (this.elementEventCaches[eventTarget].length > 0) {
            allEventsList.push.apply(allEventsList, this.elementEventCaches[eventTarget]);
        }
    }
    
    return allEventsList;
};

/*
        Event Handlers
 */

/*
                Document Events - Used to provide visual feedback for each touch using the touchOverlayDivs
 */
realityEditor.device.touchEvents.onDocumentTouchDown = function(event) {
    // console.log('onDocumentTouchDown');

    this.addEventToCache(event);
    // show an overlay div for each finger pressed
    this.showOverlay(event);
    this.moveOverlay(event);
};

realityEditor.device.touchEvents.onDocumentTouchMove = function(event) {
    this.moveOverlay(event);
};

realityEditor.device.touchEvents.onDocumentTouchUp = function(event) {
    // console.log('onDocumentTouchUp');

    this.removeEventFromCache(event);
    // hide overlay div for associated event
    this.hideOverlay(event);
};

/*
                Canvas Events - used for capturing multi-touch on the background to support scaling frames and nodes
 */
realityEditor.device.touchEvents.onCanvasTouchDown = function(event) {
    // event.stopPropagation();
    console.log('onCanvasTouchDown');

    this.addEventToCache(event);
    
    // TODO
    // if UI mode, start creating a memory pointer?
    // if node mode, set first point on the cut line
};

realityEditor.device.touchEvents.onCanvasTouchMove = function(event) {
    // event.stopPropagation();

    var cachedEvents = this.getAllCachedEvents();
    var isMultitouch = cachedEvents.length > 1;
    
    // console.log(isMultitouch, cachedEvents);
    
    // TODO:
    // if UI mode, move memory pointer
    // if node mode, draw cut line from start point
    
    // if multi-touch and another touch exists on an element, scale that element
    if (isMultitouch) {
        cachedEvents.forEach(function(event) {
            // if event is on a frame or a node...
        })
    }
};

realityEditor.device.touchEvents.onCanvasTouchUp = function(event) {
    // event.stopPropagation();
    console.log('onCanvasTouchUp');

    this.removeEventFromCache(event);
    
    // TODO:
    // if UI mode, stop memory pointer
    // if node mode, stop cut line and delete crossed links
    
    // if scaling, stop scaling
};

/*
                Element Events - used to reposition frames and nodes and interact with their iframe contents
 */
realityEditor.device.touchEvents.onElementTouchDown = function(event) {
    // event.stopPropagation();
    console.log('onElementTouchDown');

    this.addEventToCache(event);
    
    var activeVehicle = this.extractVehicleFromEvent(event);
    
    if (activeVehicle.type === 'node' || activeVehicle.type === 'logic') {
        console.log('touched down on node', activeVehicle);
    } else {
        console.log('touched down on frame', activeVehicle);
    }

    // Start hold timer to begin temp editing mode
    var timeoutFunction = setTimeout(function() {
        clearTimeout(this.touchEditingTimers[activeVehicle.uuid]);
        delete this.touchEditingTimers[activeVehicle.uuid];
        console.log('begin touch editing for ' + activeVehicle.uuid);

        // add this vehicle to the vehicles being edited list
        this.setVehicleEditing(activeVehicle, true);

    }.bind(this), 400);

    // store timeout function along with start coordinates in a table where it can be retrieved when the touch moves
    this.touchEditingTimers[activeVehicle.uuid] = {
        startX: event.pageX,
        startY: event.pageY,
        timeoutFunction: timeoutFunction
    };
    
    // TODO:
    // Nodes
    // If logic node, show color ports
    // Start drawing link
    //
    // Frames
    // Post event into iframe // TODO: just for frames or for nodes too?
    var iframe = document.getElementById('iframe' + activeVehicle.uuid);
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
    
    // update state of currently edited element(s)
    // TODO: if editing mode is on, set this element to being edited immediately, otherwise start the hold timer
};

realityEditor.device.touchEvents.onElementTouchMove = function(event) {
    // event.stopPropagation();
    // console.log('onElementTouchMove');

    var cachedEvents = this.getCacheForEvent(event);
    var isMultitouch = cachedEvents.length > 1;
    var isPrimaryTouch = this.isPrimaryTouchForElement(event);

    // console.log(isMultitouch, cachedEvents);

    var activeVehicle = this.extractVehicleFromEvent(event);

    // If you move further than a certain threshold, cancel touch editing timer and set this vehicle as not being edited
    var thisTouchEditingTimer = this.touchEditingTimers[activeVehicle.uuid];
    if (thisTouchEditingTimer) {
        
        var dx = event.pageX - thisTouchEditingTimer.startX;
        var dy = event.pageY - thisTouchEditingTimer.startY;
        if (dx * dx + dy * dy > this.touchMoveTolerance) {
            clearTimeout(thisTouchEditingTimer.timeoutFunction);
            delete this.touchEditingTimers[activeVehicle.uuid];
            console.log('moved within 400ms - cancel hold timer for ' + activeVehicle.uuid);

            // make sure this vehicle is set as NOT being edited
            // this.setVehicleEditing(activeVehicle, false); // TODO: would this ever be necessary here?
        }
    }
    
    // TODO:
    // Nodes
    // If editing or temp editing, and single touch, move node
    // If editing or temp editing, and multi-touch, scale node
    // If not editing, draw link and cancel hold timer
    //
    // Frames


    if (this.isVehicleBeingEdited(activeVehicle)) {
        
        if (isMultitouch) {

            // If editing or temp editing, and multi-touch, scale frame
            
            // var touch;
            // realityEditor.gui.ar.positioning.onScaleEvent(touch); // TODO: rewrite this method to use current data
            
            // var thisTouchIndex = cachedEvents.indexOf(event);

            // also move the element to the touch coordinates
            if (isPrimaryTouch) {
                realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.pageX, event.pageY, true);
            }

            /*
                    var firstTouch = evt.touches[0];
        globalStates.editingModeObjectX = firstTouch.pageX;
        globalStates.editingModeObjectY = firstTouch.pageY;
        globalStates.editingModeObjectCenterX = firstTouch.pageX;
        globalStates.editingModeObjectCenterY = firstTouch.pageY;
        var tempThisObject = realityEditor.device.getEditingModeObject();
        realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(tempThisObject, evt.pageX, evt.pageY, true);
        var positionData = realityEditor.gui.ar.positioning.getPositionData(tempThisObject);
        if (globalStates.unconstrainedPositioning === true) {
            console.log('write to matrix -- should be relativeMatrix');
            var resultMatrix = [];
            realityEditor.gui.ar.utilities.multiplyMatrix(tempThisObject.begin, realityEditor.gui.ar.utilities.invertMatrix(tempThisObject.temp), resultMatrix);
            realityEditor.gui.ar.positioning.setWritableMatrix(tempThisObject, resultMatrix);
        }
        var secondTouch = evt.touches[1];
        realityEditor.gui.ar.positioning.onScaleEvent(secondTouch);
             */


        } else {

            // If editing or temp editing, and single touch, move frame
            if (isPrimaryTouch) {
                realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.pageX, event.pageY, true);
            }
            
            /*
            // if (globalStates.editingModeHaveObject && (globalStates.editingMode || globalStates.tempEditingMode) && (evt.targetTouches.length === 1 || (evt.pageX && evt.pageY))) {
            var touch = evt.touches[0];

            globalStates.editingModeObjectX = touch.pageX;
            globalStates.editingModeObjectY = touch.pageY;
            globalStates.editingModeObjectCenterX = touch.pageX;
            globalStates.editingModeObjectCenterY = touch.pageY;

            var tempThisObject = realityEditor.device.getEditingModeObject();

            realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(tempThisObject, evt.pageX, evt.pageY, true);

            var positionData = realityEditor.gui.ar.positioning.getPositionData(tempThisObject);

            if (globalStates.unconstrainedPositioning === true) {
                // console.log('unconstrained move');
                console.log('write to matrix -- should be relativeMatrix');
                var resultMatrix = [];
                realityEditor.gui.ar.utilities.multiplyMatrix(tempThisObject.begin, realityEditor.gui.ar.utilities.invertMatrix(tempThisObject.temp), resultMatrix);
                realityEditor.gui.ar.positioning.setWritableMatrix(tempThisObject, resultMatrix);
            
            } else if ( ((tempThisObject.type === 'ui' && tempThisObject.visualization === 'ar') || tempThisObject.type === 'node' || tempThisObject.type === 'logic') && !globalStates.freezeButtonState) { // don't allow pop if on screen or frozen background
                var screenFrameMatrix = realityEditor.gui.ar.utilities.repositionedMatrix(realityEditor.gui.ar.draw.visibleObjects[tempThisObject.objectId], tempThisObject);
                var distanceToFrame = screenFrameMatrix[14];
                if (!globalStates.unconstrainedSnapInitialPosition) {
                    globalStates.unconstrainedSnapInitialPosition = distanceToFrame;
                } else {
                    var threshold = 100;
                    if (distanceToFrame - globalStates.unconstrainedSnapInitialPosition > threshold) {
                        console.log('pop into unconstrained editing mode');
                        realityEditor.app.tap();
                        globalStates.unconstrainedSnapInitialPosition = null;
                        globalStates.unconstrainedPositioning = true;
                         globalStates.editingMode = true;
                        realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;
                        realityEditor.gui.ar.draw.matrix.matrixtouchOn = tempThisObject.uuid;
                        globalStates.tempUnconstrainedPositioning = true;
                        // realityEditor.gui.menus.on("editing", ["unconstrained"]);
                    }
                }
            }
             */

        }
        
        
    // If not editing, post the touches into the iframe to interact with its contents
    } else {

        var iframe = document.getElementById('iframe' + activeVehicle.uuid);
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
        
    }
    
};

realityEditor.device.touchEvents.onElementTouchUp = function(event) {
    // event.stopPropagation();
    console.log('onElementTouchUp');

    this.removeEventFromCache(event);

    var activeVehicle = this.extractVehicleFromEvent(event);

    // TODO:
    // Nodes
    // If editing, stop editing
    // If not editing, create or cancel link-in-process
    // 
    // Frames
    
    // If editing, stop editing
    if (this.isVehicleBeingEdited(activeVehicle)) {
        
        this.setVehicleEditing(activeVehicle, false);
    
    } else {

        // If not editing, post event into iframe
        var iframe = document.getElementById('iframe' + activeVehicle.uuid);
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
        
    }
    

    
    // update state of currently edited element(s)
};

/*
        Event Setup
 */

/**
 * Initializes pointer event listeners for the document (the entire screen) and the globalCanvas (the background)
 * Documentation for pointer events found at (https://github.com/jquery/PEP)
 */
realityEditor.device.touchEvents.addCanvasTouchListeners = function() {
    // add canvas touch listeners to handle background touch actions (e.g. scaling with one finger on background)
    globalCanvas.canvas.addEventListener('pointerdown', this.onCanvasTouchDown.bind(realityEditor.device.touchEvents), false);
    globalCanvas.canvas.addEventListener('pointermove', this.onCanvasTouchMove.bind(realityEditor.device.touchEvents), false);
    globalCanvas.canvas.addEventListener('pointerup', this.onCanvasTouchUp.bind(realityEditor.device.touchEvents), false);
    globalCanvas.canvas.addEventListener('pointercancel', this.onCanvasTouchUp.bind(realityEditor.device.touchEvents), false);

    // add document touch listeners so that the overlayDivs show regardless of where you touch on the screen
    document.addEventListener('pointerdown', this.onDocumentTouchDown.bind(realityEditor.device.touchEvents), false);
    document.addEventListener('pointermove', this.onDocumentTouchMove.bind(realityEditor.device.touchEvents), false);
    document.addEventListener('pointerup', this.onDocumentTouchUp.bind(realityEditor.device.touchEvents), false);
    document.addEventListener('pointercancel', this.onDocumentTouchUp.bind(realityEditor.device.touchEvents), false);
};

/**
 * Adds pointer event listeners for the div covering the iframe for the frame or node specified by the provided keys
 * @param objectKey {string} - uuid of the object
 * @param frameKey {string} - uuid of the frame
 * @param nodeKey {string|undefined} - optional uuid of the node. if not specified, the frame becomes the active element.
 */
realityEditor.device.touchEvents.addTouchListenersForElement = function(objectKey, frameKey, nodeKey) {
    var elementId = nodeKey || frameKey;
    var element = globalDOMCache[elementId];
    
    if (elementId === nodeKey) {
        console.log('added new touch listeners for node');
    } else {
        console.log('added new touch listeners for frame');
    }
    
    element.addEventListener('pointerdown', this.onElementTouchDown.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('pointermove', this.onElementTouchMove.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('pointerup', this.onElementTouchUp.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('pointercancel', this.onElementTouchUp.bind(realityEditor.device.touchEvents), false);
    
    this.elementEventCaches[elementId] = [];
};
 
/**
 * Removes the event cache for the specified element.
 * We never actually need to remove touch listeners from an element, but at least delete the cache.
 * @param objectKey {string} - uuid of the object
 * @param frameKey {string} - uuid of the frame
 * @param nodeKey {string|undefined} - optional uuid of the node. if not specified, the frame becomes the active element.
 */
realityEditor.device.touchEvents.removeTouchListenersForElement = function(objectKey, frameKey, nodeKey) {
    var elementId = nodeKey || frameKey;

    if (typeof this.elementEventCaches[elementId] !== undefined) {
        delete this.elementEventCaches[elementId];
    }
};

/*
        Event Helpers
 */

/**
 * Provides visual feedback by creating a new circle image, and keeps track of it by associating the div
 * with the event's pointerId (to support multi-touch visual feedback)
 * @param event {PointerEvent}
 */
realityEditor.device.touchEvents.showOverlay = function(event) {
    var newOverlayDiv = document.createElement('div');
    newOverlayDiv.classList.add('Interfaces');
    newOverlayDiv.classList.add('overlay');
    newOverlayDiv.addEventListener('touchstart', function (e) {
        e.preventDefault();
    });
    
    this.overlayDivs[event.pointerId] = newOverlayDiv;
    overlayContainer.appendChild(newOverlayDiv);
};

/**
 * Moves the touch overlay associated with the specified pointer event to be centered around it
 * @param event {PointerEvent}
 */
realityEditor.device.touchEvents.moveOverlay = function(event) {
    var thisEventOverlay = this.overlayDivs[event.pointerId];
    if (thisEventOverlay) {
        thisEventOverlay.style.transform = 'translate3d(' + event.clientX + 'px,' + event.clientY + 'px, 6px)';
    }
};

/**
 * Removes the touch overlay for this pointer event from the DOM
 * @param event {PointerEvent}
 */
realityEditor.device.touchEvents.hideOverlay = function(event) {
    if (this.overlayDivs[event.pointerId]) {
        overlayContainer.removeChild(this.overlayDivs[event.pointerId]);
        delete this.overlayDivs[event.pointerId];
    }
};

/**
 * Given an event on a frame or node's overlay element, returns the data object for that frame or node
 * @param event {PointerEvent}
 * @return {Frame|Node}
 */
realityEditor.device.touchEvents.extractVehicleFromEvent = function(event) {
    var iframe = document.getElementById('iframe' + event.currentTarget.id);
    if (iframe) {
        var objectKey = iframe.dataset.objectKey;
        var frameKey = iframe.dataset.frameKey;
        var nodeKey = iframe.dataset.nodeKey;
        if (nodeKey === "null") nodeKey = null;
        
        if (nodeKey) {
            return realityEditor.getNode(objectKey, frameKey, nodeKey);
        }
        
        return realityEditor.getFrame(objectKey, frameKey);
    }
};

/**
 * Helper function for determining if the event's target is the document itself
 * @param event {PointerEvent}
 * @return {boolean}
 */
realityEditor.device.touchEvents.isDocumentEvent = function(event) {
    if (event && event.currentTarget) {
        if (event.currentTarget.firstElementChild) {
            return event.currentTarget.firstElementChild.tagName === "HTML";
        }
    }
    return false;
};

/**
 * Marks a frame or node as edited by adding or removing a flag in the vehiclesBeingEdited dictionary.
 * @param activeVehicle {Frame|Node}
 * @param isEditing {boolean}
 */
realityEditor.device.touchEvents.setVehicleEditing = function(activeVehicle, isEditing) {
    if (isEditing) {
        this.vehiclesBeingEdited[activeVehicle.uuid] = activeVehicle;
    } else {
        delete this.vehiclesBeingEdited[activeVehicle.uuid];
    }
};

/**
 * Helper function that returns whether a frame or node is marked as currently being edited.
 * @param activeVehicle
 * @return {boolean}
 */
realityEditor.device.touchEvents.isVehicleBeingEdited = function(activeVehicle) {
    return !!this.vehiclesBeingEdited[activeVehicle.uuid];
};

/**
 * Helper function to determine if a given touch was the first touch on an element.
 * (Can be used to determine which touch an element should move to if it was multi-touched)
 * @param event {PointerEvent}
 * @return {boolean}
 */
realityEditor.device.touchEvents.isPrimaryTouchForElement = function(event) {
    var cachedEvents = this.getCacheForEvent(event);
    var thisTouchIndex = cachedEvents.map(function(pointerEvent){ return pointerEvent.pointerId; }).indexOf(event.pointerId);
    return (thisTouchIndex === 0);
};
