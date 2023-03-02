import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {
    JOINTS,
    JOINT_PUBLIC_DATA_KEYS,
    getJointNodeInfo,
    getGroundPlaneRelativeMatrix,
    setMatrixFromArray
} from './utils.js';
import {SpaghettiMeshPath} from './spaghetti.js';
import {Pose} from "./Pose.js";
import {RebaLens} from "./RebaLens.js";
import {OverallRebaLens} from "./OverallRebaLens.js";
import {AccelerationLens} from "./AccelerationLens.js";
import {TimeLens} from "./TimeLens.js";
import {PoseObjectIdLens} from "./PoseObjectIdLens.js";
import {HumanPoseAnalyzerSettingsUi} from "./HumanPoseAnalyzerSettingsUi.js";

import {HumanPoseRenderer} from './HumanPoseRenderer.js';
import {HumanPoseRenderInstance} from './HumanPoseRenderInstance.js';
import {RENDER_CONFIDENCE_COLOR, MAX_POSE_INSTANCES} from './constants.js';

let humanPoseAnalyzer;
const poseRenderInstances = {};
let historicalPoseRenderInstanceList = [];

const POSE_OPACITY_BASE = 0.5;
const POSE_OPACITY_BACKGROUND = 0.2;

/**
 * @typedef {string} AnimationMode
 */

/**
 * Enum for the different clone rendering modes for the HumanPoseAnalyzer:
 * cursor: The single historical pose at the cursor time is visible,
 * region: A single historical pose within the highlight region is visible, it animates through the movements it made,
 * regionAll: Every historical pose within the highlight region is visible,
 * all: Every historical pose is visible
 * @type {{cursor: AnimationMode, region: AnimationMode, regionAll: AnimationMode, all: AnimationMode}}
 */
export const AnimationMode = {
    cursor: 'cursor',
    region: 'region',
    regionAll: 'regionAll',
    all: 'all',
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
            new PoseObjectIdLens()
        ]
        this.activeLensIndex = 0;

        this.activeJointName = ""; // Used in the UI
        
        this.historyLines = {}; // Dictionary of {poseRenderer.id: {lensName: SpaghettiMeshPath}}, separated by historical and live
        this.historyLineContainers = {
            historical: {},
            live: {}
        }; // Dictionary of {lensName: Object3D} present in historyLineContainer that contains the corresponding history lines
        this.lenses.forEach(lens => {
            this.historyLines[lens.name] = {
                all: {},
                historical: {},
                live: {}
            };
            this.historyLineContainers.historical[lens.name] = new THREE.Group();
            this.historyLineContainers.historical[lens.name].visible = lens === this.activeLens;
            this.historicalHistoryLineContainer.add(this.historyLineContainers.historical[lens.name]);
            this.historyLineContainers.live[lens.name] = new THREE.Group();
            this.historyLineContainers.live[lens.name].visible = lens === this.activeLens;
            this.liveHistoryLineContainer.add(this.historyLineContainers.live[lens.name]);
        });

        this.clones = {
            all: [],
            historical: [],
            live: []
        }; // Array of all clones, entry format: Object3Ds with a pose child
        this.recordingClones = realityEditor.device.environment.isDesktop();
        this.lastDisplayedClone = null;
        
        this.prevAnimationState = null;
        this.animationStart = -1;
        this.animationEnd = -1;
        this.animationPosition = -1;
        this.animationMode = AnimationMode.region;
        this.lastAnimationTime = Date.now();
        
        // The renderer for poses that need to be rendered opaquely
        this.opaquePoseRenderer = new HumanPoseRenderer(new THREE.MeshBasicMaterial(), MAX_POSE_INSTANCES);
        this.opaquePoseRenderer.addToScene(this.opaqueContainer);
        
        // Keeps track of the HumanPoseRenderInstances for the start and end of the current selection
        this.selectionMarkPoseRenderInstances = {
            start: new HumanPoseRenderInstance(this.opaquePoseRenderer, 'selectionMarkStart', this.activeLens),
            end: new HumanPoseRenderInstance(this.opaquePoseRenderer, 'selectionMarkEnd', this.activeLens),
        };

        // Contains all historical poses
        this.historicalPoseRenderers = [];
        if (realityEditor.device.environment.isDesktop()) {
            this.addHistoricalPoseRenderer();
        }
        
        // Contains all live-recorded poses
        this.livePoseRenderers = [];
        this.addLivePoseRenderer();

        if (realityEditor.device.environment.isDesktop()) {
            this.settingsUi = new HumanPoseAnalyzerSettingsUi(this);
            this.setUiDefaults();
        }

        this.update = this.update.bind(this);
        window.requestAnimationFrame(this.update);
    }
    
    get activeLens() {
        return this.lenses[this.activeLensIndex];
    }

    /**
     * Sets up the containers for the history lines and clones
     * @param {Object3D} parent - object to add the analyzer's containers to
     */
    setupContainers(parent) {
        this.historicalHistoryLineContainer = new THREE.Group();
        this.historicalHistoryLineContainer.visible = true;
        if (parent) {
            parent.add(this.historicalHistoryLineContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.historicalHistoryLineContainer);
        }
        this.liveHistoryLineContainer = new THREE.Group();
        this.liveHistoryLineContainer.visible = false;
        if (parent) {
            parent.add(this.liveHistoryLineContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.liveHistoryLineContainer);
        }
        this.historicalContainer = new THREE.Group();
        this.historicalContainer.visible = true;
        if (parent) {
            parent.add(this.historicalContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.historicalContainer);
        }
        this.liveContainer = new THREE.Group();
        this.liveContainer.visible = true;
        if (parent) {
            parent.add(this.liveContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.liveContainer);
        }
        this.opaqueContainer = new THREE.Group();
        this.opaqueContainer.visible = true;
        if (parent) {
            parent.add(this.opaqueContainer);
        } else {
            realityEditor.gui.threejsScene.addToScene(this.opaqueContainer);
        }
    }

    /**
     * Sets the settings UI to the current state of the analyzer
     */
    setUiDefaults() {
        this.settingsUi.setActiveLens(this.activeLens);
        this.settingsUi.setLiveHistoryLinesVisible(this.liveHistoryLineContainer.visible);
        this.settingsUi.setHistoricalHistoryLinesVisible(this.historicalHistoryLineContainer.visible);
        this.settingsUi.setActiveJointByName(this.activeJointName);
    }

    /**
     * Adds a new historical pose renderer to the analyzer
     * @return {HumanPoseRenderer} - the new renderer
     */
    addHistoricalPoseRenderer() {
        const poseRendererHistorical = new HumanPoseRenderer(new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: POSE_OPACITY_BASE,
        }), MAX_POSE_INSTANCES);
        poseRendererHistorical.addToScene(this.historicalContainer);
        this.historicalPoseRenderers.push(poseRendererHistorical);
        return poseRendererHistorical;
    }

    /**
     * Gets the most recently created historical pose renderer, or creates a new one if the last one is full
     * @return {HumanPoseRenderer} - the historical pose renderer
     */
    getHistoricalPoseRenderer() {
        const hpr = this.historicalPoseRenderers[this.historicalPoseRenderers.length - 1];
        if (hpr.isFull()) {
            return this.addHistoricalPoseRenderer();
        }
        return hpr;
    }
    
    resetHistoricalPoseRenderers() {
        this.historicalPoseRenderers.forEach((renderer) => {
            renderer.removeFromParent();
        });
        this.historicalPoseRenderers = [];
        this.addHistoricalPoseRenderer();
    }

    /**
     * Adds a new live pose renderer to the analyzer
     * @return {HumanPoseRenderer} - the new renderer
     */
    addLivePoseRenderer() {
        const livePoseRenderer = new HumanPoseRenderer(new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0.5,
        }), MAX_POSE_INSTANCES);
        livePoseRenderer.addToScene(this.liveContainer);
        this.livePoseRenderers.push(livePoseRenderer);
        return livePoseRenderer;
    }

    /**
     * Gets the most recently created live pose renderer, or creates a new one if the last one is full
     * @return {HumanPoseRenderer} - the live pose renderer
     */
    getLivePoseRenderer() {
        const lpr = this.livePoseRenderers[this.livePoseRenderers.length - 1];
        if (lpr.isFull()) {
            return this.addLivePoseRenderer();
        }
        return lpr;
    }

    /**
     * Runs every frame to update the animation state
     */
    update() {
        let minTimestamp = -1;
        let maxTimestamp = -1;
        for (let spaghettiMesh of Object.values(this.historyLines[this.activeLens.name].all)) {
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
            this.setAnimationRange(minTimestamp, maxTimestamp);
        }

        if (this.animationMode === AnimationMode.region) {
            this.updateAnimation();
        }

        window.requestAnimationFrame(this.update);
    }

    /**
     * Processes new poses being added to the HumanPoseRenderer
     * @param {Pose} pose - the pose renderer that was updated
     * @param {boolean} historical - whether the pose is historical or live
     */
    poseUpdated(pose, historical) {
        this.addCloneFromPose(pose, historical);
        this.updateHistoryLines(pose, historical);
    }

    /**
     * Processes new bulk historical poses being added to the HumanPoseRenderer
     * @param {Pose[]} poses - the poses to be added
     */
    bulkHistoricalPosesUpdated(poses) {
        this.lenses.forEach(lens => {
            lens.reset();
        });
        poses.forEach(pose => {
            this.addCloneFromPose(pose, true);
        });
        this.bulkUpdateHistoryLines(poses, true);
    }

    /**
     * Creates a new clone from a pose and adds it to the analyzer
     * @param {Pose} pose - the pose to clone
     * @param {boolean} historical - whether the pose is historical or live
     */
    addCloneFromPose(pose, historical) {
        const poseRenderer = historical ? this.getHistoricalPoseRenderer() : this.getLivePoseRenderer();
        const instanceId = `${pose.timestamp}-${pose.metadata.poseObjectId}`;
        if (!poseRenderInstances[instanceId]) {
            poseRenderInstances[instanceId] = new HumanPoseRenderInstance(poseRenderer, instanceId, this.activeLens);
        }
        const poseRenderInstance = poseRenderInstances[instanceId];
        if (historical) {
            historicalPoseRenderInstanceList.push(poseRenderInstance);
        }
        
        this.clones.all.push(poseRenderInstance);
        if (historical) {
            this.clones.historical.push(poseRenderInstance);
        } else {
            this.clones.live.push(poseRenderInstance);
        }
        poseRenderInstance.setPose(pose); // Needs to be set before visible is set, setting a pose always makes visible at the moment
        if (this.animationMode === AnimationMode.all) {
            poseRenderInstance.setVisible(true);
        } else {
            poseRenderInstance.setVisible(false);
        }

        poseRenderInstance.renderer.markMatrixNeedsUpdate();

        const relevantClones = historical ? this.clones.historical : this.clones.live;
        const poseHistory = relevantClones.map(poseRenderInstance => poseRenderInstance.pose);
        this.lenses.forEach(lens => {
            const modifiedResult = lens.applyLensToHistoryMinimally(poseHistory); // Needed to efficiently update each pose frame, if we update everything it's not as performant
            modifiedResult.forEach((wasModified, index) => {
                if (wasModified) {
                    relevantClones[index].updateColorBuffers(lens);
                    relevantClones[index].renderer.markColorNeedsUpdate();
                }
            });
        });
        poseRenderInstance.setLens(this.activeLens);
        poseRenderInstance.renderer.markColorNeedsUpdate();
    }

    /**
     * Updates the history lines with the given pose
     * @param {Pose} pose - the pose to be added
     * @param {boolean} historical - whether the pose is historical or live
     */
    updateHistoryLines(pose, historical) {
        this.lenses.forEach(lens => {
            this.addPointToHistoryLine(lens, pose, historical, true);
        });
    }

    /**
     * Updates the history lines with the given bulk poses
     * @param {Pose[]} poses - the poses to be added
     * @param {boolean} historical - whether the pose is historical or live
     */
    bulkUpdateHistoryLines(poses, historical) {
        const updatedHistoryLines = [];
        this.lenses.forEach(lens => {
            poses.forEach(pose => {
                const updatedHistoryLine = this.addPointToHistoryLine(lens, pose, historical, false);
                if (!updatedHistoryLines.includes(updatedHistoryLine)) {
                    updatedHistoryLines.push(updatedHistoryLine);
                }
            });
        });
        updatedHistoryLines.forEach(historyLine => {
            historyLine.setAllPoints(historyLine.currentPoints);
        });
    }

    /**
     * Adds a poseRenderInstance's point to the history line's points for the given lens, updating the history line if desired
     * @param {AnalyticsLens} lens - the lens to add the point with
     * @param {Pose} pose - the pose to add the point from
     * @param {boolean} historical - whether the pose is historical or live
     * @param {boolean} shouldUpdate - whether to update the history line to reflect the changes immediately
     * @return {SpaghettiMeshPath} - the history line that was updated
     */
    addPointToHistoryLine(lens, pose, historical, shouldUpdate) {
        const timestamp = pose.timestamp;
        const id = pose.metadata.poseObjectId;
        let currentPoint = pose.getJoint(JOINTS.HEAD).position.clone();
        currentPoint.y += 400;
        if (!this.historyLines[lens.name].all.hasOwnProperty(id)) {
            this.createHistoryLine(lens, id, historical);
        }
        let historyLine = this.historyLines[lens.name].all[id];
        // Split spaghetti line if we jumped by a large amount
        if (historyLine.currentPoints.length > 0) {
            const lastPoint = historyLine.currentPoints[historyLine.currentPoints.length - 1];
            const lastPointVector = new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z);
            if (lastPointVector.distanceToSquared(currentPoint) > 800 * 800) {
                this.historyLines[lens.name].all[id + '-until-' + timestamp] = historyLine;
                if (historical) {
                    this.historyLines[lens.name].historical[id + '-until-' + timestamp] = historyLine;
                } else {
                    this.historyLines[lens.name].live[id + '-until-' + timestamp] = historyLine;
                }
                historyLine = this.createHistoryLine(lens, id, historical);
            }
        }

        const color = lens.getColorForPose(pose);

        /** @type {SpaghettiMeshPathPoint} */
        let historyPoint = {
            x: currentPoint.x,
            y: currentPoint.y,
            z: currentPoint.z,
            color,
            timestamp,
        };

        historyLine.currentPoints.push(historyPoint);
        if (shouldUpdate) {
            historyLine.setPoints(historyLine.currentPoints);
        }
        
        return historyLine;
    }

    /**
     * Creates a history line using a given lens
     * Side effect: adds the history line to the appropriate historyLineContainer and historyLines
     * @param {AnalyticsLens} lens - the lens to use for the history line
     * @param {string} id - key for historyLines
     * @param {boolean} historical - whether the history line is historical or live
     */
    createHistoryLine(lens, id, historical) {
        const historyLine = new SpaghettiMeshPath([], {
            widthMm: 30,
            heightMm: 30,
            usePerVertexColors: true,
            wallBrightness: 0.6,
        });

        this.historyLines[lens.name].all[id] = historyLine;
        if (historical) {
            this.historyLineContainers.historical[lens.name].add(historyLine);
            this.historyLines[lens.name].historical[id] = historyLine;
        } else {
            this.historyLineContainers.live[lens.name].add(historyLine);
            this.historyLines[lens.name].live[id] = historyLine;
        }
        return historyLine;
    }

    /**
     * Clears all historical data
     */
    clearHistoricalData() {
        this.resetHistoricalHistoryLines();
        this.resetHistoricalHistoryClones();
        this.resetHistoricalPoseRenderers();
        this.lenses.forEach(lens => {
            lens.reset();
        })
    }

    /**
     * Clears all historical history lines
     */
    resetHistoricalHistoryLines() {
        this.lenses.forEach(lens => {
            Object.keys(this.historyLines[lens.name].historical).forEach(key => {
                const historyLine = this.historyLines[lens.name].historical[key];
                historyLine.resetPoints();
                if (historyLine.parent) {
                    historyLine.parent.remove(historyLine);
                }
                delete this.historyLines[lens.name].all[key];
            });
            this.historyLines[lens.name].historical = {};
        });
    }

    /**
     * Clears all live history lines
     */
    resetLiveHistoryLines() {
        this.lenses.forEach(lens => {
            Object.keys(this.historyLines[lens.name].live).forEach(key => {
                const historyLine = this.historyLines[lens.name].live[key];
                historyLine.resetPoints();
                historyLine.parent.remove(historyLine);
                delete this.historyLines[lens.name].all[key];
            });
            this.historyLines[lens.name].live = {};
        });
    }

    /**
     * Clears all historical history clones
     */
    resetHistoricalHistoryClones() {
        this.clones.historical.forEach(clone => {
            if (this.lastDisplayedClone === clone) {
                this.lastDisplayedClone = null;
            }
            clone.remove();
            this.clones.all.splice(this.clones.all.indexOf(clone), 1);
        });
        this.clones.historical = [];
        this.markHistoricalMatrixNeedsUpdate();
        this.markHistoricalColorNeedsUpdate();
    }

    /**
     * Clears all live history clones
     */
    resetLiveHistoryClones() {
        this.clones.live.forEach(clone => {
            if (this.lastDisplayedClone === clone) {
                this.lastDisplayedClone = null;
            }
            clone.remove();
            this.clones.all.splice(this.clones.all.indexOf(clone), 1);
        });
        this.clones.live = [];
        this.markHistoricalMatrixNeedsUpdate();
    }

    /**
     * Sets the active lens
     * @param {AnalyticsLens} lens - the lens to set as active
     */
    setActiveLens(lens) {
        this.activeLensIndex = this.lenses.indexOf(lens);
        this.applyCurrentLensToHistory();
        
        // Swap hpri colors
        this.clones.all.forEach(clone => {
            clone.setLens(lens);
            clone.renderer.markColorNeedsUpdate();
        });
        
        // Swap history lines
        this.lenses.forEach(l => {
            this.historyLineContainers.historical[l.name].visible = false;
            this.historyLineContainers.live[l.name].visible = false;
        });
        this.historyLineContainers.historical[lens.name].visible = true;
        this.historyLineContainers.live[lens.name].visible = true;

        // Update UI
        if (this.settingsUi) {
            this.settingsUi.setActiveLens(lens);
        }
    }

    /**
     * Sets the active lens by name
     * @param {string} lensName - the name of the lens to set as active
     */
    setActiveLensByName(lensName) {
        const lens = this.lenses.find(lens => lens.name === lensName);
        this.setActiveLens(lens);
    }

    /**
     * Sets the active joint by name
     * @param {string} jointName - the name of the joint to set as active
     */
    setActiveJointByName(jointName) {
        this.activeJointName = jointName;
        if (this.settingsUi) {
            this.settingsUi.setActiveJointByName(jointName);
        }
        // TODO: Create history line for joint
    }

    /**
     * Sets the active joint
     * @param {Object} joint - the joint to set as active
     */
    setActiveJoint(joint) {
        this.setActiveJointByName(joint.name);
    }

    /**
     * Sets the interval which controls what history is highlighted
     * @param {TimeRegion} highlightRegion - the time region to highlight
     * @param {boolean} fromSpaghetti - whether a history mesh originated this change
     */
    setHighlightRegion(highlightRegion, fromSpaghetti) {
        if (!highlightRegion) {
            return;
        }
        if (this.animationMode !== AnimationMode.region &&
            this.animationMode !== AnimationMode.regionAll) {
            this.setAnimationMode(AnimationMode.region);
        }
        this.setAnimationRange(highlightRegion.startTime, highlightRegion.endTime);
        if (!fromSpaghetti) {
            for (let mesh of Object.values(this.historyLines[this.activeLens.name].all)) {
                mesh.setHighlightRegion(highlightRegion);
            }
        }
    }

    /**
     * Sets the interval which controls what history is displayed, hides history outside of the interval
     * @param {TimeRegion} displayRegion - the time region to display
     */
    setDisplayRegion(displayRegion) {
        const firstTimestamp = displayRegion.startTime;
        const secondTimestamp = displayRegion.endTime;
        
        for (let historyLine of Object.values(this.historyLines[this.activeLens.name].historical)) { // This feature only enabled for historical history lines
            if (historyLine.getStartTime() > secondTimestamp || historyLine.getEndTime() < firstTimestamp) {
                historyLine.visible = false;
                return;
            }
            historyLine.visible = true;
            historyLine.setDisplayRegion(displayRegion);
        }
    }

    /**
     * Sets the hover time for the relevant history line
     * @param {number} timestamp - timestamp in ms
     * @param {boolean} fromSpaghetti - prevents infinite recursion from modifying human pose spaghetti which calls
     * this function
     */
    setCursorTime(timestamp, fromSpaghetti) {
        if (timestamp < 0) {
            if (this.animationMode === AnimationMode.cursor) {
                this.restoreAnimationState();
            }
            return;
        }
        for (let mesh of Object.values(this.historyLines[this.activeLens.name].all)) {
            if (mesh.getStartTime() > timestamp || mesh.getEndTime() < timestamp) {
                continue;
            }
            if (!fromSpaghetti) {
                mesh.setCursorTime(timestamp);
            }
            if (this.animationMode !== AnimationMode.cursor) {
                this.setAnimationMode(AnimationMode.cursor);
            }
            this.hideLastDisplayedClone();
            this.lastDisplayedClone = null;
            this.displayCloneByTimestamp(timestamp);
        }
    }

    /**
     * Sets all poses in the time interval
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     * @return {Pose[]} - all poses in the time interval
     */
    getPosesInTimeInterval(firstTimestamp, secondTimestamp) {
        const poses = this.clones.all.map(clone => clone.pose).filter(pose => pose.timestamp >= firstTimestamp && pose.timestamp <= secondTimestamp);
        poses.sort((a, b) => a.timestamp - b.timestamp);
        return poses;
    }

    /**
     * Makes the historical history lines visible or invisible
     * @param {boolean} visible - whether to show the history lines
     */
    setHistoricalHistoryLinesVisible(visible) {
        this.historicalHistoryLineContainer.visible = visible;
        this.settingsUi.setHistoricalHistoryLinesVisible(visible);
    }

    /**
     * Makes the live history lines visible or invisible
     * @param {boolean} visible - whether to show the history lines
     */
    setLiveHistoryLinesVisible(visible) {
        this.liveHistoryLineContainer.visible = visible;
        this.settingsUi.setLiveHistoryLinesVisible(visible);
    }

    /**
     * Gets the visibility of the historical history lines
     * @return {boolean} - whether the historical history lines are visible
     */
    getHistoricalHistoryLinesVisible() {
        return this.historicalHistoryLineContainer.visible;
    }

    /**
     * Gets the visibility of the live history lines
     * @return {boolean} - whether the live history lines are visible
     */
    getLiveHistoryLinesVisible() {
        return this.liveHistoryLineContainer.visible;
    }

    /**
     * Gets the visibility of the history lines
     * @return {boolean} - whether the history lines are visible
     * @deprecated
     * @see getLiveHistoryLinesVisible
     * @see getHistoricalHistoryLinesVisible
     */
    getHistoryLinesVisible() {
        console.warn('getHistoryLinesVisible is deprecated. Use getLiveHistoryLinesVisible or getHistoricalHistoryLinesVisible instead.');
        return this.getLiveHistoryLinesVisible();
    }

    /**
     * Advances the active lens to the next one
     */
    advanceLens() {
        this.nextLensIndex = (this.activeLensIndex + 1) % this.lenses.length;
        this.setActiveLens(this.lenses[this.nextLensIndex]);
    }
    
    /**
     * Applies the current lens to the history, updating the clones' colors if needed
     */
    applyCurrentLensToHistory() {
        [this.clones.live, this.clones.historical].forEach(relevantClones => {
            const posesChanged = this.activeLens.applyLensToHistory(relevantClones.map(clone => clone.pose));
            posesChanged.forEach((wasChanged, index) => {
                if (wasChanged) { // Only update colors if the pose data was modified
                    relevantClones[index].updateColorBuffers(this.activeLens);
                }
            }); 
        });
    }

    /**
     * Sets the animation mode for rendering clones
     * @param {AnimationMode} animationMode - the animation mode to set
     */
    setAnimationMode(animationMode) {
        if (this.animationMode === animationMode) {
            return;
        }
        if (animationMode === AnimationMode.cursor) {
            this.saveAnimationState();
        }
        
        this.animationMode = animationMode;
        
        if (this.clones.all.length === 0) {
            return;
        }

        if (this.animationMode === AnimationMode.all) {
            for (let clone of this.clones.all) {
                clone.setVisible(true);
                clone.renderer.markMatrixNeedsUpdate();
            }
            return;
        }

        if (this.animationMode === AnimationMode.cursor || this.animationMode === AnimationMode.region) {
            for (let clone of this.clones.all) {
                clone.setVisible(false);
                clone.renderer.markMatrixNeedsUpdate();
            }
        }

        if (this.animationMode === AnimationMode.regionAll) {
            this.setHistoricalPoseRenderersOpacity(POSE_OPACITY_BACKGROUND);
        } else {
            this.setHistoricalPoseRenderersOpacity(POSE_OPACITY_BASE);
            this.selectionMarkPoseRenderInstances.start.setVisible(false);
            this.selectionMarkPoseRenderInstances.start.renderer.markNeedsUpdate();
            this.selectionMarkPoseRenderInstances.end.setVisible(false);
            this.selectionMarkPoseRenderInstances.end.renderer.markNeedsUpdate();
        }
    }

    /**
     * Saves the animation state while in the temporary cursor mode
     */
    saveAnimationState() {
        this.prevAnimationState = {
            animationMode: this.animationMode,
            animationStart: this.animationStart,
            animationEnd: this.animationEnd,
        };
    }

    /**
     * Resets to the saved animation state after exiting the temporary cursor mode
     */
    restoreAnimationState() {
        if (!this.prevAnimationState) {
            return;
        }
        this.setAnimationMode(this.prevAnimationState.animationMode);
        this.setAnimationRange(
            this.prevAnimationState.animationStart,
            this.prevAnimationState.animationEnd);
        this.prevAnimationState = null;
    }

    setHistoricalPoseRenderersOpacity(opacity) {
        for (let hpr of this.historicalPoseRenderers) {
            if (hpr.material.opacity !== opacity) {
                hpr.material.opacity = opacity;
            }
        }
    }

    /**
     * Marks the historical pose renderers as needing a color update
     */
    markHistoricalColorNeedsUpdate() {
        for (let hpr of this.historicalPoseRenderers) {
            hpr.markColorNeedsUpdate();
        }
    }

    /**
     * Marks the historical pose renderers as needing a matrix update
     */
    markHistoricalMatrixNeedsUpdate() {
        for (let hpr of this.historicalPoseRenderers) {
            hpr.markMatrixNeedsUpdate();
        }
    }

    /**
     * Marks the historical pose renderers as needing both a color and a matrix update
     */
    markHistoricalNeedsUpdate() {
        for (let hpr of this.historicalPoseRenderers) {
            hpr.markNeedsUpdate();
        }
    }

    /**
     * Sets the animation range, updating the animation position if necessary
     * @param {number} start - start time of animation in ms
     * @param {number} end - end time of animation in ms
     */
    setAnimationRange(start, end) {
        if (this.animationStart === start && this.animationEnd === end) {
            return;
        }

        switch (this.animationMode) {
        case AnimationMode.region:
            // Fully reset the animation when changing
            this.hideLastDisplayedClone();
            this.lastDisplayedClone = null;
            break;
        case AnimationMode.regionAll: {
            this.hideAllClones();
            this.setCloneVisibleInInterval(true, start, end);
            const startClone = this.getCloneByTimestamp(start);
            if (startClone) {
                this.selectionMarkPoseRenderInstances.start.copy(startClone);
                this.selectionMarkPoseRenderInstances.start.setVisible(true);
                this.selectionMarkPoseRenderInstances.start.renderer.markNeedsUpdate();
            }
            const endClone = this.getCloneByTimestamp(end);
            if (endClone) {
                this.selectionMarkPoseRenderInstances.end.copy(endClone);
                this.selectionMarkPoseRenderInstances.end.setVisible(true);
                this.selectionMarkPoseRenderInstances.end.renderer.markNeedsUpdate();
            }
        }
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
        let progressClamped = (progress + animationDuration) % animationDuration; // adding animationDuration to avoid negative modulo
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
        this.hideLastDisplayedClone();
    }

    /**
     * Displays or hides all clones in a given range
     * @param {boolean} visible - whether to show or hide the clones
     * @param {number} start - start time of animation in ms
     * @param {number} end - end time of animation in ms
     */
    setCloneVisibleInInterval(visible, start, end) {
        if (start < 0 || end < 0 ||
            this.clones.all.length < 0) {
            return;
        }

        for (let i = 0; i < this.clones.all.length; i++) {
            let clone = this.clones.all[i];
            if (clone.pose.timestamp < start) {
                continue;
            }
            if (clone.pose.timestamp > end) {
                break;
            }
            if (clone.visible === visible) {
                continue;
            }
            clone.renderer.markMatrixNeedsUpdate();
            clone.setVisible(visible);
        }
    }

    /**
     * Displays all clones
     */
    showAllClones() {
        this.clones.all.forEach(clone => {
            clone.setVisible(true);
            clone.renderer.markMatrixNeedsUpdate();
        });
    }

    /**
     * Hides all clones
     */
    hideAllClones() {
        this.clones.all.forEach(clone => {
            clone.setVisible(false);
            clone.renderer.markMatrixNeedsUpdate();
        });
    }

    /**
     * Hides the current single displayed clone
     */
    hideLastDisplayedClone() {
        if (this.lastDisplayedClone) {
            this.lastDisplayedClone.setVisible(false);
            this.lastDisplayedClone.renderer.markMatrixNeedsUpdate();
        }
    }

    /**
     * Displays the clone with the closest timestamp to the given timestamp
     * @param {number} timestamp - the timestamp to display
     */
    displayCloneByTimestamp(timestamp) {
        if (this.animationMode === AnimationMode.all || this.animationMode === AnimationMode.regionAll) { // Don't do anything if we're rendering all clones
            return;
        }

        if (this.clones.all.length < 2) {
            return;
        }

        const bestClone = this.getCloneByTimestamp(timestamp);
        if (!bestClone) {
            this.hideLastDisplayedClone();
            this.lastDisplayedClone = null;
            return;
        }

        if (this.lastDisplayedClone !== bestClone) {
            this.hideLastDisplayedClone();
            this.lastDisplayedClone = bestClone;
            bestClone.setVisible(true);
            bestClone.renderer.markMatrixNeedsUpdate();
        }
    }

    /**
     * Returns the clone with the closest timestamp to the given timestamp
     * @param {number} timestamp - time in ms
     * @return {HumanPoseRenderInstance} - the clone with the closest timestamp
     */
    getCloneByTimestamp(timestamp) {
        if (this.clones.all.length < 2) {
            return null;
        }

        let bestClone = null;
        let distance = 0;

        // Dan: This used to be more optimized, but required a sorted array of clones, which we don't have when mixing historical and live data (could be added though)
        for (let i = 0; i < this.clones.all.length; i++) {
            if (!bestClone) {
                bestClone = this.clones.all[i];
                distance = Math.abs(bestClone.pose.timestamp - timestamp);
                continue;
            }
            let clone = this.clones.all[i];
            let cloneDistance = Math.abs(clone.pose.timestamp - timestamp);
            if (cloneDistance < distance) {
                bestClone = clone;
                distance = cloneDistance;
            }
        }
        return bestClone;
    }
}

/**
 * @typedef {Object} HumanPoseObject
 * @property {Pose} pose - the pose
 * @property {string} uuid - the uuid of the poseObject
 * @property {string} id - the id of the poseObject
 * @property {number[]} matrix - the matrix of the poseObject
 * @property {Object} frames - the frames of the poseObject
 */

/**
 * Processes the given historical poses and renders them efficiently
 * @param {Pose[]}  poses - the poses to render
 * @param {Object3D} container - the container to place the HumanPoseRenderers into
 */
function bulkRenderHistoricalPoses(poses, container) {
    if (realityEditor.gui.poses.isPose2DSkeletonRendered()) return;
    if (!humanPoseAnalyzer) {
        humanPoseAnalyzer = new HumanPoseAnalyzer(container);
    }
    poses.forEach(pose => {
        if (realityEditor.analytics) {
            realityEditor.analytics.appendPose({
                time: pose.timestamp,
            });
        }
    });
    humanPoseAnalyzer.bulkHistoricalPosesUpdated(poses);
}

/**
 * Processes the poseObject given and renders them into the corresponding poseRenderInstances
 * @param {HumanPoseObject[]} poseObjects - the poseObjects to render
 * @param {number} timestamp - the timestamp of the poseObjects
 * @param {Object3D} container - the container to place the HumanPoseRenderers into
 */
function renderLiveHumanPoseObjects(poseObjects, timestamp, container) {
    if (realityEditor.gui.poses.isPose2DSkeletonRendered()) return;
    
    if (!humanPoseAnalyzer) {
        humanPoseAnalyzer = new HumanPoseAnalyzer(container);
    }

    for (let poseObject of poseObjects) {
        updatePoseRenderer(poseObject, timestamp);
    }
    humanPoseAnalyzer.getLivePoseRenderer().markNeedsUpdate();
}

let hidePoseRenderInstanceTimeoutIds = {};
/**
 * Hides the pose render instance if not used for a while
 * @param {HumanPoseRenderInstance} poseRenderInstance - the pose render instance to hide
 */
function hidePoseRenderInstance(poseRenderInstance) {
    poseRenderInstance.setVisible(false);
    poseRenderInstance.renderer.markNeedsUpdate();
}

/**
 * Updates the corresponding poseRenderer with the poseObject given
 * @param {HumanPoseObject} poseObject - the poseObject to render
 * @param {number} timestamp - the timestamp of when the poseObject was recorded
 */
function updatePoseRenderer(poseObject, timestamp) {
    let renderer = humanPoseAnalyzer.opaquePoseRenderer;
    const identifier = poseObject.uuid;
    if (!poseRenderInstances[identifier]) {
        poseRenderInstances[identifier] = new HumanPoseRenderInstance(renderer, identifier, humanPoseAnalyzer.activeLens);
    }
    let poseRenderInstance = poseRenderInstances[identifier];
    updateJointsAndBones(poseRenderInstance, poseObject, timestamp);
    if (hidePoseRenderInstanceTimeoutIds[poseRenderInstance.id]) {
        clearTimeout(hidePoseRenderInstanceTimeoutIds[poseRenderInstance.id]);
        hidePoseRenderInstanceTimeoutIds[poseRenderInstance.id] = null;
    }
    hidePoseRenderInstanceTimeoutIds[poseRenderInstance.id] = setTimeout(() => hidePoseRenderInstance(poseRenderInstance), 1000);
}

/**
 * Updates the pose renderer with the current pose data
 * @param {HumanPoseRenderInstance} poseRenderInstance - the pose renderer to update
 * @param {HumanPoseObject} poseObject - the pose object to get the data from
 * @param {number} timestamp - when the pose was recorded
 */
function updateJointsAndBones(poseRenderInstance, poseObject, timestamp) {
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
            poseRenderInstance.setJointConfidenceColor(jointId, confidence);
        }
    }

    const pose = new Pose(jointPositions, timestamp, {poseObjectId: poseObject.uuid});
    humanPoseAnalyzer.activeLens.applyLensToPose(pose);
    poseRenderInstance.setPose(pose);
    poseRenderInstance.setLens(humanPoseAnalyzer.activeLens);
    poseRenderInstance.setVisible(true);
    poseRenderInstance.renderer.markNeedsUpdate();

    humanPoseAnalyzer.poseUpdated(pose, false);
    if (realityEditor.analytics) {
        realityEditor.analytics.appendPose({
            time: timestamp,
        });
    }
}

/**
 * Resets the HumanPoseAnalyzer's live history lines
 */
function resetLiveHistoryLines() {
    humanPoseAnalyzer.resetLiveHistoryLines();
}

/**
 * Resets the HumanPoseAnalyzer's live history lines
 * @deprecated
 * @see resetLiveHistoryLines
 */
function resetHistoryLines() {
    console.warn('resetHistoryLines is deprecated, use resetLiveHistoryLines instead');
    resetLiveHistoryLines();
}

/**
 * Resets the HumanPoseAnalyzer's live history clones
 */
function resetLiveHistoryClones() {
    humanPoseAnalyzer.resetLiveHistoryClones();
}

/**
 * Resets the HumanPoseAnalyzer's live history clones
 * @deprecated
 * @see resetLiveHistoryClones
 */
function resetHistoryClones() {
    console.warn('resetHistoryClones is deprecated, use resetLiveHistoryClones instead');
    resetLiveHistoryClones();
}

/**
 * Sets the time interval to highlight on the HumanPoseAnalyzer
 * @param {TimeRegion} highlightRegion
 * @param {boolean} fromSpaghetti - whether a history mesh originated this call
 */
function setHighlightRegion(highlightRegion, fromSpaghetti) {
    humanPoseAnalyzer.setHighlightRegion(highlightRegion, fromSpaghetti);
}

/**
 * Gets the poses that are within the given time interval
 * @param {number} firstTimestamp - start of time interval in ms
 * @param {number} secondTimestamp - end of time interval in ms
 * @return {Pose[]} - the poses that are within the given time interval
 */
function getPosesInTimeInterval(firstTimestamp, secondTimestamp) {
    return humanPoseAnalyzer.getPosesInTimeInterval(firstTimestamp, secondTimestamp);
}

/**
 * Sets the visibility of the historical history lines
 * @param {boolean} visible - whether to show the historical history lines
 */
function setHistoricalHistoryLinesVisible(visible) {
    humanPoseAnalyzer.setHistoricalHistoryLinesVisible(visible);
}

/**
 * Sets the visibility of the live history lines
 * @param {boolean} visible - whether to show the live history lines
 */
function setLiveHistoryLinesVisible(visible) {
    humanPoseAnalyzer.setLiveHistoryLinesVisible(visible);
}

/**
 * Resets the HumanPoseAnalyzer's historical data
 */
function clearHistoricalData() {
    humanPoseAnalyzer.clearHistoricalData();
    historicalPoseRenderInstanceList.forEach((poseRenderInstance) => {
        poseRenderInstance.remove();
        delete poseRenderInstances[poseRenderInstance.id];
    });
    historicalPoseRenderInstanceList = [];
}

/**
 * @param {AnimationMode} animationMode
 */
function setAnimationMode(animationMode) {
    humanPoseAnalyzer.setAnimationMode(animationMode);
}

/**
 * Sets the clone rendering mode // TODO: not in use, remove?
 * @param {boolean} enabled - whether to render all clones or just one
 */
function setRecordingClonesEnabled(enabled) {
    if (enabled) {
        humanPoseAnalyzer.setAnimationMode(AnimationMode.all);
    } else {
        humanPoseAnalyzer.setAnimationMode(AnimationMode.cursor);
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
 * @param {boolean} fromSpaghetti - prevents infinite recursion from modifying human pose spaghetti which calls this
 * function
 */
function setCursorTime(time, fromSpaghetti) {
    humanPoseAnalyzer.setCursorTime(time, fromSpaghetti);
}

/** @typedef {Object} TimeRegion
 * @property {number} startTime - start of time interval in ms
 * @property {number} endTime - end of time interval in ms
 */

/**
 * Sets the time interval to display on the HumanPoseAnalyzer
 * @param {TimeRegion} displayRegion - the time interval to display
 */
function setDisplayRegion(displayRegion) {
    humanPoseAnalyzer.setDisplayRegion(displayRegion);
}

/**
 * Finalize historical renderer matrices after loading them from
 * history logs
 */
function finishHistoryPlayback() {
    humanPoseAnalyzer.markHistoricalColorNeedsUpdate();
}

/**
 * Shows the HumanPoseAnalyzer's settings UI
 */
function showAnalyzerSettingsUI() {
    humanPoseAnalyzer.settingsUi.show();
}

/**
 * Hides the HumanPoseAnalyzer's settings UI
 */
function hideAnalyzerSettingsUI() {
    humanPoseAnalyzer.settingsUi.hide();
}

/**
 * Toggles the HumanPoseAnalyzer's settings UI
 */
function toggleAnalyzerSettingsUI() {
    humanPoseAnalyzer.settingsUi.toggle();
}

// TODO: Remove deprecated API use
export {
    bulkRenderHistoricalPoses,
    renderLiveHumanPoseObjects,
    resetLiveHistoryLines,
    resetHistoryLines,
    resetLiveHistoryClones,
    resetHistoryClones,
    setAnimationMode,
    setCursorTime,
    setHighlightRegion,
    setDisplayRegion,
    setLiveHistoryLinesVisible,
    setHistoricalHistoryLinesVisible,
    clearHistoricalData,
    setRecordingClonesEnabled,
    advanceLens,
    advanceCloneMaterial,
    getPosesInTimeInterval,
    finishHistoryPlayback,
    showAnalyzerSettingsUI,
    hideAnalyzerSettingsUI,
    toggleAnalyzerSettingsUI,
};
