/**
 * @fileOverview realityEditor.selecting.js
 * Contains functions that render groups and selection GUI
 * as well as creating groups
 * functions in this file are called in device/index.js
 */

createNameSpace("realityEditor.gui.ar.selecting");

/**
 * Keeps track of where the line starts
 * @type {Array.<Array.<number>>}
 */
realityEditor.gui.ar.selecting.points = [];

/**
 * Keeps track of the lasso polyline
 * @type {SVGPolylineElement|null}
 */
realityEditor.gui.ar.selecting.lasso = null;

/**
 * Sets start point of selection lasso
 * @param {number} x
 * @param {number} y
 */
realityEditor.gui.ar.selecting.startLasso = function(x, y) {
    // start drawing; set first point; reset lasso
    this.points = [[x, y]];
    if (this.lasso === null) {
        this.lasso = document.getElementById("lasso");
    }
    
    this.lasso.setAttribute("points", `${x}, ${y}`);
    this.lasso.setAttribute("stroke", "#0000ff");
    this.lasso.setAttribute("fill", "rgba(0,0,255,0.2)");
    
    globalCanvas.hasContent = true;
};

/**
 * Adds more points to the selection lasso
 * @param {number} x
 * @param {number} y
 */
realityEditor.gui.ar.selecting.continueLasso = function(x, y) {
    let points = this.lasso.getAttribute("points");
    points += ` ${x}, ${y}`;
    this.lasso.setAttribute("points", points);
    this.points.push([x, y]);
    let lassoed = this.getLassoed().length;
    if (lassoed > 0) {
        this.lasso.setAttribute("fill", "rgba(0,255,255,0.2)");
        this.lasso.setAttribute("stroke", "#00ffff");
    } else {
        this.lasso.setAttribute("fill", "rgba(0,0,255,0.2)");
        this.lasso.setAttribute("stroke", "#0000ff");
    }
};

/**
 * Auto-closes lasso to start point
 */
realityEditor.gui.ar.selecting.closeLasso = function() {
    function clearLasso() { this.lasso.setAttribute("points", ""); }
    
    let points = this.lasso.getAttribute("points");
    let start = this.points[0];
    points += ` ${start[0]}, ${start[1]}`;
    this.lasso.setAttribute("points", points);
    
    setTimeout(clearLasso.bind(this), 500);
};

/**
 * @return {Array.<Object>.<string, string>} - [{object: objectKey, frame: frameKey}] for frames inside lasso
 */
realityEditor.gui.ar.selecting.getLassoed = function() {
    let lassoedFrames = []; // array of frames in lasso
    
    // for every frame in every object ...
    for (let objectKey in objects) {
        let object = realityEditor.getObject(objectKey);
        if (object) {
            for (let frameKey in object.frames) {
                if (!object.frames.hasOwnProperty(frameKey)) continue;
                if (object.frames[frameKey].visualization !== "ar") continue;
                // check if frame in lasso
                // FIXME: insidePoly doesn't work for crossed over shapes (such as an infinite symbol)
                let inLasso = realityEditor.gui.ar.utilities.insidePoly([object.frames[frameKey].screenX, object.frames[frameKey].screenY], this.points);
                if (inLasso) {
                    lassoedFrames.push({object: objectKey, frame: frameKey});
                }
            }
        }
    }
    
    return lassoedFrames;
};

/**
 * Takes in selected objects and creates groups from them
 * updates `groupStruct` as well as server
 * @param {Array.<Object>.<string, string>} selected - [{object: <string>, frame: <string>}]
 */
realityEditor.gui.ar.selecting.selectFrames = function(selected) {
    console.log("--select frames--");
    console.log(selected.length);

    if (selected.length === 0) return;
    
    // if selected 1, remove from all groups
    if (selected.length === 1) {
        let frameKey = selected[0].frame;
        let objectKey = selected[0].object;

        removeFromGroup(frameKey, objectKey);
    }
    
    // if selected >1, make those into a new group
    else {
        // see which groups we've selected from
        let groups = {}; // {groupID.<string>: <set>.<string>}
        // let frameToObj = {}; // lookup for {frameKey: objectKey}
        for (let member of selected) {
            let object = realityEditor.getObject(member.object);
            let group = object.frames[member.frame].groupID;
            frameToObj[member.frame] = member.object;
            
            if (group == null) continue;
            if (group in groups) groups[group].add(member.frame);
            else groups[group] = new Set([member.frame]);
        }
        
        let groupIDs = Object.keys(groups);
        // if you've selected all of one group and only that group ...
        if (groupIDs.length === 1 && groups[groupIDs[0]].size === groupStruct[groupIDs[0]].size) {
            // then remove all from group 
            for (let member of selected) {
                removeFromGroup(member.frame, member.object);
            }
        }
        // otherwise we'll make a new group ...
        else {
            createNewGroup(selected);
        }
    }
    
    realityEditor.gui.ar.selecting.drawGroupHulls();
};

/**
 * checks if frame is in group, and if so, removes from any group
 * also deals with groups of size 1 and clears them
 * @param {string} frameKey
 * @param {string} objectKey
 */
function removeFromGroup(frameKey, objectKey) {
    let object = realityEditor.getObject(objectKey);
    let groupID = object.frames[frameKey].groupID;
    
    if (object === undefined || groupID === undefined) return;
    if (groupID !== null) {
        console.log(`removing ${frameKey.substr(0, 6)} from any group`);
        groupStruct[groupID].delete(frameKey); // group restruct
        object.frames[frameKey].groupID = null;

        //  ungroup group if left with 1 remaining
        if (groupStruct[groupID].size === 1) {
            let group = Array.from(groupStruct[groupID]);
            object.frames[group[0]].groupID = null;
            groupStruct[groupID].clear();
            console.log(`cleared group ${groupID}`);
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
    console.log(`adding to group ${newGroup}`);
    let object = realityEditor.getObject(objectKey);
    let group = object.frames[frameKey].groupID;
    
    if (group !== null) {
        removeFromGroup(frameKey, objectKey);
    }

    object.frames[frameKey].groupID = newGroup;
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
    let newGroup = "group" + realityEditor.device.utilities.uuidTime();
    groupStruct[newGroup] = new Set();

    // add each selected to group
    for (let member of selected) {
        let object = realityEditor.getObject(member.object);
        addToGroup(member.frame, member.object, newGroup);
        object.frames[member.frame].groupID = newGroup;
        groupStruct[newGroup].add(member.frame);
    }
    
    console.log(`grouped in ${newGroup}`);
}

/**
 * gets bounding box corners of frame
 * @param frameKey
 * @returns {{upperLeft: {x: number, y: number}, upperRight: {x: number, y: number}, lowerLeft: {x: number, y: number}, lowerRight: {x: number, y: number}}}
 */
realityEditor.gui.ar.selecting.getFrameBoundingRectScreenCoordinates = function(frameKey, buffer=0) {
    if (globalDOMCache["iframe" + frameKey]) {
        let boundingRect = globalDOMCache["iframe" + frameKey].getClientRects()[0];
        return {
            upperLeft: {x: boundingRect.left - buffer, y: boundingRect.top - buffer},
            upperRight: {x: boundingRect.right + buffer, y: boundingRect.top - buffer},
            lowerLeft: {x: boundingRect.left - buffer, y: boundingRect.bottom + buffer},
            lowerRight: {x: boundingRect.right + buffer, y: boundingRect.bottom + buffer}
        }
    } else {
        return;
    }
};

/**
 * gets all members in a group with object and frame keys
 * @param {string} groupID
 * @returns {{object: <string>, frame: <string>}}
 */
realityEditor.gui.ar.selecting.getGroupMembers = function(groupID) {
    if (!(groupID in groupStruct)) return;
    let members = [];
    for (let frameKey of groupStruct[groupID]) {
        let member = {object: frameToObj[frameKey], frame: frameKey};
        members.push(member);
    }
    return members;
};

/**
 * iterates through all groups and creates the hulls
 */
realityEditor.gui.ar.selecting.drawGroupHulls = function() {
    let svg = document.getElementById("groupSVG");

    clearHulls(svg);
    
    for (let groupID of Object.keys(groupStruct)) {
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
        let points = [];
        
        // get the corners of frames
        for (let frameKey of group) {
            let objectKey = frameToObj[frameKey];
            let object = realityEditor.getObject(objectKey);
            
            // make sure there is an object and frame
            if (!object) continue;
            if (!object.frames.hasOwnProperty(frameKey)) continue;
            if (object.frames[frameKey].visualization !== "ar") continue;
            
            let x = object.frames[frameKey].screenX;
            let y = object.frames[frameKey].screenY;
            let bb = realityEditor.gui.ar.selecting.getFrameBoundingRectScreenCoordinates(frameKey, 10);
            // points.push([x, y]); // pushing center point
            // pushing corner points
            if (bb) {
                for (let corner of Object.keys(bb)) {
                    points.push([bb[corner].x, bb[corner].y]);
                }
            }
        }
        
        // create hull points
        let hullShape = hull(points, Infinity);
        let hullString = "";
        for (let pt of hullShape) {
            hullString += `${pt[0]}, ${pt[1]} `;
        }
        hullString += `${hullShape[0][0]}, ${hullShape[0][1]}`;
        
        // draw hull
        let hullSVG = document.createElementNS(svg.namespaceURI, 'polyline');
        if (hullString.indexOf("undefined") == -1) {
            hullSVG.setAttribute("points", hullString);
            hullSVG.setAttribute("fill", "None");
            hullSVG.setAttribute("stroke", "#FFF");
            hullSVG.setAttribute("stroke-width", "5");
            hullSVG.classList.add("hull");
            hullSVG.id = groupID;
            svg.appendChild(hullSVG);
        }
    }
};
/**
 * method to move transformed from to the (x,y) point on its plane 
 * where the (screenX,screenY) ray cast intersects with offset being 
 * locally calculated
 * based on realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate
 * @param {Frame} activeVehicle
 * @param {number} screenX
 * @param {number} screenY
 */
realityEditor.gui.ar.selecting.moveGroupVehicleToScreenCoordinate = function(activeVehicle, screenX, screenY) {
    let results = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY(activeVehicle, screenX, screenY, true);
    
    let positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
    let newPosition = {
        x: results.point.x - results.offsetLeft,
        y: results.point.y - results.offsetTop,
    };
    
    let changeInPosition = {
        x: newPosition.x - positionData.x,
        y: newPosition.y - positionData.y,
    }; 
    if (activeVehicle.groupTouchOffset === undefined) {
        activeVehicle.groupTouchOffset = changeInPosition;
    } else {
        positionData.x = newPosition.x - activeVehicle.groupTouchOffset.x;
        positionData.y = newPosition.y - activeVehicle.groupTouchOffset.y;
    }
};
