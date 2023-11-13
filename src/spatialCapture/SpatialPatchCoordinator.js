import {CameraVisPatch} from './CameraVisPatch.js';
import {ShaderMode, DEPTH_WIDTH, DEPTH_HEIGHT} from './Shaders.js';
import {rvl} from '../../thirdPartyCode/rvl/index.js';
import RVLParser from '../../thirdPartyCode/rvl/RVLParser.js';
import * as THREE from '../../thirdPartyCode/three/three.module.js';

const debug = false;

class SpatialPatchCoordinator {
    constructor() {
        this.patches = {};
        this.addPostMessageHandlers();
        this.addPatchToolLifecycleHandlers();
        this.depthCanvasCache = {};
        this.update();
    }
    update() {
        try {
            this.updatePatchMaterialUniforms();
        } catch (e) {
            console.warn('error updating spatialPatchCoordinator');
        }
        
        requestAnimationFrame(this.update.bind(this));
    }
    addPostMessageHandlers() {
        // add handler for tools to programmatically take spatial snapshots
        realityEditor.network.addPostMessageHandler('captureSpatialSnapshot', (_, fullMessageData) => {
            this.mobileARDeviceCaptureSpatialSnapshot(fullMessageData.frame);
        });
    }

    mobileARDeviceCaptureSpatialSnapshot(parentFrameKey) {
        realityEditor.app.promises.get3dSnapshot().then(({texture, textureDepth}) => {
            if (debug) {
                let previewRGB = `${texture.substring(0, 16)} ... ${texture.slice(-16)}`;
                let previewDepth = `${textureDepth.substring(0, 16)} ... ${textureDepth.slice(-16)}`;
                console.log('got spatial snapshot textures', `RGB: ${previewRGB}`, `Depth: ${previewDepth}`);
            }

            // decompress the depth byteArray using the RVL parser
            let rawDepth = null;
            try {
                let depthArray = JSON.parse(textureDepth);
                let bytes = new Uint8Array(depthArray);
                const parser = new RVLParser(bytes.buffer);
                rawDepth = rvl.decompress(parser.currentFrame.rvlBuf);
            } catch (err) {
                console.warn('error parsing rvl depth buffer', err);
            }

            // One more step to convert rawDepth into an image src (base64-encoded)
            let decodedDepthDataURL = null;
            if (rawDepth) {
                let uuid = realityEditor.device.utilities.uuidTime();
                decodedDepthDataURL = this.getImageDataFromRawDepth(uuid, rawDepth);
            }

            let worldNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
            if (texture && textureDepth && rawDepth && decodedDepthDataURL && worldNode) {
                let container = new THREE.Group();
                let phone = new THREE.Group();
                phone.matrixAutoUpdate = false;
                let cameraMatrix = realityEditor.sceneGraph.getCameraNode().getMatrixRelativeTo(worldNode);

                // for some reason, each element in the camera's first and third rows are negative
                // perhaps because the pointcloud does: mesh.scale.set(-1, 1, -1);
                cameraMatrix[0] *= -1;
                cameraMatrix[1] *= -1;
                cameraMatrix[2] *= -1;
                cameraMatrix[8] *= -1;
                cameraMatrix[9] *= -1;
                cameraMatrix[10] *= -1;
                this.setMatrixFromArray(phone.matrix, cameraMatrix);
                phone.updateMatrixWorld(true);
                let textureDataURL = this.toDataURL(texture, 'image/jpeg');

                // create the patch serialized data, which is used to add the snapshot to the scene
                // and to persist it in the publicData of the associated tool
                let serialization = {
                    key: parentFrameKey,
                    id: realityEditor.device.utilities.uuidTime(),
                    container: Array.from(container.matrix.elements),
                    phone: Array.from(phone.matrix.elements),
                    texture: textureDataURL,
                    textureDepth: decodedDepthDataURL,
                    creationTime: Date.now(),
                };
                this.clonePatch(serialization, ShaderMode.SOLID);

                // send texture and depth texture to the frame that requested the capture
                realityEditor.network.postMessageIntoFrame(parentFrameKey, {
                    spatialSnapshotData: {
                        textureDataURL: textureDataURL,
                        textureDepthDataURL: decodedDepthDataURL,
                    }
                });
            } else {
                // send error message into the frame that requested the capture
                realityEditor.network.postMessageIntoFrame(parentFrameKey, {
                    spatialSnapshotError: {
                        reason: 'Error getting RGB texture and/or depth texture'
                    }
                });
            }
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
     * Create a tool for the patch, and then use restorePatch to create the CameraVisPatch
     * @param {*} serialization
     * @param {ShaderMode} shaderMode
     */
    clonePatch(serialization, shaderMode = ShaderMode.SOLID) {
        CameraVisPatch.createToolForPatchSerialization(serialization, shaderMode);
        this.restorePatch(serialization);
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

            let previousVisibility = camera.mesh.visible;
            let previousHidden = camera.mesh.__hidden;
            // Hide for a bit to show the patch in space
            camera.mesh.visible = false;
            camera.mesh.__hidden = true;

            setTimeout(() => {
                camera.mesh.visible = previousVisibility; //this.visible;
                camera.mesh.__hidden = previousHidden; //!this.visible;
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
        let containerMatrix = new THREE.Matrix4().fromArray(serialization.container);
        const phoneMatrix = new THREE.Matrix4().fromArray(serialization.phone);
        const textureImage = document.createElement('img');
        textureImage.src = serialization.texture;
        const textureDepthImage = document.createElement('img');
        textureDepthImage.src = serialization.textureDepth;

        textureDepthImage.onload = () => {
            const patch = CameraVisPatch.createPatch(
                containerMatrix,
                phoneMatrix,
                textureImage,
                textureDepthImage,
                serialization.creationTime
            );
            patch.add();
            this.patches[serialization.key] = patch;
        };
    }

    // updates the snapshot shader to render more flatly when you observe it from a similar position and angle
    // compared to the position/angle that it was captured at
    updatePatchMaterialUniforms() {
        for (const [key, patch] of Object.entries(this.patches)) {
            if (!patch.material || !patch.material.uniforms) continue;
            if (typeof patch.material.uniforms.viewAngleSimilarity === 'undefined') continue;
            if (typeof patch.material.uniforms.viewPositionSimilarity === 'undefined') continue;

            let viewingCameraForwardVector = realityEditor.gui.ar.utilities.getForwardVector(realityEditor.sceneGraph.getCameraNode().worldMatrix);
            let viewAngleSimilarity = 0;
            let MIN_DISTANCE_THRESHOLD = 2000;
            let MAX_DISTANCE_THRESHOLD = 6000;
            let viewDistance = MAX_DISTANCE_THRESHOLD;
            // TODO: currently we're comparing the viewing angle/distance based on the tool associated with
            //  the snapshot, not the snapshot itself. This is ok as long as you dont drag the tool icon.
            if (realityEditor.sceneGraph.getSceneNodeById(key)) {
                let snapshotForwardVector = realityEditor.gui.ar.utilities.getForwardVector(realityEditor.sceneGraph.getSceneNodeById(key).worldMatrix);
                viewAngleSimilarity = -1 * realityEditor.gui.ar.utilities.dotProduct(snapshotForwardVector, viewingCameraForwardVector);
                viewAngleSimilarity = Math.max(0, viewAngleSimilarity); // limit it to 0 instead of going to -1 if viewing from anti-parallel direction
                viewDistance = realityEditor.sceneGraph.getDistanceToCamera(key);
            }
            let viewPositionSimilarity = Math.min(1, Math.max(0, 1.0 - (viewDistance - MIN_DISTANCE_THRESHOLD) / (MAX_DISTANCE_THRESHOLD - MIN_DISTANCE_THRESHOLD)));

            patch.material.uniforms.viewAngleSimilarity.value = viewAngleSimilarity;
            patch.material.uniforms.viewPositionSimilarity.value = viewPositionSimilarity;
            patch.material.needsUpdate = true;
        }
    }

    // This is a slightly modified version of CameraVisCoordinator's renderPointCloudRawDepth
    // It takes in the RVL-decompressed depth buffer, and outputs a base64 encoded png image
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
