import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {
    JOINT_TO_INDEX,
    BONE_TO_INDEX,
    SCALE,
    RENDER_CONFIDENCE_COLOR,
    HIDDEN_JOINTS,
    HIDDEN_BONES,
    DISPLAY_HIDDEN_ELEMENTS,
    DISPLAY_INVALID_ELEMENTS
} from './constants.js';
import {MotionStudyColors} from "./MotionStudyColors.js";

/**
 * A single 3d skeleton rendered in a HumanPoseRenderer's slot
 */
export class HumanPoseRenderInstance {
    /**
     * @param {HumanPoseRenderer} renderer
     * @param {string} id - Unique identifier of human pose being rendered
     * @param {MotionStudyLens} lens - The initial lens to use for this instance
     */
    constructor(renderer, id, lens) {
        this.renderer = renderer;
        this.id = id;
        this.updated = true;
        this.lens = lens;
        this.lensColors = {};
        this.pose = null;
        this.slot = -1;
        this.visible = this.add();
    }

    /**
     * Occupies a slot on the renderer, uploading initial values
     * @param {number?} slot - manually assigned slot, taken from renderer otherwise
     * @param {boolean} Success
     */
    add(slot) {
        if (typeof slot === 'number') {
            this.slot = slot;
        } else {
            this.slot = this.renderer.takeSlot();
        }
        if (this.slot < 0) {
            return false;
        }

        Object.values(JOINT_TO_INDEX).forEach(index => {
            this.renderer.setJointColorAt(this.slot, index, MotionStudyColors.base);
        });

        Object.values(BONE_TO_INDEX).forEach(index => {
            this.renderer.setBoneColorAt(this.slot, index, MotionStudyColors.base);
        });

        return true;
    }

    /**
     * Sets the position of a joint
     * @param {string} jointId - ID of joint to set position of
     * @param {Vector3} position - Position to set joint to
     * @param {boolean} visible - whether the joint is displayed
     */
    setJointPosition(jointId, position, visible = true) {
        const index = JOINT_TO_INDEX[jointId];
        let matrix = new THREE.Matrix4().set(
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 1,
        );
        if (visible) {
            matrix.makeTranslation(
                position.x,
                position.y,
                position.z,
            );
        }

        this.renderer.setJointMatrixAt(
            this.slot,
            index,
            matrix
        );
    }

    /**
     * Updates joint positions based on this.pose
     */
    updateJointPositions() {
        if (this.slot < 0) {
            return;
        }
        this.pose.forEachJoint(joint => {
            let visible = (DISPLAY_HIDDEN_ELEMENTS || !HIDDEN_JOINTS.includes(joint.name)) && 
                          (DISPLAY_INVALID_ELEMENTS || joint.valid);
            this.setJointPosition(joint.name, joint.position, visible);
        });
    }

    /**
     * Updates bone (stick between joints) position based on this.joints' positions.
     * @param {Object} bone - bone from this.pose
     * @param {boolean} visible - whether the bone is displayed
     */
    updateBonePosition(bone, visible = true) {
        const boneIndex = BONE_TO_INDEX[bone.name];
        let matrix = new THREE.Matrix4().set(
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 1,
        );

        if (visible) {
            const jointAPos = bone.joint0.position;
            const jointBPos = bone.joint1.position;

            const pos = jointAPos.clone().add(jointBPos).divideScalar(2);

            const scale = jointBPos.clone().sub(jointAPos).length();
            const scaleVector = new THREE.Vector3(1, scale / SCALE, 1);

            const direction = jointBPos.clone().sub(jointAPos).normalize();
            const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

            matrix.compose(pos, rot, scaleVector);
        }
        this.renderer.setBoneMatrixAt(this.slot, boneIndex, matrix);
    }

    /**
     * Updates bone (stick between joints) positions based on this.joints' positions.
     */
    updateBonePositions() {
        if (this.slot < 0) {
            return;
        }

        this.pose.forEachBone(bone => {
            // hides hands in general at the moment. But one could use this also for hiding joints based on their low confidence.
            let visible = DISPLAY_HIDDEN_ELEMENTS || !HIDDEN_BONES.includes(bone.name);
            this.updateBonePosition(bone, visible);
        });
    }

    updateBodyPartValidity(jointConfidenceThreshold) {
        // TODO: limit to limbs
        // TODO: add adjacent bones
        this.pose.forEachJoint(joint => {
            joint.valid = (joint.confidence >= jointConfidenceThreshold);
        });
    }

    /**
     * Updates the pose displayed by the pose renderer
     * @param {Pose} pose The pose to display
     */
    setPose(pose, jointConfidenceThreshold = 0.0) {
        this.pose = pose;

        // needs to be called before other updates becasue it generates data they use
        this.updateBodyPartValidity(jointConfidenceThreshold); 

        this.updateJointPositions();
        this.updateBonePositions();
        this.updateColorBuffers(this.lens);
    }

    /**
     * Sets the active lens for pose coloring
     * @param {MotionStudyLens} lens - lens to set
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
     * @param {MotionStudyLens} lens - lens to use for updating colors
     */
    updateColorBuffers(lens) {
        if (this.slot < 0) {
            return;
        }

        if (!this.lensColors[lens.name]) {
            this.lensColors[lens.name] = {
                joints: Object.values(JOINT_TO_INDEX).map(() => MotionStudyColors.undefined),
                bones: Object.values(BONE_TO_INDEX).map(() => MotionStudyColors.undefined),
            };
        }
        this.pose.forEachJoint(joint => {
            this.lensColors[lens.name].joints[JOINT_TO_INDEX[joint.name]] = lens.getColorForJoint(joint);
            if (!joint.valid) {
                this.lensColors[lens.name].joints[JOINT_TO_INDEX[joint.name]] = MotionStudyColors.undefined;
            }
        });
        this.pose.forEachBone(bone => {
            this.lensColors[lens.name].bones[BONE_TO_INDEX[bone.name]] = lens.getColorForBone(bone);
        });
        // MK - why this condition (lens === this.lens)? When switching lens this is not true and this is not applied. 
        // Extra code needs to call this again after this.lens is updated to new lens.  
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
        let baseColorHSL = MotionStudyColors.base.getHSL({});
        baseColorHSL.l = baseColorHSL.l * confidence;
        let color = new THREE.Color().setHSL(baseColorHSL.h, baseColorHSL.s, baseColorHSL.l);
        this.setJointColor(jointName, color);
    }

    setVisible(visible) {
        // MK HACK: too strict to do nothing if the visibility did not change. Other code can 'unhide' the slot
        /*
        if (this.visible === visible) {
            return;
        }
        */

        if (this.slot < 0) {
            return;
        }

        if (visible) {
            this.renderer.showSlot(this.slot);
            this.updateJointPositions();
            this.updateBonePositions();
        } else {
            this.renderer.hideSlot(this.slot);
        }
        this.visible = visible;
    }

    /**
     * Clones itself into a new HumanPoseRenderer
     * @param {HumanPoseRenderer} newRenderer - the renderer to clone into
     * @return {HumanPoseRenderInstance} The new instance
     */
    cloneToRenderer(newRenderer) {
        let clone = new HumanPoseRenderInstance(newRenderer, this.id, this.lens);
        clone.copy(this);
        return clone;
    }

    /**
     * Copy all elements of the other pose render instance
     * @param {HumanPoseRenderInstance} other - the instance to copy from
     */
    copy(other, jointConfidenceThreshold = 0) {
        console.info('Copy ts=', other.pose.timestamp);
        this.lens = other.lens;
        this.lensColors = {};
        Object.keys(other.lensColors).forEach(lensName => {
            this.lensColors[lensName] = {
                joints: other.lensColors[lensName].joints.slice(),
                bones: other.lensColors[lensName].bones.slice(),
            };
        });
        this.setPose(other.pose, jointConfidenceThreshold);
        return this;
    }

    /**
     * Removes from container and disposes resources
     */
    remove() {
        this.renderer.leaveSlot(this.slot);
        this.slot = -1;
        this.visible = false;
    }
}

