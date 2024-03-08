import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { MeshBVH } from '../../thirdPartyCode/three-mesh-bvh.module.js';

export const DEPTH_WIDTH = 256;
export const DEPTH_HEIGHT = 144;

export const ShaderMode = {
    SOLID: 'SOLID',
    POINT: 'POINT',
    HOLO: 'HOLO',
    DIFF: 'DIFF',
    DIFF_DEPTH: 'DIFF_DEPTH',
    FIRST_PERSON: 'FIRST_PERSON',
    HIDDEN: 'HIDDEN',
};

export const vertexShader = `
uniform sampler2D map;

uniform float width;
uniform float height;
uniform float depthScale;
uniform float glPosScale;
uniform float patchLoading;

uniform float pointSize;
uniform vec2 focalLength;
uniform vec2 principalPoint;
const float pointSizeBase = 0.0;

varying vec2 vUv;
varying vec4 pos;
varying vec3 nor;

void main() {
vUv = uv; // vec2(position.x / width, position.y / height);
float z = position.z * patchLoading;

// Projection code by @kcmic
pos = vec4(
position.x,
position.y,
z,
1.0);

gl_Position = projectionMatrix * modelViewMatrix * pos;
// gl_PointSize = pointSizeBase + pointSize * depth * depthScale;
gl_PointSize = pointSizeBase + pointSize * z * depthScale + glPosScale / gl_Position.w;
nor = normal;
}`;

export const pointFragmentShader = `
uniform sampler2D map;

varying vec2 vUv;

void main() {
vec4 color = texture2D(map, vUv);
gl_FragColor = vec4(color.r, color.g, color.b, 0.4);
}`;

export const holoFragmentShader = `
// color texture
uniform sampler2D map;
uniform float time;

// uv (0.0-1.0) texture coordinates
varying vec2 vUv;
// Position of this pixel relative to the camera in proper (millimeter) coordinates
varying vec4 pos;
varying vec3 nor;

void main() {
// Depth in millimeters
float depth = -pos.z;

// Fade out beginning at 4.5 meters and be gone after 5.0
float alphaDepth = clamp(2.0 * (5.0 - depth / 1000.0), 0.0, 1.0);

// Hologram effect :)
float alphaHolo = clamp(round(sin(pos.y / 3.0 - 40.0 * time) - 0.3), 0.0, 1.0) *
            clamp(sin(gl_FragCoord.x / 10.0 + gl_FragCoord.y + 40.0 * time) + sin(5.0 * time) + 1.5, 0.0, 1.0);
            // clamp(sin(sqrt(pos.x * pos.x + pos.z * pos.z) / 3.0 + 0.5) + sin(10.0 * time) + 1.5, 0.0, 1.0);

// Normal vector of the depth mesh based on pos
// Necessary to calculate manually since we're messing with gl_Position in the vertex shader
vec3 normal = nor; // normalize(cross(dFdx(pos.xyz), dFdy(pos.xyz)));

// pos.xyz is the ray looking out from the camera to this pixel
// dot of pos.xyz and the normal is to what extent this pixel is flat
// relative to the camera (alternatively, how much it's pointing at the
// camera)
// alphaDepth is thrown in here to incorporate the depth-based fade
float alpha = abs(dot(normalize(pos.xyz), normal)) * alphaDepth * alphaHolo;

// Sample the proper color for this pixel from the color image
vec4 color = texture2D(map, vUv);

gl_FragColor = vec4(color.rgb * vec3(0.1, 0.3, 0.3) + vec3(0.0, 0.7, 0.7), alpha);
}`;

export const solidFragmentShader = `
// color texture
uniform sampler2D map;
uniform vec3 borderColor;
uniform float borderEnabled;

// default to 0 if you don't want to use angle-dependent rendering
uniform float viewAngleSimilarity;
// default to 0 if you don't want to use position-dependent rendering
uniform float viewPositionSimilarity;

// uv (0.0-1.0) texture coordinates
varying vec2 vUv;
// Position of this pixel relative to the camera in proper (millimeter) coordinates
varying vec4 pos;
varying vec3 nor;
uniform float depthMin;
uniform float depthMax;
uniform float patchLoading;

void main() {
// Depth in millimeters
float depth = -pos.z;

// Fade out beginning at 4.5 meters and be gone after 5.0
float alphaDepth = clamp(2.0 * (5.0 - depth / 1000.0), 0.0, 1.0);

// Normal vector of the depth mesh based on pos
// Necessary to calculate manually since we're messing with gl_Position in the vertex shader
vec3 normal = nor; // normalize(cross(dFdx(pos.xyz), dFdy(pos.xyz)));

// pos.xyz is the ray looking out from the camera to this pixel
// dot of pos.xyz and the normal is to what extent this pixel is flat
// relative to the camera (alternatively, how much it's pointing at the
// camera)
// Roughly calculated curve such that fading starts at 45 degrees and is done
// by ~78
float alphaNorm = clamp(1.75 * abs(dot(normalize(pos.xyz), normal)) - 0.2, 0.0, 1.0);

// we check how the current viewing angle and position compares to the
// position and angle that the point cloud was captured at.
// we don't use the alphaNorm if viewing from similar angle/position
// this gives a "flatter"/fuller picture when viewing straight-on
float viewAngleFadeFactor = pow(viewAngleSimilarity, 20.0); // drop off very quickly if not viewing straight-on
float viewPositionFadeFactor = pow(viewPositionSimilarity, 2.0);
float viewFadeFactor = viewAngleFadeFactor * viewPositionFadeFactor;
alphaNorm = (1.0 - viewFadeFactor) * alphaNorm + viewFadeFactor * 1.0;

// alphaDepth is thrown in here to incorporate the depth-based fade
float alpha = alphaNorm * alphaDepth;

alpha = alpha * (1.0 - step(depthMax, depth)) * step(depthMin, depth);

// Sample the proper color for this pixel from the color image, fading from
// white when animating patch loading
float colorPatchLoading = patchLoading * patchLoading;
vec4 color = mix(vec4(1.0, 1.0, 1.0, 1.0), texture2D(map, vUv), colorPatchLoading);

float aspect = 1920.0 / 1080.0;
float borderScale = 0.001 * 5000.0 / (depth + 50.0);
float border = borderEnabled * clamp(
  (1.0 - step(borderScale, vUv.x)) +
  (1.0 - step(borderScale * aspect, vUv.y)) +
  step(1.0 - borderScale, vUv.x) +
  step(1.0 - borderScale * aspect, vUv.y),
  0.0,
  1.0
);
if (alpha < 0.02) {
  discard; // Necessary to prevent weird transparency errors when overlapping with self
}
// gl_FragColor = vec4(color.rgb, alpha);
gl_FragColor = (1.0 - border) * vec4(color.rgb, alpha) + border * vec4(borderColor.rgb, alpha);

// gl_FragColor = vec4(alphaNorm, alphaNorm, alphaDepth, 1.0);
// gl_FragColor = vec4(nor, 1.0);
}`;

export const firstPersonFragmentShader = `
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

/**
 * @param {THREE.Texture} textureDepth
 * @return {Float32Array} rawDepth
 */
function textureDepthToRawDepth(textureDepth) {
    const canvas = document.createElement('canvas');
    canvas.width = DEPTH_WIDTH;
    canvas.height = DEPTH_HEIGHT;
    const context = canvas.getContext('2d');
    context.drawImage(textureDepth.image, 0, 0);
    const imageData = context.getImageData(0, 0, DEPTH_WIDTH, DEPTH_HEIGHT);

    let rawDepth = new Float32Array(DEPTH_WIDTH * DEPTH_HEIGHT);

    for (let i = 0; i < DEPTH_WIDTH * DEPTH_HEIGHT; i++) {
        const r = imageData.data[4 * i + 0];
        const g = imageData.data[4 * i + 1];
        const b = imageData.data[4 * i + 2];

        let depth = 5000.0 * (r + g / 255.0 + b / (255.0 * 255.0)) / 255.0;
        rawDepth[i] = depth;
    }
    return rawDepth;
}

/**
 * @param {THREE.Texture} texture
 * @param {THREE.Texture} textureDepth
 * @param {ShaderMode} shaderMode
 * @param {THREE.Color?} borderColor
 */
export function createPointCloud(texture, textureDepth, shaderMode, borderColor) {
    const width = 640, height = 360;

    let rawDepth = textureDepthToRawDepth(textureDepth);

    let geometry;

    if (shaderMode !== ShaderMode.POINT) {
        // Creates one vertex for each of the depth image's pixels
        geometry = new THREE.PlaneBufferGeometry(width, height, DEPTH_WIDTH - 1, DEPTH_HEIGHT - 1);
        geometry.translate(width / 2, height / 2);
        let position = geometry.attributes.position;

        // Defaults taken from iPhone 13 Pro Max
        const focalLength = new THREE.Vector2(1393.48523 / 1920 * width, 1393.48523 / 1080 * height);
        // convert principal point from image Y-axis bottom-to-top in Vuforia to top-to-bottom in OpenGL
        const principalPoint = new THREE.Vector2(959.169433 / 1920 * width, (1080 - 539.411926) / 1080 * height);

        for (let i = 0; i < position.count; i++) {
            let depth = rawDepth[i];
            position.array[i * 3 + 0] = (position.array[i * 3 + 0] - principalPoint.x) / focalLength.x * depth;
            position.array[i * 3 + 1] = (position.array[i * 3 + 1] - principalPoint.y) / focalLength.y * depth;
            position.array[i * 3 + 2] = -depth;
        }
        geometry.setAttribute('position', position);
        geometry.computeVertexNormals();
        geometry.boundsTree = new MeshBVH(geometry);
    } else {
        geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array(width * height * 3);

        for (let i = 0, j = 0, l = vertices.length; i < l; i += 3, j ++) {
            vertices[i] = j % width;
            vertices[i + 1] = Math.floor(j / width);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }

    const material = createPointCloudMaterial(texture, shaderMode, borderColor);

    let mesh;
    if (shaderMode !== ShaderMode.POINT) {
        mesh = new THREE.Mesh(geometry, material);
    } else {
        mesh = new THREE.Points(geometry, material);
    }
    mesh.scale.set(-1, 1, -1);
    mesh.frustumCulled = false;
    mesh.layers.enable(2);

    return mesh;
}

export function createPointCloudMaterial(texture, shaderMode, borderColor) {
    const width = 640, height = 360;

    let borderEnabled = 1;
    if (!borderColor) {
        borderColor = new THREE.Color(0.0, 1.0, 0.0);
        borderEnabled = 0;
    }

    let fragmentShader;
    switch (shaderMode) {
    case ShaderMode.POINT:
        fragmentShader = pointFragmentShader;
        break;
    case ShaderMode.HOLO:
        fragmentShader = holoFragmentShader;
        break;
    case ShaderMode.FIRST_PERSON:
        fragmentShader = firstPersonFragmentShader;
        break;
    case ShaderMode.SOLID:
    case ShaderMode.DIFF:
    default:
        fragmentShader = solidFragmentShader;
        break;
    }

    let material = new THREE.ShaderMaterial({
        uniforms: {
            depthMin: {value: 100},
            depthMax: {value: 5000},
            time: {value: window.performance.now()},
            map: {value: texture},
            width: {value: width},
            height: {value: height},
            depthScale: {value: 0.15 / 256}, // roughly 1 / 1920
            glPosScale: {value: 20000}, // 0.15 / 256}, // roughly 1 / 1920
            // pointSize: { value: 8 * 0.666 * 0.15 / 256 },
            pointSize: { value: 2 * 0.666 },
            borderColor: { value: borderColor },
            borderEnabled: { value: borderEnabled },
            // Fraction that this is done loading (1.0 for completed or not-patch)
            patchLoading: { value: 1.0 },
            // Defaults taken from iPhone 13 Pro Max
            focalLength: { value: new THREE.Vector2(1393.48523 / 1920 * width, 1393.48523 / 1080 * height) },
            // convert principal point from image Y-axis bottom-to-top in Vuforia to top-to-bottom in OpenGL
            principalPoint: { value: new THREE.Vector2(959.169433 / 1920 * width, (1080 - 539.411926) / 1080 * height) },
            // can be used to lerp between shader properties based on if you're observing from same angle as recorded
            viewAngleSimilarity: { value: 0.0 },
            viewPositionSimilarity: { value: 0.0 }
        },
        vertexShader,
        fragmentShader,
        // blending: THREE.AdditiveBlending,
        depthTest: shaderMode !== ShaderMode.FIRST_PERSON,
        // depthWrite: false,
        transparent: true
    });

    return material;
}
