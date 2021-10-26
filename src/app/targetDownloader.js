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
     * We will attempt to download up to this many times if it keeps failing
     * @type {number}
     */
    const MAXIMUM_RETRY_ATTEMPTS = 10;

    /**
     * Wait this much time between each failed re-download attempt
     * @type {number}
     */
    const MIN_MILLISECONDS_BETWEEN_ATTEMPTS = 10000;

    /**
     * Keeps track of how many download attempts we've tried for each objectId
     * Also stores the checksum that last failed, so we can reset number of attempts if checksum changes
     * And stores timestamp of last download attempt so we can wait enough time in between
     *{Object.<string, {attemptsLeft: number, previousChecksum: string, previousTimestamp: number}>}
     */
    let retryMap = {};

    /**
     * Flag to keep track of whether we've scheduled a re-download ping, so we don't spam
     * @type {boolean}
     */
    let isPingPending = false;

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
     * @type {Function?}
     */
    let createNavmeshCallback = null;

    /**
     * Worker that generates navmeshes from upload area target meshes
     * @type {Worker}
     */
    const navmeshWorker = new Worker('src/app/navmeshWorker.js');
    navmeshWorker.onmessage = function(evt) {
        const navmesh = evt.data.navmesh;
        const objectID = evt.data.objectID;
        window.localStorage.setItem(`realityEditor.navmesh.${objectID}`, JSON.stringify(navmesh));

        // Occlusion removed in favor of distance-based fading, but could be re-enabled in the future
        // let object = realityEditor.getObject(objectID);
        // let gltfPath = 'http://' + object.ip + ':' + realityEditor.network.getPort(objectID) + '/obj/' + object.name + '/target/target.glb';
        // realityEditor.gui.threejsScene.addOcclusionGltf(gltfPath, objectID);

        // realityEditor.gui.threejsScene.addGltfToScene(gltfPath);
        // let floorOffset = -1.55 * 1000;
        // realityEditor.gui.threejsScene.addGltfToScene(gltfPath, {x: -600, y: -floorOffset, z: -3300}, {x: 0, y: 2.661627109291353, z: 0});

        if (createNavmeshCallback) {
            createNavmeshCallback(navmesh);
        }
    }
    navmeshWorker.onerror = function(error) {
        console.error(`navmeshWorker: '${error.message}' on line ${error.lineno}`);
    }

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
        if (!shouldStartDownloadingFiles(objectHeartbeat)) {
            if (realityEditor.gui.ar.anchors.isAnchorHeartbeat(objectHeartbeat)) {
                realityEditor.gui.ar.anchors.createAnchorFromHeartbeat(objectHeartbeat);
            } else {
                onDownloadFailed(); // reschedule this attempt for later
            }
            return;
        }

        var objectID = objectHeartbeat.id;
        var objectName = getObjectNameFromId(objectHeartbeat.id);
        temporaryHeartbeatMap[objectHeartbeat.id] = objectHeartbeat;

        var newChecksum = objectHeartbeat.tcs;
        if (newChecksum === 'null') { newChecksum = null; }
        temporaryChecksumMap[objectHeartbeat.id] = newChecksum;

        // store info about this download attempt
        if (typeof retryMap[objectHeartbeat.id] === 'undefined' ||
            newChecksum !== retryMap[objectHeartbeat.id].previousChecksum) {
            retryMap[objectHeartbeat.id] = {
                previousChecksum: newChecksum,
                attemptsLeft: MAXIMUM_RETRY_ATTEMPTS
            };
        } else {
            // count down the number of re-download attempts
            retryMap[objectHeartbeat.id].attemptsLeft -= 1;
        }
        retryMap[objectHeartbeat.id].previousTimestamp = Date.now();

        // mark all downloads as not started
        // first we will download the XML
        // then we will download DAT, but resort to JPG if no DAT available
        // lastly we will try to add the downloaded data to Vuforia

        targetDownloadStates[objectID] = {
            XML: DownloadState.NOT_STARTED,
            DAT: DownloadState.NOT_STARTED,
            JPG: DownloadState.NOT_STARTED,
            GLB: DownloadState.NOT_STARTED,
            MARKER_ADDED: DownloadState.NOT_STARTED
        };
        var xmlAddress = realityEditor.network.getURL(objectHeartbeat.ip, realityEditor.network.getPort(objectHeartbeat), '/obj/' + objectName + '/target/target.xml');

        // regardless of previous conditions, don't proceed with any downloads if this is an anchor object
        if (realityEditor.gui.ar.anchors.isAnchorHeartbeat(objectHeartbeat)) {
            return;
        }

        // don't download XML again if already stored the same checksum version - effectively a way to cache the targets
        if (isAlreadyDownloaded(objectID, 'XML')) {
            console.log('skip downloading XML for ' + objectID);
            onTargetXMLDownloaded(true, xmlAddress); // just directly trigger onTargetXMLDownloaded
            return;
        }

        // downloads the vuforia target.xml file if it doesn't have it yet
        realityEditor.app.downloadFile(xmlAddress, moduleName + '.onTargetXMLDownloaded');
        targetDownloadStates[objectID].XML = DownloadState.STARTED;
    }

    function getObjectNameFromId(objectId) {
        let objectName = objectId.slice(0,-12); // get objectName from objectId
        if (objectName.length === 0) { objectName = objectId; } // use objectId as a backup (e.g. for _WORLD_local)
        return objectName;
    }

    /**
     * Prevents re-downloading if this object already in the middle of a download or was too recently attempted
     * @param {{id: string, ip: string, vn: number, tcs: string, zone: string}} objectHeartbeat
     * @return {boolean}
     */
    function shouldStartDownloadingFiles(objectHeartbeat) {
        var objectID = objectHeartbeat.id;

        // first ensure that this object isn't already mid-download
        if (typeof targetDownloadStates[objectID] !== 'undefined') {
            if (targetDownloadStates[objectID].XML === DownloadState.STARTED ||
                targetDownloadStates[objectID].DAT === DownloadState.STARTED ||
                targetDownloadStates[objectID].JPG === DownloadState.STARTED ||
                targetDownloadStates[objectID].GLB === DownloadState.STARTED ||
                targetDownloadStates[objectID].MARKER_ADDED === DownloadState.STARTED) {
                return false;
            }
        }

        // next ensure enough time has passed since the failed attempt
        if (typeof retryMap[objectID] !== 'undefined' &&
            objectHeartbeat.tcs === retryMap[objectID].previousChecksum) {
            let timeSinceLastAttempt = Date.now() - retryMap[objectID].previousTimestamp;
            if (timeSinceLastAttempt < MIN_MILLISECONDS_BETWEEN_ATTEMPTS) {
                return false;
            }
        }

        return true;
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

            var datAddress = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/obj/' + object.name + '/target/target.dat');

            // don't download again if already stored the same checksum version
            if (isAlreadyDownloaded(objectID, 'DAT')) {
                console.log('skip downloading DAT for ' + objectID);
                onTargetDATDownloaded(true, datAddress); // just directly trigger onTargetXMLDownloaded
                return;
            }

            // try to download DAT
            realityEditor.app.downloadFile(datAddress, moduleName + '.onTargetDATDownloaded');
            targetDownloadStates[objectID].DAT = DownloadState.STARTED;

        } else {
            console.log('failed to download XML file: ' + fileName);
            targetDownloadStates[objectID].XML = DownloadState.FAILED;
            onDownloadFailed(objectID);
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

        const jpgAddress = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/obj/' + object.name + '/target/target.jpg');

        if (success) {

            console.log('successfully downloaded DAT file: ' + fileName);
            targetDownloadStates[objectID].DAT = DownloadState.SUCCEEDED;

            var xmlFileName = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/obj/' + object.name + '/target/target.xml');
            realityEditor.app.addNewMarker(xmlFileName, moduleName + '.onMarkerAdded');
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.STARTED;
            realityEditor.getObject(objectID).isJpgTarget = false;

            if (realityEditor.getObject(objectID).isWorldObject) {
              var glbAddress = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/obj/' + object.name + '/target/target.glb');

              // don't download again if already stored the same checksum version
              if (isAlreadyDownloaded(objectID, 'GLB')) {
                  console.log('skip downloading GLB for ' + objectID);
                  onTargetGLBDownloaded(true, glbAddress); // just directly trigger onTargetGLBDownloaded
                  return;
              }

              // try to download GLB
              realityEditor.app.downloadFile(glbAddress, moduleName + '.onTargetGLBDownloaded');
              targetDownloadStates[objectID].GLB = DownloadState.STARTED;
            }

        } else {
            console.log('failed to download DAT file: ' + fileName);
            targetDownloadStates[objectID].DAT = DownloadState.FAILED;

            if (isAlreadyDownloaded(objectID, 'JPG')) {
                onTargetJPGDownloaded(true, jpgAddress); // just directly trigger onTargetXMLDownloaded
                return;
            }

            // try to download JPG, marking XML as incomplete until we get the
            // extra information from the JPG
            realityEditor.app.downloadFile(jpgAddress, moduleName + '.onTargetJPGDownloaded');
            targetDownloadStates[objectID].JPG = DownloadState.STARTED;
        }
    }

    /**
     * If successfully downloads target GLB, tries to set up navigation map
     * @param {boolean} success
     * @param {string} fileName
     */
    function onTargetGLBDownloaded(success, fileName) {
        // we don't have the objectID but luckily it can be extracted from the fileName
        var objectID = getObjectIDFromFilename(fileName);

        if (success) {
            console.log('successfully downloaded GLB file: ' + fileName);
            targetDownloadStates[objectID].GLB = DownloadState.SUCCEEDED;
        } else {
            console.log('failed to download GLB file: ' + fileName);
            targetDownloadStates[objectID].GLB = DownloadState.FAILED;
            onDownloadFailed(objectID);
        }
        createNavmesh(fileName, objectID);
    }

    /**
     * @param {string} fileName - Full URL of GLB file
     * @param {string} objectID
     * @param {Function?} callback
     */
    function createNavmesh(fileName, objectID, callback) {
        console.log('got GLB address');
        if (callback) {
            createNavmeshCallback = callback;
        }
        navmeshWorker.postMessage({fileName, objectID});
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
            console.log('successfully downloaded JPG file: ' + fileName);
            targetDownloadStates[objectID].JPG = DownloadState.SUCCEEDED;
            let targetWidth = realityEditor.gui.utilities.getTargetSize(objectID).width;
            realityEditor.app.addNewMarkerJPG(fileName, objectID, targetWidth, moduleName + '.onMarkerAdded');
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.STARTED;
            realityEditor.getObject(objectID).isJpgTarget = true;
        } else {
            console.log('failed to download JPG file: ' + fileName);
            targetDownloadStates[objectID].JPG = DownloadState.FAILED;
            onDownloadFailed(objectID);
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
        var objectID = getObjectIDFromFilename(fileName);

        if (success) {
            console.log('successfully added marker: ' + fileName);
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.SUCCEEDED;
            saveDownloadInfo(objectID); // only caches the target images after we confirm that they work
        } else {
            console.log('failed to add marker: ' + fileName);
            targetDownloadStates[objectID].MARKER_ADDED = DownloadState.FAILED;
            onDownloadFailed(objectID);
        }
    }

    /**
     * Respond to a failed download by trying to re-download after a delay
     * Only schedules one at a time because a single ping has the potential
     * to re-download every object that still needs a target.
     * Also clears the cache for the failed object so it freshly downloads next time
     * @param {string?} objectId
     */
    function onDownloadFailed(objectId) {
        if (objectId) {
            window.localStorage.removeItem('realityEditor.previousDownloadInfo.' + objectId);
        }

        if (!isPingPending) {
            setTimeout(function () {
                realityEditor.app.sendUDPMessage({action: 'ping'});
                isPingPending = false;
            }, MIN_MILLISECONDS_BETWEEN_ATTEMPTS);
            isPingPending = true;
        }
    }

    /**
     * Public function for determining whether an object's Vuforia target was successfully downloaded and initialized.
     * @param {string} objectID
     * @return {boolean}
     */
    function isObjectTargetInitialized(objectID) {
        return targetDownloadStates[objectID] && targetDownloadStates[objectID].MARKER_ADDED === DownloadState.SUCCEEDED;
    }

    /**
     * True if the marker failed to add given a successful download,
     * or the XML failed to download, or both the JPG and the DAT failed.
     * @param {string} objectID
     * @param {string} beatChecksum
     * @return {boolean}
     */
    function isObjectReadyToRetryDownload(objectID, beatChecksum) {
        if (!retryMap[objectID]) { return false; }

        // if we ran out of attempts for this checksum, don't retry download
        let hasAttemptsLeft = retryMap[objectID].attemptsLeft > 0;
        let isNewChecksum = beatChecksum && beatChecksum !== retryMap[objectID].previousChecksum;

        // if xml or marker adding failed, or (jpg AND dat) failed, don't rery download
        let didMarkerAddFail = targetDownloadStates[objectID].MARKER_ADDED === DownloadState.FAILED;
        let didXmlFail = targetDownloadStates[objectID].XML === DownloadState.FAILED;
        let didDatFail = targetDownloadStates[objectID].DAT === DownloadState.FAILED ||
                         targetDownloadStates[objectID].DAT === DownloadState.NOT_STARTED; // dat isn't guaranteed to start
        let didJpgFail = targetDownloadStates[objectID].JPG === DownloadState.FAILED ||
                         targetDownloadStates[objectID].JPG === DownloadState.NOT_STARTED; // jpg isn't guaranteed to start

        return (hasAttemptsLeft || isNewChecksum) && (didMarkerAddFail || didXmlFail || (didDatFail && didJpgFail));
    }

    /**
     * Checks if the provided file was previously downloaded for this object
     * If found, it verifies that the checksum from the previous download matches
     * the current object checksum, so it doesn't cache stale data
     * @param {string} objectID
     * @param {string} fileType - (XML, DAT, or JPG)
     * @return {boolean}
     */
    function isAlreadyDownloaded(objectID, fileType) {
        var previousDownloadInfo = getPreviousDownloadInfo(objectID);
        let xmlPreviouslyDownloaded = false;
        let jpgPreviouslyDownloaded = false;
        let datPreviouslyDownloaded = false;
        let glbPreviouslyDownloaded = false;
        let previousChecksum = null;
        if (previousDownloadInfo) {
            try {
                let parsed = JSON.parse(previousDownloadInfo);
                xmlPreviouslyDownloaded = parsed.xmlDownloaded === DownloadState.SUCCEEDED;
                jpgPreviouslyDownloaded = parsed.jpgDownloaded === DownloadState.SUCCEEDED;
                datPreviouslyDownloaded = parsed.datDownloaded === DownloadState.SUCCEEDED;
                glbPreviouslyDownloaded = parsed.glbDownloaded === DownloadState.SUCCEEDED;
                previousChecksum = parsed.checksum;
            } catch (e) {
                console.warn('error parsing previousDownloadInfo');
            }
        }

        // check if the specified fileType successfully downloaded to the cache
        if (fileType === 'XML' && !xmlPreviouslyDownloaded) {
            return false;
        } else if (fileType === 'DAT' && !datPreviouslyDownloaded) {
            return false;
        } else if (fileType === 'JPG' && !jpgPreviouslyDownloaded) {
            return false;
        } else if (fileType === 'GLB' && !glbPreviouslyDownloaded) {
            return false;
        }

        // if the file succeeded, also check that the checksum hasn't changed so we don't use stale data
        var newChecksum = temporaryChecksumMap[objectID];
        return previousChecksum && (previousChecksum === newChecksum);
    }

    /**
     * Stores the checksum of the XML + DAT + JPG files in localStorage, so that we can skip re-downloading them if we already have them.
     * @param {string} objectID
     * @return {string} - the checksum at time of downloading. null if never downloaded before.
     */
    function getPreviousDownloadInfo(objectID) {
        return window.localStorage.getItem('realityEditor.previousDownloadInfo.' + objectID);
    }

    /**
     * Store the object's checksum into persistent localStorage.
     * Also stores the success/fail state of the xml, dat, and jpg downloads individually
     * @param {string} objectID
     */
    function saveDownloadInfo(objectID) {
        if (temporaryChecksumMap[objectID]) {
            window.localStorage.setItem('realityEditor.previousDownloadInfo.' + objectID, JSON.stringify({
                checksum: temporaryChecksumMap[objectID],
                xmlDownloaded: targetDownloadStates[objectID].XML,
                datDownloaded: targetDownloadStates[objectID].DAT,
                jpgDownloaded: targetDownloadStates[objectID].JPG,
                glbDownloaded: targetDownloadStates[objectID].GLB
            }));
        }
    }

    /**
     * Removes all download info from localStorage, so that the app re-downloads
     * all targets instead of using a cached version
     */
    function resetTargetDownloadCache() {
        Object.keys(window.localStorage).filter(function(key) {
            return key.includes('realityEditor.previousDownloadInfo');
        }).forEach(function(key) {
            window.localStorage.removeItem(key);
        });
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
        var objectName = getObjectNameFromId(objectHeartbeat.id);

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
   var xmlFileName = realityEditor.network.getURL(objectHeartbeat.ip, realityEditor.network.getPort(objectHeartbeat), '/obj/' + objectName + '/target/target.xml');
                var datFileName = realityEditor.network.getURL(objectHeartbeat.ip, realityEditor.network.getPort(objectHeartbeat), '/obj/' + objectName + '/target/target.dat');

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
        var objectName = getObjectNameFromId(objectHeartbeat.id);

        // downloads the vuforia target.xml file if it doesn't have it yet
        if (needsXML) {
            var xmlAddress = realityEditor.network.getURL(objectHeartbeat.ip, realityEditor.network.getPort(objectHeartbeat), '/obj/' + objectName + '/target/target.xml');
            realityEditor.app.downloadFile(xmlAddress, moduleName + '.onTargetFileDownloaded');
            targetDownloadStates[objectID].XML = DownloadState.STARTED;
        }

        // downloads the vuforia target.dat file it it doesn't have it yet
        if (needsDAT) {
            var datAddress = realityEditor.network.getURL(objectHeartbeat.ip, realityEditor.network.getPort(objectHeartbeat), '/obj/' + objectName + '/target/target.dat');
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

 let schema = {
        "type": "object",
        "items": {
            "properties": {
                "obj": {"type": "string", "minLength": 1, "maxLength": 25, "pattern": "^[A-Za-z0-9_]*$"},
                "server" : {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9~!@$%^&*()-_=+|;:,.]"},
            },
            "required": ["server", "obj"],
            "expected": ["server", "obj"],
        }
    }
    
    function getObjectIDFromFilename(fileName) {
        let urlObj = io.parseUrl(fileName, schema)
        if(!urlObj)return; 
        var ip = urlObj.server
        var objectName = urlObj.obj
        
        console.log(urlObj)

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
    exports.isObjectReadyToRetryDownload = isObjectReadyToRetryDownload;
    exports.resetTargetDownloadCache = resetTargetDownloadCache;

    // These functions are public only because they need to be triggered by native app callbacks
    exports.onTargetXMLDownloaded = onTargetXMLDownloaded;
    exports.onTargetDATDownloaded = onTargetDATDownloaded;
    exports.onTargetJPGDownloaded = onTargetJPGDownloaded;
    exports.onTargetGLBDownloaded = onTargetGLBDownloaded;
    exports.createNavmesh = createNavmesh;
    exports.onMarkerAdded = onMarkerAdded;
    exports.doTargetFilesExist = doTargetFilesExist;
    exports.onTargetFileDownloaded = onTargetFileDownloaded;

})(realityEditor.app.targetDownloader);
