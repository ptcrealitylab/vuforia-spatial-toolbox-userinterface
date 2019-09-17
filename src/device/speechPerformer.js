createNameSpace('realityEditor.device.speechPerformer');

/**
 * @fileOverview realityEditor.device.speechPerformer.js
 * A set of actions that can be performed by speech commands.
 * These functions are the endpoints triggered by speech that is recognized in speechProcessor.js.
 * @todo many actions need full implementation
 * @todo speech is not fully supported anymore
 */

/**
 * Public init method sets up module and registers callbacks in other modules
 */
realityEditor.device.speechPerformer.initFeature = function() {
    var SPEECH_FEATURE_ENABLED = true;
    
    if (SPEECH_FEATURE_ENABLED) {
        realityEditor.gui.ar.draw.addUpdateListener(function(_visibleObjects) {

            if (!(globalStates.guiState === "node" || globalStates.guiState === "logic")) { return; }
            if (globalStates.editingMode) { return; }

            // while speech state is on, give the user some visual feedback about which node is being recognized as speech context (closest to middle of screen)
            if (globalStates.speechState) {

                globalStates.nodeSpeechHighlightCounter++;
                if (globalStates.nodeSpeechHighlightCounter > 20) {

                    var closest = realityEditor.gui.ar.getClosestNode(); //realityEditor.device.speechProcessor.getClosestObjectFrameNode();
                    if (!closest) return;

                    // reset all other nodes to full opacity
                    realityEditor.forEachNodeInAllObjects( function(objectKey, frameKey, nodeKey) {
                        var nodeDom = document.getElementById('object' + nodeKey);
                        if (nodeDom && nodeDom.style.opacity !== "1") {
                            nodeDom.style.opacity = "1";
                        }
                    });

                    // highlight the closest one with semi-transparency
                    var closestNodeDom = document.getElementById('object' + closest[2]);
                    if (closestNodeDom && closestNodeDom.style.opacity !== "0.33") {
                        closestNodeDom.style.opacity = "0.33"; // opacity = 0.33;
                    }

                    globalStates.nodeSpeechHighlightCounter = 0;
                }

            }
        });
    }
};

///////// ROUTES //////////

/**
 * @typedef {Object} Location
 * @property {string} objectKey
 * @property {string} frameKey
 * @property {string} nodeKey
 */

/**
 * Creates a link between two locations (can be triggered by a speech command).
 * @param {Location} locationA
 * @param {Location} locationB
 */
realityEditor.device.speechPerformer.createLink = function(locationA, locationB) {
    
    var speechProcessor = realityEditor.device.speechProcessor;
    
    if (!locationA.objectKey || !locationB.objectKey) {
        console.warn("Can't create link - provide two valid objects!");
        return;
    }
    
    var frameKeyA = locationA.frameKey || speechProcessor.getFrameOnObject(locationA.objectKey, false); // guess a frame if only the object was specified
    var frameKeyB = locationB.frameKey || speechProcessor.getFrameOnObject(locationB.objectKey, false);

    if (!frameKeyA || !frameKeyB) {
        console.warn("Can't create link - provide two valid frames!");
        return;
    }
    
    var nodeKeyA = locationA.nodeKey || speechProcessor.getNodeOnFrame(locationA.objectKey, frameKeyA, false); // guess a node if only the object was specified
    var nodeKeyB = locationB.nodeKey || speechProcessor.getNodeOnFrame(locationB.objectKey, frameKeyB, false);
    
    if (!nodeKeyA || !nodeKeyB) {
        console.warn("Can't create link - the objects you chose don't both have nodes!");
        return;
    }

    var nodeA = realityEditor.getNode(locationA.objectKey, frameKeyA, nodeKeyA);
    var nodeB = realityEditor.getNode(locationB.objectKey, frameKeyB, nodeKeyB);

    if (!nodeA || !nodeB) {
        console.warn("Can't create link - the specified nodes don't exist!");
        return;
    }
    
    if (nodeA.type === 'logic' || nodeB.type === 'logic') {
        console.warn("!!! can't handle logic nodes yet with speech !!!"); // TODO: make it work with logic nodes too
        return;
    }

    var linkObject = {
        logicA: false,
        logicB: false,
        logicSelector: 4, // doesn't matter right now
        nodeA: nodeKeyA,
        nodeB: nodeKeyB,
        frameA: frameKeyA,
        frameB: frameKeyB,
        objectA: locationA.objectKey,
        objectB: locationB.objectKey
    };

    realityEditor.network.postLinkToServer(linkObject);
    // this.drawLink(linkObject);
    
};

/**
 * Remove the link between two locations, if there is one.
 * @todo implement
 * @param {Location} locationA
 * @param {Location} locationB
 */
realityEditor.device.speechPerformer.deleteLink = function(_locationA, _locationB) {
    
};

/**
 * Lock the node at the specified location.
 * @todo implement
 * @param {Location} location
 */
realityEditor.device.speechPerformer.createLock = function(_location) {
    
};

/**
 * Unlock the node at the specified location.
 * @todo implement
 * @param {Location} location
 */
realityEditor.device.speechPerformer.deleteLock = function(_location) {
    
};

/**
 * Set the data value of the node at the specified location to the specified value.
 * @todo implement
 * @param {Location} location
 * @param {number} value
 */
realityEditor.device.speechPerformer.setValue = function(_location, _value) {
    
};

///////// SECONDARY EFFECTS //////////

/**
 * Debug write the spoken transcript to the speechConsole div.
 */
realityEditor.device.speechPerformer.updateSpeechConsole = function() {
    var consoleElement = document.getElementById('speechConsole');
    if (consoleElement) {
        consoleElement.innerHTML = '';
        realityEditor.device.speechProcessor.states.pendingWordData.forEach(function(wordData) {
            consoleElement.innerHTML += wordData.word + ' ';
        });
    }
};

/**
 * Stop the speech recording, stop highlighting whatever it highlighted, and start the speech recording again.
 */
realityEditor.device.speechPerformer.resetSpeechRecording = function() {
    console.log("RESET SPEECH RECORDING");
    
    var speechProcessor = realityEditor.device.speechProcessor;

    speechProcessor.states.pendingWordData = [];
    this.resetPreviouslyHighlightedLocation(speechProcessor.states.highlightedLocation);

    realityEditor.app.stopSpeechRecording();

    setTimeout( function() {
        realityEditor.app.addSpeechListener("realityEditor.device.speechProcessor.speechRecordingCallback"); //"realityEditor.device.speech.speechRecordingCallback"); // already set
        realityEditor.app.startSpeechRecording();
    }, 500);
};

/**
 * Visually highlight the node at the specified location.
 * @param {Location} location
 */
realityEditor.device.speechPerformer.highlightLocation = function(location) {
    if (location && location.objectKey && location.frameKey && location.nodeKey) {
        var nodeDom = globalDOMCache["iframe" + location.nodeKey];
        if (nodeDom) {
            var contentForFeedback = 3;
            nodeDom.contentWindow.postMessage( JSON.stringify({ uiActionFeedback: contentForFeedback }) , "*");
        }

        var states = realityEditor.device.speechProcessor.states;
        // reset previously highlighted location
        this.resetPreviouslyHighlightedLocation(states.highlightedLocation);
        states.highlightedLocation = location;
    }
};

/**
 * Stop the visual highlight of the previous highlightedLocation.
 */
realityEditor.device.speechPerformer.resetPreviouslyHighlightedLocation = function() {
    var states = realityEditor.device.speechProcessor.states;
    var previousLocation = states.highlightedLocation;
    if (previousLocation && previousLocation.objectKey && previousLocation.frameKey && previousLocation.nodeKey) {
        var previousNodeDom = globalDOMCache["iframe" + previousLocation.nodeKey];
        if (previousNodeDom) {
            var contentForFeedback = 1;
            previousNodeDom.contentWindow.postMessage( JSON.stringify({ uiActionFeedback: contentForFeedback }) , "*");
        }
    }
    states.highlightedLocation = null;
};

