import {MotionStudyLens} from "./MotionStudyLens.js";
import {MotionStudyColors} from "./MotionStudyColors.js";
import {JOINTS} from "./constants.js";
import {ValueAddWasteTimeTypes} from "../motionStudy/ValueAddWasteTimeManager.js";

function colorFromValue(value) {
    if (value === ValueAddWasteTimeTypes.VALUE_ADD) {
        return MotionStudyColors.green;
    }
    if (value === ValueAddWasteTimeTypes.WASTE_TIME) {
        return MotionStudyColors.red;
    }
    return MotionStudyColors.gray;
}

/**
 * ValueAddWasteTimeLens is a lens that stores value/waste assessement of activity at the current timestamp.
 * This assessement is done by a analyst and is marked manually.
 */
export class ValueAddWasteTimeLens extends MotionStudyLens {
    /**
     * Creates a new ValueAddWasteTimeLens object.
     * @param {MotionStudy} motionStudy
     */
    constructor(motionStudy) {
        super("Value Add/Waste Time");
        this.motionStudy = motionStudy;
    }

    applyLensToPose(pose) {
        // if (Object.values(pose.joints).every(joint => joint.valueAddWasteTimeValue)) {
        //     return false;
        // }
        const value = this.motionStudy.valueAddWasteTimeManager.getValue(pose.timestamp);
        pose.forEachJoint(joint => {
            joint.valueAddWasteTimeValue = value;
        });
        pose.forEachBone(bone => {
            bone.valueAddWasteTimeValue = value;
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
    
    getColorForJoint(joint) {
        if (typeof joint.valueAddWasteTimeValue === "undefined") {
            return MotionStudyColors.undefined;
        }
        return colorFromValue(joint.valueAddWasteTimeValue);
    }

    getColorForBone(bone) {
        if (typeof bone.valueAddWasteTimeValue === "undefined") {
            return MotionStudyColors.undefined;
        }
        return colorFromValue(bone.valueAddWasteTimeValue);
    }

    getColorForPose(pose) {
        if (typeof pose.getJoint(JOINTS.HEAD).valueAddWasteTimeValue === "undefined") {
            return MotionStudyColors.undefined;
        }
        return MotionStudyColors.fade(colorFromValue(pose.getJoint(JOINTS.HEAD).valueAddWasteTimeValue));
    }

    getTableViewJoints() {
        return [
            JOINTS.CHEST
        ]
    }

    getTableViewValue(joint) {
        if (joint.valueAddWasteTimeValue === ValueAddWasteTimeTypes.VALUE_ADD) {
            return 1;
        } else if (joint.valueAddWasteTimeValue === ValueAddWasteTimeTypes.WASTE_TIME) {
            return 0;
        }
        return 0;
    }

    getTableViewColorForValue(value, _jointName) {
        const startColor = MotionStudyColors.red;
        const endColor = MotionStudyColors.green;
        return `#${startColor.clone().lerpHSL(endColor, value).getHexString()}`;
    }
}
