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

    // if (globalStates.editingMode || (realityEditor.device.editingState.node && realityEditor.device.currentScreenTouches.length > 1)) {
    //     return;
    // }
    
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
		if ( (!frameB.objectVisible && !frameA.objectVisible) || (nodeA.screenZ < -200 && nodeB.screenZ < -200) ) {
			continue;
		}

		if (!frameB.objectVisible || nodeB.screenZ < -200) {
		    
            if (nodeB.screenZ > -200 && (objectB.memory && Object.keys(objectB.memory).length > 0)) {
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

		if (!frameA.objectVisible || nodeA.screenZ < 0) {
            if (nodeA.screenZ > -200 && (objectA.memory && Object.keys(objectA.memory).length > 0)) {
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

        if(typeof nodeA.screenOpacity === 'undefined') nodeA.screenOpacity = 1.0;
        if(typeof nodeB.screenOpacity === 'undefined') nodeB.screenOpacity = 1.0;
        var speed = 1;
        // don't waste resources drawing it if both sides are invisible
        if (nodeA.screenOpacity > 0 || nodeB.screenOpacity > 0) {
            // only draw lines in front of camera, otherwise we can get really slow/long lines
            this.drawLine(context, [nodeA.screenX, nodeA.screenY], [nodeB.screenX, nodeB.screenY], nodeAScreenZ, nodeBScreenZ, link, timeCorrection, logicA, logicB, speed, nodeA.screenOpacity,nodeB.screenOpacity);
        }
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
        
        if(typeof nodeA.screenOpacity === 'undefined') nodeA.screenOpacity = 1.0;
		var speed = 1;
		this.drawLine(globalCanvas.context, [nodeA.screenX, nodeA.screenY], [globalStates.pointerPosition[0], globalStates.pointerPosition[1]], nodeA.screenZ, 8, globalStates, timeCorrection, logicA, globalProgram.logicSelector, speed, nodeA.screenOpacity, 1);
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
 * @param {number|undefined} lineAlphaStart - the opacity of the start of the line (range: 0-1)
 * @param {number|undefined} lineAlphaEnd - the opacity of the end of the line (range: 0-1)
 * 
 * 
 * 
 */
realityEditor.gui.ar.lines.angle = 0;
realityEditor.gui.ar.lines.positionDelta = 0;
realityEditor.gui.ar.lines.length1 = 0;
realityEditor.gui.ar.lines.length2 = 0;
realityEditor.gui.ar.lines.lineVectorLength = 0;
realityEditor.gui.ar.lines.keepColor = 0;
realityEditor.gui.ar.lines.spacer = 0;
realityEditor.gui.ar.lines.ratio = 0;
realityEditor.gui.ar.lines.mathPI = 2*Math.PI;
realityEditor.gui.ar.lines.newColor = 0;
realityEditor.gui.ar.lines.ballPosition = 0;
realityEditor.gui.ar.lines.colors = 0;
realityEditor.gui.ar.lines.ballSize = 0;
realityEditor.gui.ar.lines.x__ = 0;
realityEditor.gui.ar.lines.y__ = 0;
realityEditor.gui.ar.lines.ballPosition  = 0;
realityEditor.gui.ar.lines.width  = globalStates.width;
realityEditor.gui.ar.lines.height  = globalStates.height;
realityEditor.gui.ar.lines.extendedBorder = 200;
realityEditor.gui.ar.lines.extendedBorderNegative = -200;
realityEditor.gui.ar.lines.nodeExistsA = true;
realityEditor.gui.ar.lines.nodeExistsB = true;


realityEditor.gui.ar.lines.drawLine = function(context, lineStartPoint, lineEndPoint, lineStartWeight, lineEndWeight, linkObject, timeCorrector, startColor, endColor, speed, lineAlphaStart, lineAlphaEnd) {
    this.nodeExistsA = true;
   this.nodeExistsB = true;

    if (lineStartPoint[0] < this.extendedBorderNegative) {
        lineStartPoint[0] = this.extendedBorderNegative;
        this.nodeExistsA = false;
    };
    if (lineStartPoint[1] < this.extendedBorderNegative) {
        lineStartPoint[1] = this.extendedBorderNegative;
        this.nodeExistsA = false;
    };
    if (lineEndPoint[0] < this.extendedBorderNegative) {
        lineEndPoint[0] = this.extendedBorderNegative;
        this.nodeExistsB = false;
    };
    if (lineEndPoint[1] < this.extendedBorderNegative) {
        lineEndPoint[1] = this.extendedBorderNegative;
        this.nodeExistsB = false;
    };
    if (lineStartPoint[0] > globalStates.height+this.extendedBorder) {
        lineStartPoint[0] = globalStates.height+this.extendedBorder;
        this.nodeExistsA = false;
    };
    if (lineStartPoint[1] > globalStates.width+this.extendedBorder) {
        lineStartPoint[1] = globalStates.width+this.extendedBorder;
        this.nodeExistsA = false;
    };
    if (lineEndPoint[0] > globalStates.height+this.extendedBorder) {
        lineEndPoint[0] = globalStates.height+this.extendedBorder;
        this.nodeExistsB = false;
    };
    if (lineEndPoint[1] > globalStates.width+this.extendedBorder) {
        lineEndPoint[1] = globalStates.width+this.extendedBorder;
        this.nodeExistsB = false;
    };
    
    if( !this.nodeExistsB &&  !this.nodeExistsA){
        return;
    }
    if(!this.nodeExistsB){
        lineEndWeight = lineStartWeight;
    }
    if(!this.nodeExistsA){
        lineStartWeight = lineEndWeight;
    }
    
    if (typeof lineAlphaStart === 'undefined') lineAlphaStart = 1.0;
    if (typeof lineAlphaEnd === 'undefined') lineAlphaEnd = 1.0;
    if (!speed) speed = 1;
    this.angle = Math.atan2((lineStartPoint[1] - lineEndPoint[1]), (lineStartPoint[0] - lineEndPoint[0]));
    this.positionDelta = 0;
    this.length1 = lineEndPoint[0] - lineStartPoint[0];
    this.length2 = lineEndPoint[1] - lineStartPoint[1];
    this.lineVectorLength = Math.sqrt(this.length1 * this.length1 + this.length2 * this.length2);
    //this.keepColor = this.lineVectorLength / 6;
    this.spacer = 2.3;
    this.ratio = 0;
    this.newColor = [255,255,255,0];
    
    // TODO: temporary solution to render lock information for this link
    
    if (!!linkObject.lockPassword) {
        if (linkObject.lockType === "full") {
            lineAlphaEnd = lineAlphaEnd/4;
        } else if (linkObject.lockType === "half") {
            lineAlphaEnd = lineAlphaEnd/4*3;
        }
    }

    this.colors = [[0,255,255], // Blue
        [0,255,0],   // Green
        [255,255,0], // Yellow
        [255,0,124], // Red
        [255,255,255]]; // White

    if (linkObject.ballAnimationCount >= lineStartWeight * this.spacer)  linkObject.ballAnimationCount = 0;

    context.beginPath();
    context.fillStyle = "rgba("+this.newColor+")";
    context.arc(lineStartPoint[0],lineStartPoint[1], lineStartWeight, 0, 2*Math.PI);
    context.fill();
    
    while (this.positionDelta + linkObject.ballAnimationCount < this.lineVectorLength) {
        this.ballPosition = this.positionDelta + linkObject.ballAnimationCount;

        this.ratio = this.ar.utilities.map(this.ballPosition, 0, this.lineVectorLength, 0, 1);
        for (var i = 0; i < 3; i++) {
            this.newColor[i] = (Math.floor(parseInt(this.colors[startColor][i], 10) + (this.colors[endColor][i] - this.colors[startColor][i]) * this.ratio));
        }
        this.newColor[3] = (lineAlphaStart + (lineAlphaEnd - lineAlphaStart) * this.ratio);

        this.ballSize = this.ar.utilities.map(this.ballPosition, 0, this.lineVectorLength, lineStartWeight, lineEndWeight);

        this.x__ = lineStartPoint[0] - Math.cos(this.angle) * this.ballPosition;
        this.y__ = lineStartPoint[1] - Math.sin(this.angle) * this.ballPosition;
        this.positionDelta += this.ballSize * this.spacer;
        context.beginPath();
        context.fillStyle = "rgba("+this.newColor+")";
        context.arc(this.x__, this.y__, this.ballSize, 0, this.mathPI);
        context.fill();
    }

    context.beginPath();
    context.fillStyle = "rgba("+this.newColor+")";
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
