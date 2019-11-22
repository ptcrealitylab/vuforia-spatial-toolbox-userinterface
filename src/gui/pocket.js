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

createNameSpace("realityEditor.gui.pocket");

/**
 * @type {CallbackHandler}
 */
realityEditor.gui.pocket.callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('gui/pocket');

/**
 * Adds a callback function that will be invoked when the specified function is called
 * @param {string} functionName
 * @param {function} callback
 */
realityEditor.gui.pocket.registerCallback = function(functionName, callback) {
    if (!this.callbackHandler) {
        this.callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('gui/pocket');
    }
    this.callbackHandler.registerCallback(functionName, callback);
};

realityEditor.gui.pocket.pocketButtonAction = function() {

    console.log("state: " + globalStates.pocketButtonState);

    if (globalStates.pocketButtonState === true) {
        console.log("buttonon");
        globalStates.pocketButtonState = false;

        if (globalStates.guiState === 'logic') {
            realityEditor.gui.crafting.blockMenuVisible();
        }
    }
    else {
        console.log("buttonoff");
        globalStates.pocketButtonState = true;

        if (globalStates.guiState === 'logic') {
            realityEditor.gui.crafting.blockMenuHide();
            realityEditor.gui.menus.switchToMenu("crafting", null, ["logicPocket"]);
        }
    }

};

realityEditor.gui.pocket.setPocketPosition = function(evt){
    
    if(pocketItem["pocket"].frames["pocket"].nodes[pocketItemId]){

        var thisItem = pocketItem["pocket"].frames["pocket"].nodes[pocketItemId];
        
        var pocketDomElement = globalDOMCache['object' + thisItem.uuid];
        if (!pocketDomElement) return; // wait until DOM element for this pocket item exists before attempting to move it

        var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];

        if (!closestObjectKey) {
            
            thisItem.x = evt.clientX - (globalStates.height / 2);
            thisItem.y = evt.clientY - (globalStates.width / 2);
            
        } else {
            
            if(thisItem.screenZ !== 2 && thisItem.screenZ) {
                
                var centerOffsetX = thisItem.frameSizeX / 2;
                var centerOffsetY = thisItem.frameSizeY / 2;
                
                realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(thisItem, evt.clientX - centerOffsetX, evt.clientY - centerOffsetY, false);

            }
        }
        
    }
};

realityEditor.gui.pocket.setPocketFrame = function(frame, positionOnLoad, closestObjectKey) {
    pocketFrame.vehicle = frame;
    pocketFrame.positionOnLoad = positionOnLoad;
    pocketFrame.closestObjectKey = closestObjectKey;
    pocketFrame.waitingToRender = true;
};

realityEditor.gui.pocket.setPocketNode = function(node, positionOnLoad, closestObjectKey, closestFrameKey) {
    pocketNode.vehicle = node;
    pocketNode.positionOnLoad = positionOnLoad;
    pocketNode.closestObjectKey = closestObjectKey;
    pocketNode.closestFrameKey = closestFrameKey;
    pocketNode.waitingToRender = true;
};

/**
 * create a new instance of the saved logic node template, add it to the DOM and upload to the server
 * @param {Logic|undefined} logicNodeMemory
 * @return {*}
 */
realityEditor.gui.pocket.createLogicNode = function(logicNodeMemory) {
    console.log("drop logic onto object (based on memory? " + logicNodeMemory + ")");

    var addedLogic = new Logic();

    // if this is being created from a logic node memory, copy over most properties from the saved pocket logic node
    if (logicNodeMemory) {
        var keysToCopyOver = ['blocks', 'iconImage', 'lastSetting', 'lastSettingBlock', 'links', 'lockPassword', 'lockType', 'name', 'nameInput', 'nameOutput'];
        keysToCopyOver.forEach( function(key) {
            addedLogic[key] = logicNodeMemory[key];
        });
        
        if (typeof logicNodeMemory.nodeMemoryCustomIconSrc !== 'undefined') {
            addedLogic.nodeMemoryCustomIconSrc = logicNodeMemory.nodeMemoryCustomIconSrc;
        }
        
    }
    

    // give new logic node a new unique identifier so each copy is stored separately
    var logicKey = realityEditor.device.utilities.uuidTime();
    addedLogic.uuid = logicKey;

    var closestFrameKey = null;
    var closestObjectKey = null;
    
    // try to find the closest local AR frame to attach the logic node to
    var objectKeys = realityEditor.gui.ar.getClosestFrame(function(frame) {
        return frame.visualization !== 'screen' && frame.location === 'local';
    });
    
    // if no local frames found, expand the search to include all frames
    if (!objectKeys[1]) {
        objectKeys = realityEditor.gui.ar.getClosestFrame();
    }

    if (objectKeys[1] !== null) {
        closestFrameKey = objectKeys[1];
        closestObjectKey = objectKeys[0];
        var closestObject = objects[closestObjectKey];
        var closestFrame = closestObject.frames[closestFrameKey];

        addedLogic.objectId = closestObjectKey;
        addedLogic.frameId = closestFrameKey;

        addedLogic.x = 0;
        addedLogic.y = 0;

        addedLogic.scale = closestObject ? closestObject.averageScale : globalStates.defaultScale;
        addedLogic.screenZ = 1000;
        addedLogic.loaded = false;
        addedLogic.matrix = [];

        // make sure that logic nodes only stick to 2.0 server version
        if(realityEditor.network.testVersion(closestObjectKey) > 165) {
            console.log('created node with logic key ' + logicKey + ' and added to ' + closestFrameKey);
            closestFrame.nodes[logicKey] = addedLogic;

            // render it
            var nodeUrl = "nodes/logic/index.html";

            realityEditor.gui.ar.draw.addElement(nodeUrl, closestObjectKey, closestFrameKey, logicKey, 'logic', addedLogic);

            var _thisNode = document.getElementById("iframe" + logicKey);
            if (_thisNode && _thisNode.getAttribute('loaded')) {
                realityEditor.network.onElementLoad(closestObjectKey, logicKey);
            }

            // send it to the server
            realityEditor.network.postNewLogicNode(closestObject.ip, closestObjectKey, closestFrameKey, logicKey, addedLogic);

            realityEditor.gui.pocket.setPocketNode(addedLogic, {pageX: globalStates.pointerPosition[0], pageY: globalStates.pointerPosition[1]}, closestObjectKey, closestFrameKey);

            console.log("successfully added logic from pocket to object (" + closestObject.name + ", " + closestFrame.name + ")");
            return {
                logicNode: addedLogic,
                domElement: globalDOMCache[logicKey],
                objectKey: closestObjectKey,
                frameKey: closestFrameKey
            };
        }
    }

    console.log("couldn't add logic from pocket to any objects");
    return null;
};

/**
 * The Pocket button. Turns into a larger version or a delete button when
 * the user is creating memories or when the user is dragging saved
 * memories/programming blocks, respectively.
 */
(function(exports) {

    var pocket;
    var palette;
    var nodeMemoryBar;
    
    var inMemoryDeletion = false;
    // var pocketDestroyTimer = null;
    
    var isPocketTapped = false;

    function pocketInit() {
        pocket = document.querySelector('.pocket');
        palette = document.querySelector('.palette');
        nodeMemoryBar = document.querySelector('.nodeMemoryBar');
        
        addMenuButtonActions();

        pocket.addEventListener('pointerup', function() {
            isPocketTapped = false;
        });

        // On touching an element-template, upload to currently visible object
        pocket.addEventListener('pointerdown', function(evt) {
            isPocketTapped = true;

            if (!evt.target.classList.contains('element-template')) {
                return;
            }
            
            if (evt.target.dataset.src === '_PLACEHOLDER_') {
                console.log('dont add frame from placeholder!');
                return;
            }
            
            // pointermove gesture must have started with a tap on the pocket
            if (!isPocketTapped) {
                return;
            }

            createFrame(evt.target.dataset.name, evt.target.dataset.startPositionOffset, evt.target.dataset.width, evt.target.dataset.height, evt.target.dataset.nodes, evt.pageX, evt.pageY);
            
            pocketHide();
            
        });

        createPocketUIPalette();
        // pocketHide();
    }

    function createFrame(name, startPositionOffset, width, height, nodesList, x, y) {

        // TODO: only attach to closest object when you release - until then store in pocket and render with identity matrix
        // TODO: this would make it easier to drop exactly on the the object you want
        var closestObjectKey = realityEditor.gui.ar.getClosestObject(function(objectKey) {
            return !!realityEditor.getObject(objectKey); // make sure its an object, not just stale data in visibleObjects array
        })[0];
        var closestObject = realityEditor.getObject(closestObjectKey);

        if (closestObject.isWorldObject) {
            console.log('adding new frame to a world object...');
            // realityEditor.worldObjects.addFrameToWorldObject({test: 1234});
        }

        // make sure that the frames only sticks to 2.0 server version
        if (closestObject && closestObject.integerVersion > 165) {

            var frame = new Frame();

            frame.objectId = closestObjectKey;

            // name the frame "gauge", "gauge2", "gauge3", etc... 
            frame.name = name;
            var existingFrameSrcs = Object.keys(closestObject.frames).map(function(existingFrameKey){
                return closestObject.frames[existingFrameKey].src;
            });
            var numberOfSameFrames = existingFrameSrcs.filter(function(src){
                return src === name;
            }).length;
            if (numberOfSameFrames > 0) {
                frame.name = name + (numberOfSameFrames+1);
            }

            console.log('created frame with name ' + frame.name);
            var frameName = frame.name + realityEditor.device.utilities.uuidTime();
            var frameID = frame.objectId + frameName;
            frame.uuid = frameID;
            frame.name = frameName;

            frame.ar.x = 0;
            frame.ar.y = 0;
            if (startPositionOffset) {
                var startOffset = JSON.parse(startPositionOffset);
                frame.startPositionOffset = startOffset;
                // frame.ar.x = startOffset.x;
                // frame.ar.y = startOffset.y;
                console.log('frame offset = ', startOffset);
            }

            frame.ar.scale = globalStates.defaultScale; //closestObject.averageScale;
            frame.frameSizeX = width;
            frame.frameSizeY = height;

            // console.log("closest Frame", closestObject.averageScale);

            frame.location = 'global';
            frame.src = name;

            // set other properties

            frame.animationScale = 0;
            frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
            frame.width = frame.frameSizeX;
            frame.height = frame.frameSizeY;
            console.log('created pocket frame with width/height' + frame.width + '/' + frame.height);
            frame.loaded = false;
            // frame.objectVisible = true;
            frame.screen = {
                x: frame.ar.x,
                y: frame.ar.y,
                scale: frame.ar.scale
            };
            // frame.screenX = 0;
            // frame.screenY = 0;
            frame.screenZ = 1000;
            frame.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();

            // thisFrame.objectVisible = false; // gets set to false in draw.setObjectVisible function
            frame.fullScreen = false;
            frame.sendMatrix = false;
            frame.sendMatrices = {
                modelView : false,
                devicePose : false,
                groundPlane : false,
                allObjects : false
            };
            frame.sendAcceleration = false;
            frame.integerVersion = 300; //parseInt(objects[objectKey].version.replace(/\./g, ""));
            // thisFrame.visible = false;

            // add each node with a non-empty name
            var nodes = JSON.parse(nodesList);
            var hasMultipleNodes = nodes.length > 1;
            nodes.forEach(function(node) {

                if(typeof node !== "object") return;
                var nodeUuid = frameID + node.name;
                frame.nodes[nodeUuid] = new Node();
                var addedNode = frame.nodes[nodeUuid];
                addedNode.objectId = closestObjectKey;
                addedNode.frameId = frameID;
                addedNode.name = node.name;
                addedNode.text = undefined;
                addedNode.type = node.type;
                if (typeof node.x !== 'undefined') {
                    addedNode.x = node.x; // use specified position if provided
                } else {
                    addedNode.x = hasMultipleNodes ? realityEditor.device.utilities.randomIntInc(0, 200) - 100 : 0; // center if only one, random otherwise
                }
                if (typeof node.y !== 'undefined') {
                    addedNode.y = node.y;
                } else {
                    addedNode.y = hasMultipleNodes ? realityEditor.device.utilities.randomIntInc(0, 200) - 100 : 0;
                }
                addedNode.frameSizeX = 220;
                addedNode.frameSizeY = 220;
                var scaleFactor = 1;
                if (typeof node.scaleFactor !== 'undefined') {
                    scaleFactor = node.scaleFactor;
                }
                addedNode.scale = globalStates.defaultScale * scaleFactor;

            });

            // // set the eventObject so that the frame can interact with screens as soon as you add it
            realityEditor.device.eventObject.object = closestObjectKey;
            realityEditor.device.eventObject.frame = frameID;
            realityEditor.device.eventObject.node = null;

            closestObject.frames[frameID] = frame;

            console.log(frame);
            // send it to the server
            // realityEditor.network.postNewLogicNode(closestObject.ip, closestObjectKey, closestFrameKey, logicKey, addedLogic);
            realityEditor.network.postNewFrame(closestObject.ip, closestObjectKey, frame);

            realityEditor.gui.pocket.setPocketFrame(frame, {pageX: x, pageY: y}, closestObjectKey);

            realityEditor.gui.pocket.callbackHandler.triggerCallbacks('frameAdded', {objectKey: closestObjectKey, frameKey: frameID, frameType: frame.src});

            return frame;
            
        } else {
            console.warn('there aren\'t any visible objects to place this frame on!');
        }

    }

    function addMenuButtonActions() {
        
        var ButtonNames = realityEditor.gui.buttons.ButtonNames;

        // add callbacks for menu buttons -> hide pocket
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.GUI, hidePocketOnButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.LOGIC, hidePocketOnButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.SETTING, hidePocketOnButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.LOGIC_SETTING, hidePocketOnButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.FREEZE, hidePocketOnButtonPressed);

        // add callbacks for pocket button actions
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.POCKET, pocketButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.LOGIC_POCKET, pocketButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.BIG_POCKET, bigPocketButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.HALF_POCKET, halfPocketButtonPressed);

        function hidePocketOnButtonPressed(params) {
            if (params.newButtonState === 'up') {
                // hide the pocket
                pocketHide();
            }
        }

        function pocketButtonPressed(params) {
            if (params.newButtonState === 'up') {
                
                // show UI pocket by switching out of node view when the pocket button is tapped
                var HACK_AUTO_SWITCH_TO_GUI = true;
                if (HACK_AUTO_SWITCH_TO_GUI) {
                    if (globalStates.guiState === 'node') {
                        realityEditor.gui.buttons.guiButtonUp({button: "gui", ignoreIsDown: true});
                    }
                }

                onPocketButtonUp();

                if (globalStates.guiState !== "node" && globalStates.guiState !== "logic") {
                    return;
                }

                realityEditor.gui.pocket.pocketButtonAction();

            } else if (params.newButtonState === 'enter') {

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

            } else if (params.newButtonState === 'leave') {

                // this is where the virtual point creates object

                if (realityEditor.gui.buttons.getButtonState(params.buttonName) === 'down') {
                    
                    // create a logic node when dragging out from the button in node mode
                    if (globalStates.guiState === "node") {
                        
                        // we're using the same method as when we add a node from a memory, instead of using old pocket method. // TODO: make less hack of a solution
                        let addedElement = realityEditor.gui.pocket.createLogicNode();

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

                        realityEditor.gui.menus.switchToMenu("bigTrash", null, null);
                    
                    } else if (globalStates.guiState === 'ui') {
                        
                        // create an envelope frame when dragging out from the button in UI mode
                        console.log('create envelope by dragging out');
                        
                        var envelopeData = realityElements.find(function(elt) { return elt.name === 'all-frame-envelope'; });
                        var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                        
                        if (envelopeData) {
                            let addedElement = createFrame(envelopeData.name, JSON.stringify(envelopeData.startPositionOffset), JSON.stringify(envelopeData.width), JSON.stringify(envelopeData.height), JSON.stringify(envelopeData.nodes), touchPosition.x, touchPosition.y);
                            
                            if (addedElement) {
                                realityEditor.device.editingState.touchOffset = {
                                    x: 0,
                                    y: 0
                                };
                                
                                try {
                                    realityEditor.device.beginTouchEditing(addedElement.objectId, addedElement.uuid, null);
                                } catch (e) {
                                    console.warn('error with beginTouchEditing', e);
                                }
                                
                                realityEditor.gui.menus.switchToMenu("bigTrash", null, null);
                            }
                        }
                        
                    }

                }

            }
        }

        function bigPocketButtonPressed(params) {
            if (params.newButtonState === 'enter') {
                onBigPocketButtonEnter();
            }
        }

        function halfPocketButtonPressed(params) {
            if (params.newButtonState === 'enter') {
                onHalfPocketButtonEnter();
            }
        }

    }

    function isPocketWanted() {
        if (pocketShown()) {
            return true;
        }
        if (globalStates.settingsButtonState) {
            return false;
        }
        if (globalStates.editingNode) {
            return false;
        }
        if (inMemoryDeletion) {
            return false;
        }
        return globalStates.guiState === "ui" || globalStates.guiState === "node";
    }

    function onPocketButtonEnter() {
        if (!isPocketWanted()) {
            return;
        }

        if (pocketButtonIsBig()) {
            return;
        }

        if (!globalProgram.objectA) {
            return;
        }

        toggleShown();
    }

    function onPocketButtonUp() {
        if (!isPocketWanted()) {
            return;
        }

        if (pocketButtonIsBig()) {
            return;
        }

        toggleShown();
    }

    function onBigPocketButtonEnter() {
        if (!isPocketWanted()) {
            return;
        }

        if (!pocketButtonIsBig()) {
            return;
        }

        if (realityEditor.gui.memory.memoryCanCreate()) {
            // realityEditor.gui.memory.createMemory();
            if (globalStates.guiState === "node") {
                globalStates.drawDotLine = false;
            }
        }

        toggleShown();
    }
    
    function onHalfPocketButtonEnter() {
        // if (!isPocketWanted()) {
        //     return;
        // }
        
        if (!pocketButtonIsHalf()) {
            return;
        }
        
        // TODO: add any side effects here before showing pocket
        var editingVehicle = realityEditor.device.getEditingVehicle();

        if (editingVehicle && editingVehicle.type === 'logic') {
            
            if (editingVehicle) {
                overlayDiv.classList.add('overlayLogicNode');

                var nameText = document.createElement('div');
                nameText.style.position = 'absolute';
                nameText.style.top = '33px';
                nameText.style.width = '100%';
                nameText.style.textAlign = 'center';
                nameText.innerHTML = editingVehicle.name;
                overlayDiv.innerHTML = '';
                overlayDiv.appendChild(nameText);
                
                overlayDiv.storedLogicNode = editingVehicle;
            }
        }
        
        if (pocketShown()) {
            // // TODO(ben): is there a better place to do this?
            overlayDiv.innerHTML = '';
            overlayDiv.classList.remove('overlayLogicNode');
        }
        
        toggleShown();
    }

    function pocketButtonIsBig() {
        return realityEditor.gui.menus.getVisibility('bigPocket');
    }
    
    function pocketButtonIsHalf() {
        return realityEditor.gui.menus.getVisibility('halfPocket');
    }

    function toggleShown() {
        if (pocketShown()) {
            pocketHide();
        } else {
            pocketShow();
        }
    }
    
    // external modules can register a function to apply different CSS classes to each pocket item container
    var pocketElementHighlightFilters = [];
    
    function addElementHighlightFilter(callback) {
        pocketElementHighlightFilters.push(callback);
    }
    
    function pocketShow() {
        pocket.classList.add('pocketShown');
        realityEditor.gui.menus.buttonOn(['pocket']);
        if (globalStates.guiState === "node") {
            palette.style.display = 'none';
            nodeMemoryBar.style.display = 'block';
        } else {
            palette.style.display = 'block';
            nodeMemoryBar.style.display = 'none';
        }
        isPocketTapped = false;
        realityEditor.gui.memory.nodeMemories.resetEventHandlers();
        
        console.warn('pocket show', document.querySelector('.palette'));
        
        var allPocketElements = Array.from(document.querySelector('.palette').children);
        allPocketElements.forEach(function(pocketElement) {
            pocketElement.classList.remove('highlightedPocketElement');
        });
        
        if (pocketElementHighlightFilters.length > 0) {
            
            var pocketFrameNames = allPocketElements.map(function(div) { return div.dataset.name });
            
            pocketElementHighlightFilters.forEach(function(filterFunction) {
                var framesToHighlight = filterFunction(pocketFrameNames);

                allPocketElements.forEach(function(pocketElement) {
                    if (framesToHighlight.indexOf(pocketElement.dataset.name) > -1) {
                        pocketElement.classList.add('highlightedPocketElement');
                    }
                });

            });
        }

        createPocketScrollbar();
    }

    function pocketHide() {
        pocket.classList.remove('pocketShown');
        realityEditor.gui.menus.buttonOff(['pocket']);
        isPocketTapped = false;
    }

    function pocketShown() {
        return pocket.classList.contains('pocketShown');
    }

    function createPocketUIPalette() {
        palette = document.querySelector('.palette');
        if (realityElements.length % 4 !== 0) {
            var numToAdd = 4 - (realityElements.length % 4);
            for (let i = 0; i < numToAdd; i++) {
                // console.log('add blank ' + i);
                realityElements.push(null);
            }
        }
        
        for (let i = 0; i < realityElements.length; i++) {
            var element = realityElements[i];
            var container = document.createElement('div');
            container.classList.add('element-template');
            container.id = 'pocket-element';
            // container.position = 'relative';
            
            if (element === null) {
                // this is just a placeholder to fill out the last row
                container.dataset.src = '_PLACEHOLDER_';
            } else {
                var thisUrl = 'frames/' + element.name + '.html';
                var gifUrl = 'frames/pocketAnimations/' + element.name + '.gif';
                container.dataset.src = thisUrl;

                container.dataset.name = element.name;
                container.dataset.width = element.width;
                container.dataset.height = element.height;
                container.dataset.nodes = JSON.stringify(element.nodes);
                if (typeof element.startPositionOffset !== 'undefined') {
                    container.dataset.startPositionOffset = JSON.stringify(element.startPositionOffset);
                }
                
                var elt = document.createElement('div');
                elt.classList.add('palette-element');
                elt.style.backgroundImage = 'url(\'' + gifUrl + '\')';
                container.appendChild(elt);
            }

            palette.appendChild(container);
        }
    }

    /**
     * Programmatically generates a scroll bar with a number of segments ("chapters") based on the total number of rows
     * of frames and memories in the pocket, that lets you jump up and down by tapping or scrolling your finger between
     * the different segments of the scroll bar
     * @todo: add a vertical margin between each row where we can label the frames with their names
     */
    function createPocketScrollbar() {
        var scrollbar = document.getElementById('pocketScrollBar');
        if (scrollbar.children.length > 0) {
            console.log('already built the pocket scrollbar');
            return;
        }
        var numMemoryContainers = 4;
        if (TEMP_DISABLE_MEMORIES) {
            numMemoryContainers = 0;
        }
        var numFrames = realityElements.length + numMemoryContainers;
        var pageHeight = window.innerHeight; //320;
        var frameHeight = Math.floor(parseFloat(window.getComputedStyle( document.querySelector('#pocket-element') ).width)) - 6;
        var paddingHeight = 6; //parseFloat(document.querySelector('#pocket-element').style.margin) * 2;
        var framesPerRow = 4;
        var numRows = Math.ceil(numFrames / framesPerRow);
        // A "chapter" is a section/segment on the scroll bar that you can tap to jump to that section of frames
        var numChapters = Math.max(1, Math.ceil( (numRows * (frameHeight + paddingHeight)) / pageHeight ) - 1); // minus one because we can scroll to end using previous bar segment
        console.log('building pocket scrollbar with ' + numChapters + ' chapters');
        
        var marginBetweenSegments = 10;
        var scrollbarHeight = 320; // matches menu height of sidebar buttons //pageHeight - 15;  //305;
        var scrollbarHeightDifference = globalStates.width - scrollbarHeight;

        var allSegmentButtons = [];
        
        function hideAllSegmentSelections() {
            allSegmentButtons.forEach(function(div){
                if (div.firstChild) {
                    div.firstChild.style.visibility = 'hidden';
                }
                div.classList.remove('pocketScrollBarSegmentTouched');
            });
        }
        
        function selectSegment(segment) {
            if (segment.firstChild) {
                segment.firstChild.style.visibility = 'visible';
            }
            segment.classList.add('pocketScrollBarSegmentTouched');
        }
        
        var pocketPointerDown = false;
        document.addEventListener('pointerdown', function(_e) {
            pocketPointerDown = true;
        });
        document.addEventListener('pointerup', function(_e) {
            pocketPointerDown = false;
        });

        for (var i = 0; i < numChapters; i++) {
            var segmentButton = document.createElement('div');
            segmentButton.className = 'pocketScrollBarSegment';
            segmentButton.id = 'pocketScrollBarSegment' + i;
            segmentButton.style.height = (scrollbarHeight / numChapters - marginBetweenSegments) + 'px';
            segmentButton.style.top = (scrollbarHeightDifference/2 - marginBetweenSegments/2) + (i * scrollbarHeight / numChapters) + 'px';
            
            var segmentActiveDiv = document.createElement('div');
            segmentActiveDiv.className = 'pocketScrollBarSegmentActive';
            if (i > 0) {
                segmentActiveDiv.style.visibility = 'hidden';
            }
            segmentButton.appendChild(segmentActiveDiv);
            
            segmentButton.dataset.index = i;
            
            function scrollPocketForTouch(e) {
                var index = parseInt(e.currentTarget.dataset.index);
                var segmentTop = e.currentTarget.getClientRects()[0].top;
                var segmentBottom = e.currentTarget.getClientRects()[0].bottom;

                var percentageBetween = (e.clientY - segmentTop) / (segmentBottom - segmentTop);
                var scrollContainer = document.getElementById('pocketScrollContainer');
                scrollContainer.scrollTop = (index + percentageBetween) * pageHeight;
            }
            
            segmentButton.addEventListener('pointerdown', function(e) {
                console.log('tapped segment ' + e.currentTarget.dataset.index);
                hideAllSegmentSelections();
                selectSegment(e.currentTarget);
                // scrollToSegmentIndex(e.currentTarget.dataset.index); // TODO: keep this? or same as pointermove and include percentage between?
                scrollPocketForTouch(e);
            });
            segmentButton.addEventListener('pointerup', function(e) {
                console.log('released segment ' + e.currentTarget.dataset.index);
                hideAllSegmentSelections();
                selectSegment(e.currentTarget);
                e.currentTarget.classList.remove('pocketScrollBarSegmentTouched');
            });
            segmentButton.addEventListener('pointerenter', function(e) {
                if (!pocketPointerDown) { return; }

                console.log('released segment ' + e.currentTarget.dataset.index);
                hideAllSegmentSelections();
                selectSegment(e.currentTarget);
                // scrollToSegmentIndex(e.currentTarget.dataset.index);
            });
            segmentButton.addEventListener('pointerleave', function(e) {
                if (!pocketPointerDown) { return; }

                console.log('released segment ' + e.currentTarget.dataset.index);
                e.currentTarget.classList.remove('pocketScrollBarSegmentTouched');
            });
            segmentButton.addEventListener('pointercancel', function(e) {
                e.currentTarget.classList.remove('pocketScrollBarSegmentTouched');
            });
            segmentButton.addEventListener('pointermove', function(e) {
                if (!pocketPointerDown) { return; }

                scrollPocketForTouch(e);
                // var index = parseInt(e.currentTarget.dataset.index);
                // var segmentTop = e.currentTarget.getClientRects()[0].top;
                // var segmentBottom = e.currentTarget.getClientRects()[0].bottom;
                //
                // var percentageBetween = (e.clientY - segmentTop) / (segmentBottom - segmentTop);
                // var scrollContainer = document.getElementById('pocketScrollContainer');
                // scrollContainer.scrollTop = (index + percentageBetween) * pageHeight;

                // console.log(percentageBetween, (index + percentageBetween), scrollContainer.scrollTop);
            });
            scrollbar.appendChild(segmentButton);
            allSegmentButtons.push(segmentButton);
        }
        
        // function scrollToSegmentIndex(index) {
        //     var scrollContainer = document.getElementById('pocketScrollContainer');
        //     scrollContainer.scrollTop = index * pageHeight;
        // }
        
        finishStylingPocket();
    }
    
    function finishStylingPocket() {
        [].slice.call(document.querySelectorAll('.palette-element')).forEach(function(paletteElement) {
            realityEditor.gui.moveabilityCorners.wrapDivWithCorners(paletteElement, 0, true, null, null, 1);
        });
    }

    exports.pocketInit = pocketInit;
    exports.pocketShown = pocketShown;
    exports.pocketShow = pocketShow;
    exports.pocketHide = pocketHide;
    
    exports.onPocketButtonEnter = onPocketButtonEnter;
    exports.onPocketButtonUp = onPocketButtonUp;
    exports.onBigPocketButtonEnter = onBigPocketButtonEnter;
    exports.onHalfPocketButtonEnter = onHalfPocketButtonEnter;

    exports.addElementHighlightFilter = addElementHighlightFilter;
    
}(realityEditor.gui.pocket));
