createNameSpace("realityEditor.envelopeManager");

/**
 * @fileOverview realityEditor.envelopeManager
 * This manages all communication with and between envelope frames and their contents.
 * It listens for envelope messages and uses that to update the editor UI (e.g. adding an [X] button), and to
 * relay messages to contained frames from envelopes (e.g. show/hide when open/close).
 * Also responsible for notifying envelopes when potential frames are added or removed from them.
 */

(function(exports) {

    /**
     * @typedef {Object} Envelope
     * @property {string} object
     * @property {string} frame
     * @property {string} type
     * @property {Array.<string>} compatibleFrameTypes
     * @property {Array.<string>} containedFrameIds
     * @property {boolean} isOpen
     */

    /**
     * @type {Object.<string, Envelope>}
     */
    var knownEnvelopes = {};
    
    /**
     * Init envelope manager module
     */
    function initService() {
        realityEditor.network.addPostMessageHandler('envelopeMessage', handleEnvelopeMessage);

        realityEditor.gui.pocket.registerCallback('frameAdded', onFrameAdded);
        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
        realityEditor.network.registerCallback('elementReloaded', onElementReloaded);
        // realityEditor.gui.ar.draw.registerCallback('fullScreenEjected', onFullScreenEjected); // this is handled already in network/frameContentAPI the same way as it is for any exclusiveFullScreen frame, so no need to listen/handle the event here

        realityEditor.gui.pocket.addElementHighlightFilter(function(pocketFrameNames) {
            var frameTypesToHighlight = getCurrentCompatibleFrameTypes();
            return pocketFrameNames.filter(function(frameName) {
                return frameTypesToHighlight.indexOf(frameName) > -1;
            });
        });
    }

    /**
     * Gets triggered when a frame declares itself to be an envelope.
     * This is where we can detect if it was added programmatically by one of its children frames that required it,
     * and if so, open this envelope and set up its relationships with its children
     * @param {string} objectKey
     * @param {string} frameKey
     */
    function onEnvelopeRegistered(objectKey, frameKey) {
        
        var frame = realityEditor.getFrame(objectKey, frameKey);
        if (frame && typeof frame.autoAddedEnvelope !== 'undefined') {

            // then open the envelope you just added
            openEnvelope(frameKey);

            // queue up a frameAdded event in the envelopeManager
            // when the envelope's iframe loads, send this event into the envelope
            // to set up all relationships between the contained frame and its envelope

            onFrameAdded({
                objectKey: frame.autoAddedEnvelope.containedFrameToAdd.objectKey,
                frameKey: frame.autoAddedEnvelope.containedFrameToAdd.frameKey,
                frameType: frame.autoAddedEnvelope.containedFrameToAdd.frameType
            }); // todo: can simplify to just frame.autoAddedEnvelope.containedFrameToAdd
        }
    }
    
    /**
     * @param {Object} eventData - contents of 'envelopeMessage' object
     * @param {Object} fullMessageContent - the full JSON message posted by the frame, including ID of its object, frame, etc
     */
    function handleEnvelopeMessage(eventData, fullMessageContent) {
        
        // registers new envelopes with the system
        if (typeof eventData.isEnvelope !== 'undefined') {
            if (eventData.isEnvelope) {
                knownEnvelopes[fullMessageContent.frame] = {
                    object: fullMessageContent.object,
                    frame: fullMessageContent.frame,
                    compatibleFrameTypes: eventData.compatibleFrameTypes
                };
                // check if registered envelope was autoAdded and needs to be configured
                onEnvelopeRegistered(fullMessageContent.object, fullMessageContent.frame);
            } else {
                if (knownEnvelopes[fullMessageContent.frame]) {
                    delete knownEnvelopes[fullMessageContent.frame];
                }
            }
        }
        
        // responds to an envelope opening
        if (typeof eventData.open !== 'undefined') {
            openEnvelope(fullMessageContent.frame, true);
        }
        
        // responds to an envelope closing
        if (typeof eventData.close !== 'undefined') {
            closeEnvelope(fullMessageContent.frame, true);
        }
        
        // keeps mapping of envelopes -> containedFrames up to date
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

    /**
     * Opens an envelope and/or responds to an envelope opening to update UI and other frames appropriately
     * @param {string} frameId
     * @param {boolean} wasTriggeredByEnvelope - if triggered by itself, doesnt need to update iframe contents
     */
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

    /**
     * Closes an envelope and/or responds to an envelope closing to update UI and other frames appropriately
     * @param {string} frameId
     * @param {boolean} wasTriggeredByEnvelope - can be triggered in multiple ways e.g. the exit button or from within the envelope
     */
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

    /**
     * Creates/renders an [X] button in the top left corner if there are any open envelopes, which can be used to close them
     */
    function updateExitButton() {
        var numberOfOpenEnvelopes = getOpenEnvelopes().length;
        if (numberOfOpenEnvelopes === 0) {
            // hide exit button
            let exitButton = document.getElementById('exitEnvelopeButton');
            if (exitButton) {
                exitButton.style.display = 'none';
            }
        } else {
            // show (create if needed) exit button
            let exitButton = document.getElementById('exitEnvelopeButton');
            if (!exitButton) {
                exitButton = document.createElement('img');
                exitButton.src = 'svg/menu/exit.svg';
                exitButton.id = 'exitEnvelopeButton';
                document.body.appendChild(exitButton);
                
                exitButton.addEventListener('pointerup', function() {
                    // TODO: show tabs or something else if multiple are stacked, allowing them to be closed individually
                    getOpenEnvelopes().forEach(function(envelope) {
                        closeEnvelope(envelope.frame);
                    });
                });
            }
            exitButton.style.display = 'inline';
        }
    }

    /**
     * When a new frame is added and finishes loading, tell any open envelopes about it so they can "claim" it if they choose
     * @param {{objectKey: string, frameKey: string, frameType: string}} params
     */
    function onFrameAdded(params) {
        
        try {
            addRequiredEnvelopeIfNeeded(params.objectKey, params.frameKey, params.frameType);
        } catch (e) {
            console.warn('error adding required envelope');
        }
        
        var maxAttempts = 10; // prevent infinite loops by limiting number of attempts to an arbitrary number
        
        // waits until the frame is loaded before triggering the message
        function attemptToSendMessage(params) {
            if (globalDOMCache['iframe' + params.frameKey] && globalDOMCache['iframe' + params.frameKey].getAttribute('loaded')) {
                // right now it notifies all envelopes, and it is the responsibility of the envelope to only accept frames types that it is compatible with
                sendMessageToOpenEnvelopes({
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
            // right now messages all envelopes, not just the one that contained the deleted frame
            // TODO: test with more than one envelope open at a time (stackable envelopes)
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
                    
                deletedEnvelope.containedFrameIds.forEach(function(containedFrameKey) {
                    // contained frame always belongs to same object as envelope, so ok to use params.objectKey
                    var frameToDelete = realityEditor.getFrame(params.objectKey, containedFrameKey);
                    if (!frameToDelete) { return; }
                    realityEditor.device.deleteFrame(frameToDelete, params.objectKey, containedFrameKey);
                });
            }
        }
    }

    /**
     * Programmatically re-close an envelope if its child frame reloads, otherwise the child can get stranded as visible
     * @param {{objectKey: string, frameKey: string, nodeKey: string}} params
     */
    function onElementReloaded(params) {
        if (params.nodeKey) { return; } // for now only frames can be in envelopes

        // see if it belongs to a closed envelope
        Object.values(knownEnvelopes).filter(function(envelope) {
            return !envelope.isOpen;
        }).filter(function(envelope) {
            return envelope.containedFrameIds.includes(params.frameKey);
        }).forEach(function(envelope) {
            // should belong to at most 1 envelope at a time.. but we'll do for each just in case that changes
            closeEnvelope(envelope.frame);
            console.log('closing parent envelope: ' + envelope.frame);
        });
    }

    /**
     * Gets triggered when any frame is created. Checks if that frame requires to be inside an envelope of a certain type,
     *  and if so, adds that envelope and puts this frame inside that envelope.
     * @param {string} objectKey
     * @param {string} frameKey - the uuid of the frame that was just added
     * @param {string} frameType - used to retrieve metadata for the frame type that was added
     */
    function addRequiredEnvelopeIfNeeded(objectKey, frameKey, frameType) {

        var realityElements = realityEditor.gui.pocket.getRealityElements();
        var realityElement = realityElements.find(function(elt) { return elt.properties.name === frameType; });

        // check if an additional envelope frame needs to be added
        if (realityElement.requiredEnvelope) {
            console.log('this frame needs an envelope: ' + realityElement.requiredEnvelope);
            console.log(realityElement);
            var frameTypeNeeded = realityElement.requiredEnvelope; // this will be 'loto-envelope'

            // check if an envelope of type frameTypeNeeded is already open
            var openEnvelopes = getOpenEnvelopes();
            var openEnvelopeTypes = openEnvelopes.map(function(envelopeData) {
                return getFrameTypeFromKey(envelopeData.object, envelopeData.frame);
            });
            var isRequiredEnvelopeOpen = openEnvelopeTypes.indexOf(frameTypeNeeded) > -1;

            if (!isRequiredEnvelopeOpen) {
                console.log('an envelope of the required type does not exist!');
                // tell the pocket to createFrame(frameTypeNeeded, ...)

                // get the realityElement for the necessary envelope
                var envelopeData = realityElements.find(function(elt) { return elt.name === frameTypeNeeded; });
                // var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();

                var touchPosition = {
                    x: 100 + Math.random() * (globalStates.height - 200),
                    y: 100 + Math.random() * (globalStates.width - 200)
                };

                if (envelopeData) {
                    let addedElement = realityEditor.gui.pocket.createFrame(envelopeData.name, JSON.stringify(envelopeData.startPositionOffset), JSON.stringify(envelopeData.width), JSON.stringify(envelopeData.height), JSON.stringify(envelopeData.nodes), touchPosition.x, touchPosition.y, true);

                    console.log('added an envelope (maybe in time?)', addedElement);

                    realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid);

                    // not loaded yet, so flag it with a certain property so we can catch it when it fully loads
                    addedElement.autoAddedEnvelope = {
                        shouldOpenOnLoad: true,
                        containedFrameToAdd: {
                            objectKey: objectKey,
                            frameKey: frameKey,
                            frameType: frameType
                        }
                    };
                }

            } else {
                console.log('dont need to create a new envelope because the required one is already open');
            }
        }
    }

    /**
     * Sends an arbitrary message to the specified envelope.
     * If a compatibilityTypeRequirement is provided, filters out envelopes that don't support that type of frame.
     * @param {string} envelopeFrameKey
     * @param {*} message
     * @param {Array.<string>|undefined} compatibilityTypeRequirement
     */
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
     * Sends a message to all open envelopes.
     * If a compatibilityTypeRequirement is provided, filters out envelopes that don't support that type of frame.
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
    }

    /**
     * Sends a message to all the frames contained by the specified envelope frame with.
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

    /**
     * Helper function to return a list of open envelopes.
     * @return {Array.<Envelope>}
     */
    function getOpenEnvelopes() {
        return Object.values(knownEnvelopes).filter(function(envelope) {
            return envelope.isOpen;
        });
    }

    /**
     * Helper function to get a list of all compatible frame types of any open envelopes (compatible with envelope x OR y, not x AND y)
     * @return {Array.<string>}
     */
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

    /**
     * Helper function to convert a frameKey into a frame type
     * @param {string} objectKey
     * @param {string} frameKey
     * @return {string}
     */
    function getFrameTypeFromKey(objectKey, frameKey) {
        var frame = realityEditor.getFrame(objectKey, frameKey);
        return frame.src;
    }

    exports.initService = initService; // ideally, for a self-contained service, this is the only export.

}(realityEditor.envelopeManager));
