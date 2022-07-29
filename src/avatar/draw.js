createNameSpace("realityEditor.avatar.draw");

/**
 * @fileOverview realityEditor.avatarObjects
 * When the app successfully localizes within a world, checks if this device has a "avatar" representation saved on that
 * world object's server. If not, create one. Continuously updates this object's position in the scene graph to match
 * the camera position, and broadcasts that position over the realtime sockets.
 */

(function(exports) {
    let avatarMeshes = {};
    let debugUI = null;
    
    exports.renderConnectionStatus = function(connectionStatus, debugMode) {
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
        let sendText = connectionStatus.didSendAnything && connectionStatus.didJustSend ? 'TRUE' : connectionStatus.didSendAnything ? 'true' : 'false';
        let receiveText = connectionStatus.didReceiveAnything && connectionStatus.didJustReceive ? 'TRUE' : connectionStatus.didReceiveAnything ? 'true' : 'false';

        debugUI.style.display = '';
        debugUI.innerHTML = 'Localized? (' + connectionStatus.isLocalized +').  ' +
            'Created? (' + connectionStatus.isMyAvatarCreated + ').' +
            '<br/>' +
            'Verified? (' + connectionStatus.isMyAvatarInitialized + ').  ' +
            'Occlusion? (' + connectionStatus.isWorldOcclusionObjectAdded + ').' +
            '<br/>' +
            'Subscribed? (' + connectionStatus.subscribedToHowMany + ').  ' +
            '<br/>' +
            'Did Send? (' + sendText + ').  ' +
            'Did Receive? (' + receiveText + ')' +
            '<br/>' +
            'My ID: ' + (myAvatarObject ? myAvatarObject.objectId : 'null');
    }

    exports.renderOtherAvatars = function(avatarTouchStates, avatarNames) {
        try {
            for (const [objectKey, avatarTouchState] of Object.entries(avatarTouchStates)) {
                renderAvatar(objectKey, avatarTouchState, avatarNames[objectKey]);
            }
        } catch (e) {
            console.warn('error rendering other avatars', e);
        }
    };

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

        const RENDER_DEVICE_CUBE = false;

        const color = realityEditor.avatar.utils.getColor(realityEditor.getObject(objectKey)) || '#ffff00';

        // show a three.js cube at the avatar's matrix, and a beam that goes from the device to its destination point
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
            // get the 2D screen coordinates of the pointer, and render a text bubble next to it with the name of the sender
            let pointerWorldPosition = new THREE.Vector3();
            avatarMeshes[objectKey].pointer.getWorldPosition(pointerWorldPosition);
            let screenCoords = realityEditor.gui.threejsScene.getScreenXY(pointerWorldPosition);
            if (avatarName) {
                avatarMeshes[objectKey].textLabel.style.display = 'inline';
            }
            const LEFT_MARGIN = 0;
            const TOP_MARGIN = 0;
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
            avatarMeshes[objectKey].textLabel.style.left = screenCoords.x + LEFT_MARGIN + 'px';
            avatarMeshes[objectKey].textLabel.style.top = screenCoords.y + TOP_MARGIN + 'px';

            let startPosition = new THREE.Vector3(avatarObjectMatrixThree.elements[12], avatarObjectMatrixThree.elements[13], avatarObjectMatrixThree.elements[14]);
            let endPosition = new THREE.Vector3(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);
            avatarMeshes[objectKey].beam = updateCylinderMesh(avatarMeshes[objectKey].beam, startPosition, endPosition, color);
            avatarMeshes[objectKey].beam.name = objectKey + 'beam';
            realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
        }
    }

    function boxMesh(color, name) {
        const THREE = realityEditor.gui.threejsScene.THREE;

        const geo = new THREE.BoxGeometry(100, 100, 100);
        const mat = new THREE.MeshBasicMaterial({color: color});
        const box = new THREE.Mesh(geo, mat);
        box.name = name;

        return box;
    }

    function sphereMesh(color, name, radius) {
        const THREE = realityEditor.gui.threejsScene.THREE;

        const geo = new THREE.SphereGeometry((radius || 50), 8, 6, 0, Math.PI, 0, Math.PI);
        const mat = new THREE.MeshBasicMaterial({color: color});
        const sphere = new THREE.Mesh(geo, mat);
        sphere.name = name;

        return sphere;
    }

    function cylinderMesh(startPoint, endPoint, color) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        // edge from X to Y
        // console.log(endPoint, startPoint);
        let length = 0;
        if (startPoint && endPoint) {
            let direction = new THREE.Vector3().subVectors(endPoint, startPoint);
            length = direction.length();
        }
        const material = getBeamMaterial(color);
        // Make the geometry (of "direction" length)
        var geometry = new THREE.CylinderGeometry(6, 6, length, 6, 2, false);
        // shift it so one end rests on the origin
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, length / 2, 0));
        // rotate it the right way for lookAt to work
        geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(90)));
        // Make a mesh with the geometry
        var mesh = new THREE.Mesh(geometry, material);
        if (startPoint) {
            // Position it where we want
            mesh.position.copy(startPoint);
        }
        if (endPoint) {
            // And make it point to where we want
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
    
    exports.updateAvatarName = function(objectKey, name) {
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
    exports.renderCursorOverlay = function (isVisible, screenX, screenY, color) {
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

}(realityEditor.avatar.draw));
