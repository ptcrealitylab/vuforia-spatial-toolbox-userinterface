createNameSpace("realityEditor.humanPose.draw");

(function(exports) {
    let poseRenderers = {};

    let utils = realityEditor.humanPose.utils;

    class HumanPoseRenderer {
        constructor(id) {
            this.id = id;
            this.spheres = [];
            this.container = new THREE.Group();
            // this.container.position.y = -floorOffset;
            this.container.scale.set(1000, 1000, 1000);
            this.bones = [];
            this.ghost = false;
            this.createSpheres();
            this.historyLineContainer = new THREE.Group();
            this.historyLineContainer.scale.set(1000, 1000, 1000);
            this.createHistoryLine(this.historyLineContainer);
        }

        createSpheres() {
            const geo = new THREE.SphereGeometry(0.03, 12, 12);
            const mat = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0x0077ff});
            for (const jointId of Object.values(utils.JOINTS)) {
                // TODO use instanced mesh for better performance
                let sphere = new THREE.Mesh(geo, mat);
                // this.spheres.push(sphere);
                this.spheres[jointId] = sphere;
                this.container.add(sphere);
            }
            const geoCyl = new THREE.CylinderGeometry(0.01, 0.01, 1, 3);
            for (const _conn of utils.JOINT_CONNECTIONS) {
                let bone = new THREE.Mesh(geoCyl, mat);
                this.bones.push(bone);
                this.container.add(bone);
            }

            this.redMaterial = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0xFF0000});
            this.yellowMaterial = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0xFFFF00});
            this.greenMaterial = new THREE.MeshBasicMaterial({color: this.ghost ? 0x777777 : 0x00ff00});
        }

        createHistoryLine(container) {
            this.historyLine = new realityEditor.device.meshLine.MeshLine();
            const lineMat = new realityEditor.device.meshLine.MeshLineMaterial({
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
                this.spheres[0].position.x,
                this.spheres[0].position.y + 0.4,
                this.spheres[0].position.z,
            ));
            this.historyLine.setPoints(this.historyPoints);

            for (let i = 0; i < this.bones.length; i++) {
                let bone = this.bones[i];
                let jointA = this.spheres[utils.JOINT_CONNECTIONS[i][0]];
                let jointB = this.spheres[utils.JOINT_CONNECTIONS[i][1]];

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
                bone.scale.y = diff.length();
            }

            let grades = this.calculateREBAScore();
            const angles = Object.entries(grades); // oh dear
            for (let item of angles) {
                let boneNum = item[1][3];
                let boneColor = item[1][5];
                if (boneColor == 0) {
                    this.bones[boneNum].material = this.greenMaterial;
                }
                if (boneColor == 1) {
                    this.bones[boneNum].material = this.yellowMaterial;
                } else if (boneColor == 2) {
                    this.bones[boneNum].material = this.redMaterial;
                }
            }

        }

        calculateREBAScore() {
            // TODO
            return {};
        }

        addToScene() {
            realityEditor.gui.threejsScene.addToScene(this.container);
        }

        removeFromScene() {
            realityEditor.gui.threejsScene.removeFromScene(this.container);
            this.bones[0].geometry.dispose();
            this.spheres[0].geometry.dispose();
            this.spheres[0].material.dispose();
        }
    }


    function renderHumanPoseObjects(poseObjects) {
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

        if (!poseRenderers[poseObject.id]) {
            poseRenderers[poseObject.id] = new HumanPoseRenderer(poseObject.id);
            poseRenderers[poseObject.id].addToScene();
        }
        let poseRenderer = poseRenderers[poseObject.id];
        poseRenderer.updated = true;

        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        let worldMatrixThree = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(worldMatrixThree, worldSceneNode.worldMatrix);

        let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        let groundPlaneMatrix = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneMatrix, groundPlaneSceneNode.worldMatrix);

        for (let jointId of Object.values(utils.JOINTS)) {
            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(`${poseObject.id}_${jointId}`);

            let jointMatrixThree = new THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(jointMatrixThree, sceneNode.worldMatrix);
            jointMatrixThree.premultiply(worldMatrixThree);

            // then transform the final avatar position into groundplane coordinates since the threejsScene is relative to groundplane
            jointMatrixThree.premultiply(groundPlaneMatrix.invert());

            poseRenderer.setJointPosition(jointId, jointMatrixThree);
        }
        poseRenderer.updateBonePositions();
    }

    exports.renderHumanPoseObjects = renderHumanPoseObjects;

}(realityEditor.humanPose.draw));
