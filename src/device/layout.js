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

createNameSpace('realityEditor.device.layout');

/**
 * @fileOverview realityEditor.device.layout.js
 * Adjusts the user interface layout for different screen sizes.
 * @todo currently just adjusts for iPhoneX shape, but eventually all screen changes should be moved here
 */

(function(exports) {

    // layout constants, regardless of screen size
    let MENU_HEIGHT = 320;
    let TRASH_WIDTH = 60;
    let CRAFTING_MENU_BAR_WIDTH = 62;

    // can be used to offset the right edge of the screen to fit non-rectangular screen shapes.
    let rightEdgeOffset = 0;

    // keep track of orientation from onOrientationChanged, e.g. 'landscapeLeft' vs 'landscapeRight'
    let currentOrientation;

    let knownDeviceName;

    /**
     * Center the menu buttons vertically on screens taller than MENU_HEIGHT.
     * Adjusts the CSS of various UI elements (buttons, pocket, settings menu, crafting board)
     *  to fit awkward, non-rectangular screens (looking at you, iPhone X).
     */
    function adjustForScreenSize() {
        var menuHeightDifference = globalStates.width - MENU_HEIGHT;

        // vertically center the menu if the screen is taller than 320 px
        document.getElementById('UIButtons').style.top = menuHeightDifference / 2 + 'px';

        // vertically center the crafting board by updating the global variable it uses
        CRAFTING_GRID_HEIGHT = globalStates.width - menuHeightDifference;

        adjustRightEdgeIfNeeded();
    }

    /**
     * Adjust the UI to look good on all screens, including iPhone 10, 11, etc with a non-rectangular right side.
     */
    function adjustRightEdgeIfNeeded() {
        rightEdgeOffset = calculateRightEdgeOffset();
        if (rightEdgeOffset > 0) {
            console.log('adjust right edge of interface for iPhone X');
        }

        let scaleFactor = (window.innerWidth - rightEdgeOffset) / window.innerWidth;

        // menu buttons
        document.querySelector('#UIButtons').style.width = window.innerWidth - rightEdgeOffset + 'px';
        document.querySelector('#UIButtons').style.right = rightEdgeOffset + 'px';

        // pocket
        if (!TEMP_DISABLE_MEMORIES) {
            document.querySelector('.memoryBar').style.transformOrigin = 'left top';
            document.querySelector('.memoryBar').style.transform = 'scale(' + scaleFactor * 0.99 + ')'; // 0.99 factor makes sure it fits
        }
        document.querySelector('#pocketScrollBar').style.right = 75 + rightEdgeOffset + 'px';
        document.querySelector('.palette').style.width = '100%';
        document.querySelector('.palette').style.transformOrigin = 'left top';
        document.querySelector('.palette').style.transform = 'scale(' + scaleFactor * 0.99 + ')';
        document.querySelector('.nodeMemoryBar').style.transformOrigin = 'left top';
        document.querySelector('.nodeMemoryBar').style.transform = 'scale(' + scaleFactor * 0.99 + ')';

        // settings
        document.querySelector('#settingsIframe').style.width = document.body.offsetWidth - rightEdgeOffset + 'px';
        let edgeDiv = document.getElementById('settingsEdgeDiv');
        if (!edgeDiv) {
            edgeDiv = document.createElement('div');
            edgeDiv.id = 'settingsEdgeDiv';
            edgeDiv.style.backgroundColor = 'rgb(34, 34, 34)';
            edgeDiv.style.position = 'absolute';
            edgeDiv.style.display = 'none';
            document.body.appendChild(edgeDiv);
        }
        edgeDiv.style.left = document.body.offsetWidth - rightEdgeOffset + 'px';
        edgeDiv.style.width = rightEdgeOffset + 'px';
        edgeDiv.style.top = 0;
        edgeDiv.style.height = document.body.offsetHeight;

        // crafting
        realityEditor.gui.crafting.menuBarWidth = CRAFTING_MENU_BAR_WIDTH + rightEdgeOffset;
    }

    /**
     * Use either the device identifier, or the screen size as a proxy to determine the margin on the right edge
     * These need to be hard-coded / updated whenever a new device is released with a unique screen size and edge-offset
     * @return {number}
     */
    function calculateRightEdgeOffset() {
        // if weird shape is flipped to the left side of screen, right edge offset is always 0
        if (currentOrientation === 'landscapeLeft') {
            // TODO: create a leftEdgeOffset that gets applied instead
            return 0;
        }

        // if we have access to the device name, calculate edge based on this info
        if (knownDeviceName) {
            // TODO: test on each of these 9 devices to ensure that these offsets are correct
            if (knownDeviceName === 'iPhone10,3' || knownDeviceName === 'iPhone10,6' || knownDeviceName === 'iPhone10,6' ||
                knownDeviceName === 'iPhone11,8' || knownDeviceName === 'iPhone12,1' || knownDeviceName === 'iPhone12,3') {
                return 74;
            } else if (knownDeviceName === 'iPhone11,4' || knownDeviceName === 'iPhone11,6' || knownDeviceName === 'iPhone12,5') {
                return 37;
            }
            return 0;

        } else {
            // otherwise, we can be fairly accurate by looking at  have specific offsets
            if (window.innerWidth === 856 && window.innerHeight === 375) {
                return 74; // iPhoneX has the most widest aspect ratio
            } else if (window.innerWidth >= 812 && window.innerHeight >= 375) {
                return 37; // the "Max" phones have half the inset
            }
            return 0;
        }
    }

    /**
     * Returns the x-coordinate of the edge of the trash drop-zone, adjusted for different screen sizes.
     * @return {number}
     */
    function getTrashThresholdX() {
        return (globalStates.height - TRASH_WIDTH - rightEdgeOffset);
    }

    /**
     * Because we flip the entire webview with native code, the UI is correct, but we just need to fix the projection matrix
     * because the camera view relative to the webview is rotated 180 degrees.
     * The default UI was built for "landscapeRight" mode (left-handed).
     * @param {string} orientationString - "landscapeLeft", "landscapeRight", "portrait", "portraitUpsideDown", or "unknown"
     * @todo - on portrait mode detected, make big changes to pocket, menus, button rotations, crafting, etc
     */
    function onOrientationChanged(orientationString) {
        console.log('device orientation changed to ' + orientationString);

        if (orientationString === 'landscapeRight') { // default
            realityEditor.gui.ar.updateProjectionMatrix(false);
        } else if (orientationString === 'landscapeLeft') { // flipped
            realityEditor.gui.ar.updateProjectionMatrix(true);
        }

        currentOrientation = orientationString;
        adjustRightEdgeIfNeeded(); // see if we need to update the right edge offset
    }

    /**
     * Update the layout again once we know which device we have
     * @param {string} deviceName - a machine ID / mobile device code e.g. 'iPhone8,1' (iPhone 6s) 'iPhone10,1' (iPhone 8)
     */
    function adjustForDevice(deviceName) {
        knownDeviceName = deviceName;
        adjustRightEdgeIfNeeded();
    }

    exports.adjustForScreenSize = adjustForScreenSize;
    exports.getTrashThresholdX = getTrashThresholdX;
    exports.onOrientationChanged = onOrientationChanged;
    exports.adjustForDevice = adjustForDevice;

})(realityEditor.device.layout);
