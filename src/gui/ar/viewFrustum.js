/*
* Created by Ben Reynolds on 10/05/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/**
 * This is an implementation of a view frustum for the Spatial Toolbox camera
 * system, which can be used to cull objects that are outside the viewport
 */
(function(exports) {

    const utils = realityEditor.gui.ar.utilities;
    const ANG2RAD = Math.PI / 180.0;
    let frustum = new Frustum(63.54, 4/3, 2, 2000);

    // Implementation derived from:
    // http://www.lighthouse3d.com/tutorials/view-frustum-culling/radar-approach-implementation/
    function Frustum(angle, ratio, nearD, farD) {
        this.angle = angle;
        this.ratio = ratio;
        this.nearD = nearD;
        this.farD = farD;

        this.tang = Math.tan(ANG2RAD * angle * 0.5);
        this.nearH = nearD * this.tang;
        this.nearW = this.nearH * ratio;
        
        this.farH = farD * this.tang;
        this.farW = this.farH * ratio;
    }

    // each time the camera position or orientation changes, this function should
    // be called as well
    Frustum.prototype.setCamDef = function(position, lookAtVector, upVector) {
        this.camPos = position;
        
        // compute the Z axis of the camera referential
        // this axis points in the same direction from
        // the looking direction
        this.Z = normalize(add(lookAtVector, negate(position)));

        // X axis of camera is the cross product of Z axis and given "up" vector 
        this.X = normalize(crossProduct(this.Z, upVector));

        // the real "up" vector is the cross product of X and Z
        this.Y = crossProduct(this.X, this.Z);
    };
    
    Frustum.prototype.isPointInside = function(p) {
        if (!this.camPos) { console.warn('setCamDef must be called first'); }
        
        let pcz,pcx,pcy,aux;

        // compute vector from camera position to p
        let v = add(p, negate(this.camPos));
        
        // project the point onto the Z axis of the frustum and see if it lies between near and far
        pcz = dotProduct(v, negate(this.Z)); // v.innerProduct(-Z);
        // pcz = dotProduct(v, this.Z); // v.innerProduct(-Z);
        console.log('\npcz= ' + pcz + ' > 2 && < 2000 ?');
        if (pcz > this.farD || pcz < this.nearD) {
            return false;
        }

        // compute and test the Y coordinate
        pcy = dotProduct(v, this.Y); // v.innerProduct(Y);
        aux = pcz * this.tang;
        console.log('pcy= ' + pcy + ' |<| ' + aux + ' ?');
        if (pcy > aux || pcy < -aux) {
            return false;
        }

        // compute and test the X coordinate
        pcx = dotProduct(v, this.X); // v.innerProduct(X);
        aux = aux * this.ratio;
        console.log('pcx= ' + pcx + ' |<| ' + aux + ' ?');
        if (pcx > aux || pcx < -aux) {
            return false;
        }

        return true;
    };

    // // Working look-at matrix generator (with a set of vector3 math functions)
    // function lookAt( eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ ) {
    //     var ev = [eyeX, eyeY, eyeZ];
    //     var cv = [centerX, centerY, centerZ];
    //     var uv = [upX, upY, upZ];
    //
    //     var n = normalize(add(ev, negate(cv))); // vector from the camera to the center point
    //     var u = normalize(crossProduct(uv, n)); // a "right" vector, orthogonal to n and the lookup vector
    //     var v = crossProduct(n, u); // resulting orthogonal vector to n and u, as the up vector isn't necessarily one anymore
    //
    //     return [u[0], v[0], n[0], 0,
    //         u[1], v[1], n[1], 0,
    //         u[2], v[2], n[2], 0,
    //         dotProduct(negate(u), ev), dotProduct(negate(v), ev), dotProduct(negate(n), ev), 1];
    // }

    // function scalarMultiply(A, x) {
    //     return [A[0] * x, A[1] * x, A[2] * x];
    // }

    function negate(A) {
        return [-A[0], -A[1], -A[2]];
    }

    function add(A, B) {
        return [A[0] + B[0], A[1] + B[1], A[2] + B[2]];
    }

    function magnitude(A) {
        return Math.sqrt(A[0] * A[0] + A[1] * A[1] + A[2] * A[2]);
    }

    function normalize(A) {
        var mag = magnitude(A);
        return [A[0] / mag, A[1] / mag, A[2] / mag];
    }

    function crossProduct(A, B) {
        var a = A[1] * B[2] - A[2] * B[1];
        var b = A[2] * B[0] - A[0] * B[2];
        var c = A[0] * B[1] - A[1] * B[0];
        return [a, b, c];
    }

    function dotProduct(A, B) {
        return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
    }
    
    exports.updateCameraMatrix = function(m) {
        let position = [m[12], m[13], m[14]];
        let lookAt = [m[8], m[9], m[10]];
        let up = [m[4], m[5], m[6]];
        
        frustum.setCamDef(position, lookAt, up);
    };
    
    exports.isPointInside = function(x, y, z) {
        return frustum.isPointInside([x, y, z]);
    }
    
})(realityEditor.gui.ar.viewFrustum);
