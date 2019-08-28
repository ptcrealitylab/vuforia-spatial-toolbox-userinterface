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
        
        realityEditor.gui.pocket.registerCallback('frameAdded', onFrameAdded);
        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
        realityEditor.gui.ar.draw.registerCallback('fullScreenEjected', onFullScreenEjected);
    }
    
    function onFrameAdded(params) {
        sendMessageToAllVisibleFrames({
            frameCreatedEvent: {
                objectId: params.objectKey,
                frameId: params.frameKey,
                frameType: params.frameType
            }
        });
    }
    
    function onVehicleDeleted(params) {
        if (params.objectKey && params.frameKey && !params.nodeKey) { // only send message about frames, not nodes
            sendMessageToAllVisibleFrames({
                frameDeletedEvent: {
                    objectId: params.objectKey,
                    frameId: params.frameKey,
                    frameType: params.additionalInfo.frameType
                }
            });
        }
    }
    
    function onFullScreenEjected(params) {
        realityEditor.network.postMessageIntoFrame(params.frameKey, {
            fullScreenEjectedEvent: {
                objectId: params.objectKey,
                frameId: params.frameKey
            }
        });
    }
    
    function sendMessageToAllVisibleFrames(msgContent) {
        for (var visibleObjectKey in realityEditor.gui.ar.draw.visibleObjects) {
            if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(visibleObjectKey)) continue;

            realityEditor.forEachFrameInObject(visibleObjectKey, function(objectKey, frameKey) {
                realityEditor.network.postMessageIntoFrame(frameKey, msgContent);
            });
        }
    }

    /**
     * Receives key up events from the keyboardEvents module, and forwards them to active frames
     * @param {{event: KeyboardEvent}} params
     */
    function keyUpHandler(params) {
        
        var acyclicEventObject = getMutablePointerEventCopy(params.event);
        
        sendMessageToAllVisibleFrames({keyboardUpEvent: acyclicEventObject});
        
        // for (var visibleObjectKey in realityEditor.gui.ar.draw.visibleObjects) {
        //     if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(visibleObjectKey)) continue;
        //    
        //     realityEditor.forEachFrameInObject(visibleObjectKey, function(objectKey, frameKey) {
        //         realityEditor.network.postMessageIntoFrame(frameKey, {keyboardUpEvent: acyclicEventObject});
        //     });
        // }
    }

    /**
     * Reusable function to strip out the cyclic properties of a PointerEvent and clone it so the result can be modified
     * @param {PointerEvent} event
     * @return {Object}
     */
    function getMutablePointerEventCopy(event) {
        // we need to strip out the referenced DOM elements in order to JSON.stringify it
        var keysToExclude = ['currentTarget', 'srcElement', 'target', 'view', 'path'];
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
