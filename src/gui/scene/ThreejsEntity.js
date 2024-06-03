import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import GLTFLoaderComponentNode from "/objectDefaultFiles/scene/GLTFLoaderComponentNode.js";
import BaseEntity from "/objectDefaultFiles/scene/BaseEntity.js";
import ThreejsGLTFLoaderComponentStore from './ThreejsGLTFLoaderComponentStore.js';

/** @typedef {{update: (object3D = THREE.Object3D) => void}} ThreejsComponent */

class ThreejsEntity extends BaseEntity {
    /** @type {THREE.Object3D} */
    #object;

    constructor(object) {
        super();
        this.#object = object;
    }

    /**
     * 
     * @returns {THREE.Object3D}
     */
    getInternalObject() {
        return this.#object;
    }

    /**
     * 
     * @returns {Vector3Value}
     */
    getPosition() {
        return this.#object.position;
    }

    /**
     * 
     * @param {Vector3Value} position 
     */
    setPosition(position) {
        this.#object.position.set(position.x, position.y, position.z);
    }
    
    /**
     * 
     * @returns {QuaternionValue}
     */
    getRotation() {
        return this.#object.quaternion;
    }

    /**
     * 
     * @param {QuaternionValue} rotation 
     */
    setRotation(rotation) {
        this.#object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }

    /**
     * 
     * @returns {Vector3Value}
     */
    getScale() {
        return this.#object.scale;
    }

    /**
     * 
     * @param {Vector3Value} scale 
     */
    setScale(scale) {
        this.#object.scale.set(scale.x, scale.y, scale.z);
    }

    /**
     * 
     * @param {boolean} isVisible 
     */
    setVisible(isVisible) {
        this.#object.visible = isVisible;
    }

    /**
     * 
     * @returns {boolean}
     */
    isVisible() {
        return this.#object.visible;
    }

    /**
     * 
     * @param {string} key 
     * @param {ThreejsEntity} child 
     */
    setChild(key, child) {
        super.setChild(key, child);
        this.#object.add(child.getInternalObject());
    }

    /**
     * 
     * @param {string} key 
     */
    removeChild(key) {
        this.#object.remove(this.getChild(key).getInternalObject());
        super.removeChild(key);
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
     * @returns {ComponentInterface}
     */
    createComponent(state) {
        if (state.hasOwnProperty("type")) {
            if (state.type === GLTFLoaderComponentNode.TYPE) {
                return new GLTFLoaderComponentNode(new ThreejsGLTFLoaderComponentStore());
            }
        }
        return null;
    }

    /**
     * 
     */
    onDelete() {
        this.#object.removeFromParent();
    }
}

export default ThreejsEntity;
