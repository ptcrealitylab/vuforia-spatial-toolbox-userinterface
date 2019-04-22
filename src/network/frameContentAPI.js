createNameSpace("realityEditor.network.frameContentAPI");

/**
 * @fileOverview realityEditor.network.frameContentAPI.js
 * Provides a central interface for transmitting data to the Frames and Nodes
 * @todo: finish moving other functionality here
 */

(function(exports) {
    
    /**
     * Public init method sets up module
     */
    function initFeature() {
        realityEditor.device.keyboardEvents.registerCallback('keyUpHandler', keyUpHandler);
    }

    /**
     * Receives key up events from the keyboardEvents module, and forwards them to active frames
     * @param {{event: KeyboardEvent}} params
     */
    function keyUpHandler(params) {
        
        var acyclicEventObject = getMutablePointerEventCopy(params.event);
        
        for (var visibleObjectKey in realityEditor.gui.ar.draw.visibleObjects) {
            if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(visibleObjectKey)) continue;
            
            realityEditor.forEachFrameInObject(visibleObjectKey, function(objectKey, frameKey) {
                realityEditor.network.postMessageIntoFrame(frameKey, {keyboardUpEvent: acyclicEventObject});
            });
        }
    }

    /**
     * Reusable function to strip out the cyclic properties of a PointerEvent and clone it so the result can be modified
     * @param {PointerEvent} event
     * @return {Object}
     */
    function getMutablePointerEventCopy(event) {
        // we need to strip out the referenced DOM elements in order to JSON.stringify it
        var keysToExclude = ['currentTarget', 'srcElement', 'target', 'view'];
        var acyclicEventObject = copyObject(event, keysToExclude);
        return acyclicEventObject;
    }

    /**
     * Creates a shallow clone of a JSON object (key-by-key), with the option to exclude certain keys from the new copy.
     * Useful for creating an acyclic version of the original so that it can be JSON.stringified
     * @param {object} jsonObject
     * @param {Array.<string>|undefined} keysToExclude
     * @return {object}
     * @todo: move to a more reusable utility collection
     */
    function copyObject(jsonObject, keysToExclude) {
        var newObject = {};
        for (var key in jsonObject) {
            if (typeof keysToExclude === 'undefined' || keysToExclude.indexOf(key) === -1) { // copy over all the keys that don't match the excluded ones
                newObject[key] = jsonObject[key];
            }
        }
        return newObject;
    }

    exports.initFeature = initFeature;
    exports.getMutablePointerEventCopy = getMutablePointerEventCopy;

})(realityEditor.network.frameContentAPI);
