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

    // Allows us to pause object discovery from the time the app loads until we have finished scanning
    let exceptions = []; // when scanning a world object, we add its name to the exceptions so we can still load it
    let queuedHeartbeats = []; // heartbeats received while paused will be processed after resuming
    let heartbeatsPaused = false;

    exports.pauseObjectDetections = () => {
        heartbeatsPaused = true;
    }

    exports.resumeObjectDetections = () => {
        heartbeatsPaused = false;
        processNextQueuedHeartbeat();
    }

    function processNextQueuedHeartbeat() {
        if (queuedHeartbeats.length === 0) { return; }
        let message = queuedHeartbeats.pop();
        processHeartbeat(message);
        setTimeout(processNextQueuedHeartbeat, 10); // process async to avoid overwhelming all at once
    }

    exports.addExceptionToPausedObjectDetections = (objectName) => {
        exceptions.push(objectName);
    }

    function initService() {
        console.log('init network/discovery.js');

        realityEditor.network.registerCallback('objectDeleted', (params) => {
            deleteFromDiscoveryMap(params.objectIP, params.objectID);
        });
    }

    function deleteFromDiscoveryMap(ip, id) {
        if (typeof discoveryMap[ip] === 'undefined') { return; }
        if (typeof discoveryMap[ip][id] === 'undefined') { return; }
        delete discoveryMap[ip][id];
        // todo: trigger any callbacks? depends if other modules are subscribed to the full discoveryMap or not
        // todo: can we detect when a server turns off so we can delete it from our map?
    }

    function updateDiscoveryMap(message) {
        if (typeof discoveryMap[message.ip] === 'undefined') {
            discoveryMap[message.ip] = {};
            callbacks.onServerDetected.forEach(cb => cb(message.ip));
        }
        if (typeof discoveryMap[message.ip][message.id] === 'undefined') {
            callbacks.onObjectDetected.forEach(cb => cb(message.ip));
            discoveryMap[message.ip][message.id] = message;
        }
        // TODO: should this module concern itself with the heartbeat checksum? probably not, we are only concerned about presence
    }

    // This should be directly triggered by whatever is listening for UDP messages
    function processHeartbeat(message) {
        // upon a new object discovery message, add the object and download its target files
        if (typeof message.id === 'undefined' || typeof message.ip === 'undefined') {
            return;
        }

        updateDiscoveryMap(message);

        let ignoreFromPause = false;
        if (heartbeatsPaused) {
            ignoreFromPause = !exceptions.some(name => message.id.includes(name));
        }

        if (realityEditor.device.environment.variables.suppressObjectDetections || ignoreFromPause) {
            queuedHeartbeats.push(message);
        } else {
            if (typeof message.zone !== 'undefined' && message.zone !== '') {
                if (realityEditor.gui.settings.toggleStates.zoneState && realityEditor.gui.settings.toggleStates.zoneStateText === message.zone) {
                    realityEditor.network.addHeartbeatObject(message);
                }
            } else if (!realityEditor.gui.settings.toggleStates.zoneState) {
                realityEditor.network.addHeartbeatObject(message);
            }
        }
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
    exports.processHeartbeat = processHeartbeat;

})(realityEditor.network.discovery);
