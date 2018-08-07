createNameSpace("realityEditor.device.videoRecording");

/**
 * @fileOverview realityEditor.device.videoRecording.js
 * Contains the feature code to interact with the native API for recording
 * the camera feed and adding video frames to objects.
 * Shows visual feedback while recording.
 */

var privateState = {
    isRecording: false
};

/**
 * Starts or stops recording, and returns whether the recording is newly turned on (true) or off (false)
 * @return {boolean}
 */
realityEditor.device.videoRecording.toggleRecording = function() {
    if (privateState.isRecording) {
        this.stopRecording();
        return false;
    } else {
        this.startRecordingOnClosestObject();
        return true;
    }
};

/**
 * Starts a camera recording that will attach itself as a frame to the closest object when finished
 */
realityEditor.device.videoRecording.startRecordingOnClosestObject = function() {
    if (privateState.isRecording) {
        console.log('cannot start new recording until previous is finished');
        return;
    }
    var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];
    if (closestObjectKey) {
        realityEditor.app.startVideoRecording(closestObjectKey);
        privateState.isRecording = true;
        this.getRecordingIndicator().style.display = 'inline';
    }
};

/**
 * Stops recording a current video and sends it to server to add as a frame
 */
realityEditor.device.videoRecording.stopRecording = function() {
    if (!privateState.isRecording) {
        console.log('cannot stop a recording because a recording was not started');
        return;
    }
    realityEditor.app.stopVideoRecording();
    privateState.isRecording = false;
    this.getRecordingIndicator().style.display = 'none';
};

/**
 * Lazy instantiation and getter of a red dot element to indicate that a recording is in process
 * @return {Element}
 */
realityEditor.device.videoRecording.getRecordingIndicator = function() {
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
};


