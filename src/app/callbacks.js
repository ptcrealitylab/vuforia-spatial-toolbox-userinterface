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

var targetDownloadStates = {};

var DownloadState = Object.freeze(
    {
        NOT_STARTED: 0,
        STARTED: 1,
        FAILED: 2,
        SUCCEEDED: 3
    });


realityEditor.app.callbacks.vuforiaIsReady = function() {
    console.log("Vuforia is ready");

    // add heartbeat listener for UDP object discovery
    realityEditor.app.getUDPMessages('realityEditor.app.callbacks.receivedUDPMessage');
    
    realityEditor.app.getProjectionMatrix('realityEditor.app.callbacks.receivedProjectionMatrix');

    realityEditor.app.getMatrixStream('realityEditor.app.callbacks.receiveMatricesFromAR');

    realityEditor.app.getCameraMatrixStream('realityEditor.app.callbacks.receiveCameraMatricesFromAR');

    // send three action UDP pings to start object discovery
    for (var i = 0; i < 3; i++) {
        setTimeout(function() {
            realityEditor.app.sendUDPMessage({action: 'ping'});
        }, 50 * i); // space out each message by 50ms
    }
};

realityEditor.app.callbacks.receivedProjectionMatrix = function(matrix) {
    console.log('got projection matrix!', matrix);
    realityEditor.gui.ar.setProjectionMatrix(matrix);
};

realityEditor.app.callbacks.receivedUDPMessage = function(message) {
    if (typeof message !== 'object') {
        message = JSON.parse(message);
    }
    
    if (typeof message.id !== 'undefined' &&
        typeof message.ip !== 'undefined') {
        // console.log('received heartbeat', message);
        realityEditor.app.callbacks.downloadTargetFilesForDiscoveredObject(message);
        realityEditor.network.addHeartbeatObject(message);
    
    } else if (typeof message.action !== 'undefined') {
        realityEditor.network.onAction(message.action);
    }
    
};

/**
 * Callback ~60FPS when the AR SDK sends us a new set of modelView matrices for currently visible objects
 * @param {Object.<string, Array.<number>>} visibleObjects
 */
realityEditor.app.callbacks.receiveMatricesFromAR = function(visibleObjects) {
    // console.log('got new visible matrices');
    if (!globalStates.freezeButtonState) {
        realityEditor.gui.ar.draw.visibleObjectsCopy = visibleObjects;
    }
};

/**
 * Callback ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
 * @param {Array.<number>} cameraMatrix
 */
realityEditor.app.callbacks.receiveCameraMatricesFromAR = function(cameraMatrix) {
    // console.log('got new visible matrices');
    if (!globalStates.freezeButtonState) {
        // realityEditor.gui.ar.draw.visibleObjectsCopy = visibleObjects;
        // console.log(cameraMatrix);
        // realityEditor.gui.ar.draw.cameraMatrix = cameraMatrix;
        realityEditor.gui.ar.draw.cameraMatrix = realityEditor.gui.ar.utilities.transposeMatrix(realityEditor.gui.ar.utilities.invertMatrix(cameraMatrix));
    }
};

/**
 * Callback when a UDP message discovers a new object
 * @param {{id: string, ip: string, vn: number, tcs: string, zone: string}} objectHeartbeat
 */
realityEditor.app.callbacks.downloadTargetFilesForDiscoveredObject = function(objectHeartbeat) {
    // realityEditor.network.addHeartbeatObject(beat);
    // console.log(beat);
    
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
    
    if (needsXML) {
        var xmlAddress = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.xml';
        realityEditor.app.downloadFile(xmlAddress, 'realityEditor.app.callbacks.onTargetFileDownloaded');
        targetDownloadStates[objectName].XML = DownloadState.STARTED;
    }
    
    if (needsDAT) {
        var datAddress = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.dat';
        realityEditor.app.downloadFile(datAddress, 'realityEditor.app.callbacks.onTargetFileDownloaded');
        targetDownloadStates[objectName].DAT = DownloadState.STARTED;
    }

};

realityEditor.app.callbacks.onTargetFileDownloaded = function(success, fileName) {
    
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
    
    var xmlFileName = isXML ? fileName : fileName.slice(0, -3) + 'xml';
    if (hasXML && hasDAT && markerNotAdded) {
        realityEditor.app.addNewMarker(xmlFileName, 'realityEditor.app.callbacks.onMarkerAdded');
        targetDownloadStates[objectName].MARKER_ADDED = DownloadState.STARTED;
    }
};

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

// callback for getScreenshot
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
