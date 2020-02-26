createNameSpace("realityEditor.device.hololensAdapter");

/**
 * @fileOverview realityEditor.device.hololensAdapter.js
 * Contains hololens-specific service code for stereoscopic rendering.
 */

(function(exports) {

    /**
     * @type {boolean} - true if running on hololens and want to hide menu buttons
     */
    var hololensMode;

    /**
     * @type {string} - which eye this editor is displaying - 'left' or 'right'
     */
    var hololensSide;

    /**
     * Initializes the API for HoloLens communication.
     * It is OK to call this even if not running on a HoloLens.
     */
    function initService() {
        realityEditor.network.addPostMessageHandler('hololensMessage', handleHololensMessage);

        realityEditor.gui.settings.addToggle('Holo-Mode', 'adjusts UI for HMD viewer (desktop only)', 'hololensModeEnabled',  '../../../svg/holo.svg', false, function(newValue) {
            console.log('hololens mode was set to ' + newValue);
            toggleHololensMode(newValue);
        });
    }

    /**
     * Handles messages posted into the window/iframe with structure {hololensMessage: msgContent}
     * @param {Object} msgContent - JSON object passed into the hololensMessage property of the post message
     */
    function handleHololensMessage(msgContent) {

        console.log(hololensSide + ' eye received message', msgContent);

        if (typeof msgContent.projectionMatrix !== "undefined") {
            setProjectionMatrix(msgContent.projectionMatrix);
        }

        if (typeof msgContent.toggleNodeView !== "undefined") {
            toggleNodeView(msgContent.toggleNodeView);
        }

        if (typeof msgContent.toggleHololensMode !== "undefined") {
            // hololensMode = msgContent.hololensMode;
            hololensSide = msgContent.hololensSide;
            toggleHololensMode(msgContent.toggleHololensMode, msgContent.hololensSide);
        }
    }

    /**
     * API to set the projection matrix from the hololens
     * @param {Array.<number>} matrix
     */
    function setProjectionMatrix(matrix) {
        console.log('set projection matrix', matrix);
        realityEditor.gui.ar.setProjectionMatrix(matrix);
    }

    /**
     * API to switch between GUI (frames) and Logic (nodes) views
     * @param {boolean} isNodeView - if true, view nodes, otherwise view frames
     */
    function toggleNodeView(isNodeView) {
        console.log('toggle node view', isNodeView);

        if (isNodeView) {
            realityEditor.gui.buttons.logicButtonUp({button: "logic", ignoreIsDown: true});
        } else {
            realityEditor.gui.buttons.guiButtonUp({button: "gui", ignoreIsDown: true});
        }
    }

    /**
     * API to enable or disable hololens mode, which currently just changes the visuals (hides the sidebar menu)
     * @param {boolean} newMode - true iff running in hololens stereoscopic view
     * @param {string|undefined} newSide - 'left' or 'right' eye. ignore if undefined.
     */
    function toggleHololensMode(newMode, newSide) {
        hololensMode = newMode;
        if (typeof newSide !== 'undefined') { hololensSide = newSide; }

        console.log('toggle hololens mode (' + hololensSide + ') => ' + hololensMode);

        // hide sidebar menu buttons
        realityEditor.gui.settings.toggleStates.clearSkyState = hololensMode;
        if (realityEditor.gui.settings.toggleStates.clearSkyState) {
            document.getElementById("UIButtons").classList.add('clearSky');
        } else {
            document.getElementById("UIButtons").classList.remove('clearSky');
        }
    }
    
    exports.initService = initService;

}(realityEditor.device.hololensAdapter));
