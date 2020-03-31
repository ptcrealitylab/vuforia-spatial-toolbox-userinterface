/**
 * @preserve
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *      ╦═╗┌─┐┌─┐┬  ┬┌┬┐┬ ┬  ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐  ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *      ╠╦╝├┤ ├─┤│  │ │ └┬┘  ║╣  │││ │ │ │├┬┘  ╠═╝├┬┘│ │ │├┤ │   │
 *      ╩╚═└─┘┴ ┴┴─┘┴ ┴  ┴   ╚═╝─┴┘┴ ┴ └─┘┴└─  ╩  ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Ben Reynolds on 7/17/18.
 */

createNameSpace('realityEditor.app.callbacks');

/**
 * @fileOverview realityEditor.app.callbacks.js
 * The central location where all functions triggered from within the native iOS code should reside.
 * Includes processing detected matrices from the Vuforia Engine, and processing UDP messages.
 * These can just be simple routing functions that trigger the appropriate function in other files,
 * but this acts to organize all API calls in a single place.
 * Note: callbacks related to target downloading are located in the targetDownloader module.
 */

(function(exports) {

    // these determine if visible object matrices are sent in alone or with status property (status needed for extended tracking)
    let matrixFormatCalculated = false;
    let isMatrixFormatNew; // true if visible objects has the format {objectKey: {matrix:[], status:""}} instead of {objectKey: []}

    // debug variable to speed up app by completely disabling possibility for extended tracking
    let DISABLE_ALL_EXTENDED_TRACKING = false;

    // save this matrix in a local scope for faster retrieval
    realityEditor.app.callbacks.rotationXMatrix = rotationXMatrix;

    /**
     * Callback for realityEditor.app.getVuforiaReady
     * Triggered when Vuforia Engine finishes initializing.
     * Retrieves the projection matrix and starts streaming the model matrices, camera matrix, and groundplane matrix.
     * Also starts the object discovery and download process.
     */
    function vuforiaIsReady() {
        // projection matrix only needs to be retrieved once
        realityEditor.app.getProjectionMatrix('realityEditor.app.callbacks.receivedProjectionMatrix');

        // subscribe to the model matrices from each recognized image or object target
        realityEditor.app.getMatrixStream('realityEditor.app.callbacks.receiveMatricesFromAR');

        // subscribe to the camera matrix from the positional device tracker
        realityEditor.app.getCameraMatrixStream('realityEditor.app.callbacks.receiveCameraMatricesFromAR');

        // subscribe to the ground plane matrix stream that starts returning results when it has been detected and an anchor added
        realityEditor.app.getGroundPlaneMatrixStream('realityEditor.app.callbacks.receiveGroundPlaneMatricesFromAR');

        // add heartbeat listener for UDP object discovery
        realityEditor.app.getUDPMessages('realityEditor.app.callbacks.receivedUDPMessage');

        // send three action UDP pings to start object discovery
        for (var i = 0; i < 3; i++) {
            setTimeout(function () {
                realityEditor.app.sendUDPMessage({action: 'ping'});
            }, 500 * i); // space out each message by 500ms
        }
    }

    /**
     * Callback for realityEditor.app.getProjectionMatrix
     * Sets the projection matrix once using the value from the AR engine
     * @param {Array.<number>} matrix
     */
    function receivedProjectionMatrix(matrix) {
        console.log('got projection matrix!', matrix);
        realityEditor.gui.ar.setProjectionMatrix(matrix);
    }

    /**
     * Callback for realityEditor.app.getUDPMessages
     * Handles any UDP messages received by the app.
     * Currently supports object discovery messages ("ip"/"id" pairs) and state synchronization ("action") messages
     * Additional UDP messages can be listened for by using realityEditor.network.addUDPMessageHandler
     * @param {string|object} message
     */
    function receivedUDPMessage(message) {
        if (typeof message !== 'object') {
            try {
                message = JSON.parse(message);
            } catch (e) {
                // string doesn't need to be parsed... continue executing the function
            }
        }

        // upon a new object discovery message, add the object and download its target files
        if (typeof message.id !== 'undefined' &&
            typeof message.ip !== 'undefined') {

            if (typeof message.zone !== 'undefined' && message.zone !== '') {
                if (realityEditor.gui.settings.toggleStates.zoneState && realityEditor.gui.settings.toggleStates.zoneStateText === message.zone) {
                    // console.log('Added object from zone=' + message.zone);
                    realityEditor.network.addHeartbeatObject(message);
                }

            } else if (!realityEditor.gui.settings.toggleStates.zoneState) {
                // console.log('Added object without zone');
                realityEditor.network.addHeartbeatObject(message);
            }


            // forward the action message to the network module, to synchronize state across multiple clients
        } else if (typeof message.action !== 'undefined') {
            realityEditor.network.onAction(message.action);
        }

        // forward the message to a generic message handler that various modules use to subscribe to different messages
        realityEditor.network.onUDPMessage(message);
    }

    /**
     * Callback for realityEditor.app.getDeviceReady
     * Returns the native device name, which can be used to adjust the UI based on the phone/device type
     * e.g. iPhone 6s is "iPhone8,1", iPhone 6s Plus is "iPhone8,2", iPhoneX is "iPhone10,3"
     * see: https://gist.github.com/adamawolf/3048717#file-ios_device_types-txt
     * or:  https://support.hockeyapp.net/kb/client-integration-ios-mac-os-x-tvos/ios-device-types
     * @param {string} deviceName - e.g. "iPhone10,3" or "iPad2,1"
     */
    function getDeviceReady(deviceName) {
        globalStates.device = deviceName;
        console.log('The Reality Editor is loaded on a ' + globalStates.device);
        realityEditor.device.layout.adjustForDevice(deviceName);
    }

    /**
     * Callback for realityEditor.app.getMatrixStream
     * Gets triggered ~60FPS when the AR SDK sends us a new set of modelView matrices for currently visible objects
     * Stores those matrices in the draw module to be rendered in the next draw frame
     * @param {Object.<string, Array.<number>>} visibleObjects
     */
    function receiveMatricesFromAR(visibleObjects) {
        if (!realityEditor.worldObjects) {
            return;
        } // prevents tons of error messages while app is loading but Vuforia has started

        // this first section makes the app work with extended or non-extended tracking while being backwards compatible

        if (!matrixFormatCalculated) {
            // for speed, only calculates this one time
            calculateMatrixFormat(visibleObjects);
        }

        // ignore this step if using old app version that ignores EXTENDED_TRACKED objects entirely
        if (isMatrixFormatNew) {
            // extract status into separate data structure and and format matrices into a backwards-compatible object
            // if extended tracking is turned off, discard EXTENDED_TRACKED objects
            convertNewMatrixFormatToOld(visibleObjects);
        }

        // this next section adjusts each world origin to be centered on their image target if it ever gets recognized
        realityEditor.worldObjects.getWorldObjectKeys().forEach(function (worldObjectKey) {
            if (visibleObjects.hasOwnProperty(worldObjectKey)) {
                console.log('world object ' + worldObjectKey + ' detected... relocalize');
                realityEditor.worldObjects.setOrigin(worldObjectKey, realityEditor.gui.ar.utilities.copyMatrix(visibleObjects[worldObjectKey]));
                delete visibleObjects[worldObjectKey];
            }
        });

        // we still need to ignore this default object in case the app provides it, to be backwards compatible with older app versions
        if (visibleObjects.hasOwnProperty('WorldReferenceXXXXXXXXXXXX')) {
            delete visibleObjects['WorldReferenceXXXXXXXXXXXX'];
        }

        // this next section populates the visibleObjects matrices based on the model and view (camera) matrices

        // easiest way to implement freeze button is just to not update the new matrices
        if (!globalStates.freezeButtonState) {

            realityEditor.worldObjects.getWorldObjectKeys().forEach(function (worldObjectKey) {
                // corrected camera matrix is actually the view matrix (inverse camera), so it works as an "object" placed at the world origin

                // re-localize world objects based on the world reference marker (also used for ground plane re-localization)
                var origin = realityEditor.worldObjects.getOrigin(worldObjectKey);
                if (origin) {
                    let tempMatrix = [];
                    realityEditor.gui.ar.utilities.multiplyMatrix(origin, realityEditor.gui.ar.draw.correctedCameraMatrix, tempMatrix);
                    visibleObjects[worldObjectKey] = tempMatrix;
                }

            });

            realityEditor.forEachObject(function(object, objectKey) {
                if (typeof visibleObjects[objectKey] !== 'undefined') {
                    // if it's a JPG instant target, correct the size so it matches as if it were DAT
                    if (object.isJpgTarget) {
                        // this fixes the scale, but the tracker still thinks it is further away
                        // than it is, because the z translation is off by a factor
                        let jpgTargetScaleFactor = 3;
                        let scaleMatrix = [jpgTargetScaleFactor, 0, 0, 0,
                            0, jpgTargetScaleFactor, 0, 0,
                            0, 0, jpgTargetScaleFactor, 0,
                            0, 0, 0, 1];
                        let tempScaled = [];
                        realityEditor.gui.ar.draw.utilities.multiplyMatrix(scaleMatrix, visibleObjects[objectKey], tempScaled);
                        visibleObjects[objectKey] = tempScaled;

                        // this fixes it if the image target is at the world origin, but drifts
                        // towards the origin as you move the object further away
                        // let jpgTargetScaleFactor2 = 0.333;
                        // visibleObjects[objectKey][12] *= jpgTargetScaleFactor2;
                        // visibleObjects[objectKey][13] *= jpgTargetScaleFactor2;
                        // visibleObjects[objectKey][14] *= jpgTargetScaleFactor2;
                    }
                }
            });

            realityEditor.gui.ar.draw.visibleObjectsCopy = visibleObjects;
        }

        // finally, render the objects/frames/nodes. I have tested doing this based on a requestAnimationFrame loop instead
        //  of being driven by the vuforia framerate, and have mixed results as to which is smoother/faster

        // if (typeof realityEditor.gui.ar.draw.update !== 'undefined') {
        realityEditor.gui.ar.draw.update(realityEditor.gui.ar.draw.visibleObjectsCopy);
        // }
    }

    /**
     * Callback for realityEditor.app.getCameraMatrixStream
     * Gets triggered ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
     * @param {Array.<number>} cameraMatrix
     */
    function receiveCameraMatricesFromAR(cameraMatrix) {
        // easiest way to implement freeze button is just to not update the new matrices
        if (!globalStates.freezeButtonState) {
            realityEditor.worldObjects.checkIfFirstLocalization();
            realityEditor.gui.ar.draw.correctedCameraMatrix = realityEditor.gui.ar.utilities.invertMatrix(cameraMatrix);
        }
    }

    /**
     * Looks at the visibleObjects and sees if it uses the old format or the new, so that we can convert to backwards-compatible
     * New format of visibleObject  = {objectKey: {matrix:[], status:""}}
     * Old format of visibleObjects = {objectKey: []}
     * @param visibleObjects
     */
    function calculateMatrixFormat(visibleObjects) {
        if (typeof isMatrixFormatNew === 'undefined') {
            for (var key in visibleObjects) {
                isMatrixFormatNew = (typeof visibleObjects[key].status !== 'undefined');
                matrixFormatCalculated = true;
                break; // only needs to look at one object to determine format that this vuforia app uses
            }
        }
    }

    /**
     * Takes new matrix format and extracts each object's tracking status into visibleObjectsStatus
     * And puts each object's matrix directly back into the visibleObjects so that it matches the old format
     * Also deletes EXTENDED_TRACKED objects from structure if not in extendedTracking mode, to match old behavior
     * @param {Object.<{objectKey: {matrix:Array.<number>, status: string}}>} visibleObjects
     */
    function convertNewMatrixFormatToOld(visibleObjects) {
        realityEditor.gui.ar.draw.visibleObjectsStatus = {};
        for (var key in visibleObjects) {
            realityEditor.gui.ar.draw.visibleObjectsStatus[key] = visibleObjects[key].status;
            if ((!DISABLE_ALL_EXTENDED_TRACKING && realityEditor.gui.settings.toggleStates.extendedTracking) || visibleObjects[key].status === 'TRACKED') {
                visibleObjects[key] = visibleObjects[key].matrix;
            } else {
                if (visibleObjects[key].status === 'EXTENDED_TRACKED') {
                    delete visibleObjects[key];
                }
            }
        }
    }

    /**
     * Callback for realityEditor.app.getGroundPlaneMatrixStream
     * Gets triggered ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
     * @param {Array.<number>} groundPlaneMatrix
     */
    function receiveGroundPlaneMatricesFromAR(groundPlaneMatrix) {
        // only update groundplane if unfrozen and at least one thing is has requested groundplane usage
        if (globalStates.useGroundPlane && !globalStates.freezeButtonState) {
            if (realityEditor.gui.ar.draw.worldCorrection === null) { // TODO: figure out how ground plane works if there are multiple world origins with different planes
                realityEditor.gui.ar.utilities.multiplyMatrix(groundPlaneMatrix, realityEditor.gui.ar.draw.correctedCameraMatrix, realityEditor.gui.ar.draw.groundPlaneMatrix);
            } else {
                // this part is entered if we have re-localized by looking at the world origin marker
                console.warn('Should never get here until we fix worldCorrection');
                let tempMatrix = [];
                realityEditor.gui.ar.utilities.multiplyMatrix(this.rotationXMatrix, realityEditor.gui.ar.draw.worldCorrection, tempMatrix);
                realityEditor.gui.ar.utilities.multiplyMatrix(tempMatrix, realityEditor.gui.ar.draw.correctedCameraMatrix, realityEditor.gui.ar.draw.groundPlaneMatrix);
            }
        }
    }

    // public methods (anything triggered by a native app callback needs to be public
    exports.vuforiaIsReady = vuforiaIsReady;
    exports.receivedProjectionMatrix = receivedProjectionMatrix;
    exports.receivedUDPMessage = receivedUDPMessage;
    exports.getDeviceReady = getDeviceReady;
    exports.receiveGroundPlaneMatricesFromAR = receiveGroundPlaneMatricesFromAR;
    exports.receiveMatricesFromAR = receiveMatricesFromAR;
    exports.receiveCameraMatricesFromAR = receiveCameraMatricesFromAR;

})(realityEditor.app.callbacks);
