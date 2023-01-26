createNameSpace('realityEditor.gui.focus');

(function(exports) {
    let focus;
    
    function initService() {
        console.log('%c focus init', 'color: red');
    }

    window.addEventListener('pointerdown', (e) => {
        if (e.button === 2) handleRightClick(e);
    });
    
    function handleRightClick(e) {
        
    }
    
    function addFocus() {
        
    }
    
    function updateFocus() {
        
    }
    
    function cameraFocus() {
        
    }
    
    exports.initService = initService;
})(realityEditor.gui.focus);
