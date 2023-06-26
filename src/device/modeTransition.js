createNameSpace("realityEditor.device.modeTransition");

import { PinchGestureRecognizer } from './PinchGestureRecognizer.js';

const MAX_PINCH_AMOUNT = 1000; // how far you need to drag to trigger the full transition
const MODES = Object.freeze({
    AR: 'AR',
    REMOTE_OPERATOR: 'REMOTE_OPERATOR'
});
let currentMode = null;
let pinchAmount = 0;
let backgroundDiv = null;

let callbacks = {
    onRemoteOperatorShown: [],
    onRemoteOperatorHidden: [],
    onTransitionPercent: [],
    onDeviceCameraPosition: [],
    onModeTransitionPinchStart: [],
    onModeTransitionPinchEnd: []
}

let prevEnvironmentVariables = {};
let prevMatrices = {
    projection: null,
    realProjection: null,
    unflippedRealProjection: null
};

(function(exports) {

    function initService() {
        currentMode = getInitialMode();

        // set up the pinch gesture to transition from AR to VR mode
        let pinchGestureRecognizer = new PinchGestureRecognizer();

        pinchGestureRecognizer.onPinchStart(_ => {
            callbacks.onModeTransitionPinchStart.forEach(callback => {
                callback();
            })
        });
        pinchGestureRecognizer.onPinchEnd(_ => {
            callbacks.onModeTransitionPinchEnd.forEach(callback => {
                callback();
            });
        });
        pinchGestureRecognizer.onPinchChange(scrollAmount => {
            pinchAmount += scrollAmount;
            pinchAmount = Math.max(0, Math.min(MAX_PINCH_AMOUNT, pinchAmount));
            setTransitionPercent(Math.min(1, Math.max(0, pinchAmount / MAX_PINCH_AMOUNT)));
        });
    }

    function getInitialMode() {
        return realityEditor.device.environment.isWithinToolboxApp() ?
            MODES.AR :
            MODES.REMOTE_OPERATOR;
    }

    function switchToAR() {
        if (currentMode === MODES.AR) return;
        if (!realityEditor.device.environment.isWithinToolboxApp()) return;
        currentMode = MODES.AR;

        // this will tell the addon to hide the 3D model
        callbacks.onRemoteOperatorHidden.forEach(cb => {
            cb();
        });

        // restore any environment variables to their AR mode values
        let env = realityEditor.device.environment.variables;
        for (const [key, value] of Object.entries(prevEnvironmentVariables)) {
            env[key] = value;
            delete prevEnvironmentVariables[key];
        }

        // restore the projection matrix from Vuforia
        globalStates.projectionMatrix = JSON.parse(JSON.stringify(prevMatrices.projection));
        globalStates.realProjectionMatrix = JSON.parse(JSON.stringify(prevMatrices.realProjection));
        globalStates.unflippedRealProjectionMatrix = JSON.parse(JSON.stringify(prevMatrices.unflippedRealProjection));

        if (backgroundDiv) {
            document.body.removeChild(backgroundDiv);
        }
    }

    function switchToRemoteOperator() {
        if (currentMode === MODES.REMOTE_OPERATOR) return;
        currentMode = MODES.REMOTE_OPERATOR;

        // store the AR values of the projection matrices
        prevMatrices.projection = JSON.parse(JSON.stringify(globalStates.projectionMatrix));
        prevMatrices.realProjection = JSON.parse(JSON.stringify(globalStates.realProjectionMatrix));
        prevMatrices.unflippedRealProjection = JSON.parse(JSON.stringify(globalStates.unflippedRealProjectionMatrix));

        // trigger the remote operator addon to initialize
        callbacks.onRemoteOperatorShown.forEach(cb => {
            cb();
        });

        // update any environment variables for VR mode
        let env = realityEditor.device.environment.variables;
        prevEnvironmentVariables.supportsDistanceFading = env.supportsDistanceFading;
        env.supportsDistanceFading = false; // this prevents things from disappearing when the camera zooms out
        prevEnvironmentVariables.ignoresFreezeButton = env.ignoresFreezeButton;
        env.ignoresFreezeButton = true; // no need to "freeze the camera" on desktop
        prevEnvironmentVariables.lineWidthMultiplier = env.lineWidthMultiplier;
        env.lineWidthMultiplier = 5; // makes links thicker (more visible)
        prevEnvironmentVariables.distanceScaleFactor = env.distanceScaleFactor;
        env.distanceScaleFactor = 30; // makes distance-based interactions work at further distances than mobile
        prevEnvironmentVariables.newFrameDistanceMultiplier = env.newFrameDistanceMultiplier;
        env.newFrameDistanceMultiplier = 6;
        prevEnvironmentVariables.isCameraOrientationFlipped = env.isCameraOrientationFlipped;
        env.isCameraOrientationFlipped = true;
        prevEnvironmentVariables.hideOriginCube = env.hideOriginCube;
        env.hideOriginCube = true; // don't show a set of cubes at the world origin
        prevEnvironmentVariables.addOcclusionGltf = env.addOcclusionGltf;
        env.addOcclusionGltf = false; // don't add transparent world gltf, because we're already adding the visible mesh
        prevEnvironmentVariables.transformControlsSize = env.transformControlsSize;
        env.transformControlsSize = 0.3; // gizmos for ground plane anchors are smaller
        prevEnvironmentVariables.defaultShowGroundPlane = env.defaultShowGroundPlane;
        env.defaultShowGroundPlane = true;
        prevEnvironmentVariables.groundWireframeColor = env.groundWireframeColor;
        env.groundWireframeColor = 'rgb(255, 240, 0)'; // make the ground holo-deck styled
        // All other environment variables usually set in desktopAdapter don't need to be modified

        if (!backgroundDiv) {
            backgroundDiv = document.createElement('div');
            backgroundDiv.id = 'remoteOperatorBackgroundBlur';
        }
        document.body.appendChild(backgroundDiv);
        backgroundDiv.style.backgroundColor = 'rgba(50, 50, 50, 0.01)';

        let menuBarDiv = document.querySelector('.desktopMenuBar');
        menuBarDiv.style.display = 'none';
    }

    function isARMode() {
        if (!currentMode) currentMode = getInitialMode();
        return currentMode === MODES.AR;
    }

    // the pinch gesture or the slider component can both trigger the transition using this
    function setTransitionPercent(percent) {
        if (percent < 0.01) {
            switchToAR();
        } else {
            switchToRemoteOperator(percent);
        }

        callbacks.onTransitionPercent.forEach(cb => {
            cb(percent);
        });

        if (backgroundDiv) {
            // start fading in background at 5%, finish at 10%
            let opacity = Math.max(0, Math.min(1, (percent - 0.05) * 20));
            backgroundDiv.style.backgroundColor = `rgba(50, 50, 50, ${opacity})`;
        }

        // update the pinch amount to allow smooth interoperability between pinch and slider interaction
        pinchAmount = Math.max(0, Math.min(MAX_PINCH_AMOUNT, percent * MAX_PINCH_AMOUNT));
    }

    // we can transition back to the correct place by using this
    function setDeviceCameraPosition(cameraMatrix) {
        callbacks.onDeviceCameraPosition.forEach(cb => {
            cb(cameraMatrix);
        });
    }

    exports.initService = initService;
    exports.switchToAR = switchToAR;
    exports.switchToRemoteOperator = switchToRemoteOperator;
    exports.isARMode = isARMode;
    exports.setTransitionPercent = setTransitionPercent;
    exports.setDeviceCameraPosition = setDeviceCameraPosition;

    // Callback handlers
    exports.onRemoteOperatorShown = (callback) => { callbacks.onRemoteOperatorShown.push(callback); }
    exports.onRemoteOperatorHidden = (callback) => { callbacks.onRemoteOperatorHidden.push(callback); }
    exports.onTransitionPercent = (callback) => { callbacks.onTransitionPercent.push(callback); }
    exports.onDeviceCameraPosition = (callback) => { callbacks.onDeviceCameraPosition.push(callback); }
    exports.onModeTransitionPinchStart = (callback) => { callbacks.onModeTransitionPinchStart.push(callback); }
    exports.onModeTransitionPinchEnd = (callback) => { callbacks.onModeTransitionPinchEnd.push(callback); }

}(realityEditor.device.modeTransition));

export const initService = realityEditor.device.modeTransition.initService;
