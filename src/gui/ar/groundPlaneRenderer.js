/*
* Created by Ben Reynolds on 10/08/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.gui.ar.groundPlaneRenderer");

(function(exports) {

    let shouldVisualize = false;
    var isUpdateListenerRegistered = false;

    let elementName = 'groundPlaneVisualization';
    let elementId = null;
    
    let originName = 'groundPlaneOrigin';
    let originId = originName;
    
    let elementPositionData = {
        x: 0,
        y: 0
    };
    
    let centerPoint = new WebKitPoint(globalStates.height/2, globalStates.width/2);
    
    /**
     * Public init method to enable rendering ghosts of edited frames while in editing mode.
     */
    function initService() {

        realityEditor.gui.settings.addToggle('Visualize Ground Plane', 'shows detected ground plane', 'visualizeGroundPlane',  '../../../svg/powerSave.svg', false, function(newValue) {
            // only draw frame ghosts while in programming mode if we're not in power-save mode
            shouldVisualize = newValue;
            
            if (newValue) {
                globalStates.useGroundPlane = true; // makes sure the groundPlane position gets recalculated
                startVisualization();
                realityEditor.gui.menus.switchToMenu('groundPlane');
            } else {
                stopVisualization();
                realityEditor.gui.menus.switchToMenu('main');
            }
        });

        // // register callbacks to various buttons to perform commits
        // realityEditor.gui.buttons.registerCallbackForButton('reset', function(params) {
        //     if (params.newButtonState === 'up') {
        //         // Do something when button pressed
        //     }
        // });
        //
        //
        // // only adds the render update listener for frame history ghosts after you enter editing mode for the first time
        // // saves resources when we don't use the service
        // realityEditor.device.registerCallback('setEditingMode', function(params) {
        //     if (!isUpdateListenerRegistered && params.newEditingMode) {
        //
        //
        //
        //     }
        // });
    }
    
    function startVisualization() {
        // add a scene node to the groundPlane's rotateX sceneGraph node
        if (!realityEditor.gui.ar.sceneGraph.getVisualElement(elementName)) {
            let groundPlaneSceneNode = realityEditor.gui.ar.sceneGraph.getSceneNodeById('GROUNDPLANE');

            // Ground plane must exist.. if it doesn't reschedule this to happen later
            if (!groundPlaneSceneNode) {
                setTimeout(function() {
                    console.log('waiting for groundPlane sceneGraph before starting visualization');
                    startVisualization();
                }, 100);
                return;
            }
            elementId = realityEditor.gui.ar.sceneGraph.addVisualElement(elementName, groundPlaneSceneNode);
        }
        
        // create the DOM element that should visualize it and add it to the scene
        let element = getVisualizerElement();
        document.getElementById('GUI').appendChild(element);
        
        let origin = getOriginElement();
        document.getElementById('GUI').appendChild(origin);
        
        // add/activate the update loop
        if (!isUpdateListenerRegistered) {
            // registers a callback to the gui.ar.draw.update loop so that this module can manage its own rendering
            realityEditor.gui.ar.draw.addUpdateListener(onUpdate);
            isUpdateListenerRegistered = true;
        }
    }
    
    function stopVisualization() {
        let element = getVisualizerElement();
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }
    
    function onUpdate(_visibleObjects) {
        // render the ground plane visualizer
        if (!shouldVisualize) { return; } // TODO: actively unsubscribe on stop, so we don't have to ignore loop here
        
        // raycast from screen coordinates (center of screen) onto groundplane
        
        // move the visualizer element to the resulting (x,y)
        
        // this gets used for the origin and the moving visualizer
        let untransformedMatrix = realityEditor.gui.ar.sceneGraph.getCSSMatrix(elementId);
        
        let origin = getOriginElement();
        untransformedMatrix[14] = 10;
        origin.style.transform = 'matrix3d(' + untransformedMatrix.toString() + ')';
        
        // use the origin DOM element to convert the screen coordinate to the coordinate system of the plane
        elementPositionData = webkitConvertPointFromPageToNode(origin, centerPoint);

        let transform = [1, 0, 0, 0,
                         0, 1, 0, 0,
                         0, 0, 1, 0,
                         elementPositionData.x, elementPositionData.y, 0, 1];
        
        let finalMatrix = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(transform, untransformedMatrix, finalMatrix);
        
        // finalMatrix[14] = 10; // send to back
        
        
        let element = getVisualizerElement();
        element.style.transform = 'matrix3d(' + finalMatrix.toString() + ')';
    }

    const anchorContentSize = 100;

    function getVisualizerElement() {
        if (!globalDOMCache[elementId]) {
            // create if it doesn't exist
            // first create a container with the width and height of the screen. then add to that

            // let offsetContainer = document.createElement('div');
            // offsetContainer.classList.add('main');
            // offsetContainer.id = 'offset' + elementId;
            
            let anchorContainer = document.createElement('div');
            anchorContainer.id = elementId;
            anchorContainer.classList.add('ignorePointerEvents', 'main', 'visibleFrameContainer');
            // IMPORTANT NOTE: the container size MUST be the size of the screen for the 3d math to work
            // This is the same size as the containers that frames get added to.
            // If size differs, rendering will be inconsistent between frames and anchors.
            anchorContainer.style.width = globalStates.height + 'px';
            anchorContainer.style.height = globalStates.width + 'px';

            // the contents are a different size than the screen, so we add another div and center it
            let anchorContents = document.createElement('img');
            anchorContents.src = '../../../svg/groundplane-corners.svg';
            anchorContents.id = 'anchorContents' + elementId;
            anchorContents.classList.add('groundPlaneVisualizer', 'usePointerEvents');
            anchorContents.style.left = (globalStates.height/2 - anchorContentSize/2) + 'px';
            anchorContents.style.top = (globalStates.width/2 - anchorContentSize/2) + 'px';

            // offsetContainer.appendChild(anchorContainer);
            anchorContainer.appendChild(anchorContents);

            globalDOMCache[elementId] = anchorContainer;
            globalDOMCache['anchorContents' + elementId] = anchorContents;
            // globalDOMCache['offset' + elementId] = offsetContainer;
        }

        return globalDOMCache[elementId];
    }

    function getOriginElement() {
        if (!globalDOMCache[originId]) {
            // create if it doesn't exist
            // first create a container with the width and height of the screen. then add to that

            let anchorContainer = document.createElement('div');
            anchorContainer.id = originId;
            anchorContainer.classList.add('ignorePointerEvents', 'main', 'visibleFrameContainer');
            // IMPORTANT NOTE: the container size MUST be the size of the screen for the 3d math to work
            // This is the same size as the containers that frames get added to.
            // If size differs, rendering will be inconsistent between frames and anchors.
            anchorContainer.style.width = globalStates.height + 'px';
            anchorContainer.style.height = globalStates.width + 'px';

            // the contents are a different size than the screen, so we add another div and center it
            let anchorContents = document.createElement('img');
            anchorContents.src = '../../../svg/groundplane-crosshair.svg';
            anchorContents.id = 'anchorContents' + elementId;
            anchorContents.classList.add('groundPlaneOrigin', 'usePointerEvents');
            anchorContents.style.left = (globalStates.height/2 - anchorContentSize/2) + 'px';
            anchorContents.style.top = (globalStates.width/2 - anchorContentSize/2) + 'px';

            anchorContainer.appendChild(anchorContents);

            globalDOMCache[originId] = anchorContainer;
            globalDOMCache['anchorContents' + originId] = anchorContents;
        }

        return globalDOMCache[originId];
    }

    exports.initService = initService;

}(realityEditor.gui.ar.groundPlaneRenderer));
