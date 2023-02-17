import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINTS, JOINT_CONNECTIONS, JOINT_PUBLIC_DATA_KEYS, getJointNodeInfo} from './utils.js';
import {annotateHumanPoseRenderer} from './rebaScore.js';
import {SpaghettiMeshPath} from './spaghetti.js';

let humanPoseAnalyzer;
let poseRendererLive;
let poseRendererHistorical;
let poseRenderers = {};

const SCALE = 1000; // we want to scale up the size of individual joints, but not apply the scale to their positions
const RENDER_CONFIDENCE_COLOR = false;

const COLOR_BASE = new THREE.Color(0, 0.5, 1);
const COLOR_RED = new THREE.Color(1, 0, 0);
const COLOR_YELLOW = new THREE.Color(1, 1, 0);
const COLOR_GREEN = new THREE.Color(0, 1, 0);

const MAX_POSE_INSTANCES = 1024 * 2;
const JOINTS_PER_POSE = Object.keys(JOINTS).length;
const BONES_PER_POSE = Object.keys(JOINT_CONNECTIONS).length;

const JOINT_TO_INDEX = {};
for (const [i, jointId] of Object.values(JOINTS).entries()) {
    JOINT_TO_INDEX[jointId] = i;
}

const BONE_TO_INDEX = {};
for (const [i, boneName] of Object.keys(JOINT_CONNECTIONS).entries()) {
    BONE_TO_INDEX[boneName] = i;
}

/**
 * @param {THREE.InstancedBufferAttribute} instancedBufferAttribute
 * @param {number} slot - offset within iba in units of slots
 * @param {number} slotWidth - width of each slot in units of iba's item size
 * @return {TypedArray} array of length `slotWidth * itemSize`
 */
function getSliceSlot(instancedBufferAttribute, slot, slotWidth) {
    const itemSize = instancedBufferAttribute.itemSize;
    const start = slot * slotWidth * itemSize;
    return instancedBufferAttribute.array.slice(start, start + slotWidth * itemSize);
}

function setSliceSlot(instancedBufferAttribute, slot, slotWidth, items) {
    const itemSize = instancedBufferAttribute.itemSize;
    const start = slot * slotWidth * itemSize;

    unionUpdateRange(instancedBufferAttribute, start, slotWidth * itemSize);

    for (let i = 0; i < slotWidth * itemSize; i++) {
        instancedBufferAttribute.array[start + i] = items[i];
    }
}

function unionUpdateRange(instancedBufferAttribute, offset, count) {
    if (instancedBufferAttribute.updateRange.count === -1) {
        instancedBufferAttribute.updateRange.offset = offset;
        instancedBufferAttribute.updateRange.count = count;
        return;
    }
    let curMin = instancedBufferAttribute.updateRange.offset;
    let curMax = curMin + instancedBufferAttribute.updateRange.count;
    let plusMin = offset;
    let plusMax = offset + count;
    let newMin = Math.min(curMin, plusMin);
    let newMax = Math.max(curMax, plusMax);
    instancedBufferAttribute.updateRange.offset = newMin;
    instancedBufferAttribute.updateRange.count = newMax - newMin;
}

/**
 * Manager of multiple HumanPoseRenderInstances within two instanced meshes
 */
class HumanPoseRenderer {
    /**
     * @param {THREE.Material} material - Material for all instanced meshes
     */
    constructor(material) {
        this.container = new THREE.Group();
        // A stack of free instance slots (indices) that a PoseRenderInstance
        // can reuse
        this.freeInstanceSlots = [];
        this.nextInstanceSlot = 0;
        this.createMeshes(material);
    }

    /**
     * Creates all THREE.Meshes representing the spheres/joint balls of the
     * pose
     * @param {THREE.Material} material - Material for all instanced meshes
     */
    createMeshes(material) {
        const geo = new THREE.SphereGeometry(0.03 * SCALE, 12, 12);

        this.jointsMesh = new THREE.InstancedMesh(
            geo,
            material,
            JOINTS_PER_POSE * MAX_POSE_INSTANCES,
        );
        // Initialize instanceColor
        this.jointsMesh.setColorAt(0, COLOR_BASE);
        this.jointsMesh.count = 0;
        this.jointsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.jointsMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

        this.container.add(this.jointsMesh);

        const geoCyl = new THREE.CylinderGeometry(0.01 * SCALE, 0.01 * SCALE, SCALE, 3);
        this.bonesMesh = new THREE.InstancedMesh(
            geoCyl,
            material,
            BONES_PER_POSE * MAX_POSE_INSTANCES,
        );
        // Initialize instanceColor
        this.bonesMesh.setColorAt(0, COLOR_BASE);
        this.bonesMesh.count = 0;
        this.bonesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.bonesMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

        this.container.add(this.bonesMesh);
    }

    /**
     * @return {number} index of the taken slot
     */
    takeSlot() {
        if (this.freeInstanceSlots.length > 0) {
            return this.freeInstanceSlots.pop();
        }
        if (this.nextInstanceSlot >= MAX_POSE_INSTANCES) {
            console.error('out of instances');
            return 0;
        }
        const takenSlot = this.nextInstanceSlot;
        this.nextInstanceSlot += 1;

        this.jointsMesh.count = JOINTS_PER_POSE * this.nextInstanceSlot;
        this.bonesMesh.count = BONES_PER_POSE * this.nextInstanceSlot;

        return takenSlot;
    }

    hideSlot(slot) {
        let zeros = new THREE.Matrix4().set(
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 1,
        );
        for (let i = 0; i < JOINTS_PER_POSE; i++) {
            this.setJointMatrixAt(slot, i, zeros);
        }
        for (let i = 0; i < BONES_PER_POSE; i++) {
            this.setBoneMatrixAt(slot, i, zeros);
        }
    }

    /**
     * Hides `slot` and adds it to the free list for reuse
     * @param {number} slot to free up
     */
    leaveSlot(slot) {
        this.freeInstanceSlots.push(slot);
        this.hideSlot(slot);
    }

    /**
     * @param {number} slot - assigned rendering slot
     * @param {number} index - index of joint within slot
     * @param {THREE.Vector3} position
     */
    setJointMatrixAt(slot, index, matrix) {
        const offset = slot * JOINTS_PER_POSE + index;
        this.jointsMesh.setMatrixAt(
            offset,
            matrix,
        );
        const itemSize = this.jointsMesh.instanceMatrix.itemSize;
        const updateOffset = offset * itemSize;
        unionUpdateRange(this.jointsMesh.instanceMatrix, updateOffset, itemSize);
    }

    /**
     * @param {number} slot - assigned rendering slot
     * @param {number} index - index of bone within slot
     * @param {THREE.Vector3} position
     */
    setBoneMatrixAt(slot, index, matrix) {
        const offset = slot * BONES_PER_POSE + index;
        this.bonesMesh.setMatrixAt(
            offset,
            matrix,
        );

        const itemSize = this.bonesMesh.instanceMatrix.itemSize;
        const updateOffset = offset * itemSize;
        unionUpdateRange(this.bonesMesh.instanceMatrix, updateOffset, itemSize);
    }

    /**
     * @param {number} slot - assigned rendering slot
     * @param {number} index - index of joint within slot
     * @param {THREE.Color} color
     */
    setJointColorAt(slot, index, color) {
        this.jointsMesh.setColorAt(
            slot * JOINTS_PER_POSE + index,
            color,
        );
    }

    /**
     * @param {number} slot - assigned rendering slot
     * @param {number} index - index of bone within slot
     * @param {THREE.Color} color
     */
    setBoneColorAt(slot, index, color) {
        this.bonesMesh.setColorAt(
            slot * BONES_PER_POSE + index,
            color,
        );
    }

    /**
     * @param {number} slot
     * @return {Float32Array}
     */
    getSlotJointMatrices(slot) {
        return getSliceSlot(this.jointsMesh.instanceMatrix, slot, JOINTS_PER_POSE);
    }

    /**
     * @param {number} slot
     * @return {Float32Array}
     */
    getSlotBoneMatrices(slot) {
        return getSliceSlot(this.bonesMesh.instanceMatrix, slot, BONES_PER_POSE);
    }

    /**
     * @param {number} slot
     * @param {Float32Array} matrices
     */
    setSlotJointMatrices(slot, matrices) {
        setSliceSlot(this.jointsMesh.instanceMatrix, slot, JOINTS_PER_POSE, matrices);
    }

    /**
     * @param {number} slot
     * @param {Float32Array} matrices
     */
    setSlotBoneMatrices(slot, matrices) {
        setSliceSlot(this.bonesMesh.instanceMatrix, slot, BONES_PER_POSE, matrices);
    }


    /**
     * @param {number} slot
     * @return {Float32Array}
     */
    getSlotJointColors(slot) {
        return getSliceSlot(this.jointsMesh.instanceColor, slot, JOINTS_PER_POSE);
    }

    /**
     * @param {number} slot
     * @return {Float32Array}
     */
    getSlotBoneColors(slot) {
        return getSliceSlot(this.bonesMesh.instanceColor, slot, BONES_PER_POSE);
    }

    /**
     * @param {number} slot
     * @param {Float32Array} colors
     */
    setSlotJointColors(slot, colors) {
        setSliceSlot(this.jointsMesh.instanceColor, slot, JOINTS_PER_POSE, colors);
    }

    /**
     * @param {number} slot
     * @param {Float32Array} colors
     */
    setSlotBoneColors(slot, colors) {
        setSliceSlot(this.bonesMesh.instanceColor, slot, BONES_PER_POSE, colors);
    }

    addToScene(container) {
        if (container) {
            container.add(this.container);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.container);
        }
    }

    /**
     * Removes from container and disposes resources
     */
    removeFromScene(container) {
        if (container) {
            container.remove(this.container);
        } else {
            realityEditor.gui.threejsScene.removeFromScene(this.container);
        }
        this.bonesMesh.dispose();
        this.jointsMesh.dispose();
    }

    markNeedsUpdate() {
        this.markMatrixNeedsUpdate();
        this.markColorNeedsUpdate();
    }

    markMatrixNeedsUpdate() {
        this.jointsMesh.instanceMatrix.needsUpdate = true;
        this.bonesMesh.instanceMatrix.needsUpdate = true;
    }

    markColorNeedsUpdate() {
        this.jointsMesh.instanceColor.needsUpdate = true;
        this.bonesMesh.instanceColor.needsUpdate = true;
    }
}

/**
 * A single 3d skeleton rendered in a HumanPoseRenderer's slot
 */
class HumanPoseRenderInstance {
    /**
     * @param {HumanPoseRenderer} renderer
     * @param {string} id - Unique identifier of human pose being rendered
     */
    constructor(renderer, id) {
        this.renderer = renderer;
        this.id = id;
        this.updated = true;
        this.visible = true;
        this.jointPositions = [];
        for (let i = 0; i < JOINTS_PER_POSE; i++) {
            this.jointPositions.push(new THREE.Vector3(0, 0, 0));
        }
        this.previousMatrices = null;
        this.overallRebaScore = 1;
        this.colorOptions = [];
        this.slot = -1;
        this.add();
    }

    /**
     * Occupies a slot on the renderer, uploading initial values
     * @param {number?} slot - manually assigned slot, taken from renderer
     * otherwise
     */
    add(slot) {
        if (typeof slot === 'number') {
            this.slot = slot;
        } else {
            this.slot = this.renderer.takeSlot();
        }

        for (const [i, _jointId] of Object.values(JOINTS).entries()) {
            this.renderer.setJointColorAt(this.slot, i, COLOR_BASE);
        }

        for (const [i, _boneName] of Object.keys(JOINT_CONNECTIONS).entries()) {
            this.renderer.setBoneColorAt(this.slot, i, COLOR_BASE);
        }
    }

    /**
     * @param {string} jointId - from utils.JOINTS
     * @param {THREE.Vector3} position
     */
    setJointPosition(jointId, position) {
        const index = JOINT_TO_INDEX[jointId];
        this.jointPositions[index] = position;

        this.renderer.setJointMatrixAt(
            this.slot,
            index,
            new THREE.Matrix4().makeTranslation(
                position.x,
                position.y,
                position.z,
            ),
        );
    }

    /**
     * @return {THREE.Vector3}
     */
    getJointPosition(jointId) {
        const index = JOINT_TO_INDEX[jointId];
        return this.jointPositions[index];
    }

    /**
     * @param {Array<String>} jointIds
     * @return {{x: number, y: number, z: number}} Average position of all
     *         joints listed in jointIds
     */
    averageJointPositions(jointIds) {
        let avg = {x: 0, y: 0, z: 0};
        for (let jointId of jointIds) {
            let jointPos = this.getJointPosition(jointId);
            avg.x += jointPos.x;
            avg.y += jointPos.y;
            avg.z += jointPos.z;
        }
        avg.x /= jointIds.length;
        avg.y /= jointIds.length;
        avg.z /= jointIds.length;
        return avg;
    }

    /**
     * Sets all matrices in our assigned renderer slot based on the current
     * state of this instance
     */
    setAllMatrices() {
        for (let i = 0; i < this.jointPositions.length; i++) {
            let position = this.jointPositions[i];
            this.renderer.setJointMatrixAt(
                this.slot,
                i,
                new THREE.Matrix4().makeTranslation(
                    position.x,
                    position.y,
                    position.z,
                ),
            );
        }

        this.updateBonePositions();
    }

    /**
     * Updates bone (stick between joints) positions based on joint
     * positions.
     */
    updateBonePositions() {
        for (let boneName of Object.keys(JOINT_CONNECTIONS)) {
            const boneIndex = BONE_TO_INDEX[boneName];
            let jointA = this.getJointPosition(JOINT_CONNECTIONS[boneName][0]);
            let jointB = this.getJointPosition(JOINT_CONNECTIONS[boneName][1]);

            let pos = new THREE.Vector3(
                (jointA.x + jointB.x) / 2,
                (jointA.y + jointB.y) / 2,
                (jointA.z + jointB.z) / 2,
            );

            let diff = new THREE.Vector3(jointB.x - jointA.x, jointB.y - jointA.y,
                jointB.z - jointA.z);
            let scale = new THREE.Vector3(1, diff.length() / SCALE, 1);
            diff.normalize();

            let rot = new THREE.Quaternion();
            rot.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
                                   diff);

            // bone.lookAt(this.container.localToWorld(localTarget));
            // bone.rotateX(Math.PI / 2);
            let mat = new THREE.Matrix4();
            mat.compose(pos, rot, scale);

            this.renderer.setBoneMatrixAt(this.slot, boneIndex, mat);
        }

        if (!RENDER_CONFIDENCE_COLOR) {
            annotateHumanPoseRenderer(this);
        }
    }

    setOverallRebaScore(score) {
        this.overallRebaScore = score;
    }

    /**
     * Annotates bone using material based on boneColor
     * @param {string} boneName
     * @param {number} boneColor
     */
    setBoneRebaColor(boneName, boneColor) {
        if (typeof BONE_TO_INDEX[boneName] === 'undefined') {
            return;
        }

        const boneIndex = BONE_TO_INDEX[boneName];
        const joint = JOINT_CONNECTIONS[boneName][1];
        const jointIndex = JOINT_TO_INDEX[joint];

        let color = COLOR_BASE;
        if (boneColor === 0) {
            color = COLOR_GREEN;
        } else if (boneColor === 1) {
            color = COLOR_YELLOW;
        } else if (boneColor === 2) {
            color = COLOR_RED;
        }
        this.renderer.setBoneColorAt(this.slot, boneIndex, color);
        this.renderer.setJointColorAt(this.slot, jointIndex, color);
    }

    /**
     * @param {number} confidence in range [0,1]
     */
    setJointConfidenceColor(jointId, confidence) {
        if (typeof JOINT_TO_INDEX[jointId] === 'undefined') {
            return;
        }
        const jointIndex = JOINT_TO_INDEX[jointId];

        let baseColorHSL = {};
        this.baseColor.getHSL(baseColorHSL);

        baseColorHSL.l = baseColorHSL.l * confidence;

        let color = new THREE.Color();
        color.setHSL(baseColorHSL.h, baseColorHSL.s, baseColorHSL.l);

        this.renderer.setJointColorAt(this.slot, jointIndex, color);
    }

    setColorOption(colorOptionIndex) {
        this.renderer.setSlotBoneColors(this.slot, this.colorOptions[colorOptionIndex].boneColors);
        this.renderer.setSlotJointColors(this.slot, this.colorOptions[colorOptionIndex].jointColors);
    }

    setVisible(visible) {
        if (this.visible === visible) {
            return;
        }

        if (this.visible) {
            if (!this.previousMatrices) {
                this.previousMatrices = {
                    boneMatrices: this.renderer.getSlotBoneMatrices(this.slot),
                    jointMatrices: this.renderer.getSlotJointMatrices(this.slot),
                };
            }
            this.renderer.hideSlot(this.slot);
        } else {
            this.renderer.setSlotBoneMatrices(this.slot, this.previousMatrices.boneMatrices);
            this.renderer.setSlotJointMatrices(this.slot, this.previousMatrices.jointMatrices);
        }
        this.visible = visible;
    }

    getOverallRebaScoreHue() {
        let hueReba = 140 - (this.overallRebaScore - 1) * 240 / 11;
        if (isNaN(hueReba)) {
            hueReba = 120;
        }
        hueReba = (Math.min(Math.max(hueReba, -30), 120) + 360) % 360;
        return hueReba;
    }

    cloneToRenderer(newRenderer, startingColorOption) {
        let clone = new HumanPoseRenderInstance(newRenderer, this.id);

        for (const jointId of Object.keys(JOINT_TO_INDEX)) {
            clone.setJointPosition(jointId, this.getJointPosition(jointId));
        }
        // TODO would be significantly faster to use the bulk set methods
        clone.updateBonePositions();

        let colorRainbow = new THREE.Color();
        colorRainbow.setHSL(((Date.now() / 5) % 360) / 360, 1, 0.5);

        let hueReba = this.getOverallRebaScoreHue();
        // let alphaReba = 0.3 + 0.3 * (poseRenderer.overallRebaScore - 1) / 11;
        let colorReba = new THREE.Color();
        colorReba.setHSL(hueReba / 360, 1, 0.5);

        let boneColors = this.renderer.getSlotBoneColors(this.slot);
        let jointColors = this.renderer.getSlotJointColors(this.slot);

        let boneColorsRainbow = boneColors.slice(0);
        let jointColorsRainbow = jointColors.slice(0);

        let boneColorsReba = boneColors.slice(0);
        let jointColorsReba = jointColors.slice(0);

        for (let i = 0; i < boneColors.length / 3; i++) {
            colorRainbow.toArray(boneColorsRainbow, i * 3);
            colorReba.toArray(boneColorsReba, i * 3);
        }
        for (let i = 0; i < jointColors.length / 3; i++) {
            colorRainbow.toArray(jointColorsRainbow, i * 3);
            colorReba.toArray(jointColorsReba, i * 3);
        }

        clone.colorOptions.push({
            boneColors: boneColorsReba,
            jointColors: jointColorsReba,
        });

        clone.colorOptions.push({
            boneColors,
            jointColors,
        });

        clone.colorOptions.push({
            boneColors: boneColorsRainbow,
            jointColors: jointColorsRainbow,
        });

        clone.setColorOption(startingColorOption);

        return clone;
    }

    /**
     * Removes from container and disposes resources
     */
    remove() {
        this.renderer.leaveSlot(this.slot);
    }
}

const AnimationMode = {
    ONE: 'one',
    ALL: 'all',
};

export class HumanPoseAnalyzer {
    /**
     * @param {THREE.Object3D} historyMeshContainer - THREE container for
     *                         history line meshes
     * @param {THREE.Object3D} historyCloneContainer - THREE container for
     *                         history clone meshes
     */
    constructor(historyMeshContainer, historyCloneContainer) {
        this.historyMeshContainer = historyMeshContainer;
        this.historyCloneContainer = historyCloneContainer;
        this.recordingClones = true;
        this.cloneMaterialIndex = 0;
        this.historyMeshesAll = {};
        this.clonesAll = [];
        this.lastDisplayedCloneIndex = 0;

        this.animationStart = -1;
        this.animationEnd = -1;
        this.animationPosition = -1;
        this.animationMode = AnimationMode.ONE;
        this.lastAnimationUpdate = Date.now();

        this.update = this.update.bind(this);

        window.requestAnimationFrame(this.update);
    }

    update() {
        let minTimestamp = -1;
        let maxTimestamp = -1;
        for (let spaghettiMesh of Object.values(this.historyMeshesAll)) {
            let comparer = spaghettiMesh.comparer;
            let points = spaghettiMesh.currentPoints;
            if (comparer.firstPointIndex === null) {
                continue;
            }
            let firstTimestamp = points[comparer.firstPointIndex].timestamp;
            let secondTimestamp = firstTimestamp + 1;
            if (comparer.secondPointIndex) {
                secondTimestamp = points[comparer.secondPointIndex].timestamp;
            }
            if (minTimestamp < 0) {
                minTimestamp = firstTimestamp;
            }
            minTimestamp = Math.min(minTimestamp, firstTimestamp, secondTimestamp);
            maxTimestamp = Math.max(maxTimestamp, firstTimestamp, secondTimestamp);
        }

        this.setAnimation(minTimestamp, maxTimestamp);
        this.updateAnimation();

        window.requestAnimationFrame(this.update);
    }

    poseRendererUpdated(poseRenderer, timestamp) {
        if (this.recordingClones) {
            const obj = poseRenderer.cloneToRenderer(poseRendererHistorical, this.cloneMaterialIndex);
            this.clonesAll.push({
                timestamp,
                poseObject: obj,
            })
            obj.setVisible(this.animationMode === AnimationMode.ALL);
        }

        let newPoint = poseRenderer.getJointPosition(JOINTS.NOSE).clone();
        newPoint.y += 400;

        if (!this.historyMeshesAll.hasOwnProperty(poseRenderer.id)) {
            this.createHistoryLine(poseRenderer);
        }

        let historyMesh = this.historyMeshesAll[poseRenderer.id];

        // Split spaghetti line if we jumped by a large amount
        if (historyMesh.currentPoints.length > 0) {
            let lastPoint = historyMesh.currentPoints[historyMesh.currentPoints.length - 1];
            let lastVec = new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z);
            if (lastVec.distanceToSquared(newPoint) > 800 * 800) {
                this.historyMeshesAll[poseRenderer.id + '-until-' + timestamp] = historyMesh;
                this.createHistoryLine(poseRenderer);
                historyMesh = this.historyMeshesAll[poseRenderer.id];
            }
        }

        let hueReba = poseRenderer.getOverallRebaScoreHue();
        let colorRGB = new THREE.Color();
        colorRGB.setHSL(hueReba / 360, 0.8, 0.3);

        let nextHistoryPoint = {
            x: newPoint.x,
            y: newPoint.y,
            z: newPoint.z,
            color: [colorRGB.r * 255, colorRGB.g * 255, colorRGB.b * 255],
            overallRebaScore: poseRenderer.overallRebaScore,
            timestamp,
        };

        historyMesh.currentPoints.push(nextHistoryPoint);
        this.historyMeshesAll[poseRenderer.id].setPoints(historyMesh.currentPoints);
    }

    /**
     * Creates a history line (spaghetti line) placing it within
     * the historyMeshContainer
     * @param {HumanPoseRenderer} poseRenderer
     */
    createHistoryLine(poseRenderer) {
        const historyMesh = new SpaghettiMeshPath([], {
            widthMm: 30,
            heightMm: 30,
            usePerVertexColors: true,
            wallBrightness: 0.6,
        });
        this.historyMeshContainer.add(historyMesh);

        this.historyMeshesAll[poseRenderer.id] = historyMesh;
    }

    resetHistoryLines() {
        for (let key of Object.keys(this.historyMeshesAll)) {
            let historyMesh = this.historyMeshesAll[key];
            historyMesh.resetPoints();
            this.historyMeshContainer.remove(historyMesh);
        }
        this.historyMeshesAll = {};
    }

    resetHistoryClones() {
        if (this.clonesAll.length === 0) {
            return;
        }
        for (let clone of this.clonesAll) {
            clone.poseObject.remove();
        }
        poseRendererHistorical.markMatrixNeedsUpdate();
        this.clonesAll = [];
    }

    /**
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     */
    setHighlightTimeInterval(firstTimestamp, secondTimestamp) {
        for (let mesh of Object.values(this.historyMeshesAll)) {
            mesh.setHighlightTimeInterval(firstTimestamp, secondTimestamp);
        }
    }

    /**
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     */
    setDisplayTimeInterval(firstTimestamp, secondTimestamp) {
        for (let mesh of Object.values(this.historyMeshesAll)) {
            if (mesh.getStartTime() > secondTimestamp || mesh.getEndTime() < firstTimestamp) {
                mesh.visible = false;
                continue;
            }
            mesh.visible = true;
            mesh.setDisplayTimeInterval(firstTimestamp, secondTimestamp);
        }
    }

    /**
     * @param {number} timestamp - time to hover in ms
     */
    setHoverTime(timestamp) {
        if (timestamp < 0) {
            return;
        }
        for (let mesh of Object.values(this.historyMeshesAll)) {
            if (mesh.getStartTime() > timestamp || mesh.getEndTime() < timestamp) {
                continue;
            }
            mesh.setHoverTime(timestamp);
        }
    }

    /**
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     * @return {Array<SpaghettiMeshPathPoint>}
     */
    getHistoryPointsInTimeInterval(firstTimestamp, secondTimestamp) {
        // TODO: perf can be improved through creating historyPointsAll and
        // binary search for indices
        let allPoints = [];
        for (const mesh of Object.values(this.historyMeshesAll)) {
            for (const point of mesh.currentPoints) {
                if (point.timestamp < firstTimestamp) {
                    continue;
                }
                if (point.timestamp > secondTimestamp) {
                    // Assume sorted
                    break;
                }
                allPoints.push(point);
            }
        }
        allPoints.sort((a, b) => {
            return a.timestamp - b.timestamp;
        });
        return allPoints;
    }

    /**
     * @param {boolean} visible
     */
    setHistoryLinesVisible(visible) {
        this.historyMeshContainer.visible = visible;
    }

    /**
     * @param {AnimationMode} animationMode
     */
    setAnimationMode(animationMode) {
        this.animationMode = animationMode;
        if (this.clonesAll.length === 0) {
            return;
        }
        if (this.animationMode === AnimationMode.ALL) {
            for (let clone of this.clonesAll) {
                clone.poseObject.setVisible(true);
            }
        } else {
            for (let clone of this.clonesAll) {
                clone.poseObject.setVisible(false);
            }
        }
        poseRendererHistorical.markMatrixNeedsUpdate();
    }

    advanceCloneMaterial() {
        this.cloneMaterialIndex = (this.cloneMaterialIndex + 1) % 3;

        this.clonesAll.forEach(clone => {
            clone.poseObject.setColorOption(this.cloneMaterialIndex);
        });
        poseRendererHistorical.markColorNeedsUpdate();
    }

    setAnimation(start, end) {
        if (this.animationStart === start && this.animationEnd === end) {
            return;
        }

        this.animationStart = start;
        this.animationEnd = end;

        // Fully reset the animation when changing
        this.hideLastDisplayedClone();
        this.lastDisplayedCloneIndex = -1;
    }

    updateAnimation() {
        let dt = Date.now() - this.lastAnimationUpdate;
        this.lastAnimationUpdate += dt;

        if (this.animationStart < 0 || this.animationEnd < 0) {
            this.hideLastDisplayedClone();
            this.lastDisplayedCloneIndex = -1;
            return;
        }

        this.animationPosition += dt;
        let offset = this.animationPosition - this.animationStart;
        let duration = this.animationEnd - this.animationStart;
        let offsetClamped = offset % duration;
        this.animationPosition = this.animationStart + offsetClamped;
        this.displayNearestClone(this.animationPosition);
    }

    hideLastDisplayedClone() {
        if (this.lastDisplayedCloneIndex >= 0) {
            let lastClone = this.clonesAll[this.lastDisplayedCloneIndex];
            if (lastClone && lastClone.poseObject.visible) {
                lastClone.poseObject.setVisible(false);
                poseRendererHistorical.markMatrixNeedsUpdate();
            }
        }
    }

    displayNearestClone(timestamp) {
        if (this.clonesAll.length < 2) {
            return;
        }

        let bestClone = null;
        let bestCloneIndex = -1;
        let start = Math.max(this.lastDisplayedCloneIndex, 0);
        if (this.clonesAll[start].timestamp > timestamp) {
            start = 0;
        }
        for (let i = start; i < this.clonesAll.length; i++) {
            let clone = this.clonesAll[i];
            let cloneNext = this.clonesAll[i + 1];
            if (clone.timestamp > timestamp) {
                break;
            }
            if (!cloneNext || cloneNext.timestamp > timestamp) {
                bestClone = clone;
                bestCloneIndex = i;
                break;
            }
        }
        if (bestClone) {
            if (this.lastDisplayedCloneIndex !== bestCloneIndex) {
                this.hideLastDisplayedClone();
                this.lastDisplayedCloneIndex = bestCloneIndex;
                bestClone.poseObject.setVisible(true);
                poseRendererHistorical.markMatrixNeedsUpdate();
            }
        } else {
            this.hideLastDisplayedClone();
            this.lastDisplayedCloneIndex = -1;
        }
    }
}

let prevHistorical = false;

function renderHumanPoseObjects(poseObjects, timestamp, historical, container) {

    if (realityEditor.gui.poses.isPose2DSkeletonRendered()) return;

    if (!humanPoseAnalyzer) {
        const historyMeshContainer = new THREE.Group();
        historyMeshContainer.visible = false;
        if (container) {
            container.add(historyMeshContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(historyMeshContainer);
        }

        const historyCloneContainer = new THREE.Group();
        historyCloneContainer.visible = true;
        if (container) {
            container.add(historyCloneContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(historyCloneContainer);
        }

        humanPoseAnalyzer = new HumanPoseAnalyzer(historyMeshContainer, historyCloneContainer);

        poseRendererLive = new HumanPoseRenderer(new THREE.MeshBasicMaterial());
        poseRendererLive.addToScene(container);

        poseRendererHistorical = new HumanPoseRenderer(new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.5,
        }));
        poseRendererHistorical.addToScene(container);
    }

    for (let id in poseRenderers) {
        poseRenderers[id].updated = false;
    }
    for (let poseObject of poseObjects) {
        if (historical) {
            renderHistoricalPose(poseObject, timestamp, container);
        } else {
            renderPose(poseObject, timestamp, container);
        }
    }
    for (let id of Object.keys(poseRenderers)) {
        if (!poseRenderers[id].updated) {
            poseRenderers[id].remove();
            delete poseRenderers[id];
        }
    }

    if (!historical) {
        poseRendererLive.markNeedsUpdate();

        if (prevHistorical) {
            poseRendererHistorical.markNeedsUpdate();
        }
    }

    prevHistorical = historical;
}

function setMatrixFromArray(matrix, array) {
    matrix.set( array[0], array[4], array[8], array[12],
        array[1], array[5], array[9], array[13],
        array[2], array[6], array[10], array[14],
        array[3], array[7], array[11], array[15]
    );
}

function renderPose(poseObject, timestamp, container) {
    updatePoseRenderer(poseObject, timestamp, container, false);
}

function renderHistoricalPose(poseObject, timestamp, container) {
    if (!poseObject.uuid) {
        poseObject.uuid = poseObject.objectId;
        poseObject.id = poseObject.objectId;
    }

    updatePoseRenderer(poseObject, timestamp, container, true);
}

function updatePoseRenderer(poseObject, timestamp, container, historical) {
    let renderer = historical ? poseRendererHistorical : poseRendererLive;
    if (!poseRenderers[poseObject.uuid]) {
        poseRenderers[poseObject.uuid] = new HumanPoseRenderInstance(renderer, poseObject.uuid);
    }
    let poseRenderer = poseRenderers[poseObject.uuid];

    if (historical) {
        updateJointsHistorical(poseRenderer, poseObject);
    } else {
        updateJoints(poseRenderer, poseObject);
    }

    poseRenderer.updateBonePositions();

    humanPoseAnalyzer.poseRendererUpdated(poseRenderer, timestamp);
    if (realityEditor.analytics) {
        realityEditor.analytics.appendPose({
            time: timestamp,
        });
    }
}

function getGroundPlaneRelativeMatrix() {
    let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
    let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
    let groundPlaneRelativeMatrix = new THREE.Matrix4();
    setMatrixFromArray(groundPlaneRelativeMatrix, worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode));
    return groundPlaneRelativeMatrix;
}

function updateJointsHistorical(poseRenderer, poseObject) {
    let groundPlaneRelativeMatrix = getGroundPlaneRelativeMatrix();

    if (poseObject.matrix && poseObject.matrix.length > 0) {
        let objectRootMatrix = new THREE.Matrix4();
        setMatrixFromArray(objectRootMatrix, poseObject.matrix);
        groundPlaneRelativeMatrix.multiply(objectRootMatrix);
    }

    for (let jointId of Object.values(JOINTS)) {
        let frame = poseObject.frames[poseObject.uuid + jointId];
        if (!frame.ar.matrix) {
            continue;
        }

        // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
        let jointMatrixThree = new THREE.Matrix4();
        setMatrixFromArray(jointMatrixThree, frame.ar.matrix);
        jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

        let jointPosition = new THREE.Vector3();
        jointPosition.setFromMatrixPosition(jointMatrixThree);

        poseRenderer.setJointPosition(jointId, jointPosition);
    }
}

function updateJoints(poseRenderer, poseObject) {
    let groundPlaneRelativeMatrix = getGroundPlaneRelativeMatrix();

    for (const [i, jointId] of Object.values(JOINTS).entries()) {
        // assume that all sub-objects are of the form poseObject.id + joint name
        let sceneNode = realityEditor.sceneGraph.getSceneNodeById(`${poseObject.uuid}${jointId}`);

        // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
        let jointMatrixThree = new THREE.Matrix4();
        setMatrixFromArray(jointMatrixThree, sceneNode.worldMatrix);
        jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

        let jointPosition = new THREE.Vector3();
        jointPosition.setFromMatrixPosition(jointMatrixThree);

        poseRenderer.setJointPosition(jointId, jointPosition);

        if (RENDER_CONFIDENCE_COLOR) {
            let keys = getJointNodeInfo(poseObject, i);
            // zero confidence if node's public data are not available
            let confidence = 0.0;
            if (keys) {
                const node = poseObject.frames[keys.frameKey].nodes[keys.nodeKey];
                if (node && node.publicData[JOINT_PUBLIC_DATA_KEYS.data].confidence !== undefined) {
                    confidence = node.publicData[JOINT_PUBLIC_DATA_KEYS.data].confidence;
                }
            }
            poseRenderer.setJointConfidenceColor(jointId, confidence);
        }
    }
}

function resetHistoryLines() {
    humanPoseAnalyzer.resetHistoryLines();
}

function resetHistoryClones() {
    humanPoseAnalyzer.resetHistoryClones();
}

/**
 * @param {number} firstTimestamp - start of time interval in ms
 * @param {number} secondTimestamp - end of time interval in ms
 */
function setHighlightTimeInterval(firstTimestamp, secondTimestamp) {
    humanPoseAnalyzer.setHighlightTimeInterval(firstTimestamp, secondTimestamp);
}

/**
 * @param {number} firstTimestamp - start of time interval in ms
 * @param {number} secondTimestamp - end of time interval in ms
 * @return {Array<SpaghettiMeshPathPoint>}
 */
function getHistoryPointsInTimeInterval(firstTimestamp, secondTimestamp) {
    return humanPoseAnalyzer.getHistoryPointsInTimeInterval(firstTimestamp, secondTimestamp);
}

/**
 * @param {boolean} visible
 */
function setHistoryLinesVisible(visible) {
    if (!humanPoseAnalyzer) {
        return;
    }
    humanPoseAnalyzer.setHistoryLinesVisible(visible);
}

/**
 * @param {boolean} enabled
 */
function setRecordingClonesEnabled(enabled) {
    if (enabled) {
        humanPoseAnalyzer.setAnimationMode(AnimationMode.ALL);
    } else {
        humanPoseAnalyzer.setAnimationMode(AnimationMode.ONE);
    }
}

function advanceCloneMaterial() {
    humanPoseAnalyzer.advanceCloneMaterial();
}

/**
 * @param {number} time - ms
 */
function setHoverTime(time) {
    humanPoseAnalyzer.setHoverTime(time);
}

/**
 * @param {number} startTime - ms
 * @param {number} endTime - ms
 */
function setDisplayTimeInterval(startTime, endTime) {
    humanPoseAnalyzer.setDisplayTimeInterval(startTime, endTime);
}

export {
    renderHumanPoseObjects,
    resetHistoryLines,
    resetHistoryClones,
    setHoverTime,
    setHighlightTimeInterval,
    setDisplayTimeInterval,
    setHistoryLinesVisible,
    setRecordingClonesEnabled,
    advanceCloneMaterial,
    getHistoryPointsInTimeInterval,
};
