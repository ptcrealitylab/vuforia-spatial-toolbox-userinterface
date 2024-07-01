/* global hull */
import {JOINTS} from '../humanPose/constants.js';

const representativeJoints = [
    JOINTS.HEAD,
    JOINTS.CHEST,
    JOINTS.LEFT_ANKLE,
    JOINTS.RIGHT_ANKLE,
    JOINTS.LEFT_SHOULDER,
    JOINTS.RIGHT_SHOULDER,
];

/**
 * Get the 2d (x, z) convex hull of the list of poses
 * @param {Array<Pose>} poses
 * @return {Array<{x: number, z: number}>}
 */
export function getConvexHullOfPoses(poses) {
    let points = poses.flatMap(pose => {
        const jointPoints = [];

        for (const jointName of representativeJoints) {
            const joint = pose.getJoint(jointName);
            // Project onto floor
            jointPoints.push([
                joint.position.x,
                joint.position.z,
            ]);
        }
        return jointPoints;
    });

    let rawHull = hull(points, 500);
    return rawHull.map(point => {
        return {
            x: point[0],
            y: point[1],
            z: 0,
        };
    });
}
