createNameSpace("realityEditor.gui.screenExtension");

realityEditor.gui.screenExtension.registeredScreenObjects = [];

realityEditor.gui.screenExtension.screenObject = {
    touchState : null,
    closestObject : null,
    x : 0,
    y : 0,
    scale : 1,
    object : null,
    frame : null,
    node : null,
    isScreenVisible: false,
    touchOffsetX: 0,
    touchOffsetY: 0,
    touches: null
};
realityEditor.gui.screenExtension.activeScreenObject = {
    object : null,
    frame : null,
    node : null
};

realityEditor.gui.screenExtension.touchStart = function (eventObject){

    if (globalStates.guiState !== 'ui') return;
    if (this.getValidTouches(eventObject).length > 1 && realityEditor.device.editingState.frame) return; // don't send multitouch if editing an AR frame

    // this.updateScreenObject(eventObject);
    this.onScreenTouchDown(eventObject);
    
    var didTouchARFrame = (!!this.screenObject.object && !!this.screenObject.frame);
    
    if(realityEditor.gui.screenExtension.activeScreenObject.frame && !didTouchARFrame) {
        realityEditor.gui.screenExtension.sendScreenObject();
    }
};

realityEditor.gui.screenExtension.touchMove = function (eventObject){

    if (globalStates.guiState !== 'ui') return;
    if (this.getValidTouches(eventObject).length > 1 && realityEditor.device.editingState.frame) return; // don't send multitouch if editing an AR frame

    // this.updateScreenObject(eventObject);
    this.onScreenTouchMove(eventObject);

    var thisVisualization = "";
    if (this.screenObject.object && this.screenObject.frame) {
        var activeFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
        if (activeFrame) {
            thisVisualization = activeFrame.visualization;
        }
    }
    
    if(realityEditor.gui.screenExtension.activeScreenObject.frame && thisVisualization !== "ar") {
        realityEditor.gui.screenExtension.sendScreenObject();
    }
};

realityEditor.gui.screenExtension.touchEnd = function (eventObject){

    // if (globalStates.guiState !== 'ui') return;
    if (this.getValidTouches(eventObject).length > 1 && realityEditor.device.editingState.frame) return; // don't send multitouch if editing an AR frame

    // this.updateScreenObject(eventObject);
    this.onScreenTouchUp(eventObject);
    if(realityEditor.gui.screenExtension.activeScreenObject.frame) {
        realityEditor.gui.screenExtension.sendScreenObject();
    }
    
    this.screenObject.x = 0;
    this.screenObject.y = 0;
    this.screenObject.scale = 1;
    // this.screenObject.object = null;
    // this.screenObject.frame = null;
    // this.screenObject.node = null;
    this.screenObject.closestObject = null;
    this.screenObject.touchState = null;
    
    globalStates.initialDistance = null;
    
    //console.log("end", this.screenObject);
};

/**
 * Filters a list of TouchEvents to only include those with populated coordinate fields (sometimes empty objects get stuck there)
 * @param {ScreenEventObject} eventObject
 * @return {Array.<{screenX: number, screenY: number, type: string}>}
 */
realityEditor.gui.screenExtension.getValidTouches = function(eventObject) {
    return eventObject.touches.filter(function(touch) {
        return (typeof touch.screenX === "number" && typeof touch.screenY === "number");
    });
};

realityEditor.gui.screenExtension.onScreenTouchDown = function(eventObject) {
    // figure out if I'm touching on AR frame, screen frame, or nothing
    // console.log('onScreenTouchDown', eventObject, this.screenObject);

    this.screenObject.closestObject = realityEditor.gui.ar.getClosestObject()[0];
    this.screenObject.touchState = eventObject.type;
    
    if (this.getValidTouches(eventObject).length < 2) { // don't reset in between scaling gestures
        this.screenObject.object = eventObject.object;
        this.screenObject.frame = eventObject.frame;
        this.screenObject.node = eventObject.node;
    }

    var didTouchARFrame = (!!eventObject.object && !!eventObject.frame);

    this.screenObject.isScreenVisible = !didTouchARFrame;

    if (this.screenObject.closestObject && !didTouchARFrame) {

        // calculate the exact x,y coordinate within the screen plane that this touch corresponds to
        var point = realityEditor.gui.ar.utilities.screenCoordinatesToMarkerXY(this.screenObject.closestObject, eventObject.x, eventObject.y);
        this.screenObject.x = point.x;
        this.screenObject.y = point.y;
    }
    
    // console.log(this.screenObject);
};

/**
 * 
 * @param {ScreenEventObject} eventObject
 */
realityEditor.gui.screenExtension.onScreenTouchMove = function(eventObject) {
    // do nothing other than send xy to screen // maybe iff I'm touching on screen frame, move AR frame to mirror its position
    // console.log('onScreenTouchMove', eventObject, this.screenObject);

    this.screenObject.closestObject = realityEditor.gui.ar.getClosestObject()[0];
    this.screenObject.touchState = eventObject.type;
    
    // if (this.screenObject.object && this.screenObject.frame) {
    //     var activeFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
        // console.log(activeFrame.visualization);
    // }
    
    if (!this.screenObject.closestObject) {
        return;
    }
    
    // calculate the exact x,y coordinate within the screen plane that this touch corresponds to
    var point = realityEditor.gui.ar.utilities.screenCoordinatesToMarkerXY(this.screenObject.closestObject, eventObject.x, eventObject.y);
    this.screenObject.x = point.x;
    this.screenObject.y = point.y;
    
    if (this.getValidTouches(eventObject).length > 1) {
        this.screenObject.touches = [];
        this.screenObject.touches[0] = {
            x: point.x,
            y: point.y,
            type: eventObject.type
        };
        var secondPoint = realityEditor.gui.ar.utilities.screenCoordinatesToMarkerXY(this.screenObject.closestObject, eventObject.touches[1].screenX, eventObject.touches[1].screenY);
        this.screenObject.touches[1] = {
            x: secondPoint.x,
            y: secondPoint.y,
            type: eventObject.touches[1].type
        };
    } else {
        this.screenObject.touches = null;
    }

    // also needs to update AR frame positions so that nodes float above them
    if (this.screenObject.object && this.screenObject.frame && this.screenObject.object === this.screenObject.closestObject) {
        var matchingARFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
        if (matchingARFrame && matchingARFrame.visualization === 'screen') {
            
            console.log('moved matching ar frame from (' + matchingARFrame.ar.x + ', ' + matchingARFrame.ar.y + ') ...');

            // keep the invisible AR frames synchronized with the position of their screen frames (so that nodes are in same place and pulls out in the right place)
            matchingARFrame.ar.x = point.x;
            matchingARFrame.ar.y = point.y;

            console.log('...to (' + matchingARFrame.ar.x + ', ' + matchingARFrame.ar.y + ')');
            
            // console.log('mirroring position for frame ' + matchingARFrame.name);
            // if (this.screenObject.scale) {
            //     matchingARFrame.ar.scale = this.screenObject.scale;
            // }
        }
    }
    
    // console.log(this.screenObject);
};

realityEditor.gui.screenExtension.onScreenTouchUp = function(eventObject) {
    // reset screen object to null and update screen state to match
    // console.log('onScreenTouchUp', eventObject, this.screenObject);

    this.screenObject.closestObject = realityEditor.gui.ar.getClosestObject()[0];
    this.screenObject.touchState = eventObject.type;
    
    if (this.getValidTouches(eventObject).length < 2) { // don't reset in between scaling gestures
        this.screenObject.object = null;
        this.screenObject.frame = null;
        this.screenObject.node = null;
    }
    
    // console.log(this.screenObject);
};

realityEditor.gui.screenExtension.update = function (){

    if (globalStates.guiState !== 'ui') return;
    if (!realityEditor.gui.ar.draw.areAnyScreensVisible()) return;

    // console.log("end", this.screenObject);
    if(this.screenObject.touchState) {
        if(realityEditor.gui.screenExtension.activeScreenObject.frame) {
            realityEditor.gui.screenExtension.calculatePushPop();
            // return;
        }
    }
    
    // if (globalStates.framePullThreshold > globalStates.minFramePullThreshold) {
    //     globalStates.framePullThreshold -= 5;
    // }
};

realityEditor.gui.screenExtension.receiveObject = function (object){

    // console.log('receiveObject', object);
    
    this.screenObject.object = object.object;
    this.screenObject.frame = object.frame;
    this.screenObject.node = object.node;
    this.screenObject.touchOffsetX = object.touchOffsetX;
    this.screenObject.touchOffsetY = object.touchOffsetY;

    if (this.screenObject.object && this.screenObject.frame) {
        overlayDiv.classList.add('overlayScreenFrame');
        overlayDiv.style.backgroundImage = 'none';
        overlayDiv.classList.remove('overlayMemory');
    } else {
        overlayDiv.classList.remove('overlayScreenFrame');
    }

};

realityEditor.gui.screenExtension.onScreenPushIn = function(screenFrame) {
    // set screen object visible, wait to hear that the screen received it, then hide AR frame
    
    var isScreenVisible = true;

    if (isScreenVisible !== this.screenObject.isScreenVisible) {

        console.log('onScreenPushIn');

        this.screenObject.isScreenVisible = true;
        this.screenObject.scale = realityEditor.gui.ar.positioning.getPositionData(screenFrame).scale;
        // realityEditor.gui.ar.draw.changeVisualization(screenFrame, newVisualization); // TODO: combine this with updateArFrameVisibility
        realityEditor.app.tap();
        realityEditor.gui.screenExtension.updateArFrameVisibility();
    }

};

realityEditor.gui.screenExtension.onScreenPullOut = function(screenFrame) {
    // set screen object hidden, wait to hear that the screen received it, then move AR frame to position and show AR frame

    var isScreenVisible = false;

    if (isScreenVisible !== this.screenObject.isScreenVisible) {

        console.log('onScreenPullOut');

        this.screenObject.isScreenVisible = false;
        // realityEditor.gui.ar.draw.changeVisualization(screenFrame, newVisualization); // TODO: combine this with updateArFrameVisibility
        realityEditor.app.tap();
        realityEditor.gui.screenExtension.updateArFrameVisibility();
    }

};

realityEditor.gui.screenExtension.calculatePushPop = function() {
    if (globalStates.freezeButtonState) return; // don't allow pushing and pulling if the background is frozen
    
    var screenFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);

    var isScreenObjectVisible = !!realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object];
    if (screenFrame && isScreenObjectVisible) {
        if (screenFrame.location === 'global') { // only able to push global frames into the screen

            // calculate distance to frame
            // var screenFrameMatrix = realityEditor.gui.ar.utilities.repositionedMatrix(realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object], screenFrame);
            // var distanceToFrame = realityEditor.gui.ar.utilities.distance(screenFrameMatrix);
            var distanceToObject = realityEditor.gui.ar.utilities.distance(realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object]);

            // console.log('distance to object, frame: ' + distanceToObject + ', ' + distanceToFrame);
            // console.log('distance to object: ' + distanceToFrame);

            if (!globalStates.initialDistance) {
                globalStates.initialDistance = distanceToObject; //distanceToFrame;
            }

            var distanceThreshold = globalStates.framePullThreshold;
            // console.log(distanceThreshold);

            if (distanceToObject > (globalStates.initialDistance + distanceThreshold)) { //distanceToFrame;
                this.onScreenPullOut(screenFrame);
            } else if (distanceToObject < (globalStates.initialDistance - distanceThreshold)) { //distanceToFrame;
                this.onScreenPushIn(screenFrame);
            }
            
        }
    } /*else {
        if (globalStates.framePullThreshold > globalStates.minFramePullThreshold) {
            globalStates.framePullThreshold -= 5;
        }
    }*/
};

realityEditor.gui.screenExtension.sendScreenObject = function (){
    var isActiveScreenObjectVisible = !!realityEditor.gui.ar.draw.visibleObjects[this.activeScreenObject.object];
    if(this.activeScreenObject.frame && isActiveScreenObjectVisible) {
        var iframe = globalDOMCache["iframe" + this.activeScreenObject.frame];
        if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify({
                screenObject: this.screenObject
            }), '*');
        }
    }
};

realityEditor.gui.screenExtension.updateArFrameVisibility = function (){
    var thisFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
    if(thisFrame) {

        globalStates.initialDistance = null;
        // globalStates.framePullThreshold = globalStates.maxFramePullThreshold;
        
        if (this.screenObject.isScreenVisible) {
            console.log('hide frame -> screen');
            thisFrame.visualization = "screen";
            
            var touchOffset = realityEditor.device.editingState.touchOffset;

            if (touchOffset) {
                this.screenObject.touchOffsetX = (touchOffset.x - parseInt(thisFrame.width) * thisFrame.ar.scale * 0.5) / thisFrame.ar.scale;
                this.screenObject.touchOffsetY = ((touchOffset.y) - parseInt(thisFrame.height) * thisFrame.ar.scale * 0.5) / thisFrame.ar.scale;
                console.log(this.screenObject.touchOffsetX, this.screenObject.touchOffsetY);
            }

            realityEditor.gui.ar.draw.hideTransformed(thisFrame.uuid, thisFrame, globalDOMCache, cout);
            
            realityEditor.device.resetEditingState();
            
        } else {
            console.log('show frame -> AR');
            thisFrame.visualization = "ar";
            
            // set to false so it definitely gets re-added and re-rendered
            thisFrame.visible = false;

            thisFrame.ar.matrix = [];
            thisFrame.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();
            thisFrame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();

            // realityEditor.device.editingState.touchOffset = {
            //     x: (thisFrame.width/2 * thisFrame.ar.scale) + (0.5 * parseInt(thisFrame.width) * thisFrame.ar.scale),
            //     y: (thisFrame.height/2 * thisFrame.ar.scale) + (0.5 * parseInt(thisFrame.height) * thisFrame.ar.scale)
            // };
            
            var activeKey = thisFrame.uuid;
            // resize iframe to override incorrect size it starts with so that it matches the screen frame
            var iframe = globalDOMCache['iframe' + activeKey];
            var overlay = globalDOMCache[activeKey];
            var svg = globalDOMCache['svg' + activeKey];

            iframe.style.width = thisFrame.frameSizeX + 'px';
            iframe.style.height = thisFrame.frameSizeY + 'px';
            iframe.style.left = ((globalStates.height - thisFrame.frameSizeX) / 2) + "px";
            iframe.style.top = ((globalStates.width - thisFrame.frameSizeY) / 2) + "px";

            overlay.style.width = iframe.style.width;
            overlay.style.height = iframe.style.height;
            overlay.style.left = iframe.style.left;
            overlay.style.top = iframe.style.top;

            svg.style.width = iframe.style.width;
            svg.style.height = iframe.style.height;
            realityEditor.gui.ar.moveabilityOverlay.createSvg(svg);
            
            // var arScaleBasedOnScreenScale = thisFrame.ar.scale;
            
            // realityEditor.network.getData()

            // var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
            // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinateBasedOnMarker(thisFrame, touchPosition.x, touchPosition.y, true);
            
            realityEditor.device.beginTouchEditing(thisFrame.objectId, activeKey);
            
        }
        console.log('updateArFrameVisibility', thisFrame.visualization);
        // realityEditor.gui.ar.draw.changeVisualization(thisFrame, thisFrame.visualization);

        realityEditor.gui.screenExtension.sendScreenObject();
        realityEditor.network.updateFrameVisualization(objects[thisFrame.objectId].ip, thisFrame.objectId, thisFrame.uuid, thisFrame.visualization);

    }
};
