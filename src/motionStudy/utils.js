/* global mlMatrix */
const {Matrix, SingularValueDecomposition} = mlMatrix;
import {JOINTS} from '../humanPose/constants.js';

/**
 * Make a request to the world object (in charge of history logging) to
 * save its log just in case something bad happens
 */
export async function postPersistRequest() {
    const worldObject = realityEditor.worldObjects.getBestWorldObject();
    if (!worldObject) {
        console.warn('postPersistRequest unable to find worldObject');
        return;
    }
    const historyLogsUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/history/persist');
    try {
        const res = await fetch(historyLogsUrl, {
            method: 'POST',
        });

        const body = await res.json();
        console.log('postPersistRequest logName', body);
    } catch (e) {
        console.log('postPersistRequest failed', e);
    }
}

function getAxisMean(points) {
    let means = Matrix.zeros(points.rows, points.columns);
    for (let col = 0; col < points.columns; col++) {
        const mean = points.getColumnVector(col).mean();
        for (let row = 0; row < points.rows; row++) {
            means.set(row, col, mean);
        }
    }
    return means;
}

function poseToPoints(pose) {
    let points = [];

    for (const jointName in JOINTS) {
        let joint = pose.joints[jointName.toLowerCase()];
        points.push([
            joint.position.x,
            joint.position.y,
            joint.position.z,
        ]);
    }
    return points;
}

export function scorePose(predicted, target) {
    let predMat = new Matrix(poseToPoints(predicted));
    let targetMat = new Matrix(poseToPoints(target));

    return scorePoints(predMat, targetMat);
}

/**
 * @param {Matrix} predicted n * 3
 * @param {Matrix} target n * 3
 * @return {number} mean per joint position error after alignment
 */
function scorePoints(predicted, target) {

    const muX = getAxisMean(target);
    const muY = getAxisMean(predicted);

    let X0 = Matrix.sub(target, muX);
    let Y0 = Matrix.sub(predicted, muY);

    const normX = X0.norm();
    const normY = Y0.norm();

    X0 = Matrix.div(X0, normX);
    Y0 = Matrix.div(Y0, normY);

    const H = X0.transpose().mmul(Y0);

    const svdOptions = {
        computeLeftSingularVectors: true,
        computeRightSingularVectors: true,
        autoTranspose: true,
    };
    const svd = new SingularValueDecomposition(H, svdOptions);
    const {U, V} = svd;

    // TODO avoid reflections
    const R = V.mmul(U.transpose());
    let diagSum = svd.diagonalMatrix.sum();
    const a = diagSum * normX / normY;
    const t = Matrix.sub(muX, Matrix.mul(muY.mmul(R), a));

    const predictedAligned = Matrix.add(Matrix.mul(predicted.mmul(R), a), t);

    return Matrix.sub(predictedAligned, target).norm();
}
