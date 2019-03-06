createNameSpace("realityEditor.gui.ar.selecting");

/**
 * @fileOverview realityEditor.selecting.js
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
    
    function initFeature() {

        // be notified when certain touch event functions get triggered in device/index.js
        realityEditor.device.registerCallback('resetEditingState', resetCachedTarget);
        realityEditor.device.registerCallback('onDocumentMultiTouchEnd', resetCachedTarget);
        
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

        lasso.setAttribute("points", "{"+x+"}, {"+y+"}");
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
        lassoPoints += " {"+x+"}, {"+y+"}";
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
        function clearLasso() { lasso.setAttribute("points", ""); }

        var lassoPoints = lasso.getAttribute("points");
        var start = points[0];
        lassoPoints += "{"+start[0]+"}, {"+start[1]+"}";
        lasso.setAttribute("points", lassoPoints);

        setTimeout(clearLasso.bind(this), 500);
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
            for (var member in selected) {
                var object = realityEditor.getObject(member.object);
                var group = object.frames[member.frame].groupID;
                frameToObj[member.frame] = member.object;

                if (group == null) continue;
                if (group in groups) groups[group].add(member.frame);
                else groups[group] = new Set([member.frame]);
            }

            var groupIDs = Object.keys(groups);
            // if you've selected all of one group and only that group ...
            if (groupIDs.length === 1 && groups[groupIDs[0]].size === groupStruct[groupIDs[0]].size) {
                // then remove all from group 
                for (var member in selected) {
                    removeFromGroup(member.frame, member.object);
                }
            }
            // otherwise we'll make a new group ...
            else {
                createNewGroup(selected);
            }
        }

        drawGroupHulls();
    };

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
        for (var member in selected) {
            var frame = realityEditor.getFrame(member.object, member.frame);
            addToGroup(member.frame, member.object, newGroup);
            frame.groupID = newGroup;
            groupStruct[newGroup].add(member.frame);
        }

        console.log('grouped in ' + newGroup);
    }

    /**
     * gets bounding box corners of frame
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
    };

    /**
     * gets all members in a group with object and frame keys
     * @param {string} groupID
     * @returns {{object: <string>, frame: <string>}}
     */
    function getGroupMembers(groupID) {
        if (!(groupID in groupStruct)) return;
        var members = [];
        for (var frameKey of groupStruct[groupID]) {
            var member = {object: frameToObj[frameKey], frame: frameKey};
            members.push(member);
        }
        return members;
    };

    /**
     * iterates through all groups and creates the hulls
     */
    function drawGroupHulls() {
        var svg = document.getElementById("groupSVG");

        clearHulls(svg);

        for (var groupID in Object.keys(groupStruct)) {
            if (groupStruct[groupID].size > 1) {
                drawHull(svg, groupStruct[groupID], groupID);
            }
        }

        function clearHulls(svg) {
            while (svg.lastChild) {
                svg.removeChild(svg.firstChild);
            }
        }

        function drawHull(svg, group, groupID) {
            var points = [];

            // get the corners of frames
            for (var frameKey of group) {
                var objectKey = frameToObj[frameKey];
                var object = realityEditor.getObject(objectKey);
                var frame = realityEditor.getFrame(objectKey, frameKey);

                // make sure there is an object and frame
                if (!frame || frame.visualization !== 'ar') continue;

                var x = frame.screenX;
                var y = frame.screenY;
                var bb = getFrameBoundingRectScreenCoordinates(frameKey, 10);
                // points.push([x, y]); // pushing center point
                // pushing corner points
                if (bb) {
                    for (var corner in Object.keys(bb)) {
                        points.push([bb[corner].x, bb[corner].y]);
                    }
                }
            }

            // create hull points
            var hullShape = hull(points, Infinity);
            var hullString = "";
            for (var pt in hullShape) {
                hullString += '{'+pt[0]+'}, {'+pt[1]+'}';
            }
            hullString += '{'+hullShape[0][0]+'}, {'+hullShape[0][1]+'}';

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
    
    exports.initFeature = initFeature;
    exports.drawGroupHulls = drawGroupHulls;

})(realityEditor.gui.ar.selecting);
