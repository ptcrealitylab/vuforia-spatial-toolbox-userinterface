import DictionaryNode from "../../../../objectDefaultFiles/scene/DictionaryNode.js";
import ToolsRootNode from "../../../../objectDefaultFiles/scene/ToolsRootNode.js";

/**
 * @typedef {import("../ToolsRoot.js").ToolsRoot} ToolsRoot
 */

class Engine3DToolsRootStore extends DictionaryNode {
    /** @type {ToolsRoot} */
    #toolsRoot;

    /**
     * 
     * @param {ToolsRoot} toolsRoot 
     */
    constructor(toolsRoot) {
        super(ToolsRootNode.TYPE);
        this.#toolsRoot = toolsRoot;
    }

    getStateForTool(toolId) {
        const ret = super.getState();
        ret.properties = {};
        ret.properties[toolId] = this.get(toolId).getState();
        return ret;
    }

    /**
     * @override
     * @param {string} _key
     * @param {BaseNodeState} _state
     * @returns {BaseNode}
     */
    create(_key, _state) {
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

    canDelete(_key, oldNode) {
        oldNode.dispose();
        return true;
    }

    /**
     * @returns {ToolsRoot}
     */
    get toolsRoot() {
        return this.#toolsRoot;
    }
}

export default Engine3DToolsRootStore;
