createNameSpace("realityEditor.gui.ar.grouping");

/**
 * @fileOverview realityEditor.grouping.js
 * Contains functions that render groups and selection GUI
 * as well as creating groups.
 * Registers callback listeners for rendering and touch events to keep dependencies acyclic
 */

(function(exports) {
    
    /**
     * Keeps track of where the line starts
     * @type {Array.<Array.<number>>}
     */
    var points = [];

    /**
     * Keeps track of the lasso polyline
     * @type {SVGPolylineElement|null}
     */
    var lasso = null;

    /**
     * @type {Boolean} Whether a tap has already occurred and is set to be a double tap
     */
    var isDoubleTap = false;

    /**
     * @type {{active: Boolean, object: Array.<string>, frame: Array.<string>}}
     * object and frame currently not in use
     */
    var selectingState = {
        active: false,
        object: [],
        frame: []
    };

    /**
     * @type {boolean}
     */
    var isUnconstrainedEditingGroup = false;
    
    /**
     * Initialize the grouping feature regardless of whether it is enabled onLoad
     * Subscribe to touches and rendering events, and a variety of other frame events,
     * but only respond to them if the grouping feature is currently enabled at the time of the event
     */
    function initFeature() {
        
        // render hulls on every update (iff grouping mode enabled)
        realityEditor.gui.ar.draw.addUpdateListener(function() {
            if (globalStates.groupingEnabled) {
                
                // draw hulls if any of their elements are being moved, or if the lasso is active
                var shouldDrawHulls = false;
                if (selectingState.active) {
                    shouldDrawHulls = true;
                }
                if (realityEditor.device.editingState.frame) {
                    shouldDrawHulls = true;
                }

                var svg = document.getElementById("groupSVG");
                if (shouldDrawHulls) {
                    if (svg.classList.contains('groupOutlineFadeOut')) {
                        svg.classList.remove('groupOutlineFadeOut');
                    }
                } else {
                    if (!svg.classList.contains('groupOutlineFadeOut')) {
                        svg.classList.add('groupOutlineFadeOut');
                    }
                    // clearHulls(svg);
                }

                drawGroupHulls();

                if (isUnconstrainedEditingGroup && !realityEditor.device.editingState.unconstrainedDisabled) {
                    var activeVehicle = realityEditor.device.getEditingVehicle();
                    var activeVehicleMatrix = realityEditor.gui.ar.positioning.getPositionData(activeVehicle).matrix;
                    forEachGroupedFrame(activeVehicle, function(frame) {
                        var newMatrix = [];
                        realityEditor.gui.ar.utilities.multiplyMatrix(activeVehicleMatrix, frame.startingMatrixOffset, newMatrix);
                        realityEditor.gui.ar.positioning.setPositionDataMatrix(frame, newMatrix);
                    }, true);

                    var isSingleTouch = realityEditor.device.currentScreenTouches.length === 1;
                    if (activeVehicle && isSingleTouch) {
                        // var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                        var touchPosition = realityEditor.device.currentScreenTouches[0].position; // need to retrieve this way instead of CSS of overlayDiv to support multitouch
                        // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinateBasedOnMarker(thisFrame, touchPosition.x, touchPosition.y, false);
                        moveGroupedVehiclesIfNeeded(activeVehicle, touchPosition.x, touchPosition.y);
                    }
                }
            }
        });

        // -- be notified when certain touch event functions get triggered in device/index.js -- //
        
        // on touch down, start creating a lasso if you double tap on the background
        realityEditor.device.registerCallback('onDocumentMultiTouchStart', function(params) {
            if (globalStates.groupingEnabled) {
                console.log('grouping.js: onDocumentMultiTouchStart', params);
                
                // If the event is hitting the background and it isn't the multi-touch to scale an object
                if (realityEditor.device.utilities.isEventHittingBackground(params.event)) {
                    if (params.event.touches.length < 2) {
                        console.log('did tap on background in grouping mode');

                        // handling double taps
                        if (!isDoubleTap) { // on first tap
                            isDoubleTap = true;

                            // if no follow up tap within time reset
                            setTimeout(function() {
                                isDoubleTap = false;
                            }, 300);
                        } else { // registered double tap and start drawing selection lasso
                            selectingState.active = true;
                            var svg = document.getElementById("groupSVG");
                            //TODO: start drawing
                            startLasso(params.event.pageX, params.event.pageY);
                        }
                    }
                }

            }
            
        });
        
        // on touch move, continue drawing a lasso. or if you're selecting a grouped frame, move all grouped frames
        realityEditor.device.registerCallback('onDocumentMultiTouchMove', function(params) {
            if (globalStates.groupingEnabled) {
                // console.log('grouping.js: onDocumentMultiTouchMove', params);
                
                if (selectingState.active) {
                    continueLasso(params.event.pageX, params.event.pageY);
                }

                var activeVehicle = realityEditor.device.getEditingVehicle();
                var isSingleTouch = params.event.touches.length === 1;
                
                if (activeVehicle && isSingleTouch) {
                    // also move group objects too
                    var touchPosition = realityEditor.device.currentScreenTouches[0].position;
                    moveGroupedVehiclesIfNeeded(activeVehicle, touchPosition.x,touchPosition.y);
                    // moveGroupedVehiclesIfNeeded(activeVehicle, params.event.pageX, params.event.pageY);
                }

            }
            
        });
        
        // on touch up finish the lasso and create a group out of encircled frames. or stop moving grouped frames.
        realityEditor.device.registerCallback('onDocumentMultiTouchEnd', function(params) {
            if (globalStates.groupingEnabled) {
                console.log('grouping.js: onDocumentMultiTouchEnd', params);
                
                if (selectingState.active) {
                    selectingState.active = false;
                    closeLasso();

                    var selected = getLassoed();
                    selectFrames(selected);
                    // TODO: get selected => select
                }
                
                var activeVehicle = realityEditor.device.getEditingVehicle();
                console.log('onDocumentMultiTouchEnd', params, activeVehicle);

                // check how many touches are still on the canvas / on the frame
                // if there's still a touch on it (it was being scaled or distance scaled), reset touch offset so vehicle doesn't jump
                if (realityEditor.device.currentScreenTouches.length > 0) {
                    forEachGroupedFrame(activeVehicle, function(frame) {
                        frame.groupTouchOffset = undefined; // recalculate groupTouchOffset each time
                    });
                }
            }
        });
        
        // todo: decide if this can be removed entirely or if it should still be implemented
        realityEditor.device.registerCallback('beginTouchEditing', function(params) {
            
            console.log('TODO: set move overlays on for other nodes in group', params);
            // document.getElementById('svg' + (nodeKey || frameKey)).style.display = 'inline';
            // document.getElementById('svg' + (nodeKey || frameKey)).style.pointerEvents = 'all';
            //
            // // set move overlays on for other nodes in group
            // if (activeVehicle.groupID !== null) {
            //     console.log("BEGIN GROUP EDITING");
            //     let groupMembers = realityEditor.gui.ar.grouping.getGroupMembers(activeVehicle.groupID);
            //     for (let member of groupMembers) {
            //         document.getElementById('svg' + member.frame).style.display = 'inline';
            //         document.getElementById('svg' + member.frame).style.pointerEvents = 'all';
            //     }
            // }
        });

        // when you stop moving around a frame, clear some state and post the new positions of all grouped frames to the server
        realityEditor.device.registerCallback('resetEditingState', function(params) {
            isUnconstrainedEditingGroup = false;

            var activeVehicle = realityEditor.device.getEditingVehicle();
            if (!activeVehicle) { return; }

            console.log('resetEditingState', params, activeVehicle);

            // clear the groupTouchOffset of each frame in the group
            // and post the new positions of each frame in the group to the server
            forEachGroupedFrame(activeVehicle, function(frame) {
                frame.groupTouchOffset = undefined; // recalculate groupTouchOffset each time

                var memberPositionData = realityEditor.gui.ar.positioning.getPositionData(frame);
                var memberContent = {};
                memberContent.x = memberPositionData.x;
                memberContent.y = memberPositionData.y;
                memberContent.scale = memberPositionData.scale;
                if (realityEditor.device.isEditingUnconstrained(activeVehicle)) {
                    memberContent.matrix = memberPositionData.matrix;
                }
                memberContent.lastEditor = globalStates.tempUuid;

                var memberUrlEndpoint = 'http://' + objects[frame.objectId].ip + ':' + httpPort + '/object/' + frame.objectId + "/frame/" + frame.uuid + "/node/null/size";
                // + "/node/" + this.editingState.node + routeSuffix;
                realityEditor.network.postData(memberUrlEndpoint, memberContent);
            }, false);
            
        });
        
        // unconstrained move grouped vehicles if needed by storing their initial matrix offset
        // TODO: also store this info when starting unconstrained editing via another method, e.g. editing mode
        realityEditor.device.registerCallback('onFramePulledIntoUnconstrained', function(params) {
            if (!globalStates.groupingEnabled) { return; }

            var activeVehicle = params.activeVehicle;
            forEachGroupedFrame(activeVehicle, function(frame) {
                // store relative offset
                var activeVehicleMatrix = realityEditor.gui.ar.positioning.getPositionData(activeVehicle).matrix;
                var groupedVehicleMatrix = realityEditor.gui.ar.positioning.getPositionData(frame).matrix;

                var startingMatrixOffset = [];
                realityEditor.gui.ar.utilities.multiplyMatrix(realityEditor.gui.ar.utilities.invertMatrix(activeVehicleMatrix), groupedVehicleMatrix, startingMatrixOffset);
                frame.startingMatrixOffset = startingMatrixOffset;
                
                isUnconstrainedEditingGroup = true;
            }, true);
        });

        // TODO: this method is a hack, implement in a better way making use of screenExtension module
        // push/pull grouped vehicles into screens together if needed
        realityEditor.gui.screenExtension.registerCallback('updateArFrameVisibility', function(params) {
            if (!globalStates.groupingEnabled) return;
                
            var selectedFrame = realityEditor.getFrame(params.objectKey, params.frameKey);
            if (selectedFrame && selectedFrame.groupID) {
                var newVisualization = params.newVisualization;
                forEachGroupedFrame(selectedFrame, function(groupedFrame) {

                    if (groupedFrame.visualization === newVisualization) { return; } // don't repeat for the originating frame or ones already transitioned

                    groupedFrame.visualization = newVisualization;

                    if (newVisualization === 'screen') {
                        
                        console.log('pushed grouped frame ' + groupedFrame.uuid + ' into screen');
                        
                        realityEditor.gui.ar.draw.hideTransformed(groupedFrame.uuid, groupedFrame, globalDOMCache, cout);

                        groupedFrame.ar.x = 0;
                        groupedFrame.ar.y = 0;
                        groupedFrame.begin = [];
                        groupedFrame.ar.matrix = [];
                        
                    } else if (newVisualization === 'ar') {

                        console.log('pull grouped frame ' + groupedFrame.uuid + ' into AR');

                        // set to false so it definitely gets re-added and re-rendered
                        groupedFrame.visible = false;
                        groupedFrame.ar.matrix = [];
                        groupedFrame.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();
                        groupedFrame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();

                        var activeKey = groupedFrame.uuid;
                        // resize iframe to override incorrect size it starts with so that it matches the screen frame
                        var iframe = globalDOMCache['iframe' + activeKey];
                        var overlay = globalDOMCache[activeKey];
                        var svg = globalDOMCache['svg' + activeKey];

                        iframe.style.width = groupedFrame.frameSizeX + 'px';
                        iframe.style.height = groupedFrame.frameSizeY + 'px';
                        iframe.style.left = ((globalStates.height - parseFloat(groupedFrame.frameSizeX)) / 2) + "px";
                        iframe.style.top = ((globalStates.width - parseFloat(groupedFrame.frameSizeY)) / 2) + "px";

                        overlay.style.width = iframe.style.width;
                        overlay.style.height = iframe.style.height;
                        overlay.style.left = iframe.style.left;
                        overlay.style.top = iframe.style.top;

                        svg.style.width = iframe.style.width;
                        svg.style.height = iframe.style.height;
                        realityEditor.gui.ar.moveabilityOverlay.createSvg(svg);

                        // set the correct position for the frame that was just pulled to AR

                        // 1. move it so it is centered on the pointer, ignoring touchOffset
                        // var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                        var touchPosition = realityEditor.device.currentScreenTouches[0].position;
                        realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinateBasedOnMarker(groupedFrame, touchPosition.x, touchPosition.y, false);

                        /*
                        // 2. convert touch offset from percent scale to actual scale of the frame
                        var convertedTouchOffsetX = (this.screenObject.touchOffsetX) * parseFloat(groupedFrame.width);
                        var convertedTouchOffsetY = (this.screenObject.touchOffsetY) * parseFloat(groupedFrame.height);

                        // 3. manually apply the touchOffset to the results so that it gets rendered in the correct place on the first pass
                        groupedFrame.ar.x -= (convertedTouchOffsetX - parseFloat(groupedFrame.width)/2 ) * groupedFrame.ar.scale;
                        groupedFrame.ar.y -= (convertedTouchOffsetY - parseFloat(groupedFrame.height)/2 ) * groupedFrame.ar.scale;
                        */
                        
                        // TODO: this causes a bug now with the offset... figure out why it used to be necessary but doesn't help anymore
                        // 4. set the actual touchOffset so that it stays in the correct offset as you drag around
                        // realityEditor.device.editingState.touchOffset = {
                        //     x: convertedTouchOffsetX,
                        //     y: convertedTouchOffsetY
                        // };

                        realityEditor.gui.ar.draw.showARFrame(activeKey);

                        // realityEditor.device.beginTouchEditing(groupedFrame.objectId, activeKey);

                    }
                    
                    sendScreenObject(groupedFrame, groupedFrame.visualization);

                    realityEditor.network.updateFrameVisualization(objects[groupedFrame.objectId].ip, groupedFrame.objectId, groupedFrame.uuid, groupedFrame.visualization, groupedFrame.ar);
                    
                }, true);
                
            }
            
        });
        
        // Remove the frame from its group when it gets deleted -- AND delete all frames in the same group
        realityEditor.device.registerCallback('vehicleDeleted', function(params) {
            if (!globalStates.groupingEnabled) { return; }
            
            var DELETE_ALL_FRAMES_IN_GROUP = true; // can be easily turned off if we don't want that behavior
            if (params.objectKey && params.frameKey && !params.nodeKey) {
                if (DELETE_ALL_FRAMES_IN_GROUP) {
                    // in this mode, delete all frames in this group
                    var frameBeingDeleted = realityEditor.getFrame(params.objectKey, params.frameKey);
                    forEachGroupedFrame(frameBeingDeleted, function(groupedFrame) {
                        // in this mode, just remove the deleted frame from its group if it's in one
                        removeFromGroup(groupedFrame.uuid, groupedFrame.objectId);
                        // delete this frame too
                        realityEditor.device.deleteFrame(groupedFrame, groupedFrame.objectId, groupedFrame.uuid);
                    }, true);
                    
                } else {
                    // in this mode, just remove the deleted frame from its group if it's in one
                    removeFromGroup(params.frameKey, params.objectKey);
                }
                
            }
        });
        
        // adjust distanceScale of grouped frames together so they get set to same amount
        realityEditor.device.distanceScaling.registerCallback('scaleEditingFrameDistance', function(params) {
            if (!globalStates.groupingEnabled) { return; }

            forEachGroupedFrame(params.frame, function(groupedFrame) {
                // groupedFrame.distanceScale = params.frame.distanceScale;
                groupedFrame.distanceScale = (groupedFrame.screenZ / realityEditor.device.distanceScaling.defaultDistance) / 0.85;
            }, true);
        });
        
    }
    
    /**
     * Emulates realityEditor.gui.screenExtension.sendScreenObject() but for grouped frames with different offsets, etc
     * @param {Frame} groupedFrame
     * @param {string} newVisualization - "screen" or "ar"
     */
    function sendScreenObject(groupedFrame, newVisualization) {
        for (var frameKey in realityEditor.gui.screenExtension.visibleScreenObjects) {
            if (!realityEditor.gui.screenExtension.visibleScreenObjects.hasOwnProperty(frameKey)) continue;
            var visibleScreenObject = realityEditor.gui.screenExtension.visibleScreenObjects[frameKey];

            // var screenObjectClone = JSON.parse(JSON.stringify(this.screenObject));

            var screenObjectClone = {
                object: groupedFrame.objectId,
                frame: groupedFrame.uuid,
                node: null,
                touchOffsetX: 0,
                touchOffsetY: 0,
                isScreenVisible: (newVisualization === "screen"),
                scale: groupedFrame.ar.scale
            };

            // for every visible screen, calculate this touch's exact x,y coordinate within that screen plane
            var thisFrameFrameCenterScreenPosition = realityEditor.gui.ar.positioning.getScreenPosition(groupedFrame.objectId,groupedFrame.uuid,true,false,false,false,false).center;
            var point = realityEditor.gui.ar.utilities.screenCoordinatesToMarkerXY(visibleScreenObject.object, thisFrameFrameCenterScreenPosition.x, thisFrameFrameCenterScreenPosition.y);
            // visibleScreenObject.x = point.x;
            // visibleScreenObject.y = point.y;

            screenObjectClone.x = point.x; //visibleScreenObject.x;
            screenObjectClone.y = point.y; //visibleScreenObject.y;
            screenObjectClone.targetScreen = {
                object: visibleScreenObject.object,
                frame: visibleScreenObject.frame
            };
            screenObjectClone.touches = visibleScreenObject.touches;

            var iframe = globalDOMCache["iframe" + frameKey];
            if (iframe) {
                iframe.contentWindow.postMessage(JSON.stringify({
                    screenObject: screenObjectClone
                }), '*');
            }
        }
    }

    /**
     * Iterator over all frames in the same group as the activeVehicle
     * Performs the callback for the activeVehicle too, unless you pass in true for the last argument
     * @param {Frame} activeVehicle
     * @param {function} callback
     * @param {boolean} excludeActive - if true, doesn't trigger the callback for the activeVehicle, only for its co-members
     */
    function forEachGroupedFrame(activeVehicle, callback, excludeActive) {
        if (activeVehicle && activeVehicle.groupID) {
            var groupMembers = getGroupMembers(activeVehicle.groupID);
            groupMembers.forEach(function(member) {
                var frame = realityEditor.getFrame(member.object, member.frame);
                if (frame) {
                    if (excludeActive && frame.uuid === activeVehicle.uuid) { return; }
                    callback(frame);
                } else {
                    groupStruct[activeVehicle.groupID].delete(member.frame); // group restruct
                }
            });
        }
    }

    /**
     * Gets triggered when the on/off switch is toggled to update globalStates.groupingEnabled
     * When toggled off, erase any visuals that should only update when grouping mode is enabled
     * @param {boolean} isEnabled
     */
    function toggleGroupingMode(isEnabled) {
        if (!isEnabled) {
            var svg = document.getElementById("groupSVG");
            clearHulls(svg);
            closeLasso();
        }
    }

    /**
     * Sets start point of selection lasso
     * @param {number} x
     * @param {number} y
     */
    function startLasso(x, y) {
        // start drawing; set first point; reset lasso
        points = [[x, y]];
        if (lasso === null) {
            lasso = document.getElementById("lasso");
        }

        lasso.setAttribute("points", x + ", "+y);
        lasso.setAttribute("stroke", "#00ffff");
        lasso.setAttribute("fill", "rgba(0,255,255,0.2)");

        globalCanvas.hasContent = true;
    }

    /**
     * Adds more points to the selection lasso
     * @param {number} x
     * @param {number} y
     */
    function continueLasso(x, y) {
        var lassoPoints = lasso.getAttribute("points");
        lassoPoints += " "+x+", "+y;
        lasso.setAttribute("points", lassoPoints);
        points.push([x, y]);
        var lassoed = getLassoed().length;
        if (lassoed > 0) {
            lasso.setAttribute("fill", "rgba(0,255,255,0.2)");
            lasso.setAttribute("stroke", "#00ff00");
        } else {
            lasso.setAttribute("fill", "rgba(0,255,255,0.2)");
            lasso.setAttribute("stroke", "#00ffff");
        }
    };

    /**
     * Auto-closes lasso to start point
     */
    function closeLasso() {
        function clearLasso() {
            lasso.setAttribute("points", "");
            lasso.classList.remove('groupLassoFadeOut');
        }

        var lassoPoints = lasso.getAttribute("points");
        var start = points[0];
        lassoPoints += " " + start[0]+", "+start[1];
        lasso.setAttribute("points", lassoPoints);
        
        lasso.classList.add('groupLassoFadeOut');

        setTimeout(clearLasso.bind(this), 300);
    }

    /**
     * @return {Array.<Object>.<string, string>} - [{object: objectKey, frame: frameKey}] for frames inside lasso
     */
    function getLassoed() {
        var lassoedFrames = []; // array of frames in lasso
        
        realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
            var frame = realityEditor.getFrame(objectKey, frameKey);
            if (frame && frame.visualization === 'ar' && frame.location === 'global') {
                // check if frame in lasso
                // FIXME: insidePoly doesn't work for crossed over shapes (such as an infinite symbol)
                var inLasso = realityEditor.gui.ar.utilities.insidePoly([frame.screenX, frame.screenY], points);
                if (inLasso) {
                    lassoedFrames.push({object: objectKey, frame: frameKey});
                }
            }
        });

        return lassoedFrames;
    }

    /**
     * Takes in selected objects and creates groups from them
     * updates groupStruct as well as server
     * @param {Array.<Object>.<string, string>} selected - [{object: <string>, frame: <string>}]
     */
    function selectFrames(selected) {
        console.log("--select frames--");
        console.log(selected.length);

        if (selected.length === 0) return;

        // if selected 1, remove from all groups
        if (selected.length === 1) {
            var frameKey = selected[0].frame;
            var objectKey = selected[0].object;

            removeFromGroup(frameKey, objectKey);
        }

        // if selected >1, make those into a new group
        else {
            // see which groups we've selected from
            var groups = {}; // {groupID.<string>: <set>.<string>}
            // let frameToObj = {}; // lookup for {frameKey: objectKey}
            selected.forEach(function(member) {
                var object = realityEditor.getObject(member.object);
                var group = object.frames[member.frame].groupID;
                frameToObj[member.frame] = member.object;

                if (group) {
                    if (group in groups) groups[group].add(member.frame);
                    else groups[group] = new Set([member.frame]);
                }

            });

            var groupIDs = Object.keys(groups);
            // if you've selected all of one group and only that group ...
            if (groupIDs.length === 1 && groups[groupIDs[0]].size === groupStruct[groupIDs[0]].size) {
                // then remove all from group 
                selected.forEach(function(member) {
                    removeFromGroup(member.frame, member.object);
                });
            }
            // otherwise we'll make a new group ...
            else {
                createNewGroup(selected);
            }
        }
        
        drawGroupHulls();
    }

    /**
     * checks if frame is in group, and if so, removes from any group
     * also deals with groups of size 1 and clears them
     * @param {string} frameKey
     * @param {string} objectKey
     */
    function removeFromGroup(frameKey, objectKey) {
        var object = realityEditor.getObject(objectKey);
        var frame = realityEditor.getFrame(objectKey, frameKey);
        var groupID = frame.groupID;

        if (frame === undefined || groupID === undefined) return;
        if (groupID) {
            console.log('removing ' + frameKey + 'from any group');
            groupStruct[groupID].delete(frameKey); // group restruct
            frame.groupID = null;

            // ungroup group if left with 1 remaining
            if (groupStruct[groupID].size === 1) {
                var group = Array.from(groupStruct[groupID]);
                object.frames[group[0]].groupID = null;
                groupStruct[groupID].clear();
                console.log('cleared group ' + groupID);
            }

            // TODO: send to server
            realityEditor.network.updateGroupings(object.ip, objectKey, frameKey, null);
        }
    }

    /**
     * adds single frame to group and posts to server
     * @param {string} frameKey
     * @param {string} objectKey
     * @param {string} newGroup
     */
    function addToGroup(frameKey, objectKey, newGroup) {
        console.log('adding to group ' + newGroup);
        var object = realityEditor.getObject(objectKey);
        var frame = realityEditor.getFrame(objectKey, frameKey);
        var group = frame.groupID;

        if (group !== null) {
            removeFromGroup(frameKey, objectKey);
        }

        frame.groupID = newGroup;
        if (newGroup in groupStruct) {
            groupStruct[newGroup].add(frameKey);
        }
        else {
            groupStruct[newGroup] = new Set([frameKey]);
        }
        // TODO: send to server
        realityEditor.network.updateGroupings(object.ip, objectKey, frameKey, newGroup);
    }

    /**
     * creates a new group from selected
     * @param {Array.<Object>.<string, string>} selected
     */
    function createNewGroup(selected) {
        // create new groupID
        var newGroup = "group" + realityEditor.device.utilities.uuidTime();
        groupStruct[newGroup] = new Set();

        // add each selected to group
        selected.forEach(function(member) {
            var frame = realityEditor.getFrame(member.object, member.frame);
            addToGroup(member.frame, member.object, newGroup);
            frame.groupID = newGroup;
            groupStruct[newGroup].add(member.frame);
            console.log('frame ' + member.frame + ' was added to new group');
        });

        console.log('grouped in ' + newGroup);
    }

    /**
     * gets bounding box corners of frame - just the rectangle on the screen, doesn't rotate to fit tightly with CSS transformations
     * note - currently not used because getFrameCornersScreenCoordinates does it better, but might be useful in the future for rough approximations
     * @param {string} frameKey
     * @param {number} buffer - extra padding to extend frame's bounding rect by
     * @returns {{upperLeft: {x: number, y: number}, upperRight: {x: number, y: number}, lowerLeft: {x: number, y: number}, lowerRight: {x: number, y: number}}}
     */
    function getFrameBoundingRectScreenCoordinates(frameKey, buffer) {
        if (typeof buffer === 'undefined') buffer = 0;
        
        if (globalDOMCache["iframe" + frameKey]) {
            var boundingRect = globalDOMCache["iframe" + frameKey].getClientRects()[0];
            return {
                upperLeft: {x: boundingRect.left - buffer, y: boundingRect.top - buffer},
                upperRight: {x: boundingRect.right + buffer, y: boundingRect.top - buffer},
                lowerLeft: {x: boundingRect.left - buffer, y: boundingRect.bottom + buffer},
                lowerRight: {x: boundingRect.right + buffer, y: boundingRect.bottom + buffer}
            }
        }
    }

    /**
     * Accurately calculates the screen coordinates of the corners of a frame element
     * This can be used to draw outlines around a frame, e.g. the outline around the group of frames
     * @param {string} objectKey
     * @param {string} frameKey
     * @param {number|undefined} buffer
     * @return {{upperLeft: upperLeft|{x, y}|*, upperRight: upperRight|{x, y}|*, lowerLeft: lowerLeft|{x, y}|*, lowerRight: lowerRight|{x, y}|*}}
     */
    function getFrameCornersScreenCoordinates(objectKey, frameKey, buffer) {
        if (typeof buffer === 'undefined') buffer = 0;
        var screenPosition = realityEditor.gui.ar.positioning.getScreenPosition(objectKey, frameKey, false, true, true, true, true, buffer);
        
        // if (typeof screenPosition.upperLeft.x === 'number' && !isNaN(screenPosition.upperLeft.x) &&
        //     typeof screenPosition.upperRight.x === 'number' && !isNaN(screenPosition.upperRight.x) &&
        //     typeof screenPosition.lowerLeft.x === 'number' && !isNaN(screenPosition.lowerLeft.x) &&
        //     typeof screenPosition.lowerRight.x === 'number' && !isNaN(screenPosition.lowerRight.x)) {

            return {
                upperLeft: screenPosition.upperLeft,
                upperRight: screenPosition.upperRight,
                lowerLeft: screenPosition.lowerLeft,
                lowerRight: screenPosition.lowerRight
            };
        //    
        // } else {
        //     return null;
        // }
    }

    /**
     * gets all members in a group with object and frame keys
     * @param {string} groupID
     * @returns {Array.<{object: <string>, frame: <string>}>}
     */
    function getGroupMembers(groupID) {
        if (!(groupID in groupStruct)) return;
        var members = [];
        for (var frameKey of groupStruct[groupID]) {
            var member = {object: frameToObj[frameKey], frame: frameKey};
            members.push(member);
        }
        return members;
    }

    /**
     * Completely erases the SVG containing the hulls
     * @param {SVGElement} svg
     */
    function clearHulls(svg) {
        while (svg.lastChild) {
            svg.removeChild(svg.firstChild);
        }
    }
    
    /**
     * iterates through all groups and creates the hulls
     */
    function drawGroupHulls() {
        var svg = document.getElementById("groupSVG");
        // svg.classList.remove('groupOutlineFadeOut');

        clearHulls(svg);

        Object.keys(groupStruct).forEach(function(groupID) {
            if (groupStruct[groupID].size > 1) {
                drawHull(svg, groupStruct[groupID], groupID);
            }
        });

        function drawHull(svg, group, groupID) {
            var hullPoints = [];

            // get the corners of frames
            for (var frameKey of group) { // iterate over the Set
                var objectKey = frameToObj[frameKey];
                if (!realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) continue; // only draw hulls for frames on visible objects
                var frame = realityEditor.getFrame(objectKey, frameKey);

                // make sure there is an object and frame
                if (!frame || frame.visualization !== 'ar') continue;

                var x = frame.screenX;
                var y = frame.screenY;
                
                // var bb = getFrameBoundingRectScreenCoordinates(frameKey, 10);
                var bb = getFrameCornersScreenCoordinates(objectKey, frameKey, 50);
                
                // points.push([x, y]); // pushing center point
                // pushing corner points
                if (bb) {
                    Object.keys(bb).forEach(function(corner) {
                        hullPoints.push([bb[corner].x, bb[corner].y]);
                    });
                }
            }
            
            if (hullPoints.length === 0) {
                return; // if all members are in screen visualization there won't be any hull points to render in AR
            }

            // create hull points
            var hullShape = hull(hullPoints, Infinity);
            var hullString = '';
            hullShape.forEach(function(pt) {
                hullString += ' ' + pt[0] + ', ' + pt[1];
            });
            hullString += ' ' + hullShape[0][0] + ', ' + hullShape[0][1];

            // draw hull
            var hullSVG = document.createElementNS(svg.namespaceURI, 'polyline');
            if (hullString.indexOf("undefined") === -1) {
                hullSVG.setAttribute("points", hullString);
                hullSVG.setAttribute("fill", "None");
                hullSVG.setAttribute("stroke", "#FFF");
                hullSVG.setAttribute("stroke-width", "5");
                hullSVG.classList.add("hull");
                hullSVG.id = groupID;
                svg.appendChild(hullSVG);
            }
        }
    }

    /**
     * Should be called whenever a new frame is loaded into the system,
     * to populate the global groupStruct with any groupID information it contains
     * @param {string} frameKey
     * @param {Frame} thisFrame
     * @todo trigger via subscription, not as a dependency - actually need to do this, then this module will be fully decoupled from the rest of the codebase
     */
    function reconstructGroupStruct(frameKey, thisFrame) {
        // reconstructing groups from frame groupIDs
        var group = thisFrame.groupID;
        if (group === undefined) {
            thisFrame.groupID = null;
        }
        else if (group !== null) {
            if (group in groupStruct) {
                groupStruct[group].add(frameKey);
            }
            else {
                groupStruct[group] = new Set([frameKey]);
            }
        }
        frameToObj[frameKey] = thisFrame.objectId;
    }
    
    /**
     * method to move transformed from to the (x,y) point on its plane
     * where the (screenX,screenY) ray cast intersects with offset being
     * locally calculated
     * based on realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate
     * @param {Frame} activeVehicle
     * @param {number} screenX
     * @param {number} screenY
     */
    function moveGroupVehicleToScreenCoordinate(activeVehicle, screenX, screenY) {
        var results = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY(activeVehicle, screenX, screenY, true);

        var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
        var newPosition = {
            x: results.point.x - results.offsetLeft,
            y: results.point.y - results.offsetTop
        };

        var changeInPosition = {
            x: newPosition.x - positionData.x,
            y: newPosition.y - positionData.y
        };
        if (activeVehicle.groupTouchOffset === undefined) {
            activeVehicle.groupTouchOffset = changeInPosition;
        } else {
            positionData.x = newPosition.x - activeVehicle.groupTouchOffset.x;
            positionData.y = newPosition.y - activeVehicle.groupTouchOffset.y;
        }
    }

    /**
     * Any time a frame or node is moved, check if it's part of a group and move all grouped frames/nodes with it
     * @param {Frame|Node} activeVehicle
     * @param {number} pageX
     * @param {number} pageY
     */
    function moveGroupedVehiclesIfNeeded(activeVehicle, pageX, pageY) {
        forEachGroupedFrame(activeVehicle, function(frame) {
            moveGroupVehicleToScreenCoordinate(frame, pageX, pageY);
        }, true);
    }

    exports.initFeature = initFeature;
    exports.toggleGroupingMode = toggleGroupingMode;
    exports.reconstructGroupStruct = reconstructGroupStruct;

})(realityEditor.gui.ar.grouping);
