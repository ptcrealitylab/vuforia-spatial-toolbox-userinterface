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

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param x21 position x 1
 * @param y1 position y 1
 * @param x2 position x 2
 * @param y2 position y 2
 **/

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
 * @desc
 * @param thisObject is a reference to an Hybrid Object
 * @param context is a reference to a html5 canvas object
 **/

realityEditor.gui.ar.lines.drawAllLines = function (thisFrame, context) {
    if(!thisFrame) return;
	for (var linkKey in thisFrame.links) {
		if (!thisFrame.links.hasOwnProperty(linkKey)) continue;
		
		var link = thisFrame.links[linkKey];
		var frameA = thisFrame;
		var frameB = realityEditor.getFrame(link.objectB, link.frameB);

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
            var objectB = realityEditor.getObject(link.objectB);
            if (objectB.memory) {
				var memoryPointer = realityEditor.gui.memory.getMemoryPointerWithId(link.objectB); // TODO: frameId or objectId?
				if (!memoryPointer) {
					memoryPointer = new realityEditor.gui.memory.MemoryPointer(link, false);
				}
				memoryPointer.draw();

				nodeB.screenX = memoryPointer.x;
				nodeB.screenY = memoryPointer.y;
				nodeB.screenZ = nodeA.screenZ;
			} else {
				nodeB.screenX = nodeA.screenX;
				nodeB.screenY = -10;
				nodeB.screenZ = nodeA.screenZ;
			}
			nodeB.screenZ = nodeA.screenZ;
			nodeB.screenLinearZ = nodeA.screenLinearZ;
		}

		if (!frameA.objectVisible) {
            var objectA = realityEditor.getObject(link.objectA);
            if (objectA.memory) {
				var memoryPointer = realityEditor.gui.memory.getMemoryPointerWithId(link.objectA);
				if (!memoryPointer) {
					memoryPointer = new realityEditor.gui.memory.MemoryPointer(link, true);
				}
				memoryPointer.draw();

				nodeA.screenX = memoryPointer.x;
				nodeA.screenY = memoryPointer.y;
			} else {
				nodeA.screenX = nodeB.screenX;
				nodeA.screenY = -10;
			}
			nodeA.screenZ = nodeB.screenZ;
			nodeA.screenLinearZ = nodeB.screenLinearZ;
		}

		// linearize a non linear zBuffer (see index.js)
		var nodeAScreenZ =   nodeA.screenLinearZ;
		var nodeBScreenZ = nodeB.screenLinearZ;

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
 * @desc
 **/

realityEditor.gui.ar.lines.drawInteractionLines = function () {
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
            nodeA.screenZ = nodeA.screenLinearZ;
		}

		var logicA = globalProgram.logicA || 4;

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
 * @desc
 * @param context is html5 canvas object
 * @param lineStartPoint is an array of two numbers indicating the start for a line
 * @param lineEndPoint is an array of two numbers indicating the end for a line
 * @param lineStartWeight is a number indicating the weight of a line at start
 * @param lineEndWeight is a number indicating the weight of a line at end
 * @param linkObject that contains ballAnimationCount
 * @param timeCorrector is a number that is regulating the animation speed according to the frameRate
 * @param startColor beinning color
 * @param endColor end color
 * @return
 **/

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
    linkObject.ballAnimationCount += (lineStartWeight * timeCorrector.delta)+speed;
};

/**********************************************************************************************************************
 **********************************************************************************************************************/

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param b1
 * @param b2
 **/

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
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

realityEditor.gui.ar.lines.drawGreen = function(context, lineStartPoint, lineEndPoint, radius) {
	context.beginPath();
	context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
	context.strokeStyle = "#7bff08";
	context.lineWidth = 2;
	context.setLineDash([7]);
	context.stroke();
	context.closePath();

};

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

realityEditor.gui.ar.lines.drawRed = function(context, lineStartPoint, lineEndPoint, radius) {
	context.beginPath();
	context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
	context.strokeStyle = "#ff036a";
	context.lineWidth = 2;
	context.setLineDash([7]);
	context.stroke();
	context.closePath();
};

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

realityEditor.gui.ar.lines.drawBlue = function(context, lineStartPoint, lineEndPoint, radius) {
	context.beginPath();
	context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
	context.strokeStyle = "#01fffd";
	context.lineWidth = 2;
	context.setLineDash([7]);
	context.stroke();
	context.closePath();
};

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

realityEditor.gui.ar.lines.drawYellow = function(context, lineStartPoint, lineEndPoint, radius) {
	context.beginPath();
	context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
	context.strokeStyle = "#FFFF00";
	context.lineWidth = 2;
	context.setLineDash([7]);
	context.stroke();
	context.closePath();
};

realityEditor.gui.ar.lines.drawSimpleLine = function(context, startX, startY, endX, endY, color, width) {
	context.strokeStyle = color;
	context.lineWidth = width;
	context.beginPath();
	context.moveTo(startX, startY);
	context.lineTo(endX, endY);
	context.stroke();
};
