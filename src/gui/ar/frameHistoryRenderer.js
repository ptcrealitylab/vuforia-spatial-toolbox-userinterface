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
    var missingLinksToDraw = [];

    var privateState = {
        visibleObjects: {},
        ghostsAdded: []
    };

    /**
     * Public init method to enable rendering ghosts of edited frames while in editing mode.
     */
    function initFeature() {

        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
            
            if (globalStates.editingMode) {

                missingLinksToDraw = [];

                if (globalStates.guiState === 'ui') {
                    hideNodeGhosts(visibleObjects);
                    renderFrameGhostsForVisibleObjects(visibleObjects);
                    
                } else if (globalStates.guiState === 'node') {
                    hideFrameGhosts(visibleObjects);
                    renderNodeGhostsForVisibleObjects(visibleObjects);
                    
                    renderLinkGhostsForVisibleObjects(visibleObjects);
                }

                // remove all ghosts when an object loses visibility

                removeGhostsOfInvisibleObjects(visibleObjects);
                // removeGhostsOfOldCommits();

                // draw linesToDraw on canvas

                drawLinesFromGhosts();
                drawMissingLinks();
                
                privateState.visibleObjects = visibleObjects;
                
            } else {
                hideAllGhosts();
                // hideFrameGhosts(visibleObjects);
                // hideNodeGhosts(visibleObjects);
            }
            
        });
    }

    /**
     * Helper function to remove any ghost frame/node/link that is currently added to the scene
     */
    function hideAllGhosts() {
        privateState.ghostsAdded.forEach(function(ghostKey) {
            hideGhost(ghostKey);
        });
    }

    /**
     * For every visible object, iterates over its framesHistory to remove any ghost frames
     * @param {Object.<string, Array.<number>>} visibleObjects
     */
    function hideFrameGhosts(visibleObjects) {

        for (var objectKey in visibleObjects) {
            if (!visibleObjects.hasOwnProperty(objectKey)) continue;
            var thisObject = realityEditor.getObject(objectKey);

            // framesHistory will contain a key/object pair for each frame that existed at the last commit
            if (thisObject.hasOwnProperty('framesHistory')) {
                var frameHistory = thisObject.framesHistory;
                
                for (ghostFrameKey in frameHistory) {
                    if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;
                    
                    hideGhost(ghostFrameKey);
                }
            }
        }
        
        // also needs to reset any lines drawn from old frame position to new frame position
        linesToDraw = [];
    }

    /**
     * For every visible object, iterates over every node within every frame in its framesHistory to remove ghost nodes
     * @param {Object.<string, Array.<number>>} visibleObjects
     */
    function hideNodeGhosts(visibleObjects) {

        for (var objectKey in visibleObjects) {
            if (!visibleObjects.hasOwnProperty(objectKey)) continue;

            var thisObject = realityEditor.getObject(objectKey);

            // framesHistory will contain a key/object pair for each frame that existed at the last commit
            if (thisObject.hasOwnProperty('framesHistory')) {
                var frameHistory = thisObject.framesHistory;

                for (var ghostFrameKey in frameHistory) {
                    if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;

                    var ghostFrame = frameHistory[ghostFrameKey];
                    
                    // hide the ghost for any nodes that that the ghost frame contains
                    for (var ghostNodeKey in ghostFrame.nodes) {
                        if (!ghostFrame.nodes.hasOwnProperty(ghostNodeKey)) continue;

                        hideGhost(ghostNodeKey);
                    }
                }
            }
        }

        linesToDraw = [];
    }

    /**
     * Populates a list of missingLinksToDraw (links that you've deleted since the last commit),
     *   by comparing the links that existed at the last commit with those that currently exist
     * @param {Object.<string, Array.<number>>} visibleObjects
     */
    function renderLinkGhostsForVisibleObjects(visibleObjects) {
        
        for (var objectKey in visibleObjects) {
            if (!visibleObjects.hasOwnProperty(objectKey)) continue;

            var thisObject = realityEditor.getObject(objectKey);

            if (thisObject.hasOwnProperty('framesHistory')) {
                var frameHistory = thisObject.framesHistory;

                for (var frameKey in frameHistory) {
                    if (!frameHistory.hasOwnProperty(frameKey)) continue;
                    
                    // iterate over all links in the last commit
                    for (var linkKey in frameHistory[frameKey].links) {
                        if (!frameHistory[frameKey].links.hasOwnProperty(linkKey)) continue;

                        var ghostLink = frameHistory[frameKey].links[linkKey];
                        
                        var realFrame = realityEditor.getFrame(objectKey, frameKey);
                        var wasFrameDeleted = !realFrame;
                        
                        // if we deleted the frame since the last commit, don't bother rendering its old links
                        if (!wasFrameDeleted) {
                            var realLink = realFrame.links[linkKey];
                            
                            // if an old link existed and it doesn't anymore, record its start and endpoint coordinates
                            if (ghostLink && !realLink) {

                                var startNode = realityEditor.getNode(ghostLink.objectA, ghostLink.frameA, ghostLink.nodeA);
                                var endNode = realityEditor.getNode(ghostLink.objectB, ghostLink.frameB, ghostLink.nodeB);
                                
                                if (startNode && endNode) {
                                    missingLinksToDraw.push({
                                        startX: startNode.screenX,
                                        startY: startNode.screenY,
                                        endX: endNode.screenX,
                                        endY: endNode.screenY
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        
    }

    /**
     * For every frame on every visible object, renders dotted line outlines for its nodes that have been deleted or
     * moved since the previous commit.
     * Also draws dotted arrow lines from old node positions to new node positions if they have been moved.
     * @param {Object.<string, Array.<number>>} visibleObjects
     */
    function renderNodeGhostsForVisibleObjects(visibleObjects) {

        // reset linesToDraw, which will be populated with lines from old (ghost) node positions to new node positions
        linesToDraw = [];

        for (var objectKey in visibleObjects) {
            if (!visibleObjects.hasOwnProperty(objectKey)) continue;

            var thisObject = realityEditor.getObject(objectKey);

            if (thisObject.hasOwnProperty('framesHistory')) {
                var frameHistory = thisObject.framesHistory;

                for (var ghostFrameKey in frameHistory) {
                    if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;
                    
                    // get the ghost frame and check if it still exists
                    var ghostFrame = frameHistory[ghostFrameKey];
                    var wasFrameDeleted = !realityEditor.getFrame(objectKey, ghostFrameKey);

                    for (var ghostNodeKey in ghostFrame.nodes) {
                        if (!ghostFrame.nodes.hasOwnProperty(ghostNodeKey)) continue;
                        
                        // get the ghost node and its corresponding current node
                        var ghostNode = ghostFrame.nodes[ghostNodeKey];
                        var realNode = realityEditor.getNode(objectKey, ghostFrameKey, ghostNodeKey);
                        
                        var wasNodeDeleted = !realNode;

                        // if neither the frame nor the node have been deleted since the last commit,
                        //   get the positions of the node then and now
                        if (!wasFrameDeleted && !wasNodeDeleted) {
                            var ghostPosition = JSON.parse(JSON.stringify(realityEditor.gui.ar.positioning.getPositionData(ghostNode)));
                            var realPosition = JSON.parse(JSON.stringify(realityEditor.gui.ar.positioning.getPositionData(realNode)));
                        }

                        // we need to render a ghost outline at the old node position if:
                        //   1) we deleted the frame that contains it
                        //   2) we deleted the node itself
                        //   3) the node was repositioned (x, y, scale, or matrix)
                        if (wasFrameDeleted || wasNodeDeleted || didPositionChange(ghostPosition, realPosition)) {

                            // actually draw the outline as a DOM element
                            renderGhost(objectKey, ghostFrameKey, ghostNodeKey, ghostFrame, ghostNode, visibleObjects[objectKey], wasFrameDeleted || wasNodeDeleted);

                            // in addition to rendering a ghost outline, we should draw a line from the old position to the new position,
                            //   if the reason for drawing the ghost was that it was repositioned (not deleted)
                            if (!wasFrameDeleted && !wasNodeDeleted) {
                                linesToDraw.push({
                                    startX: ghostNode.screenX,
                                    startY: ghostNode.screenY,
                                    endX: realNode.screenX,
                                    endY: realNode.screenY
                                });
                            }

                        } else {
                            // if we shouldn't render the ghost, make sure the ghost is hidden
                            hideGhost(ghostNodeKey);
                        }
                    }
                }
            }
        }
    }
    
    /**
     *
     * @param {Object.<string, Array.<number>>} visibleObjects
     */
    function renderFrameGhostsForVisibleObjects(visibleObjects) {

        // reset linesToDraw, which will be populated with lines from old (ghost) frame positions to new frame positions
        linesToDraw = [];

        for (var objectKey in visibleObjects) {
            if (!visibleObjects.hasOwnProperty(objectKey)) continue;

            var thisObject = realityEditor.getObject(objectKey);

            if (thisObject.hasOwnProperty('framesHistory')) {
                var frameHistory = thisObject.framesHistory;

                for (var ghostFrameKey in frameHistory) {
                    if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;

                    // get the ghost frame and its corresponding current frame
                    var ghostFrame = frameHistory[ghostFrameKey];
                    var realFrame = realityEditor.getFrame(objectKey, ghostFrameKey);
                    
                    var wasFrameDeleted = !realFrame;

                    // if the frame still exists, get the positions of the frame then and now
                    if (!wasFrameDeleted) {
                        var ghostPosition = realityEditor.gui.ar.positioning.getPositionData(ghostFrame);
                        var realPosition = realityEditor.gui.ar.positioning.getPositionData(realFrame);
                    }

                    // we need to render a ghost outline at the old node position if:
                    //   1) we deleted the frame
                    //   3) the frame was repositioned (x, y, scale, or matrix)
                    if (wasFrameDeleted || didPositionChange(ghostPosition, realPosition)) {
                        
                        // actually render the outline as a DOM element
                        renderGhost(objectKey, ghostFrameKey, null, ghostFrame, null, visibleObjects[objectKey], wasFrameDeleted);

                        // in addition to rendering a ghost outline, we should draw a line from the old position to the new position,
                        //   if the reason for drawing the ghost was that it was repositioned (not deleted)
                        if (!wasFrameDeleted) {
                            linesToDraw.push({
                                startX: ghostFrame.screenX,
                                startY: ghostFrame.screenY,
                                endX: realFrame.screenX,
                                endY: realFrame.screenY
                            });                            
                        }

                    } else {
                        // if we shouldn't render the ghost, make sure the ghost is hidden
                        hideGhost(ghostFrameKey);
                    }
                }
            }
        }
    }

    /**
     * If an object was visible last frame (and therefore may have ghosts rendered), but it it not visible this frame,
     * hide every ghost it might have
     * @param {Object.<string, Array.<number>>} visibleObjects
     */
    function removeGhostsOfInvisibleObjects(visibleObjects) {

        // look at all objects that were visible last frame
        for (var oldObjectKey in privateState.visibleObjects) {
            if (!privateState.visibleObjects.hasOwnProperty(oldObjectKey)) continue;

            // only remove ones that don't exist anymore
            if (!visibleObjects.hasOwnProperty(oldObjectKey)) {

                thisObject = realityEditor.getObject(oldObjectKey);

                if (thisObject.hasOwnProperty('framesHistory')) {
                    frameHistory = thisObject.framesHistory;

                    // hide each frame ghost that the newly-removed object had // TODO: do the node ghosts ever get hidden this way?
                    for (ghostFrameKey in frameHistory) {
                        if (!frameHistory.hasOwnProperty(ghostFrameKey)) continue;
                        hideGhost(ghostFrameKey);
                    }
                }
            }
        }
    }

    /**
     * A public function visible outside of the module that can be used to force hide (and subsequently re-render) every
     * ghost DOM element. Should be triggered when other modules can remove ghosts (e.g. the commit button pressed)
     * // TODO: eventually register a buttonPressed callback to invert the dependency
     */
    function refreshGhosts() {

        // gets the DOM ids of all ghost-related divs
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

    /**
     * Draws dotted arrows from start to end coordinates for any ghost frames/nodes that have been repositioned
     */
    function drawLinesFromGhosts() {
        linesToDraw.forEach(function(line) {
            // only draw lines if the node has moved a noticeable distance
            var distance = Math.sqrt( (line.startX - line.endX)*(line.startX - line.endX) + (line.startY - line.endY)*(line.startY - line.endY) );
            if (distance > 50) {
                drawArrow(globalCanvas.context, line.startX, line.startY, line.endX, line.endY, 'rgba(0, 0, 0, 0.5)', 1, 7);
                globalCanvas.hasContent = true; // need to set this flag to clear the canvas each frame
            }
        });
    }

    /**
     * Draws dotted arrows for each of the links that have been deleted since the last commit
     */
    function drawMissingLinks() {
        missingLinksToDraw.forEach(function(line) {
            drawArrow(globalCanvas.context, line.startX, line.startY, line.endX, line.endY, 'rgba(255, 0, 124, 0.5)', 1, 7);
            globalCanvas.hasContent = true; // need to set this flag to clear the canvas each frame
        });
    }

    /**
     * Renders a specific frame or node ghost DOM element by calculating its CSS3D transformation and creating the DOM
     * element if it doesn't already exist
     * @param {string} objectKey
     * @param {string} frameKey
     * @param {string|null} nodeKey - if null, renders a frame ghost, otherwise renders the node ghost
     * @param {Frame} ghostFrame
     * @param {Node|null} ghostNode
     * @param {Array.<number>} markerMatrix - the visibleObjects[objectKey] matrix
     * @param {boolean} wasFrameDeleted
     */
    function renderGhost(objectKey, frameKey, nodeKey, ghostFrame, ghostNode, markerMatrix, wasFrameDeleted) {
        
        // some logic lets us customize the same function to render ghosts for frames and nodes
        var isNode = !!nodeKey;
        var ghostVehicle = isNode ? ghostNode : ghostFrame;
        var activeKey = isNode ? nodeKey : frameKey;
        
        // don't render ghost until real frame is rendered (fixes bug)
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
        
        // nodes have a nested position within their containing frame
        if (isNode && ghostNode.type !== 'logic') {
            // var containingFramePosition = realityEditor.gui.ar.positioning.getPositionData(ghostFrame); // TODO: decide if this or the other.. using ghost frame shows actually where it will reset to, but using the realFrame better shows the movement you've done
            var containingFramePosition;
            if (!wasFrameDeleted) {
                var realFrame = realityEditor.getFrame(objectKey, frameKey);
                containingFramePosition = realityEditor.gui.ar.positioning.getPositionData(realFrame);
            } else {
                containingFramePosition = realityEditor.gui.ar.positioning.getPositionData(ghostFrame);
            }
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

        // multiply (marker modelview) * (projection) * (screen rotation) * (vehicle.matrix) * (transformation)

        utilities.multiplyMatrix(markerMatrix, globalStates.projectionMatrix, tempResMatrix);
        utilities.multiplyMatrix(rotateX, tempResMatrix, activeObjectMatrix);
        
        var finalMatrix = [];
        if (typeof ghostPosition.matrix !== 'undefined' && ghostPosition.matrix.length === 16) {
            utilities.multiplyMatrix(ghostPosition.matrix, activeObjectMatrix, tempResMatrix);
            utilities.multiplyMatrix(transformationMatrix, tempResMatrix, finalMatrix);
        } else {
            utilities.multiplyMatrix(transformationMatrix, activeObjectMatrix, finalMatrix);
        }
        
        // adjust Z-index so it gets rendered behind all the real frames/nodes
        // calculate center Z of frame to know if it is mostly in front or behind the marker plane
        var projectedPoint = realityEditor.gui.ar.utilities.multiplyMatrix4([0, 0, 0, 1], activeObjectMatrix);
        finalMatrix[14] = 1000000 / Math.max(10, projectedPoint[2]); // (don't add extra 200) so it goes behind real

        // actually adjust the CSS to draw it with the correct transformation
        globalDOMCache['ghost' + activeKey].style.webkitTransform = 'matrix3d(' + finalMatrix.toString() + ')';

        // store the screenX and screenY within the ghost to help us later draw lines to the ghosts
        var ghostCenterPosition = getDomElementCenterPosition(globalDOMCache['ghost' + activeKey]);
        ghostVehicle.screenX = ghostCenterPosition.x;
        ghostVehicle.screenY = ghostCenterPosition.y;
    }

    /**
     * Remove the DOM element for the ghost of this frame or node, if it exists.
     * Also remove this frame/node from the ghostsAdded list.
     * @param {string} vehicleKey
     */
    function hideGhost(vehicleKey) {
        
        if (globalDOMCache['ghost' + vehicleKey]) {
            // remove the DOM element
            globalDOMCache['ghost' + vehicleKey].parentNode.removeChild(globalDOMCache['ghost' + vehicleKey]);
            delete globalDOMCache['ghost' + vehicleKey];

            // remove from ghostsAdded list
            var index = privateState.ghostsAdded.indexOf(vehicleKey);
            if (index !== -1) privateState.ghostsAdded.splice(index, 1);
        }
        
    }

    /**
     * Creates a dotted-outline DOM element for the given frame or node, using its width and height.
     * Styles it differently (red) if the reason for the ghost is that the frame/node was deleted.
     * Also add it to the ghostsAdded list, to keep track of which ghosts are in existence.
     * @param {string} objectKey
     * @param {string} vehicleKey
     * @param {boolean} wasFrameDeleted
     */
    function createGhostElement(objectKey, vehicleKey, wasFrameDeleted) {
        
        var ghostDiv = document.createElement('div');
        ghostDiv.id = 'ghost' + vehicleKey;
        ghostDiv.classList.add('frameHistoryGhost', 'main', 'ignorePointerEvents', 'visibleFrameContainer');
        if (wasFrameDeleted) {
            ghostDiv.classList.add('frameHistoryGhostDeleted');
        }
        
        // we use the width and height of the real frame DOM element to make this one match that size // TODO: check, does this still work when the real frame was deleted?
        if (globalDOMCache['iframe' + vehicleKey]) {
            ghostDiv.style.width = parseInt(globalDOMCache['iframe' + vehicleKey].style.width) + 'px';
            ghostDiv.style.height = parseInt(globalDOMCache['iframe' + vehicleKey].style.height) + 'px';
            ghostDiv.style.left = parseInt(globalDOMCache['iframe' + vehicleKey].style.left) + 'px';
            ghostDiv.style.top = parseInt(globalDOMCache['iframe' + vehicleKey].style.top) + 'px';
        }
        document.getElementById('GUI').appendChild(ghostDiv);
        globalDOMCache['ghost' + vehicleKey] = ghostDiv;
        
        // maintain a ghostsAdded list so that we can remove them all on demand
        privateState.ghostsAdded.push(vehicleKey);
    }

    /**
     * Utility function tells if the two positions are different. Defaults to false if either is null.
     * @param {{x: number, y: number, scale: number, matrix: Array.<number>}} oldPosition
     * @param {{x: number, y: number, scale: number, matrix: Array.<number>}} newPosition
     * @return {boolean}
     */
    function didPositionChange(oldPosition, newPosition) {
        if (!oldPosition || !newPosition) return false;
        
        return (oldPosition.x !== newPosition.x ||
                oldPosition.y !== newPosition.y ||
                oldPosition.scale !== newPosition.scale ||
                JSON.stringify(oldPosition.matrix) !== JSON.stringify(newPosition.matrix)
        );
    }

    /**
     * Utility function gets the approximate center (x,y) position of the DOM element, by querying the DOM clientRects
     * @param {HTMLElement} domElement
     * @return {{x: number, y: number}}
     */
    function getDomElementCenterPosition(domElement) {
        return {
            x: domElement.getClientRects()[0].left + domElement.getClientRects()[0].width/2,
            y: domElement.getClientRects()[0].top + domElement.getClientRects()[0].height/2
        }
    }

    /**
     * Draws a line with an arrow head on the provided canvas context.
     * @param {CanvasRenderingContext2D} ctx - HTML5 Canvas context to draw on
     * @param {number} startX
     * @param {number} startY
     * @param {number} endX
     * @param {number} endY
     * @param {string} color
     * @param {number} lineWidth
     * @param {number} headLength
     */
    function drawArrow(ctx, startX, startY, endX, endY, color, lineWidth, headLength){
        // variables to be used when creating the arrow
        var headlen = headLength || 10;
        var angle = Math.atan2(endY-startY,endX-startX);

        // starting path of the arrow from the start square to the end square and drawing the stroke
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = color || "#cc0000";
        ctx.lineWidth = lineWidth || 22;
        ctx.setLineDash([lineWidth * 3]);
        ctx.stroke();

        // starting a new path from the head of the arrow to one of the sides of the point
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX-headlen*Math.cos(angle-Math.PI/7),endY-headlen*Math.sin(angle-Math.PI/7));

        // path from the side point of the arrow, to the other side point
        ctx.lineTo(endX-headlen*Math.cos(angle+Math.PI/7),endY-headlen*Math.sin(angle+Math.PI/7));

        // path from the side point back to the tip of the arrow, and then again to the opposite side point
        ctx.lineTo(endX, endY);
        ctx.lineTo(endX-headlen*Math.cos(angle-Math.PI/7),endY-headlen*Math.sin(angle-Math.PI/7));

        // draws the paths created above
        ctx.strokeStyle = color || "#cc0000";
        ctx.lineWidth = lineWidth || 22;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.fillStyle = color || "#cc0000";
        ctx.fill();
    }
    
    function onResetButtonPressed() {
        for (var objectKey in objects) {
            if (!objects.hasOwnProperty(objectKey)) continue;
            // only reset currently visible objects to their last commit, not everything
            if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) continue;

            realityEditor.network.sendResetToLastCommit(objectKey);
        }

        refreshGhosts();
    }
    
    function onCommitButtonPressed() {
        var objectKeysToDelete = [];
        for (var objectKey in objects) {
            if (!objects.hasOwnProperty(objectKey)) continue;
            // only commit currently visible objects, not everything
            if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) continue;
            objectKeysToDelete.push(objectKey);
        }

        var objectNames = objectKeysToDelete.map(function(objectKey) {
            return realityEditor.getObject(objectKey).name;
        });

        var description = 'The following objects will be saved: ' + objectNames.join(', ');
        console.log(description);

        realityEditor.gui.modal.openRealityModal('Cancel', 'Overwrite Saved State', function() {
            console.log('commit cancelled');
        }, function() {
            console.log('commit confirmed!');

            objectKeysToDelete.forEach(function(objectKey) {
                realityEditor.network.sendSaveCommit(objectKey);
                // update local history instantly so that client and server are synchronized
                var thisObject = realityEditor.getObject(objectKey);
                thisObject.framesHistory = JSON.parse(JSON.stringify(thisObject.frames));
                refreshGhosts();
            });

        });
    }
    
    exports.initFeature = initFeature;
    exports.onResetButtonPressed = onResetButtonPressed;
    exports.onCommitButtonPressed = onCommitButtonPressed;

}(realityEditor.gui.ar.frameHistoryRenderer));
