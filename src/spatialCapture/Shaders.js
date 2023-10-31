import * as THREE from '../../thirdPartyCode/three/three.module.js';

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

const ZDEPTH = false;
export const vertexShader = `
uniform sampler2D map;
uniform sampler2D mapDepth;

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

void main() {
vUv = vec2(position.x / width, position.y / height);

vec4 color = texture2D(mapDepth, vUv);
${(!ZDEPTH) ? `
float depth = 5000.0 * (color.r + color.g / 255.0 + color.b / (255.0 * 255.0));
` : `
// color.rgb are all 0-1 when we want them to be 0-255 so we can shift out across depth (mm?)
int r = int(color.r * 255.0);
int g = int(color.g * 255.0);
int b = int(color.b * 255.0);

float depth = float((r & 1) |
  ((g & 1) << 1) |
  ((b & 1) << 2) |
  ((r & (1 << 1)) << (3 - 1)) |
  ((g & (1 << 1)) << (4 - 1)) |
  ((b & (1 << 1)) << (5 - 1)) |
  ((r & (1 << 2)) << (6 - 2)) |
  ((g & (1 << 2)) << (7 - 2)) |
  ((b & (1 << 2)) << (8 - 2)) |
  ((r & (1 << 3)) << (9 - 3)) |
  ((g & (1 << 3)) << (10 - 3)) |
  ((b & (1 << 3)) << (11 - 3)) |
  ((r & (1 << 4)) << (12 - 4)) |
  ((g & (1 << 4)) << (13 - 4)) |
  ((b & (1 << 4)) << (14 - 4)) |
  ((r & (1 << 5)) << (15 - 5)) |
  ((g & (1 << 5)) << (16 - 5)) |
  ((b & (1 << 5)) << (17 - 5)) |
  ((r & (1 << 6)) << (18 - 6)) |
  ((g & (1 << 6)) << (19 - 6)) |
  ((b & (1 << 6)) << (20 - 6)) |
  ((r & (1 << 7)) << (21 - 7)) |
  ((g & (1 << 7)) << (22 - 7)) |
  ((b & (1 << 7)) << (23 - 7))) *
  (5000.0 / float(1 << 24));
`}
float z = (depth - 1.0) * patchLoading;

// Projection code by @kcmic
pos = vec4(
(position.x - principalPoint.x) / focalLength.x * z,
(position.y - principalPoint.y) / focalLength.y * z,
-z,
1.0);

gl_Position = projectionMatrix * modelViewMatrix * pos;
// gl_PointSize = pointSizeBase + pointSize * depth * depthScale;
gl_PointSize = pointSizeBase + pointSize * depth * depthScale + glPosScale / gl_Position.w;
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
vec3 normal = normalize(cross(dFdx(pos.xyz), dFdy(pos.xyz)));

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
vec3 normal = normalize(cross(dFdx(pos.xyz), dFdy(pos.xyz)));

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

export function createPointCloud(texture, textureDepth, shaderMode, borderColor) {
    const width = 640, height = 360;

    let geometry;
    if (shaderMode !== ShaderMode.POINT) {
        geometry = new THREE.PlaneBufferGeometry(width, height, DEPTH_WIDTH / 2, DEPTH_HEIGHT / 2);
        geometry.translate(width / 2, height / 2);
    } else {
        geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array(width * height * 3);

        for (let i = 0, j = 0, l = vertices.length; i < l; i += 3, j ++) {
            vertices[i] = j % width;
            vertices[i + 1] = Math.floor(j / width);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }

    const material = createPointCloudMaterial(texture, textureDepth, shaderMode, borderColor);

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

export function createPointCloudMaterial(texture, textureDepth, shaderMode, borderColor) {
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
            mapDepth: {value: textureDepth},
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
