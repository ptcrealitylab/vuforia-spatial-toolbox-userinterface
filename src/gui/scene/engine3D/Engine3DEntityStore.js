import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import EntitiesNode from "/objectDefaultFiles/scene/EntitiesNode.js";
import ComponentsNode from "/objectDefaultFiles/scene/ComponentsNode.js";
import Engine3DEntitiesStore from "./Engine3DEntitiesStore.js";
import Engine3DComponentsStore from "./Engine3DComponentsStore.js";
import TransformComponentNode from "/objectDefaultFiles/scene/TransformComponentNode.js";
import Engine3DTransformComponentStore from "./Engine3DTransformComponentStore.js";

/**
 * @typedef {import(/objectDefaultFiles/scene/EntityNode.js).default} EntityNode
 */

class Engine3DEntityStore extends ObjectStore {
    #entity;

    constructor(entity) {
        super();
        this.#entity = entity;
    }

    /**
     * 
     * @param {EntityNode} thisNode 
     * @returns 
     */
    getProperties(thisNode) {
        const ret = {
            "children": new EntitiesNode(new Engine3DEntitiesStore(thisNode)),
            "components": new ComponentsNode(new Engine3DComponentsStore(thisNode))
        };
        return ret;
    }

    getEntity() {
        return this.#entity;
    }

    createTransform() {
       return new TransformComponentNode(new Engine3DTransformComponentStore(this.#entity.getPosition(), this.#entity.getRotation(), this.#entity.getScale()));
    }
}

export default Engine3DEntityStore;
