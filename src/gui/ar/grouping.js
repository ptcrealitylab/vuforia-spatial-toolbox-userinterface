createNameSpace("realityEditor.gui.ar.grouping");

/**
 * @fileOverview realityEditor.grouping.js
 * Contains functions that render groups and selection GUI
 * as well as creating groups
 * functions in this file are called in device/index.js
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
     * @type: {Object|null} First tap target
     */
    var tapTarget = null;
    
    /**
     * @typedef {Object} DoubleTapTimer
     * @type {DoubleTapTimer}
     */
    var doubleTapTimer = null;

    /**
     * @type {{active: Boolean, object: Array.<string>, frame: Array.<string>}}
     * object and frame currently not in use
     */
    var selectingState = {
        active: false,
        object: [],
        frame: []
    };

    var isUnconstrainedEditingGroup = false;
    
    /**
     * Initialize the grouping feature regardless of whether it is enabled onLoad
     * Subscribe to touches and rendering events, but only respond to them if the
     * grouping feature is currently enabled at the time of the event
     */
    function initFeature() {
        
        // render hulls on every update (iff grouping mode enabled)
        realityEditor.gui.ar.draw.addUpdateListener(function() {
            if (globalStates.groupingEnabled) {
                // draw hulls
                drawGroupHulls();
                
                if (isUnconstrainedEditingGroup) {
                    var activeVehicle = realityEditor.device.getEditingVehicle();
                    var activeVehicleMatrix = realityEditor.gui.ar.positioning.getPositionData(activeVehicle).matrix;
                    forEachGroupedFrame(activeVehicle, function(frame) {
                        var newMatrix = [];
                        realityEditor.gui.ar.utilities.multiplyMatrix(activeVehicleMatrix, frame.startingMatrixOffset, newMatrix);
                        realityEditor.gui.ar.positioning.setPositionDataMatrix(frame, newMatrix);
                    }, true);
                    
                    if (activeVehicle) {
                        var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                        // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinateBasedOnMarker(thisFrame, touchPosition.x, touchPosition.y, false);
                        moveGroupedVehiclesIfNeeded(activeVehicle, touchPosition.x, touchPosition.y);
                    }
                }
            }
        });

        // be notified when certain touch event functions get triggered in device/index.js
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
        
        realityEditor.device.registerCallback('onDocumentMultiTouchMove', function(params) {
            if (globalStates.groupingEnabled) {
                // console.log('grouping.js: onDocumentMultiTouchMove', params);
                
                if (selectingState.active) {
                    continueLasso(params.event.pageX, params.event.pageY);
                }
                
                // TODO: also move group objects too
                // // also move group objects too
                // if (activeVehicle.groupID !== null) {
                //     let groupMembers = realityEditor.gui.ar.grouping.getGroupMembers(activeVehicle.groupID);
                //     for (let member of groupMembers) {
                //         let frame = realityEditor.getFrame(member.object, member.frame);
                //         realityEditor.gui.ar.grouping.moveGroupVehicleToScreenCoordinate(frame, event.touches[0].pageX, event.touches[0].pageY);
                //     }
                // }

                var activeVehicle = realityEditor.device.getEditingVehicle();
                var isSingleTouch = params.event.touches.length === 1;
                
                if (activeVehicle && isSingleTouch) {
                    // also move group objects too
                    moveGroupedVehiclesIfNeeded(activeVehicle, params.event.pageX, params.event.pageY);
                }

            }
            
        });
        
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
                
                /*
                document.getElementById('svg' + (this.editingState.node || this.editingState.frame)).style.pointerEvents = 'none';

                if (activeVehicle.groupID !== null) {
                    for (let member of groupStruct[activeVehicle.groupID]) {
                        document.getElementById('svg' + member).style.display = 'none';
                        document.getElementById('svg' + member).style.pointerEvents = 'none';
                    }
                }
                 */
            }
        });
        
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
        
        // unconstrained move grouped vehicles if needed
        // TODO: also store this info when starting unconstrained editing via another method, e.g. editing mode
        realityEditor.device.registerCallback('onFramePulledIntoUnconstrained', function(params) {
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
                    
                    if (newVisualization === 'screen') {

                        groupedFrame.visualization = newVisualization;

                        console.log('pushed grouped frame ' + groupedFrame.uuid + ' into screen');
                        
                        realityEditor.gui.ar.draw.hideTransformed(groupedFrame.uuid, groupedFrame, globalDOMCache, cout);

                        groupedFrame.ar.x = 0;
                        groupedFrame.ar.y = 0;
                        groupedFrame.begin = [];
                        groupedFrame.ar.matrix = [];
                        
                        // realityEditor.gui.screenExtension.sendScreenObject();
                        function sendScreenObject() {
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
                                    isScreenVisible: true,
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
                        sendScreenObject();

                        realityEditor.network.updateFrameVisualization(objects[groupedFrame.objectId].ip, groupedFrame.objectId, groupedFrame.uuid, groupedFrame.visualization, groupedFrame.ar);
                        
                    } else if (newVisualization === 'ar') {

                        // TODO: support pulling out of screens in the future
                        console.log('pull grouped frame ' + groupedFrame.uuid + ' into AR');

                    }
                    
                }, true);
                
            }
            
        });

        /**
         * Remove the frame from its group when it gets deleted
         */
        realityEditor.device.registerCallback('vehicleDeleted', function(params) {
            if (params.objectKey && params.frameKey && !params.nodeKey) {
                removeFromGroup(params.frameKey, params.objectKey);
            }
        });
        
    }

    /**
     * Iterator over all frames in the same group as the activeVehicle
     * NOTE: Currently performs the callback for the activeVehicle too //TODO: give the option to exclude it?
     * @param {Frame} activeVehicle
     * @param {function} callback
     * @param {boolean} excludeActive - if true, doesn't trigger the callback for the activeVehicle, only for its co-members
     */
    function forEachGroupedFrame(activeVehicle, callback, excludeActive) {
        if (activeVehicle && activeVehicle.groupID !== null) {
            var groupMembers = getGroupMembers(activeVehicle.groupID);
            groupMembers.forEach(function(member) {
                var frame = realityEditor.getFrame(member.object, member.frame);
                if (frame) {
                    if (excludeActive && frame.uuid === activeVehicle.uuid) { return; }
                    callback(frame);
                } else {
                    groupStruct[groupID].delete(member.frame); // group restruct
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
        lasso.setAttribute("stroke", "#0000ff");
        lasso.setAttribute("fill", "rgba(0,0,255,0.2)");

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
            lasso.setAttribute("stroke", "#00ffff");
        } else {
            lasso.setAttribute("fill", "rgba(0,0,255,0.2)");
            lasso.setAttribute("stroke", "#0000ff");
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
            if (frame && frame.visualization === 'ar') {
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
        if (groupID !== null) {
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
     * @param frameKey
     * @param buffer - extra padding to extend frame's bounding rect by
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

    // /**
    //  * Provides the screen coordinates of the center, upperLeft and lowerRight coordinates of the provided frame
    //  * (enough points to determine whether the frame overlaps with any rectangular region of the screen)
    //  * @param {string} objectKey
    //  * @param {string} frameKey
    //  * @return {{ center: {x: number, y: number}, upperLeft: {x: number, y: number}, lowerRight: {x: number, y: number} }}
    //  */
    // realityEditor.gui.ar.positioning.getFrameScreenCoordinates = function(objectKey, frameKey) {
    //     return this.getScreenPosition(objectKey, frameKey, true, true, false, false, true);
    // };

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

})(realityEditor.gui.ar.grouping);
