import {MotionStudyLens} from './MotionStudyLens.js';
import {MotionStudyColors} from './MotionStudyColors.js';
import {JOINTS} from './constants.js';

/**
 * SensorActiveLens is a lens that stores whether a given spatial sensor is
 * active (occupied) at the current timestamp.
 */
export class SensorActiveLens extends MotionStudyLens {
    /**
     * Creates a new SensorActiveLens object.
     * @param {MotionStudy} motionStudy
     * @param {string} sensorFrame - frame id of spatial sensor
     */
    constructor(motionStudy, sensorFrame) {
        super('Sensor Active - ' + sensorFrame);
        this.motionStudy = motionStudy;
        this.sensorFrame = sensorFrame;
    }

    applyLensToPose(pose) {
        let anyActive = false;
        pose.forEachJoint(joint => {
            if (!joint.sensorActive) {
                joint.sensorActive = {};
            }
            const value = this.motionStudy.sensors.isPositionInSensor(this.sensorFrame, joint.position);
            anyActive = anyActive || value;
            joint.sensorActive[this.sensorFrame] = value;
        });
        pose.forEachBone(bone => {
            if (!bone.sensorActive) {
                bone.sensorActive = {};
            }
            const value = bone.joint0.sensorActive[this.sensorFrame] ||
                bone.joint1.sensorActive[this.sensorFrame];

            anyActive = anyActive || value;
            bone.sensorActive[this.sensorFrame] = value;
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
        if (!joint.sensors || !joint.sensors.hasOwnProperty(this.sensorFrame)) {
            return MotionStudyColors.undefined;
        }
        return joint.sensors[this.sensorFrame] ?
            this.motionStudy.sensors.getSensorColor(this.sensorFrame) :
            MotionStudyColors.gray;
    }

    getColorForBone(bone) {
        if (!bone.sensors || !bone.sensors.hasOwnProperty(this.sensorFrame)) {
            return MotionStudyColors.undefined;
        }
        return bone.sensors[this.sensorFrame] ?
            this.motionStudy.sensors.getSensorColor(this.sensorFrame) :
            MotionStudyColors.gray;
    }

    getColorForPose(pose) {
        let joint = pose.getJoint(JOINTS.HEAD);
        return MotionStudyColors.fade(this.getColorForJoint(joint));
    }
}

