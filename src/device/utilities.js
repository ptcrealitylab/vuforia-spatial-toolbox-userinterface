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
 * Created by heun on 12/27/16.
 */

createNameSpace("realityEditor.device.utilities");

/**
 * @fileOverview realityEditor.device.utilities.js
 * Provides device-level utility functions such as generating UUIDs and logging debug messages.
 */

/**
 * @desc function to print to console based on debug mode set to true
 **/
function cout() {
	if (globalStates.debug){
		console.log.apply(this, arguments);
	}
}

/**
 * Generates a random 12 character unique identifier using uppercase, lowercase, and numbers (e.g. "OXezc4urfwja")
 * @return {string}
 */
realityEditor.device.utilities.uuidTime = function () {
	var dateUuidTime = new Date();
	var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + "" + dateUuidTime.getTime()).toString(36);
	while (stampUuidTime.length < 12) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
	return stampUuidTime;
};

/**
 * Generates a random 8 character unique identifier using uppercase, lowercase, and numbers (e.g. "jzY3y338")
 * @return {string}
 */
realityEditor.device.utilities.uuidTimeShort = function () {
	var dateUuidTime = new Date();
	var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var stampUuidTime = parseInt("" + dateUuidTime.getMilliseconds() + dateUuidTime.getMinutes() + dateUuidTime.getHours() + dateUuidTime.getDay()).toString(36);
	while (stampUuidTime.length < 8) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
	return stampUuidTime;
};

/**
 * Generates a random integer between min and max, including both ends of the range.
 * (e.g. min=1, max=3, can return 1, 2, or 3)
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
realityEditor.device.utilities.randomIntInc = function(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
};

// ----- Utilities for adding and removing events in a stable way ----- //

/**
 * Converts the string it is called on into a 32-bit integer hash code
 * (e.g. 'abcdef'.hashCode() = -1424385949)
 * The same string always returns the same hash code, which can be easily compared for equality.
 * Source: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
 * @return {number}
 */
String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

/**
 * Adds an event listener in a special way so that it can be properly removed later,
 * even if its function signature changed when it was added with bind, by storing a UUID reference to it in a dictionary.
 * https://stackoverflow.com/questions/11565471/removing-event-listener-which-was-added-with-bind
 *
 * @example this.addBoundListener(div, 'pointerdown', realityEditor.gui.crafting.eventHandlers.onPointerDown, realityEditor.gui.crafting.eventHandlers);
 * 
 * @param {HTMLElement} element - the element to add the eventListener to
 * @param {string} eventType - the type of the event, e.g. 'pointerdown'
 * @param {Function} functionReference - the function to trigger
 * @param {object} bindTarget - the argument to go within functionReference.bind(___)
 */
realityEditor.device.utilities.addBoundListener = function(element, eventType, functionReference, bindTarget) {
    var boundFunctionReference = functionReference.bind(bindTarget);
    var functionUUID = this.getEventUUID(element, eventType, functionReference);
    if (boundListeners.hasOwnProperty(functionUUID)) {
        this.removeBoundListener(element, eventType, functionReference);
    }
    boundListeners[functionUUID] = boundFunctionReference;
    element.addEventListener(eventType, boundFunctionReference, false);
};

/**
 * Generates a unique string address for a bound event listener, so that it can be looked up again.
 * @param {HTMLElement} element
 * @param {string} eventType
 * @param {Function} functionReference
 * @return {string} - e.g. myDiv_pointerdown_1424385949
 */
realityEditor.device.utilities.getEventUUID = function(element, eventType, functionReference) {
    return element.id + '_' + eventType + '_' + functionReference.toString().hashCode();
};

// function getBoundListener(element, eventType, functionReference) {
//     var functionUUID = getEventUUID(element, eventType, functionReference);
//     return boundListeners[functionUUID];
// }

/**
 * Looks up the bound listener by its eventUUID, and properly removes it.
 * @param element
 * @param eventType
 * @param functionReference
 */
realityEditor.device.utilities.removeBoundListener = function(element, eventType, functionReference) {
    var functionUUID = this.getEventUUID(element, eventType, functionReference);
    var boundFunctionReference = boundListeners[functionUUID];
    if (boundFunctionReference) {
        element.removeEventListener(eventType, boundFunctionReference, false);
        delete boundListeners[functionUUID];
    }
};

/**
 * Helper function to get a list of all divs intersecting a given screen (x, y) coordinate.
 * @param {number} x
 * @param {number} y
 * @return {Array.<HTMLElement>}
 */
realityEditor.device.utilities.getAllDivsUnderCoordinate = function(x, y) {
    var res = [];
    var previousDisplayTypes = [];

    var ele = document.elementFromPoint(x,y);
    while(ele && ele.tagName !== "BODY" && ele.tagName !== "HTML"){
        res.push(ele);
        previousDisplayTypes.push(ele.style.display);
        ele.style.display = "none";
        ele = document.elementFromPoint(x,y);
    }

    for(var i = 0; i < res.length; i++){
        res[i].style.display = previousDisplayTypes[i];
    }
    // console.log(res);
    return res;
};

/**
 * Decodes an image/jpeg encoded as a base64 string, into a blobUrl that can be loaded as an img src
 * https://stackoverflow.com/questions/7650587/using-javascript-to-display-blob
 * @param {string} base64String - a Base64 encoded string representation of a jpg image
 * @return {string}
 */
realityEditor.device.utilities.decodeBase64JpgToBlobUrl = function(base64String) {
    var blob = this.b64toBlob(base64String, 'image/jpeg');
    var blobUrl = URL.createObjectURL(blob);
    return blobUrl;

};

/**
 * https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
 * @param {string} b64Data - a Base64 encoded string
 * @param {string} contentType - the MIME type, e.g. 'image/jpeg', 'video/mp4', or 'text/plain' (
 * @param {number|undefined} sliceSize - number of bytes to process at a time (default 512). Affects performance.
 * @return {Blob}
 */
realityEditor.device.utilities.b64toBlob = function(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, {type: contentType});
};

/**
 * Utility function to determine if the editor is loaded on a desktop browser or within the full mobile app.
 * @todo: make more robust so that loading on a mobile safari browser is distinguisable from within the Reality Editor app
 * @return {boolean}
 */
realityEditor.device.utilities.isDesktop = function() {
    return window.navigator.userAgent.indexOf('Mobile') === -1 || window.navigator.userAgent.indexOf('Macintosh') > -1;
    // return globalStates.platform === 'MacIntel' || globalStates.platform === false;
};
