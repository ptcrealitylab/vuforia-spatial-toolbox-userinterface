import * as THREE from '../../thirdPartyCode/three/three.module.js';

const HUMAN_POSE_ID_PREFIX = '_HUMAN_';

const JOINT_NODE_NAME = 'storage';
const JOINT_PUBLIC_DATA_KEYS = {
    data: 'data',
    transferData: 'whole_pose'
};
const SCALE = 1000; // we want to scale up the size of individual joints, but not apply the scale to their positions

const JOINTS = {
    NOSE: 'nose',
    LEFT_EYE: 'left_eye',
    RIGHT_EYE: 'right_eye',
    LEFT_EAR: 'left_ear',
    RIGHT_EAR: 'right_ear',
    LEFT_SHOULDER: 'left_shoulder',
    RIGHT_SHOULDER: 'right_shoulder',
    LEFT_ELBOW: 'left_elbow',
    RIGHT_ELBOW: 'right_elbow',
    LEFT_WRIST: 'left_wrist',
    RIGHT_WRIST: 'right_wrist',
    LEFT_HIP: 'left_hip',
    RIGHT_HIP: 'right_hip',
    LEFT_KNEE: 'left_knee',
    RIGHT_KNEE: 'right_knee',
    LEFT_ANKLE: 'left_ankle',
    RIGHT_ANKLE: 'right_ankle',
    HEAD: 'head', // synthetic
    NECK: 'neck', // synthetic
    CHEST: 'chest', // synthetic
    NAVEL: 'navel', // synthetic
    PELVIS: 'pelvis', // synthetic
    // LEFT_HAND: 'left hand synthetic',
    // RIGHT_HAND: 'right hand synthetic',
};

const JOINT_CONNECTIONS = {
    elbowWristLeft: [JOINTS.LEFT_WRIST, JOINTS.LEFT_ELBOW], // 0
    shoulderElbowLeft: [JOINTS.LEFT_ELBOW, JOINTS.LEFT_SHOULDER],
    shoulderSpan: [JOINTS.LEFT_SHOULDER, JOINTS.RIGHT_SHOULDER],
    shoulderElbowRight: [JOINTS.RIGHT_ELBOW, JOINTS.RIGHT_SHOULDER],
    elbowWristRight: [JOINTS.RIGHT_WRIST, JOINTS.RIGHT_ELBOW],
    chestLeft: [JOINTS.LEFT_SHOULDER, JOINTS.LEFT_HIP], // 5
    hipSpan: [JOINTS.LEFT_HIP, JOINTS.RIGHT_HIP],
    chestRight: [JOINTS.RIGHT_HIP, JOINTS.RIGHT_SHOULDER],
    hipKneeLeft: [JOINTS.LEFT_HIP, JOINTS.LEFT_KNEE],
    kneeAnkleLeft: [JOINTS.LEFT_KNEE, JOINTS.LEFT_ANKLE],
    hipKneeRight: [JOINTS.RIGHT_HIP, JOINTS.RIGHT_KNEE], // 10
    kneeAnkleRight: [JOINTS.RIGHT_KNEE, JOINTS.RIGHT_ANKLE], // 11
    headNeck: [JOINTS.HEAD, JOINTS.NECK],
    neckChest: [JOINTS.NECK, JOINTS.CHEST],
    chestNavel: [JOINTS.CHEST, JOINTS.NAVEL],
    navelPelvis: [JOINTS.NAVEL, JOINTS.PELVIS],
};

// other modules in the project can use this to reliably check whether an object is a humanPose object
function isHumanPoseObject(object) {
    if (!object) { return false; }
    return object.type === 'human' || object.objectId.indexOf(HUMAN_POSE_ID_PREFIX) === 0;
}

function makePoseFromJoints(name, joints, timestamp) {
    return {
        name: name,
        timestamp: timestamp,
        joints: joints
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
function getMockPoseStandingFarAway() {
    let joints = JSON.parse(
        "[{\"x\":-0.7552632972083383,\"y\":0.2644442929211472,\"z\":0.7913752977850149},{\"x\":-0.7845470806021233,\"y\":0.2421982759192687,\"z\":0.8088129628325323},{\"x\":-0.7702630884492285,\"y\":0.3001014048608925,\"z\":0.7688086082955945},{\"x\":-0.8222937248161452,\"y\":0.24623275325440866,\"z\":0.9550474860100973},{\"x\":-0.7833413553528865,\"y\":0.3678937178976209,\"z\":0.8505136192483953},{\"x\":-0.6329333926426419,\"y\":0.12993628611940003,\"z\":1.003037519866321},{\"x\":-0.5857144750949138,\"y\":0.4589454778216688,\"z\":0.8355459885338103},{\"x\":-0.3674280483465843,\"y\":-0.015621332976114535,\"z\":1.0097465238602046},{\"x\":-0.3089154169856956,\"y\":0.5132346709005703,\"z\":0.7849136963889392},{\"x\":-0.1927517400895856,\"y\":-0.17818293753755024,\"z\":0.9756865047079787},{\"x\":-0.16714735686176868,\"y\":0.5735810435150129,\"z\":0.6760789908531224},{\"x\":-0.1250018136428199,\"y\":-0.3687589763164842,\"z\":-0.9344674156160389},{\"x\":-0.12229286355074954,\"y\":-0.3292508923208693,\"z\":-0.8945665731201982},{\"x\":-0.10352244950174398,\"y\":-0.382806122564826,\"z\":-0.9740523344761574},{\"x\":-0.09227820167479968,\"y\":-0.34637551009676415,\"z\":-0.9339987027591811},{\"x\":-0.09457788170460725,\"y\":-0.3891481311166776,\"z\":-0.9955435991385165},{\"x\":-0.07832232108450882,\"y\":-0.35210246362115816,\"z\":-0.957316956868217}]"
    );
    return joints;
}

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

// returns the {objectKey, frameKey, nodeKey} address of the avatar storeData node on this avatar object
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
    const jointGeometry = new THREE.SphereGeometry(.03 * SCALE, 12, 12);
    const material = new THREE.MeshLambertMaterial();
    dummySkeleton.jointInstancedMesh = new THREE.InstancedMesh(jointGeometry, material, Object.values(JOINTS).length);
    Object.values(JOINTS).forEach((jointId, i) => {
        dummySkeleton.joints[jointId] = i;
        dummySkeleton.jointInstancedMesh.setMatrixAt(i, getDummyJointMatrix(jointId));
    });{}

    const boneGeometry = new THREE.CylinderGeometry(.01 * SCALE, .01 * SCALE, SCALE, 3);
    dummySkeleton.boneInstancedMesh = new THREE.InstancedMesh(boneGeometry, material, Object.values(JOINT_CONNECTIONS).length);
    Object.values(JOINT_CONNECTIONS).forEach((bone, i) => {
        dummySkeleton.boneInstancedMesh.setMatrixAt(i, getDummyBoneMatrix(bone));
    });

    dummySkeleton.add(dummySkeleton.jointInstancedMesh);
    dummySkeleton.add(dummySkeleton.boneInstancedMesh);
    
    dummySkeleton.jointNameFromIndex = (index) => {
        return Object.keys(dummySkeleton.joints).find(key => dummySkeleton.joints[key] === index);
    }
    
    return dummySkeleton;
}

export {
    JOINTS,
    JOINT_CONNECTIONS,
    JOINT_NODE_NAME,
    JOINT_PUBLIC_DATA_KEYS,
    SCALE,
    isHumanPoseObject,
    makePoseFromJoints,
    getPoseObjectName,
    getPoseStringFromObject,
    getMockPoseStandingFarAway,
    indexOfMin,
    getJointNodeInfo,
    createDummySkeleton
};
