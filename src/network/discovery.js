createNameSpace("realityEditor.network.discovery");

(function(exports) {

    /* Structure:
    {
        '10.10.10.10': {
            'feeder01_lkjh0987: { heartbeat }
        },
        '192.168.0.10: {
            'testObject_asdf1234': { heartbeat },
            '_WORLD_test_qwer2345: { heartbeat }
        }
    }
    */
    let discoveryMap = {};    

    let callbacks = {
        onServerDetected: [],
        onObjectDetected: []
    };
    
    function initService() {
        realityEditor.network.addUDPMessageHandler('id', (message) => {
            if (typeof message.id === 'undefined' || typeof message.ip === 'undefined') {
                return;
            }
            if (typeof discoveryMap[message.ip] === 'undefined') {
                discoveryMap[message.ip] = {};
            }
            discoveryMap[message.ip][message.id] = message;
        });
    }
    
    exports.onServerDetected = (callback) => {
        callbacks.onServerDetected.push(callback);
    }
    
    exports.onObjectDetected = (callback) => {
        callbacks.onObjectDetected.push(callback);
    }
    
    exports.getDetectedServerIPs = () => {
        return Object.keys(discoveryMap);
    }
    
    exports.getDetectedObjectIDs = () => {
        return Object.values(discoveryMap).map(serverContents => Object.keys(serverContents)).flat();
    }
    
    exports.initService = initService;
})(realityEditor.network.discovery);
