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

exports.drawPoses = function(poses) {
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
    gfx.strokeStyle = 'green';

    const jointSize = 16;
    const cx = 1920 / 2;
    const cy = 1080 / 2;

    for (let point of poses) {
        gfx.fillRect(
            (point.x - cx - jointSize / 2) / devicePixelRatio + gfx.width / 2,
            (point.y - cy - jointSize / 2) / devicePixelRatio + gfx.height / 2, jointSize, jointSize);
    }

    for (let conn of JOINT_CONNECTIONS) {
        let a = poses[conn[0]];
        let b = poses[conn[1]];
        gfx.beginPath();
        gfx.moveTo(
            (a.x - cx) / devicePixelRatio + gfx.width / 2,
            (a.y - cy) / devicePixelRatio + gfx.height / 2);
        gfx.lineTo(
            (b.x - cx) / devicePixelRatio + gfx.width / 2,
            (b.y - cy) / devicePixelRatio + gfx.height / 2);
        gfx.stroke();
    }
};

}(realityEditor.gui.poses));
