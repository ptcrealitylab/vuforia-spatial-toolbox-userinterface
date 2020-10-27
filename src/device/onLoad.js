/**
 * @preserve
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

/**
 * When the index.html first finishes loading, set up the:
 * Sidebar menu buttons,
 * Pocket and memory bars,
 * Background canvas,
 * Touch Event Listeners,
 * Network callback function,
 * ... and notify the native iOS code that the user interface finished loading
 */
realityEditor.device.onload = function () {

    // Initialize some global variables for the device session
    this.cout('Running on platform: ' + globalStates.platform);
    if (globalStates.platform !== 'iPad' && globalStates.platform !== 'iPhone' && globalStates.platform !== 'iPod touch') {
        globalStates.platform = false;
    }

    // Add-ons may need to modify globals or do other far-reaching changes that
    // other services will need to pick up in their initializations
    realityEditor.addons.onInit();

    // populate the default settings menus with toggle switches and text boxes, with associated callbacks

    realityEditor.gui.settings.addToggleWithText('Zone', 'limit object discovery to zone', 'zoneState', '../../../svg/zone.svg', false, 'enter zone name',
        function(newValue) {
            console.log('zone mode was set to ' + newValue);
        },
        function(newValue) {
            console.log('zone text was set to ' + newValue);
        }
    );

    realityEditor.gui.settings.addToggle('Power-Save Mode', 'turns off some effects for faster performance', 'powerSaveMode',  '../../../svg/powerSave.svg', false, function(newValue) {
        // only draw frame ghosts while in programming mode if we're not in power-save mode
        globalStates.renderFrameGhostsInNodeViewEnabled = !newValue;
    });

    realityEditor.gui.settings.addToggle('Grouping', 'double-tap background to draw group around frames', 'groupingEnabled',  '../../../svg/grouping.svg', false, function(newValue) {
        console.log('grouping was set to ' + newValue);
        realityEditor.gui.ar.grouping.toggleGroupingMode(newValue);
    });

    realityEditor.gui.settings.addToggle('Realtime Collaboration', 'constantly synchronizes with other users', 'realtimeEnabled',  '../../../svg/realtime.svg', false, function(newValue) {
        console.log('realtime was set to ' + newValue);
        if (newValue) {
            realityEditor.network.realtime.initService();
        }
        // TODO: turning this off currently doesn't actually end the realtime mode unless you restart the app
    });

    realityEditor.gui.settings.addToggle('Show Tutorial', 'add tutorial frame on app start', 'tutorialState',  '../../../svg/tutorial.svg', false, function(newValue) {
        console.log('tutorial mode was set to ' + newValue);
    });

    let introToggle = realityEditor.gui.settings.addToggle('Show Intro Page', 'shows tips on app start', 'introTipsState',  '../../../svg/tutorial.svg', false, function(newValue) {
        if (newValue) {
            window.localStorage.removeItem('neverAgainShowIntroTips');
        } else {
            window.localStorage.setItem('neverAgainShowIntroTips', 'true');
        }
    });
    
    // add settings toggles for the Develop sub-menu

    realityEditor.gui.settings.addToggle('AR-UI Repositioning', 'instantly drag frames instead of interacting', 'editingMode',  '../../../svg/move.svg', false, function(newValue) {
        realityEditor.device.setEditingMode(newValue);
    }).moveToDevelopMenu();

    realityEditor.gui.settings.addToggle('Clear Sky Mode', 'hides all buttons', 'clearSkyState',  '../../../svg/clear.svg', false, function(newValue) {
        console.log('clear sky mode set to ' + newValue);
    }).moveToDevelopMenu();

    realityEditor.gui.settings.addToggleWithFrozenText('Interface URL', 'currently: ' + window.location.href, 'externalState',  '../../../svg/download.svg', false, 'http://...', function(newValue, textValue) {

        if (newValue && textValue.length > 0) {
            // we still need to save this to native device storage to be backwards-compatible with how the interface is loaded
            realityEditor.app.saveExternalText(textValue);

            let isCurrentUrl = window.location.href.includes(textValue);
            if (!isCurrentUrl) {
                setTimeout(function() { // load from external server when toggled on with a new url
                    realityEditor.app.appFunctionCall("loadNewUI", {reloadURL: textValue});
                }.bind(this), 1000);
            }
        } else {
            realityEditor.app.saveExternalText('');
            setTimeout(function() { // reload from local server when toggled off
                realityEditor.app.appFunctionCall("loadNewUI", {reloadURL: ''});
            }.bind(this), 1000);
        }

    }, true).moveToDevelopMenu().setValue(!window.location.href.includes('127.0.0.1')); // default value is based on the current source

    realityEditor.gui.settings.addToggleWithFrozenText('Discovery Server', 'load objects from static server', 'discoveryState',  '../../../svg/discovery.svg', false, 'http://...', function(newValue, textValue) {
        console.log('discovery state set to ' + newValue + ' with text ' + textValue);

        if (newValue) {
            setTimeout(function() {
                realityEditor.network.discoverObjectsFromServer(textValue);
            }, 1000); // wait to make sure all the necessary modules for object discovery/creation are ready
        }

    }).moveToDevelopMenu();

    // Add a debug toggle to the develop menu that forces the targetDownloader to re-download each time instead of using the cache
    realityEditor.gui.settings.addToggle('Reset Target Cache', 'clear cache of downloaded target data', 'resetTargetCache',  '../../../svg/object.svg', false, function(newValue) {
        if (newValue) {
            realityEditor.app.targetDownloader.resetTargetDownloadCache();
        }
    }).moveToDevelopMenu();

    // set up the global canvas for drawing the links
    globalCanvas.canvas = document.getElementById('canvas');
    globalCanvas.canvas.width = globalStates.height; // TODO: fix width vs height mismatch once and for all
    globalCanvas.canvas.height = globalStates.width;
    globalCanvas.context = globalCanvas.canvas.getContext('2d');

    // adds touch handlers for each of the menu buttons
    realityEditor.gui.menus.init();
    
    // set active buttons and preload some images
    realityEditor.gui.menus.switchToMenu("main", ["gui"], ["reset","unconstrained"]);
    realityEditor.gui.buttons.initButtons();
    
    // initialize additional services
    realityEditor.device.initService();
    realityEditor.device.touchInputs.initService();
    realityEditor.device.videoRecording.initService();
    realityEditor.device.environment.initService();
    realityEditor.gui.ar.frameHistoryRenderer.initService();
    realityEditor.gui.ar.grouping.initService();
    realityEditor.gui.ar.anchors.initService();
    realityEditor.gui.ar.groundPlaneRenderer.initService();
    realityEditor.device.touchPropagation.initService();
    realityEditor.network.realtime.initService();
    realityEditor.gui.crafting.initService();
    realityEditor.worldObjects.initService();
    realityEditor.device.distanceScaling.initService();
    realityEditor.device.keyboardEvents.initService();
    realityEditor.network.frameContentAPI.initService();
    realityEditor.envelopeManager.initService();
    realityEditor.network.availableFrames.initService();
    realityEditor.gui.ar.sceneGraph.initService();

    realityEditor.app.getDeviceReady('realityEditor.app.callbacks.getDeviceReady');

    globalStates.tempUuid = realityEditor.device.utilities.uuidTimeShort();
    this.cout("This editor's session UUID: " + globalStates.tempUuid);

    // assign global pointers to frequently used UI elements
    overlayDiv = document.getElementById('overlay');
    
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
    realityEditor.app.enableOrientationChanges('realityEditor.device.layout.onOrientationChanged');

    // prevent touch events on overlayDiv
    overlayDiv.addEventListener('touchstart', function (e) {
        e.preventDefault();
    });

    // release pointerevents that hit the background so that they can trigger pointerenter events on other elements
    document.body.addEventListener('gotpointercapture', function(evt) {
        evt.target.releasePointerCapture(evt.pointerId);
    });

    var stats = new Stats();
    // stats.showPanel( 2 );
    document.body.appendChild(stats.dom);
    
    // start TWEEN library for animations
    (function animate(time) {
        realityEditor.gui.ar.draw.frameNeedsToBeRendered = true;
        // TODO This is a hack to keep the crafting board running
        if (globalStates.freezeButtonState && !realityEditor.device.environment.providesOwnUpdateLoop()) {
            realityEditor.gui.ar.draw.update(realityEditor.gui.ar.draw.visibleObjectsCopy); 
        }
        requestAnimationFrame(animate);
        TWEEN.update(time);
        stats.update();
        
        // TODO: implement separated render and recalculate functions for the rendering engine
        // realityEditor.gui.ar.draw.render();
    })();
    
    // start the AR framework in native iOS
    realityEditor.app.getVuforiaReady('realityEditor.app.callbacks.vuforiaIsReady');

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
            console.log('Closed');
        }, function() {
            console.log('Closed and Don\'t Show Again!');
            introToggle.setValue(false);
        });
    }

    this.cout("onload");
};

window.onload = realityEditor.device.onload;
