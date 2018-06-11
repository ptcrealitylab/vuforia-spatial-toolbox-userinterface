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
 * @desc function to print to console based on debug mode set to true
 **/
function cout() {
	if (globalStates.debug){
		console.log.apply(this, arguments);
	}
}

/**
 * @desc
 * @param
 * @param
 * @return {String}
 **/

realityEditor.device.utilities.uuidTime = function () {
	var dateUuidTime = new Date();
	var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + "" + dateUuidTime.getTime()).toString(36);
	while (stampUuidTime.length < 12) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
	return stampUuidTime;
};

/**
 * @desc
 * @param
 * @param
 * @return {String}
 **/

realityEditor.device.utilities.uuidTimeShort = function () {
	var dateUuidTime = new Date();
	var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var stampUuidTime = parseInt("" + dateUuidTime.getMilliseconds() + dateUuidTime.getMinutes() + dateUuidTime.getHours() + dateUuidTime.getDay()).toString(36);
	while (stampUuidTime.length < 8) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
	return stampUuidTime;
};

/**
 * @desc
 * @param
 * @param
 * @return {Number}
 **/

realityEditor.device.utilities.randomIntInc = function(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
};

// ----- Utilities for adding and removing events in a stable way ----- //

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

realityEditor.device.utilities.addBoundListener = function(element, eventType, functionReference, bindTarget) {
    var boundFunctionReference = functionReference.bind(bindTarget);
    var functionUUID = this.getEventUUID(element, eventType, functionReference);
    if (boundListeners.hasOwnProperty(functionUUID)) {
        this.removeBoundListener(element, eventType, functionReference);
    }
    boundListeners[functionUUID] = boundFunctionReference;
    element.addEventListener(eventType, boundFunctionReference, false);
};

realityEditor.device.utilities.getEventUUID = function(element, eventType, functionReference) {
    return element.id + '_' + eventType + '_' + functionReference.toString().hashCode();
};

// function getBoundListener(element, eventType, functionReference) {
//     var functionUUID = getEventUUID(element, eventType, functionReference);
//     return boundListeners[functionUUID];
// }

realityEditor.device.utilities.removeBoundListener = function(element, eventType, functionReference) {
    var functionUUID = this.getEventUUID(element, eventType, functionReference);
    var boundFunctionReference = boundListeners[functionUUID];
    if (boundFunctionReference) {
        element.removeEventListener(eventType, boundFunctionReference, false);
        delete boundListeners[functionUUID];
    }
};

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
