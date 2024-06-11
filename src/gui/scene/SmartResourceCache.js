import {SmartResource, SmartResourceAdmin} from "./SmartResource.js"

/**
 * @typedef {number} resourceVersion 
 */

class ResourceEntry {
    /** @type {resourceVersion} */
    #version;

    /** @type {any} */
    #resource;

    /** @type {SmartResourceCache} */
    #cache;

    /** @type {string} */
    #id;

    /**
     * 
     * @param {any} resource 
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
     * @returns {any}
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

    getId() {
        return this.#id;
    }

    dispose() {
        this.#cache.remove(this.#id, this.#version);
        if (this.#resource.dispose) {
            this.#resource.dispose();
        }
    }
}

class ResourceCache {
    /** @type {{[key: string]: SmartResourceAdmin[]}} */
    #cache;

    #name;

    constructor(name) {
        this.#cache = {};
        this.#name = name;
    }

    #getCurrentVersion(entry) {
        let currentVersion = new SmartResource(entry[entry.length - 1]);
        const version = currentVersion.getResource().getVersion() + 1;
        currentVersion.release();
        return version;
    }

    /**
     * 
     * @param {*} resource 
     * @param {string} id 
     * @returns {SmartResource}
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
            return new SmartResource(smartAdmin);
        }
    }

    /**
     * 
     * @param {string} id 
     * @returns {SmartResource|undefined}
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
     * @param {string} id 
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
                    return;
                }
            }
            console.error(`${this.#name} No such resource: ${id} with version: ${version}`);
        } else {
            console.error(`${this.#name} No such resource: ${id}`);
        }
    }
}

export default ResourceCache;
