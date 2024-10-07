/**
 * todo Steve: define some variable values & their dummy value:
 * region id: 0, 1, 2, ..., region count; -1
 * label id: 0, 1, 2, ..., label count; -1
 * collide index: 0, 1, 2, ..., vertex count; -1
 * pending hidden splat indices: [0, 1, 2, ..., vertex count]; [-1]
 **/

const PENDING_SPLATS_MAX_SIZE = 20;
export function vertexShaderSource(splatRegionCount) {
    return `
    #version 300 es
    precision highp float;
    precision highp int;
    
    uniform highp usampler2D u_texture;
    uniform mat4 projection, view;
    uniform vec2 focal;
    uniform vec2 viewport;
    uniform vec2 uMouse;
    
    // visibility settings
    uniform bool uToggleBoundary;
    uniform float uWorldLowAlpha;
    
    struct SplatRegionInfo {
        float regionId;
        vec3 positionOffset;
        vec4 quaternion;
        vec3 boundaryMin;
        vec3 boundaryMax;
    };
    uniform SplatRegionInfo splatRegionInfos[${splatRegionCount}];
    
    uniform int uCollideIndex;
    
    uniform float mode;
    uniform float uLabel;
    uniform float uRegion;
    
    // editing gaussian splatting, highlight, delete, revert
    uniform bool uEdit;
    uniform int pendingHiddenSplatIndices[${PENDING_SPLATS_MAX_SIZE}]; // dirty fix: a smaller fixed-size array
    
    in vec2 position;
    in int index;
    
    out vec4 vColor;
    out vec4 vFBOPosColor;
    out vec2 vPosition;
    out vec4 vDebug2;
    out float vShouldDisplay;
    out float vIndex;
    
    vec3 randomNoiseVec3(float seed1, float seed2) {
        float x = fract(sin(seed1 * 34.678 + seed2 * 23.458) * 41.89);
        float y = fract(cos(sin(seed1 + seed2 + seed1 * seed2 * seed1) * 56.743 + 18.794) * 93.37);
        float z = fract(sin(cos(seed1 * 89.32 + seed2 * seed2) * 23.167 + 28.842) * 84.273);
        return vec3(x, y, z);
    }
    
    mat3 quaternionToRotationMatrix(vec4 q) {
            float l = length(q);
            float x = -q.x / l; // need conjugate of this quaternion in the shader to work
            float y = -q.y / l;
            float z = -q.z / l;
            float w = q.w / l;
            return mat3(
                1. - 2.*y*y - 2.*z*z, 2.*x*y - 2.*w*z, 2.*x*z + 2.*w*y,
                2.*x*y + 2.*w*z, 1. - 2.*x*x - 2.*z*z, 2.*y*z - 2.*w*x,
                2.*x*z - 2.*w*y, 2.*y*z + 2.*w*x, 1. - 2.*x*x - 2.*y*y
            );
        }
    
    void main () {
        uvec4 cen = texelFetch(u_texture, ivec2((uint(index) & 0x3ffu) << 1, uint(index) >> 10), 0);
        int displayOrHidden = int((cen.w >> 8) & 0xffu);
        if (displayOrHidden == 0) {
            gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
            return;
        }
        int regionId = int((cen.w >> 16) & 0xffu);
        vec3 pos = uintBitsToFloat(cen.xyz);
        vec3 bMin = splatRegionInfos[regionId].boundaryMin;
        vec3 bMax = splatRegionInfos[regionId].boundaryMax;
        if (pos.x < bMin.x || pos.y < bMin.y || pos.z < bMin.z || pos.x > bMax.x || pos.y > bMax.y || pos.z > bMax.z) { // out of boundary
            gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
            return;
        }
        mat3 rot = quaternionToRotationMatrix(splatRegionInfos[regionId].quaternion);
        pos = rot * pos;
        pos += splatRegionInfos[regionId].positionOffset;
        vec4 cam = view * vec4(pos, 1);
        if (cam.z < 1.) { // splats in front of the camera within some distance will be hidden, note that this is camera space, range NOT [-1., 1.]        
            gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
            return;
        }
        vec4 pos2d = projection * cam;
    
        float clip = 1.2 * pos2d.w;
        if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip) {
            gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
            return;
        }
    
        uvec4 cov = texelFetch(u_texture, ivec2(((uint(index) & 0x3ffu) << 1) | 1u, uint(index) >> 10), 0);
        vec2 u1 = unpackHalf2x16(cov.x), u2 = unpackHalf2x16(cov.y), u3 = unpackHalf2x16(cov.z);
        mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);
    
        mat3 J = mat3(
            focal.x / cam.z, 0., -(focal.x * cam.x) / (cam.z * cam.z),
            0., -focal.y / cam.z, (focal.y * cam.y) / (cam.z * cam.z),
            0., 0., 0.
        );
    
        mat3 T = transpose(mat3(view) * rot) * J;
        mat3 cov2d = transpose(T) * Vrk * T;
    
        float mid = (cov2d[0][0] + cov2d[1][1]) / 2.0;
        float radius = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
        float lambda1 = mid + radius, lambda2 = mid - radius;
    
        if(lambda2 < 0.0) return;
        vec2 diagonalVector = normalize(vec2(cov2d[0][1], lambda1 - cov2d[0][0]));
        vec2 majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
        vec2 minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);
    
        // vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu) / 255.0;
        float label = float((cen.w >> 24) & 0xffu);
        // (uLabel == -1.) && (uRegion == -1.) ---> render everything
        // (uLabel != -1.) && (uRegion != -1.) && 
        bool dont_render = (uLabel != -1.) && (uRegion != -1.) && !( (uLabel == label) && (uRegion == float(regionId)) );
        // dont_render = false;
        if (mode == 0.) { // normal color mode
            vec3 color = vec3((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu) / 255.0;
            float opacity = float((cov.w >> 24) & 0xffu) / 255.0;
            if (dont_render) {
                color = vec3(0.);
                opacity = 0.;
            }
            vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4(color, opacity);
        } else if (mode == 1.) { // label color mode
            // vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cen.w) & 0xffu, (cen.w >> 8) & 0xffu, (cen.w >> 16) & 0xffu, (cen.w >> 24) & 0xffu) / 255.0;
            vec3 color = randomNoiseVec3(float(regionId), label);
            float opacity = float((cov.w >> 24) & 0xffu) / 255.0;
            if (dont_render) {
                color = vec3(0.);
                opacity = 0.;
            }
            vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4(color, opacity);
        }
        vPosition = position;
    
        vec2 vCenter = vec2(pos2d) / pos2d.w;
    
        
        // output cam space z depth for accurate mouse raycasting, also output splat index for raycast highlighting --- if want to do it in the future
        // MUST output alpha value to 1., otherwise the rendering won't work b/c of the painter's algorithm !!!!!!
        float regionAndLabel = float(regionId << 16) + label;
        vFBOPosColor = vec4(cam.z, index, regionAndLabel, 1.);
        
        if (index == uCollideIndex) {
            vIndex = 1.;
        } else {
            vIndex = 0.;
        }
        if (uEdit) {
            for (int i = 0; i < ${PENDING_SPLATS_MAX_SIZE}; i++) {
                if (index == pendingHiddenSplatIndices[i]) {
                    vIndex = 1.;
                    break;
                }
            }
        }
        
        bool isOutOfAlpha = uToggleBoundary ? vColor.a < uWorldLowAlpha : false;
        vShouldDisplay = 1.;
        if (!isOutOfAlpha) {
            // vShouldDisplay = 1.;
        } else {
            vShouldDisplay = 0.;
        }
        
        gl_Position = vec4(
            vCenter
            + position.x * majorAxis / viewport
            + position.y * minorAxis / viewport, (vShouldDisplay == 1. ? 0. : 2.), 1.0);
    }
    `.trim();
}

export function fragmentShaderSource() {
    return `
    #version 300 es
    precision highp float;
    
    uniform bool uIsGSRaycasting;
    
    uniform bool uEdit;
    
    in vec4 vColor;
    in vec4 vFBOPosColor;
    in vec2 vPosition;
    in float vShouldDisplay;
    in float vIndex;
    
    out vec4 fragColor;
    
    void main () {
        
        float A = -dot(vPosition, vPosition);
        if (A < -4.0) discard;
        
        if (uIsGSRaycasting) {
            fragColor = vFBOPosColor;
            return;
        }
        
        float B = exp(A) * vColor.a;
        
        vec3 col = vShouldDisplay > 0.5 ? B * vColor.rgb : vec3(0.); // original color
        float a = vShouldDisplay > 0.5 ? B : 0.; // original alpha
        
        // visualize splat geometry with while outlines
        // col = vColor.rgb;
        // a = 1.;
        // float blur = fwidth(A) * 5.;
        // float border = smoothstep(blur, -blur, A + 4.0);
        // col = mix(col, vec3(1.), border);
        
        // debug FBO color
        // col = vFBOPosColor.xyz;
        // a = 1.;
        
        bool isMouseCollided = vIndex > 0.5 ? true : false;
        
        if ( isMouseCollided && (vShouldDisplay > 0.5) ) {
            // highlight selected splats
            if ( uEdit ) {
                col = vec3(1.);
                a = 1.;
            }
        }
    
        fragColor = vec4(col, a);
        return;
    }
    `.trim();
}
