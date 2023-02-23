import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {
    JOINTS,
    JOINT_CONNECTIONS,
    JOINT_PUBLIC_DATA_KEYS,
    getJointNodeInfo,
    SCALE,
} from './utils.js';
import {SpaghettiMeshPath} from './spaghetti.js';
import AnalyticsColors from "./AnalyticsColors.js";
import RebaLens from "./RebaLens.js";
import Pose from "./Pose.js";
import OverallRebaLens from "./OverallRebaLens.js";
import AccelerationLens from "./AccelerationLens.js";
import TimeLens from "./TimeLens.js";

let poseRenderers = {};
let humanPoseAnalyzer;

const RENDER_CONFIDENCE_COLOR = false; // If true, the color of the joint will be based on the confidence of the pose estimation, otherwise, use normal analytics coloring methods

/**
 * Renders 3D skeleton
 */
export class HumanPoseRenderer {
    /**
     * @param {string} id - Unique identifier of human pose being rendered
     */
    constructor(id) {
        this.id = id;
        this.container = new THREE.Group();
        this.jointIndices = {};
        this.boneIndices = {};
        this.pose = null;
        this.lens = new RebaLens();
        this.createJoints();
        this.createBones();
    }

    /**
     * Creates the InstancedMesh representing the joints of the pose
     */
    createJoints() {
        const geo = new THREE.SphereGeometry(0.03 * SCALE, 12, 12);
        const mat = new THREE.MeshBasicMaterial();
        
        this.jointMesh = new THREE.InstancedMesh(
            geo,
            mat,
            Object.values(JOINTS).length,
        );
        this.jointMesh.name = 'joints';
        this.jointMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        Object.values(JOINTS).forEach((jointId, i) => {
            this.jointIndices[jointId] = i;
            this.jointMesh.setColorAt(i, AnalyticsColors.base);
        });

        this.container.add(this.jointMesh);
    }
    
    createBones() {
        const geo = new THREE.CylinderGeometry(0.01 * SCALE, 0.01 * SCALE, SCALE, 3);
        const mat = new THREE.MeshBasicMaterial();

        this.boneMesh = new THREE.InstancedMesh(
            geo,
            mat,
            Object.keys(JOINT_CONNECTIONS).length,
        );
        this.boneMesh.name = 'bones';
        this.boneMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        Object.keys(JOINT_CONNECTIONS).forEach((boneName, i) => {
            this.boneIndices[boneName] = i;
            this.boneMesh.setColorAt(i, AnalyticsColors.base);
        });
        
        this.container.add(this.boneMesh);
    }

    /**
     * Sets the position of a joint
     * @param {string} jointId - ID of joint to set position of
     * @param {Vector3} position - Position to set joint to
     */
    setJointPosition(jointId, position) {
        const index = this.jointIndices[jointId];
        this.jointMesh.setMatrixAt(
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
        this.jointMesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Updates bone (stick between joints) position based on this.joints' positions.
     * @param bone {Object} - bone from this.pose
     */
    updateBonePosition(bone) {
        const boneIndex = this.boneIndices[bone.name];
        const jointAPos = bone.joint0.position;
        const jointBPos = bone.joint1.position;

        const pos = jointAPos.clone().add(jointBPos).divideScalar(2);

        const scale = jointBPos.clone().sub(jointAPos).length();
        const scaleVector = new THREE.Vector3(1, scale / SCALE, 1);
        
        const direction = jointBPos.clone().sub(jointAPos).normalize();
        const rot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

        const mat = new THREE.Matrix4().compose(pos, rot, scaleVector);
        this.boneMesh.setMatrixAt(boneIndex, mat);
    }

    /**
     * Updates bone (stick between joints) positions based on this.joints' positions.
     */
    updateBonePositions() {
        this.pose.forEachBone(bone => {
            this.updateBonePosition(bone);
        });
        this.boneMesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * Sets the colors of the pose based on the current lens
     */
    updateColors() {
        if (!RENDER_CONFIDENCE_COLOR) {
            this.lens.applyLensToPose(this.pose);
            this.pose.forEachJoint(joint => {
                this.setJointColor(joint.name, this.lens.getColorForJoint(joint));
            });
            this.pose.forEachBone(bone => {
                this.setBoneColor(bone.name, this.lens.getColorForBone(bone));
            })
            this.jointMesh.instanceColor.needsUpdate = true;
            this.boneMesh.instanceColor.needsUpdate = true;
        }
    }

    /**
     * Updates the pose displayed by the pose renderer
     * @param pose {Pose} The pose to display
     */
    setPose(pose) {
        this.pose = pose;

        this.updateJointPositions();
        this.updateBonePositions();
        this.updateColors();
    }

    /**
     * Annotates bone using material based on boneColor
     * @param {string} boneName
     * @param {Color} boneColor
     */
    setBoneColor(boneName, boneColor) {
        if (typeof this.boneIndices[boneName] === 'undefined') {
            return;
        }
        const index = this.boneIndices[boneName];
        this.boneMesh.setColorAt(index, boneColor);
    }

    /**
     * Annotates joint using material based on jointColor
     * @param {string} jointName
     * @param {Color} jointColor
     */
    setJointColor(jointName, jointColor) {
        if (typeof this.jointIndices[jointName] === 'undefined') {
            return;
        }
        const index = this.jointIndices[jointName];
        this.jointMesh.setColorAt(index, jointColor);
    }
    
    /**
     * Sets joint color using pose confidence
     * @param {string} jointName - name of joint to set color of
     * @param {number} confidence - confidence value to set color to
     */
    setJointConfidenceColor(jointName, confidence) {
        if (typeof this.jointIndices[jointName] === 'undefined') {
            return;
        }
        let baseColorHSL = AnalyticsColors.base.getHSL({});
        baseColorHSL.l = baseColorHSL.l * confidence;
        let color = new THREE.Color().setHSL(baseColorHSL.h, baseColorHSL.s, baseColorHSL.l);
        this.setJointColor(jointName, color);
    }

    /**
     * Helper function to add the pose to the scene
     * @param {Object3D} container - container to add pose to
     */
    addToScene(container) {
        if (container) {
            container.add(this.container);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.container);
        }
    }

    /**
     * Helper function to remove the pose from the scene
     */
    removeFromScene() {
        if (this.container.parent) {
            this.container.parent.remove(this.container);
        }
    }

    /**
     * Helper function to dispose of the pose's resources
     */
    dispose() {
        this.jointMesh.geometry.dispose();
        this.jointMesh.material.dispose();
        this.jointMesh.dispose();
        this.boneMesh.geometry.dispose();
        this.boneMesh.material.dispose();
        this.boneMesh.dispose();
        this.removeFromScene();
    }
}

/**
 * @typedef {string} CloneRenderMode
 */

/**
 * Enum for the different clone render modes for the HumanPoseAnalyzer
 * ALL: render all history clones
 * ONE: render a single history clone
 * @type {{ONE: CloneRenderMode, ALL: CloneRenderMode}}
 */
const CloneRenderMode = {
    ONE: 'ONE',
    ALL: 'ALL',
};

export class HumanPoseAnalyzer {
    /**
     * Creates a new HumanPoseAnalyzer
     * @param {Object3D} parent - container to add the analyzer's containers to
     */
    constructor(parent) {
        this.setupContainers(parent);

        /** @type {AnalyticsLens[]} */
        this.lenses = [
            new RebaLens(),
            new OverallRebaLens(),
            new AccelerationLens(),
            new TimeLens(),
        ]
        this.activeLensIndex = 0;
        this.historyLineLens = this.lenses[1]; // Might be worth making a custom lens for this
        
        this.historyLinesAll = {}; // Dictionary of {poseRenderer IDs: SpaghettiMeshPaths} present in historyLineContainer
        this.clonesAll = []; // Array of all clones present in cloneContainer, entry format: Object3Ds with a pose child
        this.lastDisplayedCloneIndex = 0;

        // Used for animating clone movements
        this.animationStart = -1;
        this.animationEnd = -1;
        this.animationPosition = -1;
        this.cloneRenderMode = CloneRenderMode.ONE;
        this.lastAnimationTime = Date.now();

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
    }

    /**
     * Sets up the containers for the history lines and clones
     * @param parent {Object3D} - object to add the analyzer's containers to
     */
    setupContainers(parent) {
        this.historyLineContainer = new THREE.Group();
        this.historyLineContainer.visible = false;
        if (parent) {
            parent.add(this.historyLineContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.historyLineContainer);
        }
        this.cloneContainer = new THREE.Group();
        this.cloneContainer.visible = true;
        if (parent) {
            parent.add(this.cloneContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.cloneContainer);
        }
    }

    /**
     * Runs every frame to update the animation state
     */
    update() {
        let minTimestamp = -1;
        let maxTimestamp = -1;
        for (let spaghettiMesh of Object.values(this.historyLinesAll)) {
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

        this.setAnimationRange(minTimestamp, maxTimestamp);
        this.updateAnimation();

        window.requestAnimationFrame(this.update);
    }

    /**
     * Responds to new poses being added to the HumanPoseRenderer
     * @param poseRenderer {HumanPoseRenderer} - the pose renderer that was updated
     * @param timestamp {number} - the timestamp of the pose
     */
    poseRendererUpdated(poseRenderer, timestamp) {
        const clone = this.clone(poseRenderer);
        clone.visible = this.cloneRenderMode === CloneRenderMode.ALL;
        this.clonesAll.push(clone)
        this.cloneContainer.add(clone);
        this.lenses.forEach(lens => {
            const modifiedResult = lens.applyLensToHistoryMinimally(this.clonesAll.map(clone => clone.pose));
            modifiedResult.forEach((wasModified, index) => {
                if (wasModified) {
                    this.clonesAll[index].updateColors(lens);
                }
            });
        });

        let currentPoint = poseRenderer.pose.getJoint(JOINTS.NOSE).position.clone(); // TODO: should this be JOINTS.HEAD?
        currentPoint.y += 400;
        
        if (!this.historyLinesAll.hasOwnProperty(poseRenderer.id)) {
            this.createHistoryLine(poseRenderer.id);
        }
        let historyLine = this.historyLinesAll[poseRenderer.id];

        // Split spaghetti line if we jumped by a large amount
        if (historyLine.currentPoints.length > 0) {
            const lastPoint = historyLine.currentPoints[historyLine.currentPoints.length - 1];
            const lastPointVector = new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z);
            if (lastPointVector.distanceToSquared(currentPoint) > 800 * 800) {
                this.historyLinesAll[poseRenderer.id + '-until-' + timestamp] = historyLine;
                historyLine = this.createHistoryLine(poseRenderer.id);
            }
        }

        // TODO: set colors to lens colors for pose
        const color = this.historyLineLens.getColorForPose(poseRenderer.pose); // TODO: swap color with lens swap

        /** @type {SpaghettiMeshPathPoint} */
        let historyPoint = {
            x: currentPoint.x,
            y: currentPoint.y,
            z: currentPoint.z,
            color,
            timestamp,
        };

        historyLine.currentPoints.push(historyPoint);
        this.historyLinesAll[poseRenderer.id].setPoints(historyLine.currentPoints);
    }

    /**
     * @typedef {Object3D} Clone
     * @property {Pose} pose - the pose of the clone
     */

    /**
     * Creates a new clone from the poseRenderer's current pose
     * @param poseRenderer {HumanPoseRenderer} - the poseRenderer to clone
     * @return {Clone} - the created clone
     */
    clone(poseRenderer) {
        const clone = poseRenderer.container.clone();
        clone.pose = poseRenderer.pose;
        const material = new THREE.MeshBasicMaterial({ // Base material for clone is slightly transparent
            transparent: true,
            opacity: 0.5,
        });
        
        const jointsObj = clone.getObjectByName('joints');
        const bonesObj = clone.getObjectByName('bones');

        clone.children.forEach((obj) => {
            if (obj.instanceColor) {
                obj.__lensColors = this.lenses.map(lens => {
                    return obj.instanceColor.clone();
                });
                obj.material = material;
                obj.instanceColor = obj.__lensColors[this.activeLensIndex];
                obj.instanceColor.needsUpdate = true;
            }
        });
        
        const humanPoseAnalyzer = this;

        /**
         * Updates the corresponding color BufferAttribute of the clone based on the lens
         * @param lens {AnalyticsLens} - the lens to use to update the colors
         */
        clone.updateColors = (lens) => {
            clone.children.forEach((obj) => {
                if (obj.__lensColors) {
                    const lensColorBufferAttribute = obj.__lensColors[humanPoseAnalyzer.lenses.indexOf(lens)];
                    if (obj === jointsObj) {
                        clone.pose.forEachJoint((joint, i) => {
                            const color = lens.getColorForJoint(joint)
                            color.toArray(lensColorBufferAttribute.array, i * 3);
                        });
                    } else if (obj === bonesObj) {
                        clone.pose.forEachBone((bone, i) => {
                            const color = lens.getColorForBone(bone)
                            color.toArray(lensColorBufferAttribute.array, i * 3);
                        });
                    }
                    lensColorBufferAttribute.needsUpdate = true;
                }
            });
        }
        
        clone.setLens = (lens) => {
            clone.children.forEach((obj) => {
                if (obj.__lensColors) {
                    obj.instanceColor = obj.__lensColors[humanPoseAnalyzer.lenses.indexOf(lens)];
                    obj.instanceColor.needsUpdate = true;
                }
            });
        }
        
        clone.setLens(this.lenses[this.activeLensIndex]);
        return clone;
    }

    /**
     * Creates a history line.
     * Side effect: adds the history line to historyLineContainer and historyLinesAll
     * @param {string} id - key for historyLinesAll
     */
    createHistoryLine(id) {
        const historyLine = new SpaghettiMeshPath([], {
            widthMm: 30,
            heightMm: 30,
            usePerVertexColors: true,
            wallBrightness: 0.6,
        });
        this.historyLineContainer.add(historyLine);

        this.historyLinesAll[id] = historyLine;
        
        return historyLine;
    }

    /**
     * Clears all history lines
     */
    resetHistoryLines() {
        Object.keys(this.historyLinesAll).forEach(key => {
            const historyLine = this.historyLinesAll[key];
            historyLine.resetPoints();
            historyLine.parent.remove(historyLine);
        });
        this.historyLinesAll = {};
    }

    /**
     * Clears all history clones
     */
    resetHistoryClones() {
        this.clonesAll.forEach(clone => {
            if (clone.geometry) {
                clone.geometry.dispose();
            }
            if (clone.material) {
                clone.material.dispose();
            }
            if (clone.dispose) {
                clone.dispose();
            }
            clone.parent.remove(clone);
        });
        this.clonesAll = [];
        this.lastDisplayedCloneIndex = 0;
    }

    /**
     * Sets the interval which controls what history is highlighted
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     */
    setHighlightTimeInterval(firstTimestamp, secondTimestamp) {
        for (let mesh of Object.values(this.historyLinesAll)) {
            mesh.setHighlightTimeInterval(firstTimestamp, secondTimestamp);
        }
    }

    /**
     * Sets the interval which controls what history is shown
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     */
    setDisplayTimeInterval(firstTimestamp, secondTimestamp) {
        for (let mesh of Object.values(this.historyLinesAll)) {
            if (mesh.getStartTime() > secondTimestamp || mesh.getEndTime() < firstTimestamp) {
                mesh.visible = false;
                continue;
            }
            mesh.visible = true;
            mesh.setDisplayTimeInterval(firstTimestamp, secondTimestamp);
        }
    }

    /**
     * Sets the hover time for the relevant history line
     * @param {number} timestamp - timestamp in ms
     */
    setHoverTime(timestamp) {
        if (timestamp < 0) {
            return;
        }
        for (let mesh of Object.values(this.historyLinesAll)) {
            if (mesh.getStartTime() > timestamp || mesh.getEndTime() < timestamp) {
                continue;
            }
            mesh.setHoverTime(timestamp);
        }
    }

    /**
     * Gets all history points in the time interval from all history lines
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     * @return {Vector3[]} - all points in the time interval
     */
    getHistoryPointsInTimeInterval(firstTimestamp, secondTimestamp) {
        // TODO: perf can be improved through creating historyPointsAll and
        // binary search for indices
        let allPoints = [];
        for (const mesh of Object.values(this.historyLinesAll)) {
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
     * Sets the visibility of the history lines
     * @param {boolean} visible - whether to show the history lines
     */
    setHistoryLinesVisible(visible) {
        this.historyLineContainer.visible = visible;
    }

    /**
     * Sets the render mode for clones
     * @param {CloneRenderMode} cloneRenderMode - the render mode
     */
    setCloneRenderMode(cloneRenderMode) {
        if (cloneRenderMode === CloneRenderMode.ALL) {
            for (let clone of this.clonesAll) {
                clone.visible = true;
            }
        } else if (cloneRenderMode === CloneRenderMode.ONE) {
            for (let clone of this.clonesAll) {
                clone.visible = false;
            }
        } else {
            console.error(`Unknown clone render mode: ${cloneRenderMode}`);
            return;
        }
        this.cloneRenderMode = cloneRenderMode;

    }

    /**
     * Advances the active lens to the next one
     * @return {AnalyticsLens} - the new active lens
     */
    advanceLens() {
        // TODO: set HumanPoseRenderer's lens as well
        this.activeLensIndex = (this.activeLensIndex + 1) % this.lenses.length;
        this.applyCurrentLensToHistory();
        this.clonesAll.forEach(clone => {
            clone.setLens(this.lenses[this.activeLensIndex]);
        });
        return this.lenses[this.activeLensIndex];
    }

    /**
     * Applies the current lens to the history, updating the clones' colors if needed
     */
    applyCurrentLensToHistory() {
        const posesChanged = this.lenses[this.activeLensIndex].applyLensToHistory(this.clonesAll.map(clone => clone.pose));
        posesChanged.forEach((wasChanged, index) => {
            if (wasChanged) { // Only update colors if the pose data was modified
                this.clonesAll[index].updateColors(this.lenses[this.activeLensIndex]);
            }
        });
    }

    /**
     * Sets the animation range, updating the animation position if necessary
     * @param start {number} - start time of animation in ms
     * @param end {number} - end time of animation in ms
     */
    setAnimationRange(start, end) {
        this.animationStart = start;
        this.animationEnd = end;
        if (this.animationPosition < start || this.animationPosition > end) {
            this.animationPosition = start;
        }
    }

    /**
     * Plays the current frame of the animation
     */
    updateAnimation() {
        const now = Date.now();
        const dt = now - this.lastAnimationTime;
        this.lastAnimationTime = now;
        if (this.animationStart < 0 || this.animationEnd < 0) {
            this.clearAnimation();
            return;
        }
        this.animationPosition += dt;
        let progress = this.animationPosition - this.animationStart;
        let animationDuration = this.animationEnd - this.animationStart;
        let progressClamped = progress % animationDuration;
        this.animationPosition = this.animationStart + progressClamped;
        this.displayCloneByTimestamp(this.animationPosition);
    }

    /**
     * Resets the animation data and stops playback
     */
    clearAnimation() {
        this.animationStart = -1;
        this.animationEnd = -1;
        this.animationPosition = -1;
        this.hideLastDisplayedClone(-1);
    }

    /**
     * Hides the previous clone to be displayed
     * @param timestamp {number} - ????
     */
    hideLastDisplayedClone(timestamp) {
        if (this.lastDisplayedCloneIndex >= 0) {
            const lastClone = this.clonesAll[this.lastDisplayedCloneIndex];
            if (lastClone) {
                lastClone.visible = false;
            }
            if (timestamp >= 0 && lastClone.pose.timestamp > timestamp) {
                this.lastDisplayedCloneIndex = 0;
            }
        }
    }

    /**
     * Displays the clone with the closest timestamp to the given timestamp
     * @param timestamp {number} - the timestamp to display
     */
    displayCloneByTimestamp(timestamp) {
        if (this.cloneRenderMode === CloneRenderMode.ALL) { // Don't do anything if we're rendering all clones
            return;
        }
        this.hideLastDisplayedClone(timestamp);

        if (this.clonesAll.length < 2) {
            return;
        }
        let bestClone = null;
        for (let i = this.lastDisplayedCloneIndex; i < this.clonesAll.length; i++) { // TODO: improve this with binary search
            let clone = this.clonesAll[i];
            let cloneNext = this.clonesAll[i + 1];
            if (clone.pose.timestamp > timestamp) {
                break;
            }
            if (!cloneNext || cloneNext.pose.timestamp > timestamp) {
                bestClone = clone;
                this.lastDisplayedCloneIndex = i;
                break;
            }
        }
        if (bestClone) {
            bestClone.visible = true;
        }
    }
}

/**
 * Helper function to set a matrix from an array
 * @param matrix {THREE.Matrix4} - the matrix to set
 * @param array {number[]} - the array to set the matrix from
 */
function setMatrixFromArray(matrix, array) { // TODO: currently in use here and in threejsScene, move into utilities file
    matrix.set( array[0], array[4], array[8], array[12],
        array[1], array[5], array[9], array[13],
        array[2], array[6], array[10], array[14],
        array[3], array[7], array[11], array[15]
    );
}

/**
 * @typedef {Object} HumanPoseObject
 * @property {string} objectId - the id of the object that the poseObject belongs to // TODO: check this
 * @property {string} uuid - the uuid of the poseObject // TODO: investigate need for UUID and ID
 * @property {string} id - the id of the poseObject // TODO: check types
 * @property {number[]} matrix - the matrix of the poseObject
 * @property {Object} frames - the frames of the poseObject
 */

/**
 * Processes the poseObject given and renders them into the corresponding poseRenderers
 * @param poseObjects {HumanPoseObject[]} - the poseObjects to render
 * @param timestamp {number} - the timestamp of the poseObjects
 * @param historical {boolean} - whether the poseObjects are historical (being played back) or not (live)
 * @param container {Object3D} - the container to place the HumanPoseRenderers into
 */
function renderHumanPoseObjects(poseObjects, timestamp, historical, container) {
    if (realityEditor.gui.poses.isPose2DSkeletonRendered()) return;

    if (!humanPoseAnalyzer) {
        humanPoseAnalyzer = new HumanPoseAnalyzer(container);
    }

    for (let id in poseRenderers) {
        poseRenderers[id].updated = false;
    }
    for (let poseObject of poseObjects) {
        if (historical) {
            if (!poseObject.uuid) { // TODO: why is this here but not in non-historical case?
                poseObject.uuid = poseObject.objectId;
                poseObject.id = poseObject.objectId;
            }
            updatePoseRenderer(poseObject, timestamp, true, container);
        } else {
            updatePoseRenderer(poseObject, timestamp, false, container);
        }
    }
    for (let id of Object.keys(poseRenderers)) {
        if (!poseRenderers[id].updated) {
            poseRenderers[id].dispose();
            delete poseRenderers[id];
        }
    }
}

/**
 * Updates the corresponding poseRenderer with the poseObject given
 * @param poseObject {HumanPoseObject} - the poseObject to render
 * @param timestamp {number} - the timestamp of when the poseObject was recorded
 * @param historical {boolean} - whether the poseObject is historical (being played back) or not (live)
 * @param container {Object3D} - the container to place the HumanPoseRenderer into
 */
function updatePoseRenderer(poseObject, timestamp, historical, container) {
    if (!poseRenderers[poseObject.uuid]) {
        poseRenderers[poseObject.uuid] = new HumanPoseRenderer(poseObject.uuid);
        poseRenderers[poseObject.uuid].addToScene(container);
    }
    let poseRenderer = poseRenderers[poseObject.uuid];
    poseRenderer.updated = true;

    if (historical) {
        updateJointsAndBonesHistorical(poseRenderer, poseObject, timestamp);
    } else {
        updateJointsAndBones(poseRenderer, poseObject, timestamp);
    }

    humanPoseAnalyzer.poseRendererUpdated(poseRenderer, timestamp);
    if (realityEditor.analytics) {
        realityEditor.analytics.appendPose({
            time: timestamp,
        });
    }
}

/**
 * Helper function to get the matrix of the ground plane relative to the world
 * @return {Matrix4} - the matrix of the ground plane relative to the world
 */
function getGroundPlaneRelativeMatrix() {
    let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
    let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
    let groundPlaneRelativeMatrix = new THREE.Matrix4();
    setMatrixFromArray(groundPlaneRelativeMatrix, worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode));
    return groundPlaneRelativeMatrix;
}

/**
 * Updates the pose renderer with the pre-recorded pose data
 * @param poseRenderer {HumanPoseRenderer} - the pose renderer to update
 * @param poseObject {HumanPoseObject} - the pose object to get the data from
 * @param timestamp {number} - when the pose was recorded
 */
function updateJointsAndBonesHistorical(poseRenderer, poseObject, timestamp) { // TODO: analyze differences between this and updateJointsAndBones
    let groundPlaneRelativeMatrix = getGroundPlaneRelativeMatrix();

    const jointPositions = {};
    
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

        jointPositions[jointId] = jointPosition;
    }
    
    const pose = new Pose(jointPositions, timestamp);
    poseRenderer.setPose(pose);
}

/**
 * Updates the pose renderer with the current pose data
 * @param poseRenderer {HumanPoseRenderer} - the pose renderer to update
 * @param poseObject {HumanPoseObject} - the pose object to get the data from
 * @param timestamp {number} - when the pose was recorded
 */
function updateJointsAndBones(poseRenderer, poseObject, timestamp) { // TODO: analyze differences between this and updateJointsAndBonesHistorical
    let groundPlaneRelativeMatrix = getGroundPlaneRelativeMatrix();

    const jointPositions = {};
    
    for (const [i, jointId] of Object.values(JOINTS).entries()) {
        // assume that all sub-objects are of the form poseObject.id + joint name
        let sceneNode = realityEditor.sceneGraph.getSceneNodeById(`${poseObject.uuid}${jointId}`);

        // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
        let jointMatrixThree = new THREE.Matrix4();
        setMatrixFromArray(jointMatrixThree, sceneNode.worldMatrix);
        jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

        let jointPosition = new THREE.Vector3();
        jointPosition.setFromMatrixPosition(jointMatrixThree);

        jointPositions[jointId] = jointPosition;

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

    const pose = new Pose(jointPositions, timestamp);
    poseRenderer.setPose(pose);
}

/**
 * Resets the HumanPoseAnalyzer's history lines
 */
function resetHistoryLines() {
    humanPoseAnalyzer.resetHistoryLines();
}

/**
 * Resets the HumanPoseAnalyzer's history clones
 */
function resetHistoryClones() {
    humanPoseAnalyzer.resetHistoryClones();
}

/**
 * Sets the time interval to highlight on the HumanPoseAnalyzer
 * @param {number} firstTimestamp - start of time interval in ms
 * @param {number} secondTimestamp - end of time interval in ms
 */
function setHighlightTimeInterval(firstTimestamp, secondTimestamp) {
    humanPoseAnalyzer.setHighlightTimeInterval(firstTimestamp, secondTimestamp);
}

/**
 * Gets the points in the history lines that are within the given time interval
 * @param {number} firstTimestamp - start of time interval in ms
 * @param {number} secondTimestamp - end of time interval in ms
 * @return {SpaghettiMeshPathPoint[]} - the points in the history lines that are within the given time interval
 */
function getHistoryPointsInTimeInterval(firstTimestamp, secondTimestamp) {
    return humanPoseAnalyzer.getHistoryPointsInTimeInterval(firstTimestamp, secondTimestamp);
}

/**
 * Sets the visibility of the history lines
 * @param {boolean} visible - whether to show the history lines
 */
function setHistoryLinesVisible(visible) {
    if (!humanPoseAnalyzer) {
        return;
    }
    humanPoseAnalyzer.setHistoryLinesVisible(visible);
}

/**
 * Sets the clone rendering mode
 * @param {boolean} enabled - whether to render all clones or just one
 */
function setRecordingClonesEnabled(enabled) {
    if (enabled) {
        humanPoseAnalyzer.setCloneRenderMode(CloneRenderMode.ALL);
    } else {
        humanPoseAnalyzer.setCloneRenderMode(CloneRenderMode.ONE);
    }
}

/**
 * Advances the human pose analyzer's analytics lens
 */
function advanceLens() {
    humanPoseAnalyzer.advanceLens();
}

/**
 * Advances the human pose analyzer's clone material
 * @deprecated
 * @see advanceLens
 */
function advanceCloneMaterial() {
    console.warn('advanceCloneMaterial is deprecated, use advanceLens instead');
    advanceLens();
}

/**
 * Sets the hover time for the HumanPoseAnalyzer
 * @param {number} time - the hover time in ms
 */
function setHoverTime(time) {
    humanPoseAnalyzer.setHoverTime(time);
}

/**
 * Sets the time interval to display on the HumanPoseAnalyzer
 * @param {number} startTime - start of time interval in ms
 * @param {number} endTime - end of time interval in ms
 */
function setDisplayTimeInterval(startTime, endTime) {
    humanPoseAnalyzer.setDisplayTimeInterval(startTime, endTime);
}

// TODO: Remove deprecated API use
export {
    renderHumanPoseObjects,
    resetHistoryLines,
    resetHistoryClones,
    setHoverTime,
    setHighlightTimeInterval,
    setDisplayTimeInterval,
    setHistoryLinesVisible,
    setRecordingClonesEnabled,
    advanceLens,
    advanceCloneMaterial,
    getHistoryPointsInTimeInterval,
};
