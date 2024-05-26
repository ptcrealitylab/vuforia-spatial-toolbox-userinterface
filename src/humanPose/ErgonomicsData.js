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
 * Clamp a value between a minimum and maximum.
 * @param {number} value The value to clamp.
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @return {number} The clamped value.
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/** 
 * Maximum angle between two vectors with similar direction.
 * Used to assess whether a vector is too similar to a normal of a plane onto which we want to project it.
 */
const MAX_ANGLE_SIMILAR_VECTORS = 10    // deg

/**
 * @typedef {Object} Orientation
 * @property {Vector3} forward The forward direction of the orientation
 * @property {Vector3} up The up direction of the orientation
 * @property {Vector3} right The right direction of the orientation
 */

/**
 * @typedef {Class} ErgonomicsData
 * @property {Object.<string, Vector3>} joints The joint 3D positions of the pose
 * @property {Object.<string, boolean>} jointValidities The validity flags of joint positions
 * @property {Object.<string, Orientation>} orientations The orientations of body parts
 * @property {Object.<string, number>} jointScores The joint ergonomic scores of the pose
 * @property {Object.<string, Color>} jointColors The joint colors based on ergonomic scores
 * @property {Object.<string, number>} boneScores The bone ergonomic scores of the pose
 * @property {Object.<string, Color>} boneColors The bone colors based on ergonomic scores
 * @property {number} overallScore The overall ergonomic score of the pose
 * @property {Color} overallColor The overall color based on ergonomic score of the pose
 * @property {Object.<string, number>} angles The angles of joints for the pose
 * @property {Object.<string, Vector3>} offsets The offsets between selected joints for the pose
 */

/**
 * ErgonomicsData class computes and stores base data for ergonomic assessement for a single input human pose. 
 * These include different angles of joints and 3d offsets between joints. They can used to calculate ergonomic scores based on various assessement methods (eg. REBA) 
 * Calculations assume human poses defined in Y-up world CS and in milimeter units.
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
        // Keys are defined in ERGO_ANGLES and values have the float type.
        // If a key is not defined, a respective angle could not be calculated.
        this.angles = {}; 
        // Keys are defined in ERGO_OFFSETS and values have the type of THREE.Vector3().
        // If a key is not defined, a respective offset could not be calculated.
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
        // Warning: When leftUpperArm.up and leftLowerArm.up are collinear, leftLowerArm.right (by extension leftUpperArm.right) are unstable.
        //          It is not possible to set this axis consistenly for all straight arm directions based on the joint positions alone. 
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
        // Warning: When rightUpperArm.up and rightLowerArm.up are collinear, rightLowerArm.right (by extension rightUpperArm.right) are unstable.
        //          It is not possible to set this axis consistenly for all straight arm directions based on the joint positions alone. 
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
        // NOTE: not checking if all needed joints have a valid position (head and neck joints are always valid)
        const up = new THREE.Vector3(0, 1, 0);  // opposite to the gravity vector
        // Overall bend angle from upright direction (only positive range [0, 180]deg)
        this.angles[ERGO_ANGLES.TRUNK_BEND] = angleBetween(this.orientations.trunk.up, up);
        // Projection of trunk direction to sagittal/median plane of body where normal is this.orientations.hips.right. This assumes that both vectors have unit length.
        const trunkUpSagittalProjection = this.orientations.trunk.up.clone().sub(this.orientations.hips.right.clone().multiplyScalar(this.orientations.hips.right.dot(this.orientations.trunk.up)));
        // Front bend angle from upright direction. The angle is positive when bending forwards and negative when bending backwards.
        if (Math.abs(this.orientations.trunk.up.dot(this.orientations.hips.right)) < Math.cos(MAX_ANGLE_SIMILAR_VECTORS * (Math.PI / 180))) {
            this.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] = angleBetween(trunkUpSagittalProjection, up);
        }
        else {
            // correction for the angle instability when the trunk is close to perpendicular to the plane it is projected onto
            this.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] = this.angles[ERGO_ANGLES.TRUNK_BEND];
        }
        if (trunkUpSagittalProjection.dot(this.orientations.hips.forward) < 0) {
            this.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] *= -1;
        }
        // Projection of trunk direction to frontal plane of body where normal is this.orientations.hips.forward. This assumes that both vectors have unit length.
        const trunkUpFrontalProjection = this.orientations.trunk.up.clone().sub(this.orientations.hips.forward.clone().multiplyScalar(this.orientations.hips.forward.dot(this.orientations.trunk.up)));
        // Side bend angle from upright direction. The angle is positive when bending to the right and negative when bending to the left.
        if (Math.abs(this.orientations.trunk.up.dot(this.orientations.hips.forward)) < Math.cos(MAX_ANGLE_SIMILAR_VECTORS * (Math.PI / 180))) {
            this.angles[ERGO_ANGLES.TRUNK_SIDE_BEND] = angleBetween(trunkUpFrontalProjection, up);
        }
        else {
            // correction for the angle instability when the trunk is close to perpendicular to the plane it is projected onto (90 deg front bend)
            this.angles[ERGO_ANGLES.TRUNK_SIDE_BEND] = this.angles[ERGO_ANGLES.TRUNK_BEND];
        }
        if (trunkUpFrontalProjection.dot(this.orientations.hips.right) < 0) {
            this.angles[ERGO_ANGLES.TRUNK_SIDE_BEND] *= -1;
        }
        // Twist angle wrt hips forward direction (range of [-90, 90]deg). The angle is positive when twisting to the right and negative when twisting to the left.
        this.angles[ERGO_ANGLES.TRUNK_TWIST] = angleBetween(this.orientations.trunk.right, this.orientations.hips.forward) - 90;  // this calculation makes the twist largely independent from front/side bend of the trunk
        //console.log(`Trunk: bendAngle=${this.angles[ERGO_ANGLES.TRUNK_BEND].toFixed(0)}deg; frontBendAngle=${this.angles[ERGO_ANGLES.TRUNK_FRONT_BEND].toFixed(0)}deg;
        //             sideBendAngle=${this.angles[ERGO_ANGLES.TRUNK_SIDE_BEND].toFixed(0)}deg; twistAngle=${this.angles[ERGO_ANGLES.TRUNK_TWIST].toFixed(0)}deg`);

        /* head */
        // NOTE: not checking if all needed joints have a valid position (head and neck joints are always valid)
        // Overall bend angle from trunk up direction (only positive range [0, 180]deg)
        this.angles[ERGO_ANGLES.HEAD_BEND] = angleBetween(this.orientations.head.up, this.orientations.trunk.up);
        // Projection of head direction to sagittal/median plane of trunk where normal is this.orientations.trunk.right. This assumes that both vectors have unit length.
        const headUpSagittalProjection = this.orientations.head.up.clone().sub(this.orientations.trunk.right.clone().multiplyScalar(this.orientations.trunk.right.dot(this.orientations.head.up)));
        // Front bend angle from trunk up direction. The angle is positive when bending forwards and negative when bending backwards.
        this.angles[ERGO_ANGLES.HEAD_FRONT_BEND] = angleBetween(headUpSagittalProjection, this.orientations.trunk.up);
        if (headUpSagittalProjection.dot(this.orientations.trunk.forward) < 0) {
            this.angles[ERGO_ANGLES.HEAD_FRONT_BEND] *= -1;
        }
        // Projection of head direction to frontal plane of trunk where normal is this.orientations.trunk.forward. This assumes that both vectors have unit length.
        const headUpFrontalProjection = this.orientations.head.up.clone().sub(this.orientations.trunk.forward.clone().multiplyScalar(this.orientations.trunk.forward.dot(this.orientations.head.up)));
        // Side bend angle from trunk up direction. The angle is positive when bending to the right and negative when bending to the left.
        this.angles[ERGO_ANGLES.HEAD_SIDE_BEND] = angleBetween(headUpFrontalProjection, this.orientations.trunk.up);
        if (headUpFrontalProjection.dot(this.orientations.trunk.right) < 0) {
            this.angles[ERGO_ANGLES.HEAD_SIDE_BEND] *= -1;
        }
        // Twist angle wrt trunk forward direction (range of [-90, 90]deg). The angle is positive when twisting to the right and negative when twisting to the left.
        this.angles[ERGO_ANGLES.HEAD_TWIST] = angleBetween(this.orientations.head.right, this.orientations.trunk.forward) - 90;  // this calculation makes the twist largely independent from front/side bend of the head
        //console.log(`Head: bendAngle=${this.angles[ERGO_ANGLES.HEAD_BEND].toFixed(0)}deg; frontBendAngle=${this.angles[ERGO_ANGLES.HEAD_FRONT_BEND].toFixed(0)}deg;
        //             sideBendAngle=${this.angles[ERGO_ANGLES.HEAD_SIDE_BEND].toFixed(0)}deg; twistAngle=${this.angles[ERGO_ANGLES.HEAD_TWIST].toFixed(0)}deg`);

        /* legs */
        // Bend angle between lower and upper leg (only positive range [0, 180]deg). The angle is zero when a leg is straight.
        if (this.jointValidities[JOINTS.LEFT_KNEE] &&
            this.jointValidities[JOINTS.LEFT_ANKLE] &&
            this.jointValidities[JOINTS.LEFT_HIP]) {  // check if all needed joints have a valid position
            this.angles[ERGO_ANGLES.LEFT_LOWER_LEG_BEND] = angleBetween(this.orientations.leftUpperLeg.up,  this.orientations.leftLowerLeg.up);
        }
        
        if (this.jointValidities[JOINTS.RIGHT_KNEE] &&
            this.jointValidities[JOINTS.RIGHT_ANKLE] &&
            this.jointValidities[JOINTS.RIGHT_HIP]) {  // check if all needed joints have a valid position
            this.angles[ERGO_ANGLES.RIGHT_LOWER_LEG_BEND] = angleBetween(this.orientations.rightUpperLeg.up,  this.orientations.rightLowerLeg.up);
        }

        /* upper arms */
        // Angles for upper arm are primarily measured relative to trunk direction rather than the gravity direction
        const down = new THREE.Vector3(0, -1, 0);    // the gravity vector
        const trunkDown = this.orientations.trunk.up.clone().negate();
        if (this.jointValidities[JOINTS.LEFT_ELBOW] && this.jointValidities[JOINTS.LEFT_SHOULDER]) { // check if all needed joints have a valid position
            const leftUpperArmDown = this.orientations.leftUpperArm.up.clone().negate();
            // Overall raise angle from trunk down direction (only positive range [0, 180]deg)
            this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_RAISE] = angleBetween(leftUpperArmDown, trunkDown);
            // Projection of upper arm direction to sagittal/median plane of trunk where normal is this.orientations.trunk.right. This assumes that both vectors have unit length.
            const leftArmDownSagittalProjection = leftUpperArmDown.clone().sub(this.orientations.trunk.right.clone().multiplyScalar(this.orientations.trunk.right.dot(leftUpperArmDown)));
            // Front raise angle from trunk down direction (range [-180, 180]deg). The angle is positive when raising forwards and negative when raising backwards.
            if (Math.abs(leftUpperArmDown.dot(this.orientations.trunk.right)) < Math.cos(MAX_ANGLE_SIMILAR_VECTORS * (Math.PI / 180))) {
                this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_FRONT_RAISE] = angleBetween(leftArmDownSagittalProjection, trunkDown);
            }
            else {
                // correction for the angle instability when arm is close to perpendicular to the plane it is projected onto
                this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_FRONT_RAISE] = this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_RAISE];
            }
            if (leftArmDownSagittalProjection.dot(this.orientations.trunk.forward) < 0) {
                this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_FRONT_RAISE] *= -1;
            }
            
            // Projection of upper arm direction to frontal plane of trunk where normal is this.orientations.trunk.forward. This assumes that both vectors have unit length.
            const leftArmDownFrontalProjection = leftUpperArmDown.clone().sub(this.orientations.trunk.forward.clone().multiplyScalar(this.orientations.trunk.forward.dot(leftUpperArmDown)));
            // Side raise angle from trunk down direction (range [-180, 180]deg). The angle is positive when raising away from the body (abduction) and negative when raising towards the body.
            if (Math.abs(leftUpperArmDown.dot(this.orientations.trunk.forward)) < Math.cos(MAX_ANGLE_SIMILAR_VECTORS * (Math.PI / 180))) {
                this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_SIDE_RAISE] = angleBetween(leftArmDownFrontalProjection, trunkDown);
            }
            else {
                // correction for the angle instability when arm is close to perpendicular to the plane it is projected onto
                this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_SIDE_RAISE] = this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_RAISE];
            }
            if (leftArmDownFrontalProjection.dot(this.orientations.trunk.right.clone().negate()) < 0) {  // negated to have a symmetrical definition of the angle for left and right arm
                this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_SIDE_RAISE] *= -1;
            }
            // Overall raise angle from gravity direction (only positive range [0, 180]deg)
            this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_GRAVITY] = angleBetween(leftUpperArmDown, down);
            // Angle between shoulder line and trunk direction (normally 90 deg in the rest pose). The angle is <90deg when the shoulder is raised.
            this.angles[ERGO_ANGLES.LEFT_SHOULDER_RAISE] = angleBetween(this.joints[JOINTS.LEFT_SHOULDER].clone().sub(this.joints[JOINTS.NECK]), this.orientations.trunk.up);
            //console.log(`Left upper arm: raiseAngle=${this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_RAISE].toFixed(0)}deg; frontRaiseAngle=${this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_FRONT_RAISE].toFixed(0)}deg;
            //             sideRaiseAngle=${this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_SIDE_RAISE].toFixed(0)}deg; gravityAngle=${this.angles[ERGO_ANGLES.LEFT_UPPER_ARM_GRAVITY].toFixed(0)}deg`);
        }

        if (this.jointValidities[JOINTS.RIGHT_ELBOW] && this.jointValidities[JOINTS.RIGHT_SHOULDER]) { // check if all needed joints have a valid position
            const rightUpperArmDown = this.orientations.rightUpperArm.up.clone().negate();
            this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_RAISE] = angleBetween(rightUpperArmDown, trunkDown);
            const rightArmDownSagittalProjection = rightUpperArmDown.clone().sub(this.orientations.trunk.right.clone().multiplyScalar(this.orientations.trunk.right.dot(rightUpperArmDown)));
            if (Math.abs(rightUpperArmDown.dot(this.orientations.trunk.right)) < Math.cos(MAX_ANGLE_SIMILAR_VECTORS * (Math.PI / 180))) {
                this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_FRONT_RAISE] = angleBetween(rightArmDownSagittalProjection, trunkDown);
            }
            else {
                this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_FRONT_RAISE] = this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_RAISE];
            }
            if (rightArmDownSagittalProjection.dot(this.orientations.trunk.forward) < 0) {
                this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_FRONT_RAISE] *= -1;
            }
            const rightArmDownFrontalProjection = rightUpperArmDown.clone().sub(this.orientations.trunk.forward.clone().multiplyScalar(this.orientations.trunk.forward.dot(rightUpperArmDown)));
            if (Math.abs(rightUpperArmDown.dot(this.orientations.trunk.forward)) < Math.cos(MAX_ANGLE_SIMILAR_VECTORS * (Math.PI / 180))) {
                this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_SIDE_RAISE] = angleBetween(rightArmDownFrontalProjection, trunkDown);
            }
            else {
                this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_SIDE_RAISE] = this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_RAISE];
            }
            if (rightArmDownFrontalProjection.dot(this.orientations.trunk.right) < 0) {
                this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_SIDE_RAISE] *= -1;
            }
            this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_GRAVITY] = angleBetween(rightUpperArmDown, down);
            this.angles[ERGO_ANGLES.RIGHT_SHOULDER_RAISE] = angleBetween(this.joints[JOINTS.RIGHT_SHOULDER].clone().sub(this.joints[JOINTS.NECK]), this.orientations.trunk.up);
            //console.log(`Right upper arm: raiseAngle=${this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_RAISE].toFixed(0)}deg; frontRaiseAngle=${this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_FRONT_RAISE].toFixed(0)}deg;
            //             sideRaiseAngle=${this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_SIDE_RAISE].toFixed(0)}deg; gravityAngle=${this.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_GRAVITY].toFixed(0)}deg`);
        }


        /* lower arms */
        // Bend angle between lower and upper arm (only positive range [0, 180]deg). The angle is zero when an arm is straight.
        if (this.jointValidities[JOINTS.LEFT_WRIST] && this.jointValidities[JOINTS.LEFT_ELBOW] && this.jointValidities[JOINTS.LEFT_SHOULDER]) {   // check if all needed joints have a valid position
            this.angles[ERGO_ANGLES.LEFT_LOWER_ARM_BEND] = angleBetween(this.orientations.leftLowerArm.up, this.orientations.leftUpperArm.up);

            if (this.jointValidities[JOINTS.LEFT_INDEX_FINGER_MCP] && this.jointValidities[JOINTS.LEFT_PINKY_MCP] && this.jointValidities[JOINTS.LEFT_MIDDLE_FINGER_MCP] && // check if hand joints have valid positions
                this.angles[ERGO_ANGLES.LEFT_LOWER_ARM_BEND] > MAX_ANGLE_SIMILAR_VECTORS) {  // check if the arm is almost straight, therefore the rotation axis of elbow (leftLowerArm.right) cannot be calculated reliably
                // Twist of hand wrt. rotation axis of elbow (only positive range [0, 180]deg). When the both vectors below ('thumb' direction and elbow rotation axis towards the body) have zero angle angle between them there is no twist.
                // When the both vectors have 180deg angle between them there is the maximum twist.
                // This formulation attempts to be agnostic to a pose of entire arm wrt. upper body.
                this.angles[ERGO_ANGLES.LEFT_LOWER_ARM_TWIST] = angleBetween(this.orientations.leftLowerArm.right, this.orientations.leftHand.right);
            } 
        } 

        if (this.jointValidities[JOINTS.RIGHT_WRIST] && this.jointValidities[JOINTS.RIGHT_ELBOW] && this.jointValidities[JOINTS.RIGHT_SHOULDER]) {   // check if all needed joints have a valid position
            this.angles[ERGO_ANGLES.RIGHT_LOWER_ARM_BEND] = angleBetween(this.orientations.rightLowerArm.up, this.orientations.rightUpperArm.up);
            
            if (this.jointValidities[JOINTS.RIGHT_INDEX_FINGER_MCP] && this.jointValidities[JOINTS.RIGHT_PINKY_MCP] && this.jointValidities[JOINTS.RIGHT_MIDDLE_FINGER_MCP] &&
                this.angles[ERGO_ANGLES.RIGHT_LOWER_ARM_BEND] > MAX_ANGLE_SIMILAR_VECTORS) {
                this.angles[ERGO_ANGLES.RIGHT_LOWER_ARM_TWIST] = angleBetween(this.orientations.rightLowerArm.right.clone().negate(), this.orientations.rightHand.right.clone().negate()); // negated to have a symmetrical definition of twist angle for left and right arm
            }
        }

        /* hands */
        if (this.jointValidities[JOINTS.LEFT_INDEX_FINGER_MCP] && this.jointValidities[JOINTS.LEFT_PINKY_MCP] && this.jointValidities[JOINTS.LEFT_MIDDLE_FINGER_MCP] &&
            this.jointValidities[JOINTS.LEFT_WRIST] && this.jointValidities[JOINTS.LEFT_ELBOW]) {  // check if all needed joints have a valid position
            const leftLowerArmDirection = this.orientations.leftLowerArm.up.clone().negate();
            // Front bend of hand from midline of lower arm (wrist flexion/extention). The angle is positive when extending in the back-of-hand direction and negative when flexing in the palm direction (range [-90, 90]deg).
            this.angles[ERGO_ANGLES.LEFT_HAND_FRONT_BEND] = angleBetween(this.orientations.leftHand.forward, leftLowerArmDirection) - 90;
            // Side bend of hand from midline of lower arm. The angle is positive when the hand bends in 'thumb' direction and negative when in the opposite direction (range [-90, 90]deg).
            this.angles[ERGO_ANGLES.LEFT_HAND_SIDE_BEND]  = angleBetween(this.orientations.leftHand.right, leftLowerArmDirection) - 90;
        }   

        if (this.jointValidities[JOINTS.RIGHT_INDEX_FINGER_MCP] && this.jointValidities[JOINTS.RIGHT_PINKY_MCP] && this.jointValidities[JOINTS.RIGHT_MIDDLE_FINGER_MCP] &&
            this.jointValidities[JOINTS.RIGHT_WRIST] && this.jointValidities[JOINTS.RIGHT_ELBOW]) {  // check if all needed joints have a valid position
            const rightLowerArmDirection = this.orientations.rightLowerArm.up.clone().negate();
            this.angles[ERGO_ANGLES.RIGHT_HAND_FRONT_BEND] = angleBetween(this.orientations.rightHand.forward, rightLowerArmDirection) - 90;
            this.angles[ERGO_ANGLES.RIGHT_HAND_SIDE_BEND]  = angleBetween(this.orientations.rightHand.right.clone().negate(), rightLowerArmDirection) - 90; // negated to have a symmetrical definition of the angle for left and right hand
        } 
    }

    calculateOffsets() {
        // 3D offset from left to right ankle. Used to check if the feet are the same height.
        if (this.jointValidities[JOINTS.LEFT_ANKLE] &&
            this.jointValidities[JOINTS.RIGHT_ANKLE]) {   // check if all needed joints have a valid position
            this.offsets[ERGO_OFFSETS.LEFT_TO_RIGHT_FOOT] = new THREE.Vector3().subVectors(this.joints[JOINTS.RIGHT_ANKLE], this.joints[JOINTS.LEFT_ANKLE]);
            //console.log(`footHeightDifference=${Math.abs(this.offsets[ERGO_OFFSETS.LEFT_TO_RIGHT_FOOT].y.toFixed(0))}mm`);
        }
        
        // 3D offset from pelvis to a wrist is defined wrt. local CS of hips (not WCS as joint positions). This uses deliberately hips CS rather than trunk CS.
        // Used to check the extent of reaches by hands.
        const rotWorldToHips = new THREE.Matrix3().set(this.orientations.hips.forward.x, this.orientations.hips.forward.y, this.orientations.hips.forward.z,
                                           this.orientations.hips.up.x, this.orientations.hips.up.y, this.orientations.hips.up.z, 
                                           this.orientations.hips.right.x, this.orientations.hips.right.y, this.orientations.hips.right.z); 
        if (this.jointValidities[JOINTS.LEFT_WRIST] &&
            this.jointValidities[JOINTS.PELVIS]) {   // check if all needed joints have a valid position
            let leftWristOffsetInWorld = new THREE.Vector3().subVectors(this.joints[JOINTS.LEFT_WRIST], this.joints[JOINTS.PELVIS]);
            this.offsets[ERGO_OFFSETS.PELVIS_TO_LEFT_WRIST] = leftWristOffsetInWorld.applyMatrix3(rotWorldToHips);
             //console.log(`leftWristOffset=[${this.offsets[ERGO_OFFSETS.PELVIS_TO_LEFT_WRIST].x.toFixed(0)}, ${this.offsets[ERGO_OFFSETS.PELVIS_TO_LEFT_WRIST].y.toFixed(0)}, ${this.offsets[ERGO_OFFSETS.PELVIS_TO_LEFT_WRIST].z.toFixed(0)}]; 
             //        leftWristDistance=${this.offsets[ERGO_OFFSETS.PELVIS_TO_LEFT_WRIST].length().toFixed(0)}mm`);
               
        }
        
        if (this.jointValidities[JOINTS.RIGHT_WRIST] &&
            this.jointValidities[JOINTS.PELVIS]) {   // check if all needed joints have a valid position
            let rightWristOffsetInWorld = new THREE.Vector3().subVectors(this.joints[JOINTS.RIGHT_WRIST], this.joints[JOINTS.PELVIS]);
            this.offsets[ERGO_OFFSETS.PELVIS_TO_RIGHT_WRIST] = rightWristOffsetInWorld.applyMatrix3(rotWorldToHips);
            /*console.log(`rightWristOffset=[${this.offsets[ERGO_OFFSETS.PELVIS_TO_RIGHT_WRIST].x.toFixed(0)}, ${this.offsets[ERGO_OFFSETS.PELVIS_TO_RIGHT_WRIST].y.toFixed(0)}, ${this.offsets[ERGO_OFFSETS.PELVIS_TO_RIGHT_WRIST].z.toFixed(0)}]; 
                     rightWristDistance=${this.offsets[ERGO_OFFSETS.PELVIS_TO_RIGHT_WRIST].length().toFixed(0)}mm`);*/
        }
        
    }
    
}

