class SmartResource {
    #admin;

    #resource;

    constructor(smartPointerAdmin) {
        this.#admin = smartPointerAdmin;
        this.#resource = this.#admin.getRef();
    }

    static create(resource) {
        return new SmartResource(new SmartResourceAdmin(resource));
    }

    copy() {
        return new SmartResource(this.#admin);
    }

    getResource() {
        return this.#resource;
    }

    release() {
        this.#admin.releaseRef();
        this.#resource = null;
        this.#admin = null;
    }
}

class SmartResourceAdmin {
    /** @type {number} */
    #refCount;

    /** @type {any} */
    #resource;

    constructor(resource) {
        this.#resource = resource;
        this.#refCount = 0;
    }

    getWeakRef() {
        return this.#resource;
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

export {SmartResource, SmartResourceAdmin};
