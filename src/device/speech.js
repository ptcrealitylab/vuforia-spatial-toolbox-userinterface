/**
 * @preserve
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *      ╦═╗┌─┐┌─┐┬  ┬┌┬┐┬ ┬  ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐  ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *      ╠╦╝├┤ ├─┤│  │ │ └┬┘  ║╣  │││ │ │ │├┬┘  ╠═╝├┬┘│ │ │├┤ │   │
 *      ╩╚═└─┘┴ ┴┴─┘┴ ┴  ┴   ╚═╝─┴┘┴ ┴ └─┘┴└─  ╩  ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Ben Reynolds on 11/2/17.
 */

createNameSpace("realityEditor.device.speech");

realityEditor.device.speech.speechRecordingCallback = function(bestTranscription) {
    realityEditor.device.speech.parsePhrase(bestTranscription.toLowerCase());
    bestTranscription = bestTranscription.toLowerCase();
    // console.log("Best Transcription", bestTranscription);
    // console.log("Most Recent Word", realityEditor.device.speech.getLastWord(bestTranscription));
    //
    // realityEditor.device.speech.extractLocation(bestTranscription);
    // realityEditor.device.speech.extractAction(bestTranscription);
    // realityEditor.device.speech.extractData(bestTranscription);
};

realityEditor.device.speech.getVisibleObjectKeys = function() {
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

realityEditor.device.speech.createSpeechLink = function(objectA, nodeA, objectB, nodeB) {
    
    if (objects[objectA].nodes[nodeA].type === 'logic' || objects[objectA].nodes[nodeA].type === 'logic') {
        console.log("!!! can't handle logic nodes yet with speech !!!"); // TODO: make it work with logic nodes too
        return;
    }

    var linkObject = {
        logicA: false,
        logicB: false,
        logicSelector: 4, // doesn't matter right now
        nodeA: nodeA,
        nodeB: nodeB,
        objectA: objectA,
        objectB: objectB
    };
    
    realityEditor.network.postLinkToServer(linkObject, objects);
    // this.draw(linkObject, "connected");
    realityEditor.gui.instantConnect.draw(linkObject, "connected");
};

function getClosestNode() {
    var closestObject = objects[globalLogic.farFrontElement]; // TODO: make sure this always gets set, not just when adding a logic node
    var nodes = closestObject.nodes;
    var screenCenter = [284, 160]; // TODO: calculate each time based on screen size
    // var screenCenter = [0, 0];
    var closestDistanceSquared = 100000;
    var closestNodeKey;
    for (var nodeKey in nodes) {
        if (!nodes.hasOwnProperty(nodeKey)) continue;
        var node = nodes[nodeKey];
        
        var element = document.getElementById("thisObject" + nodeKey);
        var matrixString = window.getComputedStyle(element).webkitTransform;
        if (matrixString.startsWith("transform3d")) {
            var matrix = matrixString
                .split('(')[1]
                .split(')')[0]
                .split(',')
                .map(parseFloat);
            node.temp = matrix;
        }
        
        var dObject = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY(node, screenCenter);
        // console.log(dObject);
        var nodeOffset = {x: dObject[0] - node.x, y: dObject[1] - node.y};
        var totalDistanceSquared =  nodeOffset.x * nodeOffset.x + nodeOffset.y * nodeOffset.y;
        
        // console.log(node.name, node.x + " -> " + nodeOffset.x, node.y + " -> " + nodeOffset.y, totalDistanceSquared);
        
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
    return closestNodeKey;
}

// realityEditor.device.speech.parseLocation = function(locationWords, contextObjectKey) {
//    
//     var contextObject = objects[contextObjectKey];
//    
//     console.log(locationWords);
//    
//     var nodeNames = Object.keys(contextObject.nodes).map( function(nodeKey) {
//         return contextObject.nodes[nodeKey].name;
//     });
//    
//     console.log(nodeNames);
//    
//     var mentionedNodeNames = getVocabInWords(nodeNames, locationWords);
//     if (mentionedNodeNames.length > 0) {
//         return {object: contextObjectKey, node: mentionedNodeNames[0]};
//     }
//
//     if (locationWords.indexOf('this') > -1) {
//         return {object: contextObjectKey};
//     }
//    
//     if (locationWords.indexOf('that') > -1) {
//         return {object: contextObjectKey};
//     }
//
//     if (locationWords.indexOf(contextObject.name) > -1) {
//         return {object: contextObjectKey};
//     }
//
//     return {};
// };

realityEditor.device.speech.parsePhrase = function(phrase) {
    var locations = realityEditor.device.speech.extractLocation(phrase);
    var actions = realityEditor.device.speech.extractAction(phrase);
    var data = realityEditor.device.speech.extractData(phrase);
    
    console.log(locations, actions, data);
    
    // var parsedLocation = this.parseLocation(locations, globalLogic.farFrontElement);
    
    if (actions.indexOf('reset') > -1) {
        this.resetSpeechRecording();
        return;
    }
    
    if (!globalStates.pendingSpeechAction) {
        if (actions.indexOf('connect') > -1 || actions.indexOf('link') > -1) {
            globalStates.pendingSpeechAction = 'connect';
        }
    
    }

    if (!globalStates.pendingSpeechObjectA) {
        if (locations.indexOf('this') > -1) {
            globalStates.pendingSpeechObjectA = 'get random node on closest object';
            
            var visibleObjectKeys = this.getVisibleObjectKeys();
            if (visibleObjectKeys.length > 0) {
                globalStates.pendingSpeechObjectA = visibleObjectKeys[0];
            }
            
        }
    }
    
    if (!globalStates.pendingSpeechObjectB) {
        if (locations.indexOf('that') > -1) {
            globalStates.pendingSpeechObjectB = 'get random node on new closest object';

            var visibleObjectKeys = this.getVisibleObjectKeys();
            if (visibleObjectKeys.length > 0) {
                globalStates.pendingSpeechObjectB = visibleObjectKeys[0];
            }
        }
    }
    
    if (globalStates.pendingSpeechAction && globalStates.pendingSpeechObjectA && globalStates.pendingSpeechObjectB) {
        // this.performAction(globalStates.)
        
        if (globalStates.pendingSpeechAction === 'connect') {
            console.log('connect [' + globalStates.pendingSpeechObjectA + '] to [' + globalStates.pendingSpeechObjectB + '] - (performed by speech)');
            
            if (objects.hasOwnProperty(globalStates.pendingSpeechObjectA) && objects.hasOwnProperty(globalStates.pendingSpeechObjectB)) {
                
                var nodesOnA = objects[globalStates.pendingSpeechObjectA].nodes;
                var nodesOnB = objects[globalStates.pendingSpeechObjectB].nodes;
                
                if (nodesOnA && nodesOnB) {
                    
                    var nodeIndexA = 0;
                    var nodeIndexB = 0;
                    var nodeA = Object.keys(nodesOnA).length > 0 ? Object.keys(nodesOnA)[nodeIndexA] : null;
                    var nodeB = Object.keys(nodesOnB).length > 0 ? Object.keys(nodesOnB)[nodeIndexB] : null;
                    
                    if (nodeA && nodeB) {
                        this.createSpeechLink(globalStates.pendingSpeechObjectA, nodeA, globalStates.pendingSpeechObjectB, nodeB);
                    }
                }
            }
        }
        
        this.resetSpeechRecording();
        return;
    }
    
};

realityEditor.device.speech.resetSpeechRecording = function() {
    console.log("RESET SPEECH RECORDING");

    globalStates.pendingSpeechAction = null;
    
    globalStates.pendingSpeechObjectA = null;
    globalStates.pendingSpeechObjectB = null;
    
    globalStates.pendingSpeechNodeA = null;
    globalStates.pendingSpeechNodeB = null;

    realityEditor.app.stopSpeechRecording();
    
    setTimeout( function() {
        realityEditor.app.addSpeechListener("realityEditor.device.speech.speechRecordingCallback"); // already set
        realityEditor.app.startSpeechRecording();
    }, 500);
};

// realityEditor.device.speech.performAction = function(action, locationA, locationB) {
//    
// }

realityEditor.device.speech.getLastWord = function(stringOfWords) {
    var wordsList = stringOfWords.split(" ");
    return wordsList[wordsList.length - 1];
};

realityEditor.device.speech.extractLocation = function(currentPhrase) {
    var wordList = currentPhrase.split(' ');
    console.log(wordList);
    
    var vocabulary = [
        'object',
        'node',
        'this',
        'that'
    ];

    // if (globalLogic.farFrontElement) {
    //     var contextObject = objects[globalLogic.farFrontElement];
    //     var nodeNames = Object.keys(contextObject.nodes).map( function(nodeKey) {
    //         return contextObject.nodes[nodeKey].name;
    //     });
    //     vocabulary.push.apply(vocabulary, nodeNames);
    // }

    return getVocabInWords(wordList, vocabulary);
};

realityEditor.device.speech.extractAction = function(currentPhrase) {
    var wordList = currentPhrase.split(' ');
    console.log(wordList);

    var vocabulary = [
        'set',
        'create',
        'delete',
        'connect',
        'link',
        'reset'
    ];

    return getVocabInWords(wordList, vocabulary);
};

realityEditor.device.speech.extractData = function(currentPhrase) {
    var wordList = currentPhrase.split(' ');
    console.log(wordList);
    
    var vocabulary = [
        'on',
        'off',
        'zero',
        'one',
        'half'
    ];
    
    return getVocabInWords(wordList, vocabulary);
};

// function printVocabInWords(wordList, vocabulary) {
//     vocabulary.forEach(function(word) {
//         console.log( word + "? " + (wordList.indexOf(word) > -1 ? (" ~ YES ~ ") : ("no")) );
//     });
// }

function getVocabInWords(wordList, vocabulary) {
    return vocabulary.filter(function(word) {
        // console.log( word + "? " + (wordList.indexOf(word) > -1 ? (" ~ YES ~ ") : ("no")) );
        return (wordList.indexOf(word) > -1);
    });
}





