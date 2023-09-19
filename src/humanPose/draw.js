import * as THREE from '../../thirdPartyCode/three/three.module.js';
import {
    JOINT_PUBLIC_DATA_KEYS,
    getJointNodeInfo,
    getGroundPlaneRelativeMatrix,
    setMatrixFromArray
} from './utils.js';
import {JOINTS,JOINT_CONNECTIONS, JOINT_TO_INDEX, RENDER_CONFIDENCE_COLOR} from './constants.js';
import {Pose} from "./Pose.js";
import {HumanPoseRenderInstance} from './HumanPoseRenderInstance.js';


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

/**
 * Processes the poseObject given and renders them into the corresponding poseRenderInstances
 * @param {HumanPoseObject[]} poseObjects - the poseObjects to render
 * @param {number} timestamp - the timestamp of the poseObjects
 */
function renderLiveHumanPoseObjects(poseObjects, timestamp) {
    //if (is2DPoseRendered()) return;

    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();

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
 * Updates the corresponding poseRenderer with the poseObject given
 * @param {HumanPoseObject} poseObject - the poseObject to render
 * @param {number} timestamp - the timestamp of when the poseObject was recorded
 */
function updatePoseRenderer(poseObject, timestamp) {
    let activeAnalytics = realityEditor.analytics.getActiveAnalytics();
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();

    if (!activeHumanPoseAnalyzer) {
        console.error('No active HPA');
        return;
    }

    const renderer = activeHumanPoseAnalyzer.opaquePoseRenderer;
    const poseRenderInstances = activeHumanPoseAnalyzer.poseRenderInstances;

    const identifier = poseObject.objectId;
    if (!poseRenderInstances[identifier]) {
        poseRenderInstances[identifier] = new HumanPoseRenderInstance(renderer, identifier, activeHumanPoseAnalyzer.activeLens);
    }
    const poseRenderInstance = poseRenderInstances[identifier];
    const hideId = activeAnalytics.frame + '-' + poseRenderInstance.id;
    updateJointsAndBones(poseRenderInstance, poseObject, timestamp);
    if (hidePoseRenderInstanceTimeoutIds[hideId]) {
        clearTimeout(hidePoseRenderInstanceTimeoutIds[hideId]);
        hidePoseRenderInstanceTimeoutIds[hideId] = null;
    }
    hidePoseRenderInstanceTimeoutIds[hideId] = setTimeout(() => {
        poseRenderInstance.remove();
        poseRenderInstance.renderer.markNeedsUpdate();
        delete poseRenderInstances[poseRenderInstance.id];
    }, 1000);

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
    let liveHumanPoseAnalyzer = realityEditor.analytics.getDefaultAnalytics().humanPoseAnalyzer;

    let groundPlaneRelativeMatrix = getGroundPlaneRelativeMatrix();

    const jointPositions = {};
    const jointConfidences = {};

    for (const jointId of Object.values(JOINTS)) {
        // assume that all sub-objects are of the form poseObject.id + joint name
        let sceneNode = realityEditor.sceneGraph.getSceneNodeById(`${poseObject.objectId}${jointId}`);

        // poses are in world space, three.js meshes get added to groundPlane space, so convert from world->groundPlane
        let jointMatrixThree = new THREE.Matrix4();
        setMatrixFromArray(jointMatrixThree, sceneNode.worldMatrix);
        jointMatrixThree.premultiply(groundPlaneRelativeMatrix);

        let jointPosition = new THREE.Vector3();
        jointPosition.setFromMatrixPosition(jointMatrixThree);

        jointPositions[jointId] = jointPosition;

        let keys = getJointNodeInfo(poseObject, jointId);
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
    liveHumanPoseAnalyzer.activeLens.applyLensToPose(pose);
    poseRenderInstance.setPose(pose);
    poseRenderInstance.setLens(liveHumanPoseAnalyzer.activeLens);
    poseRenderInstance.setVisible(liveHumanPoseAnalyzer.childHumanObjectsVisible || !poseHasParent);
    poseRenderInstance.renderer.markNeedsUpdate();

    liveHumanPoseAnalyzer.poseUpdated(pose, false);
    if (realityEditor.analytics) {
        let timeline = realityEditor.analytics.getActiveTimeline();
        if (timeline) {
            timeline.appendPose({
                time: timestamp,
            });
        }
    }
}

/**
 * Resets the HumanPoseAnalyzer's live history lines
 */
function resetLiveHistoryLines() {
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
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
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
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
 * Gets the poses that are within the given time interval
 * @param {number} firstTimestamp - start of time interval in ms
 * @param {number} secondTimestamp - end of time interval in ms
 * @return {Pose[]} - the poses that are within the given time interval
 */
function getPosesInTimeInterval(firstTimestamp, secondTimestamp) {
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
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
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
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
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.setLiveHistoryLinesVisible(visible);
}

/**
 * @param {AnimationMode} animationMode
 */
function setAnimationMode(animationMode) {
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
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
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
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
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
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
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.setCursorTime(time, fromSpaghetti);
}

/**
 * Shows the HumanPoseAnalyzer's settings UI
 */
function showAnalyzerSettingsUI() {
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
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
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
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
 * Used by the remote operator menu bar
 */
function toggleAnalyzerSettingsUI() {
    let defaultHumanPoseAnalyzer = realityEditor.analytics.getDefaultAnalytics().humanPoseAnalyzer;
    if (!defaultHumanPoseAnalyzer) {
        console.warn('No default HPA');
        return;
    }
    if (defaultHumanPoseAnalyzer.settingsUi) {
        defaultHumanPoseAnalyzer.settingsUi.toggle();
    }
}

/**
 * Sets the visibility of the human poses
 * @param {boolean} visible - whether to show or not
 */
function setHumanPosesVisible(visible) {
    const humanPoseAnalyzers = realityEditor.analytics.getAllHumanPoseAnalyzers();
    for (let humanPoseAnalyzer of Object.values(humanPoseAnalyzers)) {
        humanPoseAnalyzer.setLiveHumanPosesVisible(visible);
    }
}

/**
 * Sets the visibility of the child human pose objects
 * Note: Used in live mode so far
 * @param {boolean} visible - whether to show or not
 */
function setChildHumanPosesVisible(visible) {
    let activeHumanPoseAnalyzer = realityEditor.analytics.getActiveHumanPoseAnalyzer();
    if (!activeHumanPoseAnalyzer) {
        console.warn('No active HPA');
        return;
    }
    activeHumanPoseAnalyzer.childHumanObjectsVisible = visible;
    if (activeHumanPoseAnalyzer.settingsUi) {
        activeHumanPoseAnalyzer.settingsUi.setChildHumanPosesVisible(visible);
    }
}

const DEBUG = false;
/**
 * Determines whether 2D pose is or can be rendered at all on videobackground (possible on mobile devices only)
 */
function is2DPoseRendered() {
    return DEBUG && !realityEditor.device.environment.requiresMouseEvents();
}

/**
 * Renders original 2D skeleton from Swift side (for debug purposes).
 * @param {Array} poses 
 * @param {[number, number]} imageSize 
 */
function draw2DPoses(poses, imageSize) {

    if (!is2DPoseRendered()) return; 

    let canvas = document.getElementById('supercooldebugcanvas');
    let gfx;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'supercooldebugcanvas';
        canvas.style.position = 'absolute';
        canvas.style.top = 0;
        canvas.style.left = 0;
        canvas.width = canvas.style.width = window.innerWidth;
        canvas.height = canvas.style.height = window.innerHeight;
        canvas.style.margin = 0;
        canvas.style.padding = 0;
        canvas.style.pointerEvents = 'none';
        document.body.appendChild(canvas);
        gfx = canvas.getContext('2d');
        gfx.width = window.innerWidth;
        gfx.height = window.innerHeight;
    }

    if (!gfx) {
        gfx = canvas.getContext('2d');
    }
    gfx.clearRect(0, 0, gfx.width, gfx.height);
    gfx.fillStyle = '#00ffff';
    gfx.font = '16px sans-serif';
    gfx.strokeStyle = '#00ffff';
    gfx.lineWidth = 1;

    const jointSize = 5;

    if (poses.length === 0) {
        return;
    }

    // following naming is for landscape images (width is a longer side)
    // image resolution associated with 2D point positions (always defined in landscape - x: longer side, y: shorter side)
    const pointWidth = imageSize[0]; // 1920; // 960;
    const pointHeight = imageSize[1]; // 1080; // 540;
    let outWidth = 0, outHeight = 0;
    let halfCanvasWidth = 0, halfCanvasHeight = 0;
    const portrait = gfx.width < gfx.height;

    if (globalStates.device.startsWith('iPad')) {
        // ipads crop camera image along longer side. Thus, shorter side is taken to calulate scaling factor from camera image to display canvas 
        if (!portrait) {
            outHeight = gfx.height;
            outWidth = (outHeight / pointHeight) * pointWidth;
        }
        else {
            outHeight = gfx.width;
            outWidth = (outHeight / pointHeight) * pointWidth;
        }
    }
    else {
        // iphones crop camera image along shorter side. Thus, longer side is taken to calulate scaling factor from camera image to display canvas (gfx.width/height) 
        if (!portrait) {
            outWidth = gfx.width;
            outHeight = (outWidth / pointWidth) * pointHeight;
        }
        else {
            outWidth = gfx.height;
            outHeight = (outWidth / pointWidth) * pointHeight;
        }
    }

    if (!portrait) {
        halfCanvasWidth = gfx.width / 2;
        halfCanvasHeight = gfx.height / 2;
    }
    else {
        halfCanvasWidth = gfx.height / 2;
        halfCanvasHeight = gfx.width / 2;
    }

    // gfx.fillText(`${format(coords[0].x)} ${format(coords[0].y)} ${format(coords[0].z)} ${format(poses[0].rotX * 180 / Math.PI)} ${format(poses[0].rotY * 180 / Math.PI)}`, 16, 64);
    let debug = false;
    let points2D = [];
    for (let point of poses) {
        gfx.beginPath();

        let x = (point.imgX - pointWidth / 2) * (outWidth / pointWidth) + halfCanvasWidth;
        let y = 0;
        if (portrait)   {
            y = ((pointHeight - point.imgY) - pointHeight / 2) * (outHeight / pointHeight) + halfCanvasHeight;
            let tmp = x; x = y; y = tmp;
        }
        else {
            y = (point.imgY - pointHeight / 2) * (outHeight / pointHeight) + halfCanvasHeight;
        }

        points2D.push([x, y]);

        gfx.fillStyle = `hsl(180, 100%, ${point.score * 50.0}%`;
        gfx.arc(x, y, jointSize, 0, 2 * Math.PI);
        gfx.fill();
        if (debug) {
            gfx.fillText(`${Math.round(point.imgX)} ${Math.round(point.imgY)}`, x + jointSize, y - jointSize);
            debug = false;
        }
    }

    gfx.fillStyle = '#00ffff';
    gfx.strokeStyle = '#00ffff';
    gfx.lineWidth = 3;

    gfx.beginPath();
    let conns = Object.values(JOINT_CONNECTIONS);
    for (let i = 0; i < 24; i++) {   // skipping connections between synthetic joints which do not exist yet 

        let a = points2D[JOINT_TO_INDEX[conns[i][0]]];
        let b = points2D[JOINT_TO_INDEX[conns[i][1]]];

        gfx.moveTo(a[0], a[1]);
        gfx.lineTo(b[0], b[1]);
    }
    gfx.stroke();
}

// TODO: Remove deprecated API use
export {
    renderLiveHumanPoseObjects,
    resetLiveHistoryLines,
    resetHistoryLines,
    resetLiveHistoryClones,
    resetHistoryClones,
    setAnimationMode,
    setCursorTime,
    setLiveHistoryLinesVisible,
    setHistoricalHistoryLinesVisible,
    setRecordingClonesEnabled,
    advanceLens,
    advanceCloneMaterial,
    getPosesInTimeInterval,
    showAnalyzerSettingsUI,
    hideAnalyzerSettingsUI,
    toggleAnalyzerSettingsUI,
    setHumanPosesVisible,
    setChildHumanPosesVisible,
    draw2DPoses,
    is2DPoseRendered
};
