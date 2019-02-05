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

        for (var linkKey in objects[objectKey].frames[frameKey].links) {
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
        for (var nodeKey in objects[objectKey].frames[frameKey].nodes) {
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

    for (var nodeKey in objects[objectKey].frames[frameKey].nodes) {
        objects[objectKey].frames[frameKey].nodes[nodeKey].uuid = nodeKey;
    }

    for (var linkKey in objects[objectKey].frames[frameKey].links) {
        objects[objectKey].frames[frameKey].links[linkKey].uuid = linkKey;
    }

};


realityEditor.network.addHeartbeatObject = function (beat) {

    var _this = this;
    if (beat.id) {
        if (!objects[beat.id]) {
            this.getData(beat.id, null, null, 'http://' + beat.ip + ':' + httpPort + '/object/' + beat.id, function (objectKey, frameKey, nodeKey, msg) {
                if (msg && objectKey) {

                    realityEditor.app.tap();

                    objects[objectKey] = msg;
                    
                    var thisObject = realityEditor.getObject(objectKey);
                    // this is a work around to set the state of an objects to not being visible.
                    realityEditor.gui.ar.draw.setObjectVisible(thisObject, false);
                    thisObject.screenZ = 1000;
                    thisObject.fullScreen = false;
                    thisObject.sendMatrix = false;
                    thisObject.sendAcceleration = false;
                    thisObject.integerVersion = parseInt(objects[objectKey].version.replace(/\./g, ""));

                    // if (thisObject.matrix === null || typeof thisObject.matrix !== "object") {
                    //     thisObject.matrix = [];
                    // }

                    for (var frameKey in objects[objectKey].frames) {
                       var thisFrame = realityEditor.getFrame(objectKey, frameKey);

                        // thisFrame.objectVisible = false; // gets set to false in draw.setObjectVisible function
                        thisFrame.screenZ = 1000;
                        thisFrame.fullScreen = false;
                        thisFrame.sendMatrix = false;
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
                        
                        for (var nodeKey in objects[objectKey].frames[frameKey].nodes) {
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
                                var container = document.getElementById('craftingBoard');
                                thisNode.grid = new _this.realityEditor.gui.crafting.grid.Grid(container.clientWidth - menuBarWidth, container.clientHeight, CRAFTING_GRID_WIDTH, CRAFTING_GRID_HEIGHT, thisObject.uuid);
                                //_this.realityEditor.gui.crafting.utilities.convertLinksFromServer(thisObject);
                            }
                        }
                    }

                    if (!thisObject.protocol) {
                        thisObject.protocol = "R0";
                    }
/*
                    if (thisObject.integerVersion < 170) {

                        _this.utilities.rename(thisObject, "folder", "name");
                        _this.utilities.rename(thisObject, "objectValues", "nodes");
                        _this.utilities.rename(thisObject, "objectLinks", "links");
                        delete thisObject["matrix3dMemory"];

                        for (var linkKey in objects[objectKey].links) {
                            thisObject = objects[objectKey].links[linkKey];

                            _this.utilities.rename(thisObject, "ObjectA", "objectA");
                            _this.utilities.rename(thisObject, "locationInA", "nodeA");
                            _this.utilities.rename(thisObject, "ObjectNameA", "nameA");

                            _this.utilities.rename(thisObject, "ObjectB", "objectB");
                            _this.utilities.rename(thisObject, "locationInB", "nodeB");
                            _this.utilities.rename(thisObject, "ObjectNameB", "nameB");
                            _this.utilities.rename(thisObject, "endlessLoop", "loop");
                            _this.utilities.rename(thisObject, "countLinkExistance", "health");
                            if (!objects[objectKey].frames[objectKey]) objects[objectKey].frames[objectKey] = {};
                            objects[objectKey].frames[objectKey].links[linkKey] = thisObject;
                        }


                        //for (var nodeKey in objects[thisKey].nodes) {
                        //  _this.utilities.rename(objects[thisKey].nodes, nodeKey, thisKey + nodeKey);
                        // }
                        for (var nodeKey in objects[objectKey].nodes) {
                            thisObject = objects[objectKey].nodes[nodeKey];
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
                        objects[objectKey].frames[objectKey].nodes = objects[objectKey].nodes;
                    }
                    */

                    objects[objectKey].uuid = objectKey;

                    for (var frameKey in objects[objectKey].frames) {
                        objects[objectKey].frames[frameKey].uuid = frameKey;
                        for (var nodeKey in objects[objectKey].frames[frameKey].nodes) {
                            objects[objectKey].frames[frameKey].nodes[nodeKey].uuid = nodeKey;
                        }

                        for (var linkKey in objects[objectKey].frames[frameKey].links) {
                            objects[objectKey].frames[frameKey].links[linkKey].uuid = linkKey;
                        }
                    }

                    realityEditor.gui.ar.utilities.setAverageScale(objects[objectKey]);

                    _this.cout(JSON.stringify(objects[objectKey]));

                    // todo this needs to be looked at
                    _this.realityEditor.gui.memory.addObjectMemory(objects[objectKey]);

                    realityEditor.network.objectDiscoveredCallbacks.forEach(function(callback) {
                        callback(objects[objectKey], objectKey);
                    });

                }
            });
        }
    }

};

// TODO: why is frameKey passed in here? if we just iterate through all the frames anyways?
realityEditor.network.updateObject = function (origin, remote, objectKey, frameKey) {

    console.log(origin, remote, objectKey, frameKey);

    console.warn('updateObject: ' + frameKey);

    origin.x = remote.x;
    origin.y = remote.y;
    origin.scale = remote.scale;

    if (remote.matrix) {
        origin.matrix = remote.matrix;
    }
    
    // update each frame in the object

    
    for (var frameKey in remote.frames) {
        if (!remote.frames.hasOwnProperty(frameKey)) continue;
        if (!origin.frames[frameKey]) {
            origin.frames[frameKey] = remote.frames[frameKey];

            origin.frames[frameKey].width = remote.frames[frameKey].width || 300;
            origin.frames[frameKey].height = remote.frames[frameKey].height || 300;
            
            origin.frames[frameKey].uuid = frameKey;

            console.log('added new frame', origin.frames[frameKey]);
            
            // var frameType = origin.frames[frameKey].type;
            // var frameUrl = '../../frames/' + frameType + '/index.html';
            // realityEditor.gui.ar.draw.addElement(frameUrl, objectKey, frameKey, null, 'ui', origin.frames[frameKey]);
            
        } else {
            origin.frames[frameKey].visualization = remote.frames[frameKey].visualization;
            origin.frames[frameKey].ar = remote.frames[frameKey].ar;
            origin.frames[frameKey].screen = remote.frames[frameKey].screen;
            origin.frames[frameKey].name = remote.frames[frameKey].name;
            
            // console.log('updated frame');
            
            // now update each node in the frame
            var remoteNodes = remote.frames[frameKey].nodes;
            var originNodes = origin.frames[frameKey].nodes;
            
            for (var nodeKey in remoteNodes) {
                if (!remoteNodes.hasOwnProperty(nodeKey)) continue;

                var originNode = originNodes[nodeKey];
                var remoteNode = remoteNodes[nodeKey];
                realityEditor.network.updateNode(originNode, remoteNode, objectKey, frameKey, nodeKey);

                // if (!originNodes[nodeKey]) {
                //     originNodes[nodeKey] = remoteNodes[nodeKey];
                // } else {
                //
                //     originNodes[nodeKey].x = remoteNodes[nodeKey].x;
                //     originNodes[nodeKey].y = remoteNodes[nodeKey].y;
                //     originNodes[nodeKey].scale = remoteNodes[nodeKey].scale;
                //
                //     originNodes[nodeKey].name = remoteNodes[nodeKey].name;
                //     originNodes[nodeKey].frameId = remoteNodes[nodeKey].frameId; // TODO: refactor every node update into a reusable function rather than reimplementing
                //     originNodes[nodeKey].objectId = remoteNodes[nodeKey].objectId;
                //
                //     if (remoteNodes[nodeKey].text) {
                //         originNodes[nodeKey].text = remoteNodes[nodeKey].text;
                //     }
                //     if (remoteNodes[nodeKey].matrix) {
                //         originNodes[nodeKey].matrix = remoteNodes[nodeKey].matrix;
                //     }
                // }
                //
                // if (globalDOMCache["iframe" + nodeKey]) {
                //     if (globalDOMCache["iframe" + nodeKey]._loaded) {
                //         realityEditor.network.onElementLoad(objectKey, frameKey, nodeKey);
                //     }
                // }
            }

            // remove extra nodes from origin that don't exist in remote
            for (var nodeKey in originNodes) {
                if (originNodes.hasOwnProperty(nodeKey) && !remoteNodes.hasOwnProperty(nodeKey)) {
                    realityEditor.gui.ar.draw.deleteNode(objectKey, frameKey, nodeKey);
                }
            }
            
        }

        origin.frames[frameKey].links = JSON.parse(JSON.stringify(remote.frames[frameKey].links));
        
        // for (var linkKey in remote.frames[frameKey].links) {
        //     origin.frames[frameKey].links[linkKey] = JSON.parse(JSON.stringify(remote.links[linkKey]));
        // }
        
        if (globalDOMCache["iframe" + frameKey]) {
            if (globalDOMCache["iframe" + frameKey]._loaded) {
                realityEditor.network.onElementLoad(objectKey, frameKey, null);
            }
        }
    }

    // remove extra frames from origin that don't exist in remote
    for (var frameKey in origin.frames) {
        if (origin.frames.hasOwnProperty(frameKey) && !remote.frames.hasOwnProperty(frameKey)) {
            // delete origin.frames[frameKey];
            realityEditor.gui.ar.draw.deleteFrame(objectKey, frameKey);
        }
    }

    // for (var nodeKey in remote.nodes) {
    //     if (!origin.nodes[nodeKey]) {
    //         origin.nodes[nodeKey] = remote.nodes[nodeKey];
    //     } else {
    //
    //         origin.nodes[nodeKey].x = remote.nodes[nodeKey].x;
    //         origin.nodes[nodeKey].y = remote.nodes[nodeKey].y;
    //         origin.nodes[nodeKey].scale = remote.nodes[nodeKey].scale;
    //
    //         origin.nodes[nodeKey].name = remote.nodes[nodeKey].name;
    //         if (remote.nodes[nodeKey].text)
    //             origin.nodes[nodeKey].text = remote.nodes[nodeKey].text;
    //         if (remote.nodes[nodeKey].matrix)
    //             origin.nodes[nodeKey].matrix = remote.nodes[nodeKey].matrix;
    //     }
    //
    //     if (globalDOMCache["iframe" + nodeKey]) {
    //         if (globalDOMCache["iframe" + nodeKey]._loaded) {
    //             realityEditor.network.onElementLoad(objectKey, frameKey, nodeKey);
    //         }
    //     }
    // }
    // TODO: reimplement widget frames (uncomment frame.js)
    // var missingFrames = {};
    // for (var frameKey in origin.frames) {
    //     missingFrames[frameKey] = true;
    // }
    //
    // if (!remote.frames) {
    //     remote.frames = {};
    // }
    //
    // for (var frameKey in remote.frames) {
    //     if (!origin.frames[frameKey]) {
    //         origin.frames[frameKey] = remote.frames[frameKey];
    //         continue;
    //     }
    //     missingFrames[frameKey] = false;
    //     var oFrame = origin.frames[frameKey];
    //     var rFrame = remote.frames[frameKey];
    //     oFrame.x = rFrame.x;
    //     oFrame.y = rFrame.y;
    //     oFrame.scale = rFrame.scale; // TODO: does developer property get set?
    //
    //     oFrame.name = rFrame.name;
    //     if (rFrame.matrix) {
    //         oFrame.matrix = rFrame.matrix;
    //     }
    //
    //     if (globalDOMCache["iframe" + frameKey] && globalDOMCache["iframe" + frameKey]._loaded) {
    //         realityEditor.network.onElementLoad(thisKey, frameKey);
    //     }
    //
    // }
    //
    // for (var frameKey in missingFrames) {
    //     if (!missingFrames[frameKey]) {
    //         continue;
    //     }
    //     // Frame was deleted on remote, let's delete it here
    //     realityEditor.gui.frame.deleteLocally(origin.objectId, frameKey);
    // }
};


realityEditor.network.updateNode = function (origin, remote, objectKey, frameKey, nodeKey) {

    //console.log(remote.links, origin.links, remote.blocks, origin.blocks);

    var isRemoteNodeDeleted = (Object.keys(remote).length === 0 && remote.constructor === Object);

    // delete local node if needed
    if (origin && isRemoteNodeDeleted) {

        realityEditor.gui.ar.draw.deleteNode(objectKey, frameKey, nodeKey);

        var thisNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
        
        if (thisNode) {
            delete objects[objectKey].frames[frameKey].nodes[nodeKey];
        }
        return;
    }

    if (!origin) {

        origin = remote;

        if (origin.type === "logic") {
            if (!origin.guiState) {
                origin.guiState = new LogicGUIState();
            }

            if (!origin.grid) {
                var container = document.getElementById('craftingBoard');
                origin.grid = new realityEditor.gui.crafting.grid.Grid(container.clientWidth - menuBarWidth, container.clientHeight, CRAFTING_GRID_WIDTH, CRAFTING_GRID_HEIGHT, origin.uuid);
            }

        }

        objects[objectKey].frames[frameKey].nodes[nodeKey] = origin;

    } else {

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

        if (origin.type === "logic") {
            if (!origin.guiState) {
                origin.guiState = new LogicGUIState();
            }

            if (!origin.grid) {
                var container = document.getElementById('craftingBoard');
                origin.grid = new realityEditor.gui.crafting.grid.Grid(container.clientWidth - menuBarWidth, container.clientHeight, CRAFTING_GRID_WIDTH, CRAFTING_GRID_HEIGHT, origin.uuid);
            }

        }

    }

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
            if (globalDOMCache["iframe" + nodeKey]._loaded)
                realityEditor.network.onElementLoad(objectKey, frameKey, nodeKey);
        }
    }

};

realityEditor.network.onAction = function (action) {
    console.log('onAction');
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
            var urlEndpoint = 'http://' + objects[thisAction.reloadLink.object].ip + ':' + httpPort + '/object/' + thisAction.reloadLink.object + '/frame/' +thisAction.reloadLink.frame;
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

                for (var nodeKey in thisFrame.nodes) {
                    thisFrame.nodes[nodeKey].uuid = nodeKey;
                }

                for (var linkKey in thisFrame.links) {
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

            var urlEndpoint = 'http://' + objects[thisAction.reloadObject.object].ip + ':' + httpPort + '/object/' + thisAction.reloadObject.object;
            this.getData(thisAction.reloadObject.object, thisAction.reloadObject.frame, null, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {
                
            // }
            // this.getData('http://' + objects[thisAction.reloadObject.object].ip + ':' + httpPort + '/object/' + thisAction.reloadObject.object, thisAction.reloadObject.object, function (req, thisKey) {

                if (objects[objectKey].integerVersion < 170) {
                    if (typeof res.objectValues !== "undefined") {
                        res.nodes = res.objectValues;
                    }
                }
                
                console.log("updateObject", objects[objectKey], res, objectKey, frameKey);

                realityEditor.network.updateObject(objects[objectKey], res, objectKey, frameKey);

                _this.cout("got object");

            });
        }
    }
    
    if (typeof thisAction.reloadFrame !== "undefined") {
        var thisFrame = realityEditor.getFrame(thisAction.reloadFrame.object, thisAction.reloadFrame.frame);
        if (!thisFrame) {
            console.log('this is a new frame... add it to the object...');

            // actionSender({reloadFrame: {object: objectID, frame: frameID, propertiesToIgnore: propertiesToIgnore}, lastEditor: body.lastEditor});
            thisFrame = new Frame();
            
            var thisObject = realityEditor.getObject(thisAction.reloadFrame.object);
            thisObject.frames[thisAction.reloadFrame.frame] = thisFrame;
        }
        
        if (thisFrame) {

            var urlEndpoint = 'http://' + objects[thisAction.reloadFrame.object].ip + ':' + httpPort + '/object/' + thisAction.reloadFrame.object + '/frame/' + thisAction.reloadFrame.frame;
            
            this.getData(thisAction.reloadFrame.object, thisAction.reloadFrame.frame, thisAction.reloadFrame.node, urlEndpoint, function(objectKey, frameKey, nodeKey, res) {
                console.log('got frame');
                
                for (var thisKey in res) {
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
                            for (var nodeKey in res.nodes) {
                                if (!thisFrame.nodes.hasOwnProperty(nodeKey)) {
                                    thisFrame.nodes[nodeKey] = res.nodes[nodeKey];
                                } else {
                                    for (var propertyKey in res.nodes[nodeKey]) {
                                        thisFrame.nodes[nodeKey][propertyKey] = res.nodes[nodeKey][propertyKey];
                                    }
                                }
                            }
                            continue;
                        }
                    }
                    
                    thisFrame[thisKey] = res[thisKey];
                }
                
            });
        }
    }

    if (typeof thisAction.reloadNode !== "undefined") {
        console.log("gotdata: " + thisAction.reloadNode.object + " " + thisAction.reloadNode.frame+ " " + thisAction.reloadNode.node);
       // console.log('http://' + objects[thisAction.reloadNode.object].ip + ':' + httpPort + '/object/' + thisAction.reloadNode.object + "/node/" + thisAction.reloadNode.node + "/");
       var thisFrame = realityEditor.getFrame(thisAction.reloadNode.object, thisAction.reloadNode.frame);
       
        if (thisFrame !== null) {
            // TODO: getData         webServer.get('/object/*/') ... instead of /object/node

            var urlEndpoint = 'http://' + objects[thisAction.reloadNode.object].ip + ':' + httpPort + '/object/' + thisAction.reloadNode.object + '/frame/' + thisAction.reloadNode.frame + '/node/' + thisAction.reloadNode.node + '/';
            this.getData(thisAction.reloadObject.object, thisAction.reloadObject.frame, thisAction.reloadObject.node, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {

            // this.getData(
                // 'http://' + objects[thisAction.reloadNode.object].ip + ':' + httpPort + '/object/' + thisAction.reloadNode.object + "/node/" + thisAction.reloadNode.node + "/", thisAction.reloadNode.object, function (req, objectKey, frameKey, nodeKey) {

                    console.log("------------------------------");
                    console.log(objectKey + "  " + frameKey + " " + nodeKey);
                    console.log(req);

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
        console.log(globalStates.instantState);
        if (globalStates.instantState) {
            realityEditor.gui.instantConnect.logic(thisAction.advertiseConnection);
        }
    }


    if (thisAction.loadMemory) {
        var id = thisAction.loadMemory.object;
        var urlEndpoint = 'http://' + thisAction.loadMemory.ip + ':' + httpPort + '/object/' + id;

        this.getData(id, null, null, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {

            // this.getData(url, id, function (req, thisKey) {
            _this.cout('received memory', res.memory);
            objects[objectKey].memory = res.memory;
            _this.realityEditor.gui.memory.addObjectMemory(objects[objectKey]);
        });
    }
    
    if (thisAction.loadLogicIcon) {
        this.loadLogicIcon(thisAction.loadLogicIcon);
    }
    
    if (thisAction.addFrame) {
        console.log("addFrame");
        
        var thisObject = realityEditor.getObject(thisAction.addFrame.objectID);
        
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

    for (var key in thisAction) {
        this.cout("found action: " + JSON.stringify(key));
    }
};

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
    
    // console.log("      onInternalPostMessage");
    // console.log("frame: " + msgContent.frame + ", node: " + msgContent.node + ", width: " + msgContent.width);
    // console.log("\n\n");

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
        var activeKey = (!!msgContent.node) ? (msgContent.node) : (msgContent.frame);
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
            svg.style.display = 'inline';
        } else {
            svg.style.display = 'none';
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
            var activeKey = (!!msgContent.node) ? (msgContent.node) : (msgContent.frame);
            // send the projection matrix into the iframe (e.g. for three.js to use)
            document.getElementById("iframe" + activeKey).contentWindow.postMessage(
                '{"projectionMatrix":' + JSON.stringify(globalStates.realProjectionMatrix) + "}", '*');
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
        for (var i = 0; i < iframes.length; i++) {
       
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

    if (typeof msgContent.fullScreen === "boolean") {
        if (msgContent.fullScreen === true) {
            
            tempThisObject.fullScreen = true;
            console.log("fullscreen: " + tempThisObject.fullScreen);
            var zIndex = tempThisObject.fullscreenZPosition || 200; //200 + (tempThisObject.fullscreenZPosition || 0);
            document.getElementById("object" + msgContent.frame).style.webkitTransform =
                'matrix3d(1, 0, 0, 0,' +
                '0, 1, 0, 0,' +
                '0, 0, 1, 0,' +
                '0, 0, ' + zIndex + ', 1)';
            
            globalDOMCache[tempThisObject.uuid].style.opacity = '0'; // svg overlay still exists so we can reposition, but invisible
            globalDOMCache[tempThisObject.uuid].style.left = '0';
            globalDOMCache[tempThisObject.uuid].style.top = '0';
            
            globalDOMCache['iframe' + tempThisObject.uuid].style.left = '0';
            globalDOMCache['iframe' + tempThisObject.uuid].style.top = '0';
            globalDOMCache['iframe' + tempThisObject.uuid].style.margin = '-2px';
            
            if (realityEditor.device.editingState.frame === msgContent.frame) {
                realityEditor.device.resetEditingState();
                realityEditor.device.clearTouchTimer();
            }

        }
        if (msgContent.fullScreen === false) {
            tempThisObject.fullScreen = false;
            
            if (tempThisObject.uuid) {
                globalDOMCache[tempThisObject.uuid].style.opacity = '1'; // svg overlay still exists so we can reposition, but invisible
            }
            
            // TODO: reset left/top offset when returns to non-fullscreen?
            
            var containingObject = realityEditor.getObject(msgContent.object);
            if (!containingObject.objectVisible) {
                containingObject.objectVisible = true;
            }
        }

    } else if(typeof msgContent.fullScreen === "string") {
        if (msgContent.fullScreen === "sticky") {
            
            tempThisObject.fullScreen = "sticky";
            console.log("sticky fullscreen: " + tempThisObject.fullScreen);
            var zIndex = tempThisObject.fullscreenZPosition || 200; //200 + (tempThisObject.fullscreenZPosition || 0);
            document.getElementById("object" + msgContent.frame).style.webkitTransform =
                'matrix3d(1, 0, 0, 0,' +
                '0, 1, 0, 0,' +
                '0, 0, 1, 0,' +
                '0, 0, ' + zIndex + ', 1)';

            globalDOMCache[tempThisObject.uuid].style.opacity = '0';
            globalDOMCache[tempThisObject.uuid].style.left = '0';
            globalDOMCache[tempThisObject.uuid].style.top = '0';
            
            globalDOMCache['iframe' + tempThisObject.uuid].style.left = '0';
            globalDOMCache['iframe' + tempThisObject.uuid].style.top = '0';
            globalDOMCache['iframe' + tempThisObject.uuid].style.margin = '-2px';

        }
    }

    if(typeof msgContent.stickiness === "boolean") {
        tempThisObject.stickiness = msgContent.stickiness;
    }

    // todo this needs to be checked in to the present version
    if (typeof msgContent.createNode !== "undefined") {
        var node = new Node();
        node.name = msgContent.createNode.name;
        node.frame = msgContent.node;
        var nodeKey = node.frame + msgContent.createNode.name;
        var nodesIndex = 0;
        var object = objects[msgContent.object];
        for (var otherNodeKey in object.nodes) {
            var otherNode = object.nodes[otherNodeKey];
            if (otherNodeKey === nodeKey) {
                break;
            }
            if (otherNode.frame === msgContent.node) {
                nodesIndex += 1;
            }
        }
        node.x = (tempThisObject.x || 0) + 200 * nodesIndex;
        node.y = (tempThisObject.y || 0) + 200 * nodesIndex;
        object.nodes[nodeKey] = node;
        realityEditor.network.postNewNode(object.ip, msgContent.object, nodeKey, node);
    }

    if (typeof msgContent.beginTouchEditing !== "undefined") {
        var activeKey = msgContent.node || msgContent.frame;
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
        if (event.type === 'touchmove') {
            if (overlayDiv.style.display !== 'inline') {
                // overlayDiv.style.display = "inline";
                realityEditor.device.onDocumentPointerDown(fakeEvent);
            //     realityEditor.device.onMultiTouchStart(fakeEvent);
            }
            
            // var frameCanvasElement = document.getElementById('canvas' + msgContent.frame);
            // if (frameCanvasElement.style.display !== 'inline') {
            //     frameCanvasElement.style.display = "inline";
            // }

            globalStates.pointerPosition = [event.x, event.y];
            // Translate up 1200px to be above pocket layer, crafting board, settings menu, and menu buttons
            overlayDiv.style.transform = 'translate3d(' + event.x + 'px, ' + event.y + 'px, 1200px)';
            
            // realityEditor.device.onDocumentPointerMove(fakeEvent);
            // realityEditor.device.onTouchMove(fakeEvent);
            realityEditor.device.onMultiTouchMove(fakeEvent);
            
        } else if (event.type === 'touchend') {
            realityEditor.device.onDocumentPointerUp(fakeEvent);
            realityEditor.device.onMultiTouchEnd(fakeEvent);
            globalStates.tempEditingMode = false;
            console.log('stop editing mode!!!');
            globalStates.unconstrainedSnapInitialPosition = null;
            realityEditor.device.deactivateFrameMove(msgContent.frame);
            var frame = document.getElementById('iframe' + msgContent.frame);
            if (frame) {
                frame.contentWindow.postMessage(JSON.stringify({
                    stopTouchEditing: true
                }), "*");
            }
        }
    }

    if (typeof msgContent.moveDelay !== "undefined") {
        
        var activeVehicle = realityEditor.getFrame(msgContent.object, msgContent.frame);
        
        activeVehicle.moveDelay = msgContent.moveDelay;
        console.log('move delay of ' + activeVehicle.name + ' is set to ' + activeVehicle.moveDelay);
        
    }

    if (msgContent.loadLogicIcon) {
        this.loadLogicIcon(msgContent);
    }
    
    if (msgContent.loadLogicName) {
        this.loadLogicName(msgContent);
    }
    
    if (typeof msgContent.publicData !== "undefined") {
        
        var frame = realityEditor.getFrame(msgContent.object, msgContent.frame);
        var node = realityEditor.getNode(msgContent.object, msgContent.frame, msgContent.node);
        
        if (frame && node) {
            if (!publicDataCache.hasOwnProperty(msgContent.frame)) {
                publicDataCache[msgContent.frame] = {};
            }
            publicDataCache[msgContent.frame][node.name] = msgContent.publicData;
            console.log('set public data of ' + msgContent.frame + ', ' + node.name + ' to: ' + msgContent.publicData);
            frame.publicData = msgContent.publicData;
            var keys = realityEditor.getKeysFromVehicle(frame);
            realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, 'publicData', msgContent.publicData);
        }
        
    }

    if (typeof msgContent.videoRecording !== "undefined") {

        if (msgContent.videoRecording) {
            realityEditor.device.videoRecording.startRecordingForFrame(msgContent.object, msgContent.frame);
        } else {
            realityEditor.device.videoRecording.stopRecordingForFrame(msgContent.object, msgContent.frame);
        }
        
    }

    if (typeof msgContent.sendToBackground !== "undefined") {

        var iframe = globalDOMCache['iframe' + tempThisObject.uuid];
        var src = iframe.src;
        
        var desktopBackgroundRenderer = document.getElementById('desktopBackgroundRenderer');
        if (desktopBackgroundRenderer) {
            if (desktopBackgroundRenderer.src !== src) {
                desktopBackgroundRenderer.src = src;
            }
        }
        
        if (iframe) {
            iframe.style.display = 'none';
        }
        
        var div = globalDOMCache[tempThisObject.uuid]; //globalDOMCache['object' + tempThisObject.uuid];
        if (div) {
            // div.style.pointerEvents = 'none';
            globalDOMCache[tempThisObject.uuid].style.display = 'none';
        }
        
    }
    
};

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

realityEditor.network.postNewNodeName = function(ip, objectKey, frameKey, nodeKey, name) {
    var contents = {
        nodeName: name,
        lastEditor: globalStates.tempUuid
    };

    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" +  frameKey + "/node/" + nodeKey + "/rename/", contents);
};

realityEditor.network.onSettingPostMessage = function (msgContent) {

    var self = document.getElementById("settingsIframe");


    /**
     * Get all the setting states
     *
     */

    if (msgContent.settings.getSettings) {
        self.contentWindow.postMessage(JSON.stringify({
            getSettings: {
                extendedTracking: globalStates.extendedTracking,
                editingMode: globalStates.editingMode,
                clearSkyState: globalStates.clearSkyState,
                instantState: globalStates.instantState,
                speechState: globalStates.speechState,
                videoRecordingEnabled: globalStates.videoRecordingEnabled,
                matrixBroadcastEnabled: globalStates.matrixBroadcastEnabled,
                hololensModeEnabled: globalStates.hololensModeEnabled,
                externalState: globalStates.externalState,
                discoveryState: globalStates.discoveryState,
                settingsButton : globalStates.settingsButtonState,
                lockingMode: globalStates.lockingMode,
                lockPassword: globalStates.lockPassword,
                realityState: globalStates.realityState,
                zoneText: globalStates.zoneText,
                zoneState: globalStates.zoneState
            }
        }), "*");
    }

    if (msgContent.settings.getObjects) {

        var thisObjects = {};

        for (var objectKey in realityEditor.objects) {
            var thisObject = realityEditor.getObject(objectKey);
            thisObjects[objectKey] = {
                name: thisObject.name,
                ip: thisObject.ip,
                version: thisObject.version,
                frames : {}
            };

            for (var frameKey in thisObject.frames) {
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
     * This is where all the setters are palced for the Settings menu
     *
     */

    if (msgContent.settings.setSettings) {
        
        if (typeof msgContent.settings.setSettings.extendedTracking !== "undefined") {

            globalStates.extendedTracking = msgContent.settings.setSettings.extendedTracking;

            console.log("jetzt aber mal richtig hier!!", globalStates.extendedTracking);

            if (globalStates.extendedTracking === true) {
                realityEditor.app.saveExtendedTrackingState(true);

            } else {
                realityEditor.app.saveExtendedTrackingState(false);

            }
        }

        if (typeof msgContent.settings.setSettings.editingMode !== "undefined") {

            if (msgContent.settings.setSettings.editingMode) {
                realityEditor.device.setEditingMode(true);
                realityEditor.app.saveDeveloperState(true);
            } else {
                realityEditor.device.setEditingMode(false);
                realityEditor.app.saveDeveloperState(false);
            }

        }

        if (typeof msgContent.settings.setSettings.zoneText !== "undefined") {
            realityEditor.app.saveZoneText(msgContent.settings.setSettings.zoneText);
        }

        if (typeof msgContent.settings.setSettings.zoneState !== "undefined") {
            if (msgContent.settings.setSettings.zoneState) {
                globalStates.zoneState = true;
                realityEditor.app.saveZoneState(true);

            } else {
                globalStates.zoneState = false;
                realityEditor.app.saveZoneState(false);
            }
        }
        
        if (typeof msgContent.settings.setSettings.instantState !== "undefined") {
            if (msgContent.settings.setSettings.instantState) {
                globalStates.instantState = true;
                realityEditor.app.saveInstantState(true);

            } else {
                globalStates.instantState = false;
                realityEditor.app.saveInstantState(false);
            }
        }

        if (typeof msgContent.settings.setSettings.speechState !== "undefined") {
            if (msgContent.settings.setSettings.speechState) {
                if (!globalStates.speechState) { 
                    globalStates.speechState = true;
                    if (globalStates.instantState || globalStates.debugSpeechConsole) { // TODO: stop using instant state as temporary debug mode
                        document.getElementById('speechConsole').style.display = 'inline';
                    }
                    realityEditor.app.addSpeechListener("realityEditor.device.speechProcessor.speechRecordingCallback"); //"realityEditor.device.speech.speechRecordingCallback");
                    realityEditor.app.startSpeechRecording();
                }
            } else {
                if (globalStates.speechState) {
                    globalStates.speechState = false;
                    document.getElementById('speechConsole').style.display = 'none';
                    realityEditor.app.stopSpeechRecording();
                }
            }
        }

        if (typeof msgContent.settings.setSettings.videoRecordingEnabled !== "undefined") {
            if (msgContent.settings.setSettings.videoRecordingEnabled) {
                if (!globalStates.videoRecordingEnabled) {
                    globalStates.videoRecordingEnabled = true;
                    // add any one-time side-effects here
                }
            } else {
                if (globalStates.videoRecordingEnabled) {
                    globalStates.videoRecordingEnabled = false;
                    // add any one-time side-effects here:
                    // stop the recording if needed, otherwise there's no UI to stop it
                    realityEditor.device.videoRecording.stopRecording();
                }
            }
        }

        if (typeof msgContent.settings.setSettings.matrixBroadcastEnabled !== "undefined") {
            if (msgContent.settings.setSettings.matrixBroadcastEnabled) {
                if (!globalStates.matrixBroadcastEnabled) {
                    globalStates.matrixBroadcastEnabled = true;
                    // add any one-time side-effects here
                    realityEditor.device.desktopAdapter.startBroadcast();
                }
            } else {
                if (globalStates.matrixBroadcastEnabled) {
                    globalStates.matrixBroadcastEnabled = false;
                    // add any one-time side-effects here:
                    realityEditor.device.desktopAdapter.stopBroadcast();
                }
            }
        }

        if (typeof msgContent.settings.setSettings.hololensModeEnabled !== "undefined") {
            if (msgContent.settings.setSettings.hololensModeEnabled) {
                if (!globalStates.hololensModeEnabled) {
                    globalStates.hololensModeEnabled = true;
                    // add any one-time side-effects here
                    // realityEditor.device.desktopAdapter.startBroadcast();
                    console.log('hololens mode enabled...');
                    realityEditor.device.hololensAdapter.toggleHololensMode(true);
                }
            } else {
                if (globalStates.hololensModeEnabled) {
                    globalStates.hololensModeEnabled = false;
                    // add any one-time side-effects here:
                    // realityEditor.device.desktopAdapter.stopBroadcast();
                    console.log('hololens mode disabled...');
                    realityEditor.device.hololensAdapter.toggleHololensMode(false);
                }
            }
        }

        if (typeof msgContent.settings.setSettings.clearSkyState !== "undefined") {

            if (msgContent.settings.setSettings.clearSkyState) {
                globalStates.clearSkyState = true;
                realityEditor.app.saveClearSkyState(true);

            } else {
                globalStates.clearSkyState = false;
                realityEditor.app.saveClearSkyState(false);

            }
        }

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
    }
    
    if (msgContent.settings.functionName) {
        realityEditor.app.appFunctionCall(msgContent.settings.functionName, msgContent.settings.messageBody, null);
    }
};

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

realityEditor.network.testVersion = function (objectKey) {
    var thisObject = realityEditor.getObject(objectKey);
    if (!thisObject) {
        return 170;
    } else {
        return thisObject.integerVersion;
    }
};

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

realityEditor.network.postNewFrame = function(ip, objectKey, contents, callback) {
    this.cout("I am adding a frame: " + ip);
    contents.lastEditor = globalStates.tempUuid;
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/addFrame/", contents, callback);
};

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
            for (var propertyKey in responseFrame) {
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

realityEditor.network.deleteLinkFromObject = function (ip, objectKey, frameKey, linkKey) {
    // generate action for all links to be reloaded after upload
    this.cout("I am deleting a link: " + ip);

    if (this.testVersion(objectKey) > 162) {
        this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + "/editor/" + globalStates.tempUuid + "/deleteLink/");
    } else {
        this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/link/" + linkKey);
    }
};

realityEditor.network.deleteNodeFromObject = function (ip, objectKey, frameKey, nodeKey) {
    // generate action for all links to be reloaded after upload
    this.cout("I am deleting a node: " + ip);
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/editor/" + globalStates.tempUuid + "/deleteLogicNode/");
};

realityEditor.network.deleteBlockFromObject = function (ip, objectKey, frameKey, nodeKey, blockKey) {
    // generate action for all links to be reloaded after upload
    this.cout("I am deleting a block: " + ip);
    // /logic/*/*/block/*/
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/block/" + blockKey + "/editor/" + globalStates.tempUuid + "/deleteBlock/");
};

realityEditor.network.deleteBlockLinkFromObject = function (ip, objectKey, frameKey, nodeKey, linkKey) {
    // generate action for all links to be reloaded after upload
    this.cout("I am deleting a block link: " + ip);
    // /logic/*/*/link/*/
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/link/" + linkKey + "/editor/" + globalStates.tempUuid + "/deleteBlockLink/");
};

realityEditor.network.updateNodeBlocksSettingsData = function(ip, objectKey, frameKey, nodeKey) {

    var urlEndpoint = 'http://' + ip + ':' + httpPort + '/object/' + objectKey + "/node/" + nodeKey;
    this.getData(objectKey, frameKey, nodeKey, urlEndpoint, function (objectKey, frameKey, nodeKey, res) {

    // this.getData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/node/" + nodeKey, objectKey, function (req, thisKey) {
        for (var blockKey in res.blocks) {
            if (!res.blocks.hasOwnProperty(blockKey)) continue;
            if (res.blocks[blockKey].type === 'default') continue;

            objects[objectKey].frames[frameKey].nodes[nodeKey].blocks[blockKey].publicData = res.blocks[blockKey].publicData;
            objects[objectKey].frames[frameKey].nodes[nodeKey].blocks[blockKey].privateData = res.blocks[blockKey].privateData;
        }
    });
};

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
 * POST data as json to url, calling callback with the
 * JSON-encoded response data when finished
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

realityEditor.network.postLinkToServer = function (thisLink, existingLinkKey) {

    var thisObjectA = realityEditor.getObject(thisLink.objectA);
    var thisFrameA = realityEditor.getFrame(thisLink.objectA, thisLink.frameA);
    var thisNodeA = realityEditor.getNode(thisLink.objectA, thisLink.frameA, thisLink.nodeA);

    var thisObjectB = realityEditor.getObject(thisLink.objectB);
    var thisFrameB = realityEditor.getFrame(thisLink.objectB, thisLink.frameB);
    var thisNodeB = realityEditor.getNode(thisLink.objectB, thisLink.frameB, thisLink.nodeB);

    
    var okForNewLink = this.checkForNetworkLoop(thisLink.objectA, thisLink.frameA, thisLink.nodeA, thisLink.logicA, thisLink.objectB, thisLink.frameB, thisLink.nodeB, thisLink.logicB);
    
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

realityEditor.network.postNewLink = function (ip, objectKey, frameKey, linkKey, thisLink) {
    // generate action for all links to be reloaded after upload
    thisLink.lastEditor = globalStates.tempUuid;
    this.cout("sending Link");
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + '/addLink/', thisLink, function (err, response) {
        console.log(response);
    });
};

realityEditor.network.postNewNode = function (ip, objectKey, frameKey, nodeKey, thisNode) {
    thisNode.lastEditor = globalStates.tempUuid;
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + '/frame/' + frameKey + '/node/' + nodeKey + '/addNode/', thisNode, function (err) {
        if (err) {
            console.log('postNewNode error:', err);
        }
    });

};

realityEditor.network.postNewBlockLink = function (ip, objectKey, frameKey, nodeKey, linkKey, thisLink) {
    this.cout("sending Block Link");
    var linkMessage = this.realityEditor.gui.crafting.utilities.convertBlockLinkToServerFormat(thisLink);
    linkMessage.lastEditor = globalStates.tempUuid;
    // /logic/*/*/link/*/
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/link/" + linkKey + "/addBlockLink/", linkMessage, function () {
    });
};

realityEditor.network.postNewLogicNode = function (ip, objectKey, frameKey, nodeKey, logic) {
    this.cout("sending Logic Node");
    // /logic/*/*/node/

    var simpleLogic = this.realityEditor.gui.crafting.utilities.convertLogicToServerFormat(logic);
    simpleLogic.lastEditor = globalStates.tempUuid;
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/addLogicNode/", simpleLogic, function () {
    });
};

realityEditor.network.postNewBlockPosition = function (ip, objectKey, frameKey, logicKey, blockKey, content) {
    // generate action for all links to be reloaded after upload
    this.cout("I am moving a block: " + ip);
    // /logic/*/*/block/*/

    // this is color

    // this.color = "red";
    // this.objectA = objects.node[thisObjectKey];


    content.lastEditor = globalStates.tempUuid;
    if (typeof content.x === "number" && typeof content.y === "number") {
        this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + logicKey + "/block/" + blockKey + "/blockPosition/", content, function () {
        });
    }
};

realityEditor.network.postNewBlock = function (ip, objectKey, frameKey, nodeKey, blockKey, block) {
    this.cout("sending Block");
    // /logic/*/*/block/*/
    block.lastEditor = globalStates.tempUuid;

    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/block/" + blockKey + "/addBlock/", block, function () {
    });
    // this.postData('http://' + ip + ':' + httpPort + '/logic/' + thisObjectKey + "/" + thisLogicKey + "/block/" + thisBlockKey, block, function (){});
};

realityEditor.network.checkForNetworkLoop = function (objectAKey, frameAKey, nodeAKey, logicAKey, objectBKey, frameBKey, nodeBKey, logicBKey) {
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
    // check that there is no endless loops through it self or any other connections
    if (signalIsOk) {
        searchL(objectAKey, frameAKey, nodeAKey, objectBKey, frameBKey, nodeBKey);

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
    }

    return signalIsOk;
};


realityEditor.network.sendResetContent = function (objectKey, frameKey, nodeKey, type) {
// generate action for all links to be reloaded after upload

    var tempThisObject = {};
    if (type !== "ui") {
        tempThisObject = realityEditor.getNode(objectKey, frameKey, nodeKey);
    } 
    else {
        // if (object === nodeKey) {
        //     tempThisObject = realityEditor.getObject(objectKey);
        // } else {
        //     console.warn('Refusing to reset content of frame');
        //     return;
        // }
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

realityEditor.network.sendSaveCommit = function (objectKey) {
   var urlEndpoint = 'http://' + objects[objectKey].ip + ':' + httpPort + '/object/' + objectKey + "/saveCommit/";
    content ={};
        this.postData(urlEndpoint, content, function(){});
};

realityEditor.network.sendResetToLastCommit = function (objectKey) {
    var urlEndpoint = 'http://' + objects[objectKey].ip + ':' + httpPort + '/object/' + objectKey + "/resetToLastCommit/";
    content ={};
    this.postData(urlEndpoint, content, function(){});
};



/**
 * @desc
 * @param objectKey
 * @param frameKey
 * @param nodeKey
 * @return
 **/


realityEditor.network.onElementLoad = function (objectKey, frameKey, nodeKey) {
    
    realityEditor.gui.ar.draw.notLoading = false;
    
    if (nodeKey === "null") nodeKey = null;

    // cout("posting Msg");
    var version = 170;
    var object = realityEditor.getObject(objectKey);
    if (object) {
        version = object.integerVersion;
    }
    var frame = realityEditor.getFrame(objectKey, frameKey);
    var nodes = (!!frame) ? frame.nodes : {};

    var oldStyle = {
        obj: objectKey,
        pos: nodeKey,
        objectValues: (!!object) ? object.nodes : {},
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
    var activeKey = nodeKey || frameKey;
    
    // if (globalDOMCache['svg' + activeKey]) {
    //     realityEditor.gui.ar.moveabilityOverlay.createSvg(globalDOMCache['svg' + activeKey]);
    // }
    
    globalDOMCache["iframe" + activeKey]._loaded = true;
    globalDOMCache["iframe" + activeKey].contentWindow.postMessage(JSON.stringify(newStyle), '*');

    if (nodeKey) {
        var node = realityEditor.getNode(objectKey, frameKey, nodeKey);
        if (node.type === 'logic') {
            realityEditor.gui.ar.draw.updateLogicNodeIcon(node);
        }
    }
    
    this.cout("on_load");
};

/**
 * @desc
 * @param
 * @param
 * @return
 **/

realityEditor.network.postNewLockToNode = function (ip, objectKey, frameKey, nodeKey, content) {

// generate action for all links to be reloaded after upload
    console.log("sending node lock (" + content.lockType + ")");
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/addLock/", content, function () {
    });
    // postData('http://' +ip+ ':' + httpPort+"/", content);
    //console.log("sent lock");

};

/**
 * @desc
 * @param
 * @param
 * @return
 **/

realityEditor.network.deleteLockFromNode = function (ip, objectKey, frameKey, nodeKey, password) {
// generate action for all links to be reloaded after upload
    console.log("I am deleting a lock: " + ip);
    console.log("lockPassword is " + lockPassword);
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/password/" + password + "/deleteLock/");
    //console.log("deleteLockFromObject");
};

/**
 * @desc
 * @param
 * @param
 * @return
 **/

realityEditor.network.postNewLockToLink = function (ip, objectKey, frameKey, linkKey, content) {

// generate action for all links to be reloaded after upload
    console.log("sending link lock (" + content.lockType + ")");
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + "/addLock/", content, function () {
    });
    // postData('http://' +ip+ ':' + httpPort+"/", content);
    //console.log('post --- ' + 'http://' + ip + ':' + httpPort + '/object/' + thisObjectKey + "/link/lock/" + thisLinkKey);

};

/**
 * @desc
 * @param
 * @param
 * @return
 **/

realityEditor.network.deleteLockFromLink = function (ip, objectKey, frameKey, linkKey, password) {
// generate action for all links to be reloaded after upload
    console.log("I am deleting a link lock: " + ip);
    console.log("lockPassword is " + password);
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + "/password/" + password + "/deleteLock/");
    //console.log('delete --- ' + 'http://' + ip + ':' + httpPort + '/object/' + thisObjectKey + "/link/lock/" + thisLinkKey + "/password/" + authenticatedUser);
};

/**
 * 
 * @param ip
 * @param objectKey
 * @param frameKey
 * @param newVisualization {string} either 'ar' or 'screen' - the new visualization mode you want to change to
 * @param oldVisualizationPositionData {{x: number, y: number, scale: number, matrix: Array.<number>}|null} optionally sync the other position data to the server before changing visualization modes
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


// update on the server
realityEditor.network.deletePublicData = function(ip, objectKey, frameKey) {

    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/publicData");
};

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
