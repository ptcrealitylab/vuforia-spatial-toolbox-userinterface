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
 * Manages the model of each button, whereas realityEditor.gui.menus.js manages the view.
 * Handles touch events and tracks button state for each menu button. Provides default behavior for each button,
 * and provides an interface for other modules to register callbacks for custom button behavior.
 */

(function(exports) {

    /**
     * @typedef {PointerEvent} ButtonEvent
     * @desc A pointerevent with an additional property containing the button id that was pressed
     * @property {string} button - the ID of the button that was pressed
     * @property {boolean|undefined} ignoreIsDown - if included, don't require that the button was pressed down first in order for up event to trigger
     *                                              (can be used to synthetically trigger button events)
     */

    /**
     * @type {Readonly<{GUI: string, LOGIC: string, RESET: string, COMMIT: string, UNCONSTRAINED: string, DISTANCE: string, SETTING: string, LOGIC_SETTING: string, FREEZE: string, LOCK: string, HALF_LOCK: string, UNLOCK: string, RECORD: string, POCKET: string, LOGIC_POCKET: string, BIG_POCKET: string, HALF_POCKET: string, REALITY_GUI: string, REALITY_INFO: string, REALITY_TAG: string, REALITY_SEARCH: string, REALITY_WORK: string}>}
     */
    var ButtonNames = Object.freeze(
        {
            GUI: 'gui',
            LOGIC: 'logic',
            RESET: 'reset',
            COMMIT: 'commit',
            UNCONSTRAINED: 'unconstrained',
            DISTANCE: 'distance',
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
            REALITY_WORK: 'realityWork',
            BACK: 'back'
        });

    /**
     * @type {Readonly<{UP: string, DOWN: string, ENTERED: string}>}
     */
    var ButtonStates = Object.freeze(
        {
            UP: 'up',
            DOWN: 'down',
            ENTERED: 'entered'
        });

    /**
     * Contains the up/down state of every button.
     * Each key is the name of a button, as defined in the ButtonNames enum.
     * Each value is that button's ButtonStates.
     * @type {Object.<string, string>}
     */
    var buttonStates = {};
    
    var getButtonState = function(buttonName) {
        return buttonStates[buttonName];
    };

    /**
     * Utility to set the buttonName button to state DOWN
     * @param {string} buttonName
     */
    var setButtonStateDown = function(buttonName) {
        buttonStates[buttonName] = ButtonStates.DOWN;
    };

    /**
     * Utility to set the buttonName button to state UP
     * @param {string} buttonName
     */
    var setButtonStateUp = function(buttonName) {
        buttonStates[buttonName] = ButtonStates.UP;
    };

    /**
     * Utility to set the buttonName button to state ENTERED
     * @param {string} buttonName
     */
    var setButtonStateEntered = function(buttonName) {
        buttonStates[buttonName] = ButtonStates.ENTERED;
    };


    /**
     * A set of arrays of callbacks that other modules can register to be notified when buttons are pressed.
     * Contains a property for each button name.
     * The value of each property is an array containing pointers to the callback functions that should be
     *  triggered when that function is called.
     * @type {Object.<string, Array.<function>>}
     */
    var callbacks = {};

    /**
     * Adds a callback function that will be invoked when the specified button is pressed
     * @param {string} buttonName
     * @param {function} callback
     */
    var registerCallbackForButton = function(buttonName, callback) {
        if (typeof callbacks[buttonName] === 'undefined') {
            callbacks[buttonName] = [];
        }

        callbacks[buttonName].push(callback);
    };

    /**
     * Utility for iterating calling all callbacks that other modules have registered for the given button
     * @param {string} buttonName
     * @param {object|undefined} newButtonState
     */
    var triggerCallbacksForButton = function(buttonName, newButtonState) {
        if (typeof callbacks[buttonName] === 'undefined') return;

        // iterates over all registered callbacks to trigger events in various modules
        callbacks[buttonName].forEach(function(callback) {
            callback(buttonName, newButtonState);
        });
    };

    // create placeholders for these functions that get generated automatically at runtime

    // button down events
    /*
    var guiButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var logicButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var pocketButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var logicPocketButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var resetButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var commitButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var unconstrainedButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var settingButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var logicSettingButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var freezeButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var lockButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var halflockButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var unlockButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };
    var recordButtonDown = function(){ console.warn('function stub should be overridden at runtime'); };

    // button up events
    var guiButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var logicButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var resetButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var commitButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var unconstrainedButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var settingButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var logicSettingButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var freezeButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var pocketButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var logicPocketButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var lockButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var halflockButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var unlockButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };
    var recordButtonUp = function(){ console.warn('function stub should be overridden at runtime'); };

    // button enter events (they are auto-generated for every button, but these are the only ones currently used)
    var pocketButtonEnter = function(){ console.warn('function stub should be overridden at runtime'); };
    var bigPocketButtonEnter = function(){ console.warn('function stub should be overridden at runtime'); };
    var halfPocketButtonEnter = function(){ console.warn('function stub should be overridden at runtime'); };

    // button leave events (they are auto-generated for every button, but these are the only ones currently used)
    var pocketButtonLeave = function(){ console.warn('function stub should be overridden at runtime'); };
    */

    /**
     * Called from device/onLoad to initialize the buttons with assets and event listeners
     */
    var initButtons = function() {

        // loop over all buttons (as defined in the ButtonNames enum), and generate default state and event handlers
        Object.keys(ButtonNames).forEach(function(buttonKey) {
            var buttonName = ButtonNames[buttonKey];

            // populate the default states for each button
            buttonStates[buttonName] = ButtonStates.UP;

            // generate onButtonDown functions... they trigger externally-registered callbacks and update the buttonState
            var functionName = buttonName + 'ButtonDown';
            /** @param {ButtonEvent} event */
            exports[functionName] = function(event) {
                if (event.button !== buttonName) return;
                triggerCallbacksForButton(event.button, 'down');
                setButtonStateDown(event.button);
            };

            // ...generate onButtonUp functions
            functionName = buttonName + 'ButtonUp';
            /** @param {ButtonEvent} event */
            exports[functionName] = function(event) {
                if (event.button !== buttonName) return;
                // only works if the tap down originated on the button
                if (!event.ignoreIsDown && buttonStates[event.button] !== ButtonStates.DOWN) return;
                triggerCallbacksForButton(event.button, 'up');
                setButtonStateUp(event.button);
            };

            // ...generate onButtonEnter functions
            functionName = buttonName + 'ButtonEnter';
            /** @param {ButtonEvent} event */
            exports[functionName] = function(event) {
                if (event.button !== buttonName) return;
                triggerCallbacksForButton(event.button, 'enter');
                setButtonStateEntered(event.button);
            };

            // ...generate onButtonLeave functions
            functionName = buttonName + 'ButtonLeave';
            /** @param {ButtonEvent} event */
            exports[functionName] = function(event) {
                if (event.button !== buttonName) return;
                triggerCallbacksForButton(event.button, 'leave');
                setButtonStateEntered(event.button);
            };

        }.bind(this));

    };
    
    exports.initButtons = initButtons;
    exports.ButtonNames = ButtonNames;
    exports.ButtonStates = ButtonStates;
    exports.registerCallbackForButton = registerCallbackForButton;
    exports.getButtonState = getButtonState;

})(realityEditor.gui.buttons);
