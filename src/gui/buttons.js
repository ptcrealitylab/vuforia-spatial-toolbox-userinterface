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

createNameSpace("realityEditor.gui.buttons");

/**
 * @fileOverview realityEditor.gui.buttons.js
 * @todo finish documentation
 */

/**
 * @typedef {PointerEvent} ButtonEvent
 * @desc A pointerevent with an additional property containing the button id that was pressed
 * @property {string} button - the ID of the button that was pressed
 * @property {boolean|undefined} ignoreIsDown - if included, don't require that the button was pressed down first in order for up event to trigger
 *                                              (can be used to synthetically trigger button events)
 */

realityEditor.gui.buttons.blockTabImage = [];
realityEditor.gui.buttons.settingTimer = null;
realityEditor.gui.buttons.wasTimed = false;

/**
 * @type {Readonly<{GUI: string, LOGIC: string, RESET: string, COMMIT: string, UNCONSTRAINED: string, SETTING: string, LOGIC_SETTING: string, FREEZE: string, LOCK: string, HALF_LOCK: string, UNLOCK: string, RECORD: string, POCKET: string, LOGIC_POCKET: string, BIG_POCKET: string, HALF_POCKET: string, REALITY_GUI: string, REALITY_INFO: string, REALITY_TAG: string, REALITY_SEARCH: string, REALITY_WORK: string}>}
 */
realityEditor.gui.buttons.ButtonName = Object.freeze(
    {
        GUI: 'gui',
        LOGIC: 'logic',
        RESET: 'reset',
        COMMIT: 'commit',
        UNCONSTRAINED: 'unconstrained',
        SETTING: 'setting',
        LOGIC_SETTING: 'logicSetting',
        FREEZE: 'freeze',
        LOCK: 'lock',
        HALF_LOCK: 'halflock',
        UNLOCK: 'unlock',
        RECORD: 'record',
        POCKET: 'pocket',
        LOGIC_POCKET: 'logicPocket',
        BIG_POCKET: 'bigPocket',
        HALF_POCKET: 'halfPocket',
        REALITY_GUI: 'realityGui',
        REALITY_INFO: 'realityInfo',
        REALITY_TAG: 'realityTag',
        REALITY_SEARCH: 'realitySearch',
        REALITY_WORK: 'realityWork'
    });

realityEditor.gui.buttons.ButtonState = Object.freeze(
    {
        UP: 'up',
        DOWN: 'down',
        ENTERED: 'entered'
    });

/**
 * Contains the up/down state of every button.
 * Each key is the name of a button, as defined in the ButtonName enum.
 * Each value is that button's ButtonState.
 * @type {Object.<string, string>}
 */
realityEditor.gui.buttons.buttonStates = {};

/**
 * Utility to set the buttonName button to state DOWN
 * @param {string} buttonName
 */
realityEditor.gui.buttons.setButtonStateDown = function(buttonName) {
    this.buttonStates[buttonName] = this.ButtonState.DOWN;
};

/**
 * Utility to set the buttonName button to state UP
 * @param {string} buttonName
 */
realityEditor.gui.buttons.setButtonStateUp = function(buttonName) {
    this.buttonStates[buttonName] = this.ButtonState.UP;
};

/**
 * Utility to set the buttonName button to state ENTERED
 * @param {string} buttonName
 */
realityEditor.gui.buttons.setButtonStateEntered = function(buttonName) {
    this.buttonStates[buttonName] = this.ButtonState.ENTERED;
};

/**
 * Utility that pre-loads a number of image resources so that they can be more quickly added when they are needed
 * First parameter is the array to hold the pre-loaded references
 * Any number of additional string parameters can be passed in as file paths that should be loaded
 * @param {Array.<string>} array
 */
realityEditor.gui.buttons.preload = function(array) {
    for (var i = 0; i < this.preload.arguments.length - 1; i++) {
        array[i] = new Image();
        array[i].src = this.preload.arguments[i + 1];
    }

    this.cout("preload");
};

// create placeholders for these functions that get generated automatically at runtime

realityEditor.gui.buttons.guiButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.logicButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.pocketButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.logicPocketButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.resetButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.commitButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.unconstrainedButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.settingButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.logicSettingButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.freezeButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.lockButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.halflockButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.unlockButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.recordButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };

realityEditor.gui.buttons.guiButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.logicButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.resetButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.commitButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.unconstrainedButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.settingButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.logicSettingButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.freezeButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.pocketButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.logicPocketButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.lockButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.halflockButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.unlockButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.recordButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };

realityEditor.gui.buttons.pocketButtonEnter = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.bigPocketButtonEnter = function(){ console.warn('function stub should be overridden at runtime'); };
realityEditor.gui.buttons.halfPocketButtonEnter = function(){ console.warn('function stub should be overridden at runtime'); };

realityEditor.gui.buttons.pocketButtonLeave = function(){ console.warn('function stub should be overridden at runtime'); };


/**
 * Called from device/onLoad to initialize the buttons with assets and event listeners
 */
realityEditor.gui.buttons.initButtons = function() {
    
    // pre-loading any necessary assets
    this.preload(this.blockTabImage,
        'png/iconBlocks.png', 'png/iconEvents.png', 'png/iconSignals.png', 'png/iconMath.png', 'png/iconWeb.png'
    );
    
    Object.keys(this.gui.buttons.ButtonName).forEach(function(buttonKey) {
        var buttonName = this.gui.buttons.ButtonName[buttonKey];

        // populate the default states for each button
        this.buttonStates[buttonName] = this.ButtonState.UP;

        // generate onButtonDown functions that trigger externally-registered callbacks and update the buttonState...
        var functionName = buttonName + 'ButtonDown';
        /** @param {ButtonEvent} event */
        realityEditor.gui.buttons[functionName] = function(event) {
            if (event.button !== buttonName) return;
            this.triggerCallbacksForButton(event.button, 'down');
            this.setButtonStateDown(event.button);
        };

        // ...generate onButtonUp functions
        functionName = buttonName + 'ButtonUp';
        /** @param {ButtonEvent} event */
        realityEditor.gui.buttons[functionName] = function(event) {
            if (event.button !== buttonName) return;
            // only works if the tap down originated on the button
            if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return;
            this.triggerCallbacksForButton(event.button, 'up');
            this.setButtonStateUp(event.button);
        };

        // ...generate onButtonEnter functions
        functionName = buttonName + 'ButtonEnter';
        /** @param {ButtonEvent} event */
        realityEditor.gui.buttons[functionName] = function(event) {
            if (event.button !== buttonName) return;
            this.triggerCallbacksForButton(event.button, 'leave');
            this.setButtonStateEntered(event.button);
        };

        // ...generate onButtonEnter functions
        functionName = buttonName + 'ButtonLeave';
        /** @param {ButtonEvent} event */
        realityEditor.gui.buttons[functionName] = function(event) {
            if (event.button !== buttonName) return;
            this.triggerCallbacksForButton(event.button, 'enter');
            this.setButtonStateEntered(event.button);
        };

    }.bind(this));
    
};

/**
 * A set of arrays of callbacks that other modules can register to be notified when buttons are pressed.
 * Contains a property for each button name.
 * The value of each property is an array containing pointers to the callback functions that should be
 *  triggered when that function is called.
 * @type {Object.<string, Array.<function>>}
 */
realityEditor.gui.buttons.callbacks = {};

/**
 * Adds a callback function that will be invoked when the specified button is pressed
 * @param {string} buttonName
 * @param {function} callback
 */
realityEditor.gui.buttons.registerCallbackForButton = function(buttonName, callback) {
    if (typeof this.callbacks[buttonName] === 'undefined') {
        this.callbacks[buttonName] = [];
    }

    this.callbacks[buttonName].push(callback);
};

/**
 * Utility for iterating calling all callbacks that other modules have registered for the given button
 * @param {string} buttonName
 * @param {object|undefined} params
 */
realityEditor.gui.buttons.triggerCallbacksForButton = function(buttonName, newButtonState) {
    if (typeof this.callbacks[buttonName] === 'undefined') return;

    // iterates over all registered callbacks to trigger events in various modules
    this.callbacks[buttonName].forEach(function(callback) {
        callback(buttonName, newButtonState);
    });
};

/**
 *
 *   REALITY (RETAIL GUI BUTTONS)
 *   @todo modernize these functions the same way as the others
 */

realityEditor.gui.buttons.realityGuiButtonUp = function (event) {
    if (event.button !== "realityGui") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("realityInfo", ["realityGui"]);

    // Add your functionality here.
    this.triggerCallbacksForButton(event.button, 'up');
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.realityInfoButtonUp = function (event) {
    if (event.button !== "realityInfo") return;
    
    realityEditor.gui.menus.buttonOff("reality", ["realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("realityInfo", ["realityInfo", "realityGui"]);

    // Add your functionality here.
    this.triggerCallbacksForButton(event.button, 'up');
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.realityTagButtonUp = function (event) {
    if (event.button !== "realityTag") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("reality", ["realityTag"]);

    // Add your functionality here.
    this.triggerCallbacksForButton(event.button, 'up');
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.realitySearchButtonUp = function (event) {
    if (event.button !== "realitySearch") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("reality", ["realitySearch"]);

    if (realityEditor.gui.search.getVisibility()) {
        realityEditor.gui.search.remove();
    } else {
        realityEditor.gui.search.add();
    }

    // Add your functionality here.
    this.triggerCallbacksForButton(event.button, 'up');
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.realityWorkButtonUp = function (event) {
    if (event.button !== "realityWork") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("reality", ["realityWork"]);

    // Add your functionality here.
    this.triggerCallbacksForButton(event.button, 'up');
    this.setButtonStateUp(event.button);
};
