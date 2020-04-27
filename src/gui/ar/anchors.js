createNameSpace("realityEditor.gui.ar.anchors");

/**
 * @fileOverview
 */

(function(exports) {

    let anchorObjects = {};
    let objectsWithAnchorElements = {};
    let utilities = realityEditor.gui.ar.utilities;
    let fullscreenAnchor = null;

    function initService() {
        realityEditor.gui.ar.draw.addVisibleObjectModifier(modifyVisibleObjects);
        realityEditor.gui.ar.draw.addUpdateListener(onUpdate);
    }

    function modifyVisibleObjects(visibleObjects) {
        // if there's no visible world object other than the world_local, ignore all this code
        if (realityEditor.worldObjects.getBestWorldObject().objectId === realityEditor.worldObjects.getLocalWorldId()) {
            return;
        }

        let anchorObjectIds = Object.keys(objects).filter(function(objectKey) {
            return isAnchorObject(objectKey);
        });

        // if there are no anchor objects, ignore all this code
        if (anchorObjectIds.length === 0) {
            return;
        }

        // console.log('need to render', anchorObjectIds);
        anchorObjectIds.forEach(function(objectKey) {
            // visibleObjects[objectKey] = realityEditor.getObject(objectKey).matrix || utilities.newIdentityMatrix();
            
            let objectMatrix = realityEditor.getObject(objectKey).matrix || utilities.newIdentityMatrix();
            
            // object.matrix is its position relative to the world.. put that relative to screen
            // e.g. if object.matrix is identity, its visibleObjects matrix should be equal to
            // the visibleObjects matrix of its world
            
            let visibleObjectMatrix = [];
            // let worldModelViewMatrix = getWorldModelViewMatrix();
            // utilities.multiplyMatrix(objectMatrix, worldModelViewMatrix, visibleObjectMatrix);

            // let closestWorld = realityEditor.worldObjects.getBestWorldObject();
            // let worldMatrix = visibleObjects[closestWorld.uuid];

            let closestWorld = realityEditor.worldObjects.getBestWorldObject();
            let worldModelMatrix = realityEditor.worldObjects.getOrigin(closestWorld.uuid);

            utilities.multiplyMatrix(objectMatrix, worldModelMatrix, visibleObjectMatrix);

            visibleObjects[objectKey] = visibleObjectMatrix;
        });
    }

    function isAnchorHeartbeat(heartbeat) {
        let checksumIsZero = heartbeat.tcs === 0;
        let jsonIsAnchor = realityEditor.getObject(heartbeat.id).isAnchor;
        return checksumIsZero && jsonIsAnchor;
    }

    function createAnchorFromHeartbeat(heartbeat) {
        if (typeof anchorObjects[heartbeat.id] !== 'undefined') {
            return;
        }

        console.log('create anchor!', heartbeat);

        anchorObjects[heartbeat.id] = heartbeat;
    }

    function isAnchorObject(objectId) {
        return anchorObjects.hasOwnProperty(objectId);
    }

    function onUpdate(modelViewMatrices) {
        for (var objectKey in modelViewMatrices) {
            if (!modelViewMatrices.hasOwnProperty(objectKey)) continue;
            if (!isAnchorObject(objectKey)) continue;

            let closestWorld = realityEditor.worldObjects.getBestWorldObject();
            let worldId = closestWorld.uuid;

            // actually render the outline as a DOM element
            // renderAnchor(objectKey, modelViewMatrices[objectKey], worldId, modelViewMatrices[worldId]);

            if (!globalDOMCache['anchor' + objectKey]) {
                createAnchorElement(objectKey);
            }

            if (fullscreenAnchor === objectKey) {
                // render it fullscreen and return early
                let zIndex = 5000; // defaults to front of screen
                globalDOMCache['anchor' + objectKey].style.transform =
                    'matrix3d(1, 0, 0, 0,' +
                    '0, 1, 0, 0,' +
                    '0, 0, 1, 0,' +
                    '0, 0, ' + zIndex + ', 1)';
                continue;
            }
            
            // let activeObjectMatrix = [];

            // let worldMatrix = realityEditor.worldObjects.getOrigin(worldId);
            // utilities.multiplyMatrix(rotateX, worldMatrix, temp1);
            // utilities.multiplyMatrix(temp1, realityEditor.gui.ar.draw.correctedCameraMatrix, temp2);

            // utilities.multiplyMatrix(worldMatrix, realityEditor.gui.ar.draw.correctedCameraMatrix, temp2);

            let worldModelView = getWorldModelViewMatrix();
            let worldModelViewProjection = [];
            utilities.multiplyMatrix(worldModelView, globalStates.projectionMatrix, worldModelViewProjection);
            
            // let scale = [
            //     3, 0, 0, 0,
            //     0, 3, 0, 0,
            //     0, 0, 3, 0,
            //     0, 0, 0, 1
            // ];

            // utilities.multiplyMatrix(transform, worldModelViewProjection, activeObjectMatrix);
            
            // let positionData = {
            //     x: -3.1,
            //     y: -2.5,
            //     scale: 0.5,
            //     matrix: utilities.newIdentityMatrix()
            // };
            //
            // let r3 = [
            //     0.25, 0, 0, 0,
            //     0, 0.25, 0, 0,
            //     0, 0, 0.25, 0,
            //     -3.1, -2.5, 0, 1
            // ];
            //
            // let r = [];
            let anchorObject = realityEditor.getObject(objectKey);
            let transformedAnchorMatrix = [];

            let scale = 0.5;
            let transform = [
                scale, 0, 0, 0,
                0, scale, 0, 0,
                0, 0, scale, 0,
                0, 0, 0, 1
            ];
            utilities.multiplyMatrix(transform, anchorObject.matrix, transformedAnchorMatrix);

            let finalMatrix = [];
            utilities.multiplyMatrix(transformedAnchorMatrix, worldModelViewProjection, finalMatrix);
            
            // utilities.multiplyMatrix(r3, r, finalMatrix);
            //
            // var projectedPoint = realityEditor.gui.ar.utilities.multiplyMatrix4([0, 0, 0, 1], activeObjectMatrix);
            // finalMatrix[14] = 200 + 1000000 / Math.max(10, projectedPoint[2]);

            globalDOMCache['anchor' + objectKey].style.transform = 'matrix3d(' + finalMatrix.toString() + ')';
            // globalDOMCache['anchor' + objectKey].style.transform = 'matrix3d(' + activeObjectMatrix.toString() + ')';

            // let worldMatrix = modelViewMatrices[worldId];
            // let modelView = [];
            // let modelViewProjection = [];
            // utilities.multiplyMatrix(realityEditor.gui.ar.draw.visibleObjects[worldId])

            // var origin = realityEditor.worldObjects.getOrigin(worldId);
            // if (origin) {
            //     let tempMatrix = [];
            //     realityEditor.gui.ar.utilities.multiplyMatrix(origin, realityEditor.gui.ar.draw.correctedCameraMatrix, tempMatrix);
            //
            //     utilities.multiplyMatrix(tempMatrix, globalStates.projectionMatrix, modelViewProjection);
            //     globalDOMCache['anchor' + objectKey].style.transform = 'matrix3d(' + modelViewProjection.toString() + ')';
            //    
            // }

            // realityEditor.gui.ar.utilities.multiplyMatrix(origin, realityEditor.gui.ar.draw.correctedCameraMatrix, tempMatrix);

            // utilities.multiplyMatrix(realityEditor.gui.ar.draw.visibleObjects[worldId], globalStates.projectionMatrix, modelViewProjection);
            // globalDOMCache['anchor' + objectKey].style.transform = 'matrix3d(' + modelViewProjection.toString() + ')';

        }
    }

    /**
     * Renders a specific object DOM element by calculating its CSS3D transformation
     * @param {string} objectKey
     * @param {Array.<number>} modelViewMatrix - the visibleObjects[objectKey] matrix
     */
    function renderAnchor(objectKey, modelViewMatrix, closestWorldId, worldMatrix) {
        // create div for ghost if needed
        if (!globalDOMCache['anchor' + objectKey]) {
            createAnchorElement(objectKey);
        }

        if (fullscreenAnchor === objectKey) {
            // render it fullscreen and return early
            let zIndex = 5000; // defaults to front of screen
            globalDOMCache['anchor' + objectKey].style.transform =
                'matrix3d(1, 0, 0, 0,' +
                '0, 1, 0, 0,' +
                '0, 0, 1, 0,' +
                '0, 0, ' + zIndex + ', 1)';
            return;
        }

        let worldOrigin = realityEditor.worldObjects.getOrigin(closestWorldId);

        // multiply (marker modelview) * (projection) * (screen rotation) * (vehicle.matrix) * (transformation)
        let tempObjectMatrix = [];
        let finalMatrix = [];

        // utilities.multiplyMatrix(modelViewMatrix, globalStates.projectionMatrix, tempObjectMatrix);

        // utilities.multiplyMatrix(worldOrigin, globalStates.projectionMatrix, tempObjectMatrix);
        utilities.multiplyMatrix(worldMatrix, globalStates.projectionMatrix, tempObjectMatrix);

        let anchorMatrix = realityEditor.getObject(objectKey).matrix;
        let tempResMatrix = [];

        utilities.multiplyMatrix(anchorMatrix, tempObjectMatrix, tempResMatrix);

        let transformMatrix = [
            0.25, 0, 0, 0,
            0, 0.25, 0, 0,
            0, 0, 0.25, 0,
            // positionData.x, positionData.y, 0, 1
            0, 0, 0, 1
        ];

        utilities.multiplyMatrix(transformMatrix, tempResMatrix, finalMatrix);

        // utilities.multiplyMatrix(modelViewMatrix, tempObjectMatrix, finalMatrix);

        // let tempResMatrix = [];
        // if (typeof anchorPosition.matrix !== 'undefined' && anchorPosition.matrix.length === 16) {
        //     utilities.multiplyMatrix(anchorPosition.matrix, tempObjectMatrix, tempResMatrix);
        //     utilities.multiplyMatrix(transformationMatrix, tempResMatrix, finalMatrix);
        // } else {
        //     utilities.multiplyMatrix(transformationMatrix, tempObjectMatrix, finalMatrix);
        // }

        // adjust Z-index so it gets rendered behind all the real frames/nodes
        // calculate center Z of frame to know if it is mostly in front or behind the marker plane
        var projectedPoint = realityEditor.gui.ar.utilities.multiplyMatrix4([0, 0, 0, 1], finalMatrix);
        finalMatrix[14] = 1000000 / Math.max(10, projectedPoint[2]); // (don't add extra 200) so it goes behind real

        // actually adjust the CSS to draw it with the correct transformation
        globalDOMCache['anchor' + objectKey].style.transform = 'matrix3d(' + finalMatrix.toString() + ')';

        // store the screenX and screenY within the anchor to help us later draw lines to the and
        // var anchorCenterPosition = getDomElementCenterPosition(globalDOMCache['anchor' + objectKey]);
        // anchorCenterPosition.screenX = anchorCenterPosition.x;
        // anchorCenterPosition.screenY = anchorCenterPosition.y;
    }

    // /**
    //  * Instantly moves the frame to the pocketBegin matrix, so it's floating right in front of the camera
    //  * @param objectKey
    //  * @param frameKey
    //  */
    // funciton moveAnchorToCamera = function(objectKey, frameKey) {
    //
    //     var frame = realityEditor.getFrame(objectKey, frameKey);
    //
    //     // recompute frame.temp for the new object
    //     realityEditor.gui.ar.utilities.multiplyMatrix(realityEditor.gui.ar.draw.modelViewMatrices[objectKey], globalStates.projectionMatrix, frame.temp);
    //
    //     console.log('temp', frame.temp);
    //     frame.begin = realityEditor.gui.ar.utilities.copyMatrix(pocketBegin);
    //
    //     // compute frame.matrix based on new object
    //     var resultMatrix = [];
    //     realityEditor.gui.ar.utilities.multiplyMatrix(frame.begin, realityEditor.gui.ar.utilities.invertMatrix(frame.temp), resultMatrix);
    //     realityEditor.gui.ar.positioning.setPositionDataMatrix(frame, resultMatrix); // TODO: fix this somehow, make it more understandable
    //
    //     // reset frame.begin
    //     frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
    //
    // };

    /**
    /**
     * Creates a DOM element for the given object
     * @param {string} objectKey
     */
    function createAnchorElement(objectKey) {
        let anchorContainer = document.createElement('div');
        anchorContainer.id = 'anchor' + objectKey;
        anchorContainer.classList.add('anchorContainer', 'ignorePointerEvents', 'main', 'visibleFrameContainer');
        anchorContainer.style.width = globalStates.height + 'px';
        anchorContainer.style.height = globalStates.width + 'px';

        let anchorContents = document.createElement('div');
        anchorContents.id = 'anchorContents' + objectKey;
        anchorContents.classList.add('anchorContents', 'usePointerEvents');
        anchorContents.style.left = (globalStates.height/2 - 300/2) + 'px';
        anchorContents.style.top = (globalStates.width/2 - 300/2) + 'px';
        
        anchorContainer.appendChild(anchorContents);
        document.getElementById('GUI').appendChild(anchorContainer);
        
        globalDOMCache['anchor' + objectKey] = anchorContainer;
        globalDOMCache['anchorContents' + objectKey] = anchorContents;

        updateAnchorGraphics(objectKey, true);

        // maintain a list so that we can remove them all on demand
        objectsWithAnchorElements[objectKey] = true;

        // attach event listeners
        anchorContents.addEventListener('pointerup', function(_e) {
            onAnchorTapped(objectKey);
        });
    }

    function onAnchorTapped(objectKey) {
        console.log('anchor tapped for object ' + objectKey);
        console.log(realityEditor.gui.ar.draw.visibleObjects[realityEditor.worldObjects.getBestWorldObject().uuid]);
        
        if (!fullscreenAnchor) {
            fullscreenAnchor = objectKey;
        } else {
            if (fullscreenAnchor === objectKey) {
                console.log('drop anchor here');

                // let closestWorld = realityEditor.worldObjects.getBestWorldObject();

                /*     this sorta almost doesnt work     */
                /* ------------------------------------- */
                // // compute new object.matrix for this object based on the camera matrix
                // let cameraMatrix = utilities.invertMatrix(realityEditor.gui.ar.draw.correctedCameraMatrix);
                //
                // let closestWorld = realityEditor.worldObjects.getBestWorldObject();
                // let worldId = closestWorld.uuid;
                // let worldMatrix = realityEditor.worldObjects.getOrigin(worldId);
                //
                // let cameraRelativeToWorld = [];
                // // utilities.multiplyMatrix(utilities.invertMatrix(worldMatrix), cameraMatrix, cameraRelativeToWorld);
                // utilities.multiplyMatrix(worldMatrix, cameraMatrix, cameraRelativeToWorld);
                //
                // let anchorObject = realityEditor.getObject(objectKey);
                // // anchorObject.matrix = cameraMatrix;
                // anchorObject.matrix = cameraRelativeToWorld;
                /* ------------------------------------- */

                // get the world relative to the camera
                // invert it - that will give the camera relative to the world
                // placing the element at that position, when multiplied relative to the world
                // position, should yield an identity matrix -> what we want
                
                let worldModelView = getWorldModelViewMatrix();
                // let worldModelViewProjection = [];
                // utilities.multiplyMatrix(worldModelView, globalStates.projectionMatrix, worldModelViewProjection);

                let inverseWorld = utilities.invertMatrix(worldModelView);
                // let inverseWorld = utilities.invertMatrix(worldModelViewProjection);
                
                // flip it so it faces towards the camera instead of away from the camera
                let q = realityEditor.gui.ar.utilities.getQuaternionFromPitchRollYaw(0, Math.PI, Math.PI);
                let rotationMatrix = utilities.getMatrixFromQuaternion(q);
                
                let finalMatrix = [];
                utilities.multiplyMatrix(rotationMatrix, inverseWorld, finalMatrix);

                let anchorObject = realityEditor.getObject(objectKey);
                anchorObject.matrix = finalMatrix;

                // let anchorMatrix = getMatrixForAnchor(objectKey, closestWorld.uuid);
                
                // // compute new object.matrix for this object based on the camera matrix
                // let cameraMatrix = utilities.invertMatrix(realityEditor.gui.ar.draw.correctedCameraMatrix);
                //
                // let closestWorld = realityEditor.worldObjects.getBestWorldObject();
                // let worldId = closestWorld.uuid;
                // let worldMatrix = realityEditor.worldObjects.getOrigin(worldId);
                //
                // let cameraRelativeToWorld = [];
                // // utilities.multiplyMatrix(utilities.invertMatrix(worldMatrix), cameraMatrix, cameraRelativeToWorld);
                // utilities.multiplyMatrix(worldMatrix, cameraMatrix, cameraRelativeToWorld);
                //
                // let anchorObject = realityEditor.getObject(objectKey);
                // // anchorObject.matrix = cameraMatrix;
                // anchorObject.matrix = cameraRelativeToWorld;

                realityEditor.network.postObjectPosition(anchorObject.ip, objectKey, anchorObject.matrix);

                fullscreenAnchor = null;
            }

            // if (fullscreenAnchor !== objectKey) {
            //     fullscreenAnchor = objectKey;
            // } else {
            //     fullscreenAnchor = null;
            // }
        }

        updateAnchorGraphics(objectKey);
    }
    
    function updateAnchorGraphics(objectKey, forceCreation) {
        let element = globalDOMCache['anchorContents' + objectKey];
        if (fullscreenAnchor === objectKey) {
            if (!element.classList.contains('anchorContentsFullscreen') || forceCreation) {
                
                // first, hide the sidebar buttons
                document.querySelector('#UIButtons').classList.add('hiddenButtons');
                
                element.classList.add('anchorContentsFullscreen');

                element.style.left = 0;
                element.style.top = 0;

                element.innerHTML = '';
                
                let margin = 5;

                let topLeft = document.createElement('img');
                topLeft.src = '../../../svg/anchorTopLeft.svg';
                topLeft.classList.add('anchorCorner');
                topLeft.style.left = margin + 'px';
                topLeft.style.top = margin + 'px';

                let topRight = document.createElement('img');
                topRight.src = '../../../svg/anchorTopRight.svg';
                topRight.classList.add('anchorCorner');
                topRight.style.right = margin + 'px';
                topRight.style.top = margin + 'px';

                let bottomLeft = document.createElement('img');
                bottomLeft.src = '../../../svg/anchorBottomLeft.svg';
                bottomLeft.classList.add('anchorCorner');
                bottomLeft.style.left = margin + 'px';
                bottomLeft.style.bottom = margin + 'px';

                let bottomRight = document.createElement('img');
                bottomRight.src = '../../../svg/anchorBottomRight.svg';
                bottomRight.classList.add('anchorCorner');
                bottomRight.style.right = margin + 'px';
                bottomRight.style.bottom = margin + 'px';

                let centerContainer = document.createElement('div');
                centerContainer.classList.add('anchorCenter');
                let size = (0.6 * globalStates.width);
                centerContainer.style.left = (globalStates.height/2 - size/2) + 'px';
                centerContainer.style.top = (globalStates.width/2 - size/2) + 'px';

                let centerSvg = document.createElement('img');
                centerSvg.src = '../../../svg/anchorCenter.svg';
                centerContainer.appendChild(centerSvg);

                let textfield = document.createElement('div');
                textfield.classList.add('anchorTextField');
                textfield.innerText = realityEditor.getObject(objectKey).name;
                centerContainer.appendChild(textfield);

                element.appendChild(topLeft);
                element.appendChild(topRight);
                element.appendChild(bottomLeft);
                element.appendChild(bottomRight);
                element.appendChild(centerContainer);

                resizeAnchorText(objectKey);
            }
        } else {
            if (element.classList.contains('anchorContentsFullscreen') || forceCreation) {
                
                // first show the sidebar buttons
                document.querySelector('#UIButtons').classList.remove('hiddenButtons');

                element.classList.remove('anchorContentsFullscreen');

                element.style.left = (globalStates.height/2 - 300/2) + 'px';
                element.style.top = (globalStates.width/2 - 300/2) + 'px';

                element.innerHTML = '';
                let anchorContentsPlaced = document.createElement('img');
                anchorContentsPlaced.src = '../../../svg/anchor.svg';
                anchorContentsPlaced.classList.add('anchorContentsPlaced');
                element.appendChild(anchorContentsPlaced);

                let textfield = document.createElement('div');
                textfield.classList.add('anchorTextField');
                textfield.innerText = realityEditor.getObject(objectKey).name;
                element.appendChild(textfield);

                resizeAnchorText(objectKey);
            }
        }
    }

    /**
     * Re-sizes the object name inside the anchor to fit the text box background
     * @param {string} objectKey
     */
    function resizeAnchorText(objectKey) {
        let anchorElement = globalDOMCache['anchorContents' + objectKey];
        let textfield = anchorElement.querySelector('.anchorTextField');

        const maxFontSize = 18;

        // prep by resetting so we can compute size with default params
        textfield.style.width = '';
        textfield.style.fontSize = maxFontSize + 'px';

        // resize text to fit after it renders once
        requestAnimationFrame(function() {
            let desiredWidth = anchorElement.clientWidth * 0.35;
            let anchorCenter = anchorElement.querySelector('.anchorCenter');
            if (anchorCenter) {
                desiredWidth = anchorCenter.clientWidth * 0.35;
            }
            let realWidth = parseFloat(getComputedStyle(textfield).width);

            let percent = desiredWidth / realWidth;
            let newFontSize = Math.min(maxFontSize, maxFontSize * percent);
            textfield.style.fontSize = newFontSize + 'px';

            // update with set width/height after calculating so text is centered
            textfield.style.width = desiredWidth + 'px';
            let realHeight = parseFloat(getComputedStyle(textfield).height);
            textfield.style.lineHeight = realHeight + 'px';
        });
    }
    
    function getWorldModelViewMatrix() {
        let closestWorld = realityEditor.worldObjects.getBestWorldObject();
        let worldModelMatrix = realityEditor.worldObjects.getOrigin(closestWorld.uuid);
        let modelViewMatrix = [];
        utilities.multiplyMatrix(worldModelMatrix, realityEditor.gui.ar.draw.correctedCameraMatrix, modelViewMatrix);
        return modelViewMatrix;
    }
    
    // function getMatrixForAnchor(objectKey, worldKey) {
    //     let worldMatrix = realityEditor.worldObjects.getOrigin(worldKey);
    //     let temp1 = [];
    //     utilities.multiplyMatrix(worldMatrix, realityEditor.gui.ar.draw.correctedCameraMatrix, temp1);
    //     let activeObjectMatrix = [];
    //     utilities.multiplyMatrix(temp1, globalStates.projectionMatrix, activeObjectMatrix);
    //     let anchorObject = realityEditor.getObject(objectKey);
    //     let finalMatrix = [];
    //     utilities.multiplyMatrix(anchorObject.matrix, activeObjectMatrix, finalMatrix);
    //     return finalMatrix;
    // }

    exports.initService = initService;
    exports.isAnchorHeartbeat = isAnchorHeartbeat;
    exports.createAnchorFromHeartbeat = createAnchorFromHeartbeat;
    exports.isAnchorObject = isAnchorObject;

})(realityEditor.gui.ar.anchors);
