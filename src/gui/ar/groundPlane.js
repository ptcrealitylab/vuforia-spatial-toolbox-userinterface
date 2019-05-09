createNameSpace("realityEditor.gui.ar.groundPlane");

/**
 * @fileOverview realityEditor.gui.ar.groundPlane.js
 * Contains feature code for ground plane visualization and matrix subscription
 */

(function(exports) {
    
    var groundPlaneId = 'groundPlaneAnchor';
    
    function initFeature() {
        console.warn('This module currently doesnt work / add any useful behavior to the app');
        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
            if (typeof visibleObjects[groundPlaneId] !== 'undefined') {
                renderGroundPlane(visibleObjects[groundPlaneId]);
            }
        });
        
        realityEditor.device.registerCallback('onDocumentMultiTouchStart', function(params) {
            if (realityEditor.device.utilities.isEventHittingBackground(params.event)) {
                var normalizedScreenX = params.event.pageX / window.innerWidth;
                var normalizedScreenY = params.event.pageY / window.innerHeight;
                realityEditor.app.tryPlacingGroundAnchor(normalizedScreenX, normalizedScreenY, 'realityEditor.app.callbacks.didAddGroundAnchor');
            }
        });
    }

    /**
     * compute the ModelView matrix by multiplying the object matrix (model) with the camera matrix (view)
     * we need to modify the object and camera matrices before we multiply them together to align their axes and scales
     * @param {Array.<number>} modelMatrix
     */
    function renderGroundPlane(modelMatrix) {
        
        var matrix = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(realityEditor.gui.ar.draw.rotateX, modelMatrix, matrix);
        realityEditor.gui.ar.utilities.multiplyMatrix(matrix, realityEditor.gui.ar.draw.correctedCameraMatrix, modelMatrix);
        
        if (globalStates.debugSpeechConsole) {
            document.getElementById('speechConsole').innerHTML = realityEditor.gui.ar.utilities.prettyPrintMatrix(modelMatrix, 2, true);
        }
        realityEditor.gui.ar.draw.ar.utilities.multiplyMatrix(modelMatrix, globalStates.projectionMatrix, matrix);

        var visualizer = getGroundPlaneVisualizer();
        visualizer.style.transform = 'matrix3d(' + matrix.toString() + ')';

    }
    
    function getGroundPlaneVisualizer() {
        if (!globalDOMCache[groundPlaneId]) {
            var visualizer = document.createElement('div');
            visualizer.id = groundPlaneId;
            visualizer.classList.add('groundPlaneVisualizer');
            visualizer.classList.add('main');
            
            // document.body.appendChild(visualizer);
            document.getElementById("GUI").appendChild(visualizer);

            globalDOMCache[groundPlaneId] = visualizer;
        }
        return globalDOMCache[groundPlaneId];
    }
    
    exports.initFeature = initFeature;
    
})(realityEditor.gui.ar.groundPlane);
