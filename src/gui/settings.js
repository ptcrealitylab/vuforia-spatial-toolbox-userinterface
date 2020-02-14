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

realityEditor.gui.settings.SETTING_MENU_TYPE = Object.freeze({
    TOGGLE: 'TOGGLE',
    TOGGLE_WITH_TEXT: 'TOGGLE_WITH_TEXT',
    ACTIVATE_WITH_TEXT: 'ACTIVATE_WITH_TEXT',
    ACTIVATE_DEACTIVATE_WITH_TEXT: 'ACTIVATE_DEACTIVATE_WITH_TEXT'
});

function SettingsToggle(title, description, settingType, propertyName, persistentStorageId, iconSrc, defaultValue, onToggleCallback, onTextCallback) {
    this.title = title;
    this.description = description;
    this.propertyName = propertyName;
    this.persistentStorageId = persistentStorageId;
    this.iconSrc = iconSrc;
    this.settingType = settingType;
    
    // try loading the value from persistent storage to see what its default value should be
    let savedValue = window.localStorage.getItem(persistentStorageId);
    if (savedValue !== null) {
        if (typeof savedValue === 'string') {
            savedValue = JSON.parse(savedValue);
        }
        realityEditor.gui.settings.toggleStates[propertyName] = savedValue;
    } else {
        // if there isn't a saved value, set it to the specified default value
        if (typeof defaultValue !== 'undefined') {
            realityEditor.gui.settings.toggleStates[propertyName] = defaultValue;
        }
    }

    this.onToggleCallback = function(newValue) {
        realityEditor.gui.settings.toggleStates[propertyName] = newValue;
        window.localStorage.setItem(persistentStorageId, newValue);
        onToggleCallback(newValue); // trigger additional side effects
    };

    this.onTextCallback = function() {};
    if (settingType === realityEditor.gui.settings.SETTING_MENU_TYPE.TOGGLE_WITH_TEXT) {
        let savedValue = window.localStorage.getItem(persistentStorageId + '_TEXT');
        if (savedValue !== null) {
            realityEditor.gui.settings.toggleStates[propertyName + 'Text'] = savedValue;
        } else {
            realityEditor.gui.settings.toggleStates[propertyName + 'Text'] = '';
        }
        this.onTextCallback = function(newValue) {
            window.localStorage.setItem(persistentStorageId + '_TEXT', newValue);
            if (onTextCallback) {
                onTextCallback(newValue);
            }
        }
    }
    
    // trigger the callback one time automatically on init, so that any side effects for the saved value get triggered
    this.onToggleCallback(realityEditor.gui.settings.toggleStates[propertyName]);
}

realityEditor.gui.settings.addToggle = function(title, description, propertyName, persistentStorageId, iconSrc, defaultValue, onToggleCallback) {
    let newToggle = new SettingsToggle(title, description, realityEditor.gui.settings.SETTING_MENU_TYPE.TOGGLE, propertyName, persistentStorageId, iconSrc, defaultValue, onToggleCallback);
    realityEditor.gui.settings.addedToggles.push(newToggle);
};

realityEditor.gui.settings.addToggleWithText = function(title, description, propertyName, persistentStorageId, iconSrc, defaultValue, onToggleCallback, onTextCallback) {
    let newToggle = new SettingsToggle(title, description, realityEditor.gui.settings.SETTING_MENU_TYPE.TOGGLE_WITH_TEXT, propertyName, persistentStorageId, iconSrc, defaultValue, onToggleCallback, onTextCallback);
    realityEditor.gui.settings.addedToggles.push(newToggle);
};

/**
 * Creates a JSON body that can be sent into the settings iframe with all the current setting values.
 * In addition to a few hard-coded settings, injects all the settings that were created using the addToggle API.
 * @return {Object.<string, boolean|string>}
 */
realityEditor.gui.settings.generateGetSettingsJsonMessage = function() {
    let defaultMessage = {
        editingMode: globalStates.editingMode,
        clearSkyState: globalStates.clearSkyState,
        externalState: globalStates.externalState,
        discoveryState: globalStates.discoveryState,
        settingsButton : globalStates.settingsButtonState,
        lockingMode: globalStates.lockingMode,
        lockPassword: globalStates.lockPassword,
        realityState: globalStates.realityState
    };

    // dynamically sends in the current property values for each of the switches that were added using the addToggle API
    this.addedToggles.forEach(function(toggle) {
        defaultMessage[toggle.propertyName] = this.toggleStates[toggle.propertyName];
    }.bind(this));
    
    return defaultMessage;
};

/**
 * Creates a JSON body that can be sent into the settings iframe with the settings that should be rendered on the main
 * settings page, which were generated using the addToggle API. Each item consists of the name, description text,
 * icon image, and the current value of that setting.
 * @return {Object.<string, {value: boolean, title: string, description: string, iconSrc: string}>}
 */
realityEditor.gui.settings.generateGetMainDynamicSettingsJsonMessage = function() {
    let defaultMessage = {};

    // dynamically sends in the current property values for each of the switches that were added using the addToggle API
    this.addedToggles.forEach(function(toggle) {
        defaultMessage[toggle.propertyName] = {
            value: this.toggleStates[toggle.propertyName],
            title: toggle.title,
            description: toggle.description,
            iconSrc: toggle.iconSrc,
            settingType: toggle.settingType
        };
        if (toggle.settingType === realityEditor.gui.settings.SETTING_MENU_TYPE.TOGGLE_WITH_TEXT) {
            defaultMessage[toggle.propertyName].associatedText = {
                propertyName: toggle.propertyName + 'Text',
                value: this.toggleStates[toggle.propertyName + 'Text']
            }
        }
    }.bind(this));
    
    return defaultMessage;
};

realityEditor.gui.settings.hideSettings = function() {

    console.log("this is what I want to show:  ",globalStates.clearSkyState);

	globalStates.settingsButtonState = false;

    document.getElementById("settingsIframe").contentWindow.postMessage(JSON.stringify({
        getSettings: this.generateGetSettingsJsonMessage()
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
        getSettings: realityEditor.gui.settings.generateGetSettingsJsonMessage(),
        getMainDynamicSettings: realityEditor.gui.settings.generateGetMainDynamicSettingsJsonMessage()
    }), "*");

    overlayDiv.style.display = "none";

    if(document.getElementById("UIButtons").classList.contains('clearSky')) {
        document.getElementById("UIButtons").classList.remove('clearSky');
    }

    this.cout("show Settings");
};
