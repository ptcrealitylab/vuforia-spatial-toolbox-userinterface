createNameSpace("realityEditor.network.discovery");

(function(exports) {

    // discoveryMap[serverIp][objectId] = { heartbeat: { id, ip, port, vn, tcs }, metadata: { name, type } }
    let discoveryMap = {};
    let serverServices = {};

    // Allows us to pause object discovery from the time the app loads until we have finished scanning
    let exceptions = []; // when scanning a world object, we add its name to the exceptions so we can still load it
    let queuedHeartbeats = []; // heartbeats received while paused will be processed after resuming
    let heartbeatsPaused = false;
    let isSystemInitializing = true; // pause heartbeats for the first instant while everything is still initializing

    let primaryWorld = null; // if set, we will ignore processing all world heartbeats except for the primary world

    let callbacks = {
        onServerDetected: [],
        onObjectDetected: []
    };

    function initService() {
        console.log('init network/discovery.js');

        realityEditor.network.registerCallback('objectDeleted', (params) => {
            deleteFromDiscoveryMap(params.objectIP, params.objectID);
        });

        setTimeout(() => {
            isSystemInitializing = false;
            processNextQueuedHeartbeat();
        }, 1000);
        // 1 second is very generous... could be replaced in future by a more robust
        // way to tell when all of the addons have finished initializing
    }

    function processNextQueuedHeartbeat() {
        if (queuedHeartbeats.length === 0) { return; }
        let message = queuedHeartbeats.shift();
        processHeartbeat(message);
        setTimeout(processNextQueuedHeartbeat, 100); // process async to avoid overwhelming all at once
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
            discoveryMap[message.ip][message.id] = {
                heartbeat: message,
                metadata: null
            };
            processNewObjectDiscovery(message.ip, realityEditor.network.getPort(message), message.id);
        }
        // TODO: should this module concern itself with the heartbeat checksum? probably not, we are only concerned about presence
    }

    // independently from adding the json to the objects data structure, we query the server for some important metadata about this heartbeat
    function processNewObjectDiscovery(ip, port, id) {
        let url = realityEditor.network.getURL(ip, port, '/object/' + id);
        realityEditor.network.getData(id,  null, null, url, function (objectKey, frameKey, nodeKey, msg) {
            if (!msg) return;
            if (typeof discoveryMap[ip][id] !== 'undefined') {
                discoveryMap[ip][id].metadata = {
                    name: msg.name,
                    type: msg.type
                }
                callbacks.onObjectDetected.forEach(cb => cb(discoveryMap[ip][id]));
            }
        });
    }

    // This should be directly triggered by whatever is listening for UDP messages
    // These are the per-object heartbeats
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

        if (realityEditor.device.environment.variables.suppressObjectDetections || ignoreFromPause || isSystemInitializing) {
            // only add it if we don't already have the same one pending
            const alreadyInArray = queuedHeartbeats.some(existingMessage => {
                return existingMessage.id === message.id &&
                    existingMessage.ip === message.ip &&
                    existingMessage.port === message.port &&
                    existingMessage.vn === message.vn &&
                    existingMessage.pr === message.pr &&
                    existingMessage.tcs === message.tcs;
            });
            if (!alreadyInArray) {
                queuedHeartbeats.push(message);
            }
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

    // These are the per-server heartbeats
    // They include a list of services, and get sent even if no objects exist yet on that server
    function processServerBeat(message) {
        if (typeof message.ip === 'undefined') {
            return;
        }

        if (typeof discoveryMap[message.ip] === 'undefined') {
            discoveryMap[message.ip] = {};
            callbacks.onServerDetected.forEach(cb => cb(message.ip));
        }

        if (typeof message.services !== 'undefined') {
            serverServices[message.ip] = message.services;
        }
    }

    // /**
    //  * This lets the remote operator or the phone app discover the primary world + all other objects on the primary world server,
    //  * in the cases where UDP messages aren't working -> the primary world cannot be loaded by typical means
    //  */
    // function discoverPrimaryWorldIfNeeded() {
    //     if (typeof objects[primaryWorld.id] !== 'undefined') return;
    //
    //     console.log('TRY TO LOAD OBJECTS DIRECTLY');
    //
    //     let netState = realityEditor.network.state;
    //
    //     console.log('netState = ', netState);
    //
    //     if (!netState) return;
    //
    //     let url;
    //     if (netState.proxyUrl) {
    //         let ip = netState.proxyUrl; // actually doesn't matter what we pass in, getURL assembles the right URL regardless
    //         let port = 'direct'; // the value doesn't matter in this implementation, as long as it's not a number
    //         url = realityEditor.network.getURL(ip, port, '/allObjects/');
    //     } else {
    //         let primaryWorldIP = primaryWorld.ip || window.location.hostname || '127.0.0.1';
    //         url = realityEditor.network.getURL(primaryWorldIP, realityEditor.network.getPortByIp(primaryWorldIP), '/allObjects/');
    //     }
    //
    //     console.log('url = ', url);
    //
    //     realityEditor.network.getData(null, null, null, url, function(_nullObj, _nullFrame, _nullNode, msg) {
    //         console.log('discoverObjectsFromServer got all objects', msg);
    //
    //         msg.forEach(function(heartbeat) {
    //             console.log('addHeartbeatObject from /allObjects/', heartbeat);
    //             realityEditor.network.addHeartbeatObject(heartbeat);
    //         });
    //     });
    // }

    exports.setPrimaryWorld = (ip, id) => {
        primaryWorld = {
            ip: ip,
            id: id
        };

        // setTimeout(discoverPrimaryWorldIfNeeded, 5000);
    }

    exports.getPrimaryWorldInfo = () => {
        return primaryWorld;
    }

    exports.pauseObjectDetections = () => {
        heartbeatsPaused = true;
    }

    exports.resumeObjectDetections = () => {
        heartbeatsPaused = false;
        processNextQueuedHeartbeat();
    }

    exports.addExceptionToPausedObjectDetections = (objectName) => {
        exceptions.push(objectName);
    }

    exports.deleteObject = (ip, id) => {
        deleteFromDiscoveryMap(ip, id);

        queuedHeartbeats = queuedHeartbeats.filter(message => {
            return message.id !== id && message.ip !== ip;
        });
    }

    exports.onServerDetected = (callback) => {
        callbacks.onServerDetected.push(callback);
    }

    exports.onObjectDetected = (callback) => {
        callbacks.onObjectDetected.push(callback);
    }

    exports.getDetectedServerIPs = ({limitToWorldService = false} = {}) => {
        if (!limitToWorldService) return Object.keys(discoveryMap);

        // if limitToWorldService, and at least one server demands services=world, only return servers with the demand
        let serversWithWorldService = Object.keys(discoveryMap).filter(serverIp => {
            return serverServices[serverIp] && serverServices[serverIp].includes('world');
        });

        if (serversWithWorldService.length > 0) {
            return serversWithWorldService;
        }

        // if no servers demand the world, return all servers
        return Object.keys(discoveryMap);
    }

    exports.getDetectedObjectIDs = () => {
        return Object.values(discoveryMap).map(serverContents => Object.keys(serverContents)).flat();
    }

    exports.getDetectedObjectsOfType = (type) => {
        let serverContents = Object.values(discoveryMap); // array of [{id1: info}, { id2: info, id3: info }]
        let matchingObjects = [];
        serverContents.forEach(serverInfo => {
            Object.keys(serverInfo).forEach(objectId => {
                let objectInfo = serverInfo[objectId];
                if (objectInfo.metadata && objectInfo.metadata.type === type) {
                    matchingObjects.push(objectInfo);
                }
            });
        })
        return matchingObjects;
    }

    exports.initService = initService;
    exports.processHeartbeat = processHeartbeat;
    exports.processServerBeat = processServerBeat;

})(realityEditor.network.discovery);
