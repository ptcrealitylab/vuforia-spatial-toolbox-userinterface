export const UNIFORMS = Object.freeze({
    normal1: 'normal1',
    normal2: 'normal2',
    normal3: 'normal3',
    normal4: 'normal4',
    normal5: 'normal5',
    normal6: 'normal6',
    D1: 'D1',
    D2: 'D2',
    D3: 'D3',
    D4: 'D4',
    D5: 'D5',
    D6: 'D6'
});

const GEO = Object.freeze({
    TOP: 0,
    BOTTOM: 1,
    LEFT: 2,
    RIGHT: 3,
    NEARP: 4,
    FARP: 5
});
const ANG2RAD = 3.14159265358979323846/180.0;

// http://www.lighthouse3d.com/tutorials/view-frustum-culling/geometric-approach-implementation/
export class ViewFrustum {
    constructor() {
        this.planes = [];
    }
    setCameraInternals(angle, ratio, nearD, farD) {
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
    }
    setCameraDef(p, l, u) {
        let nc,fc,X,Y,Z;
        let utils = realityEditor.gui.ar.utilities;

        // compute the Z axis of camera
        // this axis points in the opposite direction from
        // the looking direction
        Z = utils.subtract(p, l);
        Z = utils.normalize(Z);

        // X axis of camera with given "up" vector and Z axis
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
        // the function set3Points assumes that the points
        // are given in counter clockwise order
        this.planes[GEO.TOP] = new PlaneGeo().setPoints(this.ntr, this.ntl, this.ftl);
        this.planes[GEO.BOTTOM] = new PlaneGeo().setPoints(this.nbl, this.nbr, this.fbr);
        this.planes[GEO.LEFT] = new PlaneGeo().setPoints(this.ntl, this.nbl, this.fbl);
        this.planes[GEO.RIGHT] = new PlaneGeo().setPoints(this.nbr, this.ntr, this.fbr);
        this.planes[GEO.NEARP] = new PlaneGeo().setPoints(this.ntl, this.ntr, this.nbr);
        this.planes[GEO.FARP] = new PlaneGeo().setPoints(this.ftr, this.ftl, this.fbl);

        // TODO: replace with setNormalAndPoint implementation
    }
    isPointInFrustum(p) {
        for (let i = 0; i < 6; i++) {
            if (this.planes[i].distance(p) < 0) {
                return false; // outside
            }
        }
        return true; // inside
    }
}

class PlaneGeo {
    constructor(p1, p2, p3) {
        if (p1 && p2 && p3) {
            this.setPoints(p1, p2, p3);
        }
    }
    /**
     * Assumes points are given in clockwise order
     * @param p1
     * @param p2
     * @param p3
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
    // setNormalAndPoint(normal, point) {
    //     this.normal = normal;
    //     this.point = point;
    //     return this;
    // }
    // returns signed distance to a point
    distance(p) {
        // let distance = this.A * p[0] + this.B * p[1] + this.C * p[2] + D
        return realityEditor.gui.ar.utilities.dotProduct(this.normal, p) + this.D;
    }
}

export const frustumVertexShader = function() {
    return THREE.ShaderChunk.meshphysical_vert
        .replace('#define STANDARD', `#define STANDARD
            // #define USE_TRANSMISSION
            `)
        .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
            
            // gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    // orth_dist = length((position - coneTipPoint) - cone_dist * coneDirection);
    
        vPosition = position.xyz;
            
    `).replace('#include <common>', `#include <common>
    // varying float len; // calculates this for initial loading animation
    // uniform vec3 coneTipPoint; // pass in the position of a camera
        varying vec3 vPosition;

    `);
}

export const frustumFragmentShader = function() {
    let condition = `
    bool inside1 = isInside(normal1, D1, vPosition); // top (when un-rotated)
    bool inside2 = isInside(normal2, D2, vPosition); // bottom
    bool inside3 = isInside(normal3, D3, vPosition); // left
    bool inside4 = isInside(normal4, D4, vPosition); // right (when un-rotated)
    bool inside5 = isInside(normal5, D5, vPosition); // near
    bool inside6 = isInside(normal6, D6, vPosition); // far
    
    if (inside1 && inside2 && inside3 && inside4 && inside5 && inside6) discard;
    // if (inside1 && inside2 && inside3 && inside4 && inside6) discard;
    `;
    // 'if (inside > 0.5) discard;'
    return THREE.ShaderChunk.meshphysical_frag
        .replace('#include <clipping_planes_fragment>', `
                         ${condition}

                         #include <clipping_planes_fragment>`)
        // .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `vec4 diffuseColor = vec4( diffuse, opacity );
        // if (!inside5) diffuseColor.x = 1.0; //vec4(1.0, 0.0, 0.0, 1.0);
        // if (!inside3) diffuseColor.y = 1.0; //vec4(1.0, 0.0, 0.0, 1.0);
        // if (!inside4) diffuseColor.z = 1.0; //vec4(1.0, 0.0, 0.0, 1.0);
        //
        // `)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
            // gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
            // if (inside5 && inside6) gl_FragColor.x = 1.0;
            // if (inside1 && inside2 && inside3 && inside4) gl_FragColor.y = 1.0;
            // if (!inside4) gl_FragColor.z = 1.0;
            `)
        .replace(`#include <common>`, `
                         #include <common>
    
    uniform int numFrustums;
    struct Frustum {
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
    }
    uniform Frustum frustums[numFrustums];
    
    uniform vec3 normal1;
    uniform vec3 normal2;
    uniform vec3 normal3;
    uniform vec3 normal4;
    uniform vec3 normal5;
    uniform vec3 normal6;
    uniform float D1;
    uniform float D2;
    uniform float D3;
    uniform float D4;
    uniform float D5;
    uniform float D6;
    // varying vec3 vWorldPosition;
    varying vec3 vPosition;
    
    bool isInside(vec3 normal, float D, vec3 point)
    {
        return dot(normal, point) + D > 0.0;
    }
    `);
}
