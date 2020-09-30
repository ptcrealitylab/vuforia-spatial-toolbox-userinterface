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
    let previousVisibleObjects = [];
    const elementCache = {};
    
    function update_pseudocode(visibleObjects) {
        // miscellaneous things to happen each update, possibly changing visibleObjects before rendering
        pre_update(visibleObjects);
        
        // update the scene graph
        realityEditor.gui.ar.sceneGraph.calculateFinalMatrices(Object.keys(visibleObjects));

        // this will recursively update each frame in the object
        // and each node in each frame
        forEachVisibleObject(visibleObjects, function(objectKey, object) {
            update_object(objectKey, object);
        });
        
        forEachNonVisibleObject(visibleObjects, function(objectKey, object) {
            // if it was previously visible, do a one-time update
            
            // if it wasn't previously visible, kill if hidden for enough time
        });
        
        post_update(visibleObjects);
    }
    
    function pre_update(visibleObjects) {
        // update timer to drive system-wide animations this frame
        realityEditor.gui.ar.utilities.timeSynchronizer(timeCorrection);

        // allow other modules to modify the set of objects currently seen (except while frozen)
        if (!globalStates.freezeButtonState) {
            this.visibleObjectModifiers.forEach(function(callback) {
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
    }

    function update_object(objectKey, object) {
        // possibly ignore world objects before localized or process differently?
        
        // for non-world objects, collectSpatialList
        
        // update each frame in this object
        Object.keys(object.frames).forEach(function(frameKey) {
            let frame = realityEditor.getFrame(objectKey, frameKey);
            if (frame) {
                update_frame(objectKey, frameKey, object, frame);
            }
        });
    }
    
    function update_frame(objectKey, frameKey, object, frame) {
        // filter out frame if it meets certain criteria (visualization=screen)
        // update CSS classes based on ignoreAllTouches API/property?
        
        // draw frame (if in ui mode or semi-transparent if in node mode)
        // ... make DOM elements visible if needed
        
        // update opacity based on distance
        
        // lots of random adjustments for initial placement, pocket
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

    function addElement(objectKey, frameKey) {
        // create the DOM element, size it correctly, give it some default contents, cache it by objectKey
        // Create DOM elements for everything associated with this frame/node
        let thisFrame = realityEditor.getFrame(objectKey, frameKey);
        let iframeSrc = thisFrame.src || 'content/' + objectKey + '/index.html';
        var domElements = createSubElements(iframeSrc, objectKey, frameKey, null, thisFrame.width || 300, thisFrame.height || 300);
        var addContainer = domElements.addContainer;
        var addIframe = domElements.addIframe;

        // append all the created elements to the DOM in the correct order...
        document.getElementById("GUI").appendChild(addContainer);
        addContainer.appendChild(addIframe);

        // cache references to these elements to more efficiently retrieve them in the future
        elementCache[frameKey] = addContainer;
        globalDOMCache[addContainer.id] = addContainer;
        globalDOMCache[addIframe.id] = addIframe;

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
     * @param {number} width
     * @param {number} height
     * @return {{addContainer: HTMLDivElement, addIframe: HTMLIFrameElement}}
     */
    function createSubElements(iframeSrc, objectKey, frameKey, nodeKey, width, height) {

        var activeKey = nodeKey ? nodeKey : frameKey;

        var addContainer = document.createElement('div');
        addContainer.id = "object" + activeKey;
        addContainer.className = "main";
        addContainer.style.width = globalStates.height + "px";
        addContainer.style.height = globalStates.width + "px";
        addContainer.style.border = 0;
        addContainer.classList.add('ignorePointerEvents'); // don't let invisible background from container intercept touches

        var addIframe = document.createElement('iframe');
        addIframe.id = "iframe" + activeKey;
        addIframe.className = "main";
        addIframe.frameBorder = 0;
        addIframe.style.width = width + "px";
        addIframe.style.height = height + "px";
        addIframe.style.left = ((globalStates.height - width) / 2) + "px";
        addIframe.style.top = ((globalStates.width - height) / 2) + "px";
        addIframe.classList.add('visibleFrame');
        addIframe.src = iframeSrc;
        addIframe.setAttribute("data-frame-key", frameKey);
        addIframe.setAttribute("data-object-key", objectKey);
        addIframe.setAttribute("data-node-key", nodeKey);
        addIframe.setAttribute("onload", 'realityEditor.network.onElementLoad("' + objectKey + '","' + frameKey + '","' + nodeKey + '")');
        addIframe.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts");
        addIframe.classList.add('usePointerEvents'); // override parent (addContainer) pointerEvents value

        return {
            addContainer: addContainer,
            addIframe: addIframe
        }
    }

    exports.draw = draw;
    
    exports.update_pseudocode = update_pseudocode;
})(realityEditor.gui.ar.sceneRenderer);
