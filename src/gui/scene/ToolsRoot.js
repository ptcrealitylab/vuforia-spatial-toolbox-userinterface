import * as THREE from "../../../thirdPartyCode/three/three.module.js"

class ToolsRoot {
    #root;

    constructor() {
        this.#root = new THREE.Group();
        this.#root.name = "tools";
    }

    remove(toolId) {
        const tool = this.#root.getObjectByName(toolId);
        if (tool) {
            this.#root.remove(tool);
        }
    }

    create(toolId) {
        const tool = new THREE.Group();
        tool.name = toolId;
        this.#root.add(tool);
        return tool;
    }

    getInternalObject() {
        return this.#root;
    }
}

export default ToolsRoot;
