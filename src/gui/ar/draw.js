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
    size: 0,
    x: 0,
    y: 0,
    rectPoints: [],
    farFrontElement: "",
    frontDepth: 1000000
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
    ],
    matrixtouchOn: false,
    copyStillFromMatrixSwitch: false
};
realityEditor.gui.ar.draw.objectKey = "";
realityEditor.gui.ar.draw.frameKey = "";
realityEditor.gui.ar.draw.nodeKey = "";
realityEditor.gui.ar.draw.activeKey = "";
realityEditor.gui.ar.draw.type = "";
realityEditor.gui.ar.draw.notLoading = "";
realityEditor.gui.ar.draw.utilities = realityEditor.gui.ar.utilities;

realityEditor.gui.ar.draw.update = function (visibleObjects) {
    
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
            
            for (var frameKey in objects[objectKey].frames) {
                this.activeFrame = realityEditor.getFrame(objectKey, frameKey);
                if (!this.activeFrame.hasOwnProperty('visualization')) { // TODO: temp fix
                    this.activeFrame.visualization = "ar";
                }
                if (this.activeFrame.visualization !== "ar") {
                    continue;
                }
                if (!this.activeFrame || (this.activeFrame.name === this.activeObject.name)) {
                    // console.log("break from frame: ",objectKey, frameKey);
                    continue;
                }
                // making sure that the node is always the object to draw
                this.activeKey = frameKey;
                this.activeVehicle = this.activeFrame;
                this.activeType = "ui";

                if (this.globalStates.guiState === "ui" || Object.keys(this.activeFrame.nodes).length === 0) {
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

                // TODO: maybe add some tolerance for shaky recognition so it doesnt immediately take it if the marker just flickers
                // disassociate a screen<->AR frame from the object if it is being moved in unconstrained editing
                var preserveFrameGlobally = (globalStates.editingMode &&
                    globalStates.unconstrainedPositioning &&
                    globalStates.editingModeObject === this.activeObject.uuid &&
                    globalStates.editingModeFrame === frameKey &&
                    !!this.activeFrame.type);
                
                if (preserveFrameGlobally) {
                    
                    realityEditor.gui.ar.draw.moveFrameToGlobalSpace(objectKey, frameKey, this.activeFrame);
                    
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
                    this.killObjects(frameKey, this.activeFrame, this.globalDOMCache);
                    
                }
                
            }
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
        this.nodeCalculations.farFrontElement = "";
        this.nodeCalculations.farFrontFrame = "";
        this.nodeCalculations.frontDepth = 10000000000;

        // TODO: implement smarter way to find front
        for (var thisOtherKey in this.visibleObjects) {
            if (this.visibleObjects[thisOtherKey][14] < this.nodeCalculations.frontDepth) {
                this.nodeCalculations.frontDepth = this.visibleObjects[thisOtherKey][14];
                this.nodeCalculations.farFrontElement = thisOtherKey;
                this.nodeCalculations.farFrontFrame = getFarFrontFrame(thisOtherKey);
            }
        }

        if (this.visibleObjects.hasOwnProperty(this.nodeCalculations.farFrontElement)) {

            this.ar.utilities.multiplyMatrix(this.visibleObjects[this.nodeCalculations.farFrontElement], globalStates.projectionMatrix, this.matrix.r);
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
    
    /* // TODO: any updates to global frames should happen here
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

/**
 * Removes a frame from its associated object and places it instead in the globalFrames object.
 * Updates the DOM elements and data for the frame so that they stay present even if the original object disappears.
 * @param objectKey - uuid of the object the frame is attached to
 * @param frameKey - uuid of the frame
 * @param frame - reference to the frame itself
 */
realityEditor.gui.ar.draw.moveFrameToGlobalSpace = function(objectKey, frameKey, frame) {

    // either make a clone of the data and the DOM and let the old version be killed
    // or preserve just the data and clone the DOM
    // or preserve just the DOM and clone the data
    // or preserve the DOM and the data but change some properties

    // seems best to keep the DOM because it's already loaded in the right place and has the touch listeners
    // if we keep the frame data object, we still need to remove it from the object and store it somewhere globally instead

    var newFrameKey = globalFramePrefix + frame.type + realityEditor.device.utilities.uuidTime(); // TODO: maybe use old UUID instead of generating another

    // temporarily disable links on server? maybe not... but may need to change their ids to find global...
    // ... no, just don't change the state of the frame on the server until it gets dropped somewhere,
    // then update everything at once then with the new state
    // frame.location = 'global'; // TODO: is this the purpose of local vs global?
    frame.name = newFrameKey;

    // rename nodes to fit the nested naming conventions for the new frame key  //TODO: update link location naming the same way?... or it might not matter for now... i'll see whether any bugs pop up if a global frame has links to it while being moved...
    var newNodes = {};
    for (var nodeKey in frame.nodes) {
        if (!frame.nodes.hasOwnProperty(nodeKey)) continue;
        var node = frame.nodes[nodeKey];
        node.uuid = newFrameKey + node.name;
        newNodes[node.uuid] = node;
        delete frame.nodes[nodeKey];
    }
    frame.nodes = newNodes;

    frame.objectId = null;

    frame.objectVisible = true; // maybe good to do? not sure what the implications are

    frame.uuid = newFrameKey;

    // store a reference to where this frame came from, and the transform of that object, so that it
    // can be placed correctly in another object space
    frame.sourceObject = objectKey;
    var screenFrameKey = objectKey + 'screen';
    var sourceScreenFrame = realityEditor.getFrame(objectKey, screenFrameKey);
    if (sourceScreenFrame) {
        frame.sourceObjectMatrix = realityEditor.gui.ar.utilities.copyMatrix(sourceScreenFrame.mostRecentFinalMatrix);
        // frame.sourceObjectMatrix = sourceScreenFrame.mostRecentFinalMatrix;
    }

    // add the frame to the globalFrames
    globalFrames[newFrameKey] = frame;

    // remove the frame from its originating object
    delete objects[objectKey].frames[frameKey];

    // update the DOM elements for the frame with new ids
    this.updateFrameElements(frameKey, newFrameKey);

    globalStates.editingModeObject = globalFramePrefix;
    globalStates.editingModeFrame = newFrameKey;
    globalStates.editingFrame = newFrameKey;

    return newFrameKey;
};

// TODO: a lot of this violates DRY with the moveFrameToGlobalSpace function ... find a way to generalize and combine them
/**
 * Takes a frame from the globalFrames and moves it to the frames property of the specified object.
 * Updates the DOM elements and data of the frame to be attached to the new object rather than the global namespace.
 * @param objectKey - uuid of the object that the frame should be moved to
 * @param frameKey - the frame's key within globalFrames
 * @param frame - a reference to the global frame itself
 */
realityEditor.gui.ar.draw.moveFrameToObjectSpace = function(objectKey, frameKey, frame) {
    
    console.log(objectKey, frameKey, frame);
    
    // TODO: we need to store the frame's old objectKey and frameKey so that we can update the server to re-point links here when it gets dropped onto a new object
    // TODO: how will we update other servers (different IPs) to know when this node changes its address?)
    // TODO: should our server store a forwarding table that reroutes incoming packets for nodes flagged as moved?
    
    var newFrameKey = objectKey + frame.type + realityEditor.device.utilities.uuidTime(); // maybe generate this a different way, but should work for now

    // frame.location = 'global'; // TODO: is this the purpose of local vs global?
    frame.name = newFrameKey;

    // rename nodes to fit the nested naming conventions for the new frame key  //TODO: update link location naming the same way?... or it might not matter for now... i'll see whether any bugs pop up if a global frame has links to it while being moved...
    var newNodes = {};
    for (var nodeKey in frame.nodes) {
        if (!frame.nodes.hasOwnProperty(nodeKey)) continue;
        var node = frame.nodes[nodeKey];
        node.uuid = newFrameKey + node.name;
        newNodes[node.uuid] = node;
        delete frame.nodes[nodeKey];
    }
    frame.nodes = newNodes;

    frame.objectId = objectKey;

    frame.objectVisible = true; // maybe good to do? not sure what the implications are

    frame.uuid = newFrameKey;
    
    // TODO: calculate relative transformation between old object and new object
    if (frame.sourceObject && frame.sourceObjectMatrix && objectKey !== frame.sourceObject) {
        var newScreenFrame = realityEditor.getFrame(objectKey, objectKey + 'screen');
        if (newScreenFrame && newScreenFrame.mostRecentFinalMatrix) {
            // var newObjectMatrix = newScreenFrame.mostRecentFinalMatrix;
            // console.log(frame.sourceObjectMatrix, newObjectMatrix, frame.matrix);

            // if (globalStates.unconstrainedPositioning === true) {
            //     utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), positionData.matrix);
            // }

            var tempMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
            realityEditor.gui.ar.utilities.multiplyMatrix(frame.begin, realityEditor.gui.ar.utilities.invertMatrix(newScreenFrame.mostRecentFinalMatrix), tempMatrix);
            // realityEditor.gui.ar.utilities.multiplyMatrix(newScreenFrame.mostRecentFinalMatrix, realityEditor.gui.ar.utilities.invertMatrix(frame.begin), tempMatrix);
            frame.ar.matrix = realityEditor.gui.ar.utilities.copyMatrix(tempMatrix);
        }
    }
    
    delete frame.sourceObject;
    delete frame.sourceObjectMatrix;

    // add the frame to the new object
    objects[objectKey].frames[newFrameKey] = frame;

    // remove the frame from globalFrames
    delete globalFrames[frameKey];

    // update the DOM elements for the frame with new ids
    this.updateFrameElements(frameKey, newFrameKey);

    globalStates.editingModeObject = objectKey;
    globalStates.editingModeFrame = newFrameKey;
    globalStates.editingFrame = newFrameKey;

    // TODO: update server state all at once then with the new state when this finishes
    
    return newFrameKey;
};

/**
 * Updates the DOM elements for this frame with new id and dataset, including updating the globalDOMCache
 * @param frameKey - old uuid
 * @param newFrameKey - new uuid
 */
realityEditor.gui.ar.draw.updateFrameElements = function(frameKey, newFrameKey) {
    // re-assign ids to DOM elements
    globalDOMCache['object' + frameKey].id = 'object' + newFrameKey;
    globalDOMCache['iframe' + frameKey].id = 'iframe' + newFrameKey;
    globalDOMCache[frameKey].id = newFrameKey;
    globalDOMCache['canvas' + frameKey].id = 'canvas' + newFrameKey;

    // iframe also has a dataset of ids
    globalDOMCache['iframe' + frameKey].dataset = {
        frameKey: newFrameKey,
        nodeKey: "null",
        objectKey: "null"
    };

    // update their keys in the globalDOMCache 
    globalDOMCache['object' + newFrameKey] = globalDOMCache['object' + frameKey];
    globalDOMCache['iframe' + newFrameKey] = globalDOMCache['iframe' + frameKey];
    globalDOMCache[newFrameKey] = globalDOMCache[frameKey];
    globalDOMCache['canvas' + newFrameKey] = globalDOMCache['canvas' + frameKey];
    delete globalDOMCache['object' + frameKey];
    delete globalDOMCache['iframe' + frameKey];
    delete globalDOMCache[frameKey];
    delete globalDOMCache['canvas' + frameKey];
}

/**
 * @desc
 * @return {Boolean} whether to continue the update loop (defaults true, return false if you remove the activeVehicle during this loop)
 **/

realityEditor.gui.ar.draw.drawTransformed = function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCache, globalStates, globalCanvas, activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {
    //console.log(JSON.stringify(activeObjectMatrix));
    if (notLoading !== activeKey && activeVehicle.loaded === true) {
        if (!activeVehicle.visible) {
            activeVehicle.visible = true;
            
            var container = globalDOMCache["object" + activeKey];
            var iFrame = globalDOMCache["iframe" + activeKey];
            var overlay = globalDOMCache[activeKey];
            var canvas = globalDOMCache["canvas" + activeKey]
            
            container.style.display = 'inline';
            iFrame.style.visibility = 'visible';
            iFrame.contentWindow.postMessage(

                JSON.stringify(
                    {
                        visibility: "visible",
                        interface: globalStates.interface,
                        search: realityEditor.gui.search.getSearch()
                    }), '*');

            if (activeType === "node") {
                activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
                overlay.style.visibility = 'visible';
                if (globalStates.editingMode) {
                    canvas.style.display = 'inline';
                } else {
                    canvas.style.display = 'none';
                }
                
            } else if (activeType === "ui") {
                if (globalStates.editingMode) {
                    if (!activeVehicle.visibleEditing && activeVehicle.developer) {
                        activeVehicle.visibleEditing = true;
                        overlay.style.visibility = 'visible';
                        canvas.style.display = 'inline';
                        activeVehicle.hasCTXContent = false;
                    }
                } else {
                    canvas.style.display = 'none';

                }
            }


            else if (activeType === "logic") {
                activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
                overlay.style.visibility = 'visible';
                if (globalStates.editingMode) {
                    canvas.style.display = 'inline';
                } else {
                    canvas.style.display = 'none';

                }
            }

            /*
             else if (activeType === "logic") {


             activeVehicle.temp = copyMatrix(activeObjectMatrix);

             if (globalStates.editingMode) {
             if (!activeVehicle.visibleEditing && activeVehicle.developer) {
             activeVehicle.visibleEditing = true;
             globalDOMCache[activeKey].style.visibility = 'visible';
             // showEditingStripes(activeKey, true);
             globalDOMCache["canvas" + activeKey].style.display = 'inline';

             //document.getElementById(activeKey).className = "mainProgram";
             }
             } else {
             globalDOMCache["canvas" + activeKey].style.display = 'none';
             }
             }*/

            if (activeType === "logic" && objectKey !== "pocket") {
                if(activeVehicle.animationScale === 1) {
                    globalDOMCache["logic" + nodeKey].className = "mainEditing scaleOut";
                    thisObject.animationScale = 0;
                }
            }

        }
        if (activeVehicle.visible) {
            // this needs a better solution

            if (activeVehicle.fullScreen !== true) {
                
                var positionData = activeVehicle;
                if (activeType === "ui") {
                    positionData = (activeVehicle.visualization === "ar") ? (activeVehicle.ar) : (activeVehicle.screen);
                }
                
                var finalOffsetX = positionData.x;
                var finalOffsetY = positionData.y;

                // add node's position to its frame's position to gets its actual offset
                if (activeType === "node" || activeType === "logic") {
                    var nodeName = activeVehicle.name;
                    var frameKey = activeKey.slice(0, -1 * nodeName.length);
                    var frame = realityEditor.getFrame(objectKey, frameKey);
                    if (frame) {
                        var parentFramePositionData = (frame.visualization === "ar") ? (frame.ar) : (frame.screen);
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

                if (globalStates.editingMode || globalStates.editingNode === activeKey) {

                    // todo test if this can be made touch related
                    if (activeType === "logic") {
                        activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
                    }

                    if (matrix.matrixtouchOn === activeKey) {
                        //if(globalStates.unconstrainedPositioning===true)
                        activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);

                        //  console.log(activeVehicle.temp);
                   
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

                            if (globalStates.unconstrainedPositioning === true) {
                                utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), positionData.matrix);
                            }

                            matrix.copyStillFromMatrixSwitch = false;
                            
                        } else if (globalStates.unconstrainedPositioning === true) {
                            realityEditor.gui.ar.utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), positionData.matrix);
                        }

                        if (globalStates.unconstrainedPositioning && matrix.copyStillFromMatrixSwitch) {
                            activeObjectMatrix = matrix.visual;
                        }

                    }

                    var isFullyBehindPlane = false;

                    if (typeof positionData.matrix[1] !== "undefined") {
                        if (positionData.matrix.length > 0) {
                            if (globalStates.unconstrainedPositioning === false) {
                                //activeVehicle.begin = copyMatrix(multiplyMatrix(activeVehicle.matrix, activeVehicle.temp));
                                utilities.multiplyMatrix(positionData.matrix, activeVehicle.temp, activeVehicle.begin);
                            }
                            
                            utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
                            utilities.multiplyMatrix(matrix.r3, matrix.r, matrix.r2);
                            isFullyBehindPlane = utilities.estimateIntersection(activeKey, matrix.r2, activeVehicle);
                        } else {
                            isFullyBehindPlane = utilities.estimateIntersection(activeKey, null, activeVehicle);
                        }

                    } else {

                        isFullyBehindPlane = utilities.estimateIntersection(activeKey, null, activeVehicle);
                    }
                    
                    // for frames that can transfer between AR and screen space, send this to a screen if it goes behind the marker plane
                    if (isFullyBehindPlane) {
                        
                        // having "activeVehicle.type" property this means it is a "local" frame (it can be sent to screen)
                        if (globalStates.editingModeObject && globalStates.editingModeFrame && activeVehicle.type) {
                            console.log('~~ !!!!! send to screen !!!!! ~~');

                            this.killObjects(activeKey, activeVehicle, globalDOMCache);
                            
                            var pointerPosition = window.getComputedStyle(document.getElementById('overlay'));
                            var transformMatrix = pointerPosition.transform.split(',');
                            var xPos = parseInt(transformMatrix[12]);
                            var yPos = parseInt(transformMatrix[13]);
                            var screenFrameKey = objectKey + 'screen';
                            var screenFrame = realityEditor.getFrame(objectKey, screenFrameKey);
                            
                            var unrotatedResult = realityEditor.gui.ar.utilities.newIdentityMatrix();
                            realityEditor.gui.ar.utilities.multiplyMatrix(realityEditor.gui.ar.draw.visibleObjects[objectKey], globalStates.projectionMatrix, unrotatedResult);
                            if (!screenFrame.begin) {
                                screenFrame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
                            }
                            realityEditor.gui.ar.utilities.multiplyMatrix(rotateX, unrotatedResult, screenFrame.begin);
                            
                            var cursorMatrixXY = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY(screenFrame, [xPos, yPos]);
                            
                            console.log(cursorMatrixXY);
                            
                            var positionData = {
                                x: cursorMatrixXY[0],
                                y: cursorMatrixXY[1]
                            };

                            realityEditor.network.sendFrameToScreen(objects[globalStates.editingModeObject].ip, globalStates.editingModeObject, globalStates.editingModeFrame, positionData);
                            realityEditor.network.deleteFrameFromObject(objects[globalStates.editingModeObject].ip, globalStates.editingModeObject, globalStates.editingModeFrame);

                            delete objects[globalStates.editingModeObject].frames[globalStates.editingModeFrame];

                            globalStates.editingModeFrame = null;
                            globalStates.editingModeObject = null;
                            globalStates.editingFrame = null;
                            globalStates.editingModeHaveObject = false;
                            
                            return false;
                        }
                        
                        // if (globalStates.editingModeObject && globalStates.editingModeFrame) {
                        //     var frame = 
                        //     objects[globalStates.editingModeObject].frames[globalStates.editingModeFrame].type

                        // }

                    }
                }

                if (positionData.matrix.length < 13) {
                    utilities.multiplyMatrix(matrix.r3, activeObjectMatrix, finalMatrix);
                    
                } else {
                    utilities.multiplyMatrix(positionData.matrix, activeObjectMatrix, matrix.r);
                    utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
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
                globalDOMCache["object" + activeKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';

                // this is for later
                // The matrix has been changed from Vuforia 3 to 4 and 5. Instead of  finalMatrix[3][2] it is now finalMatrix[3][3]
                activeVehicle.screenX = finalMatrix[12] / finalMatrix[15] + (globalStates.height / 2);
                activeVehicle.screenY = finalMatrix[13] / finalMatrix[15] + (globalStates.width / 2);
                activeVehicle.screenZ = finalMatrix[14];

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

                    var size = (activeVehicle.screenLinearZ * 40) * activeVehicle.scale;
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

        globalDOMCache[activeKey].style.visibility = 'hidden';
        globalDOMCache["canvas" + activeKey].style.display = 'none';

        cout("hideTransformed");
    }
};

/**
 * @desc
 * @return
 **/

realityEditor.gui.ar.draw.addElement = function(thisUrl, objectKey, frameKey, nodeKey, activeType, activeVehicle) {

    var activeKey = (!!nodeKey) ? nodeKey : frameKey;
    
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
            activeVehicle.begin = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ];
        }

        if (typeof activeVehicle.temp !== "object") {
            activeVehicle.temp = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ];
        }
        
        // Create DOM elements for everything associated with this frame/node
        
        var isUsingLocalFrame = false;
        if (activeKey === frameKey && activeVehicle.type) {
            // console.log('change url to ../frames/' + activeVehicle.type + '/index.html');
            thisUrl = '../../../frames/' + activeVehicle.type + '/index.html';
            isUsingLocalFrame = true;
        }

        var domElements = this.createSubElements(thisUrl, objectKey, frameKey, nodeKey, activeVehicle);
        var addContainer = domElements.addContainer;
        var addIframe = domElements.addIframe;
        var addOverlay = domElements.addOverlay;
        var addCanvas = domElements.addCanvas;

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

        // TODO: reimplement widget frames (uncomment frame.js)
        // // If this is a frame, add a cover object for touch event synthesizing
        // if (activeVehicle.src) {
        //     var cover = document.createElement('div');
        //     cover.classList.add('main');
        //     cover.style.visibility = 'visible';
        //     cover.style.width = addIframe.style.width;
        //     cover.style.height = addIframe.style.height;
        //     cover.style.top = addIframe.style.top;
        //     cover.style.left = addIframe.style.left;
        //     activeVehicle.frameTouchSynthesizer = new realityEditor.gui.frame.FrameTouchSynthesizer(cover, addIframe);
        //     addContainer.appendChild(cover);
        // }
        
        addContainer.appendChild(addOverlay);
        addOverlay.appendChild(addCanvas);

        globalDOMCache[addContainer.id] = addContainer;
        globalDOMCache[addIframe.id] = addIframe;
        globalDOMCache[addOverlay.id] = addOverlay;
        globalDOMCache[addCanvas.id] = addCanvas;
        
        // Add touch event listeners
        
        realityEditor.device.addTouchListenersForElement(addOverlay, activeVehicle);

        if (activeType === "node") {
            addOverlay.style.visibility = "visible";
        } else if (activeType === "logic") {
            addOverlay.style.visibility = "visible";
            // addContainer.style.display = 'block';
            // addIframe.style.visibility = 'visible';
        } else {
            addOverlay.style.visibility = "hidden";
        }

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
    addIframe.dataset.nodeKey = nodeKey;
    addIframe.dataset.frameKey = frameKey;
    addIframe.dataset.objectKey = objectKey;
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
    if (activeVehicle.developer) {
        addOverlay.style["touch-action"] = "none";
    }

    var addCanvas = document.createElement('canvas');
    addCanvas.id = "canvas" + activeKey;
    addCanvas.className = "mainCanvas";
    addCanvas.style.width = "100%";
    addCanvas.style.height = "100%";
    
    return {
        addContainer: addContainer,
        addIframe: addIframe,
        addOverlay: addOverlay,
        addCanvas: addCanvas
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

    if (activeVehicle.visibleCounter > 0) {
        activeVehicle.visibleCounter--;
    } else if (activeVehicle.loaded) {
        activeVehicle.loaded = false;

        globalDOMCache["object" + activeKey].parentNode.removeChild(globalDOMCache["object" + activeKey]);
        delete globalDOMCache["object" + activeKey];
        delete globalDOMCache["iframe" + activeKey];
        delete globalDOMCache[activeKey];
        delete globalDOMCache["canvas" + activeKey];
        delete globalDOMCache[activeKey];

        for (activeKey in activeVehicle.nodes) {
            if (!activeVehicle.nodes.hasOwnProperty(activeKey)) continue;
            try {
                globalDOMCache["object" + activeKey].parentNode.removeChild(globalDOMCache["object" + activeKey]);
                delete globalDOMCache["object" + activeKey];
                delete globalDOMCache["iframe" + activeKey];
                delete globalDOMCache[activeKey];
                delete globalDOMCache["canvas" + activeKey];

            } catch (err) {
                this.cout("could not find any");
            }
            activeVehicle.nodes[activeKey].loaded = false;
        }
        this.cout("killObjects");
    }
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
    delete this.globalDOMCache["canvas" + nodeId];

};

realityEditor.gui.ar.draw.deleteFrame = function (objectId, frameId) {

    delete objects[objectId].frames[frameId];
    this.globalDOMCache["object" + frameId].parentNode.removeChild(this.globalDOMCache["object" + frameId]);
    delete this.globalDOMCache["object" + frameId];
    delete this.globalDOMCache["iframe" + frameId];
    delete this.globalDOMCache[frameId];
    delete this.globalDOMCache["canvas" + frameId];

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

realityEditor.gui.ar.draw.simulateDraw = function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCache, globalStates, globalCanvas, activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {

    if (activeVehicle.fullScreen !== true) {

        var positionData = activeVehicle;
        if (activeType === "ui") {
            positionData = (activeVehicle.visualization === "ar") ? (activeVehicle.ar) : (activeVehicle.screen);
        }

        var finalOffsetX = positionData.x;
        var finalOffsetY = positionData.y;

        // add node's position to its frame's position to gets its actual offset
        if (activeType === "node" || activeType === "logic") {
            var nodeName = activeVehicle.name;
            var frameKey = activeKey.slice(0, -1 * nodeName.length);
            var frame = realityEditor.getFrame(objectKey, frameKey);
            if (frame) {
                var parentFramePositionData = (frame.visualization === "ar") ? (frame.ar) : (frame.screen);
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
                if (typeof positionData.matrix === "object") {
                    if (positionData.matrix.length > 0) {
                        utilities.multiplyMatrix(positionData.matrix, activeVehicle.temp, activeVehicle.begin);
                    } else {
                        activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);
                    }
                } else {
                    activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);
                }

                if (globalStates.unconstrainedPositioning === true) {
                    utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), positionData.matrix);
                }

                matrix.copyStillFromMatrixSwitch = false;

            } else if (globalStates.unconstrainedPositioning === true) {
                realityEditor.gui.ar.utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), positionData.matrix);
            }

            if (globalStates.unconstrainedPositioning && matrix.copyStillFromMatrixSwitch) {
                activeObjectMatrix = matrix.visual;
            }

        }
        
        if (typeof positionData.matrix[1] !== "undefined") {
            if (positionData.matrix.length > 0) {
                if (globalStates.unconstrainedPositioning === false) {
                    //activeVehicle.begin = copyMatrix(multiplyMatrix(activeVehicle.matrix, activeVehicle.temp));
                    utilities.multiplyMatrix(positionData.matrix, activeVehicle.temp, activeVehicle.begin);
                }

                utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), matrix.r);
                utilities.multiplyMatrix(matrix.r3, matrix.r, matrix.r2);
                utilities.estimateIntersection(activeKey, matrix.r2, activeVehicle);
            } else {
                utilities.estimateIntersection(activeKey, null, activeVehicle);
            }

        } else {
            utilities.estimateIntersection(activeKey, null, activeVehicle);
        }

        if (positionData.matrix.length < 13) {
            utilities.multiplyMatrix(matrix.r3, activeObjectMatrix, finalMatrix);

        } else {
            utilities.multiplyMatrix(positionData.matrix, activeObjectMatrix, matrix.r);
            utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);
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
        
        return 'matrix3d(' + finalMatrix.toString() + ')';

    }
};
