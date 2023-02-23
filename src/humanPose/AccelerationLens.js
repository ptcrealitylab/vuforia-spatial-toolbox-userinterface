import * as THREE from '../../thirdPartyCode/three/three.module.js';
import AnalyticsLens from "./AnalyticsLens.js";
import AnalyticsColors from "./AnalyticsColors.js";
import {JOINTS} from "./utils.js";

const HIGH_CUTOFF = 35000 // In ???/???^2
const MED_CUTOFF = 15000 // In ???/???^2

/**
 * AccelerationLens is a lens that calculates the acceleration of each joint in the pose history.
 */
class AccelerationLens extends AnalyticsLens {
    /**
     * Creates a new AccelerationLens object.
     */
    constructor() {
        super("Acceleration");
    }

    /**
     * Checks if the given joint has had its velocity calculated.
     * @param joint {Joint} The joint to check.
     * @return {boolean} True if the joint has had its velocity calculated, false otherwise.
     */
    velocityAppliedToJoint(joint) {
        return joint.velocity && joint.speed > 0.000001;
    }

    /**
     * Checks if the given joint has had its acceleration calculated.
     * @param joint {Joint} The joint to check.
     * @return {boolean} True if the joint has had its acceleration calculated, false otherwise.
     */
    accelerationAppliedToJoint(joint) {
        return joint.acceleration && joint.accelerationMagnitude > 0.000001
    }
    
    applyLensToPose(pose) {
        console.error("Cannot apply acceleration lens to an isolated pose, need history");
        return false;
    }

    applyLensToHistoryMinimally(poseHistory) {
        if (poseHistory.length === 0) {
            return [];
        }
        const pose = poseHistory[poseHistory.length - 1];
        if (poseHistory.length === 1) {
            pose.forEachJoint(joint => {
                if (!this.velocityAppliedToJoint(joint)) {
                    joint.velocity = new THREE.Vector3(); // Velocity is zero for the first pose
                    joint.speed = 0;
                    joint.acceleration = new THREE.Vector3(); // Acceleration is zero for the first two poses
                    joint.accelerationMagnitude = 0;
                    return [true];
                }
            });
            return [false];
        } else if (poseHistory.length === 2) {
            const previousPose = poseHistory[0];
            pose.forEachJoint(joint => {
                if (!this.velocityAppliedToJoint(joint)) {
                    const previousJoint = previousPose.getJoint(joint.name);
                    joint.velocity = joint.position.clone().sub(previousJoint.position).divideScalar((pose.timestamp - previousPose.timestamp) / 1000); // Divide by 1000 to convert from ms to s
                    joint.speed = joint.velocity.length();
                    joint.acceleration = new THREE.Vector3(); // Acceleration is zero for the first two poses
                    joint.accelerationMagnitude = 0;
                    return [false, true];
                }
            })
            return [false, false];
        } else {
            const previousPose = poseHistory[poseHistory.length - 2];
            const previousPreviousPose = poseHistory[poseHistory.length - 3];
            let modified = false;
            pose.forEachJoint(joint => {
                if (!this.velocityAppliedToJoint(joint)) {
                    const previousJoint = previousPose.getJoint(joint.name);
                    joint.velocity = joint.position.clone().sub(previousJoint.position).divideScalar((pose.timestamp - previousPose.timestamp) / 1000); // Divide by 1000 to convert from ms to s
                    joint.speed = joint.velocity.length();
                    modified = true;
                }
                if (!this.accelerationAppliedToJoint(joint)) {
                    const previousJoint = previousPose.getJoint(joint.name);
                    joint.acceleration = joint.velocity.clone().sub(previousJoint.velocity).divideScalar(((pose.timestamp - previousPreviousPose.timestamp) / 2) / 1000); // Divide by 2 to get the average time between the two poses, and divide by 1000 to convert from ms to s
                    joint.accelerationMagnitude = joint.acceleration.length();
                    modified = true;
                }
            });
            const modifiedResults = poseHistory.map(() => false);
            modifiedResults[modifiedResults.length - 1] = modified;
            return modifiedResults;
        }
    }

    applyLensToHistory(poseHistory) {
        return poseHistory.map((pose, index) => {
            // Apply to all poses in sequence up to and including the most recent pose
            return this.applyLensToHistoryMinimally(poseHistory.slice(0, index + 1))[index];
        });
    }

    /**
     * Returns the UI color for a specific acceleration value.
     * @param acceleration {Number} The acceleration value to get the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForAcceleration(acceleration) {
        if (acceleration > HIGH_CUTOFF) {
            return AnalyticsColors.red;
        }
        if (acceleration > MED_CUTOFF) {
            return AnalyticsColors.yellow;
        }
        return AnalyticsColors.green;
    }

    getColorForJoint(joint) {
        if (typeof joint.accelerationMagnitude !== "number") {
            return AnalyticsColors.undefined;
        }
        const acceleration = joint.accelerationMagnitude;
        return this.getColorForAcceleration(acceleration);
    }

    getColorForBone(bone) {
        if (typeof bone.joint0.accelerationMagnitude !== "number" || typeof bone.joint1.accelerationMagnitude !== "number") {
            return AnalyticsColors.undefined;
        }
        const maxAcceleration = Math.max(bone.joint0.accelerationMagnitude, bone.joint1.accelerationMagnitude);
        return this.getColorForAcceleration(maxAcceleration);
    }
    
    getColorForPose(pose) {
        if (typeof pose.joints[pose.getJoint(JOINTS.HEAD)].accelerationMagnitude !== "number") {
            return AnalyticsColors.undefined;
        }
        let maxAcceleration = 0;
        pose.forEachJoint(joint => {
            maxAcceleration = Math.max(maxAcceleration, joint.accelerationMagnitude);
        });
        return this.getColorForAcceleration(maxAcceleration);
    }
}

export default AccelerationLens;
