createNameSpace("realityEditor.humanPose");

(function(exports) {

    let network, draw, utils; // shortcuts to access realityEditor.humanPose._____

    let humanPoseObjects = {};
    let nameIdMap = {};

    function initService() {
        network = realityEditor.humanPose.network;
        draw = realityEditor.humanPose.draw;
        utils = realityEditor.humanPose.utils;

        console.log('init humanPose module', network, draw, utils);

        realityEditor.app.callbacks.subscribeToPoses((poseJoints) => {
            console.log('received pose joints', poseJoints);
            let pose = utils.makePoseFromJoints('device' + globalStates.tempUuid + '_pose1', poseJoints);
            let poseObjectName = utils.getPoseObjectName(pose);

            if (typeof nameIdMap[poseObjectName] === 'undefined') {
                tryCreatingObjectFromPose(pose, poseObjectName);
            } else {
                let objectId = nameIdMap[poseObjectName];
                if (humanPoseObjects[objectId]) {
                    tryUpdatingPoseObject(pose, humanPoseObjects[objectId]);
                }
            }
        });

        network.onHumanPoseObjectDiscovered((object, objectKey) => {
            handleDiscoveredObject(object, objectKey);
        });

        network.onHumanPoseObjectDeleted((objectKey) => {
            let objectToDelete = humanPoseObjects[objectKey];
            if (!objectToDelete) return;

            delete nameIdMap[objectToDelete.name];
            delete humanPoseObjects[objectKey];
        });
    }

    function tryUpdatingPoseObject(pose, humanPoseObject) {
        // update the object position to be the average of the pose.joints
        // update each of the tool's positions to be the position of the joint relative to the average
        console.log('try updating pose object', pose, humanPoseObject);

        pose.joints.forEach((jointInfo, index) => {
            let jointName = Object.keys(utils.JOINTS)[index];
            let frameId = Object.keys(humanPoseObject.frames).find(key => {
                return key.endsWith(jointName);
            });
            if (!frameId) {
                console.warn('couldn\'t find frame for joint ' + jointName + ' (' + index + ')');
                return;
            }
            const SCALE = 1000;
            // let jointFrame = humanPoseObject.frames[frameId];
            // set position of jointFrame
            let positionMatrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                jointInfo.x * SCALE, jointInfo.y * SCALE, jointInfo.z * SCALE, 1,
            ];
            let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(frameId);
            frameSceneNode.setLocalMatrix(positionMatrix); // this will broadcast it realtime, and sceneGraph will upload it every ~1 second for persistence

            // realityEditor.gui.ar.positioning.setPositionDataMatrix(jointFrame, positionMatrix, false);
            // realityEditor.network.realtime.broadcastUpdate(humanPoseObject.objectId, frameId, null, 'ar.matrix', sceneNode.localMatrix);
            // realityEditor.network.postVehiclePosition(jointFrame);
        });
    }

    let objectsInProgress = {};

    function tryCreatingObjectFromPose(pose, poseObjectName) {
        if (objectsInProgress[poseObjectName]) { return; }
        objectsInProgress[poseObjectName] = true;

        let worldObject = realityEditor.worldObjects.getBestWorldObject(); // subscribeToPoses only triggers after we localize within a world

        realityEditor.network.utilities.verifyObjectNameNotOnWorldServer(worldObject, poseObjectName, () => {
            network.addHumanPoseObject(worldObject.objectId, poseObjectName, (data) => {
                console.log('added new human pose object', data);
                nameIdMap[poseObjectName] = data.id;
                // myAvatarId = data.id;
                // connectionStatus.isMyAvatarCreated = true;
                // refreshStatusUI();
                delete objectsInProgress[poseObjectName];

            }, (err) => {
                console.warn('unable to add human pose object to server', err);
                delete objectsInProgress[poseObjectName];

            });
        }, () => {
            console.warn('human pose already exists on server');
            delete objectsInProgress[poseObjectName];

        });
    }

    // initialize the human pose object
    function handleDiscoveredObject(object, objectKey) {
        if (!utils.isHumanPoseObject(object)) { return; }
        if (typeof humanPoseObjects[objectKey] !== 'undefined') { return; }
        humanPoseObjects[objectKey] = object; // keep track of which human pose objects we've processed so far

        // TODO: subscribe to public data, etc
    }

    exports.initService = initService;

}(realityEditor.humanPose));
