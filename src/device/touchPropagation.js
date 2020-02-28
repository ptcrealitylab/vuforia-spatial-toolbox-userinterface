createNameSpace("realityEditor.device.touchPropagation");

/**
 * @fileOverview realityEditor.device.touchPropagation.js
 * Allows touches to be rejected or accepted by fullscreen and non-fullscreen frames,
 * and to pass through them to the next overlapping frame if possible
 */

(function(exports) {

    /**
     * The cachedTarget stores which frame ultimately accepted your touchdown event,
     * so that it can be used as the target for future touchmove events rather than recalculating each time.
     * @type {string} - uuid of the frame
     */
    var cachedTarget = null;

    /**
     * Sets up the touch propagation model by listening for accepted and unaccepted touches
     */
    function initService() {
        // listen for messages posted up from frame content windows
        realityEditor.network.addPostMessageHandler('unacceptedTouch', handleUnacceptedTouch);
        realityEditor.network.addPostMessageHandler('acceptedTouch', handleAcceptedTouch);

        // be notified when certain touch event functions get triggered in device/index.js
        realityEditor.device.registerCallback('resetEditingState', resetCachedTarget);
        realityEditor.device.registerCallback('onDocumentMultiTouchEnd', resetCachedTarget);
        
        // handle touch events that hit realityInteraction divs within frames
        realityEditor.network.addPostMessageHandler('pointerDownResult', handlePointerDownResult);
    }
    
    function handlePointerDownResult(eventData, fullMessageContent) {
        // pointerDownResult
        console.log(eventData, fullMessageContent);
        
        if (eventData === 'interaction') {
            console.log('TODO: cancel the moveDelay timer to prevent accidental moves?');
        } else if (eventData === 'nonInteraction') {
            console.log('TODO: immediately begin moving!');
            realityEditor.device.beginTouchEditing(fullMessageContent.object, fullMessageContent.frame, null);
            // clear the timer that would start dragging the previously traversed frame
            realityEditor.device.clearTouchTimer();

        }
    }

    /**
     * When a touch goes into an frame that has registered a touchDecider function, it has the option to reject a touch
     * (meaning the touch did not collide with any of its contents). In this case, we calculate the next frame underneath
     * that one, (if any), and send the touch into it to see whether this one will accept it.
     * @param {{x: number, y: number, pointerId: number, type: string, pointerType: string}} eventData - touch event data
     * @param {Object} fullMessageContent - the full JSON message posted by the frame, including ID of its object, frame, etc
     */
    function handleUnacceptedTouch(eventData, fullMessageContent) {
        
        console.log('handleUnacceptedTouch');
        // eventData.x is the x coordinate projected within the previouslyTouched iframe. we need to get position on screen
        var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
        eventData.x = touchPosition.x;
        eventData.y = touchPosition.y;

        // clear the timer that would start dragging the previously traversed frame
        realityEditor.device.clearTouchTimer();
        
        // don't recalculate correct target on every touchmove if already cached the target
        if (cachedTarget) {
            stopHidingFramesForTouchDuration();
            var touchedElement = document.getElementById(cachedTarget);
            dispatchSyntheticEvent(touchedElement, eventData);
            return;
        }

        // tag the element that rejected the touch so that it becomes hidden but can be restored
        var previouslyTouchedElement = globalDOMCache['object' + fullMessageContent.frame];
        previouslyTouchedElement.dataset.displayAfterTouch = previouslyTouchedElement.style.display;
        
        // hide each tagged element. we may need to hide more than just this previouslyTouchedElement
        // (in case there are multiple fullscreen frames)
        var overlappingDivs = realityEditor.device.utilities.getAllDivsUnderCoordinate(eventData.x, eventData.y);
        overlappingDivs.filter(function(elt) {
            return (typeof elt.parentNode.dataset.displayAfterTouch !== 'undefined');
        }).forEach(function(elt) {
            elt.parentNode.style.display = 'none'; // TODO: instead of changing display, maybe just change pointerevents css to none
        });

        // find the next overlapping div that hasn't been traversed (and therefore hidden) yet
        var newTouchedElement = document.elementFromPoint(eventData.x, eventData.y) || document.body;
        // var newCoords = webkitConvertPointFromPageToNode(newTouchedElement, new WebKitPoint(eventData.x, eventData.y));
        // eventData.x = newCoords.x;
        // eventData.y = newCoords.y;
        dispatchSyntheticEvent(newTouchedElement, eventData);

        // re-show each tagged element
        overlappingDivs.filter(function(elt) {
            return (typeof elt.parentNode.dataset.displayAfterTouch !== 'undefined');
        }).forEach(function(elt) {
            elt.parentNode.style.display = elt.parentNode.dataset.displayAfterTouch;
        });
        
        // we won't get an acceptedTouch message if the newTouchedElement isn't a frame, so auto-trigger it
        var isFrameElement = newTouchedElement.id.indexOf(fullMessageContent.object) > -1;
        if (!isFrameElement) {
            handleAcceptedTouch(eventData, {frame: newTouchedElement.id});
        }

    }

    /**
     * When a touch goes into a frame and the frame doesn't actively reject it, it will send back
     * an acceptedTouch message. When we receive this, cache the target frame as a shortcut for
     * future touch events, and restore any state that was modified while searching for this target.
     * @param {{x: number, y: number, pointerId: number, type: string, pointerType: string}} eventData - touch event data
     * @param {Object} fullMessageContent - the full JSON message posted by the frame, including ID of its object, frame, etc
     */
    function handleAcceptedTouch(eventData, fullMessageContent) {
        if (eventData.type === 'pointerdown') {
            cachedTarget = fullMessageContent.frame;
        }

        stopHidingFramesForTouchDuration();
    }

    /**
     * Remove tag from frames that have been hidden for the current touch.
     */
    function stopHidingFramesForTouchDuration() {
        [].slice.call(document.querySelectorAll('[data-display-after-touch]')).forEach(function(element) {
            delete element.dataset.displayAfterTouch;
        });
    }

    /**
     * Helper function to trigger a fake pointer event on the specified target
     * @param {HTMLElement} target
     * @param {{x: number, y: number, pointerId: number, type: string, pointerType: string}} eventData
     */
    function dispatchSyntheticEvent(target, eventData) {
        var syntheticEvent = new PointerEvent(eventData.type, {
            view: window,
            bubbles: true,
            cancelable: true,
            pointerId: eventData.pointerId,
            pointerType: eventData.pointerType,
            x: eventData.x,
            y: eventData.y,
            clientX: eventData.x,
            clientY: eventData.y,
            pageX: eventData.x,
            pageY: eventData.y,
            screenX: eventData.x,
            screenY: eventData.y
        });
        target.dispatchEvent(syntheticEvent);
    }

    /**
     * On touch up (or any other reason editing state should reset), clears the cached target frame
     * so that we can recalculate a new target on the next touch down event
     */
    function resetCachedTarget() {
        cachedTarget = null;
        stopHidingFramesForTouchDuration();
    }
    
    exports.initService = initService;
    
})(realityEditor.device.touchPropagation);
