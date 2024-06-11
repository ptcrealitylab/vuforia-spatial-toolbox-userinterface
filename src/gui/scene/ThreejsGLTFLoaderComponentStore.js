import {GLTFLoader} from '../../../thirdPartyCode/three/GLTFLoader.module.js';
import ObjectStore from "/objectDefaultFiles/scene/ObjectStore.js";
import VersionedNode from "/objectDefaultFiles/scene/VersionedNode.js";
import EntityNode from "/objectDefaultFiles/scene/EntityNode.js";
import EntityStore from '/objectDefaultFiles/scene/EntityStore.js';
import ThreejsEntity from "./ThreejsEntity.js"; 
import ResourceCache from './SmartResourceCache.js';
import {getRoot} from "./utils.js";

/**
 * @typedef {import("/objectDefaultFiles/scene/ThreejsGLTFLoaderComponentNode.js").default} ThreejsGLTFLoaderComponentNode
 * @typedef {import("./SmartResourceCache.js").ResourceReference} ResourceReference
 * @typedef {({ref: ResourceReference, node: entity}) => void} onLoadFunc
 * @typedef {(error: Error) => void} onErrorFunc
 */

class CreateChildEntityWalker {
    /** @type {ResourceCache} */
    #geometryCache;

    /** @type {{[key: number]: SmartResource}} */
    #geometryLookup;

    /** @type {ResourceCache} */
    #materialCache;

    /** @type {{[key: number]: SmartResource}} */
    #materialLookup;

    /**
     * 
     * @param {ResourceCache} geometryCache
     * @param {ResourceCache} materialCache
     */
    constructor(geometryCache, materialCache) {
        this.#geometryCache = geometryCache;
        this.#geometryLookup = {};
        this.#materialCache = materialCache;
        this.#materialLookup = {};
    }

    /**
     * 
     * @param {THREE.Material|THREE.Geometry} resource 
     * @param {string} uniqueIdPrefix 
     * @param {ResourceCache} cache 
     * @param {{[key: number]: SmartResource}} lookup 
     */
    #createSmartResource(resource, uniqueIdPrefix, cache, lookup) {
        if (lookup.hasOwnProperty(resource.id)) {
            return lookup[resource.id].copy();
        } else {
            const resourceId = uniqueIdPrefix + "." + resource.name.replace(/[\\.@]/g, "\\$&");
            let smartResource = cache.insert(resourceId, resource);
            lookup[resource.id] = smartResource.copy();
            return smartResource;
        }
    }

    #clearLookup(lookup) {
        const keys = Object.keys(lookup);
        for (const key of keys) {
            lookup[key].release();
            delete lookup[key];
        }
    }

    /**
     * 
     * @param {EntityNode} entityNode 
     * @param {string} uniqueIdPrefix 
     */
    run(entityNode, uniqueIdPrefix) {
        this.#internalRun(entityNode, uniqueIdPrefix);
        this.#clearLookup(this.#materialLookup);
        this.#clearLookup(this.#geometryLookup);
    }

    /**
     * 
     * @param {EntityNode} entityNode 
     * @param {string} uniqueIdPrefix 
     */
    #internalRun(entityNode, uniqueIdPrefix) {
        const object3D = entityNode.getEntity().getInternalObject();
        if (object3D.hasOwnProperty("material")) {
            const materialRef = this.#createSmartResource(object3D.material, uniqueIdPrefix, this.#materialCache, this.#materialLookup); 
            entityNode.getListener().getEntity().setMaterialRef(materialRef);
            materialRef.release();
        }
        if (object3D.hasOwnProperty("geometry")) {
            const geometryRef = this.#createSmartResource(object3D.geometry, uniqueIdPrefix, this.#geometryCache, this.#geometryLookup); 
            entityNode.getListener().getEntity().setGeometryRef(geometryRef);
            geometryRef.release();
        }
        const children = object3D.children;
        for (let i = 0; i < children.length; ++i) {
            const childNode = new EntityNode(new EntityStore(new ThreejsEntity(children[i])));
            this.#internalRun(childNode, uniqueIdPrefix + `.${children[i].name ? children[i].name.replace(/[\\.@]/g, '\\$&') : ""}@${i}`);
            entityNode.setChild(`${i}`, childNode);
        }
    }
}

class CachedGLTFLoader {
    /** @type {GLTFLoader} */
    #gltfLoader;

    /** @type {SmartResourceCache} */
    #cache;

    /** @type {{[key: number]: {onLoad: onLoadFunc, onError: onErrorFunc}}} */
    #loading;

    /** @type {CreateChildEntityWalker} */
    #childEntityWalker;

    /**
     * @param {ResourceCache} geometryCache
     * @param {ResourceCache} materialCache
     */
    constructor(geometryCache, materialCache) {
        this.#gltfLoader = new GLTFLoader();
        this.#cache = new ResourceCache("glTFCache");
        this.#loading = {};
        this.#childEntityWalker = new CreateChildEntityWalker(geometryCache, materialCache);
    }

    /**
     * 
     * @param {*} modelData 
     * @param {string} absUrl 
     * @param {number} version 
     * @returns {EntityNode}
     */
    #createEntityNode(modelData, absUrl, version) {
        const modelNode = new EntityNode(new EntityStore(new ThreejsEntity(modelData.scene)));
        this.#childEntityWalker.run(modelNode, absUrl.replace(/[\\.@]/g, '\\$&') + "@" + version);
        return modelNode;
    }

    #internalCloneEntityNode(srcNode, object3D) {
        const dstNode = new EntityNode(new EntityStore(new ThreejsEntity(object3D)));
        const materialRef = srcNode.getEntity().getMaterialRef();
        dstNode.getEntity().setMaterialRef(materialRef);
        if (materialRef) {
            materialRef.release();
        }
        const geometryRef = srcNode.getEntity().getGeometryRef();
        dstNode.getEntity().setGeometryRef(geometryRef);
        if (geometryRef) {
            geometryRef.release();
        }
        for (let i = 0; i < object3D.children.length; ++i) {
            dstNode.setChild(`${i}`, this.#internalCloneEntityNode(srcNode.getChild(i), object3D.children[i]));
        }
        return dstNode;
    }

    #cloneEntityNode(modelNode) {
        return this.#internalCloneEntityNode(modelNode, modelNode.getEntity().getInternalObject().clone());
    }

    /**
     * 
     * @param {string} url 
     * @param {onLoadFunc} onLoad 
     * @param {onErrorFunc} onError 
     */
    #reload(absUrl, onLoad, onError, version) {
        if (!this.#loading.hasOwnProperty(absUrl)) {
            this.#loading[absUrl] = [{onLoad, onError}];
            this.#gltfLoader.load(absUrl, (modelData) => {
                const entityNode = this.#createEntityNode(modelData, absUrl, version);
                const reference = this.#cache.insert(absUrl, entityNode);
                for (const entry of this.#loading[absUrl]) {
                    entry.onLoad({ref: reference.copy(), node: this.#cloneEntityNode(entityNode)});
                }
                reference.release();
                delete this.#loading[absUrl];
            }, null, (error) => {
                for (const entry of this.#loading[absUrl]) {
                    entry.onError(error);
                }
                delete this.#loading[absUrl];
            });
        } else {
            this.#loading[absUrl].push({onLoad, onError});
        }
    }

    load(url, onLoad, onError, version) {
        const absUrl = new URL(url).href; 
        let cacheRef = this.#cache.get(absUrl);
        if (cacheRef) {
            if (cacheRef.getResource().getVersion() < version) {
                cacheRef.release();
                this.#reload(absUrl, onLoad, onError, version);
            } else {
                onLoad({ref: cacheRef, node: this.#cloneEntityNode(cacheRef.getResource().getResource())});
            }
        } else {
            this.#reload(absUrl, onLoad, onError, version);
        }
    }
}



class ThreejsGLTFLoaderComponentStore extends ObjectStore {
    /** @type {CachedGLTFLoader|null} */
    static #gltfLoader = null;

    /** @type {EntityNode|null} */
    #node;

    /** @type {string} */
    #url;

    /** @type {VersionedNode} */
    #urlNode;

    /** @type {boolean} */
    #forceLoad;

    /** @type {SmartResource|null} */
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

    async update() {
        if (this.#forceLoad) {
            this.#forceLoad = false;
            let version = 0;
            if (this.#resourceRef) {
                version = this.#resourceRef.getVersion() + 1;
                this.#resourceRef.release();
            }
            if (!ThreejsGLTFLoaderComponentStore.#gltfLoader) {
                const worldStore = getRoot(this.#node).getListener();
                ThreejsGLTFLoaderComponentStore.#gltfLoader = new CachedGLTFLoader(worldStore.getGeometryCache(), worldStore.getMaterialCache());
            }
            const result = await new Promise((resolve, reject) => {
                ThreejsGLTFLoaderComponentStore.#gltfLoader.load(new URL(this.#url).href, (resourceRef) => resolve(resourceRef), reject, version);
            });
            this.#resourceRef = result.ref;
            this.#node.setChild("Scene", result.node);
        }
    }

    release() {
        if (this.#resourceRef) {
            this.#resourceRef.release();
        }
        this.#resourceRef = null;
    }
}

export default ThreejsGLTFLoaderComponentStore;
