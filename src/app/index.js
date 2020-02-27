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
 * e.g. "realityEditor.app.callbacks.vuforiaIsReady"
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
 * Adds a new marker using a JPG image and fires a callback with error or success
 * and the markerName for reference
 * @param {string} markerName
 * @param {string} objectID
 * @param {number} targetWidthMeters
 * @param {FunctionName} callBack
 */
realityEditor.app.addNewMarkerJPG = function(markerName, objectID, targetWidthMeters, callBack) {
    this.appFunctionCall('addNewMarkerJPG', {markerName: markerName, objectID: objectID, targetWidthMeters: targetWidthMeters}, 'realityEditor.app.callBack('+callBack+', [__ARG1__, __ARG2__])');
};

/**
 * Gets the projection matrix.
 * Callback will have the matrix as a length-16 array as a parameter.
 * @param {FunctionName} callBack
 */
realityEditor.app.getProjectionMatrix = function(callBack) {
    this.appFunctionCall('getProjectionMatrix', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Sets up a callback for the model matrices of all markers that are found, that will get called every frame.
 * Callback will have a set of objectId mapped to matrix for each visibleObjects.
 * @param {FunctionName} callBack
 */
realityEditor.app.getMatrixStream = function(callBack) {
    this.appFunctionCall('getMatrixStream', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Sets up a callback for the positional device tracker, reporting the pose of the camera at every frame.
 * Callback will have the cameraMatrix (which is the inverse of the view matrix) as a parameter.
 * @param {FunctionName} callBack
 */
realityEditor.app.getCameraMatrixStream = function(callBack) {
    this.appFunctionCall('getCameraMatrixStream', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Sets up a callback for the ground plane matrix, which will start reporting a matrix each frame after one is detected.
 * @param {FunctionName} callBack
 */
realityEditor.app.getGroundPlaneMatrixStream = function(callBack) {
    this.appFunctionCall('getGroundPlaneMatrixStream', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Gets a screenshot image of the camera background.
 * The callback will have a screenshot with base64. Size can be S,M,L
 * @param {string} size - 'S' (25%), 'M' (50%), or 'L' (full size)
 * @param {FunctionName} callBack
 */
realityEditor.app.getScreenshot = function(size, callBack) {
    this.appFunctionCall('getScreenshot', {size: size}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Debug method that gets the camera background, decodes it, and passes the blob url to a callback.
 * note - not used anywhere right now
 * @return {string} screenshotBlobUrl
 */
realityEditor.app.getScreenshotAsJpg = function(callback) {
    this.getScreenshot("L", function(base64String) {
        var screenshotBlobUrl = realityEditor.device.utilities.decodeBase64JpgToBlobUrl(base64String);
        callback(screenshotBlobUrl);
        // to show the screenshot, you would: 
        // document.querySelector('#screenshotHolder').src = blobUrl;
        // document.querySelector('#screenshotHolder').style.display ='inline';
    });
};

/**
 * Pauses the tracker (freezes the background)
 */
realityEditor.app.setPause = function() {
    this.appFunctionCall('setPause', null, null);
};

/**
 * Resumes the tracker (unfreezes the background)
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
 * Every time there is a new UDP message the callback is called. The Reality Editor listens to UDP messages on port 52316 
 * @param {FunctionName} callBack
 */
realityEditor.app.getUDPMessages = function(callBack) {
    this.appFunctionCall('getUDPMessages', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Sends out a message over UDP broadcast (255.255.255.255 on port 52316)
 * @param {Object} message - must be a JSON object
 */
realityEditor.app.sendUDPMessage = function(message) {
    this.appFunctionCall('sendUDPMessage', {message: JSON.stringify(message)}, null);
};

/**
 **************File****************
  **/

/**
 * Boolean response if a file exists in the local filesystem.
 * You can pass in the same fileName as from where you downloaded the file
 * (e.g. datAddress = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.dat')
 * It will automatically convert that to the location on the local filesystem where that download would end up.
 * @param {string} fileName
 * @param {FunctionName} callBack
 */
realityEditor.app.getFileExists = function(fileName, callBack) {
    this.appFunctionCall('getFileExists', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 * Downloads a file. The callback is an error or success, and the filename for reference.
 * The filename url is converted into a temp file path (works as a black box), so that file can be located again using the original filename url
 * @param {string} fileName - the url that you are downloading, e.g. "http://10.0.0.225:8080/obj/stonesScreen/target/target.xml"
 * @param {FunctionName} callBack
 */
realityEditor.app.downloadFile = function(fileName, callBack) {
    this.appFunctionCall('downloadFile', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+', [__ARG1__, __ARG2__])');
};

/**
 * Boolean response if all files exists. fileNameArray should contain at least one filename. (similar to getFileExists)
 * @param {Array.<string>} fileNameArray
 * @param {FunctionName} callBack
 */
realityEditor.app.getFilesExist = function (fileNameArray, callBack) {
    this.appFunctionCall('getFilesExist', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+', [__ARG1__, __ARG2__])');
};

/**
 * Returns the checksum of a group of files. fileNameArray should contain at least one filename.
 * @param {Array.<string>} fileNameArray
 * @param {FunctionName} callBack
 * @todo implement within XCode - currently does nothing (returns fileNameArray.count as a placeholder)
 */
realityEditor.app.getChecksum = function (fileNameArray, callBack) {
    this.appFunctionCall('getChecksum', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
};

/**
 **************Store Content****************
 **/

/**
 * Store a message on the app level for persistence.
 * @param {string} storageID - e.g. 'SETUP:DEVELOPER'
 * @param {string} message
 */
realityEditor.app.setStorage = function (storageID, message) {
    this.appFunctionCall('setStorage', {storageID: storageID, message: JSON.stringify(message)}, null);
};

/**
 * Recall the message that may have been saved in a previous session.
 * Note: currently not used because we are using window.localStorage API instead, but there is still a reason for this
 *  to exist, which is that this data is saved even if you load the userinterface from different locations, whereas the
 *  window.localStorage is dependent on the window href. For example, saving the external interface URL makes sense to
 *  do with this API.
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

/**
 * Starts the screen recording of the camera background.
 * Need to pass in an object id/ip pair so it can upload the resulting video to that object's server
 * @param {string} objectKey
 * @param {string} objectIP
 */
realityEditor.app.startVideoRecording = function (objectKey, objectIP) {
    console.log("startVideoRecording");
    this.appFunctionCall('startVideoRecording', {objectKey: objectKey, objectIP: objectIP}, null);
};

/**
 * Stops the screen recording of the camera background and uploads to the object specified when startVideoRecording was called.
 * @param {string} videoId - the name to save it as (without .mp4), e.g. a random string uuid
 */
realityEditor.app.stopVideoRecording = function (videoId) {
    console.log("stopVideoRecording");
    this.appFunctionCall('stopVideoRecording', {videoId: videoId}, null);
};

/**
 * Makes objects visible even when they move out of the camera view.
 * @deprecated - was implemented in native app, but negatively impacts performance if we want it to be
 *  backwards compatible, because of changes to the Vuforia SDK. It is intentionally internally disabled for now.
 * @param {boolean} _newState
 */
realityEditor.app.enableExtendedTracking = function (_newState) {
    console.warn("TODO: implement enableExtendedTracking. currently has no effect.");
    // this.appFunctionCall('enableExtendedTracking', {state: newState}, null);
};

/**
 * Tells the native app to rotate the webview when the device rotates between landscape left and right.
 * Triggers the callback whenever the device orientation changes, so that content can adapt if needed (e.g. matrices)
 * The callback has a single string argument of: "landscapeLeft", "landscapeRight", "portrait", "portraitUpsideDown", or "unknown"
 * @param {FunctionName} callBack
 */
realityEditor.app.enableOrientationChanges = function (callBack) {
    this.appFunctionCall('enableOrientationChanges', null, 'realityEditor.app.callBack('+callBack+', [__ARG1__])');
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

/**
 * Triggers a setFocusMode(Vuforia::CameraDevice::FOCUS_MODE_TRIGGERAUTO)
 * note - not currently used
 * @todo: the native implementation should revert back to auto mode after a certain amount of time
 */
realityEditor.app.focusCamera = function() {
    this.appFunctionCall('focusCamera', null, null);
};

// global shortcut for clearing the cache
cc = realityEditor.app.clearCache.bind(realityEditor.app);

/**
 * global shortcut for resetting the positions of all frames on visible objects to their object's target origin
 * in case frames get lost in space, or to test calculations when frame matrix is identity
 */
rr = function() {
    for (var objectKey in objects) {
        if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) {
            continue;
        }

        var tempResetObject = objects[objectKey];
        // var shouldPlaceCenter = false;

        if (globalStates.guiState ==="ui") {

            // shouldPlaceCenter = (Object.keys(tempResetObject.frames).length === 1);
            for (let frameKey in tempResetObject.frames) {
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
            for (let frameKey in tempResetObject.frames) {

                let activeFrame = tempResetObject.frames[frameKey];
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
 ************** SAVE DATA TO DISK ****************
 */

/**
 * Save the persistent setting to disk for the IP address to load the external userinterface from.
 * @param {string} newExternalText
 */
realityEditor.app.saveExternalText = function(newExternalText) {
    this.setStorage('SETUP:EXTERNAL', newExternalText);
};

/**
 ************** SECURITY ****************
 */

/**
 * Trigger the fingerprint authentication prompt to appear
 * @todo: not working anymore, not even set up in the iOS app
 */
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
