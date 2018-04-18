createNameSpace("realityEditor.device.touchEvents");

/*
        Event Caches - one array for each multi-touch target
 */

realityEditor.device.touchEvents.documentEventCache = {};
realityEditor.device.touchEvents.canvasEventCache = {};
realityEditor.device.touchEvents.elementEventCaches = {};
realityEditor.device.touchEvents.touchMoveTolerance = 100;

/*
        Misc. variables for touch interactions
 */

realityEditor.device.touchEvents.overlayDivs = {};
realityEditor.device.touchEvents.vehiclesBeingEdited = {};
realityEditor.device.touchEvents.touchEditingTimers = {};
realityEditor.device.touchEvents.initialScaleData = {};

/**
 * Finds the correct cache in which to store this event (based on its target), and adds it to that object.
 * @param event {PointerEvent}
 */
realityEditor.device.touchEvents.addEventToCache = function(event) {
    var thisCache = this.getCacheForEvent(event);
    if (thisCache && thisCache.constructor === Object) {
        // this makes TouchEvents and PointerEvents compatible
        if (!event.pointerId) {
            if (event.changedTouches) {
                event.pointerId = event.changedTouches[0].identifier;
            }
        }
        // this will cache a new pointer down event or update to a pointer move event if it is from the same pointer
        // but keep the timestamp of the original event
        if (!thisCache[event.pointerId]) {
            //event.timeStamp = thisCache[event.pointerId].timeStamp;
            event.initialTimeStamp = event.timeStamp;
        }
        thisCache[event.pointerId] = event;
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
    if (thisCache && thisCache.constructor === Object) {
        delete thisCache[event.pointerId];
        return;
    }
    console.warn('could not find this event in any caches', event);
    
    // try to remove from element cache in case the touch slipped away from the element and onto the background TODO shouldn't happen in the first place
    for (var elementCacheKey in this.elementEventCaches) {
        if (!this.elementEventCaches.hasOwnProperty(elementCacheKey)) continue;
        if (this.elementEventCaches[elementCacheKey][event.pointerId]) {
            delete this.elementEventCaches[elementCacheKey][event.pointerId];
            console.warn('found event in element cache - fix underlying bug to prevent this second search');
        }
    }
};

/**
 * Helper function for finding the correct cache for this event, based on its currentTarget.id
 * @param event {PointerEvent}
 * @return {Object} cache containing other events with the same target as the argument
 */
realityEditor.device.touchEvents.getCacheForEvent = function(event) {
    var eventTargetId = event.currentTarget.id;
    
    if (this.isDocumentEvent(event)) {
        return this.documentEventCache;
    } else if (eventTargetId === 'canvas') {
        return this.canvasEventCache;
    } else {
        // find the correct cache even if target changed due to the svg showing up
        eventTargetId = eventTargetId.replace(/^(svg)/,"");
        
        return this.elementEventCaches[eventTargetId];
    }
};

/**
 * Helper function to get a flattened array of all current PointerEvents stored in any cache
 * @return {Array.<PointerEvent>}
 */
realityEditor.device.touchEvents.getAllCachedEvents = function() {
    var allEventsList = [];
    allEventsList.push.apply(allEventsList, Object.values(this.documentEventCache));
    allEventsList.push.apply(allEventsList, Object.values(this.canvasEventCache));
    
    for (var eventTarget in this.elementEventCaches) {
        if (!this.elementEventCaches.hasOwnProperty(eventTarget)) continue;
        if (this.elementEventCaches[eventTarget].length > 0) {
            allEventsList.push.apply(allEventsList, Object.values(this.elementEventCaches[eventTarget]));
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
    var isMultitouch = Object.keys(cachedEvents).length > 1;
    
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

    if (this.isVehicleBeingEdited(activeVehicle)) {
        return; // No need to start a new hold timer or post events into the iframe if it's already being edited
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

// TODO: always base touchmove behavior off of the cached touchdown event - lookup based on pointerId even if on canvas - use a single touchmove and touchup handler function that implements this while keeping separate touchdowns to keep track of what you touched on
realityEditor.device.touchEvents.onElementTouchMove = function(event) {
    // event.stopPropagation();
    // console.log('onElementTouchMove');

    this.addEventToCache(event);

    // TODO: update cached event with same pointerId to be set to this event

    var cachedEvents = this.getCacheForEvent(event); 
    var isMultitouch = Object.keys(cachedEvents).length > 1;
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

            if (isMultitouch) {
                var sortedEventList = this.getTimeOrderedListFromCache(cachedEvents);
                var centerTouchEvent = sortedEventList[0];
                var outerTouchEvent = sortedEventList[1];
                this.scaleVehicle(activeVehicle, centerTouchEvent, outerTouchEvent);
            }

        } else {

            // If editing or temp editing, and single touch, move frame
            if (isPrimaryTouch) { // TODO: refactor this and multitouch version out of the if statement
                realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, event.pageX, event.pageY, true);
            }

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

    var numRemainingTouches = Object.keys(this.getCacheForEvent(event)).length;

    var activeVehicle = this.extractVehicleFromEvent(event);

    // TODO:
    // Nodes
    // If editing, stop editing
    // If not editing, create or cancel link-in-process
    // 
    // Frames
    
    // If editing, stop editing (if it is the last touch on the object)
    if (this.isVehicleBeingEdited(activeVehicle)) {
        
        if (numRemainingTouches === 0) {
            this.setVehicleEditing(activeVehicle, false);
        }
    
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

    // element.addEventListener('touchstart', this.onElementTouchDown.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('pointerdown', this.onElementTouchDown.bind(realityEditor.device.touchEvents), false);
    // element.addEventListener('pointermove', this.onElementTouchMove.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('touchmove', this.onElementTouchMove.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('pointerup', this.onElementTouchUp.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('pointercancel', this.onElementTouchUp.bind(realityEditor.device.touchEvents), false);
    
    this.elementEventCaches[elementId] = {};
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
        // show editing feedback SVG
        document.getElementById('svg' + activeVehicle.uuid).style.display = 'inline';
        this.vehiclesBeingEdited[activeVehicle.uuid] = activeVehicle;
    } else {
        document.getElementById('svg' + activeVehicle.uuid).style.display = 'none';
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
// realityEditor.device.touchEvents.isPrimaryTouchForElement = function(event) {
//     var cachedEvents = this.getCacheForEvent(event);
//     if (Object.values(cachedEvents).length === 1) {
//         return true;
//     }
//    
//     var earliestPointerId = Object.keys(cachedEvents).reduce(function(a,b) { return cachedEvents[a].timeStamp < cachedEvents[b].timeStamp ? a : b });
//     // var thisTouchIndex = cachedEvents.map(function(pointerEvent){ return pointerEvent.pointerId; }).indexOf(event.pointerId);
//     // return (thisTouchIndex === 0);
//    
//     return event.pointerId === earliestPointerId;
// };
realityEditor.device.touchEvents.isPrimaryTouchForElement = function(event){
    var cachedEvents = this.getCacheForEvent(event);
    var sortedEventList = this.getTimeOrderedListFromCache(cachedEvents);
    return event.pointerId === sortedEventList[0].pointerId;
};

/**
 * Helper function that takes a cache object and returns it as an array sorted by the events' initialTimeStamp property
 * @param cachedEvents {Object} 
 * @return {Array.<PointerEvent>}
 */
realityEditor.device.touchEvents.getTimeOrderedListFromCache = function(cachedEvents) {
    var eventsArray = Object.values(cachedEvents);
    return eventsArray.sort(function(a, b) {
        return a.initialTimeStamp - b.initialTimeStamp;
    });
};

/**
 * Scales the specified frame or node using the first two touches 
 * @param centerTouchEvent {PointerEvent} the first touch event, where the scale is centered from
 * @param outerTouchEvent {PointerEvent} the other touch, where the scale extends to
 */
realityEditor.device.touchEvents.scaleVehicle = function(activeVehicle, centerTouchEvent, outerTouchEvent) {

    var dx = centerTouchEvent.pageX - outerTouchEvent.pageX;
    var dy = centerTouchEvent.pageY - outerTouchEvent.pageY;
    var radius = Math.sqrt(dx * dx + dy * dy);
    
    var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
    var thisInitialScaleData = this.initialScaleData[activeVehicle];
    
    if (!thisInitialScaleData) {
        this.initialScaleData[activeVehicle] = {
            radius: radius,
            scale: positionData.scale
        };
        return; // TODO: return or not?
    }
    
    // calculate the new scale based on the radius between the two touches
    var newScale = thisInitialScaleData.scale + (radius - thisInitialScaleData.radius) / 300;
    if (typeof newScale !== 'number') return;
    positionData.scale = Math.max(0.002, newScale); // 0.002 is the minimum scale allowed

    // redraw circles to visualize the new scaling
    globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);
    
    // draw a blue circle visualizing the initial radius
    var circleCenterCoordinates = [centerTouchEvent.pageX, centerTouchEvent.pageY];
    var circleEdgeCoordinates = [outerTouchEvent.pageX, outerTouchEvent.pageY];
    realityEditor.gui.ar.lines.drawBlue(globalCanvas.context, circleCenterCoordinates, circleEdgeCoordinates, thisInitialScaleData.radius);

    // draw a red or green circle visualizing the new radius
    if (radius < thisInitialScaleData.radius) {
        realityEditor.gui.ar.lines.drawRed(globalCanvas.context, circleCenterCoordinates, circleEdgeCoordinates, radius);
    } else {
        realityEditor.gui.ar.lines.drawGreen(globalCanvas.context, circleCenterCoordinates, circleEdgeCoordinates, radius);
    }
};
