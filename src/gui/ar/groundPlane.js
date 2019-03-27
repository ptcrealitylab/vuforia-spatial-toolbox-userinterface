createNameSpace("realityEditor.gui.ar.groundPlane");

/**
 * @fileOverview realityEditor.gui.ar.groundPlane.js
 * Contains feature code for ground plane visualization and matrix subscription
 */

(function(exports) {
    
    var groundPlaneId = 'groundPlaneAnchor';
    
    function initFeature() {
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
        /*
              
        var modelViewMatrix = [];

        var cameraRotation = realityEditor.gui.ar.draw.utilities.extractRotation(realityEditor.gui.ar.draw.cameraMatrix, true, true, false);
        var cameraTranslation = realityEditor.gui.ar.draw.utilities.extractTranslation(realityEditor.gui.ar.utilities.invertMatrix(realityEditor.gui.ar.draw.cameraMatrix), false, true, true);
       
        // this has been moved into the application
        // cameraTranslation[12] *= mmToMeterScale; // scale to match the object matrix adjustment
        //cameraTranslation[13] *= mmToMeterScale;
        //cameraTranslation[14] *= mmToMeterScale;

        var modelRotation = realityEditor.gui.ar.draw.utilities.extractRotation(realityEditor.gui.ar.draw.utilities.transposeMatrix(modelMatrix), false, true, true);
        var modelTranslation = realityEditor.gui.ar.draw.utilities.extractTranslation(modelMatrix, false, false, false);

        var m1 = [];
        var m2 = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(modelRotation, modelTranslation, m1);
        realityEditor.gui.ar.utilities.multiplyMatrix(cameraRotation, cameraTranslation, m2);
        realityEditor.gui.ar.utilities.multiplyMatrix(m1, m2, modelViewMatrix);

        if (globalStates.debugSpeechConsole) {
            document.getElementById('speechConsole').innerHTML = realityEditor.gui.ar.utilities.prettyPrintMatrix(modelMatrix, 2, true) + '<br><br>' + realityEditor.gui.ar.utilities.prettyPrintMatrix(modelViewMatrix, 2, true);
        }

        // modelViewMatrix = modelMatrix;

        // realityEditor.gui.ar.draw.visibleObjects[objectKey] = modelViewMatrix;

        // compute its ModelViewProjection matrix
        var activeObjectMatrix = [];
        realityEditor.gui.ar.draw.ar.utilities.multiplyMatrix(modelViewMatrix, globalStates.projectionMatrix, activeObjectMatrix);

        var visualizer = getGroundPlaneVisualizer();
        visualizer.style.webkitTransform = 'matrix3d(' + activeObjectMatrix.toString() + ')';


    */
        
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
