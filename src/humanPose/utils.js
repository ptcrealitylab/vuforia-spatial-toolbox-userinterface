createNameSpace("realityEditor.humanPose.utils");

(function(exports) {
    const HUMAN_POSE_ID_PREFIX = '_HUMAN_';

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

    const JOINTS_LEN = Object.keys(JOINTS).length;

    const JOINT_CONNECTIONS = [
        [JOINTS.LEFT_WRIST, JOINTS.LEFT_ELBOW], // 0
        [JOINTS.LEFT_ELBOW, JOINTS.LEFT_SHOULDER],
        [JOINTS.LEFT_SHOULDER, JOINTS.RIGHT_SHOULDER],
        [JOINTS.RIGHT_SHOULDER, JOINTS.RIGHT_ELBOW],
        [JOINTS.RIGHT_ELBOW, JOINTS.RIGHT_WRIST],
        [JOINTS.LEFT_SHOULDER, JOINTS.LEFT_HIP], // 5
        [JOINTS.LEFT_HIP, JOINTS.RIGHT_HIP],
        [JOINTS.RIGHT_HIP, JOINTS.RIGHT_SHOULDER],
        [JOINTS.LEFT_HIP, JOINTS.LEFT_KNEE],
        [JOINTS.LEFT_KNEE, JOINTS.LEFT_ANKLE],
        [JOINTS.RIGHT_HIP, JOINTS.RIGHT_KNEE], // 10
        [JOINTS.RIGHT_KNEE, JOINTS.RIGHT_ANKLE], // 11
        [JOINTS.HEAD, JOINTS.NECK],
        [JOINTS.NECK, JOINTS.CHEST],
        [JOINTS.CHEST, JOINTS.NAVEL],
        [JOINTS.NAVEL, JOINTS.PELVIS],
    ];

    exports.JOINTS = JOINTS;
    exports.JOINTS_LEN = JOINTS_LEN;
    exports.JOINT_CONNECTIONS = JOINT_CONNECTIONS;

    // other modules in the project can use this to reliably check whether an object is a humanPose object
    exports.isHumanPoseObject = function(object) {
        return object.type === 'human' || object.objectId.indexOf(HUMAN_POSE_ID_PREFIX) === 0;
    }

}(realityEditor.humanPose.utils));
