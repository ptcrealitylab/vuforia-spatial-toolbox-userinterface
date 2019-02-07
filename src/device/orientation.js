createNameSpace("realityEditor.device.orientation");

/**
 * @fileOverview realityEditor.device.orientation.js
 */

// var xTranslation = -200;
// var yTranslation = -400;
// var zTranslation = 3;

var yScale = 1;
var yTranslate = -125;

var distanceScale = 1;

(function(exports) {
    
    var deviceOrientation;
    // var screenOrientation;
    var distanceUI;
    var distanceUI2;
    
    function initFeature() {

        distanceUI = document.createElement('div');
        distanceUI.id = 'distanceUI';
        distanceUI.classList.add('main');
        distanceUI.classList.add('distanceUI');
        document.body.appendChild(distanceUI);
        
        distanceUI2 = document.createElement('div');
        distanceUI2.id = 'distanceUI2';
        distanceUI2.classList.add('main');
        distanceUI2.classList.add('distanceUI');
        distanceUI.appendChild(distanceUI2);
        
        // distanceUI.style.transform = 'rotateX(45deg)';
        
        // window.addEventListener( 'orientationchange', onScreenOrientationChangeEvent, false );
        window.addEventListener( 'deviceorientation', onDeviceOrientationChangeEvent, false );
        
        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
            // realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
            //     var frame = realityEditor.getFrame(objectKey, frameKey);
            //     var editingVehicle = realityEditor.device.getEditingVehicle();
            //     var thisIsBeingEdited = (editingVehicle === frame);
            //
            //     if (thisIsBeingEdited) {
            //         xTranslation = -200;
            //         yTranslation = -400;
            //         zTranslation = 2;
            //         console.log(frame);
            //         console.log(xTranslation, yTranslation, zTranslation);
            //     }
            //
            // });
            
            // on each frame, hide the distance UI if no frames are being edited
            var editingVehicle = realityEditor.device.getEditingVehicle();
            if (editingVehicle && editingVehicle.type === 'ui') {
                distanceUI.style.display = 'inline';
            } else {
                distanceUI.style.display = 'none';
            }
            
        });
        
    }

    var onDeviceOrientationChangeEvent = function ( event ) {

        deviceOrientation = event;
        // console.log(deviceOrientation);
        
        var groundPlaneAngle = deviceOrientation.gamma;
        // distanceUI.style.webkitTransform = 'rotateX(' + -1 * groundPlaneAngle + ')';
        // distanceUI.style.transform = 'rotateX(' + groundPlaneAngle + 'deg)';

        var q = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(deviceOrientation.beta * Math.PI/180, deviceOrientation.gamma * Math.PI/180, 0);
        var m = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(q);

        // var translation = realityEditor.gui.ar.utilities.newIdentityMatrix();
        // translation[12] = xTranslation;
        // translation[13] = yTranslation;
        // translation[14] = zTranslation;

        // var m2 = [];
        // realityEditor.gui.ar.utilities.multiplyMatrix(m, translation, m2);

        // m2[15] = zTranslation;

        // distanceUI.style.transform = 'rotate3d(1,0,0,' + groundPlaneAngle + 'deg)';
        // distanceUI.style.transform =
        // distanceUI.style.webkitTransform = 'matrix3d(' + m2.toString() + ')';

        realityEditor.forEachFrameInAllObjects(function(objectKey, frameKey) {
            var frame = realityEditor.getFrame(objectKey, frameKey);
            var editingVehicle = realityEditor.device.getEditingVehicle();
            var thisIsBeingEdited = (editingVehicle === frame);

            if (thisIsBeingEdited) {

                function getTransform(ele) {
                    // var st = window.getComputedStyle(ele, null);
                    // tr = st.getPropertyValue("-webkit-transform") ||
                    //     st.getPropertyValue("-moz-transform") ||
                    //     st.getPropertyValue("-ms-transform") ||
                    //     st.getPropertyValue("-o-transform") ||
                    //     st.getPropertyValue("transform");

                    var tr = ele.style.webkitTransform;

                    var values = tr.split('(')[1].split(')')[0].split(',');

                    var out = [ 0, 0, 0, 1 ];
                    for (var i = 0; i < values.length; ++i) {
                        out[i] = parseFloat(values[i]);
                    }

                    return out;
                }
                
                var m1 = getTransform(globalDOMCache['object'+frameKey]); //frame.mostRecentFinalMatrix;
                
                var scale = realityEditor.gui.ar.utilities.newIdentityMatrix();
                scale[0] = m1[0] * distanceScale;
                scale[5] = m1[0] * distanceScale; // use same scale for x and y to preserve circle shape
                scale[10] = m1[10] * distanceScale;
                
                var translate = realityEditor.gui.ar.utilities.newIdentityMatrix();
                translate[12] = m1[12];
                translate[13] = m1[13] * yScale + (yTranslate * m1[15]);
                translate[14] = m1[14];
                translate[15] = m1[15];

                var m2 = [];
                var m3 = [];
                
                realityEditor.gui.ar.utilities.multiplyMatrix(scale, m, m2);
                realityEditor.gui.ar.utilities.multiplyMatrix(m2, translate, m3);
                
                var diameterString = globalDOMCache['object'+frameKey].style.width;
                distanceUI.style.width = diameterString;
                distanceUI.style.height = diameterString;
                // distanceUI.style.borderRadius = parseFloat(diameterString)/2 + 'px';
                
                distanceUI.style.webkitTransform = 'matrix3d(' + m3.toString() + ')';

            }
            
        });

        
        /*
        realityEditor.worldObjects.getWorldObjectKeys().forEach( function(objectKey) {
            realityEditor.forEachFrameInObject(objectKey, function(objectKey, frameKey) {
                var frame = realityEditor.getFrame(objectKey, frameKey);
                // get relative orientation of frame to phone's ground plane

                // start with the frame's matrix
                var positionData = realityEditor.gui.ar.positioning.getPositionData(frame);
                var snappedMatrix = computeSnappedMatrix(realityEditor.gui.ar.utilities.copyMatrix(positionData.matrix));
                // realityEditor.gui.ar.positioning.setPositionDataMatrix(frame, snappedMatrix);
                
                

                // // start with the frame's matrix
                // var positionData = realityEditor.gui.ar.positioning.getPositionData(frame);
                // var snappedMatrix = realityEditor.gui.ar.utilities.copyMatrix(positionData.matrix);
                //
                // // calculate its rotation in Euler Angles about the X and Y axis, using a bunch of quaternion math in the background
                // var xRotation = realityEditor.gui.ar.utilities.getRotationAboutAxisX(snappedMatrix);
                // var yRotation = realityEditor.gui.ar.utilities.getRotationAboutAxisY(snappedMatrix);
                // var zRotation = realityEditor.gui.ar.utilities.getRotationAboutAxisZ(snappedMatrix);
                
                // var q = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(snappedMatrix);
                // var invQ = 
                
                // console.log(xRotation, yRotation, zRotation);

                var distanceUI = document.getElementById('distance' + frameKey);
                if (distanceUI) {
                    distanceUI.style.transform = 'rotateX(' + -1 * groundPlaneAngle + 'deg)'
                    // distanceUI.style.transform = 'matrix3d'
                    // distanceUI.style.webkitTransform = 'matrix3d(' + snappedMatrix.toString() + ')';

                    var normalizedFrameMatrix = realityEditor.gui.ar.utilities.normalizeMatrix(frame.mostRecentFinalMatrix);

                    // var inverseRotationMatrix = realityEditor.gui.ar.utilities.invertRotationMatrix(positionData.matrix);
                    // var inverseRotationMatrix = realityEditor.gui.ar.utilities.invertRotationMatrix(normalizedFrameMatrix);
                    // var inverseRotationMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();

                    // gives correct rotation
                    // var q = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(positionData.matrix);
                    // var q = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(frame.mostRecentFinalMatrix);
                    // var eulerAngles = realityEditor.gui.ar.utilities.quaternionToEulerAngles(q);
                    // eulerAngles.theta *= -1; // flips one axis of rotation
                    // eulerAngles.psi *= -1;
                    // eulerAngles.phi *= -1; 
                    // var invQ = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(eulerAngles.theta, eulerAngles.psi, eulerAngles.phi);
                    // var rotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(invQ);

                    // var rotationQuaternion = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(frame.mostRecentFinalMatrix);
                    // var inverseRotationQuaternion = realityEditor.gui.ar.utilities.invertQuaternion(rotationQuaternion);
                    // var inverseRotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(inverseRotationQuaternion);
                    
                    // var rotationMatrix = realityEditor.gui.ar.utilities.invertMatrix(frame.mostRecentFinalMatrix);
                    
                    var rotationQuaternion = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(normalizedFrameMatrix);
                    realityEditor.gui.ar.utilities.normalizeQuaternion(rotationQuaternion);
                    var rotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(rotationQuaternion);
                    var inverseRotationMatrix = realityEditor.gui.ar.utilities.invertRotationMatrix(rotationMatrix);
                    
                    // distanceUI.style.webkitTransform = 'matrix3d(' + inverseRotationMatrix.toString() + ')';

                }
                
            });
        });
        */
    };

    /**
     * Removes all rotation components from a modelView matrix
     * Given a modelview matrix, computes its rotation as a quaternion, find the inverse, and multiplies the original
     * matrix by that inverse rotation to remove its rotation
     * @param {Array.<number>} mat
     * @return {Array}
     */
    function computeSnappedMatrix(mat) {
        var res = [];
        var rotationQuaternion = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(mat);
        var inverseRotationQuaternion = realityEditor.gui.ar.utilities.invertQuaternion(rotationQuaternion);
        var inverseRotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(inverseRotationQuaternion);
        realityEditor.gui.ar.utilities.multiplyMatrix(mat, inverseRotationMatrix, res);
        return res;
    }

    // /**
    //  * Temporarily disabled function that will snap the frame to the marker plane
    //  * (by removing its rotation components) if the amount of rotation is very small
    //  * @todo: only do this if it is also close to the marker plane in the Z direction
    //  * @param {Frame|Node} activeVehicle
    //  * @param {string} activeKey
    //  */
    // function snapFrameMatrixIfNecessary(activeVehicle, activeKey) {
    //     var positionData = realityEditor.gui.ar.positioning.getPositionData(activeVehicle);
    //
    //     // start with the frame's matrix
    //     var snappedMatrix = this.ar.utilities.copyMatrix(positionData.matrix);
    //
    //     // calculate its rotation in Euler Angles about the X and Y axis, using a bunch of quaternion math in the background
    //     var xRotation = this.ar.utilities.getRotationAboutAxisX(snappedMatrix);
    //     var yRotation = this.ar.utilities.getRotationAboutAxisY(snappedMatrix);
    //     var snapX = false;
    //     var snapY = false;
    //
    //     // see if the xRotation is close enough to neutral
    //     if (0.5 - Math.abs( Math.abs(xRotation) / Math.PI - 0.5) < 0.05) {
    //         // globalDOMCache["iframe" + activeKey].classList.add('snapX');
    //         snapX = true;
    //     } else {
    //         // globalDOMCache["iframe" + activeKey].classList.remove('snapX');
    //     }
    //
    //     // see if the yRotation is close enough to neutral
    //     if (0.5 - Math.abs( Math.abs(yRotation) / Math.PI - 0.5) < 0.05) {
    //         // globalDOMCache["iframe" + activeKey].classList.add('snapY');
    //         snapY = true;
    //     } else {
    //         // globalDOMCache["iframe" + activeKey].classList.remove('snapY');
    //     }
    //
    //     /**
    //      * Removes all rotation components from a modelView matrix
    //      * Given a modelview matrix, computes its rotation as a quaternion, find the inverse, and multiplies the original
    //      * matrix by that inverse rotation to remove its rotation
    //      * @param {Array.<number>} mat
    //      * @return {Array}
    //      */
    //     function computeSnappedMatrix(mat) {
    //         var res = [];
    //         var rotationQuaternion = realityEditor.gui.ar.utilities.getQuaternionFromMatrix(mat);
    //         var inverseRotationQuaternion = realityEditor.gui.ar.utilities.invertQuaternion(rotationQuaternion);
    //         var inverseRotationMatrix = realityEditor.gui.ar.utilities.getMatrixFromQuaternion(inverseRotationQuaternion);
    //         realityEditor.gui.ar.utilities.multiplyMatrix(snappedMatrix, inverseRotationMatrix, res);
    //         return res;
    //     }
    //
    //
    //     globalDOMCache["iframe" + activeKey].classList.remove('snappableFrame');
    //
    //     if ( !realityEditor.device.isEditingUnconstrained(activeVehicle) && snapX && snapY) {
    //
    //         // actually update the frame's matrix if meets the conditions
    //         snappedMatrix = computeSnappedMatrix(this.ar.utilities.copyMatrix(positionData.matrix));
    //         realityEditor.gui.ar.positioning.setPositionDataMatrix(activeVehicle, snappedMatrix);
    //         console.log('snapped');
    //
    //     } else if (snapX && snapY) {
    //
    //         // otherwise if it is close but you are still moving it, show some visual feedback to warn you it will snap
    //         globalDOMCache["iframe" + activeKey].classList.add('snappableFrame');
    //     }
    // }
    
    exports.initFeature = initFeature;

})(realityEditor.device.orientation);
