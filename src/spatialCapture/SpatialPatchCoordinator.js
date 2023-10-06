import {CameraVisPatch} from './CameraVisPatch.js';
import {ShaderMode, DEPTH_WIDTH, DEPTH_HEIGHT} from './Shaders.js';
import {rvl} from '../../thirdPartyCode/rvl/index.js';
import RVLParser from '../../thirdPartyCode/rvl/RVLParser.js';

class SpatialPatchCoordinator {
    constructor() {
        this.patches = [];
        this.addPostMessageHandlers();
        this.addPatchToolLifecycleHandlers();
        this.depthCanvasCache = {};
    }
    addPostMessageHandlers() {
        // add handler for tools to programmatically take spatial snapshots
        let THREE = realityEditor.gui.threejsScene.THREE;

        realityEditor.network.addPostMessageHandler('captureSpatialSnapshot', (_, fullMessageData) => {
            // this.clonePatches(ShaderMode.SOLID);
            realityEditor.app.promises.getTextureAndTextureDepth().then(({texture, textureDepth}) => {
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
                
                let decodedDepthDataURL = null;
                if (rawDepth) {
                    //  convert raw depth into an image src (base64-encoded)
                    let uuid = realityEditor.device.utilities.uuidTime();
                    decodedDepthDataURL = this.getImageDataFromRawDepth(uuid, rawDepth);
                }
                
                if (texture && textureDepth && rawDepth && decodedDepthDataURL) {
                    console.log('create spatialPatch');
                    let container = new THREE.Group();
                    let phone = new THREE.Group();
                    phone.matrixAutoUpdate = false;
                    let cameraMatrix = realityEditor.sceneGraph.getCameraNode().getMatrixRelativeTo(realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId()))
                    
                    // for some reason, each element in the camera's first and third rows are negative
                    cameraMatrix[0] *= -1;
                    cameraMatrix[1] *= -1;
                    cameraMatrix[2] *= -1;
                    cameraMatrix[8] *= -1;
                    cameraMatrix[9] *= -1;
                    cameraMatrix[10] *= -1;
                    this.setMatrixFromArray(phone.matrix, cameraMatrix);
                    phone.updateMatrixWorld(true);
                    let textureDataURL = this.toDataURL(texture, 'image/jpeg');
                    const {key, patch} = this.clonePatch(ShaderMode.SOLID, container, phone, textureDataURL, decodedDepthDataURL);
                    patch.add();
                    this.patches[key] = patch;
                    
                    // send texture and depth texture to the frame that requested the capture
                    realityEditor.network.postMessageIntoFrame(fullMessageData.frame, {
                        spatialSnapshotData: {
                            textureDataURL: textureDataURL,
                            textureDepthDataURL: decodedDepthDataURL,
                        }
                    });
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
     * @param {string} textureDataURL
     * @param {string} textureDepthDataURL
     * @return {{key: string, patch: CameraVisPatch}} unique key for patch and object containing all relevant meshes
     */
    clonePatch(shaderMode, container, phone, textureDataURL, textureDepthDataURL) {
        let now = Date.now();
        let serialization = {
            key: '',
            id: realityEditor.device.utilities.uuidTime(), //this.id,
            container: Array.from(container.matrix.elements),
            phone: Array.from(phone.matrix.elements),
            texture: textureDataURL, // this.toDataURL(textureBase64, 'image/jpeg'),
            textureDepth: textureDepthDataURL, // already in DataURL format
            creationTime: now,
        };
        const frameKey = CameraVisPatch.createToolForPatchSerialization(serialization, shaderMode);
    
        return {
            key: frameKey,
            patch: CameraVisPatch.createPatch(
                container.matrix,
                phone.matrix,
                textureDataURL, //this.toDataURL(textureBase64, 'image/jpeg'),
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

    // This is a slightly modified version of CameraVisCoordinator's renderPointCloudRawDepth
    getImageDataFromRawDepth(id, rawDepth) {
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
        context.putImageData(imageData, 0, 0);

        // Convert canvas to a base64 encoded PNG image
        return canvas.toDataURL('image/png');
    }
}

realityEditor.spatialCapture.spatialPatchCoordinator = new SpatialPatchCoordinator();
