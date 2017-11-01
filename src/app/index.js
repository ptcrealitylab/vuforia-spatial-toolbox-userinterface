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
    this.appFunctionCall('getVuforiaReady', null /*{testArg1: "hello", testArg2: 21}*/, 'realityEditor.app.callBack('+callBack+')');
};

// adds a new marker and fires a callback with error or success
realityEditor.app.addNewMarker = function(markerName, callBack) {
    this.appFunctionCall('addNewMarker', {markerName: markerName}, 'realityEditor.app.callBack('+callBack+')');
};

// gets the projection matrix
realityEditor.app.getProjectionMatrix = function(callBack) {
    this.appFunctionCall('getProjectionMatrix', null, 'realityEditor.app.callBack('+callBack+')');
};

// callback for all markers and matrices that are found
realityEditor.app.getMatrixStream = function(callBack) {
    this.appFunctionCall('getMatrixStream', null, 'realityEditor.app.callBack('+callBack+')');
};

// the callback will have a screenshot with base64. Size can be S,M,L 
realityEditor.app.getScreenShot = function(size, callBack) {
    this.appFunctionCall('getScreenShot', {size: size}, 'realityEditor.app.callBack('+callBack+')');
};

// pauses the tracker
realityEditor.app.setPause = function() {};

// resumes the tracker
realityEditor.app.setResume = function() {};

 /**
 **************UDP****************
  **/
// everytime there is a new message the callback is called.
realityEditor.app.getUDPMessages = function(callBack) {
    this.appFunctionCall('getUDPMessages', null, '(realityEditor.app.callBack('+callBack+')');
};

// sends out a message over UDP broadcast.
realityEditor.app.sentUDPMessage = function(message) {
    this.appFunctionCall('sentUDPMessage', {message: message}, null);
};

/**
 **************File****************
  **/
// boolean response if a file exists.
realityEditor.app.getFileExist = function(fileName, callBack) {
    this.appFunctionCall('getFileExist', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+')');
};

//downloads a file. The callback is an error or success message 
realityEditor.app.downloadFile = function(fileName, callBack) {
    this.appFunctionCall('downloadFile', {fileName: fileName}, 'realityEditor.app.callBack('+callBack+')');
};

// boolean response if all files exists. fileNameArray should contain at least one filename
realityEditor.app.getFilesExist = function (fileNameArray, callBack) {
    this.appFunctionCall('getFilesExist', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+')');
};

// returns the checksume of a group of files. fileNameArray should contain at least one filename
realityEditor.app.getChecksum = function (fileNameArray, callBack) {
    this.appFunctionCall('getChecksum', {fileNameArray: fileNameArray}, 'realityEditor.app.callBack('+callBack+')');
};

/**
 **************Store Content****************
 **/
//store a message on the app level for persistance 
realityEditor.app.setStorage = function (id, message) {
    this.appFunctionCall('setStorage', {id: id, message: message}, null);
};

// recall the message.
realityEditor.app.getStorage = function (id, callBack) {
    this.appFunctionCall('getStorage', {id: id}, 'realityEditor.app.callBack('+callBack+')');
};

 /**
 **************Speech****************
  **/
// starts the apple speech engine
realityEditor.app.startSpeechRecording = function () {};

// stops the speech engine
realityEditor.app.stopSpeechRecording = function () {};

//sends every individual word that was found one by one to the callback.
realityEditor.app.getWords = function (callBack) {
    this.appFunctionCall('getWords', null, 'realityEditor.app.callBack('+callBack+')');
};

/**
 **************UTILITIES****************
 **/
// encodes a javascript function call to be sent to the native app via the http interface or whatever interface will be available.
realityEditor.app.appFunctionCall = function(functionName, arguments, callbackString) {
    var messageBody = {
        functionName: functionName
    };
    
    if (arguments) {
        messageBody.arguments = arguments;
    }
    
    if (callbackString) {
        messageBody.callback = callbackString;
    }
    
    window.webkit.messageHandlers.realityEditor.postMessage(messageBody);
};

realityEditor.app.callBack = function(callBack){
    callBack(arguments);
};
