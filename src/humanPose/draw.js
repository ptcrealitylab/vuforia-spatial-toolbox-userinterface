import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINTS, JOINT_CONNECTIONS} from './utils.js';
import {annotateHumanPoseRenderer} from './rebaScore.js';
import {SpaghettiMeshPath} from './spaghetti.js';

let poseRenderers = {};
let humanPoseAnalyzer;

const SCALE = 1000; // we want to scale up the size of individual joints, but not apply the scale to their positions

// author: https://www.30secondsofcode.org/js/s/hsl-to-rgb
// input ranges: H: [0, 360], S: [0, 100], L: [0, 100]
// output ranges: [0, 255]
function HSLToRGB(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n =>
        l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [255 * f(0), 255 * f(8), 255 * f(4)];
}

/**
 * Renders COCO-pose keypoints
 */
export class HumanPoseRenderer {
    /**
     * @param {string} id - Unique identifier of human pose being rendered
     */
    constructor(id) {
        this.id = id;
        this.spheres = {};
        this.container = new THREE.Group();
        this.bones = {};
        this.overallRebaScore = 1;
        this.createSpheres();
    }

    /**
     * Creates all THREE.Meshes representing the spheres/joint balls of the
     * pose
     */
    createSpheres() {
        const geo = new THREE.SphereGeometry(0.03 * SCALE, 12, 12);
        const mat = new THREE.MeshBasicMaterial({color: 0x0077ff});
        this.baseMaterial = mat;

        for (const jointId of Object.values(JOINTS)) {
            // TODO use instanced mesh for better performance
            let sphere = new THREE.Mesh(geo, mat);
            // this.spheres.push(sphere);
            this.spheres[jointId] = sphere;
            this.container.add(sphere);
        }
        const geoCyl = new THREE.CylinderGeometry(0.01 * SCALE, 0.01 * SCALE, SCALE, 3);
        for (const boneName of Object.keys(JOINT_CONNECTIONS)) {
            let bone = new THREE.Mesh(geoCyl, mat);
            this.bones[boneName] = bone;
            this.container.add(bone);
        }

        this.redMaterial = new THREE.MeshBasicMaterial({color: 0xFF0000});
        this.yellowMaterial = new THREE.MeshBasicMaterial({color: 0xFFFF00});
        this.greenMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
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

        for (let boneName of Object.keys(JOINT_CONNECTIONS)) {
            let bone = this.bones[boneName];
            let jointA = this.spheres[JOINT_CONNECTIONS[boneName][0]].position;
            let jointB = this.spheres[JOINT_CONNECTIONS[boneName][1]].position;

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

        annotateHumanPoseRenderer(this);
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
        this.bones.headNeck.geometry.dispose();
        this.spheres[JOINTS.HEAD].geometry.dispose();
        this.spheres[JOINTS.HEAD].material.dispose();
    }
}

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
        this.recordingClones = false;
        this.cloneMaterialIndex = 0;
        this.historyMeshesAll = {};
        this.historyPointsAll = {};

        this.baseMaterial = new THREE.MeshBasicMaterial({
            color: 0x0077ff,
            transparent: true,
            opacity: 0.5,
        });
        this.redMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.5,
        });
        this.yellowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00,
            transparent: true,
            opacity: 0.5,
        });
        this.greenMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
        });
    }

    poseRendererUpdated(poseRenderer, timestamp) {
        if (this.recordingClones) {
            const obj = this.clone(poseRenderer);
            this.historyCloneContainer.add(obj);
        }

        let newPoint = poseRenderer.getJointPosition(JOINTS.HEAD).clone();
        newPoint.y += 400;

        if (!this.historyPointsAll.hasOwnProperty(poseRenderer.id)) {
            this.createHistoryLine(poseRenderer);
        }

        let historyPoints = this.historyPointsAll[poseRenderer.id];

        // Split spaghetti line if we jumped by a large amount
        if (historyPoints.length > 0) {
            let lastPoint = historyPoints[historyPoints.length - 1];
            let lastVec = new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z);
            if (lastVec.distanceToSquared(newPoint) > 800 * 800) {
                this.createHistoryLine(poseRenderer);
            }
        }

        let hueReba = this.getOverallRebaScoreHue(poseRenderer);
        let colorRGB = HSLToRGB(hueReba, 80, 50);

        let nextHistoryPoint = {
            x: newPoint.x,
            y: newPoint.y,
            z: newPoint.z,
            color: colorRGB,
            timestamp,
        };

        historyPoints.push(nextHistoryPoint);
        this.historyMeshesAll[poseRenderer.id].setPoints(historyPoints);
    }

    getOverallRebaScoreHue(overallRebaScore) {
        let hueReba = 140 - (overallRebaScore - 1) * 240 / 11;
        if (isNaN(hueReba)) {
            hueReba = 120;
        }
        hueReba = (Math.min(Math.max(hueReba, -30), 120) + 360) % 360;
        return hueReba;
    }

    clone(poseRenderer) {
        let colorRainbow = `hsl(${(Date.now() / 5) % 360}, 100%, 50%)`;
        let hueReba = this.getOverallRebaScoreHue(poseRenderer.overallRebaScore);
        let alphaReba = 0.3 + 0.3 * (poseRenderer.overallRebaScore - 1) / 11;
        let colorReba = `hsl(${hueReba}, 100%, 50%)`;
        let newContainer = poseRenderer.container.clone();
        let matRainbow = new THREE.MeshBasicMaterial({
            color: colorRainbow,
            transparent: true,
            opacity: 0.5,
        });
        let matReba = new THREE.MeshBasicMaterial({
            color: colorReba,
            transparent: true,
            opacity: alphaReba,
        });

        newContainer.children.forEach((obj) => {
            if (obj.material) {
                let materialOld = obj.material;
                // Switch to transparent version of old material if possible
                if (materialOld === poseRenderer.baseMaterial) {
                    materialOld = this.baseMaterial;
                } else if (materialOld === poseRenderer.redMaterial) {
                    materialOld = this.redMaterial;
                } else if (materialOld === poseRenderer.yellowMaterial) {
                    materialOld = this.yellowMaterial;
                } else if (materialOld === poseRenderer.greenMaterial) {
                    materialOld = this.greenMaterial;
                }

                obj.__cloneMaterials = [
                    matReba,
                    materialOld,
                    matRainbow,
                ];
                obj.material = obj.__cloneMaterials[this.cloneMaterialIndex % obj.__cloneMaterials.length];
            }
        });
        return newContainer;
    }

    /**
     * Creates a history line (spaghetti line) placing it within
     * the historyMeshContainer
     * @param {HumanPoseRenderer} poseRenderer
     */
    createHistoryLine(poseRenderer) {
        const historyPoints = [];
        const historyMesh = new SpaghettiMeshPath(historyPoints, {
            widthMm: 30,
            heightMm: 30,
            usePerVertexColors: true,
            wallBrightness: 0.6,
        });
        this.historyMeshContainer.add(historyMesh);

        this.historyPointsAll[poseRenderer.id] = historyPoints;
        this.historyMeshesAll[poseRenderer.id] = historyMesh;
    }


    resetHistoryLines() {
        // Loop over copy of children to remove all
        for (let child of this.historyMeshContainer.children.concat()) {
            this.historyMeshContainer.remove(child);
        }
    }

    resetHistoryClones() {
        for (let child of this.historyCloneContainer.children.concat()) {
            this.historyCloneContainer.remove(child);
        }
    }

    /**
     * @param {boolean} visible
     */
    setHistoryLinesVisible(visible) {
        this.historyMeshContainer.visible = visible;
    }

    /**
     * @param {boolean} enabled
     */
    setRecordingClonesEnabled(enabled) {
        this.recordingClones = enabled;
    }

    advanceCloneMaterial() {
        this.cloneMaterialIndex += 1;

        this.historyCloneContainer.traverse((obj) => {
            if (obj.material && obj.__cloneMaterials) {
                let index = this.cloneMaterialIndex % obj.__cloneMaterials.length;
                obj.material = obj.__cloneMaterials[index];
            }
        });
    }
}

function renderHumanPoseObjects(poseObjects, timestamp, historical, container) {
    if (!humanPoseAnalyzer) {
        const historyMeshContainer = new THREE.Group();
        historyMeshContainer.visible = true;
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
            poseRenderers[id].removeFromScene(container);
            delete poseRenderers[id];
        }
    }
}

function setMatrixFromArray(matrix, array) {
    matrix.set( array[0], array[4], array[8], array[12],
        array[1], array[5], array[9], array[13],
        array[2], array[6], array[10], array[14],
        array[3], array[7], array[11], array[15]
    );
}

function renderHistoricalPose(poseObject, timestamp, container) {
    // assume that all sub-objects are of the form poseObject.id + joint name
    if (!poseObject.uuid) {
        poseObject.uuid = poseObject.objectId;
        poseObject.id = poseObject.objectId;
    }

    if (!poseRenderers[poseObject.uuid]) {
        poseRenderers[poseObject.uuid] = new HumanPoseRenderer(poseObject.uuid);
        poseRenderers[poseObject.uuid].addToScene(container);
    }
    let poseRenderer = poseRenderers[poseObject.uuid];
    poseRenderer.updated = true;

    // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
    let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
    let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
    let groundPlaneRelativeMatrix = new THREE.Matrix4();
    setMatrixFromArray(groundPlaneRelativeMatrix, worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode));

    for (let jointId of Object.values(JOINTS)) {
        let frame = poseObject.frames[poseObject.uuid + jointId];

        let jointMatrixThree = new THREE.Matrix4();
        setMatrixFromArray(jointMatrixThree, frame.ar.matrix);
        jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

        let jointPosition = new THREE.Vector3();
        jointPosition.setFromMatrixPosition(jointMatrixThree);

        poseRenderer.setJointPosition(jointId, jointPosition);
    }
    poseRenderer.updateBonePositions();

    humanPoseAnalyzer.poseRendererUpdated(poseRenderer, timestamp);
}

function renderPose(poseObject, timestamp, container) {
    // assume that all sub-objects are of the form poseObject.id + joint name

    if (!poseRenderers[poseObject.uuid]) {
        poseRenderers[poseObject.uuid] = new HumanPoseRenderer(poseObject.uuid);
        poseRenderers[poseObject.uuid].addToScene(container);
    }
    let poseRenderer = poseRenderers[poseObject.uuid];
    poseRenderer.updated = true;

    // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
    let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
    let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
    let groundPlaneRelativeMatrix = new THREE.Matrix4();
    setMatrixFromArray(groundPlaneRelativeMatrix, worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode));
    let objectRootMatrix = new THREE.Matrix4();
    setMatrixFromArray(objectRootMatrix, poseObject.matrix);
    groundPlaneRelativeMatrix.multiply(objectRootMatrix);

    for (let jointId of Object.values(JOINTS)) {
        let sceneNode = realityEditor.sceneGraph.getSceneNodeById(`${poseObject.uuid}${jointId}`);

        let jointMatrixThree = new THREE.Matrix4();
        setMatrixFromArray(jointMatrixThree, sceneNode.worldMatrix);
        jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

        let jointPosition = new THREE.Vector3();
        jointPosition.setFromMatrixPosition(jointMatrixThree);

        poseRenderer.setJointPosition(jointId, jointPosition);
    }
    poseRenderer.updateBonePositions();

    humanPoseAnalyzer.poseRendererUpdated(poseRenderer, timestamp);
}

function resetHistoryLines() {
    humanPoseAnalyzer.resetHistoryLines();
}

function resetHistoryClones() {
    humanPoseAnalyzer.resetHistoryClones();
}

/**
 * @param {boolean} visible
 */
function setHistoryLinesVisible(visible) {
    humanPoseAnalyzer.setHistoryLinesVisible(visible);
}

/**
 * @param {boolean} enabled
 */
function setRecordingClonesEnabled(enabled) {
    humanPoseAnalyzer.setRecordingClonesEnabled(enabled);
}

function advanceCloneMaterial() {
    humanPoseAnalyzer.advanceCloneMaterial();
}

export {
    renderHumanPoseObjects,
    resetHistoryLines,
    resetHistoryClones,
    setHistoryLinesVisible,
    setRecordingClonesEnabled,
    advanceCloneMaterial,
};
