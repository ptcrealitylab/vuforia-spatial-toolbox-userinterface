import { GltfObjectFactory } from "./GLTFObjectFactory.js";
import { CustomMaterials } from "./CustomMaterials.js"

class EnvironmentScan {
    constructor(url, center, maxHeight) {
        this.url = url;
        GltfObjectFactory.getInstance().createObject(url);
        this.wireMaterial = CustomMaterials.areaTargetMaterialWithTextureAndHeight()
    }
}

export { EnvironmentScan }
