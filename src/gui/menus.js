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



/**
 * @desc
 * @param array
 **/

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

realityEditor.gui.menus.getVisibility = function(item){
    if(this.buttons[item].item.style.visibility !== "hidden"){
        return true;
    }else {
        return false;
    }
};

realityEditor.gui.menus.getSelected = function(item){
    if(this.buttons[item+"Div"].item.style.opacity !== 0){
        return true;
    }else {
        return false;
    }
};

realityEditor.gui.menus.history = [];

realityEditor.gui.menus.historySteps = 5;

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

realityEditor.gui.menus.init = function () {
    for (key in this.buttons) {
        this.buttons[key] = this.getElements(key);

        if( this.buttons[key].overlay) {
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
    //  document.getElementById("UIButtons").style.visibility = "visible";

    // register callbacks for buttons

    realityEditor.gui.buttons.registerCallbackForButton('gui', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            // updates the button visuals to highlight only the GUI button
            this.buttonOff("main",["logic","logicPocket","logicSetting","setting","pocket"]);
            realityEditor.gui.menus.buttonOn("main",["gui"]);
            // update the global gui state
            globalStates.guiState = "ui";
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('logic', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff("main",["gui","logicPocket","logicSetting","setting","pocket"]);
            this.buttonOn("main",["logic"]);

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
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('record', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            // TODO: move to record module... but need to know whether on or off?
            var didStartRecording = realityEditor.device.videoRecording.toggleRecording();

            if(!didStartRecording) {
                realityEditor.gui.menus.buttonOff("videoRecording", ["record"]);
            } else {
                realityEditor.gui.menus.buttonOff("videoRecording", ["record"]);
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
                realityEditor.gui.settings.showSettings();
            }

        }
    }

    realityEditor.gui.buttons.registerCallbackForButton('setting', settingButtonCallback.bind(this));
    realityEditor.gui.buttons.registerCallbackForButton('logicSetting', settingButtonCallback.bind(this));


    // Retail Button Callbacks

    realityEditor.gui.buttons.registerCallbackForButton('realityGui', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
            this.on("realityInfo", ["realityGui"]);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('realityInfo', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff("reality", ["realityTag", "realitySearch", "realityWork"]);
            this.on("realityInfo", ["realityInfo", "realityGui"]);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('realityTag', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
            this.on("reality", ["realityTag"]);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('realitySearch', function(buttonName, newButtonState) {
        if (newButtonState === 'up') {
            this.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
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
            this.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
            this.on("reality", ["realityWork"]);
        }
    }.bind(this));

};

realityEditor.gui.menus.on = function(menuDiv, buttonArray) {
    cout(menuDiv);
    if(realityEditor.gui.menus.history.length>=realityEditor.gui.menus.historySteps) {
        realityEditor.gui.menus.history.shift();
    }
    realityEditor.gui.menus.history.push(menuDiv);

    // show correct combination of sub-menus
    if ((menuDiv === "main" || menuDiv === "gui" ||menuDiv === "logic") && !globalStates.settingsButtonState) {
        if (globalStates.editingMode && globalStates.videoRecordingEnabled) {
            menuDiv = "videoRecordingEditing"
        } else if (globalStates.editingMode && globalStates.lockingMode) {
            menuDiv = "lockingEditing";
        } else if (globalStates.editingMode) {
            menuDiv = "editing";
        } else if (globalStates.videoRecordingEnabled) {
            menuDiv = "videoRecording"
        } else if (globalStates.lockingMode) {
            menuDiv = "locking";
        }
    }

    // activate menu Items
    for(var key in this.buttons){
        if(key in this.menus[menuDiv]){
            this.buttons[key].item.style.visibility = "visible";
            this.buttons[key].overlay.style.visibility = "visible";
        } else {
            this.buttons[key].item.style.visibility = "hidden";
            this.buttons[key].overlay.style.visibility = "hidden";
        }
    }

    for(var i = 0; i< buttonArray.length;i++){
        var keyI = buttonArray[i];
        if(keyI in this.buttons){
            if(keyI in this.menus[menuDiv]) {
                // console.log(menuDiv);
                this.buttons[keyI].bg.setAttribute("class", this.menus[menuDiv][keyI]+" active");
            }
        }
    }
};

realityEditor.gui.menus.off = function(menuDiv, buttonArray) {

    if(realityEditor.gui.menus.history.length>=realityEditor.gui.menus.historySteps) {
        realityEditor.gui.menus.history.shift();
    }
    realityEditor.gui.menus.history.push(menuDiv);

    // show correct combination of sub-menus
    if (menuDiv === "main" || menuDiv === "gui" ||menuDiv === "logic") {
        if (globalStates.editingMode && globalStates.lockingMode) {
            menuDiv = "lockingEditing";
        } else if (globalStates.editingMode) {
            menuDiv = "editing";
        } else if (globalStates.lockingMode) {
            menuDiv = "locking";
        }
    }

    // activate menu Items
    for(var key in this.buttons){
        if(key in this.menus[menuDiv]){
            this.buttons[key].item.style.visibility = "visible";
        } else {
            this.buttons[key].item.style.visibility = "hidden";
        }
    }

    for(var i = 0; i< buttonArray.length;i++){
        var keyI = buttonArray[i];
        if(keyI in this.buttons){
            if(keyI in this.menus[menuDiv]) {
                this.buttons[keyI].bg.setAttribute("class", this.menus[menuDiv][keyI]+ " inactive");
            }
        }
    }

};


realityEditor.gui.menus.buttonOn = function(menuDiv,buttonArray) {
    if(!menuDiv) menuDiv = "main";

    for(var i = 0; i< buttonArray.length;i++){
        var keyI = buttonArray[i];
        if(keyI in this.buttons){

            this.buttons[keyI].bg.setAttribute("class", this.menus[menuDiv][keyI]+" active");

        }
    }
};


realityEditor.gui.menus.buttonOff = function(menuDiv,buttonArray) {
    if(!menuDiv) menuDiv = "main";

    for(var i = 0; i< buttonArray.length;i++){
        var keyI = buttonArray[i];
        if(keyI in this.buttons){

            this.buttons[keyI].bg.setAttribute("class", this.menus[menuDiv][keyI]+" inactive");

        }
    }
};



realityEditor.gui.menus.back = function() {

    if(this.history[this.history.length-1])
    {
        var menuDiv = this.history[this.history.length-1];


        for(var key in this.buttons){
            if(key in this.menus[menuDiv]){
                this.buttons[key].item.style.display = "inline";
            } else {
                this.buttons[key].item.style.display = "none";
            }
        }
    }
    this.history.pop();
};

realityEditor.gui.menus.backButton = function (event, callback){
    if(event.button === "back"){

        realityEditor.gui.menus.buttonOff("crafting", ["back"]);

        if(realityEditor.gui.menus.history.length>0) {
            console.log("history:" + realityEditor.gui.menus.history);
            realityEditor.gui.menus.history.pop();
            var lastMenu = realityEditor.gui.menus.history[realityEditor.gui.menus.history.length - 1];
            realityEditor.gui.menus.on(lastMenu, []);
            // if you want action based on the menu item, place it here
            callback(event,lastMenu);
        }
    }
}

realityEditor.gui.menus.buttonActionEnter = function (event){
    // make button react to touch
    var button = realityEditor.gui.menus.buttons;
    button[event.button].bg.setAttribute("class",   button[event.button].bg.classList[0]+" touched");
};

realityEditor.gui.menus.buttonActionLeave = function (event){
    // make button react to touch
    var button = realityEditor.gui.menus.buttons;
    if(button[event.button].bg.classList[1] !=="active") {
        button[event.button].bg.setAttribute("class", button[event.button].bg.classList[0] + " " + "inactive");
    } else {
        button[event.button].bg.setAttribute("class", button[event.button].bg.classList[0] + " " + "active");
    }
};

realityEditor.gui.menus.sendInterfaces = function (interface) {

/// send active user interface status in to the AR-UI

    console.log('sendInterfaces', interface);

    globalStates.interface = interface;

    var msg = {interface: globalStates.interface};

    if(interface === "realitySearch"){
        msg.search = realityEditor.gui.search.getSearch();
    }

    realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
        // var object = realityEditor.getObject(objectKey);
        var frame = realityEditor.getFrame(objectKey, frameKey);
        if (frame.visible) {

            globalDOMCache["iframe" + frameKey].contentWindow.postMessage(JSON.stringify(msg), "*");

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


    /// User interfaces for the back button
    realityEditor.gui.menus.backButton(event, function(event, lastMenu) {
        var button = event.button;
        //  place action in here for when back button is pressed

        // if you want action based on the menu item, place it here
        if (lastMenu === "main") {
            realityEditor.gui.buttons.logicButtonUp({button: "logic", ignoreIsDown: true});

        } else if (lastMenu === "crafting") {

            var existingMenu = document.getElementById('menuContainer');
            if (existingMenu && existingMenu.style.display !== 'none') {
                realityEditor.gui.buttons.pocketButtonUp({button: "logicPocket", ignoreIsDown: true});
            } else {
                var blockSettingsContainer = document.getElementById('blockSettingsContainer');
                if (blockSettingsContainer) {
                    realityEditor.gui.buttons.settingButtonUp({button: "setting", ignoreIsDown: true});
                } else {
                    realityEditor.gui.buttons.logicButtonUp({button: "logic", ignoreIsDown: true}); // default option is to go back to main
                }
            }
        } else {
            realityEditor.gui.buttons.logicButtonUp({button: "logic", ignoreIsDown: true}); // default option is to go back to main
        }
    });

    globalStates.buttonDown = null;
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
