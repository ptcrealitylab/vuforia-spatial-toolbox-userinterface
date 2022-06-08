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

/**
 * List of all SettingsToggles created with addToggle or addToggleWithText.
 * We can iterate over this to generate the settings menu.
 * @type {Array.<SettingsToggle>}
 */
realityEditor.gui.settings.addedToggles = [];

/**
 * Gets a key for each SettingsToggle with its propertyName and a boolean value of whether that setting is on or off.
 * For SettingsToggles of type TOGGLE_WITH_TEXT, also contains a key named propertyName+'Text' for the text setting.
 * @type {Object.<string, boolean|string>}
 */
realityEditor.gui.settings.toggleStates = {};

/**
 * Enum defining different types of settings UIs
 * @type {Readonly<{TOGGLE: string, TOGGLE_WITH_TEXT: string, TOGGLE_WITH_FROZEN_TEXT: string}>}
 */
realityEditor.gui.settings.InterfaceType = Object.freeze({
    TOGGLE: 'TOGGLE',
    TOGGLE_WITH_TEXT: 'TOGGLE_WITH_TEXT',
    TOGGLE_WITH_FROZEN_TEXT: 'TOGGLE_WITH_FROZEN_TEXT',
    URL: 'URL',
    SLIDER: 'SLIDER',
});

/**
 * Enum defining the different sub-menus
 * @type {Readonly<{MAIN: string, DEVELOP: string}>}
 */
realityEditor.gui.settings.MenuPages = Object.freeze({
    MAIN: 'MAIN',
    DEVELOP: 'DEVELOP'
});

/**
 * @TODO: rename "toggle" to something more general
 * @constructor
 * An object that defines a particular setting in the settings menu that is dynamically added.
 *
 * @param {string} title - the text label for the setting in the menu
 * @param {string} description - a short description string that is rendered next to the title
 * @param {string} settingType - from the InterfaceType enum - if TOGGLE, has a switch that changes a boolean
 *                                  if TOGGLE_WITH_TEXT, also has a text box and a string variable
 * @param {string} propertyName - creates a variable with this name (in realityEditor.gui.settings.toggleStates) to store the boolean
 *                                  if TOGGLE_WITH_TEXT, also creates one named propertyName+'Text' to store the string
 * @param {string} iconSrc - the path to an icon to render. path should be relative to src/gui/settings/index.html
 * @param {boolean} defaultValue - whether it should start toggled on or off the first time (saves persistently after that)
 * @param {string|undefined} placeholderText - if TOGGLE_WITH_TEXT, placeholder text for the UI text box
 * @param {function} onToggleCallback - gets triggered when the switch is toggled
 * @param {function|undefined} onTextCallback - if TOGGLE_WITH_TEXT, gets triggered every time the text box changes
 * @param {boolean|undefined} ignoreOnload - don't trigger the callback once automatically when it loads, only when UI adjusted
 */
function SettingsToggle(title, description, settingType, propertyName, iconSrc, defaultValue, placeholderText, onToggleCallback, onTextCallback, ignoreOnload) {
    this.title = title;
    this.description = description;
    this.propertyName = propertyName;
    let persistentStorageId = 'SETTINGS:' + propertyName;
    this.iconSrc = iconSrc;
    this.settingType = settingType;
    this.placeholderText = placeholderText;
    this.menuName = realityEditor.gui.settings.MenuPages.MAIN; // defaults to main menu. use moveToDevelopMenu to change.
    
    // try loading the value from persistent storage to see what its default value should be
    let savedValue = window.localStorage.getItem(persistentStorageId);
    try {
        savedValue = JSON.parse(savedValue);
    } catch (e) {
        savedValue = defaultValue; // if there isn't a saved value, set it to the specified default value
    }
    realityEditor.gui.settings.toggleStates[propertyName] = savedValue;

    // update the property value, save it persistently, and then trigger the added callback when the switch is toggled
    this.onToggleCallback = function(newValue) {
        realityEditor.gui.settings.toggleStates[propertyName] = newValue;
        window.localStorage.setItem(persistentStorageId, newValue);
        if (onToggleCallback) {
            if (settingType === realityEditor.gui.settings.InterfaceType.TOGGLE_WITH_FROZEN_TEXT || settingType === realityEditor.gui.settings.InterfaceType.TOGGLE_WITH_TEXT) {
                onToggleCallback(newValue, realityEditor.gui.settings.toggleStates[propertyName + 'Text']); // trigger additional side effects
            } else {
                onToggleCallback(newValue); // trigger additional side effects
            }
        }
    };

    this.onTextCallback = function() {};
    if (settingType === realityEditor.gui.settings.InterfaceType.TOGGLE_WITH_TEXT ||
        settingType === realityEditor.gui.settings.InterfaceType.TOGGLE_WITH_FROZEN_TEXT ||
        settingType === realityEditor.gui.settings.InterfaceType.URL) {
        // set up the property containing the value in the setting text box
        let savedValue = window.localStorage.getItem(persistentStorageId + '_TEXT');
        if (savedValue !== null) {
            realityEditor.gui.settings.toggleStates[propertyName + 'Text'] = savedValue;
        } else {
            realityEditor.gui.settings.toggleStates[propertyName + 'Text'] = '';
        }
        
        // anytime a new character is typed into the text box, this will trigger
        this.onTextCallback = function(newValue) {
            realityEditor.gui.settings.toggleStates[propertyName + 'Text'] = newValue;
            window.localStorage.setItem(persistentStorageId + '_TEXT', newValue);
            if (onTextCallback) {
                onTextCallback(newValue);
            }
        };
        if (!ignoreOnload) {
            this.onTextCallback(realityEditor.gui.settings.toggleStates[propertyName + 'Text']); // trigger once for side effects
        }
    }
    
    // trigger the callback one time automatically on init, so that any side effects for the saved value get triggered
    if (!ignoreOnload) {
        this.onToggleCallback(realityEditor.gui.settings.toggleStates[propertyName]);
    }
}

/**
 * Puts the setting in the DEVELOP sub-menu instead of the MAIN sub-menu
 */
SettingsToggle.prototype.moveToDevelopMenu = function() {
    this.menuName = realityEditor.gui.settings.MenuPages.DEVELOP;
    return this;
};

/**
 * Programatically override the existing toggle value
 * @param {boolean} newValue
 */
SettingsToggle.prototype.setValue = function(newValue) {
    realityEditor.gui.settings.toggleStates[this.propertyName] = newValue;
    let persistentStorageId = 'SETTINGS:' + this.propertyName;
    window.localStorage.setItem(persistentStorageId, newValue);
    return this;
};

/**
 * Creates a new entry that will added to the settings menu, including the associated property and persistent storage.
 * This type of entry has a toggle switch UI.
 * @param {string} title
 * @param {string} description
 * @param {string} propertyName
 * @param {string} iconSrc
 * @param {boolean} defaultValue
 * @param {function<boolean>} onToggleCallback - gets triggered when the switch is toggled
 * @param {boolean} ignoreOnload - ignore the first callback that gets triggered automatically when the toggle is added
 * @return {SettingsToggle}
 */
realityEditor.gui.settings.addToggle = function(title, description, propertyName, iconSrc, defaultValue, onToggleCallback, ignoreOnload) {
    let newToggle = new SettingsToggle(title, description, realityEditor.gui.settings.InterfaceType.TOGGLE, propertyName, iconSrc, defaultValue, undefined, onToggleCallback, undefined, ignoreOnload);
    realityEditor.gui.settings.addedToggles.push(newToggle);
    return newToggle;
};

/**
 * Creates a new entry that will added to the settings menu, including the associated property and persistent storage.
 * This type of entry has a toggle switch UI, and a text box UI.
 * @param {string} title
 * @param {string} description
 * @param {string} propertyName
 * @param {string} iconSrc
 * @param {boolean} defaultValue
 * @param {string} placeholderText
 * @param {function<boolean>} onToggleCallback - gets triggered when the switch is toggled
 * @param onTextCallback - gets triggered every time the text box changes
 * @param {boolean} ignoreOnload - ignore the first callback that gets triggered automatically when the toggle is added
 * @return {SettingsToggle}
 */
realityEditor.gui.settings.addToggleWithText = function(title, description, propertyName, iconSrc, defaultValue, placeholderText, onToggleCallback, onTextCallback, ignoreOnload) {
    let newToggle = new SettingsToggle(title, description, realityEditor.gui.settings.InterfaceType.TOGGLE_WITH_TEXT, propertyName, iconSrc, defaultValue, placeholderText, onToggleCallback, onTextCallback, ignoreOnload);
    realityEditor.gui.settings.addedToggles.push(newToggle);
    return newToggle;
};

/**
 * Creates a new entry that will added to the settings menu, including the associated property and persistent storage.
 * This type of entry has a toggle switch UI, and a text box UI.
 * The toggle can only turn on if there is text. While active, the text cannot be edited
 * @param {string} title
 * @param {string} description
 * @param {string} propertyName
 * @param {string} iconSrc
 * @param {boolean} defaultValue
 * @param {string} placeholderText
 * @param {function<boolean, string>} onToggleCallback - gets triggered when the switch is toggled. includes the textbox value
 * @param {boolean} ignoreOnload - ignore the first callback that gets triggered automatically when the toggle is added
 * @return {SettingsToggle}
 */
realityEditor.gui.settings.addToggleWithFrozenText = function(title, description, propertyName, iconSrc, defaultValue, placeholderText, onToggleCallback, ignoreOnload) {
    let newToggle = new SettingsToggle(title, description, realityEditor.gui.settings.InterfaceType.TOGGLE_WITH_FROZEN_TEXT, propertyName, iconSrc, defaultValue, placeholderText, onToggleCallback, undefined, ignoreOnload);
    realityEditor.gui.settings.addedToggles.push(newToggle);
    return newToggle;
};

/**
 * Creates a new entry that will added to the settings menu, including the associated property and persistent storage.
 * This type of entry is a frozen view of a URL
 * @param {string} title
 * @param {string} description
 * @param {string} propertyName
 * @param {string} iconSrc
 * @param {boolean} defaultValue
 * @param {string} placeholderText
 * @return {SettingsToggle}
 */
realityEditor.gui.settings.addURLView = function(title, description, propertyName, iconSrc, defaultValue, placeholderText) {
    let newToggle = new SettingsToggle(title, description, realityEditor.gui.settings.InterfaceType.URL, propertyName, iconSrc, defaultValue, placeholderText);
    realityEditor.gui.settings.addedToggles.push(newToggle);
    return newToggle;
};

/**
 * Creates a new entry that will added to the settings menu, including the associated property and persistent storage.
 * This type of entry has a toggle switch UI, and a text box UI.
 * The toggle can only turn on if there is text. While active, the text cannot be edited
 * @param {string} title
 * @param {string} description
 * @param {string} propertyName
 * @param {string} iconSrc
 * @param {number} defaultValue - (float between 0 and 1)
 * @param {function<number>} onToggleCallback - gets triggered when the slider is moved
 * @param {boolean} ignoreOnload - ignore the first callback that gets triggered automatically when the slider is added
 * @return {SettingsToggle}
 */
realityEditor.gui.settings.addSlider = function(title, description, propertyName, iconSrc, defaultValue, onToggleCallback, ignoreOnload) {
    let newToggle = new SettingsToggle(title, description, realityEditor.gui.settings.InterfaceType.SLIDER, propertyName, iconSrc, defaultValue, undefined, onToggleCallback, undefined, ignoreOnload);
    realityEditor.gui.settings.addedToggles.push(newToggle);
    return newToggle;
};

/**
 * Creates a JSON body that can be sent into the settings iframe with all the current setting values.
 * In addition to a few hard-coded settings, injects all the settings that were created using the addToggle API.
 * @return {Object.<string, boolean|string>}
 */
realityEditor.gui.settings.generateGetSettingsJsonMessage = function() {
    let defaultMessage = {
        settingsButton : globalStates.settingsButtonState
    };

    // dynamically sends in the current property values for each of the switches that were added using the addToggle API
    this.addedToggles.forEach(function(toggle) {
        defaultMessage[toggle.propertyName] = this.toggleStates[toggle.propertyName];
    }.bind(this));
    
    return defaultMessage;
};

/**
 * Creates a JSON body that can be sent into the settings iframe with the settings that should be rendered on the specified
 * settings page, which were generated using the addToggle API. Each item consists of the name, description text,
 * icon image, and the current value of that setting. Entries added with addToggleWithText contain more data.
 * @param {string} menuName - from enum MenuPages - MAIN or DEVELOP
 * @return {Object.<string, {value: boolean, title: string, description: string, iconSrc: string}>}
 */
realityEditor.gui.settings.generateDynamicSettingsJsonMessage = function(menuName) {
    let defaultMessage = {};

    // dynamically sends in the current property values for each of the switches that were added using the addToggle API
    this.addedToggles.filter(function(toggle) {
        return toggle.menuName === menuName;
    }).forEach(function(toggle) {
        defaultMessage[toggle.propertyName] = {
            value: this.toggleStates[toggle.propertyName],
            title: toggle.title,
            description: toggle.description,
            iconSrc: toggle.iconSrc,
            settingType: toggle.settingType
        };
        if (toggle.settingType === realityEditor.gui.settings.InterfaceType.TOGGLE_WITH_TEXT ||
            toggle.settingType === realityEditor.gui.settings.InterfaceType.TOGGLE_WITH_FROZEN_TEXT ||
            toggle.settingType === realityEditor.gui.settings.InterfaceType.URL) {
            defaultMessage[toggle.propertyName].associatedText = {
                propertyName: toggle.propertyName + 'Text',
                value: this.toggleStates[toggle.propertyName + 'Text'],
                placeholderText: toggle.placeholderText
            }
        }
    }.bind(this));
    
    return defaultMessage;
};

realityEditor.gui.settings.hideSettings = function() {
    
	globalStates.settingsButtonState = false;

    document.getElementById("settingsIframe").contentWindow.postMessage(JSON.stringify({
        getSettings: this.generateGetSettingsJsonMessage()
    }), "*");

	document.getElementById("settingsIframe").style.visibility = "hidden";
	document.getElementById("settingsIframe").style.display = "none";
	
	if (document.getElementById("settingsEdgeDiv")) {
        document.getElementById("settingsEdgeDiv").style.display = "none";
    }
    
    if (realityEditor.gui.settings.toggleStates.clearSkyState) {
        document.getElementById("UIButtons").classList.add('clearSky');
    } else {
        document.getElementById("UIButtons").classList.remove('clearSky');
    }

	this.cout("hide Settings");
};

realityEditor.gui.settings.showSettings = function() {

    if (!realityEditor.gui.settings.toggleStates.realityState) {
        realityEditor.gui.menus.switchToMenu("setting", ["setting"], null);
    } else {
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
        getMainDynamicSettings: realityEditor.gui.settings.generateDynamicSettingsJsonMessage(realityEditor.gui.settings.MenuPages.MAIN)
    }), "*");

    overlayDiv.style.display = "none";

    if(document.getElementById("UIButtons").classList.contains('clearSky')) {
        document.getElementById("UIButtons").classList.remove('clearSky');
    }

    this.cout("show Settings");
};
