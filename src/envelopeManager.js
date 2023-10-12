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
     * @property {boolean} hasFocus
     * @property {boolean} isFull2D
     */

    /**
     * @type {Object.<string, Envelope>}
     */
    var knownEnvelopes = {};

    let alreadyProcessedUrlToolId = false;
    
    let callbacks = {
        onExitButtonShown: [],
        onExitButtonHidden: [],
        onFullscreenFull2DToggled: []
    };
    
    /**
     * Init envelope manager module
     */
    function initService() {
        realityEditor.network.addPostMessageHandler('envelopeMessage', handleEnvelopeMessage);

        realityEditor.gui.pocket.registerCallback('frameAdded', onFrameAdded);

        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', onVehicleDeleted); // deleted using server

        realityEditor.network.registerCallback('elementReloaded', onElementReloaded);
        realityEditor.network.registerCallback('elementLoaded', onElementReloaded);
        // realityEditor.gui.ar.draw.registerCallback('fullScreenEjected', onFullScreenEjected); // this is handled already in network/frameContentAPI the same way as it is for any exclusiveFullScreen frame, so no need to listen/handle the event here
        realityEditor.network.registerCallback('vehicleReattached', function(params) {
            setTimeout(function() {
                onVehicleReattached(params);
            }, 500); // send after a delay so original messages have a chance to be processed first
        });

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

        realityEditor.gui.recentlyUsedBar.onEnvelopeRegistered(frame);
        realityEditor.gui.envelopeIconRenderer.onEnvelopeRegistered(knownEnvelopes[frameKey]);

        if (alreadyProcessedUrlToolId) return;

        // Parse the URL for a ?toolId, and open the envelope if possible
        let searchParams = new URLSearchParams(window.location.search);
        let toolboxActiveToolId = searchParams.get('toolId');
        if (toolboxActiveToolId && frameKey === toolboxActiveToolId) {
            alreadyProcessedUrlToolId = true; // prevent weird behavior if the tool reloads/re-registers
            setTimeout(() => {
                // for now, open it after a slight delay so it doesn't get closed by another open envelope
                // todo: don't rely on a timeout
                openEnvelope(frameKey, false);
                setTimeout(() => {
                    focusEnvelope(frameKey, false);
                }, 1000);
            }, 1000);
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
                    compatibleFrameTypes: eventData.compatibleFrameTypes,
                    containedFrameIds: []
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

        // generally not used, but responds to an envelope removing its 2D layer
        if (typeof eventData.blur !== 'undefined') {
            blurEnvelope(fullMessageContent.frame, true);
        }

        // generally not used, but responds to an envelope restoring its 2D layer
        if (typeof eventData.focus !== 'undefined') {
            focusEnvelope(fullMessageContent.frame, true);
        }
        
        // keeps mapping of envelopes -> containedFrames up to date
        if (typeof eventData.containedFrameIds !== 'undefined') {
            if (knownEnvelopes[fullMessageContent.frame]) {
                knownEnvelopes[fullMessageContent.frame].containedFrameIds = eventData.containedFrameIds;
                
                // if we added any new frames, and they are visible but the envelope is closed, then hide them
                if (!knownEnvelopes[fullMessageContent.frame].isOpen) {
                    closeEnvelope(fullMessageContent.frame, true);
                } else if (!knownEnvelopes[fullMessageContent.frame].hasFocus) {
                    blurEnvelope(fullMessageContent.frame, true);
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
        const envelope = knownEnvelopes[frameId];
        if (envelope.isOpen) return;

        envelope.isOpen = true;
        envelope.hasFocus = true;

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

        let containedFrameIds = envelope.containedFrameIds;
        containedFrameIds.forEach(function(id) {
            let element = globalDOMCache['object' + id];
            if (element) {
                element.classList.remove('hiddenEnvelopeContents');
            }
        });

        if (globalDOMCache[frameId]) {
            globalDOMCache[frameId].classList.remove('iframeOverlayWithoutFocus');
            globalDOMCache['iframe' + frameId].classList.remove('iframeOverlayWithoutFocus');
        }

        // adjust exit/cancel/back buttons for # of open frames
        updateExitButton();

        realityEditor.gui.recentlyUsedBar.onOpen(envelope);
        realityEditor.gui.envelopeIconRenderer.onOpen(envelope);
    }

    /**
     * Closes an envelope and/or responds to an envelope closing to update UI and other frames appropriately
     * @param {string} frameId
     * @param {boolean} wasTriggeredByEnvelope - can be triggered in multiple ways e.g. the exit button or from within the envelope
     */
    function closeEnvelope(frameId, wasTriggeredByEnvelope) {
        const envelope = knownEnvelopes[frameId];
        if (!envelope.isOpen) return;

        envelope.isOpen = false;
        envelope.hasFocus = false;

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
        
        // TODO: hide contained frames at a higher level by giving them some property or CSS class
        // TODO: after 3 seconds, kill/unload them? (make sure it doesn't interfere with envelope when it opens again
        
        let containedFrameIds = envelope.containedFrameIds;
        containedFrameIds.forEach(function(id) {
            let element = globalDOMCache['object' + id];
            if (element) {
                element.classList.add('hiddenEnvelopeContents');
            }
        });

        if (globalDOMCache[frameId]) {
            globalDOMCache[frameId].classList.remove('iframeOverlayWithoutFocus');
            globalDOMCache['iframe' + frameId].classList.remove('iframeOverlayWithoutFocus');
        }

        // adjust exit/cancel/back buttons for # of open frames
        updateExitButton();

        realityEditor.gui.recentlyUsedBar.onClose(envelope);
        realityEditor.gui.envelopeIconRenderer.onClose(envelope);
    }

    /**
     * Restore focus to an envelope, showing its 2D UI
     * @param {string} frameId
     * @param {boolean} wasTriggeredByEnvelope
     */
    function focusEnvelope(frameId, wasTriggeredByEnvelope = false) {
        if (!knownEnvelopes[frameId]) return;
        if (knownEnvelopes[frameId].hasFocus) return;

        // first, blur or close the current envelope if there is one focused
        getOpenEnvelopes().forEach(openEnvelope => {
            if (openEnvelope.hasFocus) {
                if (openEnvelope.isFull2D) {
                    realityEditor.envelopeManager.closeEnvelope(openEnvelope.frame);
                } else {
                    realityEditor.envelopeManager.blurEnvelope(openEnvelope.frame);
                }
            }
        });

        knownEnvelopes[frameId].hasFocus = true;

        // callbacks inside the envelope are auto-triggered if it opens itself, but need to be triggered if opened externally
        if (!wasTriggeredByEnvelope) {
            sendMessageToEnvelope(frameId, {
                focus: true
            });
        }

        if (globalDOMCache[frameId]) {
            globalDOMCache[frameId].classList.remove('iframeOverlayWithoutFocus');
            globalDOMCache['iframe' + frameId].classList.remove('iframeOverlayWithoutFocus');
        }

        // adjust exit/cancel/back buttons for # of open frames
        updateExitButton();

        // hide the temporary icon
        realityEditor.gui.envelopeIconRenderer.onFocus(knownEnvelopes[frameId]);
        // focusing an app also brings it to the front of the bar, same as opening it
        realityEditor.gui.recentlyUsedBar.onOpen(knownEnvelopes[frameId]);
    }

    /**
     * Remove focus, by hiding controls and/or responds to an envelope closing to update UI and other frames appropriately
     * @param {string} frameId
     * @param {boolean} wasTriggeredByEnvelope - can be triggered in multiple ways e.g. the minimize button or from within the envelope
     */
    function blurEnvelope(frameId, wasTriggeredByEnvelope = false) {
        if (!knownEnvelopes[frameId]) return;
        if (!knownEnvelopes[frameId].hasFocus) return;

        knownEnvelopes[frameId].hasFocus = false;

        // callbacks inside the envelope are auto-triggered if it opens itself, but need to be triggered if opened externally
        if (!wasTriggeredByEnvelope) {
            sendMessageToEnvelope(frameId, {
                blur: true
            });
        }

        if (globalDOMCache[frameId]) {
            globalDOMCache[frameId].classList.add('iframeOverlayWithoutFocus');
            globalDOMCache['iframe' + frameId].classList.add('iframeOverlayWithoutFocus');
        }

        // adjust exit/cancel/back buttons for # of open frames
        updateExitButton();

        realityEditor.gui.envelopeIconRenderer.onBlur(knownEnvelopes[frameId]);
    }

    function createExitButton() {
        let exitButton = document.createElement('img');
        exitButton.classList.add('envelopeMenuButton');
        exitButton.src = 'svg/envelope-x-button.svg';
        exitButton.id = 'exitEnvelopeButton';
        exitButton.style.top = realityEditor.device.environment.variables.screenTopOffset + 'px';
        document.body.appendChild(exitButton);

        exitButton.addEventListener('pointerup', function() {
            getOpenEnvelopes().forEach(function(envelope) {
                if (envelope.hasFocus) {
                    closeEnvelope(envelope.frame);
                }
            });
        });
        return exitButton;
    }

    function createMinimizeButton() {
        let minimizeButton = document.createElement('img');
        minimizeButton.classList.add('envelopeMenuButton');
        minimizeButton.src = 'svg/envelope-collapse-button.svg';
        minimizeButton.id = 'minimizeEnvelopeButton';
        minimizeButton.style.top = realityEditor.device.environment.variables.screenTopOffset + 'px';
        document.body.appendChild(minimizeButton);

        minimizeButton.addEventListener('pointerup', function() {
            // TODO: only minimize the envelope that has focus, not all of them
            getOpenEnvelopes().forEach(function(envelope) {
                if (envelope.hasFocus) {
                    blurEnvelope(envelope.frame);
                }
            });
        });
        return minimizeButton;
    }

    /**
     * Creates/renders an [X] button in the top left corner if there are any open envelopes, which can be used to close them
     * Also creates a second button, which is used to remove focus from the focused envelope, if it has a 3D scene
     */
    function updateExitButton() {
        let numberOfOpenEnvelopes = getOpenEnvelopes().length;
        let numberOfFocusedEnvelopes = getFocusedEnvelopes().length;
        // Full2D tools are not "blurrable" because they don't have a 3D scene that can remain in the background when their 2D layer loses focus
        let numberOfBlurrableEnvelopes = getFocusedEnvelopes().filter(envelope => !envelope.isFull2D).length;
        let exitButton = document.getElementById('exitEnvelopeButton');
        let minimizeButton = document.getElementById('minimizeEnvelopeButton');

        // exit button shows anytime an envelope is open+focused
        let showExitButton = numberOfOpenEnvelopes > 0 && numberOfFocusedEnvelopes > 0;
        // minimize button only shows if the open+focused envelope is also not a Full2D envelope
        let showMinimizeButton = numberOfBlurrableEnvelopes > 0;

        if (showMinimizeButton) {
            if (!minimizeButton) minimizeButton = createMinimizeButton();
            minimizeButton.style.display = 'inline';
        } else {
            if (minimizeButton) minimizeButton.style.display = 'none';
        }

        if (showExitButton) {
            if (!exitButton) exitButton = createExitButton();
            exitButton.style.display = 'inline';
            callbacks.onExitButtonShown.forEach(cb => cb(exitButton, minimizeButton));
        } else {
            if (exitButton) exitButton.style.display = 'none';
            callbacks.onExitButtonHidden.forEach(cb => cb(exitButton, minimizeButton));
        }
    }
    
    exports.onExitButtonHidden = (callback) => {
        callbacks.onExitButtonHidden.push(callback);
    }

    exports.onExitButtonShown = (callback) => {
        callbacks.onExitButtonShown.push(callback);
    }

    exports.onFullscreenFull2DToggled = (callback) => {
        callbacks.onFullscreenFull2DToggled.push(callback);
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
        
        attemptWithRetransmission(function() {
            sendMessageToOpenEnvelopes({
                onFrameAdded: {
                    objectId: params.objectKey,
                    frameId: params.frameKey,
                    frameType: params.frameType
                }
            }, params.frameType, { requiresFocus: true });
        }, function() {
            return globalDOMCache['iframe' + params.frameKey] && globalDOMCache['iframe' + params.frameKey].getAttribute('loaded');
        }, 500, 10);
    }

    function attemptWithRetransmission(callback, conditionToProceed, timeBetweenAttempts, numAttemptsLeft) {
        if (typeof conditionToProceed === 'undefined' || conditionToProceed()) {
            console.log('attempt transmission');
            callback();
        }

        if (typeof conditionToProceed === 'undefined' || !conditionToProceed()) {
            console.log('condition not satisfied... retransmit in ' + timeBetweenAttempts + 'ms (' + (numAttemptsLeft-1) + ')');
            setTimeout(function() {
                numAttemptsLeft--;
                if (numAttemptsLeft > 0) {
                    attemptWithRetransmission(callback, conditionToProceed, timeBetweenAttempts, numAttemptsLeft); // keeps checking
                }
            }, timeBetweenAttempts);
        }
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
                let deletedEnvelope = knownEnvelopes[params.frameKey];
                    
                deletedEnvelope.containedFrameIds.forEach(function(containedFrameKey) {
                    // contained frame always belongs to same object as envelope, so ok to use params.objectKey
                    var frameToDelete = realityEditor.getFrame(params.objectKey, containedFrameKey);
                    if (!frameToDelete) { return; }
                    realityEditor.device.deleteFrame(frameToDelete, params.objectKey, containedFrameKey);
                });

                if (deletedEnvelope.isFull2D) {
                    hideBlurredBackground(params.frameKey);
                }

                delete knownEnvelopes[params.frameKey];

                // if deleted envelope was the open envelope, remove the close/minimize buttons
                updateExitButton();
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

        // send message to open envelopes so that it gets updates properly if a tool on another object loads
        sendMessageToOpenEnvelopes({
            onFrameLoaded: {
                objectId: params.objectKey,
                frameId: params.frameKey,
                frameType: params.frameType
            }
        }, params.frameType);
    }

    /**
     * When a frame gets reattached e.g. from an object to the world, make sure that the envelope it belongs to
     * keeps track of its new object id
     * @param {{oldObjectKey: string, oldFrameKey: string, newObjectKey: string, newFrameKey: string, frameType: string}} params
     */
    function onVehicleReattached(params) {

        attemptWithRetransmission(function() {
            updateContainedFrameId(params.oldObjectKey, params.oldFrameKey, params.newObjectKey, params.newFrameKey, params.frameType);
        },  undefined, //function() {
            // return globalDOMCache['iframe' + params.frameKey] && globalDOMCache['iframe' +
            // params.frameKey].getAttribute('loaded');
        // },
        500, 10);
    }

    function updateContainedFrameId(oldObjectKey, oldFrameKey, newObjectKey, newFrameKey, frameType) {
        // check if the old id belongs to any envelope
        Object.values(knownEnvelopes).filter(function(envelope) {
            return envelope.containedFrameIds.includes(oldFrameKey);
        }).forEach(function(envelope) {

            console.log('reattach frame ' + oldFrameKey + ' in envelope ' + envelope.frame);

            // remove this frame from the envelope and replace it with the new id
            sendMessageToEnvelope(envelope.frame, {
                onFrameDeleted: {
                    objectId: oldObjectKey,
                    frameId: oldFrameKey,
                    frameType: frameType
                }
            });

            // add the new id to the envelope after slight delay
            setTimeout(function() {
                sendMessageToEnvelope(envelope.frame, {
                    onFrameAdded: {
                        objectId: newObjectKey,
                        frameId: newFrameKey,
                        frameType: frameType
                    }
                });
                console.log('reattached frame is now ' + newFrameKey + ' in envelope ' + envelope.frame);
            }, 500);
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
                    let addedElement = realityEditor.gui.pocket.createFrame(envelopeData.name, {
                        startPositionOffset: envelopeData.startPositionOffset,
                        width: envelopeData.width,
                        height: envelopeData.height,
                        pageX: touchPosition.x,
                        pageY: touchPosition.y,
                        noUserInteraction: true
                    });

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
     * @param {*} options
     */
    function sendMessageToOpenEnvelopes(message, compatibilityTypeRequirement, options = { requiresFocus: false}) {
        for (var frameKey in knownEnvelopes) {
            var envelope = knownEnvelopes[frameKey];
            if (envelope.isOpen && (envelope.hasFocus || !options.requiresFocus)) {
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
            return envelope.isOpen; // && !envelope.hasFocus;
        });
    }

    /**
     * Helper function to return the envelope that has focus, if any
     * @return {Array.<Envelope>}
     */
    function getFocusedEnvelopes() {
        return Object.values(knownEnvelopes).filter((envelope) => {
            return envelope.hasFocus;
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
    
    function showBlurredBackground(focusedFrameId) {
        // create a fullscreen div with webkit-backdrop-filter: blur(), if it isn't already shown
        let blur = document.getElementById('blurredEnvelopeBackground');
        if (!blur) {
            blur = document.createElement('div');
            blur.id = 'blurredEnvelopeBackground';
        }
        let GUI = document.getElementById('GUI');
        // let focusedElement = document.getElementById('object' + focusedFrameId);
        // focusedElement.parentNode.insertBefore(blur, focusedElement);
        GUI.parentNode.insertBefore(blur, GUI);
        blur.style.display = 'inline';

        if (globalDOMCache[focusedFrameId]) {
            globalDOMCache[focusedFrameId].classList.add('deactivatedIframeOverlay');
        }

        if (knownEnvelopes[focusedFrameId]) {
            knownEnvelopes[focusedFrameId].isFull2D = true;
            updateExitButton();
        }

        // hide all other frames and icons while the full2D frame is open
        let otherFrames = Array.from(document.querySelectorAll('.visibleFrameContainer, .visibleFrame')).filter(element => {
            return !element.id.includes(focusedFrameId);
        });
        otherFrames.forEach(frame => {
            frame.classList.add('hiddenByFull2DBlurredBackground');
        });

        // just hiding the iframes still leaves their proxied gl content on the screen. hide the canvas.
        // this should be safe to do because the focused full2D tool is 2D by nature and shouldn't be using the 3D canvas
        let webGlCanvas = document.getElementById('glcanvas');
        if (webGlCanvas) {
            webGlCanvas.classList.add('hiddenByFull2DBlurredBackground');
        }

        callbacks.onFullscreenFull2DToggled.forEach(cb => cb({
            frameId: focusedFrameId,
            isFull2D: true
        }));
    }
    
    function hideBlurredBackground(focusedFrameId) {
        // hide the fullscreen blurred div, if it exists
        let blur = document.getElementById('blurredEnvelopeBackground');
        if (blur) {
            blur.style.display = 'none';
        }

        if (globalDOMCache[focusedFrameId]) {
            globalDOMCache[focusedFrameId].classList.remove('deactivatedIframeOverlay');
        }

        if (knownEnvelopes[focusedFrameId]) {
            knownEnvelopes[focusedFrameId].isFull2D = false;
            updateExitButton();
        }

        // show all frames and icons that were hidden when the full2D frame opened, and the webgl canvas
        Array.from(document.querySelectorAll('.hiddenByFull2DBlurredBackground')).forEach(element => {
            element.classList.remove('hiddenByFull2DBlurredBackground');
        });

        callbacks.onFullscreenFull2DToggled.forEach(cb => cb({
            frameId: focusedFrameId,
            isFull2D: false
        }));
    }

    exports.initService = initService; // ideally, for a self-contained service, this is the only export.

    exports.getKnownEnvelopes = function() {
        return knownEnvelopes;
    }
    
    exports.showBlurredBackground = showBlurredBackground;
    exports.hideBlurredBackground = hideBlurredBackground;

    exports.getOpenEnvelopes = getOpenEnvelopes;
    exports.openEnvelope = openEnvelope;
    exports.closeEnvelope = closeEnvelope;
    exports.focusEnvelope = focusEnvelope;
    exports.blurEnvelope = blurEnvelope;

}(realityEditor.envelopeManager));
