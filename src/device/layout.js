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
        document.querySelector('.memoryBar').style.transformOrigin = 'left top';
        document.querySelector('.memoryBar').style.transform = 'scale(' + scaleFactor * 0.99 + ')'; // 0.99 factor makes sure it fits
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
        menuBarWidth += globalStates.rightEdgeOffset;
    }
};

realityEditor.device.layout.getTrashThresholdX = function() {
    return (globalStates.height - 60 - globalStates.rightEdgeOffset);
};
