createNameSpace("realityEditor.device.touchEvents");

/*
        Event Caches
 */

realityEditor.device.touchEvents.documentEventCache = [];
realityEditor.device.touchEvents.canvasEventCache = [];
realityEditor.device.touchEvents.elementEventCaches = {};

realityEditor.device.touchEvents.overlayDivs = {};
realityEditor.device.touchEvents.vehiclesBeingEdited = [];
realityEditor.device.touchEvents.touchEditingTimers = {};

realityEditor.device.touchEvents.addEventToCache = function(event) {
    var eventTargetId = event.currentTarget.id;
    
    if (this.isDocumentEvent(event)) {
        this.documentEventCache.push(event);
    } else if (eventTargetId === 'canvas') {
        this.canvasEventCache.push(event);
    } else {
        this.elementEventCaches[eventTargetId].push(event);
    }
};

realityEditor.device.touchEvents.removeEventFromCache = function(event) {
    var eventTargetId = event.currentTarget.id;
    var thisCache;

    if (this.isDocumentEvent(event)) {
        thisCache = this.documentEventCache;
    } else if (eventTargetId === 'canvas') {
        thisCache = this.canvasEventCache;
    } else {
        thisCache = this.elementEventCaches[eventTargetId];
    }

    var index = thisCache.map(function(pointerEvent){ return pointerEvent.pointerId; }).indexOf(event.pointerId);
    if (index !== -1) {
        thisCache.splice(index, 1);
    }
    
    // if (this.isDocumentEvent(event)) {
    //     index = this.documentEventCache.map(function(pointerEvent){ return pointerEvent.pointerId; }).indexOf(event.pointerId);
    //     if (index !== -1) {
    //         this.canvasEventCache.splice(index, 1);
    //     }
    //    
    // } else if (eventTargetId === 'canvas') {
    //     index = this.canvasEventCache.map(function(pointerEvent){ return pointerEvent.pointerId; }).indexOf(event.pointerId);
    //     if (index !== -1) {
    //         this.canvasEventCache.splice(index, 1);
    //     }
    //    
    // } else {
    //     index = this.elementEventCaches[eventTargetId].map(function(pointerEvent){ return pointerEvent.pointerId; }).indexOf(event.pointerId);
    //     if (index !== -1) {
    //         this.elementEventCaches[eventTargetId].splice(index, 1);
    //     }
    // }
};

realityEditor.device.touchEvents.getTheseCachedEvents = function(event) {
    var eventTargetId = event.currentTarget.id;
    
    if (this.isDocumentEvent(event)) {
        return this.documentEventCache;
    } else if (eventTargetId === 'canvas') {
        return this.canvasEventCache;
    } else {
        return this.elementEventCaches[eventTargetId];
    }
};

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
                Document Events
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
                Canvas Events
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
                Element Events
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
    
    // TODO:
    // Nodes
    // If logic node, show color ports
    // Start drawing link
    // Start hold timer to begin temp editing mode
    //
    // Frames
    // Post event into iframe
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
    // Start hold timer to begin temp editing mode
    this.touchEditingTimers[activeVehicle.uuid] = setTimeout(function() {
        console.log('begin touch editing for ' + activeVehicle.uuid);
    }, 400);
    
    // update state of currently edited element(s)
};

realityEditor.device.touchEvents.onElementTouchMove = function(event) {
    // event.stopPropagation();
    // console.log('onElementTouchMove');

    var cachedEvents = this.getTheseCachedEvents(event);
    var isMultitouch = cachedEvents.length > 1;

    console.log(isMultitouch, cachedEvents);

    var activeVehicle = this.extractVehicleFromEvent(event);


    // TODO:
    // Nodes
    // If editing or temp editing, and single touch, move node
    // If editing or temp editing, and multi-touch, scale node
    // If not editing, draw link and cancel hold timer
    //
    // Frames
    // If editing or temp editing, and single touch, move frame
    // If editing or temp editing, and multi-touch, scale frame
    // If not editing, post event into iframe and cancel hold timer
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
    
    // TODO: cancel touchediting timer, and add this vehicle to the vehicles being edited list, and only post touches if not editing
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
    
    // update state of currently edited element(s)
};

/*
        Event Setup
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

realityEditor.device.touchEvents.addTouchListenersForElement = function(objectKey, frameKey, nodeKey) {
    var activeKey = nodeKey || frameKey;
    var elementId = /*'cover' + */activeKey;
    var element = globalDOMCache[elementId];
    
    if (activeKey === nodeKey) {
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

// we never actually need to remove touch listeners from an element, but at least delete the event cache
realityEditor.device.touchEvents.removeTouchListenersForElement = function(objectKey, frameKey, nodeKey) {
    var activeKey = nodeKey || frameKey;
    var elementId = /*'cover' + */activeKey;

    if (typeof this.elementEventCaches[elementId] !== undefined) {
        delete this.elementEventCaches[elementId];
    }
};

/*
        Event Helpers
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

realityEditor.device.touchEvents.moveOverlay = function(event) {
    var thisEventOverlay = this.overlayDivs[event.pointerId];
    if (thisEventOverlay) {
        thisEventOverlay.style.transform = 'translate3d(' + event.clientX + 'px,' + event.clientY + 'px, 6px)';
    }
};

realityEditor.device.touchEvents.hideOverlay = function(event) {
    if (this.overlayDivs[event.pointerId]) {
        overlayContainer.removeChild(this.overlayDivs[event.pointerId]);
        delete this.overlayDivs[event.pointerId];
    }
};

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

realityEditor.device.touchEvents.isDocumentEvent = function(event) {
    if (event && event.currentTarget) {
        if (event.currentTarget.firstElementChild) {
            return event.currentTarget.firstElementChild.tagName === "HTML";
        }
    }
    return false;
};
