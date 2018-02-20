createNameSpace("realityEditor.device.touchInputs");


realityEditor.device.touchInputs.screenTouchStart = function(eventObject){
   // console.log("start", eventObject.x, eventObject.y);
    
    realityEditor.gui.screenExtension.touchStart(eventObject)
};

realityEditor.device.touchInputs.screenTouchEnd = function(eventObject){
   // console.log("end", eventObject.x, eventObject.y);

    realityEditor.gui.screenExtension.touchEnd(eventObject);
};

realityEditor.device.touchInputs.screenTouchMove = function(eventObject){
   // console.log("move", eventObject.x, eventObject.y);
    realityEditor.gui.screenExtension.touchMove(eventObject);
    
};

realityEditor.device.touchInputs.update = function(){

    realityEditor.gui.screenExtension.update();

};


