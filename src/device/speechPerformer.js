createNameSpace('realityEditor.device.speechPerformer');

///////// ROUTES //////////

realityEditor.device.speechPerformer.createLink = function(locationA, locationB) {
    
    var speechProcessor = realityEditor.device.speechProcessor;
    
    if (!locationA.objectKey || !locationB.objectKey) {
        console.log("Can't create link - provide two valid objects!");
        return;
    }
    
    var frameA = locationA.frameKey || speechProcessor.getFrameOnObject(locationA.objectKey, false); // guess a frame if only the object was specified
    var frameB = locationB.frameKey || speechProcessor.getFrameOnObject(locationB.objectKey, false);

    if (!frameA || !frameB) {
        console.log("Can't create link - provide two valid frames!");
        return;
    }
    
    var nodeA = locationA.nodeKey || speechProcessor.getNodeOnFrame(locationA.objectKey, frameA, false); // guess a node if only the object was specified
    var nodeB = locationB.nodeKey || speechProcessor.getNodeOnFrame(locationB.objectKey, frameB, false);
    
    if (!nodeA || !nodeB) {
        console.log("Can't create link - the objects you chose don't both have nodes!");
        return;
    }

    if (objects[locationA.objectKey].frames[frameA].nodes[nodeA].type === 'logic' || objects[locationB.objectKey].frames[frameA].nodes[nodeB].type === 'logic') {
        console.warn("!!! can't handle logic nodes yet with speech !!!"); // TODO: make it work with logic nodes too
        return;
    }

    var linkObject = {
        logicA: false,
        logicB: false,
        logicSelector: 4, // doesn't matter right now
        nodeA: nodeA,
        nodeB: nodeB,
        frameA: frameA,
        frameB: frameB,
        objectA: locationA.objectKey,
        objectB: locationB.objectKey
    };

    realityEditor.network.postLinkToServer(linkObject);
    // this.drawLink(linkObject);
    
};

realityEditor.device.speechPerformer.deleteLink = function(locationA, locationB) {
    
};

realityEditor.device.speechPerformer.createLock = function(location) {
    
};

realityEditor.device.speechPerformer.deleteLock = function(location) {
    
};

realityEditor.device.speechPerformer.setValue = function(location, value) {
    
};

///////// SECONDARY EFFECTS //////////

realityEditor.device.speechPerformer.updateSpeechConsole = function() {
    var consoleElement = document.getElementById('speechConsole');
    if (consoleElement) {
        consoleElement.innerHTML = '';
        realityEditor.device.speechProcessor.states.pendingWordData.forEach(function(wordData) {
            consoleElement.innerHTML += wordData.word + ' ';
        });
    }
};

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

