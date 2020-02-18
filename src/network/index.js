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

createNameSpace("realityEditor.network");

/**
 * @type {Array.<{messageName: string, callback: function}>}
 */
realityEditor.network.postMessageHandlers = [];

/**
 * Creates an extendable method for other modules to register callbacks that will be triggered
 * from onInternalPostMessage events, without creating circular dependencies
 * @param {string} messageName
 * @param {function} callback
 */
realityEditor.network.addPostMessageHandler = function(messageName, callback) {
    this.postMessageHandlers.push({
        messageName: messageName,
        callback: callback
    });
};

/**
 * @type {Array.<{messageName: string, callback: function}>}
 */
realityEditor.network.udpMessageHandlers = [];

/**
 * Creates an extendable method for other modules to register callbacks that will be triggered
 * when the interface receives any UDP message, without creating circular dependencies
 * @param {string} messageName
 * @param {function} callback
 */
realityEditor.network.addUDPMessageHandler = function(messageName, callback) {
    this.udpMessageHandlers.push({
        messageName: messageName,
        callback: callback
    });
};

/**
 * @type {Array.<function>}
 */
realityEditor.network.objectDiscoveredCallbacks = [];

/**
 * Allow other modules to be notified when a new object is discovered and added to the system.
 * @param {function} callback
 */
realityEditor.network.addObjectDiscoveredCallback = function(callback) {
    this.objectDiscoveredCallbacks.push(callback);
};

/**
 * Converts an object with version < 1.7.0 to the new format:
 * Objects now have frames, which can have nodes, but in the old version there were no frames
 *  and the nodes just existed on the object itself
 * @param {Object} thisObject
 * @param {string} objectKey
 * @param {string} frameKey
 */
realityEditor.network.oldFormatToNew = function (thisObject, objectKey, frameKey) {
    if (typeof frameKey === "undefined") {
        frameKey = objectKey;
    }
    var _this = this;

    if (thisObject.integerVersion < 170) {

        _this.utilities.rename(thisObject, "folder", "name");
        _this.utilities.rename(thisObject, "objectValues", "nodes");
        _this.utilities.rename(thisObject, "objectLinks", "links");
        delete thisObject["matrix3dMemory"];

        if (!thisObject.frames) thisObject.frames = {};

        thisObject.frames[frameKey].name = thisObject.name;
        thisObject.frames[frameKey].nodes = thisObject.nodes;
        thisObject.frames[frameKey].links = thisObject.links;

        for (let linkKey in objects[objectKey].frames[frameKey].links) {
            thisObject = objects[objectKey].frames[frameKey].links[linkKey];

            _this.utilities.rename(thisObject, "ObjectA", "objectA");
            _this.utilities.rename(thisObject, "locationInA", "nodeA");
            if (!thisObject.frameA) thisObject.frameA = thisObject.objectA;
            _this.utilities.rename(thisObject, "ObjectNameA", "nameA");

            _this.utilities.rename(thisObject, "ObjectB", "objectB");
            _this.utilities.rename(thisObject, "locationInB", "nodeB");
            if (!thisObject.frameB) thisObject.frameB = thisObject.objectB;
            _this.utilities.rename(thisObject, "ObjectNameB", "nameB");
            _this.utilities.rename(thisObject, "endlessLoop", "loop");
            _this.utilities.rename(thisObject, "countLinkExistance", "health");
        }

        /*for (var nodeKey in objects[objectKey].nodes) {
         _this.utilities.rename(objects[objectKey].nodes, nodeKey, objectKey + nodeKey);
         }*/
        for (let nodeKey in objects[objectKey].frames[frameKey].nodes) {
            thisObject = objects[objectKey].frames[frameKey].nodes[nodeKey];
            _this.utilities.rename(thisObject, "plugin", "type");
            _this.utilities.rename(thisObject, "appearance", "type");

            if (thisObject.type === "default") {
                thisObject.type = "node";
            }


            thisObject.data = {
                value: thisObject.value,
                mode: thisObject.mode,
                unit: "",
                unitMin: 0,
                unitMax: 1
            };
            delete thisObject.value;
            delete thisObject.mode;

        }

    }

    objects[objectKey].uuid = objectKey;
    objects[objectKey].frames[frameKey].uuid = frameKey;

    for (let nodeKey in objects[objectKey].frames[frameKey].nodes) {
        objects[objectKey].frames[frameKey].nodes[nodeKey].uuid = nodeKey;
    }

    for (let linkKey in objects[objectKey].frames[frameKey].links) {
        objects[objectKey].frames[frameKey].links[linkKey].uuid = linkKey;
    }

};

/**
 * Properly initialize all the temporary, editor-only state for an object when it first gets added
 * @param {string} objectKey
 */
realityEditor.network.onNewObjectAdded = function(objectKey) {
    realityEditor.app.tap();

    var thisObject = realityEditor.getObject(objectKey);
    // this is a work around to set the state of an objects to not being visible.
    realityEditor.gui.ar.draw.setObjectVisible(thisObject, false);
    thisObject.screenZ = 1000;
    thisObject.fullScreen = false;
    thisObject.sendMatrix = false;
    thisObject.sendMatrices = {
        modelView : false,
        devicePose : false,
        groundPlane : false,
        allObjects : false
    };
    thisObject.sendScreenPosition = false;
    thisObject.sendAcceleration = false;
    thisObject.integerVersion = parseInt(objects[objectKey].version.replace(/\./g, ""));

    if (typeof thisObject.matrix === 'undefined') {
        thisObject.matrix = [];
    }

    for (let frameKey in objects[objectKey].frames) {
        var thisFrame = realityEditor.getFrame(objectKey, frameKey);

        // thisFrame.objectVisible = false; // gets set to false in draw.setObjectVisible function
        thisFrame.screenZ = 1000;
        thisFrame.fullScreen = false;
        thisFrame.sendMatrix = false;
        thisFrame.sendMatrices = {
            modelView : false,
            devicePose : false,
            groundPlane : false,
            allObjects : false
        };
        thisFrame.sendScreenPosition = false;
        thisFrame.sendAcceleration = false;
        thisFrame.integerVersion = parseInt(objects[objectKey].version.replace(/\./g, ""));
        thisFrame.visible = false;
        thisFrame.objectId = objectKey;

        if (typeof thisFrame.developer === 'undefined') {
            thisFrame.developer = true;
        }

        var positionData = realityEditor.gui.ar.positioning.getPositionData(thisFrame);

        if (positionData.matrix === null || typeof positionData.matrix !== "object") {
            positionData.matrix = [];
        }

        for (let nodeKey in objects[objectKey].frames[frameKey].nodes) {
            var thisNode = objects[objectKey].frames[frameKey].nodes[nodeKey];
            if (thisNode.matrix === null || typeof thisNode.matrix !== "object") {
                thisNode.matrix = [];
            }

            thisNode.objectId = objectKey;
            thisNode.frameId = frameKey;
            thisNode.loaded = false;
            thisNode.visible = false;

            if (typeof thisNode.publicData !== 'undefined') {
                if (!publicDataCache.hasOwnProperty(frameKey)) {
                    publicDataCache[frameKey] = {};
                }
                publicDataCache[frameKey][thisNode.name] = thisNode.publicData;
                console.log('set public data of ' + frameKey + ', ' + thisNode.name + ' to: ' + thisNode.publicData);
            }

            if (thisNode.type === "logic") {
                thisNode.guiState = new LogicGUIState();
                let container = document.getElementById('craftingBoard');
                thisNode.grid = new realityEditor.gui.crafting.grid.Grid(container.clientWidth - realityEditor.gui.crafting.menuBarWidth, container.clientHeight, CRAFTING_GRID_WIDTH, CRAFTING_GRID_HEIGHT, thisObject.uuid);
                //_this.realityEditor.gui.crafting.utilities.convertLinksFromServer(thisObject);
            }
        }
        
        // TODO: invert dependency
        realityEditor.gui.ar.grouping.reconstructGroupStruct(frameKey, thisFrame);
    }

    if (!thisObject.protocol) {
        thisObject.protocol = "R0";
    }

    objects[objectKey].uuid = objectKey;

    for (let frameKey in objects[objectKey].frames) {
        objects[objectKey].frames[frameKey].uuid = frameKey;
        for (let nodeKey in objects[objectKey].frames[frameKey].nodes) {
            objects[objectKey].frames[frameKey].nodes[nodeKey].uuid = nodeKey;
        }

        for (let linkKey in objects[objectKey].frames[frameKey].links) {
            objects[objectKey].frames[frameKey].links[linkKey].uuid = linkKey;
        }
    }

    realityEditor.gui.ar.utilities.setAverageScale(objects[objectKey]);

    this.cout(JSON.stringify(objects[objectKey]));

    // todo this needs to be looked at
    realityEditor.gui.memory.addObjectMemory(objects[objectKey]);

    // notify subscribed modules that a new object was added
    realityEditor.network.objectDiscoveredCallbacks.forEach(function(callback) {
        callback(objects[objectKey], objectKey);
    });
};

/**
 * Looks at an object heartbeat, and if the object hasn't been added yet, downloads it and initializes all appropriate state
 * @param {{id: string, ip: string, vn: number, tcs: string, zone: string}} beat - object heartbeat received via UDP
 */
realityEditor.network.addHeartbeatObject = function (beat) {
    if (beat.id) {
        if (!objects[beat.id]) {
            // download the object data from its server
            this.getData(beat.id, null, null, 'http://' + beat.ip + ':' + httpPort + '/object/' + beat.id, function (objectKey, frameKey, nodeKey, msg) {
                if (msg && objectKey) {
                    // add the object
                    objects[objectKey] = msg;
                    // initialize temporary state and notify other modules
                    realityEditor.network.onNewObjectAdded(objectKey);
                    
                    var doesDeviceSupportJPGTargets = true; // TODO: verify this somehow instead of always true
                    if (doesDeviceSupportJPGTargets) {
                        // this tries DAT first, then resorts to JPG if DAT not found
                        realityEditor.app.targetDownloader.downloadAvailableTargetFiles(beat);
                    } else {
                        // download XML, DAT, and initialize tracker
                        realityEditor.app.targetDownloader.downloadTargetFilesForDiscoveredObject(beat);
                    }
                    
                    // check if onNewServerDetected callbacks should be triggered
                    realityEditor.network.checkIfNewServer(beat.ip);//, objectKey);
                }
            });
        }
    }
};

realityEditor.network.knownServers = []; // todo: make private to module
realityEditor.network.newServerDetectedCallbacks = [];

/**
 * Register a callback that will trigger for each serverIP currently known to the system and each new one as it is detected
 * @todo: use this method more consistently across the codebase instead of several modules implementing similar behavior
 * @param {function} callback
 */
realityEditor.network.onNewServerDetected = function(callback) {
    // register callback for future detections
    this.newServerDetectedCallbacks.push(callback);
    
    // immediate trigger for already known servers
    this.knownServers.forEach(function(serverIP) {
        callback(serverIP);
    });
};

/**
 * Checks if a server has already been detected, and if not, detect it and trigger callbacks
 * @param {string} serverIP
 */
realityEditor.network.checkIfNewServer = function (serverIP) {
    var foundExistingMatch = this.knownServers.indexOf(serverIP) > -1; // TODO: make robust against different formatting of "same" IP
    
    if (!foundExistingMatch) {
        this.knownServers.push(serverIP);
        
        // trigger callbacks
        this.newServerDetectedCallbacks.forEach(function(callback) {
            callback(serverIP);
        });
    }
};

/**
 * Updates an entire object, including all of its frames and nodes, to be in sync with the remote version on the server
 * @param {Objects} origin - the local copy of the Object
 * @param {Objects} remote - the copy of the Object downloaded from the server
 * @param {string} objectKey
 */
realityEditor.network.updateObject = function (origin, remote, objectKey) {

    console.log(origin, remote, objectKey);
    
    origin.x = remote.x;
    origin.y = remote.y;
    origin.scale = remote.scale;

    if (remote.matrix) {
        origin.matrix = remote.matrix;
    }
    
    // update each frame in the object // TODO: create an updateFrame function, the same way we have an updateNode function
    for (let frameKey in remote.frames) {
        if (!remote.frames.hasOwnProperty(frameKey)) continue;
        if (!origin.frames[frameKey]) {
            origin.frames[frameKey] = remote.frames[frameKey];

            origin.frames[frameKey].width = remote.frames[frameKey].width || 300;
            origin.frames[frameKey].height = remote.frames[frameKey].height || 300;
            
            origin.frames[frameKey].uuid = frameKey;

            console.log('added new frame', origin.frames[frameKey]);
            
        } else {
            origin.frames[frameKey].visualization = remote.frames[frameKey].visualization;
            origin.frames[frameKey].ar = remote.frames[frameKey].ar;
            origin.frames[frameKey].screen = remote.frames[frameKey].screen;
            origin.frames[frameKey].name = remote.frames[frameKey].name;
            
            // now update each node in the frame
            var remoteNodes = remote.frames[frameKey].nodes;
            var originNodes = origin.frames[frameKey].nodes;
            
            for (let nodeKey in remoteNodes) {
                if (!remoteNodes.hasOwnProperty(nodeKey)) continue;

                var originNode = originNodes[nodeKey];
                var remoteNode = remoteNodes[nodeKey];
                realityEditor.network.updateNode(originNode, remoteNode, objectKey, frameKey, nodeKey);
            }

            // remove extra nodes from origin that don't exist in remote
            for (let nodeKey in originNodes) {
                if (originNodes.hasOwnProperty(nodeKey) && !remoteNodes.hasOwnProperty(nodeKey)) {
                    realityEditor.gui.ar.draw.deleteNode(objectKey, frameKey, nodeKey);
                }
            }
            
        }

        origin.frames[frameKey].links = JSON.parse(JSON.stringify(remote.frames[frameKey].links));

        // TODO: invert dependency
        realityEditor.gui.ar.grouping.reconstructGroupStruct(frameKey, origin.frames[frameKey]);
        
        if (globalDOMCache["iframe" + frameKey]) {
            if (globalDOMCache["iframe" + frameKey].getAttribute('loaded')) {
                realityEditor.network.onElementLoad(objectKey, frameKey, null);
            }
        }
    }

    // remove extra frames from origin that don't exist in remote
    for (let frameKey in origin.frames) {
        if (origin.frames.hasOwnProperty(frameKey) && !remote.frames.hasOwnProperty(frameKey)) {
            // delete origin.frames[frameKey];
            realityEditor.gui.ar.draw.deleteFrame(objectKey, frameKey);
        }
    }
};

/**
 * Updates a node (works for logic nodes too) to be in sync with the remote version on the server
 * @param {Node|Logic} origin - the local copy
 * @param {Node|Logic} remote - the copy downloaded from the server
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 */
realityEditor.network.updateNode = function (origin, remote, objectKey, frameKey, nodeKey) {

    var isRemoteNodeDeleted = (Object.keys(remote).length === 0 && remote.constructor === Object);

    // delete local node if it exists locally but not on the server
    if (origin && isRemoteNodeDeleted) {

        realityEditor.gui.ar.draw.deleteNode(objectKey, frameKey, nodeKey);

        var thisNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
        
        if (thisNode) {
            delete objects[objectKey].frames[frameKey].nodes[nodeKey];
        }
        return;
    }

    // create the local node if it exists on the server but not locally
    if (!origin) {

        origin = remote;

        if (origin.type === "logic") {
            if (!origin.guiState) {
                origin.guiState = new LogicGUIState();
            }

            if (!origin.grid) {
                let container = document.getElementById('craftingBoard');
                origin.grid = new realityEditor.gui.crafting.grid.Grid(container.clientWidth - realityEditor.gui.crafting.menuBarWidth, container.clientHeight, CRAFTING_GRID_WIDTH, CRAFTING_GRID_HEIGHT, origin.uuid);
            }

        }

        objects[objectKey].frames[frameKey].nodes[nodeKey] = origin;

    } else {
        // update the local node's properties to match the one on the server if they both exists

        origin.x = remote.x;
        origin.y = remote.y;
        origin.scale = remote.scale;
        origin.name = remote.name;
        origin.frameId = frameKey;
        origin.objectId = objectKey;
        
        if (remote.text) {
            origin.text = remote.text;
        }
        if (remote.matrix) {
            origin.matrix = remote.matrix;
        }
        origin.lockPassword = remote.lockPassword;
        origin.lockType = remote.lockType;
        origin.publicData = remote.publicData;
        // console.log("update node: lockPassword = " + remote.lockPassword + ", lockType = " + remote.lockType);

        // set up the crafting board for the local node if it's a logic node
        if (origin.type === "logic") {
            if (!origin.guiState) {
                origin.guiState = new LogicGUIState();
            }

            if (!origin.grid) {
                let container = document.getElementById('craftingBoard');
                origin.grid = new realityEditor.gui.crafting.grid.Grid(container.clientWidth - realityEditor.gui.crafting.menuBarWidth, container.clientHeight, CRAFTING_GRID_WIDTH, CRAFTING_GRID_HEIGHT, origin.uuid);
            }

        }

    }

    // if it's a logic node, update its logic blocks and block links to match the remote, and re-render them if the board is open
    if (remote.blocks) {
        this.utilities.syncBlocksWithRemote(origin, remote.blocks);
    }

    if (remote.links) {
        this.utilities.syncLinksWithRemote(origin, remote.links);
    }

    if (globalStates.currentLogic) {

        if (globalStates.currentLogic.uuid === nodeKey) {

            if (remote.type === 'logic') {
                realityEditor.gui.crafting.updateGrid(objects[objectKey].frames[frameKey].nodes[nodeKey].grid);
            }

            // console.log("YES");
            realityEditor.gui.crafting.forceRedraw(globalStates.currentLogic);

        }

    } else {
        // console.log("NO");

        if (globalDOMCache["iframe" + nodeKey]) {
            if (globalDOMCache["iframe" + nodeKey].getAttribute('loaded')) {
                realityEditor.network.onElementLoad(objectKey, frameKey, nodeKey);
            }
        }
    }

};

/**
 * When we receive any UDP message, this function triggers so that subscribed modules can react to specific messages
 * @param {string|object} message
 */
realityEditor.network.onUDPMessage = function(message) {
    if (typeof message === "string") {
        try {
            message = JSON.parse(message);
        } catch (error) {
            // error parsing JSON
        }
    }
    
    this.udpMessageHandlers.forEach(function(messageHandler) {
        if (typeof message[messageHandler.messageName] !== "undefined") {
            messageHandler.callback(message);
        }
    });
};

/**
 * When the app receives a UDP message with a field called "action", this gets triggered with the action contents.
 * Actions listened for include reload(Object|Frame|Node|Link), advertiseConnection, load(Memory|LogicIcon) and addFrame
 * @param {object|string} action
 */
realityEditor.network.onAction = function (action) {
    // console.log('onAction');
    var _this = this;
    var thisAction;
    if (typeof action === "object") {
        thisAction = action;
    } else {
        while (action.charAt(0) === '"') action = action.substr(1);
        while (action.charAt(action.length - 1) === ' ') action = action.substring(0, action.length - 1);
        while (action.charAt(action.length - 1) === '"') action = action.substring(0, action.length - 1);

        thisAction = {
            action: action
        };
    }

    if (thisAction.lastEditor === globalStates.tempUuid) {
        console.log(thisAction.lastEditor);
        console.log(globalStates.tempUuid);
        console.log("------------------------------------- its my self");
        return;
    }

    // reload links for a specific object.

    if (typeof thisAction.reloadLink !== "undefined") {
        // compatibility with old version where object was ID
        if (thisAction.reloadLink.id) {
            thisAction.reloadLink.object = thisAction.reloadLink.id;
            // TODO: BEN set thisAction.reloadFrame
        }

        if (thisAction.reloadLink.object in objects) {
            let urlEndpoint = 'http://' + objects[thisAction.reloadLink.object].ip + ':' + httpPort + '/object/' + thisAction.reloadLink.object + '/frame/' +thisAction.reloadLink.frame;
            this.getData(thisAction.reloadLink.object, thisAction.reloadLink.frame, null, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {
                
            // });
            // this.getData('http://' + objects[thisAction.reloadLink.object].ip + ':' + httpPort + '/object/' + thisAction.reloadLink.object + '/frame/' +thisAction.reloadLink.frame, thisAction.reloadLink.object, function (req, thisKey, frameKey) {

                var thisFrame = realityEditor.getFrame(objectKey, frameKey);
                if (objects[objectKey].integerVersion < 170) {

                    realityEditor.network.oldFormatToNew(objects[objectKey], objectKey, frameKey);
                    /*
                    objects[thisKey].links = req.links;
                    for (var linkKey in objects[thisKey].links) {
                        var thisObject = objects[thisKey].links[linkKey];

                        _this.utilities.rename(thisObject, "ObjectA", "objectA");
                        _this.utilities.rename(thisObject, "locationInA", "nodeA");
                        _this.utilities.rename(thisObject, "ObjectNameA", "nameA");

                        _this.utilities.rename(thisObject, "ObjectB", "objectB");
                        _this.utilities.rename(thisObject, "locationInB", "nodeB");
                        _this.utilities.rename(thisObject, "ObjectNameB", "nameB");
                        _this.utilities.rename(thisObject, "endlessLoop", "loop");
                        _this.utilities.rename(thisObject, "countLinkExistance", "health");
                    }
                    */
                }
                else {
                    thisFrame.links = res.links;
                }

                objects[objectKey].uuid = objectKey;
                thisFrame.uuid = frameKey;

                for (let nodeKey in thisFrame.nodes) {
                    thisFrame.nodes[nodeKey].uuid = nodeKey;
                }

                for (let linkKey in thisFrame.links) {
                    thisFrame.links[linkKey].uuid = linkKey;
                }

                // cout(objects[thisKey]);

                _this.cout("got links");
            });
        }
    }

    if (typeof thisAction.reloadObject !== "undefined") {
        console.log("gotdata");

        if (thisAction.reloadObject.object in objects) {

            let urlEndpoint = 'http://' + objects[thisAction.reloadObject.object].ip + ':' + httpPort + '/object/' + thisAction.reloadObject.object;
            this.getData(thisAction.reloadObject.object, thisAction.reloadObject.frame, null, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {

                if (objects[objectKey].integerVersion < 170) {
                    if (typeof res.objectValues !== "undefined") {
                        res.nodes = res.objectValues;
                    }
                }
                
                console.log("updateObject", objects[objectKey], res, objectKey);

                realityEditor.network.updateObject(objects[objectKey], res, objectKey);

                _this.cout("got object");

            });
        }
    }
    
    if (typeof thisAction.reloadFrame !== "undefined") {
        let thisFrame = realityEditor.getFrame(thisAction.reloadFrame.object, thisAction.reloadFrame.frame);
        if (!thisFrame) {
            console.log('this is a new frame... add it to the object...');

            // actionSender({reloadFrame: {object: objectID, frame: frameID, propertiesToIgnore: propertiesToIgnore}, lastEditor: body.lastEditor});
            thisFrame = new Frame();
            
            let thisObject = realityEditor.getObject(thisAction.reloadFrame.object);
            thisObject.frames[thisAction.reloadFrame.frame] = thisFrame;
        }
        
        if (thisFrame) {

            let urlEndpoint = 'http://' + objects[thisAction.reloadFrame.object].ip + ':' + httpPort + '/object/' + thisAction.reloadFrame.object + '/frame/' + thisAction.reloadFrame.frame;
            
            this.getData(thisAction.reloadFrame.object, thisAction.reloadFrame.frame, thisAction.reloadFrame.node, urlEndpoint, function(objectKey, frameKey, nodeKey, res) {
                console.log('got frame');
                
                for (let thisKey in res) {
                    if (!res.hasOwnProperty(thisKey)) continue;
                    if (!thisFrame.hasOwnProperty(thisKey)) continue;
                    if (thisAction.reloadFrame.propertiesToIgnore) {
                        if (thisAction.reloadFrame.propertiesToIgnore.indexOf(thisKey) > -1) continue;

                        // TODO: this is a temp fix to just ignore ar.x and ar.y but still send scale... find a more general way
                        if (thisKey === 'ar' &&
                            thisAction.reloadFrame.propertiesToIgnore.indexOf('ar.x') > -1 &&
                            thisAction.reloadFrame.propertiesToIgnore.indexOf('ar.y') > -1) {
                            
                            // this wasn't scaled -> update the x and y but not the scale
                            if (thisFrame.ar.scale === res.ar.scale && !thisAction.reloadFrame.wasTriggeredFromEditor) {
                                thisFrame.ar.x = res.ar.x;
                                thisFrame.ar.y = res.ar.y;
                            } else {
                                // this was scaled -> update the scale but not the x and y
                                thisFrame.ar.scale = res.ar.scale;
                            }
                            continue;
                        }
                        
                        // only rewrite existing properties of nodes, otherwise node.loaded gets removed and another element added
                        if (thisKey === 'nodes') {
                            for (let nodeKey in res.nodes) {
                                if (!thisFrame.nodes.hasOwnProperty(nodeKey)) {
                                    thisFrame.nodes[nodeKey] = res.nodes[nodeKey];
                                } else {
                                    for (let propertyKey in res.nodes[nodeKey]) {
                                        if (propertyKey === 'loaded') { continue; }
                                        thisFrame.nodes[nodeKey][propertyKey] = res.nodes[nodeKey][propertyKey];
                                    }
                                }
                            }
                            continue;
                        }
                    }
                    
                    thisFrame[thisKey] = res[thisKey];
                }

                // TODO: invert dependency
                realityEditor.gui.ar.grouping.reconstructGroupStruct(frameKey, thisFrame);

            });
        }
    }

    if (typeof thisAction.reloadNode !== "undefined") {
        console.log("gotdata: " + thisAction.reloadNode.object + " " + thisAction.reloadNode.frame+ " " + thisAction.reloadNode.node);
       // console.log('http://' + objects[thisAction.reloadNode.object].ip + ':' + httpPort + '/object/' + thisAction.reloadNode.object + "/node/" + thisAction.reloadNode.node + "/");
       let thisFrame = realityEditor.getFrame(thisAction.reloadNode.object, thisAction.reloadNode.frame);
       
        if (thisFrame !== null) {
            // TODO: getData         webServer.get('/object/*/') ... instead of /object/node

            let urlEndpoint = 'http://' + objects[thisAction.reloadNode.object].ip + ':' + httpPort + '/object/' + thisAction.reloadNode.object + '/frame/' + thisAction.reloadNode.frame + '/node/' + thisAction.reloadNode.node + '/';
            this.getData(thisAction.reloadObject.object, thisAction.reloadObject.frame, thisAction.reloadObject.node, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {

            // this.getData(
                // 'http://' + objects[thisAction.reloadNode.object].ip + ':' + httpPort + '/object/' + thisAction.reloadNode.object + "/node/" + thisAction.reloadNode.node + "/", thisAction.reloadNode.object, function (req, objectKey, frameKey, nodeKey) {

                    console.log("------------------------------");
                    console.log(objectKey + "  " + frameKey + " " + nodeKey);

                    var thisFrame = realityEditor.getFrame(objectKey, frameKey);

                    if (!thisFrame.nodes[nodeKey]) {
                        thisFrame.nodes[nodeKey] = res;
                    } else {
                        realityEditor.network.updateNode(thisFrame.nodes[nodeKey], res, objectKey, frameKey, nodeKey);
                    }
                    
                    _this.cout("got object");

                }, thisAction.reloadNode.node);
        }
    }
    
    if (typeof thisAction.advertiseConnection !== "undefined") {
        if (realityEditor.gui.settings.toggleStates.instantState) {
            realityEditor.gui.instantConnect.logic(thisAction.advertiseConnection);
        }
    }
    
    if (thisAction.loadMemory) {
        var id = thisAction.loadMemory.object;
        let urlEndpoint = 'http://' + thisAction.loadMemory.ip + ':' + httpPort + '/object/' + id;

        this.getData(id, null, null, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {

            // this.getData(url, id, function (req, thisKey) {
            _this.cout('received memory', res.memory);
            objects[objectKey].memory = res.memory;
            objects[objectKey].memoryCameraMatrix = res.memoryCameraMatrix;
            objects[objectKey].memoryProjectionMatrix = res.memoryProjectionMatrix;
            
            // _this.realityEditor.gui.memory.addObjectMemory(objects[objectKey]);
        });
    }
    
    if (thisAction.loadLogicIcon) {
        this.loadLogicIcon(thisAction.loadLogicIcon);
    }
    
    if (thisAction.addFrame) {
        console.log("addFrame");
        
        let thisObject = realityEditor.getObject(thisAction.addFrame.objectID);
        
        if (thisObject) {
            
            var frame = new Frame();
            
            frame.objectId = thisAction.addFrame.objectID;
            frame.name = thisAction.addFrame.name;

            var frameID = frame.objectId + frame.name;
            frame.uuid = frameID;

            frame.ar.x = thisAction.addFrame.x;
            frame.ar.y = thisAction.addFrame.y;
            frame.ar.scale = thisAction.addFrame.scale;
            frame.frameSizeX = thisAction.addFrame.frameSizeX;
            frame.frameSizeY = thisAction.addFrame.frameSizeY;
            
            frame.location = thisAction.addFrame.location;
            frame.src = thisAction.addFrame.src;
            
            // set other properties
            
            frame.animationScale = 0;
            frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
            frame.width = frame.frameSizeX;
            frame.height = frame.frameSizeY;
            frame.loaded = false;
            // frame.objectVisible = true;
            frame.screen = {
                x: frame.ar.x,
                y: frame.ar.y,
                scale: frame.ar.scale,
                matrix: frame.ar.matrix
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
            frame.sendScreenPosition = false;
            frame.sendAcceleration = false;
            frame.integerVersion = 300; //parseInt(objects[objectKey].version.replace(/\./g, ""));
            // thisFrame.visible = false;
            
            var nodeNames = thisAction.addFrame.nodeNames;
            nodeNames.forEach(function(nodeName) {
                var nodeUuid = frameID + nodeName;
                frame.nodes[nodeUuid] = new Node();
                var addedNode = frame.nodes[nodeUuid];
                addedNode.objectId = thisAction.addFrame.objectID;
                addedNode.frameId = frameID;
                addedNode.name = nodeName;
                addedNode.text = undefined;
                addedNode.type = 'node';
                addedNode.x = 0; //realityEditor.utilities.randomIntInc(0, 200) - 100;
                addedNode.y = 0; //realityEditor.utilities.randomIntInc(0, 200) - 100;
                addedNode.frameSizeX = 100;
                addedNode.frameSizeY = 100;

            });
            
            thisObject.frames[frameID] = frame;
            
        }
        

        // if (objects) {
        //     var thisObject = objects[thisAction.addFrame.objectID];
        //    
        //    
        //
        //     var urlEndpoint = 'http://' + objects[thisAction.reloadObject.object].ip + ':' + httpPort + '/object/' + thisAction.reloadObject.object;
        //     this.getData(thisAction.reloadObject.object, thisAction.reloadObject.frame, null, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {
        //
        //         // }
        //         // this.getData('http://' + objects[thisAction.reloadObject.object].ip + ':' + httpPort + '/object/' + thisAction.reloadObject.object, thisAction.reloadObject.object, function (req, thisKey) {
        //
        //         if (objects[objectKey].integerVersion < 170) {
        //             if (typeof res.objectValues !== "undefined") {
        //                 res.nodes = res.objectValues;
        //             }
        //         }
        //
        //         console.log("updateObject", objects[objectKey], res, objectKey, frameKey);
        //
        //
        //         _this.cout("got object");
        //
        //     });
        // }
    }

    for (let key in thisAction) {
        this.cout("found action: " + JSON.stringify(key));
    }
};

/**
 * Gets triggered when an iframe makes a POST request to communicate with the Reality Editor via the object.js API
 * Also gets triggered when the settings.html (or other menus) makes a POST request
 * Modules can subscribe to these events by using realityEditor.network.addPostMessageHandler, in addition to the many
 * events already hard-coded into this method (todo: better organize these and move/distribute to the related modules)
 * @param {object|string} e - stringified or parsed event (works for either format)
 */
realityEditor.network.onInternalPostMessage = function (e) {
    var msgContent = {};
    
    // catch error when safari sends a misc event
    if (typeof e === 'object' && typeof e.data === 'object') {
        msgContent = e.data;
        
    } else if (e.data && typeof e.data !== 'object') {
        msgContent = JSON.parse(e.data);
    } else {
        msgContent = JSON.parse(e);
    }

    // iterates over all registered postMessageHandlers to trigger events in various modules
    this.postMessageHandlers.forEach(function(messageHandler) {
        if (typeof msgContent[messageHandler.messageName] !== 'undefined') {
            messageHandler.callback(msgContent[messageHandler.messageName], msgContent);
        }
    });
    
    if (typeof msgContent.settings !== "undefined") {
        realityEditor.network.onSettingPostMessage(msgContent);
        return;
    }
    
    if (msgContent.resendOnElementLoad) {
        var elt = document.getElementById('iframe' + msgContent.nodeKey);
        if (elt) {
            var data = elt.dataset;
            realityEditor.network.onElementLoad(data.objectKey, data.frameKey, data.nodeKey);
        }
    }

    var tempThisObject = {};
    var thisVersionNumber = msgContent.version || 0; // defaults to 0 if no version included

    if (thisVersionNumber >= 170) {
        if ((!msgContent.object) || (!msgContent.object)) return; // TODO: is this a typo? checks identical condition twice
    } else {
        if ((!msgContent.obj) || (!msgContent.pos)) return;
        msgContent.object = msgContent.obj;
        msgContent.frame = msgContent.obj;
        msgContent.node = msgContent.pos;
    }
    
    // var thisFrame = realityEditor.getFrame(msgContent.object, msgContent.frame);
    // var thisNode = realityEditor.getNode(msgContent.node);
    // var activeVehicle = thisNode || thisFrame;
    
    // var activeKey = null;
    
    if (msgContent.node) {
        tempThisObject = realityEditor.getNode(msgContent.object, msgContent.frame, msgContent.node);
    } else if (msgContent.frame) {
        tempThisObject = realityEditor.getFrame(msgContent.object, msgContent.frame);
    } else if (msgContent.object) {
        tempThisObject = realityEditor.getObject(msgContent.object);
    }
    
    // make it work for pocket items too
    if (!tempThisObject && msgContent.object &&  msgContent.object in pocketItem) {
        if (msgContent.node && msgContent.frame) {
            tempThisObject = pocketItem[msgContent.object].frames[msgContent.frame].nodes[msgContent.node];
        } else if (msgContent.frame) {
            tempThisObject = pocketItem[msgContent.object].frames[msgContent.frame];
        } else {
            tempThisObject = pocketItem[msgContent.object];
        }
    }
    
    tempThisObject = tempThisObject || {};

    // TODO: bring this pack to make pocketItem part work

    /*
if (thisFrame) {
    if (msgContent.node && (msgContent.node in thisFrame.nodes)) {
        tempThisObject = thisFrame.nodes[msgContent.node];
    } else {
        tempThisObject = thisFrame;
    }


} else if (msgContent.frame in pocketItem) {
    if (msgContent.node === msgContent.object) {
        tempThisObject = pocketItem[msgContent.frame];
    } else {
        if (msgContent.node in pocketItem[msgContent.frame].nodes) {
            tempThisObject = pocketItem[msgContent.frame].nodes[msgContent.node];
        } else return;
    }

} else return;
*/

    // if (msgContent.node && msgContent.width && msgContent.height) {
    //     var thisMsgNode = document.getElementById(msgContent.node);
    //     var top = ((globalStates.width - msgContent.height) / 2);
    //     var left = ((globalStates.height - msgContent.width) / 2);
    //     thisMsgNode.style.width = msgContent.width;
    //     thisMsgNode.style.height = msgContent.height;
    //     thisMsgNode.style.top = top;
    //     thisMsgNode.style.left = left;
    //
    //     thisMsgNode = document.getElementById("iframe" + msgContent.node);
    //     thisMsgNode.style.width = msgContent.width;
    //     thisMsgNode.style.height = msgContent.height;
    //     thisMsgNode.style.top = top;
    //     thisMsgNode.style.left = left;
    //
    //     if (tempThisObject.frameTouchSynthesizer) {
    //         var cover = tempThisObject.frameTouchSynthesizer.cover;
    //         cover.style.width = msgContent.width;
    //         cover.style.height = msgContent.height;
    //         cover.style.top = top;
    //         cover.style.left = left;
    //     }
    //
    // } 
    
    if (msgContent.width && msgContent.height) {
        let activeKey = msgContent.node ? msgContent.node : msgContent.frame;
        
        var overlay = document.getElementById(activeKey);
        var iFrame = document.getElementById('iframe' + activeKey);
        var svg = document.getElementById('svg' + activeKey);

        var top = ((globalStates.width - msgContent.height) / 2);
        var left = ((globalStates.height - msgContent.width) / 2);
        overlay.style.width = msgContent.width;
        overlay.style.height = msgContent.height;
        overlay.style.top = top;
        overlay.style.left = left;

        iFrame.style.width = msgContent.width;
        iFrame.style.height = msgContent.height;
        iFrame.style.top = top;
        iFrame.style.left = left;

        svg.style.width = msgContent.width;
        svg.style.height = msgContent.height;

        realityEditor.gui.ar.moveabilityOverlay.createSvg(svg);
        
        if (globalStates.editingMode || realityEditor.device.getEditingVehicle() === tempThisObject) {
            // svg.style.display = 'inline';
            svg.classList.add('visibleEditingSVG');

            overlay.querySelector('.corners').style.visibility = 'visible';
            
        } else {
            // svg.style.display = 'none';
            svg.classList.remove('visibleEditingSVG');

            overlay.querySelector('.corners').style.visibility = 'hidden';

        }

        // if (tempThisObject.frameTouchSynthesizer) {
        //     var cover = tempThisObject.frameTouchSynthesizer.cover;
        //     cover.style.width = msgContent.width;
        //     cover.style.height = msgContent.height;
        //     cover.style.top = top;
        //     cover.style.left = left;
        // }
    }

    // Forward the touch events from the nodes to the overall touch event collector
    
    if (typeof msgContent.eventObject !== "undefined") {
        
        if(msgContent.eventObject.type === "touchstart"){
            realityEditor.device.touchInputs.screenTouchStart(msgContent.eventObject);
        } else if(msgContent.eventObject.type === "touchend"){
            realityEditor.device.touchInputs.screenTouchEnd(msgContent.eventObject);
        } else if(msgContent.eventObject.type === "touchmove"){
            realityEditor.device.touchInputs.screenTouchMove(msgContent.eventObject);
        }
        return;
    }

    if (typeof msgContent.screenObject !== "undefined") {
        realityEditor.gui.screenExtension.receiveObject(msgContent.screenObject);
    }
    
    if (typeof msgContent.sendScreenObject !== "undefined") {
        if(msgContent.sendScreenObject){
            realityEditor.gui.screenExtension.registeredScreenObjects[msgContent.frame] = {
                object : msgContent.object,
                frame : msgContent.frame,
                node: msgContent.node
            };
            realityEditor.gui.screenExtension.visibleScreenObjects[msgContent.frame] = {
                object: msgContent.object,
                frame: msgContent.frame,
                node: msgContent.node,
                x: 0,
                y: 0
            };
        }
    }
    
    if (msgContent.sendMatrix === true) {
        if (tempThisObject.integerVersion >= 32) {
            tempThisObject.sendMatrix = true;
            let activeKey = msgContent.node ? msgContent.node : msgContent.frame;
            if (activeKey === msgContent.frame) { // only send these into frames, not nodes
                // send the projection matrix into the iframe (e.g. for three.js to use)
                globalDOMCache["iframe" + activeKey].contentWindow.postMessage(
                    '{"projectionMatrix":' + JSON.stringify(globalStates.realProjectionMatrix) + "}", '*');
            }
        }
    }

    if (typeof msgContent.sendMatrices !== "undefined") {
        if (msgContent.sendMatrices.groundPlane === true) {
            if (tempThisObject.integerVersion >= 32) {
               if(!tempThisObject.sendMatrices) tempThisObject.sendMatrices = {};
                tempThisObject.sendMatrices.groundPlane = true;
                let activeKey = msgContent.node ? msgContent.node : msgContent.frame;
                if (activeKey === msgContent.frame) {
                    globalDOMCache["iframe" + activeKey].contentWindow.postMessage(
                        '{"projectionMatrix":' + JSON.stringify(globalStates.realProjectionMatrix) + "}", '*');
                }
            }
        }
        if (msgContent.sendMatrices.devicePose === true) {
            if (tempThisObject.integerVersion >= 32) {
                if(!tempThisObject.sendMatrices) tempThisObject.sendMatrices = {};
                tempThisObject.sendMatrices.devicePose = true;
                let activeKey = msgContent.node ? msgContent.node : msgContent.frame;
                if (activeKey === msgContent.frame) {
                    // send the projection matrix into the iframe (e.g. for three.js to use)
                    globalDOMCache["iframe" + activeKey].contentWindow.postMessage(
                        '{"projectionMatrix":' + JSON.stringify(globalStates.realProjectionMatrix) + "}", '*');
                }
            }
        }
        if (msgContent.sendMatrices.allObjects === true) {
            if (tempThisObject.integerVersion >= 32) {
                if(!tempThisObject.sendMatrices) tempThisObject.sendMatrices = {};
                tempThisObject.sendMatrices.allObjects = true;
                let activeKey = msgContent.node ? msgContent.node : msgContent.frame;
                if (activeKey === msgContent.frame) {
                    // send the projection matrix into the iframe (e.g. for three.js to use)
                    globalDOMCache["iframe" + activeKey].contentWindow.postMessage(
                        '{"projectionMatrix":' + JSON.stringify(globalStates.realProjectionMatrix) + "}", '*');
                }
            }
        }

        globalStates.useGroundPlane = realityEditor.gui.ar.draw.doesAnythingUseGroundPlane();
    }

    if (msgContent.sendScreenPosition === true) {
        if (tempThisObject.integerVersion >= 32) {
            tempThisObject.sendScreenPosition = true;
        }
    }
    
    if (msgContent.sendAcceleration === true) {
        
        if (tempThisObject.integerVersion >= 32) {

            tempThisObject.sendAcceleration = true;

            if (globalStates.sendAcceleration === false) {
                globalStates.sendAcceleration = true;
                if (window.DeviceMotionEvent) {
                    console.log("motion activated");

                    window.addEventListener("deviceorientation", function () {

                    });

                    window.addEventListener("devicemotion", function (event) {

                        var thisState = globalStates.acceleration;

                        thisState.x = event.acceleration.x;
                        thisState.y = event.acceleration.y;
                        thisState.z = event.acceleration.z;

                        thisState.alpha = event.rotationRate.alpha;
                        thisState.beta = event.rotationRate.beta;
                        thisState.gamma = event.rotationRate.gamma;

                        // Manhattan Distance :-D
                        thisState.motion =
                            Math.abs(thisState.x) +
                            Math.abs(thisState.y) +
                            Math.abs(thisState.z) +
                            Math.abs(thisState.alpha) +
                            Math.abs(thisState.beta) +
                            Math.abs(thisState.gamma);

                    }, false);
                } else {
                    console.log("DeviceMotionEvent is not supported");
                }
            }
        }
    }

    if (msgContent.globalMessage) {
        var iframes = document.getElementsByTagName('iframe');
        for (let i = 0; i < iframes.length; i++) {

            if (iframes[i].id !== "iframe" + msgContent.node && iframes[i].style.visibility !== "hidden") {
                var objectKey = iframes[i].getAttribute("data-object-key");
                if (objectKey) {
                    var receivingObject = (objectKey === 'pocket') ? (pocketItem[objectKey]) : objects[objectKey];
                    if (receivingObject.integerVersion >= 32) {
                        var msg = {};
                        if (receivingObject.integerVersion >= 170) {
                            msg = {globalMessage: msgContent.globalMessage};
                        } else {
                            msg = {ohGlobalMessage: msgContent.ohGlobalMessage};
                        }
                        iframes[i].contentWindow.postMessage(JSON.stringify(msg), "*");
                    }
                }
            }
        }
    }

    if (msgContent.sendMessageToFrame) {
        
        var iframe = globalDOMCache['iframe' + msgContent.sendMessageToFrame.destinationFrame];
        if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify(msgContent), '*');
        }
        
        // var iframes = document.getElementsByTagName('iframe');
        // for (var i = 0; i < iframes.length; i++) {
        //
        //     if (iframes[i].id !== "iframe" + msgContent.node && iframes[i].style.visibility !== "hidden") {
        //         var objectKey = iframes[i].getAttribute("data-object-key");
        //         if (objectKey) {
        //             var receivingObject = (objectKey === 'pocket') ? (pocketItem[objectKey]) : objects[objectKey];
        //             if (receivingObject.integerVersion >= 32) {
        //                 var msg = {};
        //                 if (receivingObject.integerVersion >= 170) {
        //                     msg = {globalMessage: msgContent.globalMessage};
        //                 } else {
        //                     msg = {ohGlobalMessage: msgContent.ohGlobalMessage};
        //                 }
        //                 iframes[i].contentWindow.postMessage(JSON.stringify(msg), "*");
        //             }
        //         }
        //     }
        // }
        
    }
    
    if (typeof msgContent.fullScreen === "boolean") {
        if (msgContent.fullScreen === true) {
            
            tempThisObject.fullScreen = true;
            console.log("fullscreen: " + tempThisObject.fullScreen);
            
            let zIndex = tempThisObject.fullscreenZPosition || -5000; // defaults to background
            
            document.getElementById("object" + msgContent.frame).style.transform =
                'matrix3d(1, 0, 0, 0,' +
                '0, 1, 0, 0,' +
                '0, 0, 1, 0,' +
                '0, 0, ' + zIndex + ', 1)';

            globalDOMCache[tempThisObject.uuid].dataset.leftBeforeFullscreen = globalDOMCache[tempThisObject.uuid].style.left;
            globalDOMCache[tempThisObject.uuid].dataset.topBeforeFullscreen = globalDOMCache[tempThisObject.uuid].style.top;

            globalDOMCache[tempThisObject.uuid].style.opacity = '0'; // svg overlay still exists so we can reposition, but invisible
            globalDOMCache[tempThisObject.uuid].style.left = '0';
            globalDOMCache[tempThisObject.uuid].style.top = '0';

            globalDOMCache['iframe' + tempThisObject.uuid].dataset.leftBeforeFullscreen = globalDOMCache['iframe' + tempThisObject.uuid].style.left;
            globalDOMCache['iframe' + tempThisObject.uuid].dataset.topBeforeFullscreen = globalDOMCache['iframe' + tempThisObject.uuid].style.top;
            
            globalDOMCache['iframe' + tempThisObject.uuid].style.left = '0';
            globalDOMCache['iframe' + tempThisObject.uuid].style.top = '0';
            globalDOMCache['iframe' + tempThisObject.uuid].style.margin = '-2px';
            
            globalDOMCache['iframe' + tempThisObject.uuid].classList.add('webGlFrame');
            
            if (realityEditor.device.editingState.frame === msgContent.frame) {
                realityEditor.device.resetEditingState();
                realityEditor.device.clearTouchTimer();
            }
            
            // check if this requiresExclusive, and there is already an exclusive one, then kick that out of fullscreen
            if (tempThisObject.isFullScreenExclusive) {
                realityEditor.gui.ar.draw.ensureOnlyCurrentFullscreen(msgContent.object, msgContent.frame);
            }

        }
        if (msgContent.fullScreen === false) {
            realityEditor.gui.ar.draw.removeFullscreenFromFrame(msgContent.object, msgContent.frame, msgContent.fullScreenAnimated);
        }
        
        // update containsStickyFrame property on object whenever this changes, so that we dont have to recompute every frame
        let object = realityEditor.getObject(msgContent.object);
        if (object) {
            object.containsStickyFrame = realityEditor.gui.ar.draw.doesObjectContainStickyFrame(msgContent.object);
        }

    } else if(typeof msgContent.fullScreen === "string") {
        if (msgContent.fullScreen === "sticky") {
            
            tempThisObject.fullScreen = "sticky";
            console.log("sticky fullscreen: " + tempThisObject.fullScreen);

            let zIndex = tempThisObject.fullscreenZPosition || -5000; // defaults to background

            if (typeof msgContent.fullScreenAnimated !== 'undefined') {

                // create a duplicate, temporary DOM element in the same place as the frame
                var envelopeAnimationDiv = document.createElement('div');
                envelopeAnimationDiv.classList.add('main');
                envelopeAnimationDiv.classList.add('envelopeAnimationDiv');
                envelopeAnimationDiv.classList.add('ignorePointerEvents');
                envelopeAnimationDiv.style.width = globalDOMCache['object' + msgContent.frame].style.width;
                envelopeAnimationDiv.style.height = globalDOMCache['object' + msgContent.frame].style.height;
                envelopeAnimationDiv.style.transform = globalDOMCache['object' + msgContent.frame].style.transform; // start with same transform as the iframe
                document.getElementById('GUI').appendChild(envelopeAnimationDiv);
                
                // wait a small delay so the transition CSS property applies
                envelopeAnimationDiv.classList.add('animateAllProperties250ms');
                setTimeout(function() {
                    // give it a hard-coded MVP matrix that makes it fill the screen
                    envelopeAnimationDiv.style.transform = "matrix3d(284.7391935492032, 3.070340532377773, 0.0038200291675306924, 0.003834921258919453, -3.141247565648438, 284.35804025980104, 0.011905637861498192, 0.011900616291666024, 20.568534190244556, 9.715687705148639, -0.6879540871592961, -0.6869158438452686, -1268.420885449479, 86.38923398120664, 100200, 260.67004803237324)";
                    envelopeAnimationDiv.style.opacity = 0;
                    setTimeout(function() {
                        envelopeAnimationDiv.parentElement.removeChild(envelopeAnimationDiv);
                    }, 250);
                }, 10);
            }

            // make the div invisible while it switches to fullscreen mode, so we don't see a jump in content vs mode
            document.getElementById("object" + msgContent.frame).classList.add('transitioningToFullscreen');
            setTimeout(function() {
                document.getElementById("object" + msgContent.frame).classList.remove('transitioningToFullscreen');
            }, 200);

            document.getElementById("object" + msgContent.frame).style.transform =
                'matrix3d(1, 0, 0, 0,' +
                '0, 1, 0, 0,' +
                '0, 0, 1, 0,' +
                '0, 0, ' + zIndex + ', 1)';

            globalDOMCache[tempThisObject.uuid].dataset.leftBeforeFullscreen = globalDOMCache[tempThisObject.uuid].style.left;
            globalDOMCache[tempThisObject.uuid].dataset.topBeforeFullscreen = globalDOMCache[tempThisObject.uuid].style.top;

            globalDOMCache[tempThisObject.uuid].style.opacity = '0';
            globalDOMCache[tempThisObject.uuid].style.left = '0';
            globalDOMCache[tempThisObject.uuid].style.top = '0';

            globalDOMCache['iframe' + tempThisObject.uuid].dataset.leftBeforeFullscreen = globalDOMCache['iframe' + tempThisObject.uuid].style.left;
            globalDOMCache['iframe' + tempThisObject.uuid].dataset.topBeforeFullscreen = globalDOMCache['iframe' + tempThisObject.uuid].style.top;

            globalDOMCache['iframe' + tempThisObject.uuid].style.left = '0';
            globalDOMCache['iframe' + tempThisObject.uuid].style.top = '0';
            globalDOMCache['iframe' + tempThisObject.uuid].style.margin = '-2px';

            globalDOMCache['iframe' + tempThisObject.uuid].classList.add('webGlFrame');

            // update containsStickyFrame property on object whenever this changes, so that we dont have to recompute every frame
            let object = realityEditor.getObject(msgContent.object);
            if (object) {
                object.containsStickyFrame = true;
            }

            // check if this requiresExclusive, and there is already an exclusive one, then kick that out of fullscreen
            if (tempThisObject.isFullScreenExclusive) {
                realityEditor.gui.ar.draw.ensureOnlyCurrentFullscreen(msgContent.object, msgContent.frame);
            }
        }
    }

    if(typeof msgContent.stickiness === "boolean") {
        tempThisObject.stickiness = msgContent.stickiness;
    }
    
    if (typeof msgContent.isFullScreenExclusive !== "undefined") {
        tempThisObject.isFullScreenExclusive = msgContent.isFullScreenExclusive;

        // check if this requiresExclusive, and there is already an exclusive one, then kick that out of fullscreen
        if (tempThisObject.isFullScreenExclusive) {
            realityEditor.gui.ar.draw.ensureOnlyCurrentFullscreen(msgContent.object, msgContent.frame);
        }
    }

    if (typeof msgContent.createNode !== "undefined") {
        
        if (msgContent.createNode.noDuplicate) {
            // check if a node with this name already exists on this frame
            var frame = realityEditor.getFrame(msgContent.object, msgContent.frame);
            var nodeNames = Object.keys(frame.nodes).map(function(nodeKey) {
                return frame.nodes[nodeKey].name;
            });
            if (nodeNames.indexOf(msgContent.createNode.name) > -1) {
                console.log('don\'t duplicate node');
                return; 
            }
        }
        
        let node = new Node();
        node.name = msgContent.createNode.name;
        node.frameId = msgContent.frame;
        node.objectId = msgContent.object;
        var nodeKey = node.frameId + msgContent.createNode.name;// + realityEditor.device.utilities.uuidTime();
        node.uuid = nodeKey;
        var thisObject = realityEditor.getObject(msgContent.object);
        let thisFrame = realityEditor.getFrame(msgContent.object, msgContent.frame);
        if (typeof msgContent.createNode.x !== 'undefined') {
            node.x = msgContent.createNode.x;
        } else {
            node.x = (-200 + Math.random() * 400);
        }
        if (typeof msgContent.createNode.y !== 'undefined') {
            node.y = msgContent.createNode.y;
        } else {
            node.y = (-200 + Math.random() * 400);
        }
        
        if (msgContent.createNode.attachToGroundPlane) {
            node.attachToGroundPlane = true;
        }
        
        if (typeof msgContent.createNode.nodeType !== 'undefined') {
            node.type = msgContent.createNode.nodeType;
        }
        
        node.scale *= newNodeScaleFactor;
        
        thisFrame.nodes[nodeKey] = node;
        //                               (ip, objectKey, frameKey, nodeKey, thisNode) 
        realityEditor.network.postNewNode(thisObject.ip, msgContent.object, msgContent.frame, nodeKey, node);
    }
    
    if (typeof msgContent.moveNode !== "undefined") {
        let thisFrame = realityEditor.getFrame(msgContent.object, msgContent.frame);
        
        // move each node within this frame with a matching name to the provided x,y coordinates
        Object.keys(thisFrame.nodes).map(function(nodeKey) {
            return thisFrame.nodes[nodeKey];
        }).filter(function(node) {
            return node.name === msgContent.moveNode.name;
        }).forEach(function(node) {
            node.x = (msgContent.moveNode.x) || 0;
            node.y = (msgContent.moveNode.y) || 0;
            
            var positionData = realityEditor.gui.ar.positioning.getPositionData(node);
            var content = {};
            content.x = positionData.x;
            content.y = positionData.y;
            content.scale = positionData.scale;

            content.lastEditor = globalStates.tempUuid;
            let urlEndpoint = 'http://' + objects[objectKey].ip + ':' + httpPort + '/object/' + msgContent.object + "/frame/" + msgContent.frame + "/node/" + node.uuid + "/nodeSize/";
            realityEditor.network.postData(urlEndpoint, content);
        });
    }
    
    if (typeof msgContent.resetNodes !== "undefined") {
        
        realityEditor.forEachNodeInFrame(msgContent.object, msgContent.frame, function(thisObjectKey, thisFrameKey, thisNodeKey) {
            
            // delete links to and from the node
            realityEditor.forEachFrameInAllObjects(function(thatObjectKey, thatFrameKey) {
                var thatFrame = realityEditor.getFrame(thatObjectKey, thatFrameKey);
                Object.keys(thatFrame.links).forEach(function(linkKey) {
                    var thisLink = thatFrame.links[linkKey];
                    if (((thisLink.objectA === thisObjectKey) && (thisLink.frameA === thisFrameKey) && (thisLink.nodeA === thisNodeKey)) ||
                        ((thisLink.objectB === thisObjectKey) && (thisLink.frameB === thisFrameKey) && (thisLink.nodeB === thisNodeKey))) {
                        delete thatFrame.links[linkKey];
                        realityEditor.network.deleteLinkFromObject(objects[thatObjectKey].ip, thatObjectKey, thatFrameKey, linkKey);
                    }
                });
            });

            // remove it from the DOM
            realityEditor.gui.ar.draw.deleteNode(thisObjectKey, thisFrameKey, thisNodeKey);
            // delete it from the server
            realityEditor.network.deleteNodeFromObject(objects[thisObjectKey].ip, thisObjectKey, thisFrameKey, thisNodeKey);
            
        });

    }

    if (typeof msgContent.beginTouchEditing !== "undefined") {
        let activeKey = msgContent.node || msgContent.frame;
        var element = document.getElementById(activeKey);
        realityEditor.device.beginTouchEditing(element);
    }

    if (typeof msgContent.touchEvent !== "undefined") {
        var event = msgContent.touchEvent;
        var target = document.getElementById(msgContent.frame);
        if (!target) {
            return;
        }
        var fakeEvent = {
            target: target,
            currentTarget: target,
            clientX: event.x,
            clientY: event.y,
            pageX: event.x,
            pageY: event.y,
            preventDefault: function () {
            }
        };
        if (event.type === 'touchend') {
            realityEditor.device.onDocumentPointerUp(fakeEvent);
            realityEditor.device.onMultiTouchEnd(fakeEvent);
            globalStates.tempEditingMode = false;
            console.log('stop editing mode!!!');
            globalStates.unconstrainedSnapInitialPosition = null;
            realityEditor.device.deactivateFrameMove(msgContent.frame);
            let frame = globalDOMCache['iframe' + msgContent.frame];
            if (frame && !msgContent.node) {
                frame.contentWindow.postMessage(JSON.stringify({
                    stopTouchEditing: true
                }), "*");
            }
        }
    }

    if (typeof msgContent.visibilityDistance !== "undefined") {
        let activeVehicle = realityEditor.getFrame(msgContent.object, msgContent.frame);

        activeVehicle.distanceScale = msgContent.visibilityDistance;
        console.log('visibility distance for ' + activeVehicle.name + ' is set to ' + activeVehicle.visibilityDistance);

    }

    if (typeof msgContent.moveDelay !== "undefined") {
        let activeVehicle = realityEditor.getFrame(msgContent.object, msgContent.frame);
        
        if (activeVehicle) {
            activeVehicle.moveDelay = msgContent.moveDelay;
        }
    }

    if (msgContent.loadLogicIcon) {
        this.loadLogicIcon(msgContent);
    }
    
    if (msgContent.loadLogicName) {
        this.loadLogicName(msgContent);
    }
    
    if (typeof msgContent.publicData !== "undefined") {
        
        let frame = realityEditor.getFrame(msgContent.object, msgContent.frame);
        let node = realityEditor.getNode(msgContent.object, msgContent.frame, msgContent.node);
        
        if (frame && node) {
            if (!publicDataCache.hasOwnProperty(msgContent.frame)) {
                publicDataCache[msgContent.frame] = {};
            }
            publicDataCache[msgContent.frame][node.name] = msgContent.publicData;
            //console.log('set public data of ' + msgContent.frame + ', ' + node.name + ' to: ' + msgContent.publicData);
            frame.publicData = msgContent.publicData;
            
            var TEMP_DISABLE_REALTIME_PUBLIC_DATA = true;
            
            if (!TEMP_DISABLE_REALTIME_PUBLIC_DATA) {
                var keys = realityEditor.getKeysFromVehicle(frame);
                realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, 'publicData', msgContent.publicData);
            }
        }
        
    }

    if (typeof msgContent.videoRecording !== "undefined") {

        if (msgContent.videoRecording) {
            realityEditor.device.videoRecording.startRecordingForFrame(msgContent.object, msgContent.frame);
        } else {
            realityEditor.device.videoRecording.stopRecordingForFrame(msgContent.object, msgContent.frame);
        }
        
    }
    
    if (typeof msgContent.getScreenshotBase64 !== "undefined") {
        realityEditor.network.frameIdForScreenshot = msgContent.frame;
        realityEditor.app.getScreenshot("S", function(base64String) {
            var thisMsg = {
                getScreenshotBase64: base64String
                // frameKey: realityEditor.network.frameIdForScreenshot
            };
            globalDOMCache["iframe" + realityEditor.network.frameIdForScreenshot].contentWindow.postMessage(JSON.stringify(thisMsg), '*');
        });
    }

    if (typeof msgContent.openKeyboard !== "undefined") {
        if (msgContent.openKeyboard) {
            realityEditor.device.keyboardEvents.openKeyboard();
        } else {
            realityEditor.device.keyboardEvents.closeKeyboard();
        }
    }
    
    if (typeof msgContent.ignoreAllTouches !== "undefined") {
        let frame = realityEditor.getFrame(msgContent.object, msgContent.frame);
        frame.ignoreAllTouches = msgContent.ignoreAllTouches;
    }
    
    if (typeof msgContent.getScreenDimensions !== "undefined") {
        globalDOMCache["iframe" + msgContent.frame].contentWindow.postMessage(JSON.stringify({
            screenDimensions: {
                width: globalStates.height,
                height: globalStates.width
            }
        }), '*');
    }
    
    // adjusts the iframe and touch overlay size based on a message from the iframe about the size of its contents changing
    if (typeof msgContent.changeFrameSize !== 'undefined') {
        let width = msgContent.changeFrameSize.width;
        let height = msgContent.changeFrameSize.height;

        let iFrame = document.getElementById('iframe' + msgContent.frame);
        let overlay = document.getElementById(msgContent.frame);

        iFrame.style.width = width + 'px';
        iFrame.style.height = height + 'px';
        overlay.style.width = width + 'px';
        overlay.style.height = height + 'px';

        let cornerPadding = 24;
        overlay.querySelector('.corners').style.width = width + cornerPadding + 'px';
        overlay.querySelector('.corners').style.height = height + cornerPadding + 'px';
    }
};

// TODO: this is a potentially incorrect way to implement this... figure out a more generalized way to pass closure variables into app.callbacks
realityEditor.network.frameIdForScreenshot = null;

/**
 * Updates the icon of a logic node in response to UDP action message
 * @param {{object: string, frame: string, node: string, loadLogicIcon: string}} data - loadLogicIcon is either "auto", "custom", or "null"
 */
realityEditor.network.loadLogicIcon = function(data) {
    var iconImage = data.loadLogicIcon;
    var logicNode = realityEditor.getNode(data.object, data.frame, data.node);
    if (logicNode) {
        logicNode.iconImage = iconImage;
        if (typeof logicNode.nodeMemoryCustomIconSrc !== 'undefined') {
            delete logicNode.nodeMemoryCustomIconSrc;
        }
        realityEditor.gui.ar.draw.updateLogicNodeIcon(logicNode);
    }
};

/**
 * Updates the name text of a logic node in response to UDP action message
 * @param {{object: string, frame: string, node: string, loadLogicName: string}} data - loadLogicName is the new name
 */
realityEditor.network.loadLogicName = function(data) {
    var logicNode = realityEditor.getNode(data.object, data.frame, data.node);
    logicNode.name = data.loadLogicName;

    // update node text label on AR view
    globalDOMCache["iframe" + logicNode.uuid].contentWindow.postMessage(
        JSON.stringify( { renameNode: logicNode.name }) , "*");

    // // update model and view for pocket menu
    // var savedIndex = realityEditor.gui.memory.nodeMemories.getIndexOfLogic(logicNode);
    // if (savedIndex > -1) {
    //     realityEditor.gui.memory.nodeMemories.states.memories[savedIndex].name = logicNode.name;
    //     var nodeMemoryContainer = document.querySelector('.nodeMemoryBar').children[savedIndex];
    //     [].slice.call(nodeMemoryContainer.children).forEach(function(child) {
    //         if (!child.classList.contains('memoryNode') {
    //             child.innerHeight = logicNode.name;
    //         }
    //     });
    // }
    
    // upload name to server
    var object = realityEditor.getObject(data.object);
    this.postNewNodeName(object.ip, data.object, data.frame, data.node, logicNode.name);
};

/**
 * POST /rename to the logic node to update it on the server
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} name
 */
realityEditor.network.postNewNodeName = function(ip, objectKey, frameKey, nodeKey, name) {
    var contents = {
        nodeName: name,
        lastEditor: globalStates.tempUuid
    };

    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" +  frameKey + "/node/" + nodeKey + "/rename/", contents);
};

/**
 * When the settings menu posts up its new state to the rest of the application, refresh/update all settings
 * Also used for the settings menu to request data from the application, such as the list of Found Objects
 * @param {object} msgContent
 */
realityEditor.network.onSettingPostMessage = function (msgContent) {

    var self = document.getElementById("settingsIframe");

    /**
     * Get all the setting states
     */

    if (msgContent.settings.getSettings) {
        self.contentWindow.postMessage(JSON.stringify({
            getSettings: realityEditor.gui.settings.generateGetSettingsJsonMessage()
        }), "*");
    }

    if (msgContent.settings.getMainDynamicSettings) {
        self.contentWindow.postMessage(JSON.stringify({
            getMainDynamicSettings: realityEditor.gui.settings.generateDynamicSettingsJsonMessage(realityEditor.gui.settings.MenuPages.MAIN)
        }), "*"); 
    }

    if (msgContent.settings.getDevelopDynamicSettings) {
        console.log('DEVELOP asked for dynamic settings');
        self.contentWindow.postMessage(JSON.stringify({
            getDevelopDynamicSettings: realityEditor.gui.settings.generateDynamicSettingsJsonMessage(realityEditor.gui.settings.MenuPages.DEVELOP)
        }), "*");
    }

    // this is used for the "Found Objects" settings menu, to request the list of all found objects to be posted back into the settings iframe
    if (msgContent.settings.getObjects) {

        var thisObjects = {};

        for (let objectKey in realityEditor.objects) {
            var thisObject = realityEditor.getObject(objectKey);
            var isInitialized = realityEditor.app.targetDownloader.isObjectTargetInitialized(objectKey) || // either target downloaded
                                objectKey === realityEditor.worldObjects.getLocalWorldId(); // or it's the _WORLD_local
            thisObjects[objectKey] = {
                name: thisObject.name,
                ip: thisObject.ip,
                version: thisObject.version,
                frames: {},
                initialized: isInitialized
            };

            for (let frameKey in thisObject.frames) {
               var thisFrame = realityEditor.getFrame(objectKey, frameKey);
                if(thisFrame) {
                    thisObjects[objectKey].frames[frameKey] = {
                        name: thisFrame.name,
                        nodes: Object.keys(thisFrame.nodes).length,
                        links: Object.keys(thisFrame.links).length
                    }
                }
            }
        }
        
        self.contentWindow.postMessage(JSON.stringify({getObjects: thisObjects}), "*");
    }
    
    /**
     * This is where all the setters are placed for the Settings menu
     */

    // iterates over all possible settings (extendedTracking, editingMode, zoneText, ...., etc) and updates local variables and triggers side effects based on new state values
    if (msgContent.settings.setSettings) {

        if (typeof msgContent.settings.setSettings.lockingToggle !== "undefined") {

            console.log("received message in settings");

            if (msgContent.settings.setSettings.lockingToggle) {
                realityEditor.app.authenticateTouch();

            } else {
                globalStates.lockingMode = false;
                //globalStates.authenticatedUser = null;
                globalStates.lockPassword = null;
            }
        }

        if (typeof msgContent.settings.setSettings.lockPassword !== "undefined") {

            globalStates.lockPassword = msgContent.settings.setSettings.lockPassword;
            console.log("received lock password: " + globalStates.lockPassword);
        }

        if (typeof msgContent.settings.setSettings.realityState !== "undefined") {

            if (msgContent.settings.setSettings.realityState) {
                realityEditor.gui.menus.switchToMenu("reality", ["realityGui"], null);
                globalStates.realityState = true;
                realityEditor.app.saveRealityState(true);

            } else {
                realityEditor.gui.menus.switchToMenu("main", ["gui"], ["reset", "unconstrained"]);
                globalStates.realityState = false;
                realityEditor.app.saveRealityState(false);
            }
        }

        // sets property value for each dynamically-added toggle
        realityEditor.gui.settings.addedToggles.forEach(function(toggle) {
            if (typeof msgContent.settings.setSettings[toggle.propertyName] !== "undefined") {
                realityEditor.gui.settings.toggleStates[toggle.propertyName] = msgContent.settings.setSettings[toggle.propertyName];
                console.log('set toggle value for ' + toggle.propertyName + ' to ' + msgContent.settings.setSettings[toggle.propertyName]);
                toggle.onToggleCallback(msgContent.settings.setSettings[toggle.propertyName]);
            }

            if (typeof msgContent.settings.setSettings[toggle.propertyName + 'Text'] !== "undefined") {
                console.log('toggle also set text value for ' + toggle.propertyName + 'Text' + ' to ' + msgContent.settings.setSettings[toggle.propertyName + 'Text']);
                toggle.onTextCallback(msgContent.settings.setSettings[toggle.propertyName + 'Text']);
            }
        });
        
    }
    
    // can directly trigger native app APIs with message of correct format @todo: figure out if this is currently used?
    if (msgContent.settings.functionName) {
        realityEditor.app.appFunctionCall(msgContent.settings.functionName, msgContent.settings.messageBody, null);
    }

    if (msgContent.settings.setDiscoveryText) {
        globalStates.discoveryState = msgContent.settings.setDiscoveryText;
        this.discoverObjectsFromServer(msgContent.settings.setDiscoveryText)
    }
};

/**
 * Ask a specific server to respond with which objects it has
 * The server will respond with a list of json objects matching the format of discovery heartbeats
 * Array.<{id: string, ip: string, vn: number, tcs: string, zone: string}>
 *     These heartbeats are processed like any other heartbeats
 * @param {string} serverUrl - url for the reality server to download objects from, e.g. 10.10.10.20:8080
 */
realityEditor.network.discoverObjectsFromServer = function(serverUrl) {
    var prefix = (serverUrl.indexOf('http://') === -1) ? ('http://') : ('');
    var url = prefix + serverUrl + '/allObjects/';
    realityEditor.network.getData(null, null, null, url, function(_nullObj, _nullFrame, _nullNode, msg) {
        console.log('got all objects');
        console.log(msg);

        msg.forEach(function(heartbeat) {
            console.log(heartbeat);
            realityEditor.network.addHeartbeatObject(heartbeat);
        });
    });
};

/**
 * Helper function to perform a DELETE request on the server
 * @param {string} url
 * @param {object} content
 */
realityEditor.network.deleteData = function (url, content) {
    var request = new XMLHttpRequest();
    request.open('DELETE', url, true);
    var _this = this;
    request.onreadystatechange = function () {
        if (request.readyState === 4) _this.cout("It deleted!");
    };
    request.setRequestHeader("Content-type", "application/json");
    //request.setRequestHeader("Content-length", params.length);
    // request.setRequestHeader("Connection", "close");
    if (content) {
        request.send(JSON.stringify(content));
    } else {
        request.send();
    }
    this.cout("deleteData");
};

/**
 * Helper function to get the version number of the object. Defaults to 170.
 * @param {string} objectKey
 * @return {number}
 */
realityEditor.network.testVersion = function (objectKey) {
    var thisObject = realityEditor.getObject(objectKey);
    if (!thisObject) {
        return 170;
    } else {
        return thisObject.integerVersion;
    }
};

/**
 * Makes a DELETE request to the server to remove a frame from an object. Only works for global frames, not local.
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 */
realityEditor.network.deleteFrameFromObject = function(ip, objectKey, frameKey) {
    this.cout("I am deleting a frame: " + ip);
    var frameToDelete = realityEditor.getFrame(objectKey, frameKey);
    if (frameToDelete) {
        console.log('deleting ' + frameToDelete.location + ' frame', frameToDelete);
        if (frameToDelete.location !== 'global') {
            console.warn('WARNING: TRYING TO DELETE A LOCAL FRAME');
            return;
        }
    } else {
        console.log('cant tell if local or global... frame has already been deleted on editor');
    }
    var contents = {lastEditor: globalStates.tempUuid};
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frames/" + frameKey, contents);
};

/**
 * Makes a POST request to add a new frame to the object
 * @param {string} ip
 * @param {string} objectKey
 * @param {Frame} contents
 * @param {function} callback
 */
realityEditor.network.postNewFrame = function(ip, objectKey, contents, callback) {
    this.cout("I am adding a frame: " + ip);
    contents.lastEditor = globalStates.tempUuid;
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/addFrame/", contents, callback);
};

/**
 * Duplicates a frame on the server (except gives it a new uuid). Used in response to pulling on staticCopy frames.
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {object|undefined} contents - currently doesn't need this, can exclude or pass in empty object {}
 */
realityEditor.network.createCopyOfFrame = function(ip, objectKey, frameKey, contents) {
    this.cout("I am adding a frame: " + ip);
    contents = contents || {};
    contents.lastEditor = globalStates.tempUuid;

    var oldFrame = realityEditor.getFrame(objectKey, frameKey);

    var cachedPositionData = {
        x: oldFrame.ar.x,
        y: oldFrame.ar.y,
        scale: oldFrame.ar.scale,
        matrix: oldFrame.ar.matrix
    };
    
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frames/" + frameKey  + "/copyFrame/", contents, function(err, response) {
        console.log(err);
        console.log(response);
        
        if (err) {
            console.warn('unable to make copy of frame ' + frameKey);
        } else {
            var responseFrame = response.frame;
            var newFrame = new Frame();
            for (let propertyKey in responseFrame) {
                if (!responseFrame.hasOwnProperty(propertyKey)) continue;
                newFrame[propertyKey] = responseFrame[propertyKey];
            }
            var thisObject = realityEditor.getObject(objectKey);
            
            // make this staticCopy so it replaces the old static copy
            newFrame.staticCopy = true;

            // copy position data directly from the old one in the editor so it is correctly placed to start (server version might have old data)
            newFrame.ar = cachedPositionData;
            thisObject.frames[response.frameId] = newFrame;
        }
    });
};

/**
 * Makes a DELETE request to remove a link from the frame it is on (or object, for older versions)
 * @todo: at this point, we can probably stop supporting the non-frame versions
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 */
realityEditor.network.deleteLinkFromObject = function (ip, objectKey, frameKey, linkKey) {
    // generate action for all links to be reloaded after upload
    this.cout("I am deleting a link: " + ip);

    if (this.testVersion(objectKey) > 162) {
        this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + "/editor/" + globalStates.tempUuid + "/deleteLink/");
    } else {
        this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/link/" + linkKey);
    }
};

/**
 * Makes a DELETE request to remove a node from the frame it is on
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 */
realityEditor.network.deleteNodeFromObject = function (ip, objectKey, frameKey, nodeKey) {
    // generate action for all links to be reloaded after upload
    this.cout("I am deleting a node: " + ip);
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/editor/" + globalStates.tempUuid + "/deleteLogicNode/");
};

/**
 * Makes a DELETE request to remove a block from the logic node it is on
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} blockKey
 */
realityEditor.network.deleteBlockFromObject = function (ip, objectKey, frameKey, nodeKey, blockKey) {
    // generate action for all links to be reloaded after upload
    this.cout("I am deleting a block: " + ip);
    // /logic/*/*/block/*/
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/block/" + blockKey + "/editor/" + globalStates.tempUuid + "/deleteBlock/");
};

/**
 * 
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} linkKey
 */
realityEditor.network.deleteBlockLinkFromObject = function (ip, objectKey, frameKey, nodeKey, linkKey) {
    // generate action for all links to be reloaded after upload
    this.cout("I am deleting a block link: " + ip);
    // /logic/*/*/link/*/
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/link/" + linkKey + "/editor/" + globalStates.tempUuid + "/deleteBlockLink/");
};

/**
 * 
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 */
realityEditor.network.updateNodeBlocksSettingsData = function(ip, objectKey, frameKey, nodeKey) {
    var urlEndpoint = 'http://' + ip + ':' + httpPort + '/object/' + objectKey + "/node/" + nodeKey;
    this.getData(objectKey, frameKey, nodeKey, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {
        for (var blockKey in res.blocks) {
            if (!res.blocks.hasOwnProperty(blockKey)) continue;
            if (res.blocks[blockKey].type === 'default') continue;
            // TODO: refactor using getter functions
            objects[objectKey].frames[frameKey].nodes[nodeKey].blocks[blockKey].publicData = res.blocks[blockKey].publicData;
            objects[objectKey].frames[frameKey].nodes[nodeKey].blocks[blockKey].privateData = res.blocks[blockKey].privateData;
        }
    });
};

/**
 * Helper function to make a GET request to the server.
 * The objectKey, frameKey, and nodeKey are optional and will just be passed into the callback as additional arguments.
 * @param {string|undefined} objectKey
 * @param {string|undefined} frameKey
 * @param {string|undefined} nodeKey
 * @param {string} url
 * @param {function<string, string, string, object>} callback
 */
realityEditor.network.getData = function (objectKey, frameKey, nodeKey, url, callback) {
    if (!nodeKey) nodeKey = null;
    if (!frameKey) frameKey = null;
    var _this = this;
    var req = new XMLHttpRequest();
    try {
        req.open('GET', url, true);
        // Just like regular ol' XHR
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    // JSON.parse(req.responseText) etc.
                    if (req.responseText)
                        callback(objectKey, frameKey, nodeKey, JSON.parse(req.responseText));
                } else {
                    // Handle error case
                    console.log("could not load content");
                    _this.cout("could not load content");
                }
            }
        };
        req.send();

    }
    catch (e) {
        this.cout("could not connect to" + url);
    }
};

/**
 * Helper function to POST data as json to url, calling callback with the JSON-encoded response data when finished
 * @param {String} url
 * @param {Object} body
 * @param {Function<Error, Object>} callback
 */
realityEditor.network.postData = function (url, body, callback) {
    var request = new XMLHttpRequest();
    var params = JSON.stringify(body);
    request.open('POST', url, true);
    request.onreadystatechange = function () {
        if (request.readyState !== 4) {
            return;
        }
        if (!callback) {
            return;
        }

        if (request.status === 200) {
            try {
                callback(null, JSON.parse(request.responseText));
            } catch (e) {
                callback({status: request.status, error: e, failure: true}, null);
            }
            return;
        }

        callback({status: request.status, failure: true}, null);
    };

    request.setRequestHeader("Content-type", "application/json");
    //request.setRequestHeader("Content-length", params.length);
    // request.setRequestHeader("Connection", "close");
    request.send(params);
};

/**
 * Makes a POST request to add a new link from objectA, frameA, nodeA, to objectB, frameB, nodeB
 * Only goes through with it after checking to make sure there is no network loop
 * @param {Link} thisLink
 * @param {string|undefined} existingLinkKey - include if you want server to use this as the link key. otherwise randomly generates it.
 */
realityEditor.network.postLinkToServer = function (thisLink, existingLinkKey) {

    var thisObjectA = realityEditor.getObject(thisLink.objectA);
    var thisFrameA = realityEditor.getFrame(thisLink.objectA, thisLink.frameA);
    var thisNodeA = realityEditor.getNode(thisLink.objectA, thisLink.frameA, thisLink.nodeA);

    var thisObjectB = realityEditor.getObject(thisLink.objectB);
    var thisFrameB = realityEditor.getFrame(thisLink.objectB, thisLink.frameB);
    var thisNodeB = realityEditor.getNode(thisLink.objectB, thisLink.frameB, thisLink.nodeB);

    // if exactly one of objectA and objectB is the localWorldObject of the phone, prevent the link from being made
    var localWorldObjectKey = realityEditor.worldObjects.getLocalWorldId();
    var isBetweenLocalWorldAndOtherServer = (thisLink.objectA === localWorldObjectKey && thisLink.objectB !== localWorldObjectKey) ||
        (thisLink.objectA !== localWorldObjectKey && thisLink.objectB === localWorldObjectKey);
    
    var okForNewLink = this.checkForNetworkLoop(thisLink.objectA, thisLink.frameA, thisLink.nodeA, thisLink.logicA, thisLink.objectB, thisLink.frameB, thisLink.nodeB, thisLink.logicB) && !isBetweenLocalWorldAndOtherServer;
    
    if (okForNewLink) {
        var linkKey = this.realityEditor.device.utilities.uuidTimeShort();
        if (existingLinkKey) {
            linkKey = existingLinkKey;
        }

        var namesA, namesB;
        var color = "";

        if (thisLink.logicA !== false) {

            if (thisLink.logicA === 0) color = "BLUE";
            if (thisLink.logicA === 1) color = "GREEN";
            if (thisLink.logicA === 2) color = "YELLOW";
            if (thisLink.logicA === 3) color = "RED";

            namesA = [thisObjectA.name, thisFrameA.name, thisNodeA.name + ":" + color];
        } else {
            namesA = [thisObjectA.name, thisFrameA.name, thisNodeA.name];
        }

        if (thisLink.logicB !== false) {
            
            if (thisLink.logicB === 0) color = "BLUE";
            if (thisLink.logicB === 1) color = "GREEN";
            if (thisLink.logicB === 2) color = "YELLOW";
            if (thisLink.logicB === 3) color = "RED";

            namesB = [thisObjectB.name, thisFrameB.name, thisNodeB.name + ":" + color];
        } else {
            namesB = [thisObjectB.name, thisFrameB.name, thisNodeB.name];
        }

        // this is for backword compatibility
        if (this.testVersion(thisLink.objectA) > 165) {

            thisFrameA.links[linkKey] = {
                objectA: thisLink.objectA,
                frameA: thisLink.frameA,
                nodeA: thisLink.nodeA,
                logicA: thisLink.logicA,
                namesA: namesA,
                objectB: thisLink.objectB,
                frameB: thisLink.frameB,
                nodeB: thisLink.nodeB,
                logicB: thisLink.logicB,
                namesB: namesB
            };

        } else {
            thisFrameA.links[linkKey] = {

                ObjectA: thisLink.objectA,
                ObjectB: thisLink.objectB,
                locationInA: thisLink.nodeA,
                locationInB: thisLink.nodeB,
                ObjectNameA: namesA,
                ObjectNameB: namesB
            };

            console.log(thisLink.logicA);
            if (thisLink.logicA !== false || thisLink.logicB !== false) {
                return;
            }
        }

        // push new connection to objectA
        //todo this is a work around to not crash the server. only temporarly for testing
        //  if(globalProgram.logicA === false && globalProgram.logicB === false) {
        this.postNewLink(thisObjectA.ip, thisLink.objectA, thisLink.frameA, linkKey, thisFrameA.links[linkKey]);
        //  }
    }
};

/**
 * Subroutine that postLinkToServer calls after it has determined that there is no network loop, to actually perform the network request
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {Link} thisLink
 */
realityEditor.network.postNewLink = function (ip, objectKey, frameKey, linkKey, thisLink) {
    // generate action for all links to be reloaded after upload
    thisLink.lastEditor = globalStates.tempUuid;
    this.cout("sending Link");
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + '/addLink/', thisLink, function (err, response) {
        console.log(response);
    });
};

/**
 * Makes a POST request to add a new node to a frame
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {Node} thisNode
 */
realityEditor.network.postNewNode = function (ip, objectKey, frameKey, nodeKey, thisNode) {
    thisNode.lastEditor = globalStates.tempUuid;
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + '/frame/' + frameKey + '/node/' + nodeKey + '/addNode/', thisNode, function (err) {
        if (err) {
            console.log('postNewNode error:', err);
        }
    });

};

/**
 * Makes a POST request to add a new crafting board link (logic block link) to the logic node
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} linkKey
 * @param {BlockLink} thisLink
 */
realityEditor.network.postNewBlockLink = function (ip, objectKey, frameKey, nodeKey, linkKey, thisLink) {
    this.cout("sending Block Link");
    var linkMessage = this.realityEditor.gui.crafting.utilities.convertBlockLinkToServerFormat(thisLink);
    linkMessage.lastEditor = globalStates.tempUuid;
    // /logic/*/*/link/*/
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/link/" + linkKey + "/addBlockLink/", linkMessage, function () {
    });
};

/**
 * Makes a POST request to add a new logic node to a frame
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {Logic} logic
 */
realityEditor.network.postNewLogicNode = function (ip, objectKey, frameKey, nodeKey, logic) {
    this.cout("sending Logic Node");
    // /logic/*/*/node/

    var simpleLogic = this.realityEditor.gui.crafting.utilities.convertLogicToServerFormat(logic);
    simpleLogic.lastEditor = globalStates.tempUuid;
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/addLogicNode/", simpleLogic, function () {
    });
};

/**
 * Makes a POST request to move a logic block from one grid (x,y) position to another
 * @todo: update to use a PUT request in all instances where we are modifying rather than creating
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} logicKey
 * @param {string} blockKey
 * @param {{x: number, y: number}} content
 */
realityEditor.network.postNewBlockPosition = function (ip, objectKey, frameKey, logicKey, blockKey, content) {
    // generate action for all links to be reloaded after upload
    this.cout("I am moving a block: " + ip);
    // /logic/*/*/block/*/
    
    content.lastEditor = globalStates.tempUuid;
    if (typeof content.x === "number" && typeof content.y === "number") {
        this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + logicKey + "/block/" + blockKey + "/blockPosition/", content, function () {
        });
    }
};

/**
 * Makes a POST request to add a new logic block to a logic node
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} blockKey
 * @param {Logic} block
 */
realityEditor.network.postNewBlock = function (ip, objectKey, frameKey, nodeKey, blockKey, block) {
    this.cout("sending Block");
    // /logic/*/*/block/*/
    block.lastEditor = globalStates.tempUuid;

    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/block/" + blockKey + "/addBlock/", block, function () {
    });
};

/**
 * Recursively check if adding the specified link would introduce a cycle in the network topology
 * @todo fully understand what's happening here and verify that this really works
 * @todo make sure this works for logic block links too
 * @param {string} objectAKey
 * @param {string} frameAKey
 * @param {string} nodeAKey
 * @param {string} logicAKey
 * @param {string} objectBKey
 * @param {string} frameBKey
 * @param {string} nodeBKey
 * @param {string} logicBKey
 * @return {boolean} - true if it's ok to add
 */
realityEditor.network.checkForNetworkLoop = function (objectAKey, frameAKey, nodeAKey, _logicAKey, objectBKey, frameBKey, nodeBKey, _logicBKey) {
    var signalIsOk = true;
    var thisFrame = realityEditor.getFrame(objectAKey, frameAKey);
    var thisFrameLinks = thisFrame.links;

    // check if connection is with it self
    if (objectAKey === objectBKey && frameAKey === frameBKey && nodeAKey === nodeBKey) {
        signalIsOk = false;
    }

    // todo check that objects are making these checks as well for not producing overlapeses.
    // check if this connection already exists?
    if (signalIsOk) {
        for (var thisSubKey in thisFrameLinks) {
            if (thisFrameLinks[thisSubKey].objectA === objectAKey &&
                thisFrameLinks[thisSubKey].objectB === objectBKey &&
                thisFrameLinks[thisSubKey].frameA === frameAKey &&
                thisFrameLinks[thisSubKey].frameB === frameBKey &&
                thisFrameLinks[thisSubKey].nodeA === nodeAKey &&
                thisFrameLinks[thisSubKey].nodeB === nodeBKey) {
                signalIsOk = false;
            }
        }
    }

    function searchL(objectA, frameA, nodeA, objectB, frameB, nodeB) {
        var thisFrame = realityEditor.getFrame(objectB, frameB);
        // TODO: make sure that these links dont get created in the first place - or that they get deleted / rerouted when destination frame changes
        if (!thisFrame) return;

        for (var key in thisFrame.links) {  // this is within the frame
            // this.cout(objectB);
            var Bn = thisFrame.links[key];  // this is the link to work with
            if (nodeB === Bn.nodeA) {  // check if
                if (nodeA === Bn.nodeB && objectA === Bn.objectB && frameA === Bn.frameB) {
                    signalIsOk = false;
                    break;
                } else {
                    searchL(objectA, frameA, nodeA, Bn.objectB, Bn.frameB, Bn.nodeB);
                }
            }
        }
    }

    // check that there is no endless loops through it self or any other connections
    if (signalIsOk) {
        searchL(objectAKey, frameAKey, nodeAKey, objectBKey, frameBKey, nodeBKey);
    }

    return signalIsOk;
};

/**
 * Debug method to reset the position of a specified frame or node.
 * Doesn't actually reset the position to origin, just refreshes the position, so you need to also manually set the position to 0,0,[] before calling this
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string|undefined} type - "ui" if resetting a frame, null/undefined if resetting a node
 */
realityEditor.network.sendResetContent = function (objectKey, frameKey, nodeKey, type) {

    var tempThisObject = {};
    if (type !== "ui") {
        tempThisObject = realityEditor.getNode(objectKey, frameKey, nodeKey);
    } else {
        tempThisObject = realityEditor.getFrame(objectKey, frameKey);
    }

    if (!tempThisObject) {
        console.warn("Can't reset content of undefined object", objectKey, frameKey, nodeKey, type);
        return;
    }
    
    var positionData = realityEditor.gui.ar.positioning.getPositionData(tempThisObject);
    
    var content = {};
    content.x = positionData.x;
    content.y = positionData.y;
    content.scale = positionData.scale;

    if (typeof positionData.matrix === "object") {
        content.matrix = positionData.matrix;
    }

    content.lastEditor = globalStates.tempUuid;
    
    if (typeof content.x === "number" && typeof content.y === "number" && typeof content.scale === "number") {
        realityEditor.gui.ar.utilities.setAverageScale(objects[objectKey]);
        var urlEndpoint;
        if (type !== 'ui') {
            urlEndpoint = 'http://' + objects[objectKey].ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/nodeSize/";
        } else {
            urlEndpoint = 'http://' + objects[objectKey].ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/size/";
        }
        console.log('url endpoint = ' + urlEndpoint);
        this.postData(urlEndpoint, content);
    }
    
};

/**
 * Makes a POST request to commit the state of the specified object to the server's git system, so that it can be reset to this point
 * @param {string} objectKey
 */
realityEditor.network.sendSaveCommit = function (objectKey) {
   var urlEndpoint = 'http://' + objects[objectKey].ip + ':' + httpPort + '/object/' + objectKey + "/saveCommit/";
   var content = {};
   this.postData(urlEndpoint, content, function(){});
};

/**
 * Makes a POST request to reset the state of the object on the server to the last commit
 * (eventually updates the local state too, after the server resets and pings the app with an update action message)
 * @param {string} objectKey
 */
realityEditor.network.sendResetToLastCommit = function (objectKey) {
    var urlEndpoint = 'http://' + objects[objectKey].ip + ':' + httpPort + '/object/' + objectKey + "/resetToLastCommit/";
    var content = {};
    this.postData(urlEndpoint, content, function(){});
};

/**
 * Gets set as the "onload" function of each frame/node iframe element.
 * When the iframe contents finish loading, update some local state that depends on its size, and
 * post a message into the frame with data including its object/frame/node keys, the GUI state, etc
 * @param objectKey
 * @param frameKey
 * @param nodeKey
 */
realityEditor.network.onElementLoad = function (objectKey, frameKey, nodeKey) {
    
    realityEditor.gui.ar.draw.notLoading = false;
    
    if (nodeKey === "null") nodeKey = null;

    var version = 170;
    var object = realityEditor.getObject(objectKey);
    if (object) {
        version = object.integerVersion;
    }
    var frame = realityEditor.getFrame(objectKey, frameKey);
    var nodes = frame ? frame.nodes : {};

    var oldStyle = {
        obj: objectKey,
        pos: nodeKey,
        objectValues: object ? object.nodes : {},
        interface: globalStates.interface
    };

    var simpleNodes = this.utilities.getNodesJsonForIframes(nodes);

    var newStyle = {
        object: objectKey,
        frame: frameKey,
        objectData: {},
        node: nodeKey,
        nodes: simpleNodes,
        interface: globalStates.interface
    };

    if (version < 170 && objectKey === nodeKey) {
        newStyle = oldStyle;
    }

    if (object && object.ip) {
        newStyle.objectData = {
            ip: object.ip
        };
    }
    let activeKey = nodeKey || frameKey;
    
    // if (globalDOMCache['svg' + activeKey]) {
    //     realityEditor.gui.ar.moveabilityOverlay.createSvg(globalDOMCache['svg' + activeKey]);
    // }
    
    globalDOMCache["iframe" + activeKey].setAttribute('loaded', true);
    globalDOMCache["iframe" + activeKey].contentWindow.postMessage(JSON.stringify(newStyle), '*');

    if (nodeKey) {
        var node = realityEditor.getNode(objectKey, frameKey, nodeKey);
        if (node.type === 'logic') {
            realityEditor.gui.ar.draw.updateLogicNodeIcon(node);
        }
    }
    
    // adjust move-ability corner UI to match true width and height of frame contents
    if (globalDOMCache['iframe' + activeKey].clientWidth > 0) { // get around a bug where corners would resize to 0 for new logic nodes
        var trueSize = {
            width: globalDOMCache['iframe' + activeKey].clientWidth,
            height: globalDOMCache['iframe' + activeKey].clientHeight
        };

        var cornerPadding = 24;
        globalDOMCache[activeKey].querySelector('.corners').style.width = trueSize.width + cornerPadding + 'px';
        globalDOMCache[activeKey].querySelector('.corners').style.height = trueSize.height + cornerPadding + 'px';
    }

    // show the blue corners as soon as the frame loads
    if (realityEditor.device.editingState.frame === frameKey && realityEditor.device.editingState.node === nodeKey) {
        document.getElementById('svg' + (nodeKey || frameKey)).classList.add('visibleEditingSVG');
        globalDOMCache[(nodeKey || frameKey)].querySelector('.corners').style.visibility = 'visible';
    }

    this.cout("on_load");
};

/**
 * Makes a POST request to add a lock to the specified node. Whether or not you are actually allowed to add the
 *   lock is determined within the server, based on the state of the node and the password and lock type you provide
 * @todo: get locks working again, this time with real security (e.g. encryption)
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {{lockPassword: string, lockType: string}} content - lockType is "full" or "half" (see documentation in device/security.js)
 */
realityEditor.network.postNewLockToNode = function (ip, objectKey, frameKey, nodeKey, content) {
    console.log("sending node lock (" + content.lockType + ")");
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/addLock/", content, function () {
    });
};

/**
 * Makes a DELETE request to remove a lock from the specified node, given a password to use to unlock it
 * @todo: encrypt / etc
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} password
 */
realityEditor.network.deleteLockFromNode = function (ip, objectKey, frameKey, nodeKey, password) {
// generate action for all links to be reloaded after upload
    console.log("I am deleting a lock: " + ip);
    console.log("password is " + password);
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/password/" + password + "/deleteLock/");
    //console.log("deleteLockFromObject");
};

/**
 * Makes a POST request to add a lock to the specified link.
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {{lockPassword: string, lockType: string}} content
 */
realityEditor.network.postNewLockToLink = function (ip, objectKey, frameKey, linkKey, content) {

// generate action for all links to be reloaded after upload
    console.log("sending link lock (" + content.lockType + ")");
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + "/addLock/", content, function () {
    });
    // postData('http://' +ip+ ':' + httpPort+"/", content);
    //console.log('post --- ' + 'http://' + ip + ':' + httpPort + '/object/' + thisObjectKey + "/link/lock/" + thisLinkKey);

};

/**
 * Makes a DELETE request to remove a lock from the specific link
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {string} password
 */
realityEditor.network.deleteLockFromLink = function (ip, objectKey, frameKey, linkKey, password) {
// generate action for all links to be reloaded after upload
    console.log("I am deleting a link lock: " + ip);
    console.log("lockPassword is " + password);
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + "/password/" + password + "/deleteLock/");
    //console.log('delete --- ' + 'http://' + ip + ':' + httpPort + '/object/' + thisObjectKey + "/link/lock/" + thisLinkKey + "/password/" + authenticatedUser);
};

/**
 * Makes a POST request when a frame is pushed into a screen or pulled out into AR, to update state on server
 * (updating on server causes the in-screen version of the frame to show/hide as a response)
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} newVisualization - (either 'ar' or 'screen') the new visualization mode you want to change to
 * @param {{x: number, y: number, scale: number, matrix: Array.<number>}|null} oldVisualizationPositionData - optionally sync the other position data to the server before changing visualization modes. In practice, when we push into a screen we reset the AR frame's positionData to the origin 
 */
realityEditor.network.updateFrameVisualization = function(ip, objectKey, frameKey, newVisualization, oldVisualizationPositionData) {

    var urlEndpoint = 'http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/visualization/";
    var content = {
        visualization: newVisualization,
        oldVisualizationPositionData: oldVisualizationPositionData
    };
    this.postData(urlEndpoint, content, function (err, response) {
        console.log('set visualization to ' + newVisualization + ' on server');
        console.log(err, response);
    });
};

/**
 * Makes a DELETE request to remove a frame's publicData from the server
 * (used e.g. when a frame is moved from one object to another, the old copy of its public data needs to be deleted)
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 */
realityEditor.network.deletePublicData = function(ip, objectKey, frameKey) {
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/publicData");
};

/**
 * Makes a POST request to upload a frame's publicData to the server
 * (used e.g. when a frame is moved from one object to another, to upload public data to new object/server)
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param publicData
 */
realityEditor.network.postPublicData = function(ip, objectKey, frameKey, publicData) {

    var urlEndpoint = 'http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/publicData";
    var content = {
        publicData: publicData,
        lastEditor: globalStates.tempUuid
    };

    this.postData(urlEndpoint, content, function (err, response) {
        console.log('set publicData to ' + publicData + ' on server');
        console.log(err, response);
    });
};

/**
 * Helper function to locate the iframe element associated with a certain frame, and post a message into it
 * @param {string} frameKey
 * @param {object} message - JSON data to send into the frame
 */
realityEditor.network.postMessageIntoFrame = function(frameKey, message) {
    var frame = document.getElementById('iframe' + frameKey);
    if (frame) {
        frame.contentWindow.postMessage(JSON.stringify(message), "*");
    }
};

/**
 * Makes a POST request to update groupIds on the server when a frame is added to or removed from a group
 * @param {string} ip
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string|null} newGroupID - either groupId or null for none
 */
realityEditor.network.updateGroupings = function(ip, objectKey, frameKey, newGroupID) {
    var urlEndpoint = 'http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/group/";
    var content = {
        group: newGroupID,
        lastEditor: globalStates.tempUuid
    };
    this.postData(urlEndpoint, content, function (err, response) {
        console.log('set group to ' + newGroupID + ' on server');
        console.log(err, response);
    })
};

/**
 * Makes a POST request to update the (x,y,scale,matrix) position data of a frame or node on the server
 * @param {Frame|Node} activeVehicle
 * @param {boolean|undefined} ignoreMatrix - include this if you only want to update (x,y,scale) not the transformation matrix
 */
realityEditor.network.postVehiclePosition = function(activeVehicle, ignoreMatrix) {
    if (activeVehicle) {
        var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
        var content = {};
        content.x = positionData.x;
        content.y = positionData.y;
        content.scale = positionData.scale;
        if (!ignoreMatrix) {
            content.matrix = positionData.matrix;
        }
        content.lastEditor = globalStates.tempUuid;

        var endpointSuffix = realityEditor.isVehicleAFrame(activeVehicle) ? "/size/" : "/nodeSize/";
        var keys = realityEditor.getKeysFromVehicle(activeVehicle);
        var urlEndpoint = 'http://' + realityEditor.getObject(keys.objectKey).ip + ':' + httpPort + '/object/' + keys.objectKey + "/frame/" + keys.frameKey + "/node/" + keys.nodeKey + endpointSuffix;
        realityEditor.network.postData(urlEndpoint, content);
    }
};
