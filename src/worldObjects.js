createNameSpace("realityEditor.worldObjects");


(function(exports) {
    
    var worldObjects;
    var discoveredServerIPs;
    
    var cameraMatrixOffset;

    /**
     * Init world object module
     */
    function initFeature() {
        
        // register a callback for when new objects / IPs are discovered
        // (look at desktopAdapter to figure out how I did it there)
        // trigger the onNewServerDiscovered if it belongs to an undiscovered server
        
        worldObjects = {};
        
        discoveredServerIPs = [];
        
        cameraMatrixOffset = realityEditor.gui.ar.utilities.newIdentityMatrix();
        
        // when an object is detected, check if we need to add a world object for its server
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            handleServerDiscovered(object.ip);
        });
        
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
        
        // REST endpoint for for downloading the world object for that server
        
        var urlEndpoint = 'http://' + serverIP + ':' + httpPort + '/worldObject/';
        realityEditor.network.getData(null, null, null, urlEndpoint, function (objectKey, frameKey, nodeKey, msg) {
            console.log("did get world object for server: " + serverIP);

            if (msg) {
                console.log('found valid object', msg);
                
                if (typeof msg.integerVersion === 'undefined') {
                    msg.integerVersion = 300;
                }

                realityEditor.gui.ar.utilities.setAverageScale(msg);
                
                // add to the internal world objects
                worldObjects[msg.objectId] = msg;
                
                // add the world object to the global objects dictionary
                objects[msg.objectId] = msg;
            }
            
        });
        
    }

    /**
     * Arbitrarily chooses a world object to add this frame to.
     * Right now it just chooses the first one.
     * @todo: in the future, add to ~global world server if it exists, if not, add to the world server on this phone
     * @param {Frame} frame
     * @return {Object}
     */
    function getWorldObjectForNewFrame(frame) {
        
        var worldObjectIds = Object.keys(worldObjects);
        if (worldObjectIds.length > 0) {
            return worldObjects[worldObjectIds[0]];
        }
        
        return null;
    }

    /**
     * @todo: finish implementing so you can pick a frame off of an object and drop onto the world
     * @param {Frame} frame
     */
    function addFrameToWorldObject(frame) {
        
        console.log('add frame to world object...');
        
        var chosenWorldObject = getWorldObjectForNewFrame(frame);
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
     * Returns an arbitrary world object (or the only one, or null if none exist)
     * @return {Object|null}
     */
    function getAnyWorldObject() {
        return getWorldObjectForNewFrame(null);
    }

    /**
     * Returns an array of the IDs of all world objects
     * A world object ID has the format: _WORLD_OBJECT_Vz64bk5uozss (where the last 12 characters come from uuidTime())
     * @return {Array.<string>}
     */
    function getWorldObjectKeys() {
        return Object.keys(worldObjects);
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
    exports.getAnyWorldObject = getAnyWorldObject;
    exports.addFrameToWorldObject = addFrameToWorldObject;
    exports.relocalize = relocalize;
    exports.getCameraMatrixOffset = getCameraMatrixOffset;

}(realityEditor.worldObjects));
