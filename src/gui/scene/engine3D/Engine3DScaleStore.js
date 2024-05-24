import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import ValueNode from "/objectDefaultFiles/scene/ValueNode.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/Vector3Node.js").default} Vector3Node
 */

class Engine3DScaleStore extends ObjectStore {
    #entity;

    #scale;

    constructor() {
        super();
        this.#entity = null;
        this.#scale = {x: 1, y: 1, z: 1};
    }

    /**
     * 
     * @param {Vector3Node} _thisNode 
     * @returns {{x: ValueNode, y: ValueNode, z: ValueNode}}
     */
    getProperties(_node) {
        return {
            "x": new ValueNode({get: () => {return this.#scale.x;}, set: (x) => {this.#scale.x = x;}}),
            "y": new ValueNode({get: () => {return this.#scale.y;}, set: (y) => {this.#scale.y = y;}}),
            "z": new ValueNode({get: () => {return this.#scale.z;}, set: (z) => {this.#scale.z = z;}})
        };
    }

    applyChanges(delta, defaultApplyChanges) {
        this.#scale = this.#entity.getScale();
        defaultApplyChanges(delta);
        this.#entity.setScale(this.#scale);
    }

    setEntity(entity) {
        this.#entity = entity;
    }
}

export default Engine3DScaleStore;
