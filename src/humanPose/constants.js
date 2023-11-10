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

/* Previous joint scheme with simple hands. */
export const JOINTS_V2 = {
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

export const JOINTS_V2_COUNT = Object.keys(JOINTS_V2).length;

/* Current joint scheme with detailed hands. */
export const JOINTS = {
    /* body joints */
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
    /* left hand joints */
    LEFT_THUMB_CMC: 'left_thumb_cmc',
    LEFT_THUMB_MCP: 'left_thumb_mcp',
    LEFT_THUMB_IP: 'left_thumb_ip',
    LEFT_THUMB_TIP: 'left_thumb_tip',
    LEFT_INDEX_FINGER_MCP: 'left_index_finger_mcp',
    LEFT_INDEX_FINGER_PIP: 'left_index_finger_pip',
    LEFT_INDEX_FINGER_DIP: 'left_index_finger_dip',
    LEFT_INDEX_FINGER_TIP: 'left_index_finger_tip',
    LEFT_MIDDLE_FINGER_MCP: 'left_middle_finger_mcp',
    LEFT_MIDDLE_FINGER_PIP: 'left_middle_finger_pip',
    LEFT_MIDDLE_FINGER_DIP: 'left_middle_finger_dip',
    LEFT_MIDDLE_FINGER_TIP: 'left_middle_finger_tip',
    LEFT_RING_FINGER_MCP: 'left_ring_finger_mcp',
    LEFT_RING_FINGER_PIP: 'left_ring_finger_pip',
    LEFT_RING_FINGER_DIP: 'left_ring_finger_dip',
    LEFT_RING_FINGER_TIP: 'left_ring_finger_tip',
    LEFT_PINKY_MCP: 'left_pinky_mcp',
    LEFT_PINKY_PIP: 'left_pinky_pip',
    LEFT_PINKY_DIP: 'left_pinky_dip',
    LEFT_PINKY_TIP: 'left_pinky_tip',
    /* right hand joints */
    RIGHT_THUMB_CMC: 'right_thumb_cmc',
    RIGHT_THUMB_MCP: 'right_thumb_mcp',
    RIGHT_THUMB_IP: 'right_thumb_ip',
    RIGHT_THUMB_TIP: 'right_thumb_tip',
    RIGHT_INDEX_FINGER_MCP: 'right_index_finger_mcp',
    RIGHT_INDEX_FINGER_PIP: 'right_index_finger_pip',
    RIGHT_INDEX_FINGER_DIP: 'right_index_finger_dip',
    RIGHT_INDEX_FINGER_TIP: 'right_index_finger_tip',
    RIGHT_MIDDLE_FINGER_MCP: 'right_middle_finger_mcp',
    RIGHT_MIDDLE_FINGER_PIP: 'right_middle_finger_pip',
    RIGHT_MIDDLE_FINGER_DIP: 'right_middle_finger_dip',
    RIGHT_MIDDLE_FINGER_TIP: 'right_middle_finger_tip',
    RIGHT_RING_FINGER_MCP: 'right_ring_finger_mcp',
    RIGHT_RING_FINGER_PIP: 'right_ring_finger_pip',
    RIGHT_RING_FINGER_DIP: 'right_ring_finger_dip',
    RIGHT_RING_FINGER_TIP: 'right_ring_finger_tip',
    RIGHT_PINKY_MCP: 'right_pinky_mcp',
    RIGHT_PINKY_PIP: 'right_pinky_pip',
    RIGHT_PINKY_DIP: 'right_pinky_dip',
    RIGHT_PINKY_TIP: 'right_pinky_tip',
    /* synthetic spine joints */
    HEAD: 'head',
    NECK: 'neck',
    CHEST: 'chest',
    NAVEL: 'navel',
    PELVIS: 'pelvis',
};

export const JOINT_CONNECTIONS = {
    // connections between body joints
    elbowWristLeft: [JOINTS.LEFT_WRIST, JOINTS.LEFT_ELBOW],  // 0
    shoulderElbowLeft: [JOINTS.LEFT_ELBOW, JOINTS.LEFT_SHOULDER],
    shoulderSpan: [JOINTS.LEFT_SHOULDER, JOINTS.RIGHT_SHOULDER],
    shoulderElbowRight: [JOINTS.RIGHT_ELBOW, JOINTS.RIGHT_SHOULDER],
    elbowWristRight: [JOINTS.RIGHT_WRIST, JOINTS.RIGHT_ELBOW],
    chestLeft: [JOINTS.LEFT_SHOULDER, JOINTS.LEFT_HIP],
    hipSpan: [JOINTS.LEFT_HIP, JOINTS.RIGHT_HIP],
    chestRight: [JOINTS.RIGHT_HIP, JOINTS.RIGHT_SHOULDER],
    hipKneeLeft: [JOINTS.LEFT_HIP, JOINTS.LEFT_KNEE],
    kneeAnkleLeft: [JOINTS.LEFT_KNEE, JOINTS.LEFT_ANKLE],
    hipKneeRight: [JOINTS.RIGHT_HIP, JOINTS.RIGHT_KNEE],
    kneeAnkleRight: [JOINTS.RIGHT_KNEE, JOINTS.RIGHT_ANKLE],
    earSpan: [JOINTS.LEFT_EAR, JOINTS.RIGHT_EAR],
    eyeSpan: [JOINTS.LEFT_EYE, JOINTS.RIGHT_EYE],
    eyeNoseLeft: [JOINTS.LEFT_EYE, JOINTS.NOSE],
    eyeNoseRight: [JOINTS.RIGHT_EYE, JOINTS.NOSE],
    // connections between left hand joints
    thumb1Left: [JOINTS.LEFT_WRIST, JOINTS.LEFT_THUMB_CMC], // 16
    thumb2Left: [JOINTS.LEFT_THUMB_CMC, JOINTS.LEFT_THUMB_MCP],
    thumb3Left: [JOINTS.LEFT_THUMB_MCP, JOINTS.LEFT_THUMB_IP],
    thum4Left: [JOINTS.LEFT_THUMB_IP, JOINTS.LEFT_THUMB_TIP],
    index1Left: [JOINTS.LEFT_WRIST, JOINTS.LEFT_INDEX_FINGER_MCP],
    index2Left: [JOINTS.LEFT_INDEX_FINGER_MCP, JOINTS.LEFT_INDEX_FINGER_PIP],
    index3Left: [JOINTS.LEFT_INDEX_FINGER_PIP, JOINTS.LEFT_INDEX_FINGER_DIP],
    index4Left: [JOINTS.LEFT_INDEX_FINGER_DIP, JOINTS.LEFT_INDEX_FINGER_TIP],
    middle2Left: [JOINTS.LEFT_MIDDLE_FINGER_MCP, JOINTS.LEFT_MIDDLE_FINGER_PIP],
    middle3Left: [JOINTS.LEFT_MIDDLE_FINGER_PIP, JOINTS.LEFT_MIDDLE_FINGER_DIP],
    middle4Left: [JOINTS.LEFT_MIDDLE_FINGER_DIP, JOINTS.LEFT_MIDDLE_FINGER_TIP],
    ring2Left: [JOINTS.LEFT_RING_FINGER_MCP, JOINTS.LEFT_RING_FINGER_PIP],
    ring3Left: [JOINTS.LEFT_RING_FINGER_PIP, JOINTS.LEFT_RING_FINGER_DIP],
    ring4Left: [JOINTS.LEFT_RING_FINGER_DIP, JOINTS.LEFT_RING_FINGER_TIP],
    pinky1Left: [JOINTS.LEFT_WRIST, JOINTS.LEFT_PINKY_MCP],
    pinky2Left: [JOINTS.LEFT_PINKY_MCP, JOINTS.LEFT_PINKY_PIP],
    pinky3Left: [JOINTS.LEFT_PINKY_PIP, JOINTS.LEFT_PINKY_DIP],
    pinky4Left: [JOINTS.LEFT_PINKY_DIP, JOINTS.LEFT_PINKY_TIP],
    handSpan1Left: [JOINTS.LEFT_INDEX_FINGER_MCP, JOINTS.LEFT_MIDDLE_FINGER_MCP],
    handSpan2Left: [JOINTS.LEFT_MIDDLE_FINGER_MCP, JOINTS.LEFT_RING_FINGER_MCP],
    handSpan3Left: [JOINTS.LEFT_RING_FINGER_MCP, JOINTS.LEFT_PINKY_MCP],
    // connections between right hand joints
    thumb1Right: [JOINTS.RIGHT_WRIST, JOINTS.RIGHT_THUMB_CMC], // 37
    thumb2Right: [JOINTS.RIGHT_THUMB_CMC, JOINTS.RIGHT_THUMB_MCP],
    thumb3Right: [JOINTS.RIGHT_THUMB_MCP, JOINTS.RIGHT_THUMB_IP],
    thum4Right: [JOINTS.RIGHT_THUMB_IP, JOINTS.RIGHT_THUMB_TIP],
    index1Right: [JOINTS.RIGHT_WRIST, JOINTS.RIGHT_INDEX_FINGER_MCP],
    index2Right: [JOINTS.RIGHT_INDEX_FINGER_MCP, JOINTS.RIGHT_INDEX_FINGER_PIP],
    index3Right: [JOINTS.RIGHT_INDEX_FINGER_PIP, JOINTS.RIGHT_INDEX_FINGER_DIP],
    index4Right: [JOINTS.RIGHT_INDEX_FINGER_DIP, JOINTS.RIGHT_INDEX_FINGER_TIP],
    middle2Right: [JOINTS.RIGHT_MIDDLE_FINGER_MCP, JOINTS.RIGHT_MIDDLE_FINGER_PIP],
    middle3Right: [JOINTS.RIGHT_MIDDLE_FINGER_PIP, JOINTS.RIGHT_MIDDLE_FINGER_DIP],
    middle4Right: [JOINTS.RIGHT_MIDDLE_FINGER_DIP, JOINTS.RIGHT_MIDDLE_FINGER_TIP],
    ring2Right: [JOINTS.RIGHT_RING_FINGER_MCP, JOINTS.RIGHT_RING_FINGER_PIP],
    ring3Right: [JOINTS.RIGHT_RING_FINGER_PIP, JOINTS.RIGHT_RING_FINGER_DIP],
    ring4Right: [JOINTS.RIGHT_RING_FINGER_DIP, JOINTS.RIGHT_RING_FINGER_TIP],
    pinky1Right: [JOINTS.RIGHT_WRIST, JOINTS.RIGHT_PINKY_MCP],
    pinky2Right: [JOINTS.RIGHT_PINKY_MCP, JOINTS.RIGHT_PINKY_PIP],
    pinky3Right: [JOINTS.RIGHT_PINKY_PIP, JOINTS.RIGHT_PINKY_DIP],
    pinky4Right: [JOINTS.RIGHT_PINKY_DIP, JOINTS.RIGHT_PINKY_TIP],
    handSpan1Right: [JOINTS.RIGHT_INDEX_FINGER_MCP, JOINTS.RIGHT_MIDDLE_FINGER_MCP],
    handSpan2Right: [JOINTS.RIGHT_MIDDLE_FINGER_MCP, JOINTS.RIGHT_RING_FINGER_MCP],
    handSpan3Right: [JOINTS.RIGHT_RING_FINGER_MCP, JOINTS.RIGHT_PINKY_MCP],
    // connections between synthetic joints
    headNeck: [JOINTS.HEAD, JOINTS.NECK],   // 58
    neckChest: [JOINTS.NECK, JOINTS.CHEST],
    chestNavel: [JOINTS.CHEST, JOINTS.NAVEL],
    navelPelvis: [JOINTS.NAVEL, JOINTS.PELVIS],
    face: [JOINTS.HEAD, JOINTS.NOSE]
}

export const JOINTS_PER_POSE = Object.keys(JOINTS).length;
export const BONES_PER_POSE = Object.keys(JOINT_CONNECTIONS).length;

// Flag for switching on/off an experimental feature of hand tracking
export const TRACK_HANDS = true;

// Option to hide joint/bones which are for example considered poorly tracked in general or redundant for a use case
// Currently, defined according to debug switch TRACK_HANDS
export const DISPLAY_HIDDEN_ELEMENTS = TRACK_HANDS;
export const HIDDEN_JOINTS = [
    JOINTS.LEFT_THUMB_CMC,
    JOINTS.LEFT_THUMB_MCP,
    JOINTS.LEFT_THUMB_IP,
    JOINTS.LEFT_THUMB_TIP,
    JOINTS.LEFT_INDEX_FINGER_MCP,
    JOINTS.LEFT_INDEX_FINGER_PIP,
    JOINTS.LEFT_INDEX_FINGER_DIP,
    JOINTS.LEFT_INDEX_FINGER_TIP,
    JOINTS.LEFT_MIDDLE_FINGER_MCP,
    JOINTS.LEFT_MIDDLE_FINGER_PIP,
    JOINTS.LEFT_MIDDLE_FINGER_DIP,
    JOINTS.LEFT_MIDDLE_FINGER_TIP,
    JOINTS.LEFT_RING_FINGER_MCP,
    JOINTS.LEFT_RING_FINGER_PIP,
    JOINTS.LEFT_RING_FINGER_DIP,
    JOINTS.LEFT_RING_FINGER_TIP,
    JOINTS.LEFT_PINKY_MCP,
    JOINTS.LEFT_PINKY_PIP,
    JOINTS.LEFT_PINKY_DIP,
    JOINTS.LEFT_PINKY_TIP,
    JOINTS.RIGHT_THUMB_CMC,
    JOINTS.RIGHT_THUMB_MCP,
    JOINTS.RIGHT_THUMB_IP,
    JOINTS.RIGHT_THUMB_TIP,
    JOINTS.RIGHT_INDEX_FINGER_MCP,
    JOINTS.RIGHT_INDEX_FINGER_PIP,
    JOINTS.RIGHT_INDEX_FINGER_DIP,
    JOINTS.RIGHT_INDEX_FINGER_TIP,
    JOINTS.RIGHT_MIDDLE_FINGER_MCP,
    JOINTS.RIGHT_MIDDLE_FINGER_PIP,
    JOINTS.RIGHT_MIDDLE_FINGER_DIP,
    JOINTS.RIGHT_MIDDLE_FINGER_TIP,
    JOINTS.RIGHT_RING_FINGER_MCP,
    JOINTS.RIGHT_RING_FINGER_PIP,
    JOINTS.RIGHT_RING_FINGER_DIP,
    JOINTS.RIGHT_RING_FINGER_TIP,
    JOINTS.RIGHT_PINKY_MCP,
    JOINTS.RIGHT_PINKY_PIP,
    JOINTS.RIGHT_PINKY_DIP,
    JOINTS.RIGHT_PINKY_TIP
];
export const HIDDEN_BONES = [
    getBoneName(JOINT_CONNECTIONS.thumb1Left),
    getBoneName(JOINT_CONNECTIONS.thumb2Left),
    getBoneName(JOINT_CONNECTIONS.thumb3Left),
    getBoneName(JOINT_CONNECTIONS.thum4Left),
    getBoneName(JOINT_CONNECTIONS.index1Left),
    getBoneName(JOINT_CONNECTIONS.index2Left),
    getBoneName(JOINT_CONNECTIONS.index3Left),
    getBoneName(JOINT_CONNECTIONS.index4Left),
    getBoneName(JOINT_CONNECTIONS.middle2Left),
    getBoneName(JOINT_CONNECTIONS.middle3Left),
    getBoneName(JOINT_CONNECTIONS.middle4Left),
    getBoneName(JOINT_CONNECTIONS.ring2Left),
    getBoneName(JOINT_CONNECTIONS.ring3Left),
    getBoneName(JOINT_CONNECTIONS.ring4Left),
    getBoneName(JOINT_CONNECTIONS.pinky1Left),
    getBoneName(JOINT_CONNECTIONS.pinky2Left),
    getBoneName(JOINT_CONNECTIONS.pinky3Left),
    getBoneName(JOINT_CONNECTIONS.pinky4Left),
    getBoneName(JOINT_CONNECTIONS.handSpan1Left),
    getBoneName(JOINT_CONNECTIONS.handSpan2Left),
    getBoneName(JOINT_CONNECTIONS.handSpan3Left),
    getBoneName(JOINT_CONNECTIONS.thumb1Right),
    getBoneName(JOINT_CONNECTIONS.thumb2Right),
    getBoneName(JOINT_CONNECTIONS.thumb3Right),
    getBoneName(JOINT_CONNECTIONS.thum4Right),
    getBoneName(JOINT_CONNECTIONS.index1Right),
    getBoneName(JOINT_CONNECTIONS.index2Right),
    getBoneName(JOINT_CONNECTIONS.index3Right),
    getBoneName(JOINT_CONNECTIONS.index4Right),
    getBoneName(JOINT_CONNECTIONS.middle2Right),
    getBoneName(JOINT_CONNECTIONS.middle3Right),
    getBoneName(JOINT_CONNECTIONS.middle4Right),
    getBoneName(JOINT_CONNECTIONS.ring2Right),
    getBoneName(JOINT_CONNECTIONS.ring3Right),
    getBoneName(JOINT_CONNECTIONS.ring4Right),
    getBoneName(JOINT_CONNECTIONS.pinky1Right),
    getBoneName(JOINT_CONNECTIONS.pinky2Right),
    getBoneName(JOINT_CONNECTIONS.pinky3Right),
    getBoneName(JOINT_CONNECTIONS.pinky4Right),
    getBoneName(JOINT_CONNECTIONS.handSpan1Right),
    getBoneName(JOINT_CONNECTIONS.handSpan2Right),
    getBoneName(JOINT_CONNECTIONS.handSpan3Right)
];

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

/*
export const SMALL_JOINT_FLAGS = [
    true, // NOSE 
    true,  // LEFT_EYE 
    true,  // RIGHT_EYE 
    true,  // LEFT_EAR 
    true,  // RIGHT_EAR 
    false, // LEFT_SHOULDER 
    false, // RIGHT_SHOULDER 
    false, // LEFT_ELBOW 
    false, // RIGHT_ELBOW 
    false, // LEFT_WRIST 
    false, // RIGHT_WRIST 
    false,  // LEFT_HIP 
    false, // RIGHT_HIP 
    false, // LEFT_KNEE 
    false, // RIGHT_KNEE 
    false, // LEFT_ANKLE 
    false, // RIGHT_ANKLE 
    true,  // LEFT_PINKY 
    true,  // RIGHT_PINKY 
    true,  // LEFT_INDEX 
    true,  // RIGHT_INDEX 
    true,  // LEFT_THUMB 
    true,  // RIGHT_THUMB 
    false, // HEAD 
    false, // NECK 
    false, // CHEST 
    false, // NAVEL 
    false  // PELVIS 
];
*/

export const SMALL_JOINT_FLAGS = [
    /* body joints */
    true, // NOSE 
    true,  // LEFT_EYE 
    true,  // RIGHT_EYE 
    true,  // LEFT_EAR 
    true,  // RIGHT_EAR 
    false, // LEFT_SHOULDER 
    false, // RIGHT_SHOULDER 
    false, // LEFT_ELBOW 
    false, // RIGHT_ELBOW 
    false, // LEFT_WRIST 
    false, // RIGHT_WRIST 
    false, // LEFT_HIP 
    false, // RIGHT_HIP 
    false, // LEFT_KNEE 
    false, // RIGHT_KNEE 
    false, // LEFT_ANKLE 
    false, // RIGHT_ANKLE 
    /* left hand joints */
    true, // LEFT_THUMB_CMC
    true, // LEFT_THUMB_MCP
    true, // LEFT_THUMB_IP
    true, // LEFT_THUMB_TIP
    true, // LEFT_INDEX_FINGER_MCP
    true, // LEFT_INDEX_FINGER_PIP
    true, // LEFT_INDEX_FINGER_DIP
    true, // LEFT_INDEX_FINGER_TIP
    true, // LEFT_MIDDLE_FINGER_MCP
    true, // LEFT_MIDDLE_FINGER_PIP
    true, // LEFT_MIDDLE_FINGER_DIP
    true, // LEFT_MIDDLE_FINGER_TIP
    true, // LEFT_RING_FINGER_MCP
    true, // LEFT_RING_FINGER_PIP
    true, // LEFT_RING_FINGER_DIP
    true, // LEFT_RING_FINGER_TIP
    true, // LEFT_PINKY_MCP
    true, // LEFT_PINKY_PIP
    true, // LEFT_PINKY_DIP
    true, // LEFT_PINKY_TIP
    /* right hand joints */
    true, // RIGHT_THUMB_CMC
    true, // RIGHT_THUMB_MCP
    true, // RIGHT_THUMB_IP
    true, // RIGHT_THUMB_TIP
    true, // RIGHT_INDEX_FINGER_MCP
    true, // RIGHT_INDEX_FINGER_PIP
    true, // RIGHT_INDEX_FINGER_DIP
    true, // RIGHT_INDEX_FINGER_TIP
    true, // RIGHT_MIDDLE_FINGER_MCP
    true, // RIGHT_MIDDLE_FINGER_PIP
    true, // RIGHT_MIDDLE_FINGER_DIP
    true, // RIGHT_MIDDLE_FINGER_TIP
    true, // RIGHT_RING_FINGER_MCP
    true, // RIGHT_RING_FINGER_PIP
    true, // RIGHT_RING_FINGER_DIP
    true, // RIGHT_RING_FINGER_TIP
    true, // RIGHT_PINKY_MCP
    true, // RIGHT_PINKY_PIP
    true, // RIGHT_PINKY_DIP
    true, // RIGHT_PINKY_TIP   
     /* synthetic spine joints */
    false, // HEAD 
    false, // NECK 
    false, // CHEST 
    false, // NAVEL 
    false  // PELVIS 
];

export const THIN_BONE_FLAGS = [
    /* connections between body joints */
    false, // elbowWristLeft
    false, // shoulderElbowLeft
    false, // shoulderSpan
    false, // shoulderElbowRight
    false, // elbowWristRight
    false, // chestLeft
    false, // hipSpan
    false, // chestRight
    false, // hipKneeLeft
    false, //  kneeAnkleLeft
    false, // hipKneeRight
    false, //  kneeAnkleRight
    /* connections between face joints */
    true, // earSpan
    true, // eyeSpan
    true, // eyeNoseLeft
    true, // eyeNoseRight
    // connections between left hand joints
    true, // thumb1Left
    true, // thumb2Left
    true, // thumb3Left
    true, // thum4Left
    true, // index1Left
    true, // index2Left
    true, // index3Left
    true, // index4Left
    true, // middle2Left
    true, // middle3Left
    true, // middle4Left
    true, // ring2Left
    true, // ring3Left
    true, // ring4Left
    true, // pinky1Left
    true, // pinky2Left
    true, // pinky3Left
    true, // pinky4Left
    true, // handSpan1Left
    true, // handSpan2Left
    true, // handSpan3Left
    // connections between right hand joints
    true, // thumb1Right
    true, // thumb2Right
    true, // thumb3Right
    true, // thum4Right
    true, // index1Right
    true, // index2Right
    true, // index3Right
    true, // index4Right
    true, // middle2Right
    true, // middle3Right
    true, // middle4Right
    true, // ring2Right
    true, // ring3Right
    true, // ring4Right
    true, // pinky1Right
    true, // pinky2Right
    true, // pinky3Right
    true, // pinky4Right
    true, // handSpan1Right
    true, // handSpan2Right
    true, // handSpan3Right
    // connections between synthetic joints
    false, // headNeck
    false, // neckChest
    false, // chestNavel
    false, // navelPelvis
    false // face
];

export const SMALL_JOINT_SCALE_VEC = new THREE.Vector3(0.5, 0.5, 0.5);
export const THIN_BONE_SCALE_VEC = new THREE.Vector3(0.5, 1.0, 0.5);

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
