createNameSpace("realityEditor.device.modeTransition");

// import {Analytics} from './analytics.js'
// import {AnalyticsMobile} from './AnalyticsMobile.js'

let callbacks = {
    onRemoteOperatorShown: [],
    onRemoteOperatorHidden: [],
    onTransitionPercent: [],
    onDeviceCameraPosition: []
}

class RemoteOperatorManager {
    constructor() {
        console.log('created new RemoteOperatorManager');
        this.prevEnvironmentVariables = {};
    }
    needsInitialization() {
        return true;
    }
    initRemoteOperator() {
        if (!this.needsInitialization()) return;
        this.showRemoteOperator();
    }
    deinitRemoteOperator() {
        // if (this.needsInitialization()) return;
        this.hideRemoteOperator();
    }
    showRemoteOperator() {
        // if (typeof realityEditor.gui.ar.desktopRenderer === 'undefined') return;
        console.log('show remote operator');
        // realityEditor.gui.ar.desktopRenderer.initService(); // init if needed
        // turn off the pipe from AR device position to camera position, and rely on the desktopCamera controls instead
        // realityEditor.gui.ar.desktopRenderer.showScene();

        callbacks.onRemoteOperatorShown.forEach(cb => {
            cb();
        });

        // let worldNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        // worldNode.setLocalMatrix(realityEditor.gui.ar.utilities.newIdentityMatrix());

        // update any environment variables for VR mode
        let env = realityEditor.device.environment.variables;

        this.prevEnvironmentVariables.supportsDistanceFading = env.supportsDistanceFading;
        env.supportsDistanceFading = false; // this prevents things from disappearing when the camera zooms out

        this.prevEnvironmentVariables.ignoresFreezeButton = env.ignoresFreezeButton;
        env.ignoresFreezeButton = true; // no need to "freeze the camera" on desktop

        this.prevEnvironmentVariables.lineWidthMultiplier = env.lineWidthMultiplier;
        env.lineWidthMultiplier = 5; // makes links thicker (more visible)

        this.prevEnvironmentVariables.distanceScaleFactor = env.distanceScaleFactor;
        env.distanceScaleFactor = 30; // makes distance-based interactions work at further distances than mobile

        this.prevEnvironmentVariables.newFrameDistanceMultiplier = env.newFrameDistanceMultiplier;
        env.newFrameDistanceMultiplier = 6;
        
        this.prevEnvironmentVariables.isCameraOrientationFlipped = env.isCameraOrientationFlipped;
        env.isCameraOrientationFlipped = true;
        
        this.prevEnvironmentVariables.hideOriginCube = env.hideOriginCube;
        env.hideOriginCube = true; // don't show a set of cubes at the world origin
        
        this.prevEnvironmentVariables.addOcclusionGltf = env.addOcclusionGltf;
        env.addOcclusionGltf = false; // don't add transparent world gltf, because we're already adding the visible mesh

        this.prevEnvironmentVariables.transformControlsSize = env.transformControlsSize;
        env.transformControlsSize = 0.3; // gizmos for ground plane anchors are smaller

        this.prevEnvironmentVariables.defaultShowGroundPlane = env.defaultShowGroundPlane;
        env.defaultShowGroundPlane = true;

        this.prevEnvironmentVariables.groundWireframeColor = env.groundWireframeColor;
        env.groundWireframeColor = 'rgb(255, 240, 0)'; // make the ground holo-deck styled
        
        // start the update loop
        // realityEditor.device.desktopAdapter.update();

        // try to force the browser to render the background
        // document.body.style.backgroundColor = 'rgb(50, 50, 50)';
        // setTimeout(() => {
        //     document.body.style.backgroundColor = 'rgb(50, 50, 49)';
        //     setTimeout(() => {
        //         document.body.style.backgroundColor = 'rgb(50, 50, 50)';
        //     }, 30);
        // }, 30);
        
        if (!this.backgroundBlur) {
            this.backgroundBlur = document.createElement('div');
            this.backgroundBlur.id = 'remoteOperatorBackgroundBlur';
        }
        // this.backgroundBlur.classList.remove('animateAllProperties500ms');
        document.body.appendChild(this.backgroundBlur);
        this.backgroundBlur.style.backgroundColor = 'rgba(50, 50, 50, 0.01)';
        // setTimeout(() => {
        //     this.backgroundBlur.classList.add('animateAllProperties500ms');
        //     this.backgroundBlur.style.backgroundColor = 'rgba(50, 50, 50, 1.0)';
        // }, 150);
        
        // Set the correct environment variables so that this add-on changes the app to run in desktop mode
        // env.requiresMouseEvents = realityEditor.device.environment.isDesktop(); // this fixes touch events to become mouse events
        // env.shouldDisplayLogicMenuModally = true; // affects appearance of crafting board
        // globalStates.defaultScale *= 3; // make new tools bigger
        // env.localServerPort = PROXY ? 443 : 8080; // this would let it find world_local if it exists (but it probably doesn't exist)
        // env.shouldCreateDesktopSocket = true; // this lets UDP messages get sent over socket instead
        // env.waitForARTracking = false; // don't show loading UI waiting for vuforia to give us camera matrices
        // env.supportsAreaTargetCapture = false; // don't show Create Area Target UI when app loads
    }
    setTransitionPercent(percent) {
        // realityEditor.device.desktopCamera.setTransitionPercentage(percent);
        callbacks.onTransitionPercent.forEach(cb => {
            cb(percent);
        });
        // TODO: update the background blur opacity based on the transition percentage
        if (this.backgroundBlur) {
            this.backgroundBlur.style.backgroundColor = `rgba(50, 50, 50, ${Math.max(0, Math.min(1, percent * 5.0))})`;
        }
    }
    setDeviceCameraPosition(cameraMatrix) {
        // realityEditor.device.desktopCamera.setDeviceCameraPosition(cameraMatrix);
        callbacks.onDeviceCameraPosition.forEach(cb => {
            cb(cameraMatrix);
        });
    }
    hideRemoteOperator() {
        // if (typeof realityEditor.gui.ar.desktopRenderer === 'undefined') return;
        // console.log('TODO: hide remote operator');
        // realityEditor.gui.ar.desktopRenderer.hideScene();

        callbacks.onRemoteOperatorHidden.forEach(cb => {
            cb();
        });

        // restore any environment variables to their AR mode values
        let env = realityEditor.device.environment.variables;
        for (const [key, value] of Object.entries(this.prevEnvironmentVariables)) {
            env[key] = value;
            delete this.prevEnvironmentVariables[key];
        }
        
        if (this.backgroundBlur) {
            document.body.removeChild(this.backgroundBlur);
        }

        // document.body.style.backgroundColor = 'transparent';
    }
}

(function(exports) {
    
    const MODES = Object.freeze({
        AR: 'AR',
        REMOTE_OPERATOR: 'REMOTE_OPERATOR'
    });
    let currentMode = null;
    let remoteOperatorManager = new RemoteOperatorManager();
    
    function getInitialMode() {
        return realityEditor.device.environment.isWithinToolboxApp() ?
            MODES.AR :
            MODES.REMOTE_OPERATOR;
    }
    function initService() {
        console.log('init modeTransition');
        currentMode = getInitialMode();
    }
    exports.initService = initService;
    
    function switchToAR() {
        if (currentMode === MODES.AR) return;
        if (!realityEditor.device.environment.isWithinToolboxApp()) return;
        currentMode = MODES.AR;
        
        // hide 3D model if needed
        remoteOperatorManager.deinitRemoteOperator();
    }
    exports.switchToAR = switchToAR;
    
    function switchToRemoteOperator() {
        if (currentMode === MODES.REMOTE_OPERATOR) return;
        currentMode = MODES.REMOTE_OPERATOR;
        
        // show 3D model if needed
        remoteOperatorManager.initRemoteOperator();
    }
    exports.switchToRemoteOperator = switchToRemoteOperator;
    
    function isARMode() {
        if (!currentMode) currentMode = getInitialMode();
        return currentMode === MODES.AR;
    }
    exports.isARMode = isARMode;
    
    function setTransitionPercent(percent) {
        if (percent < 0.01) {
            switchToAR();
        } else {
            switchToRemoteOperator(percent);
            remoteOperatorManager.setTransitionPercent(percent);
        }
    }
    exports.setTransitionPercent = setTransitionPercent;
    
    // we can transition back to the correct place by using this
    function setDeviceCameraPosition(cameraMatrix) {
        if (!remoteOperatorManager) return;
        remoteOperatorManager.setDeviceCameraPosition(cameraMatrix);
    }
    exports.setDeviceCameraPosition = setDeviceCameraPosition;
    
    // Callback handlers
    exports.onRemoteOperatorShown = (callback) => {
        callbacks.onRemoteOperatorShown.push(callback);
    }
    exports.onRemoteOperatorHidden = (callback) => {
        callbacks.onRemoteOperatorHidden.push(callback);
    }
    exports.onTransitionPercent = (callback) => {
        callbacks.onTransitionPercent.push(callback);
    }
    exports.onDeviceCameraPosition = (callback) => {
        callbacks.onDeviceCameraPosition.push(callback);
    }
    
}(realityEditor.device.modeTransition));

export const initService = realityEditor.device.modeTransition.initService;
