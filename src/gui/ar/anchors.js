createNameSpace("realityEditor.gui.ar.anchors");

/**
 * @fileOverview
 */

(function(exports) {

    let anchorObjects = {};
    let utilities = realityEditor.gui.ar.utilities;
    let fullscreenAnchor = null;
    const anchorContentSize = 300;
    const anchorDistanceThreshold = 2000; // disappear if further away than 2 meters
    let anchorsOutsideOfViewport = {};

    function initService() {
        realityEditor.gui.ar.draw.addVisibleObjectModifier(modifyVisibleObjects);
        realityEditor.gui.ar.draw.addUpdateListener(onUpdate);
    }

    /**
     * Anchor objects are uniquely defined by a heartbeat with checksum=0 and the isAnchor property
     * @param heartbeat
     * @return {boolean|*}
     */
    function isAnchorHeartbeat(heartbeat) {
        let checksumIsZero = heartbeat.tcs === 0;
        let jsonIsAnchor = realityEditor.getObject(heartbeat.id).isAnchor;
        return checksumIsZero && jsonIsAnchor;
    }

    /**
     * Helper function to register this heartbeat as a recognized anchor
     * @param heartbeat
     */
    function createAnchorFromHeartbeat(heartbeat) {
        if (typeof anchorObjects[heartbeat.id] !== 'undefined') {
            return;
        }
        anchorObjects[heartbeat.id] = heartbeat;
    }

    /**
     * Helper function returns whether this object ID is an anchor (and thus has no target data)
     * @param objectId
     * @return {boolean}
     */
    function isAnchorObject(objectId) {
        return anchorObjects.hasOwnProperty(objectId);
    }

    /**
     * This gets triggered at the beginning of gui.ar.draw.update
     * We use this function to inject anchor objects' model matrices into the visibleObjects in the
     * gui.ar.draw.update function
     * @param visibleObjects
     * @todo: store which world they are relative to, rather than finding closest world each time
     * (e.g. even if the closest world to the camera changes, the anchor should stay relative to
     * its world)
     */
    function modifyVisibleObjects(visibleObjects) {
        // if there's no visible world object other than the world_local, ignore all this code
        let bestWorldObject = realityEditor.worldObjects.getBestWorldObject();
        if (!bestWorldObject || bestWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
            return;
        }

        let anchorObjectIds = Object.keys(objects).filter(function(objectKey) {
            return isAnchorObject(objectKey);
        });

        // if there are no anchor objects, ignore all this code
        if (anchorObjectIds.length === 0) {
            return;
        }

        anchorObjectIds.forEach(function(objectKey) {
            // object.matrix is its position relative to the world..
            // e.g. if object.matrix is identity, its visibleObjects matrix should be equal to
            // the visibleObjects matrix of its world
            let objectMatrix = realityEditor.getObject(objectKey).matrix || utilities.newIdentityMatrix();

            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
            if (sceneNode) {
                let worldObjectSceneNode = realityEditor.sceneGraph.getSceneNodeById(bestWorldObject.objectId);
                sceneNode.setParent(worldObjectSceneNode);
                sceneNode.setLocalMatrix(objectMatrix);
            }

            // only adds this object to visibleObjects if the position is within the camera's
            // cone of view and close enough to the camera
            if (shouldAddToVisibleObjects(objectKey)) {
                visibleObjects[objectKey] = objectMatrix;
            } else {
                hideAnchorElementIfNeeded(objectKey);
            }
        });
    }

    /**
     * hide and remove object from visibleObjects if it is outside the viewport or too far away
     * only exception is if it's fullscreen - then automatically visible
     * @param {string} objectKey
     * @return {boolean}
     */
    function shouldAddToVisibleObjects(objectKey) {
        // TODO ben: reimplement with canUnload
        let isOutsideViewport = false; //realityEditor.gui.ar.positioning.canUnload(objectKey,
            // finalAnchorMatrices[objectKey], anchorContentSize/2, anchorContentSize/2);
        let distanceToCamera = realityEditor.sceneGraph.getDistanceToCamera(objectKey);

        if (fullscreenAnchor === objectKey) {
            return true;
        }

        let isDistanceOk = distanceToCamera < getAnchorDistanceThreshold(objectKey) || !realityEditor.device.environment.supportsDistanceFading();

        return !isOutsideViewport && isDistanceOk;
    }

    /**
     * This gets triggered at the end of gui.ar.draw.update
     * @param visibleObjects
     */
    function onUpdate(visibleObjects) {
        for (var objectKey in visibleObjects) {
            if (!visibleObjects.hasOwnProperty(objectKey)) continue;
            if (!isAnchorObject(objectKey)) continue;

            // create the DOM element and render with the correct transformation
            if (!globalDOMCache['anchor' + objectKey]) {
                createAnchorElement(objectKey); // creates DOM and adds to sceneGraph
            }

            // render it fullscreen and skip 3d rendering early if it is being "carried"
            if (fullscreenAnchor === objectKey) {
                let zIndex = 5000; // defaults to front of screen
                globalDOMCache['anchor' + objectKey].style.transform =
                    'matrix3d(1, 0, 0, 0,' +
                    '0, 1, 0, 0,' +
                    '0, 0, 1, 0,' +
                    '0, 0, ' + zIndex + ', 1)';
                continue;
            }

            // retrieve final value computed by scene graph
            let visualElementNode = realityEditor.sceneGraph.getVisualElement('anchor' + objectKey);
            let finalMatrix = realityEditor.sceneGraph.getCSSMatrix(visualElementNode.id);

            let activeElt = globalDOMCache['anchor' + objectKey];

            // render if within view frustum and within distance threshold (last frame)
            if (!anchorsOutsideOfViewport[objectKey]) {
                activeElt.style.transform = 'matrix3d(' + finalMatrix.toString() + ')';
            } else {
                hideAnchorElementIfNeeded(objectKey); // hide if it was outside (last frame)
            }
            
            // hide if it is outside the viewport or too far away
            // let isNowOutsideViewport = realityEditor.gui.ar.positioning.canUnload(objectKey, finalMatrix, anchorContentSize/2, anchorContentSize/2);
            let distanceToCamera =  realityEditor.sceneGraph.getDistanceToCamera(objectKey);
            let isDistanceOk = distanceToCamera < getAnchorDistanceThreshold(objectKey) || !realityEditor.device.environment.supportsDistanceFading();

            let isNowOutsideViewport = /*isNowOutsideViewport ||*/ !isDistanceOk;

            if (isNowOutsideViewport) {
                hideAnchorElementIfNeeded(objectKey); // hide if newly outside this frame
            } else {
                // show anchor if it was outside viewport but now it isn't
                if (anchorsOutsideOfViewport[objectKey]) {
                    delete anchorsOutsideOfViewport[objectKey];
                    activeElt.classList.remove('outsideOfViewport');
                    activeElt.style.transform = 'matrix3d(' + finalMatrix.toString() + ')';
                }
            }
        }
    }

    /**
     * anchorDistanceThreshold is the default, but expands to stay visible if its tools have a
     * visibility distance that is larger than the default anchor threshold
     * @param objectKey
     * @return {number}
     */
    function getAnchorDistanceThreshold(objectKey) {
        let maxFrameDistanceThreshold = 0;
        realityEditor.forEachFrameInObject(objectKey, function(objectKey, frameKey) {
            let frame = realityEditor.getFrame(objectKey, frameKey);
            let distanceScale = realityEditor.gui.ar.getDistanceScale(frame);
            // multiply the default min distance by the amount this frame distance has been scaled up
            let scaleFactor = 0.8; // discount the distance of frames compared to the anchor threshold
            let distanceThreshold = scaleFactor * (distanceScale * realityEditor.device.distanceScaling.getDefaultDistance());
            if (distanceThreshold > maxFrameDistanceThreshold) {
                maxFrameDistanceThreshold = distanceThreshold;
            }
        });
        return Math.max(anchorDistanceThreshold, maxFrameDistanceThreshold);
    }

    /**
     * Helper function to ensure the HTML element for an anchor gets removed properly
     * @param {string} objectKey
     */
    function hideAnchorElementIfNeeded(objectKey) {
        let activeElt = globalDOMCache['anchor' + objectKey];

        if (fullscreenAnchor === objectKey) {
            return; // don't hide the fullscreen anchor otherwise no way to go back
        }

        if (activeElt && (!anchorsOutsideOfViewport[objectKey] || !activeElt.classList.contains('outsideOfViewport'))) {
            anchorsOutsideOfViewport[objectKey] = true; // make sure to keep track of this property
            activeElt.classList.add('outsideOfViewport');
        }
    }
    
    /**
     * Creates a DOM element for the given object.
     * Element must be constructed in a certain way to render correctly in 3d space.
     * @param {string} objectKey
     */
    function createAnchorElement(objectKey) {
        let anchorContainer = document.createElement('div');
        anchorContainer.id = 'anchor' + objectKey;
        anchorContainer.classList.add('anchorContainer', 'ignorePointerEvents', 'main', 'visibleFrameContainer');
        // IMPORTANT NOTE: the container size MUST be the size of the screen for the 3d math to work
        // This is the same size as the containers that frames get added to.
        // If size differs, rendering will be inconsistent between frames and anchors.
        anchorContainer.style.width = globalStates.height + 'px';
        anchorContainer.style.height = globalStates.width + 'px';

        // the contents are a different size than the screen, so we add another div and center it
        let anchorContents = document.createElement('div');
        anchorContents.id = 'anchorContents' + objectKey;
        anchorContents.classList.add('anchorContents', 'usePointerEvents');
        anchorContents.style.left = (globalStates.height/2 - anchorContentSize/2) + 'px';
        anchorContents.style.top = (globalStates.width/2 - anchorContentSize/2) + 'px';
        
        anchorContainer.appendChild(anchorContents);
        document.getElementById('GUI').appendChild(anchorContainer);
        
        globalDOMCache['anchor' + objectKey] = anchorContainer;
        globalDOMCache['anchorContents' + objectKey] = anchorContents;

        updateAnchorGraphics(objectKey, true);

        // attach event listeners
        anchorContents.addEventListener('pointerup', function(event) {
            if (realityEditor.device.environment.requiresMouseEvents() && event.button === 2) { return; } // ignore right-clicks

            onAnchorTapped(objectKey);
        });

        // add a scene node to object for the anchor graphics and rotate it 180 degrees so it faces correct direction
        let objectSceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
        let elementMatrix = [];
        let scale = 0.5;
        let transform = [
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, scale, 0,
            0, 0, 0, 1
        ];
        utilities.multiplyMatrix(transform, makeRotationZ(Math.PI), elementMatrix);
        realityEditor.sceneGraph.addVisualElement(anchorContainer.id, objectSceneNode, undefined, elementMatrix);
    }

    var makeRotationZ =  function ( theta ) {
        var c = Math.cos( theta ), s = Math.sin( theta );
        return [  c, -s, 0, 0,
            s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1];
    };

    /**
     * Toggle between fullscreen and 3d modes when an anchor is tapped
     * @todo: maybe only allow this in repositioning mode so it doesn't happen accidentally?
     * @param {string} objectKey
     */
    function onAnchorTapped(objectKey) {
        if (!fullscreenAnchor) {
            // setting fullscreenAnchor to the object ID is all that is necessary to pick it up
            fullscreenAnchor = objectKey;
        } else {
            // tapping on the fullscreen anchor drops the anchor at the phone's exact position
            if (fullscreenAnchor === objectKey) {
                // calculates position relative to world so that anchor is positioned at the camera
                if (!realityEditor.device.environment.isCameraOrientationFlipped()) {
                    realityEditor.sceneGraph.moveSceneNodeToCamera(objectKey, false);

                } else {
                    // needs to be upside-down relative to camera in certain environments
                    let sceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
                    let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');
                    let initialVehicleMatrix = [
                        1, 0, 0, 0,
                        0, -1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1
                    ];
                    sceneNode.setPositionRelativeTo(cameraNode, initialVehicleMatrix);
                }
                
                // store the new relative position of the anchor to the world
                let anchorObject = realityEditor.getObject(objectKey);
                anchorObject.matrix = realityEditor.sceneGraph.getSceneNodeById(objectKey).localMatrix;

                // upload to the server for persistence

                // if it's an object, post object position relative to a world object
                // let worldObjectId = realityEditor.sceneGraph.getWorldId();
                // let worldNode = realityEditor.sceneGraph.getSceneNodeById(worldObjectId);
                // let anchorNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
                // let relativeMatrix = anchorNode.getMatrixRelativeTo(worldNode);
                
                realityEditor.sceneGraph.network.uploadObjectPosition(objectKey);
                
                // realityEditor.network.postObjectPosition(anchorObject.ip, objectKey, anchorObject.matrix, worldObjectId);

                fullscreenAnchor = null;
            }
        }

        // update the HTML of the anchor based on whether it is now fullscreen or not
        updateAnchorGraphics(objectKey);
    }

    /**
     * Swaps the contents of the anchor's HTML container to be either a small icon in space with
     * the object name, or a fullscreen element that expands to fill the screen and has 4
     * corners and a center crosshair with the object name.
     * @param {string} objectKey
     * @param {boolean} forceCreation - tries to be efficient and not recreate inner graphics
     *  every time, but pass in true the first time it is created to ensure this happens at
     *  least onc
     */
    function updateAnchorGraphics(objectKey, forceCreation) {
        let element = globalDOMCache['anchorContents' + objectKey];
        if (fullscreenAnchor === objectKey && (!element.classList.contains('anchorContentsFullscreen') || forceCreation)) {

            // first, hide the sidebar buttons
            document.querySelector('#UIButtons').classList.add('hiddenButtons');

            // fill the width and height of the screen
            element.classList.add('anchorContentsFullscreen');

            // some style needs to be applied with js to override other runtime calculated properties
            element.style.left = 0;
            element.style.top = 0;

            // rebuild the SVG at correct size to fill the screen's corners
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

            // add a textfield with the object name
            let textfield = document.createElement('div');
            textfield.classList.add('anchorTextField');
            textfield.innerText = realityEditor.getObject(objectKey).name;
            centerContainer.appendChild(textfield);

            element.appendChild(topLeft);
            element.appendChild(topRight);
            element.appendChild(bottomLeft);
            element.appendChild(bottomRight);
            element.appendChild(centerContainer);

            // this needs to happen after elements have been added to the DOM
            resizeAnchorText(objectKey);
        } else if (element.classList.contains('anchorContentsFullscreen') || forceCreation) {

            // first show the sidebar buttons
            document.querySelector('#UIButtons').classList.remove('hiddenButtons');

            // resize it to be a small centered icon in its container
            element.classList.remove('anchorContentsFullscreen');
            element.style.left = (globalStates.height/2 - anchorContentSize/2) + 'px';
            element.style.top = (globalStates.width/2 - anchorContentSize/2) + 'px';

            // rebuild the HTML with an SVG icon
            element.innerHTML = '';
            let anchorContentsPlaced = document.createElement('img');
            anchorContentsPlaced.src = '../../../svg/anchor.svg';
            anchorContentsPlaced.classList.add('anchorContentsPlaced');
            element.appendChild(anchorContentsPlaced);

            // create the text field again
            let textfield = document.createElement('div');
            textfield.classList.add('anchorTextField');
            textfield.innerText = realityEditor.getObject(objectKey).name;
            element.appendChild(textfield);

            resizeAnchorText(objectKey);
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
        const minTextWidth = 105;

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
            if (desiredWidth < minTextWidth || isNaN(desiredWidth)) {
                desiredWidth = minTextWidth;
            }
            textfield.style.width = desiredWidth + 'px';
            let realHeight = parseFloat(getComputedStyle(textfield).height);
            textfield.style.lineHeight = realHeight + 'px';
        });
    }

    function snapAnchorToScreen(objectKey) {
        fullscreenAnchor = objectKey;
        // update the HTML of the anchor based on whether it is now fullscreen or not
        updateAnchorGraphics(objectKey);
        
        // make sure it doesn't get stuck with isOutsideViewport invisibility
        if (anchorsOutsideOfViewport[objectKey]) {
            delete anchorsOutsideOfViewport[objectKey];
            globalDOMCache['anchor' + objectKey].classList.remove('outsideOfViewport');
        }
    }

    // TODO: associate each anchor with a world, and only return true if that particular world has been seen
    // for now, returns true if any world other than world_local has been seen
    function isAnchorObjectDetected(_objectKey) {
        let bestWorldObject = realityEditor.worldObjects.getBestWorldObject();
        if (!bestWorldObject) { return false; }
        return bestWorldObject.objectId !== realityEditor.worldObjects.getLocalWorldId();
    }

    exports.initService = initService;
    exports.isAnchorHeartbeat = isAnchorHeartbeat;
    exports.createAnchorFromHeartbeat = createAnchorFromHeartbeat;
    exports.isAnchorObject = isAnchorObject;
    exports.snapAnchorToScreen = snapAnchorToScreen;
    exports.isAnchorObjectDetected = isAnchorObjectDetected;

})(realityEditor.gui.ar.anchors);
