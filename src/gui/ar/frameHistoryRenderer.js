createNameSpace("realityEditor.gui.ar.frameHistoryRenderer");

/**
 * @fileOverview realityEditor.gui.ar.frameHistoryRenderer.js
 * Contains the feature code to render partially-transparent versions of frames at
 * their previously-saved git position, if they've been moved since then.
 */


(function(exports) {

    var utilities = realityEditor.gui.ar.utilities;
    var tempResMatrix = [];
    var activeObjectMatrix = [];
    var linesToDraw = [];

    var privateState = {
        // isRecording: false,
        visibleObjects: {}
        // recordingObjectKey: null,
        // startMatrix: null
    };

    function initFeature() {

        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
            
            linesToDraw = [];

            for (var objectKey in visibleObjects) {
                if (!visibleObjects.hasOwnProperty(objectKey)) continue;

                var thisObject = realityEditor.getObject(objectKey);
                
                if (thisObject.hasOwnProperty('framesHistory')) {
                    var frameHistory = thisObject.framesHistory;
                    
                    for (var ghostFrameKey in frameHistory) {
                        if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;

                        var ghostFrame = frameHistory[ghostFrameKey];
                        var realFrame = realityEditor.getFrame(objectKey, ghostFrameKey);

                        // console.log(ghostFrameKey);

                        var ghostPosition = realityEditor.gui.ar.positioning.getPositionData(ghostFrame);
                        var realPosition = realityEditor.gui.ar.positioning.getPositionData(realFrame);
                        

                        if (didPositionChange(ghostPosition, realPosition)) {

                            // console.log('render ghost');
                            
                            renderGhost(objectKey, ghostFrameKey, ghostFrame, visibleObjects[objectKey]);

                            linesToDraw.push({  
                                startX: ghostFrame.screenX,
                                startY: ghostFrame.screenY,
                                endX: realFrame.screenX,
                                endY: realFrame.screenY
                            });

                        } else {

                            hideGhost(objectKey, ghostFrameKey);

                        }
                        
                    }
                }
            }
            
            // remove all ghosts when an object loses visibility
            for (var oldObjectKey in privateState.visibleObjects) {
                if (!privateState.visibleObjects.hasOwnProperty(oldObjectKey)) continue;
                
                // only remove ones that don't exist anymore
                if (!visibleObjects.hasOwnProperty(oldObjectKey)) {

                    thisObject = realityEditor.getObject(oldObjectKey);

                    if (thisObject.hasOwnProperty('framesHistory')) {
                        frameHistory = thisObject.framesHistory;

                        for (ghostFrameKey in frameHistory) {
                            if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;

                            hideGhost(oldObjectKey, ghostFrameKey);
                        }
                    }
                    
                }
                
            }
            
            // draw linesToDraw on canvas
            
            linesToDraw.forEach(function(line) {
                
                var distance = Math.sqrt( (line.startX - line.endX)*(line.startX - line.endX) + (line.startY - line.endY)*(line.startY - line.endY) );
                
                if (distance > 50) {
                    
                    var lineWidth = Math.max(1, Math.min(10, Math.sqrt(distance)/5));
                    
                    drawArrow(globalCanvas.context, line.startX, line.startY, line.endX, line.endY, 'black', lineWidth, lineWidth * 2);
                    globalCanvas.hasContent = true;
                }

            });

            privateState.visibleObjects = visibleObjects;

        });
    }
    
    function renderGhost(objectKey, frameKey, ghostFrame, markerMatrix) {
        
        // don't render ghost until real frame is rendered
        if (!globalDOMCache['iframe' + frameKey]) {
            return;
        }
        
        // create div for ghost if needed
        if (!globalDOMCache['ghost' + frameKey]) {
            createGhostElement(objectKey, frameKey);
        }
        
        // compute CSS matrix from ghost ar.x, ar.y, ar.scale, ar.matrix

        var ghostPosition = realityEditor.gui.ar.positioning.getPositionData(ghostFrame);

        var transformationMatrix = [
            ghostPosition.scale, 0, 0, 0,
            0, ghostPosition.scale, 0, 0,
            0, 0, 1, 0,
            ghostPosition.x, ghostPosition.y, 0, 1
        ];
        
        utilities.multiplyMatrix(markerMatrix, globalStates.projectionMatrix, tempResMatrix);
        utilities.multiplyMatrix(rotateX, tempResMatrix, activeObjectMatrix);

        // ghostFrame.screenX = activeObjectMatrix[12] / activeObjectMatrix[15] + (globalStates.height / 2);
        // ghostFrame.screenY = activeObjectMatrix[13] / activeObjectMatrix[15] + (globalStates.width / 2);
        
        var finalMatrix = [];

        if (typeof ghostPosition.matrix !== 'undefined' && ghostPosition.matrix.length === 16) {
            utilities.multiplyMatrix(ghostPosition.matrix, activeObjectMatrix, tempResMatrix);
            utilities.multiplyMatrix(transformationMatrix, tempResMatrix, finalMatrix);
        } else {
            utilities.multiplyMatrix(transformationMatrix, activeObjectMatrix, finalMatrix);
        }
        
        // adjust z so it goes behind the real frame
        
        // calculate center Z of frame to know if it is mostly in front or behind the marker plane
        var projectedPoint = realityEditor.gui.ar.utilities.multiplyMatrix4([0, 0, 0, 1], activeObjectMatrix);

        if (projectedPoint[2] < 10) {
            projectedPoint[2] = 10;
        }
        finalMatrix[14] = 1000000 / projectedPoint[2]; // (don't add extra 200) so it goes behind real

        // draw transformed
        globalDOMCache['ghost' + frameKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';
        
        var ghostCenterPosition = getDomElementCenterPosition(globalDOMCache['ghost' + frameKey]);
        ghostFrame.screenX = ghostCenterPosition.x;
        ghostFrame.screenY = ghostCenterPosition.y;
    }
    
    function hideGhost(objectKey, frameKey) {
        
        if (globalDOMCache['ghost' + frameKey]) {
            globalDOMCache['ghost' + frameKey].parentNode.removeChild(globalDOMCache['ghost' + frameKey]);
            delete globalDOMCache['ghost' + frameKey];
        }
        
    }
    
    function createGhostElement(objectKey, frameKey) {
        
        var ghostDiv = document.createElement('div');
        ghostDiv.id = 'ghost' + frameKey;
        ghostDiv.classList.add('frameHistoryGhost', 'main', 'ignorePointerEvents', 'visibleFrameContainer');
        if (globalDOMCache['iframe' + frameKey]) {
            ghostDiv.style.width = parseInt(globalDOMCache['iframe' + frameKey].style.width) + 'px';
            ghostDiv.style.height = parseInt(globalDOMCache['iframe' + frameKey].style.height) + 'px';
            ghostDiv.style.left = parseInt(globalDOMCache['iframe' + frameKey].style.left) + 'px';
            ghostDiv.style.top = parseInt(globalDOMCache['iframe' + frameKey].style.top) + 'px';
        }
        document.getElementById('GUI').appendChild(ghostDiv);
        globalDOMCache['ghost' + frameKey] = ghostDiv;
        
    }
    
    function didPositionChange(ghostPosition, realPosition) {
        return (ghostPosition.x !== realPosition.x ||
                ghostPosition.y !== realPosition.y ||
                ghostPosition.scale !== realPosition.scale ||
                JSON.stringify(ghostPosition.matrix) !== JSON.stringify(realPosition.matrix)
        );
    }
    
    function getDomElementCenterPosition(domElement) {
        return {
            x: domElement.getClientRects()[0].left + domElement.getClientRects()[0].width/2,
            y: domElement.getClientRects()[0].top + domElement.getClientRects()[0].height/2
        }
    }

    function drawGhostLine(context, lineStartPoint, lineEndPoint) {
        context.beginPath();
        context.moveTo(lineStartPoint[0], lineStartPoint[1]);
        context.lineTo(lineEndPoint[0], lineEndPoint[1]);
        context.setLineDash([5]);
        context.lineWidth = 1;
        context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        context.stroke();
        context.closePath();
    }

    /**
     * @param {Object} ctx
     * @param {number} fromx
     * @param {number} fromy
     * @param {number} tox
     * @param {number} toy
     * @param {string} color
     * @param {number} lineWidth
     * @param {number} headLength
     */
    function drawArrow(ctx, fromx, fromy, tox, toy, color, lineWidth, headLength){
        //variables to be used when creating the arrow
        var headlen = headLength || 10;

        var angle = Math.atan2(toy-fromy,tox-fromx);

        //starting path of the arrow from the start square to the end square and drawing the stroke
        ctx.beginPath();
        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.strokeStyle = color || "#cc0000";
        ctx.lineWidth = lineWidth || 22;
        ctx.stroke();

        //starting a new path from the head of the arrow to one of the sides of the point
        ctx.beginPath();
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),toy-headlen*Math.sin(angle-Math.PI/7));

        //path from the side point of the arrow, to the other side point
        ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/7),toy-headlen*Math.sin(angle+Math.PI/7));

        //path from the side point back to the tip of the arrow, and then again to the opposite side point
        ctx.lineTo(tox, toy);
        ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/7),toy-headlen*Math.sin(angle-Math.PI/7));

        //draws the paths created above
        ctx.strokeStyle = color || "#cc0000";
        ctx.lineWidth = lineWidth || 22;
        ctx.stroke();
        ctx.fillStyle = color || "#cc0000";
        ctx.fill();
    }
    
    exports.initFeature = initFeature;

}(realityEditor.gui.ar.frameHistoryRenderer));


/**
 * @desc
 * @return {Boolean} whether to continue the update loop (defaults true, return false if you remove the activeVehicle during this loop)
 **/

realityEditor.gui.ar.draw.drawTransformed12341324 = function (visibleObjects, objectKey, activeKey, activeType, activeVehicle, notLoading, globalDOMCache, globalStates, globalCanvas, activeObjectMatrix, matrix, finalMatrix, utilities, nodeCalculations, cout) {
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

            if (!container) {
                activeVehicle.loaded = false;
                return true;
            }

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

            // safety mechanism to prevent bugs where tries to manipulate a DOM element that doesn't exist
            if (!globalDOMCache["object" + activeKey]) {
                activeVehicle.visible = false;
                return true;
            }

            if (shouldRenderFramesInNodeView) {
                globalDOMCache["object" + activeKey].classList.remove('displayNone');
            }

            if (activeKey === globalStates.inTransitionFrame) {
                globalDOMCache["iframe" + activeKey].classList.add('inTransitionFrame');
            } else {
                globalDOMCache["iframe" + activeKey].classList.remove('inTransitionFrame');
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
                        if (frame.location !== 'local') {
                            finalOffsetX = finalOffsetX /* * (parentFramePositionData.scale/globalStates.defaultScale) */ + parentFramePositionData.x;
                            finalOffsetY = finalOffsetY /* * (parentFramePositionData.scale/globalStates.defaultScale) */ + parentFramePositionData.y;
                        }
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

            var LOCK_FEATURE_ENABLED = false;

            if (LOCK_FEATURE_ENABLED) {
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

        }

    } else if (activeType === "ui" && activeVehicle.visualization === "screen") {
        // if (shouldRenderFramesInNodeView) {
        this.hideScreenFrame(activeKey);
        // }
    }

    return true;

};

