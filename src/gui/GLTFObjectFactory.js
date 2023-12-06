import { GLTFLoader } from '../../thirdPartyCode/three/GLTFLoader.module.js';
import { DRACOLoader } from '../../thirdPartyCode/three/DRACOLoader.module.js';

/**
 * Loads gltf 3d objects from url
 */
class GltfObjectFactory {
    instance = null;

    /**
     * Configures the gltf loader with draco support
     */
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
     * Loads a glTF model async
     * @param {string} pathToGltf - url of glTF
     * @returns {Promise} 
     */
    async createObjectAsync(url) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(url, gltf => resolve(gltf), null, reject);
        });
    }

    /**
     * Default error reporting
     * @param {Error} error 
     */
    defaultError(error) {
        console.error(error);
    }

    /**
     * returns singleton instance
     * @returns {GltfObjectFactory}
     */
    static getInstance() {
        if (!GltfObjectFactory.instance) {
            GltfObjectFactory.instance = new GltfObjectFactory();
        }
        return GltfObjectFactory.instance;
    }
}

export { GltfObjectFactory }
