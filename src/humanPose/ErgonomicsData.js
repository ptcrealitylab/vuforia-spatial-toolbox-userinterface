import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {MotionStudyColors} from "./MotionStudyColors.js";
import {JOINT_CONNECTIONS, JOINTS} from './constants.js';


/**
 * @typedef {Object} Orientation
 * @property {Vector3} forward The forward direction of the orientation
 * @property {Vector3} up The up direction of the orientation
 * @property {Vector3} right The right direction of the orientation
 */

/**
 * @typedef {Class} ErgonomicsData
 * @property {Object.<string, Vector3>} joints The joint 3D positions of the pose
 * @property {Object.<string, Orientation>} orientations The orientations of body parts
 * @property {Object.<string, number>} jointScores The joint ergonomic scores of the pose
 * @property {Object.<string, Color>} jointColors The joint colors of the pose
 * @property {Object.<string, number>} boneScores The bone ergonomic scores of the pose
 * @property {Object.<string, Color>} boneColors The bone colors of the pose
 * @property {number} overallRebaScore The overall ergonomic score of the pose
 * @property {Color} overallRebaColor The overall color of the pose
 * // TODO: finish
 */

export class ErgonomicsData {
    /**
     * Creates a new ErgonomicsData object.
     * @param {Pose} pose The pose to calculate the base ergonomics data for
     */
    constructor(pose) {
        this.joints = {};
        this.jointValidities = {};
        this.jointScores = {};
        this.jointColors = {};
        this.boneScores = {};
        this.boneColors = {};
        this.overallScore = 0;
        this.overallColor = MotionStudyColors.undefined;
        // right handed coord systems for key body parts
        this.orientations = {
            head: {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            chest: {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            hips: {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            // CS of arm body parts are defined wrt the pose when arm hangs down along torso
            leftUpperArm:  {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),  // aligned with the bone
                right: new THREE.Vector3() // the same direction as leftLowerArm.right
            },
            leftLowerArm:  {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),  // aligned with the bone
                right: new THREE.Vector3() // rotation axis of elbow
            },
            leftHand:  {
                forward: new THREE.Vector3(), // from the back of the hand
                up: new THREE.Vector3(),  // aligned with fingers (opposite to their direction)
                right: new THREE.Vector3() // across palm 
            },
            rightUpperArm:  {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            rightLowerArm:  {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            rightHand:  {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            leftUpperLeg:  {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3() // the same direction as leftLowerLeg.right
            },
            leftLowerLeg:  {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3() // rotation axis of knee
            },
            rightUpperLeg:  {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            rightLowerLeg:  {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            }
        };
        this.angles = {};
        this.offsets = {};

        for (let jointId of Object.values(JOINTS)) {
            this.joints[jointId] = pose.getJoint(jointId).position;
            this.jointValidities[jointId] = pose.getJoint(jointId).valid;
            this.jointScores[jointId] = 0;
            this.jointColors[jointId] = MotionStudyColors.undefined;
        }
        for (let boneId of Object.keys(JOINT_CONNECTIONS)) {
            this.boneScores[boneId] = 0;
            this.boneColors[boneId] = MotionStudyColors.undefined;
        }
    }

    calculate() {
        this.calculateOrientations();
    }
    
    calculateOrientations() {
        // make sure all coord systems have orthogonal and unit axes
        this.orientations.head.up.subVectors(this.joints[JOINTS.HEAD],this.joints[JOINTS.NECK]).normalize();
        this.orientations.head.forward.subVectors(this.joints[JOINTS.NOSE], this.joints[JOINTS.HEAD]).normalize();
        this.orientations.head.right.crossVectors(this.orientations.head.forward, this.orientations.head.up).normalize();
        this.orientations.head.forward.crossVectors(this.orientations.head.up, this.orientations.head.right).normalize();  // make perpendicular
        
        this.orientations.chest.up.subVectors(this.joints[JOINTS.NECK], this.joints[JOINTS.CHEST]).normalize();
        this.orientations.chest.right.subVectors(this.joints[JOINTS.RIGHT_SHOULDER], this.joints[JOINTS.LEFT_SHOULDER]).normalize();
        this.orientations.chest.forward.crossVectors(this.orientations.chest.up, this.orientations.chest.right).normalize();
        this.orientations.chest.right.crossVectors(this.orientations.chest.forward, this.orientations.chest.up).normalize();  // make perpendicular
        
        this.orientations.hips.up.set(0, 1, 0); // Hips do not really have an up direction (i.e., even when sitting, the hips are always up), hence given a vector opposite to gravity
        this.orientations.hips.right.subVectors(this.joints[JOINTS.RIGHT_HIP], this.joints[JOINTS.LEFT_HIP]).normalize();
        this.orientations.hips.forward.crossVectors(this.orientations.hips.up, this.orientations.hips.right).normalize();
        this.orientations.hips.right.crossVectors(this.orientations.hips.forward, this.orientations.hips.up).normalize();  // make perpendicular
        
        this.orientations.leftLowerArm.up.subVectors(this.joints[JOINTS.LEFT_ELBOW], this.joints[JOINTS.LEFT_WRIST]).normalize(); // aligned with the bone
        this.orientations.leftUpperArm.up.subVectors(this.joints[JOINTS.LEFT_SHOULDER], this.joints[JOINTS.LEFT_ELBOW]).normalize(); // aligned with the bone
        // given by rotation axis of elbow; direction towards the torso
        this.orientations.leftLowerArm.right.crossVectors(this.orientations.leftUpperArm.up,this.orientations.leftLowerArm.up).normalize();
        this.orientations.leftLowerArm.forward.crossVectors(this.orientations.leftLowerArm.up,this.orientations.leftLowerArm.right).normalize();
        
        this.orientations.leftUpperArm.right.copy(this.orientations.leftLowerArm.right) // same direction
        this.orientations.leftUpperArm.forward.crossVectors(this.orientations.leftUpperArm.up,this.orientations.leftUpperArm.right).normalize();

        this.orientations.leftHand.up.subVectors(this.joints[JOINTS.LEFT_WRIST], this.joints[JOINTS.LEFT_MIDDLE_FINGER_MCP]).normalize(); // aligned with fingers (opposite to their direction)
        this.orientations.leftHand.right.subVectors(this.joints[JOINTS.LEFT_INDEX_FINGER_MCP], this.joints[JOINTS.LEFT_PINKY_MCP]).normalize(); // across palm (from pinky to index finger)
        this.orientations.leftHand.forward.crossVectors(this.orientations.leftHand.up,this.orientations.leftHand.right).normalize();  // from the back of the hand
        this.orientations.leftHand.right.subVectors(this.orientations.leftHand.forward, this.orientations.leftHand.up).normalize();  // make perpendicular

        this.orientations.rightLowerArm.up.subVectors(this.joints[JOINTS.RIGHT_ELBOW], this.joints[JOINTS.RIGHT_WRIST]).normalize(); // aligned with the bone
        this.orientations.rightUpperArm.up.subVectors(this.joints[JOINTS.RIGHT_SHOULDER], this.joints[JOINTS.RIGHT_ELBOW]).normalize(); // aligned with the bone
        // given by rotation axis of elbow; direction away from the torso
        this.orientations.rightLowerArm.right.crossVectors(this.orientations.rightUpperArm.up,this.orientations.rightLowerArm.up).normalize();
        this.orientations.rightLowerArm.forward.crossVectors(this.orientations.rightLowerArm.up,this.orientations.rightLowerArm.right).normalize();
        
        this.orientations.rightUpperArm.right.copy(this.orientations.rightLowerArm.right) // same direction
        this.orientations.rightUpperArm.forward.crossVectors(this.orientations.rightUpperArm.up,this.orientations.rightUpperArm.right).normalize();

        this.orientations.rightHand.up.subVectors(this.joints[JOINTS.RIGHT_WRIST], this.joints[JOINTS.RIGHT_MIDDLE_FINGER_MCP]).normalize(); // aligned with fingers (opposite to their direction)
        this.orientations.rightHand.right.subVectors(this.joints[JOINTS.RIGHT_PINKY_MCP], this.joints[JOINTS.RIGHT_INDEX_FINGER_MCP]).normalize(); // across palm (from index finger to pinky)
        this.orientations.rightHand.forward.crossVectors(this.orientations.rightHand.up,this.orientations.rightHand.right).normalize();  // from the back of the hand
        this.orientations.rightHand.right.subVectors(this.orientations.rightHand.forward, this.orientations.rightHand.up).normalize();  // make perpendicular

        this.orientations.leftLowerLeg.up.subVectors(this.joints[JOINTS.LEFT_KNEE], this.joints[JOINTS.LEFT_ANKLE]).normalize(); // aligned with the bone
        this.orientations.leftUpperLeg.up.subVectors(this.joints[JOINTS.LEFT_HIP], this.joints[JOINTS.LEFT_KNEE]).normalize(); // aligned with the bone
        // given by rotation axis of knee
        this.orientations.leftLowerLeg.right.crossVectors(this.orientations.leftLowerLeg.up,this.orientations.leftUpperLeg.up).normalize();
        this.orientations.leftLowerLeg.forward.crossVectors(this.orientations.leftLowerLeg.up,this.orientations.leftLowerLeg.right).normalize();

        this.orientations.leftUpperLeg.right.copy(this.orientations.leftLowerLeg.right) // same direction
        this.orientations.leftUpperLeg.forward.crossVectors(this.orientations.leftUpperLeg.up,this.orientations.leftUpperLeg.right).normalize();

        this.orientations.rightLowerLeg.up.subVectors(this.joints[JOINTS.RIGHT_KNEE], this.joints[JOINTS.RIGHT_ANKLE]).normalize(); // aligned with the bone
        this.orientations.rightUpperLeg.up.subVectors(this.joints[JOINTS.RIGHT_HIP], this.joints[JOINTS.RIGHT_KNEE]).normalize(); // aligned with the bone
        // given by rotation axis of knee
        this.orientations.rightLowerLeg.right.crossVectors(this.orientations.rightLowerLeg.up,this.orientations.rightUpperLeg.up).normalize();
        this.orientations.rightLowerLeg.forward.crossVectors(this.orientations.rightLowerLeg.up,this.orientations.rightLowerLeg.right).normalize();

        this.orientations.rightUpperLeg.right.copy(this.orientations.rightLowerLeg.right) // same direction
        this.orientations.rightUpperLeg.forward.crossVectors(this.orientations.rightUpperLeg.up,this.orientations.rightUpperLeg.right).normalize();   
        
    }
}