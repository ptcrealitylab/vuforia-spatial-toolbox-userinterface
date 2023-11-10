import * as THREE from "../../thirdPartyCode/three/three.module.js";

createNameSpace("realityEditor.humanPose");

import * as network from './network.js'
import * as draw from './draw.js'
import * as utils from './utils.js'
import {JOINTS, JOINTS_V1_COUNT, JOINTS_V2_COUNT, JOINTS_PER_POSE} from "./constants.js";
import {Pose} from "./Pose.js";

(function(exports) {
    // Re-export submodules for use in legacy code
    exports.network = network;
    exports.draw = draw;
    exports.utils = utils;

    const MAX_FPS = 20;
    const IDLE_TIMEOUT_MS = 2000;

    let myHumanPoseId = null;  // objectId

    let humanPoseObjects = {};
    let nameIdMap = {};
    let lastRenderTime = Date.now();
    let lastUpdateTime = Date.now();
    let lastRenderedPoses = {};
    let inHistoryPlayback = false;

    function initService() {
        realityEditor.app.callbacks.subscribeToPoses((poseJoints, frameData) => {
            let pose = utils.makePoseData('device' + globalStates.tempUuid + '_pose1', poseJoints, frameData);
            let poseObjectName = utils.getPoseObjectName(pose);

            if (typeof nameIdMap[poseObjectName] === 'undefined') {
                //create new human object only if pose is detected
                if (pose.joints.length > 0) {    
                    tryCreatingObjectFromPose(poseObjectName);
                }
            } else {
                let objectId = nameIdMap[poseObjectName];
                if (humanPoseObjects[objectId]) {
                    tryUpdatingPoseObject(pose, humanPoseObjects[objectId]);
                }
            }
        });

        network.onHumanPoseObjectDiscovered((object, objectKey) => {
            handleDiscoveredHumanPose(object, objectKey);
        });

        network.onHumanPoseObjectDeleted((objectKey) => {
            let objectToDelete = humanPoseObjects[objectKey];
            if (!objectToDelete) return;

            delete nameIdMap[objectToDelete.name];
            delete humanPoseObjects[objectKey];
            // TODO: clean out live pose render instance for this object
        });

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            if (inHistoryPlayback) {
                return;
            }

            try {
                // main update runs at ~60 FPS, but we can save some compute by limiting the pose rendering FPS
                if (Date.now() - lastRenderTime < (1000.0 / MAX_FPS)) return;
                lastRenderTime = Date.now();

                if (lastRenderTime - lastUpdateTime > IDLE_TIMEOUT_MS) {
                    // Clear out all human pose renderers because we've
                    // received no updates from any of them
                    draw.renderLiveHumanPoseObjects([], Date.now());
                    lastUpdateTime = Date.now();
                    return;
                }

                // further reduce rendering redundant poses by only rendering pose data that has been updated
                let updatedHumanPoseObjects = [];
                for (const [id, obj] of Object.entries(humanPoseObjects)) {
                    let newPoseHash = utils.getPoseStringFromObject(obj);
                    if (typeof lastRenderedPoses[id] === 'undefined') {
                        updatedHumanPoseObjects.push(obj);
                        lastRenderedPoses[id] = newPoseHash;
                    }
                    else {
                        if (newPoseHash !== lastRenderedPoses[id]) {
                            updatedHumanPoseObjects.push(obj);
                            lastRenderedPoses[id] = newPoseHash;
                        }
                    }
                }
                if (updatedHumanPoseObjects.length == 0) return;

                lastUpdateTime = Date.now();

                draw.renderLiveHumanPoseObjects(updatedHumanPoseObjects, Date.now());

            } catch (e) {
                console.warn('error in renderLiveHumanPoseObjects', e);
            }
        });
    }

    function applyDiffRecur(objects, diff) {
        let diffKeys = Object.keys(diff);
        for (let key of diffKeys) {
            if (diff[key] === null) {
                continue; // JSON encodes undefined as null so just skip (problem if we try to encode null)
            }
            if (typeof diff[key] === 'object' && objects.hasOwnProperty(key)) {
                applyDiffRecur(objects[key], diff[key]);
                continue;
            }
            objects[key] = diff[key];
        }
    }

    function applyDiff(objects, diff) {
        applyDiffRecur(objects, diff);
    }

    /**
     * @param {TimeRegion} historyRegion
     * @param {Analytics} analytics
     */
    async function loadHistory(historyRegion, analytics) {
        if (!realityEditor.sceneGraph || !realityEditor.sceneGraph.getWorldId() || !realityEditor.device || !realityEditor.device.environment) {
            setTimeout(() => {
                loadHistory(historyRegion, analytics);
            }, 500);
            return;
        }
        if (!realityEditor.device.environment.isDesktop()) {
            return;
        }
        const regionStartTime = historyRegion.startTime;
        const regionEndTime = historyRegion.endTime;

        const worldObject = realityEditor.worldObjects.getBestWorldObject();
        const historyLogsUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/history/logs');
        let logs = [];
        for (let retry = 0; retry < 3; retry++) {
            try {
                const resLogs = await fetch(historyLogsUrl);
                logs = await resLogs.json();
                break;
            } catch (e) {
                console.error('Unable to load list of history logs', e);
            }
        }

        for (const logName of logs) {
            let matches = logName.match(/objects_(\d+)-(\d+)/);
            if (!matches) {
                continue;
            }
            let logStartTime = parseInt(matches[1]);
            let logEndTime = parseInt(matches[2]);
            if (isNaN(logStartTime) || isNaN(logEndTime)) {
                continue;
            }
            if (logEndTime < regionStartTime) {
                continue;
            }
            if (logStartTime > regionEndTime && regionEndTime >= 0) {
                continue;
            }
            let log;
            for (let retry = 0; retry < 3; retry++) {
                try {
                    const resLog = await fetch(`${historyLogsUrl}/${logName}`);
                    log = await resLog.json();
                    break;
                } catch (e) {
                    console.error('Unable to fetch history log', `${historyLogsUrl}/${logName}`, e);
                }
            }
            if (log) {
                await replayHistory(log, analytics);
            } else {
                console.error('Unable to load history log after retries', `${historyLogsUrl}/${logName}`);
            }
        }

        analytics.humanPoseAnalyzer.markHistoricalColorNeedsUpdate();
    }

    async function replayHistory(history, analytics) {
        inHistoryPlayback = true;
        const timeObjects = {};
        const timestampStrings = Object.keys(history);
        const poses = [];
        const mostRecentPoseByObjectId = {};
        timestampStrings.forEach(timestampString => {
            let historyEntry = history[timestampString];
            let objectNames = Object.keys(historyEntry);
            let presentHumanNames = objectNames.filter(name => name.startsWith('_HUMAN_'));
            applyDiff(timeObjects, historyEntry);
            if (presentHumanNames.length === 0) {
                return;
            }
            for (let objectName of presentHumanNames) {
                const poseObject = timeObjects[objectName];
                let groundPlaneRelativeMatrix = utils.getGroundPlaneRelativeMatrix();
                let jointPositions = {};
                let jointConfidences = {};
                if (poseObject.matrix && poseObject.matrix.length > 0) {
                    let objectRootMatrix = new THREE.Matrix4();
                    utils.setMatrixFromArray(objectRootMatrix, poseObject.matrix);
                    groundPlaneRelativeMatrix.multiply(objectRootMatrix);
                }
                
                for (let jointId of Object.values(JOINTS)) {
                    let frame = poseObject.frames[poseObject.objectId + jointId];
                    if (!frame || !frame.ar.matrix) {
                        continue;
                    }
                    // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
                    let jointMatrixThree = new THREE.Matrix4();
                    utils.setMatrixFromArray(jointMatrixThree, frame.ar.matrix);
                    jointMatrixThree.premultiply(groundPlaneRelativeMatrix);
                    let jointPosition = new THREE.Vector3();
                    jointPosition.setFromMatrixPosition(jointMatrixThree);
                    jointPositions[jointId] = jointPosition;

                    let keys = utils.getJointNodeInfo(poseObject, jointId);
                    // zero confidence if node's public data are not available
                    let confidence = 0.0;
                    if (keys) {
                        const node = poseObject.frames[keys.frameKey].nodes[keys.nodeKey];
                        if (node && node.publicData[utils.JOINT_PUBLIC_DATA_KEYS.data].confidence !== undefined) {
                            confidence = node.publicData[utils.JOINT_PUBLIC_DATA_KEYS.data].confidence;
                        }
                    }
                    jointConfidences[jointId] = confidence;
                }
                let length = Object.keys(jointPositions).length;
                if (length === 0) {
                    return;
                }
                if (length !== JOINTS_PER_POSE) {
                    if (length == JOINTS_V1_COUNT || length == JOINTS_V2_COUNT) {
                        utils.convertFromJointsV1(jointPositions, jointConfidences);
                    }
                    else {
                        console.error('Unknown joint schema of a recorded pose.');
                        return;
                    }
                }

                const identifier = `historical-${poseObject.objectId}`; // This is necessary to distinguish between data recorded live and by a tool at the same time
                const pose = new Pose(jointPositions, jointConfidences, parseInt(timestampString), {
                    poseObjectId: identifier,
                    poseHasParent: poseObject.parent && (poseObject.parent !== 'none'),
                });
                pose.metadata.previousPose = mostRecentPoseByObjectId[poseObject.objectId];
                mostRecentPoseByObjectId[poseObject.objectId] = pose;
                poses.push(pose);
            }
        });
        analytics.bulkRenderHistoricalPoses(poses);
        inHistoryPlayback = false;
    }

    /**
     * @param {Array<{x: number, y: number, z: number, confidence: number}>} input joints
     * @return {{x: number, y: number, z: number, confidence: number}} average attributes of all
     *         input joints
     */
    function averageJoints(joints) {
        let avg = { x: 0, y: 0, z: 0, confidence: 0 };
        for (let joint of joints) {
            avg.x += joint.x;
            avg.y += joint.y;
            avg.z += joint.z;
            avg.confidence += joint.confidence;
        }
        avg.x /= joints.length;
        avg.y /= joints.length;
        avg.z /= joints.length;
        avg.confidence /= joints.length;
        return avg;
    }

    /**
     * @param {Array<{x: number, y: number, z: number, confidence: number}>} joints - all joints
     * @param {Array<string>} jointNames - selected joint names
     * @return {Array<{x: number, y: number, z: number, confidence: number}>} selected joints
     */
    function extractJoints(joints, jointNames) {
        let arr = [];
        for (let name of jointNames) {
            let index = Object.values(JOINTS).indexOf(name);
            arr.push(joints[index]);
        }
        return arr;
    }
    
    /** Extends original tracked set of joints with derived synthetic joints 
     * @param {Object} pose - 23 real joints 
     */
    function addSyntheticJoints(pose) {
        
        if (pose.joints.length <= 0) {
            // if no pose is detected, cannot add
            return; 
        }

        // head
        pose.joints.push(averageJoints(extractJoints(pose.joints, [
            JOINTS.LEFT_EAR,
            JOINTS.RIGHT_EAR,
        ])));
        // neck
        pose.joints.push(averageJoints(extractJoints(pose.joints, [
            JOINTS.LEFT_SHOULDER,
            JOINTS.RIGHT_SHOULDER,
        ])));
        // chest 
        pose.joints.push(averageJoints(extractJoints(pose.joints, [
            JOINTS.LEFT_SHOULDER,
            JOINTS.RIGHT_SHOULDER,
            JOINTS.LEFT_SHOULDER,
            JOINTS.RIGHT_SHOULDER,
            JOINTS.LEFT_HIP,
            JOINTS.RIGHT_HIP,
        ])));
        // navel
        pose.joints.push(averageJoints(extractJoints(pose.joints, [
            JOINTS.LEFT_SHOULDER,
            JOINTS.RIGHT_SHOULDER,
            JOINTS.LEFT_HIP,
            JOINTS.RIGHT_HIP,
            JOINTS.LEFT_HIP,
            JOINTS.RIGHT_HIP,
        ])));
        // pelvis
        pose.joints.push(averageJoints(extractJoints(pose.joints, [
            JOINTS.LEFT_HIP,
            JOINTS.RIGHT_HIP,
        ])));
    }

    function updateObjectFromRawPose(humanPoseObject, pose) {

        if (pose.joints.length <= 0) {
            // if no pose is detected, don't update (even update timestamp)
            return; 
        }

        // store timestamp of update in the object (this is capture time of the image used to compute the pose in this update)
        humanPoseObject.lastUpdateDataTS = pose.timestamp;
        
        // update overall object position (currently defined by 1. joint - nose)
        var objPosition = {
            x: pose.joints[0].x,
            y: pose.joints[0].y,
            z: pose.joints[0].z
        };

        humanPoseObject.matrix = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            objPosition.x, objPosition.y, objPosition.z, 1
        ];
        
        // updating scene graph with new pose
        let objectSceneNode = realityEditor.sceneGraph.getSceneNodeById(humanPoseObject.objectId);
        objectSceneNode.dontBroadcastNext = true; // this will prevent broadcast of matrix to remote servers in the function call below
        objectSceneNode.setLocalMatrix(humanPoseObject.matrix);
        
        // update relative positions of all joints/frames wrt. object positions
        pose.joints.forEach((jointInfo, index) => {
            let jointName = Object.values(JOINTS)[index];
            let frameId = Object.keys(humanPoseObject.frames).find(key => {
                return key.endsWith(jointName);
            });
            if (!frameId) {
                console.warn('couldn\'t find frame for joint ' + jointName + ' (' + index + ')');
                return;
            }

            // set position of jointFrame
            let positionMatrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                jointInfo.x - objPosition.x, jointInfo.y - objPosition.y, jointInfo.z - objPosition.z, 1,
            ];

            // updating scene graph with new pose
            let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(frameId);
            frameSceneNode.dontBroadcastNext = true; // this will prevent broadcast of matrix to remote servers in the function call below
            frameSceneNode.setLocalMatrix(positionMatrix); 
            
            // updating a node data of tool/frame of a joint
            let keys = utils.getJointNodeInfo(humanPoseObject, jointName);
            if (keys) {
                let node = realityEditor.getNode(keys.objectKey, keys.frameKey, keys.nodeKey);
                if (node) {
                    node.publicData[utils.JOINT_PUBLIC_DATA_KEYS.data] = { confidence: jointInfo.confidence };
                }
            }
        });

    }

    function tryUpdatingPoseObject(pose, humanPoseObject) {
        
        //console.log('try updating pose object', pose, humanPoseObject);

        addSyntheticJoints(pose);

        // update local instance of HumanPoseObject with new pose data 
        updateObjectFromRawPose(humanPoseObject, pose);

        // updating a 'transfer' node data of selected joint (the first one at the moment). 
        // This public data contain the whole pose (joint 3D positions and confidences) to transfer in one go to servers 
        let keys = utils.getJointNodeInfo(humanPoseObject, JOINTS.NOSE);
        if (keys) {
            realityEditor.network.realtime.writePublicData(keys.objectKey, keys.frameKey, keys.nodeKey, utils.JOINT_PUBLIC_DATA_KEYS.transferData, pose);
        }

    }

    let objectsInProgress = {};

    function tryCreatingObjectFromPose(poseObjectName) {

        if (objectsInProgress[poseObjectName]) { return; }
        objectsInProgress[poseObjectName] = true;

        let worldObject = realityEditor.worldObjects.getBestWorldObject(); // subscribeToPoses only triggers after we localize within a world

        realityEditor.network.utilities.verifyObjectNameNotOnWorldServer(worldObject, poseObjectName, () => {
            network.addHumanPoseObject(worldObject.objectId, poseObjectName, (data) => {
                nameIdMap[poseObjectName] = data.id;
                myHumanPoseId = data.id;
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
    function handleDiscoveredHumanPose(object, objectKey) {
        if (!utils.isHumanPoseObject(object)) { return; }
        if (typeof humanPoseObjects[objectKey] !== 'undefined') { return; }
        humanPoseObjects[objectKey] = object; // keep track of which human pose objects we've processed so far


        if (objectKey === myHumanPoseId) {
            // no action for now
        } else {
            // subscribe to public data of a selected joint node in remote HumanPoseObject which transfers whole pose
            let keys = utils.getJointNodeInfo(object, JOINTS.NOSE);
            if (!keys) { return; }

            let subscriptionCallback = (msgContent) => {
                // update public data of node in local human pose object
                let node = realityEditor.getNode(msgContent.object, msgContent.frame, msgContent.node);
                if (!node) { 
                    console.warn('couldn\'t find the node ' + msgContent.node + ' which stores whole pose data');
                    return; 
                }
                // MK TODO: is it necessary to store all transfered data into the node of local object? on top of updateObjectFromRawPose below?
                node.publicData[utils.JOINT_PUBLIC_DATA_KEYS.transferData] = msgContent.publicData[utils.JOINT_PUBLIC_DATA_KEYS.transferData];

                let object = realityEditor.getObject(msgContent.object)
                if (!object) { 
                    console.warn('couldn\'t find the human pose object ' + msgContent.object);
                    return; 
                }

                // update local instance of HumanPoseObject with new pose data transferred through a selected node
                updateObjectFromRawPose(object, node.publicData[utils.JOINT_PUBLIC_DATA_KEYS.transferData]);
            }
        
            realityEditor.network.realtime.subscribeToPublicData(keys.objectKey, keys.frameKey, keys.nodeKey, utils.JOINT_PUBLIC_DATA_KEYS.transferData, (msg) => {
                subscriptionCallback(JSON.parse(msg));
            });
        }
    }

    function deleteLocalHumanObjects() {
        myHumanPoseId = null;
    
        for (let objectId of Object.values(nameIdMap)) {
            delete humanPoseObjects[objectId];
            delete realityEditor.objects[objectId];
        }
        nameIdMap = {}
    }

    exports.initService = initService;
    exports.loadHistory = loadHistory;
    exports.deleteLocalHumanObjects = deleteLocalHumanObjects;

}(realityEditor.humanPose));

export const initService = realityEditor.humanPose.initService;
export const loadHistory = realityEditor.humanPose.loadHistory;
