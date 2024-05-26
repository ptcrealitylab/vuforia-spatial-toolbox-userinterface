import {MotionStudyLens} from "./MotionStudyLens.js";
import {MuriScore} from "./MuriScore.js";
import {MotionStudyColors} from "./MotionStudyColors.js";
import {ERGO_ANGLES, ERGO_OFFSETS} from "./constants.js";

/**
 * MuriLens is a lens that calculates the Muri score for each pose in the history. Individual components of the score
 * are visualised on relevant joints/bones.
 */
export class MuriLens extends MotionStudyLens {
    /**
     * Creates a new MuriLens object.
     */
    constructor() {
        super("Muri Ergonomics");

        this.muriScore = new MuriScore();
    }
    
    applyLensToPose(pose, force = false) {
        if (!force && pose.metadata.muriScores) {
            return false;
        } 
        const ergonomicsData = this.muriScore.calculateForPose(pose);
        pose.forEachJoint(joint => {
            joint.muriScore = ergonomicsData.jointScores[joint.name];
            joint.muriColor = ergonomicsData.jointColors[joint.name];
        });
        pose.forEachBone(bone => {
            bone.muriScore = ergonomicsData.boneScores[bone.name];
            bone.muriColor = ergonomicsData.boneColors[bone.name];
        });

        // populate pose metadata with base ergonomic data
        pose.metadata.ergonomics = {};
        Object.values(ERGO_ANGLES).forEach(angleName => {
            // angles which could not be calculated are explicitly stored as null
            if (ergonomicsData.angles.hasOwnProperty(angleName)) {
                pose.metadata.ergonomics[angleName] = ergonomicsData.angles[angleName];
            }
            else {
                pose.metadata.ergonomics[angleName] = null;
            }
        });
        // TODO?: Volvo has bit different definition of this angle (straight arm has 180 deg). However, this definition is inconsistent with other angles which are zero in the netural pose. 
        // pose.metadata[ERGO_ANGLES.LEFT_LOWER_ARM_BEND] = 180 - pose.metadata[ERGO_ANGLES.LEFT_LOWER_ARM_BEND];
        // pose.metadata[ERGO_ANGLES.RIGHT_LOWER_ARM_BEND] = 180 - pose.metadata[ERGO_ANGLES.RIGHT_LOWER_ARM_BEND];
        Object.values(ERGO_OFFSETS).forEach(offsetName => {
            // offsets which could not be calculated are explicitly stored as null
            if (ergonomicsData.offsets.hasOwnProperty(offsetName)) {
                pose.metadata.ergonomics[offsetName] = ergonomicsData.offsets[offsetName];
            }
            else {
                pose.metadata.ergonomics[offsetName] = null;
            }
        });

        // add individual muri scores
        pose.metadata.muriScores = ergonomicsData.muriScores 
        
        // add overall score and color
        pose.metadata.overallMuriScore = ergonomicsData.overallScore; 
        pose.metadata.overallMuriColor = ergonomicsData.overallColor;
        
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
        if (!joint.hasOwnProperty("muriColor")) {
            return MotionStudyColors.undefined;
        }
        return joint.muriColor;
    }
    
    getColorForBone(bone) {
        if (!bone.hasOwnProperty("muriColor")) {
            return MotionStudyColors.undefined;
        }
        return bone.muriColor;
    }
    
    getColorForPose(pose) {
        if (!pose.metadata.hasOwnProperty("overallMuriColor")) {
            return MotionStudyColors.undefined;
        }
        return pose.metadata.overallMuriColor;
    }
}
