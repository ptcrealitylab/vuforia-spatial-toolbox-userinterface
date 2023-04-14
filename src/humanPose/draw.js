import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {
    JOINTS,
    JOINT_PUBLIC_DATA_KEYS,
    getJointNodeInfo,
    getGroundPlaneRelativeMatrix,
    setMatrixFromArray
} from './utils.js';
import {Pose} from "./Pose.js";

import {HumanPoseAnalyzer} from './HumanPoseAnalyzer.js';
import {HumanPoseRenderInstance} from './HumanPoseRenderInstance.js';
import {RENDER_CONFIDENCE_COLOR} from './constants.js';

let activeHumanPoseAnalyzer = null;
// Map from frame id to humanPoseAnalyzer
let humanPoseAnalyzers = {};
const poseRenderInstances = {};
let childHumanObjectsVisible = false;  // auxiliary human objects supporting fused human objects

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

function setActiveFrame(frameId) {
    if (!humanPoseAnalyzers[frameId]) {
        const humanPoseAnalyzer = new HumanPoseAnalyzer();
        humanPoseAnalyzers[frameId] = humanPoseAnalyzer;
    }
    if (activeHumanPoseAnalyzer) {
        activeHumanPoseAnalyzer.active = false;
    }
    activeHumanPoseAnalyzer = humanPoseAnalyzers[frameId];
    activeHumanPoseAnalyzer.active = true;
}

/**
 * Processes the given historical poses and renders them efficiently
 * @param {Pose[]}  poses - the poses to render
 */
function bulkRenderHistoricalPoses(poses) {
    if (realityEditor.gui.poses.isPose2DSkeletonRendered()) return;
    if (!activeHumanPoseAnalyzer) {
        console.error('Unable to bulkRenderHistoricalPoses, no active HPA');
        return;
    }
    poses.forEach(pose => {
        if (realityEditor.analytics) {
            realityEditor.analytics.appendPose({
                time: pose.timestamp,
            });
        }
    });
    activeHumanPoseAnalyzer.bulkHistoricalPosesUpdated(poses);
}

/**
 * Processes the poseObject given and renders them into the corresponding poseRenderInstances
 * @param {HumanPoseObject[]} poseObjects - the poseObjects to render
 * @param {number} timestamp - the timestamp of the poseObjects
 */
function renderLiveHumanPoseObjects(poseObjects, timestamp) {
    if (realityEditor.gui.poses.isPose2DSkeletonRendered()) return;

    if (!activeHumanPoseAnalyzer) {
        console.error('No active HPA');
        return;
    }

    for (let poseObject of poseObjects) {
        updatePoseRenderer(poseObject, timestamp);
    }
    activeHumanPoseAnalyzer.getLivePoseRenderer().markNeedsUpdate();
}

let hidePoseRenderInstanceTimeoutIds = {};
/**
 * Hides the pose render instance if not used for a while
 * @param {HumanPoseRenderInstance} poseRenderInstance - the pose render instance to hide
 */
function hidePoseRenderInstance(poseRenderInstance) {
    /*
    poseRenderInstance.setVisible(false); // TODO: delete the instance rather than hide, performance impact of setting up a new instance max every second is negligible
    poseRenderInstance.renderer.markNeedsUpdate();
    */
    poseRenderInstance.remove();
    poseRenderInstance.renderer.markNeedsUpdate();
    delete poseRenderInstances[poseRenderInstance.id];
}

/**
 * Updates the corresponding poseRenderer with the poseObject given
 * @param {HumanPoseObject} poseObject - the poseObject to render
 * @param {number} timestamp - the timestamp of when the poseObject was recorded
 */
function updatePoseRenderer(poseObject, timestamp) {
    if (!activeHumanPoseAnalyzer) {
        console.error('No active HPA');
        return;
    }

    let renderer = activeHumanPoseAnalyzer.opaquePoseRenderer;
    const identifier = poseObject.objectId;
    if (!poseRenderInstances[identifier]) {
        poseRenderInstances[identifier] = new HumanPoseRenderInstance(renderer, identifier, activeHumanPoseAnalyzer.activeLens);
    }
    let poseRenderInstance = poseRenderInstances[identifier];
    updateJointsAndBones(poseRenderInstance, poseObject, timestamp);
    if (hidePoseRenderInstanceTimeoutIds[poseRenderInstance.id]) {
        clearTimeout(hidePoseRenderInstanceTimeoutIds[poseRenderInstance.id]);
        hidePoseRenderInstanceTimeoutIds[poseRenderInstance.id] = null;
    }
    hidePoseRenderInstanceTimeoutIds[poseRenderInstance.id] = setTimeout(() => hidePoseRenderInstance(poseRenderInstance), 1000);
    renderer.markNeedsUpdate();
}

const mostRecentPoseByObjectId = {};

/**
 * Updates the pose renderer with the current pose data
 * @param {HumanPoseRenderInstance} poseRenderInstance - the pose renderer to update
 * @param {HumanPoseObject} poseObject - the pose object to get the data from
 * @param {number} timestamp - when the pose was recorded
 */
function updateJointsAndBones(poseRenderInstance, poseObject, timestamp) {
    let groundPlaneRelativeMatrix = getGroundPlaneRelativeMatrix();

    const jointPositions = {};
    const jointConfidences = {};

    for (const [i, jointId] of Object.values(JOINTS).entries()) {
        // assume that all sub-objects are of the form poseObject.id + joint name
        let sceneNode = realityEditor.sceneGraph.getSceneNodeById(`${poseObject.objectId}${jointId}`);

        // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
        let jointMatrixThree = new THREE.Matrix4();
        setMatrixFromArray(jointMatrixThree, sceneNode.worldMatrix);
        jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

        let jointPosition = new THREE.Vector3();
        jointPosition.setFromMatrixPosition(jointMatrixThree);

        jointPositions[jointId] = jointPosition;

        let keys = getJointNodeInfo(poseObject, i);
        // zero confidence if node's public data are not available
        let confidence = 0.0;
        if (keys) {
            const node = poseObject.frames[keys.frameKey].nodes[keys.nodeKey];
            if (node && node.publicData[JOINT_PUBLIC_DATA_KEYS.data].confidence !== undefined) {
                confidence = node.publicData[JOINT_PUBLIC_DATA_KEYS.data].confidence;
            }
        }
        jointConfidences[jointId] = confidence;

        if (RENDER_CONFIDENCE_COLOR) {

            poseRenderInstance.setJointConfidenceColor(jointId, confidence);
        }
    }

    const poseHasParent = poseObject.parent && (poseObject.parent !== 'none');
    const pose = new Pose(jointPositions, jointConfidences, timestamp, {poseObjectId: poseObject.objectId, poseHasParent: poseHasParent});
    pose.metadata.previousPose = mostRecentPoseByObjectId[poseObject.objectId];
    mostRecentPoseByObjectId[poseObject.objectId] = pose;
    activeHumanPoseAnalyzer.activeLens.applyLensToPose(pose);
    poseRenderInstance.setPose(pose);
    poseRenderInstance.setLens(activeHumanPoseAnalyzer.activeLens);
    poseRenderInstance.setVisible(childHumanObjectsVisible || !poseHasParent);
    poseRenderInstance.renderer.markNeedsUpdate();

    activeHumanPoseAnalyzer.poseUpdated(pose, false);
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
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.resetLiveHistoryLines();
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
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.resetLiveHistoryClones();
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
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.setHighlightRegion(highlightRegion, fromSpaghetti);
}

/**
 * Gets the poses that are within the given time interval
 * @param {number} firstTimestamp - start of time interval in ms
 * @param {number} secondTimestamp - end of time interval in ms
 * @return {Pose[]} - the poses that are within the given time interval
 */
function getPosesInTimeInterval(firstTimestamp, secondTimestamp) {
    if (!activeHumanPoseAnalyzer) {
        return [];
    }
    return activeHumanPoseAnalyzer.getPosesInTimeInterval(firstTimestamp, secondTimestamp);
}

/**
 * Sets the visibility of the historical history lines
 * @param {boolean} visible - whether to show the historical history lines
 */
function setHistoricalHistoryLinesVisible(visible) {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.setHistoricalHistoryLinesVisible(visible);
}

/**
 * Sets the visibility of the live history lines
 * @param {boolean} visible - whether to show the live history lines
 */
function setLiveHistoryLinesVisible(visible) {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.setLiveHistoryLinesVisible(visible);
}

/**
 * Resets the HumanPoseAnalyzer's historical data
 */
function clearHistoricalData(frameId) {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.clearHistoricalData();
    if (humanPoseAnalyzers[frameId]) {
        delete humanPoseAnalyzers[frameId];
    }
}

/**
 * @param {AnimationMode} animationMode
 */
function setAnimationMode(animationMode) {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.setAnimationMode(animationMode);
}

/**
 * Sets the clone rendering mode // TODO: not in use, remove?
 * @param {boolean} enabled - whether to render all clones or just one
 */
function setRecordingClonesEnabled(enabled) {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }

    if (enabled) {
        activeHumanPoseAnalyzer.setAnimationMode(AnimationMode.all);
    } else {
        activeHumanPoseAnalyzer.setAnimationMode(AnimationMode.cursor);
    }
}

/**
 * Advances the human pose analyzer's analytics lens
 */
function advanceLens() {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }

    activeHumanPoseAnalyzer.advanceLens();
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
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.setCursorTime(time, fromSpaghetti);
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
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.setDisplayRegion(displayRegion);
}

/**
 * Finalize historical renderer matrices after loading them from
 * history logs
 */
function finishHistoryPlayback() {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.markHistoricalColorNeedsUpdate();
}

/**
 * Shows the HumanPoseAnalyzer's settings UI
 */
function showAnalyzerSettingsUI() {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    if (activeHumanPoseAnalyzer.settingsUi) {
        activeHumanPoseAnalyzer.settingsUi.show();
    }
}

/**
 * Hides the HumanPoseAnalyzer's settings UI
 */
function hideAnalyzerSettingsUI() {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    if (activeHumanPoseAnalyzer.settingsUi) {
        activeHumanPoseAnalyzer.settingsUi.hide();
    }
}

/**
 * Toggles the HumanPoseAnalyzer's settings UI
 */
function toggleAnalyzerSettingsUI() {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    if (activeHumanPoseAnalyzer.settingsUi) {
        activeHumanPoseAnalyzer.settingsUi.toggle();
    }
}

/**
 * Sets the visibility of the human poses
 * @param {boolean} visible - whether to show or not
 */
function setHumanPosesVisible(visible) {
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.setLiveHumanPosesVisible(visible);
}

/**
 * Sets the visibility of the child human pose objects
 * Note: Used in live mode so far
 * @param {boolean} visible - whether to show or not
 */
function setChildHumanPosesVisible(visible) {
    childHumanObjectsVisible = visible;
    if (this.settingsUi) {
        this.settingsUi.setChildHumanPosesVisible(visible);
    }
}

// TODO: Remove deprecated API use
export {
    setActiveFrame,
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
    setHumanPosesVisible,
    setChildHumanPosesVisible,
};
