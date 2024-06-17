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
 * @typedef {import("../Renderer.js").Timer} Timer
 * @typedef {import("../Renderer.js").GeometryCache} GeometryCache
 * @typedef {import("../Renderer.js").MaterialCache} MaterialCache
 * @typedef {import("../Renderer.js").TextureCache} TextureCache
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
     * 
     * @returns {Timer}
     */
    getTimer() {
        return this.#renderer.getTimer();
    }

    /**
     * 
     * @returns {Renderer}
     */
    getRenderer() {
        return this.#renderer;
    }

    /**
     * 
     * @returns {GeometryCache}
     */
    getGeometryCache() {
        return this.#renderer.getGeometryCache();
    }

    /**
     * 
     * @returns {MaterialCache}
     */
    getMaterialCache() {
        return this.#renderer.getMaterialCache();
    }

    /**
     * 
     * @returns {TextureCache}
     */
    getTextureCache() {
        return this.#renderer.getTextureCache();
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
