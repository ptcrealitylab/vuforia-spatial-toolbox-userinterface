createNameSpace("realityEditor.gui.screenExtension");

realityEditor.gui.screenExtension.screenObject = {
        touchState : null,
        closestObject : null,
        x : 0,
        y : 0,
        scale : 1,
        object : null,
        frame : null,
        node : null,
        isScreenVisible: false
};
realityEditor.gui.screenExtension.activeScreenObject = {
    object : null,
    frame : null,
    node : null
};

realityEditor.gui.screenExtension.touchStart = function (eventObject){
    this.updateScreenObject(eventObject);
  //  console.log("start", this.screenObject);
};

realityEditor.gui.screenExtension.touchMove = function (eventObject){
    this.updateScreenObject(eventObject);
   // console.log("move", this.screenObject.x,this.screenObject.y);
};

realityEditor.gui.screenExtension.touchEnd = function (eventObject){
    this.updateScreenObject(eventObject);
   // console.log("end", this.screenObject);
};

realityEditor.gui.screenExtension.update = function (){

    if (globalStates.guiState !== 'ui') return;
    if (!realityEditor.gui.ar.draw.areAnyScreensVisible()) return;

    // console.log("end", this.screenObject);
    if(this.screenObject.touchState) {
        if(this.activeScreenObject.frame) {
            realityEditor.gui.screenExtension.calculatePushPop();
            realityEditor.gui.screenExtension.sendScreenObject();
        }
    }
};

realityEditor.gui.screenExtension.receiveObject = function (object){
    this.screenObject.object = object.object;
    this.screenObject.frame = object.frame;
    this.screenObject.node = object.node;
};

realityEditor.gui.screenExtension.updateScreenObject = function (eventObject){

    if (globalStates.guiState !== 'ui') return;
    if (!realityEditor.gui.ar.draw.areAnyScreensVisible()) return;

    this.screenObject.closestObject = realityEditor.gui.ar.getClosestObject()[0];
    var thisObject = objects[this.screenObject.closestObject];
    this.screenObject.touchState = eventObject.type;
    if(eventObject.type === "touchstart") {
        
        // TODO: make a similar function for when a screen object becomes visible while unconstrained editing a global frame
        var that = this;
        var elementsUnderTouch = realityEditor.device.utilities.getAllDivsUnderCoordinate(eventObject.x, eventObject.y);
        var didTouchARFrame = elementsUnderTouch.some( function(clickedElement) {
            if (clickedElement.tagName === 'IFRAME' && clickedElement.dataset.objectKey && clickedElement.dataset.frameKey && clickedElement.style.display !== 'none') {
                that.screenObject.object = clickedElement.dataset.objectKey;
                that.screenObject.frame = clickedElement.dataset.frameKey;
                console.log('tapped down on AR frame, so don\'t start screenframe drag');
                return true;
            }
            return false;
        });
        
        this.screenObject.isScreenVisible = !didTouchARFrame;
        globalStates.didStartPullingFromScreen = !didTouchARFrame;
        
        // TODO: notify screen when new pocket frame is added!
        // TODO: what about if pocket frame is added to another object and then dropped into this one? generate screen frame as soon as the frame data becomes associated with this new object. maybe even include it in the message when it gets transferred to the screen.
        
    } else if(eventObject.type === "touchend") {
        this.screenObject.x = 0;
        this.screenObject.y = 0;
        this.screenObject.scale = 1;
        this.screenObject.object = null;
        this.screenObject.frame = null;
        this.screenObject.node = null;
        this.screenObject.closestObject = null;
        this.screenObject.touchState = null;
        
        globalStates.initialDistance = null;
    }
    // console.log(thisObject);
    
    if (this.screenObject.closestObject && this.screenObject.isScreenVisible) {
        
        // calculate the exact x,y coordinate within the screen plane that this touch corresponds to
        var point = realityEditor.gui.ar.utilities.screenCoordinatesToMarkerXY(this.screenObject.closestObject, eventObject.x, eventObject.y);
        this.screenObject.x = point.x; 
        this.screenObject.y = point.y;

        if (this.screenObject.object && this.screenObject.frame && this.screenObject.object === this.screenObject.closestObject) {
            var matchingARFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
            if (matchingARFrame && matchingARFrame.visualization === 'screen') {
                // keep the invisible AR frames synchronized with the position of their screen frames (so that nodes are in same place and pulls out in the right place)
                matchingARFrame.ar.x = point.x;
                matchingARFrame.ar.y = point.y;
                
                // console.log('mirroring position for frame ' + matchingARFrame.name);
                // if (this.screenObject.scale) {
                //     matchingARFrame.ar.scale = this.screenObject.scale;
                // }
            }
        }
    }
};

realityEditor.gui.screenExtension.calculatePushPop = function (){
    
    var screenFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
    
    if (!screenFrame) {
        var globalFrame = globalFrames[globalStates.editingFrame];
        if (globalFrame) {
            // var globalFrameKey = globalFramePrefix + (this.screenObject.frame).slice((this.screenObject.object).length);
            // var globalFrame = globalFrames[globalFrameKey];
            this.screenObject.object = this.screenObject.closestObject;
            this.screenObject.frame = globalStates.editingFrame; //globalFrameKey;
            screenFrame = globalFrame;
        }
    }
    // if (this.screenObject.frame && this.screenObject.object && !screenFrame) {
    //     var globalFrameKey = globalFramePrefix + (this.screenObject.frame).slice((this.screenObject.object).length);
    //     var globalFrame = globalFrames[globalFrameKey];
    //     this.screenObject.object = this.screenObject.closestObject;
    //     this.screenObject.frame = globalFrameKey;
    //     screenFrame = globalFrame;
    // }

    var isScreenObjectVisible = !!realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object];
    if (screenFrame && isScreenObjectVisible) {
        // console.log('I have a screen frame');

        var screenFrameMatrix = realityEditor.gui.ar.utilities.repositionedMatrix(realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object], screenFrame);

        
        if (this.screenObject.frame.indexOf('__GLOBAL__') > -1 || (globalStates.unconstrainedPositioning && globalStates.editingFrame === this.screenObject.frame) ) {
            
            if (!globalStates.initialDistance) {
                var realDistanceToUnconstrainedFrame = realityEditor.gui.ar.utilities.distance(screenFrameMatrix);
                globalStates.initialDistance = realDistanceToUnconstrainedFrame; 
                if (this.screenObject.frame.indexOf('__GLOBAL__') > -1) {
                    globalStates.initialDistance *= 0.9; // make global frames a bit harder to push into the screen
                }
            }

            console.log('screen frame is a global frame switching between objects');
            var identityPosition = {
                x: 0,
                y: 0,
                scale: 1.0,
                matrix: realityEditor.gui.ar.draw.utilities.newIdentityMatrix()
            };
            screenFrameMatrix = realityEditor.gui.ar.utilities.repositionedMatrix(realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object], identityPosition);
        }
        
        // Method 1. Use the full distance to the frame.
        var distanceToFrame = realityEditor.gui.ar.utilities.distance(screenFrameMatrix);
        
        // Methods 2. Use only the z distance to the marker plane.
        // var distanceToFrame = screenFrameMatrix[14];
        
        if (!globalStates.initialDistance) {
            globalStates.initialDistance = distanceToFrame;
        }

        console.log('I have a screen frame', this.screenObject.object, this.screenObject.frame, distanceToFrame, globalStates.initialDistance);

        var isScreenVisible = this.screenObject.isScreenVisible;

        // // if frame is on screen, must be pulled out at least 200 to move to AR
        // if (this.screenObject.isScreenVisible && (distanceToFrame - globalStates.initialDistance > 25)) {
        //     isScreenVisible = false;
        //
        //     // if frame is in AR, must be pushed in at least 200 to move to screen
        // } else if (!this.screenObject.isScreenVisible && (distanceToFrame - globalStates.initialDistance < -25)) {
        //     isScreenVisible = true;
        // }

        // globalStates.framePullThreshold = 50 by default in unconstrained editing, much larger when not unconstrained editing
        
        var distanceThreshold = globalStates.framePullThreshold;
        // if (!(globalStates.unconstrainedPositioning || globalStates.editingMode || globalStates.tempEditingMode) && !globalStates.didStartPullingFromScreen) {
        if (!globalStates.editingMode && !globalStates.didStartPullingFromScreen) {
            distanceThreshold = globalStates.framePullThreshold * 5;
        }
        
        if (distanceToFrame > (globalStates.initialDistance + distanceThreshold)) {
            isScreenVisible = false;
        } else if (distanceToFrame < (globalStates.initialDistance - distanceThreshold)) {
            isScreenVisible = true;
        }

        // var isScreenVisible = distanceToFrame < 1000;
        
        if (isScreenVisible !== this.screenObject.isScreenVisible) {
            
            var newVisualization = isScreenVisible ? 'screen' : 'ar';
            
            if (newVisualization === 'screen') {
                this.screenObject.scale = realityEditor.gui.ar.positioning.getPositionData(screenFrame).scale;
            }
            
            realityEditor.gui.ar.draw.changeVisualization(screenFrame, newVisualization);
            
            // var touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
            // screenFrame.currentTouchOffset = {
            //     x: 284,
            //     y: 160
            // };
            // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(screenFrame, touchPosition.x, touchPosition.y);
            
            realityEditor.app.tap();
            
            this.screenObject.isScreenVisible = isScreenVisible;
            realityEditor.gui.screenExtension.updateArFrameVisibility();
        }

    }
};

realityEditor.gui.screenExtension.sendScreenObject = function (){
    if(this.activeScreenObject.frame) {
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
        if (this.screenObject.isScreenVisible) {
            thisFrame.visualization = "screen";
        } else {
            thisFrame.visualization = "ar";
        }
    }
};
