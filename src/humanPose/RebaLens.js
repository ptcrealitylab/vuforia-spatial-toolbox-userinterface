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
            joint.rebaScore = rebaData.jointScores[joint.name];
            joint.rebaColor = rebaData.jointColors[joint.name];
            joint.rebaScoreOverall = rebaData.overallScore; // not really used, overallRebaScore from REBA Ergonomics (Overall) is propagated into stats  
            joint.rebaColorOverall = rebaData.overallColor;
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

    getTableViewJoints() {
        return [
            JOINTS.HEAD,
            JOINTS.CHEST,
            JOINTS.LEFT_SHOULDER,
            JOINTS.RIGHT_SHOULDER,
            JOINTS.LEFT_ELBOW,
            JOINTS.RIGHT_ELBOW,
            JOINTS.LEFT_WRIST,
            JOINTS.RIGHT_WRIST,
            JOINTS.LEFT_HIP,
            JOINTS.RIGHT_HIP
        ]
    }

    getTableViewValue(joint) {
        return joint.rebaScore;
    }

    getTableViewColorForValue(value, jointName) {
        switch (jointName) {
            case JOINTS.HEAD:
                return `#${Reba.getNeckColor(value).getHexString()}`;
            case JOINTS.CHEST:
                return `#${Reba.getTrunkColor(value).getHexString()}`;
            case JOINTS.LEFT_SHOULDER:
                return `#${Reba.getLeftUpperArmColor(value).getHexString()}`;
            case JOINTS.RIGHT_SHOULDER:
                return `#${Reba.getRightUpperArmColor(value).getHexString()}`;
            case JOINTS.LEFT_ELBOW:
                return `#${Reba.getLeftLowerArmColor(value).getHexString()}`;
            case JOINTS.RIGHT_ELBOW:
                return `#${Reba.getRightLowerArmColor(value).getHexString()}`;
            case JOINTS.LEFT_WRIST:
                return `#${Reba.getLeftWristColor(value).getHexString()}`;
            case JOINTS.RIGHT_WRIST:
                return `#${Reba.getRightWristColor(value).getHexString()}`;
            case JOINTS.LEFT_HIP:
                return `#${Reba.getLeftLegColor(value).getHexString()}`;
            case JOINTS.RIGHT_HIP:
                return `#${Reba.getRightLegColor(value).getHexString()}`;
            default:
                return 'magenta';
        }
    }
}
