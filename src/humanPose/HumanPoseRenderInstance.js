import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINTS, JOINT_CONNECTIONS} from './utils.js';
import {annotateHumanPoseRenderer} from './rebaScore.js';
import {
    JOINTS_PER_POSE,
    COLOR_BASE,
    COLOR_RED,
    COLOR_YELLOW,
    COLOR_GREEN,
    JOINT_TO_INDEX,
    BONE_TO_INDEX,
    SCALE,
    RENDER_CONFIDENCE_COLOR,
} from './constants.js';

/**
 * A single 3d skeleton rendered in a HumanPoseRenderer's slot
 */
export class HumanPoseRenderInstance {
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
        clone.copy(this, startingColorOption);
        return clone;
    }

    /**
     * Copy all elements of other pose render instance
     * @param {HumanPoseRenderInstance}
     */
    copy(other, startingColorOption = 0) {
        for (const jointId of Object.keys(JOINT_TO_INDEX)) {
            this.setJointPosition(jointId, other.getJointPosition(jointId));
        }
        // TODO would be significantly faster to use the bulk set methods
        this.updateBonePositions();

        let colorRainbow = new THREE.Color();
        colorRainbow.setHSL(((Date.now() / 5) % 360) / 360, 1, 0.5);

        let hueReba = other.getOverallRebaScoreHue();
        // let alphaReba = 0.3 + 0.3 * (poseRenderer.overallRebaScore - 1) / 11;
        let colorReba = new THREE.Color();
        colorReba.setHSL(hueReba / 360, 1, 0.5);

        if (!other.colorOptions || other.colorOptions.length !== 3) {
            // Generate color options manually if the other pose renderer
            // hasn't already e.g. a live pose rendere only has the baseline
            // bone/joint colors

            let boneColors = other.renderer.getSlotBoneColors(other.slot);
            let jointColors = other.renderer.getSlotJointColors(other.slot);

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

            this.colorOptions[0] = {
                boneColors: boneColorsReba,
                jointColors: jointColorsReba,
            };

            this.colorOptions[1] = {
                boneColors,
                jointColors,
            };

            this.colorOptions[2] = {
                boneColors: boneColorsRainbow,
                jointColors: jointColorsRainbow,
            };
        } else {
            for (let i = 0; i < other.colorOptions.length; i++) {
                let colorOption = other.colorOptions[i];
                let copiedOpt = {
                    boneColors: colorOption.boneColors.slice(0),
                    jointColors: colorOption.jointColors.slice(0),
                };
                this.colorOptions[i] = copiedOpt;
            }
        }

        this.setColorOption(startingColorOption);

        return this;
    }

    /**
     * Removes from container and disposes resources
     */
    remove() {
        this.renderer.leaveSlot(this.slot);
    }
}

