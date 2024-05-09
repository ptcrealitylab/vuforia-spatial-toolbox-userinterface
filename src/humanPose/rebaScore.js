import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINT_CONNECTIONS, JOINTS, getBoneName, TRACK_HANDS} from './constants.js';
import {MotionStudyColors} from "./MotionStudyColors.js";
import {ErgonomicsData} from "./ErgonomicsData.js";

// https://www.physio-pedia.com/Rapid_Entire_Body_Assessment_(REBA)
// https://ergo-plus.com/reba-assessment-tool-guide/
// ^ Sample REBA scoring tables

/** Calculations assume human poses defined in Y-up CS and in milimeter units. */

/** Default configuration of thresholds for REBA calculation and visualisation. */
const REBA_CONFIG_DEFAULT = Object.freeze({
    neckFrontBendAngleThresholds: [5, 20],  // degrees
    neckTwistAngleThresholds: [20],  // degrees
    trunkFrontBendAngleThresholds: [5, 20, 60],  // degrees
    trunkTwistAngleThresholds: [25],  // degrees
    legBendAngleThresholds: [30, 60],  // degrees
    upperArmFrontRaiseAngleThresholds: [20, 45, 90], // degrees
    upperArmGravityAngleThresholds: [20], // degrees
    shoulderRaiseAngleThresholds: [80], // degrees
    lowerArmBendAngleThresholds: [60, 100], // degrees
    wristFrontBendAngleThresholds: [15], // degrees
    wristSideBendAngleThresholds: [30], // degrees
    wristTwistAngleThresholds: [120],  // degrees
    footHeightDifferenceThresholds: [100], // mm

    // Definitions of score ranges for different levels of strain for each body part.
    // Minimum score is always 1 and maximum score is the last entry in the threshold list
    // Example with 3 levels of strain: 1 (low), 2-3 (medium), 4-5 (high)
    //    trunkScoreLevels: [2, 4, 6]   
    // This is used for assigning colours for visualising levels of REBA scores.
    neckScoreLevels: [2, 3, 4],
    trunkScoreLevels: [2, 4, 6], 
    legScoreLevels: [2, 3, 5], 
    upperArmScoreLevels: [3, 5, 7], 
    lowerArmScoreLevels: [2, 3],
    wristScoreLevels: [2, 3, 4],
    overallScoreLevels: [4, 8, 13]
});

/** Modifiable configuration of thresholds for REBA calculation. */
const REBA_CONFIG = Object.assign({}, REBA_CONFIG_DEFAULT);

/**
 * Clamp a value between a minimum and maximum.
 * @param {number} value The value to clamp.
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @return {number} The clamped value.
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Calculates the angle between two vectors in degrees.
 * @param {THREE.Vector3} vector1 The first vector.
 * @param {THREE.Vector3} vector2 The second vector.
 * @return {number} The angle between the two vectors in degrees [0, +180].
 */
function angleBetween(vector1, vector2) {
    return vector1.angleTo(vector2) * 180 / Math.PI;
}

/**
 * Sets the score and color for the neck reba.
 * Starting with score=1
 * +1 for forward bending > 20 degrees or backward bending > 5 degrees
 * +1 if side bending or twisting wrt shoulders
 * @param {ErgonomicsData} data The ergonomicsData to calculate the score and color for.
 */
function neckReba(data) {
    let neckScore = 1;
    let neckColor = MotionStudyColors.undefined;

    // NOTE: not checking if all needed joints have a valid position (head and neck joints are always valid)

    const headUp = data.orientations.head.up;
    const headForward = data.orientations.head.forward;
    
    // +1 for side-bending (greater than 20 degrees), back-bending (any degrees), twisting, or greater than 20 degrees in general
    const upMisalignmentAngle = angleBetween(headUp, data.orientations.chest.up);
    // all vectors are normalised, so dot() == cos(angle between vectors) 
    const forwardBendingAlignment = headUp.clone().dot(data.orientations.chest.forward);  
    const backwardBendingAlignment = headUp.clone().dot(data.orientations.chest.forward.clone().negate());
    const rightBendingAlignment = headUp.clone().dot(data.orientations.chest.right);
    const leftBendingAlignment = headUp.clone().dot(data.orientations.chest.right.clone().negate());

    // Check for bending
    let sideBend = false;
    if (upMisalignmentAngle > REBA_CONFIG.neckFrontBendAngleThresholds[1]) {
        neckScore++; // +1 for greater than threshold

        // check for side-bending only when above the overall bending threshold
        // true when above +-45 deg from chest forward or chest backward direction (when looking from above) 
        sideBend = ((forwardBendingAlignment < rightBendingAlignment || forwardBendingAlignment < leftBendingAlignment) && 
                    (backwardBendingAlignment < rightBendingAlignment || backwardBendingAlignment < leftBendingAlignment));
    } else {
        if (forwardBendingAlignment < backwardBendingAlignment &&
            upMisalignmentAngle > REBA_CONFIG.neckFrontBendAngleThresholds[0]) {  // (not in standard REBA but small deviation from upright 0 deg is needed to account for imperfection of measurement)
            neckScore++; // +1 for back-bending more than few degrees
        }
    }
    
    // Check for twisting of more degrees than bendingThreshold from straight ahead
    const twistRightAngle = angleBetween(headForward, data.orientations.chest.right); // Angle from full twist right
    const twistLeftAngle = 180 - twistRightAngle;
    const twist = (twistRightAngle < (90 - REBA_CONFIG.neckTwistAngleThresholds[0]) || twistLeftAngle < (90 - REBA_CONFIG.neckTwistAngleThresholds[0]));

    // +1 for twisting or side-bending
    if (sideBend || twist) {
        neckScore++; 
    }

    //console.log(`Neck: upMisalignmentAngle=${upMisalignmentAngle.toFixed(0)}deg;  twistRightAngle=${twistRightAngle.toFixed(0)}deg; sideBend=${sideBend}; twist=${twist}; neckScore=${neckScore}`);
    
    neckScore = clamp(neckScore, 1, REBA_CONFIG.neckScoreLevels[2] - 1);

    if (neckScore < REBA_CONFIG.neckScoreLevels[0]) {
        neckColor = MotionStudyColors.green;
    } else if (neckScore < REBA_CONFIG.neckScoreLevels[1]) {
        neckColor = MotionStudyColors.yellow;
    } else {
        neckColor = MotionStudyColors.red;
    }
    
    [JOINTS.NECK,
        JOINTS.HEAD,
        JOINTS.LEFT_EYE,
        JOINTS.RIGHT_EYE,
        JOINTS.LEFT_EAR,
        JOINTS.RIGHT_EAR,
        JOINTS.NOSE
    ].forEach(joint => {
        data.jointScores[joint] = neckScore;
        data.jointColors[joint] = neckColor;
    });

    [JOINT_CONNECTIONS.headNeck,
        JOINT_CONNECTIONS.face,
        JOINT_CONNECTIONS.earSpan,
        JOINT_CONNECTIONS.eyeSpan,
        JOINT_CONNECTIONS.eyeNoseLeft,
        JOINT_CONNECTIONS.eyeNoseRight
    ].forEach(bone => {
        data.boneScores[getBoneName(bone)] = neckScore;
        data.boneColors[getBoneName(bone)] = neckColor;
    });
    
}

/**
 * Sets the score and color for the trunk reba.
 * Starting with score=1
 * +1 for any bending > 5 degrees
 * +1 for forward or backwards bending > 20 degrees
 * +1 for forward or backwards bending > 60 degrees
 * +1 if side bending or twisting shoulders wrt hips
 * @param {ErgonomicsData} data The data to calculate the score and color for.
 */
function trunkReba(data) {
    let trunkScore = 1;
    let trunkColor = MotionStudyColors.undefined;
    
    // Comparisons should be relative to directions determined by hips
    // NOTE: not checking if all needed joints have a valid position (trunk/torso joints are always valid)
    const chestUp = data.orientations.chest.up;
    const chestForward = data.orientations.chest.forward;
    const up = new THREE.Vector3(0, 1, 0);
    const upMisalignmentAngle = angleBetween(chestUp, up);
    // all vectors are normalised, so dot() == cos(angle between vectors) 
    const forwardBendingAlignment = chestUp.clone().dot(data.orientations.hips.forward);
    const backwardBendingAlignment = chestUp.clone().dot(data.orientations.hips.forward.clone().negate());
    const rightBendingAlignment = chestUp.clone().dot(data.orientations.hips.right);
    const leftBendingAlignment = chestUp.clone().dot(data.orientations.hips.right.clone().negate());
    
    // Check for bending
    let sideBend = false;
    if (upMisalignmentAngle > REBA_CONFIG.trunkFrontBendAngleThresholds[0]) {
        trunkScore++; // +1 for greater than 5 degrees (not in standard REBA but small deviation from upright 0 deg is needed to account for imperfection of measurement)
        if (upMisalignmentAngle > REBA_CONFIG.trunkFrontBendAngleThresholds[1]) {
            trunkScore++; // +1 for greater than 20 degrees
            // check for side-bending only when above some overall bending threshold
            // true when above +-45 deg from hip forward or hip backward direction (when looking from above) 
            sideBend = ((forwardBendingAlignment < rightBendingAlignment || forwardBendingAlignment < leftBendingAlignment) && 
                        (backwardBendingAlignment < rightBendingAlignment || backwardBendingAlignment < leftBendingAlignment));
            if (upMisalignmentAngle > REBA_CONFIG.trunkFrontBendAngleThresholds[2]) {
                trunkScore++; // +1 for greater than 60 degrees
            }
        }
    }
    
    // Check for twisting of more than twistThreshold from straight ahead
    const twistRightAngle = angleBetween(chestForward, data.orientations.hips.right); // Angle from full twist right
    const twistLeftAngle = 180 - twistRightAngle;
    const twist = (twistRightAngle < (90 - REBA_CONFIG.trunkTwistAngleThresholds[0]) || twistLeftAngle < (90 - REBA_CONFIG.trunkTwistAngleThresholds[0]));

    // +1 for twisting or side-bending
    if (sideBend || twist) {
        trunkScore++; 
    }

    // console.log(`Trunk: upMisalignmentAngle=${upMisalignmentAngle.toFixed(0)}deg;  twistRightAngle=${twistRightAngle.toFixed(0)}deg; sideBend=${sideBend}; twist=${twist}; trunkScore=${trunkScore}`);
    
    trunkScore = clamp(trunkScore, 1, REBA_CONFIG.trunkScoreLevels[2] - 1);

    if (trunkScore < REBA_CONFIG.trunkScoreLevels[0]) {
        trunkColor = MotionStudyColors.green;
    } else if (trunkScore < REBA_CONFIG.trunkScoreLevels[1]) {
        trunkColor = MotionStudyColors.yellow;
    } else {
        trunkColor = MotionStudyColors.red;
    }
    
    [JOINTS.CHEST,
        JOINTS.NAVEL,
        JOINTS.PELVIS,
    ].forEach(joint => {
        data.jointScores[joint] = trunkScore;
        data.jointColors[joint] = trunkColor;
    });
    
    [JOINT_CONNECTIONS.neckChest,
        JOINT_CONNECTIONS.chestNavel,
        JOINT_CONNECTIONS.navelPelvis,
        JOINT_CONNECTIONS.shoulderSpan,
        JOINT_CONNECTIONS.chestRight,
        JOINT_CONNECTIONS.chestLeft,
        JOINT_CONNECTIONS.hipSpan,
    ].forEach(bone => {
        data.boneScores[getBoneName(bone)] = trunkScore;
        data.boneColors[getBoneName(bone)] = trunkColor;
    });
}

/**
 * Sets the score and color for the arms reba.
 * Starting with score=1
 * +1 for knee bending > 30 degrees
 * +1 for knee bending > 60 degrees
 * +1 if one leg is raised above other (+1 applied to both legs)
 * @param {ErgonomicsData} data The data to calculate the score and color for.
 */
function legsReba(data) {
    let leftLegScore = 1;
    let leftLegColor = MotionStudyColors.undefined;
    let rightLegScore = 1;
    let rightLegColor = MotionStudyColors.undefined;

    // Check for unilateral bearing of the body weight
    let _onelegged = false;
    // check if all needed joints have a valid position
    if (data.jointValidities[JOINTS.LEFT_ANKLE] &&
        data.jointValidities[JOINTS.RIGHT_ANKLE]) {
        const footHeightDifference = Math.abs(data.joints[JOINTS.RIGHT_ANKLE].y - data.joints[JOINTS.LEFT_ANKLE].y);
        // Height difference for leg raise is not specified in REBA standard
        if (footHeightDifference > REBA_CONFIG.footHeightDifferenceThresholds[0]) {
            leftLegScore++;  // this raises score of both legs, so max() works correctly in neckLegTrunkScore()
            rightLegScore++;
            _onelegged = true;
        }
        //console.log(`Legs: footHeightDifference: ${footHeightDifference.toFixed(0)}mm; onelegged=${_onelegged}`);        
    }

    /* left leg */
    // check if all needed joints have a valid position
    if (data.jointValidities[JOINTS.LEFT_KNEE] &&
        data.jointValidities[JOINTS.LEFT_ANKLE] &&
        data.jointValidities[JOINTS.LEFT_HIP]) {
    
        // calculate knee angle
        const leftKneeUp = data.joints[JOINTS.LEFT_HIP].clone().sub(data.joints[JOINTS.LEFT_KNEE]);
        const leftFootUp = data.joints[JOINTS.LEFT_KNEE].clone().sub(data.joints[JOINTS.LEFT_ANKLE]);
        const leftKneeUpAngle = angleBetween(leftKneeUp, leftFootUp);
        
        // Check for knee bending
        if (leftKneeUpAngle > REBA_CONFIG.legBendAngleThresholds[0]) {
            leftLegScore++; // +1 for greater than 30 degrees
            if (leftKneeUpAngle > REBA_CONFIG.legBendAngleThresholds[1]) {
                leftLegScore++; // +1 for greater than 60 degrees
            }
        }
        
        //console.log(`Left leg: leftKneeUpAngle=${leftKneeUpAngle.toFixed(0)}; leftLegScore=${leftLegScore}`);        
        
        leftLegScore = clamp(leftLegScore, 1, REBA_CONFIG.trunkScoreLevels[2] - 1);
        if (leftLegScore < REBA_CONFIG.legScoreLevels[0]) {
            leftLegColor = MotionStudyColors.green;
        } else if (leftLegScore < REBA_CONFIG.legScoreLevels[1]) {
            leftLegColor = MotionStudyColors.yellow;
        } else {
            leftLegColor = MotionStudyColors.red;
        }
    }

    /* right leg */
    if (data.jointValidities[JOINTS.RIGHT_KNEE] &&
        data.jointValidities[JOINTS.RIGHT_ANKLE] &&
        data.jointValidities[JOINTS.RIGHT_HIP]) {

        const rightKneeUp = data.joints[JOINTS.RIGHT_HIP].clone().sub(data.joints[JOINTS.RIGHT_KNEE]);
        const rightFootUp = data.joints[JOINTS.RIGHT_KNEE].clone().sub(data.joints[JOINTS.RIGHT_ANKLE]);
        const rightKneeUpAngle = angleBetween(rightKneeUp, rightFootUp);

        if (rightKneeUpAngle > REBA_CONFIG.legBendAngleThresholds[0]) {
            rightLegScore++; // +1 for greater than 30 degrees
            if (rightKneeUpAngle > REBA_CONFIG.legBendAngleThresholds[1]) {
                rightLegScore++; // +1 for greater than 60 degrees
            }
        }

        //console.log(`Right leg: rightKneeUpAngle=${rightKneeUpAngle.toFixed(0)}; rightLegScore=${rightLegScore}`);   

        rightLegScore = clamp(rightLegScore, 1, REBA_CONFIG.legScoreLevels[2] - 1);
        if (rightLegScore < REBA_CONFIG.legScoreLevels[0]) {
            rightLegColor = MotionStudyColors.green;
        } else if (rightLegScore < REBA_CONFIG.legScoreLevels[1]) {
            rightLegColor = MotionStudyColors.yellow;
        } else {
            rightLegColor = MotionStudyColors.red;
        }
    }
    
    [JOINTS.LEFT_HIP,
        JOINTS.LEFT_KNEE,
        JOINTS.LEFT_ANKLE,
    ].forEach(joint => {
        data.jointScores[joint] = leftLegScore;
        data.jointColors[joint] = leftLegColor;
    });
    
    [JOINTS.RIGHT_HIP,
        JOINTS.RIGHT_KNEE,
        JOINTS.RIGHT_ANKLE,
    ].forEach(joint => {
        data.jointScores[joint] = rightLegScore;
        data.jointColors[joint] = rightLegColor;
    });
    
    [JOINT_CONNECTIONS.hipKneeLeft,
        JOINT_CONNECTIONS.kneeAnkleLeft,
    ].forEach(bone => {
        data.boneScores[getBoneName(bone)] = leftLegScore;
        data.boneColors[getBoneName(bone)] = leftLegColor;
    });
    
    [JOINT_CONNECTIONS.hipKneeRight,
        JOINT_CONNECTIONS.kneeAnkleRight,
    ].forEach(bone => {
        data.boneScores[getBoneName(bone)] = rightLegScore;
        data.boneColors[getBoneName(bone)] = rightLegColor;
    });
}

/**
 * Sets the score and color for the upper arms reba.
 * Starting with score=1
 * +1 for upper arm angle raised > 20 degrees
 * +1 for upper arm angle raised > 45 degrees
 * +1 for upper arm angle raised > 90 degrees
 * +1 if shoulder is raised
 * +1 if arm is abducted
 * -1 if arm is aligned with gravity and it is raised > 45 degrees from trunk
 * Cannot implement: -1 if arm is supported
 * @param {ErgonomicsData} data The data to calculate the score and color for.
 */
function upperArmReba(data) {
    let leftArmScore = 1;
    let leftArmColor = MotionStudyColors.undefined;
    let rightArmScore = 1;
    let rightArmColor = MotionStudyColors.undefined;
    
    // Angles for upper arm should be measured relative to trunk direction
    const chestDown = data.orientations.chest.up.clone().negate();
    const down = new THREE.Vector3(0, -1, 0);
    
    /* left uppper arm */
    // check if all needed joints have a valid position
    if (data.jointValidities[JOINTS.LEFT_ELBOW] && data.jointValidities[JOINTS.LEFT_SHOULDER]) {
        // calculate arm angles
        const leftUpperArmDown = data.joints[JOINTS.LEFT_ELBOW].clone().sub(data.joints[JOINTS.LEFT_SHOULDER]); 
        const leftArmAngle = angleBetween(leftUpperArmDown, chestDown);
        const leftShoulderAngle = angleBetween(data.joints[JOINTS.LEFT_SHOULDER].clone().sub(data.joints[JOINTS.NECK]), data.orientations.chest.up);
        const leftArmGravityAngle = angleBetween(leftUpperArmDown, down);
        // all vectors are normalised, so dot() == cos(angle between vectors) 
        const flexionAlignment = leftUpperArmDown.clone().dot(data.orientations.chest.forward);
        const extensionAlignment = leftUpperArmDown.clone().dot(data.orientations.chest.forward.clone().negate());
        const rightAbductionAlignment = leftUpperArmDown.clone().dot(data.orientations.chest.right);
        const leftAbductionAlignment = leftUpperArmDown.clone().dot(data.orientations.chest.right.clone().negate());

        let abduction = false;
        let gravityAlign = false;
        if (leftArmAngle > REBA_CONFIG.upperArmFrontRaiseAngleThresholds[0]) {
            leftArmScore++; // +1 for greater than 20 degrees
            // check for abduction only when the arm angle is above the small threshold
            // true when above +-45 deg from chest forward or chest backward direction (when looking from above) 
            abduction = ((flexionAlignment < rightAbductionAlignment || flexionAlignment < leftAbductionAlignment) && 
                         (extensionAlignment < rightAbductionAlignment || extensionAlignment < leftAbductionAlignment));
            if (abduction) {
                leftArmScore++; // +1 for arm abducted
            }
            if (leftArmAngle > REBA_CONFIG.upperArmFrontRaiseAngleThresholds[1]) {
                leftArmScore++; // +1 for greater than 45 degrees
                // Check for gravity assistance
                // -1 for upper arm aligned with gravity (less than 20 degress from gravity vector)
                gravityAlign = (leftArmGravityAngle < REBA_CONFIG.upperArmGravityAngleThresholds[0]);
                if (gravityAlign) {
                    leftArmScore--; 
                } 
                if (leftArmAngle > REBA_CONFIG.upperArmFrontRaiseAngleThresholds[2]) {
                    leftArmScore++; // +1 for greater than 90 degrees
                }
            }
        }
        
        // Check for shoulder raising
        let _raise = false;
        if (leftShoulderAngle < REBA_CONFIG.shoulderRaiseAngleThresholds[0]) {
            leftArmScore++; // +1 for shoulder raised (less than 80 degress from chest up)
            _raise = true;
        }

        //console.log(`Left upper arm: leftArmAngle=${leftArmAngle.toFixed(0)}; leftShoulderAngle: ${leftShoulderAngle.toFixed(0)}; raise=${_raise}; abduction=${abduction}; gravityAlign=${gravityAlign}; leftArmScore=${leftArmScore}`);

        leftArmScore = clamp(leftArmScore, 1, REBA_CONFIG.upperArmScoreLevels[2] - 1);
        if (leftArmScore < REBA_CONFIG.upperArmScoreLevels[0]) {
            leftArmColor = MotionStudyColors.green;
        } else if (leftArmScore < REBA_CONFIG.upperArmScoreLevels[1]) {
            leftArmColor = MotionStudyColors.yellow;
        } else {
            leftArmColor = MotionStudyColors.red;
        }
    }

    /* right uppper arm */
    if (data.jointValidities[JOINTS.RIGHT_ELBOW] && data.jointValidities[JOINTS.RIGHT_SHOULDER]) {
        const rightUpperArmDown = data.joints[JOINTS.RIGHT_ELBOW].clone().sub(data.joints[JOINTS.RIGHT_SHOULDER]);
        const rightArmAngle = angleBetween(rightUpperArmDown, chestDown);
        const rightShoulderAngle = angleBetween(data.joints[JOINTS.RIGHT_SHOULDER].clone().sub(data.joints[JOINTS.NECK]), data.orientations.chest.up);
        const rightArmGravityAngle = angleBetween(rightUpperArmDown, down);
        // all vectors are normalised, so dot() == cos(angle between vectors) 
        const flexionAlignment = rightUpperArmDown.clone().dot(data.orientations.chest.forward);
        const extensionAlignment = rightUpperArmDown.clone().dot(data.orientations.chest.forward.clone().negate());
        const rightAbductionAlignment = rightUpperArmDown.clone().dot(data.orientations.chest.right);
        const leftAbductionAlignment = rightUpperArmDown.clone().dot(data.orientations.chest.right.clone().negate());

        let abduction = false;
        let gravityAlign = false;
        if (rightArmAngle > REBA_CONFIG.upperArmFrontRaiseAngleThresholds[0]) {
            rightArmScore++; // +1 for greater than 20 degrees
            // check for abduction only when the arm angle is above the small threshold
            // true when above +-45 deg from chest forward or chest backward direction (when looking from above) 
            abduction = ((flexionAlignment < rightAbductionAlignment || flexionAlignment < leftAbductionAlignment) && 
                         (extensionAlignment < rightAbductionAlignment || extensionAlignment < leftAbductionAlignment));
            if (abduction) {
                rightArmScore++; // +1 for arm abducted
            }
            if (rightArmAngle > REBA_CONFIG.upperArmFrontRaiseAngleThresholds[1]) {
                rightArmScore++; // +1 for greater than 45 degrees
                // Check for gravity assistance
                // -1 for upper arm aligned with gravity (less than 20 degress from gravity vector)
                gravityAlign = (rightArmGravityAngle < REBA_CONFIG.upperArmGravityAngleThresholds[0]);
                if (gravityAlign) {
                    rightArmScore--; 
                } 
                if (rightArmAngle > REBA_CONFIG.upperArmFrontRaiseAngleThresholds[2]) {
                    rightArmScore++; // +1 for greater than 90 degrees
                }
            }
        }

        let _raise = false;
        if (rightShoulderAngle < REBA_CONFIG.shoulderRaiseAngleThresholds[0]) {
            rightArmScore++; // +1 for shoulder raised (less than 80 degress from chest up)
            _raise = true;
        }

        //console.log(`Right upper arm: rightArmAngle=${rightArmAngle.toFixed(0)}; rightShoulderAngle: ${rightShoulderAngle.toFixed(0)}; raise=${_raise}; abduction=${abduction}; gravityAlign=${gravityAlign}; rightArmScore=${rightArmScore}`);
        
        rightArmScore = clamp(rightArmScore, 1, REBA_CONFIG.upperArmScoreLevels[2] - 1);
        if (rightArmScore < REBA_CONFIG.upperArmScoreLevels[0]) {
            rightArmColor = MotionStudyColors.green;
        } else if (rightArmScore < REBA_CONFIG.upperArmScoreLevels[1]) {
            rightArmColor = MotionStudyColors.yellow;
        } else {
            rightArmColor = MotionStudyColors.red;
        }
    }
    
    data.jointScores[JOINTS.LEFT_SHOULDER] = leftArmScore;
    data.jointColors[JOINTS.LEFT_SHOULDER] = leftArmColor;
    data.jointScores[JOINTS.RIGHT_SHOULDER] = rightArmScore;
    data.jointColors[JOINTS.RIGHT_SHOULDER] = rightArmColor;
    
    data.boneScores[getBoneName(JOINT_CONNECTIONS.shoulderElbowLeft)] = leftArmScore;
    data.boneColors[getBoneName(JOINT_CONNECTIONS.shoulderElbowLeft)] = leftArmColor;
    data.boneScores[getBoneName(JOINT_CONNECTIONS.shoulderElbowRight)] = rightArmScore;
    data.boneColors[getBoneName(JOINT_CONNECTIONS.shoulderElbowRight)] = rightArmColor;
}

/**
 * Sets the score and color for the lower arms reba.
 * Starting with score=1
 * +1 for elbow bent < 60 or > 100 degrees
 * @param {ErgonomicsData} data The data to calculate the score and color for.
 */
function lowerArmReba(data) {
    let leftArmScore = 1;
    let leftArmColor = MotionStudyColors.undefined;
    let rightArmScore = 1;
    let rightArmColor = MotionStudyColors.undefined;

    /* left lower arm */
    // check if all needed joints have a valid position
    if (data.jointValidities[JOINTS.LEFT_WRIST] && 
        data.jointValidities[JOINTS.LEFT_ELBOW] &&
        data.jointValidities[JOINTS.LEFT_SHOULDER]
        ) {

        // calculate elbow angle
        const leftForearmDown = data.joints[JOINTS.LEFT_WRIST].clone().sub(data.joints[JOINTS.LEFT_ELBOW]);
        const leftUpperArmDown = data.joints[JOINTS.LEFT_ELBOW].clone().sub(data.joints[JOINTS.LEFT_SHOULDER]);
        const leftElbowAngle = angleBetween(leftForearmDown, leftUpperArmDown);
    
        // Standard REBA calculation marks arms straight down as higher score (can be confusing for new users)
        if (leftElbowAngle < REBA_CONFIG.lowerArmBendAngleThresholds[0] || leftElbowAngle > REBA_CONFIG.lowerArmBendAngleThresholds[1]) {
            leftArmScore++; // +1 for left elbow bent < 60 or > 100 degrees
        }

        //console.log(`Left lower arm: leftElbowAngle=${leftElbowAngle.toFixed(0)}; leftArmScore=${leftArmScore}`);
    
        leftArmScore = clamp(leftArmScore, 1, REBA_CONFIG.lowerArmScoreLevels[1] - 1);
        if (leftArmScore < REBA_CONFIG.lowerArmScoreLevels[0]) {
            leftArmColor = MotionStudyColors.green;
        } else {
            leftArmColor = MotionStudyColors.yellow;
        }
    }
    
    /* right lower arm */
    // check if all needed joints have a valid position
    if (data.jointValidities[JOINTS.RIGHT_WRIST] && 
        data.jointValidities[JOINTS.RIGHT_ELBOW] &&
        data.jointValidities[JOINTS.RIGHT_SHOULDER]
        ) {

        const rightForearmDown = data.joints[JOINTS.RIGHT_WRIST].clone().sub(data.joints[JOINTS.RIGHT_ELBOW]);
        const rightUpperArmDown = data.joints[JOINTS.RIGHT_ELBOW].clone().sub(data.joints[JOINTS.RIGHT_SHOULDER]);
        const rightElbowAngle = angleBetween(rightForearmDown, rightUpperArmDown);

        // Standard REBA calculation marks arms straight down as higher score (can be confusing for new users)
        if (rightElbowAngle < REBA_CONFIG.lowerArmBendAngleThresholds[0] || rightElbowAngle > REBA_CONFIG.lowerArmBendAngleThresholds[1]) {
            rightArmScore++; // +1 for left elbow bent < 60 or > 100 degrees
        }

        //console.log(`Right lower arm: rightElbowAngle=${rightElbowAngle.toFixed(0)}; rightArmScore=${rightArmScore}`);

        rightArmScore = clamp(rightArmScore, 1, REBA_CONFIG.lowerArmScoreLevels[1] - 1);
        if (rightArmScore < REBA_CONFIG.lowerArmScoreLevels[0]) {
            rightArmColor = MotionStudyColors.green;
        } else {
            rightArmColor = MotionStudyColors.yellow;
        }
    }
    
    data.jointScores[JOINTS.LEFT_ELBOW] = leftArmScore;
    data.jointColors[JOINTS.LEFT_ELBOW] = leftArmColor;
    data.jointScores[JOINTS.RIGHT_ELBOW] = rightArmScore;
    data.jointColors[JOINTS.RIGHT_ELBOW] = rightArmColor;
    
    data.boneScores[getBoneName(JOINT_CONNECTIONS.elbowWristLeft)] = leftArmScore;
    data.boneColors[getBoneName(JOINT_CONNECTIONS.elbowWristLeft)] = leftArmColor;
    data.boneScores[getBoneName(JOINT_CONNECTIONS.elbowWristRight)] = rightArmScore;
    data.boneColors[getBoneName(JOINT_CONNECTIONS.elbowWristRight)] = rightArmColor;
}

/**
 * Sets the score and color for the wrist reba.
 * Starting with score=1
 * +1 for wrist flexion/extention > 15 degrees
 * +1 if bending from midline or twisting wrt elbow
 * @param {ErgonomicsData} data The data to calculate the score and color for.
 */
function wristReba(data) {
    let leftWristScore = 1;
    let leftWristColor = MotionStudyColors.undefined;
    let rightWristScore = 1;
    let rightWristColor = MotionStudyColors.undefined;


    /* left wrist */
    // checking if hand has a real pose (eg. it was detected or it is not just dummy hands for pose with JOINTS_V1 schema)
    //          if hand is a valid pose 
    const leftHandIsValid = (data.joints[JOINTS.LEFT_INDEX_FINGER_MCP].clone().sub(data.joints[JOINTS.LEFT_WRIST]).length() > 1e-6) &&
                            data.jointValidities[JOINTS.LEFT_MIDDLE_FINGER_MCP];

    // check if all needed joints have a valid position
    if ((TRACK_HANDS && leftHandIsValid) &&  
        data.jointValidities[JOINTS.LEFT_WRIST] &&
        data.jointValidities[JOINTS.LEFT_ELBOW]
        ) {
    
        // compute main direction vectors
        const leftHandDirection = data.joints[JOINTS.LEFT_MIDDLE_FINGER_MCP].clone().sub(data.joints[JOINTS.LEFT_WRIST]).normalize();
        const leftHandPinky2Index = data.joints[JOINTS.LEFT_INDEX_FINGER_MCP].clone().sub(data.joints[JOINTS.LEFT_PINKY_MCP]).normalize();
        const leftForearmDirection = data.joints[JOINTS.LEFT_WRIST].clone().sub(data.joints[JOINTS.LEFT_ELBOW]).normalize();
        const leftUpperarmDirection = data.joints[JOINTS.LEFT_SHOULDER].clone().sub(data.joints[JOINTS.LEFT_ELBOW]).normalize();

        // check if wrist position is outside +-15 deg, then +1
        const leftHandUp = new THREE.Vector3(); 
        leftHandUp.crossVectors(leftHandPinky2Index, leftHandDirection).normalize();   // note: swapped order compared to right hand
        const wristPositionAngle = angleBetween(leftHandUp, leftForearmDirection) - 90;
        if (Math.abs(wristPositionAngle) > REBA_CONFIG.wristFrontBendAngleThresholds[0]) {
            leftWristScore++;
        }

        // check if the hand is bent away from midline
        // the angle limit from midline is not specified in REBA definition (chosen by us)
        const wristBendAngle = 90 - angleBetween(leftHandPinky2Index, leftForearmDirection);
        const sideBend = (Math.abs(wristBendAngle) > REBA_CONFIG.wristSideBendAngleThresholds[0]);

        // check if the hand is twisted (palm up)
        // the twist angle limit is not specified in REBA definition (120 deg chosen by us to score when there is definitive twist)
        const leftElbowAxis = new THREE.Vector3(); // direction towards the body
        leftElbowAxis.crossVectors(leftForearmDirection, leftUpperarmDirection).normalize(); // note: swapped order compared to right hand
        const wristTwistAngle = angleBetween(leftElbowAxis, leftHandPinky2Index);
        const twist = (wristTwistAngle > REBA_CONFIG.wristTwistAngleThresholds[0]);

        // +1 for twisting or side-bending
        if (sideBend || twist) {
            leftWristScore++; 
        }

        //console.log(`Left wrist: wristPositionAngle=${wristPositionAngle.toFixed(0)};  wristBendAngle=${wristBendAngle.toFixed(0)}; wristTwistAngle=${wristTwistAngle.toFixed(0)} deg; sideBend=${sideBend}; twist=${twist}; leftWristScore=${leftWristScore}`);

        leftWristScore = clamp(leftWristScore, 1, REBA_CONFIG.wristScoreLevels[2] - 1);

        if (leftWristScore < REBA_CONFIG.wristScoreLevels[0]) {
            leftWristColor = MotionStudyColors.green;
        } else if (leftWristScore < REBA_CONFIG.wristScoreLevels[1]) {
            leftWristColor = MotionStudyColors.yellow;
        } else {
            leftWristColor = MotionStudyColors.red;
        }
    }
        

    /* right wrist */
    const rightHandIsValid = (data.joints[JOINTS.RIGHT_INDEX_FINGER_MCP].clone().sub(data.joints[JOINTS.RIGHT_WRIST]).length() > 1e-6) &&
                              data.jointValidities[JOINTS.RIGHT_MIDDLE_FINGER_MCP];

    if ((TRACK_HANDS && rightHandIsValid) &&  
        data.jointValidities[JOINTS.RIGHT_WRIST] &&
        data.jointValidities[JOINTS.RIGHT_ELBOW]
        ) {
        // compute main direction vectors
        const rightHandDirection = data.joints[JOINTS.RIGHT_MIDDLE_FINGER_MCP].clone().sub(data.joints[JOINTS.RIGHT_WRIST]).normalize();
        const rightHandPinky2Index = data.joints[JOINTS.RIGHT_INDEX_FINGER_MCP].clone().sub(data.joints[JOINTS.RIGHT_PINKY_MCP]).normalize();
        const rightForearmDirection = data.joints[JOINTS.RIGHT_WRIST].clone().sub(data.joints[JOINTS.RIGHT_ELBOW]).normalize();
        const rightUpperarmDirection = data.joints[JOINTS.RIGHT_SHOULDER].clone().sub(data.joints[JOINTS.RIGHT_ELBOW]).normalize();

        // check if wrist position is outside +-15 deg, then +1 
        const rightHandUp = new THREE.Vector3(); 
        rightHandUp.crossVectors(rightHandDirection, rightHandPinky2Index).normalize();
        const wristPositionAngle = angleBetween(rightHandUp, rightForearmDirection) - 90;
        if (Math.abs(wristPositionAngle) > REBA_CONFIG.wristFrontBendAngleThresholds[0]) {
            rightWristScore++;
        }

        // check if the hand is bent away from midline
        // the angle limit from midline is not specified in REBA definition (chosen by us)
        const wristBendAngle = 90 - angleBetween(rightHandPinky2Index, rightForearmDirection);
        const sideBend = (Math.abs(wristBendAngle) > REBA_CONFIG.wristSideBendAngleThresholds[0]);

        // check if the hand is twisted (palm up)
        // the twist angle limit is not specified in REBA definition (120 deg chosen by us to score when there is definitive twist)
        const rightElbowAxis = new THREE.Vector3(); // direction towards the body
        rightElbowAxis.crossVectors(rightUpperarmDirection, rightForearmDirection).normalize();
        const wristTwistAngle = angleBetween(rightElbowAxis, rightHandPinky2Index);
        const twist = (wristTwistAngle > REBA_CONFIG.wristTwistAngleThresholds[0]);
 
        // +1 for twisting or side-bending
        if (sideBend || twist) {
            rightWristScore++; 
        }

        //console.log(`Right wrist: wristPositionAngle=${wristPositionAngle.toFixed(0)}; wristBendAngle=${wristBendAngle.toFixed(0)}; wristTwistAngle=${wristTwistAngle.toFixed(0)} deg; sideBend=${sideBend}; twist=${twist}; rightWristScore=${rightWristScore}`);

        rightWristScore = clamp(rightWristScore, 1, REBA_CONFIG.wristScoreLevels[2] - 1);

        if (rightWristScore < REBA_CONFIG.wristScoreLevels[0]) {
            rightWristColor = MotionStudyColors.green;
        } else if (rightWristScore < REBA_CONFIG.wristScoreLevels[1]) {
            rightWristColor = MotionStudyColors.yellow;
        } else {
            rightWristColor = MotionStudyColors.red;
        }
    }

    /* set score and color to hand joints and bones */

    [JOINTS.LEFT_WRIST, JOINTS.LEFT_THUMB_CMC, JOINTS.LEFT_THUMB_MCP, JOINTS.LEFT_THUMB_IP, JOINTS.LEFT_THUMB_TIP,
        JOINTS.LEFT_INDEX_FINGER_MCP, JOINTS.LEFT_INDEX_FINGER_PIP, JOINTS.LEFT_INDEX_FINGER_DIP, JOINTS.LEFT_INDEX_FINGER_TIP,
        JOINTS.LEFT_MIDDLE_FINGER_MCP, JOINTS.LEFT_MIDDLE_FINGER_PIP, JOINTS.LEFT_MIDDLE_FINGER_DIP, JOINTS.LEFT_MIDDLE_FINGER_TIP,
        JOINTS.LEFT_RING_FINGER_MCP, JOINTS.LEFT_RING_FINGER_PIP, JOINTS.LEFT_RING_FINGER_DIP, JOINTS.LEFT_RING_FINGER_TIP,
        JOINTS.LEFT_PINKY_MCP, JOINTS.LEFT_PINKY_PIP, JOINTS.LEFT_PINKY_DIP, JOINTS.LEFT_PINKY_TIP
    ].forEach(joint => {
        data.jointScores[joint] = leftWristScore;
        data.jointColors[joint] = leftWristColor;
    });

    [JOINT_CONNECTIONS.thumb1Left, JOINT_CONNECTIONS.thumb2Left, JOINT_CONNECTIONS.thumb3Left, JOINT_CONNECTIONS.thumb4Left,
       JOINT_CONNECTIONS.index1Left, JOINT_CONNECTIONS.index2Left, JOINT_CONNECTIONS.index3Left, JOINT_CONNECTIONS.index4Left,
       JOINT_CONNECTIONS.middle2Left, JOINT_CONNECTIONS.middle3Left, JOINT_CONNECTIONS.middle4Left,
       JOINT_CONNECTIONS.ring2Left, JOINT_CONNECTIONS.ring3Left, JOINT_CONNECTIONS.ring4Left,
       JOINT_CONNECTIONS.pinky1Left, JOINT_CONNECTIONS.pinky2Left, JOINT_CONNECTIONS.pinky3Left, JOINT_CONNECTIONS.pinky4Left,
       JOINT_CONNECTIONS.handSpan1Left, JOINT_CONNECTIONS.handSpan2Left, JOINT_CONNECTIONS.handSpan3Left
    ].forEach(bone => {
        data.boneScores[getBoneName(bone)] = leftWristScore;
        data.boneColors[getBoneName(bone)] = leftWristColor;
    });

    [JOINTS.RIGHT_WRIST, JOINTS.RIGHT_THUMB_CMC, JOINTS.RIGHT_THUMB_MCP, JOINTS.RIGHT_THUMB_IP, JOINTS.RIGHT_THUMB_TIP,
        JOINTS.RIGHT_INDEX_FINGER_MCP, JOINTS.RIGHT_INDEX_FINGER_PIP, JOINTS.RIGHT_INDEX_FINGER_DIP, JOINTS.RIGHT_INDEX_FINGER_TIP,
        JOINTS.RIGHT_MIDDLE_FINGER_MCP, JOINTS.RIGHT_MIDDLE_FINGER_PIP, JOINTS.RIGHT_MIDDLE_FINGER_DIP, JOINTS.RIGHT_MIDDLE_FINGER_TIP,
        JOINTS.RIGHT_RING_FINGER_MCP, JOINTS.RIGHT_RING_FINGER_PIP, JOINTS.RIGHT_RING_FINGER_DIP, JOINTS.RIGHT_RING_FINGER_TIP,
        JOINTS.RIGHT_PINKY_MCP, JOINTS.RIGHT_PINKY_PIP, JOINTS.RIGHT_PINKY_DIP, JOINTS.RIGHT_PINKY_TIP
    ].forEach(joint => {
        data.jointScores[joint] = rightWristScore;
        data.jointColors[joint] = rightWristColor;
    });

    [JOINT_CONNECTIONS.thumb1Right, JOINT_CONNECTIONS.thumb2Right, JOINT_CONNECTIONS.thumb3Right, JOINT_CONNECTIONS.thumb4Right,
        JOINT_CONNECTIONS.index1Right, JOINT_CONNECTIONS.index2Right, JOINT_CONNECTIONS.index3Right, JOINT_CONNECTIONS.index4Right,
        JOINT_CONNECTIONS.middle2Right, JOINT_CONNECTIONS.middle3Right, JOINT_CONNECTIONS.middle4Right,
        JOINT_CONNECTIONS.ring2Right, JOINT_CONNECTIONS.ring3Right, JOINT_CONNECTIONS.ring4Right,
        JOINT_CONNECTIONS.pinky1Right, JOINT_CONNECTIONS.pinky2Right, JOINT_CONNECTIONS.pinky3Right, JOINT_CONNECTIONS.pinky4Right,
        JOINT_CONNECTIONS.handSpan1Right, JOINT_CONNECTIONS.handSpan2Right, JOINT_CONNECTIONS.handSpan3Right
    ].forEach(bone => {
        data.boneScores[getBoneName(bone)] = rightWristScore;
        data.boneColors[getBoneName(bone)] = rightWristColor;
    });
    
}

const startColor = MotionStudyColors.fade(MotionStudyColors.green);
const endColor = MotionStudyColors.fade(MotionStudyColors.red);

function getOverallRebaColor(rebaScore) {
    const lowCutoff = REBA_CONFIG.overallScoreLevels[0];
    const highCutoff = REBA_CONFIG.overallScoreLevels[1];
    // console.log(`Overall Reba Score: ${rebaScore}\nlowCutoff: ${lowCutoff}\nhighCutoff: ${highCutoff}`); // TODO: experiment with cutoffs
    const rebaFrac = (clamp(rebaScore, lowCutoff, highCutoff) - lowCutoff) / (highCutoff - lowCutoff);
    return startColor.clone().lerpHSL(endColor, rebaFrac);
}

function neckLegTrunkScore(data) {
    const neck = data.jointScores[JOINTS.NECK];
    const legs = Math.max(data.jointScores[JOINTS.LEFT_HIP], data.jointScores[JOINTS.RIGHT_HIP]);
    const trunk = data.jointScores[JOINTS.CHEST];

    let key = `${neck},${legs},${trunk}`;
    
    const scoreTable = {
        '1,1,1': 1,
        '1,1,2': 2,
        '1,1,3': 2,
        '1,1,4': 3,
        '1,1,5': 4,
        '1,2,1': 2,
        '1,2,2': 3,
        '1,2,3': 4,
        '1,2,4': 5,
        '1,2,5': 6,
        '1,3,1': 3,
        '1,3,2': 4,
        '1,3,3': 5,
        '1,3,4': 6,
        '1,3,5': 7,
        '1,4,1': 4,
        '1,4,2': 5,
        '1,4,3': 6,
        '1,4,4': 7,
        '1,4,5': 8,
        '2,1,1': 1,
        '2,1,2': 3,
        '2,1,3': 4,
        '2,1,4': 5,
        '2,1,5': 6,
        '2,2,1': 2,
        '2,2,2': 4,
        '2,2,3': 5,
        '2,2,4': 6,
        '2,2,5': 7,
        '2,3,1': 3,
        '2,3,2': 5,
        '2,3,3': 6,
        '2,3,4': 7,
        '2,3,5': 8,
        '2,4,1': 4,
        '2,4,2': 6,
        '2,4,3': 7,
        '2,4,4': 8,
        '2,4,5': 9,
        '3,1,1': 3,
        '3,1,2': 4,
        '3,1,3': 5,
        '3,1,4': 6,
        '3,1,5': 7,
        '3,2,1': 3,
        '3,2,2': 5,
        '3,2,3': 6,
        '3,2,4': 7,
        '3,2,5': 8,
        '3,3,1': 5,
        '3,3,2': 6,
        '3,3,3': 7,
        '3,3,4': 8,
        '3,3,5': 9,
        '3,4,1': 6,
        '3,4,2': 7,
        '3,4,3': 8,
        '3,4,4': 9,
        '3,4,5': 9
    };
    return scoreTable[key];
}

function armAndWristScore(data) {
    const lowerArm = Math.max(data.jointScores[JOINTS.LEFT_ELBOW], data.jointScores[JOINTS.RIGHT_ELBOW]);
    const wrist = Math.max(data.jointScores[JOINTS.LEFT_WRIST], data.jointScores[JOINTS.RIGHT_WRIST]);
    const upperArm = Math.max(data.jointScores[JOINTS.LEFT_SHOULDER], data.jointScores[JOINTS.RIGHT_SHOULDER]);

    let key = `${lowerArm},${wrist},${upperArm}`;

    const scoreTable = {
        '1,1,1': 1,
        '1,1,2': 1,
        '1,1,3': 3,
        '1,1,4': 4,
        '1,1,5': 6,
        '1,1,6': 7,
        '1,2,1': 2,
        '1,2,2': 2,
        '1,2,3': 4,
        '1,2,4': 5,
        '1,2,5': 7,
        '1,2,6': 8,
        '1,3,1': 2,
        '1,3,2': 3,
        '1,3,3': 5,
        '1,3,4': 5,
        '1,3,5': 8,
        '1,3,6': 8,
        '2,1,1': 1,
        '2,1,2': 2,
        '2,1,3': 4,
        '2,1,4': 5,
        '2,1,5': 7,
        '2,1,6': 8,
        '2,2,1': 2,
        '2,2,2': 3,
        '2,2,3': 5,
        '2,2,4': 6,
        '2,2,5': 8,
        '2,2,6': 9,
        '2,3,1': 3,
        '2,3,2': 4,
        '2,3,3': 5,
        '2,3,4': 7,
        '2,3,5': 8,
        '2,3,6': 9,
    }
    return scoreTable[key];
}

function overallRebaCalculation(data) {
    const forceScore = 0; // We cannot calculate this at the moment, ranges from 0 - 3
    let scoreA = neckLegTrunkScore(data) + forceScore;
    
    const couplingScore = 0; // We cannot calculate this at the moment, ranges from 0 - 3
    let scoreB = armAndWristScore(data) + couplingScore;
    
    // Effective output range is 1 - 11, since scoreA and scoreB are 1 - 9
    const scoreTable = [
        [1, 1, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7],
        [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8],
        [2, 3, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8],
        [3, 4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9],
        [4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9],
        [6, 6, 6, 7, 8, 8, 9, 9, 10, 10, 10, 10],
        [7, 7, 7, 8, 9, 9, 9, 10, 10, 11, 11, 11],
        [8, 8, 8, 9, 10, 10, 10, 10, 10, 11, 11, 11],
        [9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12],
        [10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12],
        [11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12],
        [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]
    ];

    return scoreTable[scoreA - 1][scoreB - 1];
}

/**
 * Calculates REBA scores for individual body parts and for the whole pose. Derives colors for those scores.
 * @param {ErgonomicsData} data The base ergonomics data which are used in calculations and the results are stored in this object.
 */
function calculateReba(data) {
    // call all helper functions to annotate the individual scores of each bone
    neckReba(data);
    trunkReba(data);
    legsReba(data);
    upperArmReba(data);
    lowerArmReba(data);
    wristReba(data);

    data.overallScore = overallRebaCalculation(data);
    data.overallColor = getOverallRebaColor(data.overallScore);
}

/**
 * Calculates the Reba score for a given pose
 * @param {Pose} pose The pose to calculate the score for
 * @return {ErgonomicsData} The ergonomicsData object
 */
function calculateForPose(pose) {
    let ergonomicsData = new ErgonomicsData(pose);
    ergonomicsData.calculate();
    calculateReba(ergonomicsData);
    return ergonomicsData;
}

export {
    calculateForPose
};
