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

createNameSpace("realityEditor.app.callbacks");

/**
 * @fileOverview realityEditor.app.callbacks.js
 * The central location where all functions triggered from within the native iOS code should reside.
 * These can just be simple routing functions that trigger the appropriate function in other files,
 * but this acts to organize all API calls in a single place.
 * Note: callbacks related to target downloading are located in the targetDownloader module.
 */

/**
 * Callback for realityEditor.app.getVuforiaReady
 * Retrieves the projection matrix and starts streaming the model matrices, camera matrix, and groundplane matrix
 * Also starts the object discovery and download process
 */
realityEditor.app.callbacks.vuforiaIsReady = function() {
    console.log("Vuforia is ready");

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
        setTimeout(function() {
            realityEditor.app.sendUDPMessage({action: 'ping'});
        }, 500 * i); // space out each message by 500ms
    }
};

/**
 * Callback for realityEditor.app.getExternalText
 * Loads the external userinterface URL (if any) from permanent storage
 *  (which later is used to populate the settings text field)
 * @param {string} savedState - needs to be JSON parsed
 */
realityEditor.app.callbacks.onExternalText = function(savedState) {
    if (savedState === '(null)') { savedState = 'null'; }
    savedState = JSON.parse(savedState);
    console.log('loaded external interface URL = ', savedState);

    if (savedState) {
        globalStates.externalState = savedState;
    }
};

/**
 * Callback for realityEditor.app.getDiscoveryText
 * Loads an external server URL (if any) from permanent storage
 *  (which will be used to directly load objects from instead of only using UDP)
 * @param {string} savedState - needs to be JSON parsed
 */
realityEditor.app.callbacks.onDiscoveryText = function(savedState) {
    if (savedState === '(null)') { savedState = 'null'; }
    savedState = JSON.parse(savedState);
    console.log('loaded discovery URL = ', savedState);

    if (savedState) {
        globalStates.discoveryState = savedState;
        realityEditor.network.discoverObjectsFromServer(savedState);
    }
};

/**
 * Callback for realityEditor.app.getZoneState
 * Loads the zone on/off state (if any) from permanent storage
 * @param {string} savedState - stringified boolean
 */
realityEditor.app.callbacks.onZoneState = function(savedState) {
    if (savedState === '(null)') { savedState = 'null'; }
    savedState = JSON.parse(savedState);
    console.log('loaded zone state = ', savedState);

    if (savedState) {
        globalStates.zoneState = savedState;
    }
};

/**
 * Callback for realityEditor.app.getZoneText
 * Loads the zone name (if any) from permanent storage
 * @param {string} savedState
 */
realityEditor.app.callbacks.onZoneText = function(savedState) {
    if (savedState === '(null)') { savedState = 'null'; }
    savedState = JSON.parse(savedState);
    console.log('loaded zone text = ', savedState);

    if (savedState) {
        globalStates.zoneText = savedState;
    }
};

/**
 * Callback for realityEditor.app.getProjectionMatrix
 * Sets the projection matrix once using the value from the AR engine
 * @param {Array.<number>} matrix
 */
realityEditor.app.callbacks.receivedProjectionMatrix = function(matrix) {
    console.log('got projection matrix!', matrix);
    realityEditor.gui.ar.setProjectionMatrix(matrix);
};

/**
 * Callback for realityEditor.app.getUDPMessages
 * Handles any UDP messages received by the app.
 * Currently supports object discovery messages ("ip"/"id" pairs) and state synchronization ("action") messages
 * Additional UDP messages can be listened for by using realityEditor.network.addUDPMessageHandler
 * @param {string|object} message
 */
realityEditor.app.callbacks.receivedUDPMessage = function(message) {
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
            if (globalStates.zoneState && globalStates.zoneText === message.zone) {
                // console.log('Added object from zone=' + message.zone);
                realityEditor.network.addHeartbeatObject(message);
            }
        
        } else {
            if (!globalStates.zoneState) {
                // console.log('Added object without zone');
                realityEditor.network.addHeartbeatObject(message);
            }
        }
        

        // forward the action message to the network module, to synchronize state across multiple clients
    } else if (typeof message.action !== 'undefined') {
        realityEditor.network.onAction(message.action);
    }
    
    // forward the message to a generic message handler that various modules use to subscribe to different messages
    realityEditor.network.onUDPMessage(message);
};

/**
 * Callback for realityEditor.app.getDeviceReady
 * Returns the native device name, which can be used to adjust the UI based on the phone/device type
 * e.g. iPhone 6s is "iPhone8,1", iPhone 6s Plus is "iPhone8,2", iPhoneX is "iPhone10,3"
 * see: https://gist.github.com/adamawolf/3048717#file-ios_device_types-txt
 * or:  https://support.hockeyapp.net/kb/client-integration-ios-mac-os-x-tvos/ios-device-types
 * @param {string} deviceName - e.g. "iPhone10,3" or "iPad2,1"
 */
realityEditor.app.callbacks.getDeviceReady = function(deviceName) {
    console.log(deviceName);
    globalStates.device = deviceName;
    console.log("The Reality Editor is loaded on a " + globalStates.device);
    cout("setDeviceName");
};

//this is speeding things up always! Because the scope for searching this variable becomes smaller.
realityEditor.app.callbacks.matrixFormatCalculated = false;
realityEditor.app.callbacks.isMatrixFormatNew = undefined; // true if visible objects has the format {objectKey: {matrix:[], status:""}} instead of {objectKey: []}

var DISABLE_ALL_EXTENDED_TRACKING = false;
/**
 * Callback for realityEditor.app.getMatrixStream
 * Gets triggered ~60FPS when the AR SDK sends us a new set of modelView matrices for currently visible objects
 * Stores those matrices in the draw module to be rendered in the next draw frame
 * @param {Object.<string, Array.<number>>} visibleObjects
 */
realityEditor.app.callbacks.receiveMatricesFromAR = function(visibleObjects) {
    
    // this first section makes the app work with extended or non-extended tracking while being backwards compatible

    // These should be uncommented if we switch to the EXTENDED_TRACKING version
    // if (TEMP_ENABLE_EXTENDED_TRACKING) {
        if (!realityEditor.app.callbacks.matrixFormatCalculated) {
            // for speed, only calculates this one time
            realityEditor.app.callbacks.calculateMatrixFormat(visibleObjects);
        }

        // ignore this step if using old app version that ignores EXTENDED_TRACKED objects entirely
        if (realityEditor.app.callbacks.isMatrixFormatNew) {
            // extract status into separate data structure and and format matrices into a backwards-compatible object
            // if extended tracking is turned off, discard EXTENDED_TRACKED objects
            realityEditor.app.callbacks.convertNewMatrixFormatToOld(visibleObjects);
        }
    // }
    
    // this next section adjusts each world origin to be centered on their image target if it ever gets recognized
    realityEditor.worldObjects.getWorldObjectKeys().forEach( function(worldObjectKey) {
        if (visibleObjects.hasOwnProperty(worldObjectKey)) {
            console.log('world object ' + worldObjectKey + ' detected... relocalize');
            realityEditor.worldObjects.setOrigin(worldObjectKey, realityEditor.gui.ar.utilities.copyMatrix(visibleObjects[worldObjectKey]));
            delete visibleObjects[worldObjectKey];
        }
    });

    // we still need to ignore this default object in case the app provides it, to be backwards compatible with older app versions
    if (visibleObjects.hasOwnProperty("WorldReferenceXXXXXXXXXXXX")) {
        delete visibleObjects["WorldReferenceXXXXXXXXXXXX"];
    }
    
    // this next section populates the visibleObjects matrices based on the model and view (camera) matrices
    
    // easiest way to implement freeze button is just to not update the new matrices
    if (!globalStates.freezeButtonState) {

        realityEditor.worldObjects.getWorldObjectKeys().forEach(function(worldObjectKey) {
            // corrected camera matrix is actually the view matrix (inverse camera), so it works as an "object" placed at the world origin
            
            // re-localize world objects based on the world reference marker (also used for ground plane re-localization)
            var origin = realityEditor.worldObjects.getOrigin(worldObjectKey);
            if (origin) {
                this.matrix = [];
                realityEditor.gui.ar.utilities.multiplyMatrix(origin, realityEditor.gui.ar.draw.correctedCameraMatrix, this.matrix);
                visibleObjects[worldObjectKey] = this.matrix;
            }

        });
        
        realityEditor.gui.ar.draw.visibleObjectsCopy = visibleObjects;
    }
    
    // finally, render the objects/frames/nodes. I have tested doing this based on a requestAnimationFrame loop instead
    //  of being driven by the vuforia framerate, and have mixed results as to which is smoother/faster
        
    // if (typeof realityEditor.gui.ar.draw.update !== 'undefined') {
        realityEditor.gui.ar.draw.update(realityEditor.gui.ar.draw.visibleObjectsCopy);
    // }
};

/**
 * Callback for realityEditor.app.getCameraMatrixStream
 * Gets triggered ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
 * @param {Array.<number>} cameraMatrix
 */
realityEditor.app.callbacks.receiveCameraMatricesFromAR = function(cameraMatrix) {
    // easiest way to implement freeze button is just to not update the new matrices
    if (!globalStates.freezeButtonState) {
        realityEditor.worldObjects.checkIfFirstLocalization();
        realityEditor.gui.ar.draw.correctedCameraMatrix = realityEditor.gui.ar.utilities.invertMatrix(cameraMatrix);
    }
};

/**
 * Looks at the visibleObjects and sees if it uses the old format or the new, so that we can convert to backwards-compatible
 * New format of visibleObject  = {objectKey: {matrix:[], status:""}} 
 * Old format of visibleObjects = {objectKey: []}
 * @param visibleObjects
 */
realityEditor.app.callbacks.calculateMatrixFormat = function(visibleObjects) {
    if (typeof realityEditor.app.callbacks.isMatrixFormatNew === 'undefined') {
        for (var key in visibleObjects) {
            realityEditor.app.callbacks.isMatrixFormatNew = (typeof visibleObjects[key].status !== 'undefined');
            realityEditor.app.callbacks.matrixFormatCalculated = true;
            break; // only needs to look at one object to determine format that this vuforia app uses
        }
    }
};

/**
 * Takes new matrix format and extracts each object's tracking status into visibleObjectsStatus
 * And puts each object's matrix directly back into the visibleObjects so that it matches the old format
 * Also deletes EXTENDED_TRACKED objects from structure if not in extendedTracking mode, to match old behavior
 * @param {Object.<{objectKey: {matrix:Array.<number>, status: string}}>} visibleObjects
 */
realityEditor.app.callbacks.convertNewMatrixFormatToOld = function(visibleObjects) {
    realityEditor.gui.ar.draw.visibleObjectsStatus = {};
    for (var key in visibleObjects) {
        realityEditor.gui.ar.draw.visibleObjectsStatus[key] = visibleObjects[key].status;
        if ( (!DISABLE_ALL_EXTENDED_TRACKING && realityEditor.gui.settings.toggleStates.extendedTracking) || visibleObjects[key].status === 'TRACKED') {
            visibleObjects[key] = visibleObjects[key].matrix;
        } else {
            if (visibleObjects[key].status === 'EXTENDED_TRACKED') {
                delete visibleObjects[key];
            }
        }
    }
};

realityEditor.app.callbacks.rotationXMatrix = rotationXMatrix;
realityEditor.app.callbacks.matrix = [];

/**
 * Callback for realityEditor.app.getGroundPlaneMatrixStream
 * Gets triggered ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
 * @param {Array.<number>} groundPlaneMatrix
 */
realityEditor.app.callbacks.receiveGroundPlaneMatricesFromAR = function(groundPlaneMatrix) {

    // completely ignore this if nothing is using ground plane right now
    if (globalStates.useGroundPlane) {

        if (!globalStates.freezeButtonState) {
            if(realityEditor.gui.ar.draw.worldCorrection === null) { // TODO: figure out how ground plane works if there are multiple world origins with different planes
                realityEditor.gui.ar.utilities.multiplyMatrix(groundPlaneMatrix, realityEditor.gui.ar.draw.correctedCameraMatrix, realityEditor.gui.ar.draw.groundPlaneMatrix);
            } else {
                console.warn('Should never get here until we fix worldCorrection');
                this.matrix = [];
                realityEditor.gui.ar.utilities.multiplyMatrix(this.rotationXMatrix, realityEditor.gui.ar.draw.worldCorrection, this.matrix);
                realityEditor.gui.ar.utilities.multiplyMatrix(this.matrix, realityEditor.gui.ar.draw.correctedCameraMatrix, realityEditor.gui.ar.draw.groundPlaneMatrix);
            }
        }
        
    }
};
