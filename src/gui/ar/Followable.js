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
    enableFirstPersonMode() {
        // console.log(`override enableFirstPersonMode for ${this.id} in subclass`);
    }
    disableFirstPersonMode() {
        // console.log(`override disableFirstPersonMode for ${this.id} in subclass`);
    }
    onFollowDistanceUpdated() {
        // console.log(`override onFollowDistanceUpdated for ${this.id} in subclass`);
    }
    onCameraStartedFollowing() {
        // console.log(`override onCameraStartedFollowing for ${this.id} in subclass`);
    }
    onCameraStoppedFollowing() {
        // console.log(`override onCameraStoppedFollowing for ${this.id} in subclass`);
    }
    updateSceneNode() {
        // console.log(`override updateSceneNode for ${this.id} in subclass`);
    }
}
