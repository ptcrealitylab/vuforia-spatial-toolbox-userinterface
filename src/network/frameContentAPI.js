createNameSpace("realityEditor.network.frameContentAPI");

/**
 * @fileOverview realityEditor.network.frameContentAPI.js
 * Provides a central interface for transmitting data to the Frames and Nodes
 * @todo: finish moving other functionality here
 */

(function(exports) {
    
    /**
     * Public init method sets up module by registering callbacks when important events happen in other modules
     */
    function initService() {
        realityEditor.device.keyboardEvents.registerCallback('keyUpHandler', keyUpHandler);
        realityEditor.device.keyboardEvents.registerCallback('keyboardHidden', onKeyboardHidden);
        
        realityEditor.gui.pocket.registerCallback('frameAdded', onFrameAdded);
        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
        realityEditor.gui.ar.draw.registerCallback('fullScreenEjected', onFullScreenEjected);
    }

    /**
     * Sends a frameCreatedEvent into all visible frames, which they can listen for via the object.js API
     * @param {{objectKey: string, frameKey: string, frameType: string}} params
     */
    function onFrameAdded(params) {
        sendMessageToAllVisibleFrames({
            frameCreatedEvent: {
                objectId: params.objectKey,
                frameId: params.frameKey,
                frameType: params.frameType
            }
        });
    }

    /**
     * If this comes from a frame, not a node, sends a frameDeletedEvent into all visible frames, which they can listen for via the object.js API
     * @param {{objectKey: string, frameKey: string, additionalInfo: {frameType: string|undefined}}} params
     */
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

    /**
     * Gets triggered when a fullscreen frame, which had requested exclusive fullscreen access, was kicked out by a new exclusive fullscreen frame
     * Sends a fullScreenEjectedEvent message to the frame that got kicked out, so it can update its UI in response
     * @param {{objectKey: string, frameKey: string}} params
     */
    function onFullScreenEjected(params) {
        realityEditor.network.postMessageIntoFrame(params.frameKey, {
            fullScreenEjectedEvent: {
                objectId: params.objectKey,
                frameId: params.frameKey
            }
        });
    }

    /**
     * Helper function to post a message into all iframes on visible objects
     * @param {*} msgContent
     */
    function sendMessageToAllVisibleFrames(msgContent) {
        for (var visibleObjectKey in realityEditor.gui.ar.sceneRenderer.getVisibleObjects()) {
            if (!realityEditor.gui.ar.sceneRenderer.getVisibleObjects().hasOwnProperty(visibleObjectKey)) continue;

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
        var acyclicEventObject = getMutablePointerEventCopy(params.event); // can't stringify a cyclic object, which the event might be
        sendMessageToAllVisibleFrames({keyboardUpEvent: acyclicEventObject});
    }

    function onKeyboardHidden() {
        sendMessageToAllVisibleFrames({keyboardHiddenEvent: true});
    }

    /**
     * Reusable function to strip out the cyclic properties of a PointerEvent (or other event) and clone it so the result can be modified or stringified
     * @param {PointerEvent|*} event
     * @return {*} - a shallow copy of the event, without ('currentTarget', 'srcElement', 'target', 'view', or 'path')
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

    exports.initService = initService;
    exports.getMutablePointerEventCopy = getMutablePointerEventCopy;

})(realityEditor.network.frameContentAPI);
