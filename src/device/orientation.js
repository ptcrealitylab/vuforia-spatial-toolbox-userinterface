createNameSpace("realityEditor.device.orientation");

/**
 * @fileOverview realityEditor.device.orientation.js
 */

(function(exports) {

    var rx = 0;
    var ry = 0;
    
    // this is the div element visualizing the distance 
    var distanceUI;
    
    var linkObject = {
        ballAnimationCount: 0
    };

    // var distanceScale = 1;
    
    var defaultDistance = 2000;
    
    var deviceOrientation;
    
    var isScalingDistance = false;
    
    var frameAdjusted = null;
    
    function initFeature() {
        
        // adds a semi-transparent circle/sphere that indicates the maximum distance you can be from the frame for it to be rendered
        distanceUI = createDistanceUI();
        
        // the distance UI starts out invisible until you make a 3-finger-pinch gesture
        hideDistanceUI();
        
        // keep the ui flat with the ground plane
        window.addEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );
        
        realityEditor.gui.ar.draw.addUpdateListener(loop);

        realityEditor.device.registerCallback('onDocumentMultiTouchStart', onDocumentMultiTouchStart);
        realityEditor.device.registerCallback('onDocumentMultiTouchEnd', onDocumentMultiTouchEnd);
    }
    
    function createDistanceUI() {
        var element = document.createElement('div');
        element.id = 'distanceUI';
        element.classList.add('main');
        element.classList.add('distanceUI');
        document.body.appendChild(element);
        return element;
    }
    
    function loop() {
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
        // requestAnimationFrame(loop);
    }
    
    function onDocumentMultiTouchStart(params) {
        console.log(params.event);
        
        if (params.event.touches.length === 3) {
            var touchTargets = [].slice.call(event.touches).map(function(touch){return touch.target.id.replace(/^(svg)/,"")});
            if (touchTargets.indexOf(realityEditor.device.editingState.frame) > -1) {
                // console.log('change distance');
                isScalingDistance = true;
                showDistanceUI();
                console.log('start 3 finger pinch');
                realityEditor.device.disableUnconstrained();
            }
        }
    }
    
    function scaleEditingFrameDistance() {
        var editingFrame = realityEditor.device.getEditingVehicle();

        // defaultDistance = 2000 is the default size in pixels of the radius
        // we divide by 0.9 since 1.0 is when it fades out entirely, 0.8 is visible entirely, so 0.85 is just around the border
        editingFrame.distanceScale = (editingFrame.screenZ / defaultDistance) / 0.85; 
    }
    
    function showDistanceUI() {
        distanceUI.style.display = 'inline';

        // don't show the green overlay at the same time as changing the distance
        var activeVehicle = realityEditor.device.getEditingVehicle();
        if (activeVehicle) {
            globalDOMCache['svg' + realityEditor.device.editingState.frame].classList.add('hiddenForDistance');
            frameAdjusted = realityEditor.device.editingState.frame;
        }
    }
    
    function hideDistanceUI() {
        distanceUI.style.display = 'none';

        // able to show the green overlay again
        // var activeVehicle = realityEditor.device.getEditingVehicle();
        // if (activeVehicle) {
        //     globalDOMCache['svg' + realityEditor.device.editingState.frame].classList.remove('hiddenForDistance');
        // }
        if (frameAdjusted) {
            globalDOMCache['svg' + frameAdjusted].classList.remove('hiddenForDistance');
            frameAdjusted = null;
        }
    }

    function onDocumentMultiTouchEnd(params) {
        console.log(params.event);
        // if (params.event.touches.length === 0) {
            isScalingDistance = false;
        // }
        initialDistanceScaleData = null;
        
        hideDistanceUI();
        realityEditor.device.enableUnconstrained();

    }

    var onDeviceOrientationChangeEvent = function(event) {
        
        // only update the ground plane orientation if not frozen
        if (!globalStates.freezeButtonState) {
            deviceOrientation = event;
        }
        
        if (!deviceOrientation) {
            return;
        }

        // var q = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(deviceOrientation.beta * Math.PI/180, deviceOrientation.gamma * Math.PI/180, 0);
        // rx = deviceOrientation.beta;
        var q = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(rx * Math.PI / 180, ry * Math.PI / 180, 0);
        var groundPlaneRotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(q);

        realityEditor.forEachFrameInAllObjects( function(objectKey, frameKey) {
            var frame = realityEditor.getFrame(objectKey, frameKey);
            var editingVehicle = realityEditor.device.getEditingVehicle();
            var thisIsBeingEdited = (editingVehicle === frame);

            if (thisIsBeingEdited) {
                var m1 = realityEditor.gui.ar.utilities.getTransform(globalDOMCache['object'+frameKey]);
                
                var framePositionData = realityEditor.gui.ar.positioning.getPositionData(frame); // inverse scale on circle
                var frameScaleFactor = (framePositionData.scale / globalStates.defaultScale);
                
                var distanceScale = frame.distanceScale || 1.0; // 1 is the default if it hasn't been set yet
                var circleScaleConstant = 3.0; //5.0;
                
                var scaleMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
                scaleMatrix[0] = m1[0] * circleScaleConstant * distanceScale / frameScaleFactor;
                scaleMatrix[5] = m1[0] * circleScaleConstant * distanceScale / frameScaleFactor; // use same scale (m[0]) for x and y to preserve circle shape
                scaleMatrix[10] = m1[10] * circleScaleConstant * distanceScale  / frameScaleFactor;
                
                var translateMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
                translateMatrix[12] = m1[12];
                var yTranslate = -125;
                translateMatrix[13] = m1[13] + (yTranslate * m1[15]); // TODO: -125 * m1[15] is a hack to move it up to center of object
                translateMatrix[14] = m1[14];
                translateMatrix[15] = m1[15];

                var m2 = [];
                var transformationMatrix = [];
                
                realityEditor.gui.ar.utilities.multiplyMatrix(scaleMatrix, groundPlaneRotationMatrix, m2);
                realityEditor.gui.ar.utilities.multiplyMatrix(m2, translateMatrix, transformationMatrix);

                distanceUI.style.webkitTransform = 'matrix3d(' + transformationMatrix.toString() + ')';

                var diameterString = globalDOMCache['object'+frameKey].style.width;
                distanceUI.style.width = diameterString;
                distanceUI.style.height = diameterString;
                
            }
        });
    };

    /**
     * @typedef initialScaleData
     * @property {number} radius - how far apart in pixels the two touches are to begin with
     * @property {number} scale - the frame or node's initial scale value before the gesture, to use as a base multiplier
     */
    var initialDistanceScaleData = null;

    /**
     * Scales the specified frame or node using the first two touches.
     * The new scale starts at the initial scale and varies linearly with the changing touch radius.
     * @param {Frame|Node} activeVehicle - the frame or node you are scaling
     * @param {Object.<x,y>} centerTouch - the first touch event, where the scale is centered from
     * @param {Object.<x,y>} outerTouch - the other touch, where the scale extends to
     */
    function distanceScaleVehicle(activeVehicle, centerTouch, outerTouch) {

        if (!centerTouch || !outerTouch || !centerTouch.x || !centerTouch.y || !outerTouch.x || !outerTouch.y) {
            console.warn('trying to scale vehicle using improperly formatted touches');
            return;
        }

        var dx = centerTouch.x - outerTouch.x;
        var dy = centerTouch.y - outerTouch.y;
        var radius = Math.sqrt(dx * dx + dy * dy);
        
        if (!initialDistanceScaleData) {
            initialDistanceScaleData = {
                radius: radius,
                scale: (activeVehicle.distanceScale || 1.0)
            };
            return;
        }

        // calculate the new scale based on the radius between the two touches
        var newScale = initialDistanceScaleData.scale + (radius - initialDistanceScaleData.radius) / 300;
        if (typeof newScale !== 'number') return;
        
        newScale = Math.max(0.2, newScale); // can't scale below 0.2 scale factor
        
        activeVehicle.distanceScale = newScale;
        
        // console.log(activeVehicle.distanceScale);

        // // TODO: this only works for frames right now, not nodes (at least not after scaling nodes twice in one gesture)
        // // manually calculate positionData.x and y to keep centerTouch in the same place relative to the vehicle
        // var overlayDiv = document.getElementById(activeVehicle.uuid);
        // var touchOffset = realityEditor.device.editingState.touchOffset;
        // if (overlayDiv && touchOffset) {
        //     var touchOffsetFromCenter = {
        //         x: overlayDiv.clientWidth/2 - touchOffset.x,
        //         y: overlayDiv.clientHeight/2 - touchOffset.y
        //     };
        //     var scaleDifference = Math.max(0.2, newScale) - positionData.scale;
        //     positionData.x += touchOffsetFromCenter.x * scaleDifference;
        //     positionData.y += touchOffsetFromCenter.y * scaleDifference;
        // }
        //
        // positionData.scale = Math.max(0.2, newScale); // 0.2 is the minimum scale allowed
        //
        // // redraw circles to visualize the new scaling
        // globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);
        //
        // // draw a blue circle visualizing the initial radius
        // var circleCenterCoordinates = [centerTouch.x, centerTouch.y];
        // realityEditor.gui.ar.lines.drawBlue(globalCanvas.context, circleCenterCoordinates, this.initialScaleData.radius);
        //
        // // draw a red or green circle visualizing the new radius
        // if (radius < this.initialScaleData.radius) {
        //     realityEditor.gui.ar.lines.drawRed(globalCanvas.context, circleCenterCoordinates, radius);
        // } else {
        //     realityEditor.gui.ar.lines.drawGreen(globalCanvas.context, circleCenterCoordinates, radius);
        // }
        //
        // var keys = realityEditor.getKeysFromVehicle(activeVehicle);
        // var propertyPath = activeVehicle.hasOwnProperty('visualization') ? 'ar.scale' : 'scale';
        // realityEditor.network.realtime.broadcastUpdate(keys.objectKey, keys.frameKey, keys.nodeKey, propertyPath, positionData.scale);
        //
    }
    
    exports.initFeature = initFeature;
    exports.defaultDistance = defaultDistance;

})(realityEditor.device.orientation);
