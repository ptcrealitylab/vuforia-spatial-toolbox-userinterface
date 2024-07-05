import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import TextureNode from "../../../../objectDefaultFiles/scene/TextureNode.js";
import {safeRelease} from "./SmartResource.js";

/**
 * @typedef {import("../../../thirdPartyCode/three/three.module.js").Texture} Texture
 * @typedef {import("./Renderer.js").TextureCache} TextureCache
 * @typedef {import("./Renderer.js").TextureRef} TextureRef
 * @typedef {import("../../../objectDefaultFiles/scene/TextureNode.js").TextureValue} TextureValue
 */

class ThreejsTextureNode extends TextureNode {
    /** @type {TextureCache} */
    #cache;

    /** @type {TextureRef|null} */
    #oldRef;

    /** @type {TextureRef|null} */
    #newRef;

    /**
     * 
     * @param {TextureValue} value 
     * @param {TextureCache} cache 
     */
    constructor(value = {id: null, mapping: THREE.UVMapping, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, anisotropy: 1}, cache) {
        super(value);
        this.#cache = cache;
        this.#oldRef = null;
        if (value.id) {
            const ref = this.#cache.get(value.id);
            if (ref) {
                this.#newRef = ref;
            } else {
                this.#newRef = null;
            }
        } else {
            this.#newRef = null;
        }
    }

    /**
     * @override
     * @param {ObjectNodeDelta} delta
     */
    setChanges(delta) {
        if (delta.hasOwnProperty("protperties") && delta.properties.hasOwnProperty("id")) {
            if (!this.#oldRef) {
                this.#oldRef = this.#newRef;
                this.#newRef = null;
            }
            this.#newRef = safeRelease(this.#newRef);
            if (delta.properties.id) {
                const ref = this.#cache.get(delta.properties.id);
                if (ref) {
                    this.#newRef = ref;
                } else {
                    this.#newRef = null;
                }
            }
        }
        super.setChanges(delta);
    }


    /**
     * 
     * @returns {Texture|null}
     */
    swapAndGetTexture() {
        this.#oldRef = safeRelease(this.#oldRef);
        if (this.#newRef) {
            return this.#newRef.getResource().getResource();
        } else {
            return null;
        }
    }

    /**
     * 
     */
    release() {
        this.#oldRef = safeRelease(this.#oldRef);
        this.#newRef = safeRelease(this.#newRef);
        this.cache = null;
    }
}

export default ThreejsTextureNode;
