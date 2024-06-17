import TriggerTextureStore from "../../../objectDefaultFiles/scene/TriggerTextureStore.js";
import {safeRelease} from "./SmartResource.js";

/**
 * @typedef {import("../../../thirdPartyCode/three/three.module.js").Texture} Texture
 * @typedef {import("./Renderer.js").TextureCache} TextureCache
 * @typedef {import("./Renderer.js").TextureRef} TextureRef
 * @typedef {import("../../../objectDefaultFiles/scene/TriggerTextureStore.js").onChangedFunc} onChangedFunc
 * @typedef {import("../../../objectDefaultFiles/scene/TextureNode.js").TextureValue} TextureValue
 */

class ThreejsTriggerTextureStore extends TriggerTextureStore {
    /** @type {TextureCache} */
    #cache;

    /** @type {TextureRef|null} */
    #oldRef;

    /** @type {TextureRef|null} */
    #newRef;

    /**
     * 
     * @param {onChangedFunc} onChanged 
     * @param {TextureValue} value 
     * @param {TextureCache} cache 
     */
    constructor(onChanged, value = {id: null}, cache) {
        super(onChanged, value);
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
     * @param {(delta: ObjectNodeDelta) => void} defaultApplyChanges
     */
    applyChanges(delta, defaultApplyChanges) {
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
        super.applyChanges(delta, defaultApplyChanges);
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

export default ThreejsTriggerTextureStore;
