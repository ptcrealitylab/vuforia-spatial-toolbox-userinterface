import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import ObjectStore from "../../../objectDefaultFiles/scene/ObjectStore.js";
import ValueNode from "../../../objectDefaultFiles/scene/ValueNode.js";
import TriggerValueStore from "../../../objectDefaultFiles/scene/TriggerValueStore.js";
import ColorNode from "../../../objectDefaultFiles/scene/ColorNode.js";
import TriggerColorStore from "../../../objectDefaultFiles/scene/TriggerColorStore.js";
import EulerAnglesNode from "../../../objectDefaultFiles/scene/EulerAnglesNode.js";
import TriggerEulerAnglesStore from "../../../objectDefaultFiles/scene/TriggerEulerAnglesStore.js";
import Vector2Node from "../../../objectDefaultFiles/scene/Vector2Node.js";
import TriggerVector2Store from "../../../objectDefaultFiles/scene/TriggerVector2Store.js";
import TextureNode from "../../../objectDefaultFiles/scene/TextureNode.js";
import ThreejsTriggerTextureStore from "./ThreejsTriggerTextureStore.js";
import {getRoot} from "./utils.js";
import DictionaryNode from "../../../objectDefaultFiles/scene/DictionaryNode.js";
import DictionaryStore from "../../../objectDefaultFiles/scene/DictionaryStore.js";
import {safeRelease} from "./SmartResource.js";

/**
 * @typedef {import("./Renderer.js").TextureCache} TextureCache
 * @typedef {import("./Renderer.js").MaterialCache} MaterialCache
 * @typedef {import("./SmartResourceCache.js").resourceId} resourceId
 */

class ThreejsMaterialComponentStore extends ObjectStore {
    /** @type {ValueNode} */
    #materialIdNode;

    /** @type {DictionaryNode} */
    #propertiesNode;

    /** @type {EntityNode} */
    #node;

    /** @type {boolean} */
    #entityNeedsUpdate;

    /** @type {MaterialCache|null} */
    #cache;

    /** @type {boolean} */
    #nodeChanged;

    /** @type {string[]} */
    #changedProperties;

    /** @type {TextureCache|null} */
    #textureCache;

    /**
     * 
     */
    constructor() {
        super();
        this.#materialIdNode = new ValueNode(new TriggerValueStore(() => {this.#entityNeedsUpdate = true;}, ""));
        this.#propertiesNode = new DictionaryNode(new DictionaryStore());
        this.#entityNeedsUpdate = false;
        this.#cache = null;
        this.#node = null;
        this.#nodeChanged = false; 
        this.#changedProperties = [];
        this.#textureCache = null;
    }

    /**
     * 
     * @returns
     */
    getProperties() {
        return {
            "material": this.#materialIdNode,
            "properties": this.#propertiesNode
        };
    }

    /**
     * @param {EntityNode} node
     */
    setEntityNode(node) {
        this.#node = node;
        this.#nodeChanged = true;
    }

    #addColor(entity, propertyName) {
        this.#propertiesNode.set(propertyName, new ColorNode(new TriggerColorStore(() => {this.#changedProperties.push(propertyName);}, entity.material[propertyName])));
    }
    
    #addEulerAngles(entity, propertyName) {
        this.#propertiesNode.set(propertyName, new EulerAnglesNode(new TriggerEulerAnglesStore(() => {this.#changedProperties.push(propertyName);}, entity.material[propertyName])));
    } 

    #addTexture(entity, propertyName) {
        let textureRef = null;
        /** @type {resourceId} */
        const textureData = {id: null, mapping: THREE.UVMapping, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, anisotropy: 1};
        if (entity.material[propertyName]) {
            const texture = entity.material[propertyName];
            if (texture.userData.hasOwnProperty("toolboxId")) {
                textureData.id = texture.userData.toolboxId;
                textureRef = this.#textureCache.get(textureData.id);
            } else {
                textureData.id = `${this.#materialIdNode.get()}.${propertyName.replace(/[\\.@]/g, "\\$&")}.${texture.name.replace(/[\\.@]/g, "\\$&")}`;
                texture.userData.toolboxId = textureData.id;
                textureRef = this.#textureCache.insert(textureData.id, texture);
            }
            textureData.mapping = texture.mapping;
            textureData.wrapS = texture.wrapS;
            textureData.wrapT = texture.wrapT;
            textureData.magFilter = texture.magFilter;
            textureData.minFilter = texture.minFilter;
            textureData.anisotropy = texture.anisotropy;
        }
        this.#propertiesNode.set(propertyName, new TextureNode(new ThreejsTriggerTextureStore(() => {this.#changedProperties.push(propertyName);}, textureData, this.#textureCache)))
        safeRelease(textureRef);
    }

    #addValue(entity, propertyName) {
        this.#propertiesNode.set(propertyName, new ValueNode(new TriggerValueStore(() => {this.#changedProperties.push(propertyName);}, entity.material[propertyName])));
    } 

    #addVector2(entity, propertyName) {
        this.#propertiesNode.set(propertyName, new Vector2Node(new TriggerVector2Store(() => {this.#changedProperties.push(propertyName);}, entity.material[propertyName])));
    } 

    update() {
        if (!this.#cache) {
            const worldStore = getRoot(this.#node).getListener();
            this.#cache = worldStore.getMaterialCache();
        }
        if (!this.#textureCache) {
            const worldStore = getRoot(this.#node).getListener();
            this.#textureCache = worldStore.getTextureCache();
        }
        if (this.#entityNeedsUpdate) {
            this.#entityNeedsUpdate = false;   
            const materialRef = this.#cache.get(this.#materialIdNode.get());
            if (materialRef) {
                const entityNode = this.#node.getEntity();
                const entity = entityNode.getInternalObject();
                const material = materialRef.getResource().getResource();
                entity.material = material;
                entityNode.setMaterialRef(materialRef);
                if (material instanceof THREE.MeshStandardMaterial) {
                    // Material
                    this.#addValue(entity, "alphaTest");
                    this.#addValue(entity, "alphaToCoverage");
                    this.#addValue(entity, "blendDst");
                    this.#addValue(entity, "blendDstAlpha");
                    this.#addValue(entity, "blendEquation");
                    this.#addValue(entity, "blendEquationAlpha");
                    this.#addValue(entity, "blending");
                    this.#addValue(entity, "blendSrc");
                    this.#addValue(entity, "blendSrcAlpha");
                    this.#addValue(entity, "clipIntersection");
                    this.#addValue(entity, "clipShadows");
                    this.#addValue(entity, "colorWrite");
                    this.#addValue(entity, "depthFunc");
                    this.#addValue(entity, "depthTest");
                    this.#addValue(entity, "depthWrite");
                    this.#addValue(entity, "stencilWrite");
                    this.#addValue(entity, "stencilWriteMask");
                    this.#addValue(entity, "stencilFunc");
                    this.#addValue(entity, "stencilRef");
                    this.#addValue(entity, "stencilFuncMask");
                    this.#addValue(entity, "stencilFail");
                    this.#addValue(entity, "stencilZFail");
                    this.#addValue(entity, "stencilZPass");
                    this.#addValue(entity, "opacity");
                    this.#addValue(entity, "polygonOffset");
                    this.#addValue(entity, "polygonOffsetFactor");
                    this.#addValue(entity, "polygonOffsetUnits");
                    this.#addValue(entity, "precision");
                    this.#addValue(entity, "premultipliedAlpha");
                    this.#addValue(entity, "dithering");
                    this.#addValue(entity, "shadowSide");
                    this.#addValue(entity, "side");
                    this.#addValue(entity, "toneMapped");
                    this.#addValue(entity, "transparent");
                    this.#addValue(entity, "vertexColors");
                    this.#addValue(entity, "visible");

                    // MeshStandardMaterial
                    
                    this.#addTexture(entity, "aoMap");
                    this.#addValue(entity, "aoMapIntensity");
                    this.#addTexture(entity, "bumpMap");
                    this.#addValue(entity, "bumpScale");
                    this.#addColor(entity, "color");
                    this.#addTexture(entity, "displacementMap");
                    this.#addValue(entity, "displacementScale");
                    this.#addValue(entity, "displacementBias");
                    this.#addColor(entity, "emissive");
                    this.#addTexture(entity, "emissiveMap");
                    this.#addValue(entity, "emissiveIntensity");
                    this.#addTexture(entity, "envMap");
                    this.#addEulerAngles(entity, "envMapRotation");
                    this.#addValue(entity, "envMapIntensity");
                    this.#addValue(entity, "flatShading");
                    this.#addValue(entity, "fog");
                    this.#addTexture(entity, "lightMap");
                    this.#addValue(entity, "lightMapIntensity");
                    this.#addTexture(entity, "map");
                    this.#addValue(entity, "metalness");
                    this.#addTexture(entity, "metalnessMap");
                    this.#addTexture(entity, "normalMap");
                    this.#addValue(entity, "normalMapType");
                    this.#addVector2(entity, "normalScale");
                    this.#addValue(entity, "roughness");
                    this.#addTexture(entity, "roughnessMap");
                    this.#addValue(entity, "wireframe");
                    this.#addValue(entity, "wireframeLinecap");
                    this.#addValue(entity, "wireframeLinejoin");
                    this.#addValue(entity, "wireframeLinewidth");
                }
                materialRef.release();
            }
        } else if (this.#nodeChanged) {
            this.#nodeChanged = false;
            const entity = this.#node.getEntity();
            const materialRef = entity.getMaterialRef();
            this.#materialIdNode.set(materialRef.getResource().getId());
        }
        for (const change of this.#changedProperties) {
            const material = this.#node.getEntity().getInternalObject().material;
            if (material[change] instanceof THREE.Color) {
                material[change].copy(this.#propertiesNode.get(change).getValue());
            } else if (material[change] instanceof THREE.Euler) {
                material[change].copy(this.#propertiesNode.get(change).getValue());
            } else if (material[change] instanceof THREE.Texture) {
                material[change] = this.#propertiesNode.get(change).getListener().swapAndGetTexture();
            } else if (typeof material[change] === "number") {
                material[change] = this.#propertiesNode.get(change).get();
            }
        }
        this.#changedProperties = [];
    }

    release() {
        const properties = this.#propertiesNode.values();
        for (let property of properties) {
            if (property.release) {
                property.release();
            }
        }
    }
}

export default ThreejsMaterialComponentStore;
