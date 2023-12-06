createNameSpace("realityEditor.measure.clothSimulation");

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { CSS2DObject } from '../../thirdPartyCode/three/CSS2DRenderer.js';

(function (exports) {

    const UNIT_SCALE = 1;
    
    let CLOTH_INTERVAL_ID = null;
    let CLOTH_INTERVAL_MULTIPLIER = 30;
    let CLOTH_COUNT = 0;
    let worldId = null;
    let cachedOcclusionObject = null, inverseGroundPlaneMatrix = null, intervalId = null;
    let raycastPosOffset = null;
    let isOnDesktop = undefined;
    
    function initService() {
        if (cachedOcclusionObject === null || cachedOcclusionObject === undefined || inverseGroundPlaneMatrix === null || inverseGroundPlaneMatrix === undefined) {
            intervalId = setInterval(() => {
                if (cachedOcclusionObject !== null && cachedOcclusionObject !== undefined && inverseGroundPlaneMatrix !== null && inverseGroundPlaneMatrix !== undefined) {
                    console.log(cachedOcclusionObject);
                    if (realityEditor.device.environment.isDesktop()) {
                        isOnDesktop = true;
                        raycastPosOffset = new THREE.Vector3().setFromMatrixPosition(inverseGroundPlaneMatrix).y;
                    } else {
                        isOnDesktop = false;
                        raycastPosOffset = 0;
                    }
                    clearInterval(intervalId);
                }
                if (worldId === null || worldId === undefined || cachedOcclusionObject === null || cachedOcclusionObject === undefined) {
                    worldId = realityEditor.sceneGraph.getWorldId();
                    if (worldId === null) return;
                    cachedOcclusionObject = realityEditor.gui.threejsScene.getObjectForWorldRaycasts(worldId);
                }
                if (realityEditor.sceneGraph.getGroundPlaneNode() !== undefined) {
                    let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
                    inverseGroundPlaneMatrix = new THREE.Matrix4();
                    realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
                    inverseGroundPlaneMatrix.invert();
                }
            }, 1000);
        }
        setupEventListeners();
    }

    function setupEventListeners() {
        realityEditor.network.addPostMessageHandler('measureAppSetClothPos', (msgData, fullMessageData) => {
            if (!isOnDesktop) return; // todo Steve: for now, if on mobile, disable the cloth simulation function since it's both inaccurate & slows down the entire app
            // todo Steve: besides bounding box info, we also need the volume object's uuid (b/c when finish calculating the cloth volume, we need to send & add the cloth & text under the corresponding bigParentObj
            //  we also need to have the original text label position, b/c we need to place the accurate cloth text label close by the original box volume label
            if (msgData.uuid === undefined || msgData.boundingBoxMin === undefined || msgData.boundingBoxMax === undefined) return;
            let min = msgData.boundingBoxMin;
            let max = msgData.boundingBoxMax;
            let x = max.x - min.x;
            let y = max.y - min.y;
            let z = max.z - min.z;
            let center = new THREE.Vector3((max.x + min.x) / 2, (max.y + min.y) / 2, (max.z + min.z) / 2);
            initCloth(x, y, z, center, null, msgData.uuid, fullMessageData.object, fullMessageData.frame);
            
            balanceLoad();
        })
    }
    
    function balanceLoad() {
        clearInterval(CLOTH_INTERVAL_ID);
        if (CLOTH_COUNT === 0) return;
        CLOTH_INTERVAL_ID = setInterval(() => {
            update();
        }, CLOTH_INTERVAL_MULTIPLIER * CLOTH_COUNT);
    }

    const MASS = 0.1;
    const DAMPING = 0.03;
    const DRAG = 1 - DAMPING;

    class Particle {
        constructor(indices, pos, bufferGeoIndex) {
            this.indices = {
                x: indices.x,
                y: indices.y,
                z: indices.z
            };
            this.position = new THREE.Vector3().copy(pos);
            this.previous = new THREE.Vector3().copy(pos);
            this.original = new THREE.Vector3().copy(pos); // forgot why this is useful. need to look at original cloth sim code again
            this.normal = new THREE.Vector3();
            this.bufferGeoIndex = bufferGeoIndex;

            this.hasCollided = false;
            this.collided = false;

            this.a = new THREE.Vector3(0, 0, 0); // acceleration
            this._mass = MASS;
            this.invMass = 1 / MASS;
            this.tmp = new THREE.Vector3();
            this.tmp2 = new THREE.Vector3();
            this.tmp3 = new THREE.Vector3();
        }

        getIndex() {
            return this.bufferGeoIndex;
        }

        _getIndices() {
            return this.indices;
        }

        addForce(force) {
            this.a.add(this.tmp2.copy(force).multiplyScalar(this.invMass));
        }

        integrate(timesq) {
            if (this.hasCollided) return; // todo Steve: completely immobilize the collided particle. Attempt to make the system stable
            let newPos = this.tmp.subVectors(this.position, this.previous);
            newPos.multiplyScalar(DRAG).add(this.position);
            newPos.add(this.a.multiplyScalar(timesq));
            
            // add an upper limit to the difference between the 2 positions, cannot exceed the collision threshold or the satisfy constraint threshold, to avoid overshooting past & not collide with the mesh
            this.tmp3.subVectors(newPos, this.position);
            let length = this.tmp3.length();
            if (length > COLLIDE_THRESHOLD) { // todo Steve: besides inside satisfyConstraints we should make sure each particle doesn't move past collision distance & their own constraint, 
                // todo Steve: we should also add here to make sure that they don't move past their own constraint
                //  maybe we should implement a new "integrate" function that adds up all the moves during this time step, and use a Math.min function to limit the overall transformation
                newPos = this.position.clone().add(this.tmp3.normalize().multiplyScalar(COLLIDE_THRESHOLD));
            }

            this.tmp = this.previous;
            this.previous = this.position;
            this.position = newPos;

            this.a.set(0, 0, 0);
        }

        collide(pos) { // particle collide with mesh, cannot move further. Should later change this to include bounding off force
            this.hasCollided = true;
            this.collided = true;

            this.previous.copy(pos);
            this.position.copy(pos);

            this.a.set(0, 0, 0);
        }
    }

    function xyzIndexToParticleKey(x, y, z) {
        return `(${x},${y},${z})`;
    }

    class Particles {
        constructor() {
            this.map = new Map();
        }

        // Insert an object with x, y, z
        push(x, y, z, particle) {
            const key = xyzIndexToParticleKey(x, y, z);
            this.map.set(key, particle);
        }

        // Get an object with x, y, z
        get(x, y, z) {
            const key = xyzIndexToParticleKey(x, y, z);
            return this.map.get(key);
        }

        // Check if an object with x, y, z exists
        has(x, y, z) {
            const key = xyzIndexToParticleKey(x, y, z);
            return this.map.has(key);
        }

        // Remove an object with x, y, z
        remove(x, y, z) {
            const key = xyzIndexToParticleKey(x, y, z);
            this.map.delete(key);
        }
    }

    let particles = new Particles();
    let particlesPosArr = []; // particles position array for building buffer geometry
    // todo Steve: particles UV array for building buffer geometry, currently not able to make uv's (to make a wireframe-w/o-diagonal custom shader) due to the way we use the same particle vertex position for multiple faces / indices.
    //  also cannot make everything BoxGeometry & get the points from the BoxGeometry points, b/c this way each vertex would have 3 different normals, which doesn't make sense which normal to use when raycasting to mesh bvh objects. Figure out a way to solve this problem.
    let particlesIndexArr = [];
    let restDistance = null;
    let xLength = null, yLength = null, zLength = null;
    let xSegs = null, ySegs = null, zSegs = null;
    let center = null;

    function makeParticles(x, y, z, meshCenter, dist) {
        xLength = x;
        yLength = y;
        zLength = z;
        restDistance = dist;
        COLLIDE_THRESHOLD = Math.min(COLLIDE_THRESHOLD, restDistance / 2);
        center = meshCenter;
        xSegs = Math.ceil(xLength / restDistance);
        ySegs = Math.ceil(yLength / restDistance);
        zSegs = Math.ceil(zLength / restDistance);

        let bufferGeoIndex = 0;
        const indices = {x: null, y: null, z: null};
        const pos = new THREE.Vector3();

        particles = new Particles();
        particlesPosArr = [];

        const makeParticleIndices = (xIndex, yIndex, zIndex) => {
            indices.x = xIndex;
            indices.y = yIndex;
            indices.z = zIndex;
        };
        const makeParticlePosition = (xIndex, yIndex, zIndex) => {
            pos.set(xIndex * restDistance - xLength / 2 + center.x, yIndex * restDistance - yLength / 2 + center.y, zIndex * restDistance - zLength / 2 + center.z);
            particlesPosArr.push(pos.x, pos.y, pos.z);
        };
        const makeParticleInfo = (xIndex, yIndex, zIndex) => {
            makeParticleIndices(xIndex, yIndex, zIndex);
            makeParticlePosition(xIndex, yIndex, zIndex);
        }

        // another method for generating the particles, 10 x 10 x 10 instead of 11 x 11 x 11
        // for (let zIndex = 0; zIndex < zSegs; zIndex++) {
        //     for (let xIndex = 0; xIndex < xSegs; xIndex++) {
        //         pos.set((xIndex+0.5) * restDistance - xLength / 2, (0+0.5) * restDistance - yLength / 2, (zIndex+0.5) * restDistance - zLength / 2);
        //     }
        // }
        // bottom layer, iterate 11 x 11 times, y === 0
        for (let z = 0; z <= zSegs; z++) {
            for (let x = 0; x <= xSegs; x++) {
                makeParticleInfo(x, 0, z);
                particles.push(x, 0, z, new Particle(indices, pos, bufferGeoIndex++));
            }
        }
        // front face, iterate 10 x 9 times, z === zSegs
        for (let y = 1; y < ySegs; y++) {
            for (let x = 0; x < xSegs; x++) {
                makeParticleInfo(x, y, zSegs);
                particles.push(x, y, zSegs, new Particle(indices, pos, bufferGeoIndex++));
            }
        }
        // right face, x === xSegs
        for (let y = 1; y < ySegs; y++) {
            for (let z = zSegs; z > 0; z--) {
                makeParticleInfo(xSegs, y, z);
                particles.push(xSegs, y, z, new Particle(indices, pos, bufferGeoIndex++));
            }
        }
        // back face, z === 0
        for (let y = 1; y < ySegs; y++) {
            for (let x = xSegs; x > 0; x--) {
                makeParticleInfo(x, y, 0);
                particles.push(x, y, 0, new Particle(indices, pos, bufferGeoIndex++));
            }
        }
        // left face, x === 0
        for (let y = 1; y < ySegs; y++) {
            for (let z = 0; z < zSegs; z++) {
                makeParticleInfo(0, y, z);
                particles.push(0, y, z, new Particle(indices, pos, bufferGeoIndex++));
            }
        }
        // top layer, y === ySegs
        for (let z = 0; z <= zSegs; z++) {
            for (let x = 0; x <= xSegs; x++) {
                makeParticleInfo(x, ySegs, z);
                particles.push(x, ySegs, z, new Particle(indices, pos, bufferGeoIndex++));
            }
        }
        return particles;
    }
    
    function _addSphere(pos) {
        let sphere = new THREE.Mesh(sphereGeo, sphereMatRed);
        sphere.position.copy(pos);
        realityEditor.gui.threejsScene.addToScene(sphere, {layers: 1});
    }

    let constraints = [];
    let lineGeo;
    const lineMatYellow = new THREE.LineBasicMaterial({color: 0xffff00});

    function makeConstraints(isVisualize = false) {
        constraints = [];
        let particle1 = null, particle2 = null, particle3 = null;
        // bottom layer constraints, y === 0, iterate 9 x 9 + 9 + 9 times
        for (let z = 1; z < zSegs; z++) {
            for (let x = 1; x < xSegs; x++) {
                particle1 = particles.get(x, 0, z);
                particle2 = particles.get(x + 1, 0, z);
                particle3 = particles.get(x, 0, z + 1);
                constraints.push([particle1, particle2, restDistance]);
                constraints.push([particle1, particle3, restDistance]);

                if (isVisualize) {
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle3.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                }
            }
        }
        for (let z = 1; z < zSegs; z++) {
            particle1 = particles.get(0, 0, z);
            particle2 = particles.get(1, 0, z);
            constraints.push([particle1, particle2, restDistance]);

            if (isVisualize) {
                lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
            }
        }
        for (let x = 1; x < xSegs; x++) {
            particle1 = particles.get(x, 0, 0);
            particle2 = particles.get(x, 0, 1);
            constraints.push([particle1, particle2, restDistance]);

            if (isVisualize) {
                lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
            }
        }
        // front face constraints, z === zSegs, iterate 10 x 10 times
        for (let y = 0; y < ySegs; y++) {
            for (let x = 0; x < xSegs; x++) {
                particle1 = particles.get(x, y, zSegs);
                particle2 = particles.get(x + 1, y, zSegs);
                particle3 = particles.get(x, y + 1, zSegs);
                constraints.push([particle1, particle2, restDistance]);
                constraints.push([particle1, particle3, restDistance]);

                if (isVisualize) {
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle3.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                }
            }
        }
        // right face constraints, x === xSegs, iterate 10 x 10 times
        for (let y = 0; y < ySegs; y++) {
            for (let z = zSegs; z > 0; z--) {
                particle1 = particles.get(xSegs, y, z);
                particle2 = particles.get(xSegs, y + 1, z);
                particle3 = particles.get(xSegs, y, z - 1);
                constraints.push([particle1, particle2, restDistance]);
                constraints.push([particle1, particle3, restDistance]);

                if (isVisualize) {
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle3.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                }
            }
        }
        // back face indices, z === 0, iterate 10 x 10 times
        for (let y = 0; y < ySegs; y++) {
            for (let x = xSegs; x > 0; x--) {
                particle1 = particles.get(x, y, 0);
                particle2 = particles.get(x - 1, y, 0);
                particle3 = particles.get(x, y + 1, 0);
                constraints.push([particle1, particle2, restDistance]);
                constraints.push([particle1, particle3, restDistance]);

                if (isVisualize) {
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle3.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                }
            }
        }
        // left face indices, x === 0, iterate 10 x 10 times
        for (let y = 0; y < ySegs; y++) {
            for (let z = 0; z < zSegs; z++) {
                particle1 = particles.get(0, y, z);
                particle2 = particles.get(0, y + 1, z);
                particle3 = particles.get(0, y, z + 1);
                constraints.push([particle1, particle2, restDistance]);
                constraints.push([particle1, particle3, restDistance]);

                if (isVisualize) {
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle3.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                }
            }
        }
        // top layer constraints, y === ySegs, iterate 10 x 10 + 10 + 10 times, normal facing upwards
        for (let z = 0; z < zSegs; z++) {
            for (let x = 0; x < xSegs; x++) {
                particle1 = particles.get(x, ySegs, z);
                particle2 = particles.get(x + 1, ySegs, z);
                particle3 = particles.get(x, ySegs, z + 1);
                constraints.push([particle1, particle2, restDistance]);
                constraints.push([particle1, particle3, restDistance]);

                if (isVisualize) {
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                    lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle3.original]);
                    realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
                }
            }
        }
        for (let z = 0; z < zSegs; z++) {
            particle1 = particles.get(xSegs, ySegs, z);
            particle2 = particles.get(xSegs, ySegs, z + 1);
            constraints.push([particle1, particle2, restDistance]);

            if (isVisualize) {
                lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
            }
        }
        for (let x = 0; x < xSegs; x++) {
            particle1 = particles.get(x, ySegs, zSegs);
            particle2 = particles.get(x + 1, ySegs, zSegs);
            constraints.push([particle1, particle2, restDistance]);

            if (isVisualize) {
                lineGeo = new THREE.BufferGeometry().setFromPoints([particle1.original, particle2.original]);
                realityEditor.gui.threejsScene.addToScene(new THREE.Line(lineGeo, lineMatYellow), {layers: 1});
            }
        }
        return constraints;
    }

    let pins = [];

    function makePins(_isVisualize) {
        pins = [];
        function _makePin(x, y, z) {
            let pinParticle = particles.get(x, y, z);
            // if (_isVisualize) _addSphere(pinParticle.original);
            pins.push(pinParticle)
        }

        // top 4 corners pinned down, cannot move
        // _makePin(0, ySegs, 0);
        // _makePin(xSegs, ySegs, 0);
        // _makePin(xSegs, ySegs, zSegs);
        // _makePin(0, ySegs, zSegs);

        // bottom 4 corners pinned down
        // _makePin(0, 0, 0);
        // _makePin(xSegs, 0, 0);
        // _makePin(xSegs, 0, zSegs);
        // _makePin(0, 0, zSegs);
        
        // all outer edges pinned down
        // for (let x = 0; x <= xSegs; x++) {
        //     _makePin(x, 0, 0);
        //     _makePin(x, ySegs, 0);
        //     _makePin(x, 0, zSegs);
        //     _makePin(x, ySegs, zSegs);
        // }
        // for (let y = 0; y <= ySegs; y++) {
        //     _makePin(0, y, 0);
        //     _makePin(xSegs, y, 0);
        //     _makePin(0, y, zSegs);
        //     _makePin(xSegs, y, zSegs);
        // }
        // for (let z = 0; z <= zSegs; z++) {
        //     _makePin(0, 0, z);
        //     _makePin(xSegs, 0, z);
        //     _makePin(0, ySegs, z);
        //     _makePin(xSegs, ySegs, z);
        // }
        

        // top center point pinned down
        // _makePin(Math.ceil(xSegs / 2), ySegs, Math.ceil(zSegs / 2));

        // entire top face pinned down
        // for (let z = 0; z <= zSegs; z++) {
        //     for (let x = 0; x <= xSegs; x++) {
        //         _makePin(x, ySegs, z);
        //     }
        // }
        
        // todo Steve: can try to pin down the 8 corners of the Box while simulating in the AreaTarget mesh

        // entire bottom face pinned down
        for (let z = 0; z <= zSegs; z++) {
            for (let x = 0; x <= xSegs; x++) {
                _makePin(x, 0, z);
            }
        }
        return pins;
    }
    
    function makeBufferGeometryIndexArr() {
        particlesIndexArr = [];
        let idx0 = null, idx1 = null, idx2 = null, idx3 = null;
        // bottom layer indices, y === 0, iterate 10 x 10 times, normal facing downwards
        for (let z = 0; z < zSegs; z++) {
            for (let x = 0; x < xSegs; x++) {
                idx0 = particles.get(x, 0, z).getIndex();
                idx1 = particles.get(x + 1, 0, z).getIndex();
                idx2 = particles.get(x + 1, 0, z + 1).getIndex();
                idx3 = particles.get(x, 0, z + 1).getIndex();
                particlesIndexArr.push(idx0, idx1, idx2, idx0, idx2, idx3);
            }
        }
        // front face indices, z === zSegs, iterate 10 x 10 times
        for (let y = 0; y < ySegs; y++) {
            for (let x = 0; x < xSegs; x++) {
                idx0 = particles.get(x, y, zSegs).getIndex();
                idx1 = particles.get(x + 1, y, zSegs).getIndex();
                idx2 = particles.get(x + 1, y + 1, zSegs).getIndex();
                idx3 = particles.get(x, y + 1, zSegs).getIndex();
                particlesIndexArr.push(idx0, idx1, idx2, idx0, idx2, idx3);
            }
        }
        // right face indices, x === xSegs, iterate 10 x 10 times
        for (let y = 0; y < ySegs; y++) {
            for (let z = zSegs; z > 0; z--) {
                idx0 = particles.get(xSegs, y, z).getIndex();
                idx1 = particles.get(xSegs, y, z - 1).getIndex();
                idx2 = particles.get(xSegs, y + 1, z - 1).getIndex();
                idx3 = particles.get(xSegs, y + 1, z).getIndex();
                particlesIndexArr.push(idx0, idx1, idx2, idx0, idx2, idx3);
            }
        }
        // back face indices, z === 0, iterate 10 x 10 times
        for (let y = 0; y < ySegs; y++) {
            for (let x = xSegs; x > 0; x--) {
                idx0 = particles.get(x, y, 0).getIndex();
                idx1 = particles.get(x - 1, y, 0).getIndex();
                idx2 = particles.get(x - 1, y + 1, 0).getIndex();
                idx3 = particles.get(x, y + 1, 0).getIndex();
                particlesIndexArr.push(idx0, idx1, idx2, idx0, idx2, idx3);
            }
        }
        // left face indices, x === 0, iterate 10 x 10 times
        for (let y = 0; y < ySegs; y++) {
            for (let z = 0; z < zSegs; z++) {
                idx0 = particles.get(0, y, z).getIndex();
                idx1 = particles.get(0, y, z + 1).getIndex();
                idx2 = particles.get(0, y + 1, z + 1).getIndex();
                idx3 = particles.get(0, y + 1, z).getIndex();
                particlesIndexArr.push(idx0, idx1, idx2, idx0, idx2, idx3);
            }
        }
        // top layer indices, y === ySegs, iterate 10 x 10 times, normal facing upwards
        for (let z = 0; z < zSegs; z++) {
            for (let x = 0; x < xSegs; x++) {
                idx0 = particles.get(x, ySegs, z).getIndex();
                idx1 = particles.get(x + 1, ySegs, z).getIndex();
                idx2 = particles.get(x + 1, ySegs, z + 1).getIndex();
                idx3 = particles.get(x, ySegs, z + 1).getIndex();
                particlesIndexArr.push(idx0, idx3, idx1, idx1, idx3, idx2);
            }
        }
    }

    let clothGeometry = null, clothMesh = null;
    let normalAttri = null;
    const RED = new THREE.Color(0xff0000);

    // helper sphere
    const sphereGeo = new THREE.SphereGeometry(5, 8, 4);
    const sphereMatRed = new THREE.MeshBasicMaterial({color: RED});

    function makeBufferGeometry() {
        clothGeometry = new THREE.BufferGeometry();

        makeBufferGeometryIndexArr();
        clothGeometry.setIndex(particlesIndexArr);

        let posAttri = new THREE.BufferAttribute(new Float32Array(particlesPosArr), 3);

        clothGeometry.setAttribute('position', posAttri);

        // initialize particle.normal field
        clothGeometry.computeVertexNormals();
        normalAttri = clothGeometry.attributes.normal;
        particles.map.forEach((particle) => {
            particle.normal.fromBufferAttribute(normalAttri, particle.getIndex()).negate();
        })

        let material = new THREE.MeshStandardMaterial({
            color: 0x888888,
            // transparent: true,
            // opacity: 0.5,
            wireframe: true
        });
        clothMesh = new THREE.Mesh(clothGeometry, material);
        // clothMesh.visible = false;
        realityEditor.gui.threejsScene.addToScene(clothMesh, {layers: 1});

        // const edges = new THREE.EdgesGeometry( geometry, 0 );
        // const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0xffffff } ) );
        // realityEditor.gui.threejsScene.addToScene( line, {layers: 1});
        return clothMesh;
    }

    /**********************************************************************************************************************
     ************************* init a cloth & add all the properties into a global object *********************************
     **********************************************************************************************************************/
    const CLOTH_INFO = {};
    function initCloth(xLength, yLength, zLength, center, restDistance = null, uuid, objectKey, frameKey) {
        if (restDistance === null) {
            restDistance = Math.max(xLength, Math.max(yLength, zLength)) / 25;
        }
        // console.log(`Rest distance: ${restDistance} m`);
        
        let _particles = makeParticles(xLength, yLength, zLength, center, restDistance);
        let _constraints = makeConstraints(false);
        let _pins = makePins(true);
        let _clothMesh = makeBufferGeometry();
        let _winds = makeWind();
        let _time = Date.now();
        let _tmpTextLabelPos = new THREE.Vector3().addVectors(center, tmpTextLabelOffset);
        
        CLOTH_INFO[`${_time}`] = {
            objectKey: objectKey, // which measure tool object initiated the cloth simulation
            frameKey: frameKey, // which measure tool frame initiated the cloth simulation
            uuid: uuid, // inside that measure tool, which bigParentObj should the cloth be added to once finished
            particles: _particles,
            constraints: _constraints,
            pins: _pins,
            clothMesh: _clothMesh,
            winds: _winds,
            startTime: _time,
            initVolume: null,
            volume: 0,
            tmpTextLabelPos: _tmpTextLabelPos,
            tmpTextLabelObj: null, // todo Steve: a temporary text label, created under the parent userInterface, but will get deleted after finish computing volume & send info down to tool
        };
        CLOTH_COUNT++;
    }

    // simulation & render code

    let diff = new THREE.Vector3();

    function satisfyConstraints(constraint, initVolume, volume) {
        let p1 = constraint[0];
        let p2 = constraint[1];
        let distance = constraint[2];
        
        diff.subVectors(p2.position, p1.position);
        let currentDist = diff.length();
        // currentDist = Math.min(Math.min(currentDist, restDistance), constraint[2]); // todo Steve: a huge visual difference between this method line and below. Find out why.
        // currentDist = Math.min(currentDist, restDistance);
        currentDist = Math.min(currentDist, constraint[2] * 1.05);
        if (currentDist === 0) return; // prevents division by 0
        let correction = diff.multiplyScalar(1 - distance / currentDist);
        let correctionHalf = correction.multiplyScalar(0.5);
        
        if (p1.collided) {
            p2.position.sub(correction);
        } else if (p2.collided) {
            p1.position.add(correction);
        } else if (!p1.collided && !p2.collided) {
            p1.position.add(correctionHalf);
            p2.position.sub(correctionHalf);
        } else {
            return;
        }
        
        if (initVolume === null) return;
        let p = Math.max(0, volume / initVolume);
        constraint[2] = restDistance * p;
    }

    const TIMESTEP = 5 / 1000; // step size 5 / 10 seems like some good choices. Note that the step size also affects COLLIDE_THRESHOLD and GRAVITY. The bigger the step size, the bigger COLLIDE_THRESHOLD & the smaller GRAVITY needs to be, to avoid skipping some collisions
    const TIMESTEP_SQ = TIMESTEP * TIMESTEP;

    const GRAVITY = 9.8 * 100;
    const _gravity = new THREE.Vector3(0, -GRAVITY, 0).multiplyScalar(MASS);

    const WIND_STRENGTH = 1000;
    const WIND_DISTANCE_OFFSET = 1 * 1000;
    let winds = [];

    class Wind {
        constructor(position, force) {
            this.position = position;
            this.force = force;

            // this.arrowHelper = new THREE.ArrowHelper(this.force.clone().normalize(), this.position, this.force.length() * 0.5, 0x00ff00);
            // realityEditor.gui.threejsScene.addToScene(this.arrowHelper, {layers: 1});
        }
    }

    function makeWind() {
        winds = [];
        winds.push(new Wind(new THREE.Vector3(0, -(yLength / 2 + WIND_DISTANCE_OFFSET), 0).add(center), new THREE.Vector3(0, 1, 0).multiplyScalar(WIND_STRENGTH))); // bottom
        winds.push(new Wind(new THREE.Vector3(0, 0, (zLength / 2 + WIND_DISTANCE_OFFSET)).add(center), new THREE.Vector3(0, 0, -1).multiplyScalar(WIND_STRENGTH))); // front
        winds.push(new Wind(new THREE.Vector3((xLength / 2 + WIND_DISTANCE_OFFSET), 0, 0).add(center), new THREE.Vector3(-1, 0, 0).multiplyScalar(WIND_STRENGTH))); // right
        winds.push(new Wind(new THREE.Vector3(0, 0, -(zLength / 2 + WIND_DISTANCE_OFFSET)).add(center), new THREE.Vector3(0, 0, 1).multiplyScalar(WIND_STRENGTH))); // back
        winds.push(new Wind(new THREE.Vector3(-(xLength / 2 + WIND_DISTANCE_OFFSET), 0, 0).add(center), new THREE.Vector3(1, 0, 0).multiplyScalar(WIND_STRENGTH))); // left
        winds.push(new Wind(new THREE.Vector3(0, (yLength / 2 + WIND_DISTANCE_OFFSET), 0).add(center), new THREE.Vector3(0, -1, 0).multiplyScalar(WIND_STRENGTH))); // top
        
        return winds;
    }

    // when porting to userInterface repo, don't have to include the mesh bvh and raycaster (?). Or maybe instantiate a specific raycaster just for raycasting for cloth simulation, everytime we instantiate a new cloth (?)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.enable(0);
    raycaster.layers.enable(1);
    raycaster.layers.enable(2);
    let COLLIDE_THRESHOLD = 50; // 0.05 seems like a perfect threshold: too big then it skips some collision; too small it causes some particle jittering

    function simulateCloth(particles, constraints, pins, winds, initVolume, volume) {
        if (cachedOcclusionObject === null || inverseGroundPlaneMatrix === null) {
            return;
        }
        
        // // apply gravity force
        // particles.map.forEach((particle) => {
        //     particle.addForce(_gravity);
        // })

        // apply wind force
        let tmp = new THREE.Vector3(), distance = null;
        particles.map.forEach((particle) => {
            winds.forEach((wind) => {
                if (particle.hasCollided) return;
                
                distance = tmp.subVectors(particle.position, wind.position).length();
                particle.addForce(wind.force.clone().divideScalar(distance).multiplyScalar(1000));
            })
        })
        
        // apply particle inward force
        particles.map.forEach((particle) => {
            if (particle.hasCollided) return;
            
            particle.addForce(particle.normal.clone().multiplyScalar(0.6).multiplyScalar(1000));
        })

        // collision with mesh
        let particlePos = null, particleDir = null, result = null, tmpPos = new THREE.Vector3();
        particles.map.forEach((particle) => {
            particlePos = particle.position;
            particleDir = particle.normal;
            tmpPos.copy(particlePos);
            tmpPos.y -= raycastPosOffset;
            raycaster.set(tmpPos, particleDir);
            raycaster.firstHitOnly = true;
            result = raycaster.intersectObjects([cachedOcclusionObject], true);

            if (result.length !== 0) {
                result[0].point.applyMatrix4(inverseGroundPlaneMatrix);
            }
            
            if (result.length === 0 || result[0].distance > COLLIDE_THRESHOLD) { // not collided
                particle.collided = false;
                return;
            }
            
            let diff = particle.position.clone().sub(result[0].point);
            particle.collide(result[0].point.add(diff.normalize().multiplyScalar(COLLIDE_THRESHOLD)));
        })

        // verlet integration
        particles.map.forEach((particle) => {
            particle.integrate(TIMESTEP_SQ);
        })

        // relax constraints
        // for (let i = 0; i < constraints.length; i++) {
        //     satisfyConstraints(constraints[i], initVolume, volume);
        // }
        let rand = Math.floor(Math.random() * constraints.length);
        for (let i = rand; i < constraints.length; i++) {
            satisfyConstraints(constraints[i], initVolume, volume);
        }
        for (let i = rand - 1; i >= 0; i--) {
            satisfyConstraints(constraints[i], initVolume, volume);
        }

        // pin constraints
        let pinParticle = null;
        for (let i = 0; i < pins.length; i++) {
            pinParticle = pins[i];
            pinParticle.position.copy(pinParticle.original);
            pinParticle.previous.copy(pinParticle.original);
            pinParticle.a.set(0, 0, 0);
        }
    }

    function renderCloth(particles, clothMesh) {
        if (cachedOcclusionObject === null || inverseGroundPlaneMatrix === null) {
            return;
        }
        clothGeometry = clothMesh.geometry;
        normalAttri = clothGeometry.attributes.normal;
        // change cloth buffer geometry mesh render
        particles.map.forEach((particle) => {
            let p = particle.position;
            let bufferGeoIndex = particle.getIndex();
            clothGeometry.attributes.position.setXYZ(bufferGeoIndex, p.x, p.y, p.z);
        })
        clothGeometry.attributes.position.needsUpdate = true;

        // update particle.normal field
        clothGeometry.computeVertexNormals();
        particles.map.forEach((particle) => {
            particle.normal.fromBufferAttribute(normalAttri, particle.getIndex()).negate();
        })
    }
    
    const tmpTextLabelOffset = new THREE.Vector3(200, -200, 200);
    function getVolume(key, geometry, divObj, divObjPos) {
        if (!geometry.isBufferGeometry) {
            console.log("'geometry' must be an indexed or non-indexed buffer geometry");
            return 0;
        }
        let isIndexed = geometry.index !== null;
        let position = geometry.attributes.position;
        let sum = 0;
        let p1 = new THREE.Vector3(),
            p2 = new THREE.Vector3(),
            p3 = new THREE.Vector3();
        if (!isIndexed) {
            let faces = position.count / 3;
            for (let i = 0; i < faces; i++) {
                p1.fromBufferAttribute(position, i * 3 + 0);
                p2.fromBufferAttribute(position, i * 3 + 1);
                p3.fromBufferAttribute(position, i * 3 + 2);
                sum += signedVolumeOfTriangle(p1, p2, p3);
            }
        } else {
            let index = geometry.index;
            let faces = index.count / 3;
            for (let i = 0; i < faces; i++) {
                p1.fromBufferAttribute(position, index.array[i * 3 + 0]);
                p2.fromBufferAttribute(position, index.array[i * 3 + 1]);
                p3.fromBufferAttribute(position, index.array[i * 3 + 2]);
                sum += signedVolumeOfTriangle(p1, p2, p3);
            }
        }
        

        if (divObj === null) {
            let div1 = document.createElement('div');
            div1.classList.add('cloth-text');
            div1.style.background = 'rgb(20,20,20)';
            div1.innerHTML = `&asymp; ${(sum * (UNIT_SCALE * UNIT_SCALE * UNIT_SCALE) / (1000 * 1000 * 1000)).toFixed(3)} m<sup>3</sup>`;
            let divObj1 = new CSS2DObject(div1);
            divObj1.position.copy(divObjPos);
            realityEditor.gui.threejsScene.addToScene(divObj1);
            CLOTH_INFO[`${key}`].tmpTextLabelObj = divObj1;
        } else {
            divObj.element.innerHTML = `&asymp; ${(sum * (UNIT_SCALE * UNIT_SCALE * UNIT_SCALE) / (1000 * 1000 * 1000)).toFixed(3)} m<sup>3</sup>`;
        }
        
        return sum;
    }

    function signedVolumeOfTriangle(p1, p2, p3) {
        return p1.dot(p2.cross(p3)) / 6.0;
    }
    
    function update() {
        if (Object.keys(CLOTH_INFO).length === 0) return;
        for (const key of Object.keys(CLOTH_INFO)) {
            const value = CLOTH_INFO[`${key}`];
            simulateCloth(value.particles, value.constraints, value.pins, value.winds, value.initVolume, value.volume);
            renderCloth(value.particles, value.clothMesh);
            
            let new_volume = getVolume(key, value.clothMesh.geometry, value.tmpTextLabelObj, value.tmpTextLabelPos);
            if (value.volume === 0) { // when first started, the volume is set to 0
                value.volume = new_volume;
                value.initVolume = new_volume;
                return;
            }
            
            if ( new_volume < 0 || Date.now() - value.startTime > 5000 && (Math.abs((value.volume - new_volume) / value.volume) < 0.00001) || Date.now() - value.startTime > 30000 ) { // if: (1) new volume < 0; (2) after running 5 seconds && change of volume < 0.001%; (3) after running 30 seconds, then count as finished
                console.log(`The final computed volume is ${new_volume}`);
                console.log(Math.abs((value.volume - new_volume) / value.volume));
                delete CLOTH_INFO[`${key}`];
                CLOTH_COUNT--;
                balanceLoad();
                // todo Steve: delete the cloth & volume text labels, and send corresponding info back to the tools
                sendClothInfoToMeasureTool(value.objectKey, value.frameKey, value.uuid, value.clothMesh, value.volume, value.tmpTextLabelPos);
                // todo Steve: delete the cloth & volume text labels
                //  also, add a listener in setupEventListeners, s.t. if heard a tool delete corresponding volume for that uuid, stop the corresponding simulation & delete the cloth mesh
                value.clothMesh.geometry.dispose();
                value.clothMesh.material.dispose();
                value.clothMesh.parent.remove(value.clothMesh);
                value.tmpTextLabelObj.parent.remove(value.tmpTextLabelObj);
            } else {
                value.volume = new_volume;
            }
        }
    }
    
    function sendClothInfoToMeasureTool(objectKey, frameKey, uuid, clothMesh, volume, labelPos) {
        let frame = realityEditor.getFrame(objectKey, frameKey)
        if (frame === null || frame.src !== 'spatialMeasure') return;
        let iframe = document.getElementById('iframe' + frameKey);
        iframe.contentWindow.postMessage(JSON.stringify({
            uuid: uuid,
            clothMesh: clothMesh.clone().toJSON(),
            volume: volume,
            labelPos: labelPos,
        }), '*');
    }
    
    exports.initService = initService;

}(realityEditor.measure.clothSimulation));
