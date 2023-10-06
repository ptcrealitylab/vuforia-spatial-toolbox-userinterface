import {CameraVisPatch} from './CameraVisPatch.js';
import {createPointCloud, ShaderMode} from './Shaders.js';
import {VisualDiff} from './VisualDiff.js';
// import * as THREE from "../../thirdPartyCode/three/three.module";

class SpatialPatchCoordinator {
    constructor() {
        this.patches = [];
        this.addPostMessageHandlers();
        this.addPatchToolLifecycleHandlers();
    }
    addPostMessageHandlers() {
        // // add handler for tools to programmatically take spatial snapshots
        // realityEditor.network.addPostMessageHandler('captureSpatialSnapshot', (_msgData) => {
        //     this.clonePatches(ShaderMode.SOLID);
        // });
        
        let THREE = realityEditor.gui.threejsScene.THREE;

        realityEditor.network.addPostMessageHandler('captureSpatialSnapshot', (_msgData) => {
            // this.clonePatches(ShaderMode.SOLID);
            realityEditor.app.promises.getTextureAndTextureDepth().then(({texture, textureDepth}) => {
                let previewRGB = `${texture.substring(0, 16)} ... ${texture.slice(-16)}`;
                let previewDepth = `${textureDepth.substring(0, 16)} ... ${textureDepth.slice(-16)}`;
                console.log('got spatial snapshot textures', `RGB: ${previewRGB}`, `Depth: ${previewDepth}`);

                if (texture && textureDepth) {
                    console.log('todo: create spatialPatch');
                    let container = new THREE.Group();

                    let phone = new THREE.Group();
                    phone.matrixAutoUpdate = false;
                    let cameraMatrix = realityEditor.sceneGraph.getCameraNode().getMatrixRelativeTo(realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId()))
                    // let transformation = [
                    //     -1, 0, 0, 0,
                    //     0, 1, 0, 0,
                    //     0, 0, -1, 0,
                    //     0, 0, 0, 1
                    // ];
                    // let rotatedCameraMatrix = [];
                    // realityEditor.gui.ar.utilities.multiplyMatrix()
                    // for some reason, each element in the camera's first and third rows are negative
                    cameraMatrix[0] *= -1;
                    cameraMatrix[1] *= -1;
                    cameraMatrix[2] *= -1;
                    cameraMatrix[8] *= -1;
                    cameraMatrix[9] *= -1;
                    cameraMatrix[10] *= -1;
                    this.setMatrixFromArray(phone.matrix, cameraMatrix);
                    phone.updateMatrixWorld(true);
                    const {key, patch} = this.clonePatch(ShaderMode.SOLID, container, phone, texture, textureDepth);
                    // const {key, patch} = camera.clonePatch(shaderMode);
                    patch.add();
                    this.patches[key] = patch;
                    // clonedPatches[key] = patch;
                    
                    // // Hide for a bit to show the patch in space
                    // camera.mesh.visible = false;
                    // camera.mesh.__hidden = true;
                    //
                    // setTimeout(() => {
                    //     camera.mesh.visible = this.visible;
                    //     camera.mesh.__hidden = !this.visible;
                    // }, 300);
                }
            });
        });
    }

    addPatchToolLifecycleHandlers() {
        realityEditor.network.addPostMessageHandler('patchHydrate', (msgData) => {
            const key = msgData.frame;
            if (this.patches[key]) {
                // TODO contemplate updating existing patch
                return;
            }
            this.restorePatch(msgData.serialization);
        });

        realityEditor.network.addPostMessageHandler('patchSetShaderMode', (msgData) => {
            const key = msgData.frame;
            if (!this.patches[key]) {
                return;
            }
            this.patches[key].setShaderMode(msgData.shaderMode);
        });


        this.onVehicleDeleted = this.onVehicleDeleted.bind(this);
        realityEditor.device.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using server
    }
    
    setMatrixFromArray(matrix, array) {
        matrix.set(
            array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }

    toDataURL(base64Image, mimeType = 'image/png') {
        return `data:${mimeType};base64,${base64Image}`;
    }

    /**
     * Clone the current state of the mesh rendering part of this CameraVis
     * @param {ShaderMode} shaderMode - initial shader mode to set on the patches
     * @param {THREE.Group} container
     * @param {THREE.Group} phone
     * @param {string} textureBase64
     * @param {string} textureDepthBase64
     * @return {{key: string, patch: CameraVisPatch}} unique key for patch and object containing all relevant meshes
     */
    clonePatch(shaderMode, container, phone, textureBase64, textureDepthBase64) {
        let now = Date.now();
        let serialization = {
            key: '',
            id: realityEditor.device.utilities.uuidTime(), //this.id,
            container: Array.from(container.matrix.elements),
            phone: Array.from(phone.matrix.elements),
            texture: this.toDataURL(textureBase64, 'image/jpeg'), //texture.toDataURL('image/jpeg', 0.7),
            textureDepth: this.toDataURL(textureDepthBase64), //textureDepth.toDataURL(),
            creationTime: now,
        };
        const frameKey = CameraVisPatch.createToolForPatchSerialization(serialization, shaderMode);
    
        return {
            key: frameKey,
            patch: CameraVisPatch.createPatch(
                container.matrix,
                phone.matrix,
                //this.texture.image,
                this.toDataURL(textureBase64, 'image/jpeg'),
                //this.textureDepth.image,
                this.toDataURL(textureDepthBase64),
                now,
                shaderMode
            ),
        };
    }

    /**
     * Clone patches from every active CameraVis
     * @param {ShaderMode} shaderMode - initial shader mode for the patches
     * @param {CameraVis} cameras
     * @return {{[key: string]: CameraVisPatch} map from patch key to patch
     */
    clonePatches(shaderMode, cameras) {
        let clonedPatches = {};
        for (let camera of Object.values(cameras)) {
            const {key, patch} = camera.clonePatch(shaderMode);
            patch.add();
            this.patches[key] = patch;
            clonedPatches[key] = patch;
            // Hide for a bit to show the patch in space
            camera.mesh.visible = false;
            camera.mesh.__hidden = true;

            setTimeout(() => {
                camera.mesh.visible = this.visible;
                camera.mesh.__hidden = !this.visible;
            }, 300);
        }
        return clonedPatches;
    }

    onVehicleDeleted(event) {
        if (!event.objectKey || !event.frameKey || event.nodeKey) {
            return;
        }
        const key = event.frameKey;
        if (!this.patches[key]) {
            return;
        }

        this.patches[key].remove();
        delete this.patches[key];
    }

    restorePatch(serialization) {
        let THREE = realityEditor.gui.threejsScene.THREE;
        let containerMatrix = new THREE.Matrix4().fromArray(serialization.container);
        const phoneMatrix = new THREE.Matrix4().fromArray(serialization.phone);
        const textureImage = document.createElement('img');
        textureImage.src = serialization.texture;
        const textureDepthImage = document.createElement('img');
        textureDepthImage.src = serialization.textureDepth;

        const patch = CameraVisPatch.createPatch(
            containerMatrix,
            phoneMatrix,
            textureImage,
            textureDepthImage,
            serialization.creationTime,
            ShaderMode.FIRST_PERSON
        );
        patch.add();
        this.patches[serialization.key] = patch;
    }
}

realityEditor.spatialCapture.spatialPatchCoordinator = new SpatialPatchCoordinator();
