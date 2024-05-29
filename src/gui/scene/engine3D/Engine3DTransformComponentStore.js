import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import Vector3Node from "/objectDefaultFiles/scene/Vector3Node.js";
import Vector3Store from "/objectDefaultFiles/scene/Vector3Store.js";
import QuaternionNode from "/objectDefaultFiles/scene/QuaternionNode.js";
import QuaternionStore from "/objectDefaultFiles/scene/QuaternionStore.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/TransformComponentNode.js").default} TransformComponentNode
 */

class Engine3DTransformComponentStore extends ObjectStore {
    /** @type {Engine3DPositionNode} */
    #position;

    /** @type {Engine3DRotationNode} */
    #rotation;

    /** @type {Engine3DScaleNode} */
    #scale;

    /** @type {EntityInterface} */
    #entity;

    constructor(position, rotation, scale) {
        super();
        this.#position = new Vector3Node(new Vector3Store(position));
        this.#rotation = new QuaternionNode(new QuaternionStore(rotation));
        this.#scale = new Vector3Node(new Vector3Store(scale));
    }

    /**
     * 
     * @param {TransformComponentNode} _thisNode 
     * @returns {{postion: Vector3Node, rotation: QuaternionNode, scale: Vector3Node}}
     */
    getProperties(_thisNode) {
        return {
            "position": this.#position,
            "rotation": this.#rotation,
            "scale": this.#scale
        };
    }

    /**
     * 
     * @param {EntityNode} entityNode 
     */
    setEntityNode(entityNode) {
        this.#entity = entityNode.getEntity();
    }

    update() {
        if (this.#entity.getPosition() !== this.#position.getValue()) {
            this.#entity.setPosition(this.#position.getValue());
        }
        if (this.#entity.getRotation() !== this.#rotation.getValue()) {
            this.#entity.setRotation(this.#rotation.getValue());
        }
        if (this.#entity.getScale() !== this.#scale.getValue()) {
            this.#entity.setScale(this.#scale.getValue());
        }
    }

    getComponent() {
        return this;
    }
}

export default Engine3DTransformComponentStore;
