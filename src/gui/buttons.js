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
var blockTabImage = [];

/**
 * @desc
 * @param array
 **/

realityEditor.gui.buttons.preload = function(array) {
	for (var i = 0; i < this.preload.arguments.length - 1; i++) {
		array[i] = new Image();
		array[i].src = this.preload.arguments[i + 1];
	}

	this.cout("preload");
};


/**
 * @desc
 **/

realityEditor.gui.buttons.guiButtonUp = function(event){
    if(event.button !== "gui") return;

    realityEditor.gui.menus.buttonOff("main",["logic","logicPocket","logicSetting","setting","pocket"]);
    realityEditor.gui.menus.buttonOn("main",["gui"]);
    
    realityEditor.gui.pocket.pocketHide();
    
    globalStates.guiState = "ui";
    
    if (globalStates.guiState !== "logic") {
        if (DEBUG_DATACRAFTING) {
            realityEditor.gui.crafting.craftingBoardVisible(); // TODO: BEN DEBUG - revert to previous line
        } else {
            realityEditor.gui.crafting.craftingBoardHide();
        }
    }

    if (globalStates.editingMode) {
        realityEditor.device.addEventHandlers();
    }

};

realityEditor.gui.buttons.logicButtonUp = function(event){
    if(event.button !== "logic") return;

    realityEditor.gui.menus.buttonOff("main",["gui","logicPocket","logicSetting","setting","pocket"]);
    realityEditor.gui.menus.buttonOn("main",["logic"]);

    realityEditor.gui.pocket.pocketHide();

    globalStates.guiState = "node";

    // alternative to realityEditor.gui.ar.draw.resetNodeRepositionCanvases() without the side effects of node getting stuck on screen
    realityEditor.forEachNodeInAllObjects(function(objectKey, frameKey, nodeKey) {
        var node = realityEditor.getNode(objectKey, frameKey, nodeKey);
        node.hasCTXContent = false;
        // node.visible = false;
        // node.visibleEditing = false;
    });

    realityEditor.gui.crafting.craftingBoardHide();

    if (globalStates.editingMode) {
        realityEditor.device.addEventHandlers();
    }
};

realityEditor.gui.buttons.resetButtonDown = function(event) {
    if (event.button !== "reset") return;
    globalStates.isResetButtonDown = true;
};

realityEditor.gui.buttons.resetButtonUp = function(event) {
        if (event.button !== "reset") return;

        realityEditor.gui.menus.off("editing",["reset"]);

        if (!globalStates.isResetButtonDown) return;

        for (var objectKey in objects) {
            if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) {
                continue;
            }

            var tempResetObject = objects[objectKey];
            var shouldPlaceCenter = false;
            
            if (globalStates.guiState ==="ui") {

                shouldPlaceCenter = (Object.keys(tempResetObject.frames).length === 1);
                for (var frameKey in tempResetObject.frames) {
                    var activeFrame = tempResetObject.frames[frameKey];
                    var positionData = realityEditor.gui.ar.positioning.getPositionData(activeFrame);
                    positionData.matrix = [];
                    if (shouldPlaceCenter) {
                        positionData.x = 0;
                        positionData.y = 0;
                    } else {
                        positionData.x = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
                        positionData.y = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
                    }
                    positionData.scale = globalStates.defaultScale;
                    realityEditor.network.sendResetContent(objectKey, frameKey, null, "ui");
                }
                
            }

            if (globalStates.guiState === "node") {
                for (var frameKey in tempResetObject.frames) {
                    
                    var activeFrame = tempResetObject.frames[frameKey];
                    
                    var shouldPlaceCenter = (Object.keys(activeFrame.nodes).length === 1);
                    for (var nodeKey in activeFrame.nodes) {
                        var activeNode = activeFrame.nodes[nodeKey];
                        console.log('write to matrix -- should be relativeMatrix');
                        // activeNode.relativeMatrix = [];
                        realityEditor.gui.ar.positioning.setWritableMatrix(activeNode, []);
                        activeNode.scale = globalStates.defaultScale;
                        if (shouldPlaceCenter) {
                            activeNode.x = 0;
                            activeNode.y = 0;
                        } else {
                            activeNode.x = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
                            activeNode.y = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
                        }
                        realityEditor.network.sendResetContent(objectKey, frameKey, nodeKey, activeNode.type);
                    }
                }
                
            }

        }
    };



realityEditor.gui.buttons.unconstrainedButtonUp = function(event) {
        if (event.button !== "unconstrained") return;

        if (globalStates.unconstrainedPositioning === true) {

            realityEditor.gui.menus.off("editing", ["unconstrained"]);
            globalStates.unconstrainedPositioning = false;
        }
        else {
            realityEditor.gui.menus.on("editing", ["unconstrained"]);
            globalStates.unconstrainedPositioning = true;
        }
    };

realityEditor.gui.buttons.settingTimer = null;
realityEditor.gui.buttons.wasTimed = false;

realityEditor.gui.buttons.settingButtonDown = function(event) {
    if (event.button !== "setting") return;
    
    realityEditor.gui.buttons.settingTimer = setTimeout(function(){
        realityEditor.gui.buttons.wasTimed = true;

        if (!globalStates.editingMode) {

            realityEditor.device.addEventHandlers();
            // globalStates.editingMode = true;
            realityEditor.device.setEditingMode(true);
            realityEditor.app.appFunctionCall("developerOn", null, null);
            realityEditor.gui.ar.draw.matrix.matrixtouchOn = "";
        } else {
            realityEditor.device.removeEventHandlers();
            // globalStates.editingMode = false;
            realityEditor.device.setEditingMode(false);
            realityEditor.app.appFunctionCall("developerOff", null, null);
        }
        

            if(!globalStates.realityState) {
                realityEditor.gui.menus.buttonOff("setting", ["setting"]);
            } else {
                realityEditor.gui.menus.buttonOff("reality", ["setting"]);
            }
            
            if (globalStates.editingMode) {
                realityEditor.gui.menus.on("editing", []);
            } else {
                realityEditor.gui.menus.on("main",[]);
            }
        
        
    },200);
    
};

realityEditor.gui.buttons.settingButtonUp = function(event) {
        if (event.button !== "setting" && event.button !== "logicSetting") return;

       // realityEditor.gui.menus.on("main", ["setting"]);
        if(realityEditor.gui.buttons.settingTimer) {
            clearTimeout(realityEditor.gui.buttons.settingTimer);
        }
        if(realityEditor.gui.buttons.wasTimed) {
            realityEditor.gui.buttons.wasTimed = false;
            return;
        }


        realityEditor.gui.pocket.pocketHide();

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
    };

realityEditor.gui.buttons.freezeButtonUp = function(event) {
    if (event.button !== "freeze") return;

    realityEditor.gui.pocket.pocketHide();

    if (globalStates.freezeButtonState === true) {

        realityEditor.gui.menus.buttonOff("default", ["freeze"]);

        globalStates.freezeButtonState = false;
        var memoryBackground = document.querySelector('.memoryBackground');
        memoryBackground.innerHTML = '';
        realityEditor.app.appFunctionCall("unfreeze", null, null);

    }
    else {
        realityEditor.gui.menus.buttonOn("default", ["freeze"]);
        globalStates.freezeButtonState = true;
        realityEditor.app.appFunctionCall("freeze", null, null);
    }
};

realityEditor.gui.buttons.lockButtonUp = function(event) {
    if (event.button !== "lock") return;
    
    console.log("activate lock button");
    
    var LOCK_TYPE_FULL = "full";
    realityEditor.device.security.lockVisibleNodesAndLinks(LOCK_TYPE_FULL);
};

realityEditor.gui.buttons.halflockButtonUp = function(event) {
    if (event.button !== "halflock") return;

    console.log("activate halflock button");

    var LOCK_TYPE_HALF = "half";
    realityEditor.device.security.lockVisibleNodesAndLinks(LOCK_TYPE_HALF);
};

realityEditor.gui.buttons.unlockButtonUp = function(event) {
    if (event.button !== "unlock") return;

    console.log("activate unlock button");
    
    realityEditor.device.security.unlockVisibleNodesAndLinks();
};

realityEditor.gui.buttons.draw = function() {

    this.preload(blockTabImage,
        'png/iconBlocks.png', 'png/iconEvents.png', 'png/iconSignals.png', 'png/iconMath.png', 'png/iconWeb.png'
    );

	/**
	 * @desc
	 * @param object
	 * @param node
	 **/


};


realityEditor.gui.buttons.pocketButtonDown = function(event) {
        if (event.button !== "pocket" && event.button !== "logicPocket") return;

        if (globalStates.guiState !== "node" && globalStates.guiState !== "logic") {
            return;
        }

        globalStates.pocketButtonDown = true;

};


realityEditor.gui.buttons.pocketButtonUp = function(event) {
    if (event.button !== "pocket" && event.button !== "logicPocket") return;

    realityEditor.gui.pocket.onPocketButtonUp();

    if (globalStates.guiState !== "node" && globalStates.guiState !== "logic") {
        return;
    }

    if(globalStates.pocketButtonDown){
        this.gui.pocket.pocketButtonAction();
    }
    globalStates.pocketButtonDown = false;
    globalStates.pocketButtonUp = true;

};

realityEditor.gui.buttons.pocketButtonEnter = function(event) {
    if (event.button !== "pocket") return;

    realityEditor.gui.pocket.onPocketButtonEnter();

    if (globalStates.guiState !== "node" && globalStates.guiState !== "logic") {
        return;
    }
    
    if (pocketItem["pocket"].frames["pocket"].nodes[pocketItemId]) {
        // pocketItem["pocket"].objectVisible = false;
        realityEditor.gui.ar.draw.setObjectVisible(pocketItem["pocket"], false);

        this.gui.ar.draw.hideTransformed("pocket", pocketItemId, pocketItem["pocket"].frames["pocket"].nodes[pocketItemId], "logic"); // TODO: change arguments
        delete pocketItem["pocket"].frames["pocket"].nodes[pocketItemId];
    }
};

realityEditor.gui.buttons.pocketButtonLeave = function(event) {
    if (event.button !== "pocket") return;

    if (globalStates.guiState !== "node" && globalStates.guiState !== "logic") {
        return;
    }

    // var currentMenu = globalStates.guiState === "logic" ? "logic" : "main";
    // if (globalStates.pocketButtonState === true) {
    //     realityEditor.gui.menus.off(currentMenu, ["pocket"]);
    //     // 0 is off, 2 is on
    //  // todo   if (!globalStates.UIOffMode)    document.getElementById('pocketButton').src = pocketButtonImage[0+indexChange].src;
    // }
    // else {
    //     realityEditor.gui.menus.on(currentMenu ,["pocket"]);
    //   // todo  if (!globalStates.UIOffMode)    document.getElementById('pocketButton').src = pocketButtonImage[2+indexChange].src;
    // }

    // this is where the virtual point creates object

    // todo for testing only
    if (globalStates.pocketButtonDown === true && globalStates.guiState ==="node") {

        pocketItemId = realityEditor.device.utilities.uuidTime();
        console.log(pocketItemId);
        pocketItem["pocket"].frames["pocket"].nodes[pocketItemId] = new Logic();

        var thisItem = pocketItem["pocket"].frames["pocket"].nodes[pocketItemId];

        thisItem.uuid = pocketItemId;

        thisItem.x = globalStates.pointerPosition[0] - (globalStates.height / 2);
        thisItem.y = globalStates.pointerPosition[1] - (globalStates.width / 2);
        
        var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];
        var closestObject = realityEditor.getObject(closestObjectKey);
        
        thisItem.scale = closestObject.averageScale;
        thisItem.screenZ = 1000;

        // else {
        // var matrixTouch =  screenCoordinatesToMatrixXY(thisItem, [evt.clientX,evt.clientY]);
        // thisItem.x = matrixTouch[0];
        // thisItem.y = matrixTouch[1];
        //}
        thisItem.loaded = false;

        var thisObject = pocketItem["pocket"];
        // this is a work around to set the state of an objects to not being visible.
        thisObject.objectId = "pocket";
        thisObject.name = "pocket";
        
        var thisFrame = thisObject.frames["pocket"];
        thisFrame.objectId = "pocket";
        thisFrame.name = "pocket";
        
        // thisObject.objectVisible = false;
        realityEditor.gui.ar.draw.setObjectVisible(thisObject, false); // TODO: should this function encapsulate the following 7 lines too?
        thisObject.screenZ = 1000;
        thisObject.fullScreen = false;
        thisObject.sendMatrix = false;
        thisObject.loaded = false;
        thisObject.integerVersion = 170;
        console.log('write to matrix -- should be relativeMatrix');
        
        thisObject.type = 'logic';
        thisObject.matrix = [];
        thisObject.relativeMatrix = [];
        thisObject.nodes = {};
        // realityEditor.gui.ar.positioning.setWritableMatrix(thisObject, []);
        // if (thisObject.type === "node") {
        //     thisObject.relativeMatrix = [];
        // }
        // thisObject.matrix = [];
        // thisObject.nodes = {};
        thisObject.protocol = "R1";

        //
        //thisObject.visibleCounter = timeForContentLoaded;

        //addElement("pocket", pocketItemId, "nodes/" + thisItem.type + "/index.html",  pocketItem["pocket"], "logic",globalStates);

    }
    realityEditor.gui.pocket.setPocketPosition(event);
};

realityEditor.gui.buttons.bigPocketButtonEnter = function(event) {
    if (event.button !== "bigPocket") {
        return;
    }

    realityEditor.gui.pocket.onBigPocketButtonEnter();
};

realityEditor.gui.buttons.halfPocketButtonEnter = function(event) {
    if (event.button !== "halfPocket") {
        return;
    }
    
    realityEditor.gui.pocket.onHalfPocketButtonEnter();
};

/**
 *
 *   REALITY
 *
 */

realityEditor.gui.buttons.realityGuiButtonUp = function (event) {
    if (event.button !== "realityGui") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("realityInfo", ["realityGui"]);

    // Add your functionality here.
};

realityEditor.gui.buttons.realityInfoButtonUp = function (event) {
    if (event.button !== "realityInfo") return;


    realityEditor.gui.menus.buttonOff("reality", ["realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("realityInfo", ["realityInfo", "realityGui"]);

    // Add your functionality here.
};

realityEditor.gui.buttons.realityTagButtonUp = function (event) {
    if (event.button !== "realityTag") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("reality", ["realityTag"]);

    // Add your functionality here.
};

realityEditor.gui.buttons.realitySearchButtonUp = function (event) {
    if (event.button !== "realitySearch") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("reality", ["realitySearch"]);

    if(realityEditor.gui.search.getVisibility()){
        realityEditor.gui.search.remove();
    } else
{
    realityEditor.gui.search.add();
}

    // Add your functionality here.
};

realityEditor.gui.buttons.realityWorkButtonUp = function (event) {
    if (event.button !== "realityWork") return;

    realityEditor.gui.menus.buttonOff("reality", ["realityGui", "realityInfo", "realityTag", "realitySearch", "realityWork"]);
    realityEditor.gui.menus.on("reality", ["realityWork"]);

    // Add your functionality here.
};
