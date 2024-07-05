import {GLTFLoader} from '../../../thirdPartyCode/three/GLTFLoader.module.js';
import ObjectNode from '../../../objectDefaultFiles/scene/ObjectNode.js';
import VersionedNode from "/objectDefaultFiles/scene/VersionedNode.js";
import EntityNode from "/objectDefaultFiles/scene/BaseEntityNode.js";
import ThreejsEntity from "./ThreejsEntity.js"; 
import {ResourceCache} from './SmartResourceCache.js';
import {getRoot} from "./utils.js";
import MaterialComponentNode from "/objectDefaultFiles/scene/MaterialComponentNode.js";
import ThreejsMaterialComponentNode from "./ThreejsMaterialComponentNode.js";
import ThreejsEntityNode from './ThreejsEntityNode.js';
import { safeUsing } from './SmartResource.js';

/**
 * @typedef {import("/objectDefaultFiles/scene/ThreejsGLTFLoaderComponentNode.js").default} ThreejsGLTFLoaderComponentNode
 * @typedef {import("./SmartResourceCache.js").ResourceReference} ResourceReference
 * @typedef {({ref: ResourceReference, node: entity}) => void} onLoadFunc
 * @typedef {(error: Error) => void} onErrorFunc
 */

class CreateChildEntityWalker {
    /** @type {ResourceCache} */
    #geometryCache;

    /** @type {ResourceCache} */
    #materialCache;

    /**
     * 
     * @param {ResourceCache} geometryCache
     * @param {ResourceCache} materialCache
     */
    constructor(geometryCache, materialCache) {
        this.#geometryCache = geometryCache;
        this.#materialCache = materialCache;
    }

    /**
     * 
     * @param {THREE.Material|THREE.Geometry} resource 
     * @param {string} uniqueIdPrefix 
     * @param {ResourceCache} cache 
     */
    #createSmartResource(resource, uniqueIdPrefix, cache) {
        if (resource.userData.hasOwnProperty("toolboxId")) {
            return cache.get(resource.userData.toolboxId);
        } else {
            const resourceId = uniqueIdPrefix + "." + resource.name.replace(/[\\.@]/g, "\\$&");
            resource.userData.toolboxId = resourceId;
            return cache.insert(resourceId, resource);
        }
    }

    /**
     * 
     * @param {EntityNode} entityNode 
     * @param {string} uniqueIdPrefix 
     */
    run(entityNode, uniqueIdPrefix) {
        this.#internalRun(entityNode, uniqueIdPrefix);
    }

    /**
     * 
     * @param {EntityNode} entityNode 
     * @param {string} uniqueIdPrefix 
     */
    #internalRun(entityNode, uniqueIdPrefix) {
        const object3D = entityNode.entity.getInternalObject();
        if (object3D.hasOwnProperty("material")) {
            const materialRef = this.#createSmartResource(object3D.material, uniqueIdPrefix, this.#materialCache); 
            entityNode.entity.materialRef = materialRef;
            materialRef.release();
            entityNode.setComponent("1000", new ThreejsMaterialComponentNode(), false);
        }
        if (object3D.hasOwnProperty("geometry")) {
            const geometryRef = this.#createSmartResource(object3D.geometry, uniqueIdPrefix, this.#geometryCache); 
            entityNode.entity.geometryRef = geometryRef;
            geometryRef.release();
        }
        const children = object3D.children;
        for (let i = 0; i < children.length; ++i) {
            const childNode = new ThreejsEntityNode(new ThreejsEntity(children[i]));
            this.#internalRun(childNode, uniqueIdPrefix + `.${children[i].name ? children[i].name.replace(/[\\.@]/g, '\\$&') : ""}@${i}`);
            entityNode.setChild(`${i}`, childNode, false);
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
        const modelNode = new ThreejsEntityNode(new ThreejsEntity(modelData.scene));
        this.#childEntityWalker.run(modelNode, absUrl.replace(/[\\.@]/g, '\\$&') + "@" + version);
        return modelNode;
    }

    #internalCloneEntityNode(srcNode, object3D) {
        const dstNode = new ThreejsEntityNode(new ThreejsEntity(object3D));
        dstNode.entity.materialRef = srcNode.entity.materialRef;
        if (srcNode.entity.materialRef) {
            dstNode.setComponent("1000", new ThreejsMaterialComponentNode(), false);
        }
        dstNode.entity.geometryRef = srcNode.entity.geometryRef;
        for (let i = 0; i < object3D.children.length; ++i) {
            dstNode.setChild(`${i}`, this.#internalCloneEntityNode(srcNode.getChild(i), object3D.children[i]));
        }
        return dstNode;
    }

    #cloneEntityNode(modelNode) {
        return this.#internalCloneEntityNode(modelNode, modelNode.entity.getInternalObject().clone());
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



class ThreejsGLTFLoaderComponentNode extends ObjectNode {
    /** @type {CachedGLTFLoader|null} */
    static #gltfLoader = null;

    /** @type {EntityNode|null} */
    #node;

    /** @type {VersionedNode} */
    #urlNode;

    /** @type {boolean} */
    #forceLoad;

    /** @type {SmartResource|null} */
    #resourceRef

    constructor() {
        super();
        this.#node = null;
        this.#urlNode = new VersionedNode("");
        this.#urlNode.onChanged = () => {this.#forceLoad = true};
        this.#forceLoad = false;
        this.#resourceRef = null;
        this._set("url", this.#urlNode);
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
            if (!ThreejsGLTFLoaderComponentNode.#gltfLoader) {
                const worldNode = getRoot(this.#node);
                ThreejsGLTFLoaderComponentNode.#gltfLoader = new CachedGLTFLoader(worldNode.geometryCache, worldNode.materialCache);
            }
            const result = await new Promise((resolve, reject) => {
                ThreejsGLTFLoaderComponentNode.#gltfLoader.load(new URL(this.#urlNode.value).href, (resourceRef) => resolve(resourceRef), reject, version);
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

    get component() {
        return this;
    }
}

export default ThreejsGLTFLoaderComponentNode;
