createNameSpace("realityEditor.gui.ar.areaTargetScanner");

(function(exports) {

    /**
     * Public init method to enable rendering ghosts of edited frames while in editing mode.
     */
    function initService() {
        console.log("TODO: implement areaTargetScanner");
    }

    function startScanning() {
        realityEditor.app.areaTargetCaptureStart();
    }

    function stopScanning() {
        realityEditor.app.areaTargetCaptureStop();
    }

    function generateTarget() {
        realityEditor.app.areaTargetCaptureGenerate();
    }

    exports.initService = initService;

}(realityEditor.gui.ar.areaTargetScanner));
