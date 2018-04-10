createNameSpace("realityEditor.device.touchEvents");

/*
        Event Caches
 */

realityEditor.device.touchEvents.canvasEventCache = [];
realityEditor.device.touchEvents.elementEventCaches = {};

realityEditor.device.touchEvents.overlayDivs = {};

realityEditor.device.touchEvents.addEventToCache = function(event) {
    var eventTargetId = event.currentTarget.id;
    
    if (eventTargetId === 'canvas') {
        this.canvasEventCache.push(event);
    } else {
        this.elementEventCaches[eventTargetId].push(event);
    }
};

realityEditor.device.touchEvents.removeEventFromCache = function(event) {
    var eventTargetId = event.currentTarget.id;
    var index;
    
    if (eventTargetId === 'canvas') {
        index = this.canvasEventCache.map(function(pointerEvent){ return pointerEvent.pointerId; }).indexOf(event.pointerId);
        if (index !== -1) {
            this.canvasEventCache.splice(index, 1);
        }
        
    } else {
        index = this.elementEventCaches[eventTargetId].map(function(pointerEvent){ return pointerEvent.pointerId; }).indexOf(event.pointerId);
        if (index !== -1) {
            this.elementEventCaches[eventTargetId].splice(index, 1);
        }
    }
};

realityEditor.device.touchEvents.getTheseCachedEvents = function(event) {
    var eventTargetId = event.currentTarget.id;
    if (eventTargetId === 'canvas') {
        return this.canvasEventCache;
    } else {
        return this.elementEventCaches[eventTargetId];
    }
};

realityEditor.device.touchEvents.getAllCachedEvents = function() {
    var allEventsList = [];
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

realityEditor.device.touchEvents.onCanvasTouchDown = function(event) {
    event.stopPropagation();
    
    this.addEventToCache(event);
    
    // TODO
    // if UI mode, start creating a memory pointer?
    // if node mode, set first point on the cut line
    
    // show an overlay div for each finger pressed
    this.showOverlay(event);
    this.moveOverlay(event);
};

realityEditor.device.touchEvents.onCanvasTouchMove = function(event) {
    event.stopPropagation();

    var cachedEvents = this.getAllCachedEvents();
    var isMultitouch = cachedEvents.length > 1;
    
    console.log(isMultitouch, cachedEvents);
    
    // TODO:
    // if UI mode, move memory pointer
    // if node mode, draw cut line from start point
    // move overlay div for associated event
    this.moveOverlay(event);
    
    // if multi-touch and another touch exists on an element, scale that element
    if (isMultitouch) {
        cachedEvents.forEach(function(event) {
            // if event is on a frame or a node...
        })
    }
};

realityEditor.device.touchEvents.onCanvasTouchUp = function(event) {
    event.stopPropagation();

    this.removeEventFromCache(event);
    
    // TODO:
    // if UI mode, stop memory pointer
    // if node mode, stop cut line and delete crossed links
    
    // hide overlay div for associated event
    this.hideOverlay(event);
    
    // if scaling, stop scaling
};

realityEditor.device.touchEvents.onElementTouchDown = function(event) {
    event.stopPropagation();

    this.addEventToCache(event);
    
    // TODO:
    // Nodes
    // If logic node, show color ports
    // Start drawing link
    // Start hold timer to begin temp editing mode
    //
    // Frames
    // Post event into iframe
    // Start hold timer to begin temp editing mode
    
    // update state of currently edited element(s)
};

realityEditor.device.touchEvents.onElementTouchMove = function(event) {
    event.stopPropagation();

    var cachedEvents = this.getTheseCachedEvents(event);
    var isMultitouch = cachedEvents.length > 1;

    console.log(isMultitouch, cachedEvents);
    
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
};

realityEditor.device.touchEvents.onElementTouchUp = function(event) {
    event.stopPropagation();

    this.removeEventFromCache(event);
    
    // TODO:
    // Nodes
    // If editing, stop editing
    // If not editing, create or cancel link-in-process
    // 
    // Frames
    // If editing, stop editing
    // If not editing, post event into iframe
    
    // update state of currently edited element(s)
};

/*
        Event Setup
 */

realityEditor.device.touchEvents.addCanvasTouchListeners = function() {
    globalCanvas.canvas.addEventListener('pointerdown', this.onCanvasTouchDown.bind(realityEditor.device.touchEvents), false);
    globalCanvas.canvas.addEventListener('pointermove', this.onCanvasTouchMove.bind(realityEditor.device.touchEvents), false);
    globalCanvas.canvas.addEventListener('pointerup', this.onCanvasTouchUp.bind(realityEditor.device.touchEvents), false);
    globalCanvas.canvas.addEventListener('pointercancel', this.onCanvasTouchUp.bind(realityEditor.device.touchEvents), false);
};

realityEditor.device.touchEvents.addTouchListenersForElement = function(objectKey, frameKey, nodeKey) {
    var activeKey = nodeKey || frameKey;
    var elementId = 'cover' + activeKey;
    var element = globalDOMCache[elementId];
    
    element.addEventListener('pointerdown', this.onElementTouchDown.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('pointermove', this.onElementTouchMove.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('pointerup', this.onElementTouchUp.bind(realityEditor.device.touchEvents), false);
    element.addEventListener('pointercancel', this.onElementTouchUp.bind(realityEditor.device.touchEvents), false);
    
    this.elementEventCaches[elementId] = [];
};

// we never actually need to remove touch listeners from an element, but at least delete the event cache
realityEditor.device.touchEvents.removeTouchListenersForElement = function(objectKey, frameKey, nodeKey) {
    var activeKey = nodeKey || frameKey;
    var elementId = 'cover' + activeKey;

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
    thisEventOverlay.style.transform = 'translate3d(' + event.clientX + 'px,' + event.clientY + 'px, 6px)';
    // thisEventOverlay.style.left = event.pageX + 'px';
    // thisEventOverlay.style.top = event.pageY + 'px';
};

realityEditor.device.touchEvents.hideOverlay = function(event) {
    overlayContainer.removeChild(this.overlayDivs[event.pointerId]);
    delete this.overlayDivs[event.pointerId];
};

realityEditor.device.touchEvents.extractVehicleFromEvent = function(event) {

    var eventTargetId = event.currentTarget.id;
    console.log(eventTargetId);

    // TODO: return objectKey, frameKey, nodeKey (and maybe the activeVehicle itself)
    var objectKey;
    var frameKey;
    var nodeKey;

    // return event.currentTarget;
};

