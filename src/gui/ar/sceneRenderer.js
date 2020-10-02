/*
* Created by Ben Reynolds on 09/22/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/**
 * This is the new rendering API for objects, tools, and nodes
 */
createNameSpace("realityEditor.gui.ar.sceneRenderer");

(function(exports) {
    let visibleObjectsCopy = {};
    let previousVisibleObjects = [];
    const elementCache = {};
    
    let addedObjects = {};
    let removedObjects = {};

    /**
     * Array of registered callbacks for the update function
     * @type {Array}
     */
    let updateListeners = [];
    let visibleObjectModifiers = [];
    
    function addUpdateListener(callback) {
        updateListeners.push(callback);
    }
    
    function addVisibleObjectModifier(callback) {
        visibleObjectModifiers.push(visibleObjectModifiers);
    }
    
    function update_pseudocode(visibleObjects) {
        // miscellaneous things to happen each update, possibly changing visibleObjects before rendering
        pre_update(visibleObjects);
        
        // update the scene graph
        realityEditor.gui.ar.sceneGraph.calculateFinalMatrices(Object.keys(visibleObjects));

        // add or remove DOM elements if visibleObjects changed since last time
        let diff = realityEditor.device.utilities.diffArrays(previousVisibleObjects, Object.keys(visibleObjects));
        if (!diff.isEqual) {
            diff.additions.forEach(function(objectKey) {
                let object = realityEditor.getObject(objectKey);
                if (object) {
                    // Object.keys(object.frames).forEach(function(frameKey) {
                    //     addElement(objectKey, frameKey);
                    // });
                    addedObjects[objectKey] = true;
                }
            });
            diff.subtractions.forEach(function(objectKey) {
                let object = realityEditor.getObject(objectKey);
                if (object) {
                    // Object.keys(object.frames).forEach(function(frameKey) {
                    //     removeElement(objectKey, frameKey);
                    // });
                    removedObjects[objectKey] = true;
                }
            });
        }
        
        // this will recursively update each frame in the object
        // and each node in each frame
        forEachVisibleObject(visibleObjects, function(objectKey, object) {
            update_object(objectKey, object);
        });
        
        forEachNonVisibleObject(visibleObjects, function(objectKey, object) {
            // if it was previously visible, do a one-time update
            if (previousVisibleObjects.includes(objectKey)) {
                // update object visibility state
                // decide whether to preserve any frames as unconstrained -> transition frame
                // if not, and currently dragging, drop it / revert it to where it started, reset editing state
            } else {
                // if it wasn't previously visible, kill if hidden for enough time
            }
        });
        
        post_update(visibleObjects);
    }
    
    function pre_update(visibleObjects) {
        // update timer to drive system-wide animations this frame
        realityEditor.gui.ar.utilities.timeSynchronizer(timeCorrection);

        // allow other modules to modify the set of objects currently seen (except while frozen)
        if (!globalStates.freezeButtonState) {
            visibleObjectModifiers.forEach(function(callback) {
                callback(visibleObjects);
            });
        }

        // erases anything on the background canvas
        if (globalCanvas.hasContent === true) {
            globalCanvas.context.clearRect(0, 0, globalCanvas.canvas.width, globalCanvas.canvas.height);
            globalCanvas.hasContent = false;
        }

        // make sure that all Spatial Questions are empty
        realityEditor.gui.spatial.clearSpatialList();
        
        // TODO: if object contains sticky frame and not in visible objects, add it to visible objects
        
        // TODO: add low-frequency updates
        
        // TODO: possibly add pulsing haptic feedback when looking at object with no visible frames
    }
    
    function post_update(visibleObjects) {
        // draw all links and lines
        if (globalStates.guiState === "logic") {
            realityEditor.gui.crafting.redrawDataCrafting();  // todo maybe animation frame
        }
        
        // render transition frame
        // provide haptic feedback
        // trigger closestObject and update listeners callbacks

        // set/reset state 
        previousVisibleObjects = Object.keys(visibleObjects);
        visibleObjectsCopy = visibleObjects;
        addedObjects = {};
        removedObjects = {};
    }

    function update_object(objectKey, object) {
        // possibly ignore world objects before localized or process differently?
        
        // for non-world objects, collectSpatialList
        if (!object.isWorldObject) {
            // TODO: use scene graph for these calculations
            // realityEditor.gui.spatial.collectSpatialList(this.correctedCameraMatrix, this.modelViewMatrices[objectKey], this.activeObjectMatrix, objectKey);
        }
        
        // update each frame in this object
        Object.keys(object.frames).forEach(function(frameKey) {
            let frame = realityEditor.getFrame(objectKey, frameKey);
            if (frame) {
                update_frame(objectKey, frameKey, object, frame);
            }
        });
    }
    
    function update_frame(objectKey, frameKey, object, frame) {
        if (frame.visualization !== 'ar') { return; } // don't render "screen" frames
        
        // TODO: possibly hide sticky fullscreen frames here if they aren't fullscreen anymore
        
        let didJustAdd = false;
        // addElement if it needs it
        if (!globalDOMCache[frameKey]) {
            let frameUrl = "http://" + object.ip + ":" + realityEditor.network.getPortByIp(object.ip) + "/obj/" + object.name + "/frames/" + frame.name + "/";
            addElement(frameUrl, objectKey, frameKey, null, 'ui', frame);
            didJustAdd = true;
        }

        let container = globalDOMCache["object" + frameKey];
        let iFrame = globalDOMCache["iframe" + frameKey];
        let overlay = globalDOMCache[frameKey];
        
        // filter out frame if it meets certain criteria (visualization=screen)
        // update CSS classes based on ignoreAllTouches API/property?
        
        // draw frame (if in ui mode or semi-transparent if in node mode)
        // ... make DOM elements visible if needed
        
        if (didJustAdd) {
            container.classList.remove('hiddenFrameContainer');
            container.classList.add('visibleFrameContainer');
            iFrame.classList.remove('hiddenFrame');
            iFrame.classList.add('visibleFrame');
            overlay.style.visibility = 'visible';
        }
        
        // TODO: update CSS when guiState changes

        // fullscreen frames have identity matrix
        if (!frame.fullScreen) {
            let matrix = realityEditor.gui.ar.sceneGraph.getCSSMatrix(frameKey);
            globalDOMCache['object' + frameKey].style.transform = 'matrix3d(' + matrix.toString() + ')';
        }

        if (frame.sendMatrix) {
            // console.log('send matrix');
            let modelViewMatrix = realityEditor.gui.ar.sceneGraph.getRelativeToCamera(frameKey);
            // let modelViewMatrix = realityEditor.gui.ar.sceneGraph.getCSSMatrix(frameKey);
            globalDOMCache['iframe' + frameKey].contentWindow.postMessage(JSON.stringify({
                modelViewMatrix: modelViewMatrix
            }), '*');
        }
        
        // update opacity based on distance
        updateDistanceFading(frameKey, frame);


        var activePocketFrameWaiting = frame === pocketFrame.vehicle && pocketFrame.waitingToRender;

        // set initial position of frames and nodes placed in from pocket
        // 1. drop directly onto marker plane if in freeze state (or quick-tapped the frame)
        // 2. otherwise float in unconstrained slightly in front of the editor camera
        // 3. animate so it looks like it is being pushed from pocket
        // if (activePocketNodeWaiting && typeof activeVehicle.mostRecentFinalMatrix !== 'undefined') {
        //     console.log('just added pocket node');
        //     this.addPocketVehicle(pocketNode, matrix);
        // }
        if (activePocketFrameWaiting) {
            console.log('just added pocket frame');
            // realityEditor.gui.ar.draw.addPocketVehicle(pocketFrame, {});
            addPocketVehicle(pocketFrame);
        }
        
        // lots of random adjustments for initial placement, pocket
        if (frame.isPendingInitialPlacement) {
            console.log('place frame from pocket');
            // let frameSceneNode = realityEditor.gui.ar.sceneGraph.getSceneNodeById(frameKey);
            // let cameraSceneNode = realityEditor.gui.ar.sceneGraph.getSceneNodeById('CAMERA');
            // let requiredWorldMatrix = cameraSceneNode.worldMatrix;
            // let requiredLocalMatrix = frameSceneNode.calculateLocalMatrix(requiredWorldMatrix);
            // frameSceneNode.setLocalMatrix(requiredLocalMatrix);
            delete frame.isPendingInitialPlacement;
        }
        
        // (scenegraph needs to take ground plane into account so we dont change here)
        // include animation matrix? possibly? or actually animate position in scene graph?
        
        // calculate isNowOutsideViewport from canUnload to unload/reload iframes
        
        // update CSS classes for stickyFullscreen edge cases?
        
        // check if pulled into unconstrained?
        
        // compile all requested matrices for tool API subscriptions and post into iframe
        
        // update each node in this frame
        Object.keys(frame.nodes).forEach(function(nodeKey) {
            let node = realityEditor.getNode(objectKey, frameKey, nodeKey);
            if (node) {
                update_node(objectKey, frameKey, object, frame);
            }
        });
    }
    
    function updateDistanceFading(activeKey, activeVehicle) {
        // can't change while frozen so don't recalculate
        if (realityEditor.device.environment.supportsDistanceFading() &&
            (!globalStates.freezeButtonState || realityEditor.device.environment.ignoresFreezeButton())) {
            // fade out frames and nodes when they move beyond a certain distance
            var distance = activeVehicle.screenZ;
            var distanceScale = realityEditor.gui.ar.getDistanceScale(activeVehicle);
            // multiply the default min distance by the amount this frame distance has been scaled up
            var distanceThreshold = (distanceScale * realityEditor.device.distanceScaling.getDefaultDistance());
            var isDistantVehicle = distance > distanceThreshold;
            var isAlmostDistantVehicle = distance > (distanceThreshold * 0.8);

            // hide visuals if not already hidden
            if (isDistantVehicle && activeVehicle.screenOpacity !== 0) {
                globalDOMCache["object" + activeKey].classList.add('distantFrame');
                activeVehicle.screenOpacity = 0;

            } else if (!isDistantVehicle) {

                // show visuals if not already shown
                if (activeVehicle.screenOpacity === 0) {
                    globalDOMCache["object" + activeKey].classList.remove('distantFrame'); // show again, but fade out opacity if within a narrow threshold
                }

                if (isAlmostDistantVehicle) {
                    // full opacity if within 80% of the threshold. fades out linearly to zero opacity at 100% of the threshold
                    var opacity = 1.0 - ((distance - 0.8 * distanceThreshold) / (0.2 * distanceThreshold));
                    globalDOMCache["object" + activeKey].style.opacity = opacity;
                    activeVehicle.screenOpacity = opacity;
                } else {
                    // remove the CSS property so it doesn't override other classes added to this frame/node
                    globalDOMCache["object" + activeKey].style.opacity = '';
                    activeVehicle.screenOpacity = 1;
                }
            }
        }
    }

    function update_node(objectKey, frameKey, nodeKey, object, frame, node) {
        // draw node (same subroutine as update_frame)
        // except filter out nodes that are in hiddenNodeTypes instead of visualization
        
        // animate logic node contents based on touch position?
    }

    function forEachVisibleObject(visibleObjects, callback) {
        Object.keys(visibleObjects).forEach(function(objectKey) {
            let object = realityEditor.getObject(objectKey);
            if (object) {
                callback(objectKey, object);
            }
        });
    }

    function forEachNonVisibleObject(visibleObjects, callback) {
        Object.keys(objects).forEach(function(objectKey) {
            if (typeof visibleObjects[objectKey] !== 'undefined') { return; }
            let object = realityEditor.getObject(objectKey);
            if (object) {
                callback(objectKey, object);
            }
        })
    }
    
    function addPocketVehicle(pocketContainer) {
        // drop frames in from pocket, floating in front of screen in unconstrained mode, aligned with the touch position

        // immediately start placing the pocket frame in unconstrained mode
        realityEditor.device.editingState.unconstrained = true;

        var activeFrameKey = pocketContainer.vehicle.frameId || pocketContainer.vehicle.uuid;

        // set the matrix to be in front of the camera
        let frameSceneNode = realityEditor.gui.ar.sceneGraph.getSceneNodeById(activeFrameKey);
        let cameraSceneNode = realityEditor.gui.ar.sceneGraph.getSceneNodeById('CAMERA');
        let requiredWorldMatrix = cameraSceneNode.worldMatrix;
        let requiredLocalMatrix = frameSceneNode.calculateLocalMatrix(requiredWorldMatrix);
        frameSceneNode.setLocalMatrix(requiredLocalMatrix);
        
        // if (pocketContainer.type === 'ui') {
        //     // for frames, regardless of whether the tap is still down, set the matrix to be in front of the camera
        //     realityEditor.gui.ar.positioning.moveFrameToCamera(pocketContainer.vehicle.objectId, activeFrameKey);
        //
        //     if (typeof pocketContainer.vehicle.startPositionOffset !== 'undefined') {
        //         pocketContainer.vehicle.ar.x += pocketContainer.vehicle.startPositionOffset.x;
        //         pocketContainer.vehicle.ar.y += pocketContainer.vehicle.startPositionOffset.y;
        //         delete pocketContainer.vehicle['startPositionOffset'];
        //     }
        // } else {
        //     // for nodes, which are dragged in from side button, just set touch offset to center of element and the rest takes care of itself
        //     realityEditor.device.editingState.touchOffset = {
        //         x: parseFloat(pocketContainer.vehicle.frameSizeX)/2,
        //         y: parseFloat(pocketContainer.vehicle.frameSizeY)/2
        //     };
        // }

        // only start editing (and animate) it if you didn't do a quick tap that already released by the time it loads
        if (pocketContainer.type !== 'ui' || realityEditor.device.currentScreenTouches.map(function(elt){return elt.targetId;}).indexOf("pocket-element") > -1) {

            if (realityEditor.getObject(pocketContainer.vehicle.objectId).isWorldObject) {
                // // Several steps to translate it exactly to be centered on the touch when it gets added
                // // 1. calculate where the center of the frame would naturally end up on the screen, given the moveFrameToCamera matrix
                // let defaultScreenCenter = realityEditor.gui.ar.positioning.getScreenPosition(pocketContainer.vehicle.objectId, activeFrameKey, true, false, false, false, false).center;
                // let touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                // // 2. calculate the correct touch offset as if you placed it at the default position (doesn't actually set x and y)
                // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(pocketContainer.vehicle, defaultScreenCenter.x, defaultScreenCenter.y, true);
                // // 3. actually move it to the touch position (sets x and y), now that it knows the relative offset from the default
                // realityEditor.gui.ar.positioning.moveVehicleToScreenCoordinate(pocketContainer.vehicle, touchPosition.x, touchPosition.y, true);
                // // 4. add a flag so that we can finalize its position the next time drawTransformed is called
                pocketContainer.vehicle.isPendingInitialPlacement = true;
            }

            var activeNodeKey = pocketContainer.vehicle.uuid === activeFrameKey ? null : pocketContainer.vehicle.uuid;

            realityEditor.device.beginTouchEditing(pocketContainer.vehicle.objectId, activeFrameKey, activeNodeKey);
            // animate it as flowing out of the pocket
            // this.startPocketDropAnimation(250, 0.7, 1.0);

            // these lines assign the frame a preset matrix hovering slightly in front of editor
            // matrix.copyStillFromMatrixSwitch = false;
            // pocketContainer.vehicle.begin = realityEditor.gui.ar.utilities.copyMatrix(pocketBegin);
        }

        // clear some flags so it gets rendered after this occurs
        pocketContainer.positionOnLoad = null;
        pocketContainer.waitingToRender = false;

        realityEditor.network.postVehiclePosition(pocketContainer.vehicle);
    }

    function draw(visibleObjects) {

        // add or remove DOM elements if visibleObjects changed since last time
        let diff = realityEditor.device.utilities.diffArrays(previousVisibleObjects, Object.keys(visibleObjects));
        if (!diff.isEqual) {
            diff.additions.forEach(function(objectKey) {
                let object = realityEditor.getObject(objectKey);
                if (object) {
                    Object.keys(object.frames).forEach(function(frameKey) {
                        addElement(objectKey, frameKey);
                    });
                }
            });
            diff.subtractions.forEach(function(objectKey) {
                let object = realityEditor.getObject(objectKey);
                if (object) {
                    Object.keys(object.frames).forEach(function(frameKey) {
                        removeElement(objectKey, frameKey);
                    });
                }
            });
        }

        previousVisibleObjects = Object.keys(visibleObjects);

        // calculate final positions
        realityEditor.gui.ar.sceneGraph.calculateFinalMatrices(Object.keys(visibleObjects));

        // render each element at its calculated CSS matrix

        Object.keys(visibleObjects).forEach(function(objectKey) {
            let object = realityEditor.getObject(objectKey);
            if (object) {
                Object.keys(object.frames).forEach(function(frameKey) {
                    let frame = realityEditor.getFrame(objectKey, frameKey);

                    // fullscreen frames have identity matrix
                    if (!frame.fullScreen) {
                        let matrix = realityEditor.gui.ar.sceneGraph.getCSSMatrix(frameKey);
                        elementCache[frameKey].style.transform = 'matrix3d(' + matrix.toString() + ')';
                    }

                    if (frame.sendMatrix) {
                        // console.log('send matrix');
                        let modelViewMatrix = realityEditor.gui.ar.sceneGraph.getRelativeToCamera(frameKey);
                        // let modelViewMatrix = realityEditor.gui.ar.sceneGraph.getCSSMatrix(frameKey);
                        globalDOMCache['iframe' + frameKey].contentWindow.postMessage(JSON.stringify({
                            modelViewMatrix: modelViewMatrix
                        }), '*');
                    }

                });
            }
        });
    }

    function addElement(thisUrl, objectKey, frameKey, nodeKey, activeType, activeVehicle) {
        let activeKey = nodeKey ? nodeKey : frameKey;
        let isFrameElement = activeKey === frameKey;
        
        // create the DOM element, size it correctly, give it some default contents, cache it by objectKey
        // Create DOM elements for everything associated with this frame/node
        // let thisFrame = realityEditor.getFrame(objectKey, frameKey);
        // let iframeSrc = thisFrame.src || 'content/' + objectKey + '/index.html';

        // assign the element some default properties if they don't exist
        let thisWidth = activeVehicle.frameSizeX || activeVehicle.width || 220;
        let thisHeight = activeVehicle.frameSizeY || activeVehicle.height || 220;

        // determine if the frame should be loaded locally or from the server (by default thisUrl points to server)
        if (isFrameElement && activeVehicle.location === 'global') {
            thisUrl = realityEditor.network.availableFrames.getFrameSrc(objectKey, activeVehicle.src);
            console.log('thisUrl = ' + thisUrl);
        }

        // Create DOM elements for everything associated with this frame/node
        var domElements = createSubElements(thisUrl, objectKey, frameKey, null, thisWidth, thisHeight);
        var addContainer = domElements.addContainer;
        var addIframe = domElements.addIframe;  
        let addOverlay = domElements.addOverlay;
        // don't add addSVG - not used anyomre

        addOverlay.objectId = objectKey;
        addOverlay.frameId = frameKey;
        addOverlay.nodeId = nodeKey;
        // addOverlay.type = activeType;

        // append all the created elements to the DOM in the correct order...
        document.getElementById("GUI").appendChild(addContainer);
        addContainer.appendChild(addIframe);
        addContainer.appendChild(addOverlay);

        // cache references to these elements to more efficiently retrieve them in the future
        elementCache[frameKey] = addContainer;
        globalDOMCache[addContainer.id] = addContainer;
        globalDOMCache[addIframe.id] = addIframe;
        globalDOMCache[addOverlay.id] = addOverlay;

        // wrapping div in corners can only be done after it has been added
        var padding = 24;
        realityEditor.gui.moveabilityCorners.wrapDivWithCorners(addOverlay, padding, false, {width: thisWidth + padding/2 + 'px', height: thisHeight + padding/2 + 'px', visibility: 'hidden'}, null, 4, 30);

        realityEditor.device.addTouchListenersForElement(addOverlay, activeVehicle);

        console.log('added element for ' + frameKey);
    }

    function removeElement(objectKey, frameKey) {
        // get the right DOM element by object key and remove it
        let element = elementCache[frameKey];
        if (element) {
            element.parentElement.removeChild(element);
            console.log('removed element for ' + frameKey);
        }
    }

    /**
     * Instantiates the many different DOM elements that make up a frame or node.
     *      addContainer - holds all the different pieces of this element
     *      addIframe - loads in the content for this frame, e.g. a graph or three.js scene, or a node graphic
     *      addOverlay - an invisible overlay that catches touch events and passes into the iframe if needed
     *      addSVG - a visual feedback image that displays when you are dragging the element around
     * @param {string} iframeSrc
     * @param {string} objectKey
     * @param {string} frameKey
     * @param {string} nodeKey
     * @param {number} frameSizeX
     * @param {number} frameSizeY
     * @return {{addContainer: HTMLDivElement, addIframe: HTMLIFrameElement}}
     */
    function createSubElements(iframeSrc, objectKey, frameKey, nodeKey, frameSizeX, frameSizeY) {

        var activeKey = nodeKey ? nodeKey : frameKey;
        let activeVehicle = nodeKey ? realityEditor.getNode(objectKey, frameKey, nodeKey) : realityEditor.getFrame(objectKey, frameKey);

        var addContainer = document.createElement('div');
        addContainer.id = "object" + activeKey;
        addContainer.className = "main";
        addContainer.style.width = globalStates.height + "px";
        addContainer.style.height = globalStates.width + "px";
        let hiddenVehicleClass = nodeKey ? 'hiddenNodeContainer' : 'hiddenFrameContainer';
        addContainer.classList.add(hiddenVehicleClass);
        addContainer.style.border = 0;
        addContainer.classList.add('ignorePointerEvents'); // don't let invisible background from container intercept touches

        var addIframe = document.createElement('iframe');
        addIframe.id = "iframe" + activeKey;
        addIframe.className = "main";
        addIframe.frameBorder = 0;
        addIframe.style.width = frameSizeX + "px";
        addIframe.style.height = frameSizeY + "px";
        addIframe.style.left = ((globalStates.height - frameSizeX) / 2) + "px";
        addIframe.style.top = ((globalStates.width - frameSizeY) / 2) + "px";
        addIframe.classList.add('hiddenFrame');
        addIframe.src = iframeSrc;
        addIframe.setAttribute("data-frame-key", frameKey);
        addIframe.setAttribute("data-object-key", objectKey);
        addIframe.setAttribute("data-node-key", nodeKey);
        addIframe.setAttribute("onload", 'realityEditor.network.onElementLoad("' + objectKey + '","' + frameKey + '","' + nodeKey + '")');
        addIframe.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts");
        addIframe.classList.add('usePointerEvents'); // override parent (addContainer) pointerEvents value

        // TODO: try to load elements with an XHR request so they don't block the rendering loop

        var addOverlay = document.createElement('div');
        addOverlay.id = activeKey;
        addOverlay.className = (globalStates.editingMode && activeVehicle.developer) ? "mainEditing" : "mainProgram";
        addOverlay.frameBorder = 0;
        addOverlay.style.width = frameSizeX + "px";
        addOverlay.style.height = frameSizeY + "px";
        addOverlay.style.left = ((globalStates.height - activeVehicle.frameSizeX) / 2) + "px";
        addOverlay.style.top = ((globalStates.width - activeVehicle.frameSizeY) / 2) + "px";
        addOverlay.style.visibility = "hidden";
        addOverlay.style.zIndex = "3";
        if (activeVehicle.developer) {
            addOverlay.style["touch-action"] = "none";
        }
        addOverlay.classList.add('usePointerEvents'); // override parent (addContainer) pointerEvents value

        return {
            addContainer: addContainer,
            addIframe: addIframe,
            addOverlay: addOverlay
        }
    }
    
    function getVisibleObjects() {
        return realityEditor.gui.ar.draw.visibleObjects; //visibleObjectsCopy;
    }
    
    exports.draw = draw;
    
    exports.update_pseudocode = update_pseudocode;
    exports.addUpdateListener = addUpdateListener;
    exports.addVisibleObjectModifier = addVisibleObjectModifier;
    exports.getVisibleObjects = getVisibleObjects;
})(realityEditor.gui.ar.sceneRenderer);
