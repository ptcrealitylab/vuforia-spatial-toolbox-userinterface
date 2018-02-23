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
    this.screenObject.closestObject = realityEditor.gui.ar.getClosestObject()[0];
    var thisObject = objects[this.screenObject.closestObject];
    this.screenObject.touchState = eventObject.type;
    if(eventObject.type === "touchstart") {
        // if (thisObject) {
        //     var thisFrame = thisObject.frames[this.screenObject.frame];
        //     if (thisFrame) {
        //         this.screenObject.isScreenVisible = (thisFrame.visualization === "screen");
        //     }
        // }
        this.screenObject.isScreenVisible = true; // TODO: only if tapped on screen frame;
        
        //TODO: finish implementing so doesnt start touch on screen if touch hits an AR frame first
        // if (this.screenObject.object && this.screenObject.frame) {
        //     var thisFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
        //    
        // }
        
        
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
    // TODO BEN Replace with exact 3D plane location
    
    
    if (this.screenObject.closestObject && this.screenObject.isScreenVisible) {
        var point = realityEditor.gui.ar.utilities.screenCoordinatesToMarkerXY(this.screenObject.closestObject, eventObject.x, eventObject.y);
        // console.log(point);
        this.screenObject.x = point.x; // offset by half the screen width
        this.screenObject.y = point.y; // offset by half the screen height

        if (this.screenObject.object && this.screenObject.frame && this.screenObject.object === this.screenObject.closestObject) {
            var matchingARFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
            if (matchingARFrame && matchingARFrame.visualization === 'screen') {
                // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(matchingARFrame, eventObject.x, eventObject.y, true);

                // var positionData = realityEditor.gui.ar.positioning.getPositionData(matchingARFrame);
                // positionData.x = point.x;
                // positionData.y = point.y;

                matchingARFrame.ar.x = point.x;
                matchingARFrame.ar.y = point.y;
                // if (this.screenObject.scale) {
                //     matchingARFrame.ar.scale = this.screenObject.scale;
                // }

                // if (this.screenObject.isScreenVisible) {
                //     realityEditor.gui.ar.draw.changeVisualization(matchingARFrame, 'ar');
                //     this.screenObject.isScreenVisible = false;
                //     realityEditor.gui.screenExtension.updateArFrameVisibility();
                // }
            }
        }
    }
    

    // var results = realityEditor.gui.ar.utilities.screenCoordinatesToMarkerXY(this.screenObject.closestObject, eventObject.x, eventObject.y);


    // var closestFrame = realityEditor.gui.ar.getClosestFrame()[1];
    // var frame = realityEditor.getFrame(this.screenObject.closestObject, closestFrame);
    
    /*
    // TODO: get away from using this temporary fix --> implement screenCoordinatesToMarkerXY
    var frame = null;
    realityEditor.forEachFrameInObject(this.screenObject.closestObject, function(objectKey, frameKey) {
        var thisFrame = realityEditor.getFrame(objectKey, frameKey);
        if (thisFrame.name === 'default') {
            frame = thisFrame;
        }
    });
    
    if (frame) {
        var point = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY_finalMatrix(frame.mostRecentFinalMatrix, eventObject.x, eventObject.y, true);
        this.screenObject.x = point.x;// - results.offsetLeft - 150; // relative to center of marker, not upper left
        this.screenObject.y = point.y;// - results.offsetTop - 150;
    }
    */
    
    /*
    if (frame && globalDOMCache[frame.uuid]) {
        var results = realityEditor.gui.ar.utilities.screenCoordinatesToMatrixXY(frame, eventObject.x, eventObject.y, true);
        this.screenObject.x = results.point.x - results.offsetLeft - 150; // relative to center of marker, not upper left
        this.screenObject.y = results.point.y - results.offsetTop - 150;
        
        var matchingARFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);
        if (matchingARFrame) {
            realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(matchingARFrame, eventObject.x, eventObject.y, true);
        }
        
        // console.log(eventObject.x + ' -> ' + this.screenObject.x);
        // console.log(eventObject.y + ' -> ' + this.screenObject.y);
    } else {
        console.log('can\'t find default frame')
    }
    */
    
    /*else {
        this.screenObject.x = eventObject.x - thisObject.screenX;
        this.screenObject.y = eventObject.y - thisObject.screenY;
    }*/
};

realityEditor.gui.screenExtension.calculatePushPop = function (){
    
    // TODO BEN Switch this boolean for when to switch from screen to AR and back.
    
    var screenFrame = realityEditor.getFrame(this.screenObject.object, this.screenObject.frame);

    var isScreenObjectVisible = !!realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object];
    if (screenFrame && isScreenObjectVisible) {
        // console.log('I have a screen frame');
        
        
        var screenFrameMatrix = realityEditor.gui.ar.utilities.repositionedMatrix(realityEditor.gui.ar.draw.visibleObjects[this.screenObject.object], screenFrame);
        
        // Method 1. Use the full distance to the frame.
        var distanceToFrame = realityEditor.gui.ar.utilities.distance(screenFrameMatrix);
        
        // Methods 2. Use only the z distance to the marker plane.
        // var distanceToFrame = screenFrameMatrix[14];

        // console.log(distanceToFrame);
        
        if (!globalStates.initialDistance) {
            globalStates.initialDistance = distanceToFrame;
        }
        
        var isScreenVisible = this.screenObject.isScreenVisible;

        // // if frame is on screen, must be pulled out at least 200 to move to AR
        // if (this.screenObject.isScreenVisible && (distanceToFrame - globalStates.initialDistance > 25)) {
        //     isScreenVisible = false;
        //
        //     // if frame is in AR, must be pushed in at least 200 to move to screen
        // } else if (!this.screenObject.isScreenVisible && (distanceToFrame - globalStates.initialDistance < -25)) {
        //     isScreenVisible = true;
        // }
        
        if (distanceToFrame > (globalStates.initialDistance + 50)) {
            isScreenVisible = false;
        } else if (distanceToFrame < (globalStates.initialDistance - 50)) {
            isScreenVisible = true;
        }

        // var isScreenVisible = distanceToFrame < 1000;
        
        if (isScreenVisible !== this.screenObject.isScreenVisible) {
            
            var newVisualization = isScreenVisible ? 'screen' : 'ar';
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
