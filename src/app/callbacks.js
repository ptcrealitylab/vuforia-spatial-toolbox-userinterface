/**
 *
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

    // save this matrix in a local scope for faster retrieval
    realityEditor.app.callbacks.rotationXMatrix = rotationXMatrix;

    let hasActiveGroundPlaneStream = false;

    // other modules can subscribe to what's happening here
    let subscriptions = {
        onPoseReceived: []
    }

    /**
     * Callback for realityEditor.app.getVuforiaReady
     * Triggered when Vuforia Engine finishes initializing.
     * Retrieves the projection matrix and starts streaming the model matrices, camera matrix, and groundplane matrix.
     * Also starts the object discovery and download process.
     */
    function vuforiaIsReady(success) {
        if (typeof success !== 'undefined' && !success) {

            while (listeners.onVuforiaInitFailure.length > 0) { // dismiss the intializing pop-up that was waiting
                let callback = listeners.onVuforiaInitFailure.pop();
                callback();
            }
            
            let headerText = 'Needs camera and microphone access';
            let descriptionText = `Please enable camera and microphone access in your device's Settings app, and try again.`;

            let notification = realityEditor.gui.modal.showSimpleNotification(
                headerText, descriptionText, function () {}, realityEditor.device.environment.variables.layoutUIForPortrait);
            notification.domElements.fade.style.backgroundColor = 'rgba(0,0,0,0.5)';
            notification.domElements.container.classList.add('loaderContainerPortraitTall');
            return;
        }
        // projection matrix only needs to be retrieved once
        realityEditor.app.getProjectionMatrix('realityEditor.app.callbacks.receivedProjectionMatrix');

        // subscribe to the model matrices from each recognized image or object target
        realityEditor.app.getMatrixStream('realityEditor.app.callbacks.receiveMatricesFromAR');

        // subscribe to the camera matrix from the positional device tracker
        realityEditor.app.getCameraMatrixStream('realityEditor.app.callbacks.receiveCameraMatricesFromAR');

        // Subscribe to poses if available
        realityEditor.app.getPosesStream('realityEditor.app.callbacks.receivePoses');

        // add heartbeat listener for UDP object discovery
        realityEditor.app.getUDPMessages('realityEditor.app.callbacks.receivedUDPMessage');

        // send three action UDP pings to start object discovery
        for (var i = 0; i < 3; i++) {
            setTimeout(function () {
                realityEditor.app.sendUDPMessage({action: 'ping'});
            }, 500 * i); // space out each message by 500ms
        }

        // in case engine was started for the second time, add any targets back to engine from the first instance
        realityEditor.app.targetDownloader.reinstatePreviouslyAddedTargets();
    }

    /**
     * Subscribe to the ground plane matrix stream that starts returning results when it has been detected and an
     * anchor gets added to the ground. This only starts the tracker long enough to place an anchor on the ground -
     * after that the tracker stops for performance optimization.
     */
    function startGroundPlaneTrackerIfNeeded() {
        if (hasActiveGroundPlaneStream) { return; } // don't do this unnecessarily because it takes a lot of resources
        if (!globalStates.useGroundPlane) { return; }

        realityEditor.app.getGroundPlaneMatrixStream('realityEditor.app.callbacks.receiveGroundPlaneMatricesFromAR');
        hasActiveGroundPlaneStream = true;
        
        // automatically stop after 1 second
        setTimeout(function() {
            realityEditor.app.acceptGroundPlaneAndStop();
            
            // prevent subsequent ground plane resets if the ground plane is snapped to a world object
            let worldObject = realityEditor.worldObjects.getBestWorldObject();
            hasActiveGroundPlaneStream = (worldObject && worldObject.uuid !== realityEditor.worldObjects.getLocalWorldId());
        }, 1000);
    }

    /**
     * Callback for realityEditor.app.getProjectionMatrix
     * Sets the projection matrix once using the value from the AR engine
     * @param {Array.<number>} matrix
     */
    function receivedProjectionMatrix(matrix) {
        if (realityEditor.device.modeTransition.isARMode()) {
            realityEditor.gui.ar.setProjectionMatrix(matrix);
        }
    }

    exports.acceptUDPBeats = true;

    /**
     * Callback for realityEditor.app.getUDPMessages
     * Handles any UDP messages received by the app.
     * Currently supports object discovery messages ("ip"/"id" pairs) and state synchronization ("action") messages
     * Additional UDP messages can be listened for by using realityEditor.network.addUDPMessageHandler
     * @param {string|object} message
     */
    function receivedUDPMessage(message) {
        if (!exports.acceptUDPBeats && !message.network) {
            return;
        }

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
            
            realityEditor.network.discovery.processHeartbeat(message);

            // forward the action message to the network module, to synchronize state across multiple clients
        } else if (typeof message.ip !== 'undefined' &&
            typeof message.services !== 'undefined') {

            realityEditor.network.discovery.processServerBeat(message);

        } else if (typeof message.action !== 'undefined') {
            realityEditor.network.onAction(message.action);
        }

        // forward the message to a generic message handler that various modules use to subscribe to different messages
        realityEditor.network.onUDPMessage(message);
    }

    // callback will trigger with array of joints {x,y,z} when a pose is detected
    exports.subscribeToPoses = function(callback) {
        subscriptions.onPoseReceived.push(callback);
    }

    /**
     * Callback for realityEditor.app.getPosesStream
     * @param {Array< {x: number, y: number, z: number, confidence: number} >} pose - joints (in world CS, in mm units)
     * @param { {timestamp: number, imageSize: [number], focalLength: [number], principalPoint: [number], transformW2C: [number]} } frameData - frame data associated with the pose 
     *         (timestamp in miliseconds, but floating point number with nanosecond precision); image size which the pose was computed from; camera intrinsics and extrinsics
     */
    function receivePoses(pose, frameData) {

        let poseInWorld = [];

        for (let point of pose) {
            poseInWorld.push({
                x: point.x,
                y: point.y,
                z: point.z,
                confidence: point.score,
            });
        }

        realityEditor.humanPose.draw.draw2DPoses(pose, frameData.imageSize);

        // NOTE: if no pose detected, still send empty pose with a timestamp to notify other servers/clients that body tracking is 'lost'.
        subscriptions.onPoseReceived.forEach(cb => cb(poseInWorld, frameData));
    }

    /**
     * Callback for realityEditor.app.getMatrixStream
     * Gets triggered ~60FPS when the AR SDK sends us a new set of modelView matrices for currently visible objects
     * Stores those matrices in the draw module to be rendered in the next draw frame
     * @param {Object.<string, {matrix: number[], targetName: string}>} visibleTargets.current - (App versions starting 2024)
     *   - Each key is a unique target ID, used internally by Vuforia. The value is an object with:
     *   - `matrix`: Length-16 transformation matrix representing the target relative to Vuforia's (0,0,0)
     *   - `targetName`: The name of the target. In old versions, this is the objectId. In current versions it can be anything.
     * @param {Object.<string, number[]>} visibleTargets.deprecated - (Deprecated app versions - prior to 2024)
     *   - Each key is the target name, not the target ID, and the value is the matrix (array of 16 numbers)
     *   - In this version, the target must be generated using the corresponding objectId as its target name
     *
     * Note: The deprecated format is maintained for backward compatibility.
     */
    function receiveMatricesFromAR(visibleTargets) {
        if (!realityEditor.worldObjects) {
            return;
        } // prevents tons of error messages while app is loading but Vuforia has started
        
        // If viewing the VR map instead of the AR view, don't update objects/tools based on Vuforia
        if (!realityEditor.device.modeTransition.isARMode()) return;

        // determines which format (current or deprecated) is used for visibleTargets, and extracts the correct info
        let visibleObjects = {};
        for (let key in visibleTargets) {
            if (Array.isArray(visibleTargets[key])) {
                // backwards compatible with old app versions -> the key is the objectId, and it directly holds the matrix
                visibleObjects[key] = visibleTargets[key];
            } else {
                // find the object whose targetId matches the key, and store the .matrix under the objectId key
                let matchingObjectId = Object.keys(objects).find(objectKey => {
                    return objects[objectKey].targetId === key;
                });
                if (matchingObjectId) {
                    visibleObjects[matchingObjectId] = visibleTargets[key].matrix;
                } else {
                    // for old objects that weren't generated with a targetId, try to find them by targetName
                    visibleObjects[visibleTargets[key].targetName] = visibleTargets[key].matrix;
                }
            }
        }

        // we still need to ignore this default object in case the app provides it, to be backwards compatible with older app versions
        if (visibleObjects.hasOwnProperty('WorldReferenceXXXXXXXXXXXX')) {
            delete visibleObjects['WorldReferenceXXXXXXXXXXXX'];
        }

        // easiest way to implement freeze button is just to not use the new matrices when we render
        if (globalStates.freezeButtonState) {
            realityEditor.gui.ar.draw.update(realityEditor.gui.ar.draw.visibleObjectsCopy);
            return;
        }

        // don't render origin objects as themselves
        let originObjects = realityEditor.worldObjects.getOriginObjects();
        let detectedOrigins = {};
        Object.keys(originObjects).forEach(function(originKey) {
            if (visibleObjects.hasOwnProperty(originKey)) {

                // if (worldObject.isJpgTarget) {
                    let rotatedOriginMatrix = [];
                    realityEditor.gui.ar.utilities.multiplyMatrix(rotationXMatrix, visibleObjects[originKey], rotatedOriginMatrix);
                // }

                // detectedOrigins[originKey] = realityEditor.gui.ar.utilities.copyMatrix(visibleObjects[originKey]);
                detectedOrigins[originKey] = realityEditor.gui.ar.utilities.copyMatrix(rotatedOriginMatrix);

                // this part is just to enable the the SceneGraph/network.js to know when the origin moves enough to upload the originOffset
                let sceneNode = realityEditor.sceneGraph.getSceneNodeById(originKey);
                if (sceneNode) {
                    sceneNode.setLocalMatrix(visibleObjects[originKey]);
                }

                delete visibleObjects[originKey];
            }
        });

        // this next section adjusts each world origin to be centered on their image target if it ever gets recognized
        realityEditor.worldObjects.getWorldObjectKeys().forEach(function (worldObjectKey) {
            if (visibleObjects.hasOwnProperty(worldObjectKey)) {
                let matchingOrigin = realityEditor.worldObjects.getMatchingOriginObject(worldObjectKey);
                let worldObject = realityEditor.getObject(worldObjectKey);

                let worldOriginMatrix = [];
                let hasMatchingOrigin = !!matchingOrigin;
                let isMatchingOriginVisible = (matchingOrigin && typeof detectedOrigins[matchingOrigin.uuid] !== 'undefined');
                let hasOriginOffset = typeof worldObject.originOffset !== 'undefined';
                
                if (!hasMatchingOrigin) {
                    worldOriginMatrix = realityEditor.gui.ar.utilities.copyMatrix(visibleObjects[worldObjectKey]);
                } else {
                    if (!isMatchingOriginVisible) {
                        if (!hasOriginOffset) {
                            worldOriginMatrix = realityEditor.gui.ar.utilities.copyMatrix(visibleObjects[worldObjectKey]);
                        } else {
                            // calculate origin matrix using originOffset and visibleObjects[worldObjectKey]
                            
                            // inverseWorld * originMatrix = relative;
                            // therefore:
                            // originMatrix = world * relative
                            
                            realityEditor.gui.ar.utilities.multiplyMatrix(visibleObjects[worldObjectKey], worldObject.originOffset, worldOriginMatrix);
                        }
                    } else {
                        if (!hasOriginOffset) {
                            realityEditor.app.tap(); // haptic feedback the first time it localizes against origin
                        }
                        let relative = [];
                        let inverseWorld = realityEditor.gui.ar.utilities.invertMatrix(visibleObjects[worldObjectKey]);
                        realityEditor.gui.ar.utilities.multiplyMatrix(inverseWorld, detectedOrigins[matchingOrigin.uuid], relative);
                        worldObject.originOffset = relative;
                        worldOriginMatrix = realityEditor.gui.ar.utilities.copyMatrix(detectedOrigins[matchingOrigin.uuid]);
                    }
                }

                realityEditor.worldObjects.setOrigin(worldObjectKey, worldOriginMatrix);
                
                if (worldObjectKey !== realityEditor.worldObjects.getLocalWorldId()) {
                    let bestWorldObject = realityEditor.worldObjects.getBestWorldObject();
                    if (!bestWorldObject || worldObjectKey === bestWorldObject.uuid) {
                        
                        let sceneNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectKey);
                        if (sceneNode) {
                            sceneNode.setLocalMatrix(worldOriginMatrix);

                            // also relocalize the groundplane if it's already been detected / in use
                            if (globalStates.useGroundPlane) {
                                // let rotated = [];
                                // realityEditor.gui.ar.utilities.multiplyMatrix(this.rotationXMatrix, worldOriginMatrix, rotated);
                                let offset = [];
                                let floorOffset = 0;
                                try {
                                    let navmesh = JSON.parse(window.localStorage.getItem(`realityEditor.navmesh.${worldObject.uuid}`));
                                    floorOffset = navmesh.floorOffset * 1000;
                                } catch (e) {
                                    console.warn('No navmesh', worldObject, e);
                                }
                                let buffer = 100;
                                floorOffset += buffer;
                                let groundPlaneOffsetMatrix = [
                                    1, 0, 0, 0,
                                    0, 1, 0, 0,
                                    0, 0, 1, 0,
                                    0, floorOffset, 0, 1
                                ];
                                let worldObjectSceneNode = realityEditor.sceneGraph.getSceneNodeById(worldObject.uuid);
                                realityEditor.gui.ar.utilities.multiplyMatrix(groundPlaneOffsetMatrix, worldObjectSceneNode.localMatrix, offset);
                                realityEditor.sceneGraph.setGroundPlanePosition(offset);
                            }
                        }
                    }
                }

                delete visibleObjects[worldObjectKey];
            }
        });

        // this next section populates the visibleObjects matrices based on the model and view (camera) matrices

        // visibleObjects contains the raw modelMatrices -> send them to the scene graph
        for (let objectKey in visibleObjects) {
            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
            if (sceneNode) {
                sceneNode.setLocalMatrix(visibleObjects[objectKey]);

                let dontBroadcast = false;
                if (!dontBroadcast && realityEditor.device.environment.isSourceOfObjectPositions()) {
                    // if it's an object, post object position relative to a world object
                    let worldObjectId = realityEditor.sceneGraph.getWorldId();
                    if (worldObjectId) {
                        let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
                        sceneNode.updateWorldMatrix();
                        let relativeMatrix = sceneNode.getMatrixRelativeTo(worldNode);
                        realityEditor.network.realtime.broadcastUpdate(objectKey, null, null, 'matrix', relativeMatrix);
                    }
                }
            }
        }

        // currently the origin matrix here isn't actually used, the sceneGraph matrix is used instead
        // but this still importantly adds all localized world objects (non-null origin) to the visibleObjects list
        realityEditor.worldObjects.getWorldObjectKeys().forEach(function (worldObjectKey) {
            var origin = realityEditor.worldObjects.getOrigin(worldObjectKey);
            if (origin) {
                visibleObjects[worldObjectKey] = origin; // always add all worldObjects that have been localized
            }
        });

        realityEditor.gui.ar.draw.visibleObjectsCopy = visibleObjects;

        // finally, render the objects/frames/nodes. I have tested doing this based on a requestAnimationFrame loop instead
        //  of being driven by the vuforia framerate, and have mixed results as to which is smoother/faster

        realityEditor.gui.ar.draw.update(realityEditor.gui.ar.draw.visibleObjectsCopy);
    }

    /**
     * Callback for realityEditor.app.getCameraMatrixStream
     * Gets triggered ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
     * @param {*} cameraInfo
     */
    function receiveCameraMatricesFromAR(cameraInfo) {
        realityEditor.sceneGraph.setDevicePosition(cameraInfo.matrix);

        // easiest way to implement freeze button is just to not update the new matrices
        if (!globalStates.freezeButtonState) {
            // when viewing VR map, sceneGraph camera will get set based on virtual camera,
            // but we can still access the device's true position through the deviceNode
            if (!realityEditor.device.modeTransition.isARMode()) {
                realityEditor.device.modeTransition.setDeviceCameraPosition(cameraInfo.matrix);
                return;
            }

            realityEditor.worldObjects.checkIfFirstLocalization();

            let cameraMatrix = cameraInfo.matrix;
            let trackingStatus = cameraInfo.status;
            let trackingStatusInfo = cameraInfo.statusInfo;

            listeners.onDeviceTrackingStatus.forEach(function(callback) {
                callback(trackingStatus, trackingStatusInfo);
            });

            realityEditor.sceneGraph.setCameraPosition(cameraMatrix);

            while (listeners.onTrackingStarted.length > 0) {
                let callback = listeners.onTrackingStarted.pop();
                callback();
            }
        }
    }

    /**
     * Callback for realityEditor.app.getGroundPlaneMatrixStream
     * Gets triggered ~60FPS when the AR SDK sends us a new cameraMatrix based on the device's world coordinates
     * @param {Array.<number>} groundPlaneMatrix
     */
    function receiveGroundPlaneMatricesFromAR(groundPlaneMatrix) {
        // only update groundPlane if unfrozen and at least one thing is has requested groundPlane usage
        if (globalStates.useGroundPlane && !globalStates.freezeButtonState && realityEditor.device.modeTransition.isARMode()) {
            
            let worldObject = realityEditor.worldObjects.getBestWorldObject();

            // snap groundPlane to world origin, if available
            if (worldObject && worldObject.uuid !== realityEditor.worldObjects.getLocalWorldId()) {
                let worldObjectSceneNode = realityEditor.sceneGraph.getSceneNodeById(worldObject.uuid);
                if (worldObjectSceneNode) {
                    // note: if sceneGraph hierarchy gets more complicated (if ground plane and world objects have
                    // different parents in the scene graph), remember to switch worldObjectSceneNode.localMatrix
                    // for a matrix computed to preserve worldObject's worldMatrix
                    if (worldObject.isJpgTarget) {
                        // let rotated = [];
                        // realityEditor.gui.ar.utilities.multiplyMatrix(this.rotationXMatrix, worldObjectSceneNode.localMatrix, rotated);
                        realityEditor.sceneGraph.setGroundPlanePosition(worldObjectSceneNode.localMatrix);
                    } else {
                        let offset = [];
                        let floorOffset = 0;
                        try {
                            let navmesh = JSON.parse(window.localStorage.getItem(`realityEditor.navmesh.${worldObject.uuid}`));
                            floorOffset = navmesh.floorOffset * 1000;
                        } catch (e) {
                            console.warn('No navmesh', worldObject, e);
                        }
                        let buffer = 100;
                        floorOffset += buffer;
                        let groundPlaneOffsetMatrix = [
                            1, 0, 0, 0,
                            0, 1, 0, 0,
                            0, 0, 1, 0,
                            0, floorOffset, 0, 1
                        ];
                        realityEditor.gui.ar.utilities.multiplyMatrix(groundPlaneOffsetMatrix, worldObjectSceneNode.localMatrix, offset);
                        realityEditor.sceneGraph.setGroundPlanePosition(offset);
                        // realityEditor.sceneGraph.setGroundPlanePosition(JSON.parse(JSON.stringify(worldObjectSceneNode.localMatrix)));
                    }
                    return;
                }
            }

            // only set to groundPlane from vuforia if it isn't set to a world object's matrix
            realityEditor.sceneGraph.setGroundPlanePosition(groundPlaneMatrix);
        }
    }

    let listeners = {
        onVuforiaInitFailure: [], // triggers when vuforia is first initialized
        onTrackingStarted: [], // triggers when we first get a device position (again each time we lose and regain tracking)
        onDeviceTrackingStatus: [] // constantly receive the camera's tracking status and statusInfo
    }

    /**
     * Adds a callback that will trigger one time when tracking resumes (when the camera reports a new position)
     * The callback will be discarded afterwards.
     * @param {function} callback
     */
    exports.onTrackingInitialized = function(callback) {
        listeners.onTrackingStarted.push(callback);
    }

    /**
     * Adds an event handler which will constantly receive the camera's tracking status and statusInfo
     * @param {function} callback
     */
    exports.handleDeviceTrackingStatus = function(callback) {
        listeners.onDeviceTrackingStatus.push(callback);
    }

    /**
     * @param {function} callback
     */
    exports.onVuforiaInitFailure = function(callback) {
        listeners.onVuforiaInitFailure.push(callback);
    }

    // public methods (anything triggered by a native app callback needs to be public
    exports.vuforiaIsReady = vuforiaIsReady;
    exports.receivedProjectionMatrix = receivedProjectionMatrix;
    exports.receivedUDPMessage = receivedUDPMessage;
    exports.receiveGroundPlaneMatricesFromAR = receiveGroundPlaneMatricesFromAR;
    exports.receiveMatricesFromAR = receiveMatricesFromAR;
    exports.receivePoses = receivePoses;
    exports.receiveCameraMatricesFromAR = receiveCameraMatricesFromAR;

    exports.startGroundPlaneTrackerIfNeeded = startGroundPlaneTrackerIfNeeded;

})(realityEditor.app.callbacks);
