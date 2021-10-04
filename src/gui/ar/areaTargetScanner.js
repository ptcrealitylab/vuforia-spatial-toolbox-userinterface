createNameSpace("realityEditor.gui.ar.areaTargetScanner");

(function(exports) {

    let hasUserBeenNotified = false;
    // let detectedServers = {};
    let detectedObjects = {};

    let foundAnyWorldObjects = false;
    let isScanning = false;

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
        realityEditor.app.areaTargetCaptureStart('realityEditor.gui.ar.areaTargetScanner.captureStatusHandler');

        // TODO: turn app into scanning mode, disabling any AR rendering and other UI
        
        // add a stop button to the screen that can be pressed to trigger stopScanning
        let stopButton = getRecordingIndicator();
        stopButton.style.display = 'inline';
    }

    /**
     * Lazy instantiation and getter of a red dot element to indicate that a recording is in process
     * @return {Element}
     */
    function getRecordingIndicator() {
        var recordingIndicator = document.querySelector('#scanRecordingIndicator');
        if (!recordingIndicator) {
            recordingIndicator = document.createElement('div');
            recordingIndicator.id = 'scanRecordingIndicator';
            recordingIndicator.style.position = 'absolute';
            recordingIndicator.style.left = '10px';
            recordingIndicator.style.top = '10px';
            recordingIndicator.style.width = '30px';
            recordingIndicator.style.height = '30px';
            recordingIndicator.style.backgroundColor = 'red';
            recordingIndicator.style.borderRadius = '15px';
            document.body.appendChild(recordingIndicator);
            
            recordingIndicator.addEventListener('pointerup', function() {
                stopScanning();
            });
        }
        return recordingIndicator;
    }

    function stopScanning() {
        if (!isScanning) {
            console.log('not scanning.. ignore.');
        }
        realityEditor.app.areaTargetCaptureStop();
        getRecordingIndicator().style.display = 'none';
        isScanning = false;
        
        if (globalStates.debugSpeechConsole) {
            let console = document.getElementById('speechConsole');
            if (console) { console.innerHTML = ''; }
        }
    }

    function generateTarget() {
        realityEditor.app.areaTargetCaptureGenerate();
    }

    function captureStatusHandler(status, statusInfo) {
        console.log('capture status: ' + status);
        console.log('capture statusInfo: ' + statusInfo);
        console.log('---');
        
        if (globalStates.debugSpeechConsole) {
            let console = document.getElementById('speechConsole');
            if (!console) { return; }
            console.innerHTML = 
                'Status: ' + status + '<br>' +
                'Info: ' + statusInfo;
        }
    }

    exports.initService = initService;
    exports.captureStatusHandler = captureStatusHandler;

}(realityEditor.gui.ar.areaTargetScanner));
