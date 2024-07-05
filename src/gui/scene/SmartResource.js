/**
 * @typedef {{dispose: () => void}} Resource
 * @typedef {(resource) => void} safeFunc
 */

/**
 * @template {Resource} T
 */
class SmartResource {
    /** @type {SmartResourceAdmin<T>} */
    #admin;

    /** @type {T} */
    #resource;

    /**
     * 
     * @param {SmartResourceAdmin<T>} smartPointerAdmin 
     */
    constructor(smartPointerAdmin) {
        this.#admin = smartPointerAdmin;
        this.#resource = this.#admin.getRef();
    }

    /**
     * 
     * @param {T} resource 
     * @returns {SmartResource<T>}
     */
    static create(resource) {
        return new SmartResource(new SmartResourceAdmin(resource));
    }

    /**
     * 
     * @returns {SmartResource<T>}
     */
    copy() {
        return new SmartResource(this.#admin);
    }

    /**
     * 
     * @returns {T}
     */
    getResource() {
        return this.#resource;
    }

    /**
     * 
     */
    release() {
        this.#admin.releaseRef();
        this.#resource = null;
        this.#admin = null;
    }
}

/**
 * @template {Resource} T
 */
class SmartResourceAdmin {
    /** @type {number} */
    #refCount;

    /** @type {T} */
    #resource;

    /**
     * @param {T} resource
     */
    constructor(resource) {
        this.#resource = resource;
        this.#refCount = 0;
    }

    /**
     * 
     * @returns {T}
     */
    getWeakRef() {
        return this.#resource;
    }

    /**
     * 
     * @returns {T}
     */
    getRef() {
        this.#refCount++;
        /*if (this.#resource.id === "https://192\\.168\\.0\\.42:8080/frames/gltfExample/flagab\\.glb@0.Plane001@2." || this.#resource.id === "https://192\\.168\\.0\\.42:8080/frames/gltfExample/flagab\\.glb@0.Plane001@2.Material\\.003") {
            console.log(`resource ${this.#refCount} ${this.#resource.id}`);
            console.trace();
        }*/
        return this.#resource;
    }

    /**
     * 
     * @returns {boolean}
     */
    releaseRef() {
        this.#refCount--;
        /*if (this.#resource.id === "https://192\\.168\\.0\\.42:8080/frames/gltfExample/flagab\\.glb@0.Plane001@2." || this.#resource.id === "https://192\\.168\\.0\\.42:8080/frames/gltfExample/flagab\\.glb@0.Plane001@2.Material\\.003") {
            console.log(`resource ${this.#refCount} ${this.#resource.id}`);
            console.trace();
        }*/
        if (this.#refCount == 0) {
            this.#resource.dispose();
            return true;
        }
        return false;
    }
}

/** 
 * @template {Resource} T
 * @param {SmartResource<T>|null} resource  
 * @returns {null}
 */
function safeRelease(resource) {
    if (resource) {
        resource.release();
    }
    return null;
}

/**
 * @template {Resource} T
 * @param {SmartResource<T>|null} resource 
 * @param {safeFunc} func 
 */
function safeUsing(resource, func) {
    try {
        func(resource);
    } finally {
        safeRelease(resource);
    }
}

export {SmartResource, SmartResourceAdmin, safeRelease, safeUsing};
