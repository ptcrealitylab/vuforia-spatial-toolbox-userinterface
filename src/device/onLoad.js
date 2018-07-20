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


/**
 * @desc
 **/

createNameSpace("realityEditor.device");

realityEditor.device.onload = function () {

    this.cout("starting up GUI");

    // initialize menus in correct state
    realityEditor.gui.menus.init();
    realityEditor.gui.menus.off("main",["gui","reset","unconstrained"]);
    realityEditor.gui.menus.on("main",["gui"]);

    // generate UUID for user session
	globalStates.tempUuid = realityEditor.device.utilities.uuidTimeShort();
	
	// initialize global variables to commonly-used DOM elements
	uiButtons = document.getElementById("GUI");
	overlayDiv = document.getElementById('overlay');
    overlayDiv.addEventListener('touchstart', function (e) {
        e.preventDefault();
    });
    
	realityEditor.gui.buttons.draw();
	realityEditor.gui.memory.initMemoryBar();
	realityEditor.gui.memory.nodeMemories.initMemoryBar();
	realityEditor.gui.pocket.pocketInit();

	this.cout('platform = ' + globalStates.platform);
	if (globalStates.platform !== 'iPad' && globalStates.platform !== 'iPhone' && globalStates.platform !== 'iPod touch') {
		globalStates.platform = false;
	}

	globalCanvas.canvas = document.getElementById('canvas');
	globalCanvas.canvas.width = globalStates.height; // TODO: fix width vs height mismatch once and for all
	globalCanvas.canvas.height = globalStates.width;
	globalCanvas.context = canvas.getContext('2d');
	
	window.addEventListener("message", realityEditor.network.onInternalPostMessage.bind(realityEditor.network), false);
	
	// adds all the event handlers for setting up the editor
    realityEditor.device.addDocumentTouchListeners();
    realityEditor.device.layout.adjustForScreenSize();
    
    // start TWEEN library for animations
    function animate(time) {
        requestAnimationFrame(animate);
        TWEEN.update(time);
    }
    animate();
    
    // start the AR framework in native iOS
    realityEditor.app.getVuforiaReady(function(){
        console.log("Vuforia is ready");
    });
    
	this.cout("onload");

};


window.onload = realityEditor.device.onload;
