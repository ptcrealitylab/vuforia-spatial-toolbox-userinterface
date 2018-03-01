createNameSpace('realityEditor.device.speechProcessor');

realityEditor.device.speechProcessor.states = {
    pendingWordData: [],
    previousTranscription: null,
    highlightedLocation: null
};

realityEditor.device.speechProcessor.speechRecordingCallback = function(bestTranscription) {
    if (bestTranscription !== realityEditor.device.speechProcessor.states.previousTranscription) {
        realityEditor.device.speechProcessor.parsePhrase(bestTranscription);
        realityEditor.device.speechProcessor.states.previousTranscription = bestTranscription;
    }
};

realityEditor.device.speechProcessor.parsePhrase = function(phrase) {
    
    // 1. get last word
    var lastWordData = this.lastWordExtractor(phrase);
    // console.log(lastWordData);
    
    // 2. tag with object/node context
    lastWordData = this.contextTagger(lastWordData);
    // console.log(lastWordData);
    
    // 3. categorize as an action, location, data (or pivot)
    lastWordData = this.wordTypeCategorizer(lastWordData);
    console.log(lastWordData);
    
    // 4. match against action recipes
    this.recipeMatcher(lastWordData);

    realityEditor.device.speechPerformer.updateSpeechConsole();
};

realityEditor.device.speechProcessor.lastWordExtractor = function(phrase) {
    
    var lowerCasePhrase = phrase.toLowerCase();
    var listOfWords = lowerCasePhrase.split(' ');
    var lastWordIndex = listOfWords.length - 1;
    var lastWord = listOfWords[lastWordIndex];
    
    return {
        word: lastWord,
        index: lastWordIndex
    };
    
};

realityEditor.device.speechProcessor.contextTagger = function(wordData) {
    
    var context = this.getClosestObjectFrameNode();
    if (!context) {
        context = {objectKey: null, frameKey: null, nodeKey: null};
    }
    
    return {
        word: wordData.word,
        index: wordData.index,
        contextObject: context.objectKey,
        contextFrame: context.frameKey,
        contextNode: context.nodeKey 
    };
    
};

realityEditor.device.speechProcessor.wordTypeCategorizer = function(wordData) {
    
    var locationVocab = [
        'this',
        'that'
    ];
    
    if (wordData.contextObject && wordData.contextFrame) {
        var nodeNamesAndKeys = this.getNodeNamesAndKeys(wordData.contextObject, wordData.contextFrame);
        locationVocab.push.apply(locationVocab, nodeNamesAndKeys.map(function(elt) { return elt.name; }));
    }
    console.log(locationVocab);
    
    // TODO: add object names for other objects around the room
    
    var actionVocab = [
        'connect',
        'disconnect',
        'lock',
        'unlock',
        'set',
        'stop'
    ];
    
    var dataVocab = [
        'on',
        'off',
        'zero',
        'one',
        'half'
    ];
    
    var pivotVocab = [
        'with',
        'to',
        'and'
    ];
    
    var category = 'NONE';
    
    if (locationVocab.indexOf(wordData.word) > -1) {
        category = 'LOCATION';
    } else if (actionVocab.indexOf(wordData.word) > -1) {
        category = 'ACTION';
    } else if (dataVocab.indexOf(wordData.word) > -1) {
        category = 'DATA';
    } else if (pivotVocab.indexOf(wordData.word) > -1) {
        category = 'PIVOT';
    }

    // check if matched node with 2-word name
    if (this.states.pendingWordData.length > 0) {
        var previousWordData = this.states.pendingWordData[this.states.pendingWordData.length-1];
        var complexName = previousWordData.word + " " + wordData.word;
        if (locationVocab.indexOf(complexName) > -1) {
            console.log("Matched node location: " + complexName);
            this.states.pendingWordData.pop();
            wordData.word = complexName;
        }
    }
    
    // provide visual feedback to show the user which node they highlighted
    if (category === 'LOCATION') {
        var location = this.resolveLocation(wordData);
        realityEditor.device.speechPerformer.highlightLocation(location);
    }
    
    return {
        word: wordData.word,
        index: wordData.index,
        contextObject: wordData.contextObject,
        contextFrame: wordData.contextFrame,
        contextNode: wordData.contextNode,
        category: category // OR doesn't get given a category but gets put in a separate bucket depending on each
    };
    
};

realityEditor.device.speechProcessor.recipeMatcher = function(lastWordData) {

    this.states.pendingWordData.push(lastWordData);

    // get words of each category

    var locationWords = this.states.pendingWordData.filter( function(wordData) {
        return wordData.category === 'LOCATION';
    });
    
    var actionWords = this.states.pendingWordData.filter( function(wordData) {
        return wordData.category === 'ACTION';
    });

    var dataWords = this.states.pendingWordData.filter( function(wordData) {
        return wordData.category === 'DATA';
    });
    
    // TODO: use this for more intelligent separation of location A and B
    var pivotWords = this.states.pendingWordData.filter( function(wordData) {
        return wordData.category === 'PIVOT';
    });

    console.log(locationWords, actionWords, dataWords);
    
    // try to fill slots of different recipes (be aware of index/order of words)
    
    var actionPerformed = null;
    
    while (actionWords.length > 0) {

        var action = actionWords.shift();

        if (action.word === 'stop' || action.word === 'reset') {
            realityEditor.device.speechPerformer.resetSpeechRecording();
            return;
        }
        
        if (action.word === 'connect') {
            var locationsAfterAction = locationWords.filter(function(wordData) {
                return wordData.index > action.index;
            });
            if (locationsAfterAction.length >= 2) {
                var locationB = locationsAfterAction.pop(); //locationWords.shift();
                var locationA = locationsAfterAction.pop(); //locationWords.shift();
                console.log('connect ' + locationA.word + ' with ' + locationB.word);
                
                var linkLocationA = this.resolveLocation(locationA);
                var linkLocationB = this.resolveLocation(locationB);
                
                realityEditor.device.speechPerformer.createLink(linkLocationA, linkLocationB);
                actionPerformed = "connect";
            }
        }

        // TODO: implement other voice commands
        /*
        else if (action.word === 'disconnect') {
            if (locationWords.length >= 2) {
                console.log('disconnect ' + locationWords.shift().word + ' with ' + locationWords.shift().word);
                actionPerformed = "disconnect";
            }
        }

        else if (action.word === 'lock') {
            if (locationWords.length >= 1) {
                console.log('lock ' + locationWords.shift().word);
                actionPerformed = "lock";
            }
        }

        else if (action.word === 'unlock') {
            if (locationWords.length >= 1) {
                console.log('unlock ' + locationWords.shift().word);
                actionPerformed = "unlock";
            }
        }

        else if (action.word === 'set') {
            if (locationWords.length >= 1 && dataWords.length >= 1) {
                console.log('set ' + locationWords.shift().word + ' to ' + dataWords.shift().word);
                actionPerformed = "set";
            }
        }
        */
        
        else if (action.word === 'stop') {
            actionPerformed = 'stop';
        }

        if (actionPerformed) {
            // this.resetPendingWords();
            realityEditor.device.speechPerformer.resetSpeechRecording();
            return;
        }
    }
    
};

// TODO: implement this to only perform each action after a 2 second delay at end of speech, rather than immediately,
// TODO: ...this will allow nodes with multiple word names to be recognized as a whole instead of stopping at first word
// var timeout;
// function performSpeechActionUnlessNewWords(action, data) {
//     clearTimeout(timeout);
//     timeout = setTimeout(function() {
//         // perform action passed in
//     }, 2000);
//     // clear previous timeout if it gets called again
// }


////////////////////////////////////////////////////////////////////////////
///////////////////////////// Helper Methods ///////////////////////////////
////////////////////////////////////////////////////////////////////////////

// gets a random frame on the given object (or the first, if chooseRandom is false)
realityEditor.device.speechProcessor.getFrameOnObject = function(objectKey, chooseRandom) {

    var frameKeys = [];
    realityEditor.forEachFrameInObject(objectKey, function(objectKey, frameKey) {
        frameKeys.push(frameKey);
    });
    if (frameKeys.length === 0) return null;
    var index = chooseRandom ? Math.floor(Math.random() * frameKeys.length) : 0;
    // return realityEditor.getFrame(objectKey, frameKeys[index]);
    return frameKeys[index];
};

// gets a random node on the given frame (or the first, if chooseRandom is false)
realityEditor.device.speechProcessor.getNodeOnFrame = function(objectKey, frameKey, chooseRandom) {

    var nodeKeys = this.getNodeNamesAndKeys(objectKey, frameKey).map(function(elt) {
        return elt.key;
    });
    if (nodeKeys.length === 0) return null;
    var index = chooseRandom ? Math.floor(Math.random() * nodeKeys.length) : 0;
    return nodeKeys[index]; //realityEditor.getNode(objectKey, frameKey, nodeKeys[index]);

};

realityEditor.device.speechProcessor.getNodeNamesAndKeys = function(objectKey, frameKey) {
    var nodeNames = [];
    realityEditor.forEachNodeInFrame(objectKey, frameKey, function(objectKey, frameKey, nodeKey) {
        var node = realityEditor.getNode(objectKey, frameKey, nodeKey);
        nodeNames.push({name: node.name.toLowerCase(), key: nodeKey});
    });
    return nodeNames;
};


// realityEditor.device.speechProcessor.resetPendingWords = function() {
//     this.states.pendingWordData = [];
// };

// TODO: use one of these that uses frames too
realityEditor.device.speechProcessor.getClosestObjectFrameNode = function() {
    var visibleObjectKeys = this.getVisibleObjectKeys();
    if (visibleObjectKeys.length === 0) return null;

    var that = this;
    // find best node on each visible object
    var objectFrameNodeOptions = visibleObjectKeys.map( function(objectKey) {
        return that.getClosestNodeOnObject(objectKey);
    });

    // choose the closest one
    var closestDistance = objectFrameNodeOptions[0].distanceSquared;
    var closestIndex = 0;
    objectFrameNodeOptions.forEach(function(elt, i) {
        if (elt.distanceSquared < closestDistance) {
            closestDistance = elt.distanceSquared;
            closestIndex = i;
        }
    });

    return {
        objectKey: objectFrameNodeOptions[closestIndex].objectKey,
        frameKey: objectFrameNodeOptions[closestIndex].frameKey,
        nodeKey: objectFrameNodeOptions[closestIndex].nodeKey
    }
};

realityEditor.device.speechProcessor.resolveLocation = function(wordData) {

    var objectKey = null;
    var frameKey = null;
    var nodeKey = null;

    if (wordData.word === "this" || wordData.word === "that") {
        objectKey = wordData.contextObject;
        frameKey = wordData.contextFrame;
        nodeKey = wordData.contextNode;

    } else {
        var nodeNamesAndKeys = this.getNodeNamesAndKeys(wordData.contextObject, wordData.contextFrame);
        var nodeNames = nodeNamesAndKeys.map(function(elt) {
            return elt.name;
        });
        var nodeNameIndex = nodeNames.indexOf(wordData.word);
        if (nodeNameIndex > -1) {
            objectKey = wordData.contextObject;
            frameKey = wordData.contextFrame;
            nodeKey = nodeNamesAndKeys[nodeNameIndex].key;
        }
    }

    return {
        objectKey: objectKey,
        frameKey: frameKey,
        nodeKey: nodeKey
    };
};

realityEditor.device.speechProcessor.getVisibleObjectKeys = function() {
    var visibleObjectKeys = [];
    realityEditor.forEachObject( function(object, objectKey) {
        if (object.objectVisible) {
            visibleObjectKeys.push(objectKey);
        }
    });
    return visibleObjectKeys;
};

realityEditor.device.speechProcessor.getClosestNodeOnObject = function(objectKey) {
    
    var screenCenter = [284, 160]; // TODO: calculate each time based on screen size
    var closestDistanceSquared = Math.POSITIVE_INFINITY;
    var closestFrameKey = null;
    var closestNodeKey = null;
    
    realityEditor.forEachNodeInObject(objectKey, function (objectKey, frameKey, nodeKey) {
        var node = realityEditor.getNode(objectKey, frameKey, nodeKey);
        var element = document.getElementById('object' + nodeKey);
        if (!element) return;

        var matrixString = window.getComputedStyle(element).webkitTransform;
        if (matrixString.startsWith('matrix3d')) { // get the matrix from the transform3d string
            var matrix = matrixString
                .split('(')[1]
                .split(')')[0]
                .split(',')
                .map(parseFloat);
            node.temp = matrix;
        }

        var screenCenterMatrixXY = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY(node, screenCenter); // TODO: change to markerXY
        var nodeOffsetToCenter = {x: screenCenterMatrixXY[0] - node.x, y: screenCenterMatrixXY[1] - node.y};
        var totalDistanceSquared =  nodeOffsetToCenter.x * nodeOffsetToCenter.x + nodeOffsetToCenter.y * nodeOffsetToCenter.y;

        if (closestNodeKey) {
            if (totalDistanceSquared < closestDistanceSquared) {
                closestNodeKey = nodeKey;
                closestFrameKey = frameKey;
                closestDistanceSquared = totalDistanceSquared;
            }
        } else {
            closestNodeKey = nodeKey;
            closestFrameKey = frameKey;
            closestDistanceSquared = totalDistanceSquared;
        }
        
    });
    
    return {
        objectKey: objectKey,
        frameKey: closestFrameKey,
        nodeKey: closestNodeKey,
        distanceSquared: closestDistanceSquared
    };
};
