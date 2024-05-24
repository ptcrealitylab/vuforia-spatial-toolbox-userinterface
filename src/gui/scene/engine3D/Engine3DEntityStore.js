import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import EntitiesNode from "/objectDefaultFiles/scene/EntitiesNode.js";
import ComponentsNode from "/objectDefaultFiles/scene/ComponentsNode.js";
import Engine3DEntitiesStore from "./Engine3DEntitiesStore.js";
import Engine3DComponentsStore from "./Engine3DComponentsStore.js";

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
}

export default Engine3DEntityStore;
