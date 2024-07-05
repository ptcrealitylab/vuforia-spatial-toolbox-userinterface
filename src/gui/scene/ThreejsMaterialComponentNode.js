import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import ObjectNode from "../../../objectDefaultFiles/scene/ObjectNode.js";
import ValueNode from "../../../objectDefaultFiles/scene/ValueNode.js";
import ColorNode from "../../../objectDefaultFiles/scene/ColorNode.js";
import EulerAnglesNode from "../../../objectDefaultFiles/scene/EulerAnglesNode.js";
import Vector2Node from "../../../objectDefaultFiles/scene/Vector2Node.js";
import {getRoot} from "./utils.js";
import DictionaryNode from "../../../objectDefaultFiles/scene/DictionaryNode.js";
import {safeRelease, safeUsing} from "./SmartResource.js";
import ThreejsTextureNode from './ThreejsTextureNode.js';
import MaterialComponentNode from '../../../objectDefaultFiles/scene/MaterialComponentNode.js';

/**
 * @typedef {import("./Renderer.js").TextureCache} TextureCache
 * @typedef {import("./Renderer.js").MaterialCache} MaterialCache
 * @typedef {import("./SmartResourceCache.js").resourceId} resourceId
 */

class ThreejsMaterialComponentNode extends ObjectNode {
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
        super(MaterialComponentNode.TYPE);
        this.#materialIdNode = new ValueNode("");
        this.#materialIdNode.onChanged = () => {this.#entityNeedsUpdate = true;};
        this.#propertiesNode = new DictionaryNode();
        this.#entityNeedsUpdate = false;
        this.#cache = null;
        this.#node = null;
        this.#nodeChanged = false; 
        this.#changedProperties = [];
        this.#textureCache = null;
        this._set("material", this.#materialIdNode);
        this._set("properties", this.#propertiesNode);
    }

    /**
     * @param {EntityNode} node
     */
    setEntityNode(node) {
        this.#node = node;
        this.#nodeChanged = true;
    }

    #addColor(object3D, propertyName) {
        const color = new ColorNode(object3D.material[propertyName]);
        color.onChanged = (_node) => {this.#changedProperties.push(propertyName);};
        this.#propertiesNode.set(propertyName, color);
    }
    
    #addEulerAngles(object3D, propertyName) {
        const eulerAngles = new EulerAnglesNode(object3D.material[propertyName]);
        eulerAngles.onChanged = (_node) => {this.#changedProperties.push(propertyName);};
        this.#propertiesNode.set(propertyName, eulerAngles);
    } 

    #addTexture(object3D, propertyName) {
        let textureRef = null;
        /** @type {resourceId} */
        const textureData = {id: null, mapping: THREE.UVMapping, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, anisotropy: 1};
        if (object3D.material[propertyName]) {
            const texture = object3D.material[propertyName];
            if (texture.userData.hasOwnProperty("toolboxId")) {
                textureData.id = texture.userData.toolboxId;
                textureRef = this.#textureCache.get(textureData.id);
            } else {
                textureData.id = `${this.#materialIdNode.value}.${propertyName.replace(/[\\.@]/g, "\\$&")}.${texture.name.replace(/[\\.@]/g, "\\$&")}`;
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
        const textureNode = new ThreejsTextureNode(textureData, this.#textureCache);
        textureNode.onChanged = () => {this.#changedProperties.push(propertyName);};
        this.#propertiesNode.set(propertyName, textureNode);
        safeRelease(textureRef);
    }

    #addValue(object3D, propertyName) {
        const value = new ValueNode(object3D.material[propertyName]);
        value.onChanged = () => {this.#changedProperties.push(propertyName);};
        this.#propertiesNode.set(propertyName, value);
    } 

    #addVector2(object3D, propertyName) {
        const vector2 = new Vector2Node(object3D.material[propertyName]);
        vector2.onChanged = () => {this.#changedProperties.push(propertyName);};
        this.#propertiesNode.set(propertyName, vector2);
    } 

    update() {
        if (!this.#cache) {
            const worldNode = getRoot(this.#node);
            this.#cache = worldNode.materialCache;
        }
        if (!this.#textureCache) {
            const worldNode = getRoot(this.#node);
            this.#textureCache = worldNode.textureCache;
        }
        if (this.#entityNeedsUpdate || this.#nodeChanged) {
            this.#entityNeedsUpdate = false; 
            const entityNode = this.#node;
            const entity = entityNode.entity;
            const object3D = entity.getInternalObject();
            if (this.#nodeChanged) {
                this.#nodeChanged = false;
                this.#materialIdNode.value = entity.materialRef.getResource().id;
            }
            safeUsing(this.#cache.get(this.#materialIdNode.value), (ref) => {
                entity.materialRef = ref;
            });
            if (entity.materialRef) {
                object3D.material = entity.materialRef.getResource().getResource();
                if (object3D.material instanceof THREE.MeshStandardMaterial) {
                    // Material
                    this.#addValue(object3D, "alphaTest");
                    this.#addValue(object3D, "alphaToCoverage");
                    this.#addValue(object3D, "blendDst");
                    this.#addValue(object3D, "blendDstAlpha");
                    this.#addValue(object3D, "blendEquation");
                    this.#addValue(object3D, "blendEquationAlpha");
                    this.#addValue(object3D, "blending");
                    this.#addValue(object3D, "blendSrc");
                    this.#addValue(object3D, "blendSrcAlpha");
                    this.#addValue(object3D, "clipIntersection");
                    this.#addValue(object3D, "clipShadows");
                    this.#addValue(object3D, "colorWrite");
                    this.#addValue(object3D, "depthFunc");
                    this.#addValue(object3D, "depthTest");
                    this.#addValue(object3D, "depthWrite");
                    this.#addValue(object3D, "stencilWrite");
                    this.#addValue(object3D, "stencilWriteMask");
                    this.#addValue(object3D, "stencilFunc");
                    this.#addValue(object3D, "stencilRef");
                    this.#addValue(object3D, "stencilFuncMask");
                    this.#addValue(object3D, "stencilFail");
                    this.#addValue(object3D, "stencilZFail");
                    this.#addValue(object3D, "stencilZPass");
                    this.#addValue(object3D, "opacity");
                    this.#addValue(object3D, "polygonOffset");
                    this.#addValue(object3D, "polygonOffsetFactor");
                    this.#addValue(object3D, "polygonOffsetUnits");
                    this.#addValue(object3D, "precision");
                    this.#addValue(object3D, "premultipliedAlpha");
                    this.#addValue(object3D, "dithering");
                    this.#addValue(object3D, "shadowSide");
                    this.#addValue(object3D, "side");
                    this.#addValue(object3D, "toneMapped");
                    this.#addValue(object3D, "transparent");
                    this.#addValue(object3D, "vertexColors");
                    this.#addValue(object3D, "visible");

                    // MeshStandardMaterial
                    
                    this.#addTexture(object3D, "aoMap");
                    this.#addValue(object3D, "aoMapIntensity");
                    this.#addTexture(object3D, "bumpMap");
                    this.#addValue(object3D, "bumpScale");
                    this.#addColor(object3D, "color");
                    this.#addTexture(object3D, "displacementMap");
                    this.#addValue(object3D, "displacementScale");
                    this.#addValue(object3D, "displacementBias");
                    this.#addColor(object3D, "emissive");
                    this.#addTexture(object3D, "emissiveMap");
                    this.#addValue(object3D, "emissiveIntensity");
                    this.#addTexture(object3D, "envMap");
                    this.#addEulerAngles(object3D, "envMapRotation");
                    this.#addValue(object3D, "envMapIntensity");
                    this.#addValue(object3D, "flatShading");
                    this.#addValue(object3D, "fog");
                    this.#addTexture(object3D, "lightMap");
                    this.#addValue(object3D, "lightMapIntensity");
                    this.#addTexture(object3D, "map");
                    this.#addValue(object3D, "metalness");
                    this.#addTexture(object3D, "metalnessMap");
                    this.#addTexture(object3D, "normalMap");
                    this.#addValue(object3D, "normalMapType");
                    this.#addVector2(object3D, "normalScale");
                    this.#addValue(object3D, "roughness");
                    this.#addTexture(object3D, "roughnessMap");
                    this.#addValue(object3D, "wireframe");
                    this.#addValue(object3D, "wireframeLinecap");
                    this.#addValue(object3D, "wireframeLinejoin");
                    this.#addValue(object3D, "wireframeLinewidth");
                }
            }
        } 
        for (const change of this.#changedProperties) {
            const material = this.#node.getEntity().getInternalObject().material;
            if (material[change] instanceof THREE.Color) {
                material[change].copy(this.#propertiesNode.get(change).value);
            } else if (material[change] instanceof THREE.Euler) {
                material[change].copy(this.#propertiesNode.get(change).value);
            } else if (material[change] instanceof THREE.Texture) {
                material[change] = this.#propertiesNode.get(change).swapAndGetTexture();
            } else if (typeof material[change] === "number") {
                material[change] = this.#propertiesNode.get(change).value;
            }
        }
        this.#changedProperties = [];
    }

    release() {
        const properties = this.#propertiesNode.values();
        for (let property of properties) {
            if (property && property.release) {
                property = safeRelease(property);
            }
        }
    }

    get component() {
        return this;
    }
}

export default ThreejsMaterialComponentNode;
