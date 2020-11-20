createNameSpace("realityEditor.moduleCallbacks");

/**
 * @fileOverview realityEditor.moduleCallbacks.js
 * Creates a reusable class for handling the callbacks of a given module
 * 
 * @example How to Use:
 * 
 * If you want other modules A and B to be able to register callbacks on your module C:
 * 
 * 1. Create a private CallbackHandler withing module C, with the name of module C:
 * realityEditor.gui.pocket.callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('gui/pocket');
 * 
 * 2. Add a public method called registerCallback to module C: @todo: I have another version that automatically adds this
 * realityEditor.gui.pocket.registerCallback = function(functionName, callback) {
     if (!this.callbackHandler) {
       this.callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('gui/pocket'); // lazily instantiate it if not already
     }
     this.callbackHandler.registerCallback(functionName, callback); // register the callback within the private member
   };
 * 
 * 3. In module A or B, call registerCallback on module C with the name of the event you are listening for:
 * realityEditor.gui.pocket.registerCallback('frameAdded', function(params) {
     console.log(params.objectKey, params.frameKey);
   });
 * 
 * 4. In module C, when the event occurs, call callbackHandler.triggerCallbacks with the event name and any params:
 * 
 * this.callbackHandler.triggerCallbacks('frameAdded', {objectKey: closestObjectKey, frameKey: frameID, frameType: frame.src});
 */

(function(exports) {
    
    /**
     * class to handle callback registration and triggering, which can be instantiated for each module that needs it
     * @param {string} moduleName - currently just used for debugging purposes
     * @constructor
     */
    function CallbackHandler(moduleName) {
        this.moduleName = moduleName; // only stored for debugging purposes
        // console.log('created CallbackHandler for ' + this.moduleName);

        /**
         * A set of arrays of callbacks that other modules can register to be notified of actions.
         * Contains a property for each method name in the module that can trigger events in other modules.
         * The value of each property is an array containing pointers to the callback functions that should be
         *  triggered when that function is called.
         * @type {Object.<string, Array.<function>>}
         */
        this.callbacks = {}
    }

    /**
     * Adds a callback function that will be invoked when the moduleName.[functionName] is called
     * @param {string} functionName
     * @param {function} callback
     */
    CallbackHandler.prototype.registerCallback = function(functionName, callback) {
        if (typeof this.callbacks[functionName] === 'undefined') {
            this.callbacks[functionName] = [];
        }

        this.callbacks[functionName].push(callback);
    };

    /**
     * Utility for iterating calling all callbacks that other modules have registered for the given function
     * @param {string} functionName
     * @param {object|undefined} params
     */
    CallbackHandler.prototype.triggerCallbacks = function(functionName, params) {
        if (typeof this.callbacks[functionName] === 'undefined') return;

        // iterates over all registered callbacks to trigger events in various modules
        this.callbacks[functionName].forEach(function(callback) {
            callback(params);
        });
    };
    
    exports.CallbackHandler = CallbackHandler;

})(realityEditor.moduleCallbacks);
