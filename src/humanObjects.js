createNameSpace("realityEditor.humanObjects");

/**
 * @fileOverview realityEditor.humanObjects
 * When the app successfully localizes within a world, checks if this device has a "human" representation saved on that
 * world object's server. If not, create one. Continuously updates this object's position in the scene graph to match
 * the camera position, and broadcasts that position over the realtime sockets.
 */

(function(exports) {

    let persistentClientId = window.localStorage.getItem('persistentClientId') || globalStates.defaultClientName + globalStates.tempUuid;
    let humanObjectInitialized = false;
    var humanObjects = {}; // human objects are stored in the regular global "objects" variable, but also in here

    /**
     * Init human object module
     */
    function initService() {
        console.log('initService: humanObjects');

        realityEditor.worldObjects.onLocalizedWithinWorld(function(objectKey) {
            if (objectKey === realityEditor.worldObjects.getLocalWorldId()) {
                return; // skip local world
            }

            console.log('humanObjects module onLocalizedWithinWorld: ' + objectKey);

            // check if humanObject for this device exists on server?
            let worldObject = realityEditor.getObject(objectKey);
            let downloadUrl = 'http://' + worldObject.ip + ':' + realityEditor.network.getPort(worldObject) + '/object/' + persistentClientId;

            realityEditor.network.getData(null,  null, null, downloadUrl, function (_objectKey, _frameKey, _nodeKey, msg) {
                if (msg) {
                    console.log('found humanObject', msg);
                    humanObjectInitialized = true;
                } else {
                    console.log('cant find humanObject - try creating it');
                    // the name of the object will be (defaultClientName + a random uuid string added by the server)
                    addHumanObject(objectKey, globalStates.defaultClientName);
                }
            });

        });

        // when an object is detected, check if we need to add a world object for its server
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            if (object.type === 'human') {
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

            // place it in front of the camera, facing towards the camera
            let distanceInFrontOfCamera = 0;

            let initialVehicleMatrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, -1 * distanceInFrontOfCamera, 1
            ];

            // let additionalRotation = realityEditor.device.environment.getInitialPocketToolRotation();
            // if (additionalRotation) {
            //     let temp = [];
            //     realityEditor.gui.ar.utilities.multiplyMatrix(additionalRotation, initialVehicleMatrix, temp);
            //     initialVehicleMatrix = temp;
            // }
            //
            // // needs to be flipped in some environments with different camera systems
            // if (realityEditor.device.environment.isCameraOrientationFlipped()) {
            //     initialVehicleMatrix[0] *= -1;
            //     initialVehicleMatrix[5] *= -1;
            //     initialVehicleMatrix[10] *= -1;
            // }

            humanSceneNode.setPositionRelativeTo(cameraNode, initialVehicleMatrix);
            humanSceneNode.updateWorldMatrix();

            let dontBroadcast = false;
            if (!dontBroadcast) {

                // if it's an object, post object position relative to a world object
                let worldObjectId = realityEditor.sceneGraph.getWorldId();
                let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
                let relativeMatrix = humanSceneNode.getMatrixRelativeTo(worldNode);
                realityEditor.network.realtime.broadcastUpdate(persistentClientId, null, null, 'matrix', relativeMatrix);
            }
        });
    }

    function initializeHumanObject(_object) {
        console.log('todo: implement initializeHumanObject');
    }

    /**
     * Tell the server (corresponding to this world object) to create a new human object with the specified ID
     * @param {string} worldId
     * @param {string} clientId
     * @return {boolean}
     */
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
