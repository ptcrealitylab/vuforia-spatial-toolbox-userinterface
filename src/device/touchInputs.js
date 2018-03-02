createNameSpace("realityEditor.device.touchInputs");


realityEditor.device.touchInputs.screenTouchStart = function(eventObject){
    console.log("start", eventObject);
    
    realityEditor.gui.screenExtension.touchStart(eventObject)
};

realityEditor.device.touchInputs.screenTouchEnd = function(eventObject){
   // console.log("end", eventObject.x, eventObject.y);
   // console.log("end", eventObject);
    realityEditor.gui.screenExtension.touchEnd(eventObject);
};

realityEditor.device.touchInputs.screenTouchMove = function(eventObject){
   // console.log("move", eventObject.x, eventObject.y);
   // console.log("move", eventObject.multiTouch.firstFinger.type, eventObject.multiTouch.secondFinger.type);
    console.log("move", eventObject);
    realityEditor.gui.screenExtension.touchMove(eventObject);

   //realityEditor.device.onMultiTouchMove(eventObject);
    
};

realityEditor.device.touchInputs.update = function(){

    realityEditor.gui.screenExtension.update();

};


