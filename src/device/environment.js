createNameSpace("realityEditor.device.environment");

(function(exports) {

    /**
     * Public init method sets up module and registers callbacks in other modules
     */
    function initService() {

    }

    exports.initService = initService;

    exports.providesOwnUpdateLoop = function() {
        return false; // true if desktop
    };

    exports.getLineWidthMultiplier = function() {
        return 1; // 5 if desktop
    };

    exports.shouldBroadcastUpdateObjectMatrix = function() {
        return false; // true if desktop
    };

    exports.doWorldObjectsRequireCameraTransform = function() {
        return false; // true if desktop
    };

    exports.requiresMouseEvents = function() {
        return false; // true if desktop
    };

}(realityEditor.device.environment));
