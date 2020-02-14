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


createNameSpace("realityEditor.gui.settings");

realityEditor.gui.settings.addedToggles = [];
realityEditor.gui.settings.toggleStates = {};

function SettingsToggle(title, description, propertyName, persistentStorageId, iconSrc, defaultValue, onToggleCallback) {
    this.title = title;
    this.description = description;
    this.propertyName = propertyName;
    this.persistentStorageId = persistentStorageId;
    this.iconSrc = iconSrc;
    
    // try loading the value from persistent storage to see what its default value should be
    var savedValue = window.localStorage.getItem(persistentStorageId);
    if (savedValue !== null) {
        realityEditor.gui.settings.toggleStates[propertyName] = savedValue;
    } else {
        // if there isn't a saved value, set it to the specified default value
        if (typeof defaultValue !== 'undefined') {
            realityEditor.gui.settings.toggleStates[propertyName] = defaultValue;
        }
    }

    this.onToggleCallback = function(e) {
        realityEditor.gui.settings.toggleStates[propertyName] = e;
        // realityEditor.app.setStorage(persistentStorageId);
        window.localStorage.setItem(persistentStorageId, realityEditor.gui.settings.toggleStates[propertyName]);
        onToggleCallback(e); // trigger additional side effects
    };
}

// function getAddedToggleForProperty(propertyName) {
//     var foundToggle = null;
//     realityEditor.gui.settings.addedToggles.forEach(function(toggle) {
//         if (toggle.propertyName === propertyName) {
//             foundToggle = toggle;
//         }
//     });
//     if (!foundToggle) {
//         console.warn('couldnt find toggle matching property: ' + propertyName);
//     }
//     return foundToggle;
// }

realityEditor.gui.settings.addToggle = function(title, description, propertyName, persistentStorageId, iconSrc, defaultValue, onToggleCallback) {
    let newToggle = new SettingsToggle(title, description, propertyName, persistentStorageId, iconSrc, defaultValue, onToggleCallback);
    realityEditor.gui.settings.addedToggles.push(newToggle);
};

function generateGetSettingsJsonMessage() {
    let defaultMessage = {
        editingMode: globalStates.editingMode,
        clearSkyState: globalStates.clearSkyState,
        instantState: globalStates.instantState,
        speechState: globalStates.speechState,
        tutorialState: globalStates.tutorialState,
        videoRecordingEnabled: globalStates.videoRecordingEnabled,
        matrixBroadcastEnabled: globalStates.matrixBroadcastEnabled,
        hololensModeEnabled: globalStates.hololensModeEnabled,
        realtimeEnabled: globalStates.realtimeEnabled,
        externalState: globalStates.externalState,
        discoveryState: globalStates.discoveryState,
        settingsButton : globalStates.settingsButtonState,
        lockingMode: globalStates.lockingMode,
        lockPassword: globalStates.lockPassword,
        realityState: globalStates.realityState,
        zoneText: globalStates.zoneText,
        zoneState: globalStates.zoneState
    };

    // dynamically sends in the current property values for each of the switches that were added using the addToggle API
    realityEditor.gui.settings.addedToggles.forEach(function(toggle) {
        defaultMessage[toggle.propertyName] = realityEditor.gui.settings.toggleStates[toggle.propertyName];
    });
    
    return defaultMessage;
}

function generateGetMainDynamicSettingsJsonMessage() {
    let defaultMessage = {};

    // dynamically sends in the current property values for each of the switches that were added using the addToggle API
    realityEditor.gui.settings.addedToggles.forEach(function(toggle) {
        defaultMessage[toggle.propertyName] = {
            value: realityEditor.gui.settings.toggleStates[toggle.propertyName],
            title: toggle.title,
            description: toggle.description,
            iconSrc: toggle.iconSrc
        };
    });
    
    return defaultMessage;
}

realityEditor.gui.settings.hideSettings = function() {

    console.log("this is what I want to show:  ",globalStates.clearSkyState);

	globalStates.settingsButtonState = false;

    document.getElementById("settingsIframe").contentWindow.postMessage(JSON.stringify({
        getSettings: generateGetSettingsJsonMessage()
    }), "*");

	document.getElementById("settingsIframe").style.visibility = "hidden";
	document.getElementById("settingsIframe").style.display = "none";
	
	if (document.getElementById("settingsEdgeDiv")) {
        document.getElementById("settingsEdgeDiv").style.display = "none";
    }
    
    if (globalStates.clearSkyState) {
        document.getElementById("UIButtons").classList.add('clearSky');
    } else {
        document.getElementById("UIButtons").classList.remove('clearSky');
    }

	this.cout("hide Settings");
};

realityEditor.gui.settings.showSettings = function() {

    if(!globalStates.realityState) {
        realityEditor.gui.menus.switchToMenu("setting", ["setting"], null);
    }
    else {
        realityEditor.gui.menus.switchToMenu("settingReality", ["setting"], null);
    }


	globalStates.settingsButtonState = true;
	document.getElementById("settingsIframe").style.visibility = "visible";
	document.getElementById("settingsIframe").style.display = "inline";

    if (document.getElementById("settingsEdgeDiv")) {
        document.getElementById("settingsEdgeDiv").style.display = "inline";
    }

    document.getElementById("settingsIframe").contentWindow.postMessage(JSON.stringify({
        getSettings: generateGetSettingsJsonMessage(),
        getMainDynamicSettings: generateGetMainDynamicSettingsJsonMessage()
    }), "*");

    overlayDiv.style.display = "none";

    if(document.getElementById("UIButtons").classList.contains('clearSky')) {
        document.getElementById("UIButtons").classList.remove('clearSky');
    }

    this.cout("show Settings");
};
