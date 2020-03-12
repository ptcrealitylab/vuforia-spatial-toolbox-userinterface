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
    
    realityEditor.gui.settings.addToggle('Extended Tracking', 'further track image and object targets', 'extendedTracking', '../../../svg/extended.svg', false, function(newValue) {
        console.log('extended tracking was set to ' + newValue);
        realityEditor.app.enableExtendedTracking(newValue);
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

    realityEditor.gui.settings.addToggle('Video Recording', 'show recording button to create video frames', 'videoRecordingEnabled',  '../../../svg/video.svg', false, function(newValue) {
        console.log('video recording was set to ' + newValue);
        if (!newValue) {
            realityEditor.device.videoRecording.stopRecording(); // ensure recording is stopped when mode is turned off
        }
    });

    realityEditor.gui.settings.addToggle('Show Tutorial', 'add tutorial frame on app start', 'tutorialState',  '../../../svg/tutorial.svg', false, function(newValue) {
        console.log('tutorial mode was set to ' + newValue);
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

    // initialize additional services
    realityEditor.device.initService();
    realityEditor.device.touchInputs.initService();
    realityEditor.device.videoRecording.initService();
    realityEditor.gui.ar.frameHistoryRenderer.initService();
    realityEditor.gui.ar.grouping.initService();
    realityEditor.device.touchPropagation.initService();
    realityEditor.network.realtime.initService();
    realityEditor.gui.crafting.initService();
    realityEditor.worldObjects.initService();
    realityEditor.device.distanceScaling.initService();
    realityEditor.device.keyboardEvents.initService();
    realityEditor.network.frameContentAPI.initService();
    realityEditor.envelopeManager.initService();
    realityEditor.network.availableFrames.initService();
    
    // on desktop, the desktopAdapter adds a different update loop, but on mobile we set up the default one here
    // if (!realityEditor.device.utilities.isDesktop()) {
    //     realityEditor.gui.ar.draw.updateLoop();
    // }

    realityEditor.app.getDeviceReady('realityEditor.app.callbacks.getDeviceReady');

    globalStates.tempUuid = realityEditor.device.utilities.uuidTimeShort();
    this.cout("This editor's session UUID: " + globalStates.tempUuid);

    // assign global pointers to frequently used UI elements
    overlayDiv = document.getElementById('overlay');

    // adds touch handlers for each of the menu buttons
    realityEditor.gui.menus.init();
    
    // center the menu vertically if the screen is taller than 320 px
    var MENU_HEIGHT = 320;
    var menuHeightDifference = globalStates.width - MENU_HEIGHT;
    document.getElementById('UIButtons').style.top = menuHeightDifference/2 + 'px';
    CRAFTING_GRID_HEIGHT = globalStates.width - menuHeightDifference;

    // set active buttons and preload some images
    realityEditor.gui.menus.switchToMenu("main", ["gui"], ["reset","unconstrained"]);
	realityEditor.gui.buttons.initButtons();
	
	// set up the pocket and memory bars
    if (!TEMP_DISABLE_MEMORIES) {
        realityEditor.gui.memory.initMemoryBar();
    } else {
        var pocketMemoryBar = document.querySelector('.memoryBar');
        pocketMemoryBar.parentElement.removeChild(pocketMemoryBar);
    }
	realityEditor.gui.memory.nodeMemories.initMemoryBar();
	realityEditor.gui.pocket.pocketInit();

	// set up the global canvas for drawing the links
	globalCanvas.canvas = document.getElementById('canvas');
    globalCanvas.canvas.width = globalStates.height; // TODO: fix width vs height mismatch once and for all
    globalCanvas.canvas.height = globalStates.width;
	globalCanvas.context = globalCanvas.canvas.getContext('2d');

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

    // var stats=new Stats();
    // // stats.showPanel( 2 );
    // document.body.appendChild(stats.dom);
    
    // start TWEEN library for animations
    (function animate(time) {
        realityEditor.gui.ar.draw.frameNeedsToBeRendered = true;
        // TODO This is a hack to keep the crafting board running
        if (globalStates.freezeButtonState && !realityEditor.device.utilities.isDesktop()) {
            realityEditor.gui.ar.draw.update(realityEditor.gui.ar.draw.visibleObjectsCopy); 
        }
        requestAnimationFrame(animate);
        TWEEN.update(time);
        // stats.update();
        
        // TODO: implement separated render and recalculate functions for the rendering engine
        // realityEditor.gui.ar.draw.render();
    })();
    
    // start the AR framework in native iOS
    realityEditor.app.getVuforiaReady('realityEditor.app.callbacks.vuforiaIsReady');
    
    // window.addEventListener('resize', function(event) {
    //     console.log(window.innerWidth, window.innerHeight);
    // });
    
    // this is purely for debugging purposes, can be removed in production.
    // re-purposes the speechConsole from an old experiment into an on-screen message display for debug messages
    // TODO: implement a clean system for logging info or debug messages to an on-screen display
    if (!realityEditor.device.utilities.isDesktop()) {
        if (globalStates.debugSpeechConsole) {
            document.getElementById('speechConsole').style.display = 'inline';
            
            var DEBUG_SHOW_CLOSEST_OBJECT = false;
            if (DEBUG_SHOW_CLOSEST_OBJECT) {
                setInterval(function() {
                    var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];
                    if (closestObjectKey) {
                        var mat = realityEditor.getObject(closestObjectKey).matrix; //realityEditor.gui.ar.draw.visibleObjects[closestObjectKey];
                        if (realityEditor.gui.ar.draw.worldCorrection !== null) {
                            console.warn('Should never get here until we fix worldCorrection');
                            document.getElementById('speechConsole').innerText = 'object ' + closestObjectKey + ' is at (' + mat[12]/mat[15] + ', ' + mat[13]/mat[15] + ', ' + mat[14]/mat[15] + ')';
                        }
                    }
                }, 500);
            }
        }
    }

    this.cout("onload");
};

window.onload = realityEditor.device.onload;
