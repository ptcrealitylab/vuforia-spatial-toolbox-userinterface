createNameSpace("realityEditor.envelopeManager");

/**
 * @fileOverview realityEditor.envelopeManager
 * This manages all communication with and between envelope frames and their contents
 */

(function(exports) {

    /**
     * @type {Object.<string, {object: string, frame: string, compatibleFrameTypes: Array.<string>, containedFrameIds: Array.<string>, isOpen: boolean}>}
     */
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
            // show all contained frames
            sendMessageToEnvelopeContents(fullMessageContent.frame, {
                showContainedFrame: true
            });
        }
        
        if (typeof eventData.close !== 'undefined') {
            knownEnvelopes[fullMessageContent.frame].isOpen = false;
            // hide all contained frames
            sendMessageToEnvelopeContents(fullMessageContent.frame, {
                showContainedFrame: false
            });
        }
        
        if (typeof eventData.containedFrameIds !== 'undefined') {
            if (knownEnvelopes[fullMessageContent.frame]) {
                knownEnvelopes[fullMessageContent.frame].containedFrameIds = eventData.containedFrameIds;
                
                // if we added any new frames, and they are visible but the envelope is closed, then hide them
                if (!knownEnvelopes[fullMessageContent.frame].isOpen) {
                    sendMessageToEnvelopeContents(fullMessageContent.frame, {
                        showContainedFrame: false
                    });
                }
            }
        }
    }
    
    function onFrameAdded(params) {

        // waits until the frame is loaded before triggering the message
        function attemptToSendMessage(params) {
            console.log('attempt to send added message');
            if (globalDOMCache['iframe' + params.frameKey] && globalDOMCache['iframe' + params.frameKey].getAttribute('loaded')) {
                
                console.log('successfully sent added message');
                sendMessageToOpenEnvelopes({ // TODO: only send to envelopes that accept this frame type
                    onFrameAdded: {
                        objectId: params.objectKey,
                        frameId: params.frameKey,
                        frameType: params.frameType
                    }
                }, params.frameType);
            
            } else {
                setTimeout(function(){
                    attemptToSendMessage(params);
                }, 500);
            }
            
        }

        attemptToSendMessage(params);
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
            
            // if deleted frame was an envelope, delete its contained frames too
            if (typeof knownEnvelopes[params.frameKey] !== 'undefined') {
                
                var deletedEnvelope = knownEnvelopes[params.frameKey];
                
                if (typeof deletedEnvelope.containedFrameIds === 'undefined') { return; }
                    
                deletedEnvelope.containedFrameIds.forEach(function(frameKey) {
                    var frameToDelete = realityEditor.getFrame(params.objectKey, params.frameKey);
                    if (!frameToDelete) { return; }
                    realityEditor.device.deleteFrame(frameToDelete, frameToDelete.objectId, frameKey);
                    console.warn('deleted frame ' + frameKey + ' because its envelope was deleted');
                });
                
            }
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

                realityEditor.network.postMessageIntoFrame(frameKey, envelopeMessage);
            }
        }
    }
    
    function sendMessageToEnvelopeContents(envelopeFrameKey, message) {
        var envelope = knownEnvelopes[envelopeFrameKey];
        if (!envelope) {
            console.warn('couldn\'t find the envelope you are trying to message (' + envelopeFrameKey + ')');
            return;
        }

        var envelopeMessage = {
            envelopeMessage: {
                sendMessageToContents: message
            }
        };

        // we send the message to the envelope, which forwards it to its contained frames
        realityEditor.network.postMessageIntoFrame(envelopeFrameKey, envelopeMessage);
    }
    
    function getOpenEnvelopes() {
        return Object.keys(knownEnvelopes).map(function(key) { return knownEnvelopes[key]; }).filter(function(envelope) {
            return envelope.isOpen;
        });
    }

    exports.initService = initService; // ideally, for a self-contained service, this is the only export

}(realityEditor.envelopeManager));
