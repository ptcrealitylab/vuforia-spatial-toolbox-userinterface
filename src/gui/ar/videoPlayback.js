/*
* Created by Daniel Dangond on 10/11/22.
*
* Copyright (c) 2022 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/**
 * @fileOverview realityEditor.gui.ar.videoPlayback
 * Provides an API for tools to call in order to play spatial depth video in a scene
 */

createNameSpace("realityEditor.gui.ar.videoPlayback");

import * as THREE from '../../../thirdPartyCode/three/three.module.js';
import RVLParser from '../../../thirdPartyCode/rvl/RVLParser.js';
import {Followable} from './Followable.js';

const videoPlayers = [];

const callbacks = {
    onVideoCreated: [],
    onVideoDisposed: [],
    onVideoPlayed: [],
    onVideoPaused: [],
}

realityEditor.gui.ar.videoPlayback.initService = function() {
    realityEditor.network.addPostMessageHandler('createVideoPlayback', (msgData) => {
        const videoPlayer = new VideoPlayer(msgData.id, msgData.urls, msgData.frameKey);
        videoPlayers.push(videoPlayer);
        callbacks.onVideoCreated.forEach(cb => { cb(videoPlayer); });
    });
    realityEditor.network.addPostMessageHandler('disposeVideoPlayback', (msgData) => {
        const videoPlayer = videoPlayers.find(videoPlayer => videoPlayer.id === msgData.id);
        videoPlayer.dispose();
        videoPlayers.splice(videoPlayers.indexOf(videoPlayer), 1);
        callbacks.onVideoDisposed.forEach(cb => { cb(msgData.id); });
    });
    realityEditor.network.addPostMessageHandler('setVideoPlaybackCurrentTime', (msgData) => {
        videoPlayers.find(videoPlayer => videoPlayer.id === msgData.id).currentTime = msgData.currentTime;
    });
    realityEditor.network.addPostMessageHandler('playVideoPlayback', (msgData) => {
        const videoPlayer = videoPlayers.find(videoPlayer => videoPlayer.id === msgData.id);
        videoPlayer.play();
        callbacks.onVideoPlayed.forEach(cb => { cb(videoPlayer); });
    });
    realityEditor.network.addPostMessageHandler('pauseVideoPlayback', (msgData) => {
        const videoPlayer = videoPlayers.find(videoPlayer => videoPlayer.id === msgData.id);
        videoPlayer.pause();
        callbacks.onVideoPlayed.forEach(cb => { cb(videoPlayer); });
    });
}.bind(realityEditor.gui.ar.videoPlayback);

realityEditor.gui.ar.videoPlayback.onVideoCreated = (cb) => {
    callbacks.onVideoCreated.push(cb);
};
realityEditor.gui.ar.videoPlayback.onVideoDisposed = (cb) => {
    callbacks.onVideoDisposed.push(cb);
};
realityEditor.gui.ar.videoPlayback.onVideoPlayed = (cb) => {
    callbacks.onVideoPlayed.push(cb);
};
realityEditor.gui.ar.videoPlayback.onVideoPaused = (cb) => {
    callbacks.onVideoPaused.push(cb);
};

const POINT_CLOUD_VERTEX_SHADER = `
uniform sampler2D map;
uniform sampler2D mapDepth;
uniform float width;
uniform float height;
uniform float depthScale;
uniform float glPosScale;
uniform float pointSize;
const float pointSizeBase = 0.0;
varying vec2 vUv;
varying vec2 vDepthUv;
varying vec4 pos;
const float XtoZ = 1920.0 / 1448.24976; // width over focal length
const float YtoZ = 1080.0 / 1448.24976;
void main() {
  vUv = vec2(position.x / width, position.y / height);
  vDepthUv = vec2((width - position.x) / width, (height - position.y) / height);
  vec4 color = texture2D(mapDepth, vDepthUv);
  float depth = 5000.0 * (color.r + color.g / 255.0 + color.b / (255.0 * 255.0));
  float z = depth - 0.05;
  pos = vec4(
    (position.x / width - 0.5) * z * XtoZ,
    (position.y / height - 0.5) * z * YtoZ,
    -z,
    1.0);
  gl_Position = projectionMatrix * modelViewMatrix * pos;
  // gl_PointSize = pointSizeBase + pointSize * depth * depthScale;
  gl_PointSize = pointSizeBase + pointSize * depth * depthScale + glPosScale / gl_Position.w;
}`;

const POINT_CLOUD_FRAGMENT_SHADER = `
// color texture
uniform sampler2D map;

// uv (0.0-1.0) texture coordinates
varying vec2 vUv;
varying vec2 vDepthUv;
// Position of this pixel relative to the camera in proper (millimeter) coordinates
varying vec4 pos;

void main() {
  // Depth in millimeters
  float depth = -pos.z;

  // Fade out beginning at 4.5 meters and be gone after 5.0
  float alphaDepth = clamp(2.0 * (5.0 - depth / 1000.0), 0.0, 1.0);

  // Normal vector of the depth mesh based on pos
  // Necessary to calculate manually since we're messing with gl_Position in the vertex shader
  vec3 normal = normalize(cross(dFdx(pos.xyz), dFdy(pos.xyz)));

  // pos.xyz is the ray looking out from the camera to this pixel
  // dot of pos.xyz and the normal is to what extent this pixel is flat
  // relative to the camera (alternatively, how much it's pointing at the
  // camera)
  // alphaDepth is thrown in here to incorporate the depth-based fade
  float alpha = abs(dot(normalize(pos.xyz), normal)) * alphaDepth;

  // Sample the proper color for this pixel from the color image
  vec4 color = texture2D(map, vUv);

  gl_FragColor = vec4(color.rgb, alpha);
  // gl_FragColor = vec4(color.rgb, 1.0);
}`;

// TODO: move shaders out of remote-operator-addon ./Shaders.js
//  into jointly accessible location, rather than duplicate code
const FIRST_PERSON_FRAGMENT_SHADER = `
// color texture
uniform sampler2D map;

// uv (0.0-1.0) texture coordinates
varying vec2 vUv;
// Position of this pixel relative to the camera in proper (millimeter) coordinates
varying vec4 pos;

void main() {
// Sample the proper color for this pixel from the color image
vec4 color = texture2D(map, vUv);

gl_FragColor = vec4(color.rgb, 1.0);
}`;

const VideoPlayerStates = {
    LOADING: 'LOADING', // Loading the recording
    PAUSED: 'PAUSED', // Video paused, initial state after loading
    PLAYING: 'PLAYING', // Playing video
};

const ShaderMode = {
    SOLID: 'SOLID',
    FIRST_PERSON: 'FIRST_PERSON',
};

class VideoPlayer extends Followable {
    static count = 0;

    /**
     * @param {string} id
     * @param {object} urls - Expected to contain keys `color` and `rvl` with
     *  urls pointing to color and depth data, respectively
     * @param {string|undefined} frameKey - option frame that wants to be
     *  notified about the video playback's state changes
     */
    constructor(id, urls, frameKey) {
        // first we must set up the Followable so that the remote operator
        // camera system will be able to follow this video...
        VideoPlayer.count++;
        let parentNode = realityEditor.sceneGraph.getVisualElement('CameraGroupContainer');
        if (!parentNode) {
            let gpNode = realityEditor.sceneGraph.getGroundPlaneNode();
            let cameraGroupContainerId = realityEditor.sceneGraph.addVisualElement('CameraGroupContainer', gpNode);
            parentNode = realityEditor.sceneGraph.getSceneNodeById(cameraGroupContainerId);
            let transformationMatrix = realityEditor.gui.ar.utilities.makeGroundPlaneRotationX(0);
            transformationMatrix[13] = -1 * realityEditor.gui.ar.areaCreator.calculateFloorOffset();
            parentNode.setLocalMatrix(transformationMatrix);
        }
        // count (e.g. 1) is more user-friendly than the id (e.g. 0.123) or frameKey
        let menuItemName = `Video Recording ${VideoPlayer.count}`;
        super(`VideoPlayerFollowable_${id}`, menuItemName, parentNode);

        // then the VideoPlayer can initialize as usual...
        this.id = id;
        this.urls = window.location.origin.includes('toolboxedge.net') ? urls : {
            color: urls.color.replace('https://toolboxedge.net', `${window.location.origin}/proxy`), // Avoid CORS issues on iOS WebKit by proxying video
            rvl: urls.rvl.replace('https://toolboxedge.net', `${window.location.origin}/proxy`) // Avoid CORS issues on iOS WebKit by proxying video
        }; // TODO: test without rvl proxy, don't think it is needed
        this.frameKey = frameKey;
        this.state = VideoPlayerStates.LOADING;

        this.floorOffset = realityEditor.gui.ar.areaCreator.calculateFloorOffset();
        this.phoneParent = new THREE.Group();
        this.phone = new THREE.Group();
        this.phone.matrixAutoUpdate = false; // Phone matrix will be set via pose data
        this.phone.frustumCulled = false;
        realityEditor.gui.threejsScene.addToScene(this.phoneParent, {worldObjectId: realityEditor.worldObjects.getBestWorldObject().objectId});
        this.phoneParent.add(this.phone);
        this.phoneParent.rotateX(Math.PI / 2);
        // this.phoneParent.position.y = this.floorOffset;
        this.firstPersonMode = false;

        // add a visual element to show the position of the camera that recorded the video
        // note: we use the same visual style as the remote operator CameraVis 
        this.cameraMeshGroup = this.createCameraMeshGroup();
        this.phone.add(this.cameraMeshGroup);

        this.lastRenderTime = -1; // Last rendered frame time (using video time)
        this.videoLength = 0;

        this.depthCanvas = document.createElement('canvas');
        this.depthCanvas.width = 256;
        this.depthCanvas.height = 144;
        this.depthCanvas.style.backgroundColor = '#FFFFFF';
        this.depthCanvas.style.display = 'none';
        this.depthCanvas.imageData = this.depthCanvas.getContext('2d').createImageData(256, 144);

        this.colorVideo = document.createElement('video');
        this.colorVideo.width = 256;
        this.colorVideo.loop = true;
        // this.colorVideo.controls = true;
        this.colorVideo.playsInline = true;
        this.colorVideo.muted = true;
        this.colorVideo.crossOrigin = 'Anonymous';
        // this.colorVideo.style.position = 'absolute';
        // this.colorVideo.style.top = '50%';
        // this.colorVideo.style.left = '0';
        this.colorVideo.style.display = 'none';
        // document.body.appendChild(this.colorVideo);
        const source = document.createElement('source');
        source.src = this.urls.color;
        source.type = 'video/mp4';
        this.colorVideo.appendChild(source);
        this.colorVideo.sourceElement = source;
        this.colorVideo.load();
        this.colorVideo.onloadedmetadata = () => {
            this.colorVideo.loadSuccessful = true;
            if (this.rvl) {
                this.pause();
            }
        };

        this.shaderMode = ShaderMode.SOLID; // default to the non-first-person shader

        this.decoder = new TextDecoder();

        // this.debugBox = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshNormalMaterial());
        // this.phone.add(this.debugBox);

        fetch(urls.rvl).then(res => res.arrayBuffer()).then(buf => {
            this.rvl = new RVLParser(buf);
            if (this.colorVideo.loadSuccessful) {
                this.pause();
            }
            this.videoLength = this.rvl.getDuration();
            if (this.frameKey) {
                realityEditor.network.postMessageIntoFrame(this.frameKey, {onVideoMetadata: {videoLength: this.rvl.getDuration()}, id: this.id});
            }
        });

        this.onAnimationFrame = () => this.render();
        realityEditor.gui.threejsScene.onAnimationFrame(this.onAnimationFrame);
    }

    /**
     * Can add this to visualize the position where the video was recorded from
     */
    createCameraMeshGroup(color = null) {
        let cameraMeshGroup = new THREE.Group();
        
        let id = Math.floor(Math.random() * 10000);

        const geo = new THREE.BoxGeometry(100, 100, 80);
        if (!color) {
            let colorId = id;
            if (typeof id === 'string') {
                colorId = 0;
                for (let i = 0; i < id.length; i++) {
                    colorId ^= id.charCodeAt(i);
                }
            }
            let hue = ((colorId / 29) % Math.PI) * 360 / Math.PI;
            const colorStr = `hsl(${hue}, 100%, 50%)`;
            this.color = new THREE.Color(colorStr);
        } else {
            this.color = color;
        }
        this.colorRGB = [
            255 * this.color.r,
            255 * this.color.g,
            255 * this.color.b,
        ];
        let cameraMeshGroupMat = new THREE.MeshBasicMaterial({color: this.color});
        const box = new THREE.Mesh(geo, cameraMeshGroupMat);
        box.name = 'cameraVisCamera';
        box.cameraVisId = this.id;
        cameraMeshGroup.add(box);

        const geoCone = new THREE.ConeGeometry(60, 180, 16, 1);
        const cone = new THREE.Mesh(geoCone, cameraMeshGroupMat);
        cone.rotation.x = -Math.PI / 2;
        cone.rotation.y = Math.PI / 8;
        cone.position.z = 65;
        cone.name = 'cameraVisCamera';
        cone.cameraVisId = this.id;
        cameraMeshGroup.add(cone);

        return cameraMeshGroup;
    }
    
    dispose() {
        this.phoneParent.parent.remove(this.phoneParent);
        this.colorVideo.pause();
        this.colorVideo.sourceElement.remove();
        this.colorVideo.load();
        this.rvl = null;
        realityEditor.gui.threejsScene.removeAnimationCallback(this.onAnimationFrame);
    }
    
    get currentTime() {
        return this.colorVideo.currentTime;
    }
    
    set currentTime(currentTime) {
        if (currentTime > this.videoLength && this.videoLength > 0) {
            this.colorVideo.currentTime = currentTime % this.videoLength;
        } else {
            this.colorVideo.currentTime = currentTime;
        }
    }
    
    play() {
        this.state = VideoPlayerStates.PLAYING;
        if (this.frameKey) {
            realityEditor.network.postMessageIntoFrame(this.frameKey, {onVideoStateChange: this.state, id: this.id, currentTime: this.currentTime});
        }
        this.pointCloud.visible = true;
        this.colorVideo.play().then(() => {/** Empty then() callback to silence warning **/});
    }
    
    pause() {
        this.state = VideoPlayerStates.PAUSED;
        if (this.frameKey) {
            realityEditor.network.postMessageIntoFrame(this.frameKey, {onVideoStateChange: this.state, id: this.id, currentTime: this.currentTime});
        }
        this.colorVideo.pause();
    }

    show() {
        this.pointCloud.visible = true;
    }

    hide() {
        this.pointCloud.visible = false;
    }

    render() {
        if (!this.colorVideo.loadSuccessful || !this.rvl) {
            return;
        }
        if (this.lastRenderTime === this.colorVideo.currentTime) {
            return; // Do not re-render identical frames, useful when paused
        }
        this.lastRenderTime = this.colorVideo.currentTime;

        const rvlFrame = this.rvl.getFrameFromDeltaTimeSeconds(this.colorVideo.currentTime);
        this.rvl.drawFrame(rvlFrame, this.depthCanvas.getContext('2d'), this.depthCanvas.imageData);

        const rvlPayload = this.decoder.decode(rvlFrame.payload);
        this.applyMatricesMessage(rvlPayload);

        if (!this.pointCloud) {
            this.loadPointCloud();
        } else {
            this.textures.depth.needsUpdate = true;
            this.pointCloudMaterial.uniforms.time = window.performance.now();
        }
    }

    /**
     * Loads the point cloud into the scene.
     */
    loadPointCloud() {
        const width = 640;
        const height = 360;

        const geometry = new THREE.PlaneGeometry(width, height, width / 5, height / 5);
        geometry.translate(width / 2, height / 2, 0);
        const material = this.createPointCloudMaterial(this.shaderMode);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(-1, 1, -1);
        mesh.rotateZ(Math.PI);
        mesh.frustumCulled = false;
        this.pointCloud = mesh;
        this.pointCloud.visible = false; // Make visible once video starts playing to prevent black-screen from load
        this.phone.add(this.pointCloud);
    }

    /**
     * Creates the material used by the point cloud.
     * @return {*}
     */
    createPointCloudMaterial(shaderMode) {
        const width = 640;
        const height = 360;

        this.textures = {
            color: new THREE.VideoTexture(this.colorVideo),
            depth: new THREE.CanvasTexture(this.depthCanvas)
        };

        // this.textures.color.center = new THREE.Vector2(0.5, 0.5);
        // this.textures.color.rotation = Math.PI;
        // this.textures.color.flipY = false;

        this.textures.color.minFilter = THREE.LinearFilter;
        this.textures.color.magFilter = THREE.LinearFilter;
        this.textures.color.generateMipmaps = false;
        this.textures.depth.minFilter = THREE.LinearFilter;
        this.textures.depth.magFilter = THREE.LinearFilter;
        this.textures.depth.generateMipmaps = false;

        this.textures.depth.isVideoTexture = true;
        this.textures.depth.update = function() {
        };

        let fragmentShader = shaderMode === ShaderMode.SOLID ? POINT_CLOUD_FRAGMENT_SHADER : FIRST_PERSON_FRAGMENT_SHADER;

        this.pointCloudMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: {value: window.performance.now()},
                map: {value: this.textures.color},
                mapDepth: {value: this.textures.depth},
                width: {value: width},
                height: {value: height},
                depthScale: {value: 0.15 / 256}, // roughly 1 / 1920
                glPosScale: {value: 20000}, // 0.15 / 256}, // roughly 1 / 1920
                pointSize: { value: 2 * 0.666 },
            },
            vertexShader: POINT_CLOUD_VERTEX_SHADER,
            fragmentShader: fragmentShader,
            depthTest: true,
            transparent: true
        });
        return this.pointCloudMaterial;
    }

    // a simplified copy of setShaderMode from remote operator CameraVis.js
    setShaderMode(shaderMode) {
        if (shaderMode !== this.shaderMode) {
            this.shaderMode = shaderMode;
            this.pointCloudMaterial = this.createPointCloudMaterial(this.shaderMode);
            this.pointCloud.material = this.pointCloudMaterial;
        }
    }

    /* ---------------- Override Followable Functions ---------------- */
    
    doesOverrideCameraUpdatesInFirstPerson() {
        return true;
    }

    onCameraStartedFollowing() {
        // TODO: we might want to update the shader mode to a more front-legible
        //  form as soon as we start following, but this needs experimenting
    }
    
    // make sure the video switches back to volumetric mode when we stop following
    onCameraStoppedFollowing() {
        this.firstPersonMode = false;
        if (this.shaderMode === ShaderMode.FIRST_PERSON) {
            this.setShaderMode(ShaderMode.SOLID);
        }
    }

    // switch the shader mode and hide the camera mesh when fully zoomed in
    enableFirstPersonMode() {
        this.firstPersonMode = true;
        this.cameraMeshGroup.visible = false;
        if (this.shaderMode === ShaderMode.SOLID) {
            this.setShaderMode(ShaderMode.FIRST_PERSON);
        }
    }

    // switch back the shader mode when not fully zoomed in
    disableFirstPersonMode() {
        this.firstPersonMode = false;
        if (this.shaderMode === ShaderMode.FIRST_PERSON) {
            this.setShaderMode(ShaderMode.SOLID);
        }
    }

    // hide the camera mesh if we get close to it
    onFollowDistanceUpdated(currentDistance) {
        this.cameraMeshGroup.visible = currentDistance > 3000;
    }
    
    // continually update the Followable sceneNode to the position of the camera
    updateSceneNode() {
        // this.sceneNode.setLocalMatrix(this.phone.matrix.elements);
    }

    /* ---------------- Helper Functions ---------------- */

    applyMatricesMessage(matricesMsg) {
        const matrices = JSON.parse(matricesMsg);
        const rootNode = new realityEditor.sceneGraph.SceneNode('ROOT');
        rootNode.updateWorldMatrix();

        let cameraNode = new realityEditor.sceneGraph.SceneNode('camera');
        cameraNode.setLocalMatrix(matrices.camera);
        cameraNode.updateWorldMatrix();

        let gpNode = new realityEditor.sceneGraph.SceneNode('gp');
        gpNode.needsRotateX = true;
        let gpRxNode = new realityEditor.sceneGraph.SceneNode('gprotateX');
        gpRxNode.addTag('rotateX');
        gpRxNode.setParent(gpNode);

        const c = Math.cos(-Math.PI / 2);
        const s = Math.sin(-Math.PI / 2);
        let rxMat = [
            1, 0, 0, 0,
            0, c, -s, 0,
            0, s, c, 0,
            0, 0, 0, 1
        ];
        gpRxNode.setLocalMatrix(rxMat);

        gpNode.setLocalMatrix(matrices.groundplane);
        gpNode.updateWorldMatrix();

        let sceneNode = new realityEditor.sceneGraph.SceneNode('scene');
        sceneNode.setParent(rootNode);

        let initialVehicleMatrix = [
            -1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, -1, 0,
            0, 0, 0, 1,
        ];

        sceneNode.setPositionRelativeTo(cameraNode, initialVehicleMatrix);
        sceneNode.updateWorldMatrix();

        let cameraMat = sceneNode.getMatrixRelativeTo(gpRxNode);
        this.setMatrixFromArray(this.phone.matrix, new Float32Array(cameraMat));
        this.phone.updateMatrixWorld(true);

        if (this.sceneNode) {
            this.sceneNode.setLocalMatrix(this.phone.matrix.elements, { recomputeImmediately: true });
        }

        if (this.firstPersonMode) {
            let matrix = this.getSceneNodeMatrix();
            let eye = new THREE.Vector3(0, 0, 0);
            eye.applyMatrix4(matrix);
            let target = new THREE.Vector3(0, 0, -1000);
            target.applyMatrix4(matrix);
            matrix.lookAt(eye, target, new THREE.Vector3(0, 1, 0));
            realityEditor.sceneGraph.setCameraPosition(matrix.elements);
        }
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
     * Takes in the stored Base64 pose data and parses it back into a matrix.
     * @param poseBase64 - The stored Base64 pose data.
     * @return {Float32Array|null} - The original pose data.
     */
    getPoseMatrixFromData(poseBase64) {
        if (!poseBase64) { return null; }

        let byteCharacters = window.atob(poseBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Float32Array(byteArray.buffer);
    }

    /**
     * Sets a matrix from the values in an array.
     * @param matrix - The matrix to set the values of.
     * @param array - The array to copy the values from.
     */
    setMatrixFromArray(matrix, array) {
        matrix.set(
            array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }
}

realityEditor.gui.ar.videoPlayback.VideoPlayer = VideoPlayer;
