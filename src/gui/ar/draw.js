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



nodeCounter = 0;

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
realityEditor.gui.ar.draw.globalDOMCach = globalDOMCach;
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

    for (this.objectKey in objects) {
        this.activeObject = realityEditor.getObject(this.objectKey);
        if (!this.activeObject) { continue; }
        if (this.visibleObjects.hasOwnProperty(this.objectKey)) {

            this.activeObject.visibleCounter = timeForContentLoaded;
            this.activeObject.objectVisible = true;

            // this.activeObjectMatrix = multiplyMatrix(rotateX, multiplyMatrix(this.visibleObjects[this.objectKey], globalStates.projectionMatrix));
            this.activeObjectMatrix = [];
            this.ar.utilities.multiplyMatrix(this.visibleObjects[this.objectKey], this.globalStates.projectionMatrix, this.matrix.r);
            this.ar.utilities.multiplyMatrix(this.rotateX, this.matrix.r, this.activeObjectMatrix);
            //  this.activeObjectMatrix2 = multiplyMatrix(this.visibleObjects[this.objectKey], globalStates.projectionMatrix);
            //   document.getElementById("controls").innerHTML = (toAxisAngle(this.activeObjectMatrix2)[0]).toFixed(1)+" "+(toAxisAngle(this.activeObjectMatrix2)[1]).toFixed(1);

            for (this.frameKey in objects[this.objectKey].frames) {
                this.activeFrame = realityEditor.getFrame(this.objectKey, this.frameKey);
                if (!this.activeFrame)  {
                    console.log("break from frame: ",this.objectKey, this.frameKey);
                    continue;   }
                // making sure that the node is always the object to draw
                this.activeKey = this.frameKey;
                this.activeVehicle = this.activeFrame;
                this.activeType = "ui";

                if (this.globalStates.guiState === "ui" || Object.keys(this.activeFrame.nodes).length === 0) {
                    this.drawTransformed(this.visibleObjects, this.objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,
                        this.globalDOMCach, this.globalStates, this.globalCanvas,
                        this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                        this.nodeCalculations, this.cout);
                    
                    this.addElement("http://" + this.activeObject.ip + ":" + httpPort + "/obj/" + this.activeObject.name + "/frames/" + this.activeFrame.name + "/",
                        this.activeKey, this.objectKey, this.frameKey, this.activeType, this.notLoading, this.activeVehicle, this.globalStates, this.globalDOMCach);
                }
                else {
                  
                    this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCach, this.cout);
                }

                for (this.nodeKey in this.activeFrame.nodes) {
                    // if (!this.activeObject.nodes.hasOwnProperty(this.nodeKey)) { continue; }
                    if (globalStates.guiState === "node" || globalStates.guiState === "logic") {
                        this.activeNode = realityEditor.getNode(this.objectKey, this.frameKey, this.nodeKey);
                        this.activeKey = this.nodeKey;
                        this.activeVehicle = this.activeNode;
                        this.activeType = this.activeNode.type;

                        this.drawTransformed(this.visibleObjects, this.objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,
                            this.globalDOMCach, this.globalStates, this.globalCanvas,
                            this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                            this.nodeCalculations, this.cout);
                        
                        this.addElement("nodes/" + this.activeType + "/index.html",
                            this.activeKey, this.objectKey, this.frameKey, this.activeType, this.notLoading, this.activeVehicle, this.globalStates, this.globalDOMCach);

                    } else {
                        this.activeNode = realityEditor.getNode(this.objectKey, this.frameKey, this.nodeKey);
                        this.activeKey = this.nodeKey;
                        this.activeVehicle = this.activeNode;
                      //  this.activeType = this.activeNode.type;
                      
                        this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCach, this.cout);
                    }
                }

                /*
                for (this.nodeKey in this.activeObject.frames) {
                    this.activeNode = this.activeObject.frames[this.nodeKey];
                    if (globalStates.guiState === "ui") {
                          this.drawTransformed(this.visibleObjects, this.objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,
                        this.globalDOMCach, this.globalStates, this.globalCanvas,
                        this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                        this.nodeCalculations, this.cout, this.webkitTransformMatrix3d);
                        
                        var keyedSrc = this.activeNode.src;
                        if (keyedSrc.indexOf('?') >= 0) {
                            keyedSrc += '&';
                        } else {
                            keyedSrc += '?';
                        }
                        keyedSrc += 'nodeKey=' + this.nodeKey;
                        this.addElement(keyedSrc,
                        this.activeKey, this.objectKey, this.frameKey, this.activeType, this.notLoading, this.activeVehicle, this.globalStates, this.globalDOMCach);
                    } else {
                        this.hideTransformed(this.objectKey, this.nodeKey, this.activeNode, "ui");
                    }
                }
                */
            }
        }
        else {
            this.activeObject.objectVisible = false;

            for (this.frameKey in objects[this.objectKey].frames) {
                this.activeFrame = realityEditor.getFrame(this.objectKey, this.frameKey);
                if (!this.activeFrame) {
                    console.log("break from frame: ", this.objectKey, this.frameKey);
                    continue;
                }
                // making sure that the node is always the object to draw
                this.activeKey = this.frameKey;
                this.activeVehicle = this.activeFrame;
                this.activeType = "ui";
            
                this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCach, this.cout);

                for (this.nodeKey in this.activeFrame.nodes) {
                    this.activeNode = realityEditor.getNode(this.objectKey, this.frameKey, this.nodeKey);
                    this.activeKey = this.nodeKey;
                    this.activeVehicle = this.activeNode;
                    this.activeType = this.activeNode.type;
                    // if (!this.activeObject.nodes.hasOwnProperty(nodeKey)) {  continue;  }
                  
                    this.hideTransformed(this.activeKey, this.activeVehicle, this.globalDOMCach, this.cout);
                }

                /*
                for (this.nodeKey in this.activeObject.frames) {
                    this.activeNode = realityEditor.getNode(this.objectKey, this.frameKey, this.frameKey);
                    this.activeKey = this.nodeKey;
                    this.activeVehicle = this.activeNode;
                    this.activeType = this.activeNode.type;
                    
                    this.hideTransformed(this.objectKey, this.nodeKey, this.activeObject.frames[this.nodeKey], "ui");
                }
                */

                this.killObjects(this.activeKey, this.activeVehicle, this.globalDOMCach);
            }
        }

    }

    // draw all lines
    if ((globalStates.guiState === "node" || globalStates.guiState === "logic") && !globalStates.editingMode) {
        for (this.objectKey in objects) {
            this.ar.lines.drawAllLines(realityEditor.getFrame(this.objectKey, this.frameKey), this.globalCanvas.context);
        }
        this.ar.lines.drawInteractionLines();
        //  cout("drawlines");
        
        if (globalStates.speechState) {

            nodeCounter++;
            if (nodeCounter > 20) {

                var closest = realityEditor.device.speechProcessor.getClosestObjectNodePair(); //realityEditor.device.speech.getClosestObjectNodePair(); //getClosestNode();

                if (!closest) return;

                Object.keys(objects).forEach( function(objectKey) {
                    if (!objects.hasOwnProperty(objectKey)) return;

                    Object.keys(objects[objectKey].nodes).forEach( function(nodeKey) {
                        if (!objects[objectKey].nodes.hasOwnProperty(nodeKey)) return;

                        var nodeDom = document.getElementById('thisObject' + nodeKey);
                        if (nodeDom && nodeDom.style.opacity !== 1.0) {
                            nodeDom.style.opacity = 1.0; //1.0;
                        }
                    });

                });

                // console.log("closest", closest);
                var closestNodeDom = document.getElementById('thisObject' + closest.nodeKey);
                if (closestNodeDom && closestNodeDom.style.opacity !== 0.33) {
                    closestNodeDom.style.opacity = 0.33; // opacity = 0.33;
                }

                nodeCounter = 0;
            }

        }
        
    }

    // todo this is a test for the pocket

    // todo finishing up this
/*
    if (pocketItem.pocket.nodes[pocketItemId]) {
        this.activeObject = pocketItem["pocket"];
        // if(  globalStates.pointerPosition[0]>0)
        //console.log(this.activeObject);
        this.activeObject.visibleCounter = timeForContentLoaded;
        this.activeObject.objectVisible = true;

        this.objectKey = "pocket";
        this.frameKey = "pocket";

        this.activeObjectMatrix = [];

        this.nodeCalculations.farFrontElement = "";
        this.nodeCalculations.frontDepth = 10000000000;

        // todo this needs heavy work
        for (var thisOtherKey in this.visibleObjects) {
            if (this.visibleObjects[thisOtherKey][14] < this.nodeCalculations.frontDepth) {
                this.nodeCalculations.frontDepth = this.visibleObjects[thisOtherKey][14];
                this.nodeCalculations.farFrontElement = thisOtherKey;
            }
        }

        if (this.nodeCalculations.farFrontElement in this.visibleObjects) {
            // console.log(this.nodeCalculations.farFrontElement);

            var r = this.matrix.r;
            this.ar.utilities.multiplyMatrix(this.visibleObjects[this.nodeCalculations.farFrontElement], globalStates.projectionMatrix, r);
            this.ar.utilities.multiplyMatrix(rotateX, r, this.activeObjectMatrix);

        } else {

            this.activeObjectMatrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]
        }

        for (this.nodeKey in this.activeObject.nodes) {
            //console.log(document.getElementById("iframe"+ this.nodeKey));
            this.activeNode = this.activeObject.nodes[this.nodeKey];

            if ((globalStates.guiState === "node" || globalStates.guiState === "logic") && this.activeType === "logic") {
                this.activeKey = this.nodeKey;
                this.activeVehicle = this.activeNode;
                this.activeType = this.activeNode.type;

                t    this.drawTransformed(this.visibleObjects, this.objectKey, this.activeKey, this.activeType, this.activeVehicle, this.notLoading,
                        this.globalDOMCach, this.globalStates, this.globalCanvas,
                        this.activeObjectMatrix, this.matrix, this.finalMatrix, this.utilities,
                        this.nodeCalculations, this.cout, this.webkitTransformMatrix3d);

                this.addElement("nodes/" + this.activeType + "/index.html",
                        this.activeKey, this.objectKey, this.frameKey, this.activeType, this.notLoading, this.activeVehicle, this.globalStates, this.globalDOMCach);

                // } else {
                // hideTransformed("pocket", this.nodeKey, this.activeNode, "logic");
                // }
            }
        }
    }
    */
    /// todo Test

    if (this.globalStates.acceleration.motion != 0) {
        this.globalStates.acceleration = {
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
 * @desc
 * @return
 **/

realityEditor.gui.ar.draw.drawTransformed = 
    function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCach, globalStates, globalCanvas, 
              activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {
    //console.log(JSON.stringify(activeObjectMatrix));
    if (notLoading !== activeKey && activeVehicle.loaded === true) {
        if (!activeVehicle.visible) {
            activeVehicle.visible = true;
            globalDOMCach["object" + activeKey].style.display = 'inline';
            globalDOMCach["iframe" + activeKey].style.visibility = 'visible';
            globalDOMCach["iframe" + activeKey].contentWindow.postMessage(
                JSON.stringify(
                    {
                        visibility: "visible",
                        interface: globalStates.interface,
                        search: realityEditor.gui.search.getSearch()
                    }), '*');

            if (activeType === "node") {
                activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
                globalDOMCach[activeKey].style.visibility = 'visible';
                // document.getElementById("text" + activeKey).style.visibility = 'visible';
                if (globalStates.editingMode) {
                    globalDOMCach["canvas" + activeKey].style.display = 'inline';
                } else {
                    globalDOMCach["canvas" + activeKey].style.display = 'none';
                }
            } else if (activeType === "ui") {
                if (globalStates.editingMode) {
                    if (!activeVehicle.visibleEditing && activeVehicle.developer) {
                        activeVehicle.visibleEditing = true;
                        globalDOMCach[activeKey].style.visibility = 'visible';
                        // showEditingStripes(activeKey, true);
                        globalDOMCach["canvas" + activeKey].style.display = 'inline';

                        //document.getElementById(activeKey).className = "mainProgram";
                    }
                } else {
                    globalDOMCach["canvas" + activeKey].style.display = 'none';
                }
            }


            else if (activeType === "logic") {
                activeVehicle.temp = utilities.copyMatrix(activeObjectMatrix);
                globalDOMCach[activeKey].style.visibility = 'visible';
                // document.getElementById("text" + activeKey).style.visibility = 'visible';
                if (globalStates.editingMode) {
                    globalDOMCach["canvas" + activeKey].style.display = 'inline';
                } else {
                    globalDOMCach["canvas" + activeKey].style.display = 'none';
                }
            }

            /*
             else if (activeType === "logic") {


             activeVehicle.temp = copyMatrix(activeObjectMatrix);

             if (globalStates.editingMode) {
             if (!activeVehicle.visibleEditing && activeVehicle.developer) {
             activeVehicle.visibleEditing = true;
             globalDOMCach[activeKey].style.visibility = 'visible';
             // showEditingStripes(activeKey, true);
             globalDOMCach["canvas" + activeKey].style.display = 'inline';

             //document.getElementById(activeKey).className = "mainProgram";
             }
             } else {
             globalDOMCach["canvas" + activeKey].style.display = 'none';
             }
             }*/

            if (type === "logic" && objectKey!=="pocket"){
                if(thisObject.animationScale ===1) {
                    globalDOMCach["logic" + nodeKey].className = "mainEditing scaleOut";
                    thisObject.animationScale =0;
                }
            }

        }
        if (activeVehicle.visible) {
            // this needs a better solution

            if (activeVehicle.fullScreen !== true) {

                matrix.r3 = [
                    activeVehicle.scale, 0, 0, 0,
                    0, activeVehicle.scale, 0, 0,
                    0, 0, 1, 0,
                    activeVehicle.x, activeVehicle.y, 0, 1
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
                            if (typeof activeVehicle.matrix === "object")
                                if (activeVehicle.matrix.length > 0)
                                // activeVehicle.begin = copyMatrix(multiplyMatrix(activeVehicle.matrix, activeVehicle.temp));
                                {  utilities.multiplyMatrix(activeVehicle.matrix, activeVehicle.temp, activeVehicle.begin);}
                                else
                                { activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);}
                            else
                                    {  activeVehicle.begin = utilities.copyMatrix(activeVehicle.temp);};

                            if (globalStates.unconstrainedPositioning === true)
                            // activeVehicle.matrix = copyMatrix(multiplyMatrix(activeVehicle.begin, invertMatrix(activeVehicle.temp)));

                                utilities.multiplyMatrix(activeVehicle.begin, utilities.invertMatrix(activeVehicle.temp), activeVehicle.matrix);

                            matrix.copyStillFromMatrixSwitch = false;
                        }

                        if (globalStates.unconstrainedPositioning === true)
                            activeObjectMatrix = matrix.visual;

                    }

                    if (typeof activeVehicle.matrix[1] !== "undefined") {
                        if (activeVehicle.matrix.length > 0) {
                            if (globalStates.unconstrainedPositioning === false) {
                                //activeVehicle.begin = copyMatrix(multiplyMatrix(activeVehicle.matrix, activeVehicle.temp));
                                utilities.multiplyMatrix(activeVehicle.matrix, activeVehicle.temp, activeVehicle.begin);
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
                }

                if (activeVehicle.matrix.length < 13) {
                    utilities.multiplyMatrix(matrix.r3, activeObjectMatrix, finalMatrix);
                    console.log(activeVehicle);
                    
                } else {
                    utilities.multiplyMatrix(activeVehicle.matrix, activeObjectMatrix, matrix.r);
                    utilities.multiplyMatrix(matrix.r3, matrix.r, finalMatrix);

                    // finalMatrix = multiplyMatrix(matrix.r3, multiplyMatrix(activeVehicle.matrix, activeObjectMatrix));
                }
            
                //    else {
                //        multiplyMatrix(matrix.r3, activeObjectMatrix,finalMatrix);
                //   }

                // console.log(activeKey);
                // console.log(globalDOMCach["activeVehicle" + activeKey]);
                // console.log(globalDOMCach["activeVehicle" + activeKey].visibility);
                // draw transformed
                globalDOMCach["object" + activeKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';

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

                    cout(thisMsg);
                    globalDOMCach["iframe" + activeKey].contentWindow.postMessage(
                        JSON.stringify(thisMsg), '*');
                    //  console.log("I am here");

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
                            globalDOMCach["logic" + activeKey].className = "mainEditing scaleIn";
                        activeVehicle.animationScale = 1;
                    }
                    else {
                        if (activeVehicle.animationScale === 1)
                            globalDOMCach["logic" + activeKey].className = "mainEditing scaleOut";
                        activeVehicle.animationScale = 0;
                    }

                    // context.stroke();
                } else {
                    if (activeVehicle.animationScale === 1) {
                        globalDOMCach["logic" + activeKey].className = "mainEditing scaleOut";
                        activeVehicle.animationScale = 0;
                    }
                }
            }


            // temporary UI styling to visualize locks

            if (activeType === "node" || activeType === "logic") {
                if (!!activeVehicle.lockPassword && activeVehicle.lockType === "full") {
                    globalDOMCach["iframe" + activeKey].style.opacity = 0.25;
                } else if (!!activeVehicle.lockPassword && activeVehicle.lockType === "half") {
                    globalDOMCach["iframe" + activeKey].style.opacity = 0.75;
                } else {
                    globalDOMCach["iframe" + activeKey].style.opacity = 1.0;
                }
            }

        }
    }

};

/**
 * @desc
 * @return
 **/

realityEditor.gui.ar.draw.hideTransformed = function (activeKey, activeVehicle, globalDOMCach, cout) {


 //   console.log(activeVehicle);
    if (activeVehicle.visible === true) {
        globalDOMCach["object" + activeKey].style.display = 'none';
        globalDOMCach["iframe" + activeKey].style.visibility = 'hidden';
        globalDOMCach["iframe" + activeKey].contentWindow.postMessage(
            JSON.stringify(
                {
                    visibility: "hidden"
                }), '*');

        activeVehicle.visible = false;
        activeVehicle.visibleEditing = false;

        globalDOMCach[activeKey].style.visibility = 'hidden';
        globalDOMCach["canvas" + activeKey].style.display = 'none';

        cout("hideTransformed");
    }
};

/**
 * @desc
 * @return
 **/

realityEditor.gui.ar.draw.addElement = function (thisUrl, activeKey, objectKey, frameKey, activeType, notLoading, activeVehicle, globalStates, globalDOMCach) {

    if (notLoading !== true && notLoading !== activeKey && activeVehicle.loaded !== true) {


        console.log("did load object " + objectKey + ", node " + activeKey);

        if (typeof activeVehicle.frameSizeX === 'undefined') {
            activeVehicle.frameSizeX = activeVehicle.width;
        }

        if (typeof activeVehicle.frameSizeY === 'undefined') {
            activeVehicle.frameSizeY = activeVehicle.height;
        }

        activeVehicle.animationScale = 0;
        activeVehicle.loaded = true;
        activeVehicle.visibleEditing = false;
        this.notLoading = activeKey;

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

        var addContainer = document.createElement('div');
        addContainer.id = "object" + activeKey;
        addContainer.style.width = globalStates.height + "px";
        addContainer.style.height = globalStates.width + "px";
        addContainer.style.display = "none";
        addContainer.style.border = 0;
        // addContainer.setAttribute("background-color", "lightblue");

        addContainer.className = "main";

        var addIframe = document.createElement('iframe');
        addIframe.id = "iframe" + activeKey;
        addIframe.frameBorder = 0;
        addIframe.style.width = (activeVehicle.width || 0) + "px";
        addIframe.style.height = (activeVehicle.height || 0) + "px";
        addIframe.style.left = ((globalStates.height - activeVehicle.frameSizeY) / 2) + "px";
        addIframe.style.top = ((globalStates.width - activeVehicle.frameSizeX) / 2) + "px";
        addIframe.style.visibility = "hidden";
        addIframe.src = thisUrl;
        addIframe.dataset.nodeKey = activeKey;
        addIframe.dataset.frameKey = frameKey;
        addIframe.dataset.objectKey = objectKey;
        addIframe.className = "main";
        addIframe.setAttribute("onload", 'realityEditor.network.onElementLoad("' + objectKey + '","' + frameKey + '","' + activeKey + '")');
        addIframe.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts");

        var addOverlay = document.createElement('div');
        // addOverlay.style.backgroundColor = "red";
        addOverlay.id = activeKey;
        addOverlay.frameBorder = 0;
        addOverlay.style.width = activeVehicle.frameSizeX + "px";
        addOverlay.style.height = activeVehicle.frameSizeY + "px";
        addOverlay.style.left = ((globalStates.height - activeVehicle.frameSizeY) / 2) + "px";
        addOverlay.style.top = ((globalStates.width - activeVehicle.frameSizeX) / 2) + "px";
        addOverlay.style.visibility = "hidden";
        addOverlay.className = "mainEditing";

        // todo the event handlers need to be bound to non animated ui elements for fast movements.
        // todo the lines need to end at the center of the square.


        if (activeType === "logic") {
            var addLogic;
            var size = 200;
            addLogic = document.createElement('div');
            // addOverlay.style.backgroundColor = "red";
            addLogic.id = "logic" + activeKey;
            addLogic.style.width = size + "px";
            // addOverlay.style.height = activeVehicle.frameSizeY + "px";
            addLogic.style.height = size + "px";
            addLogic.style.left = ((activeVehicle.frameSizeX - size) / 2) + "px";
            addLogic.style.top = ((activeVehicle.frameSizeY - size) / 2) + "px";
            addLogic.style.visibility = "hidden";
            addLogic.className = "mainEditing";
            /* addLogic.innerHTML =
             '<svg id="SVG'+activeKey+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
             '<path id="logic4" fill="#00ffff" d="M50,0V50H0V30A30,30,0,0,1,30,0Z"/>' +
             '<path id="logic3" fill="#00ff00" d="M100,30V50H50V0H70A30,30,0,0,1,100,30Z"/>' +
             '<path id="logic2" fill="#ff007c" d="M100,50V70a30,30,0,0,1-30,30H50V50Z"/>>' +
             '<path id="logic1" fill="#ffff00" d="M50,50v50H30A30,30,0,0,1,0,70V50Z"/>' +
             '</svg>';*/

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

                addOverlay.appendChild(addLogic);
                globalDOMCach["logic" + activeKey] = addLogic;

            };
        }

        var addCanvas = document.createElement('canvas');
        addCanvas.id = "canvas" + activeKey;
        addCanvas.style.width = "100%";
        addCanvas.style.height = "100%";
        addCanvas.className = "mainCanvas";

        document.getElementById("GUI").appendChild(addContainer);

        addContainer.appendChild(addIframe);

        // If this is a frame, add a cover object for touch event synthesizing
        if (activeVehicle.src) {
            var cover = document.createElement('div');
            cover.classList.add('main');
            cover.style.visibility = 'visible';
            cover.style.width = addIframe.style.width;
            cover.style.height = addIframe.style.height;
            cover.style.top = addIframe.style.top;
            cover.style.left = addIframe.style.left;
            activeVehicle.frameTouchSynthesizer = new realityEditor.gui.frame.FrameTouchSynthesizer(cover, addIframe);
            addContainer.appendChild(cover);
        }

        addOverlay.appendChild(addCanvas);
        addContainer.appendChild(addOverlay);

        globalDOMCach["object" + activeKey] = addContainer;
        globalDOMCach["iframe" + activeKey] = addIframe;
        globalDOMCach[activeKey] = addOverlay;
        globalDOMCach["canvas" + activeKey] = addCanvas;

        var theObject = addOverlay;
        globalDOMCach[activeKey].style["touch-action"] = "none";

        globalDOMCach[activeKey].addEventListener("pointerdown", realityEditor.device.onTouchDown.bind(realityEditor.device), false);
        ec++;
        globalDOMCach[activeKey].addEventListener("pointerup", realityEditor.device.onTrueTouchUp.bind(realityEditor.device), false);
        ec++;
        theObject.addEventListener("pointerenter", realityEditor.device.onTouchEnter.bind(realityEditor.device), false);
        ec++;

        theObject.addEventListener("pointerleave", realityEditor.device.onTouchLeave.bind(realityEditor.device), false);
        ec++;

        theObject.addEventListener("pointermove", realityEditor.device.onTouchMove.bind(realityEditor.device), false);
        ec++;

        if (globalStates.editingMode) {
            // todo this needs to be changed backword
            // if (objects[objectKey].developer) {
            theObject.addEventListener("touchstart", realityEditor.device.onMultiTouchStart.bind(realityEditor.device), false);
            ec++;
            theObject.addEventListener("touchmove", realityEditor.device.onMultiTouchMove.bind(realityEditor.device), false);
            ec++;
            theObject.addEventListener("touchend", realityEditor.device.onMultiTouchEnd.bind(realityEditor.device), false);
            ec++;
            theObject.className = "mainProgram";
            //  }
        }
        theObject.objectId = objectKey;
        theObject.frameId = frameKey;
        theObject.nodeId = activeKey;
        theObject.type = activeType;

        if (activeType === "node") {
            theObject.style.visibility = "visible";
            // theObject.style.display = "initial";
        } else if (activeType === "logic") {
            theObject.style.visibility = "visible";
        }
        else {
            theObject.style.visibility = "hidden";
            //theObject.style.display = "none";
        }

    }
};

/**
 * @desc
 * @param objectKey
 * @param thisObject
 * @return
 **/

realityEditor.gui.ar.draw.killObjects = function (activeKey, activeVehicle, globalDOMCach) {

    if (activeVehicle.visibleCounter > 0) {
        activeVehicle.visibleCounter--;
    } else if (activeVehicle.loaded) {
        activeVehicle.loaded = false;

        globalDOMCach["object" + activeKey].parentNode.removeChild(globalDOMCach["object" + activeKey]);
        delete globalDOMCach["object" + activeKey];
        delete globalDOMCach["iframe" + activeKey];
        delete globalDOMCach[activeKey];
        delete globalDOMCach["canvas" + activeKey];
        delete globalDOMCach[activeKey];

        for (activeKey in activeVehicle.nodes) {
            try {

                globalDOMCach["object" + activeKey].parentNode.removeChild(globalDOMCach["object" + activeKey]);
                delete globalDOMCach["object" + activeKey];
                delete globalDOMCach["iframe" + activeKey];
                delete globalDOMCach[activeKey];
                delete globalDOMCach["canvas" + activeKey];

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
    if (this.globalDOMCach["object" + nodeId]) {
        if (this.globalDOMCach["object" + nodeId].parentNode) {
            this.globalDOMCach["object" + nodeId].parentNode.removeChild(this.globalDOMCach["object" + nodeId]);
        }
        delete this.globalDOMCach["object" + nodeId];
    }
    delete this.globalDOMCach["iframe" + nodeId];
    delete this.globalDOMCach[nodeId];
    delete this.globalDOMCach["canvas" + nodeId];

};

realityEditor.gui.ar.draw.deleteFrame = function (objectId, frameId) {

    delete objects[objectId].frames[frameId];
    this.globalDOMCach["object" + frameId].parentNode.removeChild(this.globalDOMCach["object" + frameId]);
    delete this.globalDOMCach["object" + frameId];
    delete this.globalDOMCach["iframe" + frameId];
    delete this.globalDOMCach[frameId];
    delete this.globalDOMCach["canvas" + frameId];

};
