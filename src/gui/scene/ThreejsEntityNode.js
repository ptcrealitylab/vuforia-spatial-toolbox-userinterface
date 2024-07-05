import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import BaseEntityNode from '../../../objectDefaultFiles/scene/BaseEntityNode.js';
import ThreejsEntity from "./ThreejsEntity.js";
import GLTFLoaderComponentNode from "/objectDefaultFiles/scene/GLTFLoaderComponentNode.js";
import ThreejsGLTFLoaderComponentNode from './ThreejsGLTFLoaderComponentNode.js';
import MaterialComponentNode from "/objectDefaultFiles/scene/MaterialComponentNode.js";
import ThreejsMaterialComponentNode from './ThreejsMaterialComponentNode.js';

class ThreejsEntityNode extends BaseEntityNode {
    /**
     * @param {ThreejsEntity} entity
     * @param {string} type
     */
    constructor(entity, type) {
        super(entity, type);
    }

    /**
     * @param {string} _key
     * @param {string} name 
     * @returns {ThreejsEntity}
     */
    createEntity(_key, name) {
        const obj = new THREE.Object3D();
        obj.name = name; 
        return new ThreejsEntityNode(new ThreejsEntity(obj));
    }

    /**
     * @param {number} _index
     * @param {ValueDict} state 
     * @returns {ComponentInterface}
     */
    createComponent(_index, state) {
        if (state.hasOwnProperty("type")) {
            if (state.type === GLTFLoaderComponentNode.TYPE) {
                return new ThreejsGLTFLoaderComponentNode();
            } else if (state.type === MaterialComponentNode.TYPE) {
                return new ThreejsMaterialComponentNode();
            }
        }
        return null;
    }

    dispose() {
        this.entity.dispose();
    }
}

export default ThreejsEntityNode;
