createNameSpace("realityEditor.worldObjects");


(function(exports) {
    
    var worldObjects;
    var worldObjectKeys;
    var discoveredServerIPs;
    
    var cameraMatrixOffset;
    
    var localWorldObjectKey = '_WORLD_OBJECT_local';

    /**
     * Init world object module
     */
    function initFeature() {
        
        // register a callback for when new objects / IPs are discovered
        // (look at desktopAdapter to figure out how I did it there)
        // trigger the onNewServerDiscovered if it belongs to an undiscovered server
        
        worldObjects = {};
        worldObjectKeys = [];
        
        discoveredServerIPs = [];
        
        cameraMatrixOffset = realityEditor.gui.ar.utilities.newIdentityMatrix();
        
        // when an object is detected, check if we need to add a world object for its server
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            handleServerDiscovered(object.ip);
        });

        var worldObject = { id: '_WORLD_OBJECT_local',
            ip: "127.0.0.1", //'127.0.0.1',
            vn: 320,
            pr: 'R2',
            tcs: null,
            zone: '' };

        var localWorldBeat =  function(worldObject){  realityEditor.network.addHeartbeatObject(worldObject); console.log(worldObject) };


        // localWorldBeat(worldObject);
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
        
    }

    /**
     * Determines if the discovered server is new and triggers the world object downloader if so
     * @param serverIP
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

        var DEBUG_GLOBAL_WORLD_OBJECTS = false;
        if (DEBUG_GLOBAL_WORLD_OBJECTS) {
            if (serverIP !== '127.0.0.1') {
                console.warn('ignored found world object because of DEBUG_GLOBAL_WORLD_OBJECTS');
                return;
            }
        }
        
        // REST endpoint for for downloading the world object for that server
        
        var urlEndpoint = 'http://' + serverIP + ':' + httpPort + '/worldObject/';
        realityEditor.network.getData(null, null, null, urlEndpoint, function (objectKey, frameKey, nodeKey, msg) {
            console.log("did get world object for server: " + serverIP);

            if (msg && Object.keys(msg).length > 0) {
                console.log('found valid object', msg);
                
                if (typeof msg.integerVersion === 'undefined') {
                    msg.integerVersion = 300;
                }

                realityEditor.gui.ar.utilities.setAverageScale(msg);
                
                // add to the internal world objects
                worldObjects[msg.objectId] = msg;
                if (worldObjectKeys.indexOf(msg.objectId) === -1) {
                    worldObjectKeys.push(msg.objectId);
                }
                
                // add the world object to the global objects dictionary
                objects[msg.objectId] = msg;

                realityEditor.network.onNewObjectAdded(msg.objectId);
            }
            
        });
        
    }

    /**
     * Chooses a world object. Tries to find a global one, but defaults to local one if necessary.
     * @return {Object}
     */
    function getBestWorldObject() {
        
        // if there are any global world objects, add to those first
        var globalWorldObjectKeys = getGlobalWorldObjectKeys();
        if (globalWorldObjectKeys.length > 0) {
            return objects[globalWorldObjectKeys[0]];
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
        getWorldObjectKeys().forEach(function(worldObjectKey) {
            if (worldObjectKey !== localWorldObjectKey) {
                globalWorldObjectKeys.push(worldObjectKey);
            }
        });
        return globalWorldObjectKeys;
    }

    /**
     * @todo: finish implementing so you can pick a frame off of an object and drop onto the world
     * @param {Frame} frame
     */
    function addFrameToWorldObject(frame) {
        
        console.log('add frame to world object...');
        
        var chosenWorldObject = getBestWorldObject();
        if (chosenWorldObject) {

            // add this frame to that object
            chosenWorldObject.frames[frame.uuid] = frame;

            // set all state appropriately

            // sync with server
            
        }
        
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
     * A world object ID has the format: _WORLD_OBJECT_Vz64bk5uozss (where the last 12 characters come from uuidTime())
     * @return {Array.<string>}
     */
    function getWorldObjectKeys() {
        return worldObjectKeys;
        // if (!worldObjects) {
        //     return [];
        // }
        // return Object.keys(worldObjects);
    }

    /**
     * @todo: this hasn't been tested or used anywhere yet
     * @todo: replace with a terrain target or spatial anchor solution
     * Re-localize the camera origin to the current camera position...
     * @param {Array.<number>} currentCameraMatrix
     */
    function relocalize(currentCameraMatrix) {
        cameraMatrixOffset = currentCameraMatrix; //realityEditor.gui.ar.draw.cameraMatrix;
    }

    /**
     * Getter method for the camera matrix offset, used for re-localization
     * @return {Array.<number>}
     */
    function getCameraMatrixOffset() {
        return cameraMatrixOffset;
    }
    
    exports.initFeature = initFeature;
    exports.getWorldObjects = getWorldObjects;
    exports.getWorldObjectKeys = getWorldObjectKeys;
    exports.getBestWorldObject = getBestWorldObject;
    exports.addFrameToWorldObject = addFrameToWorldObject;
    exports.relocalize = relocalize;
    exports.getCameraMatrixOffset = getCameraMatrixOffset;

}(realityEditor.worldObjects));
