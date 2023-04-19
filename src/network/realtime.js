createNameSpace("realityEditor.network.realtime");
/* global updateFramerate */

// TODO we have to check that this method only connects to the objects currently visible. Otherwise it will not scale.

/**
 * @fileOverview realityEditor.device.realtime.js
 * Maintains the socket connections to other editors and provides APIs for sending and receiving data.
 */

(function(exports) {
    const DEBUG = false;
    const PROXY = /(\w+\.)?toolboxedge.net/.test(window.location.host);

    const BATCHED_UPDATE_FRAMERATE = updateFramerate;

    var desktopSocket;
    var sockets = {};

    var hasBeenInitialized = false;
    let batchedUpdates = {};

    let didSubscribeToPublicData = false;
    let publicDataCallbacks = {};
    let cachedPublicData = {}; // check to only trigger callbacks for property keys with changes

    /**
     * Public init function that sets up the sockets for realtime updates.
     */
    function initService() {
        // TODO Is this redundant code? It seems to generate the error that pops up

        // realtime is necessary for some environments to work
        if (realityEditor.device.environment.shouldCreateDesktopSocket() || realityEditor.device.environment.variables.alwaysEnableRealtime) {
            realityEditor.gui.settings.toggleStates.realtimeEnabled = true;
        }
        if (DEBUG) {
            console.log('realityEditor.network.realtime.initService()', hasBeenInitialized, realityEditor.gui.settings.toggleStates.realtimeEnabled);
        }

        // don't initialize multiple times or if this feature is specifically turned off
        if (hasBeenInitialized || !(realityEditor.gui.settings.toggleStates.realtimeEnabled || realityEditor.device.environment.variables.alwaysEnableRealtime)) return;

        if (DEBUG) {
            console.log('actually initializing realtime services');
        }

        if (realityEditor.device.environment.shouldCreateDesktopSocket()) {
            createDesktopSocket();
        }
        setupServerSockets();

        // add server sockets for each already discovered object
        Object.keys(objects).forEach(function(objectKey) {
            var object = realityEditor.getObject(objectKey);
            addServerForObjectIfNeeded(object, objectKey);
        });

        // when a new object is detected, check if we need to create a socket connection with its server
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            addServerForObjectIfNeeded(object, objectKey);
        });

        // setInterval(setupServerSockets, 3000);

        hasBeenInitialized = true;

        loop();
    }

    function createDesktopSocket() {
        if (PROXY) {
            desktopSocket = io.connect();
        } else {
            desktopSocket = window._oldIo.connect();
        }
    }


    function loop() {
        if (typeof BATCHED_UPDATE_FRAMERATE !== 'undefined') {
            setInterval(() => {
                sendBatchedUpdates();
                batchedUpdates = {};
            }, 1000 / BATCHED_UPDATE_FRAMERATE);
        } else {
            sendBatchedUpdates();
            batchedUpdates = {};
            // check for realtime updates
            requestAnimationFrame(loop);
        }
    }

    /**
     * Gets called each time a new object is detected. If that object is from a newly detected server, add that server to
     * the set of known servers and establish a websocket connection to it, for the purpose of streaming realtime changes
     * of its object/frame/node position data and other properties for realtime collaboration
     * @param {Object} object
     * @param {string} objectKey
     */
    function addServerForObjectIfNeeded(object, _objectKey) {
        
        // if (object.ip === '127.0.0.1') { return; } // ignore localhost, no need for realtime because only one client
        // Note that we still create a localhost socket even though we don't
        // subscribe to it since it will be used to send messages to the local
        // server

        var serverAddress = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), null);
        var socketsIps = realityEditor.network.realtime.getSocketIPsForSet('realityServers');
        if (socketsIps.indexOf(serverAddress) < 0) {
            // if we haven't already created a socket connection to that IP, create a new one,
            //   and register update listeners, and emit a /subscribe message so it can connect back to us
            realityEditor.network.realtime.createSocketInSet('realityServers', serverAddress, function(_socket) {
                sockets['realityServers'][serverAddress].emit(realityEditor.network.getIoTitle(object.port, '/subscribe/realityEditorUpdates'), JSON.stringify({editorId: globalStates.tempUuid}));
                addServerUpdateListener(serverAddress);
            });

        }
    }

    /**
     * @typedef {Object} UpdateMessage
     * @desc A structured JSON message with information to update a specific property of an object, frame, or node
     * @property {string} objectKey
     * @property {string|undefined} frameKey
     * @property {string|undefined} nodeKey
     * @property {string} propertyPath
     * @property {*} newValue
     * @property {string} editorId - the uuid of the editor that sent the message
     */

    /**
     * Updates a specific property of a specific object to a new value.
     * @param {UpdateMessage} msgContent
     */
    function updateObject(msgContent) {

        if (!(realityEditor.gui.settings.toggleStates.realtimeEnabled || realityEditor.device.environment.variables.alwaysEnableRealtime)) { return; }

        var object = realityEditor.getObject(msgContent.objectKey);
        if (!object) { return; }
        if (!msgContent.hasOwnProperty('propertyPath') || !msgContent.hasOwnProperty('newValue')) { return; }

        setObjectValueAtPath(object, msgContent.propertyPath, msgContent.newValue);
        // console.log('set object (' + msgContent.objectKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);

        if (msgContent.propertyPath === 'matrix') {
            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(msgContent.objectKey);
            sceneNode.dontBroadcastNext = true;
            sceneNode.setLocalMatrix(msgContent.newValue);
        }
    }

    /**
     * Updates a specific property of a specific frame to a new value.
     * @param {UpdateMessage} msgContent
     */
    function updateFrame(msgContent) {

        if (!(realityEditor.gui.settings.toggleStates.realtimeEnabled || realityEditor.device.environment.variables.alwaysEnableRealtime)) { return; }

        var frame = realityEditor.getFrame(msgContent.objectKey, msgContent.frameKey);
        if (!frame) { return; }
        if (!msgContent.hasOwnProperty('propertyPath') || !msgContent.hasOwnProperty('newValue')) { return; }

        setObjectValueAtPath(frame, msgContent.propertyPath, msgContent.newValue);
        // console.log('set frame (' + msgContent.frameKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);

        if (msgContent.propertyPath === 'ar.matrix') {
            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(msgContent.frameKey);
            sceneNode.dontBroadcastNext = true;
            sceneNode.setLocalMatrix(msgContent.newValue);
        }

        // flags the sceneNode as dirty so it gets rendered again with the new x/y position
        if (msgContent.propertyPath === 'ar.x' || msgContent.propertyPath === 'ar.y') {
            realityEditor.sceneGraph.updatePositionData(msgContent.objectKey, true);
        }

        // trigger secondary effects for certain properties
        if (msgContent.propertyPath === 'publicData') {
            if (globalDOMCache["iframe" + msgContent.frameKey]) {
                globalDOMCache["iframe" + msgContent.frameKey].contentWindow.postMessage(JSON.stringify({reloadPublicData: true}), "*");
            }
        }
    }

    /**
     * Updates a specific property of a specific node to a new value.
     * @param {UpdateMessage} msgContent
     */
    function updateNode(msgContent) {

        if (!(realityEditor.gui.settings.toggleStates.realtimeEnabled || realityEditor.device.environment.variables.alwaysEnableRealtime)) { return; }

        var node = realityEditor.getNode(msgContent.objectKey, msgContent.frameKey, msgContent.nodeKey);
        if (!node) { return; }
        if (!msgContent.hasOwnProperty('propertyPath') || !msgContent.hasOwnProperty('newValue')) { return; }

        setObjectValueAtPath(node, msgContent.propertyPath, msgContent.newValue);
        if (DEBUG) {
            console.log('set node (' + msgContent.nodeKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);
        }

        if (msgContent.propertyPath === 'matrix') {
            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(msgContent.nodeKey);
            sceneNode.dontBroadcastNext = true;
            sceneNode.setLocalMatrix(msgContent.newValue);
        }

        // flags the sceneNode as dirty so it gets rendered again with the new x/y position
        if (msgContent.propertyPath === 'x' || msgContent.propertyPath === 'y') {
            realityEditor.sceneGraph.updatePositionData(msgContent.objectKey, true);
        }
    }

    /**
     * Checks every object detected, and if there are any belonging to servers that we haven't established a socket
     * connection with, adds a new 'realityServers' socket connection
     */
    function setupServerSockets() {
        var ipList = [];
        realityEditor.forEachObject(function(object, _objectKey) {
            if (ipList.indexOf(object.ip) === -1) {
                var serverAddress = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), null);
                var socketsIps = realityEditor.network.realtime.getSocketIPsForSet('realityServers');
                if (socketsIps.indexOf(serverAddress) < 0) {
                    // if we haven't already created a socket connection to that IP, create a new one,
                    //   and register update listeners, and emit a /subscribe message so it can connect back to us
                    realityEditor.network.realtime.createSocketInSet('realityServers', serverAddress);
                    sockets['realityServers'][serverAddress].emit(realityEditor.network.getIoTitle(object.port, '/subscribe/realityEditorUpdates'), JSON.stringify({editorId: globalStates.tempUuid}));
                    addServerUpdateListener(serverAddress);
                }
            }
        });
    }

    /**
     * Adds a generic '/update' listener to the socket.io server running at the provided address, and delegates the
     * responses to updateObject, updateFrame, or updateNode depending on the messages received
     * @param {string} serverAddress
     */
    function addServerUpdateListener(serverAddress) {

        let hasCloudProxySocket = realityEditor.cloud.socket;

        if (!hasCloudProxySocket) {
            console.log('No cloud socket – add /udp/beat and /udp/action listeners to existing realtime socket');
            // this allows the app to receive heartbeats when not on a Wi-Fi network that supports UDP
            addServerSocketMessageListener(serverAddress, '/udp/beat', (msg) => {
                // console.log('realtime socket got beat', msg);
                realityEditor.app.callbacks.receivedUDPMessage(msg);
            });

            // this allows the app to receive action messages when not on a Wi-Fi network that supports UDP
            addServerSocketMessageListener(serverAddress, '/udp/action', (msg) => {
                // console.log('realtime socket got action', msg);
                realityEditor.app.callbacks.receivedUDPMessage(msg);
            });
        }

        addServerSocketMessageListener(serverAddress, '/batchedUpdate', function(msg) {
            var msgContent = typeof msg === 'string' ? JSON.parse(msg) : msg;
            if (typeof msgContent.batchedUpdates === 'undefined') { return; }

            msgContent.batchedUpdates.forEach(function(update) {
                var objectKey;
                var frameKey;
                var nodeKey;

                if (typeof update.objectKey !== 'undefined') {
                    objectKey = update.objectKey;
                }
                if (typeof update.frameKey !== 'undefined') {
                    frameKey = update.frameKey;
                }
                if (typeof update.nodeKey !== 'undefined') {
                    nodeKey = update.nodeKey;
                }

                if (objectKey && frameKey && nodeKey) {
                    updateNode(update);
                } else if (objectKey && frameKey) {
                    updateFrame(update);
                } else if (objectKey) {
                    updateObject(update);
                }
            });
        });
    }

    /**
     * Utility function that abstracts adding a message listener on this server's socket.
     * @param {string} messageName
     * @param {function} callback
     */
    function addDesktopSocketMessageListener(messageName, callback) {
        if (DEBUG) {
            console.log('realtime addDesktopSocketMessageListener', desktopSocket, messageName);
        }

        // desktopSocket might not be initialized but we should error if we're
        // not expected to create a desktop socket at all
        if (!desktopSocket) {
            if (realityEditor.device.environment.shouldCreateDesktopSocket()) {
                createDesktopSocket();
            } else {
                console.error('addDesktopSocketMessageListener called without desktopSocket', messageName);
                return;
            }
        }

        desktopSocket.on(messageName, function() {
            if (DEBUG) {
                console.log('addDesktopSocketMessageListener received', messageName, Array.from(arguments));
            }
            callback.apply(this, arguments);
        });
    }

    /**
     * Utility function that abstracts adding a message on the socket to the specified serverAddress.
     * @param {string} serverAddress
     * @param {string} messageName
     * @param {function} callback
     */
    function addServerSocketMessageListener(serverAddress, messageName, callback) {
        sockets['realityServers'][serverAddress].on(messageName, function() {
            if (DEBUG) {
                console.log('addServerSocketMessageListener received', messageName, Array.from(arguments));
            }
            callback.apply(this, arguments);
        });
    }

    function sendBatchedUpdates() {
        if (Object.keys(batchedUpdates).length === 0) { return; }

        for (let objectKey in batchedUpdates) {
            if (!objects[objectKey]) continue;
            let serverSocket = getServerSocketForObject(objectKey);
            if (!serverSocket) { continue; }

            let objectUpdates = batchedUpdates[objectKey];
            let messageBody = {
                batchedUpdates: []
            };

            objectUpdates.forEach(function(update) {
                messageBody.batchedUpdates.push(update.getMessageBody());
            });

            serverSocket.emit(realityEditor.network.getIoTitle(objects[objectKey].port,'/batchedUpdate'), JSON.stringify(messageBody));
        }
    }

    function subscribeToCameraMatrices(objectKey, callback) {
        let object = realityEditor.getObject(objectKey);
        if (!object) {
            return;
        }
        let serverSocket = getServerSocketForObject(objectKey);
        if (!serverSocket) {
            return;
        }
        let messageBody = {
            editorId: globalStates.tempUuid
        };

        if (DEBUG) {
            console.log('someone cares about subscribeToCameraMatrices', objectKey, object);
        }
        serverSocket.emit(realityEditor.network.getIoTitle(object.port, '/subscribe/cameraMatrix'), JSON.stringify(messageBody));
        serverSocket.emit('/subscribe/cameraMatrix', JSON.stringify(messageBody));
        serverSocket.on(realityEditor.network.getIoTitle(object.port, '/cameraMatrix'), callback);
        serverSocket.on('/cameraMatrix', callback); // TODO(hobinjk): figure out why this is called instead of the iotitle one
    }

    let lastCamera = null;
    let lastCameraSend = 0;
    function sendCameraMatrix(objectKey, cameraMatrix) {
        let targetDt = 100;
        if (typeof updateFramerate !== 'undefined') {
            targetDt = 1000 / updateFramerate;
        }
        if (Date.now() - lastCameraSend < targetDt) {
            return;
        }
        let cameraMatStr = JSON.stringify(cameraMatrix);
        if (cameraMatStr === lastCamera) {
            return;
        }
        lastCamera = cameraMatStr;
        lastCameraSend = Date.now();
        let object = realityEditor.getObject(objectKey);
        if (!object) { return; }
        let serverSocket = getServerSocketForObject(objectKey);
        if (!serverSocket) { return; }
        let messageBody = {
            cameraMatrix: cameraMatrix,
            editorId: globalStates.tempUuid
        }

        // console.log('sending camera matrix to', object, serverSocket);
        serverSocket.emit(realityEditor.network.getIoTitle(object.port, '/cameraMatrix'), JSON.stringify(messageBody));
    }

    class Update {
        constructor(objectKey, frameKey, nodeKey, propertyPath, newValue, editorId) {
            this.objectKey = objectKey;
            this.frameKey = frameKey;
            this.nodeKey = nodeKey;
            this.propertyPath = propertyPath;
            this.newValue = newValue;
            this.editorId = editorId;
        }
        getMessageBody() {
            return {
                objectKey: this.objectKey,
                frameKey: this.frameKey,
                nodeKey: this.nodeKey,
                propertyPath: this.propertyPath,
                newValue: this.newValue,
                editorId: this.editorId
            }
        }
        getUpdateHash() {
            return (this.objectKey + this.frameKey + this.nodeKey + this.propertyPath);
        }
    }

    /**
     * Sends a socket message to all connected realityServers sockets, with instructions to update a specific property
     *   of an object, frame, or node
     * @param {string} objectKey
     * @param {string} frameKey
     * @param {string} nodeKey
     * @param {string} propertyPath
     * @param {*} newValue
     */
    function broadcastUpdate(objectKey, frameKey, nodeKey, propertyPath, newValue) {

        if (!(realityEditor.gui.settings.toggleStates.realtimeEnabled || realityEditor.device.environment.variables.alwaysEnableRealtime)) { return; }

        if (typeof batchedUpdates[objectKey] === 'undefined') {
            batchedUpdates[objectKey] = [];
        }

        let newUpdate = new Update(objectKey, frameKey, nodeKey, propertyPath, newValue, globalStates.tempUuid);
        let newHash = newUpdate.getUpdateHash();

        // remove older update if something is trying to modify the same property path on the same
        let index = batchedUpdates[objectKey].map(function(update) {
            return update.getUpdateHash();
        }).indexOf(newHash);
        if (index > -1) {
            batchedUpdates[objectKey].splice(index, 1);
        }

        // add the new update to the batch, to be sent to the server on the next interval tick
        batchedUpdates[objectKey].push(newUpdate);
    }

    function subscribeToPublicData(objectKey, frameKey, nodeKey, publicDataKey, callback) {
        console.log('subscribe to public data for node ' + nodeKey);

        let serverSocket = getServerSocketForObject(objectKey);
        let subscribeTitle = realityEditor.network.getIoTitle(objects[objectKey].port, '/subscribe/realityEditorPublicData');
        serverSocket.emit(subscribeTitle, JSON.stringify({
            object: objectKey,
            frame: frameKey
        }));

        // assuming that there is a single node per frame (thus skipping another level for nodeKey)
        if (typeof publicDataCallbacks[objectKey] === 'undefined') {
            publicDataCallbacks[objectKey] = {};
            cachedPublicData[objectKey] = {};
        }
        if (typeof publicDataCallbacks[objectKey][frameKey] === 'undefined') {
            publicDataCallbacks[objectKey][frameKey] = {};
            cachedPublicData[objectKey][frameKey] = {};
        }
        if (typeof publicDataCallbacks[objectKey][frameKey][publicDataKey] === 'undefined') {
            publicDataCallbacks[objectKey][frameKey][publicDataKey] = [];
            cachedPublicData[objectKey][frameKey][publicDataKey] = null;
        }
        publicDataCallbacks[objectKey][frameKey][publicDataKey].push(callback);

        // only need to subscribe to this one time, because we are setting single listener per port which handles 
        // public data of all nodes across all objects (as long as we set up the right callbacks by multiple calls of the code above)
        if (!didSubscribeToPublicData) {
            didSubscribeToPublicData = true;
            let publicDataTitle = realityEditor.network.getIoTitle(objects[objectKey].port, 'object/publicData');
            const listener = (msg) => {
                let msgData = JSON.parse(msg);
                Object.keys(msgData.publicData).forEach(dataKey => {
                    // attempt triggering callbacks for all keys in the publicData.
                    // only ones with registered callbacks will do anything
                    handlePublicDataFromServer(msg, msgData.object, msgData.frame, dataKey);
                });
            };
           
            serverSocket.on(publicDataTitle, listener);  
            if (publicDataTitle != 'object/publicData') {
                serverSocket.on('object/publicData', listener);
            } 
        }
    }

    function handlePublicDataFromServer(msg, objectKey, frameKey, publicDataKey) {
        let allCallbacks = publicDataCallbacks[objectKey];
        if (!allCallbacks) { return; }
        allCallbacks = allCallbacks[frameKey];
        if (!allCallbacks) { return; }
        let callbacks = allCallbacks[publicDataKey];
        if (!callbacks) { return; }

        let stringifiedData = JSON.stringify(JSON.parse(msg).publicData[publicDataKey]);

        // if the publicDataNode has more than one key, don't trigger any other keys' callbacks except for the one that changed
        if (stringifiedData === cachedPublicData[objectKey][frameKey][publicDataKey]) {
            return;
        }

        callbacks.forEach(cb => {
            cb(msg);
        });

        cachedPublicData[objectKey][frameKey][publicDataKey] = stringifiedData;
    }

    function writePublicData(objectKey, frameKey, nodeKey, publicDataKey, publicDataValue) {
        let node = realityEditor.getNode(objectKey, frameKey, nodeKey);
        if (!node) { return; }
        node.publicData[publicDataKey] = publicDataValue;
        let ioTitle = realityEditor.network.getIoTitle(objects[objectKey].port, 'object/publicData');
        let messageBody = {
            object: objectKey,
            frame: frameKey,
            node: nodeKey,
            publicData: node.publicData,
            sessionUuid: globalStates.tempUuid
        };
        let serverSocket = getServerSocketForObject(objectKey);
        serverSocket.emit(ioTitle, JSON.stringify(messageBody));

        if (!publicDataCache.hasOwnProperty(frameKey)) {
            publicDataCache[frameKey] = {};
        }
        publicDataCache[frameKey][nodeKey] = node.publicData;
    }

    // trigger this before doing window.location.reload() to ensure avatar is deleted (required if world is on local server)
    function sendDisconnectMessage(worldId) {
        if (!worldId || !objects[worldId]) { return; }
        let ioTitle = realityEditor.network.getIoTitle(objects[worldId].port, '/disconnectEditor');
        let serverSocket = getServerSocketForObject(worldId);
        if (!serverSocket) { return; }
        serverSocket.emit(ioTitle, JSON.stringify({
            editorId: globalStates.tempUuid
        }));
    }

    /**
     * Updates an object property on the server (and synchronizes all other clients if necessary) using a websocket
     * @param {string} objectKey
     * @param {Array.<number>} matrix
     * @param {string} worldId
     */
    function broadcastUpdateObjectMatrix(objectKey, matrix, worldId) {
        if (!(realityEditor.gui.settings.toggleStates.realtimeEnabled || realityEditor.device.environment.variables.alwaysEnableRealtime)) { return; }
        if (matrix.length !== 16) { return; } // don't delete previous value by sending an empty matrix to the server

        // get the server responsible for this vehicle and send it an update message. it will then message all connected clients
        var serverSocket = getServerSocketForObject(objectKey);
        if (serverSocket) {
            var messageBody = {
                objectKey: objectKey,
                matrix: matrix,
                worldId: worldId,
                editorId: globalStates.tempUuid
            };
            serverSocket.emit(realityEditor.network.getIoTitle(objects[objectKey].port, '/update/object/matrix'), JSON.stringify(messageBody));
        }
    }

    function subscribeToObjectMatrices(objectKey, callback) {
        if (!(realityEditor.gui.settings.toggleStates.realtimeEnabled || realityEditor.device.environment.variables.alwaysEnableRealtime)) { return; }
        // get the server responsible for this vehicle and send it an update message. it will then message all connected clients
        var serverSocket = getServerSocketForObject(objectKey);
        if (serverSocket) {
            // todo this is some hack to get it working
            if(realityEditor.network.state.proxyNetwork) {
                serverSocket.emit(realityEditor.network.getIoTitle(objects[objectKey].port, '/subscribe/realityEditorUpdates'), JSON.stringify({editorId: globalStates.tempUuid}));
            }
            serverSocket.emit(realityEditor.network.getIoTitle(objects[objectKey].port, '/subscribe/objectUpdates'), JSON.stringify({editorId: globalStates.tempUuid}));
            serverSocket.on('/update/object/matrix', callback);
        }
    }

    var objectSocketCache = {};

    /**
     * Gets the ioObject connected to the server hosting a given object
     * @param {string} objectKey
     * @return {null}
     */
    function getServerSocketForObject(objectKey) {

        if (typeof objectSocketCache[objectKey] === 'undefined') {
            var object = realityEditor.getObject(objectKey);
            var serverIP = object.ip;
            // if (serverIP.indexOf('127.0.0.1') > -1) { // don't broadcast realtime updates to localhost... there can only be one client
            //     return null;
            // }
            var possibleSocketIPs = getSocketIPsForSet('realityServers');
            var foundSocket = null;
            possibleSocketIPs.forEach(function(socketIP) { // TODO: speedup by cache-ing a map from serverIP -> socketIP
                if (socketIP.indexOf(serverIP) > -1) {
                    foundSocket = socketIP;
                }
            });

            objectSocketCache[objectKey] = (foundSocket) ? (sockets['realityServers'][foundSocket]) : undefined;
        }

        return objectSocketCache[objectKey]; // don't need to recalculate each time
    }

    /**
     * Creates a set where a number of socket connections can be organized within the same namespace.
     *  e.g. so you can send different messages to different types of sockets
     * @param {string} setName
     */
    function createSocketSet(setName) {
        if (typeof sockets[setName] === 'undefined') {
            sockets[setName] = {};
        }
    }

    /**
     * Utility that returns the IDs of all sockets in a given set.
     * @param {string} setName
     * @return {Array.<string>}
     */
    function getSocketIPsForSet(setName) {
        if (typeof sockets[setName] === 'undefined') {
            return [];
        }
        return Object.keys(sockets[setName]);
    }

    /**
     * Creates a new socket in the specified set. Creates the set if it doesn't already exist.
     * @param {string} setName
     * @param {string} socketIP - url of socket to connect to
     * @param {function|undefined} onConnect - optional .on('connect') callback
     */
    function createSocketInSet(setName, socketIP, onConnect) {
        let ioObject;
        if (socketIP.includes(':8081')) {
            ioObject = window._oldIo.connect(socketIP);
        } else {
            ioObject = io.connect(socketIP);
        }
        if (DEBUG) {
            console.log('createSocketInSet', setName, socketIP, ioObject);
        }
        createSocketSet(setName);
        if(!sockets[setName]) sockets[setName] = {};
        sockets[setName][socketIP] = ioObject;

        if (onConnect) {
            ioObject.on('connect', function() {
                if (DEBUG) {
                    console.log('createSocketInSet connected', setName, socketIP);
                }
                onConnect(ioObject);
            });
        }
    }

    /**
     * Sends the eventName and messageBody to every socket connection in the specified set.
     * @param {string} setName
     * @param {string} eventName
     * @param {Object} messageBody
     */
    function sendMessageToSocketSet(setName, eventName, messageBody) {
        var socketIPs = getSocketIPsForSet(setName);
        socketIPs.forEach(function(socketIP) {
            var ioObject = sockets[setName][socketIP];
            ioObject.emit(eventName, JSON.stringify(messageBody));
        });

    }

    exports.getSocketsForSet = function(setName) {
        return getSocketIPsForSet(setName).map(ip => {
            return sockets[setName][ip];
        });
    }

    /**
     * Utility that uses a possibly-recursive path to set an object's property to a new value
     * @example setObjectValueAtPath( {a:{b:{etc:5}}}, 'a.b.etc', 123 ) modifies the first argument to {a:{b:{etc:123}}}
     * @author Taken from https://stackoverflow.com/a/6394168/1190267
     *
     * @param {Object} obj - the object you are modifying
     * @param {string|Array.<string>} propertyPath - a dot notation path ('a.b.etc') or list notation path ('a','b','etc')
     * @param {*} newValue - the new value to set the entry at that path
     * @return {*} - the value at the path after the function finishes
     */
    function setObjectValueAtPath(obj, propertyPath, newValue) {
        if (typeof propertyPath === 'string') {
            return setObjectValueAtPath(obj, propertyPath. split('.'), newValue);
        } else if (propertyPath.length === 1 && newValue !== undefined) {
            return obj[propertyPath[0]] = newValue;
        } else if (propertyPath.length === 0) {
            return obj;
        } else {
            return setObjectValueAtPath(obj[propertyPath[0]], propertyPath.slice(1), newValue);
        }
    }

    function pauseRealtime() {
        console.warn('TODO: implement pauseRealtime instead of requiring the user to restart the app');
    }

    exports.initService = initService;
    exports.addDesktopSocketMessageListener = addDesktopSocketMessageListener;
    exports.pauseRealtime = pauseRealtime;
    exports.broadcastUpdate = broadcastUpdate;

    // TODO: remove these and their invocations - these two are for deprecated reality zone demos
    exports.broadcastUpdateObjectMatrix = broadcastUpdateObjectMatrix;
    exports.subscribeToObjectMatrices = subscribeToObjectMatrices;

    exports.getSocketIPsForSet = getSocketIPsForSet;
    exports.createSocketInSet = createSocketInSet;
    exports.sendMessageToSocketSet = sendMessageToSocketSet;

    exports.sendCameraMatrix = sendCameraMatrix;
    exports.subscribeToCameraMatrices = subscribeToCameraMatrices;

    exports.writePublicData = writePublicData;
    exports.subscribeToPublicData = subscribeToPublicData;
    
    exports.sendDisconnectMessage = sendDisconnectMessage;

}(realityEditor.network.realtime));
