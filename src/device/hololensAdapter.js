createNameSpace("realityEditor.device.hololensAdapter");

/**
 * @fileOverview realityEditor.device.hololensAdapter.js
 * Contains hololens-specific feature code.
 */


(function(exports) {
    
    var hololensMode;
    var hololensSide;
    
    function initFeature() {
        realityEditor.network.addPostMessageHandler('hololensMessage', handleHololensMessage);
    }
    
    function handleHololensMessage(msgContent) {

        console.log(hololensSide + ' eye received message', msgContent);

        if (typeof msgContent.projectionMatrix !== "undefined") {
            console.log('set projection matrix', msgContent.projectionMatrix);
            realityEditor.gui.ar.setProjectionMatrix(msgContent.projectionMatrix);
        }

        if (typeof msgContent.toggleNodeView !== "undefined") {
            console.log('toggle node view', msgContent.toggleNodeView);

            if (msgContent.toggleNodeView) {
                globalStates.logicButtonDown = true;
                realityEditor.gui.buttons.logicButtonUp({button: "logic"});
            } else {
                globalStates.guiButtonDown = true;
                realityEditor.gui.buttons.guiButtonUp({button: "gui"});
            }

        }

        if (typeof msgContent.toggleHololensMode !== "undefined") {
            console.log('toggle hololens mode (' + msgContent.hololensSide + ')', msgContent.toggleHololensMode);
            // hololensMode = msgContent.hololensMode;
            hololensSide = msgContent.hololensSide;
            toggleHololensMode(msgContent.toggleHololensMode);
        }
    }
    
    function toggleHololensMode(newMode) {
        hololensMode = newMode;
        
        // hide UI
        globalStates.clearSkyState = newMode;
        if (globalStates.clearSkyState) {
            document.getElementById("UIButtons").classList.add('clearSky');
        } else {
            document.getElementById("UIButtons").classList.remove('clearSky');
        }
    }
    
    exports.initFeature = initFeature;
    exports.toggleHololensMode = toggleHololensMode;

}(realityEditor.device.hololensAdapter));
