import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import GLTFLoaderComponentNode from "/objectDefaultFiles/scene/GLTFLoaderComponentNode.js";
import ThreejsGLTFLoaderComponentStore from './ThreejsGLTFLoaderComponentStore.js';

/** @typedef {{update: (object3D = THREE.Object3D) => void}} ThreejsComponent */

class ThreejsEntity {
    /** @type {THREE.Object3D} */
    #object;

    /** @type {{order: number, component: ThreejsComponent}[]} */
    #components

    constructor(object) {
        this.#object = object;
        this.#components = [];
    }

    /**
     * 
     * @returns {THREE.Object3D}
     */
    getInternalObject() {
        return this.#object;
    }

    getPosition() {
        return this.#object.position;
    }

    setPosition(position) {
        this.#object.position.set(position.x, position.y, position.z);
    }
    
    getRotation() {
        return this.#object.quaternion;
    }

    setRotation(rotation) {
        this.#object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }

    getScale() {
        return this.#object.scale;
    }

    setScale(scale) {
        this.#object.scale.set(scale.x, scale.y, scale.z);
    }

    updateMatrix() {
        this.#object.updateMatrix();
    }

    /**
     * 
     * @param {number} order 
     * @param {ThreejsComponent} component 
     * @returns 
     */
    setComponent(order, component) {
        for (let i = 0; i < this.#components.length; i++) {
            if (this.#components[i].order > order) {
                this.#components.splice(i, 0, {order, component});
                return;
            }
        }
        this.#components.push({order, component});
    }

    /**
     * 
     * @param {number} order 
     */
    removeComponent(order) {
        for (let i = 0; i < this.#components.length; i++) {
            if (this.#components[i].order == order) {
                delete this.#components[i];
            }
        }
    }

    /**
     * 
     */
    updateComponents() {
        for (let entry of this.#components) {
            entry.component.update(this.#object);
        }
    }

    /**
     * 
     * @param {ThreejsEntity|THREE.Object3D} child 
     */
    setChild(_key, child) {
        if (child instanceof ThreejsEntity) {
            this.#object.add(child.getInternalObject());
        } else {
            this.#object.add(child);
        }
    }

    /**
     * 
     * @param {string} name 
     * @returns {ThreejsEntity}
     */
    createEntity(name) {
        const obj = new THREE.Object3D();
        obj.name = name; 
        return new ThreejsEntity(obj);
    }

    /**
     * 
     * @param {ValueDict} state 
     * @param {EntityNode} node 
     * @returns {ComponentInterface}
     */
    createComponent(state, node) {
        if (state.hasOwnProperty("type")) {
            if (state.type === GLTFLoaderComponentNode.TYPE) {
                return new GLTFLoaderComponentNode(new ThreejsGLTFLoaderComponentStore(this, node));
            }
        }
        return null;
    }
}

export default ThreejsEntity;
