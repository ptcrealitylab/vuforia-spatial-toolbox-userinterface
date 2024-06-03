import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js"

/**
 * @typedef {import("../AnchoredGroup.js").AnchoredGroup} AnchoredGroup
 * @typedef {import("/objectDefaultFiles/scene/AnchoredGroupNode.js").default} AnchoredGroupNode
 */

class Engine3DAnchoredGroupStore extends ObjectStore {
    /** @type {AnchoredGroup|null} */
    #anchoredGroup;

    constructor() {
        super();
        this.#anchoredGroup = null;
    }

    /**
     * 
     * @param {AnchoredGroupNode} _thisNode 
     * @returns 
     */
    getProperties(_thisNode) {
        return {};
    }

    /**
     * @param {Anchoredgroup} anchoredGroup 
     */
    setAnchoredGroup(anchoredGroup) {
        this.#anchoredGroup = anchoredGroup;
    }
}

export default Engine3DAnchoredGroupStore;
