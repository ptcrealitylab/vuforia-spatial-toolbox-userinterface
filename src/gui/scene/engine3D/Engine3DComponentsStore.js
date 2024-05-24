import DictionaryStore from "/objectDefaultFiles/scene/DictionaryStore.js";
import DictionaryComponentNode from "/objectDefaultFiles/scene/DictionaryComponentNode.js";
import DictionaryComponentStore from "/objectDefaultFiles/scene/DictionaryComponentStore.js";
import TransformComponentNode from "/objectDefaultFiles/scene/TransformComponentNode.js";
import Engine3DTransformComponentStore from "./Engine3DTransformComponentStore.js";

class Engine3DComponentsStore extends DictionaryStore {
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
    create(_key, state) {
        if (state.hasOwnProperty("type")) {
            let ret = this.#entityNode.getEntity().createComponent(state);
            if (!ret && state.type.startsWith("Object.Component")) {
                if (state.type === TransformComponentNode.TYPE) {
                    const store = new Engine3DTransformComponentStore();
                    store.setEntityNode(this.#entityNode);
                    ret = new TransformComponentNode(store);
                } else {
                    ret = new DictionaryComponentNode(new DictionaryComponentStore(), state.type);
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
