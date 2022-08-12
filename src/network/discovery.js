createNameSpace("realityEditor.network.discovery");

(function(exports) {
    let heartbeatMap = {};
    function initService() {
        realityEditor.network.addUDPMessageHandler('beat', () => {
        });
    }
    exports.initService = initService;
})(realityEditor.network.discovery);
