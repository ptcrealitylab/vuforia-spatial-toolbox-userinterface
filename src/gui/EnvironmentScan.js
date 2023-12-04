import { GltfObjectFactory } from "./GLTFObjectFactory.js";

class EnvironmentScan {
    constructor(url) {
        this.url = url;
        GltfObjectFactory.getInstance().createObject(url);
    }
}

export { EnvironmentScan }
