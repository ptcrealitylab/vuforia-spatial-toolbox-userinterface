/**
 * Classes that can be followed (e.g. CameraVis, VideoPlayer, Analytics) can
 * adhere to this interface by subclassing it and overriding the methods
 */
export class Followable {
    constructor(id, displayName, parentNode) {
        this.id = id;
        this.displayName = displayName;
        this.sceneNodeId = realityEditor.sceneGraph.addVisualElement(id, parentNode);
        this.sceneNode = realityEditor.sceneGraph.getSceneNodeById(this.sceneNodeId);
        this.frameKey = null; // assign a frameKey if you want it to be able to focus/blur the linked envelope
    }
    updateSceneNode() {
        // Important to implement: will be triggered in the camera update loop.
        // this is where you should update the position/rotation of the sceneNode
        // e.g. this.sceneNode.setLocalMatrix(this.mesh.matrix.elements)
    }
    enableFirstPersonMode() {
        // Optionally add any side effects that should happen when the viewer
        // zooms in as close as possible (e.g. for CameraVis, change shader mode)
    }
    disableFirstPersonMode() {
        // Optionally add any side effects that should happen when not fully
        // zoomed in. Note: triggers repeatedly.
    }
    onFollowDistanceUpdated(_distanceMm) {
        // Optionally respond to camera distance updates. (e.g. for VideoPlayer,
        // show/hide the camera mesh if distance > 3000 mm)
    }
    onCameraStartedFollowing() {
        // Optionally trigger an effect when the viewer begins to follow this
    }
    onCameraStoppedFollowing() {
        // Optionally trigger an effect the viewer stops following this
    }

}
