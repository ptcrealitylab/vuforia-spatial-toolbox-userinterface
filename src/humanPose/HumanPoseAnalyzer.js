import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {JOINTS, JOINT_CONFIDENCE_THRESHOLD} from './constants.js';
import {Spaghetti} from './spaghetti.js';
import {RebaLens} from "./RebaLens.js";
import {OverallRebaLens} from "./OverallRebaLens.js";
import {ValueAddWasteTimeLens} from "./ValueAddWasteTimeLens.js";
import {AccelerationLens} from "./AccelerationLens.js";
import {PoseObjectIdLens} from "./PoseObjectIdLens.js";

import {HumanPoseAnalyzerSettingsUi} from "./HumanPoseAnalyzerSettingsUi.js";
import {HumanPoseRenderer} from './HumanPoseRenderer.js';
import {HumanPoseRenderInstance} from './HumanPoseRenderInstance.js';
import {MAX_POSE_INSTANCES, MAX_POSE_INSTANCES_MOBILE} from './constants.js';
import {AnimationMode} from './draw.js';
import {Animation} from './Animation.js';

const POSE_OPACITY_BASE = 1;
const POSE_OPACITY_BACKGROUND = 0.2;

export class HumanPoseAnalyzer {
    /**
     * Creates a new HumanPoseAnalyzer
     * @param {Object3D} parent - container to add the analyzer's containers to
     */
    constructor(motionStudy, parent) {
        this.motionStudy = motionStudy;
        this.animation = null;

        this.setupContainers(parent);

        this.rebaLens = new RebaLens();
        this.overallRebaLens = new OverallRebaLens();
        this.valueAddWasteTimeLens = new ValueAddWasteTimeLens(this.motionStudy);
        this.accelerationLens = new AccelerationLens();
        this.poseObjectIdLens = new PoseObjectIdLens();
        
        /** @type {MotionStudyLens[]} */
        this.lenses = [
            this.rebaLens,
            this.overallRebaLens,
            this.valueAddWasteTimeLens,
            this.accelerationLens,
            this.poseObjectIdLens
        ]
        this.activeLensIndex = 0;

        this.activeJointName = ""; // Used in the UI
        this.poseRenderInstances = {};

        // auxiliary human objects supporting fused human objects
        this.childHumanObjectsVisible = false;

        this.jointConfidenceThreshold = JOINT_CONFIDENCE_THRESHOLD;

        this.historyLines = {}; // Dictionary of {lensName: {(all | historical | live): Spaghetti}}, separated by historical and live
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
        this.lastDisplayedClones = [];

        this.prevAnimationState = null;
        this.animationMode = AnimationMode.region;

        const maxPoseInstances = realityEditor.device.environment.isDesktop() ?
            MAX_POSE_INSTANCES :
            MAX_POSE_INSTANCES_MOBILE;

        // The renderer for poses that need to be rendered opaquely
        this.opaquePoseRenderer = new HumanPoseRenderer(new THREE.MeshBasicMaterial(), maxPoseInstances);
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

    get active() {
      return realityEditor.motionStudy.getActiveHumanPoseAnalyzer() === this;
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
        this.settingsUi.setChildHumanPosesVisible(this.childHumanObjectsVisible);
        this.settingsUi.setJointConfidenceFilter(true);
        //this.settingsUi.setJointConfidenceThreshold(this.jointConfidenceThreshold);
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
        this.poseRenderInstances = {};
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
        const maxPoseInstances = realityEditor.device.environment.isDesktop() ?
            MAX_POSE_INSTANCES :
            MAX_POSE_INSTANCES_MOBILE;
        const livePoseRenderer = new HumanPoseRenderer(new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: POSE_OPACITY_BASE,
        }), maxPoseInstances);
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
        let anySpaghettiHovered = false;
        for (let spaghetti of Object.values(this.historyLines[this.activeLens.name].all)) {
            if (spaghetti.cursorIndex !== -1) {
                anySpaghettiHovered = true;
            }
        }
        if (!anySpaghettiHovered) {
            if (this.animationMode === AnimationMode.cursor) {
                this.restoreAnimationState();
            } else if (this.animationMode === AnimationMode.region) {
                this.updateAnimation();
            }
        }

        window.requestAnimationFrame(this.update);
    }

    /**
     * Processes new poses being added to the HumanPoseRenderer
     * @param {Pose} pose - the pose renderer that was updated
     * @param {boolean} historical - whether the pose is historical or live
     */
    poseUpdated(pose, historical) {
        if (this.recordingClones || historical) {
            this.addCloneFromPose(pose, historical);
        }
        if(!pose.metadata.poseHasParent) {
            // add to spaghetti non-auxiliary poses
            this.updateSpaghetti(pose, historical);
        }
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
        this.bulkUpdateSpaghetti(poses, true);
    }

    /**
     * Creates a new clone from a pose and adds it to the analyzer
     * @param {Pose} pose - the pose to clone
     * @param {boolean} historical - whether the pose is historical or live
     */
    addCloneFromPose(pose, historical) {
        const poseRenderer = historical ? this.getHistoricalPoseRenderer() : this.getLivePoseRenderer();
        const instanceId = `${pose.timestamp}-${pose.metadata.poseObjectId}`;
        if (!this.poseRenderInstances[instanceId]) {
            this.poseRenderInstances[instanceId] = new HumanPoseRenderInstance(poseRenderer, instanceId, this.activeLens);
        }
        const poseRenderInstance = this.poseRenderInstances[instanceId];

        this.clones.all.push(poseRenderInstance);
        if (historical) {
            this.clones.historical.push(poseRenderInstance);
        } else {
            this.clones.live.push(poseRenderInstance);
        }
        
        pose.setBodyPartValidity(this.jointConfidenceThreshold); // Needs to be called before setPose(), because it sets internal attributes needed by setPose() 
        poseRenderInstance.setPose(pose); // Needs to be set before visible is set, setting a pose always makes visible at the moment
        const canBeVisible = this.childHumanObjectsVisible || !pose.metadata.poseHasParent;
        if (this.animationMode === AnimationMode.all) {
            poseRenderInstance.setVisible(canBeVisible);
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
    updateSpaghetti(pose, historical) {
        this.addPointsToSpaghetti([pose], historical);
    }

    /**
     * Updates the history lines with the given bulk poses
     * @param {Pose[]} poses - the poses to be added
     * @param {boolean} historical - whether the pose is historical or live
     */
    bulkUpdateSpaghetti(poses, historical) {
        this.addPointsToSpaghetti(poses.filter(pose => !pose.metadata.poseHasParent), historical);
    }

    /**
     * Adds a poseRenderInstance's point to the history line's points for the given lens, updating the history line if desired
     * @param {Pose[]} poses - the poses to add the points from
     * @param {boolean} historical - whether the pose is historical or live
     */
    addPointsToSpaghetti(poses, historical) {
        this.lenses.forEach(lens => {
            this.addPointsToSpaghettiForLens(lens, poses, historical);
        });
    }

    /**
     * Adds a poseRenderInstance's point to the history line's points for the given lens, updating the history line if desired
     * @param {MotionStudyLens} lens - the lens to use for the spaghetti
     * @param {Pose[]} poses - the poses to add the points from
     * @param {boolean} historical - whether the pose is historical or live
     */
    addPointsToSpaghettiForLens(lens, poses, historical) {
        const pointsById = {};
        poses.forEach(pose => {
            const timestamp = pose.timestamp;
            const id = pose.metadata.poseObjectId;
            let currentPoint = pose.getJoint(JOINTS.HEAD).position.clone();
            currentPoint.y += 400; // mm
            if (!this.historyLines[lens.name].all.hasOwnProperty(id)) {
                this.createSpaghetti(lens, id, historical);
            }

            const color = lens.getColorForPose(pose);

            /** @type {SpaghettiMeshPathPoint} */
            const historyPoint = {
                x: currentPoint.x,
                y: currentPoint.y,
                z: currentPoint.z,
                color,
                timestamp,
            };
            if (!pointsById[id]) {
                pointsById[id] = [historyPoint];
            } else {
                pointsById[id].push(historyPoint);
            }
        });

        Object.keys(pointsById).forEach(id => {
            const spaghetti = this.historyLines[lens.name].all[id];
            spaghetti.addPoints(pointsById[id]);
        });
    }

    /**
     * Resets spaghetti info with updated lens colors
     * @param {MotionStudyLens} lens - the lens to use for the spaghetti
     */
    reprocessSpaghettiForLens(lens) {
        const livePoses = this.clones.live.map(clone => clone.pose);
        const historicalPoses = this.clones.historical.map(clone => clone.pose);

        Object.values(this.historyLines[lens.name].all).forEach(spaghetti => {
            spaghetti.resetPoints();
        });
        this.addPointsToSpaghettiForLens(lens, livePoses, false);
        this.addPointsToSpaghettiForLens(lens, historicalPoses, true);
    }

    /**
     * Creates a spaghetti line using a given lens
     * Side effect: adds the spaghetti line to the appropriate historyLineContainer and historyLines
     * @param {MotionStudyLens} lens - the lens to use for the spaghetti
     * @param {string} id - key for spaghettis (the pose object id)
     * @param {boolean} historical - whether the spaghetti is historical or live
     * @return {Spaghetti} - the spaghetti line that was created
     */
    createSpaghetti(lens, id, historical) {
        const motionStudy = this.motionStudy;
        const spaghetti = new Spaghetti([], motionStudy, `spaghetti-${id}-${lens.name}-${historical ? 'historical' : 'live'}`, {
            widthMm: 30,
            heightMm: 30,
            usePerVertexColors: true,
            wallBrightness: 0.6,
        });

        this.historyLines[lens.name].all[id] = spaghetti;
        if (historical) {
            this.historyLineContainers.historical[lens.name].add(spaghetti);
            this.historyLines[lens.name].historical[id] = spaghetti;
        } else {
            this.historyLineContainers.live[lens.name].add(spaghetti);
            this.historyLines[lens.name].live[id] = spaghetti;
        }
        return spaghetti;
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
                const spaghetti = this.historyLines[lens.name].historical[key];
                spaghetti.reset();
                if (spaghetti.parent) {
                    spaghetti.parent.remove(spaghetti);
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
                const spaghetti = this.historyLines[lens.name].live[key];
                spaghetti.reset();
                spaghetti.parent.remove(spaghetti);
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
            if (this.lastDisplayedClones.includes(clone)) {
                this.lastDisplayedClones.splice(this.lastDisplayedClones.indexOf(clone), 1);
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
            if (this.lastDisplayedClones.includes(clone)) {
                this.lastDisplayedClones.splice(this.lastDisplayedClones.indexOf(clone), 1);
            }
            clone.remove();
            this.clones.all.splice(this.clones.all.indexOf(clone), 1);
        });
        this.clones.live = [];
        this.markHistoricalMatrixNeedsUpdate();
    }

    /**
     * Reprocesses the given lens, applying it to poses and spaghetti lines
     * @param {MotionStudyLens} lens - the lens to reprocess
     */
    reprocessLens(lens) {
        [this.clones.live, this.clones.historical].forEach(relevantClones => {
            const posesChanged = lens.applyLensToHistory(relevantClones.map(clone => clone.pose));
            posesChanged.forEach((wasChanged, index) => {
                if (wasChanged) { // Only update colors if the pose data was modified
                    relevantClones[index].updateColorBuffers(lens);
                    relevantClones[index].renderer.markColorNeedsUpdate();
                }
            });
        });
        this.reprocessSpaghettiForLens(lens);
    }

    setJointConfidenceThreshold(confidence) {
        this.jointConfidenceThreshold = confidence;
        //console.info('jointConfidenceThreshold=', confidence);

        // update all poses and derived clones for visualisation
        [this.clones.live, this.clones.historical].forEach(relevantClones => {
            relevantClones.forEach(clone => clone.pose.setBodyPartValidity(this.jointConfidenceThreshold));
            // lens calculations need to be updated based on changed valid attribute of joints
            let poses = relevantClones.map(clone => clone.pose);
            this.lenses.forEach(lens => {
                // need to upate whole history, although it takes a bit of time
                lens.applyLensToHistory(poses, true /* force */); 
            });
            relevantClones.forEach(clone => {
                if (clone.visible) {
                    clone.updateJointPositions();
                    clone.updateBonePositions();
                    clone.renderer.markMatrixNeedsUpdate();
                }
                clone.updateColorBuffers(this.activeLens);
                clone.renderer.markColorNeedsUpdate();
            });
            
        }); 
        
        // update all spaghetti lines
        this.lenses.forEach(lens => {
           this.reprocessSpaghettiForLens(lens);
        });

        this.motionStudy.updateRegionCards();
    }

    getJointConfidenceThreshold() {
        return this.jointConfidenceThreshold;
    }

    /**
     * Sets the active lens
     * @param {MotionStudyLens} lens - the lens to set as active
     */
    setActiveLens(lens) {
        const previousLens = this.activeLens;

        this.activeLensIndex = this.lenses.indexOf(lens);
        this.applyCurrentLensToHistory();

        // Swap hpri colors
        // Sets lens to individual render instances
        this.clones.all.forEach(clone => {
            clone.setLens(lens);
            clone.renderer.markColorNeedsUpdate();
        });

        // Swap history lines
        this.historyLineContainers.historical[previousLens.name].visible = false;
        this.historyLineContainers.live[previousLens.name].visible = false;
        this.historyLineContainers.historical[lens.name].visible = true;
        this.historyLineContainers.live[lens.name].visible = true;

        // Update corresponding spaghettis to match previous selection state
        Object.keys(this.historyLines[previousLens.name].all).forEach(key => {
            const previousSpaghetti = this.historyLines[previousLens.name].all[key];
            const nextSpaghetti = this.historyLines[lens.name].all[key];
            previousSpaghetti.transferStateTo(nextSpaghetti);
        });

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
        // Reset animation's playing so that we default to always playing
        if (this.animation) {
            this.animation.playing = true;
        }
        if (!highlightRegion) {
            this.setAnimationMode(AnimationMode.cursor);
            if (!fromSpaghetti) {
                for (let mesh of Object.values(this.historyLines[this.activeLens.name].all)) {
                    mesh.setHighlightRegion(null);
                }
            }
            // Clear prevAnimationState because we're no longer in a
            // highlighting state
            this.prevAnimationState = null;
            this.clearAnimation();
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

        this.lenses.forEach(lens => {
            for (let spaghetti of Object.values(this.historyLines[lens.name].historical)) { // This feature only enabled for historical history lines
                spaghetti.setDisplayRegion(displayRegion);
                if (spaghetti.getStartTime() > secondTimestamp || spaghetti.getEndTime() < firstTimestamp) {
                    spaghetti.visible = false;
                    continue;
                }
                if (this.activeLens === lens) {
                    spaghetti.visible = true;
                }
            }
        });
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
        for (let spaghetti of Object.values(this.historyLines[this.activeLens.name].all)) {
            if (spaghetti.getStartTime() > timestamp || spaghetti.getEndTime() < timestamp) {
                continue;
            }
            if (!fromSpaghetti) {
                spaghetti.setCursorTime(timestamp);

                if (this.animationMode !== AnimationMode.cursor) {
                    this.setAnimationMode(AnimationMode.cursor);
                }
            }
        }
        this.displayClonesByTimestamp(timestamp);
    }

    /**
     * Returns a list of poses in the time interval, preferring the historical
     * data source where available
     * @param {number} firstTimestamp - start of time interval in ms
     * @param {number} secondTimestamp - end of time interval in ms
     * @return {Pose[]} - all poses in the time interval
     */
    getPosesInTimeInterval(firstTimestamp, secondTimestamp) {
        function getPoses(clonesList) {
            const poses = clonesList.map(clone => clone.pose).filter(pose => {
                return pose.timestamp >= firstTimestamp &&
                    pose.timestamp <= secondTimestamp;
            });
            poses.sort((a, b) => a.timestamp - b.timestamp);
            return poses;
        }

        const live = getPoses(this.clones.live);
        if (live.length > 0) {
            return live;
        }

        return getPoses(this.clones.historical);
    }

    /**
     * Makes the live human poses visible or invisible
     * @param {boolean} visible - whether to show or not
     */
    setLiveHumanPosesVisible(visible) {

        this.opaqueContainer.visible = visible;
        /*
        for (let id in this.livePoseRenderers) {
            this.livePoseRenderers[id].container.visible = visible;
        }
        */
    }

    /**
     * Makes the historical history lines visible or invisible
     * @param {boolean} visible - whether to show the history lines
     */
    setHistoricalHistoryLinesVisible(visible) {
        this.historicalHistoryLineContainer.visible = visible;
        if (this.settingsUi) {
            this.settingsUi.setHistoricalHistoryLinesVisible(visible);
        }
    }

    /**
     * Makes the live history lines visible or invisible
     * @param {boolean} visible - whether to show the history lines
     */
    setLiveHistoryLinesVisible(visible) {
        this.liveHistoryLineContainer.visible = visible;
        if (this.settingsUi) {
            this.settingsUi.setLiveHistoryLinesVisible(visible);
        }
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
                    relevantClones[index].renderer.markColorNeedsUpdate();
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
                const canBeVisible = this.childHumanObjectsVisible || !clone.pose.metadata.poseHasParent;
                clone.setVisible(canBeVisible);
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
        if (this.animationMode === AnimationMode.cursor) {
            return;
        }
        // May have not set an animation state
        if (!this.animation) {
            return;
        }

        this.prevAnimationState = {
            animationMode: this.animationMode,
            animationStart: this.animation.startTime,
            animationEnd: this.animation.endTime,
        };
    }

    /**
     * Resets to the saved animation state after exiting the temporary cursor mode
     */
    restoreAnimationState() {
        this.hideLastDisplayedClones();
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
        if (this.animation &&
            this.animation.startTime === start &&
            this.animation.endTime === end) {
            return;
        }

        switch (this.animationMode) {
        case AnimationMode.region:
            // Fully reset the animation when changing
            this.hideLastDisplayedClones();
            this.lastDisplayedClones = [];
            break;
        case AnimationMode.regionAll: {
            this.hideAllClones();
            this.setCloneVisibleInInterval(true, start, end);
            const startClone = this.getCloneByTimestamp(start);
            if (startClone) {
                this.selectionMarkPoseRenderInstances.start.copy(startClone, this.jointConfidenceThreshold);
                this.selectionMarkPoseRenderInstances.start.setVisible(true);
                this.selectionMarkPoseRenderInstances.start.renderer.markNeedsUpdate();
            }
            const endClone = this.getCloneByTimestamp(end);
            if (endClone) {
                this.selectionMarkPoseRenderInstances.end.copy(endClone, this.jointConfidenceThreshold);
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

        let cursorTime = -1;
        if (this.animation) {
            cursorTime = this.animation.cursorTime;
        }
        this.animation = new Animation(this, this.motionStudy, start, end);
        if (cursorTime > start && cursorTime < end) {
            this.animation.cursorTime = cursorTime;
        }
    }

    /**
     * Plays the current frame of the animation
     */
    updateAnimation() {
        if (!this.animation || this.animation.startTime < 0 || this.animation.endTime < 0) {
            this.clearAnimation();
            return;
        }
        const now = Date.now();
        this.animation.update(now);
    }

    /**
     * Resets the animation data and stops playback
     */
    clearAnimation() {
        if (this.animation) {
            this.animation.stopVideoPlayback();
            this.animation = null;
        }
        this.hideLastDisplayedClones();
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
            const canBeVisible = this.childHumanObjectsVisible || !clone.pose.metadata.poseHasParent;
            if (clone.visible === (visible && canBeVisible)) {
                continue;
            }
            clone.renderer.markMatrixNeedsUpdate();
            clone.setVisible(visible && canBeVisible);
        }
    }

    /**
     * Displays all clones
     */
    showAllClones() {
        this.clones.all.forEach(clone => {
            const canBeVisible = this.childHumanObjectsVisible || !clone.pose.metadata.poseHasParent;
            clone.setVisible(canBeVisible);
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
     * Hides the current displayed clones
     */
    hideLastDisplayedClones() {
        this.lastDisplayedClones.forEach(clone => {
            clone.setVisible(false);
            clone.renderer.markMatrixNeedsUpdate();
        });
    }

    /**
     * Displays the clones with the closest timestamp to the given timestamp per objectId
     * @param {number} timestamp - the timestamp to display
     */
    displayClonesByTimestamp(timestamp) {
        if (this.animationMode === AnimationMode.all || this.animationMode === AnimationMode.regionAll) { // Don't do anything if we're rendering all clones
            return;
        }

        if (this.clones.all.length < 2) {
            return;
        }

        const bestClones = this.getClonesByTimestamp(timestamp);
        if (bestClones.length === 0) {
            this.hideLastDisplayedClones();
            this.lastDisplayedClones = [];
            return;
        }

        const clonesToHide = this.lastDisplayedClones.filter(clone => !bestClones.includes(clone));
        const clonesToShow = bestClones.filter(clone => !this.lastDisplayedClones.includes(clone));

        clonesToHide.forEach(clone => {
            clone.setVisible(false);
            //clone.renderer.markMatrixNeedsUpdate();
            clone.renderer.markNeedsUpdate();
        });
        clonesToShow.forEach(clone => {
            const canBeVisible = this.childHumanObjectsVisible || !clone.pose.metadata.poseHasParent;
            clone.setVisible(canBeVisible);
            //clone.renderer.markMatrixNeedsUpdate();
            clone.renderer.markNeedsUpdate();
        });

        this.lastDisplayedClones = bestClones;
    }

    /**
     * Returns the clone with the closest timestamp to the given timestamp, independent of objectId
     * @param {number} timestamp - time in ms
     * @return {HumanPoseRenderInstance | null} - the clone with the closest timestamp
     */
    getCloneByTimestamp(timestamp) {
        if (this.clones.all.length < 2) {
            return null;
        }

        let bestClone = this.clones.all[0];
        let bestDeltaT = Math.abs(this.clones.all[0].pose.timestamp - timestamp);

        // Dan: This used to be more optimized, but required a sorted array of clones, which we don't have when mixing historical and live data (could be added though)
        for (let i = 0; i < this.clones.all.length; i++) {
            const clone = this.clones.all[i];
            if (clone.pose.metadata.poseHasParent)
                continue;
            const deltaT = Math.abs(clone.pose.timestamp - timestamp);
            if (deltaT < bestDeltaT) {
                bestClone = clone;
                bestDeltaT = deltaT;
            }
        }

        return bestClone;
    }

    /**
     * Returns the clones per objectId with the closest timestamp to the given timestamp
     * @param {number} timestamp - time in ms
     * @return {HumanPoseRenderInstance[]} - the clones with the closest timestamp per objectId
     */
    getClonesByTimestamp(timestamp) {
        if (this.clones.all.length < 2) {
            return [];
        }

        const maxDeltaT = 200; // ms, don't show clones that are more than some time interval away from the current time
        let bestData = [];

        // Dan: This used to be more optimized, but required a sorted array of clones, which we don't have when mixing historical and live data (could be added though)
        for (let i = 0; i < this.clones.all.length; i++) {
            const clone = this.clones.all[i];
            const distance = Math.abs(clone.pose.timestamp - timestamp);
            if (distance > maxDeltaT) {
                continue;
            }
            const objectId = clone.pose.metadata.poseObjectId;
            const bestDatum = bestData.find(data => data.objectId === objectId);
            if (!bestDatum) {
                bestData.push({
                    clone,
                    distance,
                    objectId
                });
            } else {
                if (distance < bestDatum.distance) {
                    bestDatum.clone = clone;
                    bestDatum.distance = distance;
                }
            }
        }
        return bestData.map(bestDatum => bestDatum.clone);
    }
}
