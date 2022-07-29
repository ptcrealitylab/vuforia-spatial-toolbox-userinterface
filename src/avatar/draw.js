createNameSpace("realityEditor.avatar.draw");

(function(exports) {
    const RENDER_DEVICE_CUBE = false; // turn on to show a cube at each of the avatar positions, in addition to the beams
    let avatarMeshes = {};
    let debugUI = null;

    function renderOtherAvatars(avatarTouchStates, avatarNames) {
        try {
            for (const [objectKey, avatarTouchState] of Object.entries(avatarTouchStates)) {
                renderAvatar(objectKey, avatarTouchState, avatarNames[objectKey]);
            }
        } catch (e) {
            console.warn('error rendering other avatars', e);
        }
    }

    // main rendering function – creates a beam, a sphere at the endpoint, and a text label if a name is provided
    function renderAvatar(objectKey, touchState, avatarName) {
        if (!touchState) { return; }

        // if that device isn't touching down, hide its laser beam and ignore the rest
        if (!touchState.isPointerDown) {
            if (avatarMeshes[objectKey]) {
                avatarMeshes[objectKey].pointer.visible = false;
                avatarMeshes[objectKey].beam.visible = false;
                avatarMeshes[objectKey].textLabel.style.display = 'none';
            }
            return;
        }

        const THREE = realityEditor.gui.threejsScene.THREE;
        const color = realityEditor.avatar.utils.getColor(realityEditor.getObject(objectKey)) || '#ffff00';

        // show a three.js cylinder that goes from the device to its destination point, and a text label at the destination
        if (typeof avatarMeshes[objectKey] === 'undefined') {

            let pointerGroup = new THREE.Group();
            let pointerSphere = sphereMesh(color, objectKey + 'pointer', 50);
            pointerGroup.add(pointerSphere);

            let initials = null;
            if (avatarName) {
                initials = realityEditor.avatar.utils.getInitialsFromName(avatarName);
            }

            avatarMeshes[objectKey] = {
                pointer: pointerGroup,
                beam: cylinderMesh(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0), color),
                textLabel: createTextLabel(objectKey, initials)
            }
            if (RENDER_DEVICE_CUBE) {
                avatarMeshes[objectKey].device = boxMesh(color, objectKey + 'device')
                avatarMeshes[objectKey].device.matrixAutoUpdate = false;
                realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].device);
            }
            avatarMeshes[objectKey].beam.name = objectKey + 'beam';
            realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].pointer);
            realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
        }

        // get the real position of the avatar by multiplying the avatar matrix (which is relative to world) by the world origin matrix
        let thatAvatarSceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        let worldMatrixThree = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(worldMatrixThree, worldSceneNode.worldMatrix);
        let avatarObjectMatrixThree = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(avatarObjectMatrixThree, thatAvatarSceneNode.worldMatrix);
        avatarObjectMatrixThree.premultiply(worldMatrixThree);

        // then transform the final avatar position into groundplane coordinates since the threejsScene is relative to groundplane
        let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        let groundPlaneMatrix = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneMatrix, groundPlaneSceneNode.worldMatrix);
        avatarObjectMatrixThree.premultiply(groundPlaneMatrix.invert());

        if (RENDER_DEVICE_CUBE) {
            avatarMeshes[objectKey].device.visible = true;
            avatarMeshes[objectKey].device.matrixAutoUpdate = false
            avatarMeshes[objectKey].device.matrix.copy(avatarObjectMatrixThree);
        }
        avatarMeshes[objectKey].pointer.visible = true;
        avatarMeshes[objectKey].beam.visible = true;

        if (touchState.worldIntersectPoint) {
            // worldIntersectPoint was converted to world coordinates
            // need to convert back to groundPlane coordinates in this system
            let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
            let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();
            let groundPlaneRelativeToWorldToolbox = worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode);
            let groundPlaneRelativeToWorldThree = new realityEditor.gui.threejsScene.THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneRelativeToWorldThree, groundPlaneRelativeToWorldToolbox);
            let convertedEndPosition = new THREE.Vector3(touchState.worldIntersectPoint.x, touchState.worldIntersectPoint.y, touchState.worldIntersectPoint.z);
            convertedEndPosition.applyMatrix4(groundPlaneRelativeToWorldThree);
            avatarMeshes[objectKey].pointer.position.set(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);

            // get the 2D screen coordinates of the pointer, and render a text bubble centered on it with the name of the sender
            let pointerWorldPosition = new THREE.Vector3();
            avatarMeshes[objectKey].pointer.getWorldPosition(pointerWorldPosition);
            let screenCoords = realityEditor.gui.threejsScene.getScreenXY(pointerWorldPosition);
            if (avatarName) {
                avatarMeshes[objectKey].textLabel.style.display = 'inline';
            }
            // calculate distance from convertedEndPosition to camera. scale a bit based on this and adjust
            let camPos = realityEditor.sceneGraph.getWorldPosition('CAMERA');
            let delta = {
                x: camPos.x - convertedEndPosition.x,
                y: camPos.y - convertedEndPosition.y,
                z: camPos.z - convertedEndPosition.z
            };
            let distanceToCamera = Math.max(0.001, Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z));
            let scale = Math.max(0.5, Math.min(2, 2000 / distanceToCamera));
            avatarMeshes[objectKey].textLabel.style.transform = 'translateX(-50%) translateY(-50%) translateZ(3000px) scale(' + scale + ')';
            avatarMeshes[objectKey].textLabel.style.left = screenCoords.x + 'px';
            avatarMeshes[objectKey].textLabel.style.top = screenCoords.y + 'px';

            let startPosition = new THREE.Vector3(avatarObjectMatrixThree.elements[12], avatarObjectMatrixThree.elements[13], avatarObjectMatrixThree.elements[14]);
            let endPosition = new THREE.Vector3(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);
            avatarMeshes[objectKey].beam = updateCylinderMesh(avatarMeshes[objectKey].beam, startPosition, endPosition, color);
            avatarMeshes[objectKey].beam.name = objectKey + 'beam';
            realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
        }
    }

    // helper to create a box mesh
    function boxMesh(color, name) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const geo = new THREE.BoxGeometry(100, 100, 100);
        const mat = new THREE.MeshBasicMaterial({color: color});
        const box = new THREE.Mesh(geo, mat);
        box.name = name;
        return box;
    }

    // helper to create a sphere mesh
    function sphereMesh(color, name, radius) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const geo = new THREE.SphereGeometry((radius || 50), 8, 6, 0, 2 * Math.PI, 0, Math.PI);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const sphere = new THREE.Mesh(geo, mat);
        sphere.name = name;
        return sphere;
    }

    // helper to create a thin laser beam cylinder from start to end
    function cylinderMesh(startPoint, endPoint, color) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        let length = 0;
        if (startPoint && endPoint) {
            let direction = new THREE.Vector3().subVectors(endPoint, startPoint);
            length = direction.length();
        }
        const material = getBeamMaterial(color);
        let geometry = new THREE.CylinderGeometry(6, 6, length, 6, 2, false);
        // shift it so one end rests on the origin
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, length / 2, 0));
        // rotate it the right way for lookAt to work
        geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(90)));
        let mesh = new THREE.Mesh(geometry, material);
        if (startPoint) {
            mesh.position.copy(startPoint);
        }
        if (endPoint) {
            mesh.lookAt(endPoint);
        }
        return mesh;
    }

    // TODO: make this return a material using a custom shader to fade out the opacity
    // ideally the opacity will be close to 1 where the beam hits the area target,
    // and fades out to 0 or 0.1 after a meter or two, so that it just indicates the direction without being too intense
    function getBeamMaterial(color) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        return new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
    }

    // replace the existing cylinderMesh object with a new cylinderMesh with updated start and end points
    function updateCylinderMesh(obj, startPoint, endPoint, color) {
        obj.geometry.dispose();
        obj.material.dispose();

        realityEditor.gui.threejsScene.removeFromScene(obj);
        return cylinderMesh(startPoint, endPoint, color);
    }

    function createTextLabel(objectKey, initials) {
        let labelContainer = document.createElement('div');
        labelContainer.id = 'avatarBeamLabelContainer_' + objectKey;
        labelContainer.classList.add('avatarBeamLabel');
        document.body.appendChild(labelContainer);

        let label = document.createElement('div');
        label.id = 'avatarBeamLabel_' + objectKey;
        labelContainer.appendChild(label);

        if (initials) {
            label.innerText = initials; //makeRandomInitials(objectKey); //'BR';
            labelContainer.classList.remove('displayNone');
        } else {
            label.innerText = initials;
            labelContainer.classList.add('displayNone');
        }

        return labelContainer;
    }
    
    function updateAvatarName(objectKey, name) {
        // update the laserbeam label text if available
        let matchingTextLabel = document.getElementById('avatarBeamLabel_' + objectKey);
        if (matchingTextLabel) {
            let initials = realityEditor.avatar.utils.getInitialsFromName(name);
            if (initials) {
                matchingTextLabel.innerText = initials;
                matchingTextLabel.parentElement.classList.remove('displayNone');
            } else {
                matchingTextLabel.innerText = '';
                matchingTextLabel.parentElement.classList.add('displayNone');
            }
        }
    }

    // when sending a beam, highlight your cursor
    function renderCursorOverlay(isVisible, screenX, screenY, color) {
        let overlay = document.getElementById('beamOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'beamOverlay';
            overlay.style.position = 'absolute';
            overlay.style.left = '-10px';
            overlay.style.top = '-10px';
            overlay.style.pointerEvents = 'none';
            overlay.style.width = '20px';
            overlay.style.height = '20px';
            overlay.style.borderRadius = '10px';
            overlay.style.backgroundColor = color;
            overlay.style.opacity = '0.5';
            document.body.appendChild(overlay);
        }
        overlay.style.transform = 'translate3d(' + screenX + 'px, ' + screenY + 'px, 1201px)';
        overlay.style.display = isVisible ? 'inline' : 'none';
    }

    // show some debug text fields in the top left corner of the screen to track data connections and transmission
    function renderConnectionStatus(connectionStatus, debugConnectionStatus, myId, debugMode) {
        if (!debugMode) {
            if (debugUI) { debugUI.style.display = 'none'; }
            return;
        }

        if (!debugUI) {
            debugUI = document.createElement('div');
            debugUI.id = 'avatarConnectionStatus';
            debugUI.style.pointerEvents = 'none';
            debugUI.style.position = 'absolute';
            debugUI.style.width = '100vw';
            debugUI.style.height = '100px';
            debugUI.style.left = '0';
            debugUI.style.top = realityEditor.device.environment.variables.screenTopOffset + 'px';
            debugUI.style.zIndex = '3000';
            debugUI.style.transform = 'translateZ(3000px)';
            document.body.appendChild(debugUI);
        }
        let sendText = debugConnectionStatus.didSendAnything && debugConnectionStatus.didRecentlySend ? 'TRUE' : debugConnectionStatus.didSendAnything ? 'true' : 'false';
        let receiveText = debugConnectionStatus.didReceiveAnything && debugConnectionStatus.didRecentlyReceive ? 'TRUE' : debugConnectionStatus.didReceiveAnything ? 'true' : 'false';

        debugUI.style.display = '';
        debugUI.innerHTML = 'Localized? (' + connectionStatus.isLocalized +').  ' +
            'Created? (' + connectionStatus.isMyAvatarCreated + ').' +
            '<br/>' +
            'Verified? (' + connectionStatus.isMyAvatarInitialized + ').  ' +
            'Occlusion? (' + connectionStatus.isWorldOcclusionObjectAdded + ').' +
            '<br/>' +
            'Subscribed? (' + debugConnectionStatus.subscribedToHowMany + ').  ' +
            '<br/>' +
            'Did Send? (' + sendText + ').  ' +
            'Did Receive? (' + receiveText + ')' +
            '<br/>' +
            'My ID: ' + (myId ? myId : 'null');
    }

    exports.renderOtherAvatars = renderOtherAvatars;
    exports.updateAvatarName = updateAvatarName;
    exports.renderCursorOverlay = renderCursorOverlay;
    exports.renderConnectionStatus = renderConnectionStatus;

}(realityEditor.avatar.draw));
