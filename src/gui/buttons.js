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


var blockTabImage = [];

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

/**
 * Called from device/onLoad to initialize the buttons (by pre-loading any necessary assets)
 */
realityEditor.gui.buttons.initButtons = function() {
    this.preload(blockTabImage,
        'png/iconBlocks.png', 'png/iconEvents.png', 'png/iconSignals.png', 'png/iconMath.png', 'png/iconWeb.png'
    );
    
    // populate the default states for each button
    Object.keys(this.gui.buttons.ButtonName).forEach(function(buttonKey) {
        this.buttonStates[this.gui.buttons.ButtonName[buttonKey]] = this.ButtonState.UP;
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
realityEditor.gui.buttons.triggerCallbacksForButton = function(buttonName, params) {
    if (typeof this.callbacks[buttonName] === 'undefined') return;

    // iterates over all registered callbacks to trigger events in various modules
    this.callbacks[buttonName].forEach(function(callback) {
        callback(buttonName, params);
    });
};

/**
 * @typedef {PointerEvent} ButtonEvent
 * @desc A pointerevent with an additional property containing the button id that was pressed
 * @property {string} button - the ID of the button that was pressed
 * @property {boolean|undefined} ignoreIsDown - if included, don't require that the button was pressed down first in order for up event to trigger
 *                                              (can be used to synthetically trigger button events)
 */

realityEditor.gui.buttons.guiButtonDown = function(event) {
    if (event.button !== "gui") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

/**
 * Triggers the effects when the GUI button is pressed.
 * Changes the menu to highlight the GUI button.
 * Updates the global guiState.
 * Triggers callbacks that external modules have registered for this button events.
 * Updates the button state to track whether this button is pressed or not.
 * @param {ButtonEvent} event
 */
realityEditor.gui.buttons.guiButtonUp = function(event) {
    if (event.button !== "gui") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    // updates the button visuals to highlight only the GUI button
    realityEditor.gui.menus.buttonOff("main",["logic","logicPocket","logicSetting","setting","pocket"]);
    realityEditor.gui.menus.buttonOn("main",["gui"]);

    // update the global gui state
    globalStates.guiState = "ui";
    
    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.logicButtonDown = function(event) {
    if (event.button !== "logic") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.logicButtonUp = function(event){
    if (event.button !== "logic") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    realityEditor.gui.menus.buttonOff("main",["gui","logicPocket","logicSetting","setting","pocket"]);
    realityEditor.gui.menus.buttonOn("main",["logic"]);
    
    globalStates.guiState = "node";
    
    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.resetButtonDown = function(event) {
    if (event.button !== "reset") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.resetButtonUp = function(event){
    if (event.button !== "reset") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    realityEditor.gui.menus.off("editing",["reset"]);
    
    // TODO: move to frameHistory module
    for (var objectKey in objects) {
        if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) {
            continue;
        }
        realityEditor.network.sendResetToLastCommit(objectKey);
    }

    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.commitButtonDown = function(event) {
    if (event.button !== "commit") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.commitButtonUp = function(event) {
    if (event.button !== "commit") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    realityEditor.gui.menus.off("editing",["commit"]);

    // TODO: move to frameHistory module
    for (var objectKey in objects) {
        if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) {
            continue;
        }
        realityEditor.network.sendSaveCommit(objectKey);

        // update local history instantly
        var thisObject = realityEditor.getObject(objectKey);
        thisObject.framesHistory = JSON.parse(JSON.stringify(thisObject.frames));

        realityEditor.gui.ar.frameHistoryRenderer.refreshGhosts();
    }

    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.unconstrainedButtonDown = function(event) {
    if (event.button !== "unconstrained") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.unconstrainedButtonUp = function(event) {
    if (event.button !== "unconstrained") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    // TODO: decide whether to keep this here
    if (globalStates.unconstrainedPositioning === true) {
        realityEditor.gui.menus.off("editing", ["unconstrained"]);
        globalStates.unconstrainedPositioning = false;
    } else {
        realityEditor.gui.menus.on("editing", ["unconstrained"]);
        globalStates.unconstrainedPositioning = true;
    }

    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.settingTimer = null;
realityEditor.gui.buttons.wasTimed = false;

realityEditor.gui.buttons.settingButtonDown = function(event) {
    if (event.button !== "setting") return;

    // TODO: decide whether to keep this here
    realityEditor.gui.buttons.settingTimer = setTimeout(function(){
        realityEditor.gui.buttons.wasTimed = true;

        if(!globalStates.realityState) {
            realityEditor.gui.menus.buttonOff("setting", ["setting"]);
        } else {
            realityEditor.gui.menus.buttonOff("reality", ["setting"]);
        }

        if (!globalStates.editingMode) {
            realityEditor.device.setEditingMode(true);
            realityEditor.gui.menus.on("editing", []);
            realityEditor.app.saveDeveloperState(true);

        } else {
            realityEditor.device.setEditingMode(false);
            realityEditor.gui.menus.on("main",[]);
            realityEditor.app.saveDeveloperState(false);
        }

        realityEditor.gui.buttons.triggerCallbacksForButton(event.button, {buttonState: 'timeout'});

    }, 200);
    
    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.settingButtonUp = function(event) {
    if (event.button !== "setting" && event.button !== "logicSetting") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    // TODO: decide whether to keep this here
    if(realityEditor.gui.buttons.settingTimer) {
        clearTimeout(realityEditor.gui.buttons.settingTimer);
    }
    
    if(realityEditor.gui.buttons.wasTimed) {
        realityEditor.gui.buttons.wasTimed = false;
        return;
    }
    
    if (globalStates.guiState === "logic") {
        console.log(" LOGIC SETTINGS PRESSED ");
        var wasBlockSettingsOpen = realityEditor.gui.crafting.eventHelper.hideBlockSettings();
        realityEditor.gui.menus.off("crafting", ["logicSetting"]);
        if (!wasBlockSettingsOpen) {
            var wasNodeSettingsOpen = realityEditor.gui.crafting.eventHelper.hideNodeSettings();
            if (!wasNodeSettingsOpen) {
                console.log("Open Node Settings");
                realityEditor.gui.crafting.eventHelper.openNodeSettings();
            }
        }
        return;
    }
    
    if (globalStates.settingsButtonState === true) {

        this.gui.settings.hideSettings();

        if(!globalStates.realityState) {
            realityEditor.gui.menus.buttonOff("setting", ["setting"]);
        } else {
            realityEditor.gui.menus.buttonOff("reality", ["setting"]);
        }

        overlayDiv.style.display = "inline";

        if (globalStates.editingMode) {
            realityEditor.gui.menus.on("editing", []);
        }
    }
    else {
        this.gui.settings.showSettings();
    }
    
    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.freezeButtonDown = function(event) {
    if (event.button !== "freeze") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.freezeButtonUp = function(event) {
    if (event.button !== "freeze") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    // TODO: decide whether to keep this here
    if (globalStates.freezeButtonState === true) {

        realityEditor.gui.menus.buttonOff("default", ["freeze"]);

        globalStates.freezeButtonState = false;
        var memoryBackground = document.querySelector('.memoryBackground');
        memoryBackground.innerHTML = '';
        realityEditor.app.setResume();

    } else {
        realityEditor.gui.menus.buttonOn("default", ["freeze"]);
        globalStates.freezeButtonState = true;
        realityEditor.app.setPause();
    }

    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.lockButtonDown = function(event) {
    if (event.button !== "lock") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.lockButtonUp = function(event) {
    if (event.button !== "lock") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    console.log("activate lock button");

    var LOCK_TYPE_FULL = "full";
    realityEditor.device.security.lockVisibleNodesAndLinks(LOCK_TYPE_FULL);

    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.halflockButtonDown = function(event) {
    if (event.button !== "halflock") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.halflockButtonUp = function(event) {
    if (event.button !== "halflock") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    console.log("activate halflock button");

    var LOCK_TYPE_HALF = "half";
    realityEditor.device.security.lockVisibleNodesAndLinks(LOCK_TYPE_HALF);

    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.unlockButtonDown = function(event) {
    if (event.button !== "unlock") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.unlockButtonUp = function(event) {
    if (event.button !== "unlock") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button

    console.log("activate unlock button");

    realityEditor.device.security.unlockVisibleNodesAndLinks();

    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.recordButtonDown = function(event) {
    if (event.button !== "record") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.recordButtonUp = function(event) {
    if (event.button !== "record") return;
    if (!event.ignoreIsDown && this.buttonStates[event.button] !== this.ButtonState.DOWN) return; // only works if the tap down originated on the button
    
    // TODO: move to record module
    var didStartRecording = realityEditor.device.videoRecording.toggleRecording();

    if(!didStartRecording) {
        realityEditor.gui.menus.buttonOff("videoRecording", ["record"]);
    } else {
        realityEditor.gui.menus.buttonOff("videoRecording", ["record"]);
    }

    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.pocketButtonDown = function(event) {
    if (event.button !== "pocket" && event.button !== "logicPocket") return;

    // if (globalStates.guiState !== "node" && globalStates.guiState !== "logic") {
    //     return;
    // }
    
    this.triggerCallbacksForButton(event.button, {buttonState: 'down'});
    this.setButtonStateDown(event.button);
};

realityEditor.gui.buttons.pocketButtonUp = function(event) {
    if (event.button !== "pocket" && event.button !== "logicPocket") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.pocketButtonEnter = function(event) {
    if (event.button !== "pocket") return;

    this.triggerCallbacksForButton(event.button, {buttonState: 'enter'});
    this.setButtonStateEntered(event.button);
};

realityEditor.gui.buttons.pocketButtonLeave = function(event) {
    if (event.button !== "pocket") return;

    // if (globalStates.guiState !== "node" && globalStates.guiState !== "logic") {
    //     return;
    // }

    this.triggerCallbacksForButton(event.button, {buttonState: 'leave'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.bigPocketButtonEnter = function(event) {
    if (event.button !== "bigPocket") return;
    
    this.triggerCallbacksForButton(event.button, {buttonState: 'enter'});
    this.setButtonStateEntered(event.button);
};

realityEditor.gui.buttons.halfPocketButtonEnter = function(event) {
    if (event.button !== "halfPocket") return;
    
    this.triggerCallbacksForButton(event.button, {buttonState: 'enter'});
    this.setButtonStateEntered(event.button);
};

/**
 *
 *   REALITY (RETAIL GUI BUTTONS)
 *
 */

realityEditor.gui.buttons.realityGuiButtonUp = function (event) {
    if (event.button !== "realityGui") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("realityInfo", ["realityGui"]);

    // Add your functionality here.
    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.realityInfoButtonUp = function (event) {
    if (event.button !== "realityInfo") return;
    
    realityEditor.gui.menus.buttonOff("reality", ["realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("realityInfo", ["realityInfo", "realityGui"]);

    // Add your functionality here.
    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.realityTagButtonUp = function (event) {
    if (event.button !== "realityTag") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("reality", ["realityTag"]);

    // Add your functionality here.
    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
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
    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};

realityEditor.gui.buttons.realityWorkButtonUp = function (event) {
    if (event.button !== "realityWork") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("reality", ["realityWork"]);

    // Add your functionality here.
    this.triggerCallbacksForButton(event.button, {buttonState: 'up'});
    this.setButtonStateUp(event.button);
};
