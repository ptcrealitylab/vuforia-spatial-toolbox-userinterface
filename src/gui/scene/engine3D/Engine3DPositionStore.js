import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import ValueNode from "/objectDefaultFiles/scene/ValueNode.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/Vector3Node.js").default} Vector3Node
 * * @typedef {import("/objectDefaultFiles/scene/Vector3Node.js").Vector3Delta} Vector3delta
 * @typedef {import("/objectDefaultFiles/scene/Vector3Node.js").Vector3Value} Vector3Value
 */

class Engine3DPositionStore extends ObjectStore {
    /** @type {EntityInterface|null} */
    #entity;

    /** @type {Vector3Value} */
    #position;

    /**
     * 
     */
    constructor() {
        super();
        this.#entity = null;
        this.#position = {x:0, y:0, z:0};
    }

    /**
     * 
     * @param {Vector3Node} _thisNode 
     * @returns {{x: ValueNode, y: ValueNode, z: ValueNode}}
     */
    getProperties(_thisNode) {
        return {
            "x": new ValueNode({get: () => {return this.#position.x;}, set: (x) => {this.#position.x = x;}}),
            "y": new ValueNode({get: () => {return this.#position.y;}, set: (y) => {this.#position.y = y;}}),
            "z": new ValueNode({get: () => {return this.#position.z;}, set: (z) => {this.#position.z = z;}})
        };
    }

    /**
     * 
     * @param {Vector3Delta} delta 
     * @param {(Vector3Delta) => void} defaultApplyChanges 
     */
    applyChanges(delta, defaultApplyChanges) {
        this.#position = this.#entity.getPosition();
        defaultApplyChanges(delta);
        this.#entity.setPosition(this.#position);
    }

    /**
     * 
     * @param {EntityInterface} entity 
     */
    setEntity(entity) {
        this.#entity = entity;
    }
}

export default Engine3DPositionStore;
