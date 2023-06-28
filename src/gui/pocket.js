/**
 *
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

        addedLogic.scale = globalStates.defaultScale / 2; // logic nodes are naturally larger so make them smaller
        //closestObject ? closestObject.averageScale : globalStates.defaultScale;
        addedLogic.screenZ = 1000;
        addedLogic.loaded = false;
        addedLogic.matrix = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ];

        // make sure that logic nodes only stick to 2.0 server version
        if(realityEditor.network.testVersion(closestObjectKey) > 165) {
            console.log('created node with logic key ' + logicKey + ' and added to ' + closestFrameKey);
            closestFrame.nodes[logicKey] = addedLogic;

            // render it
            var nodeUrl = realityEditor.network.getURL(closestObject.ip, realityEditor.network.getPort(closestObject), "/nodes/logic/index.html");
            realityEditor.gui.ar.draw.addElement(nodeUrl, closestObjectKey, closestFrameKey, logicKey, 'logic', addedLogic);

            var _thisNode = document.getElementById("iframe" + logicKey);
            if (_thisNode && _thisNode.getAttribute('loaded')) {
                realityEditor.network.onElementLoad(closestObjectKey, logicKey);
            }

            // send it to the server
            realityEditor.network.postNewLogicNode(closestObject.ip, closestObjectKey, closestFrameKey, logicKey, addedLogic);

            realityEditor.sceneGraph.addNode(closestObjectKey, closestFrameKey, logicKey, addedLogic);

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

    var pocketFrameNames = {};
    var currentClosestObjectKey = null;
    
    var aggregateFrames = {};

    var ONLY_CLOSEST_OBJECT = false;
    var SHOW_IP_LABELS = true;
    var SIMPLE_IP_LABELS = true;

    // stores the JSON.stringified realityElements rendered the last time the pocket was built
    let previousPocketChecksum = null;

    let selectedElement = null;
    let pointerDownOnElement = null;
    let scrollbarPointerDown = false;
    let scrollbarPointerDownY = 0;
    let scrollbarHandleInitialOffset = 0;

    let lastPointerY = null;

    let scrollVelocity = 0;
    let scrollReleaseVelocity = 0;
    let scrollReleaseTime = 0;
    let scrollResistance = 1;

    function pocketInit() {
        pocket = document.querySelector('.pocket');
        palette = document.querySelector('.palette');
        // palette.style.marginBottom = '-24px';
        nodeMemoryBar = document.querySelector('.nodeMemoryBar');

        const pocketScrollContainer = document.getElementById('pocketScrollContainer');
        pocketScrollContainer.addEventListener('touchmove', function(event) {
            // Prevent normal scrolling since we have the scroll touch bar
            event.preventDefault();
        });

        addMenuButtonActions();

        pocket.addEventListener('pointerup', function(evt) {
            isPocketTapped = false;
            lastPointerY = null;
            scrollReleaseVelocity = scrollVelocity;
            scrollReleaseTime = Date.now();
            scrollResistance = 1;
            
            if (pointerDownOnElement) {
                pointerDownOnElement.classList.remove('hoverPocketElement');
            }
            
            if (pointerDownOnElement && pointerDownOnElement.dataset.name === evt.target.dataset.name) {
                selectedElement = evt.target;
                selectElement(evt.target);
            }

            pointerDownOnElement = null;
            console.log('null 1');
        });

        // On touching an element-template, upload to currently visible object
        pocket.addEventListener('pointerdown', function(evt) {
            isPocketTapped = true;
            lastPointerY = evt.clientY;

            if (!evt.target.classList.contains('element-template')) {
                return;
            }

            let dataset = evt.target.dataset;

            if (dataset.src === '_PLACEHOLDER_') {
                console.log('dont add frame from placeholder!');
                return;
            }
            
            // pointermove gesture must have started with a tap on the pocket
            if (!isPocketTapped) {
                return;
            }
            
            if (selectedElement && selectedElement.dataset.name === dataset.name) {

                createFrame(dataset.name, {
                    startPositionOffset: dataset.startPositionOffset,
                    width: dataset.width,
                    height: dataset.height,
                    pageX: evt.pageX,
                    pageY: evt.pageY
                });
                
                deselectElement(evt.target);
                selectedElement = null;
                pocketHide();
            } else {
                pointerDownOnElement = evt.target;
                console.log('target = ' + dataset.name);
                evt.target.classList.add('hoverPocketElement');
                if (selectedElement) {
                    deselectElement(selectedElement);
                    selectedElement = null;
                }
            }
        });

        pocket.addEventListener('pointermove', function(evt) {
            if (!isPocketTapped || scrollbarPointerDown) { return; }
            if (lastPointerY === null) { 
                lastPointerY = evt.clientY; // shouldn't be necessary, but just in case
                return;
            }
            
            // scroll so that mouse's position on the screen matches it's last position
            let dY = -1 * (evt.clientY - lastPointerY);
            
            let newVelocity = 1.2 * dY;
            // if (scrollVelocity === 0) {
                scrollVelocity = newVelocity;
            // } else {
            //     let alphaBlend = 0.8;
            //     scrollVelocity = alphaBlend * newVelocity + (1 - alphaBlend) * scrollVelocity;
            // }

            var scrollContainer = document.getElementById('pocketScrollContainer');
            scrollContainer.scrollTop = scrollContainer.scrollTop + dY;
            updateScrollbarToMatchContainerScrollTop(scrollContainer.scrollTop);
            
            lastPointerY = evt.clientY;

            // cancel pointerDownOn when any scroll happens
            if (pointerDownOnElement && Math.abs(dY) > 1) {
                pointerDownOnElement.classList.remove('hoverPocketElement');
                pointerDownOnElement = null;
                console.log('null 2', dY);
            }
            
        });
        
        pocket.addEventListener('pointercancel', function(_evt) {
            isPocketTapped = false;
            lastPointerY = null;
            scrollReleaseVelocity = scrollVelocity;
            scrollReleaseTime = Date.now();
            scrollResistance = 1;
            pointerDownOnElement = null;
            
            console.log('null 3');
        });
        
        function updateScroll() {
            try {
                if (pocketShown() && scrollVelocity !== 0) {
                    
                    if (!isPocketTapped) {
                        var scrollContainer = document.getElementById('pocketScrollContainer');
                        
                        scrollVelocity = scrollReleaseVelocity * scrollResistance * Math.cos((Date.now() - scrollReleaseTime) / (1000 + 100 * Math.pow(Math.abs(scrollReleaseVelocity), 0.5)));
                        
                        scrollContainer.scrollTop = scrollContainer.scrollTop + scrollVelocity;
                        // accelerationFactor = 0.8; // lose speed faster while held down

                        updateScrollbarToMatchContainerScrollTop(scrollContainer.scrollTop);

                        // sqrt(percentSlower) has very little effect until speed has dropped significantly already
                        let accelerationFactor = 0.99 * Math.pow(Math.abs(scrollVelocity / scrollReleaseVelocity), 0.2);
                        // the lower scrollVelocity gets, the more acceleration factor should drop
                        scrollResistance *= accelerationFactor;
                    }

                    // console.log('updateScroll', scrollReleaseVelocity, scrollVelocity);

                    // scrollVelocity *= accelerationFactor;
                    // scrollVelocity = Math.sqrt(scrollVelocity);
                    
                    // round to zero if low or swapped signs so it doesn't trail off indefinitely
                    if (Math.abs(scrollVelocity) < 0.01 || (scrollVelocity * scrollReleaseVelocity < 0)) {
                        scrollVelocity = 0;
                    }
                }
            } catch (e) {
                console.warn('error in updateScroll', e);
            }
            
            requestAnimationFrame(updateScroll);
        }
        updateScroll(); // start the update loop

        // on desktop, hovering over a palette element pre-selects it, so you don't need to double-click
        pocket.addEventListener('pointermove', function(evt) {
            if (!evt.target.classList.contains('element-template')) {

                // deselect highlighted item
                if (selectedElement) {
                    deselectElement(selectedElement);
                    selectedElement = null;
                    hideTargetObjectLabel();
                }
                
                return;
            }

            if (selectedElement) {
                console.log(selectedElement.dataset.name, evt.target.dataset.name);
                if (selectedElement.dataset.name !== evt.target.dataset.name) {
                    deselectElement(selectedElement);
                    selectedElement = null;
                    hideTargetObjectLabel();
                } else {
                    return;
                }
            }
            
            // console.log('pointermove', evt.target.classList);

            selectedElement = evt.target;
            selectElement(evt.target);
        });
        
        if (ONLY_CLOSEST_OBJECT) {
            realityEditor.gui.ar.draw.onClosestObjectChanged(onClosestObjectChanged_OnlyClosest); // TODO: delete / cleanup old attempts
        } else {
            console.log('get all possible frames and assemble pocket out of all of them');
            
            // subscribes to the closestObjectChanged event in the draw module, and triggers the pocket to refresh its UI
            realityEditor.gui.ar.draw.onClosestObjectChanged(onClosestObjectChanged); // TODO: this should actually trigger anytime the set of visibleObjects changes, not just the closest one
            
            // also triggers pocket refresh whenever a new server with frames was detected
            realityEditor.network.availableFrames.onServerFramesInfoUpdated(function() {
                console.log('onServerFramesInfoUpdated');
                onClosestObjectChanged(currentClosestObjectKey, currentClosestObjectKey);
            });
        }
    }
    
    const SHOW_NAME_LABEL = false;
    function selectElement(pocketElement) {
        pocketElement.classList.add('highlightedPocketElement');
        
        if (SHOW_NAME_LABEL) {
            let label = pocketElement.querySelector('.palette-element-label');
            if (label) {
                label.innerText = pocketElement.dataset.name;
                label.style.bottom = '10px';
            }
        }

        showTargetObjectLabel();
        updateTargetObjectLabel(null, pocketElement.dataset.name);
    }
    
    function deselectElement(pocketElement) {
        if (!pocketElement) { return; }

        pocketElement.classList.remove('highlightedPocketElement');
        
        if (SHOW_NAME_LABEL) {
            let label = pocketElement.querySelector('.palette-element-label');
            if (label) {
                label.innerText = '';
                label.style.bottom = '';
            }
        }

        hideTargetObjectLabel();
    }

    /**
     * Looks at all visible worlds and objects, and compiles a set of frame names and srcs into the aggregateFrames variable
     */
    function rebuildAggregateFrames() {
        // see which frames this closest object supports
        var availablePocketFrames = realityEditor.network.availableFrames.getFramesForAllVisibleObjects(Object.keys(realityEditor.gui.ar.draw.visibleObjects));
        // this is an array of [{actualIP: string, proxyIP: string, frames: {}}, ...], sorted by priority (distance)

        // we want to generate a set of frame info, with the frame name as each key
        aggregateFrames = {};

        // for each unique PROXY ip, in order, add all of their frames to an aggregate, tagged with proxy and actual IPs
        var processedProxyIPs = [];
        availablePocketFrames.forEach(function(serverFrameInfo) {
            if (processedProxyIPs.indexOf(serverFrameInfo.proxyIP) > -1) { return; }

            for (var frameName in serverFrameInfo.frames) {
                if (typeof aggregateFrames[frameName] === 'undefined') {
                    aggregateFrames[frameName] = serverFrameInfo.frames[frameName];
                    aggregateFrames[frameName].actualIP = serverFrameInfo.actualIP;
                    aggregateFrames[frameName].proxyIP = serverFrameInfo.proxyIP;
                    // console.log('took ' + frameName + ' from ' + serverFrameInfo.actualIP + ' (' + serverFrameInfo.proxyIP + ')');
                }
            }

            processedProxyIPs.push(serverFrameInfo.proxyIP);
        });

    }

    /**
     * When the closest visible object changes, check what the new set of aggregate available frames is, and refresh the pocket UI
     * @todo: conditions for refreshing the UI can be made to be more exact
     * @param {string} oldClosestObjectKey
     * @param {string} newClosestObjectKey
     */
    function onClosestObjectChanged(oldClosestObjectKey, newClosestObjectKey) {
        console.log('closest object changed from ' + oldClosestObjectKey + ' to ' + newClosestObjectKey);
        currentClosestObjectKey = newClosestObjectKey;
        
        if (!currentClosestObjectKey) {
            return; // also gets triggered by onServerFramesInfoUpdated, and it's possible that the currentClosestObjectKey might be null
        }

        // if (selectedElement) {
        //     updateTargetObjectLabel(currentClosestObjectKey, selectedElement.dataset.name);
        // } else {
        //     hideTargetObjectLabel();
        // }

        rebuildAggregateFrames();
        
        // // first check what has changed
        // var previousPocketFrameNames = (pocketFrameNames[oldClosestObjectKey]) ? Object.keys(pocketFrameNames[oldClosestObjectKey]) : null;
        // var diff = realityEditor.device.utilities.diffArrays(previousPocketFrameNames, Object.keys(availablePocketFrames));
        //
        // // then update the current pocket info
        // pocketFrameNames[currentClosestObjectKey] = availablePocketFrames;
        //
        // // update UI to include the available frames only
        // if (!diff.isEqual) { // TODO: add back this equality check so we don't unnecessarily rebuild the pocket
        // TODO: one equality check could be the icon src paths for new aggregateFrames vs the ones currently rendered
        // remove all old icons
        Array.from(document.querySelector('.palette').children).forEach(function(child) {
            child.parentElement.removeChild(child);
        });
        // create all new icons
        createPocketUIPaletteForAggregateFrames();

        // possibly update the scrollbar height
        createPocketScrollbar();

        finishStylingPocket();
        // }

        if (selectedElement) { // re-select in case the closest object changed and the pocket was rebuilt
            let elementName = selectedElement.dataset.name;
            
            deselectElement(selectedElement);
            selectedElement = null;
            hideTargetObjectLabel();

            // try to find the same selected element
            let elements = document.querySelectorAll('.element-template');
            elements.forEach(function(elt) {
                if (elt.dataset.name === elementName) {
                    selectedElement = elt;
                    selectElement(selectedElement);
                }
            });
        }
    }
    
    function updateTargetObjectLabel(closestObjectKey, frameType) {
        if (closestObjectKey && frameType) {
            console.warn('specify either closestObjectKey or frameType, not both')
        }
        
        if (frameType) {
            closestObjectKey = realityEditor.network.availableFrames.getBestObjectInfoForFrame(frameType);
        }
        
        // update the pocket target label
        let label = document.getElementById('pocketTargetObjectLabel');
        let object = realityEditor.getObject(closestObjectKey);
        
        let processedObjectName = object.name.indexOf('_WORLD_') === 0 ?
            object.name.split('_WORLD_')[1] :
            object.name;
        
        let objectType = object.name.indexOf('_WORLD_') === 0 ? 'world object' : 'object';
        
        let destinationHTMLString = 'the <u style="color: white">' + processedObjectName + '</u> ' + objectType;
        
        if (closestObjectKey === realityEditor.worldObjects.getLocalWorldId()) {
            destinationHTMLString = 'your temporary workspace';
        }
        
        label.innerHTML = 'Add a <u style="color: white">' + frameType + '</u> tool to ' + destinationHTMLString;
    }
    
    function showTargetObjectLabel() {
        let label = document.getElementById('pocketTargetObjectLabel');
        label.style.display = '';
    }
    
    function hideTargetObjectLabel() {
        let label = document.getElementById('pocketTargetObjectLabel');
        label.style.display = 'none';
    }

    /**
     * @deprecated - used if we turn on ONLY_CLOSEST_OBJECT mode, which means pocket will only show frames compatible
     *  with the current closest object, instead of frames compatible with anything on the screen
     * @param oldClosestObjectKey
     * @param newClosestObjectKey
     */
    function onClosestObjectChanged_OnlyClosest(oldClosestObjectKey, newClosestObjectKey) {
        console.log('closest object changed from ' + oldClosestObjectKey + ' to ' + newClosestObjectKey);
        currentClosestObjectKey = newClosestObjectKey;

        // see which frames this closest object supports
        // var closestServerIP = realityEditor.getObject(newClosestObjectKey).ip;
        var availablePocketFrames = realityEditor.network.availableFrames.getFramesForPocket(currentClosestObjectKey);

        // first check what has changed
        var previousPocketFrameNames = (pocketFrameNames[oldClosestObjectKey]) ? Object.keys(pocketFrameNames[oldClosestObjectKey]) : null;
        var diff = realityEditor.device.utilities.diffArrays(previousPocketFrameNames, Object.keys(availablePocketFrames));

        // then update the current pocket info
        pocketFrameNames[currentClosestObjectKey] = availablePocketFrames;

        // update UI to include the available frames only
        if (!diff.isEqual) {
            // remove all old icons
            Array.from(document.querySelector('.palette').children).forEach(function(child) {
                child.parentElement.removeChild(child);
            });
            // create all new icons
            createPocketUIPaletteForAvailableFrames(currentClosestObjectKey);

            // possibly update the scrollbar height
            createPocketScrollbar();

            finishStylingPocket();
        }
    }

    /**
     * If frame metadata includes "attachesTo" property, returns that array of locations ("world", "object", etc)
     * @param {string} frameName
     * @return {undefined|Array.<string>}
     */
    function getAttachesTo(frameName) {
        // do this if necessary: rebuildAggregateFrames();
        let frameInfo = aggregateFrames[frameName];
        if (frameInfo && frameInfo.metadata) {
            return frameInfo.metadata.attachesTo;
        }
        return undefined;
    }

    /**
     * Returns a data structure similar to what was previously defined in pocketFrames.js, but dynamically generated
     * from the set of servers that have been detected and have a visible world or object on the screen
     * Result contains the IP of the server that this frame would be placed on, the "proxy" IP if this server is relying
     *  on a different server to host its frames, the frame's inferred properties, metadata from server, and a preloaded icon image
     * @return {Array.<{actualIP: string, proxyIP: string, properties: {name: string, ...}, metadata: {enabled: boolean, ...}, icon: Image}>}
     */
    function getRealityElements() {
        if (ONLY_CLOSEST_OBJECT) {
            return Object.keys(pocketFrameNames[currentClosestObjectKey]).map(function(frameName) { // turn dictionary into array
                return pocketFrameNames[currentClosestObjectKey][frameName];
            });
        
        } else {
            rebuildAggregateFrames();
            return Object.keys(aggregateFrames).map(function(frameName) { // turn dictionary into array
                return aggregateFrames[frameName];
            }).filter(function(frameInfo) {
                var noMetadata = typeof frameInfo.metadata === 'undefined';
                if (noMetadata) {
                    return true; // older versions without metadata should show up (backwards-compatible)
                }
                return frameInfo.metadata.enabled; // newer versions only show up if enabled
            });
        }
    }

    /**
     * Renders the pocket UI for displaying the set of all currently available frames that can be added.
     * Loads each icon and src from the correct server that should host that frame.
     */
    function createPocketUIPaletteForAggregateFrames() {

        var realityElements = getRealityElements();

        palette = document.querySelector('.palette');
        if (realityElements.length % 4 !== 0) {
            var numToAdd = 4 - (realityElements.length % 4);
            for (let i = 0; i < numToAdd; i++) {
                realityElements.push({properties: null}); // add blanks to fill in row if needed
            }
        }
        
        var closestObject = realityEditor.getObject(realityEditor.gui.ar.getClosestObject()[0]);
        if (!closestObject) { return; }
        var closestObjectIP = closestObject.ip;

        document.getElementById('pocketScrollContainer').style.width = realityEditor.gui.pocket.getWidth() + 'px';
        
        for (let i = 0; i < realityElements.length; i++) {
            if (!realityElements[i]) continue;

            var element = realityElements[i].properties;

            var container = document.createElement('div');
            container.classList.add('element-template');
            container.id = 'pocket-element';
            // container.position = 'relative';

            container.style.width = getFrameIconWidth() + 'px';
            container.style.height = getFrameIconWidth() + 'px'; // height = width

            if (element === null) {
                // this is just a placeholder to fill out the last row
                container.dataset.src = '_PLACEHOLDER_';
            } else {
                // var thisUrl = 'frames/' + element.name + '.html';
                var thisUrl = realityEditor.network.getURL(realityElements[i].proxyIP, realityEditor.network.getPort(closestObject), '/frames/' + element.name + '/index.html');
                // var gifUrl = 'frames/pocketAnimations/' + element.name + '.gif';
                var gifUrl = realityEditor.network.getURL(realityElements[i].proxyIP, realityEditor.network.getPort(closestObject), '/frames/' + element.name + '/icon.gif');
                container.dataset.src = thisUrl;

                container.dataset.name = element.name;
                container.dataset.width = element.width;
                container.dataset.height = element.height;
                container.dataset.nodes = JSON.stringify(element.nodes);
                if (typeof element.startPositionOffset !== 'undefined') {
                    container.dataset.startPositionOffset = JSON.stringify(element.startPositionOffset);
                }
                if (typeof element.requiredEnvelope !== 'undefined') {
                    container.dataset.requiredEnvelope = element.requiredEnvelope;
                }

                var elt = document.createElement('div');
                elt.classList.add('palette-element');
                elt.style.backgroundImage = 'url(\'' + gifUrl + '\')';
                container.appendChild(elt);

                if (SHOW_IP_LABELS) {
                    
                    var ipLabel = document.createElement('div');
                    ipLabel.classList.add('palette-element-label');
                    
                    if (!SIMPLE_IP_LABELS) {
                        ipLabel.innerText = realityElements[i].actualIP; // '127.0.0.1';
                        if (realityElements[i].actualIP !== realityElements[i].proxyIP) {
                            ipLabel.innerText = realityElements[i].actualIP + ' (' + realityElements[i].proxyIP + ')';
                        }
                    }

                    if (realityElements[i].proxyIP !== closestObjectIP) {
                        var worldObjects = realityEditor.worldObjects.getWorldObjectsByIP(realityElements[i].actualIP);
                        if (worldObjects.length > 0) {
                            ipLabel.innerText = worldObjects[0].name;
                        }
                    }
                    container.appendChild(ipLabel);
                }

                addFrameIconHoverListeners(container, element.name);
            }

            palette.appendChild(container);
        }

        // save this so we can avoid re-building the pocket the next time, if nothing changes between now and then
        previousPocketChecksum = getChecksumForPocketElements(realityElements);
    }
    
    function addFrameIconHoverListeners(frameIconContainer, _frameName) {
        frameIconContainer.addEventListener('pointerenter', function(evt) {
            // console.log('pointerenter', frameName);
            // update closest object label
            // updateTargetObjectLabel(null, frameName);

            if (!isPocketTapped) {
                evt.target.classList.add('hoverPocketElement');
            }
        });

        frameIconContainer.addEventListener('pointerleave', function(evt) {
            // console.log('pointerleave', frameName);
            evt.target.classList.remove('hoverPocketElement');
        });
    }
    
    // gets the width of the usable portion of the screen for the pocket
    function getWidth() {
        let guiButtonDiv = document.getElementById('guiButtonDiv');
        let usableScreenWidth = window.innerWidth;
        if (guiButtonDiv) {
            let clientRects = guiButtonDiv.getClientRects();
            if (clientRects && clientRects[0]) {
                usableScreenWidth = clientRects[0].left - 37;
            }
        }
        // console.log(usableScreenWidth);
        return usableScreenWidth;
    }
    
    // calculates how wide (and tall) each frame tile should be
    function getFrameIconWidth() {
        if (!document.getElementById('pocketScrollBar') || document.getElementById('pocketScrollBar').getClientRects().length === 0) { return; }
        // 37 is the margin between buttons and edge of screen, buttons and scrollbar, etc
        let scrollBarWidth = (2 * 37) + document.getElementById('pocketScrollBar').getClientRects()[0].width;
        let margin = 3;

        let tilesPerRow = 4 + Math.max(0, Math.min(4, Math.round((getWidth() - 900) / 200))); // 5 on iOS device, more on bigger screens
        let baseTileSize = (getWidth() - scrollBarWidth) / tilesPerRow - (margin * 2);  //* 0.18;

        let realScrollBarWidth = document.getElementById('pocketScrollBar').getClientRects()[0].width;
        let paletteWidth = realityEditor.gui.pocket.getWidth() - realScrollBarWidth;
        let numPerRow = Math.floor(paletteWidth / baseTileSize);
        
        let totalWidth = (baseTileSize + (margin * 2)) * numPerRow;
        
        return baseTileSize * (paletteWidth / totalWidth);
    }
    
    function onWindowResized() {
        if (!pocketShown()) { return; }
        // update pocket scroll container size if needed
        let scrollBarWidth = document.getElementById('pocketScrollBar').getClientRects()[0].width;
        let paletteWidth = realityEditor.gui.pocket.getWidth() - scrollBarWidth;
        document.getElementById('pocketScrollContainer').style.width = paletteWidth + 'px';
        
        // update the width of each tile
        let elements = document.getElementById('pocketScrollContainer').querySelectorAll('.element-template');
        elements.forEach(function(elt) {
            elt.style.width = getFrameIconWidth() + 'px';
            elt.style.height = getFrameIconWidth() + 'px'; // height = width
        });

        let margin = 3;

        // update the width of each memory container, knowing that there are exactly 4 of them
        let memoryContainers = document.querySelector('.memoryBar').querySelectorAll('.memoryContainer');
        memoryContainers.forEach(function(elt) {
            elt.style.width = (paletteWidth / 4 - (2 * margin)) + 'px';
        });

        realityEditor.gui.pocket.createPocketScrollbar(); // update number of chapters to match scroll height
    }

    /**
     * Converts the full structure of all the frames/icons/etc that the pocket is built of into a literal
     * that can be compared later to see if it has changed. Currently just using JSON.stringify.
     * @param {Array.<{actualIP: string, proxyIP: string, properties: {name: string, ...}, metadata: {enabled: boolean, ...}, icon: Image}>} pocketElements
     * @return {string}
     */
    function getChecksumForPocketElements(pocketElements) {
        return JSON.stringify(pocketElements);
    }

    /**
     * @deprecated - used to create pocket frame palette UI if ONLY_CLOSEST_OBJECT is enabled
     */
    function createPocketUIPaletteForAvailableFrames(closestObjectKey) {
        
        // var realityElements = Object.keys(availablePocketFrames).map(function(frameName) {
        //     return availablePocketFrames[frameName];
        // });
        
        var realityElements = getRealityElements();
        
        palette = document.querySelector('.palette');
        if (realityElements.length % 4 !== 0) {
            var numToAdd = 4 - (realityElements.length % 4);
            for (let i = 0; i < numToAdd; i++) {
                // console.log('add blank ' + i);
                realityElements.push(null);
            }
        }

        for (let i = 0; i < realityElements.length; i++) {
            if (!realityElements[i]) continue;
            
            var element = realityElements[i].properties;
            if (typeof element === 'undefined') {
                console.log('could not find properties of ', realityElements[i]);
                continue;
            }
            
            var container = document.createElement('div');
            container.classList.add('element-template');
            container.id = 'pocket-element';
            // container.position = 'relative';

            if (element === null) {
                // this is just a placeholder to fill out the last row
                container.dataset.src = '_PLACEHOLDER_';
            } else {
                // var thisUrl = 'frames/' + element.name + '.html';
                var thisUrl = realityEditor.network.availableFrames.getFrameSrc(closestObjectKey, element.name);
                // var gifUrl = 'frames/pocketAnimations/' + element.name + '.gif';
                var gifUrl = realityEditor.network.availableFrames.getFrameIconSrc(closestObjectKey, element.name);
                container.dataset.src = thisUrl;

                container.dataset.name = element.name;
                container.dataset.width = element.width;
                container.dataset.height = element.height;
                container.dataset.nodes = JSON.stringify(element.nodes);
                if (typeof element.startPositionOffset !== 'undefined') {
                    container.dataset.startPositionOffset = JSON.stringify(element.startPositionOffset);
                }
                if (typeof element.requiredEnvelope !== 'undefined') {
                    container.dataset.requiredEnvelope = element.requiredEnvelope;
                }

                var elt = document.createElement('div');
                elt.classList.add('palette-element');
                elt.style.backgroundImage = 'url(\'' + gifUrl + '\')';
                container.appendChild(elt);
                
                var ipLabel = document.createElement('div');
                ipLabel.classList.add('palette-element-label');
                ipLabel.innerText = realityEditor.getObject(closestObjectKey).ip; // '127.0.0.1';
                container.appendChild(ipLabel);
            }

            palette.appendChild(container);
        }
    }

    /**
     * Public method to automatically generate a uiTutorial frame, and add it to the world
     * @param {string} objectKey - object to add the tutorial to (should be the _WORLD_local object)
     */
    function addTutorialFrame(objectKey) {
        try {
            let addedElement = createFrame('uiTutorial', {
                startPositionOffset: JSON.stringify({x: 0, y: 0}),
                width: '568',
                height: '420',
                pageX: window.innerWidth / 2,
                pageY: window.innerHeight / 2,
                objectKey: objectKey
            });
            console.log('added tutorial frame', addedElement);
        } catch (e) {
            // ensure that it fails safely if the corresponding server doesn't have a frame named uiTutorial
            console.warn(e);
        }
    }

    /**
     * Creates a new frame with the specified options, and uploads it to the server
     * @param name
     * @param {object} options
     * @param {string} options.objectKey
     * @param {string} options.startPositionOffset
     * @param {number} options.width
     * @param {number} options.height
     * @param {number[]} options.initialMatrix
     * @param {boolean} options.noUserInteraction
     * @param {number} options.pageX
     * @param {number} options.pageY
     * @param {function} options.onUploadComplete - callback function when network finishes posting frame to server
     * @returns {Frame}
     */
    function createFrame(name, options) {
        const utils = realityEditor.gui.ar.utilities;

        const closestObjectKey = options.objectKey ? options.objectKey : realityEditor.network.availableFrames.getBestObjectInfoForFrame(name);
        if (!closestObjectKey) return;

        const closestObject = realityEditor.getObject(closestObjectKey);
        if (!closestObject) return;

        if (closestObject.integerVersion && closestObject.integerVersion <= 165) return; // before version 165, objects don't have frames

        const frame = new Frame();
        frame.objectId = closestObjectKey;

        // name the frame "gauge1xyz", "gauge2asd", "gauge3qwe", etc... 
        let numberOfSameFrames = Object.keys(closestObject.frames).map(existingFrameKey => {
            return closestObject.frames[existingFrameKey].src;
        }).filter(src => {
            return src === name;
        }).length;
        let frameUniqueName = name + (numberOfSameFrames+1) + realityEditor.device.utilities.uuidTime();

        // set the essential properties
        frame.name = frameUniqueName;
        frame.uuid = frame.objectId + frameUniqueName;
        frame.location = 'global';
        frame.src = name;

        console.log('created frame with name ' + frame.name);

        // add the frame to the object
        closestObject.frames[frame.uuid] = frame;

        // set position and scale
        if (options.startPositionOffset) {
            frame.startPositionOffset = options.startPositionOffset;
        }
        frame.ar.scale = globalStates.defaultScale;

        if (typeof options.width !== 'undefined') {
            frame.frameSizeX = options.width;
            frame.width = options.width;
        }

        if (typeof options.height !== 'undefined') {
            frame.frameSizeY = options.height;
            frame.height = options.height;
        }
        
        // populate properties not contained on server (not in constructor)
        frame.begin = utils.newIdentityMatrix(); // TODO: try removing this
        frame.loaded = false;
        frame.screenZ = 1000;
        frame.temp = utils.newIdentityMatrix(); // TODO: remove this?
        frame.fullScreen = false;
        frame.sendMatrix = false;
        frame.sendMatrices = {}; // todo: can this be unpopulated like this?
        // todo: fully remove sendAcceleration, or implement it
        frame.sendAcceleration = false;
        frame.integerVersion = 300;

        // set the eventObject so that the frame can interact with screens as soon as you add it
        realityEditor.device.eventObject.object = closestObjectKey;
        realityEditor.device.eventObject.frame = frame.uuid;
        realityEditor.device.eventObject.node = null;
        
        // tell the iframe that it was just created, not reloaded
        realityEditor.network.toBeInitialized[frame.uuid] = true;
        
        if (options.initialMatrix) {
            frame.ar.matrix = options.initialMatrix;
        }
        
        realityEditor.sceneGraph.addFrame(frame.objectId, frame.uuid, frame, frame.ar.matrix);
        realityEditor.gui.ar.groundPlaneAnchors.sceneNodeAdded(frame.objectId, frame.uuid, frame, frame.ar.matrix);
        realityEditor.network.postNewFrame(closestObject.ip, closestObjectKey, frame, options.onUploadComplete);
        
        if (!options.noUserInteraction) {
            // allows you to drag the frame around as soon as it loads
            realityEditor.gui.pocket.setPocketFrame(frame, {
                pageX: options.pageX || 0,
                pageY: options.pageY || 0
            }, closestObjectKey);
        }
        
        realityEditor.gui.pocket.callbackHandler.triggerCallbacks('frameAdded', {
            objectKey: closestObjectKey,
            frameKey: frame.uuid,
            frameType: frame.src
        });
        
        return frame;
    }

    function addMenuButtonActions() {
        
        var ButtonNames = realityEditor.gui.buttons.ButtonNames;

        // add callbacks for menu buttons -> hide pocket
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.GUI, hidePocketOnButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.LOGIC, hidePocketOnButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.SETTING, hidePocketOnButtonPressed);
        realityEditor.gui.buttons.registerCallbackForButton(ButtonNames.LOGIC_SETTING, hidePocketOnButtonPressed);

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

                document.activeElement.blur(); // reset focus in case our scrolling lost focus
                
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
                        let addedElement = null;
                        try {
                            addedElement = realityEditor.gui.pocket.createLogicNode();
                        } catch (e) {
                            console.warn('Unable to create new logic node', e);
                            return;
                        }

                        // set the name of the node by counting how many logic nodes the frame already has
                        var closestFrame = realityEditor.getFrame(addedElement.objectKey, addedElement.frameKey);
                        var logicCount = Object.values(closestFrame.nodes).filter(function (node) {
                            return node.type === 'logic'
                        }).length;
                        addedElement.logicNode.name = "LOGIC" + logicCount;

                        // upload new name to server when you change it
                        var object = realityEditor.getObject(addedElement.objectKey);
                        realityEditor.network.postNewNodeName(object.ip, addedElement.objectKey, addedElement.frameKey, addedElement.logicNode.uuid, addedElement.logicNode.name);
                        
                        realityEditor.gui.menus.switchToMenu("bigTrash", null, null);
                    
                    } else if (globalStates.guiState === 'ui') {
                        
                        // create an envelope frame when dragging out from the button in UI mode
                        console.log('create envelope by dragging out');
                        
                        var realityElements = getRealityElements();
                        
                        var envelopeData = realityElements.find(function(elt) { return elt.name === 'all-frame-envelope'; });
                        var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                        
                        if (envelopeData) {
                            let addedElement = createFrame(envelopeData.name, {
                                startPositionOffset: envelopeData.startPositionOffset,
                                width: envelopeData.width,
                                height: envelopeData.height,
                                pageX: touchPosition.x,
                                pageY: touchPosition.y,
                            });
                            
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

        // don't render the pocket again if nothing has changed
        let currentPocketChecksum = getChecksumForPocketElements(getRealityElements());
        let shouldRebuildPocketUI = currentPocketChecksum !== previousPocketChecksum;

        if (shouldRebuildPocketUI) {
            // remove all old icons
            Array.from(document.querySelector('.palette').children).forEach(function(child) {
                child.parentElement.removeChild(child);
            });
            // create all new icons
            createPocketUIPaletteForAggregateFrames();

            createPocketScrollbar();
        } else {
            console.log('pocket hasnt changed... dont re-render it');
        }

        onWindowResized();

        finishStylingPocket();
        
        hideTargetObjectLabel();
        
        // scroll to top if holding memory
        if (overlayDiv.classList.contains('overlayMemory')) {
            var scrollContainer = document.getElementById('pocketScrollContainer');
            scrollContainer.scrollTop = 0;
            updateScrollbarToMatchContainerScrollTop(scrollContainer.scrollTop);
        } else {
            // update container scrollTop to match scrollbar position
            setContainerScrollToScrollbarPosition();
        }
    }

    function updateScrollbarToMatchContainerScrollTop(scrollTop) {
        let scrollbar = document.getElementById('pocketScrollBarSegment0');
        let handle = scrollbar.querySelector('.pocketScrollBarSegmentActive');
        let paletteHeight = document.querySelector('.palette').getClientRects()[0].height;
        const pageHeight = window.innerHeight;

        let maxScrollContainerScroll = ((paletteHeight + 130) - pageHeight);
        let maxHandleScroll = scrollbar.getClientRects()[0].height - handle.getClientRects()[0].height - 10;

        let handleScrollTop = scrollTop * maxHandleScroll / maxScrollContainerScroll;
        handle.style.top = Math.max(10, Math.min(maxHandleScroll, handleScrollTop)) + 'px';
    }

    function setContainerScrollToScrollbarPosition() {
        let scrollbar = document.getElementById('pocketScrollBarSegment0');
        let handle = scrollbar.querySelector('.pocketScrollBarSegmentActive');
        let paletteHeight = document.querySelector('.palette').getClientRects()[0].height;
        const pageHeight = window.innerHeight;

        let maximumScrollAmount = scrollbar.getClientRects()[0].height - handle.getClientRects()[0].height - 10;

        let percentageBetween = (parseFloat(handle.style.top) - 10) / (maximumScrollAmount - 10);

        var scrollContainer = document.getElementById('pocketScrollContainer');
        // not sure why I have to add 130 to the paletteHeight for this to work, but otherwise it won't fully scroll to the bottom
        let maxScrollContainerScroll = ((paletteHeight + 130) - pageHeight);
        scrollContainer.scrollTop = percentageBetween * maxScrollContainerScroll;
    }

    function pocketHide() {
        pocket.classList.remove('pocketShown');
        realityEditor.gui.menus.buttonOff(['pocket']);
        isPocketTapped = false;
        selectedElement = null;
    }

    function pocketShown() {
        return pocket.classList.contains('pocketShown');
    }

    /**
     * Programmatically generates a scroll bar with a number of segments ("chapters") based on the total number of rows
     * of frames and memories in the pocket, that lets you jump up and down by tapping or scrolling your finger between
     * the different segments of the scroll bar
     * @todo: add a vertical margin between each row where we can label the frames with their names
     */
    function createPocketScrollbar() {
        const pageHeight = window.innerHeight;

        let numChapters = 1;
        
        var scrollbar = document.getElementById('pocketScrollBar');

        if (scrollbar.children.length > 0) {
            console.log('already built the pocket scrollbar once');
            // check if we should rebuild it (did number of chapters change)
            if (numChapters === scrollbar.children.length) {
                return;
            }

            while (scrollbar.hasChildNodes()) {
                scrollbar.removeChild(scrollbar.lastChild);
            }
        }

        console.log('building pocket scrollbar with ' + numChapters + ' chapters');
        
        if (!document.querySelector('.palette') || document.querySelector('.palette').getClientRects().length === 0) {
            return;
        }

        let paletteHeight = document.querySelector('.palette').getClientRects()[0].height;

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

        function scrollPocketForTouch(e) {
            // don't scroll if holding a memory
            if (overlayDiv.classList.contains('overlayMemory')) { return; }
            
            let scrollbar = document.getElementById('pocketScrollBarSegment0');
            let handle = scrollbar.querySelector('.pocketScrollBarSegmentActive');

            let amountMoved = e.pageY - scrollbarPointerDownY;
            let maximumScrollAmount = scrollbar.getClientRects()[0].height - handle.getClientRects()[0].height - 10;
            handle.style.top = Math.max(10, Math.min(maximumScrollAmount, scrollbarHandleInitialOffset + amountMoved)) + 'px'; //(100 * percentageBetween) + 'px';
            
            setContainerScrollToScrollbarPosition();
        }
        
        function jumpScrollbarToPosition(pageY) {
            // move center of scrollbar handle to pageY (constrained within bounds)

            // don't scroll if holding a memory
            if (overlayDiv.classList.contains('overlayMemory')) { return; }

            let scrollbar = document.getElementById('pocketScrollBarSegment0');
            let handle = scrollbar.querySelector('.pocketScrollBarSegmentActive');
            
            // for center to be on pageY, top needs to be at pageY - handleHeight/2
            let calculatedTop = pageY - handle.getClientRects()[0].height/2 - 10;
            let maximumScrollAmount = scrollbar.getClientRects()[0].height - handle.getClientRects()[0].height - 10;
            handle.style.top = Math.max(10, Math.min(maximumScrollAmount, calculatedTop)) + 'px'; //(100 * percentageBetween) + 'px';

            setContainerScrollToScrollbarPosition();
        }

        var pocketPointerDown = false;
        document.addEventListener('pointerdown', function(_e) {
            pocketPointerDown = true;
        });
        document.addEventListener('pointerup', function(_e) {
            pocketPointerDown = false;
            scrollbarPointerDown = false;
            highlightAvailableMemoryContainers(false); // always un-highlight when release pointer
        });

        for (var i = 0; i < numChapters; i++) {
            var segmentButton = document.createElement('div');
            segmentButton.className = 'pocketScrollBarSegment';
            segmentButton.id = 'pocketScrollBarSegment' + i;
            // segmentButton.style.height = (scrollbarHeight / numChapters - marginBetweenSegments) + 'px';
            // segmentButton.style.top = (scrollbarHeightDifference/2 - marginBetweenSegments/2) + (i * scrollbarHeight / numChapters) + 'px';
            segmentButton.style.top = '10px';
            
            var segmentActiveDiv = document.createElement('div');
            segmentActiveDiv.className = 'pocketScrollBarSegmentActive';
            if (i > 0) {
                segmentActiveDiv.style.visibility = 'hidden';
            }
            segmentButton.appendChild(segmentActiveDiv);

            segmentActiveDiv.style.height = 'calc(' + (100 * pageHeight / paletteHeight) + '% - 20px)';
            
            segmentButton.dataset.index = i;
            
            segmentButton.addEventListener('pointerdown', function(e) {
                console.log('tapped segment ' + e.currentTarget.dataset.index);
                scrollbarPointerDown = true;
                scrollbarPointerDownY = e.pageY;
                
                let tappedOnHandle = e.target.classList.contains('pocketScrollBarSegmentActive');

                let scrollbar = document.getElementById('pocketScrollBarSegment0');
                let handle = scrollbar.querySelector('.pocketScrollBarSegmentActive');
                
                if (tappedOnHandle) {
                    scrollbarHandleInitialOffset = parseFloat(handle.style.top) || 10;
                } else {
                    jumpScrollbarToPosition(e.pageY);
                    scrollbarHandleInitialOffset = parseFloat(handle.style.top) || 10;
                }
                
                hideAllSegmentSelections();
                selectSegment(e.currentTarget);
                scrollPocketForTouch(e);
                
                // deselect highlighted item
                if (selectedElement) {
                    deselectElement(selectedElement);
                    selectedElement = null;
                    hideTargetObjectLabel();
                }
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

                // deselect highlighted item
                if (selectedElement) {
                    deselectElement(selectedElement);
                    selectedElement = null;
                    hideTargetObjectLabel();
                }
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
                if (!pocketPointerDown  || !scrollbarPointerDown) { return; }
                scrollPocketForTouch(e);
            });
            segmentButton.addEventListener('gotpointercapture', function(evt) {
                evt.target.releasePointerCapture(evt.pointerId);
            });
            scrollbar.appendChild(segmentButton);
            allSegmentButtons.push(segmentButton);
        }
    }

    /**
     * Adds blue corners to each pocket icon container
     */
    function finishStylingPocket() {
        Array.from(document.querySelectorAll('.palette-element')).forEach(function(paletteElement) {
            // remove existing ones if needed, to ensure size is correct
            var cornersFound = paletteElement.querySelector('.corners');
            if (cornersFound) {
                paletteElement.removeChild(cornersFound);
            }
            // add new corners to each icon container
            realityEditor.gui.moveabilityCorners.wrapDivWithCorners(paletteElement, 0, true, null, null, 1);
        });

        // style the memory containers if needed
        if (overlayDiv.classList.contains('overlayMemory')) {
            highlightAvailableMemoryContainers(true);
        } else {
            highlightAvailableMemoryContainers(false);
        }

    }
    
    function highlightAvailableMemoryContainers(shouldHighlight) {
        let pocketDiv = document.querySelector('.pocket');
        
        if (shouldHighlight) {
            Array.from(pocketDiv.querySelectorAll('.memoryContainer')).filter(function(element) {
                return !(element.classList.contains('nodeMemoryContainer') || element.dataset.objectId);
            }).forEach(function(element) {
                element.classList.add('availableContainer');
            });
        } else {
            Array.from(pocketDiv.querySelectorAll('.memoryContainer')).forEach(function(element) {
                element.classList.remove('availableContainer');
            });
        }
    }
    exports.highlightAvailableMemoryContainers = highlightAvailableMemoryContainers;

    exports.pocketInit = pocketInit;
    exports.pocketShown = pocketShown;
    exports.pocketShow = pocketShow;
    exports.pocketHide = pocketHide;
    
    exports.onPocketButtonEnter = onPocketButtonEnter;
    exports.onPocketButtonUp = onPocketButtonUp;
    exports.onBigPocketButtonEnter = onBigPocketButtonEnter;
    exports.onHalfPocketButtonEnter = onHalfPocketButtonEnter;

    exports.addElementHighlightFilter = addElementHighlightFilter;
    
    exports.getRealityElements = getRealityElements;
    
    exports.createFrame = createFrame;
    exports.addTutorialFrame = addTutorialFrame;

    exports.getAttachesTo = getAttachesTo;

    // in case window size is adjusted, these can be called
    exports.getWidth = getWidth;
    exports.onWindowResized = onWindowResized;
    exports.createPocketScrollbar = createPocketScrollbar;
    
}(realityEditor.gui.pocket));
