createNameSpace("realityEditor.avatarObjects");

/**
 * @fileOverview realityEditor.avatarObjects
 * When the app successfully localizes within a world, checks if this device has a "avatar" representation saved on that
 * world object's server. If not, create one. Continuously updates this object's position in the scene graph to match
 * the camera position, and broadcasts that position over the realtime sockets.
 */

(function(exports) {

    const idPrefix = '_AVATAR_'
    let initializedId = null;
    let myAvatarObject = null;
    let avatarObjectInitialized = false;
    var avatarObjects = {}; // avatar objects are stored in the regular global "objects" variable, but also in here

    /**
     * Init avatar object module
     */
    function initService() {
        console.log('initService: avatar objects');

        realityEditor.worldObjects.onLocalizedWithinWorld(function(worldObjectKey) {
            if (worldObjectKey === realityEditor.worldObjects.getLocalWorldId()) {
                return; // skip local world
            }

            console.log('avatarObjects module onLocalizedWithinWorld: ' + worldObjectKey);

            let thisAvatarName = getAvatarName();

            // check if avatarObject for this device exists on server?
            let worldObject = realityEditor.getObject(worldObjectKey);
            let downloadUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/object/' + thisAvatarName);

            realityEditor.network.getData(null,  null, null, downloadUrl, function (_objectKey, _frameKey, _nodeKey, msg) {
                if (msg) {
                    console.log('found avatarObject', msg);
                    avatarObjectInitialized = true;
                } else {
                    console.log('cant find avatarObject - try creating it');
                    addAvatarObject(worldObjectKey, thisAvatarName);
                }
            });

        });

        // when an object is detected, check if we need to add a world object for its server
        realityEditor.network.addObjectDiscoveredCallback(function(object, objectKey) {
            console.log('avatar: handling newly loaded object');
            handleDiscoveredObject(object, objectKey);
        });

        for (let [key, object] of Object.entries(objects)) {
            console.log('avatar: handling previously loaded object');
            handleDiscoveredObject(object, key);
        }

        function handleDiscoveredObject(object, objectKey) {
            if (object.type === 'avatar') {
                // add to the internal world objects
                if (typeof avatarObjects[objectKey] === 'undefined') {
                    avatarObjects[objectKey] = object;
                    // TODO: further initialize discovered avatar objects?

                    if (objectKey === initializedId) {
                        myAvatarObject = object;
                        onMyAvatarInitialized();
                    } else {
                        onOtherAvatarInitialized(object);
                    }
                }
            }
        }

        realityEditor.gui.ar.draw.addUpdateListener(function(_visibleObjects) {
            if (!avatarObjectInitialized || globalStates.freezeButtonState) { return; }

            // update the avatar object to match the camera position each frame (if it exists)
            let avatarObject = realityEditor.getObject(initializedId);
            if (!avatarObject) { return; }

            let avatarSceneNode = realityEditor.sceneGraph.getSceneNodeById(initializedId);
            let cameraNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.CAMERA);
            if (!avatarSceneNode || !cameraNode) { return; }

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

            avatarSceneNode.setPositionRelativeTo(cameraNode, initialVehicleMatrix);
            avatarSceneNode.updateWorldMatrix();
            // avatarSceneNode.needsUploadToServer = true;


            let worldObjectId = realityEditor.sceneGraph.getWorldId();
            let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
            let relativeMatrix = avatarSceneNode.getMatrixRelativeTo(worldNode);

            if (avatarObject.matrix.length !== 16) { avatarObject.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
            let totalDifference = sumOfElementDifferences(avatarObject.matrix, relativeMatrix);
            if (totalDifference < 0.00001) {
                return; // don't update if matrix hasn't really changed
            }

            // already gets uploaded to server but isn't set locally yet
            avatarObject.matrix = relativeMatrix;

            // console.log('avatar position = ' + avatarSceneNode.worldMatrix);

            // sceneGraph uploads it to server every 1 second via REST, but we can stream updates in realtime here
            let dontBroadcast = false;
            if (!dontBroadcast) {
                // if it's an object, post object position relative to a world object
                // let worldObjectId = realityEditor.sceneGraph.getWorldId();
                // let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
                // let relativeMatrix = avatarSceneNode.getMatrixRelativeTo(worldNode);
                realityEditor.network.realtime.broadcastUpdate(initializedId, null, null, 'matrix', relativeMatrix);
            }
        });
    }

    function sumOfElementDifferences(M1, M2) {
        // assumes M1 and M2 are of equal length
        let sum = 0;
        for (let i = 0; i < M1.length; i++) {
            sum += Math.abs(M1[i] - M2[i]);
        }
        return sum;
    }

    function getAvatarName() {
        return idPrefix + globalStates.tempUuid;
    }

    function onOtherAvatarInitialized(thatAvatarObject) {
        const TOOL_NAME = 'Avatar'; // these need to match the way the server intializes the tool and node
        const NODE_NAME = 'storage';

        let avatarObjectKey = thatAvatarObject.objectId;
        let avatarFrameKey = Object.keys(thatAvatarObject.frames).find(name => name.includes(TOOL_NAME));
        let thatAvatarTool = realityEditor.getFrame(avatarObjectKey, avatarFrameKey);
        let avatarNodeKey = Object.keys(thatAvatarTool.nodes).find(name => name.includes(NODE_NAME));

        console.log('subscribe to publicData from ' + avatarObjectKey);

        realityEditor.network.realtime.subscribeToPublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, 'touchState', (msg) => {
            let msgContent = JSON.parse(msg);
            console.log('avatarObjects.js received publicData', msgContent);
        });
    }

    function onMyAvatarInitialized() {
        console.log('add touch subscriptions to write screenX, screenY to publicData');

        const TOOL_NAME = 'Avatar'; // these need to match the way the server intializes the tool and node
        const NODE_NAME = 'storage';

        let avatarObjectKey = myAvatarObject.objectId;
        let avatarFrameKey = Object.keys(myAvatarObject.frames).find(name => name.includes(TOOL_NAME));
        let myAvatarTool = realityEditor.getFrame(avatarObjectKey, avatarFrameKey);
        let avatarNodeKey = Object.keys(myAvatarTool.nodes).find(name => name.includes(NODE_NAME));

        let isPointerDown = false;
        document.body.addEventListener('pointerdown', (e) => {
            console.log('document.body.pointerdown', e.pageX, e.pageY);
            isPointerDown = true;

            let touchState = {
                isPointerDown: isPointerDown,
                screenX: e.pageX,
                screenY: e.pageY
            }

            realityEditor.network.realtime.writePublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, 'touchState', touchState);
        });

        let pointerUpHandler = (e) => {
            console.log('document.body.pointerup', e.pageX, e.pageY);
            isPointerDown = false;

            let touchState = {
                isPointerDown: isPointerDown,
                screenX: e.pageX,
                screenY: e.pageY
            }

            realityEditor.network.realtime.writePublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, 'touchState', touchState);
        }
        document.body.addEventListener('pointerup', pointerUpHandler);
        document.body.addEventListener('pointercancel', pointerUpHandler);
        document.body.addEventListener('pointerleave', pointerUpHandler);

        document.body.addEventListener('pointermove', (e) => {
            if (!isPointerDown) { return; }
            console.log('document.body.pointermove', e.pageX, e.pageY);

            let touchState = {
                isPointerDown: isPointerDown,
                screenX: e.pageX,
                screenY: e.pageY
            }

            realityEditor.network.realtime.writePublicData(avatarObjectKey, avatarFrameKey, avatarNodeKey, 'touchState', touchState);
        });
    }

    /**
     * Tell the server (corresponding to this world object) to create a new avatar object with the specified ID
     * @param {string} worldId
     * @param {string} clientId
     * @return {boolean}
     */
    function addAvatarObject(worldId, clientId) {
        let worldObject = realityEditor.getObject(worldId);
        if (!worldObject) { return; }

        let postUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/');
        let params = new URLSearchParams({action: 'new', name: clientId, isAvatar: true, worldId: worldId});
        fetch(postUrl, {
            method: 'POST',
            body: params
        }).then(response => response.json())
            .then((data) => {
                console.log('added new avatar object', data);
                initializedId = data.id;
                avatarObjectInitialized = true;
            });
        return false;
    }

    function getAvatarObjects() {
        return avatarObjects;
    }

    exports.initService = initService;
    exports.getAvatarObjects = getAvatarObjects;

}(realityEditor.avatarObjects));
