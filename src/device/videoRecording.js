createNameSpace("realityEditor.device.videoRecording");

/**
 * @fileOverview realityEditor.device.videoRecording.js
 * Contains the feature code to interact with the native API for recording
 * the camera feed and adding video frames to objects.
 * Shows visual feedback while recording.
 */


(function(exports) {

    var privateState = {
        isRecording: false
    };
    
    function initFeature() {
        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {

            // highlight or dim the video record button if there are visible objects, to show that it is able to be used
            var noVisibleObjects = Object.keys(visibleObjects).length === 0;
            if (globalStates.videoRecordingEnabled) {
                var buttonOpacity = (noVisibleObjects && !privateState.isRecording) ? 0.2 : 1.0;
                var recordButton = document.querySelector('#recordButton');
                if (recordButton) {
                    recordButton.style.opacity = buttonOpacity;
                }
            }
            
        });
    }
    
    /**
     * Starts or stops recording, and returns whether the recording is newly turned on (true) or off (false)
     * @return {boolean}
     */
    function toggleRecording() {
        if (privateState.isRecording) {
            stopRecording();
            return false;
        } else {
            startRecordingOnClosestObject();
            return true;
        }
    }
    
    /**
     * Starts a camera recording that will attach itself as a frame to the closest object when finished
     */
    function startRecordingOnClosestObject() {
        if (privateState.isRecording) {
            console.log('cannot start new recording until previous is finished');
            return;
        }
        var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];
        if (closestObjectKey) {
            realityEditor.app.startVideoRecording(closestObjectKey);
            privateState.isRecording = true;
            getRecordingIndicator().style.display = 'inline';
        }
    }
    
    /**
     * Stops recording a current video and sends it to server to add as a frame
     */
    function stopRecording() {
        if (!privateState.isRecording) {
            console.log('cannot stop a recording because a recording was not started');
            return;
        }
        realityEditor.app.stopVideoRecording();
        privateState.isRecording = false;
        getRecordingIndicator().style.display = 'none';
    }
    
    /**
     * Lazy instantiation and getter of a red dot element to indicate that a recording is in process
     * @return {Element}
     */
    function getRecordingIndicator() {
        var recordingIndicator = document.querySelector('#recordingIndicator');
        if (!recordingIndicator) {
            recordingIndicator = document.createElement('div');
            recordingIndicator.id = 'recordingIndicator';
            recordingIndicator.style.position = 'absolute';
            recordingIndicator.style.left = '10px';
            recordingIndicator.style.top = '10px';
            recordingIndicator.style.width = '30px';
            recordingIndicator.style.height = '30px';
            recordingIndicator.style.backgroundColor = 'red';
            recordingIndicator.style.borderRadius = '15px';
            document.body.appendChild(recordingIndicator);
        }
        return recordingIndicator;
    }

    exports.toggleRecording = toggleRecording;
    exports.startRecordingOnClosestObject = startRecordingOnClosestObject;
    exports.stopRecording = stopRecording;
    exports.initFeature = initFeature;

}(realityEditor.device.videoRecording));
