import { GLTFLoader } from '../../thirdPartyCode/three/GLTFLoader.module.js';
import { DRACOLoader } from '../../thirdPartyCode/three/DRACOLoader.module.js';

class GltfObjectFactory {
    instance = null;

    constructor() {
        this.gltfLoader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('../../thirdPartyCode/three/libs/draco');
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
    }

    /**
     * Loads a glTF model
     * @param {string} url - url of glTF
     * @param {function(gltf: any)} onLoad - function to execute on a successful load
     */
    createObject(url, onLoad, onError = this.defaultError) {
        this.gltfLoader.load(url, onLoad, null, onError);
    }

    /**
     * Loads a glTF model
     * @param {string} pathToGltf - url of glTF
     * @returns {Promise} 
     */
    async createObjectAsync(url) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(url, gltf => resolve(gltf), null, reject);
        });
    }

    defaultError(error) {
        console.error(error);
    }

    static getInstance() {
        if (!GltfObjectFactory.instance) {
            GltfObjectFactory.instance = new GltfObjectFactory();
        }
        return GltfObjectFactory.instance;
    }
}

export { GltfObjectFactory }
