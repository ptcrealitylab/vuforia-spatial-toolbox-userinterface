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
 * Created by Ben Reynolds on 7/17/18.
 */

createNameSpace("realityEditor.app.callbacks");

/**
 * @fileOverview realityEditor.app.callbacks.js
 * The central location where all functions triggered from within the native iOS code should reside.
 * These can just be simple routing functions that trigger the appropriate function in other files,
 * but this acts to organize all API calls in a single place.
 */

/**
 * @type {Object.<string, {XML: DownloadState, DAT: DownloadState, MARKER_ADDED: DownloadState}>}
 * Maps object names to the download states of their XML and DAT files, and whether the tracking engine has added the resulting marker
 */
var targetDownloadStates = {};

/**
 * @typedef {Readonly<{NOT_STARTED: number, STARTED: number, FAILED: number, SUCCEEDED: number}>} DownloadState
 */

/**
 * @type DownloadState
 * enum defining whether a particular download has started, failed, or succeeded
 */
var DownloadState = Object.freeze(
    {
        NOT_STARTED: 0,
        STARTED: 1,
        FAILED: 2,
        SUCCEEDED: 3
    });

/**
 * Callback for realityEditor.app.getVuforiaReady
 * Retrieves the projection matrix and starts streaming the model matrices and camera matrix
 * Also starts the object discovery and download process
 */
realityEditor.app.callbacks.vuforiaIsReady = function() {
    console.log("Vuforia is ready");
    
    // projection matrix only needs to be retrieved once
    realityEditor.app.getProjectionMatrix('realityEditor.app.callbacks.receivedProjectionMatrix');

    // subscribe to the model matrices from each recognized image or object target
    realityEditor.app.getMatrixStream('realityEditor.app.callbacks.receiveMatricesFromAR');
    
    // subscribe to the camera matrix from the positional device tracker
    realityEditor.app.getCameraMatrixStream('realityEditor.app.callbacks.receiveCameraMatricesFromAR');

    // add heartbeat listener for UDP object discovery
    realityEditor.app.getUDPMessages('realityEditor.app.callbacks.receivedUDPMessage');
    
    // send three action UDP pings to start object discovery
    for (var i = 0; i < 3; i++) {
        setTimeout(function() {
            realityEditor.app.sendUDPMessage({action: 'ping'});
        }, 500 * i); // space out each message by 500ms
    }
};

/**
 * Callback for realityEditor.app.getProjectionMatrix
 * Sets the projection matrix once using the value from the AR engine
 * @param {Array.<number>} matrix
 */
realityEditor.app.callbacks.receivedProjectionMatrix = function(matrix) {
    console.log('got projection matrix!', matrix);
    realityEditor.gui.ar.setProjectionMatrix(matrix);
};

/**
 * Callback for realityEditor.app.getUDPMessages
 * Handles any UDP messages received by the app.
 * A case can be added for any additional messages to listen to.
 * Currently supports object discovery messages ("ip"/"id" pairs) and state synchronization ("action") messages
 * @param {string|Object} message
 */
realityEditor.app.callbacks.receivedUDPMessage = function(message) {
    if (typeof message !== 'object') {
        message = JSON.parse(message);
    }
    
    // upon a new object discovery message, add the object and download its target files
    if (typeof message.id !== 'undefined' &&
        typeof message.ip !== 'undefined') {
        realityEditor.app.callbacks.downloadTargetFilesForDiscoveredObject(message);
        realityEditor.network.addHeartbeatObject(message);
        
    // forward the action message to the network module, to synchronize state across multiple clients
    } else if (typeof message.action !== 'undefined') {
        realityEditor.network.onAction(message.action);
    }
    
    // forward the message to a generic message handler that various modules use to subscribe to different messages
    realityEditor.network.onUDPMessage(message);
};

/**
 * Callback for realityEditor.app.getMatrixStream
 * Gets triggered ~60FPS when the AR SDK sends us a new set of modelView matrices for currently visible objects
 * Stores those matrices in the draw module to be rendered in the next draw frame
 * @param {Object.<string, Array.<number>>} visibleObjects
 */
realityEditor.app.callbacks.receiveMatricesFromAR = function(visibleObjects) {
    // easiest way to implement freeze button is just to not update the new matrices
    if (!globalStates.freezeButtonState) {
        realityEditor.gui.ar.draw.visibleObjectsCopy = visibleObjects;
    }
};

/**
 * Callback for realityEditor.app.getCameraMatrixStream
 * Gets triggered ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
 * @param {Array.<number>} cameraMatrix
 */
realityEditor.app.callbacks.receiveCameraMatricesFromAR = function(cameraMatrix) {
    // easiest way to implement freeze button is just to not update the new matrices
    if (!globalStates.freezeButtonState) {
        realityEditor.gui.ar.draw.cameraMatrix = cameraMatrix; // TODO: should it be invert-transposed here or later on?
        // realityEditor.gui.ar.draw.cameraMatrix = realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(cameraMatrix));
    }
};

/**
 * Downloads the XML and DAT files, and adds the AR marker to the tracking engine, when a new UDP object heartbeat is detected
 * @param {{id: string, ip: string, vn: number, tcs: string, zone: string}} objectHeartbeat
 * id: the objectId
 * ip: the IP address of the server hosting this object 
 * vn: the object's version number, e.g. 300 for version 3.0.0
 * tcs: the checksum which can be used to tell if anything has changed since last loading this object
 * zone: the name of the zone this object is in, so we can ignore objects outside this editor's zone if we have previously specified one
 */
realityEditor.app.callbacks.downloadTargetFilesForDiscoveredObject = function(objectHeartbeat) {

    var objectName = objectHeartbeat.id.slice(0,-12); // get objectName from objectId
    
    var needsXML = true;
    var needsDAT = true;
    
    if (typeof targetDownloadStates[objectName] !== 'undefined') {
        if (targetDownloadStates[objectName].XML === DownloadState.STARTED ||
            targetDownloadStates[objectName].XML === DownloadState.SUCCEEDED) {
            needsXML = false;
        }
        if (targetDownloadStates[objectName].DAT === DownloadState.STARTED ||
            targetDownloadStates[objectName].DAT === DownloadState.SUCCEEDED) {
            needsDAT = false;
        }

    } else {
        targetDownloadStates[objectName] = {
            XML: DownloadState.NOT_STARTED,
            DAT: DownloadState.NOT_STARTED,
            MARKER_ADDED: DownloadState.NOT_STARTED
        };
    }
    
    if (!needsXML && !needsDAT) {
        return;
    }
    
    console.log(objectHeartbeat);

    // downloads the vuforia target.xml file if it doesn't have it yet
    if (needsXML) {
        var xmlAddress = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.xml';
        realityEditor.app.downloadFile(xmlAddress, 'realityEditor.app.callbacks.onTargetFileDownloaded');
        targetDownloadStates[objectName].XML = DownloadState.STARTED;
    }
    
    // downloads the vuforia target.dat file it it doesn't have it yet
    if (needsDAT) {
        var datAddress = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.dat';
        realityEditor.app.downloadFile(datAddress, 'realityEditor.app.callbacks.onTargetFileDownloaded');
        targetDownloadStates[objectName].DAT = DownloadState.STARTED;
    }

};

/**
 * Callback for realityEditor.app.downloadFile for either target.xml or target.dat
 * Updates the corresponding object's targetDownloadState,
 * and if both the XML and DAT are finished downloading, adds the resulting marker to the AR engine
 * @param {boolean} success
 * @param {string} fileName
 */
realityEditor.app.callbacks.onTargetFileDownloaded = function(success, fileName) {
    
    // we don't have the objectID but luckily it can be extracted from the fileName
    var objectName = fileName.split('/')[4];
    var isXML = fileName.split('/')[fileName.split('/').length-1].indexOf('xml') > -1;
    
    if (success) {
        console.log('successfully downloaded file: ' + fileName);
        targetDownloadStates[objectName][isXML ? 'XML' : 'DAT'] = DownloadState.SUCCEEDED;
    } else {
        console.log('failed to download file: ' + fileName);
        targetDownloadStates[objectName][isXML ? 'XML' : 'DAT'] = DownloadState.FAILED;
    }
    
    var hasXML = targetDownloadStates[objectName].XML === DownloadState.SUCCEEDED;
    var hasDAT = targetDownloadStates[objectName].DAT === DownloadState.SUCCEEDED;
    var markerNotAdded = (targetDownloadStates[objectName].MARKER_ADDED === DownloadState.NOT_STARTED ||
                          targetDownloadStates[objectName].MARKER_ADDED === DownloadState.FAILED);
    
    // synchronizes the two async download calls to add the marker when both tasks have completed
    var xmlFileName = isXML ? fileName : fileName.slice(0, -3) + 'xml';
    if (hasXML && hasDAT && markerNotAdded) {
        realityEditor.app.addNewMarker(xmlFileName, 'realityEditor.app.callbacks.onMarkerAdded');
        targetDownloadStates[objectName].MARKER_ADDED = DownloadState.STARTED;
    }
};

/**
 * Callback for realityEditor.app.addNewMarker
 * Updates the download state for that object to mark it as fully initialized in the AR engine
 * @todo: include some form of error handling / retry if success=false
 * @param {boolean} success
 * @param {string} fileName
 */
realityEditor.app.callbacks.onMarkerAdded = function(success, fileName) {
    console.log('marker added: ' + fileName + ', success? ' + success);
    var objectName = fileName.split('/')[4];

    if (success) {
        console.log('successfully added marker: ' + fileName);
        targetDownloadStates[objectName].MARKER_ADDED = DownloadState.SUCCEEDED;
    } else {
        console.log('failed to add marker: ' + fileName);
        targetDownloadStates[objectName].MARKER_ADDED = DownloadState.FAILED;
    }
};


/**
 * @todo: not currently used
 * // callback for getScreenshot
 * @param base64String
 */
realityEditor.app.callbacks.uploadMemory = function(base64String) {

    // var screenshotBlobUrl = realityEditor.device.utilities.decodeBase64JpgToBlobUrl(base64String);
    // debugShowScreenshot(screenshotBlobUrl);
    // currentMemory.src = screenshotBlobUrl;
    
    var currentMemoryID = realityEditor.gui.ar.getClosestObject()[0];
    var currentMemoryIP = realityEditor.getObject(currentMemoryID).ip;

    var formData = new FormData();
    // formData.append('ip', currentMemoryIP);
    // formData.append('id', currentMemoryID);
    formData.append('memoryInfo', JSON.stringify(realityEditor.gui.ar.draw.visibleObjects[currentMemoryID]));
    var blob = realityEditor.device.utilities.b64toBlob(base64String, 'image/jpeg');
    formData.append('memoryImage', blob);

    var request = new XMLHttpRequest();
    request.open("POST", "http://" + currentMemoryIP + ':' + httpPort + '/object/' + currentMemoryID + '/memory');
    request.send(formData);

};
