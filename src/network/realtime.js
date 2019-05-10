createNameSpace("realityEditor.network.realtime");

// TODO we have to check that this method only connects to the objects currently visible. Otherwise it will not scale.

/**
 * @fileOverview realityEditor.device.realtime.js
 * Maintains the socket connections to other editors and provides APIs for sending and receiving data.
 */

(function(exports) {

    var mySocket;
    var sockets = {};

    /**
     * Public init function that sets up the sockets for realtime updates.
     */
    function initFeature() {
        // TODO Is this redundant code? It seems to generate the error that pops up
        
        mySocket = io.connect();
        setupVehicleUpdateSockets();
        setupServerSockets();
        setInterval(setupServerSockets, 3000);
    }

    /**
     * Add socket listeners for events that update objects, frames, and nodes.
     */
    function setupVehicleUpdateSockets() {
        addSocketMessageListener('/update/object', updateObject);
        addSocketMessageListener('/update/frame', updateFrame);
        addSocketMessageListener('/update/node', updateNode);
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
        var object = realityEditor.getObject(msgContent.objectKey);
        if (!object) { return; }
        if (!msgContent.hasOwnProperty('propertyPath') || !msgContent.hasOwnProperty('newValue')) { return; }

        setObjectValueAtPath(object, msgContent.propertyPath, msgContent.newValue);
        // console.log('set object (' + msgContent.objectKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);
    }

    /**
     * Updates a specific property of a specific frame to a new value.
     * @param {UpdateMessage} msgContent
     */
    function updateFrame(msgContent) {
        var frame = realityEditor.getFrame(msgContent.objectKey, msgContent.frameKey);
        if (!frame) { return; }
        if (!msgContent.hasOwnProperty('propertyPath') || !msgContent.hasOwnProperty('newValue')) { return; }

        setObjectValueAtPath(frame, msgContent.propertyPath, msgContent.newValue);
        // console.log('set frame (' + msgContent.frameKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);
        
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
        var node = realityEditor.getNode(msgContent.objectKey, msgContent.frameKey, msgContent.nodeKey);
        if (!node) { return; }
        if (!msgContent.hasOwnProperty('propertyPath') || !msgContent.hasOwnProperty('newValue')) { return; }

        setObjectValueAtPath(node, msgContent.propertyPath, msgContent.newValue);
        // console.log('set node (' + msgContent.nodeKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);
    }

    /**
     * Checks every object detected, and if there are any belonging to servers that we haven't established a socket
     * connection with, adds a new 'realityServers' socket connection
     */
    function setupServerSockets() {
        var serverPort = 8080;
        var ipList = [];
        realityEditor.forEachObject(function(object, objectKey) {
            if (ipList.indexOf(object.ip) === -1) {
                ipList.push(object.ip);
            }
        });
        ipList.forEach(function(ip) {
            var serverAddress = 'http://' + ip + ':' + serverPort;
            var socketsIps = realityEditor.network.realtime.getSocketIPsForSet('realityServers');
            if (socketsIps.indexOf(serverAddress) < 0) {
                // if we haven't already created a socket connection to that IP, create a new one,
                //   and register update listeners, and emit a /subscribe message so it can connect back to us
                realityEditor.network.realtime.createSocketInSet('realityServers', serverAddress);
                sockets['realityServers'][serverAddress].emit('/subscribe/realityEditorUpdates', JSON.stringify({editorId: globalStates.tempUuid}));
                addServerUpdateListener(serverAddress);
            }
        });
    }

    /**
     * Adds a generic '/update' listener to the socket.io server running at the provided address, and delegates the
     * responses to updateObject, updateFrame, or updateNode depending on the messages received
     * @param {string} serverAddress
     */
    function addServerUpdateListener(serverAddress) {
        addServerSocketMessageListener(serverAddress, '/update', function(msg) {
            // socket.on('/update', function(msg) {
            var objectKey;
            var frameKey;
            var nodeKey;

            var msgContent = JSON.parse(msg);
            if (typeof msgContent.objectKey !== 'undefined') {
                objectKey = msgContent.objectKey;
            }
            if (typeof msgContent.frameKey !== 'undefined') {
                frameKey = msgContent.frameKey;
            }
            if (typeof msgContent.nodeKey !== 'undefined') {
                nodeKey = msgContent.nodeKey;
            }

            if (objectKey && frameKey && nodeKey) {
                updateNode(msgContent);
            } else if (objectKey && frameKey) {
                updateFrame(msgContent);
            } else if (objectKey) {
                updateObject(msgContent);
            }

        });
    }

    /**
     * Utility function that abstracts adding a message listener on this server's socket.
     * @param {string} messageName
     * @param {function} callback
     */
    function addSocketMessageListener(messageName, callback) {
        mySocket.on(messageName, callback);
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
        
        // get the server responsible for this vehicle and send it an update message. it will then message all connected clients
        var serverSocket = getServerSocketForObject(objectKey);
        if (serverSocket) {
            
            var messageBody = {
                objectKey: objectKey,
                frameKey: frameKey,
                nodeKey: nodeKey,
                propertyPath: propertyPath,
                newValue: newValue,
                editorId: globalStates.tempUuid
            };

            serverSocket.emit('/update', JSON.stringify(messageBody));

        }

        // sendMessageToSocketSet('realityServers', '/update', messageBody);
    }

    /**
     * Gets the ioObject connected to the server hosting a given object
     * @param {string} objectKey
     * @return {null}
     */
    function getServerSocketForObject(objectKey) {
        var object = realityEditor.getObject(objectKey);
        var serverIP = object.ip;
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
        return (foundSocket) ? (sockets['realityServers'][foundSocket]) : null;
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
     */
    function createSocketInSet(setName, socketIP, onConnect) {
        var ioObject = io.connect(socketIP);
        console.log(ioObject);
        createSocketSet(setName);
        sockets[setName][socketIP] = ioObject;
        console.log('created [' + setName + '] socket to IP: ' + socketIP);
        
        if (onConnect) {
            ioObject.on('connect', function() {
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

    exports.initFeature = initFeature;
    exports.addSocketMessageListener = addSocketMessageListener;
    exports.broadcastUpdate = broadcastUpdate;
    
    exports.getSocketIPsForSet = getSocketIPsForSet;
    exports.createSocketInSet = createSocketInSet;
    exports.sendMessageToSocketSet = sendMessageToSocketSet;

}(realityEditor.network.realtime));
