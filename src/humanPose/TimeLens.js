import AnalyticsLens from "./AnalyticsLens.js";
import AnalyticsColors from "./AnalyticsColors.js";
import {JOINTS} from "./utils.js";

const TIME_INTERVAL_DURATION = 10000; // 10 seconds

/**
 * TimeLens is a lens that colors poses based on when they were recorded.
 */
class TimeLens extends AnalyticsLens {
    /**
     * Creates a new RebaLens object.
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
            this.applyLensToPose(pose);
        });
    }

    getColorForJoint(joint) {
        if (typeof joint.timeFrac === "undefined") {
            return AnalyticsColors.undefined;
        }
        const startColor = AnalyticsColors.red;
        const endColor = AnalyticsColors.blue;
        return startColor.clone().lerpHSL(endColor, joint.timeFrac);
    }

    getColorForBone(bone) {
        if (typeof bone.timeFrac === "undefined") {
            return AnalyticsColors.undefined;
        }
        const startColor = AnalyticsColors.red;
        const endColor = AnalyticsColors.blue;
        return startColor.clone().lerpHSL(endColor, bone.timeFrac);
    }
    
    getColorForPose(pose) {
        if (typeof pose.getJoint(JOINTS.HEAD).timeFrac === "undefined") {
            return AnalyticsColors.undefined;
        }
        return this.getColorForJoint(pose.getJoint(JOINTS.HEAD));
    }
}

export default TimeLens;
