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

createNameSpace("realityEditor.device.layout");

/**
 * @fileOverview realityEditor.device.layout.js
 * Adjusts the user interface layout for different screen sizes.
 * @todo currently just adjusts for iPhoneX shape, but eventually all screen changes should be moved here
 */

/**
 * Adjusts the CSS of various UI elements (buttons, pocket, settings menu, crafting board) to fit the iPhoneX screen.
 */
realityEditor.device.layout.adjustForScreenSize = function() {

    // center the menu vertically if the screen is taller than 320 px
    var MENU_HEIGHT = 320;
    var menuHeightDifference = globalStates.width - MENU_HEIGHT;
    document.getElementById('UIButtons').style.top = menuHeightDifference/2 + 'px';
    CRAFTING_GRID_HEIGHT = globalStates.width - menuHeightDifference;

    // in onLoad.js, (globalStates.device === 'iPhone10,3') is not set yet, so use other method to set up screen
    if (globalStates.rightEdgeOffset) { 

        console.log('adjust right edge of interface for iPhone X');

        var scaleFactor = (window.innerWidth - globalStates.rightEdgeOffset) / window.innerWidth;

        // menu buttons
        document.querySelector('#UIButtons').style.width = window.innerWidth - globalStates.rightEdgeOffset + 'px';
        document.querySelector('#UIButtons').style.right = globalStates.rightEdgeOffset + 'px';

        // pocket
        if (!TEMP_DISABLE_MEMORIES) {
            document.querySelector('.memoryBar').style.transformOrigin = 'left top';
            document.querySelector('.memoryBar').style.transform = 'scale(' + scaleFactor * 0.99 + ')'; // 0.99 factor makes sure it fits
        }
        document.querySelector('#pocketScrollBar').style.right = 75 + globalStates.rightEdgeOffset + 'px';
        document.querySelector('.palette').style.width = '100%';
        document.querySelector('.palette').style.transformOrigin = 'left top';
        document.querySelector('.palette').style.transform = 'scale(' + scaleFactor * 0.99 + ')';
        document.querySelector('.nodeMemoryBar').style.transformOrigin = 'left top';
        document.querySelector('.nodeMemoryBar').style.transform = 'scale(' + scaleFactor * 0.99 + ')';

        // settings
        document.querySelector('#settingsIframe').style.width = document.body.offsetWidth - globalStates.rightEdgeOffset + 'px';
        var edgeDiv = document.createElement('div');
        edgeDiv.id = 'settingsEdgeDiv';
        edgeDiv.style.backgroundColor = 'rgb(34, 34, 34)';
        edgeDiv.style.position = 'absolute';
        edgeDiv.style.left = document.body.offsetWidth - globalStates.rightEdgeOffset + 'px';
        edgeDiv.style.width = globalStates.rightEdgeOffset + 'px';
        edgeDiv.style.top = '0';
        edgeDiv.style.height = document.body.offsetHeight;
        edgeDiv.style.display = 'none';
        document.body.appendChild(edgeDiv);

        // crafting
        realityEditor.gui.crafting.menuBarWidth += globalStates.rightEdgeOffset;
    }
};

/**
 * Returns the x-coordinate of the edge of the trash drop-zone, adjusted for different screen sizes.
 * @return {number}
 */
realityEditor.device.layout.getTrashThresholdX = function() {
    return (globalStates.height - 60 - globalStates.rightEdgeOffset);
};

/**
 * Because we flip the entire webview with native code, the UI is correct, but we just need to fix the projection matrix
 * because the camera view relative to the webview is rotated 180 degrees.
 * The default UI was built for "landscapeRight" mode (left-handed).
 * @param {string} orientationString - "landscapeLeft", "landscapeRight", "portrait", "portraitUpsideDown", or "unknown"
 * @todo - on portrait mode detected, make big changes to pocket, menus, button rotations, crafting, etc
 */
realityEditor.device.layout.onOrientationChanged = function(orientationString) {
    console.log('device orientation changed to ' + orientationString);

    if (orientationString === 'landscapeRight') { // default
        realityEditor.gui.ar.updateProjectionMatrix(false);
    } else if (orientationString === 'landscapeLeft') { // flipped
        realityEditor.gui.ar.updateProjectionMatrix(true);
    }
};
