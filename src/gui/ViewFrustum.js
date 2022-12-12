import { ShaderChunk } from '../../thirdPartyCode/three/three.module.js';

// Set this to how many users can possibly be holding virtualizers at the same time
// This populates the frustum shader with this many placeholder frustums, since array must compile with fixed length
const MAX_VIEW_FRUSTUMS = 5;

// names of the uniforms used in the frustum vertex and fragment shaders
const UNIFORMS = Object.freeze({
    numFrustums: 'numFrustums',
    frustums: 'frustums',
});

const PLANES = Object.freeze({
    TOP: 0,
    BOTTOM: 1,
    LEFT: 2,
    RIGHT: 3,
    NEARP: 4,
    FARP: 5
});
const ANG2RAD = Math.PI / 180.0;

/**
 * Geometrically defines a viewing frustum, based on the cameraInternals (FoV, aspect ratio, etc), and the
 * position and direction of the camera. Frustum is represented internally by 6 planes (near, far, left, right, top, bottom).
 * To tell if something is within the frustum, check whether its signed distance to all planes is positive.
 * Source: http://www.lighthouse3d.com/tutorials/view-frustum-culling/geometric-approach-implementation/
 */
class ViewFrustum {
    constructor() {
        this.planes = [];
    }
    /**
     * Configures the "shape" of the frustum based on camera properties
     * @param {number} angle – vertical FoV angle in degrees (e.g. iPhoneVerticalFOV = 41.22673)
     * @param {number} ratio – aspect ratio, e.g. 1920/1080
     * @param {number} nearD – near plane distance in scene units, e.g. 0.1 meters
     * @param {number} farD – far plane distance in scene units, e.g. 5 meters
     * @param {boolean|undefined} dontAutoRecompute - pass in true if you plan to call setCameraDef immediately afterwards with new params
     */
    setCameraInternals(angle, ratio, nearD, farD, dontAutoRecompute) {
        // store the information
        this.ratio = ratio;
        this.angle = angle;
        this.nearD = nearD;
        this.farD = farD;

        // compute width and height of the near and far plane sections
        let tang = Math.tan(ANG2RAD * angle * 0.5) ;
        this.nh = nearD * tang;
        this.nw = this.nh * ratio;
        this.fh = farD  * tang;
        this.fw = this.fh * ratio;

        // Note: if you change this after setCameraDef, you need to call setCameraDef again to recompute the planes
        if (!dontAutoRecompute && typeof this.p !== 'undefined' && typeof this.l !== 'undefined' && typeof this.u !== 'undefined') {
            this.setCameraDef(this.p, this.l, this.u);
        }
    }

    /**
     * Updates the position and orientation of the view frustum by
     * setting the position, direction, and up vector of the camera
     * @param {number[]} p – the position of the camera
     * @param {number[]} l – the *position* of what the camera is looking at (this is not the normalized forward vector)
     * @param {number[]} u – the normalized up vector
     */
    setCameraDef(p, l, u) {
        this.p = p;
        this.l = l;
        this.u = u;
        let nc,fc,X,Y,Z;
        let utils = realityEditor.gui.ar.utilities;

        // compute the Z-axis of camera
        // this axis points in the opposite direction from the looking direction
        Z = utils.subtract(p, l);
        Z = utils.normalize(Z);

        // X-axis of camera with given "up" vector and Z-axis
        X = utils.crossProduct(u, Z);
        X = utils.normalize(X);

        // the real "up" vector is the cross product of Z and X
        Y = utils.crossProduct(Z, X);

        // compute the centers of the near and far planes
        nc = utils.subtract(p, utils.scalarMultiply(Z, this.nearD));
        fc = utils.subtract(p, utils.scalarMultiply(Z, this.farD));

        // compute the 4 corners of the frustum on the near plane
        let nearScaledX = utils.scalarMultiply(X, this.nw);
        let nearScaledY = utils.scalarMultiply(Y, this.nh);
        this.ntl = utils.subtract(utils.add(nc, nearScaledY), nearScaledX);
        this.ntr = utils.add(utils.add(nc, nearScaledY), nearScaledX);
        this.nbl = utils.subtract(utils.subtract(nc, nearScaledY), nearScaledX);
        this.nbr = utils.add(utils.subtract(nc, nearScaledY), nearScaledX);

        // compute the 4 corners of the frustum on the far plane
        let farScaledX = utils.scalarMultiply(X, this.fw);
        let farScaledY = utils.scalarMultiply(Y, this.fh);
        this.ftl = utils.subtract(utils.add(fc, farScaledY), farScaledX);
        this.ftr = utils.add(utils.add(fc, farScaledY), farScaledX);
        this.fbl = utils.subtract(utils.subtract(fc, farScaledY), farScaledX);
        this.fbr = utils.add(utils.subtract(fc, farScaledY), farScaledX);

        // compute the six planes
        // assumes that the points are given in counter-clockwise order
        this.planes[PLANES.TOP] = new PlaneGeo(this.ntr, this.ntl, this.ftl);
        this.planes[PLANES.BOTTOM] = new PlaneGeo(this.nbl, this.nbr, this.fbr);
        this.planes[PLANES.LEFT] = new PlaneGeo(this.ntl, this.nbl, this.fbl);
        this.planes[PLANES.RIGHT] = new PlaneGeo(this.nbr, this.ntr, this.fbr);
        this.planes[PLANES.NEARP] = new PlaneGeo(this.ntl, this.ntr, this.nbr);
        this.planes[PLANES.FARP] = new PlaneGeo(this.ftr, this.ftl, this.fbl);
        // TODO: can be optimized with plane.setNormalAndPoint implementation from source website
    }

    /**
     * @param {number[]} p – [x, y, z]
     * @returns {boolean} – true if point lies within the volume of the view frustum
     */
    isPointInFrustum(p) {
        for (let i = 0; i < 6; i++) {
            if (this.planes[i].distance(p) < 0) {
                return false; // outside
            }
        }
        return true; // inside
    }
}

/**
 * A plane is represented in two ways: three points that sit on the plane,
 * or by the equation Ax + By + Cz + D = 0, where [A,B,C] is the normal
 * and D is the distance offset to the origin.
 * Source: http://www.lighthouse3d.com/tutorials/maths/plane/
 */
class PlaneGeo {
    /**
     * You can also omit the points from the constructor and call setPoints or setNormalAndConstant to fully initialize
     */
    constructor(p1, p2, p3) {
        if (p1 && p2 && p3) {
            this.setPoints(p1, p2, p3);
        }
    }
    /**
     * Assumes points are given in counter-clockwise order.
     * Calculates normal and constant using the points on the plane.
     * @param {number[]} p1 - [x, y, z] array
     * @param {number[]} p2 - [x, y, z] array
     * @param {number[]} p3 - [x, y, z] array
     * @returns {PlaneGeo}
     */
    setPoints(p1, p2, p3) {
        let utils =  realityEditor.gui.ar.utilities;
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;

        // plane is defined by Ax + By + Cz + D = 0
        // given p1, p2, p3 (three points on the plane) we can compute A, B, C, and D
        let v = utils.subtract(p2, p1);
        let u = utils.subtract(p3, p1);
        this.normal = utils.normalize(utils.crossProduct(v, u));
        this.A = this.normal[0];
        this.B = this.normal[1];
        this.C = this.normal[2];
        this.D = -1 * utils.dotProduct(this.normal, p1); // signed distance to the origin
        return this;
    }

    /**
     * Directly initialize the plane with its normal and constant
     * @param {number[]} normal - [x, y, z] array
     * @param {number} D
     * @returns {PlaneGeo}
     */
    setNormalAndConstant(normal, D) {
        this.normal = normal;
        this.D = D;
        return this;
    }
    /**
     * Returns signed distance from point to the plane. If positive, point is on side of plane facing the normal.
     * @param {number[]} p - [x, y, z] array
     * @returns {number}
     */
    distance(p) {
        return realityEditor.gui.ar.utilities.dotProduct(this.normal, p) + this.D;
    }
}

/**
 * Returns a GLSL vertex shader for culling the points that fall within view frustums.
 * Actually doesn't do much, the magic happens in the fragment shader.
 * @param {boolean} useLoadingAnimation – if true, calculates distance of each point to center
 * @param {{x: number, y: number, z: number}} center
 * @returns {string}
 */
const frustumVertexShader = function({useLoadingAnimation, center}) {
    let loadingCalcString = '';
    let loadingUniformString = '';
    if (useLoadingAnimation) {
        if (!center) {
            console.warn('trying to create loading animation shader without specifying center');
            center = {x: 0, y: 0, z: 0};
        }
        loadingCalcString = `len = length(position - vec3(${center.x}, ${center.y}, ${center.z}));`;
        loadingUniformString = `varying float len;`;
    }
    return ShaderChunk.meshphysical_vert
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        ${loadingCalcString}
        vPosition = position.xyz; // makes position accessible in the fragment shader
        vBarycentric = a_barycentric; // Pass barycentric to fragment shader for wireframe effect
    `).replace('#include <common>', `#include <common>
        ${loadingUniformString}
        attribute vec3 a_barycentric;
        varying vec3 vBarycentric;
        varying vec3 vPosition;
    `);
}

/**
 * Returns a GLSL fragment shader for culling the points that fall within view frustums.
 * Takes in an array of Frustum structs, which each have 6 vec3's (plane normals) and 6 floats (plane constants)
 * The frustums (uniform) array should have length MAX_VIEW_FRUSTUMS, but only the first numFrustums (uniform)
 * will be applied to discard points from rendering. The rest should have placeholder values.
 *
 * This version of the shader applies a wireframe effect within the frustum instead of discarding all points.
 * Note: you must first do geometry.toNonIndexed() and assigned barycentric coordinates to each vertex to do the wireframe effect
 * @returns {string}
 */
const frustumFragmentShader = function({useLoadingAnimation, inverted}) {
    let loadingUniformString = '';
    let loadingConditionString = '';
    if (useLoadingAnimation) {
        loadingUniformString = `
        varying float len;
        uniform float maxHeight;`
        loadingConditionString = inverted ? 'if (len < maxHeight) discard;' : 'if (len > maxHeight) discard;';
    }
    let condition = `
    ${loadingConditionString}
    bool clipped = false;
    if (numFrustums > 0)
    {
        for (int i = 0; i < numFrustums; i++)
        {
            clipped = clipped || isInsideFrustum(frustums[i]);
            if (clipped) {
                // discard; // uncomment to fully discard all points within frustums instead of wireframing them
                break;
            }
        }
    }
    `;
    return ShaderChunk.meshphysical_frag
        .replace('#include <clipping_planes_fragment>', `
                         ${condition}

                         #include <clipping_planes_fragment>`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
            // make the texture darker if a client connects
            if (numFrustums > 0 && !clipped) {
                gl_FragColor.r *= 0.5;
                gl_FragColor.g *= 0.5;
                gl_FragColor.b *= 0.5;

            // render the area inside the frustum as a wireframe
            } else if (clipped) {
                // calculate whether this point is very close to any of the three triangle edges
                float min_dist = min(min(vBarycentric.x, vBarycentric.y), vBarycentric.z);
                float edgeIntensity = 1.0 - step(0.03, min_dist); // 1 if on edge, 0 otherwise. Adjust 0.03 to make wireframe thicker/thinner.

                // uncomment to include texture in between the wireframes
                // vec4 diffuse = texture2D(u_texture, v_texcoord) * vec4(vec3(v_light_intensity), 1.0);
                // gl_FragColor = edgeIntensity * vec4(0.0, 1.0, 1.0, 1.0) + (1.0 - edgeIntensity) * diffuse;

                // white if on edge, transparent if not. adjust 0.3 to change opacity of lines.
                gl_FragColor = edgeIntensity * vec4(1.0, 1.0, 1.0, 0.3);

                // to ensure that in between the wireframes is fully transparent, it's easiest to just discard the point
                if (edgeIntensity < 0.5) {
                    discard;
                }
            }
            `)
        .replace(`#include <common>`, `
                         #include <common>
    ${loadingUniformString}
    uniform int numFrustums; // current number of frustums to apply 
    struct Frustum { // each Frustum is defined by 24 values (6 normals + 6 constants)
        vec3 normal1;
        vec3 normal2;
        vec3 normal3;
        vec3 normal4;
        vec3 normal5;
        vec3 normal6;
        float D1;
        float D2;
        float D3;
        float D4;
        float D5;
        float D6;
    };
    uniform Frustum frustums[${MAX_VIEW_FRUSTUMS}]; // MAX number of frustums that can cull the geometry
    
    varying vec3 vBarycentric;
    varying vec3 vPosition;
    // todo: this shader only works if the mesh is exported with origin at (0,0,0)
    //   and has identity scale and rotation (1 unit = 1 meter)
    //   ... perhaps swapping vPosition to vWorldPosition could fix this?
    // varying vec3 vWorldPosition;
     
    bool isInsidePlane(vec3 normal, float D, vec3 point)
    {
        return dot(normal, point) + D > 0.0;
    }

    bool isInsideFrustum(Frustum f)
    {
        bool inside1 = isInsidePlane(f.normal1, f.D1, vPosition); // top (when un-rotated)
        bool inside2 = isInsidePlane(f.normal2, f.D2, vPosition); // bottom
        bool inside3 = isInsidePlane(f.normal3, f.D3, vPosition); // left
        bool inside4 = isInsidePlane(f.normal4, f.D4, vPosition); // right (when un-rotated)
        bool inside5 = isInsidePlane(f.normal5, f.D5, vPosition); // near
        bool inside6 = isInsidePlane(f.normal6, f.D6, vPosition); // far
        
        return (inside1 && inside2 && inside3 && inside4 && inside5 && inside6);
    }
    `);
}

export {
    MAX_VIEW_FRUSTUMS,
    UNIFORMS,
    ViewFrustum,
    frustumFragmentShader,
    frustumVertexShader
}
