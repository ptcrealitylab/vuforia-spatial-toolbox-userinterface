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
        this.screenObject.isScreenVisible = (thisObject.visualization === "ar");
    } else if(eventObject.type === "touchend") {
        this.screenObject.x = 0;
        this.screenObject.y = 0;
        this.screenObject.scale = 1;
        this.screenObject.object = null;
        this.screenObject.frame = null;
        this.screenObject.node = null;
        this.screenObject.closestObject = null;
        this.screenObject.touchState = null;
    }
    // console.log(thisObject);
    // TODO BEN Replace with exact 3D plane location
    
    this.screenObject.x = eventObject.x- thisObject.screenX;
    this.screenObject.y = eventObject.y- thisObject.screenY;
};

realityEditor.gui.screenExtension.calculatePushPop = function (){
    
    // TODO BEN Switch this boolean for when to switch from screen to AR and back.
    
    var isScreenVisible = false;
    if(isScreenVisible !== this.screenObject.isScreenVisible){
        this.screenObject.isScreenVisible =  isScreenVisible;
        realityEditor.gui.screenExtension.updateArFrameVisibility();
    }
    
};

realityEditor.gui.screenExtension.sendScreenObject = function (){
if(this.activeScreenObject.frame) {
    globalDOMCache["iframe" + this.activeScreenObject.frame].contentWindow.postMessage(JSON.stringify({
        screenObject: this.screenObject
    }), '*');
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
