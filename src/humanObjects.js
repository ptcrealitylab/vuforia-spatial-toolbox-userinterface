createNameSpace("realityEditor.humanObjects");

/**
 * @fileOverview realityEditor.worldObjects
 * Loads world objects from any servers where it has discovered any objects, because world objects are stored differently
 *  on the server and so they aren't advertised in the same way as the rest of the objects.
 * Also manually adds a _WORLD_local which is a special world object hosted by the iOS device but doesn't persist
 *  data from session to session, and has the lowest priority to add frames to if any other world objects are visible
 */

(function(exports) {
    
    let persistentClientId = window.localStorage.getItem('persistentClientId') || DEBUG_CLIENT_NAME;
    let humanObjectInitialized = false;
    var humanObjects = {}; // human objects are stored in the regular global "objects" variable, but also in here

    /**
     * Init world object module
     */
    function initService() {
        console.log('initService: humanObjects');
        
        realityEditor.worldObjects.onLocalizedWithinWorld(function(objectKey) {
            if (objectKey === realityEditor.worldObjects.getLocalWorldId()) {
                return; // skip local world
            }

            console.log('humanObjects module onLocalizedWithinWorld: ' + objectKey);
            
            // check if humanObject for this device exists on server?
            // /http://localhost:8080/object/BenReynolds
            
            let worldObject = realityEditor.getObject(objectKey);

            let downloadUrl = 'http://' + worldObject.ip + ':' + realityEditor.network.getPort(worldObject) + '/object/' + persistentClientId;
            realityEditor.network.getData(null,  null, null, downloadUrl, function (_objectKey, _frameKey, _nodeKey, msg) {
                if (msg) {
                    console.log('found humanObject', msg);
                    humanObjectInitialized = true;
                } else {
                    console.log('cant find humanObject');
                    // try creating it!
                    addHumanObject(objectKey, persistentClientId);
                }
            });
            
        });

        // when an object is detected, check if we need to add a world object for its server
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            if (object.isHumanObject) {
                // add to the internal world objects
                if (typeof humanObjects[objectKey] === 'undefined') {
                    humanObjects[objectKey] = object;
                }
                // compatible with new servers - the local world object gets discovered normally, just needs to finish initializing
                initializeHumanObject(object);
            }
        });
        
        realityEditor.gui.ar.draw.addUpdateListener(function(_visibleObjects) {
            if (!humanObjectInitialized || globalStates.freezeButtonState) { return; }

            // update the human object to match the camera position each frame (if it exists)
            let humanObject = realityEditor.getObject(persistentClientId);
            if (!humanObject) { return; }

            let humanSceneNode = realityEditor.sceneGraph.getSceneNodeById(persistentClientId);
            let cameraNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.CAMERA);
            if (!humanSceneNode || !cameraNode) { return; }

            // humanSceneNode.setLocalMatrix(cameraNode.localMatrix);
            realityEditor.sceneGraph.moveSceneNodeToCamera(persistentClientId);
            
            console.log(realityEditor.sceneGraph.getWorldPosition(persistentClientId));
        });
    }
    
    function initializeHumanObject(_object) {
        console.log('todo: implement initializeHumanObject');
    }

    function addHumanObject(worldId, clientId) {
        let worldObject = realityEditor.getObject(worldId);
        if (!worldObject) { return; }

        var postUrl = 'http://' + worldObject.ip + ':' + realityEditor.network.getPort(worldObject) + '/';
        var params = new URLSearchParams({action: 'new', name: clientId, isWorld: null, isHuman: true});
        fetch(postUrl, {
            method: 'POST',
            body: params
        }).then(response => response.json())
          .then((data) => {
            console.log('added new human object', data);
            persistentClientId = data.id;
            window.localStorage.setItem('persistentClientId', persistentClientId);
            humanObjectInitialized = true;
        });
        return false;
    }

    function getHumanObjects() {
        return humanObjects;
    }

    exports.initService = initService;
    exports.getHumanObjects = getHumanObjects;

}(realityEditor.humanObjects));



