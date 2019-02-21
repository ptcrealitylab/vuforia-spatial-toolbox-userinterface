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
    
    var defaultDistance = 5000;
    
    var isScalingDistance = false;
    
    var distanceScalingState = {
        objectKey: null,
        frameKey: null
    };
    
    function initFeature() {
        realityEditor.gui.ar.draw.addUpdateListener(loop);
        realityEditor.device.registerCallback('onDocumentMultiTouchStart', onDocumentMultiTouchStart);
        realityEditor.device.registerCallback('onDocumentMultiTouchEnd', onDocumentMultiTouchEnd);
        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
        realityEditor.gui.buttons.registerCallbackForButton('distance', onDistanceEditingModeChanged);
    }
    
    function loop() {
        
        var framesRendered = [];
        
        // render the UIs if in distance editing mode or actively scaling one of them
        if (isScalingDistance || globalStates.distanceEditingMode) {
            forEachVisibleFrame( function(objectKey, frameKey) {
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
        console.log(params.event);

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
     * @param {{event: object}} params
     */
    function onDocumentMultiTouchEnd(params) {
        console.log(params.event);
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
    }

    function forEachVisibleFrame(callback) {
        realityEditor.forEachFrameInAllObjects( function(objectKey, frameKey) {
            if (realityEditor.gui.ar.draw.visibleObjects.hasOwnProperty(objectKey)) { // only do this for visible objects (and the world object, of course)
                callback(objectKey, frameKey); // populates allDistanceUIs with new distanceUIs if they don't exist yet
            }
        });
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
                
                forEachVisibleFrame( function(objectKey, frameKey) {
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

            console.log( scaleMatrix[5],scaleMatrix[0] );
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
                thisDistanceUI.style.webkitTransform = 'matrix3d(' + transformationMatrix.toString() + ')';
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

        // defaultDistance = 2000 is the default size in pixels of the radius
        // we divide by 0.9 since 1.0 is when it fades out entirely, 0.8 is visible entirely, so 0.85 is just around the border
        
        editingFrame.distanceScale = (editingFrame.screenZ / defaultDistance) / 0.85; 
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
    
    exports.initFeature = initFeature;
    exports.defaultDistance = defaultDistance;

})(realityEditor.device.distanceScaling);
