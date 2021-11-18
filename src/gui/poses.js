createNameSpace('realityEditor.gui.poses');

(function(exports) {

const POSE_JOINTS = {
  NOSE: "nose",
  LEFT_EYE: "left eye",
  RIGHT_EYE: "right eye",
  LEFT_EAR: "left ear",
  RIGHT_EAR: "right ear",
  LEFT_SHOULDER: "left shoulder",
  RIGHT_SHOULDER: "right shoulder",
  LEFT_ELBOW: "left elbow",
  RIGHT_ELBOW: "right elbow",
  LEFT_WRIST: "left wrist",
  RIGHT_WRIST: "right wrist",
  LEFT_HIP: "left hip",
  RIGHT_HIP: "right hip",
  LEFT_KNEE: "left knee",
  RIGHT_KNEE: "right knee",
  LEFT_ANKLE: "left ankle",
  RIGHT_ANKLE: "right ankle",
};
exports.POSE_JOINTS = POSE_JOINTS;

Object.keys(POSE_JOINTS).forEach((key, i) => {
  POSE_JOINTS[key] = i;
});

const POSE_JOINTS_DEPTH = {
  NOSE: 0,
  LEFT_EYE: 0,
  RIGHT_EYE: 0,
  LEFT_EAR: 0.1,
  RIGHT_EAR: 0.1,
  LEFT_SHOULDER: 0.1,
  RIGHT_SHOULDER: 0.1,
  LEFT_ELBOW: 0.04,
  RIGHT_ELBOW: 0.04,
  LEFT_WRIST: 0.04,
  RIGHT_WRIST: 0.04,
  LEFT_HIP: 0.1,
  RIGHT_HIP: 0.1,
  LEFT_KNEE: 0.06,
  RIGHT_KNEE: 0.06,
  LEFT_ANKLE: 0.04,
  RIGHT_ANKLE: 0.04,
};
exports.POSE_JOINTS_DEPTH = POSE_JOINTS_DEPTH;

const JOINT_CONNECTIONS = [
  [POSE_JOINTS.LEFT_WRIST, POSE_JOINTS.LEFT_ELBOW],
  [POSE_JOINTS.LEFT_ELBOW, POSE_JOINTS.LEFT_SHOULDER],
  [POSE_JOINTS.LEFT_SHOULDER, POSE_JOINTS.RIGHT_SHOULDER],
  [POSE_JOINTS.RIGHT_SHOULDER, POSE_JOINTS.RIGHT_ELBOW],
  [POSE_JOINTS.RIGHT_ELBOW, POSE_JOINTS.RIGHT_WRIST],
  [POSE_JOINTS.LEFT_SHOULDER, POSE_JOINTS.LEFT_HIP],
  [POSE_JOINTS.LEFT_HIP, POSE_JOINTS.RIGHT_HIP],
  [POSE_JOINTS.RIGHT_HIP, POSE_JOINTS.RIGHT_SHOULDER],
  [POSE_JOINTS.LEFT_HIP, POSE_JOINTS.LEFT_KNEE],
  [POSE_JOINTS.LEFT_KNEE, POSE_JOINTS.LEFT_ANKLE],
  [POSE_JOINTS.RIGHT_HIP, POSE_JOINTS.RIGHT_KNEE],
  [POSE_JOINTS.RIGHT_KNEE, POSE_JOINTS.RIGHT_ANKLE],
];
exports.JOINT_CONNECTIONS = JOINT_CONNECTIONS;

const JOINT_NEIGHBORS = {};

JOINT_NEIGHBORS[POSE_JOINTS.LEFT_HIP] = [POSE_JOINTS.LEFT_HIP, POSE_JOINTS.RIGHT_HIP, POSE_JOINTS.LEFT_SHOULDER, POSE_JOINTS.RIGHT_SHOULDER];

const headJoints = [POSE_JOINTS.NOSE, POSE_JOINTS.LEFT_EYE,
    POSE_JOINTS.RIGHT_EYE, POSE_JOINTS.LEFT_EAR, POSE_JOINTS.RIGHT_EAR,
    POSE_JOINTS.LEFT_SHOULDER, POSE_JOINTS.RIGHT_SHOULDER];

{
    let nose = POSE_JOINTS.NOSE;
    JOINT_NEIGHBORS[nose] = headJoints; // .filter(j => j !== nose);
}

JOINT_NEIGHBORS[POSE_JOINTS.LEFT_WRIST] = [POSE_JOINTS.LEFT_WRIST, POSE_JOINTS.LEFT_SHOULDER, POSE_JOINTS.LEFT_ELBOW];
JOINT_NEIGHBORS[POSE_JOINTS.RIGHT_WRIST] = [POSE_JOINTS.RIGHT_WRIST, POSE_JOINTS.RIGHT_SHOULDER, POSE_JOINTS.RIGHT_ELBOW];
JOINT_NEIGHBORS[POSE_JOINTS.LEFT_KNEE] = [POSE_JOINTS.LEFT_KNEE, POSE_JOINTS.LEFT_HIP, POSE_JOINTS.LEFT_ANKLE];
JOINT_NEIGHBORS[POSE_JOINTS.RIGHT_KNEE] = [POSE_JOINTS.RIGHT_KNEE, POSE_JOINTS.RIGHT_HIP, POSE_JOINTS.RIGHT_ANKLE];

// for (let jc of JOINT_CONNECTIONS) {
//     if (!JOINT_NEIGHBORS[jc[0]]) {
//         JOINT_NEIGHBORS[jc[0]] = [jc[0]];
//     }
//     // if (!JOINT_NEIGHBORS[jc[1]]) {
//     //     JOINT_NEIGHBORS[jc[1]] = [];
//     // }
//
//     JOINT_NEIGHBORS[jc[0]].push(jc[1]);
//     // JOINT_NEIGHBORS[jc[1]].push(jc[0]);
// }
exports.JOINT_NEIGHBORS = JOINT_NEIGHBORS;

// let lastDraw = performance.now();

exports.drawPoses = function(poses, _coords, _cameraPos) {
    let canvas = document.getElementById('supercooldebugcanvas');
    let gfx;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'supercooldebugcanvas';
        canvas.style.position = 'absolute';
        canvas.style.top = 0;
        canvas.style.left = 0;
        canvas.width = canvas.style.width = window.innerWidth;
        canvas.height = canvas.style.height = window.innerHeight;
        canvas.style.margin = 0;
        canvas.style.padding = 0;
        document.body.appendChild(canvas);
        gfx = canvas.getContext('2d');
        gfx.width = window.innerWidth;
        gfx.height = window.innerHeight;
    }

    if (!gfx) {
        gfx = canvas.getContext('2d');
    }
    gfx.clearRect(0, 0, gfx.width, gfx.height);
    gfx.fillStyle = '#00ffff';
    gfx.font = '32px sans-serif';
    gfx.strokeStyle = '#00ffff';
    gfx.lineWidth = 4;

    // function format(n) {
    //     return Math.round(n * 100) / 100;
    // }
    // gfx.fillText(`${format(cameraPos.x)} ${format(cameraPos.y)} ${format(cameraPos.z)}`, 16, 32);

    // gfx.fillText(`${format(performance.now() - lastDraw)}`, 16, 96);
    // lastDraw = performance.now();

    const jointSize = 8;

    // if (window.outScaleX) {
    //     outWidth *= window.outScaleX;
    // }
    // if (window.outScaleY) {
    //     outHeight *= window.outScaleY;
    // }

    if (poses.length === 0) {
        return;
    }

    const pointWidth = poses[0].width;
    let pointHeight = poses[0].height;
    if (globalStates.device.startsWith('iPad')) {
        pointHeight /= (1668 / 2388) * (1920 / 1080);
    }
    let outWidth = gfx.width; // pointWidth / 3.8; // gfx.height * pointWidth / pointHeight;
    let outHeight = gfx.width / pointWidth * pointHeight; // pointHeight / 2.3; // gfx.height;
    const cx = pointWidth / 2;
    const cy = pointHeight / 2;

    // gfx.fillText(`${format(coords[0].x)} ${format(coords[0].y)} ${format(coords[0].z)} ${format(poses[0].rotX * 180 / Math.PI)} ${format(poses[0].rotY * 180 / Math.PI)}`, 16, 64);
    for (let point of poses) {
        gfx.beginPath();
        const x = -(point.x - cx) / pointWidth * outWidth + gfx.width / 2;
        const y = -(point.y - cy) / pointHeight * outHeight + gfx.height / 2;
        gfx.arc(x, y, jointSize, 0, 2 * Math.PI);
        gfx.fill();
        // gfx.fillText(`${Math.round(point.depth * 100) / 100}`, x + jointSize, y - jointSize);
    }

    gfx.beginPath();
    for (let conn of JOINT_CONNECTIONS) {
        let a = poses[conn[0]];
        let b = poses[conn[1]];
        const ax = - (a.x - cx) / pointWidth * outWidth + gfx.width / 2;
        const ay = - (a.y - cy) / pointHeight * outHeight + gfx.height / 2;
        const bx = - (b.x - cx) / pointWidth * outWidth + gfx.width / 2;
        const by = - (b.y - cy) / pointHeight * outHeight + gfx.height / 2;
        gfx.moveTo(ax, ay);
        gfx.lineTo(bx, by);
    }
    gfx.stroke();
};

}(realityEditor.gui.poses));
