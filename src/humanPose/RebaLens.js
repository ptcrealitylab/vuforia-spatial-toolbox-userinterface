import {MotionStudyLens} from "./MotionStudyLens.js";
import * as Reba from "./rebaScore.js";
import {MotionStudyColors} from "./MotionStudyColors.js";
import {JOINTS} from "./constants.js";

/**
 * RebaLens is a lens that calculates the REBA score for each bone in the pose history.
 */
export class RebaLens extends MotionStudyLens {
    /**
     * Creates a new RebaLens object.
     */
    constructor() {
        super("REBA Ergonomics");
    }
    
    applyLensToPose(pose, force = false) {
        if (!force && Object.values(pose.joints).every(joint => joint.rebaScore)) {
            return false;
        } 
        const rebaData = Reba.calculateForPose(pose);
        pose.forEachJoint(joint => {
            joint.rebaScore = rebaData.scores[joint.name];
            joint.rebaColor = rebaData.colors[joint.name];
            joint.rebaScoreOverall = rebaData.overallRebaScore; // not really used, overallRebaScore from REBA Ergonomics (Overall) is propagated into stats  
            joint.rebaColorOverall = rebaData.overallRebaColor;
        });
        pose.forEachBone(bone => {
            bone.rebaScore = rebaData.boneScores[bone.name];
            bone.rebaColor = rebaData.boneColors[bone.name];
        });
        return true;
    }

    applyLensToHistoryMinimally(poseHistory, force = false) {
        const modified = this.applyLensToPose(poseHistory[poseHistory.length - 1], force);
        const modifiedArray = poseHistory.map(() => false);
        modifiedArray[modifiedArray.length - 1] = modified;
        return modifiedArray;
    }

    applyLensToHistory(poseHistory, force = false) {
        return poseHistory.map(pose => {
            return this.applyLensToPose(pose, force);
        });
    }
    
    getColorForJoint(joint) {
        if (typeof joint.rebaColor === "undefined") {
            return MotionStudyColors.undefined;
        }
        return joint.rebaColor;
    }
    
    getColorForBone(bone) {
        if (typeof bone.rebaColor === "undefined") {
            return MotionStudyColors.undefined;
        }
        return bone.rebaColor;
    }
    
    getColorForPose(pose) {
        if (typeof pose.getJoint(JOINTS.HEAD).rebaColorOverall === "undefined") {
            return MotionStudyColors.undefined;
        }
        return pose.getJoint(JOINTS.HEAD).rebaColorOverall;
    }
}
