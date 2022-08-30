createNameSpace("realityEditor.humanPose.network");

(function(exports) {

    // Tell the server (corresponding to this world object) to create a new avatar object with the specified ID
    function addHumanPoseObject(worldId, objectName, onSuccess, onError) {
        let worldObject = realityEditor.getObject(worldId);
        if (!worldObject) {
            console.warn('Unable to add human pose object because no world with ID: ' + worldId);
            return;
        }

        let postUrl = realityEditor.network.getURL(worldObject.ip, realityEditor.network.getPort(worldObject), '/');
        let params = new URLSearchParams({action: 'new', name: objectName, isHuman: true, worldId: worldId});
        fetch(postUrl, {
            method: 'POST',
            body: params
        }).then(response => response.json())
            .then(data => {
                onSuccess(data);
            }).catch(err => {
            onError(err);
        });
    }

    exports.addHumanPoseObject = addHumanPoseObject;

}(realityEditor.humanPose.network));
