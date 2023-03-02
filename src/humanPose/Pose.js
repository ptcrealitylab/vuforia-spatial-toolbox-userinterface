/**
 * Pose is a class that represents a human pose.
 * It keeps track of the positions of each joint in the pose.
 * It also keeps track of the timestamp of when the pose was recorded.
 */
import {JOINT_CONNECTIONS} from "./utils.js";

class Pose {
    /**
     * Creates a new Pose object.
     * @param {Object} jointPositions An object that maps joint names to joint positions (in ground-plane space).
     * @param {Number} timestamp The timestamp of when the pose was recorded.
     * @param {Object} metadata An object that contains additional metadata about the pose.
     */
    constructor(jointPositions, timestamp, metadata) {
        this.joints = {}; // Maps joint names to joint data
        Object.keys(jointPositions).forEach(jointName => {
            this.joints[jointName] = {
                position: jointPositions[jointName],
                name: jointName
            }
        });
        this.bones = {}; // Maps bone names to bone data
        Object.keys(JOINT_CONNECTIONS).forEach(boneName => {
            const [joint0, joint1] = JOINT_CONNECTIONS[boneName];
            if (this.joints[joint0] && this.joints[joint1]) {
                this.bones[boneName] = {
                    joint0: this.joints[joint0],
                    joint1: this.joints[joint1],
                    name: boneName
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
}

export default Pose;
