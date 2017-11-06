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

realityEditor.device.speech.parsePhrase = function(phrase) {
    var locations = realityEditor.device.speech.extractLocation(phrase);
    var actions = realityEditor.device.speech.extractAction(phrase);
    var data = realityEditor.device.speech.extractData(phrase);
    
    console.log(locations, actions, data);
    
    if (actions.indexOf('reset') > -1) {
        this.resetSpeechRecording();
        return;
    }
    
    if (!globalStates.pendingSpeechAction) {
        if (actions.indexOf('connect') > -1 || actions.indexOf('link') > -1) {
            globalStates.pendingSpeechAction = 'connect';
        }
    
    }

    if (!globalStates.pendingSpeechLocationA) {
        if (locations.indexOf('this') > -1) {
            globalStates.pendingSpeechLocationA = 'get random node on closest object';
            
            var visibleObjectKeys = this.getVisibleObjectKeys();
            if (visibleObjectKeys.length > 0) {
                globalStates.pendingSpeechLocationA = visibleObjectKeys[0];
            }
            
        }
    }
    
    if (!globalStates.pendingSpeechLocationB) {
        if (locations.indexOf('that') > -1) {
            globalStates.pendingSpeechLocationB = 'get random node on new closest object';

            var visibleObjectKeys = this.getVisibleObjectKeys();
            if (visibleObjectKeys.length > 0) {
                globalStates.pendingSpeechLocationB = visibleObjectKeys[0];
            }
        }
    }
    
    if (globalStates.pendingSpeechAction && globalStates.pendingSpeechLocationA && globalStates.pendingSpeechLocationB) {
        // this.performAction(globalStates.)
        
        if (globalStates.pendingSpeechAction === 'connect') {
            console.log('connect [' + globalStates.pendingSpeechLocationA + '] to [' + globalStates.pendingSpeechLocationB + '] - (performed by speech)');
            
            if (objects.hasOwnProperty(globalStates.pendingSpeechLocationA) && objects.hasOwnProperty(globalStates.pendingSpeechLocationB)) {
                
                var nodesOnA = objects[globalStates.pendingSpeechLocationA].nodes;
                var nodesOnB = objects[globalStates.pendingSpeechLocationB].nodes;
                
                if (nodesOnA && nodesOnB) {
                    
                    var nodeIndexA = 0;
                    var nodeIndexB = 0;
                    var nodeA = Object.keys(nodesOnA).length > 0 ? Object.keys(nodesOnA)[nodeIndexA] : null;
                    var nodeB = Object.keys(nodesOnB).length > 0 ? Object.keys(nodesOnB)[nodeIndexB] : null;
                    
                    if (nodeA && nodeB) {
                        this.createSpeechLink(globalStates.pendingSpeechLocationA, nodeA, globalStates.pendingSpeechLocationB, nodeB);
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
    globalStates.pendingSpeechLocationA = null;
    globalStates.pendingSpeechLocationB = null;

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





