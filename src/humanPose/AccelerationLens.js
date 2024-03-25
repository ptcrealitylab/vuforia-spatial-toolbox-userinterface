import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {MotionStudyLens} from "./MotionStudyLens.js";
import {MotionStudyColors} from "./MotionStudyColors.js";
import {JOINTS} from "./constants.js";

const HIGH_CUTOFF = 35; // in m/s^2
const MED_CUTOFF = 15; // in m/s^2

export const MIN_ACCELERATION = 0; // in m/s^2
export const MAX_ACCELERATION = 40; // in m/s^2

/**
 * AccelerationLens is a lens that calculates the acceleration of each joint in the pose history.
 */
export class AccelerationLens extends MotionStudyLens {
    /**
     * Creates a new AccelerationLens object.
     */
    constructor() {
        super("Acceleration");
    }

    /**
     * Checks if the given joint has had its velocity calculated.
     * @param {Object} joint The joint to check.
     * @return {boolean} True if the joint has had its velocity calculated, false otherwise.
     */
    velocityAppliedToJoint(joint) {
        return joint.velocity && joint.speed && joint.speed !== -1;
    }

    /**
     * Checks if the given joint has had its acceleration calculated.
     * @param {Object} joint The joint to check.
     * @return {boolean} True if the joint has had its acceleration calculated, false otherwise.
     */
    accelerationAppliedToJoint(joint) {
        return joint.acceleration && joint.accelerationMagnitude && joint.accelerationMagnitude !== -1
    }
    
    applyLensToPose(pose) {
        const previousPose = pose.metadata.previousPose;
        const previousPreviousPose = previousPose ? previousPose.metadata.previousPose : null;
        if (!previousPose) {
            pose.forEachJoint(joint => {
                // Velocity and acceleration are zero for the first pose
                joint.velocity = new THREE.Vector3(); 
                joint.speed = -1; // -1 means that the metric cannot calculated based on data
                joint.acceleration = new THREE.Vector3();
                joint.accelerationMagnitude = -1; // -1 means that the metric cannot calculated based on data
            });
        } else if (!previousPreviousPose) {
            pose.forEachJoint(joint => {
                const previousJoint = previousPose.getJoint(joint.name);
                if (!joint.valid || !previousJoint.valid) {
                    // Velocity and acceleration are zero if a joint is invalid in current or previous pose
                    joint.velocity = new THREE.Vector3();
                    joint.speed = -1;
                    joint.acceleration = new THREE.Vector3();
                    joint.accelerationMagnitude = -1;
                } else {  // joint.valid == true && previousJoint.valid == true 
                    joint.velocity = joint.position.clone().sub(previousJoint.position).divideScalar(pose.timestamp - previousPose.timestamp); // mm/ms = m/s
                    joint.speed = joint.velocity.length();
                    // Acceleration is zero for the second pose
                    joint.acceleration = new THREE.Vector3(); 
                    joint.accelerationMagnitude = -1;
                }
            });
        } else {
            pose.forEachJoint(joint => {
                const previousJoint = previousPose.getJoint(joint.name);
                const previousPreviousJoint = previousPreviousPose.getJoint(joint.name);
                if (!joint.valid || !previousJoint.valid) {
                    // Velocity and acceleration are zero if a joint is invalid in current or previous pose
                    joint.velocity = new THREE.Vector3();
                    joint.speed = -1;
                    joint.acceleration = new THREE.Vector3();
                    joint.accelerationMagnitude = -1;
                } else if (!previousPreviousJoint.valid) {   // joint.valid == true && previousJoint.valid == true
                    joint.velocity = joint.position.clone().sub(previousJoint.position).divideScalar(pose.timestamp - previousPose.timestamp); // mm/ms = m/s
                    joint.speed = joint.velocity.length();
                    // Acceleration is zero if a joint is invalid in previous previous pose
                    joint.acceleration = new THREE.Vector3();
                    joint.accelerationMagnitude = -1;
                } else {  // joint.valid == true && previousJoint.valid == true && previousPreviousJoint.valid == true
                    joint.velocity = joint.position.clone().sub(previousJoint.position).divideScalar(pose.timestamp - previousPose.timestamp); // mm/ms = m/s
                    joint.speed = joint.velocity.length();
                    joint.acceleration = joint.velocity.clone().sub(previousJoint.velocity).divideScalar((pose.timestamp - previousPose.timestamp) / 1000);
                    joint.accelerationMagnitude = joint.acceleration.length();
                }
            });
        }
        return true;
    }

    applyLensToHistoryMinimally(poseHistory) {
        if (poseHistory.length === 0) {
            return [];
        }
        const pose = poseHistory[poseHistory.length - 1];
        this.applyLensToPose(pose);
        return poseHistory.map((pose, index) => index === poseHistory.length - 1); // Only last pose was modified
    }

    applyLensToHistory(poseHistory) {
        return poseHistory.map((pose) => {
            this.applyLensToPose(pose);
            return true;
        });
    }

    /**
     * Returns the UI color for a specific acceleration value.
     * @param {Number} acceleration The acceleration value to get the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForAcceleration(acceleration) {
        if (acceleration > HIGH_CUTOFF) {
            return MotionStudyColors.red;
        }
        if (acceleration > MED_CUTOFF) {
            return MotionStudyColors.yellow;
        }
        return MotionStudyColors.green;
    }

    getColorForJoint(joint) {
        if (!this.accelerationAppliedToJoint(joint)) {
            return MotionStudyColors.undefined;
        }
        const acceleration = joint.accelerationMagnitude;
        return this.getColorForAcceleration(acceleration);
    }

    getColorForBone(bone) {
        if (!this.accelerationAppliedToJoint(bone.joint0) || !this.accelerationAppliedToJoint(bone.joint1)) {
            return MotionStudyColors.undefined;
        }
        const maxAcceleration = Math.max(bone.joint0.accelerationMagnitude, bone.joint1.accelerationMagnitude);
        return this.getColorForAcceleration(maxAcceleration);
    }
    
    getColorForPose(pose) {
        // 'head' joint is always valid when body is tracked. Thus, acceleration is calculated under normal circumstances.
        if (!this.accelerationAppliedToJoint(pose.getJoint(JOINTS.HEAD))) {
            return MotionStudyColors.undefined;
        }
        let maxAcceleration = 0;
        pose.forEachJoint(joint => {
            maxAcceleration = Math.max(maxAcceleration, joint.accelerationMagnitude);
        });
        return MotionStudyColors.fade(this.getColorForAcceleration(maxAcceleration));
    }
}
