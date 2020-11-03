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
        realityEditor.gui.buttons.registerCallbackForButton('groundPlaneReset', function(params) {
            if (params.newButtonState === 'down') {
                // search for groundplane when button is pressed
                realityEditor.app.callbacks.startGroundPlaneTrackerIfNeeded();
            }
        });

        // when the app loads, check once if it needs groundPlane and start up the tracker if so
        // TODO: wait until camera moves enough before trying to detect groundplane or it goes to origin
        setTimeout(function() {
            realityEditor.app.callbacks.startGroundPlaneTrackerIfNeeded();
        }, 1000);
    }

    function startVisualization() {
        // add a scene node to the groundPlane's rotateX sceneGraph node
        if (!realityEditor.sceneGraph.getVisualElement(elementName)) {
            let groundPlaneSceneNode = realityEditor.sceneGraph.getSceneNodeById('GROUNDPLANE');

            // Ground plane must exist.. if it doesn't reschedule this to happen later
            if (!groundPlaneSceneNode) {
                setTimeout(function() {
                    console.log('waiting for groundPlane sceneGraph before starting visualization');
                    startVisualization();
                }, 100);
                return;
            }
            elementId = realityEditor.sceneGraph.addVisualElement(elementName, groundPlaneSceneNode);
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
        element = getOriginElement();
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
        let untransformedMatrix = realityEditor.sceneGraph.getCSSMatrix(elementId);

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

        let element = getVisualizerElement();
        element.style.transform = 'matrix3d(' + finalMatrix.toString() + ')';
    }

    const visualizerContentSize = 100;

    function getVisualizerElement() {
        if (!globalDOMCache[elementId]) {
            // create if it doesn't exist
            // first create a container with the width and height of the screen. then add to that

            // TODO: fiX the offset of the ground plane element so that it stays centered on the screen
            // let offsetContainer = document.createElement('div');
            // offsetContainer.classList.add('main');
            // offsetContainer.id = 'offset' + elementId;

            let visualizerContainer = document.createElement('div');
            visualizerContainer.id = elementId;
            visualizerContainer.classList.add('ignorePointerEvents', 'main', 'visibleFrameContainer');
            // IMPORTANT NOTE: the container size must be the size of the screen for the 3d math to work
            visualizerContainer.style.width = globalStates.height + 'px';
            visualizerContainer.style.height = globalStates.width + 'px';

            // the contents are a different size than the screen, so we add another div and center it
            let visualizerContents = document.createElement('img');
            visualizerContents.src = '../../../svg/groundplane-corners.svg';
            visualizerContents.id = 'visualizerContents' + elementId;
            visualizerContents.classList.add('groundPlaneVisualizer', 'usePointerEvents');
            visualizerContents.style.left = (globalStates.height/2 - visualizerContentSize/2) + 'px';
            visualizerContents.style.top = (globalStates.width/2 - visualizerContentSize/2) + 'px';

            // offsetContainer.appendChild(visualizerContainer);
            visualizerContainer.appendChild(visualizerContents);

            globalDOMCache[elementId] = visualizerContainer;
            globalDOMCache['visualizerContents' + elementId] = visualizerContents;
            // globalDOMCache['offset' + elementId] = offsetContainer;
        }

        return globalDOMCache[elementId];
    }

    function getOriginElement() {
        if (!globalDOMCache[originId]) {
            // create if it doesn't exist
            // first create a container with the width and height of the screen. then add to that

            let originContainer = document.createElement('div');
            originContainer.id = originId;
            originContainer.classList.add('ignorePointerEvents', 'main', 'visibleFrameContainer');
            // IMPORTANT NOTE: the container size must be the size of the screen for the 3d math to work
            originContainer.style.width = globalStates.height + 'px';
            originContainer.style.height = globalStates.width + 'px';

            // the contents are a different size than the screen, so we add another div and center it
            let visualizerContents = document.createElement('img');
            visualizerContents.src = '../../../svg/groundplane-crosshair.svg';
            visualizerContents.id = 'visualizerContents' + elementId;
            visualizerContents.classList.add('groundPlaneOrigin', 'usePointerEvents');
            visualizerContents.style.left = (globalStates.height/2 - visualizerContentSize/2) + 'px';
            visualizerContents.style.top = (globalStates.width/2 - visualizerContentSize/2) + 'px';

            originContainer.appendChild(visualizerContents);

            globalDOMCache[originId] = originContainer;
            globalDOMCache['visualizerContents' + originId] = visualizerContents;
        }

        return globalDOMCache[originId];
    }

    exports.initService = initService;

}(realityEditor.gui.ar.groundPlaneRenderer));
