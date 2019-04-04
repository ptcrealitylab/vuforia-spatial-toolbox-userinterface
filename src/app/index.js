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
 */
realityEditor.app.getDeviceReady = function(callBack) {
    this.appFunctionCall('getDeviceReady', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 **************Vuforia****************
 **/

/**
 * Starts the AR engine. Fires a callback once it is ready.
 * @param {FunctionName} callBack
 */
realityEditor.app.getVuforiaReady = function(callBack){
    this.appFunctionCall('getVuforiaReady', null, 'realityEditor.app.callBack('+callBack+')');
};

/**
 * Adds a new marker and fires a callback with error or success
 * and the markerName for reference
 * @param {string} markerName
 * @param {FunctionName} callBack
 */
realityEditor.app.addNewMarker = function(markerName, callBack) {
    this.appFunctionCall('addNewMarker', {markerName: markerName}, 'realityEditor.app.callBack('+callBack+', [__ARG1__, __ARG2__])');
};

/**
 * Gets the projection matrix.
 * @param {FunctionName} callBack
 */
realityEditor.app.getProjectionMatrix = function(callBack) {
    this.appFunctionCall('getProjectionMatrix', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Callback for all markers and matrices that are found
 * @param {FunctionName} callBack
 */
realityEditor.app.getMatrixStream = function(callBack) {
    this.appFunctionCall('getMatrixStream', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Callback for all markers and matrices that are found
 * @param {FunctionName} callBack
 */
realityEditor.app.getCameraMatrixStream = function(callBack) {
    this.appFunctionCall('getCameraMatrixStream', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Callback for all markers and matrices that are found
 * @param {FunctionName} callBack
 */
realityEditor.app.getGroundPlaneMatrixStream = function(callBack) {
    this.appFunctionCall('getGroundPlaneMatrixStream', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * The callback will have a screenshot with base64. Size can be S,M,L
 * @param {string} size - 'S', 'M', or 'L'
 * @param {FunctionName} callBack
 */
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
    document.querySelector('#screenshotHolder').src = blobUrl;
    document.querySelector('#screenshotHolder').style.display ='inline';
}

function debugHideScreenshot() {
    document.querySelector('#screenshotHolder').style.display ='none';
}

/**
 * Pauses the tracker.
 */
realityEditor.app.setPause = function() {
    this.appFunctionCall('setPause', null, null);
};

/**
 * Resumes the tracker.
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
 * Tries to add an anchor for the ground plane origin.
 */
realityEditor.app.tryPlacingGroundAnchor = function(normalizedScreenX, normalizedScreenY, callBack) {
    this.appFunctionCall('tryPlacingGroundAnchor', {normalizedScreenX: normalizedScreenX, normalizedScreenY: normalizedScreenY}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');

};

function debugAddAnchor() {
    realityEditor.app.tryPlacingGroundAnchor(0.5, 0.5, 'realityEditor.app.callbacks.didAddGroundAnchor');
}

/**
 **************UDP****************
  **/
 
/**
 * Every time there is a new message the callback is called.
 * @param {FunctionName} callBack
 */
realityEditor.app.getUDPMessages = function(callBack) {
    this.appFunctionCall('getUDPMessages', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Sends out a message over UDP broadcast.
 * @param {Object} message - must be a JSON object
 */
realityEditor.app.sendUDPMessage = function(message) {
    this.appFunctionCall('sendUDPMessage', {message: JSON.stringify(message)}, null);
};

/**
 **************File****************
  **/

/**
 * Boolean response if a file exists.
 * @param {string} fileName
 * @param {FunctionName} callBack
 */
realityEditor.app.getFileExists = function(fileName, callBack) {
    this.appFunctionCall('getFileExists', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Downloads a file. The callback is an error or success message
 * and the fileName for reference.
 * @param {string} fileName
 * @param {FunctionName} callBack
 */
realityEditor.app.downloadFile = function(fileName, callBack) {
    this.appFunctionCall('downloadFile', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+', [__ARG1__, __ARG2__])');
};

/**
 * Boolean response if all files exists. fileNameArray should contain at least one filename.
 * @param {Array.<string>} fileNameArray
 * @param {FunctionName} callBack
 */
realityEditor.app.getFilesExist = function (fileNameArray, callBack) {
    this.appFunctionCall('getFilesExist', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Returns the checksum of a group of files. fileNameArray should contain at least one filename.
 * @param {Array.<string>} fileNameArray
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing
 */
realityEditor.app.getChecksum = function (fileNameArray, callBack) {
    this.appFunctionCall('getChecksum', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 **************Store Content****************
 **/

/**
 * Store a message on the app level for persistence.
 * @param {string} storageID
 * @param {string} message
 */
realityEditor.app.setStorage = function (storageID, message) {
    this.appFunctionCall('setStorage', {storageID: storageID, message: JSON.stringify(message)}, null);
};

/**
 * Recall the message.
 * @param {string} storageID
 * @param {FunctionName} callBack
 */
realityEditor.app.getStorage = function (storageID, callBack) {
    this.appFunctionCall('getStorage', {storageID: storageID}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
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
    this.appFunctionCall('stopVideoRecording', {videoId: videoId}, null);
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

realityEditor.app.focusCamera = function() {
    this.appFunctionCall('focusCamera', null, null);
};

// global shortcut for clearing the cache
cc = realityEditor.app.clearCache.bind(realityEditor.app);
// global shortcut for resetting the frame positions to object origin
rr = function() {
    for (var objectKey in objects) {
        if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) {
            continue;
        }

        var tempResetObject = objects[objectKey];
        // var shouldPlaceCenter = false;

        if (globalStates.guiState ==="ui") {

            // shouldPlaceCenter = (Object.keys(tempResetObject.frames).length === 1);
            for (var frameKey in tempResetObject.frames) {
                var activeFrame = tempResetObject.frames[frameKey];
                if (activeFrame.visualization === 'screen') continue; // only reset position of AR frames
                if (activeFrame.staticCopy) continue; // don't reset positions of staticCopy frames

                var positionData = realityEditor.gui.ar.positioning.getPositionData(activeFrame);
                positionData.matrix = [];
                // if (shouldPlaceCenter) {
                    positionData.x = 0;
                    positionData.y = 0;
                // } else {
                //     positionData.x = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
                //     positionData.y = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
                // }
                positionData.scale = globalStates.defaultScale;
                realityEditor.network.sendResetContent(objectKey, frameKey, null, "ui");
            }

        }

        if (globalStates.guiState === "node") {
            for (var frameKey in tempResetObject.frames) {

                var activeFrame = tempResetObject.frames[frameKey];
                // cannot move nodes inside static copy frames
                if (activeFrame && activeFrame.staticCopy) continue;

                var shouldPlaceCenter = (Object.keys(activeFrame.nodes).length === 1);
                for (var nodeKey in activeFrame.nodes) {
                    var activeNode = activeFrame.nodes[nodeKey];

                    realityEditor.gui.ar.positioning.setPositionDataMatrix(activeNode, []);
                    activeNode.scale = globalStates.defaultScale;
                    if (shouldPlaceCenter) {
                        activeNode.x = 0;
                        activeNode.y = 0;
                    } else {
                        activeNode.x = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
                        activeNode.y = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
                    }
                    realityEditor.network.sendResetContent(objectKey, frameKey, nodeKey, activeNode.type);
                }
            }

        }

    }
};

/**
 ************** SAVE AND LOAD DATA FROM DISK ****************
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
 * Getters for each property saved to disk
 */


/**
 * Get the persistent setting for developer (editing) mode.
 * @param {function} callback
 */
realityEditor.app.getDeveloperState = function(callback) {
    this.getStorage('SETUP:DEVELOPER', callback);
};

/**
 * Get the persistent setting for clear sky mode.
 * @param {function} callback
 */
realityEditor.app.getClearSkyState = function(callback) {
    this.getStorage('SETUP:CLEARSKY', callback);
};

/**
 * Get the persistent setting for reality (retail) mode.
 * @param {function} callback
 */
realityEditor.app.getRealityState = function(callback) {
    this.getStorage('SETUP:REALITY', callback);
};

/**
 * Get the persistent setting for instant (capacitive touch) mode.
 * @param {function} callback
 */
realityEditor.app.getInstantState = function(callback) {
    this.getStorage('SETUP:INSTANT', callback);
};

/**
 * Get the persistent setting for whether to use zone.
 * @param {function} callback
 */
realityEditor.app.getZoneState = function(callback) {
    this.getStorage('SETUP:ZONE', callback);
};

/**
 * Get the persistent setting for extended tracking mode.
 * @param {function} callback
 */
realityEditor.app.getExtendedTrackingState = function(callback) {
    this.getStorage('SETUP:TRACKING', callback);
};

/**
 * Get the persistent setting for the zone string.
 * @param {function} callback
 */
realityEditor.app.getZoneText = function(callback) {
    this.getStorage('SETUP:ZONETEXT', callback);
};

/**
 * Get the persistent setting for the object discovery server string.
 * @param {function} callback
 */
realityEditor.app.getDiscoveryText = function(callback) {
    this.getStorage('SETUP:DISCOVERY', callback);
};

/**
 * Get the persistent setting for the IP address to load the external userinterface from.
 * @param {function} callback
 */
realityEditor.app.getExternalText = function(callback) {
    this.getStorage('SETUP:EXTERNAL', callback);
};

/**
 ************** ADDITIONAL ROUTES ****************
 */

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
