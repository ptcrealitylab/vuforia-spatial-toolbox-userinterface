import {Vector3, Color} from "../../thirdPartyCode/three/three.module.js";
import {JOINTS as POSE_NET_JOINTS} from "./utils.js";

const HIGH_CUTOFF = 0.035; // 0.05;
const MED_CUTOFF = 0.015; // 0.02;

class AccelerationAnnotator {
    constructor(humanPoseRenderer) {
        this.humanPoseRenderer = humanPoseRenderer;
        this.skelHistory = [];
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
            skel2.joints[jointName].acceleration = v1.sub(v0).length() / ((skel2.timestamp - skel0.timestamp) / 2);
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

    annotate() {
        let skel = this.getCurrentSkelFromPoseRenderer();
        this.recordSkel(skel);
        this.calculateAccelerations();
        let maxScore = 0;
        const accelerationData = {};
        for (let jointName in skel.joints) {
            const acceleration = skel.joints[jointName].acceleration;
            const accelerationColor = AccelerationAnnotator.colorFromAcceleration(acceleration);
            if (accelerationColor > maxScore) {
                maxScore = accelerationColor;
            }
            accelerationData[jointName] = {
                acceleration,
                color: accelerationColor
            };
        }
        this.humanPoseRenderer.setMaxAccelerationScore(maxScore);
        this.humanPoseRenderer.setJointAccelerationData(accelerationData);
    }
    
    // color() {
    //     if (this.humanPoseRenderer.jointAccelerationData) {
    //         for (let jointName in this.humanPoseRenderer.jointAccelerationData) {
    //             this.humanPoseRenderer.setJointColor(jointName, this.humanPoseRenderer.jointAccelerationData[jointName].color)
    //         }
    //     } else {
    //         console.error('Cannot color poseRenderer without acceleration data, call annotate() first');
    //     }
    // }
    
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
        return new Color(0, 1, 0); // green
    }
}


export default AccelerationAnnotator;
