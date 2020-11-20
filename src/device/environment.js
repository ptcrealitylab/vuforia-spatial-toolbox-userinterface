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
    };

    // initialized with default variables for iPhone environment. add-ons can modify
    let variables = {
        // booleans
        providesOwnUpdateLoop: false,
        shouldBroadcastUpdateObjectMatrix: false,
        doWorldObjectsRequireCameraTransform: false,
        requiresMouseEvents: false,
        supportsDistanceFading: true,
        shouldCreateDesktopSocket: false,
        distanceRequiresCameraTransform: false,
        ignoresFreezeButton: false,
        shouldDisplayLogicMenuModally: false,
        isSourceOfObjectPositions: true,
        // numbers
        lineWidthMultiplier: 1, // 5
        distanceScaleFactor: 1, // 10
        localServerPort: 49369 // the port where a local vuforia-spatial-edge-server can be expected
    };

    // variables can be directly set by add-ons by using the public 'variables' property
    exports.variables = variables;
    // however, rather than reading these variables directly, it is preferred to use the getters:
    // this is for compatibility with future plans which will add more logic to the variables

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

}(realityEditor.device.environment));
