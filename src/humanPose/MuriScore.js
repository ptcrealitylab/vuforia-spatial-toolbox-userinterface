import {MotionStudyColors} from "./MotionStudyColors.js";
import { Pose } from "./Pose.js";
import {ErgonomicsData} from "./ErgonomicsData.js";
import {JOINT_CONNECTIONS, JOINTS, getBoneName, ERGO_ANGLES, ERGO_OFFSETS} from './constants.js';


/** Default configuration of thresholds for MURI calculation and visualisation. */
const MURI_CONFIG_DEFAULT = Object.freeze({
    trunkFrontBendAngleThresholds: [-5, 20, 45],  // degrees
    trunkSideBendAngleThresholds: [15, 30],  // degrees
    trunkTwistAngleThresholds: [15, 45],  // degrees

    // TODO: finish
    neckFrontBendAngleThresholds: [5, 20],  // degrees
    neckTwistAngleThresholds: [20],  // degrees
    lowerLegBendAngleThresholds: [30, 60],  // degrees
    upperArmFrontRaiseAngleThresholds: [20, 45, 90], // degrees
    upperArmGravityAngleThresholds: [20], // degrees
    shoulderRaiseAngleThresholds: [80], // degrees
    lowerArmBendAngleThresholds: [60, 100], // degrees
    wristFrontBendAngleThresholds: [15], // degrees
    wristSideBendAngleThresholds: [30], // degrees
    wristTwistAngleThresholds: [120],  // degrees
    footHeightDifferenceThresholds: [100], // mm

    // Weigths for different levels of strain on a body part which are used to calculate actual score.
    // Note: Weights are integer numbers in the latest iteration of MURI method
    scoreWeights: [0, 1, 2, 5], 

    // Definitions of score ranges for different levels of strain for each body part.
    // This is used to assign colours for visualising MURI scores.
    // Minimum score is always 0 and maximum score is the last entry in the threshold list minus 1
    // Example with 4 levels of strain: 0 (low), 1 (medium), 2 (high), 3-5 (extreme)
    //    scoreLevels: [1, 2, 3, 6]   
    trunkScoreLevels: [1, 2, 3],
    legScoreLevels: [1, 6],  
    // TODO: others
    neckScoreLevels: [2, 3, 4],
    upperArmScoreLevels: [3, 5, 7], 
    lowerArmScoreLevels: [2, 3],
    wristScoreLevels: [2, 3, 4],
    overallScoreLevels: [4, 8, 13]
});

/** Modifiable configuration of thresholds for MURI calculation. */
const MURI_CONFIG = Object.assign({}, MURI_CONFIG_DEFAULT);

/** Score types/names for individual strains across body parts . */
export const MURI_SCORES = {
    TRUNK_FRONT_BEND: 'trunk_front_bend_score',
    TRUNK_SIDE_BEND: 'trunk_side_bend_score',
    TRUNK_TWIST: 'trunk_twist_score',
    /*HEAD_BEND: 'head_bend_angle',
    HEAD_FRONT_BEND: 'head_front_bend_angle',
    HEAD_SIDE_BEND: 'head_side_bend_angle',
    HEAD_TWIST: 'head_twist_angle',
    LEFT_LOWER_LEG_BEND: 'left_lower_leg_bend_angle',
    RIGHT_LOWER_LEG_BEND: 'right_lower_leg_bend_angle',
    LEFT_UPPER_ARM_RAISE: 'left_upper_arm_raise_angle',
    LEFT_UPPER_ARM_FRONT_RAISE: 'left_upper_arm_front_raise_angle',
    LEFT_UPPER_ARM_SIDE_RAISE: 'left_upper_arm_side_raise_angle',
    LEFT_UPPER_ARM_GRAVITY: 'left_upper_arm_gravity_angle',
    LEFT_SHOULDER_RAISE: 'left_shoulder_raise_angle',
    RIGHT_UPPER_ARM_RAISE: 'right_upper_arm_raise_angle',
    RIGHT_UPPER_ARM_FRONT_RAISE: 'right_upper_arm_front_raise_angle',
    RIGHT_UPPER_ARM_SIDE_RAISE: 'right_upper_arm_side_raise_angle',
    RIGHT_UPPER_ARM_GRAVITY: 'right_upper_arm_gravity_angle',
    RIGHT_SHOULDER_RAISE: 'right_shoulder_raise_angle',
    LEFT_LOWER_ARM_BEND: 'left_lower_arm_bend_angle',
    LEFT_LOWER_ARM_TWIST: 'left_lower_arm_twist_angle',
    RIGHT_LOWER_ARM_BEND: 'right_lower_arm_bend_angle',
    RIGHT_LOWER_ARM_TWIST: 'right_lower_arm_twist_angle',
    LEFT_HAND_FRONT_BEND: 'left_hand_front_bend_angle',
    LEFT_HAND_SIDE_BEND: 'left_hand_side_bend_angle',
    RIGHT_HAND_FRONT_BEND: 'right_hand_front_bend_angle',
    RIGHT_HAND_SIDE_BEND: 'right_hand_side_bend_angle' 
    */
};

/**
 * There is an aggregated score for each body part (eg. headScore, trunkScore). For now it is maximum from Muri scores associated with the body part. 
 * These aggregated scores are passed to jointScores/boneScores (which expect numbers), therefore their default value is zero. 
 */
export class MuriScore {
    /**
     * Creates a new MuriScore object.
     */
    constructor() {
        this.reset();    
    }

    reset() {
        this.data = {};  // holds ErgonomicsData object
        this.muriScores = {}; // initialise as unknown (could not be calculated)
        Object.values(MURI_SCORES).forEach(scoreName => {
            this.muriScores[scoreName] = null;
        });
    }

    scoreTrunk() {
        let trunkScore = 0; 
        let trunkColor = MotionStudyColors.undefined;

        // check for front/back bending
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.TRUNK_FRONT_BEND)) {
            if (this.data.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] < MURI_CONFIG.trunkFrontBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain when bending backwards (margin of few deg to accommodate imperfect accuracy of measurements)
            } else if (this.data.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] < MURI_CONFIG.trunkFrontBendAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            } else if (this.data.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] < MURI_CONFIG.trunkFrontBendAngleThresholds[2]) {
                this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND] = MURI_CONFIG.scoreWeights[1];  // medium strain
            } else {
                this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
        }

        // check for side bending (thresholds are used symmetrically for left and right side)
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.TRUNK_SIDE_BEND)) {
            if (Math.abs(this.data.angles[ERGO_ANGLES.TRUNK_SIDE_BEND]) < MURI_CONFIG.trunkSideBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.TRUNK_SIDE_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            } else if (Math.abs(this.data.angles[ERGO_ANGLES.TRUNK_SIDE_BEND]) < MURI_CONFIG.trunkSideBendAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.TRUNK_SIDE_BEND] = MURI_CONFIG.scoreWeights[1];  // medium strain
            } else {
                this.muriScores[MURI_SCORES.TRUNK_SIDE_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
        }

        // check for twisting/rotation (thresholds are used symmetrically for left and right side)
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.TRUNK_TWIST)) {
            if (Math.abs(this.data.angles[ERGO_ANGLES.TRUNK_TWIST]) < MURI_CONFIG.trunkTwistAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.TRUNK_TWIST] = MURI_CONFIG.scoreWeights[0];  // low strain
            } else if (Math.abs(this.data.angles[ERGO_ANGLES.TRUNK_TWIST]) < MURI_CONFIG.trunkTwistAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.TRUNK_TWIST] = MURI_CONFIG.scoreWeights[1];  // medium strain
            } else {
                this.muriScores[MURI_SCORES.TRUNK_TWIST] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
        }

        // aggregate individual strains to single score for the body part
        // for now it is the maximum from different types of strain to have a high sensitivity
        trunkScore = Math.max(this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND], 
                              this.muriScores[MURI_SCORES.TRUNK_SIDE_BEND], 
                              this.muriScores[MURI_SCORES.TRUNK_TWIST]);

        // select color for the score of the highest strain 
        if (trunkScore < MURI_CONFIG.trunkScoreLevels[0]) {
            trunkColor = MotionStudyColors.green;
        } else if (trunkScore < MURI_CONFIG.trunkScoreLevels[1]) {
            trunkColor = MotionStudyColors.yellow;
        } else {
            trunkColor = MotionStudyColors.red;
        }

        // set the aggregated score and color to all joints and bones of the body part
        [JOINTS.CHEST,
            JOINTS.NAVEL,
            JOINTS.PELVIS,
        ].forEach(joint => {
            this.data.jointScores[joint] = trunkScore;
            this.data.jointColors[joint] = trunkColor;
        });
        
        [JOINT_CONNECTIONS.neckChest,
            JOINT_CONNECTIONS.chestNavel,
            JOINT_CONNECTIONS.navelPelvis,
            JOINT_CONNECTIONS.shoulderSpan,
            JOINT_CONNECTIONS.chestRight,
            JOINT_CONNECTIONS.chestLeft,
            JOINT_CONNECTIONS.hipSpan,
        ].forEach(bone => {
            this.data.boneScores[getBoneName(bone)] = trunkScore;
            this.data.boneColors[getBoneName(bone)] = trunkColor;
        });
    }

    scoreHead() {
        let headScore = 0;
        let headColor = MotionStudyColors.undefined;

        [JOINTS.NECK,
            JOINTS.HEAD,
            JOINTS.LEFT_EYE,
            JOINTS.RIGHT_EYE,
            JOINTS.LEFT_EAR,
            JOINTS.RIGHT_EAR,
            JOINTS.NOSE
        ].forEach(joint => {
            this.data.jointScores[joint] = headScore;
            this.data.jointColors[joint] = headColor;
        });

        [JOINT_CONNECTIONS.headNeck,
            JOINT_CONNECTIONS.face,
            JOINT_CONNECTIONS.earSpan,
            JOINT_CONNECTIONS.eyeSpan,
            JOINT_CONNECTIONS.eyeNoseLeft,
            JOINT_CONNECTIONS.eyeNoseRight
        ].forEach(bone => {
            this.data.boneScores[getBoneName(bone)] = headScore;
            this.data.boneColors[getBoneName(bone)] = headColor;
        });
    }

    scoreUpperArms() {
        let leftUpperArmScore = 0;
        let leftUpperArmColor = MotionStudyColors.undefined;
        let rightUpperArmScore = 0;
        let rightUpperArmColor = MotionStudyColors.undefined;

        // set the aggregated score and color to all joints and bones of the body part
        this.data.jointScores[JOINTS.LEFT_SHOULDER] = leftUpperArmScore;
        this.data.jointColors[JOINTS.LEFT_SHOULDER] = leftUpperArmColor;
        this.data.jointScores[JOINTS.RIGHT_SHOULDER] = rightUpperArmScore;
        this.data.jointColors[JOINTS.RIGHT_SHOULDER] = rightUpperArmColor;
    
        this.data.boneScores[getBoneName(JOINT_CONNECTIONS.shoulderElbowLeft)] = leftUpperArmScore;
        this.data.boneColors[getBoneName(JOINT_CONNECTIONS.shoulderElbowLeft)] = leftUpperArmColor;
        this.data.boneScores[getBoneName(JOINT_CONNECTIONS.shoulderElbowRight)] = rightUpperArmScore;
        this.data.boneColors[getBoneName(JOINT_CONNECTIONS.shoulderElbowRight)] = rightUpperArmColor;

    }

    scoreLowerArms() {
        let leftLowerArmScore = 0;
        let leftLowerArmColor = MotionStudyColors.undefined;
        let rightLowerArmScore = 0;
        let rightLowerArmColor = MotionStudyColors.undefined;


        // set the aggregated score and color to all joints and bones of the body part
        this.data.jointScores[JOINTS.LEFT_ELBOW] = leftLowerArmScore;
        this.data.jointColors[JOINTS.LEFT_ELBOW] = leftLowerArmColor;
        this.data.jointScores[JOINTS.RIGHT_ELBOW] = rightLowerArmScore;
        this.data.jointColors[JOINTS.RIGHT_ELBOW] = rightLowerArmColor;
    
        this.data.boneScores[getBoneName(JOINT_CONNECTIONS.elbowWristLeft)] = leftLowerArmScore;
        this.data.boneColors[getBoneName(JOINT_CONNECTIONS.elbowWristLeft)] = leftLowerArmColor;
        this.data.boneScores[getBoneName(JOINT_CONNECTIONS.elbowWristRight)] = rightLowerArmScore;
        this.data.boneColors[getBoneName(JOINT_CONNECTIONS.elbowWristRight)] = rightLowerArmColor;
    }

    scoreHands() {
        // TODO: use offsets 

        let leftHandScore = 1;
        let leftHandColor = MotionStudyColors.undefined;
        let rightHandScore = 1;
        let rightHandColor = MotionStudyColors.undefined;

        // set the aggregated score and color to all joints and bones of the body part
        [JOINTS.LEFT_WRIST, JOINTS.LEFT_THUMB_CMC, JOINTS.LEFT_THUMB_MCP, JOINTS.LEFT_THUMB_IP, JOINTS.LEFT_THUMB_TIP,
            JOINTS.LEFT_INDEX_FINGER_MCP, JOINTS.LEFT_INDEX_FINGER_PIP, JOINTS.LEFT_INDEX_FINGER_DIP, JOINTS.LEFT_INDEX_FINGER_TIP,
            JOINTS.LEFT_MIDDLE_FINGER_MCP, JOINTS.LEFT_MIDDLE_FINGER_PIP, JOINTS.LEFT_MIDDLE_FINGER_DIP, JOINTS.LEFT_MIDDLE_FINGER_TIP,
            JOINTS.LEFT_RING_FINGER_MCP, JOINTS.LEFT_RING_FINGER_PIP, JOINTS.LEFT_RING_FINGER_DIP, JOINTS.LEFT_RING_FINGER_TIP,
            JOINTS.LEFT_PINKY_MCP, JOINTS.LEFT_PINKY_PIP, JOINTS.LEFT_PINKY_DIP, JOINTS.LEFT_PINKY_TIP
        ].forEach(joint => {
            this.data.jointScores[joint] = leftHandScore;
            this.data.jointColors[joint] = leftHandColor;
        });
    
        [JOINT_CONNECTIONS.thumb1Left, JOINT_CONNECTIONS.thumb2Left, JOINT_CONNECTIONS.thumb3Left, JOINT_CONNECTIONS.thumb4Left,
           JOINT_CONNECTIONS.index1Left, JOINT_CONNECTIONS.index2Left, JOINT_CONNECTIONS.index3Left, JOINT_CONNECTIONS.index4Left,
           JOINT_CONNECTIONS.middle2Left, JOINT_CONNECTIONS.middle3Left, JOINT_CONNECTIONS.middle4Left,
           JOINT_CONNECTIONS.ring2Left, JOINT_CONNECTIONS.ring3Left, JOINT_CONNECTIONS.ring4Left,
           JOINT_CONNECTIONS.pinky1Left, JOINT_CONNECTIONS.pinky2Left, JOINT_CONNECTIONS.pinky3Left, JOINT_CONNECTIONS.pinky4Left,
           JOINT_CONNECTIONS.handSpan1Left, JOINT_CONNECTIONS.handSpan2Left, JOINT_CONNECTIONS.handSpan3Left
        ].forEach(bone => {
            this.data.boneScores[getBoneName(bone)] = leftHandScore;
            this.data.boneColors[getBoneName(bone)] = leftHandColor;
        });
    
        [JOINTS.RIGHT_WRIST, JOINTS.RIGHT_THUMB_CMC, JOINTS.RIGHT_THUMB_MCP, JOINTS.RIGHT_THUMB_IP, JOINTS.RIGHT_THUMB_TIP,
            JOINTS.RIGHT_INDEX_FINGER_MCP, JOINTS.RIGHT_INDEX_FINGER_PIP, JOINTS.RIGHT_INDEX_FINGER_DIP, JOINTS.RIGHT_INDEX_FINGER_TIP,
            JOINTS.RIGHT_MIDDLE_FINGER_MCP, JOINTS.RIGHT_MIDDLE_FINGER_PIP, JOINTS.RIGHT_MIDDLE_FINGER_DIP, JOINTS.RIGHT_MIDDLE_FINGER_TIP,
            JOINTS.RIGHT_RING_FINGER_MCP, JOINTS.RIGHT_RING_FINGER_PIP, JOINTS.RIGHT_RING_FINGER_DIP, JOINTS.RIGHT_RING_FINGER_TIP,
            JOINTS.RIGHT_PINKY_MCP, JOINTS.RIGHT_PINKY_PIP, JOINTS.RIGHT_PINKY_DIP, JOINTS.RIGHT_PINKY_TIP
        ].forEach(joint => {
            this.data.jointScores[joint] = rightHandScore;
            this.data.jointColors[joint] = rightHandColor;
        });
    
        [JOINT_CONNECTIONS.thumb1Right, JOINT_CONNECTIONS.thumb2Right, JOINT_CONNECTIONS.thumb3Right, JOINT_CONNECTIONS.thumb4Right,
            JOINT_CONNECTIONS.index1Right, JOINT_CONNECTIONS.index2Right, JOINT_CONNECTIONS.index3Right, JOINT_CONNECTIONS.index4Right,
            JOINT_CONNECTIONS.middle2Right, JOINT_CONNECTIONS.middle3Right, JOINT_CONNECTIONS.middle4Right,
            JOINT_CONNECTIONS.ring2Right, JOINT_CONNECTIONS.ring3Right, JOINT_CONNECTIONS.ring4Right,
            JOINT_CONNECTIONS.pinky1Right, JOINT_CONNECTIONS.pinky2Right, JOINT_CONNECTIONS.pinky3Right, JOINT_CONNECTIONS.pinky4Right,
            JOINT_CONNECTIONS.handSpan1Right, JOINT_CONNECTIONS.handSpan2Right, JOINT_CONNECTIONS.handSpan3Right
        ].forEach(bone => {
            this.data.boneScores[getBoneName(bone)] = rightHandScore;
            this.data.boneColors[getBoneName(bone)] = rightHandColor;
        });

    }

    scoreLegs() {
        // TODO: is it necessary to separate left/right?
        let leftLegScore = 0;
        let leftLegColor = MotionStudyColors.undefined;
        let rightLegScore = 0;
        let rightLegColor = MotionStudyColors.undefined;
        
        // set the aggregated score and color to all joints and bones of the body part
        [JOINTS.LEFT_HIP,
            JOINTS.LEFT_KNEE,
            JOINTS.LEFT_ANKLE,
        ].forEach(joint => {
            this.data.jointScores[joint] = leftLegScore;
            this.data.jointColors[joint] = leftLegColor;
        });
        
        [JOINTS.RIGHT_HIP,
            JOINTS.RIGHT_KNEE,
            JOINTS.RIGHT_ANKLE,
        ].forEach(joint => {
            this.data.jointScores[joint] = rightLegScore;
            this.data.jointColors[joint] = rightLegColor;
        });
        
        [JOINT_CONNECTIONS.hipKneeLeft,
            JOINT_CONNECTIONS.kneeAnkleLeft,
        ].forEach(bone => {
            this.data.boneScores[getBoneName(bone)] = leftLegScore;
            this.data.boneColors[getBoneName(bone)] = leftLegColor;
        });
        
        [JOINT_CONNECTIONS.hipKneeRight,
            JOINT_CONNECTIONS.kneeAnkleRight,
        ].forEach(bone => {
            this.data.boneScores[getBoneName(bone)] = rightLegScore;
            this.data.boneColors[getBoneName(bone)] = rightLegColor;
        });
    }

    /**
     * Calculates MURI scores and derived visualisation colors. 
     */
    score() {
        this.scoreTrunk();
        this.scoreHead();
        this.scoreUpperArms();
        this.scoreLowerArms();
        this.scoreHands();
        this.scoreLegs();

        //TODO: compute overall score
        // how to compute overall color?
        //data.overallScore = overallRebaCalculation(data);
        //data.overallColor = getOverallRebaColor(data.overallScore);
        this.data.overallScore = 0;
        this.data.overallColor = MotionStudyColors.undefined;
        
    }

    /**
     * Calculates base ergonomics data and derived Muri scores and colors  
     * @param {Pose} pose The pose to calculate the regonomics for
     */
    calculateForPose(pose) {
        const startTime = Date.now();

        // prepare for new pose
        this.reset();

        // calculate base data such as angles and offsets
        this.data = new ErgonomicsData(pose);
        this.data.calculate();
        // calculate MURI scoring
        this.score();
        this.data.muriScores = this.muriScores;
        
        const elapsedTimeMs = Date.now() - startTime;
        //console.log(`MURI calculation time: ${elapsedTimeMs}ms`);
        return this.data;
    }
}