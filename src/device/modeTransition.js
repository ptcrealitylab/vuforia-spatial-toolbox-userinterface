createNameSpace("realityEditor.device.modeTransition");

// import {Analytics} from './analytics.js'
// import {AnalyticsMobile} from './AnalyticsMobile.js'

let callbacks = {
    onRemoteOperatorShown: [],
    onRemoteOperatorHidden: [],
    onTransitionPercent: [],
    onDeviceCameraPosition: [],
    onModeTransitionPinchStart: [],
    onModeTransitionPinchEnd: []
}

class RemoteOperatorManager {
    constructor() {
        console.log('created new RemoteOperatorManager');
        this.prevEnvironmentVariables = {};
        this.prevMatrices = {
            projection: null,
            realProjection: null,
            unflippedRealProjection: null
        }
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

        this.prevMatrices.projection = JSON.parse(JSON.stringify(globalStates.projectionMatrix));
        this.prevMatrices.realProjection = JSON.parse(JSON.stringify(globalStates.realProjectionMatrix));
        this.prevMatrices.unflippedRealProjection = JSON.parse(JSON.stringify(globalStates.unflippedRealProjectionMatrix));
        
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

        let menuBarDiv = document.querySelector('.desktopMenuBar');
        menuBarDiv.style.display = 'none';

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
        if (this.backgroundBlur) {
            // at 10% slider drag, it is 100% opaque
            this.backgroundBlur.style.backgroundColor = `rgba(50, 50, 50, ${Math.max(0, Math.min(1, (percent - 0.05) * 20))})`;
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

        // restore the projection matrix from Vuforia
        globalStates.projectionMatrix = JSON.parse(JSON.stringify(this.prevMatrices.projection));
        globalStates.realProjectionMatrix = JSON.parse(JSON.stringify(this.prevMatrices.realProjection));
        globalStates.unflippedRealProjectionMatrix = JSON.parse(JSON.stringify(this.prevMatrices.unflippedRealProjection));

        if (this.backgroundBlur) {
            document.body.removeChild(this.backgroundBlur);
        }

        // document.body.style.backgroundColor = 'transparent';
    }
}

class PinchGestureRecognizer {
    constructor() {
        this.mouseInput = {
            unprocessedDX: 0,
            unprocessedDY: 0,
            unprocessedScroll: 0,
            isPointerDown: false,
            isRightClick: false,
            isRotateRequested: false,
            isStrafeRequested: false,
            first: { x: 0, y: 0 },
            last: { x: 0, y: 0 },
            lastWorldPos: [0, 0, 0],
        };
        this.callbacks = {
            onPinchChange: [],
            onPinchStart: [],
            onPinchEnd: []
        };
        this.addMultitouchEvents();
    }
    onPinchChange(callback) {
        this.callbacks.onPinchChange.push(callback);
    }
    onPinchStart(callback) {
        this.callbacks.onPinchStart.push(callback);
    }
    onPinchEnd(callback) {
        this.callbacks.onPinchEnd.push(callback);
    }
    addMultitouchEvents() {
        // on mobile browsers, we add touch controls instead of mouse controls, to move the camera. additional
        // code is added to avoid iOS's pesky safari gestures, such as pull-to-refresh and swiping between tabs

        let isMultitouchGestureActive = false;
        let didMoveAtAll = false;
        let initialPosition = null;
        let initialDistance = 0;
        let lastDistance = 0;

        // Prevent the default pinch gesture response (zooming) on mobile browsers
        document.addEventListener('gesturestart', (event) => {
            event.preventDefault();
        });

        // Handle pinch to zoom
        const handlePinch = (event) => {
            event.preventDefault();
            if (event.touches.length === 2) {
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

                if (initialDistance === 0) { // indicates the start of the pinch gesture
                    initialDistance = currentDistance;
                    lastDistance = initialDistance;
                    this.callbacks.onPinchStart.forEach(callback => {
                        callback();
                    });
                } else {
                    // Calculate the pinch scale based on the change in distance over time.
                    // 5 is empirically determined to feel natural. -= so bigger distance leads to closer zoom
                    this.mouseInput.unprocessedScroll -= 5 * (currentDistance - lastDistance);
                    lastDistance = currentDistance;
                    this.callbacks.onPinchChange.forEach(callback => {
                        callback(this.mouseInput.unprocessedScroll);
                    });
                    this.mouseInput.unprocessedScroll = 0;
                }
            }
        }

        // Add multitouch event listeners to the document
        document.addEventListener('touchstart', (event) => {
            if (!realityEditor.device.utilities.isEventHittingBackground(event)) return;

            isMultitouchGestureActive = true;

            if (event.touches.length === 2) {
                initialDistance = 0; // Reset pinch distance
                this.mouseInput.last.x = 0;
                this.mouseInput.last.y = 0;
            }
        });
        document.addEventListener('touchmove', (event) => {
            if (!isMultitouchGestureActive) return;
            event.preventDefault();

            // Ensure regular zoom level
            document.documentElement.style.zoom = '1';
            // Ensure no page offset
            window.scrollTo(0, 0);

            if (event.touches.length === 2) {
                // zooms based on changing distance between fingers
                handlePinch(event);
                didMoveAtAll = true;
            }
        });
        document.addEventListener('touchend', (_event) => {
            initialDistance = 0;
            isMultitouchGestureActive = false;
            this.callbacks.onPinchEnd.forEach(callback => {
                callback();
            });
        });
    }
}

(function(exports) {
    
    const MODES = Object.freeze({
        AR: 'AR',
        REMOTE_OPERATOR: 'REMOTE_OPERATOR'
    });
    let currentMode = null;
    let remoteOperatorManager = new RemoteOperatorManager();
    let pinchGestureRecognizer = new PinchGestureRecognizer();
    
    window.MAX_PINCH_AMOUNT = 1000;
    let pinchAmount = 0;
    pinchGestureRecognizer.onPinchStart(_ => {
        // show the slider
        console.log('onPinchStart');
        // pinchAmount = 0;
        callbacks.onModeTransitionPinchStart.forEach(callback => {
            callback();
        })
    });
    pinchGestureRecognizer.onPinchEnd(_ => {
        // hide the slider after 5 seconds
        console.log('onPinchEnd');
        // pinchAmount = 0;
        callbacks.onModeTransitionPinchEnd.forEach(callback => {
            callback();
        });
    });
    pinchGestureRecognizer.onPinchChange(scrollAmount => {
        // console.log('pinch gesture recognizer got ', scrollAmount);
        pinchAmount += scrollAmount;
        pinchAmount = Math.max(0, Math.min(window.MAX_PINCH_AMOUNT, pinchAmount));
        
        setTransitionPercent(Math.min(1, Math.max(0, pinchAmount / window.MAX_PINCH_AMOUNT)));
    });
    exports.onModeTransitionPinchStart = (callback) => {
        callbacks.onModeTransitionPinchStart.push(callback);
    }
    exports.onModeTransitionPinchEnd = (callback) => {
        callbacks.onModeTransitionPinchEnd.push(callback);
    }
    
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
        // update the pinch amount to allow smooth interoperability between pinch and slider interaction
        pinchAmount = Math.max(0, Math.min(window.MAX_PINCH_AMOUNT, percent * window.MAX_PINCH_AMOUNT));
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
