import * as THREE from '../../thirdPartyCode/three/three.module.js';

/**
 * This class manages the main scene including the rendering
 */
class Renderer3D {
    /**
     * 
     * @param {HTMLCanvasElement} canvasElement 
     */
    constructor(canvasElement) {
        this.canvasElement = canvasElement;
        this.renderer = new THREE.WebGLRenderer({canvas: canvasElement, alpha: true, antialias: false});
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.autoClear = false;
        this.setSize(window.innerWidth, window.innerHeight);
        realityEditor.device.layout.onWindowResized(({width, height}) => {this.setSize(width, height)});
    }

    setSize(width, height) {
        this.renderWidth = width;
        this.renderHeight = height;
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    }

    render(scene, camera, hasGltfScene) {
        this.renderer.clear();
        // render the ground plane visualizer first
        camera.layers.set(2);
        this.renderer.render(scene, camera);
        this.renderer.clearDepth();
        if (hasGltfScene) {
            // Set rendered layer to 1: only the background, i.e. the
            // static gltf mesh
            camera.layers.set(1);
            this.renderer.render(scene, camera);
            // Leaves only the color from the render, discarding depth and
            // stencil
            this.renderer.clear(false, true, true);
        }
        // Set layer to 0: everything but the background
        camera.layers.set(0);
        this.renderer.render(scene, camera);
    }

    createPMREMGenerator() {
        return new THREE.PMREMGenerator(this.renderer);
    }

    getCanvasElement() {
        return this.canvasElement;
    }
}

export {Renderer3D};
