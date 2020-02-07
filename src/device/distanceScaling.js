createNameSpace("realityEditor.device.distanceScaling");

/**
 * @fileOverview realityEditor.device.distanceScaling.js
 */

(function(exports) {
    
    // maps frameKeys to div elements visualizing the distance
    var allDistanceUIs = {};
    
    // placeholder link object to pass into the line rendering function, to prevent animation
    var linkObject = {
        ballAnimationCount: 0
    };
    
    var defaultDistance = 2000;
    exports.defaultDistance = defaultDistance;
    
    var isScalingDistance = false;
    
    var distanceScalingState = {
        objectKey: null,
        frameKey: null
    };
    
    var groundPlaneRotation = [];
    // var groundPlaneQuaternion = null;

    /**
     * @type {CallbackHandler}
     */
    var callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('device/distanceScaling');

    /**
     * Adds a callback function that will be invoked when the specified function is called
     * @param {string} functionName
     * @param {function} callback
     */
    exports.registerCallback = function(functionName, callback) {
        if (!callbackHandler) {
            callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('device/distanceScaling');
        }
        callbackHandler.registerCallback(functionName, callback);
    };
    
    function initService() {
        realityEditor.gui.ar.draw.addUpdateListener(loop);
        realityEditor.device.registerCallback('onDocumentMultiTouchStart', onDocumentMultiTouchStart);
        realityEditor.device.registerCallback('onDocumentMultiTouchEnd', onDocumentMultiTouchEnd);
        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
        
        realityEditor.gui.buttons.registerCallbackForButton('distance', onDistanceEditingModeChanged);
        realityEditor.gui.buttons.registerCallbackForButton('distanceGreen', onDistanceGreenPressed);
        
        if (realityEditor.device.utilities.isDesktop()) {
            console.log('adjusted default distance from ' + defaultDistance + ' to ' + defaultDistance*5 + ' (for desktop)');
            defaultDistance = defaultDistance * 10;
            exports.defaultDistance = defaultDistance;
        }
    }
    
    function loop() {
        
        // render the UIs if in distance editing mode or actively scaling one of them
        if (isScalingDistance || globalStates.distanceEditingMode) {
            realityEditor.gui.ar.draw.forEachVisibleFrame( function(objectKey, frameKey) {
                // if frame it is attached to no longer exists, remove it
                // otherwise render it
                transformDistanceUI(objectKey, frameKey);
            });
        }
        
        // only update the distanceScale of a frame and draw the distance line if you are actively scaling it
        if (isScalingDistance) {
            scaleEditingFrameDistance();

            globalCanvas.hasContent = true;
            var frame = realityEditor.device.getEditingVehicle();
            // noinspection JSSuspiciousNameCombination
            var screenWidth = globalStates.height;
            // noinspection JSSuspiciousNameCombination
            var screenHeight = globalStates.width;
            var startPoint = [screenWidth/2, screenHeight/2];
            var startWeight = 30;
            var colorCode = 4; // white
            var widthFactor = 0.25;
            linkObject.ballAnimationCount = 0; // prevent animation by resetting animation count each time
            realityEditor.gui.ar.lines.drawLine(globalCanvas.context, startPoint, [frame.screenX, frame.screenY], startWeight * widthFactor, frame.screenLinearZ * widthFactor, linkObject, timeCorrection, colorCode, colorCode);
        }
        
        var groundplaneContainer = document.getElementById('groundplaneContainer');
        if (!groundplaneContainer) {
            groundplaneContainer = document.createElement('div');
            groundplaneContainer.className = 'main';
            groundplaneContainer.id = 'groundplaneContainer';
            groundplaneContainer.style.position = 'absolute';
            groundplaneContainer.style.left = 0;
            groundplaneContainer.style.top = 0;
            document.body.appendChild(groundplaneContainer);
        }
        
        var element = document.getElementById('distanceGroundplaneUI');
        if (!element) {
            element = document.createElement('div');
            element.id = 'distanceGroundplaneUI';
            element.className = 'main';
            element.style.width = '736px';
            element.style.height = '414px';
            // element.style.visibility = 'visible';
            element.style.backgroundColor = 'red';
            groundplaneContainer.appendChild(element);
        }
        
        var DEBUG_DONT_SHOW_GROUNDPLANE_HALO = true;
        if (DEBUG_DONT_SHOW_GROUNDPLANE_HALO) { return; }
        
        if (realityEditor.gui.ar.draw.groundPlaneMatrix) {
            var rotatedGroundPlaneMatrix = [];
            var rotation3d = [
                1, 0, 0, 0,
                0, 0, 1, 0,
                0, 1, 0, 0,
                0, 0, 0, 1
            ];
            var finalMatrix = [];
            realityEditor.gui.ar.utilities.multiplyMatrix(rotation3d, realityEditor.gui.ar.draw.groundPlaneMatrix, rotatedGroundPlaneMatrix);
            realityEditor.gui.ar.utilities.multiplyMatrix(rotatedGroundPlaneMatrix, globalStates.projectionMatrix, finalMatrix);
            
            groundPlaneRotation = realityEditor.gui.ar.utilities.copyMatrix(finalMatrix);
            var perspectiveValue = groundPlaneRotation[15];
            groundPlaneRotation[12] = perspectiveValue * globalStates.height/2;
            groundPlaneRotation[13] = -1 * perspectiveValue * globalStates.width/2;
            groundPlaneRotation[14] = 0;
            // groundPlaneRotation[15] = 1;
            
            // groundPlaneQuaternion = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(groundPlaneRotation);
            
            // element.style.transform = 'matrix3d(' + groundPlaneRotation.toString() + ')';

            // var translatedGroundPlaneMatrix = [];
            // utilities.multiplyMatrix(matrix.r3, rotatedGroundPlaneMatrix, translatedGroundPlaneMatrix);
            // utilities.multiplyMatrix(translatedGroundPlaneMatrix, this.globalStates.projectionMatrix, finalMatrix);   

            realityEditor.gui.ar.draw.forEachVisibleFrame( function(objectKey, frameKey) {
                // if frame it is attached to no longer exists, remove it
                // otherwise render it
                // transformDistanceUI(objectKey, frameKey);
                
                var frame = realityEditor.getFrame(objectKey, frameKey);
                if (frame) {
                    
                    var frameMatrix = frame.mostRecentFinalMatrix;
                    // var normalizedFrameMatrix = realityEditor.gui.ar.utilities.normalizeMatrix(frameMatrix);
                    // var normalizedGroundplaneRotationMatrix = realityEditor.gui.ar.utilities.normalizeMatrix(groundPlaneRotation);
                    //
                    // normalizedGroundplaneRotationMatrix[12] = normalizedFrameMatrix[12];
                    // normalizedGroundplaneRotationMatrix[13] = normalizedFrameMatrix[13];
                    // normalizedGroundplaneRotationMatrix[14] = normalizedFrameMatrix[14];
                    
                    /*
                    var rotated = [];
                    var r = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(groundPlaneQuaternion);
                    realityEditor.gui.ar.utilities.multiplyMatrix(frameMatrix, r, rotated);
                    element.style.transform = 'matrix3d(' + rotated.toString() + ')';
                    */
                    
                    if (!frameMatrix) return;
                    
                    // element.style.transform = 'matrix3d(' + frameMatrix.toString() + ')';
                    element.style.visibility = 'visible';
                    
                    // TODO: calculate position of "halo" element
                    
                    // var frameQ = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(frameMatrix);
                    // var invFrameQ = realityEditor.gui.ar.utilities.invertQuaternion(frameQ);
                    
                    // var frameM = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(frameQ);
                    // var invFrameM = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(invFrameQ);
                    
                    var frameM = realityEditor.gui.ar.utilities.extractRotation(frameMatrix);
                    var invFrameM = realityEditor.gui.ar.utilities.invertMatrix(frameM);
                    
                    var rotated = [];
                    
                    realityEditor.gui.ar.utilities.multiplyMatrix(invFrameM, frameMatrix, rotated);

                    // var frameQ2 = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(rotated);
                    

                    element.style.transform = 'matrix3d(' + rotated.toString() + ')';


                }
                
            });
            
        }

        
        
    }

    /**
     * Remove a distanceUI when its frame gets deleted, so it doesn't get stuck on the screen
     * @param {{objectKey: string, frameKey: string, nodeKey: string|null}} params
     */
    function onVehicleDeleted(params) {
        if (params.objectKey && params.frameKey && !params.nodeKey) {
            hideDistanceUI(params.frameKey);
        }
    }

    /**
     * Start scaling distance when three finger touch starts
     * @param {{event: object}} params
     */
    function onDocumentMultiTouchStart(params) {
        // console.log(params.event);

        if (params.event.touches.length === 3) {
            var touchTargets = [].slice.call(event.touches).map(function(touch){return touch.target.id.replace(/^(svg)/,"")});
            if (touchTargets.indexOf(realityEditor.device.editingState.frame) > -1) {
                // console.log('change distance');
                isScalingDistance = true;
                distanceScalingState.objectKey = realityEditor.device.editingState.object;
                distanceScalingState.frameKey = realityEditor.device.editingState.frame;
                showDistanceUI(distanceScalingState.frameKey);
                realityEditor.device.disableUnconstrained();
            }
        }
    }

    /**
     * Stop scaling distance when three finger touch stops
     * @param {{event: object}} _params (unused)
     */
    function onDocumentMultiTouchEnd(_params) {
        // console.log(params.event);
        // if (params.event.touches.length < 3) {
        isScalingDistance = false;
        // }

        if (distanceScalingState.frameKey) {
            // don't hide it if we're in permanent distance editing mode
            if (!globalStates.distanceEditingMode) {
                hideDistanceUI(distanceScalingState.frameKey);
            }
            distanceScalingState.objectKey = null;
            distanceScalingState.frameKey = null;
        }

        realityEditor.device.enableUnconstrained();
        realityEditor.device.enablePinchToScale(); // just in case we didn't touch up on the green button

    }
    
    /**
     * Triggered when the distance editing mode button is pressed
     * @param {{buttonName: string, newButtonState: string}} params
     */
    function onDistanceEditingModeChanged(params) {
        console.log('registered in distanceScaling module', params.newButtonState, globalStates.distanceEditingMode);

        // 'leave' happens after 'up' so the changes to distanceEditingMode in buttons.js will have taken place
        if (params.newButtonState === 'leave') {
            var frameKey;
            if (globalStates.distanceEditingMode) {
                console.log('show all distance editing UIs');

                realityEditor.gui.ar.draw.forEachVisibleFrame( function(objectKey, frameKey) {
                    getDistanceUI(frameKey); // populates allDistanceUIs with new distanceUIs if they don't exist yet
                });
                
                for (frameKey in allDistanceUIs) {
                    if (!allDistanceUIs.hasOwnProperty(frameKey)) continue;
                    showDistanceUI(frameKey);
                }
                
            } else {
                console.log('hide all distance editing UIs');
                
                for (frameKey in allDistanceUIs) {
                    if (!allDistanceUIs.hasOwnProperty(frameKey)) continue;
                    hideDistanceUI(frameKey);
                }
            }
            
        }
    }
    
    function onDistanceGreenPressed(params) {
        
        if (params.newButtonState === 'down') {

            isScalingDistance = true;
            distanceScalingState.objectKey = realityEditor.device.editingState.object;
            distanceScalingState.frameKey = realityEditor.device.editingState.frame;
            showDistanceUI(distanceScalingState.frameKey);
            scaleEditingFrameDistance();
            realityEditor.device.disableUnconstrained();
            realityEditor.device.disablePinchToScale();
            
        } else if (params.newButtonState === 'up') {

            isScalingDistance = false;
            if (distanceScalingState.frameKey) {
                // don't hide it if we're in permanent distance editing mode
                if (!globalStates.distanceEditingMode) {
                    hideDistanceUI(distanceScalingState.frameKey);
                }
                distanceScalingState.objectKey = null;
                distanceScalingState.frameKey = null;
            }
            realityEditor.device.enableUnconstrained();
            realityEditor.device.enablePinchToScale();
            
        }
        
    }

    // adds a semi-transparent circle/sphere that indicates the maximum distance you can be from the frame for it to be rendered
    function createDistanceUI(frameKey) {
        if (globalDOMCache['object' + frameKey]) {
            var element = document.createElement('div');
            element.id = 'distanceUI' + frameKey;
            element.classList.add('main');
            element.classList.add('distanceUI');

            var diameterString = globalDOMCache['object' + frameKey].style.width; // when scale is at 1.0, should be the width of the frame // TODO: this might not be right anymore
            element.style.width = diameterString;
            element.style.height = diameterString;

            document.body.appendChild(element);
            return element;
        }
        
        return null;
    }

    /**
     * Updates the CSS 3D matrix of the distanceUI element for the given frame.
     * Matches the x,y,z position of the frame.
     * Scales according to the frame's distance scale, ignores its regular scale.
     * Doesn't rotate.
     * @param {string} objectKey
     * @param {string} frameKey
     */
    function transformDistanceUI(objectKey, frameKey) {
        var frame = realityEditor.getFrame(objectKey, frameKey);
        var editingVehicle = realityEditor.device.getEditingVehicle();
        var shouldRenderDistance = ((editingVehicle === frame) || globalStates.distanceEditingMode) && globalDOMCache['object'+frameKey];

        if (shouldRenderDistance) {
            var m1 = realityEditor.gui.ar.utilities.getTransform(globalDOMCache['object'+frameKey]);

            var framePositionData = realityEditor.gui.ar.positioning.getPositionData(frame); // inverse scale on circle
            var frameScaleFactor = (framePositionData.scale / globalStates.defaultScale);

            var distanceScale = frame.distanceScale || 1.0; // 1 is the default if it hasn't been set yet
            var circleScaleConstant = 3.0 * (defaultDistance/2000); //5.0;

            var scaleMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();

            var scaleAvr = Math.sqrt(Math.pow(m1[0], 2) + Math.pow(m1[5], 2) + Math.pow(m1[10], 2));
            
            scaleMatrix[0] = scaleAvr* circleScaleConstant * distanceScale / frameScaleFactor; // divide by frame scale so distanceUI doesn't get bigger when frame scales up
            scaleMatrix[5] = scaleAvr * circleScaleConstant * distanceScale / frameScaleFactor; // use same scale (m[0]) for x and y to preserve circle shape
          //  scaleMatrix[10] = scaleAv * circleScaleConstant * distanceScale  / frameScaleFactor;

            // console.log( scaleMatrix[5],scaleMatrix[0] );
            var translateMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
            translateMatrix[12] = m1[12];
            var yTranslate = -125; // TODO: we scale the circle's height by m1[0] not m1[5], which makes it not centered... 
            translateMatrix[13] = m1[13] + (yTranslate * m1[15]); // TODO: -125 * m1[15] is a hack to move it up to center of object. find a mathematically correct solution
            translateMatrix[14] = m1[14];
            translateMatrix[15] = m1[15];

            var transformationMatrix = [];
            realityEditor.gui.ar.utilities.multiplyMatrix(scaleMatrix, translateMatrix, transformationMatrix);
            
            var thisDistanceUI = getDistanceUI(frameKey);
            if (thisDistanceUI) {
                thisDistanceUI.style.transform = 'matrix3d(' + transformationMatrix.toString() + ')';
            }
        } /*else {
            if (!globalDOMCache['object'+frameKey]) {
                hideDistanceUI(frameKey);
            }
        }*/
    }

    /**
     * Lazy instantiation of new distanceUIs for each frame
     * @param {string} frameKey
     * @return {HTMLElement}
     */
    function getDistanceUI(frameKey) {
        if (!frameKey) return;
        if (typeof allDistanceUIs[frameKey] === 'undefined') {
            var newDistanceUI = createDistanceUI(frameKey);
            if (newDistanceUI) {
                allDistanceUIs[frameKey] = newDistanceUI;
                // the distance UI starts out invisible until you make a 3-finger-pinch gesture
                hideDistanceUI(frameKey);
            }
        }
        return allDistanceUIs[frameKey];
    }

    /**
     * Scales the visible distance threshold for this frame to match the current distance of the phone to the frame
     */
    function scaleEditingFrameDistance() {
        var editingFrame = realityEditor.device.getEditingVehicle();
        if (!editingFrame) return;

        // defaultDistance = 2000 is the default size in pixels of the radius
        // we divide by 0.9 since 1.0 is when it fades out entirely, 0.8 is visible entirely, so 0.85 is just around the border
        
        editingFrame.distanceScale = (editingFrame.screenZ / defaultDistance) / 0.85; 
        
        callbackHandler.triggerCallbacks('scaleEditingFrameDistance', {frame: editingFrame});
    }

    /**
     * Shows the semi-transparent sphere UI and hides the green outline editing UI
     * @param {string} frameKey
     */
    function showDistanceUI(frameKey) {
        var thisDistanceUI = getDistanceUI(frameKey);
        if (!thisDistanceUI) return;
        
        thisDistanceUI.style.display = 'inline';

        // don't show the green overlay at the same time as changing the distance
        var svgOverlay = globalDOMCache['svg' + frameKey];
        if (!svgOverlay) {
            delete allDistanceUIs[frameKey]; // clean up frames that don't exist anymore
            return;
        }
        
        svgOverlay.classList.add('hiddenForDistance');
    }

    /**
     * Hides the semi-transparent sphere UI and re-shows the green outline editing UI
     * @param {string} frameKey
     */
    function hideDistanceUI(frameKey) {
        var thisDistanceUI = getDistanceUI(frameKey);
        if (!thisDistanceUI) return;
        
        thisDistanceUI.style.display = 'none';

        // able to show the green overlay again
        var svgOverlay = globalDOMCache['svg' + frameKey];
        if (!svgOverlay) {
            delete allDistanceUIs[frameKey]; // clean up frames that don't exist anymore
            return;
        }

        svgOverlay.classList.remove('hiddenForDistance');
    }
    
    exports.initService = initService;
    exports.defaultDistance = defaultDistance;

})(realityEditor.device.distanceScaling);
