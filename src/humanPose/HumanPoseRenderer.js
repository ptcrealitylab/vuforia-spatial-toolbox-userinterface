import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {
    COLOR_BASE,
    SCALE,
    JOINTS_PER_POSE,
    BONES_PER_POSE,
} from './constants.js';

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
export class HumanPoseRenderer {
    /**
     * @param {THREE.Material} material - Material for all instanced meshes
     * @param {number} maxInstances - Maximum number of instances to render
     */
    constructor(material, maxInstances) {
        this.container = new THREE.Group();
        // A stack of free instance slots (indices) that a PoseRenderInstance
        // can reuse
        this.freeInstanceSlots = [];
        this.nextInstanceSlot = 0;
        this.maxInstances = maxInstances;
        this.material = material;
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
            JOINTS_PER_POSE * this.maxInstances,
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
            BONES_PER_POSE * this.maxInstances,
        );
        // Initialize instanceColor
        this.bonesMesh.setColorAt(0, COLOR_BASE);
        this.bonesMesh.count = 0;
        this.bonesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.bonesMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

        this.container.add(this.bonesMesh);
    }

    /**
     * @return {boolean} whether every slot is taken
     */
    isFull() {
        return this.nextInstanceSlot >= this.maxInstances &&
            this.freeInstanceSlots.length === 0;
    }

    /**
     * @return {number} index of the taken slot
     */
    takeSlot() {
        if (this.freeInstanceSlots.length > 0) {
            return this.freeInstanceSlots.pop();
        }
        if (this.nextInstanceSlot >= this.maxInstances) {
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
    
    removeFromParent() {
        this.removeFromScene(this.container.parent);
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

    /**
     * For debugging purposes
     */
    toString() {
        return JSON.stringify({
            jointsCount: this.jointsMesh.count,
            bonesCount: this.bonesMesh.count,
        });
    }
}
