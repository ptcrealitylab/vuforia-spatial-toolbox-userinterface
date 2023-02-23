import AnalyticsLens from "./AnalyticsLens.js";
import AnalyticsColors from "./AnalyticsColors.js";
import {JOINTS} from "./utils.js";

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
        console.error("Cannot apply time lens to an isolated pose, need history");
        return false;
    }

    applyLensToHistoryMinimally(poseHistory) {
        return this.applyLensToHistory(poseHistory);
    }

    applyLensToHistory(poseHistory) {
        const startTime = poseHistory[0].timestamp;
        const endTime = poseHistory[poseHistory.length - 1].timestamp;
        return poseHistory.map(pose => {
            const time = pose.timestamp;
            const timeFrac = (time - startTime) / (endTime - startTime);
            pose.forEachJoint(joint => {
                joint.timeFrac = timeFrac;
            });
            pose.forEachBone(bone => {
                bone.timeFrac = timeFrac;
            });
            return true;
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
        if (typeof pose.joints[pose.getJoint(JOINTS.HEAD)].timeFrac === "undefined") {
            return AnalyticsColors.undefined;
        }
        return this.getColorForJoint(pose.getJoint(JOINTS.HEAD));
    }
}

export default TimeLens;
