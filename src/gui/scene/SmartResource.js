class SmartResource {
    /** @type {number} */
    #refCount;

    /** @type {any} */
    #resource;

    constructor(resource) {
        this.#resource = resource;
        this.#refCount = 1;
    }

    /**
     * 
     * @returns {any}
     */
    getRef() {
        this.#refCount++;
        return this.#resource;
    }

    /**
     * 
     * @returns {boolean}
     */
    releaseRef() {
        this.#refCount--;
        if (this.#refCount == 0) {
            if (this.#resource.dispose) {
                this.#resource.dispose();
            }
            return true;
        }
        return false;
    }
}

export default SmartResource;
