createNameSpace("realityEditor.network.realtime");

/**
 * @fileOverview realityEditor.device.realtime.js
 * Maintains the socket connections to other editors and provides APIs for sending and receiving data.
 */

(function(exports) {

    var mySocket;
    var sockets = {};
    
    function initFeature() {
        mySocket = io();
        setupVehicleUpdateSockets();
        
        setupServerSockets();
        setInterval(setupServerSockets, 3000);
    }
    
    function setupVehicleUpdateSockets() {
        
        addSocketMessageListener('/update/object', updateObject);

        addSocketMessageListener('/update/frame', updateFrame);

        addSocketMessageListener('/update/node', updateNode);

        // addSocketMessageListener('/update', function(msgContent) {
        // // socket.on('/update', function(msg) {
        //     var objectKey;
        //     var frameKey;
        //     var nodeKey;
        //
        //     // var msgContent = JSON.parse(msg);
        //     if (typeof msgContent.objectKey !== 'undefined') {
        //         objectKey = msgContent.objectKey;
        //     }
        //     if (typeof msgContent.frameKey !== 'undefined') {
        //         frameKey = msgContent.frameKey;
        //     }
        //     if (typeof msgContent.nodeKey !== 'undefined') {
        //         nodeKey = msgContent.nodeKey;
        //     }
        //
        //     if (objectKey && frameKey && nodeKey) {
        //         // io.emit('/update/node', msgContent);
        //         updateNode(msgContent);
        //     } else if (objectKey && frameKey) {
        //         // io.emit('/update/frame', msgContent);
        //         updateFrame(msgContent);
        //     } else if (objectKey) {
        //         // io.emit('/update/object', msgContent);
        //         updateObject(msgContent);
        //     }
        //
        // });
        
    }
    
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
                // io.emit('/update/node', msgContent);
                updateNode(msgContent);
            } else if (objectKey && frameKey) {
                // io.emit('/update/frame', msgContent);
                updateFrame(msgContent);
            } else if (objectKey) {
                // io.emit('/update/object', msgContent);
                updateObject(msgContent);
            }

        });
    }
    
    function updateObject(msgContent) {
        var object = realityEditor.getObject(msgContent.objectKey);
        if (!object) { return; }
        if (!msgContent.hasOwnProperty('propertyPath') || !msgContent.hasOwnProperty('newValue')) { return; }

        setObjectValueAtPath(object, msgContent.propertyPath, msgContent.newValue);
        console.log('set object (' + msgContent.objectKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);
    }
    
    function updateFrame(msgContent) {
        var frame = realityEditor.getFrame(msgContent.objectKey, msgContent.frameKey);
        if (!frame) { return; }
        if (!msgContent.hasOwnProperty('propertyPath') || !msgContent.hasOwnProperty('newValue')) { return; }

        setObjectValueAtPath(frame, msgContent.propertyPath, msgContent.newValue);
        console.log('set frame (' + msgContent.frameKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);
    }
    
    function updateNode(msgContent) {
        var node = realityEditor.getNode(msgContent.objectKey, msgContent.frameKey, msgContent.nodeKey);
        if (!node) { return; }
        if (!msgContent.hasOwnProperty('propertyPath') || !msgContent.hasOwnProperty('newValue')) { return; }

        setObjectValueAtPath(node, msgContent.propertyPath, msgContent.newValue);
        console.log('set node (' + msgContent.nodeKey + ').' + msgContent.propertyPath + ' to ' + msgContent.newValue);
    }
    
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
                realityEditor.network.realtime.createSocketInSet('realityServers', serverAddress);
                sockets['realityServers'][serverAddress].emit('/subscribe/realityEditorUpdates', JSON.stringify({editorId: globalStates.tempUuid}));
                addServerUpdateListener(serverAddress);
            }
        });
    }
    
    function addSocketMessageListener(messageName, callback) {
        mySocket.on(messageName, callback);
    }
    
    function addServerSocketMessageListener(serverAddress, messageName, callback) {
        sockets['realityServers'][serverAddress].on(messageName, callback);
    }

    // TODO: control which sets it gets sent to
    function broadcastUpdate(objectKey, frameKey, nodeKey, propertyPath, newValue) {
        
        var messageBody = {
            objectKey: objectKey,
            frameKey: frameKey,
            nodeKey: nodeKey,
            propertyPath: propertyPath,
            newValue: newValue,
            editorId: globalStates.tempUuid
        };

        // var setNames = Object.keys(sockets);
        // setNames.forEach(function(setName) {
        //     sendMessageToSocketSet(setName, '/update', messageBody);
        // });
        
        sendMessageToSocketSet('realityServers', '/update', messageBody);
        
    }
    
    function createSocketSet(setName) {
        if (typeof sockets[setName] === 'undefined') {
            sockets[setName] = {};
        }
    }
    
    function getSocketIPsForSet(setName) {
        if (typeof sockets[setName] === 'undefined') {
            return [];
        }
        
        return Object.keys(sockets[setName]);
    }
    
    function createSocketInSet(setName, socketIP) {
        var ioObject = io.connect(socketIP);
        console.log(ioObject);
        createSocketSet(setName);
        sockets[setName][socketIP] = ioObject;
        console.log('created [' + setName + '] socket to IP: ' + socketIP);
    }
    
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
