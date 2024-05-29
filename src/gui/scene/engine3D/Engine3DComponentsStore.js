import DictionaryStore from "/objectDefaultFiles/scene/DictionaryStore.js";
import DictionaryComponentNode from "/objectDefaultFiles/scene/DictionaryComponentNode.js";
import DictionaryComponentStore from "/objectDefaultFiles/scene/DictionaryComponentStore.js";
import TransformComponentNode from "/objectDefaultFiles/scene/TransformComponentNode.js";
import Engine3DTransformComponentStore from "./Engine3DTransformComponentStore.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/EntityNode.js").default} EntityNode
 */

class Engine3DComponentsStore extends DictionaryStore {
    /** @type {EntityNode} */
    #entityNode;
    
    constructor(entityNode) {
        super();
        this.#entityNode = entityNode;
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNodeState} state
     * @returns {ComponentNode|undefined}
     */
    create(key, state) {
        if (state.hasOwnProperty("type")) {
            let ret = this.#entityNode.getEntity().createComponent(state);
            if (!ret && state.type.startsWith("Object.Component")) {
                if (state.type === TransformComponentNode.TYPE) {
                    ret = new TransformComponentNode(new Engine3DTransformComponentStore());
                } else {
                    ret = new DictionaryComponentNode(new DictionaryComponentStore(), state.type);
                }
            }
            if (ret) {
                ret.setEntityNode(this.#entityNode);
                const entity = this.#entityNode.getEntity();
                if (entity) {
                    entity.setComponent(key, ret.getComponent());
                }
            }
            return ret;
        } else {
            throw Error("Not a component");
        }
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNode} _oldNode
     * @param {BaseNodeState} _state
     */
    cast(_key, _oldNode, _state) {
        throw Error("Can't cast");
    }
}

export default Engine3DComponentsStore;
