import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINTS, JOINT_CONNECTIONS, JOINT_PUBLIC_DATA_KEYS, getJointNodeInfo, SCALE, createDummySkeleton} from './utils.js';
import Reba from './rebaScore.js';
import AccelerationAnnotator from "./AccelerationAnnotator.js";
import {SpaghettiMeshPath} from './spaghetti.js';
import {MeshPath} from "../gui/ar/meshPath.js";

let poseRenderers = {};
let humanPoseAnalyzer;

const RENDER_CONFIDENCE_COLOR = false; // If true, the color of the joint will be based on the confidence of the pose estimation, otherwise, use normal analytics coloring methods
const redColor = new THREE.Color(1, 0, 0);
const yellowColor = new THREE.Color(1, 1, 0);
const greenColor = new THREE.Color(0, 1, 0);

/**
 * Renders 3D skeleton
 */
export class HumanPoseRenderer {
    /**
     * @param {string} id - Unique identifier of human pose being rendered
     */
    constructor(id) {
        this.id = id;
        this.joints = {};
        this.container = new THREE.Group();
        this.bones = {};
        this.overallRebaScore = 1;
        this.jointAccelerationData = {}; // Dictionary that maps joint names to the acceleration of that joint
        this.maxAccelerationScore = 0; // The maximum acceleration score of any joint (2=high, 1=medium, 0=low)
        this.createJoints();
        this.currentPoseTimestamp = 0;
        this.accelerationAnnotator = new AccelerationAnnotator(this);
    }

    /**
     * Creates all THREE.Meshes representing the joints/joint balls of the
     * pose
     */
    createJoints() {
        const geo = new THREE.SphereGeometry(0.03 * SCALE, 12, 12);
        const mat = new THREE.MeshLambertMaterial();

        this.baseColor = new THREE.Color(0, 0.5, 1);

        this.jointsMesh = new THREE.InstancedMesh(
            geo,
            mat,
            Object.values(JOINTS).length,
        );
        this.jointsMesh.name = 'joints';
        this.jointsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        for (const [i, jointId] of Object.values(JOINTS).entries()) {
            this.joints[jointId] = i;
            this.jointsMesh.setColorAt(i, this.baseColor);
        }
        this.container.add(this.jointsMesh);

        const geoCyl = new THREE.CylinderGeometry(0.01 * SCALE, 0.01 * SCALE, SCALE, 3);
        this.bonesMesh = new THREE.InstancedMesh(
            geoCyl,
            mat,
            Object.keys(JOINT_CONNECTIONS).length,
        );
        this.bonesMesh.name = 'bones';
        this.container.add(this.bonesMesh);

        for (const [i, boneName] of Object.keys(JOINT_CONNECTIONS).entries()) {
            this.bones[boneName] = i;
            this.bonesMesh.setColorAt(i, this.baseColor);
        }

        this.jointsMesh.material = new THREE.MeshBasicMaterial();
        this.bonesMesh.material = new THREE.MeshBasicMaterial();
    }

    /**
     * @param {string} jointId - from utils.JOINTS
     * @param {THREE.Vector3} position
     */
    setJointPosition(jointId, position) {
        const index = this.joints[jointId];
        this.jointsMesh.setMatrixAt(
            index,
            new THREE.Matrix4().makeTranslation(
                position.x,
                position.y,
                position.z,
            ),
        );
        this.jointPositionData[jointId] = position;
    }

    /**
     * @return {THREE.Vector3}
     */
    getJointPosition(jointId) {
        const index = this.joints[jointId];
        const mat = new THREE.Matrix4();
        this.jointsMesh.getMatrixAt(index, mat);
        return new THREE.Vector3().setFromMatrixPosition(mat);
    }
    
    get jointPositionData() {
        let data = {};
        for (let jointId of Object.values(JOINTS)) {
            data[jointId] = this.getJointPosition(jointId);
        }
        return data;
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
     * Updates bone (stick between joints) positions based on this.joints'
     * positions.
     */
    updateBonePositions() {

        for (let boneName of Object.keys(JOINT_CONNECTIONS)) {
            const boneIndex = this.bones[boneName];
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

            this.bonesMesh.setMatrixAt(boneIndex, mat);
        }

        if (!RENDER_CONFIDENCE_COLOR) {
            Reba.annotateHumanPoseRenderer(this);
            this.accelerationAnnotator.annotate();
        }

        this.jointsMesh.instanceMatrix.needsUpdate = true;
        this.jointsMesh.instanceColor.needsUpdate = true;
        this.bonesMesh.instanceMatrix.needsUpdate = true;
        this.bonesMesh.instanceColor.needsUpdate = true;
    }


    setOverallRebaScore(score) {
        this.overallRebaScore = score;
    }

    setJointAccelerationData(data) {
        this.jointAccelerationData = data;
    }
    
    setMaxAccelerationScore(score) {
        this.maxAccelerationScore = score;
    }
    
    setColorInMesh(dict, meshDict, name, color) {
        if (typeof dict[name] === 'undefined') {
            return;
        }
        
        const index = dict[name];
        if (color === 0) {
            meshDict.setColorAt(index, greenColor);
        } else if (color === 1) {
            meshDict.setColorAt(index, yellowColor);
        } else if (color === 2) {
            meshDict.setColorAt(index, redColor);
        }
    }

    /**
     * Annotates bone using material based on boneColor
     * @param {string} boneName
     * @param {number} boneColor
     */
    setBoneColor(boneName, boneColor) {
        this.setColorInMesh(this.bones, this.bonesMesh, boneName, boneColor);
    }

    /**
     * Annotates joint using material based on jointColor
     * @param {string} jointName
     * @param {number} jointColor
     */
    setJointColor(jointName, jointColor) {
        this.setColorInMesh(this.joints, this.jointsMesh, jointName, jointColor);
    }
    /**
     * @param {number} confidence in range [0,1]
     */
    setJointConfidenceColor(jointId, confidence) {
        if (typeof this.spheres[jointId] === 'undefined') {
            return;
        }
        const jointIndex = this.spheres[jointId];

        let baseColorHSL = {};
        this.baseColor.getHSL(baseColorHSL);

        baseColorHSL.l = baseColorHSL.l * confidence;

        let color = new THREE.Color();
        color.setHSL(baseColorHSL.h, baseColorHSL.s, baseColorHSL.l);

        this.spheresMesh.setColorAt(jointIndex, color);
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
        this.historyMeshContainer = historyMeshContainer; // THREE container for history line meshes (SpaghettiMeshPath)
        this.historyCloneContainer = historyCloneContainer; // THREE container for history clone meshes (clones of HumanPoseRenderer's container)
        this.recordingClones = true;
        this.cloneMaterialIndex = 0; // Index for which analytics mode we are using on the history clones
        this.historyMeshesAll = {}; // Dictionary of {pose renderer IDs: SpaghettiMeshPaths} present in historyMeshContainer
        this.clonesAll = []; // Array of all clones present in historyCloneContainer, entry format: {timestamp (Number), poseObject (Object3D)}
        this.lastDisplayedCloneIndex = 0;
        // TODO: ensure different joint selectors and acceleration mesh paths for different poseRenderer objects
        this.jointSelectorObj = null;
        this.accelerationMeshPath = null;

        this.animationStart = -1;
        this.animationEnd = -1;
        this.animationPosition = -1;
        this.animationMode = AnimationMode.ONE;
        this.lastAnimationUpdate = Date.now();

        this.update = this.update.bind(this);

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

        window.requestAnimationFrame(this.update);


        document.addEventListener('pointerdown', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) return;
            this.onPointerDown(e);
        });
        document.addEventListener('pointermove', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) return;
            this.onPointerMove(e);
        });
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
    
    onPointerDown(e) {
        if (this.jointSelectorObj) {
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [this.jointSelectorObj.jointInstancedMesh]);
            if (intersects.length > 0) {
                const intersect = intersects[0];
                const instanceId = intersect.instanceId;
                this.jointSelectorObj.onSelect(instanceId);
            }
        }
    }
    
    onPointerMove(e) {
        if (this.jointSelectorObj) {
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [this.jointSelectorObj.jointInstancedMesh]);
            if (intersects.length > 0) {
                const intersect = intersects[0];
                const instanceId = intersect.instanceId;
                this.jointSelectorObj.onHover(instanceId);
            } else {
                this.jointSelectorObj.onHover();
            }
        }
    }
    
    createJointSelectorObj() {
        this.jointSelectorObj = createDummySkeleton();
        this.jointSelectorObj.selectedJoint = null;
        this.jointSelectorObj.hoveredJoint = null;
        this.jointSelectorObj.updateColors = () => {
            for (let i = 0; i < this.jointSelectorObj.jointInstancedMesh.count; i++) {
                if (this.jointSelectorObj.hoveredJoint === i && this.jointSelectorObj.selectedJoint === i) {
                    this.jointSelectorObj.jointInstancedMesh.setColorAt(i, new THREE.Color(0xFF8000));
                } else if (this.jointSelectorObj.hoveredJoint === i) {
                    this.jointSelectorObj.jointInstancedMesh.setColorAt(i, new THREE.Color(0xFFFF00));
                } else if (this.jointSelectorObj.selectedJoint === i) {
                    this.jointSelectorObj.jointInstancedMesh.setColorAt(i, new THREE.Color(0x00FF00));
                } else {
                    this.jointSelectorObj.jointInstancedMesh.setColorAt(i, new THREE.Color(0xFFFFFF));
                }
            }
            this.jointSelectorObj.jointInstancedMesh.instanceColor.needsUpdate = true;
        }
        this.jointSelectorObj.onSelect = (instanceId) => {
            if (this.accelerationMeshPath) {
                this.accelerationMeshPath.parent.remove(this);
                this.accelerationMeshPath.resetPoints();
                this.accelerationMeshPath = null;
            }
            if (this.jointSelectorObj.selectedJoint === instanceId) { // Allow for toggle off
                this.jointSelectorObj.selectedJoint = null;
            } else {
                this.jointSelectorObj.selectedJoint = instanceId;
            }
            this.jointSelectorObj.updateColors();
            
            if (this.jointSelectorObj.selectedJoint) {
                const jointName = this.jointSelectorObj.jointNameFromIndex(this.jointSelectorObj.selectedJoint);
                const jointPositionData = this.clonesAll.map(clone => clone.poseObject.userData.jointPositionData[jointName]);
                const jointAccelerationData = this.clonesAll.map(clone => clone.poseObject.userData.jointAccelerationData[jointName]);
                jointPositionData.forEach((position, index) => position.color = AccelerationAnnotator.threeColorFromAcceleration(jointAccelerationData[index]));
                this.accelerationMeshPath = new MeshPath(jointPositionData, {
                    usePerVertexColors: true,
                });
                this.historyMeshContainer.add(this.accelerationMeshPath);
            }
        }
        this.jointSelectorObj.onHover = (instanceId) => {
            if (instanceId) {
                this.jointSelectorObj.hoveredJoint = instanceId;
            } else {
                this.jointSelectorObj.hoveredJoint = null;
            }
            this.jointSelectorObj.updateColors();
        }
        this.historyMeshContainer.add(this.jointSelectorObj);
    }

    poseRendererUpdated(poseRenderer, timestamp) {
        if (this.recordingClones) {
            const obj = this.clone(poseRenderer, timestamp);
            this.clonesAll.push({
                timestamp,
                poseObject: obj,
            })
            obj.visible = this.animationMode === AnimationMode.ALL;
            this.historyCloneContainer.add(obj);
        }
        if (this.clonesAll.length > 0 && !this.jointSelectorObj) {
            this.createJointSelectorObj();
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

        let hueReba = this.getOverallRebaScoreHue(poseRenderer.overallRebaScore);
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

    getOverallRebaScoreHue(overallRebaScore) {
        let hueReba = 140 - (overallRebaScore - 1) * 240 / 11;
        if (isNaN(hueReba)) {
            hueReba = 120;
        }
        hueReba = (Math.min(Math.max(hueReba, -30), 120) + 360) % 360;
        return hueReba;
    }
    
    getMaxAccelerationScoreColor(maxAccelerationScore) {
        if (maxAccelerationScore === 2) {
            return redColor;
        }
        if (maxAccelerationScore === 1) {
            return yellowColor;
        }
        return greenColor;
    }

    clone(poseRenderer, timestamp) {
        let colorRainbow = new THREE.Color();
        colorRainbow.setHSL(((timestamp / 5) % 360) / 360, 1, 0.5);

        let hueReba = this.getOverallRebaScoreHue(poseRenderer.overallRebaScore);
        // let alphaReba = 0.3 + 0.3 * (poseRenderer.overallRebaScore - 1) / 11;
        let colorReba = new THREE.Color(); // overall color based on REBA score
        colorReba.setHSL(hueReba / 360, 1, 0.5);
        
        console.log(`poseRenderer.maxAccelerationScore: ${poseRenderer.maxAccelerationScore}`);
        console.log(`this.getMaxAccelerationScoreColor(poseRenderer.maxAccelerationScore): ${this.getMaxAccelerationScoreColor(poseRenderer.maxAccelerationScore)}`);
        let colorAcceleration = this.getMaxAccelerationScoreColor(poseRenderer.maxAccelerationScore); // overall color based on acceleration
        colorAcceleration.setHSL(colorAcceleration.getHSL({}).h, 1, 0.5);

        let newContainer = poseRenderer.container.clone();
        newContainer.userData.jointPositionData = poseRenderer.jointPositionData;
        newContainer.userData.jointAccelerationData = poseRenderer.jointAccelerationData;
        let matBase = new THREE.MeshBasicMaterial({ // Base material for clone is slightly transparent
            transparent: true,
            opacity: 0.5,
        });

        newContainer.children.forEach((obj) => {
            if (obj.instanceColor) {
                // Make the InstancedMesh materials transparent
                let attrBase = obj.instanceColor;
                let attrReba = obj.instanceColor.clone();
                let attrRainbow = obj.instanceColor.clone();
                let attrAcceleration = obj.instanceColor.clone();
                for (let i = 0; i < attrReba.count; i++) {
                    colorReba.toArray(attrReba.array, i * 3);
                    colorRainbow.toArray(attrRainbow.array, i * 3);
                    if (!obj.name === 'joints') {
                        colorAcceleration.toArray(attrAcceleration.array, i * 3); // Set global acceleration color to bones, but leave joints as-is
                    }
                }
                obj.__cloneColors = [
                    attrReba,
                    attrBase,
                    attrRainbow,
                    attrAcceleration
                ];
                obj.instanceColor = obj.__cloneColors[this.cloneMaterialIndex % obj.__cloneColors.length];
                obj.material = matBase;
                obj.instanceColor.needsUpdate = true;
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
        if (this.accelerationMeshPath) {
            this.accelerationMeshPath.parent.remove(this);
            this.accelerationMeshPath.resetPoints();
            this.accelerationMeshPath = null;
        }
        this.historyMeshesAll = {};
    }

    resetHistoryClones() {
        // Loop over copy of children to remove all
        for (let child of this.historyCloneContainer.children.concat()) {
            if (child.dispose) {
                child.dispose();
            }
            this.historyCloneContainer.remove(child);
        }
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
        if (this.animationMode === AnimationMode.ALL) {
            for (let clone of this.clonesAll) {
                clone.poseObject.visible = true;
            }
        } else {
            for (let clone of this.clonesAll) {
                clone.poseObject.visible = false;
            }
        }
    }

    advanceCloneMaterial() {
        this.cloneMaterialIndex += 1;

        this.historyCloneContainer.traverse((obj) => {
            if (obj.__cloneColors) {
                let index = this.cloneMaterialIndex % obj.__cloneColors.length;
                obj.instanceColor = obj.__cloneColors[index];
                obj.instanceColor.needsUpdate = true;
            }
        });
    }

    setAnimation(start, end) {
        this.animationStart = start;
        this.animationEnd = end;
    }

    updateAnimation() {
        let dt = Date.now() - this.lastAnimationUpdate;
        this.lastAnimationUpdate += dt;
        if (this.animationStart < 0 || this.animationEnd < 0) {
            this.hideLastDisplayedClone(-1);
            return;
        }
        this.animationPosition += dt;
        let offset = this.animationPosition - this.animationStart;
        let duration = this.animationEnd - this.animationStart;
        let offsetClamped = offset % duration;
        this.animationPosition = this.animationStart + offsetClamped;
        this.displayNearestClone(this.animationPosition);
    }

    hideLastDisplayedClone(timestamp) {
        if (this.lastDisplayedCloneIndex >= 0) {
            let lastClone = this.clonesAll[this.lastDisplayedCloneIndex];
            if (lastClone) {
                lastClone.poseObject.visible = false;
            }
            if (timestamp >= 0 && lastClone.timestamp > timestamp) {
                this.lastDisplayedCloneIndex = 0;
            }
        }
    }

    displayNearestClone(timestamp) {
        this.hideLastDisplayedClone(timestamp);

        if (this.clonesAll.length < 2) {
            return;
        }
        let bestClone = null;
        for (let i = this.lastDisplayedCloneIndex; i < this.clonesAll.length; i++) {
            let clone = this.clonesAll[i];
            let cloneNext = this.clonesAll[i + 1];
            if (clone.timestamp > timestamp) {
                break;
            }
            if (!cloneNext || cloneNext.timestamp > timestamp) {
                bestClone = clone;
                this.lastDisplayedCloneIndex = i;
                break;
            }
        }
        if (bestClone) {
            bestClone.poseObject.visible = true;
        }
    }
}

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
    if (!poseRenderers[poseObject.uuid]) {
        poseRenderers[poseObject.uuid] = new HumanPoseRenderer(poseObject.uuid);
        poseRenderers[poseObject.uuid].addToScene(container);
    }
    let poseRenderer = poseRenderers[poseObject.uuid];
    poseRenderer.updated = true;
    poseRenderer.currentPoseTimestamp = timestamp;

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
