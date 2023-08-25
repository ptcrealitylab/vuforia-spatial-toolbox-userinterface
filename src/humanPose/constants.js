/**
 * Constants used in the behavior of humanPose modules
 */

import * as THREE from '../../thirdPartyCode/three/three.module.js';

/* Previous joint scheme without simple hands. */
export const JOINTS_V1 = {
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
};

export const JOINTS_V1_COUNT = Object.keys(JOINTS_V1).length;

export const JOINTS = {
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
    LEFT_PINKY: 'left_pinky',
    RIGHT_PINKY: 'right_pinky',
    LEFT_INDEX: 'left_index',
    RIGHT_INDEX: 'right_index',
    LEFT_THUMB: 'left_thumb', 
    RIGHT_THUMB: 'right_thumb',
    HEAD: 'head', // synthetic
    NECK: 'neck', // synthetic
    CHEST: 'chest', // synthetic
    NAVEL: 'navel', // synthetic
    PELVIS: 'pelvis', // synthetic
};

export const JOINT_CONNECTIONS = {
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
    thumbLeft: [JOINTS.LEFT_THUMB, JOINTS.LEFT_WRIST],
    indexLeft: [JOINTS.LEFT_INDEX, JOINTS.LEFT_WRIST],
    pinkyLeft: [JOINTS.LEFT_PINKY, JOINTS.LEFT_WRIST],
    fingerSpanLeft: [JOINTS.LEFT_INDEX, JOINTS.LEFT_PINKY],
    thumbRight: [JOINTS.RIGHT_THUMB, JOINTS.RIGHT_WRIST],
    indexRight: [JOINTS.RIGHT_INDEX, JOINTS.RIGHT_WRIST],
    pinkyRight: [JOINTS.RIGHT_PINKY, JOINTS.RIGHT_WRIST],
    fingerSpanRight: [JOINTS.RIGHT_INDEX, JOINTS.RIGHT_PINKY],
    earSpan: [JOINTS.LEFT_EAR, JOINTS.RIGHT_EAR],
    eyeSpan: [JOINTS.LEFT_EYE, JOINTS.RIGHT_EYE],
    eyeNoseLeft: [JOINTS.LEFT_EYE, JOINTS.NOSE],
    eyeNoseRight: [JOINTS.RIGHT_EYE, JOINTS.NOSE],
    headNeck: [JOINTS.HEAD, JOINTS.NECK],   // connections between synthetic joints
    neckChest: [JOINTS.NECK, JOINTS.CHEST],
    chestNavel: [JOINTS.CHEST, JOINTS.NAVEL],
    navelPelvis: [JOINTS.NAVEL, JOINTS.PELVIS],
    face: [JOINTS.HEAD, JOINTS.NOSE]
};

export const JOINTS_PER_POSE = Object.keys(JOINTS).length;
export const BONES_PER_POSE = Object.keys(JOINT_CONNECTIONS).length;

// Flag for switching on/off an experimental feature of hand tracking
export const TRACK_HANDS = true;

// Option to hide joint/bones which are for example considered poorly tracked in general or redundant for a use case
// Currently, defined according to debug switch TRACK_HANDS
export const DISPLAY_HIDDEN_ELEMENTS = TRACK_HANDS;
export const HIDDEN_JOINTS = [JOINTS.LEFT_PINKY, JOINTS.RIGHT_PINKY, JOINTS.LEFT_INDEX, JOINTS.RIGHT_INDEX, JOINTS.LEFT_THUMB, JOINTS.RIGHT_THUMB];
export const HIDDEN_BONES = [getBoneName(JOINT_CONNECTIONS.thumbLeft), getBoneName(JOINT_CONNECTIONS.indexLeft), getBoneName(JOINT_CONNECTIONS.pinkyLeft),
    getBoneName(JOINT_CONNECTIONS.fingerSpanLeft), getBoneName(JOINT_CONNECTIONS.thumbRight), getBoneName(JOINT_CONNECTIONS.indexRight), 
    getBoneName(JOINT_CONNECTIONS.pinkyRight), getBoneName(JOINT_CONNECTIONS.fingerSpanRight)];

export const COLOR_BASE = new THREE.Color(0, 0.5, 1);
export const COLOR_RED = new THREE.Color(1, 0, 0);
export const COLOR_YELLOW = new THREE.Color(1, 1, 0);
export const COLOR_GREEN = new THREE.Color(0, 1, 0);

export const JOINT_TO_INDEX = {};
for (const [i, jointId] of Object.values(JOINTS).entries()) {
    JOINT_TO_INDEX[jointId] = i;
}

export const BONE_TO_INDEX = {};
for (const [i, boneName] of Object.keys(JOINT_CONNECTIONS).entries()) {
    BONE_TO_INDEX[boneName] = i;
}

export const SMALL_JOINT_FLAGS = [
    true, /* NOSE */
    true,  /* LEFT_EYE */
    true,  /* RIGHT_EYE */
    true,  /* LEFT_EAR */
    true,  /* RIGHT_EAR */
    false, /* LEFT_SHOULDER */
    false, /* RIGHT_SHOULDER */
    false, /* LEFT_ELBOW */
    false, /* RIGHT_ELBOW */
    false, /* LEFT_WRIST */
    false, /* RIGHT_WRIST */
    false,  /* LEFT_HIP */
    false, /* RIGHT_HIP */
    false, /* LEFT_KNEE */
    false, /* RIGHT_KNEE */
    false, /* LEFT_ANKLE */
    false, /* RIGHT_ANKLE */
    true,  /* LEFT_PINKY */
    true,  /* RIGHT_PINKY */
    true,  /* LEFT_INDEX */
    true,  /* RIGHT_INDEX */
    true,  /* LEFT_THUMB */
    true,  /* RIGHT_THUMB */
    false, /* HEAD */
    false, /* NECK */
    false, /* CHEST */
    false, /* NAVEL */
    false  /* PELVIS */
];
export const SMALL_JOINT_SCALE_VEC = new THREE.Vector3(0.33, 0.33, 0.33);

export const JOINT_RADIUS = 0.02; // unit: meters
export const BONE_RADIUS = 0.01; // unit: meters
export const SCALE = 1000; // we want to scale up the size of individual joints to milimeters, but not apply the scale to their positions

export const RENDER_CONFIDENCE_COLOR = false;
// Amount of pose instances per historical HumanPoseRenderer
export const MAX_POSE_INSTANCES = 512;
export const MAX_POSE_INSTANCES_MOBILE = 8;

export function getBoneName(bone) {
    return Object.keys(JOINT_CONNECTIONS).find(boneName => JOINT_CONNECTIONS[boneName] === bone);
}
