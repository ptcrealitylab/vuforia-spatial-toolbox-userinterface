import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js"
import ToolsRootNode from "/objectDefaultFiles/scene/ToolsRootNode.js"
import Engine3DToolsRootStore from "./Engine3DToolsRootStore.js";
import ToolsRoot from "../ToolsRoot.js";

/**
 * @typedef {import("../AnchoredGroup.js").AnchoredGroup} AnchoredGroup
 * @typedef {import("/objectDefaultFiles/scene/AnchoredGroupNode.js").default} AnchoredGroupNode
 */

class Engine3DAnchoredGroupStore extends ObjectStore {
    /** @type {AnchoredGroup|null} */
    #anchoredGroup;

    #toolsRoot;

    constructor() {
        super();
        this.#anchoredGroup = null;
        this.#toolsRoot = new ToolsRoot();
    }

    /**
     * 
     * @param {AnchoredGroupNode} _thisNode 
     * @returns 
     */
    getProperties(_thisNode) {
        return {
            "tools": new ToolsRootNode(new Engine3DToolsRootStore(this.#toolsRoot))
        };
    }

    /**
     * @param {AnchoredGroup} anchoredGroup 
     */
    setAnchoredGroup(anchoredGroup) {
        this.#anchoredGroup = anchoredGroup;
        this.#anchoredGroup.add(this.#toolsRoot.getInternalObject());
    }
}

export default Engine3DAnchoredGroupStore;
