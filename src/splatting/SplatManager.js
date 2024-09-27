import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { TransformControls } from "../../thirdPartyCode/three/TransformControls.js";
import Splatting from './Splatting.js';
import { fsBoundaryPlane, vsBoundaryPlane, vsDummyMesh, fsDummyMesh } from "./helperShader.js";
import { SplatSettingsUI } from "./splatSettingsUI.js";
import { remapCurveEaseOut } from "../utilities/MathUtils.js";

const SCALE_FACTOR = 1000;
let splatBytesArray = null; // contains all the .splat file byte length
let splatVertexCountArray = null; // dynamic vertex count array, keeps updating as new splat region gets loaded, to make sure web worker generates/puts up-to-date amount of vertices into texture
let splatRegionIdArray = null;
let splatRegionRowLengthArray = null;
let splatRegions = null;
let splatRegionActiveIndex = 0;
let totalBytesRead = null;

// todo Steve:
//  1. somehow the splat region boundary doesn't include some of the furthest splats (done)
//  2. splat region bounding box shader (done)
//  3. splat region bounding box boundary gizmos (done)
//  4. dummy cube should be at the center of splat region, gizmo = position offset + boundary center, but transform gizmo & splat / labels not syncing
//   maybe it's the transform order issue
//  5. after transforming splat regions, force sort doesn't seem to work. Still need to adjust the camera to trigger another round of sorting (done ?????)
//  6. replace html splat labels with actual three.js spheres (desperately in need for boosting the performance, currently drawing splat labels takes up too much time)
//  7. inactive splat region boundary planes need to be invisible & disabled (done)
//  8. some splats in front of the camera will be hidden, to enable smooth viewing & zooming experience
//  9. a) store all the information in the target/target_splats info.json, instead of in local storage, to make everything persistent even when switching networks
//      or maybe session storage?
//      b) change the name of each splat region in storage from splat_region_${id} to splat_region_${regionName}, to be more specific. I think world object name is also kinda important
//      but if we store everything in a json file, we might want to move these splats around. Maybe don't include the world object name in their unique identifier names, b/c moving to a different world object would reset everything
//      c) include the deleted splats array, also within all the info in a splat region
//  10. improve delete splat / reset to see all splats functions
//  11. make some buttons for transforming the splats, adjusting boundary of splats, reset transformation, and reset boundary, similar to Ben's remote operator buttons on iPad

function initService() {
    splatBytesArray = [];
    splatVertexCountArray = [];
    splatRegionIdArray = [];
    splatRegionRowLengthArray = [];
    splatRegions = new Map();
    totalBytesRead = 0;

    initScene();
    
    // let splatSettingsUI = new SplatSettingsUI();
}

let renderer = null, scene = null, camera = null, raycaster = null;
let controls = null, dummyMesh = null;
let dummyMeshCanvas = null;
function initScene() { // initialize a TransformControls gizmo, and a dummy cube, used to adjust different GS scene's transforms
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.id = 'gs-dummy-mesh-canvas';
    dummyMeshCanvas = renderer.domElement;
    document.body.appendChild(dummyMeshCanvas);

    scene = new THREE.Scene();
    camera = realityEditor.gui.threejsScene.getInternals().getCamera().getInternalObject();
    camera.layers.enable(10);

    // add dummy mesh to attach transform controls to
    let geoSize = 100;
    let geo = new THREE.BoxGeometry(geoSize, geoSize, geoSize);
    // let mat = new THREE.MeshBasicMaterial({color: 0xff0000});
    let mat = new THREE.ShaderMaterial({
        vertexShader: vsDummyMesh,
        fragmentShader: fsDummyMesh
    });
    dummyMesh = new THREE.Mesh(geo, mat);
    scene.add(dummyMesh);

    // add transform controls
    controls = new TransformControls(camera, renderer.domElement);
    scene.add(controls);
    controls.setSize(0.5);
    controls.attach(dummyMesh);
    // todo Steve: detach controls to focus developing on the add label info part. Delete the lines below later.
    // controls.detach();
    // dummyMesh.visible = false;
    
    raycaster = new THREE.Raycaster();

    setupEventListeners();
}

function setupEventListeners() {
    realityEditor.device.layout.onWindowResized(({width, height}) => {
        renderer.setSize(width, height);
    });
    realityEditor.gui.threejsScene.onAnimationFrame(initRender);
    
    controls.addEventListener('objectChange', () => {
        splatRegions.get(splatRegionActiveIndex).changeFromGizmo();
    });

    dummyMeshCanvas.addEventListener('pointerdown', (e) => {
        if (!realityEditor.spatialCursor.isGSActive()) return;
        if (e.button !== 0) return;
        if (controls._gizmo.handlesHighlighted) return;
        let pointer = new THREE.Vector2();
        pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        let activeSplatRegion = splatRegions.get(splatRegionActiveIndex);
        let results = raycaster.intersectObjects(activeSplatRegion.boundaryPlaneArr);
        if (results.length === 0) {
            splatRegions.get(splatRegionActiveIndex).detachGizmo();
            splatRegions.get(splatRegionActiveIndex).attachGizmo('transform');
            return;
        }
        
        let boundaryPlaneName = results[0].object.name;
        activeSplatRegion.detachGizmo();
        activeSplatRegion.attachGizmo('boundary', {boundaryPlaneName});
    })

    window.addEventListener("keydown", e => {
        if (!realityEditor.spatialCursor.isGSActive()) return;
        switch (e.key) {
            case 'q': {
                controls.setMode('translate');
                break;
            }
            case 'r': {
                controls.setMode('rotate');
                break;
            }
            case ' ': {
                splatRegions.get(splatRegionActiveIndex).detachGizmo();
                splatRegions.get(splatRegionActiveIndex).hideBoundary();
                splatRegionActiveIndex = (splatRegionActiveIndex + 1) % splatRegions.size;
                splatRegions.get(splatRegionActiveIndex).attachGizmo('transform');
                splatRegions.get(splatRegionActiveIndex).showBoundary();
                break;
            }
            default: {
                break;
            }
        }
    });
}

function initRender() {
    controls.updateWorldMatrix(true, true);
    renderer.render(scene, camera);
}

class SplatRegion {
    constructor(filePath, byteLength, regionId) {
        this.filePath = filePath;
        this.byteLength = byteLength;
        this.rowLength = null; // 32 or 36 bytes per splat
        this.vertexCount = null; // total number of splats, this.byteLength / this.rowLength
        this.regionName = '';
        this.regionId = regionId;

        this.bytesOffset = splatBytesArray.reduce((sum, elt) => {return sum + elt}, 0);
        this.bytesRead = 0; // bytes already read for this splat region. When finish loading this region, this.byteRead === this.bytesLength
        this.verticesRead = 0; // vertices already read for this splat region

        // splat texture and label points related
        this.world = { // in mm
            positionOffset: new THREE.Vector3(0, 0, 0),
            quaternion: new THREE.Quaternion(0, 0, 0, 1),
        };

        // boundary box related
        this.boundary = { // in mm
            min: new THREE.Vector3(0, 0, 0),
            max: new THREE.Vector3(0, 0, 0),
            center: new THREE.Vector3(0, 0, 0) // when focus / editing on this splat region, dummy mesh should be at the center
        }
        // todo Steve: new idea to solve the weird transform offset issues caused by transforming boundaryGroup with this.boundary.center:
        //  don't change boundary group transform. Offset all the boundary planes with this.boundary.center, and then when attaching gizmo / transforming with gizmo,
        //  subtract this offset.
        this.boundaryGroup = null;
        this.boundaryPlaneArr = [];
        this.boundaryPlaneMap = new Map();
        
        // gizmo related, used to transform splat regions as a whole
        this.gizmo = null;
        this.gizmoMode = ''; // '', 'transform', 'boundary'
        this.activeBoundaryPlaneName = '';
        this.lastGizmoPos = null;

        this.uniforms = null;
    }

    makeRegionName() {
        let fileName = this.filePath.split('/')[1];
        this.regionName = `splat_region_${fileName}_${this.vertexCount}_${this.rowLength}`;
    }

    makeBoundaryPlane(size, offset, name, center) {
        let geo = new THREE.PlaneGeometry(size[0], size[1]);
        let mat = new THREE.ShaderMaterial({
            vertexShader: vsBoundaryPlane,
            fragmentShader: fsBoundaryPlane,
            transparent: true,
            depthWrite: false,
        });
        let plane = new THREE.Mesh(geo, mat);
        plane.name = name;
        plane.position.set(offset[0] + center.x, offset[1] + center.y, offset[2] + center.z);
        let rotInfo = name.split('_');
        if (rotInfo[0] === '+') {
            if (rotInfo[1] === 'x') plane.rotation.y = Math.PI / 2;
            else if (rotInfo[1] === 'y') plane.rotation.x = -Math.PI / 2;
        } else if (rotInfo[0] === '-') {
            if (rotInfo[1] === 'x') plane.rotation.y = -Math.PI / 2;
            else if (rotInfo[1] === 'y') plane.rotation.x = Math.PI / 2;
            else if (rotInfo[1] === 'z') plane.rotation.y = Math.PI;
        }
        return plane;
    }

    addOrUpdateBoundaryPlanes(size, center) {
        [[[size.z, size.y], [size.x / 2, 0, 0], '+_x'], // size, offset, name
            [[size.x, size.z], [0, size.y / 2, 0], '+_y'],
            [[size.x, size.y], [0, 0, size.z / 2], '+_z'],
            [[size.z, size.y], [-size.x / 2, 0, 0], '-_x'],
            [[size.x, size.z], [0, -size.y / 2, 0], '-_y'],
            [[size.x, size.y], [0, 0, -size.z / 2], '-_z']].forEach(info => {
            let boundaryPlane = this.boundaryPlaneMap.get(info[2]);
            if (boundaryPlane === undefined) {
                let boundaryPlane = this.makeBoundaryPlane(info[0], info[1], info[2], center);
                this.boundaryGroup.add(boundaryPlane);
                this.boundaryPlaneArr.push(boundaryPlane);
                this.boundaryPlaneMap.set(info[2], boundaryPlane);
                return;
            }
            boundaryPlane.geometry.dispose();
            boundaryPlane.geometry = new THREE.PlaneGeometry(info[0][0], info[0][1]);
            boundaryPlane.position.set(info[1][0] + center.x, info[1][1] + center.y, info[1][2] + center.z);
        });
    }

    addBoundaryGroup() {
        // add boundary group
        this.boundaryGroup = new THREE.Group();
        scene.add(this.boundaryGroup);
        // add boundary planes
        let size = new THREE.Vector3().subVectors(this.boundary.max, this.boundary.min);
        this.addOrUpdateBoundaryPlanes(size, this.boundary.center);

        if (this.regionId !== splatRegionActiveIndex) {
            this.hideBoundary();
        }
    }

    transformBoundary(force = false) { // usually need a gizmo attached to transform the boundary, but when initializing from local storage, we don't need a gizmo attached, so force run transform
        if (this.boundaryGroup === null) return;
        // todo Steve: below method not entirely correct, still doesn't cover some of the furthest splats
        //  also need to set the offset of gizmo too
        if (this.gizmo === null && !force) return;
        // this.boundaryGroup.position.copy(this.gizmo.position).sub(this.boundary.center);
        this.boundaryGroup.position.copy(this.world.positionOffset);
        this.boundaryGroup.quaternion.copy(this.world.quaternion);
        this.boundaryGroup.updateWorldMatrix(true, true);
    }

    // todo Steve: get & set region transform & boundary info from info.json
    transformAndUpdateBoundaryFromLocalStorage(info) {
        info = JSON.parse(info);
        // transform boundary
        this.world.positionOffset.fromArray(info.positionOffset);
        this.world.quaternion.fromArray(info.quaternion);
        if (this.boundaryGroup === null) {
            this.addBoundaryGroup();
            this.transformBoundary(true);
        } else {
            this.transformBoundary(true);
        }
        // update boundary planes
        this.boundary.min.fromArray(info.boundaryMin);
        this.boundary.max.fromArray(info.boundaryMax);
        this.boundary.center.copy(new THREE.Vector3().addVectors(this.boundary.min, this.boundary.max).divideScalar(2));

        this.updateUniformsAndWorker(true, true, false); // when initializing transform and boundary from local storage, don't need to update local storage again

        // update boundary plane dimensions
        let size = new THREE.Vector3().subVectors(this.boundary.max, this.boundary.min);
        this.addOrUpdateBoundaryPlanes(size, this.boundary.center);
    }

    updateBoundaryFromWorker(boundary) {
        // update splat shader uniforms
        this.boundary.min.set(boundary.min[0], boundary.min[1], boundary.min[2]).multiplyScalar(SCALE_FACTOR);
        this.boundary.max.set(boundary.max[0], boundary.max[1], boundary.max[2]).multiplyScalar(SCALE_FACTOR);
        this.boundary.center.copy(new THREE.Vector3().addVectors(this.boundary.min, this.boundary.max).divideScalar(2));
        
        this.updateUniformsAndWorker();
        
        // update boundary plane dimensions
        let size = new THREE.Vector3().subVectors(this.boundary.max, this.boundary.min);
        this.addOrUpdateBoundaryPlanes(size, this.boundary.center);
    }
    
    updateBoundaryFromGizmo() {
        if (this.gizmo === null || this.gizmoMode !== 'boundary') return;
        
        // get the local-space position of the gizmo, so inverse all the transformations done to it
        if (this.lastGizmoPos === null) {
            this.lastGizmoPos = this.gizmo.position.clone().applyMatrix4(this.boundaryGroup.matrixWorld.clone().invert());
            return;
        }
        let currentGizmoPos = this.gizmo.position.clone().applyMatrix4(this.boundaryGroup.matrixWorld.clone().invert());
        let offset = new THREE.Vector3().subVectors(currentGizmoPos, this.lastGizmoPos);
        this.lastGizmoPos = currentGizmoPos;
        
        // update this.boundary
        let info = this.activeBoundaryPlaneName.split('_');
        let sign = info[0], axis = info[1];
        if (sign === '+') {
            if (axis === 'x') { this.boundary.max.x += offset.x; }
            else if (axis === 'y') { this.boundary.max.y += offset.y; }
            else if (axis === 'z') { this.boundary.max.z += offset.z; }
        } else if (sign === '-') {
            if (axis === 'x') { this.boundary.min.x += offset.x; }
            else if (axis === 'y') { this.boundary.min.y += offset.y; }
            else if (axis === 'z') { this.boundary.min.z += offset.z; }
        }
        this.boundary.center.copy(new THREE.Vector3().addVectors(this.boundary.min, this.boundary.max).divideScalar(2));

        this.updateUniformsAndWorker();

        // update boundary plane dimensions
        let size = new THREE.Vector3().subVectors(this.boundary.max, this.boundary.min);
        this.addOrUpdateBoundaryPlanes(size, this.boundary.center);
    }
    
    async computeRowLength() {
        // check if splat file has 32 or 36 bytes row length
        return new Promise(async (resolve, reject) => {
            if (this.byteLength % 32 > 0 && this.byteLength % 36 > 0) {
                console.error(`Error in computing row length for Splat Region ${this.filePath}. Wrong format. Row length neither 32 bytes nor 36 bytes.`);
                reject();
                return;
            } else if (this.byteLength % 32 > 0 || this.byteLength % 36 > 0) {
                if (this.byteLength % 32 === 0) {
                    resolve(32);
                    return;
                } else if (this.byteLength % 36 === 0) {
                    resolve(36);
                    return;
                }
            }
            console.log(`When loading Splat Region ${this.filePath}, row length is either 32 or 36 bytes. Running a check to figure out which.`);
            const url = new URL(this.filePath);
            const req = await fetch(url, {
                mode: "cors", // no-cors, *cors, same-origin
                credentials: "omit", // include, *same-origin, omit
            });
            if (req.status !== 200) {
                throw new Error(req.status + " Unable to load " + req.url);
            }
            const reader = req.body.getReader();

            let tempSplatData = new Uint8Array(this.byteLength);
            let tempBytesRead = 0;
            let targetBytesRead = 288; // least common multiplier of 36 and 32
            
            while (true) {
                const { done, value } = await reader.read();
                if (done || tempBytesRead >= targetBytesRead) {
                    /**
                     * check whether this splat file row length is 32 or 36 bytes
                     * 1. take the first 288 bytes of data
                     * 2. for each 36 bytes of data, check if index 32, 33, 34 are not consecutive 0's
                     *      a. if row length === 36 bytes, then index 32, 33, 34 for each 36 bytes of data should be consecutive 0's,
                     *          b/c in processPlyBuffer, we put these 3 as empty data (0).
                     *          Note: this is subject to subsequent server training pipeline changes, if we decide to put more data in index 32 / 33 / 34 slots.
                     *      b. if row length === 32 bytes, then
                     *          it is HIGHLY POSSIBLE (still may fail by a small chance) that index 32, 33, 34 for each 36 bytes of data should NOT be consecutive 0's
                     *          the only way it's possible, is when: 
                     *          (1st splat's position.x's 1st 3 bytes are 0 && 2nd splat's position.y's 1st 3 bytes are 0 && 3rd splat's position.z's 1st 3 bytes are 0
                     *          && 4th splat's scale.x's 1st 3 bytes are 0 && 5th splat's scale.y's 1st 3 bytes are 0 && 6th splat's scale.z's 1st 3 bytes are 0
                     *          && 7th splat's rgb bytes are 0 && 8th splat's rotation.xyz bytes are 0)
                     *          which is almost impossible.
                     *          when we detect one or more indices of 32 / 33 / 34 are not 0, we can EARLY EXIT, and know row length === 32
                     */
                    for (let i = 0; i < Math.min(tempSplatData.length, targetBytesRead); i += 36) { // in case tempSplatData is very short, less than 288 bytes
                        if (tempSplatData[36 * i + 32] !== 0 || tempSplatData[36 * i + 33] !== 0 || tempSplatData[36 * i + 34] !== 0) {
                            console.log(`Checking done. Row length is ${32} bytes.`);
                            resolve(32);
                            return;
                        }
                    }
                    console.log(`Checking done. Row length is ${36} bytes.`);
                    resolve(36);
                    return;
                }
                tempSplatData.set(value, tempBytesRead);
                tempBytesRead += value.length;
            }
        })
    }

    async load() {
        this.rowLength = await this.computeRowLength();
        this.vertexCount = this.byteLength / this.rowLength;
        this.makeRegionName();
        console.log(`New Splat Region ${this.regionName} created.`);
        splatVertexCountArray.push(0);
        splatRegionIdArray.push(this.regionId);
        splatRegionRowLengthArray.push(this.rowLength);
        
        return new Promise(async (resolve) => {
            const url = new URL(this.filePath);
            const req = await fetch(url, {
                mode: "cors", // no-cors, *cors, same-origin
                credentials: "omit", // include, *same-origin, omit
            });
            if (req.status !== 200) {
                throw new Error(req.status + " Unable to load " + req.url);
            }
            const reader = req.body.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    splatBytesArray.push(this.bytesRead);
                    splatVertexCountArray[splatVertexCountArray.length - 1] = this.bytesRead / this.rowLength;
                    splatRegions.set(this.regionId, this);

                    // add boundary group and planes
                    if (this.boundaryGroup === null) {
                        this.addBoundaryGroup();
                        this.transformBoundary();
                    }
                    
                    this.updateUniformsAndWorker(true, false, false); // when initializing, don't have to update local storage yet; also don't update worker yet, to avoid already-loaded splat region flickering once when updating boundary info from local storage

                    resolve();
                    console.log(`Splat Region ${this.regionName} load complete.`);
                    console.log('---------------------------------------------------');
                    break;
                }

                Splatting.getSplatData().set(value, this.bytesOffset + this.bytesRead);
                totalBytesRead += value.length;
                this.bytesRead += value.length;
                this.verticesRead = Math.floor(this.bytesRead / this.rowLength);
                splatVertexCountArray[splatVertexCountArray.length - 1] = this.verticesRead;

                if (Splatting.getVertexCount() > Splatting.getLastVertexCount()) {
                    // console.log(`When loading ${this.regionName}, vertex count > last vertex count. Update vertex count to worker.`);
                    Splatting.getWorker().postMessage({
                        buffer: Splatting.getSplatData().buffer,
                        vertexCount: getTotalVertexRead(),
                        vertexCountArray: splatVertexCountArray,
                        regionIdArray: splatRegionIdArray,
                        rowLengthArray: splatRegionRowLengthArray,
                    });
                    Splatting.setLastVertexCount(Splatting.getVertexCount());
                }
            }
        })
    }

    updateUniformsAndWorker(isUpdateGL = true, isUpdateWorker = true, isUpdateLocalStorage = true) {
        // update gl uniforms
        updateGL: {
            if (!isUpdateGL) break updateGL;
            let gl = Splatting.getGL();
            let program = Splatting.getProgram();
            if (this.uniforms === null) {
                this.uniforms = {
                    regionId: gl.getUniformLocation(program, `splatRegionInfos[${this.regionId}].regionId`),
                    positionOffset: gl.getUniformLocation(program, `splatRegionInfos[${this.regionId}].positionOffset`),
                    quaternion: gl.getUniformLocation(program, `splatRegionInfos[${this.regionId}].quaternion`),
                    boundaryMin: gl.getUniformLocation(program, `splatRegionInfos[${this.regionId}].boundaryMin`),
                    boundaryMax: gl.getUniformLocation(program, `splatRegionInfos[${this.regionId}].boundaryMax`)
                };
            }
            gl.uniform1f(this.uniforms.regionId, this.regionId);
            gl.uniform3fv(this.uniforms.positionOffset, this.getPositionOffset()); // mm --> m
            gl.uniform4fv(this.uniforms.quaternion, this.getQuaternion());
            gl.uniform3fv(this.uniforms.boundaryMin, this.getBoundaryMin());
            gl.uniform3fv(this.uniforms.boundaryMax, this.getBoundaryMax());
        }

        // update worker
        updateWorker: {
            if (!isUpdateWorker) break updateWorker;
            let worker = Splatting.getWorker();
            worker.postMessage({
                regionId: this.regionId,
                splatRegionInfo: {
                    positionOffset: this.getPositionOffset(), // mm --> m
                    quaternion: this.getQuaternion(),
                    boundaryMin: this.getBoundaryMin(),
                    boundaryMax: this.getBoundaryMax()
                },
            });
        }
        
        // set local storage
        updateLocalStorage: {
            if (!isUpdateLocalStorage) break updateLocalStorage;
            let key = `splat_region_${this.regionId}`;
            let value = {
                positionOffset: this.world.positionOffset.toArray(), // just save in mm
                quaternion: this.world.quaternion.toArray(),
                boundaryMin: this.boundary.min.toArray(),
                boundaryMax: this.boundary.max.toArray()
            }
            window.localStorage.setItem(key, JSON.stringify(value));
        }
    }

    // maybe need to implement a throttle loading mechanism, b/c directly changing the uniforms & sorting takes too much time
    changeFromGizmo() {
        switch (this.gizmoMode) {
            case 'transform': {
                // this.world.positionOffset.copy(this.gizmo.position).sub(this.boundary.center);
                this.world.positionOffset.copy(this.gizmo.position);
                this.world.quaternion.copy(this.gizmo.quaternion);
                this.updateUniformsAndWorker();
                this.transformBoundary();
                break;
            }
            case 'boundary': {
                this.updateBoundaryFromGizmo()
                break;
            }
            default: {
                break;
            }
        }
    }
    
    attachGizmo(mode = 'transform', options) {
        this.gizmo = dummyMesh;
        this.gizmoMode = mode;
        switch (this.gizmoMode) {
            case 'transform': {
                // this.gizmo.position.copy(this.boundary.center).add(this.world.positionOffset);
                this.gizmo.position.copy(this.world.positionOffset);
                this.gizmo.quaternion.copy(this.world.quaternion);

                controls.setSpace('world');
                controls.showX = true;
                controls.showY = true;
                controls.showZ = true;
                break;
            }
            case 'boundary': {
                this.activeBoundaryPlaneName = options.boundaryPlaneName;
                let boundaryPlane = this.boundaryPlaneMap.get(this.activeBoundaryPlaneName);
                let bpWorldPos = new THREE.Vector3();
                boundaryPlane.getWorldPosition(bpWorldPos);
                this.gizmo.position.copy(bpWorldPos);
                let bpWorldQuat = new THREE.Quaternion();
                boundaryPlane.getWorldQuaternion(bpWorldQuat);
                this.gizmo.quaternion.copy(bpWorldQuat);

                controls.setMode('translate');
                controls.setSpace('local');
                controls.showX = false;
                controls.showY = false;
                controls.showZ = true;
                break;
            }
            default: {
                break;
            }
        }
    }
    
    detachGizmo() {
        this.gizmo = null;
        this.gizmoMode = '';
        this.activeBoundaryPlaneName = '';
        this.lastGizmoPos = null;
    }
    
    getPositionOffset() {
        return this.world.positionOffset.clone().multiplyScalar(1 / SCALE_FACTOR).toArray(); // mm --> m
    }
    
    getQuaternion() {
        return this.world.quaternion.toArray();
    }
    
    getBoundaryMin() {
        return this.boundary.min.clone().multiplyScalar(1 / SCALE_FACTOR).toArray();
    }
    
    getBoundaryMax() {
        return this.boundary.max.clone().multiplyScalar(1 / SCALE_FACTOR).toArray();
    }
    
    getBoundaryCenter() {
        return this.boundary.center.clone().multiplyScalar(1 / SCALE_FACTOR).toArray();
    }
    
    showBoundary() {
        this.boundaryGroup.traverse((obj) => {
            obj.visible = true;
        });
    }

    hideBoundary() {
        this.boundaryGroup.traverse((obj) => {
            obj.visible = false;
        });
    }
}

function getTotalBytesRead() {
    return totalBytesRead;
}

function getVertexCountArray() {
    return splatVertexCountArray;
}

function getTotalVertexRead() {
    return splatVertexCountArray.reduce((sum, elt) => {return sum + elt}, 0);
}

function getSplatRegions() {
    return splatRegions;
}

function getRegionIdArray() {
    return splatRegionIdArray;
}

function getRowLengthArray() {
    return splatRegionRowLengthArray;
}

// todo Steve: get & set region transform & boundary info from info.json
function setRegionBoundaryFromStorageOrWorker(boundary_maps) {
    for (let [regionId, boundary] of boundary_maps.entries()) {
        let regionStorage = window.localStorage.getItem(`splat_region_${regionId}`);
        if (regionStorage !== null) {
            splatRegions.get(regionId).transformAndUpdateBoundaryFromLocalStorage(regionStorage);
        } else {
            splatRegions.get(regionId).updateBoundaryFromWorker(boundary);
        }
    }
    splatRegions.get(splatRegionActiveIndex).attachGizmo('transform');
}

function showSplatRegions() {
    // show dummyMesh & controls
    if (dummyMesh !== null) dummyMesh.visible = true;
    if (controls !== null) controls.visible = true;
    // show splat regions
    if (splatRegions === null) return;
    for (let region of splatRegions.values()) {
        region.showBoundary();
    }
}

function hideSplatRegions() {
    if (dummyMesh !== null) dummyMesh.visible = false;
    if (controls !== null) controls.visible = false;
    if (splatRegions === null) return;
    for (let region of splatRegions.values()) {
        region.hideBoundary();
    }
}

window.getSplatRegions = getSplatRegions;

function createLabels(region_map) {
    // return;
    for (let [regionId, center_map] of region_map.entries()) {
        let minCount = Infinity, maxCount = 0;
        for (let info of center_map.values()) {
            if (info.count < minCount) minCount = info.count;
            if (info.count > maxCount) maxCount = info.count;
        }
        console.log(regionId, center_map);
        continue;
        for (let [labelId, info] of center_map.entries()) {
            let label = document.getElementById(`label_${regionId}_${labelId}`);
            if (label === null) {
                let scaleFactor = remapCurveEaseOut(info.count, minCount, maxCount, 1, 8);
                // early return, hide labels
                if (!realityEditor.spatialCursor.isGSActive()) {
                    label.style.visibility = 'hidden';
                    continue;
                }
                let dont_render = (uLabel !== -1) && (uRegion !== -1) && !((uLabel === labelId) && (uRegion === regionId));
                if (dont_render) {
                    label.style.visibility = 'hidden';
                    continue;
                }
                // compute label screen-space position
                let splatRegion = SplatManager.getSplatRegions().get(regionId);
                let pos = [info.x, info.y, info.z];
                let bMin = splatRegion.getBoundaryMin();
                let bMax = splatRegion.getBoundaryMax();
                if (pos[0] < bMin[0] || pos[1] < bMin[1] || pos[2] < bMin[2] || pos[0] > bMax[0] || pos[1] > bMax[1] || pos[2] > bMax[2]) { // out of boundary
                    label.style.visibility = 'hidden';
                    continue;
                }
                let posOffset = splatRegion.getPositionOffset(); // mm --> m
                let q = splatRegion.getQuaternion();
                pos = multiply3v(quaternionToRotationMatrix(q), pos);
                pos[0] += posOffset[0];
                pos[1] += posOffset[1];
                pos[2] += posOffset[2];
                let pos2d = multiply4v(multiply4(projectionMatrix, actualViewMatrix), [...pos, 1]);
                let clip = 1.2 * pos2d[3];
                if (pos2d[2] < -clip || pos2d[0] < -clip || pos2d[0] > clip || pos2d[1] < -clip || pos2d[1] > clip) {
                    label.style.visibility = 'hidden';
                } else {
                    label.style.visibility = 'visible';
                    let ndcXY = [pos2d[0] / pos2d[3], pos2d[1] / pos2d[3]];
                    let screenXY = [(ndcXY[0] + 1) / 2 * innerWidth, (-ndcXY[1] + 1) / 2 * innerHeight];
                    label.style.transform = `translate(-50%, -50%) translate(${screenXY[0]}px, ${screenXY[1]}px)`;
                }

                // display up-to-date user-added labels
                let label_info_userData = label.getElementsByClassName('cluster-label-user-data')[0];
                if (info.userData.length === 0) {
                    // todo Steve: updating this every frame is VERY performance consuming, need to update it only when corresponding user data changes
                    label_info_userData.innerHTML = 'User data: ';
                    continue;
                }
                let userDataString = '';
                for (let i = 0; i < info.userData.length; i++) {
                    if (i === info.userData.length - 1) userDataString += `${info.userData[i]}`;
                    else userDataString += `${info.userData[i]}, `;
                }
                label_info_userData.innerHTML = `User Data: ${userDataString}`;
            }
        }
    }
}

export default {
    initService,
    SplatRegion,
    getTotalBytesRead,
    getVertexCountArray,
    getTotalVertexRead,
    getSplatRegions,
    getRegionIdArray,
    getRowLengthArray,
    setRegionBoundaryFromStorageOrWorker,
    showSplatRegions,
    hideSplatRegions,
    createLabels,
};
