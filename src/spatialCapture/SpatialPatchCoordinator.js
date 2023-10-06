import {CameraVisPatch} from './CameraVisPatch.js';
import {createPointCloud, ShaderMode, DEPTH_WIDTH, DEPTH_HEIGHT} from './Shaders.js';
import {VisualDiff} from './VisualDiff.js';
// import * as THREE from "../../thirdPartyCode/three/three.module";
import {rvl} from '../../thirdPartyCode/rvl/index.js';
import RVLParser from '../../thirdPartyCode/rvl/RVLParser.js';

class SpatialPatchCoordinator {
    constructor() {
        this.patches = [];
        this.addPostMessageHandlers();
        this.addPatchToolLifecycleHandlers();
        this.depthCanvasCache = {};
        // this.maxDepthMeters = 5;
    }
    addPostMessageHandlers() {
        // // add handler for tools to programmatically take spatial snapshots
        // realityEditor.network.addPostMessageHandler('captureSpatialSnapshot', (_msgData) => {
        //     this.clonePatches(ShaderMode.SOLID);
        // });
        
        let THREE = realityEditor.gui.threejsScene.THREE;

        realityEditor.network.addPostMessageHandler('captureSpatialSnapshot', (_msgData) => {
            // this.clonePatches(ShaderMode.SOLID);
            realityEditor.app.promises.getTextureAndTextureDepth().then( async ({texture, textureDepth}) => {
                let previewRGB = `${texture.substring(0, 16)} ... ${texture.slice(-16)}`;
                let previewDepth = `${textureDepth.substring(0, 16)} ... ${textureDepth.slice(-16)}`;
                console.log('got spatial snapshot textures', `RGB: ${previewRGB}`, `Depth: ${previewDepth}`);

                let rawDepth = null;
                try {
                    let depthArray = JSON.parse(textureDepth);
                    console.log('depthArray', depthArray);

                    let bytes = new Uint8Array(depthArray);
                    console.log('bytes', bytes);

                    // const parser = new RVLParser(await msg.data.slice(1, msg.data.size).arrayBuffer());
                    const parser = new RVLParser(bytes.buffer);
                    rawDepth = rvl.decompress(parser.currentFrame.rvlBuf);
                    console.log('rawDepth', rawDepth);
                } catch (err) {
                    console.warn('error parsing rvl depth buffer', err);
                }
                
                let decodedDepthImageBase64 = null;
                if (rawDepth) {
                    // TODO: need to convert raw depth into an image src (perhaps base64-encoded
                    // this.cameraVisCoordinator.renderPointCloudRawDepth(id, rawDepth);
                    let uuid = realityEditor.device.utilities.uuidTime();
                    decodedDepthImageBase64 = this.renderPointCloudRawDepth(uuid, rawDepth);
                }
                
                if (texture && textureDepth && rawDepth && decodedDepthImageBase64) {
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
                    const {key, patch} = this.clonePatch(ShaderMode.SOLID, container, phone, texture, decodedDepthImageBase64);
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
     * @param {string} textureDepthDataURL
     * @return {{key: string, patch: CameraVisPatch}} unique key for patch and object containing all relevant meshes
     */
    clonePatch(shaderMode, container, phone, textureBase64, textureDepthDataURL) {
        let now = Date.now();
        let serialization = {
            key: '',
            id: realityEditor.device.utilities.uuidTime(), //this.id,
            container: Array.from(container.matrix.elements),
            phone: Array.from(phone.matrix.elements),
            texture: this.toDataURL(textureBase64, 'image/jpeg'), //texture.toDataURL('image/jpeg', 0.7),
            textureDepth: textureDepthDataURL, //textureDepth.toDataURL(),
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
                textureDepthDataURL,
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
            // ShaderMode.FIRST_PERSON
        );
        patch.add();
        this.patches[serialization.key] = patch;
    }

    renderPointCloudRawDepth(id, rawDepth) {
        // const textureKey = 'textureDepth';

        // if (!this.cameras[id]) {
        //     this.createCameraVis(id);
        // }
        // if (this.cameras[id].loading[textureKey]) {
        //     return;
        // }
        // this.cameras[id].loading[textureKey] = true;
        // const tex = this.cameras[id][textureKey];
        // tex.dispose();

        // const tex = new THREE.Texture();
        // tex.minFilter = THREE.LinearFilter;
        // tex.magFilter = THREE.LinearFilter;
        // tex.generateMipmaps = false;
        // tex.isVideoTexture = true;
        // tex.update = function() {
        // };
        // tex.dispose();
        
        if (!this.depthCanvasCache.hasOwnProperty(id)) {
            let canvas = document.createElement('canvas');
            let context = canvas.getContext('2d');
            let imageData = context.createImageData(DEPTH_WIDTH, DEPTH_HEIGHT);
            this.depthCanvasCache[id] = {
                canvas,
                context,
                imageData,
            };
        }

        let {canvas, context, imageData} = this.depthCanvasCache[id];
        canvas.width = DEPTH_WIDTH;
        canvas.height = DEPTH_HEIGHT;
        let maxDepth14bits = 0;
        for (let i = 0; i < DEPTH_WIDTH * DEPTH_HEIGHT; i++) {
            if (rawDepth[i] > maxDepth14bits) {
                maxDepth14bits = rawDepth[i];
            }
            // We get 14 bits of depth information from the RVL-encoded
            // depth buffer. Note that this means the blue channel is
            // always zero
            let depth24Bits = rawDepth[i] << (24 - 14); // * 5 / (1 << 14);
            if (depth24Bits > 0xffffff) {
                depth24Bits = 0xffffff;
            }
            let b = depth24Bits & 0xff;
            let g = (depth24Bits >> 8) & 0xff;
            let r = (depth24Bits >> 16) & 0xff;
            imageData.data[4 * i + 0] = r;
            imageData.data[4 * i + 1] = g;
            imageData.data[4 * i + 2] = b;
            imageData.data[4 * i + 3] = 255;
        }
        // this.cameras[id].maxDepthMeters = 5 * (maxDepth14bits / (1 << 14));
        // this.maxDepthMeters = 5 * (maxDepth14bits / (1 << 14));

        context.putImageData(imageData, 0, 0);
        // this.finishRenderPointCloudCanvas(id, textureKey, -1);

        // let {canvas} = this.depthCanvasCache[id];
        // tex.image = canvas;

        // Convert canvas to a base64 encoded PNG image
        return canvas.toDataURL('image/png');

        // if (this.voxelizer) {
        //     this.voxelizer.raycastDepth(
        //         this.cameras[id].phone, {
        //             width: DEPTH_WIDTH,
        //             height: DEPTH_HEIGHT,
        //         },
        //         rawDepth
        //     );
        // }
    }
}

realityEditor.spatialCapture.spatialPatchCoordinator = new SpatialPatchCoordinator();
