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
    // width: window.innerHeight,
    // height: window.innerWidth,

    document.querySelector('#craftingBoard').style.width = '100%';
    document.querySelector('#craftingBoard').style.height = '100%';

    if (globalStates.rightEdgeOffset) { /// globalStates.device === 'iPhone10,3' is not set yet, so use other method to set up screen

        // globalStates.height = document.body.offsetWidth; //document.body.offsetHeight;
        // globalStates.width = document.body.offsetHeight; //document.body.offsetWidth;
        // adjust everything for iPhoneX if necessary
        // realityEditor.gui.ar.setProjectionMatrix(globalStates.realProjectionMatrix);

        console.log('adjust right edge of interface for iPhone X');

        var scaleFactor = (window.innerWidth - globalStates.rightEdgeOffset) / window.innerWidth;

        // menu buttons
        document.querySelector('#UIButtons').style.width = window.innerWidth - globalStates.rightEdgeOffset + 'px';
        document.querySelector('#UIButtons').style.right = globalStates.rightEdgeOffset + 'px';

        // pocket
        document.querySelector('.memoryBar').style.transformOrigin = 'left top';
        document.querySelector('.memoryBar').style.transform = 'scale(' + scaleFactor * 0.99 + ')';
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
        // document.querySelector('#settingsIframe').appendChild(edgeDiv);
        // document.querySelector('#settingsIframe').appendChild(edgeDiv);
        document.body.appendChild(edgeDiv);

        // crafting
        // document.querySelector('#craftingBoard').style.left = '44px';
        // document.querySelector('#craftingBoard').style.left = '44px';
        menuBarWidth += globalStates.rightEdgeOffset;

        // TODO: change class definitions for the following properties to apply to all future instances of these classes...

        /*
        
        .blockPlaceholder
            width: 92px;
            margin-right: 46px;
        
        .blockPlaceholderLastCol {
            width: 92px;

        .columnHighlight {
            width: 92px;
            margin-right: 46px;
            
         .columnHighlightLastCol {
            width: 92px;  
            
         #datacraftingEventDiv {
            width: 568px;
            height: 320px; 
              
         .settingsContainer {
            width: 506px;
            height: 320px;     
              
          #menuContainer {
            width: 506px;
            height: 320px;

          #menuBlockContainer {
            width: 400px;
            height: 320px;

          #menuSideContainer {
            left: 398px;
            width: 106px;
            height: 320px;

          .menuBlock {
            width: 92px;
            height: 46px;
            
          .menuTab {
            width: 106px;
            height: 59.5px;
  
          .menuTabSelected {
            width: 106px;
            height: 59.5px;
            
         */

    }
};
