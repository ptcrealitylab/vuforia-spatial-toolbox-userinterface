import {GLTFLoader} from '../../../thirdPartyCode/three/GLTFLoader.module.js';
import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import VersionedNode from "/objectDefaultFiles/scene/VersionedNode.js";
import EntityNode from "/objectDefaultFiles/scene/EntityNode.js";
import Engine3DEntityStore from './engine3D/Engine3DEntityStore.js';
import ThreejsEntity from "./ThreejsEntity.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/ThreejsGLTFLoaderComponentNode.js").default} ThreejsGLTFLoaderComponentNode
 */

const gltfLoader = new GLTFLoader();

class ThreejsGLTFLoaderComponentStore extends ObjectStore {
    #node;
    #url;

    constructor() {
        super();
        this.#node = null;
        this.#url = "";
    }

    setEntityNode(node) {
        this.#node = node;
    }

    /**
     * 
     * @param {ThreejsGLTFLoaderComponentNode} _thisNode 
     * @returns 
     */
    getProperties(_thisNode) {
        return {
            "url": new VersionedNode({get: () => {return this.#url;}, set: (value) => this.loadModel(value)})
        };
    }

    async loadModel(url) {
        this.#url = url;
        const model = await new Promise((resolve, reject) => {
            gltfLoader.load(url, (modelData) => resolve(modelData), null, reject);
        });
        this.#node.setChild(model.scene.name, new EntityNode(new Engine3DEntityStore(new ThreejsEntity(model.scene))));
    }
}

export default ThreejsGLTFLoaderComponentStore;
