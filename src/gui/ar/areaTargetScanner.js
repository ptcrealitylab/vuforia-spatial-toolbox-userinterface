createNameSpace("realityEditor.gui.ar.areaTargetScanner");

(function(exports) {

    let hasUserBeenNotified = false;

    let foundAnyWorldObjects = false;
    let isScanning = false;

    let feedbackString = null;
    let feedbackInterval = null;
    let feedbackTick = 0;

    const MAX_SCAN_TIME = 300;
    let timeLeftSeconds = MAX_SCAN_TIME;

    let loadingDialog = null;

    let pendingAddedObjectName = null;

    let sessionObjectId = null;
    let targetUploadURL = null;

    let hasFirstSeenInstantWorld = false;

    const limitScanRAM = false; // if true, stop area target capture when device memory usage is high
    let maximumPercentRAM = 0.33; // the app will stop scanning when it reaches this threshold of total device memory

    let callbacks = {
        onStartScanning: [],
        onCaptureStatus: [],
        onStopScanning: [],
        onCaptureSuccessOrError: []
    };

    function initService() {
        if (!realityEditor.device.environment.variables.supportsAreaTargetCapture) {
            // This device doesn't support area target capture
            return;
        }

        realityEditor.app.promises.doesDeviceHaveDepthSensor().then(supportsCapture => {
            if (supportsCapture) {
                initServiceInternal();
            } else {
                // No depth sensor - cant support area target capture
                realityEditor.device.environment.variables.supportsAreaTargetCapture = false;
            }
        });
    }

    // only gets called if we know we have access to LiDAR sensor / scanning capabilities
    function initServiceInternal() {
        // wait until at least one server is detected
        // wait to see if any world objects are detected on that server
        // wait until camera device pose has been set / tracking is fully initialized

        // if no world objects are detected, show a notification "No spaces detected. Scan one to begin."
        // show "SCAN" button on bottom center of screen
        // OR -> show a modal with this info and the button to start. can dismiss and ignore completely.

        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            // if (objectKey === realityEditor.worldObjects.getLocalWorldId()) {
            //     return; // ignore local world
            // }
            if (pendingAddedObjectName) {
                if (object.name === pendingAddedObjectName) {
                    pendingObjectAdded(objectKey, object.ip, realityEditor.network.getPort(object));
                }
            }

            // check if it's a world object
            if (object && !object.deactivated &&
                (object.isWorldObject || object.type === 'world') &&
                (objectKey !== realityEditor.worldObjects.getLocalWorldId())) {
                foundAnyWorldObjects = true;
            }

            // wait after detecting an object to check the next step
            let delay = 5000;
            if (object.ip === '127.0.0.1' || object.ip === 'localhost') {
                delay = 7000;
            }
            setTimeout(function() {
                if (realityEditor.device.environment.variables.automaticallyPromptForAreaTargetCapture) {
                    showNotificationIfNeeded();
                }
            }, delay);
        });

        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
            if (!sessionObjectId) { return; }
            if (isScanning) { return; }
            if (hasFirstSeenInstantWorld) { return; }

            if (typeof visibleObjects[sessionObjectId] !== 'undefined') {
                hasFirstSeenInstantWorld = true;

                if (!realityEditor.device.environment.variables.overrideAreaTargetScanningUI) {
                    getStatusTextfield().innerHTML = 'Successfully localized within new scan!'
                    getStatusTextfield().style.display = 'inline';

                    setTimeout(function() {
                        getStatusTextfield().innerHTML = '';
                        getStatusTextfield().style.display = 'none';
                    }, 3000);
                }
            }
        });

        realityEditor.app.onAreaTargetGenerateProgress('realityEditor.gui.ar.areaTargetScanner.onAreaTargetGenerateProgress');
    }

    function showNotificationIfNeeded() {
        if (hasUserBeenNotified) {
            // Already notified user. Ignore this time.
            return;
        }

        if (foundAnyWorldObjects) {
            // Found an existing world object... no need to scan a new one. Ignore this time.
            return;
        }

        let cameraNode = realityEditor.sceneGraph.getCameraNode();
        let hasCameraBeenLocalized = (cameraNode && !realityEditor.gui.ar.utilities.isIdentityMatrix(cameraNode.localMatrix));
        if (!hasCameraBeenLocalized) {
            // AR Tracking hasn't finished initializing yet... try again...
            setTimeout(function() {
                showNotificationIfNeeded(); // repeat until ready
            }, 1000);
            return;
        }

        let detectedServers = realityEditor.network.discovery.getDetectedServerIPs({limitToWorldService: true});

        const headerText = 'No scans of this space detected. Make a scan?';
        let randomServerIP = Object.keys(detectedServers).filter(detectedServer => {
            return detectedServer !== '127.0.0.1' && detectedServer !== 'localhost';
        })[0]; // this is guaranteed to have at least one entry if we get here
        let descriptionText = `This will create a World Object on your edge server.<br/>Selected IP: `;
        descriptionText += `<select id="modalServerIp">`;
        for (let ip of Object.keys(detectedServers)) {
            if (ip === randomServerIP) {
                descriptionText += `<option selected value="${ip}">${ip}</option>`;
            } else {
                descriptionText += `<option value="${ip}">${ip}</option>`;
            }
        }
        descriptionText += '</select>';
        realityEditor.gui.modal.openClassicModal(headerText, descriptionText, 'Ignore', 'Begin Scan', function() {
            // console.log('Ignore scan modal');
        }, function() {
            let serverIp = randomServerIP;
            let elt = document.getElementById('modalServerIp');
            if (elt) {
                serverIp = elt.value;
            }

            // startScanning();
            createPendingWorldObject(serverIp);
        }, true);

        hasUserBeenNotified = true;
    }

    function programmaticallyStartScan(serverIp) {
        if (!realityEditor.device.environment.variables.supportsAreaTargetCapture) {
            // Don't start scanning because device has no depth (LiDAR) sensor
            return;
        }

        if (typeof serverIp !== 'undefined') {
            createPendingWorldObject(serverIp);
        } else {
            let detectedServers = realityEditor.network.discovery.getDetectedServerIPs({limitToWorldService: true});
            let randomServerIP = Object.keys(detectedServers)[0] || 'localhost';
            //.filter(detectedServer => {
            //    return detectedServer !== '127.0.0.1';
            //})[0];
            createPendingWorldObject(randomServerIP);
        }
    }

    function startScanning() {
        if (isScanning) {
            // already scanning.. ignore.
            return;
        }
        isScanning = true;
        timeLeftSeconds = MAX_SCAN_TIME;

        realityEditor.app.areaTargetCaptureStart(sessionObjectId, 'realityEditor.gui.ar.areaTargetScanner.captureStatusHandler');

        // TODO: turn app into scanning mode, disabling any AR rendering and other UI

        // add a stop button to the screen that can be pressed to trigger stopScanning
        if (!realityEditor.device.environment.variables.overrideAreaTargetScanningUI) {
            getRecordingIndicator().style.display = 'inline';
        }
        getStopButton().style.display = 'inline';
        getTimerTextfield().style.display = 'inline';

        if (!feedbackInterval) {
            feedbackInterval = setInterval(printFeedback, 1000);
        }

        callbacks.onStartScanning.forEach(cb => {
            cb();
        });
    }

    /**
     * Lazy instantiation and getter of a red dot element to indicate that a recording is in process
     * @return {Element}
     */
    function getRecordingIndicator() {
        var div = document.querySelector('#scanRecordingIndicator');
        if (!div) {
            div = document.createElement('div');
            div.id = 'scanRecordingIndicator';
            div.style.position = 'absolute';
            div.style.left = '10px';
            div.style.top = '10px';
            div.style.width = '30px';
            div.style.height = '30px';
            div.style.backgroundColor = 'red';
            div.style.borderRadius = '15px';
            document.body.appendChild(div);
        }
        return div;
    }

    /**
     * Lazy instantiation and getter of the stop button to generate the area target from the scan
     * @return {Element}
     */
    function getStopButton() {
        var div = document.querySelector('#scanStopButton');
        if (!div) {
            div = document.createElement('div');
            div.id = 'scanStopButton';
            div.style.position = 'absolute';
            div.style.left = '40vw';
            div.style.bottom = '10vh';
            div.style.width = '20vw';
            div.style.height = '60px';
            div.style.lineHeight = '60px';
            div.style.backgroundColor = 'rgba(255,255,255,0.7)';
            div.style.color = 'rgb(0,0,0)';
            div.style.borderRadius = '15px';
            div.style.textAlign = 'center';
            div.style.fontSize = '20px';
            div.style.verticalAlign = 'middle';
            const zIndex = 2901;
            div.style.zIndex = zIndex;
            div.style.transform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + zIndex + ',1)';
            document.body.appendChild(div);

            div.innerHTML = 'Stop Scanning';

            div.addEventListener('pointerup', function() {
                stopScanning();
            });
        }
        return div;
    }

    /**
     * Lazy instantiation and getter of the stop button to generate the area target from the scan
     * @return {Element}
     */
    function getStatusTextfield() {
        var div = document.querySelector('#scanStatusTextfield');
        if (!div) {
            div = document.createElement('div');
            div.id = 'scanStatusTextfield';
            div.style.position = 'absolute';
            div.style.left = '15vw';
            div.style.top = '10vh';
            div.style.width = '70vw';
            div.style.height = '60px';
            div.style.lineHeight = '60px';
            div.style.backgroundColor = 'rgba(255,255,255,0.5)';
            div.style.color = 'rgb(0,0,0)';
            div.style.borderRadius = '15px';
            div.style.textAlign = 'center';
            div.style.verticalAlign = 'middle';
            document.body.appendChild(div);
        }
        return div;
    }

    /**
     * Lazy instantiation and getter of the stop button to generate the area target from the scan
     * @return {Element}
     */
    function getTimerTextfield() {
        var div = document.querySelector('#scanTimerTextfield');
        if (!div) {
            div = document.createElement('div');
            div.id = 'scanTimerTextfield';
            div.style.position = 'absolute';
            div.style.left = '40vw';
            div.style.bottom = 'calc(10vh - 30px)';
            div.style.width = '20vw';
            div.style.height = '30px';
            div.style.lineHeight = '30px';
            div.style.color = 'rgb(255,255,255)';
            div.style.borderRadius = '15px';
            div.style.textAlign = 'center';
            div.style.fontSize = '12px';
            div.style.verticalAlign = 'middle';
            document.body.appendChild(div);
        }
        return div;
    }

    function getProgressBar() {
        let div = document.querySelector('#scanGenerateProgressBarContainer');
        if (!div) {
            div = document.createElement('div');
            div.id = 'scanGenerateProgressBarContainer';
            if (realityEditor.device.environment.variables.layoutUIForPortrait) {
                div.style.top = 'calc(50vh + max(36vh, 36vw)/2 + 25px)';
            } else {
                div.style.bottom = '30px';
            }
            document.body.appendChild(div);

            let bar = document.createElement('div');
            bar.id = 'scanGenerateProgressBar';
            div.appendChild(bar);
        }
        return div;
    }

    function stopScanning() {
        if (!isScanning) {
            // not scanning.. ignore.
        }

        realityEditor.app.areaTargetCaptureStop('realityEditor.gui.ar.areaTargetScanner.captureSuccessOrError');

        if (!realityEditor.device.environment.variables.overrideAreaTargetScanningUI) {
            getRecordingIndicator().style.display = 'none';
        }
        getStopButton().style.display = 'none';
        getTimerTextfield().style.display = 'none';
        getStatusTextfield().style.display = 'none';
        isScanning = false;

        feedbackString = null;

        if (feedbackInterval) {
            clearInterval(feedbackInterval);
            feedbackInterval = null;
        }

        if (globalStates.debugSpeechConsole) {
            let speechConsole = document.getElementById('speechConsole');
            if (speechConsole) { speechConsole.innerHTML = ''; }
        }

        // show loading animation. hide when successOrError finishes.
        showLoadingDialog('Generating Dataset...', 'Please wait.'); // Converting scan into AR target files.');

        callbacks.onStopScanning.forEach(cb => {
            cb();
        });
    }

    function createPendingWorldObject(serverIp) {
        pendingAddedObjectName = "_WORLD_instantScan" + globalStates.tempUuid;

        realityEditor.network.discovery.addExceptionToPausedObjectDetections(pendingAddedObjectName);

        const port = realityEditor.network.getPortByIp(serverIp);
        addObject(pendingAddedObjectName, serverIp, port);

        showLoadingDialog('Creating World Object...', 'Please wait. Generating object on server.');
        setTimeout(function() {
            realityEditor.app.sendUDPMessage({action: 'ping'}); // ping the servers to see if we get any new responses
            setTimeout(function() {
                realityEditor.app.sendUDPMessage({action: 'ping'}); // ping the servers to see if we get any new responses
                setTimeout(function() {
                    realityEditor.app.sendUDPMessage({action: 'ping'}); // ping the servers to see if we get any new responses
                }, 900);
            }, 600);
        }, 300);

        // wait for a response, wait til we have the objectID and know it exists
    }

    function pendingObjectAdded(objectKey, serverIp, serverPort) {
        // the object definitely exists...
        pendingAddedObjectName = null;

        setTimeout(function() {
            loadingDialog.dismiss();
            loadingDialog = null;
        }, 500);

        let objectName = realityEditor.getObject(objectKey).name;
        sessionObjectId = objectKey;
        targetUploadURL = realityEditor.network.getURL(serverIp, serverPort, '/content/' + objectName)

        startScanning();
    }

    function addObject(objectName, serverIp, serverPort) {
        var postUrl = realityEditor.network.getURL(serverIp, serverPort, '/')
        var params = new URLSearchParams({action: 'new', name: objectName, isWorld: true});
        fetch(postUrl, {
            method: 'POST',
            body: params
        }).then((response) => {
            return response.json();
        }).then((object) => {
            if (serverIp !== '127.0.0.1' && serverIp !== 'localhost') {
                return;
            }
            let baseWorldObjectBeat = {
                ip: 'localhost',
                port: realityEditor.device.environment.getLocalServerPort(),
                vn: 320,
                pr: 'R2',
                tcs: null,
                zone: '',
            };

            let delay = 1000;
            for (let i = 0; i < 7; i++) {
                setTimeout(() => {
                    realityEditor.network.addHeartbeatObject(
                        Object.assign(baseWorldObjectBeat, object));
                }, delay);
                delay *= 2;
            }
        }).catch(e => {
            console.error('addObject error', e);
        });
    }

    function captureStatusHandler(status, statusInfo) {
        if (status === 'PREPARING') {
            getStopButton().classList.add('captureButtonInactive');
        } else {
            getStopButton().classList.remove('captureButtonInactive');
        }

        feedbackString = status + '... (' + statusInfo + ')';

        callbacks.onCaptureStatus.forEach(cb => {
            cb(status, statusInfo);
        });
    }

    function printFeedback() {
        if (!isScanning || !feedbackString) { return; }

        if (!realityEditor.device.environment.variables.overrideAreaTargetScanningUI) {
            let dots = '';
            for (let i = 0; i < feedbackTick; i++) {
                dots += '.';
            }
            getStatusTextfield().innerHTML = feedbackString + dots;
            getStatusTextfield().style.display = 'inline';
        }

        feedbackTick += 1;
        feedbackTick = feedbackTick % 4;

        timeLeftSeconds -= 1;
        getTimerTextfield().innerHTML = timeLeftSeconds + 's';
        getTimerTextfield().style.display = 'inline';

        if (timeLeftSeconds <= 0) {
            stopScanning();
        }
    }

    function onAreaTargetGenerateProgress(percentGenerated) {
        let progressBarContainer = getProgressBar();
        progressBarContainer.style.display = '';
        let bar = progressBarContainer.querySelector('#scanGenerateProgressBar');
        bar.style.width = (percentGenerated * 100) + '%';

        if (loadingDialog) {
            let description = 'Please wait. Preparing scan.';
            if (percentGenerated > 0.05 && percentGenerated < 0.4) {
                description = 'Please wait. Fusing depth data.';
            } else if (percentGenerated < 0.7) {
                description = 'Please wait. Generating textures.';
            } else if (percentGenerated < 0.9) {
                description = 'Please wait. Generating Vuforia dataset.';
            } else if (percentGenerated >= 0.9) {
                description = 'Please wait. Finalizing files for upload.';
            }
            loadingDialog.domElements.description.innerHTML = description;
        }
    }

    function captureSuccessOrError(success, errorMessage) {
        loadingDialog.dismiss();
        loadingDialog = null;

        if (success) {
            realityEditor.app.areaTargetCaptureGenerate(targetUploadURL);

            setTimeout(function() {
                getProgressBar().style.display = 'none';
                showLoadingDialog('Uploading Target Data...', 'Please wait. Uploading data to server.');
                
                let alreadyProcessed = false;
                realityEditor.app.targetDownloader.addTargetStateCallback(sessionObjectId, (targetDownloadState) => {
                    if (alreadyProcessed) { return; }
                    
                    let SUCCEEDED = realityEditor.app.targetDownloader.DownloadState.SUCCEEDED;
                    if (targetDownloadState.XML === SUCCEEDED && targetDownloadState.DAT === SUCCEEDED) {
                        alreadyProcessed = true;

                        loadingDialog.dismiss();
                        loadingDialog = null;

                        // objects aren't fully initialized until they have a target.jpg, so we upload a screenshot to be the "icon"
                        realityEditor.app.getSnapshot('S', 'realityEditor.gui.ar.areaTargetScanner.onScreenshotReceived');
                    }
                });
            }, 1000);

            showMessage('Successful capture.', 2000);
        } else {
            showMessage('Error: ' + errorMessage, 2000);
        }

        callbacks.onCaptureSuccessOrError.forEach(cb => {
            cb(success, errorMessage);
        });
    }

    function onScreenshotReceived(base64String) {
        if (base64String === "") {
            // got empty screenshot... try again later
            setTimeout(function() {
                realityEditor.app.getSnapshot('S', 'realityEditor.gui.ar.areaTargetScanner.onScreenshotReceived');
            }, 3000);
            return;
        }
        var blob = realityEditor.device.utilities.b64toBlob(base64String, 'image/jpeg');
        uploadScreenshot(blob);
    }

    function uploadScreenshot(blob) {
        if (!targetUploadURL || !blob) {
            return;
        }
        
        const formData = new FormData();
        formData.append('file', blob, 'screenshot-target.jpg');

        var xhr = new XMLHttpRequest();
        xhr.open('POST', targetUploadURL, true);

        xhr.onload = function () {
            if (xhr.status === 200) {
                showMessage('Successfully uploaded icon to new world object', 2000);
            } else {
                showMessage('Error uploading icon to new world object', 2000);
            }
        };

        xhr.setRequestHeader('type', 'targetUpload');
        xhr.send(formData);
    }

    function showMessage(message, lifetime) {
        realityEditor.gui.modal.showScreenTopNotification(message, lifetime);
    }

    function showLoadingDialog(headerText, descriptionText) {
        if (loadingDialog) { // hide existing dialog before showing new one
            loadingDialog.dismiss();
            loadingDialog = null;
        }

        loadingDialog = realityEditor.gui.modal.showSimpleNotification(
            headerText, descriptionText, function () {
                // console.log('closed...');
            }, realityEditor.device.environment.variables.layoutUIForPortrait);
    }

    /**
     * Stop scanning if device is using too much memory
     * @param {string} eventName - 'report_memory' happens every 1 second, 'UIApplicationDidReceiveMemoryWarningNotification' if problem
     * @param {number} bytesUsed - int number of bytes used by app
     * @param {number} percentOfDeviceUsedByApp - int number of bytes in total device RAM
     */
    function onAppMemoryEvent(eventName, bytesUsed, percentOfDeviceUsedByApp) {

        let gigabytesUsed = bytesUsed ? bytesUsed / (1024 * 1024 * 1024) : 0;

        if (globalStates.debugSpeechConsole) {
            let speechConsole = document.getElementById('speechConsole');
            if (!speechConsole) { return; }
            speechConsole.innerHTML = eventName + ': using ' + gigabytesUsed.toFixed(3) + ' GB ... (' + (percentOfDeviceUsedByApp * 100).toFixed(2) + '%)';
        }

        if (!isScanning) { return; }

        // UIApplicationDidReceiveMemoryWarningNotification happens too late in most cases, so we check more stringently
        if (eventName === 'UIApplicationDidReceiveMemoryWarningNotification' ||
            (limitScanRAM && percentOfDeviceUsedByApp > maximumPercentRAM)) {
            stopScanning();
            console.warn("stopping scan due to memory usage");
        }
    }

    exports.initService = initService;

    // allow external module to trigger the area target capture prompt
    exports.programmaticallyStartScan = programmaticallyStartScan;
    exports.onStartScanning = (callback) => {
        callbacks.onStartScanning.push(callback);
    };
    exports.onStopScanning = (callback) => {
        callbacks.onStopScanning.push(callback);
    };
    exports.onCaptureSuccessOrError = (callback) => {
        callbacks.onCaptureSuccessOrError.push(callback);
    };
    exports.didFindAnyWorldObjects = () => {
        let detectedObjects = realityEditor.network.discovery.getDetectedObjectsOfType('world');
        return detectedObjects.length > 0;
    };
    exports.onCaptureStatus = (callback) => {
        callbacks.onCaptureStatus.push(callback);
    };
    exports.getSessionObjectId = () => {
        return sessionObjectId;
    }

    // make functions available to native app callbacks
    exports.captureStatusHandler = captureStatusHandler;
    exports.onAreaTargetGenerateProgress = onAreaTargetGenerateProgress;
    exports.captureSuccessOrError = captureSuccessOrError;
    exports.onScreenshotReceived = onScreenshotReceived;
    exports.onAppMemoryEvent = onAppMemoryEvent;

}(realityEditor.gui.ar.areaTargetScanner));
