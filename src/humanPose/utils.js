createNameSpace("realityEditor.humanPose.utils");

(function(exports) {
    const HUMAN_POSE_ID_PREFIX = '_HUMAN_';

    class Pose {
        constructor(name, joints) {
            this.name = name;
            this.joints = joints;
        }
    }

    exports.getPoseObjectName = function(pose) {
        return HUMAN_POSE_ID_PREFIX + pose.name;
    }

    // other modules in the project can use this to reliably check whether an object is a humanPose object
    exports.isHumanPoseObject = function(object) {
        return object.type === 'human' || object.objectId.indexOf(HUMAN_POSE_ID_PREFIX) === 0;
    }
    
    exports.getMockPoseStandingFarAway = function() {
        let joints = JSON.parse(
            "[{\"x\":-0.7552632972083383,\"y\":0.2644442929211472,\"z\":0.7913752977850149},{\"x\":-0.7845470806021233,\"y\":0.2421982759192687,\"z\":0.8088129628325323},{\"x\":-0.7702630884492285,\"y\":0.3001014048608925,\"z\":0.7688086082955945},{\"x\":-0.8222937248161452,\"y\":0.24623275325440866,\"z\":0.9550474860100973},{\"x\":-0.7833413553528865,\"y\":0.3678937178976209,\"z\":0.8505136192483953},{\"x\":-0.6329333926426419,\"y\":0.12993628611940003,\"z\":1.003037519866321},{\"x\":-0.5857144750949138,\"y\":0.4589454778216688,\"z\":0.8355459885338103},{\"x\":-0.3674280483465843,\"y\":-0.015621332976114535,\"z\":1.0097465238602046},{\"x\":-0.3089154169856956,\"y\":0.5132346709005703,\"z\":0.7849136963889392},{\"x\":-0.1927517400895856,\"y\":-0.17818293753755024,\"z\":0.9756865047079787},{\"x\":-0.16714735686176868,\"y\":0.5735810435150129,\"z\":0.6760789908531224},{\"x\":-0.1250018136428199,\"y\":-0.3687589763164842,\"z\":-0.9344674156160389},{\"x\":-0.12229286355074954,\"y\":-0.3292508923208693,\"z\":-0.8945665731201982},{\"x\":-0.10352244950174398,\"y\":-0.382806122564826,\"z\":-0.9740523344761574},{\"x\":-0.09227820167479968,\"y\":-0.34637551009676415,\"z\":-0.9339987027591811},{\"x\":-0.09457788170460725,\"y\":-0.3891481311166776,\"z\":-0.9955435991385165},{\"x\":-0.07832232108450882,\"y\":-0.35210246362115816,\"z\":-0.957316956868217}]"
        );
            return new Pose('device' + globalStates.tempUuid + '_pose1', joints);
    }

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

    // You can provide this to the server so that it knows the mapping of joint indices to joint names (since it may vary based on client's ML model)
    exports.JOINT_SCHEMA = {
        joints: POSE_JOINTS,
        jointIndices: Object.keys(POSE_JOINTS),
        jointConnections: JOINT_CONNECTIONS,
        jointNeighbors: JOINT_NEIGHBORS
    };

}(realityEditor.humanPose.utils));
