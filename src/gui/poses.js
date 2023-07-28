createNameSpace('realityEditor.gui.poses');

(function(exports) {

const DEBUG = false;

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
//exports.POSE_JOINTS = POSE_JOINTS;

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
//exports.POSE_JOINTS_DEPTH = POSE_JOINTS_DEPTH;

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
//exports.JOINT_CONNECTIONS = JOINT_CONNECTIONS;

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
//exports.JOINT_NEIGHBORS = JOINT_NEIGHBORS;

function isPose2DSkeletonRendered() {
    return DEBUG && !realityEditor.device.environment.requiresMouseEvents();
}

exports.isPose2DSkeletonRendered = isPose2DSkeletonRendered;

// let lastDraw = performance.now();

exports.drawPoses = function(poses, imageSize) {

    if (!isPose2DSkeletonRendered()) return; 

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
        canvas.style.pointerEvents = 'none';
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
    gfx.font = '16px sans-serif';
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

    // following naming is for landscape images (width is a longer side)
    // image resolution associated with 2D point positions
    const pointWidth = imageSize[0]; // 1920; // 960;
    const pointHeight = imageSize[1]; // 1080; // 540;
    let outWidth = 0, outHeight = 0;
    let halfCanvasWidth = 0, halfCanvasHeight = 0;
    const portrait = gfx.width < gfx.height;
    // iphones crop camera image along shorter side. Thus, longer side is taken to calulate scaling factor from camera image to display canvas (gfx.width/height) 
    if (!portrait) {
        outWidth = gfx.width;
        outHeight = (outWidth / pointWidth) * pointHeight;
        halfCanvasWidth = gfx.width / 2;
        halfCanvasHeight = gfx.height / 2;
    }
    else {
        outWidth = gfx.height;
        outHeight = (outWidth / pointWidth) * pointHeight;
        halfCanvasWidth = gfx.height / 2;
        halfCanvasHeight = gfx.width / 2;
    }
    
    if (globalStates.device.startsWith('iPad')) {
        outWidth = gfx.width;
        outHeight = gfx.height;
        halfCanvasWidth = gfx.width / 2;
        halfCanvasHeight = gfx.height / 2;
    }

    // gfx.fillText(`${format(coords[0].x)} ${format(coords[0].y)} ${format(coords[0].z)} ${format(poses[0].rotX * 180 / Math.PI)} ${format(poses[0].rotY * 180 / Math.PI)}`, 16, 64);
    let debug = false;
    for (let point of poses) {
        gfx.beginPath();

        let x = (point.imgX - pointWidth / 2) * (outWidth / pointWidth) + halfCanvasWidth;
        let y = ((pointHeight - point.imgY) - pointHeight / 2) * (outHeight / pointHeight) + halfCanvasHeight;
        if (portrait)   {
            let tmp = x; x = y; y = tmp;
        }

        gfx.fillStyle = `hsl(180, 100%, ${point.score * 50.0}%`;
        //gfx.strokeStyle = '#00ffff';
        gfx.arc(x, y, jointSize, 0, 2 * Math.PI);
        gfx.fill();
        // gfx.fillText(`${Math.round(point.depth * 100) / 100}`, x + jointSize, y - jointSize);
        // gfx.fillText(`${Math.round(point.score * 100)}`, x + jointSize, y - jointSize);
        if (debug) {
            gfx.fillText(`${Math.round(point.imgX)} ${Math.round(point.imgY)}`, x + jointSize, y - jointSize);
            debug = false;
        }
    }

    gfx.fillStyle = '#00ffff';
    gfx.strokeStyle = '#00ffff';
    gfx.lineWidth = 4;

    gfx.beginPath();
    for (let conn of JOINT_CONNECTIONS) {
        let a = poses[conn[0]];
        let b = poses[conn[1]];

        let ax = (a.imgX - pointWidth / 2) * (outWidth / pointWidth) + halfCanvasWidth;
        let ay = ((pointHeight - a.imgY) - pointHeight / 2) * (outHeight / pointHeight) + halfCanvasHeight;
        let bx = (b.imgX - pointWidth / 2) * (outWidth / pointWidth) + halfCanvasWidth;
        let by = ((pointHeight - b.imgY) - pointHeight / 2) * (outHeight / pointHeight) + halfCanvasHeight;
        if (portrait)   {
            let tmp = ax; ax = ay; ay = tmp;
            tmp = bx; bx = by; by = tmp;
        }

        gfx.moveTo(ax, ay);
        gfx.lineTo(bx, by);
    }
    gfx.stroke();
};

}(realityEditor.gui.poses));
