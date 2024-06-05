import SmartResource from "./SmartResource.js"

/**
 * @typedef {number} resourceVersion 
 */

class SmartResourceEntry extends SmartResource{
    /** @type {resourceVersion} */
    #version;

    /**
     * 
     * @param {*} resource 
     * @param {resourceVersion} version 
     */
    constructor(resource, version) {
        super(resource);
        this.#version = version;
    }

    /**
     * 
     * @returns {resourceVersion}
     */
    getVersion() {
        return this.#version;
    }
}

class ResourceReference {
    #version;
    #id;
    #resource;
    #cache;

    constructor(resource, id, version, cache) {
        this.#resource = resource;
        this.#id = id;
        this.#version = version;
        this.#cache = cache;
    }
    getVersion() {
        return this.#version;
    }

    getResource() {
        return this.#resource;
    }

    copy() {
        return this.#cache.getRef(this.#id);
    }

    release() {
        this.#cache.releaseRef(this.#id, this.#version);
    }
}

class SmartResourceCache {
    /** @type {{[key: string]: SmartResourceEntry[]}} */
    #cache;

    constructor() {
        this.#cache = {};
    }

    /**
     * 
     * @param {*} resource 
     * @param {string} id 
     * @returns {ResourceReference}
     */
    set(resource, id) {
        if (this.#cache.hasOwnProperty(id)) {
            const entry = this.#cache[id];
            const version = entry[entry.length - 1].getVersion() + 1;
            const smartRef = new SmartResourceEntry(resource, version);  
            entry.push(smartRef);
            return new ResourceReference(resource, id, version, this);
        } else {
            const smartRef = new SmartResourceEntry(resource, 0);
            this.#cache[id] = [smartRef];
            return new ResourceReference(resource, id, 0, this);
        }
    }

    /**
     * 
     * @param {string} id 
     * @returns {ResourceReference|undefined}
     */
    getRef(id) {
        if (this.#cache.hasOwnProperty(id)) {
            const entry = this.#cache[id];
            const smartRef = entry[entry.length - 1];
            return new ResourceReference(smartRef.getRef(), id, smartRef.getVersion(), this);
        } else {
            return undefined;
        }
    }

    /**
     * 
     * @param {string} id 
     * @param {resourceVersion} version 
     */
    releaseRef(id, version) {
        if (this.#cache.hasOwnProperty(id)) {
            const entry = this.#cache[id];
            for (let i = 0; i < entry.length; ++i) {
                if (entry[i].getVersion() == version) {
                    if (entry[i].releaseRef()) {
                        entry.splice(i, 1);
                        if (entry.length == 0) {
                            delete this.#cache[id];
                        }
                    }
                    return;
                }
            }
            console.error(`No such resource: ${id} with version: ${version}`);
        } else {
            console.error(`No such resource: ${id}`);
        }
    }
}

export default SmartResourceCache;
