import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import Vector3Node from "/objectDefaultFiles/scene/Vector3Node.js";
import QuaternionNode from "/objectDefaultFiles/scene/QuaternionNode.js";
import Engine3DPositionStore from "./Engine3DPositionStore.js";
import Engine3DRotationStore from "./Engine3DRotationStore.js";
import Engine3DScaleStore from "./Engine3DScaleStore.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/TransformComponentNode.js").default} TransformComponentNode
 */

class Engine3DTransformComponentStore extends ObjectStore {
    /** @type {Engine3DPositionStore} */
    #position;

    /** @type {Engine3DRotationStore} */
    #rotation;

    /** @type {Engine3DScaleStore} */
    #scale;

    constructor() {
        super();
        this.#position = new Engine3DPositionStore();
        this.#rotation = new Engine3DRotationStore();
        this.#scale = new Engine3DScaleStore();
    }

    /**
     * 
     * @param {TransformComponentNode} _thisNode 
     * @returns {{postion: Vector3Node, rotation: QuaternionNode, scale: Vector3Node}}
     */
    getProperties(_thisNode) {
        return {
            "position": new Vector3Node(this.#position),
            "rotation": new QuaternionNode(this.#rotation),
            "scale": new Vector3Node(this.#scale)
        };
    }

    /**
     * 
     * @param {EntityNode} entityNode 
     */
    setEntityNode(entityNode) {
        const entity = entityNode.getEntity();
        this.#position.setEntity(entity);
        this.#rotation.setEntity(entity);
        this.#scale.setEntity(entity);
    }
}

export default Engine3DTransformComponentStore;
