createNameSpace("realityEditor.device.touchPropagation");

/**
 * @fileOverview realityEditor.device.touchPropagation.js
 * Allows touches to be rejected or accepted by fullscreen and non-fullscreen frames,
 * and to pass through them to the next overlapping frame if possible
 */

(function(exports) {
    
    var cachedTarget = null;
    
    function initFeature() {
        
        realityEditor.network.addPostMessageHandler('unacceptedTouch', handleUnacceptedTouch);

        realityEditor.network.addPostMessageHandler('acceptedTouch', handleAcceptedTouch);

        realityEditor.device.registerCallback('resetEditingState', resetCachedTarget);
        realityEditor.device.registerCallback('onDocumentMultiTouchEnd', resetCachedTarget);
        
    }
    
    function handleUnacceptedTouch(eventData, fullMessageContent) {

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
            elt.parentNode.style.display = 'none';
        });

        // find the next overlapping div that hasn't been traversed (and therefore hidden) yet
        var newTouchedElement = document.elementFromPoint(eventData.x, eventData.y) || document.body;
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
    
    function handleAcceptedTouch(eventData, fullMessageContent) {
        if (eventData.type === 'pointerdown') {
            cachedTarget = fullMessageContent.frame;
        }

        stopHidingFramesForTouchDuration();
    }

    /**
     * Remove tag from frames that have been hidden for the current touch
     */
    function stopHidingFramesForTouchDuration() {
        [].slice.call(document.querySelectorAll('[data-display-after-touch]')).forEach(function(element) {
            delete element.dataset.displayAfterTouch;
        });
    }

    /**
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
    
    function resetCachedTarget() {
        cachedTarget = null;
        stopHidingFramesForTouchDuration();
    }
    
    exports.initFeature = initFeature;
    
})(realityEditor.device.touchPropagation);
