import {Vector3, Color} from "../../thirdPartyCode/three/three.module.js";
import {JOINTS as POSE_NET_JOINTS} from "./utils.js";

const HIGH_CUTOFF = 0.05;
const MED_CUTOFF = 0.02;

class AccelerationAnnotator {
    constructor(humanPoseRenderer) {
        this.humanPoseRenderer = humanPoseRenderer;
        this.skelHistory = [];
        this.jointColorHistories = {}; // A dictionary that maps jointNames to a list which contains times, these are the times when that joint was last at a specific acceleration threshold (denoted by the index)
        this.colorHistoryDuration = 500; // How long in ms to persist a high acceleration in the UI
    }
    
    recordSkel(skel) {
        if (this.skelHistory.length === 3) {
            this.skelHistory[0] = this.skelHistory[1];
            this.skelHistory[1] = this.skelHistory[2];
            this.skelHistory[2] = skel;
        } else {
            this.skelHistory.push(skel);
        }
    }

    /**
     * Calculates the velocity of a joint between skels
     * @param jointName
     * @param skel0
     * @param skel1
     * @return {Vector3}
     */
    jointVelocityBetweenSkels(jointName, skel0, skel1) {
        const joint0 = skel0.joints[jointName];
        const joint1 = skel1.joints[jointName];
        return new Vector3(joint1.x - joint0.x, joint1.y - joint0.y, joint1.z - joint0.z).divideScalar(skel1.timestamp - skel0.timestamp);
    }

    calculateAccelerations() {
        if (this.skelHistory.length !== 3) {
            return;
        }
        
        const [skel0, skel1, skel2] = this.skelHistory;
        
        for (let jointName in skel2.joints) {
            const v0 = this.jointVelocityBetweenSkels(jointName, skel0, skel1);
            const v1 = this.jointVelocityBetweenSkels(jointName, skel1, skel2);
            skel2.joints[jointName].acceleration = v1.sub(v0).length() / (skel2.timestamp - skel1.timestamp);
        }
    }

    getCurrentSkelFromPoseRenderer() {
        let skel = {
            joints: {},
            timestamp: this.humanPoseRenderer.currentPoseTimestamp
        };
        for (let jointId of Object.values(POSE_NET_JOINTS)) {
            skel.joints[jointId] = this.humanPoseRenderer.getJointPosition(jointId);
        }

        return skel;
    }

    /**
     * Calculates the color for a joint based on its acceleration, but takes into account its history.
     * If the joint has been set to a high-acceleration color recently, it should keep being set to that color
     * until this.colorHistoryDuration milliseconds have passed.
     * @param acceleration {number}
     * @param jointName
     * @return {number}
     */
    colorFromAccelerationWithHistory(acceleration, jointName) {
        if (!this.jointColorHistories[jointName]) {
            this.jointColorHistories[jointName] = [0, 0, 0]; // Initialize to all be at timestamp 0.
        }
        const baseColor = AccelerationAnnotator.colorFromAcceleration(acceleration);
        let resultColor;
        const now = Date.now();
        if (baseColor === 2 || this.jointColorHistories[jointName][2] + this.colorHistoryDuration >= now) {
            resultColor = 2;
        } else if (baseColor === 1 || this.jointColorHistories[jointName][1] + this.colorHistoryDuration >= now) {
            resultColor = 1;
        } else {
            resultColor = baseColor;
        }
        this.jointColorHistories[jointName][baseColor] = Date.now();
        return resultColor;
    }

    annotate() {
        let skel = this.getCurrentSkelFromPoseRenderer();
        this.recordSkel(skel);
        this.calculateAccelerations();
        let maxScore = 0;
        const accelerationData = {};
        for (let jointName in skel.joints) {
            const acceleration = skel.joints[jointName].acceleration;
            accelerationData[jointName] = acceleration;
            const accelerationColor = this.colorFromAccelerationWithHistory(acceleration, jointName);
            if (accelerationColor > maxScore) {
                maxScore = accelerationColor;
            }
            this.humanPoseRenderer.setJointColor(jointName, accelerationColor)
        }
        this.humanPoseRenderer.setJointAccelerationData(accelerationData);
        this.humanPoseRenderer.setMaxAccelerationScore(maxScore);
    }
    
    static colorFromAcceleration(acceleration) {
        if (acceleration > HIGH_CUTOFF) {
            return 2; // red
        }
        if (acceleration > MED_CUTOFF) {
            return 1; // yellow
        }
        return 0; // green
    }
    
    static threeColorFromAcceleration(acceleration) {
        if (acceleration > HIGH_CUTOFF) {
            return new Color(1, 0, 0); // red
        }
        if (acceleration > MED_CUTOFF) {
            return new Color(1, 1 - ((acceleration - MED_CUTOFF) / (HIGH_CUTOFF - MED_CUTOFF)), 0); // yellow
        }
        return new Color(acceleration / MED_CUTOFF, 1, 0); // green
    }
}


export default AccelerationAnnotator;
