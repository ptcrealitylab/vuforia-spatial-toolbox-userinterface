createNameSpace("realityEditor.network.availableFrames");

/**
 * @fileOverview realityEditor.network.availableFrames.js
 * Provides a central interface for loading available frames from each server into the pocket
 */

(function(exports) {
    
    var framesPerServer = {};

    /**
     * Public init method sets up module by registering callbacks when important events happen in other modules
     */
    function initService() {
        // immediately triggers for each server already in the system, and then triggers again every time a new server is detected
        realityEditor.network.onNewServerDetected(onNewServerDetected);
    }
    
    function onNewServerDetected(serverIP) {
        console.log('availableFrames discovered server: ' + serverIP);
        var urlEndpoint = 'http://' + serverIP + ':' + httpPort + '/availableFrames/';

        realityEditor.network.getData(null, null, null, urlEndpoint, function (_a, _b, _c, responseText) {
            // console.log("did get available frames ", responseText);
            framesPerServer[serverIP] = responseText;
            console.log(framesPerServer);
            
            downloadFramePocketAssets(serverIP);
        });
    }
    
    function downloadFramePocketAssets(serverIP) {
        // download the icon.gif for each frame
        var frames = framesPerServer[serverIP];
        if (frames) {
            Object.values(frames).forEach(function(frameInfo) {
                if (typeof frameInfo.icon === "undefined") {
                    var preloadedImage = new Image();
                    preloadedImage.src = getFrameIconSrc(serverIP, frameInfo.properties.name);
                    frameInfo.icon = preloadedImage;
                }
            });
        }
    }
    
    function getAvailableFrames(objectKey) {
        var object = realityEditor.getObject(objectKey);
        if (!object) { return {}; }
        return framesPerServer[object.ip] || {};
    }
    
    var DEBUG_TEST_POCKET = true;
    
    function getFramesForPocket(closestObjectKey) {
        var serverIP = realityEditor.getObject(closestObjectKey).ip;
        var framesCopy = JSON.parse(JSON.stringify(framesPerServer[serverIP]));
        Object.keys(framesCopy).forEach(function(frameName) {
            if (!framesCopy[frameName].properties.showInPocket) {
                delete framesCopy[frameName];
            }
            if (DEBUG_TEST_POCKET) {
                if (realityEditor.getObject(closestObjectKey).isWorldObject) {
                    if (frameName === 'buttonOff' || frameName === 'buttonOn') {
                        delete framesCopy[frameName];
                    }
                }
            }
        });
        return framesCopy;
    }
    
    function getFrameIconSrc(serverIP, frameName) {
        return 'http://' + serverIP + ':' + httpPort + '/frames/active/' + frameName + '/icon.gif'; // todo; make consistent with getFrameSrc params
    }
    
    function getFrameSrc(objectKey, frameName) {
        return 'http://' + realityEditor.getObject(objectKey).ip + ':' + httpPort + '/frames/active/' + frameName + '/index.html';
    }

    exports.initService = initService;
    exports.getAvailableFrames = getAvailableFrames;
    exports.getFramesForPocket = getFramesForPocket;
    exports.getFrameSrc = getFrameSrc;
    exports.getFrameIconSrc = getFrameIconSrc;

})(realityEditor.network.availableFrames);
