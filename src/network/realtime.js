createNameSpace("realityEditor.network.realtime");
/* global updateFramerate */

// TODO we have to check that this method only connects to the objects currently visible. Otherwise it will not scale.

/**
 * @fileOverview realityEditor.device.realtime.js
 * Maintains the socket connections to other editors and provides APIs for sending and receiving data.
 */

(function(exports) {

    var desktopSocket;
    var sockets = {};
    
    var hasBeenInitialized = false;
    let batchedUpdates = {};

    /**
     * Public init function that sets up the sockets for realtime updates.
     */
    function initService() {
        // TODO Is this redundant code? It seems to generate the error that pops up

        // realtime is necessary for some environments to work
        if (realityEditor.device.environment.shouldCreateDesktopSocket() || realityEditor.device.environment.variables.alwaysEnableRealtime) {
            realityEditor.gui.settings.toggleStates.realtimeEnabled = true;
        }
        console.log('realityEditor.network.realtime.initService()', hasBeenInitialized, realityEditor.gui.settings.toggleStates.realtimeEnabled);

        // don't initialize multiple times or if this feature is specifically turned off
        if (hasBeenInitialized || !(realityEditor.gui.settings.toggleStates.realtimeEnabled || realityEditor.device.environment.variables.alwaysEnableRealtime)) return;
        
        console.log('actually initializing realtime services');

        if (realityEditor.device.environment.shouldCreateDesktopSocket()) {
            desktopSocket = io.connect();
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
    
    function loop() {
        if(typeof updateFramerate !== 'undefined') {
            setInterval(() => {
                sendBatchedUpdates();
                batchedUpdates = {};
            }, 1000 / updateFramerate);
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
        
        if (object.ip === '127.0.0.1') { return; } // ignore localhost, no need for realtime because only one client

        var serverAddress = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), null);
        var socketsIps = realityEditor.network.realtime.getSocketIPsForSet('realityServers');
        if (socketsIps.indexOf(serverAddress) < 0) {
            // if we haven't already created a socket connection to that IP, create a new one,
            //   and register update listeners, and emit a /subscribe message so it can connect back to us
            realityEditor.network.realtime.createSocketInSet('realityServers', serverAddress, function (socket){
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
        console.log('set node (' + msgContent.nodeKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);

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
        console.log("---sssss-w-w-w---- 1")
        realityEditor.forEachObject(function(object, _objectKey) {
            console.log("---sssss-w-w-w---- 2")
            if (ipList.indexOf(object.ip) === -1) {
                console.log("---sssss-w-w-w----3 ")
                var serverAddress = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), null);
                var socketsIps = realityEditor.network.realtime.getSocketIPsForSet('realityServers');
                if (socketsIps.indexOf(serverAddress) < 0) {
                    console.log("---sssss-w-w-w---- 4")
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
        if (desktopSocket) {
            desktopSocket.on(messageName, callback);
        }
    }

    /**
     * Utility function that abstracts adding a message on the socket to the specified serverAddress.
     * @param {string} serverAddress
     * @param {string} messageName
     * @param {function} callback
     */
    function addServerSocketMessageListener(serverAddress, messageName, callback) {
        sockets['realityServers'][serverAddress].on(messageName, callback);
    }
    
    function sendBatchedUpdates() {
        if (Object.keys(batchedUpdates).length === 0) { return; }
        
        for (let objectKey in batchedUpdates) {
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
        if (!object) { return; }
        let serverSocket = getServerSocketForObject(objectKey);
        if (!serverSocket) { return; }
        let messageBody = {
            editorId: globalStates.tempUuid
        }

        serverSocket.emit('/subscribe/cameraMatrix', JSON.stringify(messageBody));
        serverSocket.on('/cameraMatrix', callback);
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

        serverSocket.emit('/cameraMatrix', JSON.stringify(messageBody));
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
            console.log("--function-- getServerSocketForObject");
            if (serverIP.indexOf('127.0.0.1') > -1) { // don't broadcast realtime updates to localhost... there can only be one client
                return null;
            }
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
     * @param {string} socketIP
     * @param {function|undefined} onConnect - optional .on('connect') callback 
     */
    function createSocketInSet(setName, socketIP, onConnect) {
     
        var ioObject = io.connect(socketIP);
        console.log(ioObject);
        console.log("-sssss-w-w-w---",setName, ioObject);
        createSocketSet(setName);
        if(!sockets[setName]) sockets[setName] = {};
        sockets[setName][socketIP] = ioObject;
        console.log('created [' + setName + '] socket to IP: ' + socketIP);
        
        if (onConnect) {
            ioObject.on('connect', function() {
                console.log("-sssss-w-w-w--- connected",setName, ioObject);
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

}(realityEditor.network.realtime));
