/* global hull */

/**
 * Get the 2d (x, z) convex hull of the list of poses
 * @param {Array<Pose>} poses
 * @return {Array<{x: number, z: number}>}
 */
export function getConvexHullOfPoses(poses) {
    let points = poses.flatMap(pose => {
        const jointPoints = [];
        for (const jointName in pose.joints) {
            const joint = pose.joints[jointName];
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
