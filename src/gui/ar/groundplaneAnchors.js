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
    let mouseCursorColor = 0xff00ff;
    
    let initialAnchorPosition = null;
    
    let mouseCursorMesh = null;
    var planeZ;
    
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
    
    function getMouseCursorMesh() {
        if (!mouseCursorMesh) {
            const THREE = realityEditor.gui.threejsScene.THREE;
            let size = 100;
            mouseCursorMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size),new THREE.MeshBasicMaterial({color: mouseCursorColor}));
            mouseCursorMesh.name = 'mouseCursorMesh';
            // mouseCursorMesh.matrixAutoUpdate = false; // this is needed to position it directly with matrices
            mouseCursorMesh.visible = isPositioningMode;
            realityEditor.gui.threejsScene.addToScene(mouseCursorMesh); // this adds it to the ground plane group by default
        }
        return mouseCursorMesh;
    }
    
    function createAnchorGroup(frameKey) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const group = new THREE.Group();
        group.name = getElementName(frameKey) + '_group';
        group.matrixAutoUpdate = false; // this is needed to position it directly with matrices
        group.visible = isPositioningMode;
        let originSize = 100, axisSize = 50;
        const originBox = new THREE.Mesh(new THREE.BoxGeometry(originSize, originSize, originSize),new THREE.MeshBasicMaterial({color: originColor}));
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
            // return knownAnchorNodes[vehicleId].worldMatrix;
            return realityEditor.sceneGraph.getModelViewMatrix(knownAnchorNodes[vehicleId].id);
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
            
            initialAnchorPosition = getPositionXZ(threejsGroups[selectedGroupKey]);
        });
        
        if (selectedGroupKey) {
            // threejsGroups[selectedGroupKey].children.forEach(function(child) {
            //     child.material.color.setHex(0xffff00);
            // });
            console.log('selected: ' + selectedGroupKey);
        }
    }
    
    function getPositionXZ(threeJsObject) {
        if (!threeJsObject || typeof threeJsObject.matrix === 'undefined') { return null; }
        return {
            x: threeJsObject.matrix.elements[12],
            z: threeJsObject.matrix.elements[14]
        };
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
            
            // move tool to correct position
            let oldAnchorLocalPosition = getPositionXZ(group);
            let newAnchorLocalPosition = getPositionXZ(getMouseCursorMesh());
            
            let dx = newAnchorLocalPosition.x - oldAnchorLocalPosition.x;
            let dz = newAnchorLocalPosition.z - oldAnchorLocalPosition.z;
            
            let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(selectedGroupKey);
            let localMatrix = realityEditor.gui.ar.utilities.copyMatrix(frameSceneNode.localMatrix);
            localMatrix[12] += dx;
            localMatrix[14] += dz;
            frameSceneNode.setLocalMatrix(localMatrix);
        }
        
        // reset any editing state
        selectedGroupKey = null;
        selectedMeshName = null;
        constrainToX = false;
        constrainToZ = false;
        
        getMouseCursorMesh().visible = false;
    }
    
    function getPlaneZ() {
        const THREE = realityEditor.gui.threejsScene.THREE;
        if (!planeZ) {
            planeZ = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
        }
        let groundPlaneModelView = realityEditor.sceneGraph.getGroundPlaneModelViewMatrix();
        if (groundPlaneModelView) {
            planeZ.constant = -1000; //groundPlaneModelView[13];
        }
        return planeZ;
    }
    
    function onPointerMove(e) {
        e.stopPropagation();
        if (!isPointerDown) { return; }
        
        // if we touched down on anything...
        // move getSceneNodeById(frameKey).localMatrix so that the anchorNode.worldMatrix will line up with mouse position

        if (!selectedGroupKey) { return; }
        let thisGroup = threejsGroups[selectedGroupKey];
        let thisAnchorNode = knownAnchorNodes[selectedGroupKey];
        
        if (!thisGroup || !thisAnchorNode) { return; }
        
        let mesh = getMouseCursorMesh();
        // console.log(mesh);
        
        let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY);
        // console.log(intersects);
        
        let areaTargetIntersect = null;
        intersects.forEach(function(intersect) {
            if (areaTargetIntersect) { return; }
            if (intersect.object.name === 'mesh_0') {
                areaTargetIntersect = intersect;
            }
            
            // console.log(intersect.object.name);
            // console.log('checking intersect');
            // console.log(intersect);
            // let obj = JSON.parse(JSON.stringify(intersect.object));
            // while (obj && obj.name) {
            //     if ()
            //     obj = obj.parent;
            // }
            // let meshName = intersect.object.name;
            // let matchingKey = Object.keys(threejsGroups).find(function(key) {
            //     return meshName.includes(key);
            // });
            // if (!matchingKey) { return; }
        });
        
        if (!areaTargetIntersect) { return; }
        
        // let planeIntersect = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY, getPlaneZ());
        // console.log('planeIntersect', planeIntersect);
        //
        // let worldIntersectionPoint = areaTargetIntersect.object.localToWorld(areaTargetIntersect.point);
        // console.log('pt', worldIntersectionPoint);
        // let groundPlaneVisualizer = realityEditor.gui.threejsScene.getObjectByName('groundPlaneVisualizer');
        // if (!groundPlaneVisualizer) { return; }
        // let groundPlaneIntersect = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY, groundPlaneVisualizer);
        // console.log('groundPlaneIntersect', groundPlaneIntersect);
        //
        // let groundPlanePosition = groundPlaneVisualizer.worldToLocal(worldIntersectionPoint);
        // console.log(groundPlanePosition);

        // this is the best one
        // let anchorStartPosition = thisGroup.localToWorld(new realityEditor.gui.threejsScene.THREE.Vector3(0,0,0));

        let result = realityEditor.gui.threejsScene.getGroundPlaneRaycast(e.clientX, e.clientY, areaTargetIntersect.distance);
        // console.log('result', result);
        
        // let difference = result.sub(anchorStartPosition);

        let relativePosition = thisGroup.worldToLocal(result); //thisGroup.worldToLocal(result);
        // console.log(relativePosition);
        
        let anchorLocalPosition = getPositionXZ(thisGroup);

        let newX = constrainToZ ? anchorLocalPosition.x : relativePosition.x + anchorLocalPosition.x;
        let newZ = constrainToX ? anchorLocalPosition.z : relativePosition.z + anchorLocalPosition.z;

        mesh.position.set(newX, 0, newZ);
        mesh.visible = true;

        // var planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        // var mv = new THREE.Vector3(
        //     (clientX / window.innerWidth) * 2 - 1,
        //     -(clientY / window.innerHeight) * 2 + 1,
        //     0.5 );
        // var raycaster = projector.pickingRay(mv, camera);
        // var pos = raycaster.ray.intersectPlane(planeZ);
        // console.log("x: " + pos.x + ", y: " + pos.y);

        // // get world matrix of frame
        // let frameNode = realityEditor.sceneGraph.getSceneNodeById(selectedGroupKey)
        //
        // // get world matrix of ground plane
        // let groundPlaneNode = realityEditor.sceneGraph.getSceneNodeById('GROUNDPLANE');
        //
        // // calculate frame relative to ground plane
        // let relativeMatrix = frameNode.getMatrixRelativeTo(groundPlaneNode);
        // let anchoredMatrix = [
        //     1, 0, 0, 0,
        //     0, 1, 0, 0,
        //     0, 0, 1, 0,
        //     relativeMatrix[12], 0, relativeMatrix[14], 1
        // ];
        //
        // // set the anchor matrix by taking the x, z position
        // knownAnchorNodes[selectedGroupKey].setLocalMatrix(anchoredMatrix);
        //
        // // we use localMatrix, not world matrix, because mesh is already a child of the ground plane
        // realityEditor.gui.threejsScene.setMatrixFromArray(threejsGroups[selectedGroupKey].matrix, knownAnchorNodes[selectedGroupKey].localMatrix);
    }
    
    exports.initService = initService;
    exports.getMatrix = getMatrix;
    exports.sceneNodeAdded = sceneNodeAdded;
    exports.togglePositioningMode = togglePositioningMode;
}(realityEditor.gui.ar.groundPlaneAnchors));
