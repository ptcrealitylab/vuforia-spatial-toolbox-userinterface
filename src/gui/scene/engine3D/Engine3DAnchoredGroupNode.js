import ObjectNode from "../../../../objectDefaultFiles/scene/ObjectNode.js"
import AnchoredGroupNode from "../../../../objectDefaultFiles/scene/AnchoredGroupNode.js";

/**
 * @typedef {import("../AnchoredGroup.js").default} AnchoredGroup
 * @typedef {import("/objectDefaultFiles/scene/AnchoredGroupNode.js").default} AnchoredGroupNode
 */

class Engine3DAnchoredGroupNode extends ObjectNode {
    /** @type {AnchoredGroup|null} */
    #anchoredGroup;

    constructor() {
        super(AnchoredGroupNode.TYPE);
        this.#anchoredGroup = null;
    }

    /**
     * @returns {AnchoredGroup}
     */
    get anchoredGroup() {
        return this.#anchoredGroup;
    }

    /**
     * @param {Anchoredgroup} anchoredGroup 
     */
    set anchoredGroup(anchoredGroup) {
        this.#anchoredGroup = anchoredGroup;
    }
}

export default Engine3DAnchoredGroupNode;
