/*
* Created by Ben Reynolds on 10/08/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.gui.ar.groundPlaneAnchors");

(function(exports) {
    let knownAnchorNodes = {};
    let threejsGroups = {};
    let isPositioningMode = false;
    let touchEventCatcher = null;
    let isPointerDown = false;

    // let raycaster;// = new THREE.Raycaster();
    // let mouseVector;// = new THREE.Vector2();
    
    let selectedGroupKey = null;
    let selectedMeshName = null;
    let constrainToX = false;
    let constrainToZ = false;

    let originColor = 0xffffff;
    let xBoxColor = 0xff0000;
    let zBoxColor = 0x0000ff;
    let selectionColor = 0xffff00;
    
    function initService() {
        console.log("init ground plane anchors");
        
        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {
            try {
                update(visibleObjects);
            } catch (e) {
                console.warn(e);
            }
        });

        realityEditor.gui.settings.addToggle('Reposition Ground Anchors', '', 'repositionGroundAnchors',  '../../../svg/move.svg', false, function(newValue) {
            // only draw frame ghosts while in programming mode if we're not in power-save mode
            if (isPositioningMode !== newValue) {
                togglePositioningMode();
            }
        });

        // const THREE = realityEditor.gui.threejsScene.THREE;
        // raycaster = new THREE.Raycaster();
        // mouseVector = new THREE.Vector2();
    }
    
    function update(visibleObjects) {
        for (let objectKey in visibleObjects) {
            let object = realityEditor.getObject(objectKey);
            if (!object) { continue; }
            
            for (let frameKey in object.frames) {
                let frame = realityEditor.getFrame(objectKey, frameKey);
                if (!frame) { continue; }
                updateFrame(frameKey);
            }
        }
    }
    
    function updateFrame(frameKey) {
        if (!knownAnchorNodes[frameKey]) { return; }
        if (!threejsGroups[frameKey]) { return; }
        
        // get world matrix of frame
        let frameNode = realityEditor.sceneGraph.getSceneNodeById(frameKey);
        // get world matrix of ground plane
        let groundPlaneNode = realityEditor.sceneGraph.getSceneNodeById('GROUNDPLANE');
        
        // calculate frame relative to ground plane
        let relativeMatrix = frameNode.getMatrixRelativeTo(groundPlaneNode);
        let anchoredMatrix = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            relativeMatrix[12], 0, relativeMatrix[14], 1
        ];
            
        // set the anchor matrix by taking the x, z position
        knownAnchorNodes[frameKey].setLocalMatrix(anchoredMatrix);

        // we use localMatrix, not world matrix, because mesh is already a child of the ground plane
        realityEditor.gui.threejsScene.setMatrixFromArray(threejsGroups[frameKey].matrix, knownAnchorNodes[frameKey].localMatrix);
    }

    // when we add a sceneNode for a tool, also add one to the groundplane that is associated with it
    function sceneNodeAdded(objectKey, frameKey, _thisFrame, _matrix) {

        // elementName, optionalParent, linkedDataObject, initialLocalMatrix
        let elementName = getElementName(frameKey);
        // let linkedDataObject = thisFrame;
        let parentNode = realityEditor.sceneGraph.getSceneNodeById('GROUNDPLANE');
        let sceneNodeId = realityEditor.sceneGraph.addVisualElement(elementName, parentNode); //, linkedDataObject);
        
        knownAnchorNodes[frameKey] = realityEditor.sceneGraph.getSceneNodeById(sceneNodeId);
        
        // add an element to the three.js scene
        let group = createAnchorGroup(frameKey);
        realityEditor.gui.threejsScene.addToScene(group); // this adds it to the ground plane group by default
        threejsGroups[frameKey] = group;
    }
    
    function createAnchorGroup(frameKey) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const group = new THREE.Group();
        group.name = getElementName(frameKey) + '_group';
        group.matrixAutoUpdate = false; // this is needed to position it directly with matrices
        group.visible = isPositioningMode;
        let originSize = 100, axisSize = 50;
        const originBox = new THREE.Mesh(new THREE.BoxGeometry(originSize, originSize, originSize),new THREE.MeshBasicMaterial({color:0xffffff}));
        originBox.name = getElementName(frameKey) + '_originBox';
        const xBox = new THREE.Mesh(new THREE.BoxGeometry(axisSize, axisSize, axisSize),new THREE.MeshBasicMaterial({color: xBoxColor}));
        xBox.name = getElementName(frameKey) + '_xBox';
        // const yBox = new THREE.Mesh(new THREE.BoxGeometry(axisSize, axisSize, axisSize),new THREE.MeshBasicMaterial({color:0x00ff00}));
        // yBox.name = getElementName(frameKey) + '_yBox';
        const zBox = new THREE.Mesh(new THREE.BoxGeometry(axisSize, axisSize, axisSize),new THREE.MeshBasicMaterial({color: zBoxColor}));
        zBox.name = getElementName(frameKey) + '_zBox';
        xBox.position.x = 150;
        // yBox.position.y = 15;
        zBox.position.z = 150;
        group.add(originBox);
        originBox.add(xBox);
        // originBox.add(yBox);
        originBox.add(zBox);
        return group;
    }
    
    function getElementName(frameKey) {
        return frameKey + '_groundPlaneAnchor';
    }

    /**
     * @param {string} vehicleId
     * @returns {Array.<number>}
     */
    function getMatrix(vehicleId) {
        if (knownAnchorNodes[vehicleId]) {
            return knownAnchorNodes[vehicleId].worldMatrix;
        }
        return null;
    }
    
    function togglePositioningMode() {
        isPositioningMode = !isPositioningMode;
        for (let key in threejsGroups) {
            threejsGroups[key].visible = isPositioningMode;
        }
        if (isPositioningMode) {
            getTouchEventCatcher().style.display = '';
            getTouchEventCatcher().style.pointerEvents = 'auto';
        } else {
            getTouchEventCatcher().style.display = 'none';
            getTouchEventCatcher().style.pointerEvents = 'none';
        }
    }
    
    function getTouchEventCatcher() {
        if (!touchEventCatcher) {
            touchEventCatcher = document.createElement('div');
            touchEventCatcher.style.position = 'absolute';
            touchEventCatcher.style.left = '0';
            touchEventCatcher.style.top = '0';
            touchEventCatcher.style.width = '100vw';
            touchEventCatcher.style.height = '100vh';
            let zIndex = 8000;
            touchEventCatcher.style.zIndex = zIndex + 'px';
            touchEventCatcher.style.transform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + zIndex + ',1)';
            document.body.appendChild(touchEventCatcher);
            
            touchEventCatcher.addEventListener('pointerdown', onPointerDown);
            touchEventCatcher.addEventListener('pointerup', onPointerUp);
            touchEventCatcher.addEventListener('pointercancel', onPointerUp);
            touchEventCatcher.addEventListener('pointermove', onPointerMove);
        }
        return touchEventCatcher;
    }
    
    function onPointerDown(e) {
        e.stopPropagation();
        console.log('catcher pointer down');
        isPointerDown = true;
        
        // hit test threeJsScene to see if we hit any of the threeJsGroups
        // if we are, keep track of it and so we can move it on pointermove

        let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY);
        // console.log(intersects);
        
        // let intersectedMesh = null;
        intersects.forEach(function(intersect) {
            if (selectedGroupKey) { return; }
            
            let meshName = intersect.object.name;
            let matchingKey = Object.keys(threejsGroups).find(function(key) {
                return meshName.includes(key);
            });
            if (!matchingKey) { return; }

            constrainToX = meshName.includes('_xBox');
            constrainToZ = meshName.includes('_zBox');
            
            selectedMeshName = meshName;
            selectedGroupKey = matchingKey;
            
            intersect.object.material.color.setHex(selectionColor);
        });
        
        if (selectedGroupKey) {
            // threejsGroups[selectedGroupKey].children.forEach(function(child) {
            //     child.material.color.setHex(0xffff00);
            // });
            console.log('selected: ' + selectedGroupKey);
        }
    }
    
    function onPointerUp(e) {
        e.stopPropagation();
        console.log('catcher pointer up');
        isPointerDown = false;
        
        // reset mesh color
        if (selectedGroupKey && threejsGroups[selectedGroupKey]) {
            let group = threejsGroups[selectedGroupKey];
            let mesh = group.getObjectByName(selectedMeshName);
            if (mesh) {
                if (constrainToX) {
                    mesh.material.color.setHex(xBoxColor);
                } else if (constrainToZ) {
                    mesh.material.color.setHex(zBoxColor);
                } else {
                    mesh.material.color.setHex(originColor);
                }
            }
        }
        
        // reset any editing state
        selectedGroupKey = null;
        selectedMeshName = null;
        constrainToX = false;
        constrainToZ = false;
    }
    
    function onPointerMove(e) {
        e.stopPropagation();
        if (!isPointerDown) { return; }
        
        // if we touched down on anything, move it
        if (!selectedGroupKey) { return; }

        console.log('catcher pointer move');
    }

    // function touchDecider(eventData) {
    //     //1. sets the mouse position with a coordinate system where the center
    //     //   of the screen is the origin
    //     mouseVector.x = ( eventData.x / window.innerWidth ) * 2 - 1;
    //     mouseVector.y = - ( eventData.y / window.innerHeight ) * 2 + 1;
    //
    //     //2. set the picking ray from the camera position and mouse coordinates
    //     raycaster.setFromCamera( mouseVector, camera );
    //
    //     //3. compute intersections
    //     var intersects = raycaster.intersectObjects( scene.children, true );
    //
    //     return intersects.length > 0;
    // }
    
    exports.initService = initService;
    exports.getMatrix = getMatrix;
    exports.sceneNodeAdded = sceneNodeAdded;
    exports.togglePositioningMode = togglePositioningMode;
}(realityEditor.gui.ar.groundPlaneAnchors));
