import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {Renderer3D} from "./Renderer3D.js"

class Camera3D {
    /**
     * 
     * @param {Renderer3D} renderer 
     */
    constructor(renderer) {
        /** @type {Renderer3D} */
        this.renderer = renderer;
        /** @type {{width: PixelCount, height: PixelCount}} */
        let renderSize = this.renderer.getSize();
        /**
         * @type {THREE.Camera}
         */
        this.camera = new THREE.PerspectiveCamera(70, renderSize.width / renderSize.height, 1, 1000);
        this.camera.matrixAutoUpdate = false;

        this.renderer.add(this.camera); // Normally not needed, but needed in order to add child objects relative to camera
    }

    registerCustomMaterials(customMaterials) {
        this.customMaterials = customMaterials;
    }

    setCameraMatrix(matrix) {
        this.setMatrixFromArray(this.camera.matrix, matrix);
        this.camera.updateMatrixWorld(true);
        if (this.customMaterials) {
            let forwardVector = realityEditor.gui.ar.utilities.getForwardVector(matrix);
            this.customMaterials.updateCameraDirection(new THREE.Vector3(forwardVector[0], forwardVector[1], forwardVector[2]));
        }
    }

    setProjectionMatrix(matrix) {
        this.setMatrixFromArray(this.camera.projectionMatrix, matrix);
        this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    }

    add(obj) {
        this.camera.add(obj);
    }

    attach(obj) {
        this.camera.attach(obj);
    }

    setLayers(layer) {
        this.camera.layers.set(layer);
    }

    getInternalObject() {
        return this.camera;
    }

     // small helper function for setting three.js matrices from the custom format we use
     setMatrixFromArray(matrix, array) {
        matrix.set( array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }
}

export { Camera3D }
