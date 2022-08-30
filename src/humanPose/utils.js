createNameSpace("realityEditor.humanPose.utils");

(function(exports) {
    const HUMAN_POSE_ID_PREFIX = '_HUMAN_';

    // other modules in the project can use this to reliably check whether an object is an avatar
    exports.isHumanPoseObject = function(object) {
        return object.type === 'human' || object.objectId.indexOf(HUMAN_POSE_ID_PREFIX) === 0;
    }

}(realityEditor.humanPose.utils));
