import {MotionStudyLens} from "./MotionStudyLens.js";
import * as Reba from "./rebaScore.js";
import {MotionStudyColors} from "./MotionStudyColors.js";
import {JOINTS, ERGO_ANGLES, ERGO_OFFSETS} from "./constants.js";

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
            joint.rebaScore = rebaData.jointScores[joint.name];
            joint.rebaColor = rebaData.jointColors[joint.name];
            joint.rebaScoreOverall = rebaData.overallScore; // not really used, overallRebaScore from REBA Ergonomics (Overall) is propagated into stats  
            joint.rebaColorOverall = rebaData.overallColor;
        });
        pose.forEachBone(bone => {
            bone.rebaScore = rebaData.boneScores[bone.name];
            bone.rebaColor = rebaData.boneColors[bone.name];
        });

        // populate pose metadata with base ergonomic data
        // TODO: later limit to the ones actually used for reba score calculations
        Object.values(ERGO_ANGLES).forEach(angleName => {
            // angles which could not be calculated are explicitly stored as undefined
            pose.metadata[angleName] = rebaData.angles[angleName];
        });
        // TODO?: Volvo has bit different definition of this angle (straight arm has 180 deg). However, this definition is inconsistent with other angles which are zero in the netural pose. 
        // pose.metadata[ERGO_ANGLES.LEFT_LOWER_ARM_BEND] = 180 - pose.metadata[ERGO_ANGLES.LEFT_LOWER_ARM_BEND];
        // pose.metadata[ERGO_ANGLES.RIGHT_LOWER_ARM_BEND] = 180 - pose.metadata[ERGO_ANGLES.RIGHT_LOWER_ARM_BEND];
        Object.values(ERGO_OFFSETS).forEach(offsetName => {
            pose.metadata[offsetName] = rebaData.offsets[offsetName];
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
