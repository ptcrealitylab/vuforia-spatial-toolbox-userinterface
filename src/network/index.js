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
                        
                        delete thisFrame.positionOnLoad;
                        
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

                            if (thisNode.type === "logic") {
                                thisNode.guiState = new LogicGUIState();
                                var container = document.getElementById('craftingBoard');
                                thisNode.grid = new _this.realityEditor.gui.crafting.grid.Grid(container.clientWidth - menuBarWidth, container.clientHeight, thisObject.uuid);
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

                    realityEditor.gui.ar.utilities.setAvarageScale(objects[objectKey]);

                        _this.cout(JSON.stringify(objects[objectKey]));

                    // todo this needs to be looked at
                    _this.realityEditor.gui.memory.addObjectMemory(objects[objectKey]);
                 
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

            origin.frames[frameKey].width = 300; // TODO: why is this hard-coded?
            origin.frames[frameKey].height = 300;

            console.log('added new frame', origin.frames[frameKey]);
            
            // var frameType = origin.frames[frameKey].type;
            // var frameUrl = '../../frames/' + frameType + '/index.html';
            // realityEditor.gui.ar.draw.addElement(frameUrl, objectKey, frameKey, null, 'ui', origin.frames[frameKey]);
            
        } else {
            origin.frames[frameKey].ar = remote.frames[frameKey].ar;
            origin.frames[frameKey].screen = remote.frames[frameKey].screen;
            origin.frames[frameKey].name = remote.frames[frameKey].name;
            
            console.log('updated frame');
            
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
        }
        
        if (globalDOMCache["iframe" + frameKey]) {
            if (globalDOMCache["iframe" + frameKey]._loaded) {
                realityEditor.network.onElementLoad(objectKey, frameKey, null);
            }
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
        console.log("update node: lockPassword = " + remote.lockPassword + ", lockType = " + remote.lockType);

        if (origin.type === "logic") {
            if (!origin.guiState) {
                origin.guiState = new LogicGUIState();
            }

            if (!origin.grid) {
                var container = document.getElementById('craftingBoard');
                origin.grid = new realityEditor.gui.crafting.grid.Grid(container.clientWidth - menuBarWidth, container.clientHeight, origin.uuid);
            }

        }

    }

    if (remote.blocks) {
        this.utilities.syncBlocksWithRemote(origin, remote.blocks);
    }

    if (remote.links) {
        this.utilities.syncLinksWithRemote(origin, remote.links);
    }

    realityEditor.gui.crafting.updateGrid(objects[objectKey].nodes[nodeKey].grid);

    if (globalStates.currentLogic) {

        if (globalStates.currentLogic.uuid === nodeKey) {

            console.log("YES");
            realityEditor.gui.crafting.forceRedraw(globalStates.currentLogic);

        }

    } else {
        console.log("NO");

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

        thisAction = JSON.parse(action);
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
            frame.type = thisAction.addFrame.type;
            
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
            frame.integerVersion = "3.0.0"; //parseInt(objects[objectKey].version.replace(/\./g, ""));
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
            
            // if (thisAction.addFrame.frame) { // && thisAction.addFrame.hasOwnProperty('name')) {
                
                // console.log(thisAction.addFrame.frame);
                
                // var thisFrame = JSON.parse(thisAction.addFrame.frame);
                
                //thisObject.frames[thisAction.addFrame.frameID] = thisAction.addFrame.frame;

                // realityEditor.network.updateObject(objects[objectKey], res, objectKey, frameKey);

            // }

            // if (!origin.frames[frameKey]) {
            //     origin.frames[frameKey] = remote.frames[frameKey];
            //
            //     origin.frames[frameKey].width = 300;
            //     origin.frames[frameKey].height = 300;
            //
            //     console.log('added new frame', origin.frames[frameKey]);
            //
            //     var frameType = origin.frames[frameKey].type;
            //     var frameUrl = '../../frames/' + frameType + '/index.html';
            //     realityEditor.gui.ar.draw.addElement(frameUrl, objectKey, frameKey, null, 'ui', origin.frames[frameKey]);
            // }
            
            
            // TODO: start unconstrained editing on the frame -- try calling beginTouchEditing
            
            
            /* TODO: uncomment to continue developing unconstrained editing of transferred frames 
            globalStates.editingMode = true;
            realityEditor.gui.ar.draw.matrix.matrixtouchOn = thisAction.addFrame.frameID; //target.nodeId;
            realityEditor.gui.ar.draw.matrix.copyStillFromMatrixSwitch = true;
            */
            
            
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
    if (e.data) {
        msgContent = JSON.parse(e.data);
    } else {
        msgContent = JSON.parse(e);
    }

    // console.log("      onInternalPostMessage");
    // console.log("frame: " + msgContent.frame + ", node: " + msgContent.node + ", width: " + msgContent.width);
    // console.log("\n\n");

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
            realityEditor.gui.screenExtension.activeScreenObject = 
                {
                    object : msgContent.object,
                    frame : msgContent.frame,
                    node: msgContent.node
                }
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
                var receivingObject = objects[iframes[i].getAttribute("data-object-key")];
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

    if (typeof msgContent.fullScreen === "boolean") {
        if (msgContent.fullScreen === true) {
            tempThisObject.fullScreen = true;
            console.log("fullscreen: " + tempThisObject.fullScreen);
            var zIndex = 200 + (tempThisObject.fullscreenZPosition || 0);
            document.getElementById("object" + msgContent.frame).style.webkitTransform =
                'matrix3d(1, 0, 0, 0,' +
                '0, 1, 0, 0,' +
                '0, 0, 1, 0,' +
                '0, 0, ' + zIndex + ', 1)';
            
            globalDOMCache[tempThisObject.uuid].style.display = 'none';
            globalDOMCache['iframe' + tempThisObject.uuid].style.pointerEvents = 'none';

        }
        if (msgContent.fullScreen === false) {
            tempThisObject.fullScreen = false;
            globalDOMCache[tempThisObject.uuid].style.display = '';
        }

    } else if(typeof msgContent.fullScreen === "string") {
        if (msgContent.fullScreen === "sticky") {

            tempThisObject.fullScreen = "sticky";
            document.getElementById("thisObject" + msgContent.frame).style.webkitTransform =
                'matrix3d(1, 0, 0, 0,' +
                '0, 1, 0, 0,' +
                '0, 0, 1, 0,' +
                '0, 0, 0, 1)';

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
            // Translate up 6px to be above pocket layer
            overlayDiv.style.transform = 'translate3d(' + event.x + 'px,' + event.y + 'px,6px)';
            
            // realityEditor.device.onDocumentPointerMove(fakeEvent);
            // realityEditor.device.onTouchMove(fakeEvent);
            realityEditor.device.onMultiTouchMove(fakeEvent);
        } else if (event.type === 'touchend') {
            realityEditor.device.onDocumentPointerUp(fakeEvent);
            realityEditor.device.onMultiTouchEnd(fakeEvent);
            globalStates.tempEditingMode = false;
            realityEditor.device.deactivateFrameMove(msgContent.frame);
            var frame = document.getElementById('iframe' + msgContent.frame);
            if (frame) {
                frame.contentWindow.postMessage(JSON.stringify({
                    stopTouchEditing: true
                }), "*");
            }
        }
    }
    
/*    if (typeof msgContent.finishedLoading !== 'undefined') {
        console.log('~~~ iframe finished loading ~~~')
    }*/

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
                realityEditor.app.appFunctionCall("extendedTrackingOn", null, null);

            } else {
                realityEditor.app.appFunctionCall("extendedTrackingOff", null, null);

            }
        }

        if (typeof msgContent.settings.setSettings.editingMode !== "undefined") {

            if (msgContent.settings.setSettings.editingMode) {

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

        }

        if (typeof msgContent.settings.setSettings.zoneText !== "undefined") {
                realityEditor.app.appFunctionCall("zoneText", msgContent.settings.setSettings, null);
        }

        if (typeof msgContent.settings.setSettings.zoneState !== "undefined") {
            if (msgContent.settings.setSettings.zoneState) {
                globalStates.zoneState = true;
                realityEditor.app.appFunctionCall("zoneOn", null, null);

            } else {
                globalStates.zoneState = false;
                realityEditor.app.appFunctionCall("zoneOff", null, null);

            }
        }
        
        if (typeof msgContent.settings.setSettings.instantState !== "undefined") {
            if (msgContent.settings.setSettings.instantState) {
                globalStates.instantState = true;
                realityEditor.app.appFunctionCall("instantOn", null, null);

            } else {
                globalStates.instantState = false;
                realityEditor.app.appFunctionCall("instantOff", null, null);

            }
        }

        if (typeof msgContent.settings.setSettings.speechState !== "undefined") {
            if (msgContent.settings.setSettings.speechState) {
                if (!globalStates.speechState) { 
                    globalStates.speechState = true;
                    if (globalStates.instantState) { //(globalStates.debugSpeechConsole) { // TODO: stop using instant state as temporary debug mode
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

        if (typeof msgContent.settings.setSettings.clearSkyState !== "undefined") {

            if (msgContent.settings.setSettings.clearSkyState) {
                globalStates.clearSkyState = true;
                realityEditor.app.appFunctionCall("clearSkyOn", null, null);

            } else {
                globalStates.clearSkyState = false;
                realityEditor.app.appFunctionCall("clearSkyOff", null, null);

            }
        }

        if (typeof msgContent.settings.setSettings.lockingToggle !== "undefined") {

            console.log("received message in settings");

            if (msgContent.settings.setSettings.lockingToggle) {
                realityEditor.app.appFunctionCall("authenticateTouch", null, null);

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
                realityEditor.gui.menus.on("reality", ["realityGui"]);
                globalStates.realityState = true;
                realityEditor.app.appFunctionCall("realityOn", null, null);

            } else {
                realityEditor.gui.menus.off("main", ["gui", "reset", "unconstrained"]);
                realityEditor.gui.menus.on("main", ["gui"]);
                globalStates.realityState = false;
                realityEditor.app.appFunctionCall("realityOff", null, null);
                
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
    var contents = {lastEditor: globalStates.tempUuid};
    this.deleteData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frames/" + frameKey, contents);
};

realityEditor.network.postNewFrame = function(ip, objectKey, contents) {
    this.cout("I am adding a frame: " + ip);
    contents.lastEditor = globalStates.tempUuid;
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/addFrame/", contents);
};

realityEditor.network.sendFrameToScreen = function(ip, objectKey, frameKey, contents) {
    //(objects[globalStates.editingModeObject].ip, globalStates.editingModeObject, globalStates.editingModeFrame);
    this.cout("I am sending a frame to the screen: " + ip);
    // var contents = {lastEditor: globalStates.tempUuid};
    contents.lastEditor = globalStates.tempUuid;
    this.postData('http://' + ip + ':' + httpPort + '/screen/' + objectKey + "/frames/" + frameKey, contents, function (err, response) {
        console.log(err, response);
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

realityEditor.network.postLinkToServer = function (thisLink) {

    var thisObjectA = realityEditor.getObject(thisLink.objectA);
    var thisFrameA = realityEditor.getFrame(thisLink.objectA, thisLink.frameA);
    var thisNodeA = realityEditor.getNode(thisLink.objectA, thisLink.frameA, thisLink.nodeA);

    var thisObjectB = realityEditor.getObject(thisLink.objectB);
    var thisFrameB = realityEditor.getFrame(thisLink.objectB, thisLink.frameB);
    var thisNodeB = realityEditor.getNode(thisLink.objectB, thisLink.frameB, thisLink.nodeB);

    
    var okForNewLink = this.checkForNetworkLoop(thisLink.objectA, thisLink.frameA, thisLink.nodeA, thisLink.logicA, thisLink.objectB, thisLink.frameB, thisLink.nodeB, thisLink.logicB);
    
    if (okForNewLink) {
        var linkKey = this.realityEditor.device.utilities.uuidTimeShort();

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
    if (type === "node") {
        tempThisObject = realityEditor.getNode(objectKey, frameKey, nodeKey);
    } else if (type === "logic") {
        // todo might result in error??
        tempThisObject = realityEditor.getNode(objectKey, frameKey, nodeKey);
    }
    else if (type === "ui") {
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
        realityEditor.gui.ar.utilities.setAvarageScale(objects[objectKey]);
        var urlEndpoint;
        if (type === 'node' || type === 'logic') {
            urlEndpoint = 'http://' + objects[objectKey].ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/nodeSize/";
        } else {
            urlEndpoint = 'http://' + objects[objectKey].ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/size/";
        }
        console.log('url endpoint = ' + urlEndpoint);
        this.postData(urlEndpoint, content);
    }

  

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

    if (object && object.ip) {
        newStyle.objectData = {
            ip: object.ip
        };
    }

    if (version < 170 && objectKey === nodeKey) {
        newStyle = oldStyle;
    }
    
    var activeKey = nodeKey || frameKey;

    // console.warn('TODO: get rid of hack to only add cover to zero frame');
    // if (frame && activeKey === frameKey && frameKey.indexOf('zero') > -1) {  // TODO: fix
    //    
    //     var addIframe = globalDOMCache["iframe" + activeKey];
    //     var addContainer = globalDOMCache["object" + activeKey];
    //    
    //     var cover = document.createElement('div');
    //     cover.classList.add('main');
    //     cover.style.visibility = 'visible';
    //     cover.style.width = "2025px"; //addIframe.style.width; 
    //     cover.style.height = "721px"; //addIframe.style.height;
    //     cover.style.top = "-200.5px"; //addIframe.style.top;
    //     cover.style.left = "-728.5px"; //addIframe.style.left;
    //
    //    // width: 2025px; height: ; visibility: hidden; top: ; left: ;
    //    
    //     frame.frameTouchSynthesizer = new realityEditor.gui.frame.FrameTouchSynthesizer(cover, addIframe);
    //     addContainer.appendChild(cover);
    //    
    //     console.log(cover, addIframe);
    // }
    
    globalDOMCache["iframe" + activeKey]._loaded = true;
    globalDOMCache["iframe" + activeKey].contentWindow.postMessage(JSON.stringify(newStyle), '*');
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
