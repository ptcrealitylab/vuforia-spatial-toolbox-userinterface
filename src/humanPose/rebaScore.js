import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINT_CONNECTIONS, JOINTS, getBoneName, TRACK_HANDS} from './constants.js';
import {AnalyticsColors} from "./AnalyticsColors.js";

// https://www.physio-pedia.com/Rapid_Entire_Body_Assessment_(REBA)
// https://ergo-plus.com/reba-assessment-tool-guide/
// ^ Sample REBA scoring tables

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
 * @return {number} The angle between the two vectors in degrees.
 */
function angleBetween(vector1, vector2) {
    return vector1.angleTo(vector2) * 180 / Math.PI;
}

/**
 * Sets the score and color for the neck reba.
 * @param {RebaData} rebaData The rebaData to calculate the score and color for.
 */
function neckReba(rebaData) {
    let neckScore = 1;
    let neckColor = AnalyticsColors.undefined;

    const headUp = rebaData.orientations.head.up;
    const headForward = rebaData.orientations.head.forward;
    
    // +1 for side-bending (greater than 20 degrees), back-bending (any degrees), twisting, or greater than 20 degrees in general
    const upMisalignmentAngle = angleBetween(headUp, rebaData.orientations.chest.up);
    const forwardBendingAlignment = headUp.clone().dot(rebaData.orientations.chest.forward);
    const backwardBendingAlignment = headUp.clone().dot(rebaData.orientations.chest.forward.clone().negate());
    const rightBendingAlignment = headUp.clone().dot(rebaData.orientations.chest.right);
    const leftBendingAlignment = headUp.clone().dot(rebaData.orientations.chest.right.clone().negate());

    // Check for bending
    const bendingThreshold = 20 + 10; // 20 according to official REBA, adjusting due to noisy inputs
    if (upMisalignmentAngle > bendingThreshold) {
        neckScore++; // +1 for greater than threshold
        if (forwardBendingAlignment < rightBendingAlignment || forwardBendingAlignment < leftBendingAlignment) {
            neckScore++; // +1 for side-bending or back-bending greater than threshold
        }
    } else {
        if (forwardBendingAlignment < backwardBendingAlignment) {
            neckScore++; // +1 for back-bending any amount
        }
    }
    
    const twistRightAngle = angleBetween(headForward, rebaData.orientations.chest.right); // Angle from full twist right
    const twistLeftAngle = 180 - twistRightAngle;
    
    // Check for twisting of >20 degrees from straight ahead
    if (twistRightAngle < (90 - bendingThreshold) || twistLeftAngle < (90 - bendingThreshold)) {
        neckScore++; // +1 for twisting
    }
    
    neckScore = clamp(neckScore, 1, 3);

    if (neckScore === 1 ) {
        neckColor = AnalyticsColors.green;
    } else if (neckScore === 2) {
        neckColor = AnalyticsColors.yellow;
    } else {
        neckColor = AnalyticsColors.red;
    }
    
    [JOINTS.NECK,
        JOINTS.HEAD,
        JOINTS.LEFT_EYE,
        JOINTS.RIGHT_EYE,
        JOINTS.LEFT_EAR,
        JOINTS.RIGHT_EAR,
        JOINTS.NOSE
    ].forEach(joint => {
        rebaData.scores[joint] = neckScore;
        rebaData.colors[joint] = neckColor;
    });

    [JOINT_CONNECTIONS.headNeck,
        JOINT_CONNECTIONS.face,
        JOINT_CONNECTIONS.earSpan,
        JOINT_CONNECTIONS.eyeSpan,
        JOINT_CONNECTIONS.eyeNoseLeft,
        JOINT_CONNECTIONS.eyeNoseRight
    ].forEach(bone => {
        rebaData.boneScores[getBoneName(bone)] = neckScore;
        rebaData.boneColors[getBoneName(bone)] = neckColor;
    });
    
}

/**
 * Sets the score and color for the trunk reba.
 * @param {RebaData} rebaData The rebaData to calculate the score and color for.
 */
function trunkReba(rebaData) {
    let trunkScore = 1;
    let trunkColor = AnalyticsColors.undefined;
    
    const chestUp = rebaData.orientations.chest.up;
    const chestForward = rebaData.orientations.chest.forward;
    
    // Comparisons should be relative to directions determined by hips
    
    // +1 for any bending > 5 degrees, twisting
    // Another +1 if bending is sideways
    // Another +1 for forward or backwards bending > 20 degrees
    // Another +1 for forward or backwards bending > 60 degrees
    const up = new THREE.Vector3(0, 1, 0);
    const upMisalignmentAngle = angleBetween(chestUp, up);
    const forwardBendingAlignment = chestUp.clone().dot(rebaData.orientations.hips.forward);
    const backwardBendingAlignment = chestUp.clone().dot(rebaData.orientations.hips.forward.clone().negate());
    const rightBendingAlignment = chestUp.clone().dot(rebaData.orientations.hips.right);
    const leftBendingAlignment = chestUp.clone().dot(rebaData.orientations.hips.right.clone().negate());
    
    // Check for bending
    if (upMisalignmentAngle > 5) {
        trunkScore++; // +1 for greater than 5 degrees
        if ((forwardBendingAlignment < rightBendingAlignment || forwardBendingAlignment < leftBendingAlignment) && (backwardBendingAlignment < rightBendingAlignment || backwardBendingAlignment < leftBendingAlignment)) {
            trunkScore++; // +1 for side-bending
        }
        if (upMisalignmentAngle > 20) {
            trunkScore++; // +1 for greater than 20 degrees
            if (upMisalignmentAngle > 60) {
                trunkScore++; // +1 for greater than 60 degrees
            }
        }
    }
    
    const twistRightAngle = angleBetween(chestForward, rebaData.orientations.hips.right); // Angle from full twist right
    const twistLeftAngle = 180 - twistRightAngle;
    
    // Check for twisting
    if (twistRightAngle < 70 || twistLeftAngle < 70) {
        trunkScore++; // +1 for twisting
    }
    
    trunkScore = clamp(trunkScore, 1, 5);

    if (trunkScore === 1 ) {
        trunkColor = AnalyticsColors.green;
    } else if (trunkScore <= 4) {
        trunkColor = AnalyticsColors.yellow;
    } else {
        trunkColor = AnalyticsColors.red;
    }
    
    [JOINTS.CHEST,
        JOINTS.NAVEL,
        JOINTS.PELVIS,
    ].forEach(joint => {
        rebaData.scores[joint] = trunkScore;
        rebaData.colors[joint] = trunkColor;
    });
    
    [JOINT_CONNECTIONS.neckChest,
        JOINT_CONNECTIONS.chestNavel,
        JOINT_CONNECTIONS.navelPelvis,
        JOINT_CONNECTIONS.shoulderSpan,
        JOINT_CONNECTIONS.chestRight,
        JOINT_CONNECTIONS.chestLeft,
        JOINT_CONNECTIONS.hipSpan,
    ].forEach(bone => {
        rebaData.boneScores[getBoneName(bone)] = trunkScore;
        rebaData.boneColors[getBoneName(bone)] = trunkColor;
    });
}

/**
 * Sets the score and color for the arms reba.
 * @param {RebaData} rebaData The rebaData to calculate the score and color for.
 */
function legsReba(rebaData) {
    let leftLegScore = 1;
    let leftLegColor = AnalyticsColors.undefined;
    let rightLegScore = 1;
    let rightLegColor = AnalyticsColors.undefined;
    
    // +1 for knee bending > 30 degrees
    // Another +1 for knee bending > 60 degrees
    // Another +1 if leg is raised
    const footYDifference = rebaData.joints[JOINTS.RIGHT_ANKLE].y - rebaData.joints[JOINTS.LEFT_ANKLE].y;
    const leftKneeUp = rebaData.joints[JOINTS.LEFT_HIP].clone().sub(rebaData.joints[JOINTS.LEFT_KNEE]);
    const rightKneeUp = rebaData.joints[JOINTS.RIGHT_HIP].clone().sub(rebaData.joints[JOINTS.RIGHT_KNEE]);
    const leftFootUp = rebaData.joints[JOINTS.LEFT_KNEE].clone().sub(rebaData.joints[JOINTS.LEFT_ANKLE]);
    const rightFootUp = rebaData.joints[JOINTS.RIGHT_KNEE].clone().sub(rebaData.joints[JOINTS.RIGHT_ANKLE]);
    const leftKneeUpAngle = angleBetween(leftKneeUp, leftFootUp);
    const rightKneeUpAngle = angleBetween(rightKneeUp, rightFootUp);
    
    // Check for knee bending
    if (leftKneeUpAngle > 30) {
        leftLegScore++; // +1 for greater than 30 degrees
        if (leftKneeUpAngle > 60) {
            leftLegScore++; // +1 for greater than 60 degrees
        }
    }
    if (rightKneeUpAngle > 30) {
        rightLegScore++; // +1 for greater than 30 degrees
        if (rightKneeUpAngle > 60) {
            rightLegScore++; // +1 for greater than 60 degrees
        }
    }
    
    // Check for leg raising
    const footDifferenceCutoff = 0.1;
    // console.log(`footYDifference: ${footYDifference}\nCurrent cutoff: ${footDifferenceCutoff}`);
    if (footYDifference > footDifferenceCutoff) {// TODO: measure this to find a good cutoff
        leftLegScore++; // +1 for left leg raised
    } else if (footYDifference < -1 * footDifferenceCutoff) {
        rightLegScore++; // +1 for right leg raised
    }
    
    leftLegScore = clamp(leftLegScore, 1, 4);
    rightLegScore = clamp(rightLegScore, 1, 4);

    if (leftLegScore === 1) {
        leftLegColor = AnalyticsColors.green;
    } else if (leftLegScore === 2) {
        leftLegColor = AnalyticsColors.yellow;
    } else {
        leftLegColor = AnalyticsColors.red;
    }

    if (rightLegScore === 1) {
        rightLegColor = AnalyticsColors.green;
    } else if (rightLegScore === 2) {
        rightLegColor = AnalyticsColors.yellow;
    } else {
        rightLegColor = AnalyticsColors.red;
    }
    
    [JOINTS.LEFT_HIP,
        JOINTS.LEFT_KNEE,
        JOINTS.LEFT_ANKLE,
    ].forEach(joint => {
        rebaData.scores[joint] = leftLegScore;
        rebaData.colors[joint] = leftLegColor;
    });
    
    [JOINTS.RIGHT_HIP,
        JOINTS.RIGHT_KNEE,
        JOINTS.RIGHT_ANKLE,
    ].forEach(joint => {
        rebaData.scores[joint] = rightLegScore;
        rebaData.colors[joint] = rightLegColor;
    });
    
    [JOINT_CONNECTIONS.hipKneeLeft,
        JOINT_CONNECTIONS.kneeAnkleLeft,
    ].forEach(bone => {
        rebaData.boneScores[getBoneName(bone)] = leftLegScore;
        rebaData.boneColors[getBoneName(bone)] = leftLegColor;
    });
    
    [JOINT_CONNECTIONS.hipKneeRight,
        JOINT_CONNECTIONS.kneeAnkleRight,
    ].forEach(bone => {
        rebaData.boneScores[getBoneName(bone)] = rightLegScore;
        rebaData.boneColors[getBoneName(bone)] = rightLegColor;
    });
}

/**
 * Sets the score and color for the upper arms reba.
 * @param {RebaData} rebaData The rebaData to calculate the score and color for.
 */
function upperArmReba(rebaData) {
    let leftArmScore = 1;
    let leftArmColor = AnalyticsColors.undefined;
    let rightArmScore = 1;
    let rightArmColor = AnalyticsColors.undefined;
    
    // Angles for upper arm should be measured relative to world up, arms naturally hang straight down regardless of posture
    
    // +1 for upper arm angle raised > 20 degrees
    // Another +1 for upper arm angle raised > 45 degrees
    // Another +1 for upper arm angle raised > 90 degrees
    // Another +1 if shoulder is raised
    // Another +1 if arm is abducted
    // Cannot implement: -1 if arm is supported or person is leaning
    const chestUp = rebaData.orientations.chest.up
    const leftShoulderYDifference = rebaData.joints[JOINTS.LEFT_SHOULDER].clone().sub(rebaData.joints[JOINTS.NECK]).dot(chestUp);
    const rightShoulderYDifference = rebaData.joints[JOINTS.RIGHT_SHOULDER].clone().sub(rebaData.joints[JOINTS.NECK]).dot(chestUp);
    const down = new THREE.Vector3(0, -1, 0);
    const leftShoulderDown = rebaData.joints[JOINTS.LEFT_ELBOW].clone().sub(rebaData.joints[JOINTS.LEFT_SHOULDER]);
    const rightShoulderDown = rebaData.joints[JOINTS.RIGHT_ELBOW].clone().sub(rebaData.joints[JOINTS.RIGHT_SHOULDER]);
    
    // Check for arm angle
    const leftArmAngle = angleBetween(leftShoulderDown, down);
    const rightArmAngle = angleBetween(rightShoulderDown, down);
    if (leftArmAngle > 20) {
        leftArmScore++; // +1 for greater than 20 degrees
        if (leftArmAngle > 45) {
            leftArmScore++; // +1 for greater than 45 degrees
            if (leftArmAngle > 90) {
                leftArmScore++; // +1 for greater than 90 degrees
            }
        }
    }
    if (rightArmAngle > 20) {
        rightArmScore++; // +1 for greater than 20 degrees
        if (rightArmAngle > 45) {
            rightArmScore++; // +1 for greater than 45 degrees
            if (rightArmAngle > 90) {
                rightArmScore++; // +1 for greater than 90 degrees
            }
        }
    }
    
    // Check for shoulder raising
    const shoulderDifferenceCutoff = 0.1;
    // console.log(`leftShoulderYDifference: ${leftShoulderYDifference}\nrightShoulderYDifference: ${rightShoulderYDifference}\nCurrent cutoff: ${shoulderDifferenceCutoff}`);
    if (leftShoulderYDifference > shoulderDifferenceCutoff) {// TODO: measure this to find a good cutoff
        leftArmScore++; // +1 for left shoulder raised
    }
    if (rightShoulderYDifference > shoulderDifferenceCutoff) {
        rightArmScore++; // +1 for right shoulder raised
    }
    
    // Check for arm abduction
    const chestLeft = rebaData.orientations.chest.right.clone().negate();
    const chestRight = rebaData.orientations.chest.right;
    const leftAlignmentAngle = angleBetween(leftShoulderDown, chestLeft);
    const rightAlignmentAngle = angleBetween(rightShoulderDown, chestRight);
    
    if (leftAlignmentAngle < 70) {
        leftArmScore++; // +1 for left arm abducted
    }
    if (rightAlignmentAngle < 70) {
        rightArmScore++; // +1 for right arm abducted
    }
    
    leftArmScore = clamp(leftArmScore, 1, 6);
    rightArmScore = clamp(rightArmScore, 1, 6);
    
    if (leftArmScore === 1) {
        leftArmColor = AnalyticsColors.green;
    } else if (leftArmScore < 5) {
        leftArmColor = AnalyticsColors.yellow;
    } else {
        leftArmColor = AnalyticsColors.red;
    }
    
    if (rightArmScore === 1) {
        rightArmColor = AnalyticsColors.green;
    } else if (rightArmScore < 5) {
        rightArmColor = AnalyticsColors.yellow;
    } else {
        rightArmColor = AnalyticsColors.red;
    }
    
    rebaData.scores[JOINTS.LEFT_SHOULDER] = leftArmScore;
    rebaData.colors[JOINTS.LEFT_SHOULDER] = leftArmColor;
    rebaData.scores[JOINTS.RIGHT_SHOULDER] = rightArmScore;
    rebaData.colors[JOINTS.RIGHT_SHOULDER] = rightArmColor;
    
    rebaData.boneScores[getBoneName(JOINT_CONNECTIONS.shoulderElbowLeft)] = leftArmScore;
    rebaData.boneColors[getBoneName(JOINT_CONNECTIONS.shoulderElbowLeft)] = leftArmColor;
    rebaData.boneScores[getBoneName(JOINT_CONNECTIONS.shoulderElbowRight)] = rightArmScore;
    rebaData.boneColors[getBoneName(JOINT_CONNECTIONS.shoulderElbowRight)] = rightArmColor;
}

/**
 * Sets the score and color for the lower arms reba.
 * @param {RebaData} rebaData The rebaData to calculate the score and color for.
 */
function lowerArmReba(rebaData) {
    let leftArmScore = 1;
    let leftArmColor = AnalyticsColors.undefined;
    let rightArmScore = 1;
    let rightArmColor = AnalyticsColors.undefined;
    
    // 1 by default, 2 for elbow bent < 60 degrees or > 100 degrees
    
    // Check for elbow angle
    const leftForearmDown = rebaData.joints[JOINTS.LEFT_WRIST].clone().sub(rebaData.joints[JOINTS.LEFT_ELBOW]);
    const rightForearmDown = rebaData.joints[JOINTS.RIGHT_WRIST].clone().sub(rebaData.joints[JOINTS.RIGHT_ELBOW]);
    const leftUpperArmDown = rebaData.joints[JOINTS.LEFT_ELBOW].clone().sub(rebaData.joints[JOINTS.LEFT_SHOULDER]);
    const rightUpperArmDown = rebaData.joints[JOINTS.RIGHT_ELBOW].clone().sub(rebaData.joints[JOINTS.RIGHT_SHOULDER]);
    const leftElbowAngle = angleBetween(leftForearmDown, leftUpperArmDown);
    const rightElbowAngle = angleBetween(rightForearmDown, rightUpperArmDown);
    
    // Standard REBA calculation marks arms straight down as bad, very confusing for users
    // if (leftElbowAngle < 60 || leftElbowAngle > 100) {
    //     leftArmScore = 2; // 2 for left elbow bent < 60 or > 100 degrees
    // }
    // if (rightElbowAngle < 60 || rightElbowAngle > 100) {
    //     rightArmScore = 2; // 2 for right elbow bent < 60 or > 100 degrees
    // }
    
    // This calculation is less accurate to REBA but more intuitive
    if (leftElbowAngle > 100) {
        leftArmScore = 2; // 2 for left elbow bent > 100 degrees
    }
    if (rightElbowAngle > 100) {
        rightArmScore = 2; // 2 for right elbow bent > 100 degrees
    }
    
    leftArmScore = clamp(leftArmScore, 1, 2);
    rightArmScore = clamp(rightArmScore, 1, 2);
    
    if (leftArmScore === 1) {
        leftArmColor = AnalyticsColors.green;
    } else {
        leftArmColor = AnalyticsColors.red;
    }
    
    if (rightArmScore === 1) {
        rightArmColor = AnalyticsColors.green;
    } else {
        rightArmColor = AnalyticsColors.red;
    }
    
    rebaData.scores[JOINTS.LEFT_ELBOW] = leftArmScore;
    rebaData.colors[JOINTS.LEFT_ELBOW] = leftArmColor;
    rebaData.scores[JOINTS.RIGHT_ELBOW] = rightArmScore;
    rebaData.colors[JOINTS.RIGHT_ELBOW] = rightArmColor;
    
    rebaData.boneScores[getBoneName(JOINT_CONNECTIONS.elbowWristLeft)] = leftArmScore;
    rebaData.boneColors[getBoneName(JOINT_CONNECTIONS.elbowWristLeft)] = leftArmColor;
    rebaData.boneScores[getBoneName(JOINT_CONNECTIONS.elbowWristRight)] = rightArmScore;
    rebaData.boneColors[getBoneName(JOINT_CONNECTIONS.elbowWristRight)] = rightArmColor;
}

/**
 * Sets the score and color for the wrist reba.
 * @param {RebaData} rebaData The rebaData to calculate the score and color for.
 */
function wristReba(rebaData) {
    let leftWristScore = 1;
    let leftWristColor = AnalyticsColors.green;
    let rightWristScore = 1;
    let rightWristColor = AnalyticsColors.green;

    if (!TRACK_HANDS) {
        rebaData.scores[JOINTS.LEFT_WRIST] = leftWristScore;
        rebaData.colors[JOINTS.LEFT_WRIST] = leftWristColor;
        rebaData.scores[JOINTS.RIGHT_WRIST] = rightWristScore;
        rebaData.colors[JOINTS.RIGHT_WRIST] = rightWristColor;
        return;
    }
    
    /* left wrist */
    // compute main direction vectors
    const leftPinky = rebaData.joints[JOINTS.LEFT_PINKY].clone().sub(rebaData.joints[JOINTS.LEFT_WRIST]).normalize();
    const leftIndex = rebaData.joints[JOINTS.LEFT_INDEX].clone().sub(rebaData.joints[JOINTS.LEFT_WRIST]).normalize();
    const leftHandDirection = leftPinky.clone().add(leftIndex).normalize();
    const leftHandPinky2Index = rebaData.joints[JOINTS.LEFT_INDEX].clone().sub(rebaData.joints[JOINTS.LEFT_PINKY]).normalize();
    const leftForearmDirection = rebaData.joints[JOINTS.LEFT_WRIST].clone().sub(rebaData.joints[JOINTS.LEFT_ELBOW]).normalize();
    //const leftUpperarmDirection = rebaData.joints[JOINTS.LEFT_SHOULDER].clone().sub(rebaData.joints[JOINTS.LEFT_ELBOW]).normalize();

    // check if wrist position is outside +-15 deg, then +1 
    let wristPositionAngle = angleBetween(leftHandDirection, leftForearmDirection);
    if (wristPositionAngle > 15) {
        leftWristScore += 1;
    }

    // check if the hand is bent away from midline, then +1
    // the angle limit from midline is not specified in REBA definition (chosen by us)
    let wristBendAngle = 90 - angleBetween(leftHandPinky2Index, leftForearmDirection);
    if (Math.abs(wristBendAngle) > 30) {
        leftWristScore += 1;
    }

    // check if the hand is twisted (palm up), then +1
    // disable for now because pose tracking does not capture hand twists
    /*
    const leftElbowAxis = new THREE.Vector3(); 
    leftElbowAxis.crossVectors(leftUpperarmDirection, leftForearmDirection).normalize();
    let wristTwistAngle = angleBetween(leftElbowAxis, leftHandPinky2Index);
    if (wristTwistAngle > 90) {
        leftWristScore += 1;
    }
    */

    leftWristScore = clamp(leftWristScore, 1, 3);

    //console.log(`Left wrist: wristPositionAngle=${wristPositionAngle.toFixed(0)};  wristBendAngle=${wristBendAngle.toFixed(0)}; wristTwistAngle=${wristTwistAngle.toFixed(0)} deg`);

    /* right wrist */
    // compute main direction vectors
    const rightPinky = rebaData.joints[JOINTS.RIGHT_PINKY].clone().sub(rebaData.joints[JOINTS.RIGHT_WRIST]).normalize();
    const rightIndex = rebaData.joints[JOINTS.RIGHT_INDEX].clone().sub(rebaData.joints[JOINTS.RIGHT_WRIST]).normalize();
    const rightHandDirection = rightPinky.clone().add(rightIndex).normalize();
    const rightHandPinky2Index = rebaData.joints[JOINTS.RIGHT_INDEX].clone().sub(rebaData.joints[JOINTS.RIGHT_PINKY]).normalize();
    const rightForearmDirection = rebaData.joints[JOINTS.RIGHT_WRIST].clone().sub(rebaData.joints[JOINTS.RIGHT_ELBOW]).normalize();
    //const rightUpperarmDirection = rebaData.joints[JOINTS.RIGHT_SHOULDER].clone().sub(rebaData.joints[JOINTS.RIGHT_ELBOW]).normalize();

    // check if wrist position is outside +-15 deg, then +1 
    wristPositionAngle = angleBetween(rightHandDirection, rightForearmDirection);
    if (wristPositionAngle > 15) {
        rightWristScore += 1;
    }

    // check if the hand is bent away from midline, then +1
    // the angle limit from midline is not specified in REBA definition (chosen by us)
    wristBendAngle = 90 - angleBetween(rightHandPinky2Index, rightForearmDirection);
    if (Math.abs(wristBendAngle) > 40) {
        rightWristScore += 1;
    }

    // check if the hand is twisted (palm up), then +1
    /*
    const rightElbowAxis = new THREE.Vector3(); 
    rightElbowAxis.crossVectors(rightUpperarmDirection, rightForearmDirection).normalize();
    wristTwistAngle = angleBetween(rightElbowAxis, rightHandPinky2Index);
    if (wristTwistAngle > 90) {
        rightWristScore += 1;
    }
    */

    rightWristScore = clamp(rightWristScore, 1, 3);

    //console.log(`Right wrist: wristPositionAngle=${wristPositionAngle.toFixed(0)}; wristBendAngle=${wristBendAngle.toFixed(0)}; wristTwistAngle=${wristTwistAngle.toFixed(0)} deg`);

    if (leftWristScore === 1) {
        leftWristColor = AnalyticsColors.green;
    } else if (leftWristScore == 2) {
        leftWristColor = AnalyticsColors.yellow;
    } else {
        leftWristColor = AnalyticsColors.red;
    }

    if (rightWristScore === 1) {
        rightWristColor = AnalyticsColors.green;
    } else if (rightWristScore == 2) {
        rightWristColor = AnalyticsColors.yellow;
    } else {
        rightWristColor = AnalyticsColors.red;
    }

    [JOINTS.LEFT_WRIST,
        JOINTS.LEFT_THUMB,
        JOINTS.LEFT_INDEX,
        JOINTS.LEFT_PINKY
    ].forEach(joint => {
        rebaData.scores[joint] = leftWristScore;
        rebaData.colors[joint] = leftWristColor;
    });

    [JOINT_CONNECTIONS.thumbLeft,
        JOINT_CONNECTIONS.pinkyLeft,
        JOINT_CONNECTIONS.indexLeft,
        JOINT_CONNECTIONS.fingerSpanLeft
    ].forEach(bone => {
        rebaData.boneScores[getBoneName(bone)] = leftWristScore;
        rebaData.boneColors[getBoneName(bone)] = leftWristColor;
    });

    [JOINTS.RIGHT_WRIST,
        JOINTS.RIGHT_THUMB,
        JOINTS.RIGHT_INDEX,
        JOINTS.RIGHT_PINKY
    ].forEach(joint => {
        rebaData.scores[joint] = rightWristScore;
        rebaData.colors[joint] = rightWristColor;
    });

    [JOINT_CONNECTIONS.thumbRight,
        JOINT_CONNECTIONS.pinkyRight,
        JOINT_CONNECTIONS.indexRight,
        JOINT_CONNECTIONS.fingerSpanRight
    ].forEach(bone => {
        rebaData.boneScores[getBoneName(bone)] = rightWristScore;
        rebaData.boneColors[getBoneName(bone)] = rightWristColor;
    });
    
}

const startColor = AnalyticsColors.fade(AnalyticsColors.green);
const endColor = AnalyticsColors.fade(AnalyticsColors.red);

function getOverallRebaColor(rebaScore) {
    const lowCutoff = 4;
    const highCutoff = 8;
    // console.log(`Overall Reba Score: ${rebaScore}\nlowCutoff: ${lowCutoff}\nhighCutoff: ${highCutoff}`); // TODO: experiment with cutoffs
    const rebaFrac = (clamp(rebaScore, lowCutoff, highCutoff) - lowCutoff) / (highCutoff - lowCutoff);
    return startColor.clone().lerpHSL(endColor, rebaFrac);
}

function calculateReba(rebaData) {
    // call all helper functions to annotate the individual scores of each bone
    neckReba(rebaData);
    trunkReba(rebaData);
    legsReba(rebaData);
    upperArmReba(rebaData);
    lowerArmReba(rebaData);
    wristReba(rebaData);

    rebaData.overallRebaScore = overallRebaCalculation(rebaData);
    rebaData.overallRebaColor = getOverallRebaColor(rebaData.overallRebaScore);
}

function neckLegTrunkScore(rebaData) {
    const neck = rebaData.scores[JOINTS.NECK];
    const legs = Math.max(rebaData.scores[JOINTS.LEFT_HIP], rebaData.scores[JOINTS.RIGHT_HIP]);
    const trunk = rebaData.scores[JOINTS.CHEST];

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

function armAndWristScore(rebaData) {
    const lowerArm = Math.max(rebaData.scores[JOINTS.LEFT_ELBOW], rebaData.scores[JOINTS.RIGHT_ELBOW]);
    const wrist = Math.max(rebaData.scores[JOINTS.LEFT_WRIST], rebaData.scores[JOINTS.RIGHT_WRIST]);
    const upperArm = Math.max(rebaData.scores[JOINTS.LEFT_SHOULDER], rebaData.scores[JOINTS.RIGHT_SHOULDER]);

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

function overallRebaCalculation(rebaData) {
    const forceScore = 0; // We cannot calculate this at the moment, ranges from 0 - 3
    let scoreA = neckLegTrunkScore(rebaData) + forceScore;
    
    const couplingScore = 0; // We cannot calculate this at the moment, ranges from 0 - 3
    let scoreB = armAndWristScore(rebaData) + couplingScore;
    
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
 * @typedef {Object} Orientation
 * @property {Vector3} forward The forward direction of the orientation
 * @property {Vector3} up The up direction of the orientation
 * @property {Vector3} right The right direction of the orientation
 */

/**
 * @typedef {Object} RebaData
 * @property {number} overallRebaScore The overall reba score of the pose
 * @property {Color} overallRebaColor The overall reba color of the pose
 * @property {Object.<string, Vector3>} joints The joints of the pose
 * @property {Object.<string, number>} scores The scores of the pose
 * @property {Object.<string, Color>} colors The colors of the pose
 * @property {Object.<string, number>} boneScores The bone scores of the pose
 * @property {Object.<string, Color>} boneColors The bone colors of the pose
 * @property {Object.<string, Orientation>} orientations The orientations of the pose
 */

/**
 * Generates a rebaData object from a pose
 * @param {Pose} pose The pose to extract the rebaData from
 * @return {RebaData} The rebaData object
 */
function extractRebaData(pose) {
    let rebaData = {
        overallRebaScore: 0,
        overallRebaColor: AnalyticsColors.undefined,
        joints: {},
        scores: {},
        colors: {},
        boneScores: {},
        boneColors: {},
        orientations: {
            head: {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            chest: {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            },
            hips: {
                forward: new THREE.Vector3(),
                up: new THREE.Vector3(),
                right: new THREE.Vector3()
            }
        }
    };
    for (let jointId of Object.values(JOINTS)) {
        rebaData.joints[jointId] = pose.getJoint(jointId).position;
        rebaData.scores[jointId] = 0;
        rebaData.colors[jointId] = AnalyticsColors.undefined;
    }
    for (let boneId of Object.keys(JOINT_CONNECTIONS)) {
        rebaData.boneScores[boneId] = 0;
        rebaData.boneColors[boneId] = AnalyticsColors.undefined;
    }
    
    rebaData.orientations.head.forward = rebaData.joints[JOINTS.NOSE].clone().sub(rebaData.joints[JOINTS.HEAD]).normalize();
    rebaData.orientations.head.up = rebaData.joints[JOINTS.HEAD].clone().sub(rebaData.joints[JOINTS.NECK]).normalize();
    rebaData.orientations.head.right = rebaData.orientations.head.forward.clone().cross(rebaData.orientations.head.up).normalize();
    
    rebaData.orientations.chest.up = rebaData.joints[JOINTS.NECK].clone().sub(rebaData.joints[JOINTS.CHEST]).normalize();
    rebaData.orientations.chest.right = rebaData.joints[JOINTS.RIGHT_SHOULDER].clone().sub(rebaData.joints[JOINTS.LEFT_SHOULDER]).normalize();
    rebaData.orientations.chest.forward = rebaData.orientations.chest.up.clone().cross(rebaData.orientations.chest.right).normalize();
    
    rebaData.orientations.hips.up = new THREE.Vector3(0, 1, 0); // Hips do not really have an up direction (i.e., even when sitting, the hips are always up)
    rebaData.orientations.hips.right = rebaData.joints[JOINTS.RIGHT_HIP].clone().sub(rebaData.joints[JOINTS.LEFT_HIP]).normalize();
    rebaData.orientations.hips.forward = rebaData.orientations.hips.up.clone().cross(rebaData.orientations.hips.right).normalize();

    return rebaData;
}

/**
 * Calculates the Reba score for a given pose
 * @param {Pose} pose The pose to calculate the score for
 * @return {RebaData} The rebaData object
 */
function calculateForPose(pose) {
    const rebaData = extractRebaData(pose);
    calculateReba(rebaData);
    return rebaData;
}

export {
    calculateForPose
};
