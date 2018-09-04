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
        visibleObjects: {}
    };

    function initFeature() {

        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
            
            if (globalStates.editingMode) {

                if (globalStates.guiState === 'ui') {
                    hideNodeGhosts(visibleObjects);
                    renderGhostsForVisibleObjects(visibleObjects);
                    
                } else if (globalStates.guiState === 'node') {
                    hideFrameGhosts(visibleObjects);
                    renderNodeGhostsForVisibleObjects(visibleObjects);
                }

                // remove all ghosts when an object loses visibility

                removeGhostsOfInvisibleObjects(visibleObjects);
                // removeGhostsOfOldCommits();

                // draw linesToDraw on canvas

                drawLinesFromGhosts();
                
                privateState.visibleObjects = visibleObjects;
                
            }
            
        });
    }
    
    function hideFrameGhosts(visibleObjects) {

        for (var objectKey in visibleObjects) {
            if (!visibleObjects.hasOwnProperty(objectKey)) continue;

            var thisObject = realityEditor.getObject(objectKey);

            if (thisObject.hasOwnProperty('framesHistory')) {
                var frameHistory = thisObject.framesHistory;

                for (ghostFrameKey in frameHistory) {
                    if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;

                    hideGhost(ghostFrameKey);
                }
            }
        }
        
        linesToDraw = [];
        
    }
    
    function hideNodeGhosts(visibleObjects) {

        for (var objectKey in visibleObjects) {
            if (!visibleObjects.hasOwnProperty(objectKey)) continue;

            var thisObject = realityEditor.getObject(objectKey);

            if (thisObject.hasOwnProperty('framesHistory')) {
                var frameHistory = thisObject.framesHistory;

                for (var ghostFrameKey in frameHistory) {
                    if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;

                    var ghostFrame = frameHistory[ghostFrameKey];
                    
                    for (var ghostNodeKey in ghostFrame.nodes) {
                        if (!ghostFrame.nodes.hasOwnProperty(ghostNodeKey)) continue;

                        hideGhost(ghostNodeKey);
                    }
                }
            }
        }

        linesToDraw = [];
        
    }

    function renderNodeGhostsForVisibleObjects(visibleObjects) {

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

                    var wasFrameDeleted = !realFrame;

                    for (var ghostNodeKey in ghostFrame.nodes) {
                        if (!ghostFrame.nodes.hasOwnProperty(ghostNodeKey)) continue;
                            
                        var ghostNode = ghostFrame.nodes[ghostNodeKey];
                        var realNode = realityEditor.getNode(objectKey, ghostFrameKey, ghostNodeKey);
                        
                        var ghostPosition;
                        var realPosition;

                        var wasNodeDeleted = !realNode;

                        if (!wasFrameDeleted && !wasNodeDeleted) {
                            // var ghostFramePosition = JSON.parse(JSON.stringify(realityEditor.gui.ar.positioning.getPositionData(ghostFrame)));
                            // var realFramePosition = JSON.parse(JSON.stringify(realityEditor.gui.ar.positioning.getPositionData(realFrame)));

                            ghostPosition = JSON.parse(JSON.stringify(realityEditor.gui.ar.positioning.getPositionData(ghostNode)));
                            // ghostPosition.x += ghostFramePosition.x;
                            // ghostPosition.y += ghostFramePosition.y;
                            // ghostPosition.scale *= (ghostFramePosition.scale/globalStates.defaultScale);

                            realPosition = JSON.parse(JSON.stringify(realityEditor.gui.ar.positioning.getPositionData(realNode)));
                            // realPosition.x += realFramePosition.x;
                            // realPosition.y += realFramePosition.y;
                            // realPosition.scale *= (realFramePosition.scale/globalStates.defaultScale);
                        }

                        if (wasFrameDeleted || wasNodeDeleted || didPositionChange(ghostPosition, realPosition)) {

                            renderGhost(objectKey, ghostFrameKey, ghostNodeKey, ghostFrame, ghostNode, visibleObjects[objectKey], wasFrameDeleted || wasNodeDeleted);

                            if (!wasFrameDeleted && !wasNodeDeleted) {
                                linesToDraw.push({
                                    startX: ghostNode.screenX,
                                    startY: ghostNode.screenY,
                                    endX: realNode.screenX,
                                    endY: realNode.screenY
                                });
                            }

                        } else {

                            hideGhost(ghostNodeKey);

                        }
                        
                    }

                }
            }
        }
        
    }


    function renderGhostsForVisibleObjects(visibleObjects) {

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
                    
                    var wasFrameDeleted = !realFrame;
                    
                    var ghostPosition;
                    var realPosition;
                    
                    if (!wasFrameDeleted) {
                        ghostPosition = realityEditor.gui.ar.positioning.getPositionData(ghostFrame);
                        realPosition = realityEditor.gui.ar.positioning.getPositionData(realFrame);
                    }

                    if (wasFrameDeleted || didPositionChange(ghostPosition, realPosition)) {
                        
                        renderGhost(objectKey, ghostFrameKey, null, ghostFrame, null, visibleObjects[objectKey], wasFrameDeleted);

                        if (!wasFrameDeleted) {
                            linesToDraw.push({
                                startX: ghostFrame.screenX,
                                startY: ghostFrame.screenY,
                                endX: realFrame.screenX,
                                endY: realFrame.screenY
                            });                            
                        }

                    } else {

                        hideGhost(ghostFrameKey);

                    }

                }
            }
        }
    }
    
    function removeGhostsOfInvisibleObjects(visibleObjects) {

        for (var oldObjectKey in privateState.visibleObjects) {
            if (!privateState.visibleObjects.hasOwnProperty(oldObjectKey)) continue;

            // only remove ones that don't exist anymore
            if (!visibleObjects.hasOwnProperty(oldObjectKey)) {

                thisObject = realityEditor.getObject(oldObjectKey);

                if (thisObject.hasOwnProperty('framesHistory')) {
                    frameHistory = thisObject.framesHistory;

                    for (ghostFrameKey in frameHistory) {
                        if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;

                        hideGhost(ghostFrameKey);
                    }
                }
            }
        }
    }

    function refreshGhosts() {

        var existingGhostFrameKeys = [].slice.apply(document.getElementById('GUI').children).map(function(elt){
            return elt.id;
        }).filter(function(id) {
            return id.indexOf('ghost') === 0;
        }).map(function(id) {
            return id.substring('ghost'.length);
        });

        existingGhostFrameKeys.forEach(function(frameKey) {
            hideGhost(frameKey);
        });
        
    }
    
    
    function drawLinesFromGhosts() {

        linesToDraw.forEach(function(line) {

            var distance = Math.sqrt( (line.startX - line.endX)*(line.startX - line.endX) + (line.startY - line.endY)*(line.startY - line.endY) );

            if (distance > 50) {

                // var lineWidth = Math.max(1, Math.min(10, Math.sqrt(distance)/5));
                var lineWidth = 1;

                drawArrow(globalCanvas.context, line.startX, line.startY, line.endX, line.endY, 'rgba(0, 0, 0, 0.5)', lineWidth, 7);
                globalCanvas.hasContent = true;
            }

        });
        
    }
    //
    // function renderNodeGhost(objectKey, frameKey, nodeKey, ghostNode, markerMatrix, wasFrameDeleted, wasNodeDeleted) {
    //    
    // }
    
    function renderGhost(objectKey, frameKey, nodeKey, ghostFrame, ghostNode, markerMatrix, wasFrameDeleted) {
        
        var isNode = !!nodeKey;
        var ghostVehicle = isNode ? ghostNode : ghostFrame;
        var activeKey = isNode ? nodeKey : frameKey;
        
        // don't render ghost until real frame is rendered
        if (!globalDOMCache['iframe' + activeKey] && !wasFrameDeleted) {
            return;
        }
        
        // recreate ghost for deleted frame so it changes color
        if (wasFrameDeleted && globalDOMCache['ghost' + activeKey]) {
            if (!globalDOMCache['ghost' + activeKey].classList.contains('frameHistoryGhostDeleted')) {
                // hideGhost(objectKey, frameKey);
                globalDOMCache['ghost' + activeKey].classList.add('frameHistoryGhostDeleted');
            }
        }
        
        // create div for ghost if needed
        if (!globalDOMCache['ghost' + activeKey]) {
            createGhostElement(objectKey, activeKey, wasFrameDeleted);
        }
        
        // compute CSS matrix from ghost ar.x, ar.y, ar.scale, ar.matrix

        var ghostPosition = realityEditor.gui.ar.positioning.getPositionData(ghostVehicle);
        
        var containingPosition = {
            x: 0,
            y: 0,
            scale: 1
        };
        
        if (isNode && ghostNode.type !== 'logic') {
            // var containingFramePosition = realityEditor.gui.ar.positioning.getPositionData(ghostFrame); // TODO: decide if this or the other.. using ghost frame shows actually where it will reset to, but using the realFrame better shows the movement you've done
            var realFrame = realityEditor.getFrame(objectKey, frameKey);
            var containingFramePosition = realityEditor.gui.ar.positioning.getPositionData(realFrame);
            containingPosition.x += containingFramePosition.x;
            containingPosition.y += containingFramePosition.y;
            containingPosition.scale *= (containingFramePosition.scale/globalStates.defaultScale);
        }

        var transformationMatrix = [
            ghostPosition.scale * containingPosition.scale , 0, 0, 0,
            0, ghostPosition.scale * containingPosition.scale, 0, 0,
            0, 0, 1, 0,
            ghostPosition.x + containingPosition.x, ghostPosition.y + containingPosition.y, 0, 1
        ];
        
        utilities.multiplyMatrix(markerMatrix, globalStates.projectionMatrix, tempResMatrix);
        utilities.multiplyMatrix(rotateX, tempResMatrix, activeObjectMatrix);

        // ghostVehicle.screenX = activeObjectMatrix[12] / activeObjectMatrix[15] + (globalStates.height / 2);
        // ghostVehicle.screenY = activeObjectMatrix[13] / activeObjectMatrix[15] + (globalStates.width / 2);
        
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
        globalDOMCache['ghost' + activeKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';
        
        var ghostCenterPosition = getDomElementCenterPosition(globalDOMCache['ghost' + activeKey]);
        ghostVehicle.screenX = ghostCenterPosition.x;
        ghostVehicle.screenY = ghostCenterPosition.y;
    }
    
    function hideGhost(vehicleKey) {
        
        if (globalDOMCache['ghost' + vehicleKey]) {
            globalDOMCache['ghost' + vehicleKey].parentNode.removeChild(globalDOMCache['ghost' + vehicleKey]);
            delete globalDOMCache['ghost' + vehicleKey];
        }
        
    }
    
    function createGhostElement(objectKey, frameKey, wasFrameDeleted) {
        
        var ghostDiv = document.createElement('div');
        ghostDiv.id = 'ghost' + frameKey;
        ghostDiv.classList.add('frameHistoryGhost', 'main', 'ignorePointerEvents', 'visibleFrameContainer');
        if (wasFrameDeleted) {
            ghostDiv.classList.add('frameHistoryGhostDeleted');
        }
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
        ctx.setLineDash([lineWidth * 3]);
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
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.fillStyle = color || "#cc0000";
        ctx.fill();
    }
    
    exports.initFeature = initFeature;
    exports.refreshGhosts = refreshGhosts;

}(realityEditor.gui.ar.frameHistoryRenderer));

