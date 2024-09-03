import {MotionStudyLens} from "./MotionStudyLens.js";
import {MotionStudyColors} from "./MotionStudyColors.js";
import {JOINTS} from "./constants.js";

const TIME_INTERVAL_DURATION = 10000; // 10 seconds

/**
 * TimeLens is a lens that colors poses based on when they were recorded.
 */
class TimeLens extends MotionStudyLens {
    /**
     * Creates a new TimeLens object.
     */
    constructor() {
        super("Time");
    }

    applyLensToPose(pose) {
        if (pose.getJoint(JOINTS.HEAD).timeFrac) {
            return false;
        }
        const intervalProgress = pose.timestamp % TIME_INTERVAL_DURATION;
        const timeFrac = intervalProgress / TIME_INTERVAL_DURATION;
        pose.forEachJoint(joint => {
            joint.timeFrac = timeFrac;
        });
        pose.forEachBone(bone => {
            bone.timeFrac = timeFrac;
        });
        return true;
    }

    applyLensToHistoryMinimally(poseHistory) {
        const modified = this.applyLensToPose(poseHistory[poseHistory.length - 1]);
        const modifiedResult = poseHistory.map(() => false);
        modifiedResult[modifiedResult.length - 1] = modified;
        return modifiedResult;
    }

    applyLensToHistory(poseHistory) {
        return poseHistory.map(pose => {
            return this.applyLensToPose(pose);
        });
    }
    
    getColorFromFrac(frac) {
        const startColor = MotionStudyColors.red;
        const endColor = MotionStudyColors.blue;
        return startColor.clone().lerpHSL(endColor, frac);
    }

    getColorForJoint(joint) {
        if (typeof joint.timeFrac === "undefined") {
            return MotionStudyColors.undefined;
        }
        return this.getColorFromFrac(joint.timeFrac);
    }

    getColorForBone(bone) {
        if (typeof bone.timeFrac === "undefined") {
            return MotionStudyColors.undefined;
        }
        return this.getColorFromFrac(bone.timeFrac);
    }
    
    getColorForPose(pose) {
        if (typeof pose.getJoint(JOINTS.HEAD).timeFrac === "undefined") {
            return MotionStudyColors.undefined;
        }
        return this.getColorForJoint(pose.getJoint(JOINTS.HEAD));
    }

    getTableViewJoints() {
        return [
            JOINTS.CHEST
        ]
    }

    getTableViewValue(joint) {
        return joint.timeFrac;
    }

    getTableViewColorForValue(value, _jointName) {
        return `#${this.getColorFromFrac(value).getHexString()}`;
    }
}

export {TimeLens};
