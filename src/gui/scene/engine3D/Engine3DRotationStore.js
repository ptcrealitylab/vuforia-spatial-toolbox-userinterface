import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import ValueNode from "/objectDefaultFiles/scene/ValueNode.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/QuaternionNode.js").default} QuaternionNode
 */

class Engine3DRotationStore extends ObjectStore {
    #entity;

    #rotation;

    constructor() {
        super();
        this.#entity = null;
        this.#rotation = {x:0, y: 0, z: 0, w: 1};
    }

    /**
     * 
     * @param {QuaternionNode} _thisNode 
     * @returns {{x: ValueNode, y: ValueNode, z: ValueNode, w: ValueNode}}
     */
    getProperties(_node) {
        return {
            "x": new ValueNode({get: () => {return this.#rotation.x;}, set: (x) => {this.#rotation.x = x;}}),
            "y": new ValueNode({get: () => {return this.#rotation.y;}, set: (y) => {this.#rotation.y = y;}}),
            "z": new ValueNode({get: () => {return this.#rotation.z;}, set: (z) => {this.#rotation.z = z;}}),
            "w": new ValueNode({get: () => {return this.#rotation.w;}, set: (w) => {this.#rotation.w = w;}})
        };
    }

    applyChanges(delta, defaultApplyChanges) {
        this.#rotation = this.#entity.getRotation();
        defaultApplyChanges(delta);
        this.#entity.setRotation(this.#rotation);
    }

    setEntity(entity) {
        this.#entity = entity;
    }
}

export default Engine3DRotationStore;
