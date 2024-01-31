createNameSpace("realityEditor.avatar.draw");

/**
 * @fileOverview realityEditor.avatar.draw
 * Contains a variety of helper functions for avatar/index.js to render all visuals related to avatars
 */

(function(exports) {
    const RENDER_DEVICE_CUBE = false; // turn on to show a cube at each of the avatar positions, in addition to the beams
    const SMOOTH_AVATAR_POSITIONS = false; // try to animate the positions of the avatars – doesn't work too well yet

    // main data structure that stores the various visual elements for each avatar objectKey (beam, pointer, textLabel)
    let avatarMeshes = {};
    let linkObjects = {}; // contains the animation properties for the lines drawn from avatars

    // 2D UI for keeping track of the connection status
    let debugUI = null;
    let statusUI = null;
    let hasConnectionFeedbackBeenShown = false; // ensures we only show the "Connected!" UI one time

    const ICON_WIDTH = 30; // layout information for circular icons
    const ICON_GAP = 10;

    // main rendering loop – trigger this at 60fps to render all the visual feedback for the avatars (e.g. laser pointers)
    function renderOtherAvatars(avatarTouchStates, avatarNames, avatarCursorStates) {
        try {
            for (const [objectKey, avatarTouchState] of Object.entries(avatarTouchStates)) {
                renderAvatar(objectKey, avatarTouchState, avatarNames[objectKey]);
            }
            for (const [objectKey, avatarCursorState] of Object.entries(avatarCursorStates)) {
                realityEditor.spatialCursor.renderOtherSpatialCursor(objectKey,
                    avatarCursorState.matrix, avatarCursorState.colorHSL, avatarCursorState.isColored, avatarCursorState.worldId);
            }
        } catch (e) {
            console.warn('error rendering other avatars', e);
        }
    }
    
    function renderMyAvatar(myAvatarObject, myAvatarTouchState) {
        if (!myAvatarObject) return;
        if (!myAvatarTouchState) return;

        realityEditor.avatar.setLinkCanvasNeedsClear(true);

        try {
            // if that device isn't touching down, hide its laser beam and ignore the rest
            if (!myAvatarTouchState.isPointerDown) {
                return;
            }

            // it only makes sense to draw the laser beam on our own screen if at least one other user is connected
            let numConnectedAvatars = Object.keys(realityEditor.avatar.getConnectedAvatarList()).length;
            if (numConnectedAvatars < 1) return;

            drawLaserBeam(myAvatarObject.objectId, null, realityEditor.avatar.utils.getColor(myAvatarObject), realityEditor.avatar.utils.getColorLighter(myAvatarObject), myAvatarTouchState.screenX, myAvatarTouchState.screenY);
        } catch (e) {
            console.warn(e);
        }
    }

    // show a list of circular icons, one per avatar, with the (random) color and (chosen) initials of that user
    function renderAvatarIconList(connectedAvatars) {
        let iconContainer = document.getElementById('avatarIconContainer');
        if (!iconContainer) {
            iconContainer = createIconContainer();
        }
        while (iconContainer.hasChildNodes()) {
            iconContainer.removeChild(iconContainer.lastChild);
        }

        if (Object.keys(connectedAvatars).length < 1) {
            return; // don't show unless there is at least one avatar
        }

        let sortedKeys = realityEditor.avatar.utils.sortAvatarList(connectedAvatars);

        // if too many collaborators, show a "+N..." at the end (I'm calling this the ellipsis) and limit how many icons
        const MAX_ICONS = realityEditor.device.environment.variables.maxAvatarIcons;
        const ADDITIONAL_NAMES = 2; // list out this many extra names with commas when hovering over the ellipsis

        sortedKeys.forEach((objectKey, index) => {
            let isEllipsis = index === (MAX_ICONS - 1) && sortedKeys.length > MAX_ICONS; // last one turns into "+2", "+3", etc
            let numTooMany = sortedKeys.length - (MAX_ICONS - 1);
            if (index >= MAX_ICONS) { return; } // after the ellipsis, we ignore the rest

            let info = connectedAvatars[objectKey];
            let initials = realityEditor.avatar.utils.getInitialsFromName(info.name) || '';
            if (isEllipsis) {
                initials = '+' + numTooMany;
            }

            let isMyIcon = objectKey.includes(realityEditor.avatar.utils.getAvatarName());
            let iconDiv = createAvatarIcon(iconContainer, objectKey, initials, index, isMyIcon, isEllipsis);

            // show full name when hovering over the icon
            let tooltipText = info.name;
            // or put all the extra names into the tooltip text
            if (isEllipsis) {
                let remainingKeys = sortedKeys.slice(-1 * numTooMany);
                let names = remainingKeys.map(key => connectedAvatars[key].name).filter(name => !!name);
                names = names.slice(0, ADDITIONAL_NAMES); // limit number of comma-separated names
                tooltipText = names.join(', ');

                let additional = numTooMany - names.length; // number of anonymous and beyond-additional
                if (additional > 0) {
                    tooltipText += ' and ' + additional + ' more';
                }
            }
            
            iconDiv.addEventListener('pointerover', () => {
                showFullNameTooltip(iconDiv, tooltipText, isMyIcon, isEllipsis);
            });
            ['pointerout', 'pointercancel', 'pointerup'].forEach((eventName) => {
                iconDiv.addEventListener(eventName, hideFullNameTooltip);
            });

            if (isMyIcon) {
                iconDiv.addEventListener('pointerup', (e) => {
                    console.log('clicked on my icon - option to rename avatar?');
                    // show a modal that lets you type in a name
                    realityEditor.gui.modal.openInputModal({
                        headerText: 'Edit Avatar Name',
                        descriptionText: 'Specify the name that other users will see.',
                        inputPlaceholderText: 'Your username here',
                        // cancelButtonText: 'Cancel',
                        // submitButtonText: 'Submit',
                        onCancelCallback: (e) => {
                            console.log('cancel edit name', e);
                        },
                        onSubmitCallback: (e, userName) => {
                            console.log('submitted', userName);
                            if (userName && typeof userName === 'string' && userName.length > 0) {
                                console.log(`manually entered username myUserName ${userName}`);
                                realityEditor.avatar.setMyUsername(userName);
                                realityEditor.avatar.writeUsername(userName);
                                // write to window.localStorage and use instead of anonymous in the future in this browser
                                window.localStorage.setItem('manuallyEnteredUsername', userName);
                            }
                        },
                        useSmallerVersion: true
                    });
                });
            }
        });

        let iconsWidth = Math.min(MAX_ICONS, sortedKeys.length) * (ICON_WIDTH + ICON_GAP) - ICON_GAP;
        iconContainer.style.width = iconsWidth + 'px';
    }

    // create the container that all the avatar icon list elements will get added to
    function createIconContainer() {
        let iconContainer = document.createElement('div');
        iconContainer.id = 'avatarIconContainer';
        iconContainer.classList.add('avatarIconContainerScaleAdjustment')
        iconContainer.style.top = (realityEditor.device.environment.variables.screenTopOffset + 20) + 'px';
        document.body.appendChild(iconContainer)
        return iconContainer;
    }

    // create an icon for this avatar, and add hover event listeners to show tooltip with full name
    function createAvatarIcon(parent, objectKey, initials, index, isMyIcon, isEllipsis) {
        let iconDiv = document.createElement('div');
        iconDiv.id = 'avatarIcon' + objectKey;
        iconDiv.classList.add('avatarListIcon', 'avatarListIconVerticalAdjustment');
        iconDiv.style.left = ((ICON_WIDTH + ICON_GAP) * index) + 'px';
        parent.appendChild(iconDiv);

        let iconImg = document.createElement('img');
        iconImg.classList.add('avatarListIconImage');
        iconDiv.appendChild(iconImg);

        if (isMyIcon) {
            iconDiv.classList.add('avatarListIconMyAvatar');
        }

        if (initials) {
            iconImg.src = 'svg/avatar-initials-background-dark.svg';

            let iconInitials = document.createElement('div');
            iconInitials.classList.add('avatarListIconInitials');
            iconInitials.innerText = initials;
            iconDiv.appendChild(iconInitials);
        } else {
            if (isMyIcon) {
                iconImg.src = 'svg/avatar-placeholder-icon.svg';
            } else {
                iconImg.src = 'svg/avatar-placeholder-icon-dark.svg';
            }
        }

        let color = realityEditor.avatar.utils.getColor(realityEditor.getObject(objectKey));
        let lightColor = realityEditor.avatar.utils.getColorLighter(realityEditor.getObject(objectKey));
        if (isMyIcon && color) {
            iconImg.style.border = '2px solid white';
            iconImg.style.backgroundColor = color;
        } else if (!isEllipsis && lightColor) {
            iconImg.style.border = '2px solid ' + lightColor;
            iconImg.style.backgroundColor = lightColor;
        } else {
            iconImg.style.border = '2px solid black';
            iconImg.style.backgroundColor = 'rgb(95, 95, 95)';
        }
        iconImg.style.borderRadius = '20px';

        return iconDiv;
    }

    // shows a tooltip that either says the name, or "You" or "Anonymous" if no name is provided, or a list of extra names
    function showFullNameTooltip(element, name, isMyAvatar) {
        let container = document.getElementById('avatarListHoverName');
        if (!container) {
            container = document.createElement('div');
            container.id = 'avatarListHoverName';
            container.classList.add('avatarListTooltipVerticalAdjustment'); // lets us position differently in portrait app
            element.parentElement.appendChild(container);
        }

        let nameDiv = document.getElementById('avatarListHoverNameText');
        if (!nameDiv) {
            nameDiv = document.createElement('div');
            nameDiv.id = 'avatarListHoverNameText';
            container.appendChild(nameDiv);
        }

        let tooltipArrow = document.getElementById('avatarListTooltipArrow');
        if (!tooltipArrow) {
            let tooltipArrow = document.createElement('img');
            tooltipArrow.id = 'avatarListTooltipArrow';
            tooltipArrow.src = 'svg/tooltip-arrow-up.svg';
            container.appendChild(tooltipArrow);
        }

        if (name) {
            nameDiv.innerText = isMyAvatar ? name + ' (click to edit your name)' : name;
        } else {
            nameDiv.innerText = isMyAvatar ? 'You (click to edit your name)' : 'Anonymous';
        }
        let width = Math.max(120, (nameDiv.innerText.length) * 12);
        nameDiv.style.width = width + 'px';
        container.style.width = width + 'px;'

        // center the tooltip on the icon
        let iconRelativeLeft = element.getBoundingClientRect().left - element.parentElement.getBoundingClientRect().left;
        let iconHalfWidth = element.getBoundingClientRect().width / 2;
        container.style.left = (iconRelativeLeft + iconHalfWidth) + 'px';
        container.style.display = '';
    }

    function hideFullNameTooltip() {
        let nameDiv = document.getElementById('avatarListHoverName');
        if (nameDiv) {
            nameDiv.style.display = 'none';
        }
    }

    // return a quadratic function with a lower & upper bound
    // when input below threshold, the output maintains at outputLimit
    // but when input above threshold, the output quadratically shrinks
    function quadraticRemap(x, lowIn, highIn, lowOut, highOut) {
        if (x < lowIn) return highOut;
        else if (x > highIn) return lowOut;
        else return ((highOut - lowOut) / Math.pow((highIn - lowIn), 2)) * Math.pow((highIn - x), 2);
    }

    // main rendering function for a single avatar – creates a beam, a sphere at the endpoint, and a text label if a name is provided
    function renderAvatar(objectKey, touchState, avatarName) {
        if (!touchState) { return; }

        realityEditor.avatar.setLinkCanvasNeedsClear(true);

        // if that device isn't touching down, hide its laser beam and ignore the rest
        if (!touchState.isPointerDown) {
            if (avatarMeshes[objectKey]) {
                avatarMeshes[objectKey].pointer.visible = false;
                avatarMeshes[objectKey].beam.visible = false;
                avatarMeshes[objectKey].textLabel.style.display = 'none';
                realityEditor.gui.spatialArrow.deleteLaserBeamIndicator(objectKey);
            }
            return;
        }

        const THREE = realityEditor.gui.threejsScene.THREE;
        const color = realityEditor.avatar.utils.getColor(realityEditor.getObject(objectKey)) || 'hsl(60, 100%, 50%)';

        // lazy-create the meshes and text label if they don't exist yet
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
            if (RENDER_DEVICE_CUBE) { // debug option to show where the avatars are located
                avatarMeshes[objectKey].device = boxMesh(color, objectKey + 'device')
                avatarMeshes[objectKey].device.matrixAutoUpdate = false;
                realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].device);
            }
            avatarMeshes[objectKey].beam.name = objectKey + 'beam';
            realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].pointer);
            realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
        }

        // get the scene position of the avatar by multiplying the avatar matrix (which is relative to world) by the world origin matrix
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

        // show all the meshes, etc, for this avatar
        avatarMeshes[objectKey].pointer.visible = true;
        let wasBeamVisible = avatarMeshes[objectKey].beam.visible; // animate differently if just made visible
        avatarMeshes[objectKey].beam.visible = true;
        if (RENDER_DEVICE_CUBE) {
            avatarMeshes[objectKey].device.visible = true;
            avatarMeshes[objectKey].device.matrixAutoUpdate = false
            avatarMeshes[objectKey].device.matrix.copy(avatarObjectMatrixThree);
        }

        // we either draw an "infinite" ray in the specified direction, or draw a line to the specified point
        if (!touchState.worldIntersectPoint && !touchState.rayDirection) return;

        let convertedEndPosition = new THREE.Vector3();

        if (touchState.worldIntersectPoint) {
            // worldIntersectPoint was converted to world coordinates. need to convert back to groundPlane coordinates in this system
            let groundPlaneRelativeToWorldToolbox = worldSceneNode.getMatrixRelativeTo(groundPlaneSceneNode);
            let groundPlaneRelativeToWorldThree = new realityEditor.gui.threejsScene.THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneRelativeToWorldThree, groundPlaneRelativeToWorldToolbox);
            // convertedEndPosition = new THREE.Vector3(touchState.worldIntersectPoint.x, touchState.worldIntersectPoint.y, touchState.worldIntersectPoint.z);
            convertedEndPosition.set(touchState.worldIntersectPoint.x, touchState.worldIntersectPoint.y, touchState.worldIntersectPoint.z);
            convertedEndPosition.applyMatrix4(groundPlaneRelativeToWorldThree);
            // move the pointer sphere to the raycast intersect position

            avatarMeshes[objectKey].pointer.visible = true;
            avatarMeshes[objectKey].pointer.position.set(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);

            // get the 2D screen coordinates of the pointer, and render a text bubble centered on it with the name of the sender
            let pointerWorldPosition = new THREE.Vector3();
            avatarMeshes[objectKey].pointer.getWorldPosition(pointerWorldPosition);
            let screenCoords = realityEditor.gui.threejsScene.getScreenXY(pointerWorldPosition);
            if (avatarName) {
                avatarMeshes[objectKey].textLabel.style.display = 'inline';
            }
            // scale the name textLabel based on distance from convertedEndPosition to camera
            let camPos = realityEditor.sceneGraph.getWorldPosition('CAMERA');
            let delta = {
                x: camPos.x - convertedEndPosition.x,
                y: camPos.y - convertedEndPosition.y,
                z: camPos.z - convertedEndPosition.z
            };
            let distanceToCamera = Math.max(0.001, Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z));
            let scale = Math.max(0.5, Math.min(2, 2000 / distanceToCamera)); // biggest when <1m, smallest when >4m
            avatarMeshes[objectKey].textLabel.style.transform = 'translateX(-50%) translateY(-50%) translateZ(3000px) scale(' + scale + ')';
            avatarMeshes[objectKey].textLabel.style.left = screenCoords.x + 'px'; // position it centered on the pointer sphere
            avatarMeshes[objectKey].textLabel.style.top = screenCoords.y + 'px';
        } else {
            // hide the pointer and just compute a point along the rayDirection, so we can render the beam
            avatarMeshes[objectKey].pointer.visible = false;
            avatarMeshes[objectKey].textLabel.style.display = 'none';

            // rayDirection is relative to world object – convert to relative to groundPlane
            let rayDirectionRelativeToWorldObject = touchState.rayDirection;
            const RAY_LENGTH_MM = 100 * 1000; // render it 100 meters long
            let arUtils = realityEditor.gui.ar.utilities;
            let rayOriginRelativeToWorldObject = realityEditor.sceneGraph.convertToNewCoordSystem([0, 0, 0], thatAvatarSceneNode, worldSceneNode);
            let endRelativeToWorldObject = arUtils.add(rayOriginRelativeToWorldObject, arUtils.scalarMultiply(rayDirectionRelativeToWorldObject, RAY_LENGTH_MM));
            let endRelativeToGroundPlane = realityEditor.sceneGraph.convertToNewCoordSystem(endRelativeToWorldObject, worldSceneNode, groundPlaneSceneNode);
            convertedEndPosition.set(endRelativeToGroundPlane[0], endRelativeToGroundPlane[1], endRelativeToGroundPlane[2]);
        }

        // the position of the avatar in space
        let startPosition = new THREE.Vector3(avatarObjectMatrixThree.elements[12], avatarObjectMatrixThree.elements[13], avatarObjectMatrixThree.elements[14]);
        // the position of the destination of the laser pointer (where that clicked on the environment)
        let endPosition = new THREE.Vector3(convertedEndPosition.x, convertedEndPosition.y, convertedEndPosition.z);

        if (SMOOTH_AVATAR_POSITIONS && wasBeamVisible) { // animate start position if already visible
            let currentStartPosition = [
                avatarMeshes[objectKey].beam.position.x,
                avatarMeshes[objectKey].beam.position.y,
                avatarMeshes[objectKey].beam.position.z
            ];
            let newStartPosition = [
                avatarObjectMatrixThree.elements[12],
                avatarObjectMatrixThree.elements[13],
                avatarObjectMatrixThree.elements[14]
            ];
            // animation option 1: move the cursor faster the further away it is from the new position, so it eases out
            // let animatedStartPosition = realityEditor.gui.ar.utilities.tweenMatrix(currentStartPosition, newStartPosition, 0.05);
            // animation option 2: move the cursor linearly at 30*[FPS] millimeters per second
            let animatedStartPosition = realityEditor.gui.ar.utilities.animationVectorLinear(currentStartPosition, newStartPosition, 30);
            startPosition = new THREE.Vector3(animatedStartPosition[0], animatedStartPosition[1], animatedStartPosition[2]);
        }

        // replace the old laser beam cylinder with a new one that goes from the avatar position to the beam destination
        avatarMeshes[objectKey].beam = updateCylinderMesh(avatarMeshes[objectKey].beam, startPosition, endPosition, color);
        avatarMeshes[objectKey].beam.name = objectKey + 'beam';
        // realityEditor.gui.threejsScene.addToScene(avatarMeshes[objectKey].beam);
        // if laser beam is off screen, add an arrow pointing to the laser beam destination position
        let lightColor = realityEditor.avatar.utils.getColorLighter(realityEditor.getObject(objectKey)) || 'hsl(60, 100%, 50%)';
        // get the world position of the laser pointer sphere, and draw arrow to it if off screen
        let endWorldPosition = new THREE.Vector3();
        if (avatarMeshes[objectKey].pointer.visible) {
            avatarMeshes[objectKey].pointer.getWorldPosition(endWorldPosition);
        } else {
            let endWorldPositionArray = [endPosition.x, endPosition.y, endPosition.z];
            endWorldPositionArray = realityEditor.sceneGraph.convertToNewCoordSystem(endWorldPositionArray, groundPlaneSceneNode, worldSceneNode);
            endWorldPosition.set(endWorldPositionArray[0], endWorldPositionArray[1], endWorldPositionArray[2]);
        }
        drawLaserBeam(objectKey, endWorldPosition, color, lightColor);
    }

    function drawLaserBeam(objectKey, endWorldPosition, color, lightColor, screenX, screenY) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        // realityEditor.gui.spatialArrow.drawArrowBasedOnWorldPosition(endWorldPosition, color, lightColor);
        realityEditor.gui.spatialArrow.addLaserBeamIndicator(objectKey, endWorldPosition, color, lightColor);
        // todo Steve: draw a fake 3d line from avatar icon to the position of the laser pointer sphere (endWorldPosition)
        let linkCanvasInfo = realityEditor.avatar.getLinkCanvasInfo();
        let avatarIconElement = document.getElementById('avatarIcon' + objectKey);
        let avatarIconElementRect;
        // try to draw the line coming from the avatar icon that corresponds with who sent the line
        if (avatarIconElement) {
            avatarIconElementRect = avatarIconElement.getBoundingClientRect();
        } else {
            // if we can't find the icon for the avatar, then try to get the last icon in the container (the "+N" one)
            let avatarIconContainer = document.getElementById('avatarIconContainer');
            let iconList = avatarIconContainer.querySelectorAll('.avatarListIcon');
            let lastIcon = iconList[iconList.length - 1];
            if (lastIcon) {
                avatarIconElementRect = lastIcon.getBoundingClientRect();
            } else {
                // default it to the top-center of the screen if all else fails
                avatarIconElementRect = avatarIconContainer.getBoundingClientRect();
            }
        }
        let linkStartPos = [avatarIconElementRect.x + avatarIconElementRect.width / 2, avatarIconElementRect.y + avatarIconElementRect.height / 2];
        
        // for laser beams coming from other devices, draw to the worldPosition
        // for laser beams from this device, draw to the (screenX, screenY) where the user touches
        let endScreenXY = null;
        let ratio = 1;
        if (endWorldPosition) {
            let camWorldPos = new THREE.Vector3();
            realityEditor.gui.threejsScene.getInternals().camera.getWorldPosition(camWorldPos);
            let linkStartZ = camWorldPos;
            let linkEndZ = endWorldPosition;
            let linkDistance = linkStartZ.sub(linkEndZ).length();
            ratio = quadraticRemap(linkDistance, 0, 20000, 0.05, 1);
            endScreenXY = realityEditor.gui.threejsScene.getScreenXY(endWorldPosition);
        } else if (screenX && screenY) {
            endScreenXY = {
                x: screenX,
                y: screenY
            };
            let linkDistance = Math.sqrt(Math.pow((screenX - linkStartPos[0]), 2) + Math.pow((screenY - linkStartPos[1]), 2));
            ratio = quadraticRemap(linkDistance, 0, 10000, 0.05, 1);
        } else {
            return;
        }
        
        let linkEndPos = [endScreenXY.x, endScreenXY.y];
        let colorArr = HSLStrToRGBArr(color);
        let lightColorArr = HSLStrToRGBArr(lightColor);

        if (typeof linkObjects[objectKey] === 'undefined') {
            linkObjects[objectKey] = { ballAnimationCount: 0 };
        }

        if (realityEditor.avatar.isDesktop()) {
            realityEditor.gui.ar.lines.drawLine(linkCanvasInfo.ctx, linkStartPos, linkEndPos, 2.5, 2.5 * ratio, linkObjects[objectKey], timeCorrection, lightColorArr, colorArr, 1, 1, 1);
        } else {
            realityEditor.gui.ar.lines.drawLine(linkCanvasInfo.ctx, linkStartPos, linkEndPos, 7.5, 7.5 * ratio, linkObjects[objectKey], timeCorrection, lightColorArr, colorArr, 1, 1, 1);
        }
    }
    
    function HSLStrToRGBArr(hslStr) {
        let hslObj = parseHSLStr(hslStr);
        return HSLToRGB(hslObj.h, hslObj.s, hslObj.l);
    }

    // https://www.30secondsofcode.org/js/s/to-hsl-object/
    function parseHSLStr(hslStr) {
        const regex = /-?\d+(?:\.\d+)?/g;
        const [h, s, l] = hslStr.match(regex).map(Number);
        return {h, s, l};
    }

    function HSLToRGB (h, s, l) {
        s /= 100;
        l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n =>
            l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return [255 * f(0), 255 * f(8), 255 * f(4)];
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
        geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2)); // 90 degrees
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

    // adds a circular label with enough space for two initials, e.g. "BR" (but hides it if no initials provided)
    function createTextLabel(objectKey, initials) {
        let labelContainer = document.createElement('div');
        labelContainer.id = 'avatarBeamLabelContainer_' + objectKey;
        labelContainer.classList.add('avatarBeamLabel');
        document.body.appendChild(labelContainer);

        let label = document.createElement('div');
        label.id = 'avatarBeamLabel_' + objectKey;
        labelContainer.appendChild(label);

        if (initials) {
            label.innerText = initials;
            labelContainer.classList.remove('displayNone');
        } else {
            label.innerText = initials;
            labelContainer.classList.add('displayNone');
        }

        return labelContainer;
    }

    // update the laser beam text label with this name's initials
    function updateAvatarName(objectKey, name) {
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

    // Shows an "Establishing Connection..." --> "Connected!" label in the top left
    function renderConnectionFeedback(isConnected, didFail = false) {
        if (!statusUI) {
            statusUI = document.createElement('div');
            statusUI.id = 'avatarStatus';
            statusUI.classList.add('topLeftInfoText');
            statusUI.style.opacity = '0.5';
            statusUI.style.left = '5px';
            statusUI.style.top = (realityEditor.device.environment.variables.screenTopOffset + 5) + 'px';
            document.body.appendChild(statusUI);
        }
        if (hasConnectionFeedbackBeenShown) { return; }
        if (isConnected) {
            hasConnectionFeedbackBeenShown = true;
            statusUI.innerText = '';
            setTimeout(() => {
                statusUI.innerText = 'Avatar Connected!';
                setTimeout(() => {
                    statusUI.innerText = '';
                    statusUI.style.display = 'none';
                }, 2000);
            }, 300);
        } else {
            if (didFail) {
                statusUI.innerText = ''; // hide the "Establishing" message on fail or timeout
            } else {
                statusUI.innerText = 'Establishing Avatar Connection...';
            }
        }
    }

    // show some debug text fields in the top left corner of the screen to track data connections and transmission
    function renderConnectionDebugInfo(connectionStatus, debugConnectionStatus, myId, debugMode) {
        if (!debugMode) {
            if (debugUI) { debugUI.style.display = 'none'; }
            return;
        }

        if (!debugUI) {
            debugUI = document.createElement('div');
            debugUI.id = 'avatarConnectionStatus';
            debugUI.classList.add('topLeftInfoText');
            debugUI.style.top = realityEditor.device.environment.variables.screenTopOffset + 'px';
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
            'Did Fail? (' + debugConnectionStatus.didCreationFail + ')' +
            '<br/>' +
            'My ID: ' + (myId ? myId : 'null');
    }

    function deleteAvatarMeshes(objectKey) {
        if (avatarMeshes[objectKey]) {
            Object.values(avatarMeshes[objectKey]).forEach(elt => {
                if (typeof elt.isObject3D !== 'undefined' && elt.isObject3D && typeof elt.removeFromParent !== 'undefined') {
                    elt.removeFromParent();
                } else if (elt.tagName !== 'undefined' && typeof elt.parentElement !== 'undefined') {
                    elt.parentElement.removeChild(elt);
                }
            });
        }
        delete avatarMeshes[objectKey];
    }

    exports.renderOtherAvatars = renderOtherAvatars;
    exports.renderMyAvatar = renderMyAvatar;
    exports.updateAvatarName = updateAvatarName;
    exports.renderAvatarIconList = renderAvatarIconList;
    exports.renderCursorOverlay = renderCursorOverlay;
    exports.renderConnectionFeedback = renderConnectionFeedback;
    exports.renderConnectionDebugInfo = renderConnectionDebugInfo;
    exports.deleteAvatarMeshes = deleteAvatarMeshes;

}(realityEditor.avatar.draw));
