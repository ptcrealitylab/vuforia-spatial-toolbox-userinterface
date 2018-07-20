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


createNameSpace("realityEditor.gui.ar.lines");

/**
 * @fileOverview realityEditor.gui.ar.lines.js
 * Contains all the functions for rendering different types of links, lines, and circles on the background canvas.
 * Also contains logic for deleting lines crossed by a cutting line.
 */

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * Deletes ("cuts") any links who cross the line between (x1, y1) and (x2, y2)
 * @param {number} x1 
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
realityEditor.gui.ar.lines.deleteLines = function(x1, y1, x2, y2) {

    // window.location.href = "of://gotsome";
    for (var objectKey in objects) {
        if (!objects.hasOwnProperty(objectKey)) continue;
        var thisObject = realityEditor.getObject(objectKey);
        for (var frameKey in objects[objectKey].frames) {
            
            var thisFrame = realityEditor.getFrame(objectKey, frameKey);
            
            if (!thisFrame) {
                continue;
            }
             
            // if (!thisFrame.objectVisible) {
            //     continue;
            // }
            
            for (var linkKey in thisFrame.links) {
                if (!thisFrame.links.hasOwnProperty(linkKey)) continue;
                
                var link = thisFrame.links[linkKey];
                var frameA = thisFrame;
                var frameB = realityEditor.getFrame(link.objectB, link.frameB);
                
                if (!frameA || !frameB || (!frameA.objectVisible && !frameB.objectVisible)) {
                    continue;
                }

                var nodeA = frameA.nodes[link.nodeA];
                var nodeB = frameB.nodes[link.nodeB];

                if (!nodeA || !nodeB) {
                    continue;
                }

                if (this.realityEditor.gui.utilities.checkLineCross(nodeA.screenX, nodeA.screenY, nodeB.screenX, nodeB.screenY, x1, y1, x2, y2, globalCanvas.canvas.width, globalCanvas.canvas.height)) {
                    
                    if (realityEditor.device.security.isLinkActionAllowed(objectKey, frameKey, linkKey, "delete")) {
                        delete thisFrame.links[linkKey];
                        this.cout("iam executing link deletion");
                        //todo this is a work around to not crash the server. only temporarly for testing
                        // if(link.logicA === false && link.logicB === false)
                        realityEditor.network.deleteLinkFromObject(thisObject.ip, objectKey, frameKey, linkKey);
                    }
                }
            }
        }
    }

};

/**
 * Renders all links who start from a node on the given frame, drawn onto the provided HTML canvas context reference.
 * @param {Frame} thisFrame
 * @param {CanvasRenderingContext2D} context
 */
realityEditor.gui.ar.lines.drawAllLines = function (thisFrame, context) {

    if (globalStates.editingMode || (realityEditor.device.editingState.node && realityEditor.device.currentScreenTouches.length > 1)) {
        return;
    }
    
    if(!thisFrame) return;
	for (var linkKey in thisFrame.links) {
		if (!thisFrame.links.hasOwnProperty(linkKey)) continue;
		
		var link = thisFrame.links[linkKey];
		var frameA = thisFrame;
		var frameB = realityEditor.getFrame(link.objectB, link.frameB);
        var objectA = realityEditor.getObject(link.objectA);
        var objectB = realityEditor.getObject(link.objectB);
        var nodeASize = 0;
        var nodeBSize = 0;

		if (isNaN(link.ballAnimationCount)) {
            link.ballAnimationCount = 0;
        }

		if (!frameA || !frameB) {
			continue; // should not be undefined
		}

		var nodeA = frameA.nodes[link.nodeA];
		var nodeB = frameB.nodes[link.nodeB];
		
		if (!nodeA || !nodeB) {
		    continue; // should not be undefined
        }

		// Don't draw off-screen lines
		if (!frameB.objectVisible && !frameA.objectVisible) {
			continue;
		}

		if (!frameB.objectVisible) {
            if (objectB.memory && Object.keys(objectB.memory).length > 0) {
				var memoryPointer = realityEditor.gui.memory.getMemoryPointerWithId(link.objectB); // TODO: frameId or objectId?
				if (!memoryPointer) {
					memoryPointer = new realityEditor.gui.memory.MemoryPointer(link, false);
				}

				nodeB.screenX = memoryPointer.x;
				nodeB.screenY = memoryPointer.y;
				nodeB.screenZ = nodeA.screenZ;

                if (memoryPointer.memory.imageLoaded && memoryPointer.memory.image.naturalWidth === 0 && memoryPointer.memory.image.naturalHeight === 0) {
                    nodeB.screenX = nodeA.screenX;
                    nodeB.screenY = -10;
                    delete objectB.memory;
                } else {
                    memoryPointer.draw();
                }
			} else {
				nodeB.screenX = nodeA.screenX;
				nodeB.screenY = -10;
				nodeB.screenZ = nodeA.screenZ;
            }
			nodeB.screenZ = nodeA.screenZ;
			nodeB.screenLinearZ = nodeA.screenLinearZ;
			nodeBSize = objectA.averageScale;
		}

		if (!frameA.objectVisible) {
            if (objectA.memory && Object.keys(objectA.memory).length > 0) {
				var memoryPointer = realityEditor.gui.memory.getMemoryPointerWithId(link.objectA);
				if (!memoryPointer) {
					memoryPointer = new realityEditor.gui.memory.MemoryPointer(link, true);
				}

				nodeA.screenX = memoryPointer.x;
				nodeA.screenY = memoryPointer.y;
				
                if (memoryPointer.memory.imageLoaded && memoryPointer.memory.image.naturalWidth === 0 && memoryPointer.memory.image.naturalHeight === 0) {
                    nodeA.screenX = nodeB.screenX;
                    nodeB.screenY = -10;
                    delete objectA.memory;
                } else {
                    memoryPointer.draw();
                }
			} else {
				nodeA.screenX = nodeB.screenX;
				nodeA.screenY = -10;
                nodeA.screenZ = nodeB.screenZ;
			}
			nodeA.screenZ = nodeB.screenZ;
			nodeA.screenLinearZ = nodeB.screenLinearZ;
			nodeASize = objectB.averageScale
		}
		if(!nodeASize) nodeASize = objectA.averageScale;
        if(!nodeBSize) nodeBSize = objectB.averageScale;

		// linearize a non linear zBuffer (see index.js)
		var nodeAScreenZ =   nodeA.screenLinearZ*(nodeASize*1.5);
		var nodeBScreenZ = nodeB.screenLinearZ*(nodeBSize*1.5);
		
		var logicA;
		if (link.logicA == null || link.logicA === false) {
			logicA = 4;
		} else {
			logicA = link.logicA;
		}

		var logicB;
		if (link.logicB == null || link.logicB === false) {
			logicB = 4;
		} else {
			logicB = link.logicB;
		}
        
		this.drawLine(context, [nodeA.screenX, nodeA.screenY], [nodeB.screenX, nodeB.screenY], nodeAScreenZ, nodeBScreenZ, link, timeCorrection,logicA,logicB);
	}
	// context.fill();
    
    globalCanvas.hasContent = true;
};

/**
 * Draws a link from its start position to the touch position, if you are currently adding one.
 * Draws the "cut" line to the touch position, if you are currently drawing one to delete links.
 */
realityEditor.gui.ar.lines.drawInteractionLines = function () {

    if (globalStates.editingMode || realityEditor.device.editingState.node) {
        return;
    }


    // this function here needs to be more precise

	if (globalProgram.objectA) {

        var objectA = realityEditor.getObject(globalProgram.objectA);
        var frameA = realityEditor.getFrame(globalProgram.objectA, globalProgram.frameA);
		var nodeA = realityEditor.getNode(globalProgram.objectA, globalProgram.frameA, globalProgram.nodeA);

		// this is for making sure that the line is drawn out of the screen... Don't know why this got lost somewhere down the road.
		// linearize a non linear zBuffer

		// map the linearized zBuffer to the final ball size
		if (!objectA.objectVisible) {
            nodeA.screenX = globalStates.pointerPosition[0];
            nodeA.screenY = -10;
            nodeA.screenZ = 6;
			
		} else if(nodeA.screenLinearZ) {
            nodeA.screenZ = nodeA.screenLinearZ*objectA.averageScale;
		}

		var logicA = globalProgram.logicA;
		if (globalProgram.logicA === false) {
		    logicA = 4;
        }

		this.drawLine(globalCanvas.context, [nodeA.screenX, nodeA.screenY], [globalStates.pointerPosition[0], globalStates.pointerPosition[1]], nodeA.screenZ, nodeA.screenZ, globalStates, timeCorrection, logicA, globalProgram.logicSelector);
	}

	if (globalStates.drawDotLine) {
		this.drawDotLine(globalCanvas.context, [globalStates.drawDotLineX, globalStates.drawDotLineY], [globalStates.pointerPosition[0], globalStates.pointerPosition[1]], 1, 1);
	}

    globalCanvas.hasContent = true;
};

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * Draws a link object and animates it over time.
 * @param {CanvasRenderingContext2D} context - canvas rendering context
 * @param {[number, number]} lineStartPoint - the [x, y] coordinate of the start of a line
 * @param {[number, number]} lineEndPoint - the [x, y] coordinate of the end of a line
 * @param {number} lineStartWeight - width of a line at start (used to fake 3d depth)
 * @param {number} lineEndWeight - width of a line at end (used to fake 3d depth)
 * @param {Link} linkObject - the full link data object, including an added ballAnimationCount property
 * @param {number} timeCorrector - automatically regulates the animation speed according to the frameRate
 * @param {number} startColor - white for regular links, colored for logic links (0 = Blue, 1 = Green, 2 = Yellow, 3 = Red, 4 = White)
 * @param {number} endColor - same mapping as startColor
 * @param {number|undefined} speed - optionally adjusts how quickly the animation moves
 */
realityEditor.gui.ar.lines.drawLine = function(context, lineStartPoint, lineEndPoint, lineStartWeight, lineEndWeight, linkObject, timeCorrector, startColor, endColor, speed) {
    if(!speed) speed = 1;
    var angle = Math.atan2((lineStartPoint[1] - lineEndPoint[1]), (lineStartPoint[0] - lineEndPoint[0]));
    var positionDelta = 0;
    var length1 = lineEndPoint[0] - lineStartPoint[0];
    var length2 = lineEndPoint[1] - lineStartPoint[1];
    var lineVectorLength = Math.sqrt(length1 * length1 + length2 * length2);
    var keepColor = lineVectorLength / 6;
    var spacer = 2.3;
    var ratio = 0;
    var mathPI = 2*Math.PI;
    var newColor = [255,255,255,1.0];
    
    // TODO: temporary solution to render lock information for this link
    
    if (!!linkObject.lockPassword) {
        if (linkObject.lockType === "full") {
            newColor[3] = 0.25;
        } else if (linkObject.lockType === "half") {
            newColor[3] = 0.75;
        }
    }
    
    var colors = [[0,255,255], // Blue
        [0,255,0],   // Green
        [255,255,0], // Yellow
        [255,0,124], // Red
        [255,255,255]]; // White

    if (linkObject.ballAnimationCount >= lineStartWeight * spacer)  linkObject.ballAnimationCount = 0;

    context.beginPath();
    context.fillStyle = "rgba("+newColor+")";
    context.arc(lineStartPoint[0],lineStartPoint[1], lineStartWeight, 0, 2*Math.PI);
    context.fill();
    
    while (positionDelta + linkObject.ballAnimationCount < lineVectorLength) {
        var ballPosition = positionDelta + linkObject.ballAnimationCount;

        ratio = this.ar.utilities.map(ballPosition, 0, lineVectorLength, 0, 1);
        for (var i = 0; i < 3; i++) {
            newColor[i] = (Math.floor(parseInt(colors[startColor][i], 10) + (colors[endColor][i] - colors[startColor][i]) * ratio));
        }

        var ballSize = this.ar.utilities.map(ballPosition, 0, lineVectorLength, lineStartWeight, lineEndWeight);
        
        var x__ = lineStartPoint[0] - Math.cos(angle) * ballPosition;
        var y__ = lineStartPoint[1] - Math.sin(angle) * ballPosition;
        positionDelta += ballSize * spacer;
        context.beginPath();
        context.fillStyle = "rgba("+newColor+")";
        context.arc(x__, y__, ballSize, 0, mathPI);
        context.fill();
    }

    context.beginPath();
    context.fillStyle = "rgba("+newColor+")";
    context.arc(lineEndPoint[0],lineEndPoint[1], lineEndWeight, 0, 2*Math.PI);
    context.fill();
    
    linkObject.ballAnimationCount += (lineStartWeight * timeCorrector.delta)+speed;
};

/**
 * @todo is this used anymore? unclear what it is used for.
 * @param cxt
 * @param weight
 * @param object
 */
realityEditor.gui.ar.lines.transform = function (cxt, weight, object){
    var n = object;
    if(!n) return;
  /*  var m = n.mostRecentFinalMatrix;
    var offset =  m[15];
    var xx =n.scale;
  
    */
    cxt.beginPath();
   // cxt.setTransform((m[0]/offset)*xx, (m[1]/offset)*xx, (m[4]/offset)*xx,(m[5]/offset)*xx, n.screenX,n.screenY);
    cxt.arc(n.screenX,n.screenY, weight, 0, 2*Math.PI);
    cxt.fill();
    

};
/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * Draws the dotted line used to cut links, between the start and end coordinates.
 * @todo: (b1, b2) have (1, 1) passed in as an example, but aren't used anymore.
 * @param {CanvasRenderingContext2D} context
 * @param {[number, number]} lineStartPoint
 * @param {[number, number]} lineEndPoint
 * @param b1
 * @param b2
 */
realityEditor.gui.ar.lines.drawDotLine = function(context, lineStartPoint, lineEndPoint, b1, b2) {
	context.beginPath();
	context.moveTo(lineStartPoint[0], lineStartPoint[1]);
	context.lineTo(lineEndPoint[0], lineEndPoint[1]);
	context.setLineDash([7]);
	context.lineWidth = 2;
	context.strokeStyle = "#ff019f";//"#00fdff";
	context.stroke();
	context.closePath();
};

/**
 * Draws a green, dashed, circular line.
 * @param {CanvasRenderingContext2D} context
 * @param {[number, number]} circleCenterPoint
 * @param {number} radius
 */
realityEditor.gui.ar.lines.drawGreen = function(context, circleCenterPoint, radius) {
	context.beginPath();
	context.arc(circleCenterPoint[0], circleCenterPoint[1], radius, 0, Math.PI * 2);
	context.strokeStyle = "#7bff08";
	context.lineWidth = 2;
	context.setLineDash([7]);
	context.stroke();
	context.closePath();

};

/**
 * Draws a red, dashed, circular line.
 * @param {CanvasRenderingContext2D} context
 * @param {[number, number]} circleCenterPoint
 * @param {number} radius
 */
realityEditor.gui.ar.lines.drawRed = function(context, circleCenterPoint, radius) {
	context.beginPath();
	context.arc(circleCenterPoint[0], circleCenterPoint[1], radius, 0, Math.PI * 2);
	context.strokeStyle = "#ff036a";
	context.lineWidth = 2;
	context.setLineDash([7]);
	context.stroke();
	context.closePath();
};

/**
 * Draws a blue, dashed, circular line.
 * @param {CanvasRenderingContext2D} context
 * @param {[number, number]} circleCenterPoint
 * @param {number} radius
 */
realityEditor.gui.ar.lines.drawBlue = function(context, circleCenterPoint, radius) {
	context.beginPath();
	context.arc(circleCenterPoint[0], circleCenterPoint[1], radius, 0, Math.PI * 2);
	context.strokeStyle = "#01fffd";
	context.lineWidth = 2;
	context.setLineDash([7]);
	context.stroke();
	context.closePath();
};

/**
 * Draws a yellow, dashed, circular line.
 * @param {CanvasRenderingContext2D} context
 * @param {[number, number]} circleCenterPoint
 * @param {number} radius
 */
realityEditor.gui.ar.lines.drawYellow = function(context, circleCenterPoint, radius) {
	context.beginPath();
	context.arc(circleCenterPoint[0], circleCenterPoint[1], radius, 0, Math.PI * 2);
	context.strokeStyle = "#FFFF00";
	context.lineWidth = 2;
	context.setLineDash([7]);
	context.stroke();
	context.closePath();
};

/**
 * Utility for drawing a line in the provided canvas context with the given coordinates, color, and width.
 * @param {CanvasRenderingContext2D} context
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @param {string} color
 * @param {number} width
 */
realityEditor.gui.ar.lines.drawSimpleLine = function(context, startX, startY, endX, endY, color, width) {
	context.strokeStyle = color;
	context.lineWidth = width;
	context.beginPath();
	context.moveTo(startX, startY);
	context.lineTo(endX, endY);
	context.stroke();
};
