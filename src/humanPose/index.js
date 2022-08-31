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

        realityEditor.app.callbacks.subscribeToPoses((pose) => {
            console.log('received pose', pose);

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
    }

    function tryUpdatingPoseObject(pose, humanPoseObject) {
        // update the object position to be the average of the pose.joints
        // update each of the tool's positions to be the position of the joint relative to the average
        console.log('try updating pose object', pose, humanPoseObject);

        pose.joints.forEach((jointInfo, index) => {
            let jointName = utils.JOINT_SCHEMA.jointIndices[index];
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

    function tryCreatingObjectFromPose(pose, poseObjectName) {
        let worldObject = realityEditor.worldObjects.getBestWorldObject(); // subscribeToPoses only triggers after we localize within a world

        realityEditor.network.utilities.verifyObjectNameNotOnWorldServer(worldObject, poseObjectName, () => {
            network.addHumanPoseObject(worldObject.objectId, poseObjectName, (data) => {
                console.log('added new human pose object', data);
                nameIdMap[poseObjectName] = data.id;
                // myAvatarId = data.id;
                // connectionStatus.isMyAvatarCreated = true;
                // refreshStatusUI();
            }, (err) => {
                console.warn('unable to add avatar object to server', err);
            });
        }, () => {
            console.warn('avatar already exists on server');
        });
    }

    // initialize the avatar object representing my own device, and those representing other devices
    function handleDiscoveredObject(object, objectKey) {
        if (!utils.isHumanPoseObject(object)) { return; }
        if (typeof humanPoseObjects[objectKey] !== 'undefined') { return; }
        humanPoseObjects[objectKey] = object; // keep track of which avatar objects we've processed so far

        // TODO: subscribe to public data, etc
    }

    exports.initService = initService;

}(realityEditor.humanPose));
