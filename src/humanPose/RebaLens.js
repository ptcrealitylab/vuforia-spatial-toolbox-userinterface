import {AnalyticsLens} from "./AnalyticsLens.js";
import * as Reba from "./rebaScore.js";
import {AnalyticsColors} from "./AnalyticsColors.js";
import {JOINTS} from "./constants.js";

/**
 * RebaLens is a lens that calculates the REBA score for each bone in the pose history.
 */
export class RebaLens extends AnalyticsLens {
    /**
     * Creates a new RebaLens object.
     */
    constructor() {
        super("REBA Ergonomics");
    }
    
    applyLensToPose(pose) {
        if (Object.values(pose.joints).every(joint => joint.rebaScore)) {
            return false;
        }
        const rebaData = Reba.calculateForPose(pose);
        pose.forEachJoint(joint => {
            joint.rebaScore = rebaData.scores[joint.name];
            joint.rebaColor = rebaData.colors[joint.name];
            joint.rebaScoreOverall = rebaData.overallRebaScore;
            joint.rebaColorOverall = rebaData.overallRebaColor;
        });
        pose.forEachBone(bone => {
            bone.rebaScore = rebaData.boneScores[bone.name];
            bone.rebaColor = rebaData.boneColors[bone.name];
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
        if (typeof joint.rebaColor === "undefined") {
            return AnalyticsColors.undefined;
        }
        return joint.rebaColor;
    }
    
    getColorForBone(bone) {
        if (typeof bone.rebaColor === "undefined") {
            return AnalyticsColors.undefined;
        }
        return bone.rebaColor;
    }
    
    getColorForPose(pose) {
        if (typeof pose.getJoint(JOINTS.HEAD).rebaColorOverall === "undefined") {
            return AnalyticsColors.undefined;
        }
        return pose.getJoint(JOINTS.HEAD).rebaColorOverall;
    }
}
