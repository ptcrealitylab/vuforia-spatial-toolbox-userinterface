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
        // realityEditor.gui.ar.draw.registerCallback('fullScreenEjected', onFullScreenEjected); // this is handled already in network/frameContentAPI the same way as it is for any exclusiveFullScreen frame, so no need to listen/handle the event here
        
        realityEditor.gui.pocket.addElementHighlightFilter(function(pocketFrameNames) {
            var frameTypesToHighlight = getCurrentCompatibleFrameTypes();
            return pocketFrameNames.filter(function(frameName) {
                return frameTypesToHighlight.indexOf(frameName) > -1;
            });
        });
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
            openEnvelope(fullMessageContent.frame, true);
        }
        
        if (typeof eventData.close !== 'undefined') {
            closeEnvelope(fullMessageContent.frame, true);
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
    
    function openEnvelope(frameId, wasTriggeredByEnvelope) {
        knownEnvelopes[frameId].isOpen = true;

        // callbacks inside the envelope are auto-triggered if it opens itself, but need to be triggered if opened externally
        if (!wasTriggeredByEnvelope) {
            sendMessageToEnvelope(frameId, {
                open: true
            });
        }
        
        // show all contained frames
        sendMessageToEnvelopeContents(frameId, {
            showContainedFrame: true
        });

        // adjust exit/cancel/back buttons for # of open frames
        updateExitButton();
    }
    
    function closeEnvelope(frameId, wasTriggeredByEnvelope) {
        knownEnvelopes[frameId].isOpen = false;

        // callbacks inside the envelope are auto-triggered if it opens itself, but need to be triggered if opened externally
        if (!wasTriggeredByEnvelope) {
            sendMessageToEnvelope(frameId, {
                close: true
            });
        }
        
        // hide all contained frames
        sendMessageToEnvelopeContents(frameId, {
            showContainedFrame: false
        });

        // adjust exit/cancel/back buttons for # of open frames
        updateExitButton();
    }
    
    // function forEachEnvelope(callback) {
    //     for (var frameKey in knownEnvelopes) {
    //         var envelope = knownEnvelopes[frameKey];
    //         callback(frameKey, envelope);
    //     }
    // }
    
    function updateExitButton() {
        var numberOfOpenEnvelopes = getOpenEnvelopes().length;
        if (numberOfOpenEnvelopes === 0) {
            // hide exit button
            var exitButton = document.getElementById('exitEnvelopeButton');
            if (exitButton) {
                exitButton.style.display = 'none';
            }
        } else {
            // show (create if needed) exit button
            var exitButton = document.getElementById('exitEnvelopeButton');
            if (!exitButton) {
                exitButton = document.createElement('img');
                exitButton.src = 'svg/menu/exit.svg';
                exitButton.id = 'exitEnvelopeButton';
                document.body.appendChild(exitButton);
                
                exitButton.addEventListener('pointerup', function(_event) {
                    getOpenEnvelopes().forEach(function(envelope) {
                        closeEnvelope(envelope.frame);
                    });
                });
            }
            exitButton.style.display = 'inline';
            
            // TODO: show tabs or something else if multiple are stacked
        }
    }

    /**
     * When a new frame is added and finishes loading, tell any open envelopes about it so they can "claim" it if they choose
     * @param {{objectKey: string, frameKey: string, frameType: string}} params
     */
    function onFrameAdded(params) {

        var maxAttempts = 10;
        
        // waits until the frame is loaded before triggering the message
        function attemptToSendMessage(params) {
            if (globalDOMCache['iframe' + params.frameKey] && globalDOMCache['iframe' + params.frameKey].getAttribute('loaded')) {
                sendMessageToOpenEnvelopes({ // TODO: only send to envelopes that accept this frame type
                    onFrameAdded: {
                        objectId: params.objectKey,
                        frameId: params.frameKey,
                        frameType: params.frameType
                    }
                }, params.frameType);
            
            } else {
                setTimeout(function() {
                    maxAttempts--;
                    if (maxAttempts > 0) {
                        attemptToSendMessage(params); // keeps checking if it's ready to send every 500ms until it loads
                    }
                }, 500);
            }
            
        }

        attemptToSendMessage(params);
    }

    /**
     * When a frame is deleted, send a message to open envelopes so they can update internal state if they owned it.
     * If an envelope frame is deleted, delete its contained frames.
     * @param {{objectKey: string, frameKey: string, additionalInfo:{frameType: string}|undefined }} params
     */
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
    
    function sendMessageToEnvelope(envelopeFrameKey, message, compatibilityTypeRequirement) {
        var envelope = knownEnvelopes[envelopeFrameKey];

        // if we specify that the message should only be sent to envelopes of a certain type, make other envelopes ignore the message
        if (typeof compatibilityTypeRequirement !== 'undefined') {
            if (envelope.compatibleFrameTypes.indexOf(compatibilityTypeRequirement) === -1) {
                return;
            }
        }

        var envelopeMessage = {
            envelopeMessage: message
        };

        realityEditor.network.postMessageIntoFrame(envelopeFrameKey, envelopeMessage);
    }

    /**
     * Sends a message to all open envelopes. If a compatibilityTypeRequirement is provided, filters out
     * envelopes that don't support that type of frame.
     * @param {Object} message
     * @param {string|undefined} compatibilityTypeRequirement
     */
    function sendMessageToOpenEnvelopes(message, compatibilityTypeRequirement) {

        for (var frameKey in knownEnvelopes) {
            var envelope = knownEnvelopes[frameKey];
            
            if (envelope.isOpen) {
                sendMessageToEnvelope(frameKey, message, compatibilityTypeRequirement);
            }
        }
        
        
        // for (var frameKey in knownEnvelopes) {
        //     var envelope = knownEnvelopes[frameKey];
        //    
        //     // if we specify that the message should only be sent to envelopes of a certain type, make other envelopes ignore the message
        //     if (typeof compatibilityTypeRequirement !== 'undefined') {
        //         if (envelope.compatibleFrameTypes.indexOf(compatibilityTypeRequirement) === -1) {
        //             continue;
        //         }
        //     }
        //    
        //     if (envelope.isOpen) {
        //         var envelopeMessage = {
        //             envelopeMessage: message
        //         };
        //
        //         realityEditor.network.postMessageIntoFrame(frameKey, envelopeMessage);
        //     }
        // }
    }

    /**
     * Sends a message to all the frames contained by the envelope frame with frameKey .
     * @param {string} envelopeFrameKey
     * @param {Object} message
     */
    function sendMessageToEnvelopeContents(envelopeFrameKey, message) {
        var envelope = knownEnvelopes[envelopeFrameKey];
        if (!envelope) {
            console.warn('couldn\'t find the envelope you are trying to message (' + envelopeFrameKey + ')');
            return;
        }

        // the envelope doesn't need to be open for these messages to propagate to its children
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
    
    function getCurrentCompatibleFrameTypes() {
        var allCompatibleFrameTypes = [];
        getOpenEnvelopes().forEach(function(envelope) {
            envelope.compatibleFrameTypes.forEach(function(frameType) {
                if (allCompatibleFrameTypes.indexOf(frameType) === -1) {
                    allCompatibleFrameTypes.push(frameType);
                }
            });
        });
        return allCompatibleFrameTypes;
    }

    exports.initService = initService; // ideally, for a self-contained service, this is the only export

}(realityEditor.envelopeManager));
