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

    this.updateSpeechConsole();
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
    
    var context = this.getClosestObjectNodePair();
    if (!context) {
        context = {objectKey: null, nodeKey: null};
    }
    
    return {
        word: wordData.word,
        index: wordData.index,
        contextObject: context.objectKey,
        contextNode: context.nodeKey 
    };
    
};

realityEditor.device.speechProcessor.wordTypeCategorizer = function(wordData) {
    
    var locationVocab = [
        'this',
        'that'
    ];
    var nodeNames = this.getNodeNamesAndKeys(wordData.contextObject).map(function(node){return node.name;});
    locationVocab.push.apply(locationVocab, nodeNames);
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
        this.highlightLocation(location);
    }
    
    return {
        word: wordData.word,
        index: wordData.index,
        contextObject: wordData.contextObject,
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
            this.resetSpeechRecording();
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
            this.resetSpeechRecording();
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

// realityEditor.device.speechProcessor.resetPendingWords = function() {
//     this.states.pendingWordData = [];
// };

realityEditor.device.speechProcessor.updateSpeechConsole = function() {
    var consoleElement = document.getElementById('speechConsole'); //.style.display = 'none';
    if (consoleElement) {
        consoleElement.innerHTML = '';
        this.states.pendingWordData.forEach(function(wordData) {
            consoleElement.innerHTML += wordData.word + ' ';
        });
    }
};

realityEditor.device.speechProcessor.resetSpeechRecording = function() {
    console.log("RESET SPEECH RECORDING");

    this.states.pendingWordData = [];
    this.resetPreviouslyHighlightedLocation(this.states.highlightedLocation);

    realityEditor.app.stopSpeechRecording();

    setTimeout( function() {
        realityEditor.app.addSpeechListener("realityEditor.device.speechProcessor.speechRecordingCallback"); //"realityEditor.device.speech.speechRecordingCallback"); // already set
        realityEditor.app.startSpeechRecording();
    }, 500);
};

// TODO: use one of these that uses frames too
realityEditor.device.speechProcessor.getClosestObjectNodePair = function() {
    var visibleObjectKeys = this.getVisibleObjectKeys();
    if (visibleObjectKeys.length === 0) return null;

    var objectNodeCombos = [];
    var that = this;
    // find best node on each visible object
    visibleObjectKeys.forEach( function(objectKey) {
        objectNodeCombos.push(that.getClosestNodeOnObject(objectKey));
    });

    // choose the closest one
    var closestDistance = objectNodeCombos[0];
    var closestIndex = 0;
    objectNodeCombos.forEach(function(elt, i) {
        if (elt.distanceSquared < closestDistance) {
            closestDistance = elt.distanceSquared;
            closestIndex = i;
        }
    });

    return {
        objectKey: objectNodeCombos[closestIndex].objectKey,
        nodeKey: objectNodeCombos[closestIndex].nodeKey
    }
};

realityEditor.device.speechProcessor.resolveLocation = function(wordData) {

    var objectKey = null;
    var nodeKey = null;

    if (wordData.word === "this" || wordData.word === "that") {
        objectKey = wordData.contextObject;
        nodeKey = wordData.contextNode;

    } else {
        var nodeNamesAndKeys = this.getNodeNamesAndKeys(wordData.contextObject);
        var nodeNames = nodeNamesAndKeys.map(function(node){ return node.name; });
        var nodeNameIndex = nodeNames.indexOf(wordData.word);
        if (nodeNameIndex > -1) {
            objectKey = wordData.contextObject;
            nodeKey = nodeNamesAndKeys[nodeNameIndex].key;
        }
    }

    return {
        objectKey: objectKey,
        nodeKey: nodeKey
    };
};

realityEditor.device.speechProcessor.getVisibleObjectKeys = function() {
    var visibleObjectKeys = [];
    for (var key in objects) {
        if (!objects.hasOwnProperty(key)) continue;
        if (objects[key].objectVisible) {
            visibleObjectKeys.push(key);
        }
        // console.log( objects[key].name, objects[key].visible );
    }
    return visibleObjectKeys;
};

realityEditor.device.speechProcessor.getClosestNodeOnObject = function(objectKey) {
    var nodes = objects[objectKey].nodes;
    var screenCenter = [284, 160]; // TODO: calculate each time based on screen size
    var closestDistanceSquared = Math.POSITIVE_INFINITY;
    var closestNodeKey = null;
    for (var nodeKey in nodes) {
        if (!nodes.hasOwnProperty(nodeKey)) continue;
        var node = nodes[nodeKey];

        var element = document.getElementById('object' + nodeKey);
        if (!element) continue;
        
        var matrixString = window.getComputedStyle(element).webkitTransform;
        if (matrixString.startsWith('matrix3d')) { // get the matrix from the transform3d string
            var matrix = matrixString
                .split('(')[1]
                .split(')')[0]
                .split(',')
                .map(parseFloat);
            node.temp = matrix;
        }

        var dObject = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY(node, screenCenter);
        var nodeOffset = {x: dObject[0] - node.x, y: dObject[1] - node.y};
        var totalDistanceSquared =  nodeOffset.x * nodeOffset.x + nodeOffset.y * nodeOffset.y;

        // console.log(node.name, node.x + ' -> ' + nodeOffset.x, node.y + ' -> ' + nodeOffset.y, totalDistanceSquared);

        if (closestNodeKey) {
            if (totalDistanceSquared < closestDistanceSquared) {
                closestNodeKey = nodeKey;
                closestDistanceSquared = totalDistanceSquared;
            }
        } else {
            closestNodeKey = nodeKey;
            closestDistanceSquared = totalDistanceSquared;
        }
    }
    return {
        objectKey: objectKey,
        nodeKey: closestNodeKey,
        distanceSquared: closestDistanceSquared
    };
};

realityEditor.device.speechProcessor.getNodeNamesAndKeys = function(objectKey) {
    var nodeNamesAndKeys = [];
    if (objectKey && objects.hasOwnProperty(objectKey)) { // node names of closest object become available
        var obj = objects[objectKey];
        nodeNamesAndKeys = Object.keys(obj.nodes).map( function(nodeKey) {
            return {
                name: obj.nodes[nodeKey].name,
                key: nodeKey
            }; // TODO: what to do about node names with spaces? and numbers? --> also keep full transcription and check against version with spaces
        });
    }
    return nodeNamesAndKeys;
};

realityEditor.device.speechProcessor.highlightLocation = function(location) {
    if (location && location.objectKey && location.nodeKey) {
        var nodeDom = globalDOMCache["iframe" + location.nodeKey];
        if (nodeDom) {
            var contentForFeedback = 3;
            nodeDom.contentWindow.postMessage( JSON.stringify({ uiActionFeedback: contentForFeedback }) , "*");
        }
        
        // reset previously highlighted location
        this.resetPreviouslyHighlightedLocation(this.states.highlightedLocation);
        this.states.highlightedLocation = location;
    }
};

realityEditor.device.speechProcessor.resetPreviouslyHighlightedLocation = function() {
    var previousLocation = this.states.highlightedLocation;
    if (previousLocation && previousLocation.objectKey && previousLocation.nodeKey) {
        var previousNodeDom = globalDOMCache["iframe" + previousLocation.nodeKey];
        if (previousNodeDom) {
            var contentForFeedback = 1;
            previousNodeDom.contentWindow.postMessage( JSON.stringify({ uiActionFeedback: contentForFeedback }) , "*");
        }
    }
    this.states.highlightedLocation = null;
};
