import ObjectNode from "../../../../objectDefaultFiles/scene/ObjectNode.js"
import Engine3DAnchoredGroupNode from "./Engine3DAnchoredGroupNode.js"
import Engine3DToolsRootNode from "./Engine3DToolsRootNode.js"
import ToolsRoot from "../ToolsRoot.js";
import WorldNode from "../../../../objectDefaultFiles/scene/WorldNode.js";

/**
 * @typedef {import("./../../../objectDefaultFiles/scene/ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {import("../Renderer.js").Renderer} Renderer
 * @typedef {import("../Renderer.js").Timer} Timer
 * @typedef {import("../Renderer.js").GeometryCache} GeometryCache
 * @typedef {import("../Renderer.js").MaterialCache} MaterialCache
 * @typedef {import("../Renderer.js").TextureCache} TextureCache
 */

class Engine3DWorldNode extends ObjectNode {
    /** @type {Renderer} */
    #renderer;

    /** @type {ToolsRoot} */
    #toolsRoot;

    /**
     * 
     * @param {Renderer} renderer 
     */
    constructor(renderer) {
        super(WorldNode.TYPE);
        this.#renderer = renderer;
        this.#toolsRoot = new ToolsRoot();
        this.#renderer.getGlobalScale().getNode().add(this.#toolsRoot.getInternalObject());
        this._set("threejsContainer", new Engine3DAnchoredGroupNode());
        this._set("tools", new Engine3DToolsRootNode(this.#toolsRoot));
    }

    /**
     * 
     * @returns {Timer}
     */
    get timer() {
        return this.#renderer.getTimer();
    }

    /**
     * 
     * @returns {Renderer}
     */
    get renderer() {
        return this.#renderer;
    }

    /**
     * 
     * @returns {GeometryCache}
     */
    get geometryCache() {
        return this.#renderer.getGeometryCache();
    }

    /**
     * 
     * @returns {MaterialCache}
     */
    get materialCache() {
        return this.#renderer.getMaterialCache();
    }

    /**
     * 
     * @returns {TextureCache}
     */
    get textureCache() {
        return this.#renderer.getTextureCache();
    }

    /**
     * 
     * @param {string} toolId 
     * @returns {WorldNodeState}
     */
    getStateForTool(toolId) {
        const ret = super.getState();
        ret.properties = {};
        ret.properties["threejsContainer"] = this.get("threejsContainer").getState();
        ret.properties["tools"] = this.get("tools").getStateForTool(toolId);
        ret.toolsRoot = ["tools"];
        return ret;
    }
}

export default Engine3DWorldNode;
