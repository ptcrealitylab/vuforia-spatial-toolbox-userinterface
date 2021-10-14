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
    gfx.fillStyle = 'green';
    gfx.font = '32px sans-serif';
    gfx.strokeStyle = 'green';

    // function format(n) {
    //     return Math.round(n * 100) / 100;
    // }
    // gfx.fillText(`${format(cameraPos.x)} ${format(cameraPos.y)} ${format(cameraPos.z)}`, 16, 32);

    // gfx.fillText(`${format(performance.now() - lastDraw)}`, 16, 96);
    // lastDraw = performance.now();

    const jointSize = 16;
    const pointWidth = 1920;
    const pointHeight = 1080;
    let outWidth = gfx.width; // pointWidth / 3.8; // gfx.height * pointWidth / pointHeight;
    let outHeight = gfx.width / pointWidth * pointHeight; // pointHeight / 2.3; // gfx.height;
    const cx = pointWidth / 2;
    const cy = pointHeight / 2;

    // if (window.outScaleX) {
    //     outWidth *= window.outScaleX;
    // }
    // if (window.outScaleY) {
    //     outHeight *= window.outScaleY;
    // }

    if (poses.length === 0) {
        return;
    }

    // gfx.fillText(`${format(coords[0].x)} ${format(coords[0].y)} ${format(coords[0].z)} ${format(poses[0].rotX * 180 / Math.PI)} ${format(poses[0].rotY * 180 / Math.PI)}`, 16, 64);
    for (let point of poses) {
        const x = (point.x - cx) / pointWidth * outWidth + gfx.width / 2 - jointSize / 2;
        const y = (point.y - cy) / pointHeight * outHeight + gfx.height / 2 - jointSize / 2;
        gfx.fillRect(x, y, jointSize, jointSize);
        // gfx.fillText(`${Math.round(point.depth * 100) / 100}`, x + jointSize, y - jointSize);
    }

    for (let conn of JOINT_CONNECTIONS) {
        let a = poses[conn[0]];
        let b = poses[conn[1]];
        const ax = (a.x - cx) / pointWidth * outWidth + gfx.width / 2;
        const ay = (a.y - cy) / pointHeight * outHeight + gfx.height / 2;
        const bx = (b.x - cx) / pointWidth * outWidth + gfx.width / 2;
        const by = (b.y - cy) / pointHeight * outHeight + gfx.height / 2;
        gfx.beginPath();
        gfx.moveTo(ax, ay);
        gfx.lineTo(bx, by);
        gfx.stroke();
    }
};

}(realityEditor.gui.poses));
