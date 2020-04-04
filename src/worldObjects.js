createNameSpace("realityEditor.worldObjects");

/**
 * @fileOverview realityEditor.worldObjects
 * Loads world objects from any servers where it has discovered any objects, because world objects are stored differently
 *  on the server and so they aren't advertised in the same way as the rest of the objects.
 * Also manually adds a _WORLD_local which is a special world object hosted by the iOS device but doesn't persist
 *  data from session to session, and has the lowest priority to add frames to if any other world objects are visible
 */

(function(exports) {
    
    var worldObjects = {}; // world objects are stored in the regular global "objects" variable, but also in here
    var worldObjectKeys = [];
    var discoveredServerIPs = [];
    
    var cameraMatrixOffset; // can be used to relocalize the world objects to a different origin point // todo: isn't actually used, should probably be removed

    /**
     * Will store the camera matrix offsets to each world object's origin compared to the phone's coordinate system origin
     * @type {Object.<string, Array.<number>>}
     */
    var worldCorrections = {};

    // a string that all world object's uuids are built from
    var worldObjectId = '_WORLD_';
    var localWorldObjectKey = '_WORLD_local';

    /**
     * Init world object module
     */
    function initService() {
        
        // register a callback for when new objects / IPs are discovered
        // (look at desktopAdapter to figure out how I did it there)
        // trigger the onNewServerDiscovered if it belongs to an undiscovered server
        
        cameraMatrixOffset = realityEditor.gui.ar.utilities.newIdentityMatrix();
        
        // when an object is detected, check if we need to add a world object for its server
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            
            if (object.isWorldObject) {
                
                var IGNORE_HUMAN_POSE_OBJECTS = true;
                if (!(IGNORE_HUMAN_POSE_OBJECTS && object.isHumanPose)) {

                    // add to the internal world objects
                    if (typeof worldObjects[objectKey] === 'undefined') {
                        worldObjects[objectKey] = object;
                        worldCorrections[objectKey] = null; // until we see its target, its origin is null
                    }
                    if (worldObjectKeys.indexOf(objectKey) === -1) {
                        worldObjectKeys.push(objectKey);
                    }
                    
                }
                
                // compatible with new servers - the local world object gets discovered normally, just needs to finish initializing
                if (object.objectId === getLocalWorldId() || !realityEditor.gui.settings.toggleStates.requireWorldLocalization) {
                    initializeWorldObject(object);
                }
            }
            
            // backwards compatible with old servers - try downloading the local server's worldObject from http://ip:port/worldObject/
            handleServerDiscovered(object.ip);
        });

        // this is a way to manually detect and create a world object from the local Node.js server running on the phone
        var worldObject = { id: '_WORLD_local',
            ip: "127.0.0.1", //'127.0.0.1',
            port: 49369,
            vn: 320,
            pr: 'R2',
            tcs: null,
            zone: '' };

        var localWorldBeat = function(worldObject) {
            realityEditor.network.addHeartbeatObject(worldObject);
            console.log(worldObject);
        };

        // send it a few times, just in case the server hasn't finished initializing by the time this first runs
        setTimeout(function() {
            localWorldBeat(worldObject);
        }, 1000);
        setTimeout(function() {
            localWorldBeat(worldObject);
        }, 2000);
        setTimeout(function() {
            localWorldBeat(worldObject);
        }, 3000);
        setTimeout(function() {
            localWorldBeat(worldObject);
        }, 5000);
        
        // when an explicit worldObject message is detected, check if we still need to add that world object
        realityEditor.network.addUDPMessageHandler('worldObject', function(message) {
            console.log('interface discovered world object:', message);
            if (typeof message.worldObject.ip !== 'undefined') {
                handleServerDiscovered(message.worldObject.ip)
            }
        });

        // Add a toggle for how world objects behave. If turned off, all detected world objects will be immediately visible.
        // If turned on, detected world objects will be invisible until their image target has been scanned at least once.
        realityEditor.gui.settings.addToggle('Require World Localization', 'world objects unavailable until target scanned', 'requireWorldLocalization',  '../../../svg/localization.svg', false, function(newValue) {
            console.log('requireWorldLocalization was set to ' + newValue);
        });
    }

    /**
     * Determines if the discovered server is new and triggers the world object downloader if so
     * @param {string} serverIP
     */
    function handleServerDiscovered(serverIP) {
        if (discoveredServerIPs.indexOf(serverIP) < 0) {
            discoveredServerIPs.push(serverIP);
            onNewServerDiscovered(serverIP);
        }
    }

    /**
     * Downloads the world object from a newly detected server
     * @param {string} serverIP
     */
    function onNewServerDiscovered(serverIP) {

        // regular world objects are discovered by UDP broadcast. but the _WORLD_local on localhost gets downloaded with the old REST API
        // TODO: there's probably a simpler implementation if we're making the assumption that we only need to download the localhost server this way
        if (serverIP !== '127.0.0.1') {
            return;
        }
        
        // REST endpoint for for downloading the world object for that server
        var urlEndpoint = 'http://' + serverIP + ':' + realityEditor.network.getPortByIp(serverIP) + '/worldObject/';
        console.log("++++++++++++++++++++++++++",urlEndpoint);
        realityEditor.network.getData(null, null, null, urlEndpoint, function (objectKey, frameKey, nodeKey, msg) {
            console.log("did get world object for server: " + serverIP);

            if (msg && Object.keys(msg).length > 0) {
                console.log('found valid object');
                initializeWorldObject(msg);
            }
            
        });
        
    }
    
    function initializeWorldObject(object) {
        if (typeof object.integerVersion === 'undefined') {
            object.integerVersion = 300;
        }

        realityEditor.gui.ar.utilities.setAverageScale(object);

        // add to the internal world objects
        worldObjects[object.objectId] = object;
        if (worldObjectKeys.indexOf(object.objectId) === -1) {
            worldObjectKeys.push(object.objectId);
        }

        // add the world object to the global objects dictionary
        if (typeof objects[object.objectId] === 'undefined') {
            objects[object.objectId] = object;
            realityEditor.network.onNewObjectAdded(object.objectId);
        }

        if (object.objectId === localWorldObjectKey || !realityEditor.gui.settings.toggleStates.requireWorldLocalization) {
            realityEditor.worldObjects.setOrigin(object.objectId, realityEditor.gui.ar.utilities.newIdentityMatrix());
        }
        console.log('successfully initialized world object: ' + object.objectId);
    }

    /**
     * Chooses a world object. Tries to find a global one, but defaults to local one if necessary.
     * @return {Object}
     */
    function getBestWorldObject() {
        
        // if there are any global world objects, add to those first
        var globalWorldObjectKeys = getGlobalWorldObjectKeys();
        if (globalWorldObjectKeys.length > 0) {
            // todo: should there be a better way to see which server's world object you'd be accessing?
            
            // sort them by newest timestamp if available
            globalWorldObjectKeys.sort(function(a, b) {
                return (realityEditor.getObject(b).timestamp || 0) - (realityEditor.getObject(a).timestamp || 0);
            });
            
            return objects[globalWorldObjectKeys[0]]; // right now it arbitrarily chooses the first non-local world object
        }
        
        // otherwise add to the local one. there should always be one of these so it should never return null
        return getLocalWorldObject();
    }

    /**
     * Returns the local world object hosted by this app
     * @return {Object}
     */
    function getLocalWorldObject() {
        return objects[localWorldObjectKey];
    }

    /**
     * Returns a list of the world object keys, other than the local one hosted by this app
     * @return {Array.<string>}
     */
    function getGlobalWorldObjectKeys() {
        var globalWorldObjectKeys = [];
        if (getWorldObjectKeys()) {
            getWorldObjectKeys().forEach(function(worldObjectKey) {
                if (worldObjectKey !== localWorldObjectKey) {
                    globalWorldObjectKeys.push(worldObjectKey);
                }
            });
        }
        return globalWorldObjectKeys;
    }

    /**
     * @todo: not currently used
     * @return {*}
     */
    function getWorldObjects() {
        return worldObjects;
    }

    /**
     * Returns an array of the IDs of all world objects
     * A world object ID has the format: _WORLD_nameVz64bk5uozss (where the last 12 characters come from uuidTime())
     * @return {Array.<string>}
     */
    function getWorldObjectKeys() {
        return worldObjectKeys;
    }

    /**
     * @todo: this hasn't been tested or used anywhere yet. instead we relocalize in app.callbacks.receiveMatricesFromAR
     * @todo: replace with a terrain target or spatial anchor solution
     * Re-localize the camera origin to the current camera position...
     * @param {Array.<number>} currentCameraMatrix
     */
    function relocalize(currentCameraMatrix) {
        cameraMatrixOffset = currentCameraMatrix;
    }

    /**
     * Getter method for the camera matrix offset, used for re-localization
     * @return {Array.<number>}
     */
    function getCameraMatrixOffset() {
        return cameraMatrixOffset;
    }

    /**
     * Checks if the uuid of an object is from a world object (contains "_WORLD_")
     * @param {string} objectKey
     * @return {boolean}
     */
    function isWorldObjectKey(objectKey) {
        return objectKey.indexOf(worldObjectId) > -1;
    }

    /**
     * Helper function to get the hard-coded ID of the phone's local world object
     * @return {string}
     */
    function getLocalWorldId() {
        return localWorldObjectKey;
    }

    /**
     * Localizes a certain world object with its position relative to the phone's coordinate system origin
     * @param {string} objectKey
     * @param {Array.<number>} originMatrix - 4x4 matrix from tracking engine (taken directly from visibleObjects)
     */
    function setOrigin(objectKey, originMatrix) {
        if (typeof worldCorrections[objectKey] !== 'undefined') {
            
            if (worldCorrections[objectKey] === null) {
                console.log('set origin of ' + objectKey + ' for the first time');
                realityEditor.app.tap();
                setTimeout(function() {
                    realityEditor.app.tap();
                }, 100);
                setTimeout(function() {
                    realityEditor.app.tap();
                }, 200);
                // TODO: add a temporary message log that displays this message for a moment
            }
            
            worldCorrections[objectKey] = originMatrix;
        }
    }

    /**
     * Retrieves the origin of a certain world object (result will be null if hasn't been seen yet)
     * @param {string} objectKey
     * @return {Array<number>}
     */
    function getOrigin(objectKey) {
        return worldCorrections[objectKey];
    }

    /**
     * Retrieves the origin of all world objects whose trackables have been detected at least once
     * @return {Object<string, Array<number>>}
     */
    function getWorldOrigins() {
        return worldCorrections;
    }

    /**
     * Given an IP address, returns a list of all seen world objects that are hosted on that server
     * @param {string} serverIP
     * @return {Array.<Object>}
     */
    function getWorldObjectsByIP(serverIP) {
        var matchingWorldObjects = [];
        Object.values(worldObjects).forEach(function(worldObject) {
            if (worldObject.ip === serverIP) {
                matchingWorldObjects.push(worldObject);
            }
        });
        return matchingWorldObjects;
    }

    /**
     * Returns a data structure mapping each seen worldObjectKey to the estimated distance of that origin to the phone's current position
     * @return {Object.<string, number>}
     */
    function getDistanceToEachWorld() {
        var distances = {};
        for (var objectKey in realityEditor.gui.ar.draw.visibleObjects) {
            var object = realityEditor.getObject(objectKey);
            if (object.isWorldObject) {
                var thisDistance = realityEditor.gui.ar.utilities.distance(realityEditor.gui.ar.draw.visibleObjects[objectKey]);
                distances[objectKey] = thisDistance;
            }
        }
        return distances;
    }
    
    var isFirstTimeSettingWorldPosition = true;
    
    function checkIfFirstLocalization() {
        if (isFirstTimeSettingWorldPosition) {
            if (getWorldObjectKeys().length > 0) {
                if (typeof realityEditor.gui.ar.draw.visibleObjects[getLocalWorldId()] !== 'undefined') {
                    isFirstTimeSettingWorldPosition = false;
                    setTimeout(function() {
                        if (realityEditor.gui.settings.toggleStates.tutorialState) {
                            console.log('add tutorial frame to _WORLD_local');
                            realityEditor.gui.pocket.addTutorialFrame(getLocalWorldId());
                        } else {
                            console.log('tutorial is disabled, dont show it');
                        }
                    }, 500);
                }
            }
        }
    }
    
    exports.initService = initService;
    exports.getWorldObjects = getWorldObjects;
    exports.getWorldObjectKeys = getWorldObjectKeys;
    exports.getBestWorldObject = getBestWorldObject;
    exports.relocalize = relocalize;
    exports.getCameraMatrixOffset = getCameraMatrixOffset;
    exports.isWorldObjectKey = isWorldObjectKey;
    exports.getLocalWorldId = getLocalWorldId;
    exports.setOrigin = setOrigin;
    exports.getOrigin = getOrigin;
    exports.getWorldOrigins = getWorldOrigins;
    exports.getWorldObjectsByIP = getWorldObjectsByIP;
    exports.getDistanceToEachWorld = getDistanceToEachWorld;
    exports.checkIfFirstLocalization = checkIfFirstLocalization;

}(realityEditor.worldObjects));
