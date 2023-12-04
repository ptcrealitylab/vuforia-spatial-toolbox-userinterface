import {MotionStudyLens} from "./MotionStudyLens.js";
import * as Reba from "./rebaScore.js";
import {MotionStudyColors} from "./MotionStudyColors.js";
import {JOINTS} from "./constants.js";

/**
 * OverallRebaLens is a lens that calculates the overall REBA score for the pose
 */
export class OverallRebaLens extends MotionStudyLens {
    /**
     * Creates a new OverallRebaLens object.
     */
    constructor() {
        super("REBA Ergonomics (Overall)");
    }
    
    applyLensToPose(pose) {
        if (Object.values(pose.joints).every(joint => joint.overallRebaScore)) {
            return false;
        }
        const rebaData = Reba.calculateForPose(pose);
        pose.forEachJoint(joint => {
            joint.overallRebaScore = rebaData.overallRebaScore;
            joint.overallRebaColor = rebaData.overallRebaColor;
        });
        pose.forEachBone(bone => {
            bone.overallRebaScore = rebaData.overallRebaScore;
            bone.overallRebaColor = rebaData.overallRebaColor;
        });
        return true;
    }

    applyLensToHistoryMinimally(poseHistory) {
        const modified = this.applyLensToPose(poseHistory[poseHistory.length - 1]);
        const modifiedArray = poseHistory.map(() => false);
        modifiedArray[modifiedArray.length - 1] = modified;
        return modifiedArray;
    }

    applyLensToHistory(poseHistory) {
        return poseHistory.map(pose => {
            return this.applyLensToPose(pose);
        });
    }

    getColorForJoint(joint) {
        if (typeof joint.overallRebaColor === "undefined") {
            return MotionStudyColors.undefined;
        }
        return joint.overallRebaColor;
    }

    getColorForBone(bone) {
        if (typeof bone.overallRebaColor === "undefined") {
            return MotionStudyColors.undefined;
        }
        return bone.overallRebaColor;
    }
    
    getColorForPose(pose) {
        return this.getColorForJoint(pose.getJoint(JOINTS.HEAD));
    }
}
