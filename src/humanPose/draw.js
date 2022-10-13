createNameSpace("realityEditor.humanPose.draw");

(function(exports) {
    let poseRenderers = {};

    const {utils, rebaScore} = realityEditor.humanPose;
    let THREE = null;

    const SCALE = 1000;

    class HumanPoseRenderer {
        constructor(id) {
            this.id = id;
            this.spheres = {};
            this.container = new THREE.Group();
            // this.container.position.y = -floorOffset;
            // this.container.scale.set(1000, 1000, 1000);
            this.bones = {};
            this.ghost = false;
            this.createSpheres();
            this.historyLineContainer = new THREE.Group();
            // this.historyLineContainer.scale.set(1000, 1000, 1000);
            this.createHistoryLine(this.historyLineContainer);
        }

        createSpheres() {
            // const SCALE = 1000;
            const geo = new THREE.SphereGeometry(0.03 * SCALE, 12, 12);
            const mat = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0x0077ff});
            for (const jointId of Object.values(utils.JOINTS)) {
                // TODO use instanced mesh for better performance
                let sphere = new THREE.Mesh(geo, mat);
                // this.spheres.push(sphere);
                this.spheres[jointId] = sphere;
                this.container.add(sphere);
            }
            const geoCyl = new THREE.CylinderGeometry(0.01 * SCALE, 0.01 * SCALE, 1 * SCALE, 3);
            for (const boneName of Object.keys(utils.JOINT_CONNECTIONS)) {
                let bone = new THREE.Mesh(geoCyl, mat);
                this.bones[boneName] = bone;
                this.container.add(bone);
            }

            this.redMaterial = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0xFF0000});
            this.yellowMaterial = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0xFFFF00});
            this.greenMaterial = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0x00ff00});
        }

        createHistoryLine(container) {
            this.historyLine = new realityEditor.gui.ar.meshLine.MeshLine();
            const lineMat = new realityEditor.gui.ar.meshLine.MeshLineMaterial({
                color: this.ghost ? 0x777777 : 0xffff00,
                // opacity: 0.6,
                lineWidth: 14,
                // depthWrite: false,
                transparent: false,
                side: THREE.DoubleSide,
            });
            this.historyMesh = new THREE.Mesh(this.historyLine, lineMat);
            this.historyPoints = [];
            this.historyLine.setPoints(this.historyPoints);
            container.add(this.historyMesh);
        }


        setJointPosition(jointId, position) {
            let sphere = this.spheres[jointId];
            sphere.position.x = position.x;
            sphere.position.y = position.y;
            sphere.position.z = position.z;
        }

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

            this.historyPoints.push(new THREE.Vector3(
                this.spheres[JOINTS.HEAD].position.x,
                this.spheres[JOINTS.HEAD].position.y + 0.4,
                this.spheres[JOINTS.HEAD].position.z,
            ));
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
        }

        setOverallRebaScore(_score) {
            // we don't currently care about visualizing this
        }

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

        removeFromScene() {
            realityEditor.gui.threejsScene.removeFromScene(this.container);
            this.bones.headNeck.geometry.dispose();
            this.spheres[utils.JOINTS.HEAD].geometry.dispose();
            this.spheres[utils.JOINTS].material.dispose();
        }
    }


    function renderHumanPoseObjects(poseObjects) {
        if (!THREE) { THREE = realityEditor.gui.threejsScene.THREE; }

        for (let id in poseRenderers) {
            poseRenderers[id].updated = false;
        }
        for (let poseObject of poseObjects) {
            renderPose(poseObject);
        }
        for (let id of Object.keys(poseRenderers)) {
            if (!poseRenderers[id].updated) {
                delete poseRenderers[id];
            }
        }
    }

    function renderPose(poseObject) {
        // assume that all sub-objects are of the form poseObject.id + joint name

        if (!poseRenderers[poseObject.uuid]) {
            poseRenderers[poseObject.uuid] = new HumanPoseRenderer(poseObject.uuid);
            poseRenderers[poseObject.uuid].addToScene();
        }
        let poseRenderer = poseRenderers[poseObject.uuid];
        poseRenderer.updated = true;

        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        let worldMatrixThree = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(worldMatrixThree, worldSceneNode.worldMatrix);

        let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        let groundPlaneMatrix = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneMatrix, groundPlaneSceneNode.worldMatrix);

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

    exports.renderHumanPoseObjects = renderHumanPoseObjects;

}(realityEditor.humanPose.draw));
