createNameSpace("realityEditor.device.keyboardEvents");

/**
 * @fileOverview realityEditor.device.keyboardEvents.js
 * Provides a central location where document keyboard events are handled.
 * Additional modules and experiments can plug into these for touch interaction.
 */

(function(exports) {
    
    var callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('device/keyboardEvents');;

    /**
     * Public init method sets up module and registers callbacks in other modules
     */
    function initFeature() {
        window.addEventListener('keyup', keyUpHandler);
        window.addEventListener('keydown', keyDownHandler);
    }

    /**
     * key up event handler that is always present.
     * @param {KeyboardEvent} event
     */
    function keyUpHandler(event) {
        console.log("keyUp", event);
        
    }

    /**
     * key down event handler that is always present.
     * @param {KeyboardEvent} event
     */
    function keyDownHandler(event) {
        console.log("keyDown", event);
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

    exports.initFeature = initFeature;
    exports.registerCallback = registerCallback;

})(realityEditor.device.keyboardEvents);
