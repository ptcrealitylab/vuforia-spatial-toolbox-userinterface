import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINTS, JOINT_PUBLIC_DATA_KEYS, getJointNodeInfo} from './utils.js';
import {SpaghettiMeshPath} from './spaghetti.js';
import {HumanPoseRenderer} from './HumanPoseRenderer.js';
import {HumanPoseRenderInstance} from './HumanPoseRenderInstance.js';
import {RENDER_CONFIDENCE_COLOR, MAX_POSE_INSTANCES} from './constants.js';

let humanPoseAnalyzer;
const poseRenderers = {};

export const AnimationMode = {
    // The single historical pose at the cursor time is visible
    cursor: 'cursor',
    // A single historical pose within the highlight region is visible, it
    // animates through the movements it made
    region: 'region',
    // Every historical pose within the highlight region is visible
    regionAll: 'regionAll',
    // Every historical pose is visible
    all: 'all',
};

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
        this.recordingClones = true;
        this.cloneMaterialIndex = 0;
        this.historyMeshesAll = {};
        this.clonesAll = [];
        this.lastDisplayedCloneIndex = 0;

        this.prevAnimationState = null;
        this.animationStart = -1;
        this.animationEnd = -1;
        this.animationPosition = -1;
        this.animationMode = AnimationMode.region;
        this.lastAnimationUpdate = Date.now();

        this.poseRendererLive = new HumanPoseRenderer(new THREE.MeshBasicMaterial(), 16);
        this.poseRendererLive.addToScene(historyCloneContainer);

        this.historicalPoseRenderers = [];
        this.addHistoricalPoseRenderer();

        this.update = this.update.bind(this);

        window.requestAnimationFrame(this.update);
    }

    addHistoricalPoseRenderer() {
        const poseRendererHistorical = new HumanPoseRenderer(new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.5,
        }), MAX_POSE_INSTANCES);
        poseRendererHistorical.addToScene(this.historyCloneContainer);
        this.historicalPoseRenderers.push(poseRendererHistorical);
        return poseRendererHistorical;
    }

    getHistoricalPoseRenderer() {
        const hpr = this.historicalPoseRenderers[this.historicalPoseRenderers.length - 1];
        if (hpr.isFull()) {
            return this.addHistoricalPoseRenderer();
        }
        return hpr;
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

        if (this.animationMode === AnimationMode.region ||
            this.animationMode === AnimationMode.regionAll) {
            this.setAnimation(this.animationStart, this.animationEnd);
        }

        if (this.animationMode === AnimationMode.region) {
            this.updateAnimationRegion();
        }

        window.requestAnimationFrame(this.update);
    }

    poseRendererUpdated(poseRenderer, timestamp) {
        if (this.recordingClones) {
            const obj = poseRenderer.cloneToRenderer(this.getHistoricalPoseRenderer(), this.cloneMaterialIndex);
            this.clonesAll.push({
                timestamp,
                poseObject: obj,
            })
            obj.setVisible(this.animationMode === AnimationMode.all);
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

        let hueReba = poseRenderer.getOverallRebaScoreHue();
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
        this.historyMeshesAll = {};
    }

    resetHistoryClones() {
        if (this.clonesAll.length === 0) {
            return;
        }
        for (let clone of this.clonesAll) {
            clone.poseObject.remove();
        }
        for (let hpr of this.historicalPoseRenderers) {
            hpr.markMatrixNeedsUpdate();
        }
        this.clonesAll = [];
    }

    /**
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     */
    setHighlightTimeInterval(firstTimestamp, secondTimestamp) {
        if (this.animationMode !== AnimationMode.region &&
            this.animationMode !== AnimationMode.regionAll) {
            this.setAnimationMode(AnimationMode.region);
        }
        this.setAnimation(firstTimestamp, secondTimestamp);
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
            if (this.animationMode === AnimationMode.cursor) {
                this.restoreAnimationState();
            }
            return;
        }
        for (let mesh of Object.values(this.historyMeshesAll)) {
            if (mesh.getStartTime() > timestamp || mesh.getEndTime() < timestamp) {
                continue;
            }
            mesh.setHoverTime(timestamp);
            if (this.animationMode !== AnimationMode.cursor) {
                this.setAnimationMode(AnimationMode.cursor);
            }
            this.hideLastDisplayedClone();
            this.lastDisplayedCloneIndex = -1;
            this.displayNearestClone(timestamp);
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
        if (this.animationMode === animationMode) {
            return;
        }
        if (animationMode === AnimationMode.cursor) {
            this.saveAnimationState();
        }
        this.animationMode = animationMode;
        if (this.clonesAll.length === 0) {
            return;
        }

        for (let hpr of this.historicalPoseRenderers) {
            hpr.markMatrixNeedsUpdate();
        }

        if (this.animationMode === AnimationMode.all) {
            for (let clone of this.clonesAll) {
                clone.poseObject.setVisible(true);
            }
            return;
        }

        if (this.animationMode === AnimationMode.cursor || this.animationMode === AnimationMode.region) {
            for (let clone of this.clonesAll) {
                clone.poseObject.setVisible(false);
            }
        }
    }

    saveAnimationState() {
        this.prevAnimationState = {
            animationMode: this.animationMode,
            animationStart: this.animationStart,
            animationEnd: this.animationEnd,
        };
    }

    /**
     * Reset to previous animation state after temporary cursor mode
     */
    restoreAnimationState() {
        if (!this.prevAnimationState) {
            return;
        }
        this.setAnimationMode(this.prevAnimationState.animationMode);
        this.setAnimation(
            this.prevAnimationState.animationStart,
            this.prevAnimationState.animationEnd);
        this.prevAnimationState = null;
    }

    advanceCloneMaterial() {
        this.cloneMaterialIndex = (this.cloneMaterialIndex + 1) % 3;

        this.clonesAll.forEach(clone => {
            clone.poseObject.setColorOption(this.cloneMaterialIndex);
        });
        for (let hpr of this.historicalPoseRenderers) {
            hpr.markColorNeedsUpdate();
        }
    }

    /**
     * @param {number} start - start of animation region in ms
     * @param {number} end - end of animation region in ms
     */
    setAnimation(start, end) {
        if (this.animationStart === start && this.animationEnd === end) {
            return;
        }

        switch (this.animationMode) {
        case AnimationMode.region:
            // Fully reset the animation when changing
            this.hideLastDisplayedClone();
            this.lastDisplayedCloneIndex = -1;
            break;
        case AnimationMode.regionAll:
            this.hideAllClones();
            this.setCloneVisibleInInterval(true, start, end);
            break;
        case AnimationMode.all:
            // no effect
            break;
        case AnimationMode.cursor:
            // no effect
            break;
        }

        this.animationStart = start;
        this.animationEnd = end;
    }

    updateAnimationRegion() {
        let dt = Date.now() - this.lastAnimationUpdate;
        this.lastAnimationUpdate += dt;

        if (this.animationStart < 0 || this.animationEnd < 0) {
            this.hideLastDisplayedClone();
            this.lastDisplayedCloneIndex = -1;
            return;
        }

        this.animationPosition += dt;
        let offset = this.animationPosition - this.animationStart;
        let duration = this.animationEnd - this.animationStart;
        let offsetClamped = offset % duration;
        this.animationPosition = this.animationStart + offsetClamped;
        this.displayNearestClone(this.animationPosition);
    }

    setCloneVisibleInInterval(visible, start, end) {
        if (start < 0 || end < 0 ||
            this.clonesAll.length < 0) {
            return;
        }

        for (let i = 0; i < this.clonesAll.length; i++) {
            let clone = this.clonesAll[i];
            if (clone.timestamp < start) {
                continue;
            }
            if (clone.timestamp > end) {
                break;
            }
            let poseObject = clone.poseObject;
            if (poseObject.visible === visible) {
                continue;
            }
            poseObject.setVisible(visible);
            poseObject.renderer.markMatrixNeedsUpdate();
        }
    }

    showAllClones() {
        this.setCloneVisibleInInterval(true, 0, Number.MAX_VALUE);
    }

    hideAllClones() {
        this.setCloneVisibleInInterval(false, 0, Number.MAX_VALUE);
    }

    hideLastDisplayedClone() {
        if (this.lastDisplayedCloneIndex >= 0) {
            let lastClone = this.clonesAll[this.lastDisplayedCloneIndex];
            if (lastClone && lastClone.poseObject.visible) {
                lastClone.poseObject.setVisible(false);
                lastClone.poseObject.renderer.markMatrixNeedsUpdate();
            }
        }
    }

    displayNearestClone(timestamp) {
        if (this.clonesAll.length < 2) {
            return;
        }

        let bestClone = null;
        let bestCloneIndex = -1;
        let start = Math.max(this.lastDisplayedCloneIndex, 0);
        if (this.clonesAll[start].timestamp > timestamp) {
            start = 0;
        }
        for (let i = start; i < this.clonesAll.length; i++) {
            let clone = this.clonesAll[i];
            let cloneNext = this.clonesAll[i + 1];
            if (clone.timestamp > timestamp) {
                break;
            }
            if (!cloneNext || cloneNext.timestamp > timestamp) {
                bestClone = clone;
                bestCloneIndex = i;
                break;
            }
        }
        if (bestClone) {
            if (this.lastDisplayedCloneIndex !== bestCloneIndex) {
                this.hideLastDisplayedClone();
                this.lastDisplayedCloneIndex = bestCloneIndex;
                bestClone.poseObject.setVisible(true);
                bestClone.poseObject.renderer.markMatrixNeedsUpdate();
            }
        } else {
            this.hideLastDisplayedClone();
            this.lastDisplayedCloneIndex = -1;
        }
    }
}

let prevHistorical = false;

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
            poseRenderers[id].remove();
            delete poseRenderers[id];
        }
    }

    if (!historical) {
        humanPoseAnalyzer.poseRendererLive.markNeedsUpdate();

        if (prevHistorical) {
            for (let hpr of humanPoseAnalyzer.historicalPoseRenderers) {
                hpr.markNeedsUpdate();
            }
        }
    }

    prevHistorical = historical;
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
    let renderer = historical ?
        humanPoseAnalyzer.getHistoricalPoseRenderer() :
        humanPoseAnalyzer.poseRendererLive;
    if (!poseRenderers[poseObject.uuid]) {
        poseRenderers[poseObject.uuid] = new HumanPoseRenderInstance(renderer, poseObject.uuid);
    }
    let poseRenderer = poseRenderers[poseObject.uuid];

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
 * @param {AnimationMode} animationMode
 */
function setAnimationMode(animationMode) {
    humanPoseAnalyzer.setAnimationMode(animationMode);
}

/**
 * @param {boolean} enabled
 */
function setRecordingClonesEnabled(enabled) {
    if (enabled) {
        humanPoseAnalyzer.setAnimationMode(AnimationMode.all);
    } else {
        humanPoseAnalyzer.setAnimationMode(AnimationMode.region);
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
    setAnimationMode,
    setHoverTime,
    setHighlightTimeInterval,
    setDisplayTimeInterval,
    setHistoryLinesVisible,
    setRecordingClonesEnabled,
    advanceCloneMaterial,
    getHistoryPointsInTimeInterval,
};
