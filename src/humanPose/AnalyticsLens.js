/**
 * AnalyticsLens is a class that represents a lens in the analytics system.
 * Inherit from this class to create new lenses.
 */
import AnalyticsColors from "./AnalyticsColors.js";

class AnalyticsLens {
    /**
     * Creates a new AnalyticsLens object.
     * @param name {string} The name of the lens, used in menus.
     */
    constructor(name) {
        this.name = name;
    }

    /**
     * Applies the lens to a single pose by adding new properties to the pose object.
     * @param pose {Pose} The pose to apply the lens to.
     * @return {boolean} True if the pose was modified, false otherwise.
     */
    applyLensToPose(pose) {
        return false;
    }

    /**
     * Applies the lens to the most recent pose, but reads the pose history as well. Only the minimum number of poses are visited.
     * @param poseHistory {Pose[]} An array of pose objects.
     * @return {boolean[]} An array of booleans, one for each pose in the history, indicating whether the pose was modified.
     */
    applyLensToHistoryMinimally(poseHistory) {
        return poseHistory.map(() => false);
    }

    /**
     * Applies the lens to the pose history by adding new properties to the pose objects.
     * @param poseHistory {Pose[]} An array of pose objects.
     * @return {boolean[]} An array of booleans, one for each pose in the history, indicating whether the pose was modified.
     */
    applyLensToHistory(poseHistory) {
        return poseHistory.map(() => false);
    }

    /**
     * Calculates the color for a given joint.
     * @param joint {Object} The joint to calculate the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForJoint(joint) {
        return AnalyticsColors.undefined;
    }

    /**
     * Calculates the color for a given bone.
     * @param bone {Object} The bone to calculate the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForBone(bone) {
        return AnalyticsColors.undefined;
    }

    /**
     * Calculates the color for a given pose.
     * @param pose {Pose} The pose to calculate the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForPose(pose) {
        return AnalyticsColors.undefined;
    }
}

export default AnalyticsLens;
