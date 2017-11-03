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

realityEditor.device.speech.parsePhrase = function(phrase) {
    var locations = realityEditor.device.speech.extractLocation(phrase);
    var actions = realityEditor.device.speech.extractAction(phrase);
    var data = realityEditor.device.speech.extractData(phrase);
    
    console.log(locations, actions, data);
};

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
        'link'
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





