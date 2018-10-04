createNameSpace("realityEditor.network.realtime");

/**
 * @fileOverview realityEditor.device.realtime.js
 * Maintains the socket connections to other editors and provides APIs for sending and receiving data.
 */

(function(exports) {

    // var broadcastInterval;
    // var isPaused = false;
    // var waitingForConnection = true;
    // var connectionPrompt;
    var mySocket;// = io();
    // var sockets = {};
    
    function initFeature() {
        mySocket = io();
    }
    
    function addSocketMessageListener(messageName, callback) {
        mySocket.on(messageName, callback);
    }

    exports.initFeature = initFeature;
    exports.addSocketMessageListener = addSocketMessageListener;

}(realityEditor.network.realtime));
