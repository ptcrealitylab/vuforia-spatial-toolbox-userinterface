import {AnalyticsLens} from "./AnalyticsLens.js";
import {AnalyticsColors} from "./AnalyticsColors.js";
import {JOINTS} from "./constants.js";
import {ValueAddWasteTimeTypes} from "../analytics/ValueAddWasteTimeManager.js";

function colorFromValue(value) {
    if (value === ValueAddWasteTimeTypes.VALUE_ADD) {
        return AnalyticsColors.green;
    }
    if (value === ValueAddWasteTimeTypes.WASTE_TIME) {
        return AnalyticsColors.red;
    }
    return AnalyticsColors.gray;
}

/**
 * RebaLens is a lens that calculates the REBA score for each bone in the pose history.
 */
export class ValueAddWasteTimeLens extends AnalyticsLens {
    /**
     * Creates a new ValueAddWasteTimeLens object.
     * @param {Analytics} analytics
     */
    constructor(analytics) {
        super("Value Add/Waste Time");
        this.analytics = analytics;
    }

    applyLensToPose(pose) {
        // if (Object.values(pose.joints).every(joint => joint.valueAddWasteTimeValue)) {
        //     return false;
        // }
        const value = this.analytics.valueAddWasteTimeManager.getValue(pose.timestamp);
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
            return AnalyticsColors.undefined;
        }
        return colorFromValue(joint.valueAddWasteTimeValue);
    }

    getColorForBone(bone) {
        if (typeof bone.valueAddWasteTimeValue === "undefined") {
            return AnalyticsColors.undefined;
        }
        return colorFromValue(bone.valueAddWasteTimeValue);
    }

    getColorForPose(pose) {
        if (typeof pose.getJoint(JOINTS.HEAD).valueAddWasteTimeValue === "undefined") {
            return AnalyticsColors.undefined;
        }
        return AnalyticsColors.fade(colorFromValue(pose.getJoint(JOINTS.HEAD).valueAddWasteTimeValue));
    }
}
