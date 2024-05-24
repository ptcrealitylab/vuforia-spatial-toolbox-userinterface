import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js"
import AnchoredGroupNode from "/objectDefaultFiles/scene/AnchoredGroupNode.js"
import Engine3DAnchoredGroupStore from "./Engine3DAnchoredGroupStore.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/ObjectNode.js").ObjectInterface} ObjectInterface
 * @typedef {import("/objectDefaultFiles/scene/WorldNode.js").default} WorldNode
 * @typedef {import("../Renderer.js").Renderer} Renderer
 */

class Engine3DWorldStore extends ObjectStore {
    /** @type {Renderer} */
    #renderer;

    /**
     * 
     * @param {Renderer} renderer 
     */
    constructor(renderer) {
        super();
        this.#renderer = renderer;
    }

    /**
     * @override
     * @param {WorldNode} _thisNode 
     * @returns {NodeDict}
     */
    getProperties(_thisNode) {
        return {
            "threejsContainer": new AnchoredGroupNode(new Engine3DAnchoredGroupStore())
        };
    }
}

export default Engine3DWorldStore;
