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

    let hasActiveGroundPlaneStream = false;

    const skeletonDedupId = Math.floor(Math.random() * 10000);

    function onOrientationSet() {
        // start the AR framework in native iOS
        realityEditor.app.getVuforiaReady('realityEditor.app.callbacks.vuforiaIsReady');
    }

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

        console.log('getGroundPlaneMatrixStream');
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
        // console.log('got projection matrix!', matrix);
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
     * Callback for realityEditor.app.getPosesStream
     * @param {Array<Object>} poses
     */
    function receivePoses(poses) {
        if (!window.rzvIo) {
            // window.rzvIo = io('http://jhobin0ml.local:31337');
            // window.rzvIo = io('http://10.10.10.166:31337');
            // window.rzvIo = io('http://192.168.0.106:31337');
            // window.rzvIo = io('http://192.168.50.98:31337');

            let bestWorldObject = realityEditor.worldObjects.getBestWorldObject();
            if (!bestWorldObject || bestWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
                return;
            }
            const wsPort = 31337;
            const url = `ws://${bestWorldObject.ip}:${wsPort}/`;
            // const url = 'ws://10.10.10.166:31337/';
            window.rzvIo = new WebSocket(url);
        }

        let coolerPoses = [];
        let worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (!worldObject) {
            console.warn('okay I give up');
            return;
        }
        let worldObjectId = worldObject.objectId;
        let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
        let gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE + realityEditor.sceneGraph.TAGS.ROTATE_X);
        if (!gpNode) {
             gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE);
        }
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.CAMERA);
        // let persistentClientId = window.localStorage.getItem('persistentClientId') || globalStates.defaultClientName;
        // let sceneNode = realityEditor.sceneGraph.getSceneNodeById(persistentClientId);
        let sceneNode = new realityEditor.sceneGraph.SceneNode('posePixel');
        sceneNode.setParent(realityEditor.sceneGraph.getSceneNodeById('ROOT'));
        // realityEditor.sceneGraph.changeParent(sceneNode, realityEditor.sceneGraph.NAMES.GROUNDPLANE, false);
        // let gpNode = sceneNode.parent;
        // if (!worldNode) {
        //     worldNode = gpNode;
        // }
        let basisNode = worldNode; // gpNode;
        basisNode.updateWorldMatrix();
        cameraNode.updateWorldMatrix();
        // cameraNode.setParent(gpNode);
        // realityEditor.sceneGraph.changeParent(cameraNode, realityEditor.sceneGraph.NAMES.GROUNDPLANE, false);
        // if (!basisNode.parent) {
        //     console.log('updating basis parent');
        //     realityEditor.sceneGraph.changeParent(basisNode, realityEditor.sceneGraph.NAMES.ROOT, true);
        // }

        if (poses.length > 0) {
            for (let start in realityEditor.gui.poses.JOINT_NEIGHBORS) {
                let pointA = poses[start];
                let others = realityEditor.gui.poses.JOINT_NEIGHBORS[start];
                let outlierPresent = false;
                let minDepth = pointA.depth;
                for (let other of others) {
                    let pointB = poses[other];
                    minDepth = Math.min(minDepth, pointB.depth);
                }
                for (let other of others) {
                    let pointB = poses[other];
                    if (Math.abs(pointB.depth - minDepth) > 1.5) {
                        outlierPresent = true;
                    }
                }
                if (!outlierPresent) {
                    continue;
                }
                for (let other of others) {
                    let pointB = poses[other];
                    if (Math.abs(pointB.depth - minDepth) > 1.5) {
                        pointB.depth = minDepth;
                    }
                }
            }

            let depths = Object.values(realityEditor.gui.poses.POSE_JOINTS_DEPTH);
            for (let i = 0; i < depths.length; i++) {
                poses[i].depth += depths[i];
            }
        }

        for (let point of poses) {
            // place it in front of the camera, facing towards the camera
            // sceneNode.setParent(realityEditor.sceneGraph.getSceneNodeById('ROOT')); hmm

            const THREE = realityEditor.gui.threejsScene.THREE;
            let vec = new THREE.Vector3(0, 0, point.depth * 1000);
            vec.applyEuler(new THREE.Euler(point.rotY, point.rotX, 0));
            let initialVehicleMatrix = [
                -1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, -1, 0,
                vec.x, vec.y, -vec.z, 1
            ];

            // needs to be flipped in some environments with different camera systems
            if (realityEditor.device.environment.isCameraOrientationFlipped()) {
                initialVehicleMatrix[0] *= -1;
                initialVehicleMatrix[5] *= -1;
                initialVehicleMatrix[10] *= -1;
            }

            sceneNode.setPositionRelativeTo(cameraNode, initialVehicleMatrix);
            sceneNode.updateWorldMatrix();

            let mat = sceneNode.getMatrixRelativeTo(basisNode);

            let worldX = mat[12];
            let worldY = mat[13];
            let worldZ = mat[14];
            coolerPoses.push({
                x: worldX / 1000,
                y: worldY / 1000,
                z: worldZ / 1000,
            });
        }

        let initialVehicleMatrix = [
            -1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, -1, 0,
            0, 0, 0, 1
        ];

        sceneNode.setPositionRelativeTo(cameraNode, initialVehicleMatrix);
        sceneNode.updateWorldMatrix();

        let cameraMat = sceneNode.getMatrixRelativeTo(basisNode);
        let msg = {time: Date.now(), pose: [{id: 1337 + skeletonDedupId, joints: coolerPoses}], camera: cameraMat};

        // if (window.rzvIo && (coolerPoses.length > 0 || coolerPoses.length !== window.lastPosesLen)) {
        //     if (coolerPoses.length > 0 || Math.random() > 0.9) {
        //         window.lastPosesLen = coolerPoses.length;
        //     }
        if (window.rzvIo.readyState === WebSocket.OPEN) {
            window.rzvIo.send(JSON.stringify(Object.assign({
                command: '/update/humanPoses'
            }, msg)));
        }
        // }

        let camX = cameraMat[12];
        let camY = cameraMat[13];
        let camZ = cameraMat[14];
        realityEditor.gui.poses.drawPoses(poses, coolerPoses, {
            x: camX / 1000,
            y: camY / 1000,
            z: camZ / 1000,
        });
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
                    if (worldObjectKey === bestWorldObject.uuid) {
                        
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
        // easiest way to implement freeze button is just to not update the new matrices
        if (!globalStates.freezeButtonState) {
            realityEditor.worldObjects.checkIfFirstLocalization();

            let cameraMatrix = cameraInfo.matrix;
            let trackingStatus = cameraInfo.status;
            let trackingStatusInfo = cameraInfo.statusInfo;
            // console.log('camera : ' + trackingStatus + ' : ' + trackingStatusInfo);

            trackingStatusCallbacks.forEach(function(callback) {
                callback(trackingStatus, trackingStatusInfo);
            });

            realityEditor.sceneGraph.setCameraPosition(cameraMatrix);

            if (anyPendingCallbacks) {
                let callback = trackingStartedCallbacks.pop();
                callback();
                anyPendingCallbacks = trackingStartedCallbacks.length > 0;
            }
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
        // only update groundPlane if unfrozen and at least one thing is has requested groundPlane usage
        if (globalStates.useGroundPlane && !globalStates.freezeButtonState) {
            
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

    let trackingStartedCallbacks = [];
    let anyPendingCallbacks = false;

    /**
     * Adds a callback that will trigger one time when tracking resumes (when the camera reports a new position)
     * The callback will be discarded afterwards.
     * @param {function} callback
     */
    function onTrackingInitialized(callback) {
        trackingStartedCallbacks.push(callback);
        anyPendingCallbacks = true;
    }

    let trackingStatusCallbacks = [];

    /**
     * Adds an event handler which will constantly receive the camera's tracking status and statusInfo
     * @param {function} callback
     */
    function handleDeviceTrackingStatus(callback) {
        trackingStatusCallbacks.push(callback);
    }

    // public methods (anything triggered by a native app callback needs to be public
    exports.onOrientationSet = onOrientationSet;
    exports.vuforiaIsReady = vuforiaIsReady;
    exports.receivedProjectionMatrix = receivedProjectionMatrix;
    exports.receivedUDPMessage = receivedUDPMessage;
    exports.getDeviceReady = getDeviceReady;
    exports.receiveGroundPlaneMatricesFromAR = receiveGroundPlaneMatricesFromAR;
    exports.receiveMatricesFromAR = receiveMatricesFromAR;
    exports.receivePoses = receivePoses;
    exports.receiveCameraMatricesFromAR = receiveCameraMatricesFromAR;

    exports.startGroundPlaneTrackerIfNeeded = startGroundPlaneTrackerIfNeeded;
    exports.onTrackingInitialized = onTrackingInitialized;
    exports.handleDeviceTrackingStatus = handleDeviceTrackingStatus;

})(realityEditor.app.callbacks);
