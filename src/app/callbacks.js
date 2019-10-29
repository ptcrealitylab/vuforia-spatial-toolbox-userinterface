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
 * @typedef {Readonly<{NOT_STARTED: number, STARTED: number, FAILED: number, SUCCEEDED: number}>} DownloadState
 * @description used to keep track of the download status of a certain resource (e.g. DAT and XML files of each object)
 */

/**
 * @type {Object.<string, {XML: DownloadState, DAT: DownloadState, MARKER_ADDED: DownloadState}>}
 * Maps object names to the download states of their XML and DAT files, and whether the tracking engine has added the resulting marker
 */
var targetDownloadStates = {};

/**
 * Temporarily caches objectIDs with their heartbeat checksum, which later on gets stored
 * to localStorage so that next time the app opens we don't re-download unmodified target data
 * @type {Object.<string, string>}
 */
var temporaryChecksumMap = {};

/**
 * Temporarily caches objectIDs with their full heartbeat entry so that it can be accessed in multiple download functions
 * @type {Object.<string, {id: string, ip: string, vn: number, tcs: string, zone: string}>}
 */
var temporaryHeartbeatMap = {};

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
 * Retrieves the projection matrix and starts streaming the model matrices, camera matrix, and groundplane matrix
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

    // subscribe to the ground plane matrix stream that starts returning results when it has been detected and an anchor added
    realityEditor.app.getGroundPlaneMatrixStream('realityEditor.app.callbacks.receiveGroundPlaneMatricesFromAR');

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
 * Callback for realityEditor.app.getExternalText
 * Loads the external userinterface URL (if any) from permanent storage
 *  (which later is used to populate the settings text field)
 * @param {string} savedState - needs to be JSON parsed
 */
realityEditor.app.callbacks.onExternalText = function(savedState) {
    if (savedState === '(null)') { savedState = 'null'; }
    savedState = JSON.parse(savedState);
    console.log('loaded external interface URL = ', savedState);

    if (savedState) {
        globalStates.externalState = savedState;
    }
};

/**
 * Callback for realityEditor.app.getZoneState
 * Loads the zone on/off state (if any) from permanent storage
 * @param {string} savedState - stringified boolean
 */
realityEditor.app.callbacks.onZoneState = function(savedState) {
    if (savedState === '(null)') { savedState = 'null'; }
    savedState = JSON.parse(savedState);
    console.log('loaded zone state = ', savedState);

    if (savedState) {
        globalStates.zoneState = savedState;
    }
};

/**
 * Callback for realityEditor.app.getZoneText
 * Loads the zone name (if any) from permanent storage
 * @param {string} savedState
 */
realityEditor.app.callbacks.onZoneText = function(savedState) {
    if (savedState === '(null)') { savedState = 'null'; }
    savedState = JSON.parse(savedState);
    console.log('loaded zone text = ', savedState);

    if (savedState) {
        globalStates.zoneText = savedState;
    }
};

/**
 * Callback for realityEditor.app.getRealtimeState
 * Loads the realtime collaboration service enabled on/off state (if any) from permanent storage
 * @param {string} savedState - stringified boolean
 */
realityEditor.app.callbacks.onRealtimeState = function(savedState) {
    if (savedState === '(null)') { savedState = 'null'; }
    savedState = JSON.parse(savedState);
    console.log('loaded realtime state = ', savedState);

    if (savedState) {
        globalStates.realtimeEnabled = savedState;
    }
};

/**
 * Callback for realityEditor.app.getGroupingState
 * Loads the grouping service enabled on/off state (if any) from permanent storage
 * @param savedState - stringified boolean
 */
realityEditor.app.callbacks.onGroupingState = function(savedState) {
    if (savedState === '(null)') { savedState = 'null'; }
    savedState = JSON.parse(savedState);
    console.log('loaded realtime state = ', savedState);

    if (savedState) {
        globalStates.groupingEnabled = savedState;
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
 * Currently supports object discovery messages ("ip"/"id" pairs) and state synchronization ("action") messages
 * Additional UDP messages can be listened for by using realityEditor.network.addUDPMessageHandler
 * @param {string|object} message
 */
realityEditor.app.callbacks.receivedUDPMessage = function(message) {
    if (typeof message !== 'object') {
        try {
            message = JSON.parse(message);
        } catch (e) {
            // string doesn't need to be parsed... continue executing the function
        }
    }
    
    // upon a new object discovery message, add the object and download its target files
    if (typeof message.id !== 'undefined' &&
        typeof message.ip !== 'undefined') {
        
        if (typeof message.zone !== 'undefined' && message.zone !== '') {
            if (globalStates.zoneState && globalStates.zoneText === message.zone) {
                // console.log('Added object from zone=' + message.zone);
                realityEditor.network.addHeartbeatObject(message);
            }
        
        } else {
            if (!globalStates.zoneState) {
                // console.log('Added object without zone');
                realityEditor.network.addHeartbeatObject(message);
            }
        }
        

        // forward the action message to the network module, to synchronize state across multiple clients
    } else if (typeof message.action !== 'undefined') {
        realityEditor.network.onAction(message.action);
    }
    
    // forward the message to a generic message handler that various modules use to subscribe to different messages
    realityEditor.network.onUDPMessage(message);
};

/**
 * Callback for realityEditor.app.getDeviceReady
 * Returns the native device name, which can be used to adjust the UI based on the phone/device type
 * e.g. iPhone 6s is "iPhone8,1", iPhone 6s Plus is "iPhone8,2", iPhoneX is "iPhone10,3"
 * see: https://gist.github.com/adamawolf/3048717#file-ios_device_types-txt
 * or:  https://support.hockeyapp.net/kb/client-integration-ios-mac-os-x-tvos/ios-device-types
 * @param {string} deviceName - e.g. "iPhone10,3" or "iPad2,1"
 */
realityEditor.app.callbacks.getDeviceReady = function(deviceName) {
    console.log(deviceName);
    globalStates.device = deviceName;
    console.log("The Reality Editor is loaded on a " + globalStates.device);
    cout("setDeviceName");
};

//this is speeding things up always! Because the scope for searching this variable becomes smaller.
realityEditor.app.callbacks.matrixFormatCalculated = false;
realityEditor.app.callbacks.isMatrixFormatNew = undefined; // true if visible objects has the format {objectKey: {matrix:[], status:""}} instead of {objectKey: []}

var DISABLE_ALL_EXTENDED_TRACKING = false;
/**
 * Callback for realityEditor.app.getMatrixStream
 * Gets triggered ~60FPS when the AR SDK sends us a new set of modelView matrices for currently visible objects
 * Stores those matrices in the draw module to be rendered in the next draw frame
 * @param {Object.<string, Array.<number>>} visibleObjects
 */
realityEditor.app.callbacks.receiveMatricesFromAR = function(visibleObjects) {
    
    // this first section makes the app work with extended or non-extended tracking while being backwards compatible

    // These should be uncommented if we switch to the EXTENDED_TRACKING version
    // if (TEMP_ENABLE_EXTENDED_TRACKING) {
        if (!realityEditor.app.callbacks.matrixFormatCalculated) {
            // for speed, only calculates this one time
            realityEditor.app.callbacks.calculateMatrixFormat(visibleObjects);
        }

        // ignore this step if using old app version that ignores EXTENDED_TRACKED objects entirely
        if (realityEditor.app.callbacks.isMatrixFormatNew) {
            // extract status into separate data structure and and format matrices into a backwards-compatible object
            // if extended tracking is turned off, discard EXTENDED_TRACKED objects
            realityEditor.app.callbacks.convertNewMatrixFormatToOld(visibleObjects);
        }
    // }
    
    // this next section adjusts the world origin to be centered on a hard-coded image target if it ever gets recognized
    
    if(visibleObjects.hasOwnProperty("WorldReferenceXXXXXXXXXXXX")){
        // if (realityEditor.gui.ar.draw.worldCorrection === null) { realityEditor.gui.ar.draw.worldCorrection = [] } // required for copyMatrixInPlace 
        // realityEditor.gui.ar.utilities.copyMatrixInPlace(visibleObjects["WorldReferenceXXXXXXXXXXXX"], realityEditor.gui.ar.draw.worldCorrection);

        realityEditor.gui.ar.draw.worldCorrection = realityEditor.gui.ar.utilities.copyMatrix(visibleObjects["WorldReferenceXXXXXXXXXXXX"]);
        delete visibleObjects["WorldReferenceXXXXXXXXXXXX"];
    }
    
    // this next section populates the visibleObjects matrices based on the model and view (camera) matrices
    
    // easiest way to implement freeze button is just to not update the new matrices
    if (!globalStates.freezeButtonState) {

        realityEditor.worldObjects.getWorldObjectKeys().forEach(function(worldObjectKey) {
            // corrected camera matrix is actually the view matrix (inverse camera), so it works as an "object" placed at the world origin

            if(realityEditor.gui.ar.draw.worldCorrection === null) {
                visibleObjects[worldObjectKey] = realityEditor.gui.ar.draw.correctedCameraMatrix;
            } else {
                // re-localize world objects based on the world reference marker (also used for ground plane re-localization)
                this.matrix = [];
                realityEditor.gui.ar.utilities.multiplyMatrix(realityEditor.gui.ar.draw.worldCorrection, realityEditor.gui.ar.draw.correctedCameraMatrix, this.matrix);
                visibleObjects[worldObjectKey] = this.matrix;
            }

        });
        
        realityEditor.gui.ar.draw.visibleObjectsCopy = visibleObjects;
    }
    
    // finally, render the objects/frames/nodes. I have tested doing this based on a requestAnimationFrame loop instead
    //  of being driven by the vuforia framerate, and have mixed results as to which is smoother/faster
        
    // if (typeof realityEditor.gui.ar.draw.update !== 'undefined') {
        realityEditor.gui.ar.draw.update(realityEditor.gui.ar.draw.visibleObjectsCopy);
    // }
};

/**
 * Callback for realityEditor.app.getCameraMatrixStream
 * Gets triggered ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
 * @param {Array.<number>} cameraMatrix
 */
realityEditor.app.callbacks.receiveCameraMatricesFromAR = function(cameraMatrix) {
    // easiest way to implement freeze button is just to not update the new matrices
    if (!globalStates.freezeButtonState) {
        realityEditor.gui.ar.draw.correctedCameraMatrix = realityEditor.gui.ar.utilities.invertMatrix(cameraMatrix);
    }
};

/**
 * Looks at the visibleObjects and sees if it uses the old format or the new, so that we can convert to backwards-compatible
 * New format of visibleObject  = {objectKey: {matrix:[], status:""}} 
 * Old format of visibleObjects = {objectKey: []}
 * @param visibleObjects
 */
realityEditor.app.callbacks.calculateMatrixFormat = function(visibleObjects) {
    if (typeof realityEditor.app.callbacks.isMatrixFormatNew === 'undefined') {
        for (var key in visibleObjects) {
            realityEditor.app.callbacks.isMatrixFormatNew = (typeof visibleObjects[key].status !== 'undefined');
            realityEditor.app.callbacks.matrixFormatCalculated = true;
            break; // only needs to look at one object to determine format that this vuforia app uses
        }
    }
};

/**
 * Takes new matrix format and extracts each object's tracking status into visibleObjectsStatus
 * And puts each object's matrix directly back into the visibleObjects so that it matches the old format
 * Also deletes EXTENDED_TRACKED objects from structure if not in extendedTracking mode, to match old behavior
 * @param {Object.<{objectKey: {matrix:Array.<number>, status: string}>} visibleObjects
 */
realityEditor.app.callbacks.convertNewMatrixFormatToOld = function(visibleObjects) {
    realityEditor.gui.ar.draw.visibleObjectsStatus = {};
    for (var key in visibleObjects) {
        realityEditor.gui.ar.draw.visibleObjectsStatus[key] = visibleObjects[key].status;
        if ( (!DISABLE_ALL_EXTENDED_TRACKING && globalStates.extendedTracking) || visibleObjects[key].status === 'TRACKED') {
            visibleObjects[key] = visibleObjects[key].matrix;
        } else {
            if (visibleObjects[key].status === 'EXTENDED_TRACKED') {
                delete visibleObjects[key];
            }
        }
    }
};

realityEditor.app.callbacks.rotationXMatrix = rotationXMatrix;
realityEditor.app.callbacks.matrix = [];

/**
 * Callback for realityEditor.app.getGroundPlaneMatrixStream
 * Gets triggered ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
 * @param {Array.<number>} groundPlaneMatrix
 */
realityEditor.app.callbacks.receiveGroundPlaneMatricesFromAR = function(groundPlaneMatrix) {

    // completely ignore this if nothing is using ground plane right now
    if (globalStates.useGroundPlane) {

        if (!globalStates.freezeButtonState) {
            if(realityEditor.gui.ar.draw.worldCorrection === null) {
                realityEditor.gui.ar.utilities.multiplyMatrix(groundPlaneMatrix, realityEditor.gui.ar.draw.correctedCameraMatrix, realityEditor.gui.ar.draw.groundPlaneMatrix);
            } else {
                this.matrix = [];
                realityEditor.gui.ar.utilities.multiplyMatrix(this.rotationXMatrix, realityEditor.gui.ar.draw.worldCorrection, this.matrix);
                realityEditor.gui.ar.utilities.multiplyMatrix(this.matrix, realityEditor.gui.ar.draw.correctedCameraMatrix, realityEditor.gui.ar.draw.groundPlaneMatrix);
            }
        }
        
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

    var objectID = objectHeartbeat.id;
    var objectName = objectHeartbeat.id.slice(0,-12); // get objectName from objectId
    
    temporaryHeartbeatMap[objectHeartbeat.id] = objectHeartbeat;

    var newChecksum = objectHeartbeat.tcs;
    if (newChecksum === 'null') { newChecksum = null; }
    temporaryChecksumMap[objectHeartbeat.id] = newChecksum;

    var needsXML = true;
    var needsDAT = true;
    
    if (typeof targetDownloadStates[objectID] !== 'undefined') {
        if (targetDownloadStates[objectID].XML === DownloadState.STARTED ||
            targetDownloadStates[objectID].XML === DownloadState.SUCCEEDED) {
            needsXML = false;
        }
        if (targetDownloadStates[objectID].DAT === DownloadState.STARTED ||
            targetDownloadStates[objectID].DAT === DownloadState.SUCCEEDED) {
            needsDAT = false;
        }

    } else {
        targetDownloadStates[objectID] = {
            XML: DownloadState.NOT_STARTED,
            DAT: DownloadState.NOT_STARTED,
            MARKER_ADDED: DownloadState.NOT_STARTED
        };
    }

    // don't download again if already stored the same checksum version
    var storedChecksum = window.localStorage.getItem('realityEditor.objectChecksums.'+objectID);
    if (storedChecksum) {
        console.log('previously downloaded files for ' + objectID + ' with checksum ' + storedChecksum);
        console.log('new checksum is ' + newChecksum);
        if (newChecksum === storedChecksum) {
            // check that the files still exist in the app's temporary storage
            var xmlFileName = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.xml';
            var datFileName = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.dat';

            realityEditor.app.getFilesExist([xmlFileName, datFileName], 'realityEditor.app.callbacks.doTargetFilesExist');
            return;
        }
    }

    console.log('no matching checksum. download fresh target files (needs XML? ' + needsXML + ') (needs DAT? ' + needsDAT + ')');
    continueDownload(objectID, objectHeartbeat, needsXML, needsDAT);

};

/**
 * Downloads the XML and/or the DAT for the object target depending on which are still needed
 * @param {string} objectID
 * @param {{id: string, ip: string, vn: number, tcs: string, zone: string}} objectHeartbeat
 * @param {boolean} needsXML
 * @param {boolean} needsDAT
 */
function continueDownload(objectID, objectHeartbeat, needsXML, needsDAT) {
    
    if (!needsXML && !needsDAT) {
        return;
    }

    console.log('continue download for ' + objectHeartbeat);
    var objectName = objectHeartbeat.id.slice(0,-12); // get objectName from objectId

    // downloads the vuforia target.xml file if it doesn't have it yet
    if (needsXML) {
        var xmlAddress = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.xml';
        realityEditor.app.downloadFile(xmlAddress, 'realityEditor.app.callbacks.onTargetFileDownloaded');
        targetDownloadStates[objectID].XML = DownloadState.STARTED;
    }

    // downloads the vuforia target.dat file it it doesn't have it yet
    if (needsDAT) {
        var datAddress = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.dat';
        realityEditor.app.downloadFile(datAddress, 'realityEditor.app.callbacks.onTargetFileDownloaded');
        targetDownloadStates[objectID].DAT = DownloadState.STARTED;
    }
}

/**
 * 
 * @param {boolean} success
 * @param {Array.<string>} fileNameArray
 */
realityEditor.app.callbacks.doTargetFilesExist = function(success, fileNameArray) {
    console.log('doTargetFilesExist', success, fileNameArray);
    
    if (fileNameArray.length > 0) {
        var objectID = getObjectIDFromFilename(fileNameArray[0]);
        var heartbeat = temporaryHeartbeatMap[objectID];
        
        if (success) {
            
            // if the checksums match and we verified that the files exist, proceed without downloading
            targetDownloadStates[objectID].XML = DownloadState.SUCCEEDED;
            targetDownloadStates[objectID].DAT = DownloadState.SUCCEEDED;

            var xmlFileName = fileNameArray.filter(function(fileName) {
                return fileName.indexOf('xml') > -1;
            })[0];

            realityEditor.app.addNewMarker(xmlFileName, 'realityEditor.app.callbacks.onMarkerAdded');
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.STARTED;
            
        } else {

            var needsXML = !(targetDownloadStates[objectID].XML === DownloadState.STARTED ||
                targetDownloadStates[objectID].XML === DownloadState.SUCCEEDED);
            
            var needsDAT = !(targetDownloadStates[objectID].DAT === DownloadState.STARTED ||
                targetDownloadStates[objectID].DAT === DownloadState.SUCCEEDED);
            
            continueDownload(objectID, heartbeat, needsXML, needsDAT);
        }

    }
    
};

/**
 * Uses a combination of IP address and object name to locate the ID.
 * e.g. "http://10.10.10.108:8080/obj/monitorScreen/target/target.xml" -> ("10.10.10.108", "monitorScreen") -> object named monitor screen with that IP
 * @param {string} fileName
 */
function getObjectIDFromFilename(fileName) {
    var ip = fileName.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/)[0];
    var objectName = fileName.split('/')[4];
    
    for (var objectKey in objects) {
        if (!objects.hasOwnProperty(objectKey)) continue;
        var object = realityEditor.getObject(objectKey);
        if (object.ip === ip && object.name === objectName) {
            return objectKey;
        }
    }
    
    console.warn('tried to download a file that couldnt locate a matching object', fileName);
}

/**
 * Callback for realityEditor.app.downloadFile for either target.xml or target.dat
 * Updates the corresponding object's targetDownloadState,
 * and if both the XML and DAT are finished downloading, adds the resulting marker to the AR engine
 * @param {boolean} success
 * @param {string} fileName
 */
realityEditor.app.callbacks.onTargetFileDownloaded = function(success, fileName) {
    
    var isXML = fileName.split('/')[fileName.split('/').length-1].indexOf('xml') > -1;
    var fileTypeString = isXML ? 'XML' : 'DAT';
    
    // we don't have the objectID but luckily it can be extracted from the fileName
    // var objectID = getObjectIDFromName(objectName, DownloadState.STARTED, fileTypeString);
    var objectID = getObjectIDFromFilename(fileName);

    if (success) {
        console.log('successfully downloaded file: ' + fileName);
        targetDownloadStates[objectID][fileTypeString] = DownloadState.SUCCEEDED;
    } else {
        console.log('failed to download file: ' + fileName);
        targetDownloadStates[objectID][fileTypeString] = DownloadState.FAILED;
    }
    
    var hasXML = targetDownloadStates[objectID].XML === DownloadState.SUCCEEDED;
    var hasDAT = targetDownloadStates[objectID].DAT === DownloadState.SUCCEEDED;
    var markerNotAdded = (targetDownloadStates[objectID].MARKER_ADDED === DownloadState.NOT_STARTED ||
                          targetDownloadStates[objectID].MARKER_ADDED === DownloadState.FAILED);
    
    // synchronizes the two async download calls to add the marker when both tasks have completed
    var xmlFileName = isXML ? fileName : fileName.slice(0, -3) + 'xml';
    if (hasXML && hasDAT && markerNotAdded) {
        realityEditor.app.addNewMarker(xmlFileName, 'realityEditor.app.callbacks.onMarkerAdded');
        targetDownloadStates[objectID].MARKER_ADDED = DownloadState.STARTED;

        if (temporaryChecksumMap[objectID]) {
            window.localStorage.setItem('realityEditor.objectChecksums.'+objectID, temporaryChecksumMap[objectID]);
        }
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
    // var objectID = getObjectIDFromName(objectName, DownloadState.STARTED, 'MARKER_ADDED');
    var objectID = getObjectIDFromFilename(fileName);

    if (success) {
        console.log('successfully added marker: ' + fileName);
        targetDownloadStates[objectID].MARKER_ADDED = DownloadState.SUCCEEDED;
    } else {
        console.log('failed to add marker: ' + fileName);
        targetDownloadStates[objectID].MARKER_ADDED = DownloadState.FAILED;
    }
};
