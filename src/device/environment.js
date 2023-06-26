createNameSpace("realityEditor.device.environment");

/**
 * @fileOverview realityEditor.device.environment.js
 * This provides an extensible location for defining environment variables that are used by
 * the core application, but may be modified by add-ons to affect conditional behavior in the app.
 *
 * For example, an add-on can disable distance fading, if that is important for the add-on behavior,
 * or it can change which event names the app responds to (mousedown vs touchdown), or it can scale
 * certain UI constants, such as the link line width, by factors specific to the environment.
 *
 * Currently, if multiple add-ons try to set the same variable it will lead to inconsistent results
 * based on which add-on is loaded first. There are plans to allow add-ons to register their
 * individual requirements, which the getter functions would resolve at runtime.
 */
(function(exports) {

    exports.initService = function() {
        console.log('Default environment initialized');
        realityEditor.network.addPostMessageHandler('getEnvironmentVariables', (_, fullMessageData) => {
            realityEditor.network.postMessageIntoFrame(fullMessageData.frame, {environmentVariables: variables});
        });
    };

    // use this to distinguish between opening the remote operator in a mobile
    // safari vs opening the userinterface in AR mode in the app
    function isWithinToolboxApp() {
        return typeof window.webkit !== 'undefined' &&
            typeof window.webkit.messageHandlers !== 'undefined' &&
            typeof window.webkitWasTamperedWith === 'undefined';
    }

    // rather than checking for "isDesktop", this gives a more reliable way to
    // determine whether to run the AR interface or the remote operator interface
    function isARMode() {
        return isWithinToolboxApp() && !isDesktop() &&
            realityEditor.device.modeTransition.isARMode();
    }

    function isDesktop() {
        const userAgent = window.navigator.userAgent;
        const isWebView = userAgent.includes('Mobile') && !userAgent.includes('Safari');
        const isIpad = /Macintosh/i.test(navigator.userAgent) &&
            navigator.maxTouchPoints &&
            navigator.maxTouchPoints > 1;
        const isIphone = /iPhone/i.test(navigator.userAgent) &&
            navigator.maxTouchPoints &&
            navigator.maxTouchPoints > 1;

        return !isWebView && !isIpad && !isIphone;
    }

    // initialized with default variables for iPhone environment. add-ons can modify
    let variables = {
        // booleans
        providesOwnUpdateLoop: false,
        shouldBroadcastUpdateObjectMatrix: false,
        doWorldObjectsRequireCameraTransform: false,
        requiresMouseEvents: false,
        supportsDistanceFading: true,
        shouldCreateDesktopSocket: false,
        alwaysEnableRealtime: true,
        distanceRequiresCameraTransform: false,
        ignoresFreezeButton: false,
        shouldDisplayLogicMenuModally: false,
        isSourceOfObjectPositions: true,
        isCameraOrientationFlipped: false,
        waitForARTracking: !isDesktop() && isWithinToolboxApp(), // set to false on remote operator
        overrideMenusAndButtons: false,
        listenForDeviceOrientationChanges: true,
        enableViewFrustumCulling: true,
        layoutUIForPortrait: false,
        defaultShowGroundPlane: false,
        supportsMemoryCreation: true,
        hasLocalNetworkAccess: true, // set to false if iOS device permissions disabled
        // numbers
        lineWidthMultiplier: 1, // 5
        distanceScaleFactor: 1, // 10
        newFrameDistanceMultiplier: 1, // 10
        transformControlsSize: 1, // on remote operator, we can scale down the gizmo size for moving groundplane anchors
        localServerPort: 49369, // the port where a local vuforia-spatial-edge-server can be expected
        screenTopOffset: 0, // if there's a menubar on the top, increase this
        maxAvatarIcons: 5, // limits the number of circular icons depicting how many avatars are currently connected
        // matrices
        initialPocketToolRotation: null,
        supportsAreaTargetCapture: true,
        automaticallyPromptForAreaTargetCapture: true,
        hideOriginCube: false, // explicitly don't show the 3d cubes at the world origin
        addOcclusionGltf: true, // by default loads the occlusion mesh, but a VR viewer can disable this
        suppressObjectDetections: false, // temporarily toggle on to stop UDP messages from triggered object download
        suppressObjectRendering: false, // temporarily toggle on to stop rendering objects/tools/nodes
        overrideAreaTargetScanningUI: false, // hide the default status textfield for the area target scanning
        // colors
        groundWireframeColor: 'rgb(0, 255, 255)',
    };

    // variables can be directly set by add-ons by using the public 'variables' property
    exports.variables = variables;
    // however, rather than reading these variables directly, it is preferred to use the getters:
    // this is for compatibility with future plans which will add more logic to the variables

    // using variables.suppressObjectRendering allows any module to overwrite any other module's preferences
    // but a module can add a flag, and rendering will only re-enable when all flags are cleared
    let suppressedRenderingFlags = {};

    exports.addSuppressedObjectRenderingFlag = (flagName) => {
        suppressedRenderingFlags[flagName] = true;
    };

    exports.clearSuppressedObjectRenderingFlag = (flagName) => {
        delete suppressedRenderingFlags[flagName];
    }

    exports.isObjectRenderingSuppressed = () => {
        return Object.keys(suppressedRenderingFlags).length > 0 || variables.suppressObjectRendering;
    }

    /**
     * Whether the environment contains a service that will trigger gui.ar.draw.update
     * If not, the editor will keep the update loop running while frozen to drive line animations.
     * @return {boolean} - default false
     */
    exports.providesOwnUpdateLoop = function() {
        return variables.providesOwnUpdateLoop;
    };

    /**
     * If true, and there is a localized world object in sight, looking at new objects will
     * continuously set their ar.matrix property on the server to store their position
     * @return {boolean} - default false
     */
    exports.shouldBroadcastUpdateObjectMatrix = function() {
        return variables.shouldBroadcastUpdateObjectMatrix;
    };

    /**
     * If true, multiplies world origin by the camera matrix while rendering, rather than using
     * the visibleObjects matrix for world objects un-altered.
     * May be required based on the camera system being used.
     * @return {boolean} - default false
     */
    exports.doWorldObjectsRequireCameraTransform = function() {
        return variables.doWorldObjectsRequireCameraTransform;
    };

    /**
     * If true, replaces touch events with mouse events.
     * @return {boolean} - default false
     */
    exports.requiresMouseEvents = function() {
        return variables.requiresMouseEvents;
    };

    /**
     * Whether tools and nodes should become invisible as the camera moves further away
     * @return {boolean} - default true
     */
    exports.supportsDistanceFading = function() {
        return variables.supportsDistanceFading;
    };

    /**
     * Whether the application should open a socket to directly receive /update/object,
     * /update/frame, and /update/node realtime messages
     * @return {boolean} - default false
     */
    exports.shouldCreateDesktopSocket = function() {
        return variables.shouldCreateDesktopSocket;
    };

    /**
     * Whether features such as unconstrained repositioning or distance scaling should continue even if the freeze
     * button is activated.
     * @return {boolean} - default false
     */
    exports.ignoresFreezeButton = function() {
        return variables.ignoresFreezeButton;
    };

    /**
     * Whether the logic block menu should be rendered as a popup along the right edge of the screen, rather than
     * expanding to be fullscreen and centered.
     * @return {boolean} - default false
     */
    exports.shouldDisplayLogicMenuModally = function() {
        return variables.shouldDisplayLogicMenuModally;
    };

    /**
     * Whether this client is allowed to modify/upload .matrix properties of objects.
     * Should be true for AR clients, since they can observe the world and determine latest positions of things.
     * @return {boolean} - default true
     */
    exports.isSourceOfObjectPositions = function() {
        return variables.isSourceOfObjectPositions;
    };

    /**
     * Set to true if calculating distance of visibleObjects matrix should implicitly multiply by camera position
     * Necessary for some camera systems.
     * @return {boolean} - default false
     */
    exports.distanceRequiresCameraTransform = function() {
        return variables.distanceRequiresCameraTransform;
    };

    /**
     * In some environments adding new tools (etc) at the camera position results in them appearing upside-down unless
     * corrected with some matrix adjustments
     * @return {boolean} - default false
     */
    exports.isCameraOrientationFlipped = function() {
        return variables.isCameraOrientationFlipped;
    };

    /**
     * How much bigger than usual each dot in a link should be rendered
     * @return {number} - default 1
     */
    exports.getLineWidthMultiplier = function() {
        return variables.lineWidthMultiplier;
    };

    /**
     * How much further away than usual before a tool or node fades away
     * @return {number} - default 1
     */
    exports.getDistanceScaleFactor = function() {
        return variables.distanceScaleFactor;
    };

    /**
     * The port where a local vuforia-spatial-edge-server can be expected
     * This is where the toolbox tries to load the _WORLD_local
     * @return {number} - default 49369
     */
    exports.getLocalServerPort = function() {
        return variables.localServerPort;
    };

    /**
     * True by default - whether this client needs to wait for the AR SDK to provide it with camera matrices
     * @return {boolean}
     */
    exports.waitForARTracking = function() {
        return variables.waitForARTracking;
    };

    /**
     * Multiplies the original transform of tools dropped from the pocket by this
     * @return {Array.<number>|null}
     */
    exports.getInitialPocketToolRotation = function() {
        return variables.initialPocketToolRotation;
    };

    exports.isDesktop = isDesktop;
    exports.isWithinToolboxApp = isWithinToolboxApp;
    exports.isARMode = isARMode;

}(realityEditor.device.environment));
