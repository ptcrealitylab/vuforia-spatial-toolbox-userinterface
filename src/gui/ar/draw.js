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

createNameSpace("realityEditor.gui.ar.draw");

/**********************************************************************************************************************
 ******************************************** update and draw the 3D Interface ****************************************
 **********************************************************************************************************************/

/**
 * @desc main update loop called 30 fps with an array of found transformation matrices
 * @param visibleObjects
 **/
realityEditor.gui.ar.draw.globalCanvas = globalCanvas;
realityEditor.gui.ar.draw.visibleObjects = "";
realityEditor.gui.ar.draw.globalStates = globalStates;
realityEditor.gui.ar.draw.globalDOMCache = globalDOMCache;
realityEditor.gui.ar.draw.activeObject = {};
realityEditor.gui.ar.draw.activeFrame = {};
realityEditor.gui.ar.draw.activeNode = {};
realityEditor.gui.ar.draw.activeVehicle = {};
realityEditor.gui.ar.draw.activeObjectMatrix = [];
realityEditor.gui.ar.draw.finalMatrix = [];
realityEditor.gui.ar.draw.rotateX = rotateX;
realityEditor.gui.ar.draw.nodeCalculations = {
    size: 0, // TODO: only rectPoints is used, we can get rid of other properties in here
    x: 0,
    y: 0,
    rectPoints: []
};
realityEditor.gui.ar.draw.matrix = {
    temp: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    begin: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    end: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    r: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    r2: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    r3 :[
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]
};
realityEditor.gui.ar.draw.objectKey = "";
realityEditor.gui.ar.draw.frameKey = "";
realityEditor.gui.ar.draw.nodeKey = "";
realityEditor.gui.ar.draw.activeKey = "";
realityEditor.gui.ar.draw.type = "";
realityEditor.gui.ar.draw.notLoading = "";
realityEditor.gui.ar.draw.utilities = realityEditor.gui.ar.utilities;

realityEditor.gui.ar.draw.update = function (visibleObjects) {
    realityEditor.device.touchInputs.update();
    
//    console.log(JSON.stringify(visibleObjects));
    this.ar.utilities.timeSynchronizer(timeCorrection);

    if (globalStates.guiState === "logic") {
        this.gui.crafting.redrawDataCrafting();  // todo maybe animation frame
    }

    this.visibleObjects = visibleObjects;

    if (this.globalCanvas.hasContent === true) {
        this.globalCanvas.context.clearRect(0, 0, this.globalCanvas.canvas.width, this.globalCanvas.canvas.height);
        this.globalCanvas.hasContent = false;
    }
    
    var editingVehicle = realityEditor.device.getEditingVehicle();

    for (var objectKey in objects) {
        this.activeObject = realityEditor.getObject(objectKey);
        if (!this.activeObject) { continue; }
        if (this.visibleObjects.hasOwnProperty(objectKey)) {

            this.activeObject.visibleCounter = timeForContentLoaded;
            this.setObjectVisible(this.activeObject, true);

            // this.activeObjectMatrix = multiplyMatrix(rotateX, multiplyMatrix(this.visibleObjects[objectKey], globalStates.projectionMatrix));
            this.activeObjectMatrix = [];
            this.ar.utilities.multiplyMatrix(this.visibleObjects[objectKey], this.globalStates.projectionMatrix, this.matrix.r);
            this.ar.utilities.multiplyMatrix(this.rotateX, this.matrix.r, this.activeObjectMatrix);
            //  this.activeObjectMatrix2 = multiplyMatrix(this.visibleObjects[objectKey], globalStates.projectionMatrix);
            //   document.getElementById("controls").innerHTML = (toAxisAngle(this.activeObjectMatrix2)[0]).toFixed(1)+" "+(toAxisAngle(this.activeObjectMatrix2)[1]).toFixed(1);

            objects[objectKey].screenX = this.activeObjectMatrix[12] / this.activeObjectMatrix[15] + (globalStates.height / 2);
            objects[objectKey].screenY = this.activeObjectMatrix[13] / this.activeObjectMatrix[15] + (globalStates.width / 2);
            
            for (var frameKey in objects[objectKey].frames) {
                this.activeFrame = realityEditor.getFrame(objectKey, frameKey);
                
                if (!this.activeFrame.hasOwnProperty('visualization')) { // TODO: temp fix
                    this.activeFrame.visualization = "ar";
                }
                // if (this.activeFrame.visualization !== "ar") {
                //     continue;
                // }
                
                /*
                if (!this.activeFrame || (this.activeFrame.name === this.activeObject.name)) { // TODO: ben better fix for frames with same name as object - make sure they don't get created in the first place...
                    // console.log("break from frame: ",objectKey, frameKey);
                    continue;
                }*/
                // making sure that the node is always the object to draw
                this.activeKey = frameKey;
                this.activeVehicle = this.activeFrame;
                this.activeType = "ui";

                if (this.globalStates.guiState === "ui") { // || Object.keys(this.activeFrame.nodes).length === 0) { // removed feature where UI shows in node view if no nodes... check with team that this is a good decision
                    var continueUpdate = this.drawTransformed(this.visibleObjects, objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,
                        this.globalDOMCache, this.globalStates, this.globalCanvas,
                        this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                        this.nodeCalculations, this.cout);
                    
                    if (!continueUpdate) return;
                    
                    var frameUrl = "http://" + this.activeObject.ip + ":" + httpPort + "/obj/" + this.activeObject.name + "/frames/" + this.activeFrame.name + "/";
                    this.addElement(frameUrl, objectKey, frameKey, null, this.activeType, this.activeVehicle);

                    // TODO: set repositioning DOM elements present if in editing mode and developer true

                } else {
                    this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCache, this.cout);
                }

                for (var nodeKey in this.activeFrame.nodes) {
                    // if (!this.activeObject.nodes.hasOwnProperty(nodeKey)) { continue; }
                    if (globalStates.guiState === "node" || globalStates.guiState === "logic") {
                        this.activeNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
                        this.activeKey = nodeKey;
                        this.activeVehicle = this.activeNode;
                        this.activeType = this.activeNode.type;

                        var continueUpdate = this.drawTransformed(this.visibleObjects, objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,

                            this.globalDOMCache, this.globalStates, this.globalCanvas,
                            this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                            this.nodeCalculations, this.cout);
                        
                        if (!continueUpdate) return;
                        
                        var nodeUrl = "nodes/" + this.activeType + "/index.html";
                        this.addElement(nodeUrl, objectKey, frameKey, nodeKey, this.activeType, this.activeVehicle);

                    } else {
                        this.activeNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
                        this.activeKey = nodeKey;

                        this.activeVehicle = this.activeNode;
                      //  this.activeType = this.activeNode.type;
                      
                        this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCache, this.cout);
                    }
                }

                /*
                for (nodeKey in this.activeObject.frames) {
                    this.activeNode = this.activeObject.frames[nodeKey];
                    if (globalStates.guiState === "ui") {
                          this.drawTransformed(this.visibleObjects, objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,

                        this.globalDOMCache, this.globalStates, this.globalCanvas,
                        this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                        this.nodeCalculations, this.cout, this.webkitTransformMatrix3d);
                        
                        var keyedSrc = this.activeNode.src;
                        if (keyedSrc.indexOf('?') >= 0) {
                            keyedSrc += '&';
                        } else {
                            keyedSrc += '?';
                        }
                        keyedSrc += 'nodeKey=' + nodeKey;
                        this.addElement(keyedSrc,
                        this.activeKey, objectKey, frameKey, this.activeType, this.notLoading, this.activeVehicle, this.globalStates, this.globalDOMCache);
                    } else {
                        this.hideTransformed(objectKey, nodeKey, this.activeNode, "ui");

                    }
                }
                */
            }
        }
        else if (this.activeObject.objectVisible) {
            // this.activeObject.objectVisible = false;
            realityEditor.gui.ar.draw.setObjectVisible(this.activeObject, false);
            
            var wereAnyFramesMovedToGlobal = false;
            
            for (var frameKey in objects[objectKey].frames) {
                this.activeFrame = realityEditor.getFrame(objectKey, frameKey);
                if (!this.activeFrame) {
                    console.log("break from frame: ", objectKey, frameKey);
                    continue;
                }
                // making sure that the node is always the object to draw
                this.activeKey = frameKey;
                this.activeVehicle = this.activeFrame;
                this.activeType = "ui";

                // preserve frame globally when object disappears if it is being moved in unconstrained editing
                if (editingVehicle === this.activeVehicle && (realityEditor.device.editingState.unconstrained || globalStates.unconstrainedPositioning)) {
                    
                    wereAnyFramesMovedToGlobal = true;
                    globalStates.inTransitionObject = objectKey;
                    globalStates.inTransitionFrame = frameKey;
                    
                } else {

                    this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCache, this.cout);

                    for (var nodeKey in this.activeFrame.nodes) {
                        this.activeNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
                        this.activeKey = nodeKey;
                        this.activeVehicle = this.activeNode;
                        this.activeType = this.activeNode.type;
                        // if (!this.activeObject.nodes.hasOwnProperty(nodeKey)) {  continue;  }
                        this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCache, this.cout);
                    }

                    /*
                    for (nodeKey in this.activeObject.frames) {
                        this.activeNode = realityEditor.getNode(objectKey, frameKey, frameKey);
                        this.activeKey = nodeKey;
                        this.activeVehicle = this.activeNode;
                        this.activeType = this.activeNode.type;
                        
                        this.hideTransformed(objectKey, nodeKey, this.activeObject.frames[nodeKey], "ui");
    
                    }
                    */

                    // this.killObjects(this.activeKey, this.activeVehicle, this.globalDOMCache); // TODO: this only kills last node, not the frames (because activeKey changes)
//                    this.killObjects(frameKey, this.activeFrame, this.globalDOMCache);
                    
                }
                
            }
            
            if (!wereAnyFramesMovedToGlobal) {
                // remove editing states related to this object
                
                if (realityEditor.device.editingState.object === objectKey) {
                    realityEditor.device.resetEditingState();
                }
            }
        } else {
            this.killObjects(this.activeKey, this.activeObject, this.globalDOMCache);
        }

    }

    // draw all lines
    if ((globalStates.guiState === "node" || globalStates.guiState === "logic") && !globalStates.editingMode) {
        
        for (var objectKey in objects) {
            if (!objects.hasOwnProperty(objectKey)) continue;
            var object = objects[objectKey];
            for (var frameKey in object.frames) {
                if (!object.frames.hasOwnProperty(frameKey)) continue;
                this.ar.lines.drawAllLines(realityEditor.getFrame(objectKey, frameKey), this.globalCanvas.context);
            }
        }
        
        this.ar.lines.drawInteractionLines();
        
        // while speech state is on, give the user some visual feedback about which node is being recognized as speech context (closest to middle of screen)
        if (globalStates.speechState) {

            globalStates.nodeSpeechHighlightCounter++;
            if (globalStates.nodeSpeechHighlightCounter > 20) {

                var closest = realityEditor.device.speechProcessor.getClosestObjectFrameNode(); //realityEditor.device.speech.getClosestObjectFrameNode(); //getClosestNode();
                if (!closest) return;
                
                // reset all other nodes to full opacity
                realityEditor.forEachNodeInAllObjects( function(objectKey, frameKey, nodeKey) {
                    var nodeDom = document.getElementById('object' + nodeKey);
                    if (nodeDom && nodeDom.style.opacity !== "1") {
                        nodeDom.style.opacity = "1";
                    }
                });

                // highlight the closest one with semi-transparency
                var closestNodeDom = document.getElementById('object' + closest.nodeKey);
                if (closestNodeDom && closestNodeDom.style.opacity !== "0.33") {
                    closestNodeDom.style.opacity = "0.33"; // opacity = 0.33;
                }

                globalStates.nodeSpeechHighlightCounter = 0;
            }

        }
        
    }

    // todo this is a test for the pocket
    
    if (pocketItem["pocket"].frames["pocket"].nodes[pocketItemId]) {
        
        this.activeObject = pocketItem["pocket"];
        this.activeObject.visibleCounter = timeForContentLoaded;
        this.activeObject.objectVisible = true;
        
        objectKey = "pocket";
        frameKey = "pocket";
        
        this.activeObjectMatrix = [];

        // find the closest object
        var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];

        if (this.visibleObjects.hasOwnProperty(closestObjectKey)) {

            this.ar.utilities.multiplyMatrix(this.visibleObjects[closestObjectKey], globalStates.projectionMatrix, this.matrix.r);
            this.ar.utilities.multiplyMatrix(rotateX, this.matrix.r, this.activeObjectMatrix);
            
        } else {

            this.activeObjectMatrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ];

        }
        
        // for (var frameKey in this.activeObject.frames) {
        this.activeFrame = this.activeObject.frames["pocket"];
        
        this.activeKey = pocketItemId;
             
        for (var nodeKey in this.activeFrame.nodes) {
            
            this.activeNode = this.activeFrame.nodes[nodeKey];
            this.activeType = this.activeNode.type;

            if ((globalStates.guiState === "node" || globalStates.guiState === "logic") && this.activeType === "logic") {

                this.activeNode.width = 100;
                this.activeNode.height = 100;
                
                var thisUrl = "nodes/" + this.activeType + "/index.html";
                this.addElement(thisUrl, objectKey, frameKey, nodeKey, this.activeType, this.activeNode);
                
                var continueUpdate = this.drawTransformed(this.visibleObjects, objectKey, this.activeKey, this.activeType, this.activeNode, this.notLoading, this.globalDOMCache, this.globalStates, this.globalCanvas, this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities, this.nodeCalculations, this.cout);

                if (!continueUpdate) return;
                
            }
            
        }
        
    }
    
    /* // TODO: any updates to frames transitioning between objects should happen here
    for (var frameKey in globalFrames) {
        if (!globalFrames.hasOwnProperty(frameKey)) continue;
        
        console.log(frameKey + " is a global frame");
    }
    */

    if (globalStates.acceleration.motion !== 0) {
        globalStates.acceleration = {
            x: 0,
            y: 0,
            z: 0,
            alpha: 0,
            beta: 0,
            gamma: 0,
            motion: 0
        }
    }
};

realityEditor.gui.ar.draw.moveFrameToNewObject = function(oldObjectKey, oldFrameKey, newObjectKey, newFrameKey) {
    
    if (oldObjectKey === newObjectKey && oldFrameKey === newFrameKey) return; // don't need to do anything
    
    var oldObject = realityEditor.getObject(oldObjectKey);
    var newObject = realityEditor.getObject(newObjectKey);
    
    var frame = realityEditor.getFrame(oldObjectKey, oldFrameKey);

    // rename nodes and give new keys
    var newNodes = {};
    for (var nodeKey in frame.nodes) {
        if (!frame.nodes.hasOwnProperty(nodeKey)) continue;
        var node = frame.nodes[nodeKey];
        node.objectId = newObjectKey;
        node.frameId = newFrameKey;
        node.uuid = newFrameKey + node.name;
        newNodes[node.uuid] = node;
        delete frame.nodes[nodeKey];
    }

    frame.nodes = newNodes;
    frame.objectId = newObjectKey;
    frame.uuid = newFrameKey;
    
    // update any variables in the application with the old keys to use the new keys
    if (realityEditor.device.editingState.object === oldObjectKey)
        realityEditor.device.editingState.object = newObjectKey;
    if (realityEditor.device.editingState.frame === oldFrameKey)
        realityEditor.device.editingState.frame = newFrameKey;
    if (realityEditor.gui.screenExtension.screenObject.object === oldObjectKey)
        realityEditor.gui.screenExtension.screenObject.object = newObjectKey;
    if (realityEditor.gui.screenExtension.screenObject.frame === oldFrameKey)
        realityEditor.gui.screenExtension.screenObject.frame = newFrameKey;
    
    // update the DOM elements for the frame with new ids

    // update their keys in the globalDOMCache 
    globalDOMCache['object' + newFrameKey] = globalDOMCache['object' + oldFrameKey];
    globalDOMCache['iframe' + newFrameKey] = globalDOMCache['iframe' + oldFrameKey];
    globalDOMCache[newFrameKey] = globalDOMCache[oldFrameKey];
    globalDOMCache['svg' + newFrameKey] = globalDOMCache['svg' + oldFrameKey];
    delete globalDOMCache['object' + oldFrameKey];
    delete globalDOMCache['iframe' + oldFrameKey];
    delete globalDOMCache[oldFrameKey];
    delete globalDOMCache['svg' + oldFrameKey];
    
    // re-assign ids to DOM elements
    globalDOMCache['object' + newFrameKey].id = 'object' + newFrameKey;
    globalDOMCache['iframe' + newFrameKey].id = 'iframe' + newFrameKey;
    globalDOMCache[newFrameKey].id = newFrameKey;
    globalDOMCache[newFrameKey].objectId = newObjectKey;
    globalDOMCache[newFrameKey].frameId = newFrameKey;
    globalDOMCache['svg' + newFrameKey].id = 'svg' + newFrameKey;

    // update iframe attributes
    globalDOMCache['iframe' + newFrameKey].setAttribute("data-frame-key", newFrameKey);
    globalDOMCache['iframe' + newFrameKey].setAttribute("data-object-key", newObjectKey);

    globalDOMCache['iframe' + newFrameKey].setAttribute("onload", 'realityEditor.network.onElementLoad("' + newObjectKey + '","' + newFrameKey + '","' + null + '")');
    globalDOMCache['iframe' + newFrameKey].contentWindow.location.reload(); // TODO: is there a way to update realityInterface of the frame without reloading?
    
    // add the frame to the new object and post the new frame on the server (must exist there before we can update the links)
    objects[newObjectKey].frames[newFrameKey] = frame;
    var newObjectIP = realityEditor.getObject(newObjectKey).ip;
    realityEditor.network.postNewFrame(newObjectIP, newObjectKey, frame);
    
    // update all links locally and on the server
    // loop through all frames
    realityEditor.forEachFrameInAllObjects(function(thatObjectKey, thatFrameKey) {
        var thatFrame = realityEditor.getFrame(thatObjectKey, thatFrameKey);
        
        // loop through all links in that frame
        for (var linkKey in thatFrame.links) {
            var link = thatFrame.links[linkKey];
            var didLinkChange = false;
            
            // update the start of the link
            if (link.objectA === oldObjectKey && link.frameA === oldFrameKey) {
                link.objectA = newObjectKey;
                link.frameA = newFrameKey;
                link.nodeA = newFrameKey + link.namesA[2];
                link.namesA[0] = newObject.name;
                didLinkChange = true;
            }
            
            // update the end of the link
            if (link.objectB === oldObjectKey && link.frameB === oldFrameKey) {
                link.objectB = newObjectKey;
                link.frameB = newFrameKey;
                link.nodeB = newFrameKey + link.namesB[2];
                link.namesB[0] = newObject.name;
                didLinkChange = true;
            }
            
            // only change the link on the server if its objectA or objectB changed
            if (didLinkChange) {
                var linkObjectIP = realityEditor.getObject(thatObjectKey).ip;
                // remove link from old frame (locally and on the server)
                delete thatFrame.links[linkKey];
                realityEditor.network.deleteLinkFromObject(linkObjectIP, thatObjectKey, thatFrameKey, linkKey);
                // add link to new frame (locally and on the server -- post link to server adds it locally too)
                realityEditor.network.postLinkToServer(link, linkKey);
            }

        }
    });
    
    // remove the frame from the old object
    delete objects[oldObjectKey].frames[oldFrameKey];
    realityEditor.network.deleteFrameFromObject(oldObject.ip, oldObjectKey, oldFrameKey);
};

realityEditor.gui.ar.draw.returnTransitionFrameBackToSource = function() {
    
    // (activeKey, activeVehicle, globalDOMCache, cout
    var frameInMotion = realityEditor.getFrame(globalStates.inTransitionObject, globalStates.inTransitionFrame);
    realityEditor.gui.ar.draw.hideTransformed(globalStates.inTransitionFrame, frameInMotion, globalDOMCache, cout);
    var positionData = realityEditor.gui.ar.positioning.getPositionData(frameInMotion);
    positionData.matrix = [];
    frameInMotion.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();
    frameInMotion.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();

    // update any variables in the application with the old keys to use the new keys
    if (realityEditor.device.editingState.object === globalStates.inTransitionObject)
        realityEditor.device.editingState.object = null;
    if (realityEditor.device.editingState.frame === globalStates.inTransitionFrame)
        realityEditor.device.editingState.frame = null;
    if (realityEditor.gui.screenExtension.screenObject.object === globalStates.inTransitionObject)
        realityEditor.gui.screenExtension.screenObject.object = null;
    if (realityEditor.gui.screenExtension.screenObject.frame === globalStates.inTransitionFrame)
        realityEditor.gui.screenExtension.screenObject.frame = null;

    globalStates.inTransitionObject = null;
    globalStates.inTransitionFrame = null;
    
};

realityEditor.gui.ar.draw.moveTransitionFrameToObject = function(oldObjectKey, oldFrameKey, newObjectKey, newFrameKey, optionalPosition) {
    
    this.moveFrameToNewObject(oldObjectKey, oldFrameKey, newObjectKey, newFrameKey);
    
    var frame = realityEditor.getFrame(newObjectKey, newFrameKey);
    
    globalStates.inTransitionObject = null;
    globalStates.inTransitionFrame = null;

    realityEditor.gui.screenExtension.screenObject.object = newObjectKey;
    realityEditor.gui.screenExtension.screenObject.frame = newFrameKey;

    // reset its position (this can be updated later to move the frame to the dropped location

    frame.ar.x = 0;
    frame.ar.y = 0;

    if (optionalPosition) {
        frame.ar.x = optionalPosition.x;
        frame.ar.y = optionalPosition.y;
    }

    frame.ar.matrix = [];
    frame.begin =  realityEditor.gui.ar.utilities.newIdentityMatrix();
    frame.temp =  realityEditor.gui.ar.utilities.newIdentityMatrix();
    
    realityEditor.device.editingState.object = null;
    realityEditor.device.editingState.frame = null;
    
};

/**
 * @desc
 * @return {Boolean} whether to continue the update loop (defaults true, return false if you remove the activeVehicle during this loop)
 **/

realityEditor.gui.ar.draw.drawTransformed = function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCache, globalStates, globalCanvas, activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {
    //console.log(JSON.stringify(activeObjectMatrix));
    if (notLoading !== activeKey && activeVehicle.loaded === true && activeVehicle.visualization !== "screen") {

        var editingVehicle = realityEditor.device.getEditingVehicle();
        var thisIsBeingEdited = (editingVehicle === activeVehicle);
        
        // make visible a frame or node if it was previously hidden
        if (!activeVehicle.visible && !activeVehicle.positionOnLoad) {
            
            activeVehicle.visible = true;
            
            var container = globalDOMCache["object" + activeKey];
            var iFrame = globalDOMCache["iframe" + activeKey];
            var overlay = globalDOMCache[activeKey];
            var canvas = globalDOMCache["svg" + activeKey];
            
            container.style.display = 'inline';
            iFrame.style.visibility = 'visible';
            overlay.style.visibility = 'visible';
            
            if (globalStates.editingMode || thisIsBeingEdited) {
                canvas.style.visibility = 'visible';
                canvas.style.display = 'inline';
            } else {
                canvas.style.display = 'none';
            }
            
            iFrame.contentWindow.postMessage(
                JSON.stringify(
                    {
                        visibility: "visible",
                        interface: globalStates.interface,
                        search: realityEditor.gui.search.getSearch()
                    }), '*');
            
            if (activeType === "node" || activeType === "logic") {
                activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
            }

            if (activeType === "logic" && objectKey !== "pocket") {
                if(activeVehicle.animationScale === 1) {
                    globalDOMCache["logic" + nodeKey].className = "mainEditing scaleOut";
                    thisObject.animationScale = 0;
                }
            }

        }
        if (activeVehicle.visible || activeVehicle.positionOnLoad) {
            // this needs a better solution

            if (activeVehicle.fullScreen !== true) {

                var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);

                // set initial position correctly
                
                // TODO: position pocket frames the same as pocket nodes so this isn't necessary
                if (typeof activeVehicle.positionOnLoad !== 'undefined' && typeof activeVehicle.mostRecentFinalMatrix !== 'undefined') {
                    // activeVehicle.currentTouchOffset = {
                    //     x: activeVehicle.frameSizeX/2 * positionData.scale,
                    //     y: activeVehicle.frameSizeY/2 * positionData.scale
                    // };
                    // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(activeVehicle, activeVehicle.positionOnLoad.pageX, activeVehicle.positionOnLoad.pageY, true);
                    realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinateBasedOnMarker(activeVehicle, activeVehicle.positionOnLoad.pageX, activeVehicle.positionOnLoad.pageY, false);
                    delete activeVehicle.positionOnLoad;
                    // realityEditor.device.beginTouchEditing(globalDOMCache[activeKey], 'pocket');

                    var activeFrameKey = activeVehicle.frameId || activeVehicle.uuid;
                    var activeNodeKey = activeVehicle.uuid === activeFrameKey ? null : activeVehicle.uuid;
                    realityEditor.device.beginTouchEditing(activeVehicle.objectId, activeFrameKey, activeNodeKey);

                }
                
                var finalOffsetX = positionData.x;
                var finalOffsetY = positionData.y;

                // TODO: move this around to other location so that translations get applied in different order as compared to parent frame matrix composition
                // add node's position to its frame's position to gets its actual offset
                if (activeType === "node" || activeType === "logic") {
                    var frameKey = activeVehicle.frameId;
                    var frame = realityEditor.getFrame(objectKey, frameKey);
                    if (frame) {
                        var parentFramePositionData = realityEditor.gui.ar.positioning.getPositionData(frame);
                        finalOffsetX += parentFramePositionData.x;
                        finalOffsetY += parentFramePositionData.y;
                    }
                }
                
                // TODO: also multiply node's unconstrained matrix by frame's unconstrained matrix if necessary
                
                matrix.r3 = [
                    positionData.scale, 0, 0, 0,
                    0, positionData.scale, 0, 0,
                    0, 0, 1, 0,
                    // positionData.x, positionData.y, 0, 1
                    finalOffsetX, finalOffsetY, 0, 1
                ];

                if (globalStates.editingMode || thisIsBeingEdited) {

                    // show the svg overlay if needed (doesn't always get added correctly in the beginning so this is the safest way to ensure it appears)
                    var svg = globalDOMCache["svg" + activeKey];
                    if (svg.children.length === 0) {
                        console.log('retroactively creating the svg overlay');
                        var iFrame = globalDOMCache["iframe" + activeKey];
                        svg.style.width = iFrame.style.width;
                        svg.style.height = iFrame.style.height;
                        realityEditor.gui.ar.moveabilityOverlay.createSvg(svg);
                    }

                    // todo test if this can be made touch related
                    if (activeType === "logic") {
                        activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
                    }

                    if (thisIsBeingEdited && (realityEditor.device.editingState.unconstrained || globalStates.unconstrainedPositioning)) {
                        activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
                   
                        // do this one time when you first tap down on something unconstrained, to preserve its current matrix
                        if (matrix.copyStillFromMatrixSwitch) {
                            matrix.visual = utilities.copyMatrix(activeObjectMatrix);
                            
                            if (typeof positionData.matrix === "object") {
                                if (positionData.matrix.length > 0) {
                                    utilities.multiplyMatrix(positionData.matrix, activeVehicle.temp, activeVehicle.begin);
                                } else {
                                    activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);
                                }
                            } else {
                                activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);
                            }
                            
                            console.log('write to matrix -- should be relativeMatrix');
                            var resultMatrix = [];
                            utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), resultMatrix);
                            realityEditor.gui.ar.positioning.setWritableMatrix(activeVehicle, resultMatrix); // TODO: fix this somehow, make it more understandable

                            matrix.copyStillFromMatrixSwitch = false;
                            
                        // if this isn't the first frame of unconstrained editing, just use the previously stored begin and temp
                        } else {
                            console.log('write to matrix -- should be relativeMatrix');
                            var resultMatrix = [];
                            realityEditor.gui.ar.utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), resultMatrix);
                            realityEditor.gui.ar.positioning.setWritableMatrix(activeVehicle, resultMatrix);
                        }

                        // TODO: this never seems to be triggered, can it be removed?
                        // if (globalStates.unconstrainedPositioning && matrix.copyStillFromMatrixSwitch) {
                        //     activeObjectMatrix = matrix.visual;
                        // }

                    }
                    
                    // recomputes .matrix based on .relativeMatrix
                    realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
                    
                    if (typeof positionData.matrix !== "undefined" && positionData.matrix.length > 0) {
                        if (!(thisIsBeingEdited && (realityEditor.device.editingState.unconstrained || globalStates.unconstrainedPositioning))) {
                            utilities.multiplyMatrix(positionData.matrix, activeVehicle.temp, activeVehicle.begin);
                        }
                        
                        utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
                        utilities.multiplyMatrix(matrix.r3, matrix.r, matrix.r2);
                        utilities.drawMarkerPlaneIntersection(activeKey, matrix.r2, activeVehicle);
                    } else {
                        utilities.drawMarkerPlaneIntersection(activeKey, null, activeVehicle);
                    }
                    
                }

                if (typeof positionData.matrix !== "undefined") {
                    if (positionData.matrix.length < 13) {
                        // utilities.multiplyMatrix(matrix.r3, activeObjectMatrix, finalMatrix);

                        // if (parentFramePositionData && parentFramePositionData.matrix.length === 16) {
                        //     // This is a node - position relative to parent frame unconstrained editing
                        //     utilities.multiplyMatrix(parentFramePositionData.matrix, activeObjectMatrix, matrix.r);
                        //     utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
                        // } else {
                            utilities.multiplyMatrix(matrix.r3, activeObjectMatrix, finalMatrix);
                        // }

                    } else {
                        utilities.multiplyMatrix(positionData.matrix, activeObjectMatrix, matrix.r);
                        utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
                    }
                }
                
                /*
                    if (typeof positionData.matrix !== "undefined") {
                        if (positionData.matrix.length < 13) {
                            
                            if (parentFramePositionData && parentFramePositionData.matrix.length === 16) { // This is a node - position relative to parent frame unconstrained editing
                                utilities.multiplyMatrix(parentFramePositionData.matrix, activeObjectMatrix, matrix.r);
                                utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
                            } else {
                                utilities.multiplyMatrix(matrix.r3, activeObjectMatrix, finalMatrix);
                            }
    
                        } else {
                            utilities.multiplyMatrix(positionData.matrix, activeObjectMatrix, matrix.r);
                            utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
                        }
                    }
                 */
                
                // we want nodes closer to camera to have higher z-coordinate, so that they are rendered in front
                // but we want all of them to have a positive value so they are rendered in front of background canvas
                // and frames with developer=false should have the lowest positive value

                activeVehicle.screenZ = finalMatrix[14]; // but save pre-processed z position to use later to calculate screenLinearZ

                // finalMatrix[14] *= -1;
                
                var activeElementZIncrease = thisIsBeingEdited ? 100 : 0;

                if (finalMatrix[14] < 10) {
                    finalMatrix[14] = 10;
                }
                finalMatrix[14] = 200 + activeElementZIncrease + 100000 / finalMatrix[14]; // TODO: does this mess anything up? it should fix the z-order problems
                
                //move non-developer frames to the back so they don't steal touches from interactable frames //TODO: is this still necessary / working?
                if (activeVehicle.developer === false) {
                    finalMatrix[14] = 100;
                }
                
                activeVehicle.mostRecentFinalMatrix = finalMatrix;
                activeVehicle.originMatrix = activeObjectMatrix;
                // draw transformed
                globalDOMCache["object" + activeKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';

                // this is for later
                // The matrix has been changed from Vuforia 3 to 4 and 5. Instead of  finalMatrix[3][2] it is now finalMatrix[3][3]
                activeVehicle.screenX = finalMatrix[12] / finalMatrix[15] + (globalStates.height / 2);
                activeVehicle.screenY = finalMatrix[13] / finalMatrix[15] + (globalStates.width / 2);
                // activeVehicle.screenZ = finalMatrix[14];

            }
            if (activeType === "ui") {

                if (activeVehicle.sendMatrix === true || activeVehicle.sendAcceleration === true) {

                    var thisMsg = {};

                    if (activeVehicle.sendMatrix === true) {
                        thisMsg.modelViewMatrix = visibleObjects[objectKey];
                    }

                    if (activeVehicle.sendAcceleration === true) {
                        thisMsg.acceleration = globalStates.acceleration;
                    }

                    // cout(thisMsg);
                    globalDOMCache["iframe" + activeKey].contentWindow.postMessage(JSON.stringify(thisMsg), '*');

                }
            } else {

                activeVehicle.screenLinearZ = (((10001 - (20000 / activeVehicle.screenZ)) / 9999) + 1) / 2;
                // map the linearized zBuffer to the final ball size
                activeVehicle.screenLinearZ = utilities.map(activeVehicle.screenLinearZ, 0.996, 1, 50, 1);
                
            }


            if (activeType === "logic" && objectKey !== "pocket") {

                if (globalStates.pointerPosition[0] > -1 && globalProgram.objectA) {

                    var size = (activeVehicle.screenLinearZ * 40) * (activeVehicle.scale);
                    var x = activeVehicle.screenX;
                    var y = activeVehicle.screenY;

                    globalCanvas.hasContent = true;

                    nodeCalculations.rectPoints = [
                        [x - (-1 * size), y - (-0.42 * size)],
                        [x - (-1 * size), y - (0.42 * size)],
                        [x - (-0.42 * size), y - (size)],
                        [x - (0.42 * size), y - (size)],
                        [x - (size), y - (0.42 * size)],
                        [x - (size), y - (-0.42 * size)],
                        [x - (0.42 * size), y - (-1 * size)],
                        [x - (-0.42 * size), y - (-1 * size)]
                    ];
                    /* var context = globalCanvas.context;
                     context.setLineDash([]);
                     // context.restore();
                     context.beginPath();
                     context.moveTo(nodeCalculations.rectPoints[0][0], nodeCalculations.rectPoints[0][1]);
                     context.lineTo(nodeCalculations.rectPoints[1][0], nodeCalculations.rectPoints[1][1]);
                     context.lineTo(nodeCalculations.rectPoints[2][0], nodeCalculations.rectPoints[2][1]);
                     context.lineTo(nodeCalculations.rectPoints[3][0], nodeCalculations.rectPoints[3][1]);
                     context.lineTo(nodeCalculations.rectPoints[4][0], nodeCalculations.rectPoints[4][1]);
                     context.lineTo(nodeCalculations.rectPoints[5][0], nodeCalculations.rectPoints[5][1]);
                     context.lineTo(nodeCalculations.rectPoints[6][0], nodeCalculations.rectPoints[6][1]);
                     context.lineTo(nodeCalculations.rectPoints[7][0], nodeCalculations.rectPoints[7][1]);
                     context.closePath();

                     if (nodeCalculations.farFrontElement === activeKey) {
                     context.strokeStyle = "#ff0000";
                     } else {
                     context.strokeStyle = "#f0f0f0";
                     }*/

                    if (utilities.insidePoly(globalStates.pointerPosition, nodeCalculations.rectPoints) && !activeVehicle.lockPassword) {
                        if (activeVehicle.animationScale === 0 && !globalStates.editingMode)
                            globalDOMCache["logic" + activeKey].className = "mainEditing scaleIn";
                        activeVehicle.animationScale = 1;
                    }
                    else {
                        if (activeVehicle.animationScale === 1)
                            globalDOMCache["logic" + activeKey].className = "mainEditing scaleOut";
                        activeVehicle.animationScale = 0;
                    }

                    // context.stroke();
                } else {
                    if (activeVehicle.animationScale === 1) {
                        globalDOMCache["logic" + activeKey].className = "mainEditing scaleOut";
                        activeVehicle.animationScale = 0;
                    }
                }
            }
            
            // temporary UI styling to visualize locks

            if (activeType === "node" || activeType === "logic") {
                if (!!activeVehicle.lockPassword && activeVehicle.lockType === "full") {
                    globalDOMCache["iframe" + activeKey].style.opacity = 0.25;
                } else if (!!activeVehicle.lockPassword && activeVehicle.lockType === "half") {
                    globalDOMCache["iframe" + activeKey].style.opacity = 0.75;
                } else {
                    globalDOMCache["iframe" + activeKey].style.opacity = 1.0;
                }
            }

        }
    
    } else if (activeVehicle.visualization === "screen") {
        this.hideTransformed(activeKey, activeVehicle, globalDOMCache, cout);
    }
    
    return true;

};

/**
 * @desc
 * @return
 **/
realityEditor.gui.ar.draw.hideTransformed = function (activeKey, activeVehicle, globalDOMCache, cout) {
    
 //   console.log(activeVehicle);
    if (activeVehicle.visible === true) {
        globalDOMCache["object" + activeKey].style.display = 'none';
        globalDOMCache["iframe" + activeKey].style.visibility = 'hidden';
        globalDOMCache["iframe" + activeKey].contentWindow.postMessage(
            JSON.stringify(
                {
                    visibility: "hidden"
                }), '*');

        activeVehicle.visible = false;
        activeVehicle.visibleEditing = false;
        
        // activeVehicle is a frame if it has nodes...
        // if (activeVehicle.hasOwnProperty('nodes')) {
        //     // realityEditor.gui.ar.draw.resetFrameRepositionCanvases();
        // }

        globalDOMCache[activeKey].style.visibility = 'hidden';
        globalDOMCache["svg" + activeKey].style.display = 'none';

        cout("hideTransformed");
    }
};

/**
 * @desc
 * @return
 **/

realityEditor.gui.ar.draw.addElement = function(thisUrl, objectKey, frameKey, nodeKey, activeType, activeVehicle) {

    var activeKey = (!!nodeKey) ? nodeKey : frameKey;
    var isFrameElement = activeKey === frameKey;
    
    if (this.notLoading !== true && this.notLoading !== activeKey && activeVehicle.loaded !== true) {
        
        console.log("loading " + objectKey + "/" + frameKey + "/" + (nodeKey||"null"));
        // console.log("(active key is " + activeKey + ")");

        this.notLoading = activeKey;
        
        // assign the element some default properties if they don't exist

        if (typeof activeVehicle.frameSizeX === 'undefined') {
            activeVehicle.frameSizeX = activeVehicle.width;
        }

        if (typeof activeVehicle.frameSizeY === 'undefined') {
            activeVehicle.frameSizeY = activeVehicle.height;
        }
        
        activeVehicle.animationScale = 0;
        activeVehicle.loaded = true;
        activeVehicle.visibleEditing = false;

        if (typeof activeVehicle.begin !== "object") {
            activeVehicle.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
        }

        if (typeof activeVehicle.temp !== "object") {
            activeVehicle.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();
        }
        
        // Create DOM elements for everything associated with this frame/node
        
        if (isFrameElement && activeVehicle.location === 'global') {
            // This line loads frame locally from userinterface/frames directory
            thisUrl = 'frames/' + activeVehicle.src + '.html';
        }

        var domElements = this.createSubElements(thisUrl, objectKey, frameKey, nodeKey, activeVehicle);
        var addContainer = domElements.addContainer;
        var addIframe = domElements.addIframe;
        var addOverlay = domElements.addOverlay;
        var addSVG = domElements.addSVG;

        addOverlay.objectId = objectKey;
        addOverlay.frameId = frameKey;
        addOverlay.nodeId = nodeKey;
        addOverlay.type = activeType;
        
        // todo the event handlers need to be bound to non animated ui elements for fast movements.
        // todo the lines need to end at the center of the square.

        if (activeType === "logic") {
            var addLogic = this.createLogicElement(activeVehicle, activeKey);
            addOverlay.appendChild(addLogic);
            globalDOMCache["logic" + activeKey] = addLogic;
        }

        if (activeVehicle.fullScreen === true) {
            addOverlay.style.display = 'none'; // TODO: is this the best way to move unconstrained editing into the three.js scene?
            addIframe.style.pointerEvents = 'none';
        }

        // Finally, append all the created elements to the DOM in the correct order...
        
        document.getElementById("GUI").appendChild(addContainer);
        addContainer.appendChild(addIframe);
        addContainer.appendChild(addOverlay);
        addOverlay.appendChild(addSVG);

        globalDOMCache[addContainer.id] = addContainer;
        globalDOMCache[addIframe.id] = addIframe;
        globalDOMCache[addOverlay.id] = addOverlay;
        globalDOMCache[addSVG.id] = addSVG;
        
        // Add touch event listeners
        
        realityEditor.device.addTouchListenersForElement(addOverlay, activeVehicle);
        
    }
    
};

realityEditor.gui.ar.draw.createSubElements = function(iframeSrc, objectKey, frameKey, nodeKey, activeVehicle) {

    var activeKey = (!!nodeKey) ? nodeKey : frameKey;

    var addContainer = document.createElement('div');
    addContainer.id = "object" + activeKey;
    addContainer.className = "main";
    addContainer.style.width = globalStates.height + "px";
    addContainer.style.height = globalStates.width + "px";
    addContainer.style.display = "none";
    addContainer.style.border = 0;

    var addIframe = document.createElement('iframe');
    addIframe.id = "iframe" + activeKey;
    addIframe.className = "main";
    addIframe.frameBorder = 0;
    addIframe.style.width = (activeVehicle.width || 0) + "px";
    addIframe.style.height = (activeVehicle.height || 0) + "px";
    addIframe.style.left = ((globalStates.height - activeVehicle.frameSizeX) / 2) + "px";
    addIframe.style.top = ((globalStates.width - activeVehicle.frameSizeY) / 2) + "px";
    addIframe.style.visibility = "hidden";
    addIframe.src = iframeSrc;
    addIframe.setAttribute("data-frame-key", frameKey);
    addIframe.setAttribute("data-object-key", objectKey);
    addIframe.setAttribute("data-node-key", nodeKey);
    addIframe.setAttribute("onload", 'realityEditor.network.onElementLoad("' + objectKey + '","' + frameKey + '","' + nodeKey + '")');
    addIframe.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts");

    var addOverlay = document.createElement('div');
    addOverlay.id = activeKey;
    addOverlay.className = (globalStates.editingMode && activeVehicle.developer) ? "mainEditing" : "mainProgram";
    addOverlay.frameBorder = 0;
    addOverlay.style.width = activeVehicle.frameSizeX + "px";
    addOverlay.style.height = activeVehicle.frameSizeY + "px";
    addOverlay.style.left = ((globalStates.height - activeVehicle.frameSizeX) / 2) + "px";
    addOverlay.style.top = ((globalStates.width - activeVehicle.frameSizeY) / 2) + "px";
    addOverlay.style.visibility = "hidden";
    addOverlay.style.zIndex = "3";
    if (activeVehicle.developer) {
        addOverlay.style["touch-action"] = "none";
    }

    var addSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    addSVG.id = "svg" + activeKey;
    addSVG.className = "mainCanvas";
    addSVG.style.width = "100%";
    addSVG.style.height = "100%";
    addSVG.style.zIndex = "3";

    return {
        addContainer: addContainer,
        addIframe: addIframe,
        addOverlay: addOverlay,
        addSVG: addSVG
    };
};

realityEditor.gui.ar.draw.createLogicElement = function(activeVehicle, activeKey) {
    var size = 200;
    var addLogic = document.createElement('div');
    addLogic.id = "logic" + activeKey;
    addLogic.className = "mainEditing";
    addLogic.style.width = size + "px";
    addLogic.style.height = size + "px";
    addLogic.style.left = 0; //((activeVehicle.frameSizeX - size) / 2) + "px";
    addLogic.style.top = 0; //((activeVehicle.frameSizeY - size) / 2) + "px";
    addLogic.style.visibility = "hidden";

    var svgContainer = document.createElementNS('http://www.w3.org/2000/svg', "svg");
    svgContainer.setAttributeNS(null, "viewBox", "0 0 100 100");

    var svgElement = [];
    svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    svgElement[0].setAttributeNS(null, "fill", "#00ffff");
    svgElement[0].setAttributeNS(null, "d", "M50,0V50H0V30A30,30,0,0,1,30,0Z");
    svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    svgElement[1].setAttributeNS(null, "fill", "#00ff00");
    svgElement[1].setAttributeNS(null, "d", "M100,30V50H50V0H70A30,30,0,0,1,100,30Z");
    svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    svgElement[2].setAttributeNS(null, "fill", "#ffff00");
    svgElement[2].setAttributeNS(null, "d", "M100,50V70a30,30,0,0,1-30,30H50V50Z");
    svgElement.push(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    svgElement[3].setAttributeNS(null, "fill", "#ff007c");
    svgElement[3].setAttributeNS(null, "d", "M50,50v50H30A30,30,0,0,1,0,70V50Z");

    for (var i = 0; i < svgElement.length; i++) {
        svgContainer.appendChild(svgElement[i]);
        svgElement[i].number = i;
        svgElement[i].addEventListener('pointerenter', function () {
            globalProgram.logicSelector = this.number;

            if (globalProgram.nodeA === activeKey)
                globalProgram.logicA = this.number;
            else
                globalProgram.logicB = this.number;

            console.log(globalProgram.logicSelector);
        });
        addLogic.appendChild(svgContainer);
    }
    
    return addLogic;
};

/**
 * @desc
 * @param objectKey
 * @param thisObject
 * @return
 **/

realityEditor.gui.ar.draw.killObjects = function (activeKey, activeVehicle, globalDOMCache) {
    if(!activeVehicle.visibleCounter) {
        return;
        }
    if (activeVehicle.visibleCounter > 1) {
        activeVehicle.visibleCounter--;
    } else {
        activeVehicle.visibleCounter--;
        for (var activeFrameKey in activeVehicle.frames) {
            if (activeFrameKey === globalStates.inTransitionFrame) continue;
            
            activeVehicle.frames[activeFrameKey].loaded = false;
            globalDOMCache["object" + activeFrameKey].parentNode.removeChild(globalDOMCache["object" + activeFrameKey]);
            delete globalDOMCache["object" + activeFrameKey];
            delete globalDOMCache["iframe" + activeFrameKey];
            delete globalDOMCache[activeFrameKey];
            delete globalDOMCache["svg" + activeFrameKey];
            delete globalDOMCache[activeFrameKey];

            for (var activeNodeKey in activeVehicle.frames[activeFrameKey].nodes) {
                if (!activeVehicle.frames[activeFrameKey].nodes.hasOwnProperty(activeNodeKey)) continue;
                try {
                    globalDOMCache["object" + activeNodeKey].parentNode.removeChild(globalDOMCache["object" + activeNodeKey]);
                    delete globalDOMCache["object" + activeNodeKey];
                    delete globalDOMCache["iframe" + activeNodeKey];
                    delete globalDOMCache[activeNodeKey];
                    delete globalDOMCache["svg" + activeNodeKey];
                    activeVehicle.frames[activeFrameKey].nodes[activeNodeKey].loaded = false;
                } catch (err) {
                    this.cout("could not find any");
                }
            }
        }
        this.cout("killObjects");
    }
};

realityEditor.gui.ar.draw.killElement = function (thisActiveVehicleKey, thisActiveVehicle) {
    thisActiveVehicle.loaded = false;
    globalDOMCache["object" + thisActiveVehicleKey].parentNode.removeChild(globalDOMCache["object" + thisActiveVehicleKey]);
    delete globalDOMCache["object" + thisActiveVehicleKey];
    delete globalDOMCache["iframe" + thisActiveVehicleKey];
    delete globalDOMCache[thisActiveVehicleKey];
    delete globalDOMCache["svg" + thisActiveVehicleKey];
    delete globalDOMCache[thisActiveVehicleKey];
};

realityEditor.gui.ar.draw.deleteNode = function (objectId, frameId, nodeId) {
    var thisFrame = realityEditor.getFrame(objectId, frameId);
    if (!thisFrame) return null;

    delete thisFrame.nodes[nodeId];
    if (this.globalDOMCache["object" + nodeId]) {
        if (this.globalDOMCache["object" + nodeId].parentNode) {
            this.globalDOMCache["object" + nodeId].parentNode.removeChild(this.globalDOMCache["object" + nodeId]);
        }
        delete this.globalDOMCache["object" + nodeId];
    }
    delete this.globalDOMCache["iframe" + nodeId];
    delete this.globalDOMCache[nodeId];
    delete this.globalDOMCache["svg" + nodeId];

};

realityEditor.gui.ar.draw.deleteFrame = function (objectId, frameId) {

    delete objects[objectId].frames[frameId];
    this.globalDOMCache["object" + frameId].parentNode.removeChild(this.globalDOMCache["object" + frameId]);
    delete this.globalDOMCache["object" + frameId];
    delete this.globalDOMCache["iframe" + frameId];
    delete this.globalDOMCache[frameId];
    delete this.globalDOMCache["svg" + frameId];

};

/**
 * Sets the objectVisible property of not only the object, but also all of its frames
 * @param object - Object reference to the object whose property you wish to set
 * @param shouldBeVisible - Boolean visible or not. Objects that are not visible do not render their interfaces, nodes, links.
 */
realityEditor.gui.ar.draw.setObjectVisible = function (object, shouldBeVisible) {
    if (!object) return;
    object.objectVisible = shouldBeVisible;
    for (var frameKey in object.frames) {
        if (!object.frames.hasOwnProperty(frameKey)) continue;
        object.frames[frameKey].objectVisible = shouldBeVisible;
    }
};

// simulates drawing... TODO: simplify this and make it only work for frames? or maybe nodes too...

realityEditor.gui.ar.draw.recomputeTransformMatrix = function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCache, globalStates, globalCanvas, activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {

    if (activeVehicle.fullScreen !== true) {
        
        var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
        
        var finalOffsetX = positionData.x;
        var finalOffsetY = positionData.y;

        // // add node's position to its frame's position to gets its actual offset
        if (activeType === "node" || activeType === "logic") {
            var frameKey = activeVehicle.frameId;
            var frame = realityEditor.getFrame(objectKey, frameKey);
            if (frame) {
                var parentFramePositionData = realityEditor.gui.ar.positioning.getPositionData(frame);
                finalOffsetX += parentFramePositionData.x;
                finalOffsetY += parentFramePositionData.y;
            }
        }

        matrix.r3 = [
            positionData.scale, 0, 0, 0,
            0, positionData.scale, 0, 0,
            0, 0, 1, 0,
            // positionData.x, positionData.y, 0, 1
            finalOffsetX, finalOffsetY, 0, 1
        ];

        if (matrix.matrixtouchOn === activeKey) {
            //if(globalStates.unconstrainedPositioning===true)
            activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);

            //  console.log(activeVehicle.temp);

            if (matrix.copyStillFromMatrixSwitch) {
                matrix.visual = utilities.copyMatrix(activeObjectMatrix);
                if (typeof positionData.matrix === "object" && positionData.matrix.length > 0) {
                    utilities.multiplyMatrix(positionData.matrix, activeVehicle.temp, activeVehicle.begin);
                } else {
                    activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);
                }

                if (globalStates.unconstrainedPositioning === true) {
                    console.log('write to matrix -- should be relativeMatrix');
                    var resultMatrix = [];
                    utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), resultMatrix);
                    realityEditor.gui.ar.positioning.setWritableMatrix(activeVehicle, resultMatrix);
                }

                matrix.copyStillFromMatrixSwitch = false;

            } else if (globalStates.unconstrainedPositioning === true) {
                console.log('write to matrix -- should be relativeMatrix');
                var resultMatrix = [];
                realityEditor.gui.ar.utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), resultMatrix);
                realityEditor.gui.ar.positioning.setWritableMatrix(activeVehicle, resultMatrix);
            }

            if (globalStates.unconstrainedPositioning && matrix.copyStillFromMatrixSwitch) {
                activeObjectMatrix = matrix.visual;
            }

        }
        
        // realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
        
        if (typeof positionData.matrix !== "undefined" && positionData.matrix.length > 0 && typeof positionData.matrix[1] !== "undefined") {
            if (globalStates.unconstrainedPositioning === false) {
                //activeVehicle.begin = copyMatrix(multiplyMatrix(activeVehicle.matrix, activeVehicle.temp));
                utilities.multiplyMatrix(positionData.matrix, activeVehicle.temp, activeVehicle.begin);
            }
            utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
            utilities.multiplyMatrix(matrix.r3, matrix.r, matrix.r2);
        }

        if (typeof positionData.matrix !== "undefined") {
            if (positionData.matrix.length < 13) {
                utilities.multiplyMatrix(matrix.r3, activeObjectMatrix, finalMatrix);

            } else {
                utilities.multiplyMatrix(positionData.matrix, activeObjectMatrix, matrix.r);
                utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
            }
        }

        // we want nodes closer to camera to have higher z-coordinate, so that they are rendered in front
        // but we want all of them to have a positive value so they are rendered in front of background canvas
        // and frames with developer=false should have the lowest positive value

        if (finalMatrix[14] < 10) {
            finalMatrix[14] = 10;
        }
        finalMatrix[14] = 200 + 100000 / finalMatrix[14]; // TODO: does this mess anything up? it should fix the z-order problems

        //move non-developer frames to the back so they don't steal touches from interactable frames
        if (activeVehicle.developer === false) {
            finalMatrix[14] = 100;
        }

        activeVehicle.mostRecentFinalMatrix = finalMatrix;

        // draw transformed
        // globalDOMCache["object" + activeKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';
        
        // return 'matrix3d(' + finalMatrix.toString() + ')';
        
        return finalMatrix;

    }
};

realityEditor.gui.ar.draw.areAnyScreensVisible = function() {
    var anyScreensVisible = false;
    for (var objectKey in this.visibleObjects) {
        if (!objects.hasOwnProperty(objectKey)) continue;
        if (objects[objectKey].visualization === 'screen') {
            anyScreensVisible = true;
            break;
        }
    }

    return anyScreensVisible;
};
