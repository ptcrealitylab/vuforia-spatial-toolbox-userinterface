import {GLTFLoader} from '../../../thirdPartyCode/three/GLTFLoader.module.js';
import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import VersionedNode from "/objectDefaultFiles/scene/VersionedNode.js";
import EntityNode from "/objectDefaultFiles/scene/EntityNode.js";
import EntityStore from '/objectDefaultFiles/scene/EntityStore.js';
import ThreejsEntity from "./ThreejsEntity.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/ThreejsGLTFLoaderComponentNode.js").default} ThreejsGLTFLoaderComponentNode
 */

const gltfLoader = new GLTFLoader();

class ThreejsGLTFLoaderComponentStore extends ObjectStore {
    /** @type {EntityNode} */
    #node;

    /** @type {string} */
    #url;

    /** @type {VersionedNode} */
    #urlNode;

    /** @type {boolean} */
    #forceLoad;

    constructor() {
        super();
        this.#node = null;
        this.#urlNode = new VersionedNode({get: () => {return this.#url;}, set: (value) => {this.#url = value; this.#forceLoad;}});
        this.#forceLoad = false;
    }

    /**
     * 
     * @param {EntityNode} node 
     */
    setEntityNode(node) {
        this.#node = node;
        this.#forceLoad = true;
    }

    /**
     * 
     * @param {ThreejsGLTFLoaderComponentNode} _thisNode 
     * @returns 
     */
    getProperties(_thisNode) {
        return {
            "url": this.#urlNode
        };
    }

    async update() {
        if (this.#forceLoad) {
            this.#forceLoad = false;
            const model = await new Promise((resolve, reject) => {
                gltfLoader.load(this.#url, (modelData) => resolve(modelData), null, reject);
            });
            const modelNode = new EntityNode(new EntityStore(new ThreejsEntity(model.scene)));
            ThreejsGLTFLoaderComponentStore.createChildEntities(modelNode);
            this.#node.setChild("Scene", modelNode);
        }
    }

    /** 
     * @param {EntityNode} entityNode 
     */
    static createChildEntities(entityNode) {
        const object3D = entityNode.getEntity().getInternalObject();
        const children = object3D.children;
        for (let i = 0; i < children.length; ++i) {
            const childNode = new EntityNode(new EntityStore(new ThreejsEntity(children[i])));
            ThreejsGLTFLoaderComponentStore.createChildEntities(childNode);
            entityNode.setChild(`${i}`, childNode);
        }
    }

    getComponent() {
        return this;
    }
}

export default ThreejsGLTFLoaderComponentStore;
