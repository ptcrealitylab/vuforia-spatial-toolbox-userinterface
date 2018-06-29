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

    if (!globalStates.guiButtonDown) return;
    globalStates.guiButtonDown = false;

    realityEditor.gui.menus.buttonOff("main",["logic","logicPocket","logicSetting","setting","pocket"]);
    realityEditor.gui.menus.buttonOn("main",["gui"]);
    
    realityEditor.gui.pocket.pocketHide();
    
    globalStates.guiState = "ui";
    
    if (globalStates.guiState !== "logic") {
        realityEditor.gui.crafting.craftingBoardHide();
    }
    
    realityEditor.device.resetEditingState();
};

realityEditor.gui.buttons.logicButtonUp = function(event){
    if(event.button !== "logic") return;

    // if (!globalStates.logicButtonDown) return; // TODO: this would be nice but messes up programatically closing the crafting board 
    globalStates.logicButtonDown = false;

    realityEditor.gui.menus.buttonOff("main",["gui","logicPocket","logicSetting","setting","pocket"]);
    realityEditor.gui.menus.buttonOn("main",["logic"]);

    realityEditor.gui.pocket.pocketHide();

    globalStates.guiState = "node";

    realityEditor.gui.crafting.craftingBoardHide();

    realityEditor.device.resetEditingState();
};

realityEditor.gui.buttons.resetButtonDown = function(event) {
    if (event.button !== "reset") return;
    globalStates.resetButtonDown = true;
};

realityEditor.gui.buttons.resetButtonUp = function(event) {
    if (event.button !== "reset") return;

    realityEditor.gui.menus.off("editing",["reset"]);

    if (!globalStates.resetButtonDown) return;
    globalStates.resetButtonDown = false;

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
                if (activeFrame.visualization === 'screen') continue; // only reset position of AR frames
                if (activeFrame.staticCopy) continue; // don't reset positions of staticCopy frames

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
                // cannot move nodes inside static copy frames
                if (activeFrame && activeFrame.staticCopy) continue;

                var shouldPlaceCenter = (Object.keys(activeFrame.nodes).length === 1);
                for (var nodeKey in activeFrame.nodes) {
                    var activeNode = activeFrame.nodes[nodeKey];

                    realityEditor.gui.ar.positioning.setPositionDataMatrix(activeNode, []);
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
        
        if(!globalStates.realityState) {
            realityEditor.gui.menus.buttonOff("setting", ["setting"]);
        } else {
            realityEditor.gui.menus.buttonOff("reality", ["setting"]);
        }

        if (!globalStates.editingMode) {
            realityEditor.device.setEditingMode(true);
            realityEditor.gui.menus.on("editing", []);
            realityEditor.app.appFunctionCall("developerOn", null, null);
            
        } else {
            realityEditor.device.setEditingMode(false);
            realityEditor.gui.menus.on("main",[]);
            realityEditor.app.appFunctionCall("developerOff", null, null);
        }
        
    }, 200);

    globalStates.settingsButtonDown = true;

};

realityEditor.gui.buttons.settingButtonUp = function(event) {
    if (event.button !== "setting" && event.button !== "logicSetting") return;

    // if (!globalStates.settingsButtonDown) return;
    globalStates.settingsButtonDown = false;

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

    realityEditor.device.resetEditingState();
};

realityEditor.gui.buttons.freezeButtonUp = function(event) {
    if (event.button !== "freeze") return;

    realityEditor.gui.pocket.pocketHide();

    if (globalStates.freezeButtonState === true) {

        realityEditor.gui.menus.buttonOff("default", ["freeze"]);

        globalStates.freezeButtonState = false;
        var memoryBackground = document.querySelector('.memoryBackground');
        memoryBackground.innerHTML = '';
        realityEditor.app.setResume();

    }
    else {
        realityEditor.gui.menus.buttonOn("default", ["freeze"]);
        globalStates.freezeButtonState = true;
        realityEditor.app.setPause();
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

realityEditor.gui.buttons.guiButtonDown = function(event) {
    if (event.button !== "gui") return;

    globalStates.guiButtonDown = true;
};

realityEditor.gui.buttons.logicButtonDown = function(event) {
    if (event.button !== "logic") return;

    globalStates.logicButtonDown = true;
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

    // this is where the virtual point creates object

    if (globalStates.pocketButtonDown === true && globalStates.guiState === "node") {

        // realityEditor.gui.pocket.createLogicNodeFromPocket();
        // realityEditor.gui.pocket.setPocketPosition(event);

        // we're using the same method as when we add a node from a memory, instead of using old pocket method. // TODO: make less hack of a solution
        var addedElement = realityEditor.gui.pocket.createLogicNode();

        // set the name of the node by counting how many logic nodes the frame already has
        var closestFrame = realityEditor.getFrame(addedElement.objectKey, addedElement.frameKey);
        var logicCount = Object.values(closestFrame.nodes).filter(function (node) {
            return node.type === 'logic'
        }).length;
        addedElement.logicNode.name = "LOGIC" + logicCount;

        // upload new name to server when you change it
        var object = realityEditor.getObject(addedElement.objectKey);
        realityEditor.network.postNewNodeName(object.ip, addedElement.objectKey, addedElement.frameKey, addedElement.logicNode.uuid, addedElement.logicNode.name);

        var logicNodeSize = 220; // TODO: dont hard-code this - it is set within the iframe

        realityEditor.device.editingState.touchOffset = {
            x: logicNodeSize/2,
            y: logicNodeSize/2
        };

        realityEditor.device.beginTouchEditing(addedElement.objectKey, addedElement.frameKey, addedElement.logicNode.uuid);

        realityEditor.gui.menus.on("bigTrash",[]);
        // realityEditor.gui.menus.on("trashOrSave", []); // TODO: make this bigTrash again and adjust trash area check to be full size if just added from memory
        // }

    }
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
