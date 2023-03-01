import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {
    JOINT_TO_INDEX,
    BONE_TO_INDEX,
    SCALE,
    RENDER_CONFIDENCE_COLOR,
} from './constants.js';
import AnalyticsColors from "./AnalyticsColors.js";

/**
 * A single 3d skeleton rendered in a HumanPoseRenderer's slot
 */
export class HumanPoseRenderInstance {
    /**
     * @param {HumanPoseRenderer} renderer
     * @param {string} id - Unique identifier of human pose being rendered
     * @param {AnalyticsLens} lens - The initial lens to use for this instance
     */
    constructor(renderer, id, lens) {
        this.renderer = renderer;
        this.id = id;
        this.updated = true;
        this.visible = true;
        this.lens = lens;
        this.lensColors = {};
        this.pose = null;
        this.slot = -1;
        this.add();
    }

    /**
     * Occupies a slot on the renderer, uploading initial values
     * @param {number?} slot - manually assigned slot, taken from renderer otherwise
     */
    add(slot) {
        if (typeof slot === 'number') {
            this.slot = slot;
        } else {
            this.slot = this.renderer.takeSlot();
        }

        Object.values(JOINT_TO_INDEX).forEach(index => {
            this.renderer.setJointColorAt(this.slot, index, AnalyticsColors.base);
        });

        Object.values(BONE_TO_INDEX).forEach(index => {
            this.renderer.setBoneColorAt(this.slot, index, AnalyticsColors.base);
        });
    }

    /**
     * Sets the position of a joint
     * @param {string} jointId - ID of joint to set position of
     * @param {Vector3} position - Position to set joint to
     */
    setJointPosition(jointId, position) {
        const index = JOINT_TO_INDEX[jointId];
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
     * Updates joint positions based on this.pose
     */
    updateJointPositions() {
        this.pose.forEachJoint(joint => {
            this.setJointPosition(joint.name, joint.position);
        });
    }

    /**
     * Updates bone (stick between joints) position based on this.joints' positions.
     * @param bone {Object} - bone from this.pose
     */
    updateBonePosition(bone) {
        const boneIndex = BONE_TO_INDEX[bone.name];
        const jointAPos = bone.joint0.position;
        const jointBPos = bone.joint1.position;

        const pos = jointAPos.clone().add(jointBPos).divideScalar(2);

        const scale = jointBPos.clone().sub(jointAPos).length();
        const scaleVector = new THREE.Vector3(1, scale / SCALE, 1);

        const direction = jointBPos.clone().sub(jointAPos).normalize();
        const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

        const mat = new THREE.Matrix4().compose(pos, rot, scaleVector);
        this.renderer.setBoneMatrixAt(this.slot, boneIndex, mat);
    }

    /**
     * Updates bone (stick between joints) positions based on this.joints' positions.
     */
    updateBonePositions() {
        this.pose.forEachBone(bone => {
            this.updateBonePosition(bone);
        });
    }

    /**
     * Updates the pose displayed by the pose renderer
     * @param pose {Pose} The pose to display
     */
    setPose(pose) {
        this.pose = pose;

        this.updateJointPositions();
        this.updateBonePositions();
        this.updateColorBuffers(this.lens);
    }

    /**
     * Sets the active lens for pose coloring
     * @param lens {AnalyticsLens} - lens to set
     */
    setLens(lens) {
        this.lens = lens;
        this.updateColorBuffers(this.lens);
    }

    /**
     * Annotates joint using material based on jointColor
     * @param {string} jointName
     * @param {Color} jointColor
     */
    setJointColor(jointName, jointColor) {
        if (typeof JOINT_TO_INDEX[jointName] === 'undefined') {
            return;
        }
        const index = JOINT_TO_INDEX[jointName];
        this.renderer.setJointColorAt(this.slot, index, jointColor);
    }

    /**
     * Annotates bone using material based on boneColor
     * @param {string} boneName
     * @param {Color} boneColor
     */
    setBoneColor(boneName, boneColor) {
        if (typeof BONE_TO_INDEX[boneName] === 'undefined') {
            return;
        }
        const index = BONE_TO_INDEX[boneName];
        this.renderer.setBoneColorAt(this.slot, index, boneColor);
    }

    /**
     * Sets the colors of the pose based on the current lens
     * @param {AnalyticsLens} lens - lens to use for updating colors
     */
    updateColorBuffers(lens) {
        if (!this.lensColors[lens.name]) {
            this.lensColors[lens.name] = {
                joints: Object.values(JOINT_TO_INDEX).map(() => AnalyticsColors.undefined),
                bones: Object.values(BONE_TO_INDEX).map(() => AnalyticsColors.undefined),
            };
        }
        this.pose.forEachJoint(joint => {
            this.lensColors[lens.name].joints[JOINT_TO_INDEX[joint.name]] = lens.getColorForJoint(joint);
        });
        this.pose.forEachBone(bone => {
            this.lensColors[lens.name].bones[BONE_TO_INDEX[bone.name]] = lens.getColorForBone(bone);
        });
        if (lens === this.lens && !RENDER_CONFIDENCE_COLOR) {
            this.pose.forEachJoint(joint => {
                this.setJointColor(joint.name, this.lensColors[this.lens.name].joints[JOINT_TO_INDEX[joint.name]]);
            });
            this.pose.forEachBone(bone => {
                this.setBoneColor(bone.name, this.lensColors[this.lens.name].bones[BONE_TO_INDEX[bone.name]]);
            });
        }
    }

    /**
     * Sets joint color using pose confidence
     * @param {string} jointName - name of joint to set color of
     * @param {number} confidence - confidence value to set color to
     */
    setJointConfidenceColor(jointName, confidence) {
        if (typeof JOINT_TO_INDEX[jointName] === 'undefined') {
            return;
        }
        let baseColorHSL = AnalyticsColors.base.getHSL({});
        baseColorHSL.l = baseColorHSL.l * confidence;
        let color = new THREE.Color().setHSL(baseColorHSL.h, baseColorHSL.s, baseColorHSL.l);
        this.setJointColor(jointName, color);
    }

    setVisible(visible) {
        if (this.visible === visible) {
            return;
        }

        if (visible) {
            this.updateJointPositions();
            this.updateBonePositions();
        } else {
            this.renderer.hideSlot(this.slot);
        }
        this.visible = visible;
    }

    /**
     * Clones itself into a new HumanPoseRenderer
     * @param newRenderer {HumanPoseRenderer} - the renderer to clone into
     * @return {HumanPoseRenderInstance} The new instance
     */
    cloneToRenderer(newRenderer) {
        let clone = new HumanPoseRenderInstance(newRenderer, this.id, this.lens);
        clone.copy(this);
        return clone;
    }

    /**
     * Copy all elements of the other pose render instance
     * @param other {HumanPoseRenderInstance} - the instance to copy from
     */
    copy(other) {
        this.lens = other.lens;
        this.lensColors = {};
        Object.keys(other.lensColors).forEach(lensName => {
            this.lensColors[lensName] = {
                joints: other.lensColors[lensName].joints.slice(),
                bones: other.lensColors[lensName].bones.slice(),
            };
        });
        this.setPose(other.pose);
        return this;
    }

    /**
     * Removes from container and disposes resources
     */
    remove() {
        this.renderer.leaveSlot(this.slot);
    }
}

