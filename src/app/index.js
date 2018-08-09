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

// response with a callback that indicates the device name.
realityEditor.app.getDeviceReady = function(callBack) {
    this.appFunctionCall('getDeviceReady', null, 'realityEditor.app.callBack('+callBack+')');
};

/**
 **************Vuforia****************
 **/
// check if vuforia is ready and fires a callback once that’s the case
realityEditor.app.getVuforiaReady = function(callBack){
    console.log("ping");
    this.appFunctionCall('getVuforiaReady', null, 'realityEditor.app.callBack('+callBack+')');
};

// adds a new marker and fires a callback with error or success
realityEditor.app.addNewMarker = function(markerName, callBack) {
    this.appFunctionCall('addNewMarker', {markerName: markerName}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

// gets the projection matrix
realityEditor.app.getProjectionMatrix = function(callBack) {
    this.appFunctionCall('getProjectionMatrix', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

// callback for all markers and matrices that are found
realityEditor.app.getMatrixStream = function(callBack) {
    this.appFunctionCall('getMatrixStream', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

// the callback will have a screenshot with base64. Size can be S,M,L 
realityEditor.app.getScreenshot = function(size, callBack) {
    this.appFunctionCall('getScreenshot', {size: size}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

realityEditor.app.getScreenshotAsJpg = function() {
    this.getScreenshot("L", function(base64String) {
        var screenshotBlobUrl = realityEditor.device.utilities.decodeBase64JpgToBlobUrl(base64String);
        debugShowScreenshot(screenshotBlobUrl);
    });
};

function debugShowScreenshot(blobUrl) {
    document.querySelector('#pocket-element > img').src = blobUrl;
    document.querySelector('#screenshotHolder').src = blobUrl;
    document.querySelector('#screenshotHolder').style.display = 'inline';
}

// pauses the tracker
realityEditor.app.setPause = function() {
    this.appFunctionCall('setPause', null, null);
};

// resumes the tracker
realityEditor.app.setResume = function() {
    this.appFunctionCall('setResume', null, null);

};

realityEditor.app.tap = function() {
    this.appFunctionCall('tap', null, null);

};

 /**
 **************UDP****************
  **/
// everytime there is a new message the callback is called.
realityEditor.app.getUDPMessages = function(callBack) {
    this.appFunctionCall('getUDPMessages', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

// sends out a message over UDP broadcast. message must be a json object.
realityEditor.app.sendUDPMessage = function(message) {
    this.appFunctionCall('sendUDPMessage', {message: JSON.stringify(message)}, null);
};

/**
 **************File****************
  **/
// boolean response if a file exists.
realityEditor.app.getFileExists = function(fileName, callBack) {
    this.appFunctionCall('getFileExists', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

//downloads a file. The callback is an error or success message 
realityEditor.app.downloadFile = function(fileName, callBack) {
    this.appFunctionCall('downloadFile', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

// boolean response if all files exists. fileNameArray should contain at least one filename
realityEditor.app.getFilesExist = function (fileNameArray, callBack) {
    this.appFunctionCall('getFilesExist', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

// returns the checksume of a group of files. fileNameArray should contain at least one filename
realityEditor.app.getChecksum = function (fileNameArray, callBack) {
    this.appFunctionCall('getChecksum', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 **************Store Content****************
 **/
//store a message on the app level for persistance 
realityEditor.app.setStorage = function (storageID, message) {
    this.appFunctionCall('setStorage', {storageID: storageID, message: JSON.stringify(message)}, null);
};

// recall the message.
realityEditor.app.getStorage = function (storageID, callBack) {
    this.appFunctionCall('getStorage', {storageID: storageID}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

 /**
 **************Speech****************
  **/
 
// starts the apple speech engine
realityEditor.app.startSpeechRecording = function () {
    console.log("startSpeechRecording");
    this.appFunctionCall('startSpeechRecording', null, null);

};

// stops the speech engine
realityEditor.app.stopSpeechRecording = function () {
    console.log("stopSpeechRecording");
    this.appFunctionCall('stopSpeechRecording', null, null);

};

//sends every individual word that was found one by one to the callback.
realityEditor.app.addSpeechListener = function (callBack) {
    console.log("addSpeechListener");
    this.appFunctionCall('addSpeechListener', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};


/**
 **************Video****************
 **/

// starts the screen recording of the camera background
realityEditor.app.startVideoRecording = function (objectKey, objectMatrix) {
    console.log("startVideoRecording");
    this.appFunctionCall('startVideoRecording', {objectKey: objectKey, objectMatrix: JSON.stringify(objectMatrix)}, null);
};

// stops the screen recording of the camera background
realityEditor.app.stopVideoRecording = function (videoId) {
    console.log("stopVideoRecording");
    this.appFunctionCall('stopVideoRecording', {objectMatrix: JSON.stringify(videoId)}, null);
};

/**
 **************Debugging****************
 **/
//sends every individual word that was found one by one to the callback.
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
 ************** ADDITIONAL ROUTES ****************
 */

/**
 * Save the persistent setting to disk for developer (editing) mode.
 * @param {boolean} newState
 */
realityEditor.app.saveDeveloperState = function(newState) {
    var storedValue = newState ? 1 : 0;
    this.setStorage('SETUP:DEVELOPER', storedValue);
};

/**
 * Save the persistent setting to disk for clear sky mode.
 * @param {boolean} newState
 */
realityEditor.app.saveClearSkyState = function(newState) {
    var storedValue = newState ? 1 : 0;
    this.setStorage('SETUP:CLEARSKY', storedValue);
};

/**
 * Save the persistent setting to disk for reality (retail) mode.
 * @param {boolean} newState
 */
realityEditor.app.saveRealityState = function(newState) {
    var storedValue = newState ? 1 : 0;
    this.setStorage('SETUP:REALITY', storedValue);
};

/**
 * Save the persistent setting to disk for instant (capacitive touch) mode.
 * @param {boolean} newState
 */
realityEditor.app.saveInstantState = function(newState) {
    var storedValue = newState ? 1 : 0;
    this.setStorage('SETUP:INSTANT', storedValue);
};

/**
 * Save the persistent setting to disk for whether to use zone.
 * @param {boolean} newState
 */
realityEditor.app.saveZoneState = function(newState) {
    var storedValue = newState ? 1 : 0;
    this.setStorage('SETUP:ZONE', storedValue);
};

/**
 * Save the persistent setting to disk for extended tracking mode.
 * @param {boolean} newState
 */
realityEditor.app.saveExtendedTrackingState = function(newState) {
    var storedValue = newState ? 1 : 0;
    this.setStorage('SETUP:TRACKING', storedValue);
};

/**
 * Save the persistent setting to disk for the zone string.
 * @param {string} newZoneText
 */
realityEditor.app.saveZoneText = function(newZoneText) {
    this.setStorage('SETUP:ZONETEXT', newZoneText);
};

/**
 * Save the persistent setting to disk for the object discovery server string.
 * @param {string} newDiscoveryText
 */
realityEditor.app.saveDiscoveryText = function(newDiscoveryText) {
    this.setStorage('SETUP:DISCOVERY', newDiscoveryText);
};

/**
 * Save the persistent setting to disk for the IP address to load the external userinterface from.
 * @param {string} newExternalText
 */
realityEditor.app.saveExternalText = function(newExternalText) {
    this.setStorage('SETUP:EXTERNAL', newExternalText);
};

/**
 * Save the background image for a memory.
 * @todo: fully understand the how this and "remember" and "createMemory" interact
 */
realityEditor.app.memorize = function() {
    this.appFunctionCall("memorize", null, null);
};

/**
 * Create a new memory in the native app.
 * @todo: fully understand the how this and "remember" and "memorize" interact
 */
realityEditor.app.createMemory = function() {
    this.appFunctionCall("createMemory", null, null);
};

/**
 * Save an object's matrix in a memory.
 * @param {string} memoryId
 * @param {Array.<number>} memoryMatrix
 * @todo: fully understand the how this and "memorize" and "createMemory" interact
 */
realityEditor.app.remember = function(memoryId, memoryMatrix) {

    var memoryData = JSON.stringify(
        {id: memoryId, matrix: memoryMatrix}
    );
    
    this.appFunctionCall("remember", {dataStr: memoryData}, null);
};

realityEditor.app.authenticateTouch = function() {
    realityEditor.app.appFunctionCall("authenticateTouch", null, null);
};


/**
 **************UTILITIES****************
 **/
// encodes a javascript function call to be sent to the native app via the http interface or whatever interface will be available.
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

realityEditor.app.callBack = function(callBack, callbackArguments){
    
    if (callbackArguments) {
        callBack.apply(null, callbackArguments);
    } else {
        callBack();
    }
};
