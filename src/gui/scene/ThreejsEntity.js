import BaseEntity from "/objectDefaultFiles/scene/BaseEntity.js";
import { safeRelease } from "./SmartResource.js";

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
    get position() {
        return this.#object.position;
    }

    /**
     * 
     * @param {Vector3Value} position 
     */
    set position(position) {
        this.#object.position.set(position.x, position.y, position.z);
    }
    
    /**
     * 
     * @returns {QuaternionValue}
     */
    get rotation() {
        return this.#object.quaternion;
    }

    /**
     * 
     * @param {QuaternionValue} rotation 
     */
    set rotation(rotation) {
        this.#object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    }

    /**
     * 
     * @returns {Vector3Value}
     */
    get scale() {
        return this.#object.scale;
    }

    /**
     * 
     * @param {Vector3Value} scale 
     */
    set scale(scale) {
        this.#object.scale.set(scale.x, scale.y, scale.z);
    }

    /**
     * 
     * @param {boolean} isVisible 
     */
    set isVisible(isVisible) {
        this.#object.visible = isVisible;
    }

    /**
     * 
     * @returns {boolean}
     */
    get isVisible() {
        return this.#object.visible;
    }

    /**
     * 
     * @param {string} key 
     * @param {ThreejsEntity} child 
     */
    setChild(key, child) {
        super.setChild(key, child);
        const internalChild = child;
        if (internalChild.getInternalObject().parent !== this.#object) {
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
     * @returns {ResourceReference|null}
     */
    get geometryRef() {
        return this.#geometryRef; 
    }

    /**
     * @param {ResourceReference|null} geometryRef
     */
    set geometryRef(geometryRef) {
        this.#geometryRef = safeRelease(this.geometryRef);
        this.#geometryRef = geometryRef ? geometryRef.copy() : null;
    }

    /**
     * @returns {ReosurceReference|null}
     */
    get materialRef() {
        return this.#materialRef; 
    }

    /**
     * @param {ResourceReference} materialRef
     */
    set materialRef(materialRef) {
        this.#materialRef = safeRelease(this.materialRef); 
        this.#materialRef = materialRef ? materialRef.copy() : null;
    }

    internalRelease() {
        this.#geometryRef = safeRelease(this.geometryRef);
        this.#materialRef = safeRelease(this.materialRef);
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
