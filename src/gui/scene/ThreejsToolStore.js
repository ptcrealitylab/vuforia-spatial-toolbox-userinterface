import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import BaseEntityStore from "/objectDefaultFiles/scene/BaseEntityStore.js"
import EntityNode from "/objectDefaultFiles/scene/EntityNode.js";
import ThreejsEntityStore from "./ThreejsEntityStore.js";
import ThreejsEntity from "./ThreejsEntity.js";
import GLTFLoaderComponentNode from "/objectDefaultFiles/scene/GLTFLoaderComponentNode.js";
import ThreejsGLTFLoaderComponentStore from './ThreejsGLTFLoaderComponentStore.js';
import MaterialComponentNode from "/objectDefaultFiles/scene/MaterialComponentNode.js";
import ThreejsMaterialComponentStore from './ThreejsMaterialComponentStore.js';

/**
 * @typedef {import("./ToolManager.js").ToolProxy} ToolProxy
 */

class ThreejsToolStore extends BaseEntityStore {
    /** @type {ToolProxy} */
    #toolProxy;

    /**
     * 
     * @param {ToolProxy} toolProxy 
     */
    constructor(toolProxy) {
        super(toolProxy.getEntity());
        this.#toolProxy = toolProxy;
    }

    /**
     * @param {string} _key
     * @param {string} name 
     * @returns {ThreejsEntity}
     */
    createEntity(_key, name) {
        const obj = new THREE.Object3D();
        obj.name = name; 
        return new EntityNode(new ThreejsEntityStore(new ThreejsEntity(obj)));
    }

    /**
     * @param {number} _index
     * @param {ValueDict} state 
     * @returns {ComponentInterface}
     */
    createComponent(_index, state) {
        if (state.hasOwnProperty("type")) {
            if (state.type === GLTFLoaderComponentNode.TYPE) {
                return new GLTFLoaderComponentNode(new ThreejsGLTFLoaderComponentStore());
            } else if (state.type === MaterialComponentNode.TYPE) {
                return new MaterialComponentNode(new ThreejsMaterialComponentStore());
            }
        }
        return null;
    }
}

export default ThreejsToolStore;
