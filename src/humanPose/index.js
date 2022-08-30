createNameSpace("realityEditor.humanPose");

(function(exports) {

    let network, draw, utils; // shortcuts to access realityEditor.humanPose._____

    function initService() {
        network = realityEditor.humanPose.network;
        draw = realityEditor.humanPose.draw;
        utils = realityEditor.humanPose.utils;

        console.log('init humanPose module', network, draw, utils);
    }

    exports.initService = initService;

}(realityEditor.humanPose));
