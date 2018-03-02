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
    if(realityEditor.gui.screenExtension.activeScreenObject.frame) {
        realityEditor.gui.screenExtension.sendScreenObject();
    }
    //console.log("start", this.screenObject);
};

realityEditor.gui.screenExtension.touchMove = function (eventObject){
    this.updateScreenObject(eventObject);
    if(realityEditor.gui.screenExtension.activeScreenObject.frame) {
        realityEditor.gui.screenExtension.sendScreenObject();
    }
    //console.log("move", this.screenObject);
};

realityEditor.gui.screenExtension.touchEnd = function (eventObject){
    this.updateScreenObject(eventObject);
    if(realityEditor.gui.screenExtension.activeScreenObject.frame) {
        realityEditor.gui.screenExtension.sendScreenObject();
        
    }
    
    this.screenObject.x = 0;
    this.screenObject.y = 0;
    this.screenObject.scale = 1;
    this.screenObject.object = null;
    this.screenObject.frame = null;
    this.screenObject.node = null;
    this.screenObject.closestObject = null;
    this.screenObject.touchState = null;
    
    globalStates.initialDistance = null;
        
    //console.log("end", this.screenObject);
};

realityEditor.gui.screenExtension.update = function (){

    if (globalStates.guiState !== 'ui') return;
    if (!realityEditor.gui.ar.draw.areAnyScreensVisible()) return;

    // console.log("end", this.screenObject);
    if(this.screenObject.touchState) {
        if(realityEditor.gui.screenExtension.activeScreenObject.frame) {
            realityEditor.gui.screenExtension.calculatePushPop();
        }
    }
};

realityEditor.gui.screenExtension.receiveObject = function (object){

    console.log(object);
    this.screenObject.object = object.object;
    this.screenObject.frame = object.frame;
    this.screenObject.node = object.node;
    
    globalStates.waitingForScreenObject = false;
};

realityEditor.gui.screenExtension.updateScreenObject = function (eventObject){

    if (globalStates.guiState !== 'ui') return;
    if (!realityEditor.gui.ar.draw.areAnyScreensVisible()) return;

    this.screenObject.closestObject = realityEditor.gui.ar.getClosestObject()[0];
    var thisObject = objects[this.screenObject.closestObject];
    this.screenObject.touchState = eventObject.type;
    if(eventObject.type === "touchstart") {
        
        var didTouchARFrame = (eventObject.object && eventObject.frame);
        
        if (didTouchARFrame) {
            console.log('should have an AR element', eventObject);
        } else {
            console.log('should be null', eventObject);
        }
        
        // if (eventObject.object && eventObject.frame) {
        //     didTouchARFrame = true;
            this.screenObject.object = eventObject.object;
            this.screenObject.frame = eventObject.frame;
            this.screenObject.node = eventObject.node;
        // }
        
        this.screenObject.isScreenVisible = !didTouchARFrame;
        globalStates.didStartPullingFromScreen = !didTouchARFrame;
        
        if (!didTouchARFrame) {
            globalStates.waitingForScreenObject = true;
            console.log('begin waiting');
        }
        
    } /*else if(eventObject.type === "touchend") {
        this.screenObject.x = 0;
        this.screenObject.y = 0;
        this.screenObject.scale = 1;
        this.screenObject.object = null;
        this.screenObject.frame = null;
        this.screenObject.node = null;
        this.screenObject.closestObject = null;
        this.screenObject.touchState = null;
        
        globalStates.initialDistance = null;
    }*/
    // console.log(thisObject);
    
    if (this.screenObject.closestObject && this.screenObject.isScreenVisible  && eventObject.type !== "touchend") {
        
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
            }
        }
    }
};


function onScreenTouchDown(eventObject) {
    // figure out if I'm touching on AR frame, screen frame, or nothing

    this.screenObject.object = eventObject.object;
    this.screenObject.frame = eventObject.frame;
    this.screenObject.node = eventObject.node;

    var didTouchARFrame = (eventObject.object && eventObject.frame);

    this.screenObject.isScreenVisible = !didTouchARFrame;
    globalStates.didStartPullingFromScreen = !didTouchARFrame;

    if (!didTouchARFrame) {
        globalStates.waitingForScreenObject = true;
    }
}

function onScreenTouchMove(eventObject) {
    // do nothing other than send xy to screen // maybe iff I'm touching on screen frame, move AR frame to mirror its position

    // calculate the exact x,y coordinate within the screen plane that this touch corresponds to
    var point = realityEditor.gui.ar.utilities.screenCoordinatesToMarkerXY(this.screenObject.closestObject, eventObject.x, eventObject.y);
    this.screenObject.x = point.x;
    this.screenObject.y = point.y;
    
    // also needs to update AR frame positions so that nodes float above them
    
}

function onScreenTouchUp(eventObject) {
    // reset screen object to null and update screen state to match
    this.screenObject.object = null;
    this.screenObject.frame = null;
    this.screenObject.node = null;
}

function onScreenPushIn() {
    // set screen object visible, wait to hear that the screen received it, then hide AR frame
    var isScreenVisible = true;
    
    if (isScreenVisible !== this.screenObject.isScreenVisible) {

        this.screenObject.isScreenVisible = true;
        this.screenObject.scale = realityEditor.gui.ar.positioning.getPositionData(screenFrame).scale;
        // realityEditor.gui.ar.draw.changeVisualization(screenFrame, newVisualization); // TODO: combine this with updateArFrameVisibility
        realityEditor.app.tap();
        realityEditor.gui.screenExtension.updateArFrameVisibility();
    }
    
}

function onScreenPullOut() {
    // set screen object hidden, wait to hear that the screen received it, then move AR frame to position and show AR frame

    var isScreenVisible = false;

    if (isScreenVisible !== this.screenObject.isScreenVisible) {

        this.screenObject.isScreenVisible = false;
        // realityEditor.gui.ar.draw.changeVisualization(screenFrame, newVisualization); // TODO: combine this with updateArFrameVisibility
        realityEditor.app.tap();
        realityEditor.gui.screenExtension.updateArFrameVisibility();
    }
    
}

realityEditor.gui.screenExtension.calculatePushPop = function (){
    
    var screenFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
    
    if (!screenFrame && globalStates.inTransitionObject && globalStates.inTransitionFrame) {
        this.screenObject.object = this.screenObject.closestObject;
        this.screenObject.frame = globalStates.inTransitionFrame;
        screenFrame = realityEditor.getFrame(globalStates.inTransitionObject, globalStates.inTransitionFrame);
    }

    var isScreenObjectVisible = !!realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object];
    if (screenFrame && isScreenObjectVisible) {

        console.log('waiting', globalStates.waitingForScreenObject);
        
        var screenFrameMatrix = realityEditor.gui.ar.utilities.repositionedMatrix(realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object], screenFrame);

        if (globalStates.inTransitionObject && globalStates.inTransitionFrame) {
            if (!globalStates.initialDistance) {
                var realDistanceToUnconstrainedFrame = realityEditor.gui.ar.utilities.distance(screenFrameMatrix);
                globalStates.initialDistance = realDistanceToUnconstrainedFrame * 0.9; // make global frames a bit harder to push into the screen by *= 0.9
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
        
        if (!globalStates.initialDistance) {
            globalStates.initialDistance = distanceToFrame;
        }

        // console.log('I have a screen frame', this.screenObject.object, this.screenObject.frame, distanceToFrame, globalStates.initialDistance);

        var isScreenVisible = this.screenObject.isScreenVisible;
        
        var distanceThreshold = globalStates.framePullThreshold;

        if (distanceToFrame > (globalStates.initialDistance + distanceThreshold)) {
            isScreenVisible = false;
        } else if (distanceToFrame < (globalStates.initialDistance - distanceThreshold)) {
            isScreenVisible = true;
        }
        
        if (isScreenVisible !== this.screenObject.isScreenVisible) {
            
            var newVisualization = isScreenVisible ? 'screen' : 'ar';
            
            if (newVisualization === 'screen') {
                this.screenObject.scale = realityEditor.gui.ar.positioning.getPositionData(screenFrame).scale;
            }
            
            realityEditor.gui.ar.draw.changeVisualization(screenFrame, newVisualization); // TODO: combine this with updateArFrameVisibility
            
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
