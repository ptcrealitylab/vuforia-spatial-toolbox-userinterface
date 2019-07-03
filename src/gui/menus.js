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
     * @type {{back: {}, bigPocket: {}, bigTrash: {}, halfTrash: {}, halfPocket: {}, freeze: {}, logicPocket: {}, logicSetting: {}, gui: {}, logic: {}, pocket: {}, reset: {}, commit: {}, setting: {}, unconstrained: {}, distance: {}, lock: {}, halflock: {}, unlock: {}, record: {}, realityGui: {}, realityInfo: {}, realityTag: {}, realitySearch: {}, realityWork: {}}}
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
        distance: {},
        distanceGreen: {},
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
        editing: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", commit: "blue", reset: "blue", unconstrained: "blue", distance: "blue"},
        crafting: {back: "blue", logicPocket: "green", logicSetting: "blue", freeze: "blue"},
        bigTrash: {bigTrash: "red", distanceGreen: "green"},
        bigPocket: {bigPocket: "green"},
        trashOrSave: {halfTrash: "red", halfPocket: "green"},
        locking: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", unlock:"blue", halflock:"blue", lock:"blue"},
        lockingEditing: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", unlock:"blue", halflock:"blue", lock:"blue", reset: "blue", unconstrained: "blue", distance: "blue"},
        realityInfo: {realityGui: "blue", realityInfo: "blue", realityTag: "blue", realitySearch: "blue", setting:"blue", realityWork: "blue"},
        reality: {realityGui: "blue", realityTag: "blue", realitySearch: "blue", setting:"blue", realityWork: "blue"},
        settingReality: {realityGui: "blue", realityTag: "blue", realitySearch: "blue", setting:"blue", realityWork: "blue"},
        videoRecording: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", record:"blue"},
        videoRecordingEditing: {gui: "blue", logic: "blue", pocket: "blue", setting: "blue", freeze: "blue", record:"blue", commit:"blue", reset: "blue", unconstrained: "blue", distance: "blue"}
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
        var bgElement;

        // special case - logic and gui share one svgElement containing both buttons // TODO: change this, make each separate
        if (buttonName === "logic" || buttonName === "gui") {
            svgElement = document.getElementById("mainButton");
            if (buttonName === "gui") {
                bgElement = svgElement.getElementById("bg0");
            } else {
                bgElement = svgElement.getElementById("bg1");
            }
        } else {
            bgElement = svgElement.getElementById("bg");
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

    /**
     * Attaches pointer event listeners to each button which will trigger UI effects in the menus module and model/control effects in the buttons module
     */
    function addButtonEventListeners() {
        for (var buttonName in buttons) {
            // populate buttons set with references to each DOM element
            buttons[buttonName] = getElementsForButton(buttonName);
            // add pointer up/down/enter/leave events
            addEventListenersForButton(buttonName);
        }
    }

    /**
     * Needs to be in its own function to form a closure on the scope of buttonName
     * @param {string} buttonName
     */
    function addEventListenersForButton(buttonName) {
        // add event listeners to each button to trigger custom behavior in gui/buttons.js 
        if(buttons[buttonName].overlay) {

            buttons[buttonName].overlay.addEventListener("pointerdown", function (event) {
                console.log(buttonName + ' down');
                
                var mutableEvent = realityEditor.network.frameContentAPI.getMutablePointerEventCopy(event);
                
                mutableEvent.button = this.button; // points to the buttonObject.overlay.button property, which = buttonName
                realityEditor.gui.buttons[buttonName + 'ButtonDown'](mutableEvent);
            }, false);

            buttons[buttonName].overlay.addEventListener("pointerup", function (event) {
                console.log(buttonName + ' up');

                // Note: if you don't trigger the _x_ButtonDown for button named _x_, you will need to trigger _x_ButtonUp with
                // event.ignoreIsDown=true because otherwise it won't register that you intended to press it

                var mutableEvent = realityEditor.network.frameContentAPI.getMutablePointerEventCopy(event);

                mutableEvent.button = this.button;
                // pointerUp(event);

                // these functions get generated automatically at runtime
                realityEditor.gui.buttons[buttonName + 'ButtonUp'](mutableEvent);

                sendInterfaces(mutableEvent.button);
                if(realityEditor.gui.search.getVisibility() && mutableEvent.button !== "realitySearch"){
                    realityEditor.gui.search.remove();
                }

            }, false);

            buttons[buttonName].overlay.addEventListener("pointerenter", function (event) {
                var mutableEvent = realityEditor.network.frameContentAPI.getMutablePointerEventCopy(event);

                mutableEvent.button = this.button;
                // pointerEnter(event);
                realityEditor.gui.buttons[buttonName + 'ButtonEnter'](mutableEvent);
                buttonActionEnter(mutableEvent);

            }, false);

            buttons[buttonName].overlay.addEventListener("pointerleave", function (event) {
                var mutableEvent = realityEditor.network.frameContentAPI.getMutablePointerEventCopy(event);

                mutableEvent.button = this.button;
                // pointerLeave(event);
                realityEditor.gui.buttons[buttonName + 'ButtonLeave'](mutableEvent);
                buttonActionLeave(mutableEvent);

            }, false);

        }
    }

    /**
     * register callbacks for buttons
     * TODO: move non-menu actions to other modules
     */
    function registerButtonCallbacks() {

        realityEditor.gui.buttons.registerCallbackForButton('gui', function(params) {
            if (params.newButtonState === 'up') {
                // updates the button visuals to highlight only the GUI button
                buttonOff(["logic","logicPocket","logicSetting","setting","pocket"]);
                buttonOn(["gui"]);
                // update the global gui state
                globalStates.guiState = "ui";

                if (DEBUG_DATACRAFTING) { // TODO: BEN DEBUG - turn off debugging!
                    // var logic = new Logic();
                    // realityEditor.gui.crafting.initializeDataCraftingGrid(logic);
                    realityEditor.gui.crafting.craftingBoardVisible(Object.keys(objects)[0], Object.keys(objects)[0], Object.keys(objects)[0]);
                }
                
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('logic', function(params) {
            if (params.newButtonState === 'up') {
                buttonOff(["gui","logicPocket","logicSetting","setting","pocket"]);
                buttonOn(["logic"]);

                globalStates.guiState = "node";
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('reset', function(params) {
            if (params.newButtonState === 'up') {
                switchToMenu("editing", null, ["reset"]);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('commit', function(params) {
            if (params.newButtonState === 'up') {
                switchToMenu("editing", null, ["commit"]);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('unconstrained', function(params) {
            if (params.newButtonState === 'up') {
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
        
        realityEditor.gui.buttons.registerCallbackForButton('distance', function(params) {
            console.log('registered in buttons module', params.newButtonState, globalStates.distanceEditingMode);
            if (params.newButtonState === 'up') {
                // TODO: decide whether to keep this here or move to distanceScaling.js
                if (globalStates.distanceEditingMode === true) {
                    switchToMenu("editing", null, ["distance"]);
                    globalStates.distanceEditingMode = false;
                } else {
                    switchToMenu("editing", ["distance"], null);
                    globalStates.distanceEditingMode = true;
                }
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('freeze', function(params) {
            if (params.newButtonState === 'up') {
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

        realityEditor.gui.buttons.registerCallbackForButton('record', function(params) {
            if (params.newButtonState === 'up') {
                // TODO: move to record module... but need to know whether on or off?
                var didStartRecording = realityEditor.device.videoRecording.toggleRecording();

                if(!didStartRecording) {
                    buttonOff(["record"]);
                } else {
                    buttonOff(["record"]);
                }
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('back', function(params) {
            if (params.newButtonState === 'up') {
                console.log('back button pressed');

                buttonOff(["back"]);

                if (history.length > 0) {
                    console.log("history: " + history);
                    history.pop();
                    var lastMenu = history[history.length - 1];
                    switchToMenu(lastMenu, null, null); // TODO: history should auto-remember which buttons should be highlighted
                    adjustAfterBackButton(lastMenu);
                }
            }
        }.bind(this));


        var settingTimer = null;
        var wasTimed = false;

        function settingButtonCallback(params) {
            if (params.newButtonState === 'down' && params.buttonName === 'setting') { // only works for setting, not logicSetting

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


            } else if (params.newButtonState === 'up') { // works for setting or logicSetting

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

        realityEditor.gui.buttons.registerCallbackForButton('realityGui', function(params) {
            if (params.newButtonState === 'up') {
                buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
                switchToMenu("realityInfo", ["realityGui"], null);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('realityInfo', function(params) {
            if (params.newButtonState === 'up') {
                buttonOff(["realityTag", "realitySearch", "realityWork"]);
                switchToMenu("realityInfo", ["realityInfo", "realityGui"], null);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('realityTag', function(params) {
            if (params.newButtonState === 'up') {
                buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
                switchToMenu("reality", ["realityTag"], null);
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('realitySearch', function(params) {
            if (params.newButtonState === 'up') {
                buttonOff(["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
                switchToMenu("reality", ["realitySearch"], null);

                if (realityEditor.gui.search.getVisibility()) {
                    realityEditor.gui.search.remove();
                } else {
                    realityEditor.gui.search.add();
                }
            }
        }.bind(this));

        realityEditor.gui.buttons.registerCallbackForButton('realityWork', function(params) {
            if (params.newButtonState === 'up') {
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
    
})(realityEditor.gui.menus);
