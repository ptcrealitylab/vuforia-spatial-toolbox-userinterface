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

createNameSpace("realityEditor.gui.menus");

///////////////////////////////////
realityEditor.gui.menusModule = {};
(function(exports) {

    /**
     * An array of length <= this.historySteps containing the most recently visited menu names so that you can go back to them
     * @type {Array.<string>} - each element is a key in this.menus
     */
    var history = [];
    /**
     * How many steps to keep track of that you can undo using the back button
     * @type {number}
     */
    var historySteps = 5;

    /**
     * A set of all possible buttons, which will be populated with their DOM elements
     * @type {{back: {}, bigPocket: {}, bigTrash: {}, halfTrash: {}, halfPocket: {}, freeze: {}, logicPocket: {}, logicSetting: {}, gui: {}, logic: {}, pocket: {}, reset: {}, commit: {}, setting: {}, unconstrained: {}, lock: {}, halflock: {}, unlock: {}, record: {}, realityGui: {}, realityInfo: {}, realityTag: {}, realitySearch: {}, realityWork: {}}}
     */
    var buttons = {
        back: {},
        bigPocket: {},
        bigTrash: {},
        halfTrash: {},
        halfPocket: {},
        freeze:{},
        logicPocket:{},
        logicSetting:{},
        gui: {},
        logic: {},
        pocket: {},
        reset: {},
        commit: {},
        setting: {},
        unconstrained: {},
        lock:{},
        halflock:{},
        unlock:{},
        record: {},
        // reality UI
        realityGui : {},
        realityInfo : {},
        realityTag: {},
        realitySearch : {},
        realityWork : {}
    };

    /**
     * A set of all possible menus, where a menu is a set of buttons that should appear when that menu is active, and what color it should be.
     * @type {Object.<string, Object.<string, string>>}
     */
    var menus = {
        default: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
        main: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
        logic: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
        gui: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
        setting: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
        editing: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", commit: "blue", reset: "blue", unconstrained: "blue"},
        crafting: {back: "blue", logicPocket: "green", logicSetting: "blue", freeze: "blue"},
        bigTrash: {bigTrash: "red"},
        bigPocket: {bigPocket: "green"},
        trashOrSave: {halfTrash: "red", halfPocket: "green"},
        locking: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", unlock:"blue", halflock:"blue", lock:"blue"},
        lockingEditing: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", unlock:"blue", halflock:"blue", lock:"blue", reset: "blue", unconstrained: "blue"},
        realityInfo: {realityGui: "blue", realityInfo: "blue", realityTag: "blue", realitySearch: "blue", setting:"blue", realityWork: "blue"},
        reality: {realityGui: "blue", realityTag: "blue", realitySearch: "blue", setting:"blue", realityWork: "blue"},
        settingReality: {realityGui: "blue", realityTag: "blue", realitySearch: "blue", setting:"blue", realityWork: "blue"},
        videoRecording: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", record:"blue"},
        videoRecordingEditing: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", record:"blue", commit:"blue", reset: "blue", unconstrained: "blue"}
    };

    /**
     * Returns whether the menu button of the provided name is visible (included) in the current menu state.
     * @param {string} buttonName
     * @return {boolean}
     */
    function getVisibility(buttonName) {
        return (buttons[buttonName].item.style.visibility !== "hidden");
    }

    /**
     * Gathers references to the DOM elements for a certain button. (they are created already in the HTML file)
     * @param {string} buttonName
     * @return {{item: HTMLElement, overlay: HTMLElement | null | *, bg: HTMLElement | Element | *, state: string[]}}
     */
    function getElementsForButton(buttonName) {
        var svgElement = document.getElementById(buttonName+"Button");
        var overlayElement = document.getElementById(buttonName+"ButtonDiv");
        var bgElement = svgElement.getElementById("bg");

        // special case - logic and gui share one svgElement containing both buttons // TODO: change this, make each separate
        if (buttonName === "logic" || buttonName === "gui") {
            svgElement = document.getElementById("mainButton");
            if (buttonName === "gui") {
                bgElement = svgElement.getElementById("bg0");
            } else {
                bgElement = svgElement.getElementById("bg1");
            }
        }
        
        var buttonObject = { // TODO: rename properties with better names
            item: svgElement,
            overlay: overlayElement,
            bg: bgElement,
            state: ["",""]
        };
        
        buttonObject.overlay.button = buttonName;
        return buttonObject;
    }

    /**
     * Registers the DOM elements for each possible menu button, and adds the touch event listeners.
     */
    function init() {
        addButtonEventListeners();
        registerButtonCallbacks();
    }
    
    function addButtonEventListeners() {
        for (var buttonName in buttons) {
            // populate buttons set with references to each DOM element
            buttons[buttonName] = getElementsForButton(buttonName);

            // add event listeners to each button to trigger custom behavior in gui/buttons.js 
            if(buttons[buttonName].overlay) {
                
                buttons[buttonName].overlay.addEventListener("pointerdown", function (event) {
                    event.button = this.button; // points to the buttonObject.overlay.button property, which = buttonName
                    // pointerDown(event);
                    realityEditor.gui.buttons[buttonName + 'ButtonDown'](event);
                }, false);

                buttons[buttonName].overlay.addEventListener("pointerup", function (event) {

                    // Note: if you don't trigger the _x_ButtonDown for button named _x_, you will need to trigger _x_ButtonUp with
                    // event.ignoreIsDown=true because otherwise it won't register that you intended to press it
                    
                    event.button = this.button;
                    // pointerUp(event);
                    
                    // these functions get generated automatically at runtime
                    realityEditor.gui.buttons[buttonName + 'ButtonUp'](event);
                    
                    sendInterfaces(event.button);
                    if(realityEditor.gui.search.getVisibility() && event.button !== "realitySearch"){
                        realityEditor.gui.search.remove();
                    }
                    
                }, false);

                buttons[buttonName].overlay.addEventListener("pointerenter", function (event) {
                    event.button = this.button;
                    // pointerEnter(event);
                    realityEditor.gui.buttons[buttonName + 'ButtonEnter'](event);
                    buttonActionEnter(event);

                }, false);

                buttons[buttonName].overlay.addEventListener("pointerleave", function (event) {
                    event.button = this.button;
                    // pointerLeave(event);
                    realityEditor.gui.buttons[buttonName + 'ButtonLeave'](event);
                    buttonActionLeave(event);

                }, false);
                
            }
        }
    }


    /**
     * register callbacks for buttons
     * TODO: move non-menu actions to other modules
     */
    function registerButtonCallbacks() {

        realityEditor.gui.buttons.registerCallbackForButton('gui', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                // updates the button visuals to highlight only the GUI button
                buttonOff(["logic","logicPocket","logicSetting","setting","pocket"]);
                buttonOn(["gui"]);
                // update the global gui state
                globalStates.guiState = "ui";
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('logic', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                buttonOff(["gui","logicPocket","logicSetting","setting","pocket"]);
                buttonOn(["logic"]);

                globalStates.guiState = "node";
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('reset', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                switchToMenu("editing", null, ["reset"]);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('commit', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                switchToMenu("editing", null, ["commit"]);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('unconstrained', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                // TODO: decide whether to keep this here
                if (globalStates.unconstrainedPositioning === true) {
                    switchToMenu("editing", null, ["unconstrained"]);
                    globalStates.unconstrainedPositioning = false;
                } else {
                    switchToMenu("editing", ["unconstrained"], null);
                    globalStates.unconstrainedPositioning = true;
                }
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('freeze', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                // TODO: decide whether to keep this here
                if (globalStates.freezeButtonState === true) {
                    buttonOff(["freeze"]);
                    globalStates.freezeButtonState = false;
                    var memoryBackground = document.querySelector('.memoryBackground');
                    memoryBackground.innerHTML = '';
                    realityEditor.app.setResume();

                } else {
                    buttonOn(["freeze"]);
                    globalStates.freezeButtonState = true;
                    realityEditor.app.setPause();
                }
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('record', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                // TODO: move to record module... but need to know whether on or off?
                var didStartRecording = realityEditor.device.videoRecording.toggleRecording();

                if(!didStartRecording) {
                    buttonOff(["record"]);
                } else {
                    buttonOff(["record"]);
                }
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('back', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                console.log('back button pressed');

                buttonOff(["back"]);

                if (history.length > 0) {
                    console.log("history: " + this.history);
                    history.pop();
                    var lastMenu = history[history.length - 1];
                    switchToMenu(lastMenu, null, null); // TODO: history should auto-remember which buttons should be highlighted
                    adjustAfterBackButton(lastMenu);
                }
            }
        }.bind(this));


        var settingTimer = null;
        var wasTimed = false;

        function settingButtonCallback(buttonName, newButtonState) {
            if (newButtonState === 'down' && buttonName === 'setting') { // only works for setting, not logicSetting

                // TODO: decide whether to keep this here
                settingTimer = setTimeout(function(){
                    wasTimed = true;

                    realityEditor.gui.menus.buttonOff(["setting"]);

                    if (!globalStates.editingMode) {
                        realityEditor.device.setEditingMode(true);
                        switchToMenu("editing", null, null);
                        realityEditor.app.saveDeveloperState(true);

                    } else {
                        realityEditor.device.setEditingMode(false);
                        switchToMenu("main", null, null);
                        realityEditor.app.saveDeveloperState(false);
                    }

                }, 200);


            } else if (newButtonState === 'up') { // works for setting or logicSetting

                // TODO: decide whether to keep this here
                if (settingTimer) {
                    clearTimeout(settingTimer);
                }

                if (wasTimed) {
                    wasTimed = false;
                    return;
                }

                if (globalStates.guiState === "logic") {
                    console.log(" LOGIC SETTINGS PRESSED ");
                    var wasBlockSettingsOpen = realityEditor.gui.crafting.eventHelper.hideBlockSettings();
                    switchToMenu("crafting", null, ["logicSetting"]);
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

                    realityEditor.gui.settings.hideSettings();

                    buttonOff(["setting"]);

                    overlayDiv.style.display = "inline";

                    if (globalStates.editingMode) {
                        switchToMenu("editing", null, null);
                    }
                }
                else {
                    realityEditor.gui.settings.showSettings();
                }

            }
        }

        realityEditor.gui.buttons.registerCallbackForButton('setting', settingButtonCallback.bind(this));
        realityEditor.gui.buttons.registerCallbackForButton('logicSetting', settingButtonCallback.bind(this));
        
        // Retail Button Callbacks

        realityEditor.gui.buttons.registerCallbackForButton('realityGui', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
                switchToMenu("realityInfo", ["realityGui"], null);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('realityInfo', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                buttonOff(["realityTag", "realitySearch", "realityWork"]);
                switchToMenu("realityInfo", ["realityInfo", "realityGui"], null);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('realityTag', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
                switchToMenu("reality", ["realityTag"], null);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('realitySearch', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
                switchToMenu("reality", ["realitySearch"], null);

                if (realityEditor.gui.search.getVisibility()) {
                    realityEditor.gui.search.remove();
                } else {
                    realityEditor.gui.search.add();
                }
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('realityWork', function(buttonName, newButtonState) {
            if (newButtonState === 'up') {
                buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
                switchToMenu("reality", ["realityWork"], null);
            }
        }.bind(this));
    }

    /**
     * Remove the oldest history item and add this menu as the newest
     * @param {string} menuName
     */
    function addToHistory(menuName) {
        if (history.length >= historySteps) {
            history.shift();
        }
        history.push(menuName);
    }

    /**
     * Switches to the menu of name menuDiv and activates (highlight) a subset of its buttons, and deactivates another subset
     * @param {string} newMenuName
     * @param {Array.<string>|null} buttonsToHighlight
     * @param {Array.<string>|null} buttonsToUnhighlight
     */
    function switchToMenu(newMenuName, buttonsToHighlight, buttonsToUnhighlight) {
        // handle null parameters gracefully
        buttonsToHighlight = buttonsToHighlight || [];
        buttonsToUnhighlight = buttonsToUnhighlight || [];

        // show correct combination of sub-menus
        if ((newMenuName === "main" || newMenuName === "gui" ||newMenuName === "logic") && !globalStates.settingsButtonState) {
            if (globalStates.editingMode && globalStates.videoRecordingEnabled) {
                newMenuName = "videoRecordingEditing"
            } else if (globalStates.editingMode && globalStates.lockingMode) {
                newMenuName = "lockingEditing";
            } else if (globalStates.editingMode) {
                newMenuName = "editing";
            } else if (globalStates.videoRecordingEnabled) {
                newMenuName = "videoRecording"
            } else if (globalStates.lockingMode) {
                newMenuName = "locking";
            }
        }

        // update history so back button works
        addToHistory(newMenuName);

        // show and hide all buttons so that only the ones included in this.menus[menuDiv] are visible
        for (var buttonName in buttons) {
            if (buttonName in menus[newMenuName]) {
                buttons[buttonName].item.style.visibility = "visible";
                buttons[buttonName].overlay.style.visibility = "visible";
            } else {
                buttons[buttonName].item.style.visibility = "hidden";
                buttons[buttonName].overlay.style.visibility = "hidden";
            }
        }

        // highlights any buttons included in buttonsToHighlight, 
        buttonsToHighlight.forEach( function(buttonName) {
            if (buttonName in menus[newMenuName]) {
                highlightButton(buttonName, true);
            }
        });

        // and un-highlights any included in buttonsToUnhighlight
        buttonsToUnhighlight.forEach( function(buttonName) {
            if (buttonName in menus[newMenuName]) {
                highlightButton(buttonName, false);
            }
        });
    }

    /**
     * Changes the background color for the provided button to be active or inactive
     * @param {string} buttonName
     * @param {boolean} shouldHighlight
     */
    function highlightButton(buttonName, shouldHighlight) {
        if (buttonName in buttons) {
            var buttonBackground = buttons[buttonName].bg;
            buttonBackground.classList.add( (shouldHighlight ? 'active' : 'inactive') );
            buttonBackground.classList.remove( (shouldHighlight ? 'inactive' : 'active') );
        }
    }

    /**
     * Highlights a specific button, without changing which menu is active.
     * @param {Array.<string>} buttonArray
     */
    function buttonOn(buttonArray) {
        buttonArray.forEach( function(buttonName) {
            highlightButton(buttonName, true);
        });
    }

    /**
     * Remove the highlight from a specific button, without changing which menu is active.
     * @param {Array.<string>} buttonArray
     */
    function buttonOff(buttonArray) { // TODO: accept string argument if only one changing, array if multiple?
        buttonArray.forEach( function(buttonName) {
            highlightButton(buttonName, false);
        });
    }

    /**
     * Triggers any side effects when the back button is pressed and you arrive at the new menu
     * @param {string} newMenu
     */
    function adjustAfterBackButton(newMenu) {

        if (newMenu === 'crafting') {
            // if the blockMenu is visible, close it
            var existingMenu = document.getElementById('menuContainer');
            if (existingMenu && existingMenu.style.display !== 'none') {
                realityEditor.gui.buttons.logicPocketButtonUp({button: "logicPocket", ignoreIsDown: true});
                return;
                // if the blockSettings view is visible, close it
            } else if (document.getElementById('blockSettingsContainer')) {
                realityEditor.gui.buttons.settingButtonUp({button: "setting", ignoreIsDown: true});
                return;
            }
        }

        // default option is to close the crafting board
        realityEditor.gui.buttons.logicButtonUp({button: "logic", ignoreIsDown: true});
    }

    /**
     * Highlight a particular button on touch enter
     * @param {ButtonEvent} event
     */
    function buttonActionEnter(event) {
        buttons[event.button].bg.classList.add('touched');
    }

    /**
     * Un-highlight a particular button on touch leave
     * @param {ButtonEvent} event
     */
    function buttonActionLeave(event) {
        buttons[event.button].bg.classList.remove('touched');
    }

    /**
     * Posts the name of the button that was pressed into any visible frames and nodes
     * @param {string} interfaceName
     */
    function sendInterfaces(interfaceName) {
        
        // update the global app state to know which button was most recently pressed
        globalStates.interface = interfaceName;

        // send active user interfaceName status in to the AR-UI
        var msg = { interface: globalStates.interface };

        // include the search state in the message if we are in realitySearch mode
        if (interfaceName === "realitySearch") {
            msg.search = realityEditor.gui.search.getSearch();
        }

        realityEditor.forEachFrameInAllObjects( function(objectKey, frameKey) {

            // post into each visible frame
            var frame = realityEditor.getFrame(objectKey, frameKey);
            if (frame.visible) {
                globalDOMCache["iframe" + frameKey].contentWindow.postMessage(JSON.stringify(msg), "*");

                // post into each visible node
                realityEditor.forEachNodeInFrame(objectKey, frameKey, function(objectKey, frameKey, nodeKey) {
                    var node = realityEditor.getNode(objectKey, frameKey, nodeKey);
                    if (node.visible) {
                        globalDOMCache["iframe" + nodeKey].contentWindow.postMessage(JSON.stringify(msg), "*");
                    }
                });
            }
        });
    }
    
    exports.getVisibility = getVisibility;
    exports.init = init;
    exports.switchToMenu = switchToMenu;
    exports.buttonOn = buttonOn;
    exports.buttonOff = buttonOff;
    exports.sendInterfaces = sendInterfaces; // public so other events e.g. search button can send current interface to frames
    
})(realityEditor.gui.menusModule);
//////////////////////////////////

/**
 * A set of all possible buttons, which will be populated with their DOM elements
 * @type {{back: {}, bigPocket: {}, bigTrash: {}, halfTrash: {}, halfPocket: {}, freeze: {}, logicPocket: {}, logicSetting: {}, gui: {}, logic: {}, pocket: {}, reset: {}, commit: {}, setting: {}, unconstrained: {}, lock: {}, halflock: {}, unlock: {}, record: {}, realityGui: {}, realityInfo: {}, realityTag: {}, realitySearch: {}, realityWork: {}}}
 */
realityEditor.gui.menus.buttons = {
    back: {},
    bigPocket: {},
    bigTrash: {},
    halfTrash: {},
    halfPocket: {},
    freeze:{},
    logicPocket:{},
    logicSetting:{},
    gui: {},
    logic: {},
    pocket: {},
    reset: {},
    commit: {},
    setting: {},
    unconstrained: {},
    lock:{},
    halflock:{},
    unlock:{},
    record: {},
    // reality UI
    realityGui : {},
    realityInfo : {},
    realityTag: {},
    realitySearch : {},
    realityWork : {}
};

/**
 * A set of all possible menus, where a menu is a set of buttons that should appear when that menu is active, and what color it should be.
 * @type {Object.<string, Object.<string, string>>}
 */
realityEditor.gui.menus.menus = {
    default: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
    main: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
    logic: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
    gui: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
    setting: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue"},
    editing: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", commit: "blue", reset: "blue", unconstrained: "blue"},
    crafting: {back: "blue", logicPocket: "green", logicSetting: "blue", freeze: "blue"},
    bigTrash: {bigTrash: "red"},
    bigPocket: {bigPocket: "green"},
    trashOrSave: {halfTrash: "red", halfPocket: "green"},
    locking: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", unlock:"blue", halflock:"blue", lock:"blue"},
    lockingEditing: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", unlock:"blue", halflock:"blue", lock:"blue", reset: "blue", unconstrained: "blue"},
    realityInfo: {realityGui: "blue", realityInfo: "blue", realityTag: "blue", realitySearch: "blue", setting:"blue", realityWork: "blue"},
    reality: {realityGui: "blue", realityTag: "blue", realitySearch: "blue", setting:"blue", realityWork: "blue"},
    settingReality: {realityGui: "blue", realityTag: "blue", realitySearch: "blue", setting:"blue", realityWork: "blue"},
    videoRecording: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", record:"blue"},
    videoRecordingEditing: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", record:"blue", commit:"blue", reset: "blue", unconstrained: "blue"}
};

/**
 * Returns whether the menu button of the provided name is visible (included) in the current menu state.
 * @param {string} item
 * @return {boolean}
 */
realityEditor.gui.menus.getVisibility = function(item){
    return (this.buttons[item].item.style.visibility !== "hidden");
};

/**
 * An array of length <= this.historySteps containing the most recently visited menu names so that you can go back to them
 * @type {Array.<string>} - each element is a key in this.menus
 */
realityEditor.gui.menus.history = [];

/**
 * How many steps to keep track of that you can undo using the back button
 * @type {number}
 */
realityEditor.gui.menus.historySteps = 5;

/**
 * Gathers references to the DOM elements for a certain button. (they are created already in the HTML file)
 * @param {string} element - the name of the button
 * @return {{item: HTMLElement, overlay: HTMLElement | null | *, bg: HTMLElement | Element | *, state: string[]}}
 */
realityEditor.gui.menus.getElements = function (element) {
    var svgDoc,l;
    if (element === "logic" || element === "gui") {
        svgDoc = document.getElementById("mainButton");
    } else {
        svgDoc = document.getElementById(element+"Button");
    }

    l = document.getElementById(element+"ButtonDiv");

    var svgElement;

    if (element === "gui") {
        svgElement= {item: svgDoc, overlay: l,  bg:svgDoc.getElementById("bg0"), state: ["",""]}
    } else if (element === "logic") {
        svgElement= {item: svgDoc, overlay: l,  bg:svgDoc.getElementById("bg1"), state: ["",""]}
    } else {
        svgElement= {item: svgDoc, overlay: l, bg:svgDoc.getElementById("bg"), state: ["",""]}
    }

    svgElement.overlay.button = element;
    return svgElement;
};

/**
 * Creates the DOM elements for each possible menu button, and adds the touch event listeners.
 */
realityEditor.gui.menus.init = function () {
    for (key in this.buttons) {
        this.buttons[key] = this.getElements(key);

        if(this.buttons[key].overlay) {
            this.buttons[key].overlay.addEventListener("pointerdown",
                function (evt) {
                    evt.button = this.button;
                    realityEditor.gui.menus.pointerDown(evt);
                }, false);

            this.buttons[key].overlay.addEventListener("pointerup",
                function (evt) {
                    evt.button = this.button;
                    realityEditor.gui.menus.pointerUp(evt);
                }, false);

            this.buttons[key].overlay.addEventListener("pointerenter",
                function (evt) {
                    evt.button = this.button;
                    realityEditor.gui.menus.pointerEnter(evt);
                }, false);

            this.buttons[key].overlay.addEventListener("pointerleave",
                function (evt) {
                    evt.button = this.button;
                    realityEditor.gui.menus.pointerLeave(evt);
                }, false);

            this.buttons[key].overlay.addEventListener("pointermove",
                function (evt) {
                    evt.button = this.button;
                    realityEditor.gui.menus.pointerMove(evt);
                }, false);

        }
    }

    // register callbacks for buttons
    // TODO: move non-menu actions to other modules

    realityEditor.gui.buttons.registerCallbackForButton('gui', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            // updates the button visuals to highlight only the GUI button
            this.buttonOff(["logic","logicPocket","logicSetting","setting","pocket"]);
            this.buttonOn(["gui"]);
            // update the global gui state
            globalStates.guiState = "ui";
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('logic', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff(["gui","logicPocket","logicSetting","setting","pocket"]);
            this.buttonOn(["logic"]);

            globalStates.guiState = "node";
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('reset', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.off("editing",["reset"]);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('commit', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            realityEditor.gui.menus.off("editing",["commit"]);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('unconstrained', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            // TODO: decide whether to keep this here
            if (globalStates.unconstrainedPositioning === true) {
                realityEditor.gui.menus.off("editing", ["unconstrained"]);
                globalStates.unconstrainedPositioning = false;
            } else {
                realityEditor.gui.menus.on("editing", ["unconstrained"]);
                globalStates.unconstrainedPositioning = true;
            }
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('freeze', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            // TODO: decide whether to keep this here
            if (globalStates.freezeButtonState === true) {

                realityEditor.gui.menus.buttonOff(["freeze"]);

                globalStates.freezeButtonState = false;
                var memoryBackground = document.querySelector('.memoryBackground');
                memoryBackground.innerHTML = '';
                realityEditor.app.setResume();

            } else {
                realityEditor.gui.menus.buttonOn(["freeze"]);
                globalStates.freezeButtonState = true;
                realityEditor.app.setPause();
            }
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('record', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            // TODO: move to record module... but need to know whether on or off?
            var didStartRecording = realityEditor.device.videoRecording.toggleRecording();

            if(!didStartRecording) {
                realityEditor.gui.menus.buttonOff(["record"]);
            } else {
                realityEditor.gui.menus.buttonOff(["record"]);
            }
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('back', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            console.log('back button pressed');

            this.buttonOff(["back"]);

            if (this.history.length>0) {
                console.log("history: " + this.history);
                this.history.pop();
                var lastMenu = this.history[this.history.length - 1];
                this.on(lastMenu, []); // TODO: history should auto-remember which buttons should be highlighted
                
                this.adjustAfterBackButton(lastMenu);
            }
        }
    }.bind(this));


    var settingTimer = null;
    var wasTimed = false;

    function settingButtonCallback(buttonName, newButtonState) {
        if (newButtonState === 'down' && buttonName === 'setting') { // only works for setting, not logicSetting

            // TODO: decide whether to keep this here
            settingTimer = setTimeout(function(){
                wasTimed = true;

                realityEditor.gui.menus.buttonOff(["setting"]);

                if (!globalStates.editingMode) {
                    realityEditor.device.setEditingMode(true);
                    realityEditor.gui.menus.on("editing", []);
                    realityEditor.app.saveDeveloperState(true);

                } else {
                    realityEditor.device.setEditingMode(false);
                    realityEditor.gui.menus.on("main",[]);
                    realityEditor.app.saveDeveloperState(false);
                }
                
            }, 200);


        } else if (newButtonState === 'up') { // works for setting or logicSetting

            // TODO: decide whether to keep this here
            if (settingTimer) {
                clearTimeout(settingTimer);
            }

            if (wasTimed) {
                wasTimed = false;
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

                realityEditor.gui.settings.hideSettings();

                realityEditor.gui.menus.buttonOff(["setting"]);

                overlayDiv.style.display = "inline";

                if (globalStates.editingMode) {
                    realityEditor.gui.menus.on("editing", []);
                }
            }
            else {
                realityEditor.gui.settings.showSettings();
            }

        }
    }

    realityEditor.gui.buttons.registerCallbackForButton('setting', settingButtonCallback.bind(this));
    realityEditor.gui.buttons.registerCallbackForButton('logicSetting', settingButtonCallback.bind(this));


    // Retail Button Callbacks

    realityEditor.gui.buttons.registerCallbackForButton('realityGui', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
            this.on("realityInfo", ["realityGui"]);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('realityInfo', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff(["realityTag", "realitySearch", "realityWork"]);
            this.on("realityInfo", ["realityInfo", "realityGui"]);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('realityTag', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
            this.on("reality", ["realityTag"]);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('realitySearch', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
            this.on("reality", ["realitySearch"]);

            if (realityEditor.gui.search.getVisibility()) {
                realityEditor.gui.search.remove();
            } else {
                realityEditor.gui.search.add();
            }
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('realityWork', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
            this.on("reality", ["realityWork"]);
        }
    }.bind(this));

};

/**
 * Remove the oldest history item and add this menu as the newest
 * @param {string} menuName
 */
realityEditor.gui.menus.addToHistory = function(menuName) {
    if (this.history.length >= this.historySteps) {
        this.history.shift();
    }
    this.history.push(menuName);
};

/**
 * Switches to the menu of name menuDiv and activates (highlight) a subset of its buttons, and deactivates another subset
 * @param {string} newMenuName
 * @param {Array.<string>|null} buttonsToHighlight
 * @param {Array.<string>|null} buttonsToUnhighlight
 */
realityEditor.gui.menus.updateMenu = function(newMenuName, buttonsToHighlight, buttonsToUnhighlight) {
    // handle null parameters gracefully
    buttonsToHighlight = buttonsToHighlight || [];
    buttonsToUnhighlight = buttonsToUnhighlight || [];
    
    // show correct combination of sub-menus
    if ((newMenuName === "main" || newMenuName === "gui" ||newMenuName === "logic") && !globalStates.settingsButtonState) {
        if (globalStates.editingMode && globalStates.videoRecordingEnabled) {
            newMenuName = "videoRecordingEditing"
        } else if (globalStates.editingMode && globalStates.lockingMode) {
            newMenuName = "lockingEditing";
        } else if (globalStates.editingMode) {
            newMenuName = "editing";
        } else if (globalStates.videoRecordingEnabled) {
            newMenuName = "videoRecording"
        } else if (globalStates.lockingMode) {
            newMenuName = "locking";
        }
    }

    // update history so back button works
    this.addToHistory(newMenuName);

    // show and hide all buttons so that only the ones included in this.menus[menuDiv] are visible
    for (var key in this.buttons) {
        if (key in this.menus[newMenuName]) {
            this.buttons[key].item.style.visibility = "visible";
            this.buttons[key].overlay.style.visibility = "visible";
        } else {
            this.buttons[key].item.style.visibility = "hidden";
            this.buttons[key].overlay.style.visibility = "hidden";
        }
    }

    // highlights any buttons included in buttonsToHighlight, 
    buttonsToHighlight.forEach(function(buttonName) {
        if (buttonName in realityEditor.gui.menus.menus[newMenuName]) {
            highlightButton(buttonName, true);
        }
    });

    // and un-highlights any included in buttonsToUnhighlight
    buttonsToUnhighlight.forEach( function(buttonName) {
        if (buttonName in realityEditor.gui.menus.menus[newMenuName]) {
            highlightButton(buttonName, false);
        }
    });
};

/**
 * Changes the background color for the provided button to be active or inactive
 * @param {string} buttonName
 * @param {boolean} shouldHighlight
 */
function highlightButton(buttonName, shouldHighlight) {
    if (buttonName in realityEditor.gui.menus.buttons) {
        var buttonBackground = realityEditor.gui.menus.buttons[buttonName].bg;
        buttonBackground.classList.add( (shouldHighlight ? 'active' : 'inactive') );
        buttonBackground.classList.remove( (shouldHighlight ? 'inactive' : 'active') );
    }
}

/**
 * Switches to the menu of name menuDiv and activate (highlight) a subset of its buttons, contained in buttonArray
 * @param {string} menuDiv
 * @param {Array.<string>} buttonArray
 */
realityEditor.gui.menus.on = function(menuDiv, buttonArray) {
    this.updateMenu(menuDiv, buttonArray, null);
};

/**
 * Switches to the menu of name menuDiv and deactivate (un-highlight) a subset of its buttons, contained in buttonArray
 * @param {string} menuDiv
 * @param {Array.<string>} buttonArray
 */
realityEditor.gui.menus.off = function(menuDiv, buttonArray) {
    this.updateMenu(menuDiv, null, buttonArray);
};

/**
 * Highlights a specific button, without changing which menu is active.
 * @param {Array.<string>} buttonArray
 */
realityEditor.gui.menus.buttonOn = function(buttonArray) {
    buttonArray.forEach(function(buttonName) {
        highlightButton(buttonName, true);
    });
};

/**
 * Remove the highlight from a specific button, without changing which menu is active.
 * @param {Array.<string>} buttonArray
 */
realityEditor.gui.menus.buttonOff = function(buttonArray) {
    buttonArray.forEach(function(buttonName) {
        highlightButton(buttonName, false);
    });
};

/**
 * Triggers any side effects when the back button is pressed and you arrive at the new menu
 * @param {string} newMenu
 */
realityEditor.gui.menus.adjustAfterBackButton = function(newMenu) {
    
    if (newMenu === 'crafting') {
        // if the blockMenu is visible, close it
        var existingMenu = document.getElementById('menuContainer');
        if (existingMenu && existingMenu.style.display !== 'none') {
            realityEditor.gui.buttons.logicPocketButtonUp({button: "logicPocket", ignoreIsDown: true});
            return;
        // if the blockSettings view is visible, close it
        } else if (document.getElementById('blockSettingsContainer')) {
            realityEditor.gui.buttons.settingButtonUp({button: "setting", ignoreIsDown: true});
            return;
        } 
    }

    // default option is to close the crafting board
    realityEditor.gui.buttons.logicButtonUp({button: "logic", ignoreIsDown: true});
};

realityEditor.gui.menus.buttonActionEnter = function(event) {
    // make button react to touch
    // var button = realityEditor.gui.menus.buttons;
    // button[event.button].bg.setAttribute("class",   button[event.button].bg.classList[0]+" touched");
    
    // var button = event.button;
    this.buttons[event.button].bg.classList.add('touched');
};

realityEditor.gui.menus.buttonActionLeave = function(event) {
    // make button react to touch
    // var button = realityEditor.gui.menus.buttons;
    // if(button[event.button].bg.classList[1] !=="active") {
    //     button[event.button].bg.setAttribute("class", button[event.button].bg.classList[0] + " " + "inactive");
    // } else {
    //     button[event.button].bg.setAttribute("class", button[event.button].bg.classList[0] + " " + "active");
    // }

    this.buttons[event.button].bg.classList.remove('touched');
};

/**
 * Posts the name of the button that was pressed into any visible frames and nodes
 * @param {string} interfaceName
 */
realityEditor.gui.menus.sendInterfaces = function(interfaceName) {

    // send active user interfaceName status in to the AR-UI
    console.log('sendInterfaces', interfaceName);
    
    globalStates.interface = interfaceName;
    
    var msg = { interface: globalStates.interface };

    // include the search state in the message if we are in realitySearch mode
    if (interfaceName === "realitySearch") {
        msg.search = realityEditor.gui.search.getSearch();
    }

    realityEditor.forEachFrameInAllObjects( function(objectKey, frameKey) {

        // post into each visible frame
        var frame = realityEditor.getFrame(objectKey, frameKey);
        if (frame.visible) {
            globalDOMCache["iframe" + frameKey].contentWindow.postMessage(JSON.stringify(msg), "*");

            // post into each visible node
            realityEditor.forEachNodeInFrame(objectKey, frameKey, function(objectKey, frameKey, nodeKey) {
                var node = realityEditor.getNode(objectKey, frameKey, nodeKey);
                if (node.visible) {
                    globalDOMCache["iframe" + nodeKey].contentWindow.postMessage(JSON.stringify(msg), "*");
                }
            });
        }
    });
};


/********************************************************************
 * Pointer Events for Buttons
 ********************************************************************/

realityEditor.gui.menus.pointerDown = function(event) {
//console.log("Down on: "+event.button);

    // Note: if you don't trigger the _x_ButtonDown for button named _x_, you will need to trigger _x_ButtonUp with
    // event.ignoreIsDown=true because otherwise it won't register that you intended to press it
    
    // these functions get generated automatically at runtime
    realityEditor.gui.buttons.guiButtonDown(event);
    realityEditor.gui.buttons.logicButtonDown(event);
    realityEditor.gui.buttons.pocketButtonDown(event);
    realityEditor.gui.buttons.logicPocketButtonDown(event);
    realityEditor.gui.buttons.resetButtonDown(event);
    realityEditor.gui.buttons.commitButtonDown(event);
    realityEditor.gui.buttons.unconstrainedButtonDown(event);
    realityEditor.gui.buttons.settingButtonDown(event);
    realityEditor.gui.buttons.logicSettingButtonDown(event);
    realityEditor.gui.buttons.freezeButtonDown(event);
    realityEditor.gui.buttons.lockButtonDown(event);
    realityEditor.gui.buttons.halflockButtonDown(event);
    realityEditor.gui.buttons.unlockButtonDown(event);
    realityEditor.gui.buttons.recordButtonDown(event);
    realityEditor.gui.buttons.backButtonDown(event);

};

realityEditor.gui.menus.pointerUp = function(event) {
    //  console.log("Up on: "+event.button);

    this.sendInterfaces(event.button);

    realityEditor.gui.buttons.guiButtonUp(event);
    realityEditor.gui.buttons.logicButtonUp(event);
    realityEditor.gui.buttons.resetButtonUp(event);
    realityEditor.gui.buttons.commitButtonUp(event);
    realityEditor.gui.buttons.unconstrainedButtonUp(event);
    realityEditor.gui.buttons.settingButtonUp(event);
    realityEditor.gui.buttons.logicSettingButtonUp(event);
    realityEditor.gui.buttons.freezeButtonUp(event);
    realityEditor.gui.buttons.pocketButtonUp(event);
    realityEditor.gui.buttons.logicPocketButtonUp(event);
    realityEditor.gui.buttons.lockButtonUp(event);
    realityEditor.gui.buttons.halflockButtonUp(event);
    realityEditor.gui.buttons.unlockButtonUp(event);
    realityEditor.gui.buttons.recordButtonUp(event);
    realityEditor.gui.buttons.backButtonUp(event);

    // Reality UI

    realityEditor.gui.buttons.realityGuiButtonUp(event);
    realityEditor.gui.buttons.realityInfoButtonUp(event);
    realityEditor.gui.buttons.realityTagButtonUp(event);
    realityEditor.gui.buttons.realitySearchButtonUp(event);
    realityEditor.gui.buttons.realityWorkButtonUp(event);

    // console.log(realityEditor.gui.search.getVisibility());
    if(realityEditor.gui.search.getVisibility() && event.button !== "realitySearch"){
        realityEditor.gui.search.remove();
    }

    // End
};

realityEditor.gui.menus.pointerEnter = function(event) {
    // console.log("Enter on: "+event.button);

    realityEditor.gui.buttons.pocketButtonEnter(event);
    realityEditor.gui.buttons.bigPocketButtonEnter(event);
    realityEditor.gui.buttons.halfPocketButtonEnter(event);

    this.buttonActionEnter(event);
};

realityEditor.gui.menus.pointerLeave = function(event) {
    //  console.log("Leave on: "+event.button);

    realityEditor.gui.buttons.pocketButtonLeave(event);

    this.buttonActionLeave(event);
};

realityEditor.gui.menus.pointerMove = function(event) {
    // console.log("Move on: "+event.button);
};
