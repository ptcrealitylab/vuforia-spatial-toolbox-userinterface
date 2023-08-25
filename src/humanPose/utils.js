import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {
    SCALE,
    JOINTS,
    JOINT_CONNECTIONS, 
    JOINT_RADIUS,
    BONE_RADIUS
} from './constants.js';

const HUMAN_POSE_ID_PREFIX = '_HUMAN_';

const JOINT_NODE_NAME = 'storage';
const JOINT_PUBLIC_DATA_KEYS = {
    data: 'data',
    transferData: 'whole_pose'
};

// other modules in the project can use this to reliably check whether an object is a humanPose object
function isHumanPoseObject(object) {
    if (!object) { return false; }
    return object.type === 'human' || object.objectId.indexOf(HUMAN_POSE_ID_PREFIX) === 0;
}

function makePoseData(name, poseJoints, frameData) {
    return {
        name: name,
        joints: poseJoints,
        timestamp: frameData.timestamp,
        imageSize: frameData.imageSize,
        focalLength: frameData.focalLength,
        principalPoint: frameData.principalPoint,
        transformW2C: frameData.transformW2C
    }
}

function getPoseObjectName(pose) {
    return HUMAN_POSE_ID_PREFIX + pose.name;
}

function getPoseStringFromObject(poseObject) {
    let jointPositions = Object.keys(poseObject.frames).map(jointFrameId => realityEditor.sceneGraph.getWorldPosition(jointFrameId));
    return jointPositions.map(position => positionToRoundedString(position)).join()
}

function positionToRoundedString(position) {
    return 'x' + position.x.toFixed(0) + 'y' + position.y.toFixed(0) + 'z' + position.z.toFixed(0);
}

// a single piece of pose test data saved from a previous session
/*
function getMockPoseStandingFarAway() {
    let joints = JSON.parse(
        "[{\"x\":-0.7552632972083383,\"y\":0.2644442929211472,\"z\":0.7913752977850149},{\"x\":-0.7845470806021233,\"y\":0.2421982759192687,\"z\":0.8088129628325323},{\"x\":-0.7702630884492285,\"y\":0.3001014048608925,\"z\":0.7688086082955945},{\"x\":-0.8222937248161452,\"y\":0.24623275325440866,\"z\":0.9550474860100973},{\"x\":-0.7833413553528865,\"y\":0.3678937178976209,\"z\":0.8505136192483953},{\"x\":-0.6329333926426419,\"y\":0.12993628611940003,\"z\":1.003037519866321},{\"x\":-0.5857144750949138,\"y\":0.4589454778216688,\"z\":0.8355459885338103},{\"x\":-0.3674280483465843,\"y\":-0.015621332976114535,\"z\":1.0097465238602046},{\"x\":-0.3089154169856956,\"y\":0.5132346709005703,\"z\":0.7849136963889392},{\"x\":-0.1927517400895856,\"y\":-0.17818293753755024,\"z\":0.9756865047079787},{\"x\":-0.16714735686176868,\"y\":0.5735810435150129,\"z\":0.6760789908531224},{\"x\":-0.1250018136428199,\"y\":-0.3687589763164842,\"z\":-0.9344674156160389},{\"x\":-0.12229286355074954,\"y\":-0.3292508923208693,\"z\":-0.8945665731201982},{\"x\":-0.10352244950174398,\"y\":-0.382806122564826,\"z\":-0.9740523344761574},{\"x\":-0.09227820167479968,\"y\":-0.34637551009676415,\"z\":-0.9339987027591811},{\"x\":-0.09457788170460725,\"y\":-0.3891481311166776,\"z\":-0.9955435991385165},{\"x\":-0.07832232108450882,\"y\":-0.35210246362115816,\"z\":-0.957316956868217}]"
    );
    return joints;
}
*/

// compute the index of the minimum element of the array
function indexOfMin(arr) {
    if (arr.length === 0) return -1;
    let min = arr[0];
    let minIndex = 0;
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < min) {
            minIndex = i;
            min = arr[i];
        }
    }
    return minIndex;
}

// returns the {objectKey, frameKey, nodeKey} address of the storeData node on this object
function getJointNodeInfo(humanObject, jointIndex) {
    if (!humanObject) { return null; }

    let humanObjectKey = humanObject.objectId;
    let jointName = Object.values(JOINTS)[jointIndex];
    let humanFrameKey = Object.keys(humanObject.frames).find(name => name.includes(jointName));
    if (!humanObject.frames || !humanFrameKey) { return null; }
    let humanNodeKey = Object.keys(humanObject.frames[humanFrameKey].nodes).find(name => name.includes(JOINT_NODE_NAME));
    if (!humanNodeKey) { return null; }
    return {
        objectKey: humanObjectKey,
        frameKey: humanFrameKey,
        nodeKey: humanNodeKey
    }
}

function getDummyJointMatrix(jointId) {
    const matrix = new THREE.Matrix4();
    switch (jointId) {
        case JOINTS.NOSE:
            matrix.setPosition(0, 0, 0.1 * SCALE);
            return matrix;
        case JOINTS.LEFT_EYE:
            matrix.setPosition(-0.05 * SCALE, 0.05 * SCALE, 0.075 * SCALE);
            return matrix;
        case JOINTS.RIGHT_EYE:
            matrix.setPosition(0.05 * SCALE, 0.05 * SCALE, 0.075 * SCALE);
            return matrix;
        case JOINTS.LEFT_EAR:
            matrix.setPosition(-0.1 * SCALE, 0, 0);
            return matrix;
        case JOINTS.RIGHT_EAR:
            matrix.setPosition(0.1 * SCALE, 0, 0);
            return matrix;
        case JOINTS.LEFT_SHOULDER:
            matrix.setPosition(-0.25 * SCALE, -0.2 * SCALE, 0);
            return matrix;
        case JOINTS.RIGHT_SHOULDER:
            matrix.setPosition(0.25 * SCALE, -0.2 * SCALE, 0);
            return matrix;
        case JOINTS.LEFT_ELBOW:
            matrix.setPosition(-0.3 * SCALE, -0.6 * SCALE, 0);
            return matrix;
        case JOINTS.RIGHT_ELBOW:
            matrix.setPosition(0.3 * SCALE, -0.6 * SCALE, 0);
            return matrix;
        case JOINTS.LEFT_WRIST:
            matrix.setPosition(-0.3 * SCALE, -0.9 * SCALE, 0);
            return matrix;
        case JOINTS.RIGHT_WRIST:
            matrix.setPosition(0.3 * SCALE, -0.9 * SCALE, 0);
            return matrix;
        case JOINTS.LEFT_HIP:
            matrix.setPosition(-0.175 * SCALE, -0.8 * SCALE, 0);
            return matrix;
        case JOINTS.RIGHT_HIP:
            matrix.setPosition(0.175 * SCALE, -0.8 * SCALE, 0);
            return matrix;
        case JOINTS.LEFT_KNEE:
            matrix.setPosition(-0.2 * SCALE, -1.15 * SCALE, 0);
            return matrix;
        case JOINTS.RIGHT_KNEE:
            matrix.setPosition(0.2 * SCALE, -1.15 * SCALE, 0);
            return matrix;
        case JOINTS.LEFT_ANKLE:
            matrix.setPosition(-0.2 * SCALE, -1.6 * SCALE, 0);
            return matrix;
        case JOINTS.RIGHT_ANKLE:
            matrix.setPosition(0.2 * SCALE, -1.6 * SCALE, 0);
            return matrix;
        case JOINTS.LEFT_PINKY:
            matrix.setPosition(-0.3 * SCALE, -1.0 * SCALE, -0.04 * SCALE);
            return matrix;
        case JOINTS.RIGHT_PINKY:
            matrix.setPosition(0.3 * SCALE, -1.0 * SCALE, -0.04 * SCALE);
            return matrix;
        case JOINTS.LEFT_INDEX:
            matrix.setPosition(-0.3 * SCALE, -1.0 * SCALE, 0);
            return matrix;
        case JOINTS.RIGHT_INDEX:
            matrix.setPosition(0.3 * SCALE, -1.0 * SCALE, 0);
            return matrix;
        case JOINTS.LEFT_THUMB:
            matrix.setPosition(-0.3 * SCALE, -0.95 * SCALE, 0.04 * SCALE);
            return matrix;
        case JOINTS.RIGHT_THUMB:
            matrix.setPosition(0.3 * SCALE, -0.95 * SCALE, 0.04 * SCALE);
            return matrix;
        case JOINTS.HEAD:
            return matrix;
        case JOINTS.NECK:
            matrix.setPosition(0, -0.2 * SCALE, 0);
            return matrix;
        case JOINTS.CHEST:
            matrix.setPosition(0, -0.4 * SCALE, 0);
            return matrix;
        case JOINTS.NAVEL:
            matrix.setPosition(0, -0.6 * SCALE, 0);
            return matrix;
        case JOINTS.PELVIS:
            matrix.setPosition(0, -0.8 * SCALE, 0);
            return matrix;
        default:
            console.error(`Cannot create dummy joint for joint ${jointId}, not implemented`)
            return matrix;
    }
}

function getDummyBoneMatrix(bone) {
    const matrix = new THREE.Matrix4();
    let jointA = new THREE.Vector3().setFromMatrixPosition(getDummyJointMatrix(bone[0]));
    let jointB = new THREE.Vector3().setFromMatrixPosition(getDummyJointMatrix(bone[1]));

    let pos = new THREE.Vector3(
        (jointA.x + jointB.x) / 2,
        (jointA.y + jointB.y) / 2,
        (jointA.z + jointB.z) / 2,
    );

    let diff = new THREE.Vector3(jointB.x - jointA.x, jointB.y - jointA.y,
        jointB.z - jointA.z);
    let scale = new THREE.Vector3(1, diff.length() / SCALE, 1);
    diff.normalize();

    let rot = new THREE.Quaternion();
    rot.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
        diff);
    
    matrix.compose(pos, rot, scale);
    
    return matrix;
}

function createDummySkeleton() {
    const dummySkeleton = new THREE.Group();
    
    dummySkeleton.joints = {};
    const jointGeometry = new THREE.SphereGeometry(JOINT_RADIUS * SCALE, 12, 12);
    const material = new THREE.MeshLambertMaterial();
    dummySkeleton.jointInstancedMesh = new THREE.InstancedMesh(jointGeometry, material, Object.values(JOINTS).length);
    Object.values(JOINTS).forEach((jointId, i) => {
        dummySkeleton.joints[jointId] = i;
        dummySkeleton.jointInstancedMesh.setMatrixAt(i, getDummyJointMatrix(jointId));
    });

    const boneGeometry = new THREE.CylinderGeometry(BONE_RADIUS * SCALE, BONE_RADIUS * SCALE, SCALE, 3);
    dummySkeleton.boneInstancedMesh = new THREE.InstancedMesh(boneGeometry, material, Object.values(JOINT_CONNECTIONS).length);
    Object.values(JOINT_CONNECTIONS).forEach((bone, i) => {
        dummySkeleton.boneInstancedMesh.setMatrixAt(i, getDummyBoneMatrix(bone));
    });

    dummySkeleton.add(dummySkeleton.jointInstancedMesh);
    dummySkeleton.add(dummySkeleton.boneInstancedMesh);
    
    dummySkeleton.jointNameFromIndex = (index) => {
        return Object.keys(dummySkeleton.joints).find(key => dummySkeleton.joints[key] === index);
    }

    dummySkeleton.jointInstancedMesh.joints = dummySkeleton.joints;
    return dummySkeleton;
}

/**
 * Helper function to get the matrix of the ground plane relative to the world
 * @return {Matrix4} - the matrix of the ground plane relative to the world
 */
function getGroundPlaneRelativeMatrix() {
    let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
    let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
    let groundPlaneRelativeMatrix = new THREE.Matrix4();
    setMatrixFromArray(groundPlaneRelativeMatrix, worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode));
    return groundPlaneRelativeMatrix;
}

/**
 * Helper function to set a matrix from an array
 * @param {THREE.Matrix4} matrix - the matrix to set
 * @param {number[]} array - the array to set the matrix from
 */
function setMatrixFromArray(matrix, array) {
    matrix.set( array[0], array[4], array[8], array[12],
        array[1], array[5], array[9], array[13],
        array[2], array[6], array[10], array[14],
        array[3], array[7], array[11], array[15]
    );
}

/**
 * Converts joint positions and confidences from schema JOINTS_V1 to the current JOINTS schema
 * @param {Object.<string, THREE.Vector3>} jointPositions - dictionary of positions (in/out param) 
 * @param {Object.<string, number>} jointConfidences - dictionary of confidences (in/out param)
 */
function convertFromJointsV1(jointPositions, jointConfidences) {

    // expand with hand joints which positions are collapsed to wrist joint
    jointPositions[JOINTS.LEFT_PINKY] = jointPositions[JOINTS.LEFT_WRIST];
    jointPositions[JOINTS.LEFT_INDEX] = jointPositions[JOINTS.LEFT_WRIST];
    jointPositions[JOINTS.LEFT_THUMB] = jointPositions[JOINTS.LEFT_WRIST];

    jointPositions[JOINTS.RIGHT_PINKY] = jointPositions[JOINTS.RIGHT_WRIST];
    jointPositions[JOINTS.RIGHT_INDEX] = jointPositions[JOINTS.RIGHT_WRIST];
    jointPositions[JOINTS.RIGHT_THUMB] = jointPositions[JOINTS.RIGHT_WRIST];    

    jointConfidences[JOINTS.LEFT_PINKY] = 0.0;
    jointConfidences[JOINTS.LEFT_INDEX] = 0.0;
    jointConfidences[JOINTS.LEFT_THUMB] = 0.0;
    
    jointConfidences[JOINTS.RIGHT_PINKY] = 0.0;
    jointConfidences[JOINTS.RIGHT_INDEX] = 0.0;
    jointConfidences[JOINTS.RIGHT_THUMB] = 0.0;
}

export {
    JOINT_NODE_NAME,
    JOINT_PUBLIC_DATA_KEYS,
    isHumanPoseObject,
    makePoseData,
    getPoseObjectName,
    getPoseStringFromObject,
    //getMockPoseStandingFarAway,
    getGroundPlaneRelativeMatrix,
    setMatrixFromArray,
    indexOfMin,
    getJointNodeInfo,
    createDummySkeleton,
    convertFromJointsV1
};
