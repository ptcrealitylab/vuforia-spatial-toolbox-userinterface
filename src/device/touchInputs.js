createNameSpace("realityEditor.device.touchInputs");

/**
 * @fileOverview realityEditor.device.touchInputs.js
 * Provides a central location where document multi-touch events are handled.
 * Additional modules and experiments (e.g. the screenExtension) can plug into these for touch interaction.
 */

/**
 * Document touch down event handler that is always present.
 * @param {TouchEvent} eventObject
 */
realityEditor.device.touchInputs.screenTouchStart = function(eventObject){
    // console.log("start", eventObject);
    
    realityEditor.gui.screenExtension.touchStart(eventObject)
};

/**
 * Document touch up event handler that is always present.
 * @param {TouchEvent} eventObject
 */
realityEditor.device.touchInputs.screenTouchEnd = function(eventObject){
   // console.log("end", eventObject.x, eventObject.y);
   // console.log("end", eventObject);
    realityEditor.gui.screenExtension.touchEnd(eventObject);
};

/**
 * Document touch move event handler that is always present.
 * @param {TouchEvent} eventObject
 */
realityEditor.device.touchInputs.screenTouchMove = function(eventObject){
   // console.log("move", eventObject.x, eventObject.y);
   // console.log("move", eventObject.multiTouch.firstFinger.type, eventObject.multiTouch.secondFinger.type);
   //  console.log("move", eventObject);
    realityEditor.gui.screenExtension.touchMove(eventObject);

   //realityEditor.device.onMultiTouchMove(eventObject);
    
};

/**
 * Update function that is always present and gets called as often as Vuforia update loop (AR rendering) occurs.
 */
realityEditor.device.touchInputs.update = function(){

    realityEditor.gui.screenExtension.update();

};


