/**
 * MotionStudyLens is a class that represents a lens in the motion study system.
 * Inherit from this class to create new lenses.
 */
import {MotionStudyColors} from "./MotionStudyColors.js";
import {JOINTS} from "./constants.js";

export class MotionStudyLens {
    /**
     * Creates a new MotionStudyLens object.
     * @param {string} name The name of the lens, used in menus.
     */
    constructor(name) {
        this.name = name;
    }

    /**
     * Resets the lens to its initial state.
     */
    reset() {
    }

    /**
     * Applies the lens to a single pose by adding new properties to the pose object.
     * @param {Pose} _pose The pose to apply the lens to.
     * @return {boolean} True if the pose was modified, false otherwise.
     */
    applyLensToPose(_pose, _force = false) {
        return false;
    }

    /**
     * Applies the lens to the most recent pose, but reads the pose history as well. Only the minimum number of poses are visited.
     * @param {Pose[]} poseHistory An array of pose objects.
     * @return {boolean[]} An array of booleans, one for each pose in the history, indicating whether the pose was modified.
     */
    applyLensToHistoryMinimally(poseHistory, _force = false) {
        return poseHistory.map(() => false);
    }

    /**
     * Applies the lens to the pose history by adding new properties to the pose objects.
     * @param {Pose[]} poseHistory An array of pose objects.
     * @return {boolean[]} An array of booleans, one for each pose in the history, indicating whether the pose was modified.
     */
    applyLensToHistory(poseHistory, _force = false) {
        return poseHistory.map(() => false);
    }

    /**
     * Calculates the color for a given joint.
     * @param {Object} _joint The joint to calculate the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForJoint(_joint) {
        return MotionStudyColors.undefined;
    }

    /**
     * Calculates the color for a given bone.
     * @param {Object} _bone The bone to calculate the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForBone(_bone) {
        return MotionStudyColors.undefined;
    }

    /**
     * Calculates the color for a given pose.
     * @param {Pose} _pose The pose to calculate the color for.
     * @return {Color} The color to use for the value.
     */
    getColorForPose(_pose) {
        return MotionStudyColors.undefined;
    }

    /**
     * Returns a subset of JOINTS to be used when displaying the table view
     * @return {String[]} The list of joints
     */
    getTableViewJoints() {
        // Everything but the fingers
        return [
            JOINTS.HEAD,
            JOINTS.NECK,
            JOINTS.CHEST,
            JOINTS.NAVEL,
            JOINTS.PELVIS,
            JOINTS.NOSE,
            JOINTS.LEFT_EYE,
            JOINTS.RIGHT_EYE,
            JOINTS.LEFT_EAR,
            JOINTS.RIGHT_EAR,
            JOINTS.LEFT_SHOULDER,
            JOINTS.RIGHT_SHOULDER,
            JOINTS.LEFT_ELBOW,
            JOINTS.RIGHT_ELBOW,
            JOINTS.LEFT_WRIST,
            JOINTS.RIGHT_WRIST,
            JOINTS.LEFT_HIP,
            JOINTS.RIGHT_HIP,
            JOINTS.LEFT_KNEE,
            JOINTS.RIGHT_KNEE,
            JOINTS.LEFT_ANKLE,
            JOINTS.RIGHT_ANKLE
        ]
    }

    /**
     * 
     * @param {Object} _joint The joint to get the table value of
     * @return {number} The value to be displayed in the table
     */
    getTableViewValue(_joint) {
        return NaN;
    }
}
