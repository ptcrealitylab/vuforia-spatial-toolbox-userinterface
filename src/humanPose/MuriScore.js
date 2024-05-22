import {MotionStudyColors} from "./MotionStudyColors.js";
import {Pose} from "./Pose.js";
import {ErgonomicsData, clamp} from "./ErgonomicsData.js";
import {JOINT_CONNECTIONS, JOINTS, getBoneName, ERGO_ANGLES, ERGO_OFFSETS} from './constants.js';

/** Default configuration of thresholds for MURI calculation and visualisation. */
const MURI_CONFIG_DEFAULT = Object.freeze({
    trunkFrontBendAngleThresholds: [-5, 20, 45],  // degrees ; normally [0, 20, 45] but we give margin of -5 deg to accommodate imperfect accuracy of pose when upright 
    trunkSideBendAngleThresholds: [15, 30],  // degrees
    trunkTwistAngleThresholds: [15, 45],  // degrees
    headFrontBendAngleThresholds: [-3, 15, 30],  // degrees ; normally [0, 15, 30] but we give margin of -3 deg to accommodate imperfect accuracy of pose when upright 
    headSideBendAngleThresholds: [15, 30],  // degrees
    headTwistAngleThresholds: [15, 30],  // degrees
    footHeightDifferenceThresholds: [150], // mm   
    lowerLegBendAngleThresholds: [60],  // degrees
    upperArmFrontRaiseAngleThresholds: [60, 90], // degrees
    upperArmSideRaiseAngleThresholds: [60, 90], // degrees
    lowerArmBendAngleThresholds: [120], // degrees
    lowerArmTwistAngleThresholds: [120],  // degrees
    handFrontBendAngleThresholds: [-20, 30], // degrees
    handReachDistanceThresholds: [300, 500],  // mm   //TODO: tune based on customer feedback

    // Weigths for different levels of strain on a body part which are used to calculate actual score.
    // Note: Weights are integer numbers in the latest iteration of MURI method
    scoreWeights: [0, 1, 2, 5], 

    // Definitions of score ranges for different levels of strain for each body part.
    // This is used to assign colours for visualising MURI scores.
    // Minimum score is always 0 and maximum score is (<the last entry in the threshold list> - 1)
    // Example with 4 levels of strain: 0 (low), 1 (medium), 2 (high), 3-5 (extreme)
    //    scoreLevels: [1, 2, 3, 6]   
    trunkScoreLevels: [1, 2, 3],
    headScoreLevels: [1, 2, 3],
    legScoreLevels: [1, 6],  
    upperArmScoreLevels: [1, 2, 3],
    lowerArmScoreLevels: [1, 2, 3],
    handScoreLevels: [1, 2, 3],
    overallScoreLevels: [0 /* MURI_MIN_SCORE */, 30 /* MURI_MAX_SCORE + 1 */]  // TODO: tune based on customer feedback
});

/** Modifiable configuration of thresholds for MURI calculation. */
const MURI_CONFIG = Object.assign({}, MURI_CONFIG_DEFAULT);

const MURI_COLOR_START = MotionStudyColors.fade(MotionStudyColors.green);
const MURI_COLOR_END = MotionStudyColors.fade(MotionStudyColors.red);

export const MURI_MIN_SCORE = 0
// TODO: calculate precisely based on final calculation of overall muri score. Should arms be 2*6*2?
export const MURI_MAX_SCORE = 6 * MURI_CONFIG_DEFAULT.scoreWeights[2] /* trunk + head */ + 2 * 6 * MURI_CONFIG_DEFAULT.scoreWeights[2] /* arms */ + 1 * MURI_CONFIG_DEFAULT.scoreWeights[3] /* legs */ // == 41 


/** Score types/names for individual strains across body parts . */
export const MURI_SCORES = {
    TRUNK_FRONT_BEND: 'trunk_front_bend_score',
    TRUNK_SIDE_BEND: 'trunk_side_bend_score',
    TRUNK_TWIST: 'trunk_twist_score',
    HEAD_FRONT_BEND: 'head_front_bend_score',
    HEAD_SIDE_BEND: 'head_side_bend_score',
    HEAD_TWIST: 'head_twist_score',
    LEFT_LOWER_LEG_BEND: 'left_lower_leg_bend_score',
    RIGHT_LOWER_LEG_BEND: 'right_lower_leg_bend_score',
    FEET_HEIGHT_DIFFERENCE: 'feet_height_difference_score',
    LEGS: 'legs_score',   // overall score for legs combining LEFT_LOWER_LEG_BEND, RIGHT_LOWER_LEG_BEND and FEET_HEIGHT_DIFFERENCE
    LEFT_UPPER_ARM_FRONT_RAISE: 'left_upper_arm_front_raise_score',
    LEFT_UPPER_ARM_SIDE_RAISE: 'left_upper_arm_side_raise_score',
    RIGHT_UPPER_ARM_FRONT_RAISE: 'right_upper_arm_front_raise_score',
    RIGHT_UPPER_ARM_SIDE_RAISE: 'right_upper_arm_side_raise_score',
    LEFT_LOWER_ARM_BEND: 'left_lower_arm_bend_score',
    LEFT_LOWER_ARM_TWIST: 'left_lower_arm_twist_score',
    RIGHT_LOWER_ARM_BEND: 'right_lower_arm_bend_score',
    RIGHT_LOWER_ARM_TWIST: 'right_lower_arm_twist_score',
    LEFT_HAND_FRONT_BEND: 'left_hand_front_bend_score',
    LEFT_HAND_REACH: 'left_hand_reach_score',
    RIGHT_HAND_FRONT_BEND: 'right_hand_front_bend_score',
    RIGHT_HAND_REACH: 'right_hand_reach_score'
};

/** Score types across body parts which are included in overall score calculation. */
export const MURI_SCORES_IN_OVERALL = [
    MURI_SCORES.TRUNK_FRONT_BEND,
    MURI_SCORES.TRUNK_SIDE_BEND,
    MURI_SCORES.TRUNK_TWIST,
    MURI_SCORES.HEAD_FRONT_BEND,
    MURI_SCORES.HEAD_SIDE_BEND,
    MURI_SCORES.HEAD_TWIST,
    MURI_SCORES.LEGS,
    MURI_SCORES.LEFT_UPPER_ARM_FRONT_RAISE,
    MURI_SCORES.LEFT_UPPER_ARM_SIDE_RAISE,
    MURI_SCORES.RIGHT_UPPER_ARM_FRONT_RAISE,
    MURI_SCORES.RIGHT_UPPER_ARM_SIDE_RAISE,
    MURI_SCORES.LEFT_LOWER_ARM_BEND,
    MURI_SCORES.LEFT_LOWER_ARM_TWIST,
    MURI_SCORES.RIGHT_LOWER_ARM_BEND,
    MURI_SCORES.RIGHT_LOWER_ARM_TWIST,
    MURI_SCORES.LEFT_HAND_FRONT_BEND,
    MURI_SCORES.LEFT_HAND_REACH,
    MURI_SCORES.RIGHT_HAND_FRONT_BEND,
    MURI_SCORES.RIGHT_HAND_REACH
];

/**
 * Class MuriScore calculates ergonomic scores for indicidual body parts and the whole body given a single 3D human pose. 
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
                this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain when bending backwards
            } else if (this.data.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] < MURI_CONFIG.trunkFrontBendAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            } else if (this.data.angles[ERGO_ANGLES.TRUNK_FRONT_BEND] < MURI_CONFIG.trunkFrontBendAngleThresholds[2]) {
                this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND] = MURI_CONFIG.scoreWeights[1];  // medium strain
            } else {
                this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            // console.log(`Trunk: frontBendAngle=${this.data.angles[ERGO_ANGLES.TRUNK_FRONT_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND]}`);
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
            //console.log(`Trunk: sideBendAngle=${this.data.angles[ERGO_ANGLES.TRUNK_SIDE_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.TRUNK_SIDE_BEND]}`);
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
            // console.log(`Trunk: twistAngle=${this.data.angles[ERGO_ANGLES.TRUNK_TWIST].toFixed(0)}; score=${this.muriScores[MURI_SCORES.TRUNK_TWIST]}`);
        }

        // aggregate individual strains to single score for the body part
        // for now it is the maximum from different types of strain to have a high sensitivity
        // note: score == null is mapped to 0
        trunkScore = Math.max(this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND], 
                              this.muriScores[MURI_SCORES.TRUNK_SIDE_BEND], 
                              this.muriScores[MURI_SCORES.TRUNK_TWIST]);

        // console.log(`Trunk: trunkScore=${trunkScore}`);

        // select color for the score of the highest strain (if any of strains is calculated)
        if (this.muriScores[MURI_SCORES.TRUNK_FRONT_BEND] != null || this.muriScores[MURI_SCORES.TRUNK_SIDE_BEND] != null || this.muriScores[MURI_SCORES.TRUNK_TWIST] != null) {
            if (trunkScore < MURI_CONFIG.trunkScoreLevels[0]) {
                trunkColor = MotionStudyColors.green;
            } else if (trunkScore < MURI_CONFIG.trunkScoreLevels[1]) {
                trunkColor = MotionStudyColors.yellow;
            } else {
                trunkColor = MotionStudyColors.red;
            }
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

         // check for front/back bending
         if (this.data.angles.hasOwnProperty(ERGO_ANGLES.HEAD_FRONT_BEND)) {
            if (this.data.angles[ERGO_ANGLES.HEAD_FRONT_BEND] < MURI_CONFIG.headFrontBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.HEAD_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain when bending backwards 
            } else if (this.data.angles[ERGO_ANGLES.HEAD_FRONT_BEND] < MURI_CONFIG.headFrontBendAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.HEAD_FRONT_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            } else if (this.data.angles[ERGO_ANGLES.HEAD_FRONT_BEND] < MURI_CONFIG.headFrontBendAngleThresholds[2]) {
                this.muriScores[MURI_SCORES.HEAD_FRONT_BEND] = MURI_CONFIG.scoreWeights[1];  // medium strain
            } else {
                this.muriScores[MURI_SCORES.HEAD_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Head: frontBendAngle=${this.data.angles[ERGO_ANGLES.HEAD_FRONT_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.HEAD_FRONT_BEND]}`);
        }

         // check for side bending (thresholds are used symmetrically for left and right side)
         if (this.data.angles.hasOwnProperty(ERGO_ANGLES.HEAD_SIDE_BEND)) {
            if (Math.abs(this.data.angles[ERGO_ANGLES.HEAD_SIDE_BEND]) < MURI_CONFIG.headSideBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.HEAD_SIDE_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            } else if (Math.abs(this.data.angles[ERGO_ANGLES.HEAD_SIDE_BEND]) < MURI_CONFIG.headSideBendAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.HEAD_SIDE_BEND] = MURI_CONFIG.scoreWeights[1];  // medium strain
            } else {
                this.muriScores[MURI_SCORES.HEAD_SIDE_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Head: sideBendAngle=${this.data.angles[ERGO_ANGLES.HEAD_SIDE_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.HEAD_SIDE_BEND]}`);
        }

        // check for twisting/rotation (thresholds are used symmetrically for left and right side)
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.HEAD_TWIST)) {
            if (Math.abs(this.data.angles[ERGO_ANGLES.HEAD_TWIST]) < MURI_CONFIG.headTwistAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.HEAD_TWIST] = MURI_CONFIG.scoreWeights[0];  // low strain
            } else if (Math.abs(this.data.angles[ERGO_ANGLES.HEAD_TWIST]) < MURI_CONFIG.headTwistAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.HEAD_TWIST] = MURI_CONFIG.scoreWeights[1];  // medium strain
            } else {
                this.muriScores[MURI_SCORES.HEAD_TWIST] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Head: twistAngle=${this.data.angles[ERGO_ANGLES.HEAD_TWIST].toFixed(0)}; score=${this.muriScores[MURI_SCORES.HEAD_TWIST]}`);
        }

        // aggregate individual strains to single score for the body part
        // for now it is the maximum from different types of strain to have a high sensitivity
        // note: score == null is mapped to 0
        headScore = Math.max(this.muriScores[MURI_SCORES.HEAD_FRONT_BEND], 
                             this.muriScores[MURI_SCORES.HEAD_SIDE_BEND], 
                             this.muriScores[MURI_SCORES.HEAD_TWIST]);
                           
        //console.log(`Head: headScore=${headScore}`);

        // select color for the score of the highest strain (if any of strains is calculated)
        if (this.muriScores[MURI_SCORES.HEAD_FRONT_BEND] != null || this.muriScores[MURI_SCORES.HEAD_SIDE_BEND] != null || this.muriScores[MURI_SCORES.HEAD_TWIST] != null) {
            if (headScore < MURI_CONFIG.headScoreLevels[0]) {
                headColor = MotionStudyColors.green;
            } else if (headScore < MURI_CONFIG.headScoreLevels[1]) {
                headColor = MotionStudyColors.yellow;
            } else {
                headColor = MotionStudyColors.red;
            }
        }

        // set the aggregated score and color to all joints and bones of the body part  
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

        /* left uppper arm */

        // check for front/back arm raise (for now thresholds are used symmetrically for the front and the back)
        // TODO: reevaluate symmetrical use of thresholds
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.LEFT_UPPER_ARM_FRONT_RAISE)) {
            if (Math.abs(this.data.angles[ERGO_ANGLES.LEFT_UPPER_ARM_FRONT_RAISE]) < MURI_CONFIG.upperArmFrontRaiseAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_FRONT_RAISE] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else if (Math.abs(this.data.angles[ERGO_ANGLES.LEFT_UPPER_ARM_FRONT_RAISE]) < MURI_CONFIG.upperArmFrontRaiseAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_FRONT_RAISE] = MURI_CONFIG.scoreWeights[1];  // medium strain
            }
            else {
                this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_FRONT_RAISE] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Left upper arm: frontRaiseAngle=${this.data.angles[ERGO_ANGLES.LEFT_UPPER_ARM_FRONT_RAISE].toFixed(0)}; score=${this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_FRONT_RAISE]}`);
        }

        // check for side arm raise (for now thresholds are used symmetrically for raise of the same arm to the left and right side)
        // TODO: reevaluate symmetrical use of thresholds
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.LEFT_UPPER_ARM_SIDE_RAISE)) {
            if (Math.abs(this.data.angles[ERGO_ANGLES.LEFT_UPPER_ARM_SIDE_RAISE]) < MURI_CONFIG.upperArmSideRaiseAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_SIDE_RAISE] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else if (Math.abs(this.data.angles[ERGO_ANGLES.LEFT_UPPER_ARM_SIDE_RAISE]) < MURI_CONFIG.upperArmSideRaiseAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_SIDE_RAISE] = MURI_CONFIG.scoreWeights[1];  // medium strain
            }
            else {
                this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_SIDE_RAISE] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Left upper arm: sideRaiseAngle=${this.data.angles[ERGO_ANGLES.LEFT_UPPER_ARM_SIDE_RAISE].toFixed(0)}; score=${this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_SIDE_RAISE]}`);
        }

        // aggregate individual strains to single score for the body part
        // for now it is the maximum from different types of strain to have a high sensitivity
        // note: score == null is mapped to 0
        leftUpperArmScore = Math.max(this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_FRONT_RAISE], this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_SIDE_RAISE]);

        //console.log(`Left upper arm: leftUpperArmScore=${leftUpperArmScore}`);

        // select color for the score of the highest strain (if any of strains is calculated)
        if (this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_FRONT_RAISE] != null || this.muriScores[MURI_SCORES.LEFT_UPPER_ARM_SIDE_RAISE] != null) {
            if (leftUpperArmScore < MURI_CONFIG.upperArmScoreLevels[0]) {
                leftUpperArmColor = MotionStudyColors.green;
            } else if (leftUpperArmScore < MURI_CONFIG.upperArmScoreLevels[1]) {
                leftUpperArmColor = MotionStudyColors.yellow;
            } else {
                leftUpperArmColor = MotionStudyColors.red;
            }
        }

        /* right uppper arm */

        // check for front/back arm raise (for now thresholds are used symmetrically for the front and the back)
        // TODO: reevaluate symmetrical use of thresholds
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.RIGHT_UPPER_ARM_FRONT_RAISE)) {
            if (Math.abs(this.data.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_FRONT_RAISE]) < MURI_CONFIG.upperArmFrontRaiseAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_FRONT_RAISE] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else if (Math.abs(this.data.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_FRONT_RAISE]) < MURI_CONFIG.upperArmFrontRaiseAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_FRONT_RAISE] = MURI_CONFIG.scoreWeights[1];  // medium strain
            }
            else {
                this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_FRONT_RAISE] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Right upper arm: frontRaiseAngle=${this.data.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_FRONT_RAISE].toFixed(0)}; score=${this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_FRONT_RAISE]}`);
        }

        // check for side arm raise (for now thresholds are used symmetrically for raise of the same arm to the left and right side)
        // TODO: reevaluate symmetrical use of thresholds
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.RIGHT_UPPER_ARM_SIDE_RAISE)) {
            if (Math.abs(this.data.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_SIDE_RAISE]) < MURI_CONFIG.upperArmSideRaiseAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_SIDE_RAISE] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else if (Math.abs(this.data.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_SIDE_RAISE]) < MURI_CONFIG.upperArmSideRaiseAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_SIDE_RAISE] = MURI_CONFIG.scoreWeights[1];  // medium strain
            }
            else {
                this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_SIDE_RAISE] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Right upper arm: sideRaiseAngle=${this.data.angles[ERGO_ANGLES.RIGHT_UPPER_ARM_SIDE_RAISE].toFixed(0)}; score=${this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_SIDE_RAISE]}`);
        }

        // aggregate individual strains to single score for the body part
        // for now it is the maximum from different types of strain to have a high sensitivity
        // note: score == null is mapped to 0
        rightUpperArmScore = Math.max(this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_FRONT_RAISE], this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_SIDE_RAISE]);

        //console.log(`Right upper arm: rightUpperArmScore=${rightUpperArmScore}`);

        // select color for the score of the highest strain (if any of strains is calculated)
        if (this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_FRONT_RAISE] != null || this.muriScores[MURI_SCORES.RIGHT_UPPER_ARM_SIDE_RAISE] != null) {
            if (rightUpperArmScore < MURI_CONFIG.upperArmScoreLevels[0]) {
                rightUpperArmColor = MotionStudyColors.green;
            } else if (rightUpperArmScore < MURI_CONFIG.upperArmScoreLevels[1]) {
                rightUpperArmColor = MotionStudyColors.yellow;
            } else {
                rightUpperArmColor = MotionStudyColors.red;
            }
        }
        

        // set the aggregated score and color to all joints and bones of the body parts
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

        /* left lower arm */

        // check for elbow bend
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.LEFT_LOWER_ARM_BEND)) {
            if (this.data.angles[ERGO_ANGLES.LEFT_LOWER_ARM_BEND] < MURI_CONFIG.lowerArmBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else {
                this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Left lower arm: bendAngle=${this.data.angles[ERGO_ANGLES.LEFT_LOWER_ARM_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_BEND]}`);
        }

        // check for lower arm twist
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.LEFT_LOWER_ARM_TWIST)) {
            if (this.data.angles[ERGO_ANGLES.LEFT_LOWER_ARM_TWIST] < MURI_CONFIG.lowerArmTwistAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_TWIST] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else {
                this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_TWIST] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Left lower arm: twistAngle=${this.data.angles[ERGO_ANGLES.LEFT_LOWER_ARM_TWIST].toFixed(0)}; score=${this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_TWIST]}`);
        }

        // aggregate individual strains to single score for the body part
        // for now it is the maximum from different types of strain to have a high sensitivity
        // note: score == null is mapped to 0
        leftLowerArmScore = Math.max(this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_BEND], this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_TWIST]);

        //console.log(`Left lower arm: leftLowerArmScore=${leftLowerArmScore}`);

        // select color for the score of the highest strain (if any of strains is calculated)
        if (this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_BEND] != null || this.muriScores[MURI_SCORES.LEFT_LOWER_ARM_TWIST] != null) {
            if (leftLowerArmScore < MURI_CONFIG.lowerArmScoreLevels[0]) {
                leftLowerArmColor = MotionStudyColors.green;
            } else if (leftLowerArmScore < MURI_CONFIG.lowerArmScoreLevels[1]) {
                leftLowerArmColor = MotionStudyColors.yellow;
            } else {
                leftLowerArmColor = MotionStudyColors.red;
            }
        }

        /* right lower arm */

        // check for elbow bend
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.RIGHT_LOWER_ARM_BEND)) {
            if (this.data.angles[ERGO_ANGLES.RIGHT_LOWER_ARM_BEND] < MURI_CONFIG.lowerArmBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else {
                this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Right lower arm: bendAngle=${this.data.angles[ERGO_ANGLES.RIGHT_LOWER_ARM_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_BEND]}`);
        }

        // check for lower arm twist
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.RIGHT_LOWER_ARM_TWIST)) {
            if (this.data.angles[ERGO_ANGLES.RIGHT_LOWER_ARM_TWIST] < MURI_CONFIG.lowerArmTwistAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_TWIST] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else {
                this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_TWIST] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Right lower arm: twistAngle=${this.data.angles[ERGO_ANGLES.RIGHT_LOWER_ARM_TWIST].toFixed(0)}; score=${this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_TWIST]}`);
        }

        // aggregate individual strains to single score for the body part
        // for now it is the maximum from different types of strain to have a high sensitivity
        // note: score == null is mapped to 0
        rightLowerArmScore = Math.max(this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_BEND], this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_TWIST]);

        //console.log(`Right lower arm: rightLowerArmScore=${rightLowerArmScore}`);

        // select color for the score of the highest strain (if any of strains is calculated)
        if (this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_BEND] != null || this.muriScores[MURI_SCORES.RIGHT_LOWER_ARM_TWIST] != null) {
            if (rightLowerArmScore < MURI_CONFIG.lowerArmScoreLevels[0]) {
                rightLowerArmColor = MotionStudyColors.green;
            } else if (rightLowerArmScore < MURI_CONFIG.lowerArmScoreLevels[1]) {
                rightLowerArmColor = MotionStudyColors.yellow;
            } else {
                rightLowerArmColor = MotionStudyColors.red;
            }
        }

        // set the aggregated score and color to all joints and bones of the body parts
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
        let leftHandScore = 0;
        let leftHandColor = MotionStudyColors.undefined;
        let rightHandScore = 0;
        let rightHandColor = MotionStudyColors.undefined;

        /* left hand */

        // check for front bend of hand from midline of lower arm (wrist flexion/extention)
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.LEFT_HAND_FRONT_BEND)) {
            if (this.data.angles[ERGO_ANGLES.LEFT_HAND_FRONT_BEND] < MURI_CONFIG.handFrontBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.LEFT_HAND_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            else if (this.data.angles[ERGO_ANGLES.LEFT_HAND_FRONT_BEND] < MURI_CONFIG.handFrontBendAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.LEFT_HAND_FRONT_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else {
                this.muriScores[MURI_SCORES.LEFT_HAND_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Left hand: frontBendAngle=${this.data.angles[ERGO_ANGLES.LEFT_HAND_FRONT_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.LEFT_HAND_FRONT_BEND]}`);
        }

        // check for hand reach
        // For now it is just a distance between the centre of hips and the wrist. The available direction of 3D offset in hips CS is not used. 
        // Wrist joint is used because the hand is not tracked more often. 
        if (this.data.offsets.hasOwnProperty(ERGO_OFFSETS.PELVIS_TO_LEFT_WRIST)) {
            const reachDistance = this.data.offsets[ERGO_OFFSETS.PELVIS_TO_LEFT_WRIST].length();
            if (reachDistance < MURI_CONFIG.handReachDistanceThresholds[0]) {
                this.muriScores[MURI_SCORES.LEFT_HAND_REACH] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else if (reachDistance < MURI_CONFIG.handReachDistanceThresholds[1]) {
                this.muriScores[MURI_SCORES.LEFT_HAND_REACH] = MURI_CONFIG.scoreWeights[1];  // medium strain
            }
            else {
                this.muriScores[MURI_SCORES.LEFT_HAND_REACH] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Left hand: reachDistance=${reachDistance.toFixed(0)}mm; score=${this.muriScores[MURI_SCORES.LEFT_HAND_REACH]}`);
        }

        // aggregate individual strains to single score for the body part
        // for now it is the maximum from different types of strain to have a high sensitivity
        // note: score == null is mapped to 0
        leftHandScore = Math.max(this.muriScores[MURI_SCORES.LEFT_HAND_FRONT_BEND], this.muriScores[MURI_SCORES.LEFT_HAND_REACH]);

        //console.log(`Left hand: leftHandScore=${leftHandScore}`);

        // select color for the score of the highest strain (if any of strains is calculated)
        if (this.muriScores[MURI_SCORES.LEFT_HAND_FRONT_BEND] != null || this.muriScores[MURI_SCORES.LEFT_HAND_REACH] != null) {
            if (leftHandScore < MURI_CONFIG.handScoreLevels[0]) {
                leftHandColor = MotionStudyColors.green;
            } else if (leftHandScore < MURI_CONFIG.handScoreLevels[1]) {
                leftHandColor = MotionStudyColors.yellow;
            } else {
                leftHandColor = MotionStudyColors.red;
            }
        }

        /* right hand */

        // check for front bend of hand from midline of lower arm (wrist flexion/extention)
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.RIGHT_HAND_FRONT_BEND)) {
            if (this.data.angles[ERGO_ANGLES.RIGHT_HAND_FRONT_BEND] < MURI_CONFIG.handFrontBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.RIGHT_HAND_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            else if (this.data.angles[ERGO_ANGLES.RIGHT_HAND_FRONT_BEND] < MURI_CONFIG.handFrontBendAngleThresholds[1]) {
                this.muriScores[MURI_SCORES.RIGHT_HAND_FRONT_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else {
                this.muriScores[MURI_SCORES.RIGHT_HAND_FRONT_BEND] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Right hand: frontBendAngle=${this.data.angles[ERGO_ANGLES.RIGHT_HAND_FRONT_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.RIGHT_HAND_FRONT_BEND]}`);
        }

        // check for hand reach
        // For now it is just a distance between the centre of hips and the wrist. The available direction of 3D offset in hips CS is not used. 
        // Wrist joint is used because the hand is not tracked more often. 
        if (this.data.offsets.hasOwnProperty(ERGO_OFFSETS.PELVIS_TO_RIGHT_WRIST)) {
            const reachDistance = this.data.offsets[ERGO_OFFSETS.PELVIS_TO_RIGHT_WRIST].length();
            if (reachDistance < MURI_CONFIG.handReachDistanceThresholds[0]) {
                this.muriScores[MURI_SCORES.RIGHT_HAND_REACH] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else if (reachDistance < MURI_CONFIG.handReachDistanceThresholds[1]) {
                this.muriScores[MURI_SCORES.RIGHT_HAND_REACH] = MURI_CONFIG.scoreWeights[1];  // medium strain
            }
            else {
                this.muriScores[MURI_SCORES.RIGHT_HAND_REACH] = MURI_CONFIG.scoreWeights[2];  // high strain
            }
            //console.log(`Right hand: reachDistance=${reachDistance.toFixed(0)}mm; score=${this.muriScores[MURI_SCORES.RIGHT_HAND_REACH]}`);
        }

        // aggregate individual strains to single score for the body part
        // for now it is the maximum from different types of strain to have a high sensitivity
        // note: score == null is mapped to 0
        rightHandScore = Math.max(this.muriScores[MURI_SCORES.RIGHT_HAND_FRONT_BEND], this.muriScores[MURI_SCORES.RIGHT_HAND_REACH]);

        //console.log(`Right hand: rightHandScore=${rightHandScore}`);

        // select color for the score of the highest strain (if any of strains is calculated)
        if (this.muriScores[MURI_SCORES.RIGHT_HAND_FRONT_BEND] != null || this.muriScores[MURI_SCORES.RIGHT_HAND_REACH] != null) {
            if (rightHandScore < MURI_CONFIG.handScoreLevels[0]) {
                rightHandColor = MotionStudyColors.green;
            } else if (rightHandScore < MURI_CONFIG.handScoreLevels[1]) {
                rightHandColor = MotionStudyColors.yellow;
            } else {
                rightHandColor = MotionStudyColors.red;
            }
        }

        // set the aggregated score and color to all joints and bones of the body parts
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
        // NOTE: there is no separation to left/right leg in scoring and visualisation
        let legsScore = 0;
        let legsColor = MotionStudyColors.undefined;
        
        // Check for unilateral bearing of the body weight
        if(this.data.offsets.hasOwnProperty(ERGO_OFFSETS.LEFT_TO_RIGHT_FOOT)) {
            const footHeightDifference = Math.abs(this.data.offsets[ERGO_OFFSETS.LEFT_TO_RIGHT_FOOT].y);
            if (footHeightDifference < MURI_CONFIG.footHeightDifferenceThresholds[0]) {
                this.muriScores[MURI_SCORES.FEET_HEIGHT_DIFFERENCE] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else {
                this.muriScores[MURI_SCORES.FEET_HEIGHT_DIFFERENCE] = MURI_CONFIG.scoreWeights[3];  // extreme strain
            }
            //console.log(`Legs: footHeightDifference: ${footHeightDifference.toFixed(0)}mm; score=${this.muriScores[MURI_SCORES.FEET_HEIGHT_DIFFERENCE]}`);        
        }

        // check for knee bend in left leg 
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.LEFT_LOWER_LEG_BEND)) {
            if (this.data.angles[ERGO_ANGLES.LEFT_LOWER_LEG_BEND] < MURI_CONFIG.lowerLegBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.LEFT_LOWER_LEG_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else {
                this.muriScores[MURI_SCORES.LEFT_LOWER_LEG_BEND] = MURI_CONFIG.scoreWeights[3];  // extreme strain
            }
            //console.log(`Left lower leg: bendAngle=${this.data.angles[ERGO_ANGLES.LEFT_LOWER_LEG_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.LEFT_LOWER_LEG_BEND]}`);
        }        
        
        // check for knee bend in right leg 
        if (this.data.angles.hasOwnProperty(ERGO_ANGLES.RIGHT_LOWER_LEG_BEND)) {
            if (this.data.angles[ERGO_ANGLES.RIGHT_LOWER_LEG_BEND] < MURI_CONFIG.lowerLegBendAngleThresholds[0]) {
                this.muriScores[MURI_SCORES.RIGHT_LOWER_LEG_BEND] = MURI_CONFIG.scoreWeights[0];  // low strain
            }
            else {
                this.muriScores[MURI_SCORES.RIGHT_LOWER_LEG_BEND] = MURI_CONFIG.scoreWeights[3];  // extreme strain
            }
            //console.log(`Right lower leg: bendAngle=${this.data.angles[ERGO_ANGLES.RIGHT_LOWER_LEG_BEND].toFixed(0)}; score=${this.muriScores[MURI_SCORES.RIGHT_LOWER_LEG_BEND]}`);
        }
        
        // aggregate individual strains to single score for the body part. For legs, this aggregated score is explicitly part of Muri assessement rather than the individual 'component' scores.
        // We make it exportable through this.muriScores[MURI_SCORES.LEGS].
        if (this.muriScores[MURI_SCORES.FEET_HEIGHT_DIFFERENCE] != null || this.muriScores[MURI_SCORES.LEFT_LOWER_LEG_BEND] != null || this.muriScores[MURI_SCORES.RIGHT_LOWER_LEG_BEND] != null) {
            // note: score == null is mapped to 0
            this.muriScores[MURI_SCORES.LEGS] = Math.max(this.muriScores[MURI_SCORES.FEET_HEIGHT_DIFFERENCE], this.muriScores[MURI_SCORES.LEFT_LOWER_LEG_BEND], this.muriScores[MURI_SCORES.RIGHT_LOWER_LEG_BEND]);
        }
        // else, this.muriScores[MURI_SCORES.LEGS] == null

        //console.log(`Legs: legsScore=${this.muriScores[MURI_SCORES.LEGS]}`);

        // select color for the aggregated score (if any of strains is calculated)
        if (this.muriScores[MURI_SCORES.LEGS] != null) {
            legsScore = this.muriScores[MURI_SCORES.LEGS];

            if (legsScore < MURI_CONFIG.legScoreLevels[0]) {
                legsColor = MotionStudyColors.green;
            } else {
                legsColor = MotionStudyColors.black;
            }
        }
        
        // set the aggregated score and color to all joints and bones of the body part
        [JOINTS.LEFT_HIP,
            JOINTS.LEFT_KNEE,
            JOINTS.LEFT_ANKLE,
        ].forEach(joint => {
            this.data.jointScores[joint] = legsScore;
            this.data.jointColors[joint] = legsColor;
        });
        
        [JOINTS.RIGHT_HIP,
            JOINTS.RIGHT_KNEE,
            JOINTS.RIGHT_ANKLE,
        ].forEach(joint => {
            this.data.jointScores[joint] = legsScore;
            this.data.jointColors[joint] = legsColor;
        });
        
        [JOINT_CONNECTIONS.hipKneeLeft,
            JOINT_CONNECTIONS.kneeAnkleLeft,
        ].forEach(bone => {
            this.data.boneScores[getBoneName(bone)] = legsScore;
            this.data.boneColors[getBoneName(bone)] = legsColor;
        });
        
        [JOINT_CONNECTIONS.hipKneeRight,
            JOINT_CONNECTIONS.kneeAnkleRight,
        ].forEach(bone => {
            this.data.boneScores[getBoneName(bone)] = legsScore;
            this.data.boneColors[getBoneName(bone)] = legsColor;
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

        // compute overall score which is a simple sum of the scores for individual strains
        this.data.overallScore = 0;
        let validScoreCount = 0;
        // Some scores are not included in the overall score (eg. individual leg scores which are combined into single 'legs_score')
        // Left and right arm scores are all added to the overall score.
        // TODO: potentially different left and right arm combination should be resolved here
        MURI_SCORES_IN_OVERALL.forEach(scoreName => {
            if (this.muriScores[scoreName] != null) {
                this.data.overallScore += this.muriScores[scoreName];
                validScoreCount += 1
            }
            // if a particular score is not calculated, we implicitly assume that it is zero 
        });

        // compute a color for overall score
        if (validScoreCount === 0) { // no valid score
            this.data.overallColor = MotionStudyColors.undefined;
        }
        else {
            const lowCutoff = MURI_CONFIG.overallScoreLevels[0];
            const highCutoff = MURI_CONFIG.overallScoreLevels[1] - 1;
            const fraction = (clamp(this.data.overallScore, lowCutoff, highCutoff) - lowCutoff) / (highCutoff - lowCutoff);
            this.data.overallColor = MURI_COLOR_START.clone().lerpHSL(MURI_COLOR_END, fraction);
        }
        
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