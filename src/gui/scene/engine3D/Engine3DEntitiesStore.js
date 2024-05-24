import DictionaryStore from "/objectDefaultFiles/scene/DictionaryStore.js";
import EntityNode from "/objectDefaultFiles/scene/EntityNode.js";
import Engine3DEntityStore from "./Engine3DEntityStore.js";

class Engine3DEntitiesStore extends DictionaryStore {
    #entity;

    constructor(entityNode) {
        super();
        this.#entity = entityNode.getEntity();
    }

    /**
     * @override
     * @param {string} key
     * @param {BaseNodeState} state
     * @returns {BaseNode|undefined}
     */
    create(key, state) {
        if (state.hasOwnProperty("type") && state.type === EntityNode.TYPE) {
            const newEntity = this.#entity.createEntity(key);
            this.#entity.setChild(key, newEntity);
            return new EntityNode(new Engine3DEntityStore(newEntity));
        } else {
            throw Error("Not an Entity");
        }
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNode} _oldNode
     * @param {BaseNodeState} _state
     * @returns {BaseNode|undefined}
     */
    cast (_key, _oldNode, _state) {
        throw Error("Can't cast");
    }
}

export default Engine3DEntitiesStore;
