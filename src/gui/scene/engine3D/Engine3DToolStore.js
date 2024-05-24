import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js"
import EntitiesNode from "/objectDefaultFiles/scene/EntitiesNode.js";
import ComponentsNode from "/objectDefaultFiles/scene/ComponentsNode.js";
import Engine3DEntitiesStore from "./Engine3DEntitiesStore.js";
import Engine3DComponentsStore from "./Engine3DComponentsStore.js";

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

}

export default Engine3DToolStore;
