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
        
        // if frames get enabled or disabled on the server, refresh the set of availableFrames
        realityEditor.network.addUDPMessageHandler('action', function(message) {
            if (typeof message.action.reloadAvailableFrames !== 'undefined') {
                // download all pocket assets from the serverIP and rebuild the pocket
                // TODO: this could be greatly optimized by only downloading/changing the reloadAvailableFrames.frameName
                onNewServerDetected(message.action.reloadAvailableFrames.serverIP);
            }
        });
    }

    /**
     * Downloads the metadata (including pocket icons) for all available frames on a new server that is detected.
     * Stores the results in the framesPerServer data structure
     * @param {string} serverIP
     */
    function onNewServerDetected(serverIP) {
        console.log('availableFrames discovered server: ' + serverIP);
        var urlEndpoint = 'http://' + serverIP + ':' + realityEditor.network.getPortByIp(serverIP) + '/availableFrames/';
        realityEditor.network.getData(null, null, null, urlEndpoint, function (_nullObj, _nullFrame, _nullNode, response) {
            framesPerServer[serverIP] = response;
            console.log(framesPerServer);
            downloadFramePocketAssets(serverIP); // preload the icons
            triggerServerFramesInfoUpdatedCallbacks(); // this can be detected to update the pocket if it is already open
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

    /**
     * Gets the set of servers with currently visible objects/worlds, sorted by which has the closest visible object,
     *  and for each server, gets its IP address, and the IP address of the server hosting its frames
     *  (itself, for up-to-date servers, or localhost, if that server is too old of a version to have its own frames)
     *  and gets the set of all frames that objects on that server can support (framesPerServer[proxyIP])
     * @param {Array.<string>} visibleObjectKeys
     * @return {Array.<{actualIP: string, proxyIP: string, frames: Object.<string, FrameInfo>}>}
     */
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
            var knownFrames = framesPerServer[serverInfo.proxyIP] || {};
            var framesCopy = JSON.parse(JSON.stringify(knownFrames)); // load from the proxy
            // Object.keys(framesCopy).forEach(function(frameName) {
            //     if (!framesCopy[frameName].properties.showInPocket) {
            //         delete framesCopy[frameName];
            //     }
            // });
            
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
    
    /**
     * Helper function to sort a list of object keys by the distance of that object to the camera, closest to furthest
     * Returns the sorted list with some additional metadata for each entry
     * @param {Array.<string>} objectKeys
     * @return {Array.<{objectKey: string, distance: number, isWorldObject: boolean, timestamp: number}>}
     * @todo: should be moved to gui.ar or gui.ar.utilities
     */
    function sortByDistance(objectKeys) {
        var validObjectKeys = objectKeys.filter(function(objectKey) {
            return realityEditor.getObject(objectKey); // only use objectKeys that correspond to valid objects
        });
        
        return validObjectKeys.map( function(objectKey) {
            var distance = realityEditor.gui.ar.utilities.distance(realityEditor.gui.ar.draw.modelViewMatrices[objectKey]);
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
            var worldObjectTimeDifference = 0; // todo: remove this, uses distance to world origin instead
            if (a.isWorldObject && b.isWorldObject) {
                worldObjectTimeDifference = b.timestamp - a.timestamp; // this sorts newer world objects above older ones (or ones without timestamp property)
            }
            return (a.distance - b.distance) + worldObjectTimeDifference;
        });
    }

    /**
     * Given the frame name (type), finds the closest object that supports that type of frame.
     * Works with objects and world objects, prioritizing non-world objects according to the implementation of getClosestObject.
     * @param frameName - the type of the frame (e.g. graphUI, slider, switch)
     * @return {string|null}
     */
    function getBestObjectInfoForFrame(frameName) {
        var possibleObjectKeys = getPossibleObjectsForFrame(frameName);
        
        // this works now that world objects have a sense of distance just like regular objects
        return realityEditor.gui.ar.getClosestObject(function(objectKey) {
            return possibleObjectKeys.indexOf(objectKey) > -1;
        })[0];
    }

    /**
     * Out of the current visible objects, figures out which subset of them could support having this type of frame attached.
     * @param {string} frameName - the type of the frame (e.g. graphUI, slider, switch)
     * @return {Array.<string>} - list of compatible objectKeys
     */
    function getPossibleObjectsForFrame(frameName) {
        // search framesPerServer for this frameName to see which server this can go on
        
        var compatibleServerIPs = [];
        
        for (var serverIP in framesPerServer) {
            var serverFrames = framesPerServer[serverIP];
            if (typeof serverFrames[frameName] !== 'undefined') {
                compatibleServerIPs.push(serverIP);
            }
        }
        
        // filter down visible objects if their IP (or proxyIP) is compatible
        
        var compatibleObjects = [];
        
        Object.keys(realityEditor.gui.ar.draw.visibleObjects).filter(function(objectKey) {
            return typeof objects[objectKey] !== 'undefined';
        }).forEach(function(objectKey) {
            var proxyIP = getServerIPForObjectFrames(objectKey);
            if (compatibleServerIPs.indexOf(proxyIP) > -1) {
                compatibleObjects.push(objectKey);
            }
        });
        
        return compatibleObjects;
    }

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
            // if (!framesCopy[frameName].properties.showInPocket) {
            //     delete framesCopy[frameName];
            // }
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
        return 'http://' + serverIP + ':' + realityEditor.network.getPortByIp(serverIP) + '/frames/' + frameName + '/icon.gif';
    }

    /**
     * Given a closest object and a frame name, returns the path to the html for that iframe on the correct server
     * @param {string} objectKey
     * @param {string} frameName
     * @return {string} - html src path
     */
    function getFrameSrc(objectKey, frameName) {
        var serverIP = getServerIPForObjectFrames(objectKey);
        return 'http://' + serverIP + ':' + realityEditor.network.getPort(objects[objectKey]) + '/frames/' + frameName + '/index.html';
    }
    
    var serverFrameInfoUpdatedCallbacks = [];

    /**
     * Use this to notify other services that we have discovered available frame info for a new server,
     *  or we have received updated frame info from a previously discovered server
     * @param {function} callback
     */
    function onServerFramesInfoUpdated(callback) {
        serverFrameInfoUpdatedCallbacks.push(callback);
    }

    /**
     * Calls the callbacks for anything that subscribed to onServerFramesInfoUpdated
     */
    function triggerServerFramesInfoUpdatedCallbacks() {
        serverFrameInfoUpdatedCallbacks.forEach(function(callback) {
            callback();
        });
    }

    exports.initService = initService;
    exports.getFramesForPocket = getFramesForPocket;
    
    exports.getFrameSrc = getFrameSrc;
    exports.getFrameIconSrc = getFrameIconSrc;
    
    exports.getPossibleObjectsForFrame = getPossibleObjectsForFrame;
    exports.getBestObjectInfoForFrame = getBestObjectInfoForFrame;
    
    exports.onServerFramesInfoUpdated = onServerFramesInfoUpdated;

    exports.getFramesForAllVisibleObjects = getFramesForAllVisibleObjects;
    exports.sortByDistance = sortByDistance;

})(realityEditor.network.availableFrames);
