createNameSpace("realityEditor.envelopeManager");

/**
 * @fileOverview realityEditor.envelopeManager
 * This manages all communication with and between envelope frames and their contents
 */

(function(exports) {
    
    var knownEnvelopes = {};
    
    /**
     * Init envelope manager module
     */
    function initService() {
        realityEditor.network.addPostMessageHandler('envelopeMessage', handleEnvelopeMessage);

        realityEditor.gui.pocket.registerCallback('frameAdded', onFrameAdded);
        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
        // realityEditor.gui.ar.draw.registerCallback('fullScreenEjected', onFullScreenEjected);
    }
    
    /**
     * @param {Object} eventData - contents of 'envelopeMessage' object
     * @param {Object} fullMessageContent - the full JSON message posted by the frame, including ID of its object, frame, etc
     */
    function handleEnvelopeMessage(eventData, fullMessageContent) {
        console.log('handleEnvelopMessage', eventData);
        
        if (typeof eventData.isEnvelope !== 'undefined') {
            if (eventData.isEnvelope) {
                knownEnvelopes[fullMessageContent.frame] = {
                    object: fullMessageContent.object,
                    frame: fullMessageContent.frame,
                    compatibleFrameTypes: eventData.compatibleFrameTypes
                }
            } else {
                if (knownEnvelopes[fullMessageContent.frame]) {
                    delete knownEnvelopes[fullMessageContent.frame];
                }
            }
        }
        
        if (typeof eventData.open !== 'undefined') {
            knownEnvelopes[fullMessageContent.frame].isOpen = true;
        }
        
        if (typeof eventData.close !== 'undefined') {
            knownEnvelopes[fullMessageContent.frame].isOpen = false;
        }
    }
    
    function onFrameAdded(params) {
        sendMessageToOpenEnvelopes({ // TODO: only send to envelopes that accept this frame type
            onFrameAdded: {
                objectId: params.objectKey,
                frameId: params.frameKey,
                frameType: params.frameType
            }
        }, params.frameType);
    }
    
    function onVehicleDeleted(params) {
        if (params.objectKey && params.frameKey && !params.nodeKey) { // only send message about frames, not nodes
            // TODO: only send the message to the envelope that contains the deleted frame
            sendMessageToOpenEnvelopes({
                onFrameDeleted: {
                    objectId: params.objectKey,
                    frameId: params.frameKey,
                    frameType: params.additionalInfo.frameType
                }
            });
        }
    }
    
    function sendMessageToOpenEnvelopes(message, compatibilityTypeRequirement) {
        for (var frameKey in knownEnvelopes) {
            var envelope = knownEnvelopes[frameKey];
            
            // if we specify that the message should only be sent to envelopes of a certain type, make other envelopes ignore the message
            if (typeof compatibilityTypeRequirement !== 'undefined') {
                if (envelope.compatibleFrameTypes.indexOf(compatibilityTypeRequirement) === -1) {
                    continue;
                }
            }
            
            if (envelope.isOpen) {
                var envelopeMessage = {
                    envelopeMessage: message
                };
                console.warn('TODO: implement sendMessageToOpenEnvelopes to send a message to ' + frameKey, envelopeMessage);

                realityEditor.network.postMessageIntoFrame(frameKey, envelopeMessage);
            }
        }
    }
    
    function sendMessageToOpenEnvelopeContents(message) {
        
    }

    exports.initService = initService; // ideally, for a self-contained service, this is the only export

}(realityEditor.envelopeManager));
