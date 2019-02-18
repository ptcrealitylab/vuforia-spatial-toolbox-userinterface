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

    // initialize additional features
    realityEditor.device.initFeature();
    realityEditor.device.touchInputs.initFeature();
    realityEditor.device.videoRecording.initFeature();
    realityEditor.gui.ar.frameHistoryRenderer.initFeature();
    realityEditor.device.touchPropagation.initFeature();
    realityEditor.device.speechPerformer.initFeature(); // TODO: feature is internally disabled
    realityEditor.device.security.initFeature(); // TODO: feature is internally disabled
    realityEditor.network.realtime.initFeature();
    realityEditor.device.hololensAdapter.initFeature();
    realityEditor.device.desktopAdapter.initFeature();
    realityEditor.gui.ar.desktopRenderer.initFeature();
    realityEditor.gui.crafting.initFeature();
    realityEditor.worldObjects.initFeature();
    realityEditor.device.distanceScaling.initFeature();
    realityEditor.device.keyboardEvents.initFeature();
    realityEditor.network.frameContentAPI.initFeature();

    // on desktop, the desktopAdapter adds a different update loop, but on mobile we set up the default one here
    if (!realityEditor.device.utilities.isDesktop()) {
        realityEditor.gui.ar.draw.updateLoop();
    }

    realityEditor.app.getExternalText(function(savedState) {
        if (savedState === '(null)') { savedState = 'null'; };
        console.log('saved external text = ', JSON.parse(savedState));
        if (savedState) {
            this.appFunctionCall("loadNewUI", {reloadURL: savedState});
        }
    });

    realityEditor.app.getDiscoveryText(function(savedState) {
        if (savedState === '(null)') { savedState = 'null'; };
        console.log('saved discovery text = ', JSON.parse(savedState));
    });

    globalStates.realityState = false;
    globalStates.tempUuid = realityEditor.device.utilities.uuidTimeShort();
    this.cout("This editor's session UUID: " + globalStates.tempUuid);

    // assign global pointers to frequently used UI elements
    uiButtons = document.getElementById("GUI");
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
	realityEditor.gui.memory.initMemoryBar();
	realityEditor.gui.memory.nodeMemories.initMemoryBar();
	realityEditor.gui.pocket.pocketInit();

	// set up the global canvas for drawing the links
	globalCanvas.canvas = document.getElementById('canvas');
    globalCanvas.canvas.width = globalStates.height; // TODO: fix width vs height mismatch once and for all
    globalCanvas.canvas.height = globalStates.width;
	globalCanvas.context = canvas.getContext('2d');

    // add a callback for messages posted up to the application from children iframes
	window.addEventListener("message", realityEditor.network.onInternalPostMessage.bind(realityEditor.network), false);
		
	// adds all the event handlers for setting up the editor
    realityEditor.device.addDocumentTouchListeners();
    
    // adjust for iPhoneX size if needed
    realityEditor.device.layout.adjustForScreenSize();

    // prevent touch events on overlayDiv
    overlayDiv.addEventListener('touchstart', function (e) {
        e.preventDefault();
    });
    
    // start TWEEN library for animations
    (function animate(time) {
        requestAnimationFrame(animate);
        TWEEN.update(time);
    })();
    
    // start the AR framework in native iOS
    realityEditor.app.getVuforiaReady('realityEditor.app.callbacks.vuforiaIsReady');
    
    // window.addEventListener('resize', function(event) {
    //     console.log(window.innerWidth, window.innerHeight);
    // });

    if (globalStates.debugSpeechConsole) {
        document.getElementById('speechConsole').style.display = 'inline';
    }

    // initWorldObject();

    this.cout("onload");
};

window.onload = realityEditor.device.onload;
