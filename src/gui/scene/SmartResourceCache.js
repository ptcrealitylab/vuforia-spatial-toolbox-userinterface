import {SmartResource, SmartResourceAdmin, safeUsing} from "./SmartResource.js";

/**
 * @typedef {import("./SmartResource.js").Resource} Resource
 * @typedef {number} resourceVersion 
 * @typedef {string} resourceId
 */

/**
 * @template {Resource} T
 */
class ResourceEntry {
    /** @type {resourceVersion} */
    #version;

    /** @type {T} */
    #resource;

    /** @type {ResourceCache<T>} */
    #cache;

    /** @type {resourceId} */
    #id;

    /**
     * 
     * @param {ResourceCache<T>} cache
     * @param {resourceId} id  
     * @param {T} resource 
     * @param {resourceVersion} version 
     */
    constructor(cache, id, resource, version) {
        this.#cache = cache;
        this.#id = id;
        this.#resource = resource;
        this.#version = version;
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
     * @returns {resourceVersion}
     */
    getVersion() {
        return this.#version;
    }

    /**
     * 
     * @returns {resourceId}
     */
    get id() {
        return this.#id;
    }

    /**
     * 
     */
    dispose() {
        this.#cache.remove(this.#id, this.#version);
        if (this.#resource.dispose) {
            this.#resource.dispose();
        }
        this.#id = null;
        this.#version = -1;
        this.#resource = null;
        this.#cache = null;
    }
}

/**
 * @template {Resource} T
 */
class ResourceCache {
    /** @type {{[key: resourceId]: SmartResourceAdmin<ResourceEntry<T>>[]}} */
    #cache;

    /** @type {string} */
    #name;

    /**
     * @param {string} name 
     */
    constructor(name) {
        this.#cache = {};
        this.#name = name;
    }

    /**
     * 
     * @param {SmartResourceAdmin<ResourceEntry<T>>[]} entry 
     * @returns {resourceVersion}
     */
    #getCurrentVersion(entry) {
        let version = -1;
        safeUsing(new SmartResource(entry[entry.length - 1]), (currentResource) => {
            version = currentResource.getResource().getVersion() + 1;
        });
        return version;
    }

    /**
     * 
     * @param {resourceId} id 
     * @param {T} resource 
     * @returns {SmartResource<ResourceEntry<T>>}
     */
    insert(id, resource) {
        if (this.#cache.hasOwnProperty(id)) {
            const entry = this.#cache[id];
            const version = this.#getCurrentVersion(entry) + 1;
            const smartAdmin = new SmartResourceAdmin(new ResourceEntry(this, id, resource, version));  
            entry.push(smartAdmin);
            return new SmartResource(smartAdmin);
        } else {
            const smartAdmin = new SmartResourceAdmin(new ResourceEntry(this, id, resource, 0));
            this.#cache[id] = [smartAdmin];
            console.log(`${this.#name} ${Object.keys(this.#cache).length} ${id}`);
            return new SmartResource(smartAdmin);
        }
    }

    /**
     * 
     * @param {resourceId} id 
     * @param {resourceVersion} version  
     * @returns {SmartResource<ResourceEntry<T>>|undefined}
     */
    get(id, version = null) {
        if (this.#cache.hasOwnProperty(id)) {
            const entry = this.#cache[id];
            let smartAdmin = entry[entry.length - 1];
            if (version) {
                for (const adminEntry of entry) {
                    if (adminEntry.getResource().getVersion() === version) {
                        smartAdmin = adminEntry;
                        break;
                    }
                }
            }
            return new SmartResource(smartAdmin);
        } else {
            return undefined;
        }
    }

    /**
     * 
     * @param {resourceId} id 
     * @param {resourceVersion} version 
     */
    remove(id, version) {
        if (this.#cache.hasOwnProperty(id)) {
            const entry = this.#cache[id];
            for (let index = 0; index < entry.length; ++index) {
                if (entry[index].getWeakRef().getVersion() === version) {
                    entry.splice(index, 1);
                    if (entry.length == 0) {
                        delete this.#cache[id];
                    } 
                    console.log(`${this.#name} ${Object.keys(this.#cache).length} ${id}`);
                    return;
                }
            }
            console.error(`${this.#name} No such resource: ${id} with version: ${version}`);
        } else {
            console.error(`${this.#name} No such resource: ${id}`);
        }
    }
}

export {ResourceCache, ResourceEntry};
