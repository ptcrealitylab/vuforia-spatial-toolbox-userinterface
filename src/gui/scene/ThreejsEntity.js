import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import GLTFLoaderComponentNode from "/objectDefaultFiles/scene/GLTFLoaderComponentNode.js";
import BaseEntity from "/objectDefaultFiles/scene/BaseEntity.js";
import ThreejsGLTFLoaderComponentStore from './ThreejsGLTFLoaderComponentStore.js';
import MaterialComponentNode from "/objectDefaultFiles/scene/MaterialComponentNode.js";
import ThreejsMaterialComponentStore from './ThreejsMaterialComponentStore.js';
import EntityStore from "/objectDefaultFiles/scene/EntityStore.js";
import EntityNode from "/objectDefaultFiles/scene/EntityNode.js";

/** 
 * @typedef {{update: (object3D = THREE.Object3D) => void}} ThreejsComponent
 * @typedef {import("./SmartResource.js").ResourceReference} ResourceReference
 */

class ThreejsEntity extends BaseEntity {
    /** @type {THREE.Object3D} */
    #object;

    /** @type {ResourceReference|null} */
    #geometryRef;

    /** @type {ResourceReference|null} */
    #materialRef;

    constructor(object, geometryRef = null, materialRef = null) {
        super();
        this.#object = object;
        this.#geometryRef = geometryRef;
        this.#materialRef = materialRef;
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
        const internalChild = child.getInternalObject();
        if (internalChild.parent !== this.#object) {
            this.#object.add(child.getInternalObject());
        }
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
        return new EntityNode(new EntityStore(new ThreejsEntity(obj)));
    }

    /**
     * @param {number} index
     * @param {ValueDict} state 
     * @returns {ComponentInterface}
     */
    createComponent(index, state) {
        if (state.hasOwnProperty("type")) {
            if (state.type === GLTFLoaderComponentNode.TYPE) {
                return new GLTFLoaderComponentNode(new ThreejsGLTFLoaderComponentStore());
            } else if (state.type === MaterialComponentNode.TYPE) {
                return new MaterialComponentNode(new ThreejsMaterialComponentStore());
            }
        }
        return null;
    }

    getGeometryRef() {
        return this.#geometryRef ? this.#geometryRef.copy() : null; 
    }

    setGeometryRef(geometryRef) {
        if (this.#geometryRef) {
            this.#geometryRef.release();
        }
        this.#geometryRef = geometryRef ? geometryRef.copy() : null;
    }

    getMaterialRef() {
        return this.#materialRef ? this.#materialRef.copy() : null; 
    }

    setMaterialRef(materialRef) {
        if (this.#materialRef) {
            this.#materialRef.release();
        }
        this.#materialRef = materialRef ? materialRef.copy() : null;
    }

    internalRelease() {
        if (this.#geometryRef) {
            this.#geometryRef.release();
        }
        this.#geometryRef = null;
        if (this.#materialRef) {
            this.#materialRef.release();
        }
        this.#materialRef = null;
    }

    /**
     * 
     */
    dispose() {
        this.#object.removeFromParent();
        this.release();
    }
}

export default ThreejsEntity;
