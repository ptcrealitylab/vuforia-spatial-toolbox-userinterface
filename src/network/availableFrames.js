createNameSpace("realityEditor.network.availableFrames");

/**
 * @fileOverview realityEditor.network.availableFrames.js
 * Provides a central interface for loading available frames from each server into the pocket.
 * Keeps track of which frames are supported by each server, and provides the correct metadata, icons, and html files
 * for the frames based on which object/server you are closest to at any given time.
 */

(function(exports) {

    /**
     * @typedef {Object} FrameInfo
     * @property {Image} icon - preloaded image with src path for pocket icon image
     * @property {Object.<{name: string, nodes: Array, showInPocket: boolean, tags: Array}>} properties - flexible set of metadata about the frame
     */

    /**
     * Maps each serverIP to a structure of FrameInfo for each frame type that the server hosts/supports
     * @type {Object.<string, FrameInfo>}
     */
    var framesPerServer = {};

    /**
     * Public init method sets up module by registering callbacks when important events happen in other modules
     */
    function initService() {
        // immediately triggers for each server already in the system, and then triggers again every time a new server is detected
        realityEditor.network.onNewServerDetected(onNewServerDetected);
    }

    /**
     * Downloads the metadata (including pocket icons) for all available frames on a new server that is detected.
     * Stores the results in the framesPerServer data structure
     * @param {string} serverIP
     */
    function onNewServerDetected(serverIP) {
        console.log('availableFrames discovered server: ' + serverIP);
        var urlEndpoint = 'http://' + serverIP + ':' + httpPort + '/availableFrames/';

        realityEditor.network.getData(null, null, null, urlEndpoint, function (_nullObj, _nullFrame, _nullNode, responseText) {
            framesPerServer[serverIP] = responseText;
            console.log(framesPerServer);
            
            downloadFramePocketAssets(serverIP);
        });
    }

    /**
     * Preload the icon image for each frame on the given server, and store in the framesPerServer data structure
     * @param {string} serverIP
     */
    function downloadFramePocketAssets(serverIP) {
        var frames = framesPerServer[serverIP];
        if (frames) {
            Object.values(frames).forEach(function(frameInfo) {
                if (typeof frameInfo.icon === "undefined") {
                    var preloadedImage = new Image(); // download / preload the icon.gif for each frame
                    preloadedImage.src = getFrameIconSrcByIP(serverIP, frameInfo.properties.name);
                    frameInfo.icon = preloadedImage;
                }
            });
        }
    }
    
    var DEBUG_TEST_POCKET = false; // turn this on to test conditional pocket functionality on local server
    
    function getFramesForAllVisibleObjects(visibleObjectKeys) {
        
        var sortedByDistance = sortByDistance(visibleObjectKeys);
        
        // sort by order of closest
        var sortedVisibleServerIPs = sortedByDistance.map(function(objectInfo) {
            var actualIP = realityEditor.getObject(objectInfo.objectKey).ip;
            var proxyIP = getServerIPForObjectFrames(objectInfo.objectKey);
            return {
                actualIP: actualIP,
                proxyIP: proxyIP // TODO: could only include proxyIP if it isn't identical to actualIP?
            };
        });
        
        // filter out duplicates
        // var uniqueServerIPs = sortedVisibleServerIPs.filter(function(item, pos) {
        //     return sortedVisibleServerIPs.indexOf(item) === pos; // this only works if item is a primitive
        // });

        var uniqueServerIPs = [];
        
        sortedVisibleServerIPs.forEach(function(item) {
            // if uniqueServerIPs doesn't already have an item with all identical properties, add this one
            // note: this is an N^2 solution. fine for now because N is usually very small, but may need to be optimized in the future
            var isAlreadyContained = false;
            uniqueServerIPs.forEach(function(uniqueItem) {
                if (isAlreadyContained) { return; }
                if (uniqueItem.actualIP === item.actualIP && uniqueItem.proxyIP === item.proxyIP) {
                    isAlreadyContained = true;
                }
            });
            
            if (!isAlreadyContained) {
                uniqueServerIPs.push(item);
            }
        });
        
        var allFrames = [];

        uniqueServerIPs.forEach(function(serverInfo) {
            var framesCopy = JSON.parse(JSON.stringify(framesPerServer[serverInfo.proxyIP])); // load from the proxy
            Object.keys(framesCopy).forEach(function(frameName) {
                if (!framesCopy[frameName].properties.showInPocket) {
                    delete framesCopy[frameName];
                }
            });
            
            allFrames.push({
                actualIP: serverInfo.actualIP,
                proxyIP: serverInfo.proxyIP,
                frames: framesCopy // TODO: if proxyIP !== actualIP, maybe don't include duplicate frames, just detect and retrieve them from the proxyIP's data structure instead
            });
            return framesCopy;
        });
        
        console.log(allFrames);
        return allFrames;
    }
    
    // TODO: move to gui.ar or gui.ar.utilities
    function sortByDistance(objectKeys) {
        return objectKeys.map( function(objectKey) {
            var distance = realityEditor.gui.ar.utilities.distance(realityEditor.gui.ar.draw.visibleObjects[objectKey]);
            var isWorldObject = false;
            var object = realityEditor.getObject(objectKey);
            if (object && object.isWorldObject) {
                distance = realityEditor.gui.ar.MAX_DISTANCE; // world objects are essentially infinitely far away
                isWorldObject = true;
            }
            return {
                objectKey: objectKey,
                distance: distance,
                isWorldObject: isWorldObject,
                timestamp: object.timestamp || 0
            };
        }).sort(function (a, b) {
            var worldObjectTimeDifference = 0;
            if (a.isWorldObject && b.isWorldObject) {
                worldObjectTimeDifference = b.timestamp - a.timestamp; // this sorts newer world objects above older ones (or ones without timestamp property)
            }
            return (a.distance - b.distance) + worldObjectTimeDifference;
        });
    }
    
    exports.getFramesForAllVisibleObjects = getFramesForAllVisibleObjects;
    exports.sortByDistance = sortByDistance;

    /**
     * Gets the framesPerServer metadata for the server where the closest object is hosted.
     * If the server is an old version that doesn't host its own frames, load from the phone's localhost server instead
     * @param {string} closestObjectKey
     * @return {Object.<string, FrameInfo>}
     */
    function getFramesForPocket(closestObjectKey) {
        var serverIP = getServerIPForObjectFrames(closestObjectKey);
        var framesCopy = JSON.parse(JSON.stringify(framesPerServer[serverIP]));
        Object.keys(framesCopy).forEach(function(frameName) {
            if (!framesCopy[frameName].properties.showInPocket) {
                delete framesCopy[frameName];
            }
            if (DEBUG_TEST_POCKET) {
                if (realityEditor.getObject(closestObjectKey).isWorldObject) {
                    // if (frameName === 'buttonOff' || frameName === 'buttonOn') {
                    if (frameName.indexOf('b') > -1 || frameName.indexOf('a') > -1) {
                        delete framesCopy[frameName];
                    }
                }
            }
        });
        return framesCopy;
    }

    /**
     * Helper function that returns which IP to load the frames from for the provided object
     * Usually just the .ip property of that object, but defaults to localhost if that server is an old version that doesn't support hosting its own frames
     * @param {string} objectKey
     * @return {string} - IP address
     */
    function getServerIPForObjectFrames(objectKey) {
        var serverIP = realityEditor.getObject(objectKey).ip;
        if (typeof framesPerServer[serverIP] === 'undefined') {
            // console.log('this object server doesnt have its own frames; load from localhost instead');
            serverIP = '127.0.0.1';
        }
        return serverIP;
    }

    /**
     * Given a closest object and a frame name, returns the src path for the pocket icon (loaded from correct server)
     * @param {string} objectKey
     * @param {string} frameName
     * @return {string} - image src path
     */
    function getFrameIconSrc(objectKey, frameName) {
        var serverIP = getServerIPForObjectFrames(objectKey);
        return getFrameIconSrcByIP(serverIP, frameName);
    }

    /**
     * Given a server IP address and a frame name, returns the path to that frame's pocket icon on that server
     * @param {string} serverIP
     * @param {string} frameName
     * @return {string} - image src path
     */
    function getFrameIconSrcByIP(serverIP, frameName) {
        return 'http://' + serverIP + ':' + httpPort + '/frames/active/' + frameName + '/icon.gif';
    }

    /**
     * Given a closest object and a frame name, returns the path to the html for that iframe on the correct server
     * @param {string} objectKey
     * @param {string} frameName
     * @return {string} - html src path
     */
    function getFrameSrc(objectKey, frameName) {
        var serverIP = getServerIPForObjectFrames(objectKey);
        return 'http://' + serverIP + ':' + httpPort + '/frames/active/' + frameName + '/index.html';
    }

    exports.initService = initService;
    exports.getFramesForPocket = getFramesForPocket;
    
    exports.getFrameSrc = getFrameSrc;
    exports.getFrameIconSrc = getFrameIconSrc;

})(realityEditor.network.availableFrames);
