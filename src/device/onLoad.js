/**
 *
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *      ╦═╗┌─┐┌─┐┬  ┬┌┬┐┬ ┬  ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐  ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *      ╠╦╝├┤ ├─┤│  │ │ └┬┘  ║╣  │││ │ │ │├┬┘  ╠═╝├┬┘│ │ │├┤ │   │
 *      ╩╚═└─┘┴ ┴┴─┘┴ ┴  ┴   ╚═╝─┴┘┴ ┴ └─┘┴└─  ╩  ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2015 Valentin Heun
 * Modified by Valentin Heun 2014, 2015, 2016, 2017
 * Modified by Benjamin Reynholds 2016, 2017
 * Modified by James Hobin 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

createNameSpace("realityEditor.device");

/**
 * @fileOverview realityEditor.device.onLoad.js
 * Sets the application's window.onload function to trigger this init method, which sets up the GUI and networking.
 */

// add-ons can register a function to be called instead of getVuforiaReady
realityEditor.device.initFunctions = [];

realityEditor.device.loaded = false;
/**
 * When the index.html first finishes loading, set up the:
 * Sidebar menu buttons,
 * Pocket and memory bars,
 * Background canvas,
 * Touch Event Listeners,
 * Network callback function,
 * ... and notify the native iOS code that the user interface finished loading
 */
realityEditor.device.onload = async function () {

    // Initialize some global variables for the device session
    this.cout('Running on platform: ' + globalStates.platform);
    if (globalStates.platform !== 'iPad' && globalStates.platform !== 'iPhone' && globalStates.platform !== 'iPod touch') {
        globalStates.platform = false;
    }

    // Add-ons may need to modify globals or do other far-reaching changes that
    // other services will need to pick up in their initializations
    await realityEditor.addons.onInit();

    // Check whether we're offline by adding a cache-busting search parameter
    fetch(window.location + '/?offlineCheck=' + Date.now()).then(res => {
        if (!res.headers.has('X-Offline-Cache')) {
            return;
        }

        let message = 'Network Offline: Showing last known state. Most functionality is disabled.';
        // showBannerNotification removes notification after set time so no additional function is needed
        let offlineNotificationUI = realityEditor.gui.modal.showBannerNotification(message, 'offlineUIcontainer', 'offlineUItext', 5000);
        document.body.appendChild(offlineNotificationUI);
    });

    // set up the global canvas for drawing the links
    globalCanvas.canvas = document.getElementById('canvas');
    globalCanvas.canvas.width = globalStates.height; // TODO: fix width vs height mismatch once and for all
    globalCanvas.canvas.height = globalStates.width;
    globalCanvas.context = globalCanvas.canvas.getContext('2d');

    realityEditor.device.environment.initService();

    // adds touch handlers for each of the menu buttons
    if (!realityEditor.device.environment.variables.overrideMenusAndButtons) {
        realityEditor.gui.menus.init();

        // set active buttons and preload some images
        realityEditor.gui.menus.switchToMenu("main", ["gui"], ["reset", "unconstrained"]);
        realityEditor.gui.buttons.initButtons();
    }
    
    // initialize additional services
    try {
        realityEditor.device.initService();
        realityEditor.device.layout.initService();
        realityEditor.device.modeTransition.initService();
        realityEditor.device.touchInputs.initService();
        realityEditor.device.videoRecording.initService();
        realityEditor.device.tracking.initService();
        realityEditor.device.profiling.initService();
        realityEditor.gui.ar.frameHistoryRenderer.initService();
        realityEditor.gui.ar.grouping.initService();
        realityEditor.gui.ar.anchors.initService();
        realityEditor.gui.ar.groundPlaneAnchors.initService();
        realityEditor.gui.ar.groundPlaneRenderer.initService();
        realityEditor.gui.ar.areaTargetScanner.initService();
        realityEditor.gui.ar.areaCreator.initService();
        realityEditor.gui.ar.videoPlayback.initService();
        realityEditor.gui.settings.setupSettingsMenu.initService();
        realityEditor.device.touchPropagation.initService();
        realityEditor.network.discovery.initService();
        realityEditor.network.realtime.initService();
        realityEditor.gui.crafting.initService();
        realityEditor.worldObjects.initService();
        realityEditor.device.distanceScaling.initService();
        realityEditor.device.keyboardEvents.initService();
        realityEditor.network.frameContentAPI.initService();
        realityEditor.envelopeManager.initService();
        realityEditor.network.availableFrames.initService();
        realityEditor.network.search.initService();
        realityEditor.sceneGraph.initService();
        realityEditor.gui.glRenderer.initService();
        realityEditor.gui.threejsScene.initService();
        realityEditor.measure.clothSimulation.initService();
        // realityEditor.device.multiclientUI.initService();
        realityEditor.avatar.initService();
        realityEditor.humanPose.initService();
        realityEditor.motionStudy.initService();
        realityEditor.oauth.initService();
        realityEditor.spatialCursor.initService();
        realityEditor.gui.spatialIndicator.initService();
        realityEditor.gui.spatialArrow.initService();
        realityEditor.gui.recentlyUsedBar.initService();
        realityEditor.gui.envelopeIconRenderer.initService();
        realityEditor.gui.search.initService();
    } catch (initError) {
        // show an error message rather than crash entirely; otherwise Vuforia Engine will never start
        console.error('error in initService functions, might lead to corrupted app state', initError);
        try {
            let initializeMessage = 'Error initializing. Restart app or contact support.';
            // showBannerNotification removes notification after set time so no additional function is needed
            let initializeUI = realityEditor.gui.modal.showBannerNotification(initializeMessage, 'initializeUIContainer', 'initializeText', 5000);
            document.body.appendChild(initializeUI);
        } catch (alertError) {
            alert(`Error initializing. Restart app or contact support. ${initError}, ${alertError}`);
        }
    }

    realityEditor.app.promises.getDeviceReady().then(deviceName => {
        globalStates.device = deviceName;
        console.log('The Reality Editor is loaded on a ' + globalStates.device);
        realityEditor.device.layout.adjustForDevice(deviceName);
    });

    globalStates.tempUuid = realityEditor.device.utilities.uuidTimeShort();
    this.cout("This editor's session UUID: " + globalStates.tempUuid);

    // assign global pointers to frequently used UI elements
    overlayDiv = document.getElementById('overlay');
    overlayDiv2 = document.getElementById('overlay2');
    
    // center the menu vertically if the screen is taller than 320 px
    var MENU_HEIGHT = 320;
    var menuHeightDifference = globalStates.width - MENU_HEIGHT;
    document.getElementById('UIButtons').style.top = menuHeightDifference/2 + 'px';
    CRAFTING_GRID_HEIGHT = globalStates.width - menuHeightDifference;
	
	// set up the pocket and memory bars
    if (!TEMP_DISABLE_MEMORIES) {
        realityEditor.gui.memory.initMemoryBar();
    } else {
        var pocketMemoryBar = document.querySelector('.memoryBar');
        pocketMemoryBar.parentElement.removeChild(pocketMemoryBar);
    }
	realityEditor.gui.memory.nodeMemories.initMemoryBar();
	realityEditor.gui.pocket.pocketInit();

    // add a callback for messages posted up to the application from children iframes
	window.addEventListener("message", realityEditor.network.onInternalPostMessage.bind(realityEditor.network), false);
		
	// adds all the event handlers for setting up the editor
    realityEditor.device.addDocumentTouchListeners();
    
    // adjust for iPhoneX size if needed
    realityEditor.device.layout.adjustForScreenSize();

    // adjust when phone orientation changes - also triggers one time immediately with the initial orientation
    if (realityEditor.device.environment.variables.listenForDeviceOrientationChanges) {
        realityEditor.app.enableOrientationChanges('realityEditor.device.layout.onOrientationChanged');
    }

    // prevent touch events on overlayDiv
    overlayDiv.addEventListener('touchstart', function (e) {
        e.preventDefault();
    });

    // release pointerevents that hit the background so that they can trigger pointerenter events on other elements
    document.body.addEventListener('gotpointercapture', function(evt) {
        evt.target.releasePointerCapture(evt.pointerId);
    });

    const SHOW_FPS_STATS = false;
    let stats;
    if (SHOW_FPS_STATS) {
        stats = new Stats();
        document.body.appendChild(stats.dom);
    }
    
    // start TWEEN library for animations
    (function animate(time) {
        realityEditor.gui.ar.draw.frameNeedsToBeRendered = true;
        // TODO This is a hack to keep the crafting board running
        if (globalStates.freezeButtonState && !realityEditor.device.environment.providesOwnUpdateLoop()) {
            realityEditor.gui.ar.draw.update(realityEditor.gui.ar.draw.visibleObjectsCopy); 
        }
        requestAnimationFrame(animate);
        TWEEN.update(time);

        if (SHOW_FPS_STATS) {
            stats.update();
        }
    })();
    
    if (realityEditor.device.initFunctions.length === 0) {
        realityEditor.app.promises.didGrantNetworkPermissions().then(success => {
            // network permissions are no longer required for the app to function, but we can
            // provide UI feedback if they try to use a feature (discovering unknown servers) that relies on this
            if (typeof success === 'boolean') {
                realityEditor.device.environment.variables.hasLocalNetworkAccess = success;
            }

            // start the AR framework in native iOS
            realityEditor.app.promises.getVuforiaReady().then(success => {
                realityEditor.app.callbacks.vuforiaIsReady(success);
            });
        });
    } else {
        realityEditor.device.initFunctions.forEach(function(initFunction) {
            initFunction();
        });
    }

    // see if we should open the modal - defaults hidden but can be turned on from menu
    let shouldShowIntroModal = window.localStorage.getItem('neverAgainShowIntroTips') !== 'true';

    if (shouldShowIntroModal) {
        let modalBody = "The Vuforia Spatial Toolbox is an open source research platform for exploring Augmented Reality and Spatial Computing.<br>" +
            "<ul>" +
            "</li>1. <a class='modalLink' href='https://spatialtoolbox.vuforia.com/docs/use/using-the-app'>Learn how to use the Spatial Toolbox</a><br><br></li>" +
            "</li>2. <a class='modalLink' href='https://spatialtoolbox.vuforia.com/docs/use/connect-to-the-physical-world/startSystem'> Learn how to connect the Physical World</a><br><br></li>" +
            "</li>3. <a class='modalLink' href='https://forum.spatialtoolbox.vuforia.com'> Join the conversation with your questions, ideas and collaboration</a><br><br></li>" +
            "</li>4. <a class='modalLink' href='https://github.com/ptcrealitylab'> Browse the Open Source Code on Github</a><br><br></li>" +
            "</ul>";

        realityEditor.gui.modal.openClassicModal('Welcome to the Vuforia Spatial Toolbox!', modalBody, 'Close', 'Close and Don\'t Show Again', function() {
            // console.log('Closed');
        }, function() {
            // console.log('Closed and Don\'t Show Again!');
            introToggle.setValue(false);
        });
    }

    this.cout("onload");

    realityEditor.device.loaded = true;
};

window.onload = realityEditor.device.onload;
