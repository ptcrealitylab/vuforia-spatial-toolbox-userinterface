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
        
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
           
            var serverIP = object.ip;
            if (discoveredServerIPs.indexOf(serverIP) < 0) {
                discoveredServerIPs.push(serverIP);

                onNewServerDiscovered(serverIP);
            }
            
        });
        
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
        
        // add that world object to the discovered worldObjects
        
        // add that world object to the global "objects" dictionary
        
    }

    /**
     * arbitrarily choose a world object to add this frame to
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
     * @return {*}
     */
    function getWorldObjects() {
        return worldObjects;
    }

    /**
     * @return {Object}
     */
    function getAnyWorldObject() {
        return getWorldObjectForNewFrame(null);
    }

    /**
     * @return {Array.<string>}
     */
    function getWorldObjectKeys() {
        return Object.keys(worldObjects);
    }

    /**
     * Relocalize the camera origin to the current camera position...
     */
    function relocalize(currentCameraMatrix) {
        cameraMatrixOffset = currentCameraMatrix; //realityEditor.gui.ar.draw.cameraMatrix;
    }
    
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
