/**
 * Pose is a class that represents a human pose.
 * It keeps track of the positions of each joint in the pose.
 * It also keeps track of the timestamp of when the pose was recorded.
 */
import {JOINT_CONNECTIONS, JOINTS, LEFT_HAND_JOINTS, RIGHT_HAND_JOINTS} from "./constants.js";

export class Pose {
    /**
     * Creates a new Pose object.
     * @param {Object} jointPositions An object that maps joint names to joint positions (in ground-plane space).
     * @param {Object} jointConfidences An object that maps joint names to joint confidences.
     * @param {Number} timestamp The timestamp of when the pose was recorded.
     * @param {Object} metadata An object that contains additional metadata about the pose.
     */
    constructor(jointPositions, jointConfidences, timestamp, metadata) {
        this.joints = {}; // Maps joint names to joint data
        Object.keys(jointPositions).forEach(jointName => {
            this.joints[jointName] = {
                position: jointPositions[jointName],
                confidence: jointConfidences[jointName],
                name: jointName,
                valid: true
            }
        });
        this.bones = {}; // Maps bone names to bone data
        Object.keys(JOINT_CONNECTIONS).forEach(boneName => {
            const [joint0, joint1] = JOINT_CONNECTIONS[boneName];
            if (this.joints[joint0] && this.joints[joint1]) {
                this.bones[boneName] = {
                    joint0: this.joints[joint0],
                    joint1: this.joints[joint1],
                    name: boneName,
                    valid: true 
                };
            }
        });
        this.timestamp = timestamp;
        this.metadata = metadata;
    }

    /**
     * Returns a specific joint in the pose.
     * @param {string} jointName The name of the joint to return.
     */
    getJoint(jointName) {
        return this.joints[jointName];
    }

    /**
     * Returns a specific bone in the pose.
     * @param {string} boneName The name of the bone to return.
     */
    getBone(boneName) {
        return this.bones[boneName];
    }

    /**
     * Applies a function to each joint in the pose.
     * @param {Function} callback The function to apply to each joint.
     */
    forEachJoint(callback) {
        Object.keys(this.joints).forEach((jointName, index) => {
            callback(this.joints[jointName], index);
        });
    }

    /**
     * Applies a function to each bone in the pose.
     * @param {Function} callback The function to apply to each bone.
     */
    forEachBone(callback) {
        Object.keys(this.bones).forEach((boneName, index) => {
            callback(this.bones[boneName], index);
        });
    }

    setBodyPartValidity(jointConfidenceThreshold) {

        // compute validity only for limbs (head and torso are valid by default)
        const limbJoints = [JOINTS.LEFT_ANKLE, JOINTS.LEFT_KNEE, 
                      JOINTS.RIGHT_ANKLE, JOINTS.RIGHT_KNEE,
                      JOINTS.LEFT_ELBOW, JOINTS.LEFT_WRIST, ...LEFT_HAND_JOINTS,
                      JOINTS.RIGHT_ELBOW, JOINTS.RIGHT_WRIST, ...RIGHT_HAND_JOINTS
                     ];

        limbJoints.forEach((jointName) => {
            this.joints[jointName].valid = (this.joints[jointName].confidence >= jointConfidenceThreshold);
        });

        // when knees are not valid, whole legs are invalid including ankles
        if (!this.joints[JOINTS.LEFT_KNEE].valid) {
            this.joints[JOINTS.LEFT_ANKLE].valid = false;
        }
        if (!this.joints[JOINTS.RIGHT_KNEE].valid) {
            this.joints[JOINTS.RIGHT_ANKLE].valid = false;
        }
        // when wrists are not valid, whole hands are invalid
        if (!this.joints[JOINTS.LEFT_WRIST].valid) {
            LEFT_HAND_JOINTS.forEach((jointName) => {
                this.joints[jointName].valid = false;
            });
        }
        if (!this.joints[JOINTS.RIGHT_WRIST].valid) {
            RIGHT_HAND_JOINTS.forEach((jointName) => {
                this.joints[jointName].valid = false;
            });
        }
        // when the hand and elbow are not valid, the wrist is invalid as well
        if (!this.joints[JOINTS.LEFT_ELBOW].valid && !this.joints[JOINTS.LEFT_THUMB_CMC].valid) {
            this.joints[JOINTS.LEFT_WRIST].valid = false;
        }
        if (!this.joints[JOINTS.RIGHT_ELBOW].valid && !this.joints[JOINTS.RIGHT_THUMB_CMC].valid) {
            this.joints[JOINTS.RIGHT_WRIST].valid = false;
        }

        // make invalid the bones adjacent to invalid joints
        Object.keys(this.bones).forEach((boneName) => {
            const jointName0 = this.bones[boneName].joint0.name;
            const jointName1 = this.bones[boneName].joint1.name;
            this.bones[boneName].valid = this.joints[jointName0].valid && this.joints[jointName1].valid;
        });

    }

}
