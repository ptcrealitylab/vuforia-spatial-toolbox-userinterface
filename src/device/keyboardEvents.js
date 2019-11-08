createNameSpace("realityEditor.device.keyboardEvents");

/**
 * @fileOverview realityEditor.device.keyboardEvents.js
 * Provides a central location where document keyboard events are handled.
 * Additional modules and experiments can plug into these for touch interaction.
 */

(function(exports) {
    
    var callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('device/keyboardEvents');

    /**
     * Public init method sets up module and registers callbacks in other modules
     */
    function initService() {
        window.addEventListener('keyup', keyUpHandler);
        window.addEventListener('keydown', keyDownHandler);
        realityEditor.network.addPostMessageHandler('resetScroll', function() {
            resetScroll();
            setTimeout(function() {
                resetScroll(); // also do it after a slight delay
            }, 100); 
        });
    }
    
    function resetScroll() {
        if (window.scrollX !== 0 || window.scrollY !== 0) {
            window.scrollTo(0,0);
        }
    }

    /**
     * key up event handler that is always present.
     * @param {KeyboardEvent} event
     */
    function keyUpHandler(event) {
        event.preventDefault();
        
        // console.log("keyUp", event);
        callbackHandler.triggerCallbacks('keyUpHandler', {event: event});
        
        // TODO: in the future, move this to a FrameContentAPI module that subscribes to the keyboard events using the above methods
    }

    /**
     * key down event handler that is always present.
     * @param {KeyboardEvent} event
     */
    function keyDownHandler(event) {
        event.preventDefault();
        
        // console.log("keyDown", event);
        callbackHandler.triggerCallbacks('keyDownHandler', {event: event});
    }

    /**
     * Adds a callback function that will be invoked when the specified button is pressed
     * @param {string} functionName
     * @param {function} callback
     */
    function registerCallback(functionName, callback) {
        if (!callbackHandler) {
            callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('device/keyboardEvents');
        }
        callbackHandler.registerCallback(functionName, callback);
    }

    exports.initService = initService;
    exports.registerCallback = registerCallback;

})(realityEditor.device.keyboardEvents);
