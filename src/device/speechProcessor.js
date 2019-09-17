createNameSpace('realityEditor.device.speechProcessor');

/**
 * @fileOverview realityEditor.device.speechProcessor.js
 * A "home made" library for processing a speech transcript given by the Siri speech API,
 * and extracting Reality Editor actions that the speech should trigger.
 * Generally works by parsing phrases into actions and things to act upon, sometimes using
 * visual context of what you are currently look at to disambiguate.
 * @todo speech is not fully supported anymore
 */

/**
 * @type {{pendingWordData: Array, previousTranscription: null, highlightedLocation: null}}
 */
realityEditor.device.speechProcessor.states = {
    pendingWordData: [],
    previousTranscription: null,
    highlightedLocation: null
};

/**
 * Called directly by native iOS app whenever a new word is detected.
 * Triggers the full parsing process to handle the incoming speech.
 * @param {string} bestTranscription - a phrase containing all text since the last time speech recognition was reset
 */
realityEditor.device.speechProcessor.speechRecordingCallback = function(bestTranscription) {
    if (bestTranscription !== realityEditor.device.speechProcessor.states.previousTranscription) {
        realityEditor.device.speechProcessor.parsePhrase(bestTranscription);
        realityEditor.device.speechProcessor.states.previousTranscription = bestTranscription;
    }
};

/**
 * When a new phrase is received, extracts the new word that the user just said,
 * tags it with location context (which object/frame/node you are looking at),
 * categorizes them into actions, locations, and data words, and tries to match
 * the phrase structure against a set of known ways to say something meaningful.
 * @param {string} phrase
 */
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

    // optional: debug print the full phrase to the speech console
    realityEditor.device.speechPerformer.updateSpeechConsole();
};

/**
 * Finds the last word in a string and returns it (lowercase) along with its index in the string
 * @param {string} phrase
 * @return {{word: string, index: number}}
 */
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

/**
 * Attaches the context object, frame, and node to a word data, based on what you are looking at
 * @param {{word: string, index: number}} wordData
 * @return {{word: string, index: number, contextObject: string, contextFrame: string, contextNode: string}}
 */
realityEditor.device.speechProcessor.contextTagger = function(wordData) {
    
    var context = this.getClosestObjectFrameNode();
    if (!context) {
        context = {objectKey: null, frameKey: null, nodeKey: null};
    }
    
    // adds context to the wordData object
    return {
        word: wordData.word,
        index: wordData.index,
        contextObject: context.objectKey,
        contextFrame: context.frameKey,
        contextNode: context.nodeKey 
    };
};

/**
 * Assigns one of the following categories to the wordData, by checking it against certain known vocabulary lists:
 * [NONE, LOCATION, ACTION, DATA, PIVOT]
 * @param {{word: string, index: number, contextObject: string, contextFrame: string, contextNode: string} wordData
 * @return {{word: string, index: number, contextObject: string, contextFrame: string, contextNode: string, category: string}}
 */
realityEditor.device.speechProcessor.wordTypeCategorizer = function(wordData) {
    
    var locationVocab = [
        'this',
        'that'
    ];
    
    // names of nodes in the word's context frame are considered valid locations
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
    
    // a "pivot" is something breaking the phrase in two, from a start location to an end location
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
    
    // adds category to the wordData object
    return {
        word: wordData.word,
        index: wordData.index,
        contextObject: wordData.contextObject,
        contextFrame: wordData.contextFrame,
        contextNode: wordData.contextNode,
        category: category // OR doesn't get given a category but gets put in a separate bucket depending on each
    };
    
};

/**
 * Tries to match the entirety of the recognized phrase (stored in this.states.pendingWordData) against
 * a set of known ways to phrase a meaningful action.
 * If any are matched, triggers the resulting action in the speechPerformer module.
 * @todo some actions still need to be implemented
 * @param {{word: string, index: number, contextObject: string, contextFrame: string, contextNode: string, category: string}} lastWordData
 */
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
    // var pivotWords = this.states.pendingWordData.filter( function(wordData) {
    //     return wordData.category === 'PIVOT';
    // });

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

/**
 * Gets a random frame on the given object (or the first, if chooseRandom is false).
 * @param {string} objectKey
 * @param {boolean} chooseRandom
 * @return {Frame}
 */
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

/**
 * Gets a random node on the given frame (or the first, if chooseRandom is false)
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {boolean} chooseRandom
 * @return {Node}
 */
realityEditor.device.speechProcessor.getNodeOnFrame = function(objectKey, frameKey, chooseRandom) {

    var nodeKeys = this.getNodeNamesAndKeys(objectKey, frameKey).map(function(elt) {
        return elt.key;
    });
    if (nodeKeys.length === 0) return null;
    var index = chooseRandom ? Math.floor(Math.random() * nodeKeys.length) : 0;
    return nodeKeys[index]; //realityEditor.getNode(objectKey, frameKey, nodeKeys[index]);

};

/**
 * Get a list of all the node names and nodeKeys on the specified frame.
 * @param {string} objectKey
 * @param {string} frameKey
 * @return {Array<{name: string, key: string}>}
 */
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


/**
 * Gets the object, frame, and node that the user is looking at right now.
 * @todo use realityEditor.gui.ar.getClosestNode instead, or realityEditor.gui.ar.getClosestFrameToScreenCoordinates(width/2,height/2)
 * @return {Location}
 */
realityEditor.device.speechProcessor.getClosestObjectFrameNode = function() {
    var visibleObjectKeys = this.getVisibleObjectKeys();
    if (visibleObjectKeys.length === 0) return null;

    var closest = realityEditor.gui.ar.getClosestNode();

    return {
        objectKey: closest[0],
        frameKey: closest[1],
        nodeKey: closest[2]
    }
};

/**
 * Takes in a spoken word and interprets it into an object/frame/node path, using context when necessary.
 * @param {{word: string, index: number, contextObject: string, contextFrame: string, contextNode: string, category: string}} wordData
 * @return {Location}
 */
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

/**
 * Helper function that returns an array of all the objectKeys of currently visible objects.
 * @todo: this can be done more efficiently with Object.keys(realityObject.gui.ar.draw.visibleObjects)
 * @return {Array.<string>}
 */
realityEditor.device.speechProcessor.getVisibleObjectKeys = function() {
    var visibleObjectKeys = [];
    realityEditor.forEachObject( function(object, objectKey) {
        if (object.objectVisible) {
            visibleObjectKeys.push(objectKey);
        }
    });
    return visibleObjectKeys;
};
