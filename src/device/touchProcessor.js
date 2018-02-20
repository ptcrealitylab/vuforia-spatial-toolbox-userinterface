function TouchProcessor(touchDiv) {
    
    (function init() {
        touchDiv.addEventListener('touchdown', onTouchDown);
        touchDiv.addEventListener('touchmove', onTouchMove);
        touchDiv.addEventListener('touchup', onTouchUp);
    })();

    // function getAllDivsUnderCoordinate(x, y) {
    //     var res = [];
    //
    //     var ele = document.elementFromPoint(x,y);
    //     while(ele && ele.tagName !== "BODY" && ele.tagName !== "HTML"){
    //         res.push(ele);
    //         ele.style.display = "none";
    //         ele = document.elementFromPoint(x,y);
    //     }
    //
    //     for(var i = 0; i < res.length; i++){
    //         res[i].style.display = "";  // TODO: more correct if you set back to original display type
    //     }
    //     console.log(res);
    //     return res;
    // }

    function onTouchDown(event) {
        processTouchEvent('touchdown', event.pageX, event.pageY);
       
    }    
    function onTouchMove(event) {
        processTouchEvent('touchmove', event.pageX, event.pageY);
    }    
    function onTouchUp(event) {
        processTouchEvent('touchup', event.pageX, event.pageY);
  
    }

    function processTouchEvent(eventName, x, y) {
        var processedElements = [];
        var element = document.elementFromPoint(x,y);
        while (isTouchableElement(element)) {
            var propagateBehind = triggerEventOnElement(eventName, x, y, element);
            processedElements.push({element: element, display: element.style.display});
            element.style.display = 'none';
        }

        while(element && element.tagName !== "BODY" && ele.tagName !== "HTML"){
            res.push(ele);
            ele.style.display = "none";
            ele = document.elementFromPoint(x,y);
        }

    }

    function isTouchableElement(element) {
        return (element && element.tagName !== "BODY" && element.tagName !== "HTML");
    }

    function triggerEventOnElement(eventName, x, y, element) {
        // TODO: problem: how to make this work for externally-developed iframes that dont conform to our touch API
        // can we check if the element responds to a custom event message, and send that if it does?
        // otherwise we send a standard synthesized touch message and it doesn't continue by default
        return true;
    }

}
