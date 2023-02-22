/**
 * Constants used in the behavior of humanPose modules
 */

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINTS, JOINT_CONNECTIONS} from './utils.js';

export const JOINTS_PER_POSE = Object.keys(JOINTS).length;
export const BONES_PER_POSE = Object.keys(JOINT_CONNECTIONS).length;

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
export const SCALE = 1000; // we want to scale up the size of individual joints, but not apply the scale to their positions
export const RENDER_CONFIDENCE_COLOR = false;
// Amount of pose instances per historical HumanPoseRenderer
export const MAX_POSE_INSTANCES = 512;
