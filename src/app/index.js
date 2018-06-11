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
 * Created by Valentin on 10/25/17.
 */

createNameSpace("realityEditor.app");

/**
 * @fileOverview realityEditor.app.index.js
 * Defines the API to communicate with the native iOS application.
 * Calling realityEditor.app.{functionName} will trigger {functionName} in realityEditor.mm in the native iOS app.
 * Note that as of 6/8/18, many of these are placeholders that lead to function stubs
 */

/**
 * @typedef {string|function} FunctionName
 * @desc The name of a function, in string form, with a path that can be reached from this file,
 * e.g. "realityEditor.device.speechProcessor.speechRecordingCallback"
 * Optional: if the function signature doesn't have any parameters, the entire function can be used instead of a string,
 * e.g. function(){console.log("pong")})
 */

/**
 * Response with a callback that indicates the device name.
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getDeviceReady = function(callBack) {
    this.appFunctionCall('getDeviceReady', null, 'realityEditor.app.callBack('+callBack+')');
};

/**
 **************Vuforia****************
 **/

/**
 * Check if vuforia is ready and fires a callback once that’s the case.
 * @param {FunctionName} callBack
 */
realityEditor.app.getVuforiaReady = function(callBack){
    console.log("ping");
    this.appFunctionCall('getVuforiaReady', null, 'realityEditor.app.callBack('+callBack+')');
};

/**
 * Adds a new marker and fires a callback with error or success.
 * @param {string} markerName
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.addNewMarker = function(markerName, callBack) {
    this.appFunctionCall('addNewMarker', {markerName: markerName}, 'realityEditor.app.callBack('+callBack+')');
};

/**
 * Gets the projection matrix.
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getProjectionMatrix = function(callBack) {
    this.appFunctionCall('getProjectionMatrix', null, 'realityEditor.app.callBack('+callBack+')');
};

/**
 * Callback for all markers and matrices that are found
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getMatrixStream = function(callBack) {
    this.appFunctionCall('getMatrixStream', null, 'realityEditor.app.callBack('+callBack+')');
};

/**
 * The callback will have a screenshot with base64. Size can be S,M,L
 * @param {string} size - 'S', 'M', or 'L'
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getScreenShot = function(size, callBack) {
    this.appFunctionCall('getScreenShot', {size: size}, 'realityEditor.app.callBack('+callBack+')');
};

/**
 * Pauses the tracker.
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.setPause = function() {
    this.appFunctionCall('setPause', null, null);

};

/**
 * Resumes the tracker.
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.setResume = function() {
    this.appFunctionCall('setResume', null, null);

};

/**
 * Triggers a haptic feedback vibration.
 */
realityEditor.app.tap = function() {
    this.appFunctionCall('tap', null, null);

};
 /**
 **************UDP****************
  **/
 
/**
 * Every time there is a new message the callback is called.
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getUDPMessages = function(callBack) {
    this.appFunctionCall('getUDPMessages', null, '(realityEditor.app.callBack('+callBack+')');
};

/**
 * Sends out a message over UDP broadcast.
 * @param {string} message
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.sentUDPMessage = function(message) {
    this.appFunctionCall('sentUDPMessage', {message: message}, null);
};

/**
 **************File****************
  **/

/**
 * Boolean response if a file exists.
 * @param {string} fileName
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getFileExist = function(fileName, callBack) {
    this.appFunctionCall('getFileExist', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+')');
};

/**
 * Downloads a file. The callback is an error or success message.
 * @param {string} fileName
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.downloadFile = function(fileName, callBack) {
    this.appFunctionCall('downloadFile', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+')');
};

/**
 * Boolean response if all files exists. fileNameArray should contain at least one filename.
 * @param {Array.<string>} fileNameArray
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getFilesExist = function (fileNameArray, callBack) {
    this.appFunctionCall('getFilesExist', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+')');
};

/**
 * Returns the checksum of a group of files. fileNameArray should contain at least one filename.
 * @param {Array.<string>} fileNameArray
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getChecksum = function (fileNameArray, callBack) {
    this.appFunctionCall('getChecksum', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+')');
};

/**
 **************Store Content****************
 **/

/**
 * Store a message on the app level for persistence.
 * @param {string} id
 * @param {string} message
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.setStorage = function (id, message) {
    this.appFunctionCall('setStorage', {id: id, message: message}, null);
};

/**
 * Recall the message.
 * @param {string} id
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getStorage = function (id, callBack) {
    this.appFunctionCall('getStorage', {id: id}, 'realityEditor.app.callBack('+callBack+')');
};

 /**
 **************Speech****************
  **/

/**
 * Starts the native speech recognition engine.
 * While active, this engine will send received words to any callbacks registered by realityEditor.app.addSpeechListener
 */
realityEditor.app.startSpeechRecording = function () {
    console.log("startSpeechRecording");
    this.appFunctionCall('startSpeechRecording', null, null);

};

/**
 * Stops the speech engine.
 */
realityEditor.app.stopSpeechRecording = function () {
    console.log("stopSpeechRecording");
    this.appFunctionCall('stopSpeechRecording', null, null);

};

/**
 * Sends every individual word that was found one by one to the callback.
 * @param {FunctionName} callBack
 */
realityEditor.app.addSpeechListener = function (callBack) {
    console.log("addSpeechListener");
    this.appFunctionCall('addSpeechListener', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 **************Debugging****************
 **/

/**
 * Force clears the iOS WebView cache and force reloads the interface.
 */
realityEditor.app.clearCache = function () {
    this.appFunctionCall('clearCache', null, null);
    console.log('clearing cache and force reloading...');
    setTimeout(function() {
        location.reload(true);
        console.log('NOW');
    }, 1000);
};

// global shortcut for clearing the cache
cc = realityEditor.app.clearCache.bind(realityEditor.app);

/**
 **************UTILITIES****************
 **/

/**
 * Encodes a javascript function call to be sent to the native app via the webkit message interface.
 * @param {string} functionName - the function to trigger in realityEditor.mm
 * @param {Object|null} functionArguments - object with a key matching the name of each target function parameter,
 *                                          and the value of each key is the value to pass into that parameter
 * @param {FunctionName} callbackString - 'realityEditor.app.callBack('+callBack+')'
 */
realityEditor.app.appFunctionCall = function(functionName, functionArguments, callbackString) {
    var messageBody = {
        functionName: functionName
    };
    
    if (functionArguments) {
        messageBody.arguments = functionArguments;
    }
    
    if (callbackString) {
        messageBody.callback = callbackString;
    }
    
    window.webkit.messageHandlers.realityEditor.postMessage(messageBody);
};

/**
 * Wrapper function for callbacks called by the native iOS application, applying any arguments as needed.
 * @param {FunctionName} callBack
 * @param {Array.<*>} callbackArguments
 */
realityEditor.app.callBack = function(callBack, callbackArguments){
    
    if (callbackArguments) {
        callBack.apply(null, callbackArguments);
    } else {
        callBack();
    }
};
