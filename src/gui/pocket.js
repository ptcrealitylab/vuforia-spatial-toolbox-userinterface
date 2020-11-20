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

        addedLogic.scale = globalStates.defaultScale / 2; // logic nodes are naturally larger so make them smaller
        //closestObject ? closestObject.averageScale : globalStates.defaultScale;
        addedLogic.screenZ = 1000;
        addedLogic.loaded = false;
        addedLogic.matrix = [];

        // make sure that logic nodes only stick to 2.0 server version
        if(realityEditor.network.testVersion(closestObjectKey) > 165) {
            console.log('created node with logic key ' + logicKey + ' and added to ' + closestFrameKey);
            closestFrame.nodes[logicKey] = addedLogic;

            // render it
            var nodeUrl = "http://" + closestObject.ip + ":" + realityEditor.network.getPortByIp(closestObject.ip) + "/nodes/logic/index.html";
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

    function pocketInit() {
        pocket = document.querySelector('.pocket');
        palette = document.querySelector('.palette');
        nodeMemoryBar = document.querySelector('.nodeMemoryBar');

        const pocketScrollContainer = document.getElementById('pocketScrollContainer');
        pocketScrollContainer.addEventListener('touchmove', function(event) {
            // Prevent normal scrolling since we have the scroll touch bar
            event.preventDefault();
        });

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

        // console.log(aggregateFrames);
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

        for (let i = 0; i < realityElements.length; i++) {
            if (!realityElements[i]) continue;

            var element = realityElements[i].properties;

            var container = document.createElement('div');
            container.classList.add('element-template');
            container.id = 'pocket-element';
            // container.position = 'relative';

            if (element === null) {
                // this is just a placeholder to fill out the last row
                container.dataset.src = '_PLACEHOLDER_';
            } else {
                // var thisUrl = 'frames/' + element.name + '.html';
                var thisUrl = 'http://' + realityElements[i].proxyIP + ':' + realityEditor.network.getPortByIp(realityElements[i].proxyIP) + '/frames/' + element.name + '/index.html';
                // var gifUrl = 'frames/pocketAnimations/' + element.name + '.gif';
                var gifUrl = 'http://' + realityElements[i].proxyIP + ':' + realityEditor.network.getPortByIp(realityElements[i].proxyIP) + '/frames/' + element.name + '/icon.gif';
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

            }

            palette.appendChild(container);
        }

        // save this so we can avoid re-building the pocket the next time, if nothing changes between now and then
        previousPocketChecksum = getChecksumForPocketElements(realityElements);
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
        // TODO: ensure that it fails safely if the corresponding server doesn't have a frame named uiTutorial
        let addedElement = createFrame('uiTutorial', JSON.stringify({x: 0, y: 0}), JSON.stringify(568), JSON.stringify(420), JSON.stringify([]), globalStates.height/2, globalStates.width/2, undefined, objectKey);
        console.log('added tutorial frame', addedElement);
    }

    /**
     * Uses information from the pocket representation of a frame, to create and add a new frame to the scene.
     * Also posts the frame to the server. And begins touch interaction to drag the frame around (unless noUserInteraction=true)
     * Most parameters are stringified. // todo: parse them outside of function and pass in values of correct type
     * @param {string} name
     * @param {string} startPositionOffset - stringified object with x and y property
     * @param {string} width - stringified frame width
     * @param {string} height - stringified frame height
     * @param {string} nodesList - stringified array of JSON data, one per node, with properties for name, type, etc
     * @param {number} x - where to center the frame (touch x position)
     * @param {number} y - where to center the frame (touch y position)
     * @param {boolean|undefined} noUserInteraction
     * @param {string|undefined} objectKeyToAddTo - if undefined, attaches frame to closest object. otherwise attaches to specified object
     * @return {Frame}
     */
    function createFrame(name, startPositionOffset, width, height, nodesList, x, y, noUserInteraction, objectKeyToAddTo) {

        // TODO: only attach to closest object when you release - until then store in pocket and render with identity matrix
        // TODO: this would make it easier to drop exactly on the the object you want
        
        var closestObjectKey;
        
        if (typeof objectKeyToAddTo !== 'undefined') {
            closestObjectKey = objectKeyToAddTo;
        
        } else {
            closestObjectKey = realityEditor.network.availableFrames.getBestObjectInfoForFrame(name); // TODO: use this method to find best destination when you move a frame between objects, too
        }
        
        console.log('add frame to ' + closestObjectKey);
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
            if (width !== 'undefined') {
                frame.frameSizeX = width;
                frame.width = frame.frameSizeX;
            }
            if (height !== 'undefined') {
                frame.frameSizeY = height;
                frame.height = frame.frameSizeY;
            }

            // console.log("closest Frame", closestObject.averageScale);

            frame.location = 'global';
            frame.src = name;

            // set other properties

            frame.animationScale = 0;
            frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
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
            var LOAD_NODES_FROM_SERVER = true;
            if (!LOAD_NODES_FROM_SERVER) {

                var nodes = JSON.parse(nodesList);
                var hasMultipleNodes = nodes.length > 1;
                nodes.forEach(function (node) {

                    if (typeof node !== "object") return;
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

                    if (typeof node.defaultValue !== 'undefined') {
                        addedNode.data.value = node.defaultValue;
                    }
                });
            }

            // // set the eventObject so that the frame can interact with screens as soon as you add it
            realityEditor.device.eventObject.object = closestObjectKey;
            realityEditor.device.eventObject.frame = frameID;
            realityEditor.device.eventObject.node = null;

            closestObject.frames[frameID] = frame;

            realityEditor.sceneGraph.addFrame(frame.objectId, frameID, frame, frame.ar.matrix);

            console.log(frame);
            // send it to the server
            // realityEditor.network.postNewLogicNode(closestObject.ip, closestObjectKey, closestFrameKey, logicKey, addedLogic);
            realityEditor.network.postNewFrame(closestObject.ip, closestObjectKey, frame);

            if (!noUserInteraction) {
                realityEditor.gui.pocket.setPocketFrame(frame, {pageX: x, pageY: y}, closestObjectKey);
            }

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

        finishStylingPocket();
        
        // scroll to top if holding memory
        if (overlayDiv.classList.contains('overlayMemory')) {
            var scrollContainer = document.getElementById('pocketScrollContainer');
            scrollContainer.scrollTop = 0;
        }
    }

    function pocketHide() {
        pocket.classList.remove('pocketShown');
        realityEditor.gui.menus.buttonOff(['pocket']);
        isPocketTapped = false;
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
        var numMemoryContainers = 4;
        if (TEMP_DISABLE_MEMORIES) {
            numMemoryContainers = 0;
        }
        var realityElements = getRealityElements();
        var numFrames = realityElements.length + numMemoryContainers;
        var pageHeight = window.innerHeight; //320;
        var frameHeight = 360;
        try {
            frameHeight = Math.floor(parseFloat(window.getComputedStyle( document.querySelector('#pocket-element') ).width)) - 6;
        } catch (e) {
            console.warn('error parsing real pocket icon height from html elements, defaulting to 360px');
        }
        var paddingHeight = 6; //parseFloat(document.querySelector('#pocket-element').style.margin) * 2;
        var framesPerRow = 4;
        var numRows = Math.ceil(numFrames / framesPerRow);
        // A "chapter" is a section/segment on the scroll bar that you can tap to jump to that section of frames
        var numChapters = Math.max(1, Math.ceil( (numRows * (frameHeight + paddingHeight)) / pageHeight ) - 1); // minus one because we can scroll to end using previous bar segment

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
        
        var marginBetweenSegments = 10;
        var scrollbarHeight = 320; // matches menu height of sidebar buttons
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

        function scrollPocketForTouch(e) {
            // don't scroll if holding a memory
            if (overlayDiv.classList.contains('overlayMemory')) { return; }
            
            var index = parseInt(e.currentTarget.dataset.index);
            var segmentTop = e.currentTarget.getClientRects()[0].top;
            var segmentBottom = e.currentTarget.getClientRects()[0].bottom;
            var percentageBetween = (e.clientY - segmentTop) / (segmentBottom - segmentTop);
            var scrollContainer = document.getElementById('pocketScrollContainer');
            scrollContainer.scrollTop = (index + percentageBetween) * pageHeight;
        }
        
        var pocketPointerDown = false;
        document.addEventListener('pointerdown', function(_e) {
            pocketPointerDown = true;
        });
        document.addEventListener('pointerup', function(_e) {
            pocketPointerDown = false;
            highlightAvailableMemoryContainers(false); // always un-highlight when release pointer
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
            
            segmentButton.addEventListener('pointerdown', function(e) {
                console.log('tapped segment ' + e.currentTarget.dataset.index);
                hideAllSegmentSelections();
                selectSegment(e.currentTarget);
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
        [].slice.call(document.querySelectorAll('.palette-element')).forEach(function(paletteElement) {
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
    
}(realityEditor.gui.pocket));
