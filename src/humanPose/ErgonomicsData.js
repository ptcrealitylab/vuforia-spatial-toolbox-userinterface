import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {MotionStudyColors} from "./MotionStudyColors.js";
import {JOINT_CONNECTIONS, JOINTS, ERGO_ANGLES, ERGO_OFFSETS} from './constants.js';


/**
 * Calculates the angle between two vectors in degrees. The vector don't need to have the unit length.
 * @param {THREE.Vector3} vector1 The first vector.
 * @param {THREE.Vector3} vector2 The second vector.
 * @return {number} The angle between the two vectors in degrees [0, +180].
 */
export function angleBetween(vector1, vector2) {
    return vector1.angleTo(vector2) * 180 / Math.PI;
}


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
        // orientations of individual body parts (expressed as right-handed local coord systems)
        this.orientations = {
            head: {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            trunk: {
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
        this.offsets = {};  // values have the type of THREE.Vector3()

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
        this.calculateAngles();
        this.calculateOffsets();
    }
    
    calculateOrientations() {
        // make sure all coord systems have orthogonal and unit axes (order: forward, up, right)
        // Hips are defined as a root of the whole body. Their up direction is defined as the vector opposite to gravity.
        this.orientations.hips.up.set(0, 1, 0);
        this.orientations.hips.right.subVectors(this.joints[JOINTS.RIGHT_HIP], this.joints[JOINTS.LEFT_HIP]).normalize();
        this.orientations.hips.forward.crossVectors(this.orientations.hips.up, this.orientations.hips.right).normalize();
        this.orientations.hips.right.crossVectors(this.orientations.hips.forward, this.orientations.hips.up).normalize();  // make perpendicular

        this.orientations.trunk.up.subVectors(this.joints[JOINTS.NECK], this.joints[JOINTS.CHEST]).normalize();
        this.orientations.trunk.right.subVectors(this.joints[JOINTS.RIGHT_SHOULDER], this.joints[JOINTS.LEFT_SHOULDER]).normalize();
        this.orientations.trunk.forward.crossVectors(this.orientations.trunk.up, this.orientations.trunk.right).normalize();
        this.orientations.trunk.right.crossVectors(this.orientations.trunk.forward, this.orientations.trunk.up).normalize();  // make perpendicular
        
        this.orientations.head.up.subVectors(this.joints[JOINTS.HEAD],this.joints[JOINTS.NECK]).normalize();
        this.orientations.head.forward.subVectors(this.joints[JOINTS.NOSE], this.joints[JOINTS.HEAD]).normalize();
        this.orientations.head.right.crossVectors(this.orientations.head.forward, this.orientations.head.up).normalize();
        this.orientations.head.forward.crossVectors(this.orientations.head.up, this.orientations.head.right).normalize();  // make perpendicular
        
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
        this.orientations.leftHand.right.crossVectors(this.orientations.leftHand.forward, this.orientations.leftHand.up).normalize();  // make perpendicular

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
        this.orientations.rightHand.right.crossVectors(this.orientations.rightHand.forward, this.orientations.rightHand.up).normalize();  // make perpendicular

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

    calculateAngles() {

        /* trunk */
        const up = new THREE.Vector3(0, 1, 0);  // opposite to the gravity vector
        // Overall bend angle from upright direction (only positive range [0, 180]deg)
        this.angles[ERGO_ANGLES.TRUNK_BEND] = angleBetween(this.orientations.trunk.up, up);
        // Projection of trunk direction to sagittal/median plane of body where normal is this.orientations.hips.right. Assumes that both vectors have unit length
        const trunkUpSagittalProjection = this.orientations.trunk.up.clone().sub(this.orientations.hips.right.clone().multiplyScalar(this.orientations.hips.right.dot(this.orientations.trunk.up)));
        // Front bend angle fro upright direction. The angle is positive when bending forwards and negative when bending backwards.
        this.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] = angleBetween(trunkUpSagittalProjection, up);
        if (trunkUpSagittalProjection.dot(this.orientations.hips.forward) < 0) {
            this.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] *= -1;
        }
        //this.angles[ERGO_ANGLES.TRUNK_SIDE_BEND]

        console.log(`Trunk: bendAngle=${this.angles[ERGO_ANGLES.TRUNK_BEND].toFixed(0)}deg; frontBendAngle=${this.angles[ERGO_ANGLES.TRUNK_FRONT_BEND].toFixed(0)}deg`);
    

        this.angles[ERGO_ANGLES.TRUNK_TWIST] = angleBetween(this.orientations.trunk.forward, this.orientations.hips.right); // Angle from full twist right  //TODO

        /* head */
        this.angles[ERGO_ANGLES.HEAD_BEND] = angleBetween(this.orientations.head.up, this.orientations.trunk.up);
        this.angles[ERGO_ANGLES.HEAD_TWIST] = angleBetween(this.orientations.head.forward, this.orientations.trunk.right); // Angle from full twist right  //TODO

        /* legs */
        this.angles[ERGO_ANGLES.LEFT_LOWER_LEG_BEND] = angleBetween(this.orientations.leftUpperLeg.up,  this.orientations.leftLowerLeg.up);
        this.angles[ERGO_ANGLES.RIGHT_LOWER_LEG_BEND] = angleBetween(this.orientations.rightUpperLeg.up,  this.orientations.rightLowerLeg.up);

        /* upper arms */
        // Angles for upper arn are primarily measured relative to trunk direction rather than gravity direction
        const down = new THREE.Vector3(0, -1, 0);    // the gravity vector
        const trunkDown = this.orientations.trunk.up.clone().negate();
        const leftUpperArmDown = this.orientations.leftUpperArm.up.clone().negate();
        this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_RAISE] = angleBetween(leftUpperArmDown, trunkDown);
        this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_GRAVITY] = angleBetween(leftUpperArmDown, down);
        this.angles[ERGO_ANGLES.LEFT_SHOULDER_RAISE] = angleBetween(this.joints[JOINTS.LEFT_SHOULDER].clone().sub(this.joints[JOINTS.NECK]), this.orientations.trunk.up);

        const rightUpperArmDown = this.orientations.rightUpperArm.up.clone().negate();
        this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_RAISE] = angleBetween(rightUpperArmDown, trunkDown);
        this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_GRAVITY] = angleBetween(rightUpperArmDown, down);
        this.angles[ERGO_ANGLES.RIGHT_SHOULDER_RAISE] = angleBetween(this.joints[JOINTS.RIGHT_SHOULDER].clone().sub(this.joints[JOINTS.NECK]), this.orientations.trunk.up);

        /* lower arms */
        this.angles[ERGO_ANGLES.LEFT_LOWER_ARM_BEND] = angleBetween(this.orientations.leftLowerArm.up, this.orientations.leftUpperArm.up);
        // Twist of hand wrt. rotation axis of elbow. When the both vectors below ('thumb' direction and elbow rotation axis towards the body) have zero angle angle between them there is no twist.
        // When the both vectors have 180deg angle between them there is the maximum twist.
        // This formulation attempts to be agnostic to a pose of entire arm wrt. upper body.
        this.angles[ERGO_ANGLES.LEFT_LOWER_ARM_TWIST] = angleBetween(this.orientations.leftLowerArm.right, this.orientations.leftHand.right);  

        this.angles[ERGO_ANGLES.RIGHT_LOWER_ARM_BEND] = angleBetween(this.orientations.rightLowerArm.up, this.orientations.rightUpperArm.up);
        this.angles[ERGO_ANGLES.RIGHT_LOWER_ARM_TWIST] = angleBetween(this.orientations.rightLowerArm.right.clone().negate(), this.orientations.rightHand.right.clone().negate()); // negated to have a symmetrical definition of twist angle for left and right arm

        /* hands */
        const leftLowerArmDirection = this.orientations.leftLowerArm.up.clone().negate();
        // Front bend of hand from midline of lower arm (wrist flexion/extention). The angle is positive when extending in the back-of-hand direction and negative when flexing in the palm direction.
        this.angles[ERGO_ANGLES.LEFT_HAND_FRONT_BEND] = angleBetween(this.orientations.leftHand.forward, leftLowerArmDirection) - 90;
        // Side bend of hand from midline of lower arm. The angle is positive when the hand bends in 'thumb' direction and negative when in the opposite direction.
        this.angles[ERGO_ANGLES.LEFT_HAND_SIDE_BEND]  = angleBetween(this.orientations.leftHand.right, leftLowerArmDirection) - 90;   

        const rightLowerArmDirection = this.orientations.rightLowerArm.up.clone().negate();
        this.angles[ERGO_ANGLES.RIGHT_HAND_FRONT_BEND] = angleBetween(this.orientations.rightHand.forward, rightLowerArmDirection) - 90;
        this.angles[ERGO_ANGLES.RIGHT_HAND_SIDE_BEND]  = angleBetween(this.orientations.rightHand.right.clone().negate(), rightLowerArmDirection) - 90; // negated to have a symmetrical definition of the angle for left and right hand
    }

    calculateOffsets() {
        this.offsets[ERGO_OFFSETS.LEFT_TO_RIGHT_FOOT] = new THREE.Vector3().subVectors(this.joints[JOINTS.RIGHT_ANKLE], this.joints[JOINTS.LEFT_ANKLE]);
    }
    
}

