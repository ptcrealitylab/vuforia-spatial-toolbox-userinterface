import {GLTFLoader} from '../../../thirdPartyCode/three/GLTFLoader.module.js';
import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import VersionedNode from "/objectDefaultFiles/scene/VersionedNode.js";
import EntityNode from "/objectDefaultFiles/scene/EntityNode.js";
import EntityStore from '/objectDefaultFiles/scene/EntityStore.js';
import ThreejsEntity from "./ThreejsEntity.js"; 
import SmartResourceCache from './SmartResourceCache.js';

/**
 * @typedef {import("/objectDefaultFiles/scene/ThreejsGLTFLoaderComponentNode.js").default} ThreejsGLTFLoaderComponentNode
 * @typedef {import("./SmartResourceCache.js").ResourceReference} ResourceReference
 * @typedef {(resource: ResourceReference) => void} onLoadFunc
 * @typedef {(error: Error) => void} onErrorFunc
 */

class CachedGLTFLoader {
    /** @type {GLTFLoader} */
    #gltfLoader;

    /** @type {SmartResourceCache} */
    #cache;

    #loading;

    /**
     * 
     */
    constructor() {
        this.#gltfLoader = new GLTFLoader();
        this.#cache = new SmartResourceCache();
        this.#loading = {};
    }

    /**
     * 
     * @param {string} url 
     * @param {onLoadFunc} onLoad 
     * @param {onErrorFunc} onError 
     */
    #reload(url, onLoad, onError) {
        if (!this.#loading.hasOwnProperty(url)) {
            this.#loading[url] = [{onLoad, onError}];
            this.#gltfLoader.load(url, (modelData) => {
                const reference = this.#cache.set(modelData, url);
                for (const entry of this.#loading[url]) {
                    entry.onLoad(reference.copy());
                }
                reference.release();
                delete this.#loading[url];
            }, null, (error) => {
                for (const entry of this.#loading[url]) {
                    entry.onError(error);
                }
                delete this.#loading[url];
            });
        } else {
            this.#loading[url].push({onLoad, onError});
        }
    }

    load(url, onLoad, onError, version) {
        let cacheRef = this.#cache.getRef(url);
        if (cacheRef) {
            if (cacheRef.getVersion() < version) {
                cacheRef.release();
                this.#reload(url, onLoad, onError);
            } else {
                onLoad(cacheRef);
            }
        } else {
            this.#reload(url, onLoad, onError);
        }
    }
}

class ThreejsGLTFLoaderComponentStore extends ObjectStore {
    static gltfLoader = new CachedGLTFLoader();

    /** @type {EntityNode} */
    #node;

    /** @type {string} */
    #url;

    /** @type {VersionedNode} */
    #urlNode;

    /** @type {boolean} */
    #forceLoad;

    /** @type {ResourceReference|null} */
    #resourceRef

    constructor() {
        super();
        this.#node = null;
        this.#urlNode = new VersionedNode({get: () => {return this.#url;}, set: (value) => {this.#url = value; this.#forceLoad;}});
        this.#forceLoad = false;
        this.#resourceRef = null;
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

    #getRenderer(node) {
        if (node.getParent()) {
            return this.#getRenderer(node.getParent());
        } else {
            return node.getRenderer();
        }
    }

    async update() {
        if (this.#forceLoad) {
            this.#forceLoad = false;
            let version = 0;
            if (this.resourceRef) {
                version = this.#resourceRef.getVersion() + 1;
                this.#resourceRef.release();
            }
            this.#resourceRef = await new Promise((resolve, reject) => {
                ThreejsGLTFLoaderComponentStore.gltfLoader.load(this.#url, (resourceRef) => resolve(resourceRef), reject, version);
            });
            const modelNode = new EntityNode(new EntityStore(new ThreejsEntity(this.#resourceRef.getResource().scene.clone())));
            ThreejsGLTFLoaderComponentStore.createChildEntities(modelNode, (this.#url).replaceAll('.', '_'));
            this.#node.setChild("Scene", modelNode);
        }
    }

    release() {
        if (this.#resourceRef) {
            this.#resourceRef.release();
        }
    }

    /** 
     * @param {EntityNode} entityNode 
     */
    static createChildEntities(entityNode, uniqueIdPrefix) {
        const object3D = entityNode.getEntity().getInternalObject();
        if (object3D.hasOwnProperty("material")) {
            console.log(`${uniqueIdPrefix} "${object3D.material.name}" ${object3D.material.id}`);
        }
        const children = object3D.children;
        for (let i = 0; i < children.length; ++i) {
            const childNode = new EntityNode(new EntityStore(new ThreejsEntity(children[i])));
            ThreejsGLTFLoaderComponentStore.createChildEntities(childNode, uniqueIdPrefix + `.${i}`);
            entityNode.setChild(`${i}`, childNode);
        }
    }
}

export default ThreejsGLTFLoaderComponentStore;
