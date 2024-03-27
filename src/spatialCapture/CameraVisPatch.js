import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {createPointCloud, ShaderMode} from './Shaders.js';
import {VisualDiff} from './VisualDiff.js';

/**
 * All data serialized to store a CameraVis patch (3d picture)
 * - `key`: frame (tool) key, globally unique
 * - id: camera id, may not be persistent across reboots of
 *   camera app
 * - container: matrix from threejs
 * - phone: matrix from threejs
 * - texture: base64 encoded texture image
 * - textureDepth: base64 encoded depth texture image
 * - creationTime: time of patch creation in ms since epoch (Date.now())
 * @typedef {{
 *   key: string,
 *   id: string,
 *   container: Array<number>,
 *   phone: Array<number>,
 *   texture: string,
 *   textureDepth: string,
 *   creationTime: number,
 * }} PatchSerialization
 */

export class CameraVisPatch {
    /**
     * @param {THREE.Group} container
     * @param {THREE.Object3D} mesh
     * @param {THREE.Object3D} phoneMesh
     * @param {ShaderMode} pendingShaderMode - initial shader mode to set on the patch after loading
     * @param {number} creationTime
     */
    constructor(container, mesh, phoneMesh, pendingShaderMode, creationTime) {
        this.container = container;
        /** 
         * this shallow copy will make sure the mesh is rendered twice, first we overwrite the background scan depth with the depth of this object.
         * Because we disable depth checking for this object, we need to render it again with propper depth checking to make sure the front most pixel is rendered.
         * This will automaticaly solve issues with multiple patches rendering on top of each other.
         * @type {THREE.Object3D} 
         */
        this.maskMesh = mesh.clone();
        this.maskMesh.renderOrder = realityEditor.gui.threejsScene.RENDER_ORDER_DEPTH_REPLACEMENT;
        mesh.parent.add(this.maskMesh);
        this.mesh = mesh;
        this.phone = phoneMesh;
        this.material = this.mesh.material;
        this.#updateMaskMaterial();
        this.shaderMode = ShaderMode.SOLID;
        this.pendingShaderMode = pendingShaderMode;
        this.creationTime = creationTime;
        this.loading = true;
    }

    /**
     * internal function that reapplies depth only material to the render mask
     */
    #updateMaskMaterial() {
        if (this.maskMaterial) this.maskMaterial.dispose();
          /**
         * we will copy the original material/shader and disable the color part of the shader for speed, since we are only interested in writing depth
         * @type {THREE.Material|undefined}
         */
        this.maskMaterial = this.mesh.material.clone();
        this.maskMaterial.colorWrite = false;
        this.maskMaterial.depthFunc = THREE.AlwaysDepth;
        this.maskMaterial.uniforms.useFarDepth.value = true;
        this.maskMesh.material = this.maskMaterial;
    }

    getSceneNodeMatrix() {
        let matrix = this.phone.matrixWorld.clone();

        let initialVehicleMatrix = new THREE.Matrix4().fromArray([
            -1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, -1, 0,
            0, 0, 0, 1,
        ]);
        matrix.multiply(initialVehicleMatrix);

        return matrix;
    }

    /**
     * Upon creating or restoring the patch (i.e. loading the data from it),
     * the patch has expanded to fill the space using the solid shader mode. If
     * it's hidden then at this point we hide it but if it's in another shader
     * mode then it's time to swap over.
     */
    finalizeLoadingAnimation() {
        this.loading = false;
        if (this.pendingShaderMode !== this.shaderMode) {
            this.setShaderMode(this.pendingShaderMode);
        }
    }

    resetShaderMode() {
        if (this.loading) {
            return;
        }
        let shaderMode = this.shaderMode;
        this.shaderMode = '';
        this.setShaderMode(shaderMode);
    }

    setShaderMode(shaderMode) {
        if (this.loading) {
            this.pendingShaderMode = shaderMode;
            return;
        }
        if (shaderMode !== this.shaderMode) {
            this.shaderMode = shaderMode;

            if (this.matDiff) {
                this.matDiff.dispose();
                this.matDiff = null;
            }

            if (this.shaderMode === ShaderMode.HIDDEN) {
                this.container.visible = false;
                return;
            }

            this.container.visible = true;

            if ((this.shaderMode === ShaderMode.DIFF ||
                 this.shaderMode === ShaderMode.DIFF_DEPTH) &&
                     !this.visualDiff) {
                this.visualDiff = new VisualDiff();
            }

            if (this.shaderMode === ShaderMode.DIFF ||
                this.shaderMode === ShaderMode.DIFF_DEPTH) {
                this.visualDiff.showCameraVisDiff(this);
            } else {
                this.mesh.material = this.material;
                this.#updateMaskMaterial();
            }
        }
    }

    show() {
        this.container.visible = true;
    }

    hide() {
        this.container.visible = false;
    }

    add() {
        let worldObjectId = realityEditor.sceneGraph.getWorldId();
        realityEditor.gui.threejsScene.addToScene(this.container, { worldObjectId: worldObjectId } );
    }

    remove() {
        realityEditor.gui.threejsScene.removeFromScene(this.container);
    }

    /**
     * @param {PatchSerialization} serialization
     * @param {ShaderMode} shaderMode - initial shader mode to set on the patches
     * @return {string} frame key
     */
    static createToolForPatchSerialization(serialization, shaderMode) {
        let toolMatrix = new THREE.Matrix4().fromArray(serialization.phone);
        let containerMatrix = new THREE.Matrix4().fromArray(serialization.container);
        // Sets y to 0 because it will soon be positioned with a built-in groundplane offset
        containerMatrix.elements[13] = 0;
        toolMatrix.premultiply(containerMatrix);
        toolMatrix.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, 0, Math.PI / 2)));
        toolMatrix.multiply(new THREE.Matrix4().makeTranslation(0, 0, 500));

        let addedTool = realityEditor.gui.pocket.createFrame('spatialPatch', {
            noUserInteraction: true,
            initialMatrix: toolMatrix.elements,
            onUploadComplete: () => {
                realityEditor.network.postVehiclePosition(addedTool);
                write();
            },
        });

        const frameKey = addedTool.uuid;
        serialization.key = frameKey;
        const write = () => {
            realityEditor.network.realtime.writePublicData(
                addedTool.objectId, frameKey, frameKey + 'storage',
                'serialization', serialization
            );
            realityEditor.network.realtime.writePublicData(
                addedTool.objectId, frameKey, frameKey + 'storage',
                'shaderMode', shaderMode
            );
        };
        setTimeout(write, 500);
        setTimeout(write, 3000);

        return addedTool.uuid;
    }

    /**
     * @param {Array<number>} containerMatrix - array representing 4x4 matrix from threejs
     * @param {Array<number>} phoneMatrix - array representing 4x4 matrix from threejs
     * @param {string} textureImage - base64 data url for texture
     * @param {string} textureDepthImage - base64 data url for depth texture
     * @param {number} creationTime - Time when patch created. Usually from Date.now()
     * @param {ShaderMode} shaderMode - initial shader mode to set on the patches
     * @return {CameraVisPatch}
     */
    static createPatch(containerMatrix, phoneMatrix, textureImage, textureDepthImage, creationTime, shaderMode) {
        
        let patch = new THREE.Group();
        patch.name = `CameraVisPatch_${creationTime}_patchContainer`;
        patch.matrix.copy(containerMatrix);
        patch.matrixAutoUpdate = false;
        patch.matrixWorldNeedsUpdate = true;

        let phone = new THREE.Group();
        patch.name = `CameraVisPatch_${creationTime}_phone`;
        phone.matrix.copy(phoneMatrix);
        phone.matrixAutoUpdate = false;
        phone.matrixWorldNeedsUpdate = true;
        phone.frustumCulled = false;

        let texture = new THREE.Texture();
        // texture.minFilter = THREE.NearestFilter;
        // texture.magFilter = THREE.NearestFilter;
        // texture.minFilter = THREE.LinearFilter;
        // texture.magFilter = THREE.LinearFilter;
        // texture.generateMipmaps = false;

        let textureDepth = new THREE.Texture();
        // textureDepth.minFilter = THREE.NearestFilter;
        // textureDepth.magFilter = THREE.NearestFilter;
        // textureDepth.minFilter = THREE.LinearFilter;
        // textureDepth.magFilter = THREE.LinearFilter;
        // textureDepth.generateMipmaps = false;

        texture.image = textureImage;
        textureDepth.image = textureDepthImage;

        texture.needsUpdate = true;
        textureDepth.needsUpdate = true;

        let mesh = createPointCloud(texture, textureDepth, shaderMode);
        mesh.name = `CameraVisPatch_${creationTime}_pointCloudMesh`;
        mesh.material.uniforms.patchLoading.value = 0;

        phone.add(mesh);
        patch.add(phone);

        let cvPatch = new CameraVisPatch(patch, mesh, phone, shaderMode, creationTime);

        let lastTime = -1;
        function patchLoading(time) {
            if (lastTime < 0) {
                lastTime = time;
            }
            // limit to 30fps
            let dt = Math.min(time - lastTime, 67);
            lastTime = time;
            mesh.material.uniforms.patchLoading.value += 8 * dt / 1000;
            if (mesh.material.uniforms.patchLoading.value < 1) {
                window.requestAnimationFrame(patchLoading);
            } else {
                mesh.material.uniforms.patchLoading.value = 1;
                cvPatch.finalizeLoadingAnimation();
            }
            cvPatch.maskMaterial.uniforms.patchLoading.value = mesh.material.uniforms.patchLoading.value;
            
        }
        window.requestAnimationFrame(patchLoading);

        return cvPatch;
    }
}
