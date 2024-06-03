import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js"
import AnchoredGroupNode from "/objectDefaultFiles/scene/AnchoredGroupNode.js"
import Engine3DAnchoredGroupStore from "./Engine3DAnchoredGroupStore.js";
import ToolsRootNode from "/objectDefaultFiles/scene/ToolsRootNode.js"
import Engine3DToolsRootStore from "./Engine3DToolsRootStore.js";
import ToolsRoot from "../ToolsRoot.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {import("/objectDefaultFiles/scene/WorldNode.js").default} WorldNode
 * @typedef {import("../Renderer.js").Renderer} Renderer
 */

class Engine3DWorldStore extends ObjectStore {
    /** @type {Renderer} */
    #renderer;

    #toolsRoot;

    /**
     * 
     * @param {Renderer} renderer 
     */
    constructor(renderer) {
        super();
        this.#renderer = renderer;
        this.#toolsRoot = new ToolsRoot();
        this.#renderer.getGlobalScale().getNode().add(this.#toolsRoot.getInternalObject());
    }

    /**
     * @override
     * @param {WorldNode} _thisNode 
     * @returns {NodeDict}
     */
    getProperties(_thisNode) {
        return {
            "threejsContainer": new AnchoredGroupNode(new Engine3DAnchoredGroupStore()),
            "tools": new ToolsRootNode(new Engine3DToolsRootStore(this.#toolsRoot))
        };
    }
}

export default Engine3DWorldStore;
