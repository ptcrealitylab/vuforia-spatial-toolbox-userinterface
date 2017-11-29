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
                    thisObject.objectVisible = false;
                    thisObject.screenZ = 1000;
                    thisObject.fullScreen = false;
                    thisObject.sendMatrix = false;
                    thisObject.sendAcceleration = false;
                    thisObject.integerVersion = parseInt(objects[objectKey].version.replace(/\./g, ""));

                    if (thisObject.matrix === null || typeof thisObject.matrix !== "object") {
                        thisObject.matrix = [];
                    }

                    for (var frameKey in objects[objectKey].frames) {
                       var thisFrame = realityEditor.getFrame(objectKey, frameKey);

                        thisFrame.objectVisible = false;
                        thisFrame.screenZ = 1000;
                        thisFrame.fullScreen = false;
                        thisFrame.sendMatrix = false;
                        thisFrame.sendAcceleration = false;
                        thisFrame.integerVersion = parseInt(objects[objectKey].version.replace(/\./g, ""));
                        thisFrame.visible = false;
                        
                        if (thisFrame.matrix === null || typeof thisFrame.matrix !== "object") {
                            thisFrame.matrix = [];
                        }
                        
                        
                        for (var nodeKey in objects[objectKey].frames[frameKey].nodes) {
                            thisObject = objects[objectKey].frames[frameKey].nodes[nodeKey];
                            if (thisObject.matrix === null || typeof thisObject.matrix !== "object") {
                                thisObject.matrix = [];
                            }
                            thisObject.loaded = false;
                            thisObject.visible = false;

                            if (thisObject.type === "logic") {
                                thisObject.guiState = new LogicGUIState();
                                var container = document.getElementById('craftingBoard');
                                thisObject.grid = new _this.realityEditor.gui.crafting.grid.Grid(container.clientWidth - menuBarWidth, container.clientHeight, thisObject.uuid);
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
                        objects[objectKey].frames[frameKey].uuis = frameKey;
                        for (var nodeKey in objects[objectKey].frames[frameKey].nodes) {
                            objects[objectKey].frames[frameKey].nodes[nodeKey].uuid = nodeKey;
                        }

                        for (var linkKey in objects[objectKey].frames[frameKey].links) {
                            objects[objectKey].frames[frameKey].links[linkKey].uuid = linkKey;
                        }
                    }
                    
                    _this.cout(JSON.stringify(objects[objectKey]));

                    // todo this needs to be looked at
                    _this.realityEditor.gui.memory.addObjectMemory(objects[objectKey]);
                 
                }
            });
        }
    }

};

realityEditor.network.updateObject = function (origin, remote, objectKey, frameKey) {

    origin.x = remote.x;
    origin.y = remote.y;
    origin.scale = remote.scale;
    origin.developer = remote.developer;

    if (remote.matrix) {
        origin.matrix = remote.matrix;
    }

    for (var nodeKey in remote.nodes) {
        if (!origin.nodes[nodeKey]) {
            origin.nodes[nodeKey] = remote.nodes[nodeKey];
        } else {

            origin.nodes[nodeKey].x = remote.nodes[nodeKey].x;
            origin.nodes[nodeKey].y = remote.nodes[nodeKey].y;
            origin.nodes[nodeKey].scale = remote.nodes[nodeKey].scale;

            origin.nodes[nodeKey].name = remote.nodes[nodeKey].name;
            if (remote.nodes[nodeKey].text)
                origin.nodes[nodeKey].text = remote.nodes[nodeKey].text;
            if (remote.nodes[nodeKey].matrix)
                origin.nodes[nodeKey].matrix = remote.nodes[nodeKey].matrix;
        }

        if (globalDOMCach["iframe" + nodeKey]) {
            if (globalDOMCach["iframe" + nodeKey]._loaded)
                realityEditor.network.onElementLoad(objectKey, frameKey, nodeKey);
        }
    }


    var missingFrames = {};
    for (var frameKey in origin.frames) {
        missingFrames[frameKey] = true;
    }

    if (!remote.frames) {
        remote.frames = {};
    }

    for (var frameKey in remote.frames) {
        if (!origin.frames[frameKey]) {
            origin.frames[frameKey] = remote.frames[frameKey];
            continue;
        }
        missingFrames[frameKey] = false;
        var oFrame = origin.frames[frameKey];
        var rFrame = remote.frames[frameKey];
        oFrame.x = rFrame.x;
        oFrame.y = rFrame.y;
        oFrame.scale = rFrame.scale;

        oFrame.name = rFrame.name;
        if (rFrame.matrix) {
            oFrame.matrix = rFrame.matrix;
        }

        if (globalDOMCach["iframe" + frameKey] && globalDOMCach["iframe" + frameKey]._loaded) {
            realityEditor.network.onElementLoad(thisKey, frameKey);
        }

    }

    for (var frameKey in missingFrames) {
        if (!missingFrames[frameKey]) {
            continue;
        }
        // Frame was deleted on remote, let's delete it here
        realityEditor.gui.frame.deleteLocally(origin.objectId, frameKey);
    }
};


realityEditor.network.updateNode = function (origin, remote, objectKey, frameKey, nodeKey) {

    //console.log(remote.links, origin.links, remote.blocks, origin.blocks);

    var isRemoteNodeDeleted = (Object.keys(remote).length === 0 && remote.constructor === Object);

    // delete local node if needed
    if (origin && isRemoteNodeDeleted) {

        realityEditor.gui.ar.draw.deleteNode(objectKey, frameKey, nodeKey);

        var thisNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
        
        if (thisNode) {
            delete objects[thisKey].frame[frameKey].nodes[nodeKey];
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

    realityEditor.gui.crafting.updateGrid(objects[thisKey].nodes[nodeKey].grid);

    if (globalStates.currentLogic) {

        if (globalStates.currentLogic.uuid === nodeKey) {

            console.log("YES");
            realityEditor.gui.crafting.forceRedraw(globalStates.currentLogic);

        }

    } else {
        console.log("NO");

        if (globalDOMCach["iframe" + nodeKey]) {
            if (globalDOMCach["iframe" + nodeKey]._loaded)
                realityEditor.network.onElementLoad(objectKey, frameKey, nodeKey);
        }
    }

};

realityEditor.network.onAction = function (action) {
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
        };

        if (thisAction.reloadLink.object in objects) {
            this.getData('http://' + objects[thisAction.reloadLink.object].ip + ':' + httpPort + '/object/' + thisAction.reloadLink.object + '/frame/' +thisAction.reloadLink.frame, thisAction.reloadLink.object, function (req, thisKey, frameKey) {

                var thisFrame = realityEditor.getFrame(thisKey, frameKey);
                if (objects[thisKey].integerVersion < 170) {

                    realityEditor.network.oldFormatToNew(objects[thisKey], thisKey, frameKey);
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
                    thisFrame.links = req.links;
                }

                objects[thisKey].uuid = thisKey;
                thisFrame.uuid = frameKey;

                for (var nodeKey in objects[thisKey].nodes) {
                    thisFrame.nodes[nodeKey].uuid = nodeKey;
                }

                for (var linkKey in objects[thisKey].links) {
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
            
            this.getData('http://' + objects[thisAction.reloadObject.object].ip + ':' + httpPort + '/object/' + thisAction.reloadObject.object, thisAction.reloadObject.object, function (req, thisKey) {

                if (objects[thisKey].integerVersion < 170) {
                    if (typeof req.objectValues !== "undefined")
                        req.nodes = req.objectValues;
                }

                realityEditor.network.updateObject(objects[thisKey], req, thisKey);

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

            this.getData(
                'http://' + objects[thisAction.reloadNode.object].ip + ':' + httpPort + '/object/' + thisAction.reloadNode.object + "/node/" + thisAction.reloadNode.node + "/", thisAction.reloadNode.object, function (req, objectKey, frameKey, nodeKey) {

                    console.log("------------------------------");
                    console.log(objectKey + "  " + frameKey + " " + nodeKey);
                    console.log(req);

                    var thisFrame = realityEditor.getFrame(objectKey, frameKey);

                    if (!thisFrame.nodes[nodeKey]) {
                        thisFrame.nodes[nodeKey] = req;
                    } else {
                        realityEditor.network.updateNode(thisFrame.nodes[nodeKey], req, objectKey, frameKey, nodeKey);
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
        var url = 'http://' + thisAction.loadMemory.ip + ':' + httpPort + '/object/' + id;

        this.getData(url, id, function (req, thisKey) {
            _this.cout('received memory', req.memory);
            objects[thisKey].memory = req.memory;
            _this.realityEditor.gui.memory.addObjectMemory(objects[thisKey]);
        });
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
    var thisVersionNumber;

    if (!msgContent.version) {
        thisVersionNumber = 0;
    }
    else {
        thisVersionNumber = msgContent.version;
    }

    if (thisVersionNumber >= 170) {
        if ((!msgContent.object) || (!msgContent.object)) return;
    } else {
        if ((!msgContent.obj) || (!msgContent.pos)) return;
        msgContent.object = msgContent.obj;
        msgContent.frame = msgContent.obj;
        msgContent.node = msgContent.pos;
    }
    
    var thisFrame = realityEditor.getFrame(msgContent.object, msgContent.frame);
    
    if (thisFrame !== null) {
        if (msgContent.node === msgContent.frame) {
            tempThisObject = thisFrame;
        } else if (msgContent.node in thisFrame.nodes) {
            tempThisObject = thisFrame.nodes[msgContent.node];
        } else if (msgContent.node in thisFrame.frames) {
            tempThisObject = thisFrame.frames[msgContent.node];
        } else return;

    } else if (msgContent.frame in pocketItem) {
        if (msgContent.node === msgContent.object) {
            tempThisObject = pocketItem[msgContent.frame];
        } else {
            if (msgContent.node in pocketItem[msgContent.frame].nodes) {
                tempThisObject = pocketItem[msgContent.frame].nodes[msgContent.node];
            } else return;
        }

    } else return;

    if (msgContent.width && msgContent.height) {
        var thisMsgNode = document.getElementById(msgContent.node);
        var top = ((globalStates.width - msgContent.height) / 2);
        var left = ((globalStates.height - msgContent.width) / 2);
        thisMsgNode.style.width = msgContent.width;
        thisMsgNode.style.height = msgContent.height;
        thisMsgNode.style.top = top;
        thisMsgNode.style.left = left;

        thisMsgNode = document.getElementById("iframe" + msgContent.node);
        thisMsgNode.style.width = msgContent.width;
        thisMsgNode.style.height = msgContent.height;
        thisMsgNode.style.top = top;
        thisMsgNode.style.left = left;

        if (tempThisObject.frameTouchSynthesizer) {
            var cover = tempThisObject.frameTouchSynthesizer.cover;
            cover.style.width = msgContent.width;
            cover.style.height = msgContent.height;
            cover.style.top = top;
            cover.style.left = left;
        }
    }

    if (typeof msgContent.sendMatrix !== "undefined") {

        if (msgContent.sendMatrix === true) {

            if (tempThisObject.integerVersion >= 32) {

                tempThisObject.sendMatrix = true;
                document.getElementById("iframe" + msgContent.node).contentWindow.postMessage(
                    '{"projectionMatrix":' + JSON.stringify(globalStates.realProjectionMatrix) + "}", '*');
            }
        }
    }


    if (typeof msgContent.sendAcceleration !== "undefined") {
        console.log(msgContent.sendAcceleration);
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
    }

    if (msgContent.globalMessage) {
        var iframes = document.getElementsByTagName('iframe');
        for (var i = 0; i < iframes.length; i++) {

            if (iframes[i].id !== "iframe" + msgContent.node && iframes[i].style.visibility !== "hidden") {
                var receivingObject = objects[iframes[i].id.substr(6)];
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
        // console.log("gotfullscreenmessage");
        if (msgContent.fullScreen === true) {
            tempThisObject.fullScreen = true;
            console.log("fullscreen: " + tempThisObject.fullScreen);
            document.getElementById("object" + msgContent.node).style.webkitTransform =
                'matrix3d(1, 0, 0, 0,' +
                '0, 1, 0, 0,' +
                '0, 0, 1, 0,' +
                '0, 0, 0, 1)';

        }
        if (msgContent.fullScreen === false) {
            tempThisObject.fullScreen = false;
        }

    } else if(typeof msgContent.fullScreen === "string") {
        if (msgContent.fullScreen === "sticky") {

            tempThisObject.fullScreen = "sticky";
            document.getElementById("thisObject" + msgContent.node).style.webkitTransform =
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
        var element = document.getElementById(msgContent.node);
        realityEditor.device.beginTouchEditing(element);
    }

    if (typeof msgContent.touchEvent !== "undefined") {
        var event = msgContent.touchEvent;
        var target = document.getElementById(msgContent.node);
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
                realityEditor.device.onDocumentPointerDown(fakeEvent);
            }
            realityEditor.device.onDocumentPointerMove(fakeEvent);
            realityEditor.device.onTouchMove(fakeEvent);
        } else if (event.type === 'touchend') {
            realityEditor.device.onDocumentPointerUp(fakeEvent);
            realityEditor.device.onMultiTouchEnd(fakeEvent);
            var frame = document.getElementById('iframe' + msgContent.node);
            if (frame) {
                frame.contentWindow.postMessage(JSON.stringify({
                    stopTouchEditing: true
                }), "*");
            }
        }
    }

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
                realityState: globalStates.realityState
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

        console.log("this",thisObjects);
        
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
                globalStates.editingMode = true;
                realityEditor.app.appFunctionCall("developerOn", null, null);
                realityEditor.gui.ar.draw.matrix.matrixtouchOn = "";
            } else {
                realityEditor.device.removeEventHandlers();
                globalStates.editingMode = false;
                realityEditor.app.appFunctionCall("developerOff", null, null);

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

// TODO: BEN FRAME BUG - update to use ip, objectKey, frameKey, nodeKey
realityEditor.network.updateNodeBlocksSettingsData = function(ip, objectKey, frameKey, nodeKey) {
    
    this.getData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/node/" + nodeKey, objectKey, function (req, thisKey) {
        for (var blockKey in req.blocks) {
            if (!req.blocks.hasOwnProperty(blockKey)) continue;
            if (req.blocks[blockKey].type === 'default') continue;

            objects[thisObjectKey].nodes[thisLogicKey].blocks[blockKey].publicData = req.blocks[blockKey].publicData;
            objects[thisObjectKey].nodes[thisLogicKey].blocks[blockKey].privateData = req.blocks[blockKey].privateData;
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

realityEditor.network.postLinkToServer = function (thisLink, objects) {
    var thisObjectA = realityEditor.getFrame(thisLink.objectA);
    var thisFrameA = realityEditor.getFrame(thisLink.objectA, thisLink.frameA);
    var thisNodeA = realityEditor.getFrame(thisLink.objectA, thisLink.frameA, thisLink.nodeA);

    var thisObjectB = realityEditor.getFrame(thisLink.objectB);
    var thisFrameB = realityEditor.getFrame(thisLink.objectB, thisLink.frameB);
    var thisNodeB = realityEditor.getFrame(thisLink.objectB, thisLink.frameB, thisLink.nodeB);
    
    var okForNewLink = this.checkForNetworkLoop(thisLink.objectA, thisLink.frameA, thisLink.nodeA, thisLink.logicA, thisLink.objectB, thisLink.frameB, thisLink.nodeB, thisLink.logicB);
    
    if (okForNewLink) {
        var linkKey = this.realityEditor.device.utilities.uuidTimeShort();

        var namesA, namesB;
        var color = "";

        if (thisLink.logicA !== false) {

            color = "";

            if (thisLink.logicA === 0) color = "BLUE";
            if (thisLink.logicA === 1) color = "GREEN";
            if (thisLink.logicA === 2) color = "YELLOW";
            if (thisLink.logicA === 3) color = "RED";

            namesA = [thisObjectA.name, thisFrameA.name, thisNodeA.name + ":" + color];
        } else {
            namesA = [thisObjectA.name, thisFrameA.name, thisNodeA.name];
        }

        if (thisLink.logicB !== false) {

            color = "";

            if (thisLink.logicB === 0) color = "BLUE";
            if (thisLink.logicB === 1) color = "GREEN";
            if (thisLink.logicB === 2) color = "YELLOW";
            if (thisLink.logicB === 3) color = "RED";

            namesB = [thisObjectB.name, thisFrameB.name, thisNodeB.name + ":" + color];
        } else {
            namesB = [thisObjectB.name, thisFrameB.name, thisNodeB.name];
        }

        //console.log(this.testVersion(thisLink.objectA));


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
        this.postNewLink(thisObjectA.ip, thisLink.objectA, thisLink.frameA, linkKey, thisObjectA.links[linkKey]);
        //  }
    }
};

realityEditor.network.postNewLink = function (ip, objectKey, frameKey, linkKey, thisLink) {
    // generate action for all links to be reloaded after upload
    thisLink.lastEditor = globalStates.tempUuid;
    this.cout("sending Link");
    this.postData('http://' + ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/link/" + linkKey + "/addLink/", thisLink, function () {
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
        if (object === nodeKey) {
            tempThisObject = realityEditor.getObject(objectKey);
        } else {
            console.warn('Refusing to reset content of frame');
            return;
        }
    }

    if (!tempThisObject) {
        console.warn("Can't reset content of undefined object", object, node, type);
        return;
    }
    
    var content = {};
    content.x = tempThisObject.x;
    content.y = tempThisObject.y;
    content.scale = tempThisObject.scale;

    if (typeof tempThisObject.matrix === "object") {
        content.matrix = tempThisObject.matrix;
    }

    content.lastEditor = globalStates.tempUuid;
    if (typeof content.x === "number" && typeof content.y === "number" && typeof content.scale === "number") {
        this.postData('http://' + objects[object].ip + ':' + httpPort + '/object/' + objectKey + "/frame/" + frameKey + "/node/" + nodeKey + "/size/", content, function () {
        });
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

    // cout("posting Msg");
    var nodes;
    var version = 170;
    var object = realityEditor.getObject(objectKey);
    if (!object) {
        nodes = {};
    } else {
        nodes = object.nodes;
        version = object.integerVersion;
    }

    var oldStyle = {
        obj: objectKey,
        pos: nodeKey,
        objectValues: nodes,
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
    globalDOMCach["iframe" + nodeKey]._loaded = true;
    globalDOMCach["iframe" + nodeKey].contentWindow.postMessage(
        JSON.stringify(newStyle), '*');
    this.cout("on_load");

    /*
        globalStates.interface = interface;
    
        for (var objectKey in objects) {
            if (objects[objectKey].visible) {
                globalDOMCach["iframe" + objectKey].contentWindow.postMessage(JSON.stringify({interface: globalStates.interface}), "*");
            }
    
            for (var nodeKey in objects[objectKey].nodes) {
                if (objects[objectKey].nodes[nodeKey].visible) {
                    globalDOMCach["iframe" + nodeKey].contentWindow.postMessage(JSON.stringify({interface: globalStates.interface}), "*");
                }
            }
        }
        */

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
