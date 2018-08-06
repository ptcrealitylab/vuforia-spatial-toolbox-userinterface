createNameSpace("realityEditor.device.videoRecording");


realityEditor.device.videoRecording.startRecordingOnClosestObject = function() {
    var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];
    if (closestObjectKey) {
        realityEditor.app.startVideoRecording(closestObjectKey);
        this.getRecordingIndicator().style.display = 'inline';
    }
};


realityEditor.device.videoRecording.stopRecording = function() {
    realityEditor.app.stopVideoRecording();
    this.getRecordingIndicator().style.display = 'none';
};

realityEditor.device.videoRecording.getRecordingIndicator = function() {
    var recordingIndicator = document.querySelector('#recordingIndicator');
    if (!recordingIndicator) {
        recordingIndicator = document.createElement('div');
        recordingIndicator.id = 'recordingIndicator';
        recordingIndicator.style.position = 'absolute';
        recordingIndicator.style.left = '10px';
        recordingIndicator.style.top = '10px';
        recordingIndicator.style.width = '50px';
        recordingIndicator.style.height = '50px';
        recordingIndicator.style.backgroundColor = 'red';
        recordingIndicator.style.borderRadius = '25px';
        document.body.appendChild(recordingIndicator);
    }
    return recordingIndicator;
};


