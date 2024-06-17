import * as THREE from "../../../thirdPartyCode/three/three.module.js"

class ToolsRoot {
    /** @type {THREE.Group} */
    #root;

    constructor() {
        this.#root = new THREE.Group();
        this.#root.name = "tools";
    }

    /**
     * @param {string} toolId 
     */
    remove(toolId) {
        const tool = this.#root.getObjectByName(toolId);
        if (tool) {
            this.#root.remove(tool);
        }
    }

    /**
     * 
     * @param {string} toolId 
     * @returns {THREE.Group}
     */
    create(toolId) {
        const tool = new THREE.Group();
        tool.name = toolId;
        this.#root.add(tool);
        return tool;
    }

    onDelete() {
        this.#root.removeFromParent();
    }

    /**
     * 
     * @returns {THREE.Group}
     */
    getInternalObject() {
        return this.#root;
    }
}

export default ToolsRoot;
