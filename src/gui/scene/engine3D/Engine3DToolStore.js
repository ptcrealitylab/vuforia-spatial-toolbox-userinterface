import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js"
import EntitiesNode from "/objectDefaultFiles/scene/EntitiesNode.js";
import ComponentsNode from "/objectDefaultFiles/scene/ComponentsNode.js";
import EntitiesStore from "/objectDefaultFiles/scene/EntitiesStore.js";
import ComponentsStore from "/objectDefaultFiles/scene/ComponentsStore.js";
import TransformComponentNode from "/objectDefaultFiles/scene/TransformComponentNode.js";
import TransformComponentStore from "/objectDefaultFiles/scene/TransformComponentStore.js";

/**
 * @typedef {import("../ToolManager.js").ToolProxy} ToolProxy
 */

class Engine3DToolStore extends ObjectStore {
    /** @type {ToolProxy} */
    #toolProxy;

    /**
     * 
     * @param {ToolProxy} toolProxy 
     */
    constructor(toolProxy) {
        super();
        this.#toolProxy = toolProxy;
    }

    /**
     * 
     * @param {ToolNode} thisNode 
     * @returns {{children: EntitiesNode, components: ComponentsNode}}
     */
    getProperties(thisNode) {
        const ret = {
            "children": new EntitiesNode(new EntitiesStore(thisNode)),
            "components": new ComponentsNode(new ComponentsStore(thisNode))
        };
        return ret;
    }

    getEntity() {
        return this.#toolProxy.getEntity();
    }

    createTransform() {
        const entity = this.#toolProxy.getEntity();
        return new TransformComponentNode(new TransformComponentStore(entity.getPosition(), entity.getRotation(), entity.getScale()));
    }
}

export default Engine3DToolStore;
