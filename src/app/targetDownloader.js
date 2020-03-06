createNameSpace("realityEditor.app.targetDownloader");

/**
 * @fileOverview realityEditor.app.targetDownloader.js
 * Compartmentalizes the functions related to downloading JPG, DAT, and XML data for each object,
 * and using that data to initialize Vuforia targets.
 */

(function(exports) {

    /**
     * Used to pass module path to native app to trigger callbacks here
     * @type {string}
     */
    const moduleName = 'realityEditor.app.targetDownloader';

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
     * Downloads the JPG files, and adds the AR marker to the tracking engine, when a new UDP object heartbeat is detected
     * @param {{id: string, ip: string, vn: number, tcs: string, zone: string}} objectHeartbeat
     * id: the objectId
     * ip: the IP address of the server hosting this object
     * vn: the object's version number, e.g. 300 for version 3.0.0
     * tcs: the checksum which can be used to tell if anything has changed since last loading this object
     * zone: the name of the zone this object is in, so we can ignore objects outside this editor's zone if we have previously specified one
     */
    function downloadAvailableTargetFiles(objectHeartbeat) {
        var objectID = objectHeartbeat.id;
        var objectName = objectHeartbeat.id.slice(0,-12); // get objectName from objectId
        temporaryHeartbeatMap[objectHeartbeat.id] = objectHeartbeat;

        var newChecksum = objectHeartbeat.tcs;
        if (newChecksum === 'null') { newChecksum = null; }
        temporaryChecksumMap[objectHeartbeat.id] = newChecksum;

        targetDownloadStates[objectID] = {
            XML: DownloadState.NOT_STARTED,
            DAT: DownloadState.NOT_STARTED,
            JPG: DownloadState.NOT_STARTED,
            MARKER_ADDED: DownloadState.NOT_STARTED
        };

        var xmlAddress = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.xml';

        // don't download again if already stored the same checksum version - effectively a way to cache the targets
        if (isAlreadyDownloaded(objectID)) {
            console.log('skip downloading XML for ' + objectID);
            onTargetXMLDownloaded(true, xmlAddress); // just directly trigger onTargetXMLDownloaded
            return;
        }

        // downloads the vuforia target.xml file if it doesn't have it yet
        realityEditor.app.downloadFile(xmlAddress, moduleName + '.onTargetXMLDownloaded');
        targetDownloadStates[objectID].XML = DownloadState.STARTED;
    }

    /**
     * If successfully downloads target JPG, tries to add a new marker to Vuforia
     * @param {boolean} success
     * @param {string} fileName
     */
    function onTargetXMLDownloaded(success, fileName) {
        // we don't have the objectID but luckily it can be extracted from the fileName
        var objectID = getObjectIDFromFilename(fileName);
        if (!objectID) {
            console.warn('ignoring unknown object target: ' + fileName);
            return;
        }

        if (success) {
            var object = realityEditor.getObject(objectID);

            console.log('successfully downloaded XML file: ' + fileName);
            targetDownloadStates[objectID].XML = DownloadState.SUCCEEDED;

            var datAddress = 'http://' + object.ip + ':' + httpPort + '/obj/' + object.name + '/target/target.dat';

            // don't download again if already stored the same checksum version
            if (isAlreadyDownloaded(objectID)) {
                console.log('skip downloading DAT for ' + objectID);
                onTargetDATDownloaded(true, datAddress); // just directly trigger onTargetXMLDownloaded
                return;
            }

            // try to download DAT
            realityEditor.app.downloadFile(datAddress, moduleName + '.onTargetDATDownloaded');
            targetDownloadStates[objectID].XML = DownloadState.STARTED;

        } else {
            console.log('failed to download XML file: ' + fileName);
            targetDownloadStates[objectID].XML = DownloadState.FAILED;
        }
    }

    /**
     * If successfully downloads target JPG, tries to add a new marker to Vuforia
     * @param {boolean} success
     * @param {string} fileName
     */
    function onTargetDATDownloaded(success, fileName) {
        // we don't have the objectID but luckily it can be extracted from the fileName
        var objectID = getObjectIDFromFilename(fileName);
        var object = realityEditor.getObject(objectID);

        const jpgAddress = 'http://' + object.ip + ':' + httpPort + '/obj/' + object.name + '/target/target.jpg';

        if (success) {

            console.log('successfully downloaded DAT file: ' + fileName);
            targetDownloadStates[objectID].DAT = DownloadState.SUCCEEDED;

            // Because isAlreadyDownloaded doesn't differentiate between a
            // successful DAT download and a successful JPG download, mark the
            // potential cached JPG as successful too
            if (isAlreadyDownloaded(objectID)) {
                console.log('skip downloading JPG for', objectID);
                onTargetJPGDownloaded(true, jpgAddress);
                return;
            }

            var xmlFileName = 'http://' + object.ip + ':' + httpPort + '/obj/' + object.name + '/target/target.xml';
            realityEditor.app.addNewMarker(xmlFileName, moduleName + '.onMarkerAdded');
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.STARTED;

        } else {
            console.log('failed to download DAT file: ' + fileName);
            targetDownloadStates[objectID].XML = DownloadState.FAILED;

            console.log('try to download JPG file instead');

            if (isAlreadyDownloaded(objectID)) {
                console.log('skip downloading JPG for', objectID);
                onTargetJPGDownloaded(true, jpgAddress); // just directly trigger onTargetXMLDownloaded
                return;
            }

            // try to download JPG, marking XML as incomplete until we get the
            // extra information from the JPG
            realityEditor.app.downloadFile(jpgAddress, moduleName + '.onTargetJPGDownloaded');
            targetDownloadStates[objectID].XML = DownloadState.STARTED;
        }
    }

    /**
     * If successfully downloads target JPG, tries to add a new marker to Vuforia
     * @param {boolean} success
     * @param {string} fileName
     */
    function onTargetJPGDownloaded(success, fileName) {
        // we don't have the objectID but luckily it can be extracted from the fileName
        var objectID = getObjectIDFromFilename(fileName);

        if (success) {
            console.log('successfully downloaded file: ' + fileName);
            targetDownloadStates[objectID].JPG = DownloadState.SUCCEEDED;
            let targetWidth = realityEditor.gui.utilities.getTargetSize(objectID).width;
            console.log('attempting to add target via JPG of width ' + targetWidth);
            realityEditor.app.addNewMarkerJPG(fileName, objectID, targetWidth, moduleName + '.onMarkerAdded');
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.STARTED;
        } else {
            console.log('failed to download file: ' + fileName);
            targetDownloadStates[objectID].JPG = DownloadState.FAILED;
        }
    }

    /**
     * Callback for realityEditor.app.addNewMarker
     * Updates the download state for that object to mark it as fully initialized in the AR engine
     * Marks the object as SUCCEEDED only if its target is added, so we can later provide visual feedback
     * @param {boolean} success
     * @param {string} fileName
     */
    function onMarkerAdded(success, fileName) {
        console.log('marker added: ' + fileName + ', success? ' + success);
        var objectID = getObjectIDFromFilename(fileName);

        if (success) {
            console.log('successfully added marker: ' + fileName);
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.SUCCEEDED;
            saveChecksum(objectID); // only caches the target images after we confirm that they work
        } else {
            console.log('failed to add marker: ' + fileName);
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.FAILED;
        }
    }

    /**
     * Public function for determining whether an object's Vuforia target was successfully downloaded and initialized.
     * @param {string} objectID
     * @return {boolean}
     */
    function isObjectTargetInitialized(objectID) {
        return targetDownloadStates[objectID].MARKER_ADDED === DownloadState.SUCCEEDED;
    }

    /**
     * Checks if the new checksum from the object's heartbeat matches one possibly stored from a previous time the app was run
     * @param {string} objectID
     * @return {string|boolean}
     */
    function isAlreadyDownloaded(objectID) {
        var storedChecksum = getStoredChecksum(objectID);
        var newChecksum = temporaryChecksumMap[objectID];
        return storedChecksum && (storedChecksum === newChecksum);
    }

    /**
     * Stores the checksum of the XML + DAT + JPG files in localStorage, so that we can skip re-downloading them if we already have them.
     * @param {string} objectID
     * @return {string} - the checksum at time of downloading. null if never downloaded before.
     */
    function getStoredChecksum(objectID) {
        return window.localStorage.getItem('realityEditor.objectChecksums.'+objectID);
    }

    /**
     * On successful downloading of all necessary targets, store the new checksum into persistent localStorage.
     * @param {string} objectID
     */
    function saveChecksum(objectID) {
        if (temporaryChecksumMap[objectID]) {
            window.localStorage.setItem('realityEditor.objectChecksums.'+objectID, temporaryChecksumMap[objectID]);
        }
    }
    
    /**
     * @deprecated - use downloadAvailableTargetFiles instead, if the device can add objects based on DAT or JPG, not just DAT
     * @todo - evaluate if this is necessary at all or if it can be completely removed (github issue #14)
     * Downloads the XML and DAT files, and adds the AR marker to the tracking engine, when a new UDP object heartbeat is detected
     * @param {{id: string, ip: string, vn: number, tcs: string, zone: string}} objectHeartbeat
     * id: the objectId
     * ip: the IP address of the server hosting this object
     * vn: the object's version number, e.g. 300 for version 3.0.0
     * tcs: the checksum which can be used to tell if anything has changed since last loading this object
     * zone: the name of the zone this object is in, so we can ignore objects outside this editor's zone if we have previously specified one
     */
    function downloadTargetFilesForDiscoveredObject(objectHeartbeat) {

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

                realityEditor.app.getFilesExist([xmlFileName, datFileName], moduleName + '.doTargetFilesExist');
                return;
            }
        }

        console.log('no matching checksum. download fresh target files (needs XML? ' + needsXML + ') (needs DAT? ' + needsDAT + ')');
        continueDownload(objectID, objectHeartbeat, needsXML, needsDAT);

    }

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
            realityEditor.app.downloadFile(xmlAddress, moduleName + '.onTargetFileDownloaded');
            targetDownloadStates[objectID].XML = DownloadState.STARTED;
        }

        // downloads the vuforia target.dat file it it doesn't have it yet
        if (needsDAT) {
            var datAddress = 'http://' + objectHeartbeat.ip + ':' + httpPort + '/obj/' + objectName + '/target/target.dat';
            realityEditor.app.downloadFile(datAddress, moduleName + '.onTargetFileDownloaded');
            targetDownloadStates[objectID].DAT = DownloadState.STARTED;
        }
    }

    /**
     * 
     * @param {boolean} success
     * @param {Array.<string>} fileNameArray
     */
    function doTargetFilesExist(success, fileNameArray) {
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

                realityEditor.app.addNewMarker(xmlFileName, moduleName + '.onMarkerAdded');
                targetDownloadStates[objectID].MARKER_ADDED = DownloadState.STARTED;

            } else {

                var needsXML = !(targetDownloadStates[objectID].XML === DownloadState.STARTED ||
                    targetDownloadStates[objectID].XML === DownloadState.SUCCEEDED);

                var needsDAT = !(targetDownloadStates[objectID].DAT === DownloadState.STARTED ||
                    targetDownloadStates[objectID].DAT === DownloadState.SUCCEEDED);

                continueDownload(objectID, heartbeat, needsXML, needsDAT);
            }

        }

    }

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
    function onTargetFileDownloaded(success, fileName) {

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
            realityEditor.app.addNewMarker(xmlFileName, moduleName + '.onMarkerAdded');
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.STARTED;

            if (temporaryChecksumMap[objectID]) {
                window.localStorage.setItem('realityEditor.objectChecksums.'+objectID, temporaryChecksumMap[objectID]);
            }
        }
    }

    // These functions are the public API that should be called by other modules
    exports.downloadAvailableTargetFiles = downloadAvailableTargetFiles;
    exports.downloadTargetFilesForDiscoveredObject = downloadTargetFilesForDiscoveredObject;
    exports.isObjectTargetInitialized = isObjectTargetInitialized;
    
    // These functions are public only because they need to be triggered by native app callbacks
    exports.onTargetXMLDownloaded = onTargetXMLDownloaded;
    exports.onTargetDATDownloaded = onTargetDATDownloaded;
    exports.onTargetJPGDownloaded = onTargetJPGDownloaded;
    exports.onMarkerAdded = onMarkerAdded;
    exports.doTargetFilesExist = doTargetFilesExist;
    exports.onTargetFileDownloaded = onTargetFileDownloaded;
    
})(realityEditor.app.targetDownloader);
