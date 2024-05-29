import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js"
import EntitiesNode from "/objectDefaultFiles/scene/EntitiesNode.js";
import ComponentsNode from "/objectDefaultFiles/scene/ComponentsNode.js";
import Engine3DEntitiesStore from "./Engine3DEntitiesStore.js";
import Engine3DComponentsStore from "./Engine3DComponentsStore.js";
import TransformComponentNode from "/objectDefaultFiles/scene/TransformComponentNode.js";
import Engine3DTransformComponentStore from "./Engine3DTransformComponentStore.js";

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
            "children": new EntitiesNode(new Engine3DEntitiesStore(thisNode)),
            "components": new ComponentsNode(new Engine3DComponentsStore(thisNode))
        };
        return ret;
    }

    getEntity() {
        return this.#toolProxy.getEntity();
    }

    createTransform() {
        const entity = this.#toolProxy.getEntity();
        return new TransformComponentNode(new Engine3DTransformComponentStore(entity.getPosition(), entity.getRotation(), entity.getScale()));
    }
}

export default Engine3DToolStore;
