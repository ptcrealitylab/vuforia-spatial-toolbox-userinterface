createNameSpace("realityEditor.gui.ar.areaTargetScanner");

(function(exports) {

    let hasUserBeenNotified = false;
    // let detectedServers = {};
    let detectedObjects = {};

    let foundAnyWorldObjects = false;
    let isScanning = false;

    let feedbackString = null;
    let feedbackInterval = null;
    let feedbackTick = 0;

    const MAX_SCAN_TIME = 120;
    let timeLeftSeconds = MAX_SCAN_TIME;

    /**
     * Public init method to enable rendering ghosts of edited frames while in editing mode.
     */
    function initService() {
        console.log("TODO: implement areaTargetScanner");

        // wait until at least one server is detected
        // wait to see if any world objects are detected on that server
        // wait until camera device pose has been set / tracking is fully initialized

        // if no world objects are detected, show a notification "No spaces detected. Scan one to begin."
        // show "SCAN" button on bottom center of screen
        // OR -> show a modal with this info and the button to start. can dismiss and ignore completely.

        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            if (objectKey === realityEditor.worldObjects.getLocalWorldId()) {
                return; // ignore local world
            }

            if (typeof detectedObjects[objectKey] !== 'undefined') {
                return;
            }
            detectedObjects[objectKey] = true;

            // check if it's a world object
            if (object && (object.isWorldObject || object.type === 'world')) {
                foundAnyWorldObjects = true;
                console.log("world obj detected");
            } else {
                console.log("obj detected");
            }

            // wait 3 seconds after detecting an object to check the next step
            setTimeout(function() {
                showNotificationIfNeeded();
            }, 1000);
        });

        // realityEditor.network.onNewServerDetected(function(serverIP) {
        //     if (typeof detectedServers[serverIP] !== 'undefined') {
        //         return;
        //     }
        //     detectedServers[serverIP] = true;
        // });
    }

    function showNotificationIfNeeded() {
        if (hasUserBeenNotified) {
            console.log("Already notified user. Ignore this time.");
            return;
        }

        if (foundAnyWorldObjects) {
            console.log("Found an existing world object... no need to scan a new one. Ignore this time.");
            return;
        }

        let cameraNode = realityEditor.sceneGraph.getCameraNode();
        let hasCameraBeenLocalized = (cameraNode && !realityEditor.gui.ar.utilities.isIdentityMatrix(cameraNode.localMatrix));
        if (!hasCameraBeenLocalized) {
            console.log("AR Tracking hasn't finished initializing yet... try again...");
            setTimeout(function() {
                showNotificationIfNeeded(); // repeat until ready
            }, 1000);
            return;
        }

        const headerText = 'No scans of this space detected. Make a scan?';
        const descriptionText = 'This will create a World Object on your edge server.'
        realityEditor.gui.modal.openClassicModal(headerText, descriptionText, 'Ignore', 'Begin Scan', function() {
            console.log('Ignore scan modal');
        }, function() {
            console.log('Begin scan');
            startScanning();
        }, true);

        hasUserBeenNotified = true;
    }

    function startScanning() {
        if (isScanning) {
            console.log('already scanning.. ignore.');
            return;
        }
        isScanning = true;
        timeLeftSeconds = MAX_SCAN_TIME;

        realityEditor.app.areaTargetCaptureStart('realityEditor.gui.ar.areaTargetScanner.captureStatusHandler');

        // TODO: turn app into scanning mode, disabling any AR rendering and other UI

        // add a stop button to the screen that can be pressed to trigger stopScanning
        getRecordingIndicator().style.display = 'inline';
        getStopButton().style.display = 'inline';
        getTimerTextfield().style.display = 'inline';

        if (!feedbackInterval) {
            feedbackInterval = setInterval(printFeedback, 1000);
        }
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

    function stopScanning() {
        if (!isScanning) {
            console.log('not scanning.. ignore.');
        }
        realityEditor.app.areaTargetCaptureStop();
        getRecordingIndicator().style.display = 'none';
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
            let console = document.getElementById('speechConsole');
            if (console) { console.innerHTML = ''; }
        }
    }

    function _generateTarget() {
        realityEditor.app.areaTargetCaptureGenerate();
    }

    function captureStatusHandler(status, statusInfo) {
        console.log('capture status: ' + status);
        console.log('capture statusInfo: ' + statusInfo);
        console.log('---');

        feedbackString = status + '... (' + statusInfo + ')';

        if (globalStates.debugSpeechConsole) {
            let console = document.getElementById('speechConsole');
            if (!console) { return; }
            console.innerHTML =
                'Status: ' + status + '<br>' +
                'Info: ' + statusInfo;
        }
    }

    function printFeedback() {
        if (!isScanning || !feedbackString) { return; }

        let dots = '';
        for (let i = 0; i < feedbackTick; i++) {
            dots += '.';
        }
        getStatusTextfield().innerHTML = feedbackString + dots;
        getStatusTextfield().style.display = 'inline';

        feedbackTick += 1;
        feedbackTick = feedbackTick % 4;

        timeLeftSeconds -= 1;
        getTimerTextfield().innerHTML = timeLeftSeconds + 's';
        getTimerTextfield().style.display = 'inline';

        if (timeLeftSeconds <= 0) {
            stopScanning();
        }
    }

    exports.initService = initService;
    exports.captureStatusHandler = captureStatusHandler;

}(realityEditor.gui.ar.areaTargetScanner));
