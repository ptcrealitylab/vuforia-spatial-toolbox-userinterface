import DictionaryStore from "/objectDefaultFiles/scene/DictionaryStore.js"
import ToolNode from "/objectDefaultFiles/scene/ToolNode.js"
import Engine3DToolStore from "./Engine3DToolStore.js"; 

/**
 * @typedef {import("../ToolsRoot.js").ToolsRoot} ToolsRoot
 */

class Engine3DToolsRootStore extends DictionaryStore {
    /** @type {ToolsRoot} */
    #toolsRoot;

    /**
     * 
     * @param {ToolsRoot} toolsRoot 
     */
    constructor(toolsRoot) {
        super();
        this.#toolsRoot = toolsRoot;
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNodeState} state
     * @returns {BaseNode}
     */
    create(_key, state) {
        if (state.hasOwnProperty("type") && state.type === ToolNode.TYPE) {
            return new ToolNode(new Engine3DToolStore());
        }
        return undefined;
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNode} _oldNode
     * @param {BaseNodeState} _state
     */
    cast(_key, _oldNode, _state) {
        throw Error("ToolsRoot only accepts tools, can't cast");
    }

    getToolsRoot() {
        return this.#toolsRoot;
    }
}

export default Engine3DToolsRootStore;
