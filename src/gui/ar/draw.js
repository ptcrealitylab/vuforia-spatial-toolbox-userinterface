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
    
    // scale x, y, and z elements of matrix for mm to meter conversion ratio
    for (var objectKey in this.visibleObjects) {
        if (!this.visibleObjects.hasOwnProperty(objectKey)) continue;
        // TODO: infer if it is in mm or meter scale and only multiply by 1000 if needs it
        this.visibleObjects[objectKey][14] *= 1000;
        this.visibleObjects[objectKey][13] *= 1000;
        this.visibleObjects[objectKey][12] *= 1000;
    }

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

                // making sure that the node is always the object to draw
                this.activeKey = frameKey;
                this.activeVehicle = this.activeFrame;
                this.activeType = "ui";
                
                var continueUpdate = this.drawTransformed(this.visibleObjects, objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,
                    this.globalDOMCache, this.globalStates, this.globalCanvas,
                    this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                    this.nodeCalculations, this.cout);

                if (globalStates.guiState === 'ui' && !continueUpdate) return;

                var frameUrl = "http://" + this.activeObject.ip + ":" + httpPort + "/obj/" + this.activeObject.name + "/frames/" + this.activeFrame.name + "/";
                this.addElement(frameUrl, objectKey, frameKey, null, this.activeType, this.activeVehicle);
                
                if (globalStates.guiState !== 'ui') {
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
                if (realityEditor.device.isEditingUnconstrained(this.activeVehicle) && this.activeVehicle.location === 'global') {
                    
                    wereAnyFramesMovedToGlobal = true;
                    globalStates.inTransitionObject = objectKey;
                    globalStates.inTransitionFrame = frameKey;
                    
                } else {
                
                    // unconstrained editing local frame - can't transition reset its matrix to what it was before starting to edit
                    if (realityEditor.device.isEditingUnconstrained(this.activeVehicle)) {
                        var startingMatrix = realityEditor.device.editingState.startingMatrix || [];
                        realityEditor.gui.ar.positioning.setPositionDataMatrix(this.activeVehicle, startingMatrix);
                    }

                    this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCache, this.cout);

                    for (var nodeKey in this.activeFrame.nodes) {
                        this.activeNode = realityEditor.getNode(objectKey, frameKey, nodeKey);
                        this.activeKey = nodeKey;
                        this.activeVehicle = this.activeNode;
                        this.activeType = this.activeNode.type;
                        // if (!this.activeObject.nodes.hasOwnProperty(nodeKey)) {  continue;  }

                        // unconstrained editing local frame - can't transition reset its matrix to what it was before starting to edit
                        if (realityEditor.device.isEditingUnconstrained(this.activeNode)) {
                            var startingMatrix = realityEditor.device.editingState.startingMatrix || [];
                            realityEditor.gui.ar.positioning.setPositionDataMatrix(this.activeNode, startingMatrix);
                        }
                        
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

    // temporarily aren't using this method anymore for the pocket, it immediately gets added to the closest object
    /*
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
    */

    // Render the inTransitionFrame 

    if (globalStates.inTransitionObject && globalStates.inTransitionFrame) {

        this.activeObject = objects[globalStates.inTransitionObject];
        this.activeObject.visibleCounter = timeForContentLoaded;
        this.activeObject.objectVisible = true;

        objectKey = globalStates.inTransitionObject;
        frameKey = globalStates.inTransitionFrame;

        this.activeObjectMatrix = [];

        if (!this.visibleObjects.hasOwnProperty(objectKey)) {

            // this.ar.utilities.multiplyMatrix(this.visibleObjects[closestObjectKey], globalStates.projectionMatrix, this.matrix.r);
            // this.ar.utilities.multiplyMatrix(rotateX, this.matrix.r, this.activeObjectMatrix);
            
            // for (var frameKey in this.activeObject.frames) {
            this.activeFrame = this.activeObject.frames[frameKey];

            this.activeKey = frameKey;
            
            this.activeObjectMatrix = this.activeFrame.temp;

            var continueUpdate = this.drawTransformed(this.visibleObjects, objectKey, this.activeKey, this.activeType, this.activeFrame, this.notLoading, this.globalDOMCache, this.globalStates, this.globalCanvas, this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities, this.nodeCalculations, this.cout);

            if (!continueUpdate) return;
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
    for (var oldNodeKey in frame.nodes) {
        if (!frame.nodes.hasOwnProperty(oldNodeKey)) continue;
        var node = frame.nodes[oldNodeKey];
        var newNodeKey = newFrameKey + node.name;
        node.objectId = newObjectKey;
        node.frameId = newFrameKey;
        node.uuid = newNodeKey;
        newNodes[node.uuid] = node;
        delete frame.nodes[oldNodeKey];

        // update the DOM elements for each node
        // (only if node has been loaded to DOM already - doesn't happen if haven't ever switched to node view)
        if (globalDOMCache[oldNodeKey]) {
            // update their keys in the globalDOMCache 
            globalDOMCache['object' + newNodeKey] = globalDOMCache['object' + oldNodeKey];
            globalDOMCache['iframe' + newNodeKey] = globalDOMCache['iframe' + oldNodeKey];
            globalDOMCache[newNodeKey] = globalDOMCache[oldNodeKey];
            globalDOMCache['svg' + newNodeKey] = globalDOMCache['svg' + oldNodeKey];
            delete globalDOMCache['object' + oldNodeKey];
            delete globalDOMCache['iframe' + oldNodeKey];
            delete globalDOMCache[oldNodeKey];
            delete globalDOMCache['svg' + oldNodeKey];
            
            // re-assign ids to DOM elements
            globalDOMCache['object' + newNodeKey].id = 'object' + newNodeKey;
            globalDOMCache['iframe' + newNodeKey].id = 'iframe' + newNodeKey;
            globalDOMCache[newNodeKey].id = newNodeKey;
            globalDOMCache[newNodeKey].objectId = newObjectKey;
            globalDOMCache[newNodeKey].frameId = newFrameKey;
            globalDOMCache['svg' + newNodeKey].id = 'svg' + newNodeKey;

            // update iframe attributes
            globalDOMCache['iframe' + newNodeKey].setAttribute("data-frame-key", newFrameKey);
            globalDOMCache['iframe' + newNodeKey].setAttribute("data-object-key", newObjectKey);
            globalDOMCache['iframe' + newNodeKey].setAttribute("data-node-key", newNodeKey);

            globalDOMCache['iframe' + newNodeKey].setAttribute("onload", 'realityEditor.network.onElementLoad("' + newObjectKey + '","' + newFrameKey + '","' + newNodeKey + '")');
            globalDOMCache['iframe' + newNodeKey].contentWindow.location.reload(); // TODO: is there a way to update realityInterface of the frame without reloading?
        }
        
    }

    frame.nodes = newNodes;
    frame.objectId = newObjectKey;
    frame.uuid = newFrameKey;
    
    // update any variables in the application with the old keys to use the new keys
    if (realityEditor.device.editingState.object === oldObjectKey) {
        realityEditor.device.editingState.object = newObjectKey;
    }
    if (realityEditor.device.editingState.frame === oldFrameKey) {
        realityEditor.device.editingState.frame = newFrameKey;
        realityEditor.gui.ar.draw.pushEditedFrameToFront(newFrameKey);
    }
    if (realityEditor.gui.screenExtension.screenObject.object === oldObjectKey) {
        realityEditor.gui.screenExtension.screenObject.object = newObjectKey;
    }
    if (realityEditor.gui.screenExtension.screenObject.frame === oldFrameKey) {
        realityEditor.gui.screenExtension.screenObject.frame = newFrameKey;
    }
    
    // update the DOM elements for the frame with new ids
    // (only if node has been loaded to DOM already - doesn't happen if haven't ever switched to ui view)
    if (globalDOMCache[oldFrameKey]) {
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
    }
    
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
    realityEditor.gui.ar.draw.removeFromEditedFramesList(oldFrameKey);
    realityEditor.network.deleteFrameFromObject(oldObject.ip, oldObjectKey, oldFrameKey);
};

realityEditor.gui.ar.draw.returnTransitionFrameBackToSource = function() {
    
    // (activeKey, activeVehicle, globalDOMCache, cout
    var frameInMotion = realityEditor.getFrame(globalStates.inTransitionObject, globalStates.inTransitionFrame);
    realityEditor.gui.ar.draw.hideTransformed(globalStates.inTransitionFrame, frameInMotion, globalDOMCache, cout);

    var startingMatrix = realityEditor.device.editingState.startingMatrix || [];
    realityEditor.gui.ar.positioning.setPositionDataMatrix(frameInMotion, startingMatrix);
    
    // var positionData = realityEditor.gui.ar.positioning.getPositionData(frameInMotion);
    // positionData.matrix = [];
    
    frameInMotion.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();
    frameInMotion.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();

    // update any variables in the application with the old keys to use the new keys
    // TODO: do these need to be set here or will they update automatically elsewhere?
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
    
    // calculate new scale based on the difference between the frame's old object marker and the new one, so the distance is preserved
    // var oldTargetSize = realityEditor.getObject(oldObjectKey).targetSize;
    // var newTargetSize = realityEditor.getObject(newObjectKey).targetSize;
    // var scaleFactor = oldTargetSize.width / newTargetSize.width;
    //
    // realityEditor.gui.ar.positioning.getPositionData(frame).scale *= scaleFactor;
    
    // recompute frame.temp for the new object
    this.ar.utilities.multiplyMatrix(this.visibleObjects[newObjectKey], this.globalStates.projectionMatrix, this.matrix.r);
    this.ar.utilities.multiplyMatrix(this.rotateX, this.matrix.r, frame.temp);

    // frame.begin[0] /= scaleFactor;
    // frame.begin[5] /= scaleFactor;
    // frame.begin[10] /= scaleFactor;
    // frame.begin[15] *= scaleFactor;

    // compute frame.matrix based on new object
    var resultMatrix = [];
    this.utilities.multiplyMatrix(frame.begin, this.utilities.invertMatrix(frame.temp), resultMatrix);
    realityEditor.gui.ar.positioning.setPositionDataMatrix(frame, resultMatrix); // TODO: fix this somehow, make it more understandable
    
    // reset frame.begin
    frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
    
};

/**
 * @desc
 * @return {Boolean} whether to continue the update loop (defaults true, return false if you remove the activeVehicle during this loop)
 **/

realityEditor.gui.ar.draw.drawTransformed = function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCache, globalStates, globalCanvas, activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {
    //console.log(JSON.stringify(activeObjectMatrix));

    // it's ok if the frame isn't visible anymore if we're in the node view - render it anyways
    var shouldRenderFramesInNodeView = globalStates.guiState === 'node' && activeType === 'ui';

    if (notLoading !== activeKey && activeVehicle.loaded === true && activeVehicle.visualization !== "screen") {

        var editingVehicle = realityEditor.device.getEditingVehicle();
        var thisIsBeingEdited = (editingVehicle === activeVehicle);

        var activePocketFrameWaiting = activeVehicle === pocketFrame.vehicle && pocketFrame.waitingToRender;
        var activePocketNodeWaiting = activeVehicle === pocketNode.vehicle && pocketNode.waitingToRender;
        
        // make visible a frame or node if it was previously hidden
        // waits to make visible until positionOnLoad has been applied, to avoid one frame rendered in wrong position
        if (!shouldRenderFramesInNodeView && !activeVehicle.visible && !(activePocketFrameWaiting || activePocketNodeWaiting)) {
            
            activeVehicle.visible = true;
            
            var container = globalDOMCache["object" + activeKey];
            var iFrame = globalDOMCache["iframe" + activeKey];
            var overlay = globalDOMCache[activeKey];
            var canvas = globalDOMCache["svg" + activeKey];
            
            if (activeType === 'ui') {
                container.classList.remove('hiddenFrameContainer');
                container.classList.add('visibleFrameContainer');
                container.classList.remove('displayNone');

            } else {
                container.classList.remove('hiddenNodeContainer');
                container.classList.add('visibleNodeContainer');

            }
            
            iFrame.classList.remove('hiddenFrame');
            iFrame.classList.add('visibleFrame');
            
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
            
            if (activeType !== "ui") {
                activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
            }

            if (activeType === "logic" && objectKey !== "pocket") {
                if(activeVehicle.animationScale === 1) {
                    globalDOMCache["logic" + nodeKey].className = "mainEditing scaleOut";
                    thisObject.animationScale = 0;
                }
            }
            
            // re-activate the activeScreenObject when it reappears
            var screenExtension = realityEditor.gui.screenExtension;
            if (screenExtension.registeredScreenObjects[activeKey]) {

                if (!screenExtension.visibleScreenObjects.hasOwnProperty(activeKey)) {
                    screenExtension.visibleScreenObjects[activeKey] = {
                        object: objectKey,
                        frame: activeKey,
                        node: null,
                        x: 0,
                        y: 0,
                        touches: null
                    };
                }
            }

        }

        if ((activeVehicle.visible || shouldRenderFramesInNodeView) || activePocketFrameWaiting || activePocketNodeWaiting) {
            
            if (shouldRenderFramesInNodeView) {
                globalDOMCache["object" + activeKey].classList.remove('displayNone');
            }

            if (activeVehicle.fullScreen !== true) {

                var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);

                // set initial position of frames and nodes placed in from pocket
                // 1. drop directly onto marker plane if in freeze state (or quick-tapped the frame)
                // 2. otherwise float in unconstrained slightly in front of the editor camera
                // 3. animate so it looks like it is being pushed from pocket
                if (activePocketNodeWaiting && typeof activeVehicle.mostRecentFinalMatrix !== 'undefined') {
                    console.log('just added pocket node');
                    this.addPocketVehicle(pocketNode, matrix);
                }
                if (activePocketFrameWaiting && typeof activeVehicle.mostRecentFinalMatrix !== 'undefined') {
                    console.log('just added pocket frame');
                    this.addPocketVehicle(pocketFrame, matrix);
                }
                
                var finalOffsetX = positionData.x;
                var finalOffsetY = positionData.y;
                var finalScale = positionData.scale;

                // TODO: move this around to other location so that translations get applied in different order as compared to parent frame matrix composition
                // add node's position to its frame's position to gets its actual offset
                if (activeType !== "ui" && activeType !== "logic") {
                    var frameKey = activeVehicle.frameId;
                    var frame = realityEditor.getFrame(objectKey, frameKey);
                    if (frame) {
                        var parentFramePositionData = realityEditor.gui.ar.positioning.getPositionData(frame);
                        finalOffsetX = finalOffsetX * (parentFramePositionData.scale/globalStates.defaultScale) + parentFramePositionData.x;
                        finalOffsetY = finalOffsetY * (parentFramePositionData.scale/globalStates.defaultScale) + parentFramePositionData.y;
                        finalScale *= (parentFramePositionData.scale/globalStates.defaultScale);
                    }
                }
                
                // TODO: also multiply node's unconstrained matrix by frame's unconstrained matrix if necessary
                
                matrix.r3 = [
                    finalScale, 0, 0, 0,
                    0, finalScale, 0, 0,
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

                    if (realityEditor.device.isEditingUnconstrained(activeVehicle)) {

                        activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);

                        // do this one time when you first tap down on something unconstrained, to preserve its current matrix
                        if (matrix.copyStillFromMatrixSwitch) {
                            matrix.visual = utilities.copyMatrix(activeObjectMatrix);
                            
                            var matrixToUse = positionData.matrix;
                            if (activeType !== 'ui' && activeType !== 'logic') {
                                matrixToUse = positionData.relativeMatrix;
                            }
                            
                            if (typeof matrixToUse === "object") {
                                if (matrixToUse.length > 0) {
                                    utilities.multiplyMatrix(matrixToUse, activeVehicle.temp, activeVehicle.begin);
                                } else {
                                    activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);
                                }
                            } else {
                                activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);
                            }
                            
                            var resultMatrix = [];
                            utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), resultMatrix);
                            realityEditor.gui.ar.positioning.setPositionDataMatrix(activeVehicle, resultMatrix); // TODO: fix this somehow, make it more understandable

                            matrix.copyStillFromMatrixSwitch = false;
                            
                        // if this isn't the first frame of unconstrained editing, just use the previously stored begin and temp
                        } else {
                            var resultMatrix = [];
                            realityEditor.gui.ar.utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), resultMatrix);
                            realityEditor.gui.ar.positioning.setPositionDataMatrix(activeVehicle, resultMatrix);
                        }

                        // TODO: this never seems to be triggered, can it be removed?
                        // if (globalStates.unconstrainedPositioning && matrix.copyStillFromMatrixSwitch) {
                        //     activeObjectMatrix = matrix.visual;
                        // }

                    }

                    // recomputes .matrix based on .relativeMatrix
                    realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
                    
                    if (typeof positionData.matrix !== "undefined" && positionData.matrix.length > 0) {
                        if (realityEditor.device.isEditingUnconstrained(activeVehicle) && !(activeVehicle === pocketFrame.vehicle || activeVehicle === pocketNode.vehicle)) {
                            utilities.multiplyMatrix(positionData.matrix, activeVehicle.temp, activeVehicle.begin);
                        }
                        
                        utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
                        utilities.multiplyMatrix(matrix.r3, matrix.r, matrix.r2);
                        utilities.drawMarkerPlaneIntersection(activeKey, matrix.r2, activeVehicle);
                        
                        // // calculate center Z of frame to know if it is mostly in front or behind the marker plane
                        // var projectedPoint = realityEditor.gui.ar.utilities.multiplyMatrix4([activeVehicle.ar.x, activeVehicle.ar.y, 0, 1], matrix.r);
                        // activeVehicle.originCoordinates = {
                        //     x: projectedPoint[0],
                        //     y: projectedPoint[1],
                        //     z: projectedPoint[2]
                        // }
                        
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
                
                
                // multiply in the animation matrix if you are editing this frame in unconstrained mode.
                // in the future this can be expanded but currently this is the only time it gets animated.
                if (realityEditor.device.isEditingUnconstrained(activeVehicle)) {
                    var animatedFinalMatrix = [];
                    utilities.multiplyMatrix(finalMatrix, editingAnimationsMatrix, animatedFinalMatrix);
                    finalMatrix = utilities.copyMatrix(animatedFinalMatrix);
                }
                
                // we want nodes closer to camera to have higher z-coordinate, so that they are rendered in front
                // but we want all of them to have a positive value so they are rendered in front of background canvas
                // and frames with developer=false should have the lowest positive value

                // calculate center Z of frame to know if it is mostly in front or behind the marker plane
                var projectedPoint = realityEditor.gui.ar.utilities.multiplyMatrix4([0, 0, 0, 1], activeObjectMatrix);
                // activeVehicle.originCoordinates = {
                //     x: projectedPoint[0],
                //     y: projectedPoint[1],
                //     z: projectedPoint[2]
                // };

                activeVehicle.screenZ = finalMatrix[14]; // but save pre-processed z position to use later to calculate screenLinearZ

                var activeElementZIncrease = thisIsBeingEdited ? 100 : 0;
                
                // var editedOrderData = (activeType === "ui") ? this.getFrameRenderPriority(activeKey) : this.getNodeRenderPriority(activeKey);
                // var editedOrderZIncrease = (editedOrderData.length > 0) ? 50 * (editedOrderData.index / editedOrderData.length) : 0;
                
                var editedOrderZIncrease = 0;
                if (activeType !== "ui") {
                    var editedOrderData = this.getNodeRenderPriority(activeKey);
                    editedOrderZIncrease = (editedOrderData.length > 0) ? 50 * (editedOrderData.index / editedOrderData.length) : 0;
                }

                if (projectedPoint[2] < 10) {
                    projectedPoint[2] = 10;
                }
                finalMatrix[14] = 200 + activeElementZIncrease + editedOrderZIncrease + 1000000 / projectedPoint[2];


                //move non-developer frames to the back so they don't steal touches from interactable frames //TODO: test if this is still working for three.js content / use a different property other than developer
                // if (activeVehicle.developer === false) {
                //     finalMatrix[14] = 100;
                // }

                // put frames all the way in the back if you are in node view
                if (shouldRenderFramesInNodeView) {
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
                
                if (thisIsBeingEdited) {
                    realityEditor.device.checkIfFramePulledIntoUnconstrained(activeVehicle);
                }

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
                    
                    
                    // don't show the logic ports if you are dragging anything around, or if this logic is locked
                    if (utilities.insidePoly(globalStates.pointerPosition, nodeCalculations.rectPoints) && !activeVehicle.lockPassword && !editingVehicle) {
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

            if (activeType !== "ui") {
                if (!!activeVehicle.lockPassword && activeVehicle.lockType === "full") {
                    globalDOMCache["iframe" + activeKey].style.opacity = 0.25;
                } else if (!!activeVehicle.lockPassword && activeVehicle.lockType === "half") {
                    globalDOMCache["iframe" + activeKey].style.opacity = 0.75;
                } else {
                    globalDOMCache["iframe" + activeKey].style.opacity = 1.0;
                }
            }

        }
    
    } else if (activeType === "ui" && activeVehicle.visualization === "screen") {
        // if (shouldRenderFramesInNodeView) {
        this.hideScreenFrame(activeKey);
        // }
    }
    
    return true;

};

realityEditor.gui.ar.draw.hideScreenFrame = function(activeKey) {
    if (globalDOMCache["object" + activeKey]) {
        globalDOMCache["object" + activeKey].classList.add('displayNone');
    }
};

realityEditor.gui.ar.draw.showARFrame = function(activeKey) {
    if (globalDOMCache["object" + activeKey]) {
        globalDOMCache["object" + activeKey].classList.remove('displayNone');
    }
};



/**
 * A one-time action that sets up the frame or node added from the pocket in the correct place and begins editing it
 * @param pocketContainer - either pocketFrame or pocketNode
 * @param matrix - reference to realityEditor.gui.ar.draw.matrix
 */
realityEditor.gui.ar.draw.addPocketVehicle = function(pocketContainer, matrix) {
    
    // // drop frames directly down onto marker plane if you quick-tap the pocket or background is frozen
    // if (pocketContainer.type === 'ui' && (globalStates.freezeButtonState || realityEditor.device.currentScreenTouches.indexOf("pocket-element") === -1)) {
    //     realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinateBasedOnMarker(pocketContainer.vehicle, pocketContainer.positionOnLoad.pageX, pocketContainer.positionOnLoad.pageY, false);
    //
    // // otherwise float in front of screen in unconstrained mode
    // } else {
        var scaleRatio = 1.4; // TODO: this is an approximation that roughly places the pocket frame in the correct spot. find a complete solution.

        var positionData = realityEditor.gui.ar.positioning.getPositionData(pocketContainer.vehicle);

        positionData.x = (pocketContainer.positionOnLoad.pageX - globalStates.height/2) * scaleRatio;
        positionData.y = (pocketContainer.positionOnLoad.pageY - globalStates.width/2) * scaleRatio;
        // immediately start placing the pocket frame in unconstrained mode
        realityEditor.device.editingState.unconstrained = true;

        // still need to set touchOffset...
        realityEditor.device.editingState.touchOffset = {
            x: parseFloat(pocketContainer.vehicle.frameSizeX)/2,
            y: parseFloat(pocketContainer.vehicle.frameSizeY)/2
        };
        
    // }

    // only start editing it if you didn't do a quick tap that already released by the time it loads
    if (pocketContainer.type !== 'ui' || realityEditor.device.currentScreenTouches.indexOf("pocket-element") > -1) {

        var activeFrameKey = pocketContainer.vehicle.frameId || pocketContainer.vehicle.uuid;
        var activeNodeKey = pocketContainer.vehicle.uuid === activeFrameKey ? null : pocketContainer.vehicle.uuid;

        realityEditor.device.beginTouchEditing(pocketContainer.vehicle.objectId, activeFrameKey, activeNodeKey);
        // animate it as flowing out of the pocket
        this.startPocketDropAnimation(250, 0.7, 1.0);
        matrix.copyStillFromMatrixSwitch = false;

        pocketContainer.vehicle.begin = realityEditor.gui.ar.utilities.copyMatrix(pocketBegin); // a preset matrix hovering slightly in front of editor
        
    }

    pocketContainer.positionOnLoad = null;
    pocketContainer.waitingToRender = false;
};

/**
 * Run an animation on the frame being dropped in from the pocket, performing a smooth tweening of its last matrix element
 * The frame scales down (moves away from camera) the bigger that 15th element is
 * @param {number} timeInMilliseconds - how long the animation takes (default 250ms)
 * @param {number} startPerspectiveDivide - the frame starts out (1 / this) times as big as usual (default 0.7)
 * @param {number} endPerspectiveDivide - the frame ends up (1 / this) times as big as usual (default 1)
 */
realityEditor.gui.ar.draw.startPocketDropAnimation = function(timeInMilliseconds, startPerspectiveDivide, endPerspectiveDivide) {
    var duration = timeInMilliseconds || 250;
    var zStart = startPerspectiveDivide || 0.7;
    var zEnd = endPerspectiveDivide || 1.0;
    
    // reset this so that the initial distance to screens gets calculated when the pocketAnimation ends
    // (or else it automatically gets pushed in by its own animation)
    if (globalStates.initialDistance) {
        globalStates.initialDistance = null;
    }
    
    var position = {x: 0, y: 0, z: zStart};
    pocketDropAnimation = new TWEEN.Tween(position)
        .to({z: zEnd}, duration)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate( function(t) {
            editingAnimationsMatrix[15] = position.z;
        }).onComplete(function() {
            editingAnimationsMatrix[15] = zEnd;
            pocketDropAnimation = null;
        }).onStop(function() {
            editingAnimationsMatrix[15] = zEnd;
            pocketDropAnimation = null;
        })
        .start();
};

/**
 * @desc
 * @return
 **/
realityEditor.gui.ar.draw.hideTransformed = function (activeKey, activeVehicle, globalDOMCache, cout) {
    
    var isVisible = activeVehicle.visible === true;
    if (!isVisible) {
        var isPartiallyHiddenFrame = (activeVehicle.type === 'ui' || typeof activeVehicle.type === 'undefined') &&
                                     !globalDOMCache['object' + activeKey].classList.contains('displayNone');
        if (isPartiallyHiddenFrame) {
            isVisible = true;
        }
    }

    if (isVisible) {
        
        if (activeVehicle.type === 'ui' || typeof activeVehicle.type === 'undefined') {
            globalDOMCache['object' + activeKey].classList.remove('visibleFrameContainer');
            globalDOMCache['object' + activeKey].classList.add('hiddenFrameContainer');
            
            var shouldReallyHide = !this.visibleObjects.hasOwnProperty(activeVehicle.objectId) || activeVehicle.visualization === 'screen';
            if (shouldReallyHide) {
                globalDOMCache['object' + activeKey].classList.add('displayNone');
            }
            
        } else {
            globalDOMCache['object' + activeKey].classList.remove('visibleNodeContainer');
            globalDOMCache['object' + activeKey].classList.add('hiddenNodeContainer');

        }

        globalDOMCache['iframe' + activeKey].classList.remove('visibleFrame');
        globalDOMCache['iframe' + activeKey].classList.add('hiddenFrame');
        
        globalDOMCache["iframe" + activeKey].contentWindow.postMessage(
            JSON.stringify(
                {
                    visibility: "hidden"
                }), '*');

        activeVehicle.visible = false;
        activeVehicle.visibleEditing = false;

        globalDOMCache[activeKey].style.visibility = 'hidden';
        globalDOMCache["svg" + activeKey].style.display = 'none';
        
        // reset the active screen object when it disappears
        if (realityEditor.gui.screenExtension.visibleScreenObjects[activeKey]) {
            delete realityEditor.gui.screenExtension.visibleScreenObjects[activeKey];
        }

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
            activeVehicle.frameSizeX = activeVehicle.width || 220;
        } 
        if (typeof activeVehicle.width === 'undefined') {
            activeVehicle.width = activeVehicle.frameSizeX;
        }

        if (typeof activeVehicle.frameSizeY === 'undefined') {
            activeVehicle.frameSizeY = activeVehicle.height || 220;
        }
        if (typeof activeVehicle.height === 'undefined') {
            activeVehicle.height = activeVehicle.frameSizeY;
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
            
            // add the 4-quadrant animated SVG overlay for the logic nodes
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
    if (!!nodeKey) {
        addContainer.classList.add('hiddenNodeContainer');
    } else {
        addContainer.classList.add('hiddenFrameContainer');
    }
    addContainer.style.border = 0;
    addContainer.classList.add('ignorePointerEvents'); // don't let invisible background from container intercept touches

    var addIframe = document.createElement('iframe');
    addIframe.id = "iframe" + activeKey;
    addIframe.className = "main";
    addIframe.frameBorder = 0;
    addIframe.style.width = (activeVehicle.width || activeVehicle.frameSizeX) + "px";
    addIframe.style.height = (activeVehicle.height || activeVehicle.frameSizeY) + "px";
    addIframe.style.left = ((globalStates.height - activeVehicle.frameSizeX) / 2) + "px";
    addIframe.style.top = ((globalStates.width - activeVehicle.frameSizeY) / 2) + "px";
    addIframe.classList.add('hiddenFrame');
    addIframe.src = iframeSrc;
    addIframe.setAttribute("data-frame-key", frameKey);
    addIframe.setAttribute("data-object-key", objectKey);
    addIframe.setAttribute("data-node-key", nodeKey);
    addIframe.setAttribute("onload", 'realityEditor.network.onElementLoad("' + objectKey + '","' + frameKey + '","' + nodeKey + '")');
    addIframe.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts");
    addIframe.classList.add('usePointerEvents'); // override parent (addContainer) pointerEvents value

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
    addOverlay.classList.add('usePointerEvents'); // override parent (addContainer) pointerEvents value

    var addSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    addSVG.id = "svg" + activeKey;
    addSVG.className = "mainCanvas";
    addSVG.style.width = "100%";
    addSVG.style.height = "100%";
    addSVG.style.zIndex = "3";
    addSVG.style.pointerEvents = 'auto'; // override parent (addContainer) pointerEvents value
    addSVG.classList.add('usePointerEvents'); // override parent (addContainer) pointerEvents value

    return {
        addContainer: addContainer,
        addIframe: addIframe,
        addOverlay: addOverlay,
        addSVG: addSVG
    };
};

/**
 * Gets the correct iconImage url for the logic node and posts it into the logic node iframe to be displayed.
 * its iconImage property is either 'auto', 'custom', or 'none'
 * @param {Logic} activeVehicle
 */
realityEditor.gui.ar.draw.updateLogicNodeIcon = function(activeVehicle) {
    // add the icon image for the logic nodes
    var logicIconSrc = realityEditor.gui.crafting.getLogicNodeIcon(activeVehicle);
    var nodeDom = globalDOMCache["iframe" + activeVehicle.uuid];
    if (nodeDom) {
        nodeDom.contentWindow.postMessage( JSON.stringify({ iconImage: logicIconSrc }) , "*");
    }
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
            if (!activeVehicle.frames.hasOwnProperty(activeFrameKey)) continue;

            // don't kill inTransitionFrame or its nodes
            if (activeFrameKey === globalStates.inTransitionFrame) continue;
            
            try {
                globalDOMCache["object" + activeFrameKey].parentNode.removeChild(globalDOMCache["object" + activeFrameKey]);
                delete globalDOMCache["object" + activeFrameKey];
                delete globalDOMCache["iframe" + activeFrameKey];
                delete globalDOMCache[activeFrameKey];
                delete globalDOMCache["svg" + activeFrameKey];
                activeVehicle.frames[activeFrameKey].loaded = false;
            } catch (err) {
                this.cout("could not find any frames")
            }


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
                    this.cout("could not find any nodes");
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

realityEditor.gui.ar.draw.pushEditedNodeToFront = function(nodeKey) {
    this.removeFromEditedNodesList(nodeKey);
    globalStates.mostRecentlyEditedNodes.push(nodeKey);
};

realityEditor.gui.ar.draw.pushEditedFrameToFront = function(frameKey) {
    this.removeFromEditedFramesList(frameKey);
    globalStates.mostRecentlyEditedFrames.push(frameKey);
};

realityEditor.gui.ar.draw.removeFromEditedFramesList = function(frameKey) {
    var existingIndex = globalStates.mostRecentlyEditedFrames.indexOf(frameKey);
    if (existingIndex > -1) {
        globalStates.mostRecentlyEditedFrames.splice(existingIndex, 1);
    }
};

realityEditor.gui.ar.draw.removeFromEditedNodesList = function(nodeKey) {
    var existingIndex = globalStates.mostRecentlyEditedNodes.indexOf(nodeKey);
    if (existingIndex > -1) {
        globalStates.mostRecentlyEditedNodes.splice(existingIndex, 1);
    }
};

realityEditor.gui.ar.draw.getFrameRenderPriority = function(frameKey) {
    return {
        index: globalStates.mostRecentlyEditedFrames.indexOf(frameKey),
        length: globalStates.mostRecentlyEditedFrames.length
    }
};

realityEditor.gui.ar.draw.getNodeRenderPriority = function(nodeKey) {
    return {
        index: globalStates.mostRecentlyEditedNodes.indexOf(nodeKey),
        length: globalStates.mostRecentlyEditedNodes.length
    }
};

// simulates drawing... TODO: simplify this and make it only work for frames? or maybe nodes too...

realityEditor.gui.ar.draw.recomputeTransformMatrix = function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCache, globalStates, globalCanvas, activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {

    if (activeVehicle.fullScreen !== true) {

        // recompute activeObjectMatrix for the current object
        var activeObjectMatrixCopy = [];
        if (visibleObjects[objectKey]) {
            this.ar.utilities.multiplyMatrix(visibleObjects[objectKey], globalStates.projectionMatrix, matrix.r);
            this.ar.utilities.multiplyMatrix(rotateX, matrix.r, activeObjectMatrixCopy);
        } else {
            activeObjectMatrixCopy = utilities.copyMatrix(activeObjectMatrix);
        }


        var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);

        var finalOffsetX = positionData.x;
        var finalOffsetY = positionData.y;
        var finalScale = positionData.scale;
        
        // // add node's position to its frame's position to gets its actual offset
        
        if (activeType !== "ui" && activeType !== "logic") {
            var frameKey = activeVehicle.frameId;
            var frame = realityEditor.getFrame(objectKey, frameKey);
            if (frame) {
                var parentFramePositionData = realityEditor.gui.ar.positioning.getPositionData(frame);
                finalOffsetX = finalOffsetX * (parentFramePositionData.scale/globalStates.defaultScale) + parentFramePositionData.x;
                finalOffsetY = finalOffsetY * (parentFramePositionData.scale/globalStates.defaultScale) + parentFramePositionData.y;
                finalScale *= (parentFramePositionData.scale/globalStates.defaultScale);
            }
        }

        matrix.r3 = [
            finalScale, 0, 0, 0,
            0, finalScale, 0, 0,
            0, 0, 1, 0,
            // positionData.x, positionData.y, 0, 1
            finalOffsetX, finalOffsetY, 0, 1
        ];
        
        realityEditor.gui.ar.positioning.getPositionData(activeVehicle);

        var matrixToUse = realityEditor.gui.ar.utilities.copyMatrix(positionData.matrix); // defaults to positionData.matrix for all but a special case of node

        if (typeof matrixToUse !== "undefined" && matrixToUse.length > 0 && typeof matrixToUse[1] !== "undefined") {
            // if (globalStates.unconstrainedPositioning === false) {
            //     //activeVehicle.begin = copyMatrix(multiplyMatrix(activeVehicle.matrix, activeVehicle.temp));
            //     utilities.multiplyMatrix(matrixToUse, activeVehicle.temp, activeVehicle.begin);
            // }
            // utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
            // utilities.multiplyMatrix(matrix.r3, matrix.r, matrix.r2);
            
            var tempBegin = [];
            utilities.multiplyMatrix(matrixToUse, activeVehicle.temp, tempBegin);
            utilities.multiplyMatrix(tempBegin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
        }

        if (typeof matrixToUse !== "undefined") {
            if (matrixToUse.length < 13) {
                utilities.multiplyMatrix(matrix.r3, activeObjectMatrixCopy, finalMatrix);

            } else {
                utilities.multiplyMatrix(matrixToUse, activeObjectMatrixCopy, matrix.r);
                utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
            }
        }

        // var editingVehicle = realityEditor.device.getEditingVehicle();
        // var thisIsBeingEdited = (editingVehicle === activeVehicle);

        // multiply in the animation matrix if you are editing this frame in unconstrained mode.
        // in the future this can be expanded but currently this is the only time it gets animated.
        // if (thisIsBeingEdited && (realityEditor.device.editingState.unconstrained || globalStates.unconstrainedPositioning)) {
        //     var animatedFinalMatrix = [];
        //     utilities.multiplyMatrix(finalMatrix, editingAnimationsMatrix, animatedFinalMatrix);
        //     finalMatrix = utilities.copyMatrix(animatedFinalMatrix);
        // }

        // we want nodes closer to camera to have higher z-coordinate, so that they are rendered in front
        // but we want all of them to have a positive value so they are rendered in front of background canvas
        // and frames with developer=false should have the lowest positive value
        
        // if (finalMatrix[14] < 10) {
        //     finalMatrix[14] = 10;
        // }
        // finalMatrix[14] = 200 + 100000 / finalMatrix[14]; // TODO: does this mess anything up? it should fix the z-order problems
        //
        // //move non-developer frames to the back so they don't steal touches from interactable frames
        // if (activeVehicle.developer === false) {
        //     finalMatrix[14] = 100;
        // }

        activeVehicle.mostRecentFinalMatrix = finalMatrix;

        // draw transformed
        // globalDOMCache["object" + activeKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';

        // return 'matrix3d(' + finalMatrix.toString() + ')';

        return finalMatrix;

    }
};
