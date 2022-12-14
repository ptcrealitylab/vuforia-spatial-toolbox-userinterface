createNameSpace("realityEditor.humanPose.draw");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {
    let poseRenderers = {};

    let historyLineContainer;
    let historyCloneContainer;

    let recordingClones = false;
    let cloneMaterialIndex = 0;
    let cloneMaterials = [
        '_materialOverallReba',
        '_materialRainbow',
        '_materialOld',
    ];

    const {utils, rebaScore} = realityEditor.humanPose;

    const SCALE = 1000; // we want to scale up the size of individual joints, but not apply the scale to their positions

    /**
     * Renders COCO-pose keypoints
     */
    class HumanPoseRenderer {
        /**
         * @param {string} id - Unique identifier of human pose being rendered
         * @param {THREE.Object3D} historyLineContainer - THREE container for
         *                         history line meshes
         * @param {THREE.Object3D} historyCloneContainer - THREE container for
         *                         history clone meshes
         */
        constructor(id, historyLineContainer, historyCloneContainer) {
            this.id = id;
            this.spheres = {};
            this.container = new THREE.Group();
            this.bones = {};
            this.ghost = false;
            this.overallRebaScore = 1;
            this.createSpheres();
            this.historyLineContainer = historyLineContainer;
            this.createHistoryLine();

            this.historyCloneContainer = historyCloneContainer;
        }

        /**
         * Creates all THREE.Meshes representing the spheres/joint balls of the
         * pose
         */
        createSpheres() {
            const geo = new THREE.SphereGeometry(0.03 * SCALE, 12, 12);
            const mat = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0x0077ff});
            this.baseMaterial = mat;

            for (const jointId of Object.values(utils.JOINTS)) {
                // TODO use instanced mesh for better performance
                let sphere = new THREE.Mesh(geo, mat);
                // this.spheres.push(sphere);
                this.spheres[jointId] = sphere;
                this.container.add(sphere);
            }
            const geoCyl = new THREE.CylinderGeometry(0.01 * SCALE, 0.01 * SCALE, SCALE, 3);
            for (const boneName of Object.keys(utils.JOINT_CONNECTIONS)) {
                let bone = new THREE.Mesh(geoCyl, mat);
                this.bones[boneName] = bone;
                this.container.add(bone);
            }

            this.redMaterial = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0xFF0000});
            this.yellowMaterial = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0xFFFF00});
            this.greenMaterial = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0x00ff00});
        }

        /**
         * Creates a history line (spaghetti line) placing it within
         * `container`
         * @param {THREE.Object3D} container
         */
        createHistoryLine() {
            this.historyLine = new realityEditor.gui.ar.meshLine.MeshLine();
            const lineMat = new realityEditor.gui.ar.meshLine.MeshLineMaterial({
                color: this.ghost ? 0x777777 : 0xffff00,
                opacity: 0.6,
                lineWidth: 14,
                // depthWrite: false,
                transparent: true,
                side: THREE.DoubleSide,
            });
            this.historyMesh = new THREE.Mesh(this.historyLine, lineMat);
            this.historyPoints = [];
            this.historyLine.setPoints(this.historyPoints);
            this.historyLineContainer.add(this.historyMesh);
        }

        /**
         * @param {string} jointId - from utils.JOINTS
         * @param {THREE.Vector3} position
         */
        setJointPosition(jointId, position) {
            let sphere = this.spheres[jointId];
            sphere.position.x = position.x;
            sphere.position.y = position.y;
            sphere.position.z = position.z;
        }

        /**
         * @return {THREE.Vector3}
         */
        getJointPosition(jointId) {
            return this.spheres[jointId].position;
        }

        /**
         * @param {Array<String>} jointIds
         * @return {{x: number, y: number, z: number}} Average position of all
         *         joints listed in jointIds
         */
        averageJointPositions(jointIds) {
            let avg = {x: 0, y: 0, z: 0};
            for (let jointId of jointIds) {
                let joint = this.spheres[jointId]
                avg.x += joint.position.x;
                avg.y += joint.position.y;
                avg.z += joint.position.z;
            }
            avg.x /= jointIds.length;
            avg.y /= jointIds.length;
            avg.z /= jointIds.length;
            return avg;
        }

        /**
         * Updates bone (stick between joints) positions based on this.spheres'
         * positions. Notably synthesizes a straight spine based on existing
         * COCO keypoints
         */
        updateBonePositions() {
            const {JOINTS} = utils;
            // Add synthetic joint positions expected by REBA
            this.setJointPosition(JOINTS.HEAD, this.averageJointPositions([
                JOINTS.LEFT_EAR,
                JOINTS.RIGHT_EAR
            ]));
            this.setJointPosition(JOINTS.NECK, this.averageJointPositions([
                JOINTS.LEFT_SHOULDER,
                JOINTS.RIGHT_SHOULDER,
            ]));
            this.setJointPosition(JOINTS.CHEST, this.averageJointPositions([
                JOINTS.LEFT_SHOULDER,
                JOINTS.RIGHT_SHOULDER,
                JOINTS.LEFT_SHOULDER,
                JOINTS.RIGHT_SHOULDER,
                JOINTS.LEFT_HIP,
                JOINTS.RIGHT_HIP,
            ]));
            this.setJointPosition(JOINTS.NAVEL, this.averageJointPositions([
                JOINTS.LEFT_SHOULDER,
                JOINTS.RIGHT_SHOULDER,
                JOINTS.LEFT_HIP,
                JOINTS.RIGHT_HIP,
                JOINTS.LEFT_HIP,
                JOINTS.RIGHT_HIP,
            ]));
            this.setJointPosition(JOINTS.PELVIS, this.averageJointPositions([
                JOINTS.LEFT_HIP,
                JOINTS.RIGHT_HIP,
            ]));

            let newPoint = new THREE.Vector3(
                this.spheres[JOINTS.HEAD].position.x,
                this.spheres[JOINTS.HEAD].position.y + 0.4,
                this.spheres[JOINTS.HEAD].position.z,
            );

            // Split spaghetti line if we jumped by a large amount
            if (this.historyPoints.length > 0 &&
                this.historyPoints[this.historyPoints.length - 1].sub(newPoint).lengthSq() > 1) {
                this.createHistoryLine();
            }

            this.historyPoints.push(newPoint);
            this.historyLine.setPoints(this.historyPoints);

            for (let boneName of Object.keys(utils.JOINT_CONNECTIONS)) {
                let bone = this.bones[boneName];
                let jointA = this.spheres[utils.JOINT_CONNECTIONS[boneName][0]].position;
                let jointB = this.spheres[utils.JOINT_CONNECTIONS[boneName][1]].position;

                bone.position.x = (jointA.x + jointB.x) / 2;
                bone.position.y = (jointA.y + jointB.y) / 2;
                bone.position.z = (jointA.z + jointB.z) / 2;
                bone.rotation.set(0, 0, 0);

                let diff = new THREE.Vector3(jointB.x - jointA.x, jointB.y - jointA.y,
                    jointB.z - jointA.z);

                bone.scale.y = 1;
                let localTarget = new THREE.Vector3(
                    jointB.x, jointB.y, jointB.z);
                bone.lookAt(this.container.localToWorld(localTarget));
                bone.rotateX(Math.PI / 2);

                bone.scale.y = diff.length() / SCALE;
            }

            rebaScore.annotateHumanPoseRenderer(this);

            if (recordingClones) {
                let clone = this.clone();
                this.historyCloneContainer.add(clone);
            }
        }

        clone() {
            let colorRainbow = `hsl(${(Date.now() / 5) % 360}, 100%, 50%)`;
            let hueReba = 180 - (this.overallRebaScore - 1) * 240 / 11;
            if (isNaN(hueReba)) {
                hueReba = 120;
            }
            hueReba = Math.min(Math.max(hueReba, 0), 120);
            let colorReba = `hsl(${hueReba}, 100%, 50%)`;
            let newContainer = this.container.clone();
            let matRainbow = new THREE.MeshBasicMaterial({
                color: colorRainbow,
                transparent: true,
                opacity: 0.5,
            });
            let matReba = new THREE.MeshBasicMaterial({
                color: colorReba,
                transparent: true,
                opacity: 0.5,
            });

            let baseMaterial = new THREE.MeshBasicMaterial({
                color: this.baseMaterial.color,
                transparent: true,
                opacity: 0.5,
            });

            let redMaterial = new THREE.MeshBasicMaterial({
                color: this.redMaterial.color,
                transparent: true,
                opacity: 0.5,
            });

            let yellowMaterial = new THREE.MeshBasicMaterial({
                color: this.yellowMaterial.color,
                transparent: true,
                opacity: 0.5,
            });

            let greenMaterial = new THREE.MeshBasicMaterial({
                color: this.greenMaterial.color,
                transparent: true,
                opacity: 0.5,
            });

            newContainer.traverse((obj) => {
                if (obj.material) {
                    obj._materialOverallReba = matReba;
                    obj._materialRainbow = matRainbow;
                    let materialOld = obj.material;

                    // Switch to transparent version of old material if possible
                    if (materialOld === this.baseMaterial) {
                        materialOld = baseMaterial;
                    } else if (materialOld === this.redMaterial) {
                        materialOld = redMaterial;
                    } else if (materialOld === this.yellowMaterial) {
                        materialOld = yellowMaterial;
                    } else if (materialOld === this.greenMaterial) {
                        materialOld = greenMaterial;
                    }

                    obj._materialOld = materialOld;
                    obj.material = obj[cloneMaterials[cloneMaterialIndex]];
                }
            });
            return newContainer;
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
            if (typeof this.bones[boneName] === 'undefined') return;

            if (boneColor === 0) {
                this.bones[boneName].material = this.greenMaterial;
            }
            if (boneColor === 1) {
                this.bones[boneName].material = this.yellowMaterial;
            } else if (boneColor === 2) {
                this.bones[boneName].material = this.redMaterial;
            }
        }

        addToScene() {
            realityEditor.gui.threejsScene.addToScene(this.container);
        }

        /**
         * Removes from container and disposes resources
         */
        removeFromScene() {
            realityEditor.gui.threejsScene.removeFromScene(this.container);
            this.bones.headNeck.geometry.dispose();
            this.spheres[utils.JOINTS.HEAD].geometry.dispose();
            this.spheres[utils.JOINTS.HEAD].material.dispose();
        }
    }


    function renderHumanPoseObjects(poseObjects) {

        if (realityEditor.gui.poses.isPose2DSkeletonRendered()) return;

        if (!historyLineContainer) {
            historyLineContainer = new THREE.Group();
            historyLineContainer.visible = false;
            realityEditor.gui.threejsScene.addToScene(historyLineContainer);
        }

        if (!historyCloneContainer) {
            historyCloneContainer = new THREE.Group();
            historyCloneContainer.visible = true;
            realityEditor.gui.threejsScene.addToScene(historyCloneContainer);
        }

        for (let id in poseRenderers) {
            poseRenderers[id].updated = false;
        }
 
        for (let poseObject of poseObjects) {
            renderPose(poseObject);
        }
    
        for (let id of Object.keys(poseRenderers)) {
            if (!poseRenderers[id].updated) {
                poseRenderers[id].removeFromScene();
                delete poseRenderers[id];
            }
        }
    }

    function renderPose(poseObject) {
        // assume that all sub-objects are of the form poseObject.id + joint name

        if (!poseRenderers[poseObject.uuid]) {
            poseRenderers[poseObject.uuid] = new HumanPoseRenderer(poseObject.uuid, historyLineContainer, historyCloneContainer);
            poseRenderers[poseObject.uuid].addToScene();
        }
        let poseRenderer = poseRenderers[poseObject.uuid];
        poseRenderer.updated = true;

        // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        let groundPlaneRelativeMatrix = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneRelativeMatrix, worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode));

        for (let jointId of Object.values(utils.JOINTS)) {
            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(`${poseObject.uuid}${jointId}`);

            let jointMatrixThree = new THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(jointMatrixThree, sceneNode.worldMatrix);
            jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

            let jointPosition = new THREE.Vector3();
            jointPosition.setFromMatrixPosition(jointMatrixThree);

            poseRenderer.setJointPosition(jointId, jointPosition);
        }
        poseRenderer.updateBonePositions();
    }

    function resetHistoryLines() {
        // Loop over copy of children to remove all
        for (let child of historyLineContainer.children.concat()) {
            historyLineContainer.remove(child);
        }
    }

    function resetHistoryClones() {
        for (let child of historyCloneContainer.children.concat()) {
            historyCloneContainer.remove(child);
        }
    }

    /**
     * @param {boolean} visible
     */
    function setHistoryLinesVisible(visible) {
        historyLineContainer.visible = visible;
    }

    /**
     * @param {boolean} enabled
     */
    function setRecordingClonesEnabled(enabled) {
        recordingClones = enabled;
    }

    function advanceCloneMaterial() {
        cloneMaterialIndex += 1;
        if (cloneMaterialIndex >= cloneMaterials.length) {
            cloneMaterialIndex = 0;
        }

        let newMaterialKey = cloneMaterials[cloneMaterialIndex];
        historyCloneContainer.traverse((obj) => {
            if (obj.material) {
                obj.material = obj[newMaterialKey];
            }
        });
    }


    exports.renderHumanPoseObjects = renderHumanPoseObjects;
    exports.resetHistoryLines = resetHistoryLines;
    exports.resetHistoryClones = resetHistoryClones;
    exports.setHistoryLinesVisible = setHistoryLinesVisible;
    exports.setRecordingClonesEnabled = setRecordingClonesEnabled;
    exports.advanceCloneMaterial = advanceCloneMaterial;

}(realityEditor.humanPose.draw));
