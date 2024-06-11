import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import ValueNode from "/objectDefaultFiles/scene/ValueNode.js";
import TriggerValueStore from "/objectDefaultFiles/scene/TriggerValueStore.js";
import {getRoot} from "./utils.js";

class ThreejsMaterialComponentStore extends ObjectStore {
    /** @type {string} */
    #materialIdNode;

    /** @type {EntityNode} */
    #node;

    /** @type {boolean} */
    #entityNeedsUpdate;

    /** @type {ResourceCache|null} */
    #cache;

    /** @type {boolean} */
    #nodeChanged;

    constructor() {
        super();
        this.#materialIdNode = new ValueNode(new TriggerValueStore(() => {this.#entityNeedsUpdate = true;}, ""));
        this.#entityNeedsUpdate = false;
        this.#cache = null;
        this.#node = null;
        this.#nodeChanged = false; 
    }

    getProperties() {
        return {
            "material": this.#materialIdNode
        };
    }

    /**
     * @param {EntityNode} node
     */
    setEntityNode(node) {
        this.#node = node;
        this.#nodeChanged = true;
    }

    update() {
        if (!this.#cache) {
            const worldStore = getRoot(this.#node).getListener();
            this.#cache = worldStore.getMaterialCache();
        }
        if (this.#entityNeedsUpdate) {
            this.#entityNeedsUpdate = false;   
            const materialRef = this.#cache.get(this.#materialIdNode.get());
            if (materialRef) {
                const entity = this.#node.getEntity();
                entity.getInternalObject().material = materialRef.getResource();
                entity.setMaterialRef(materialRef);
                materialRef.release();
            }
        } else if (this.#nodeChanged) {
            this.nodeChanged = false;
            const entity = this.#node.getEntity();
            const materialRef = entity.getMaterialRef();
            this.#materialIdNode.set(materialRef.getResource().getId());
        }
        this.#nodeChanged = false;
    }

    release() {
    }
}

export default ThreejsMaterialComponentStore;
