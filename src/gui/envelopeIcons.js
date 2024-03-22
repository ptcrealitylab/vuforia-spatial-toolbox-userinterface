/**
 * This is used to render temporarily icons for envelopes that have received a
 * "blur" event to remove their 2D UI layer but keep their 3D fullscreen content
 * on the screen; we add simple image divs floating at the envelope origin so
 * that clicking on them can restore "focus" to that envelope.
 */
class EnvelopeIconRenderer {
    constructor() {
        this.knownEnvelopes = {};
        this.arUtilities = realityEditor.gui.ar.utilities;

        this.callbacks = {
            onIconStartDrag: [],
            onIconStopDrag: []
        };

        this.dragState = {
            pointerDown: false,
            didStartDrag: false,
            target: {
                icon: null,
                objectId: null,
                frameId: null
            },
            draggedIcon: null
        };

        this.onVehicleDeleted = this.onVehicleDeleted.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onIconPointerDown = this.onIconPointerDown.bind(this);
        this.onIconPointerUp = this.onIconPointerUp.bind(this);
        this.onIconPointerOut = this.onIconPointerOut.bind(this);
        this.resetDrag = this.resetDrag.bind(this);
    }

    initService() {
        this.gui = document.getElementById('GUI');

        realityEditor.device.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using server

        document.addEventListener('pointercancel', this.resetDrag);
        document.addEventListener('pointerup', this.resetDrag);
        document.addEventListener('pointermove', this.onPointerMove);

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            Object.values(this.knownEnvelopes).forEach(envelope => {
                this.updateEnvelope(envelope);
            });
        });
    }

    onVehicleDeleted(event) {
        if (!event.objectKey || !event.frameKey || event.nodeKey) {
            return;
        }

        this.removeEnvelopeIcon(event.frameKey);

        delete this.knownEnvelopes[event.frameKey];
    }

    onEnvelopeRegistered(envelope) {
        this.knownEnvelopes[envelope.frame] = envelope;
    }

    onOpen(envelope) {
        this.knownEnvelopes[envelope.frame].isOpen = true;
        this.knownEnvelopes[envelope.frame].hasFocus = true;
    }

    onClose(envelope) {
        this.knownEnvelopes[envelope.frame].isOpen = false;
        this.knownEnvelopes[envelope.frame].hasFocus = false;
    }

    onFocus(envelope) {
        this.knownEnvelopes[envelope.frame].hasFocus = true;
    }

    onBlur(envelope) {
        this.knownEnvelopes[envelope.frame].hasFocus = false;
    }

    updateEnvelope(envelope) {
        if (envelope.isOpen && !envelope.hasFocus) {
            this.renderEnvelopeIcon(envelope.object, envelope.frame);
        } else {
            this.removeEnvelopeIcon(envelope.frame);
        }
    }

    removeEnvelopeIcon(frameId) {
        if (!globalDOMCache['envelopeIcon_' + frameId]) return;
        this.gui.removeChild(globalDOMCache['envelopeIcon_' + frameId]);
        globalDOMCache['envelopeIcon_' + frameId] = null;
    }

    renderEnvelopeIcon(objectId, frameId) {
        // lazily instantiate the envelope icon if it doesn't already exist
        let iconDiv = globalDOMCache['envelopeIcon_' + frameId];
        let frame = realityEditor.getFrame(objectId, frameId);
        if (!iconDiv) {
            let object = realityEditor.getObject(objectId);
            let name = frame.src;
            let port = realityEditor.network.getPort(object);
            let path = '/frames/' + name + '/icon-foreground.svg';
            let src = realityEditor.network.getURL(object.ip, port, path);
            iconDiv = this.createIconDiv(frameId, src);
            let icon = iconDiv.querySelector('.minimizedEnvelopeIcon');
            icon.dataset.objectId = objectId;
            icon.dataset.frameId = frameId;
            icon.addEventListener('pointerdown', this.onIconPointerDown);
            icon.addEventListener('pointerup', this.onIconPointerUp);
            icon.addEventListener('pointercancel', this.onIconPointerUp);
            icon.addEventListener('pointerout', this.onIconPointerOut);
        }

        // We ALWAYS want the icon to face the camera, so don't need to check if frame.alwaysFaceCamera is true
        // let finalMatrix = this.arUtilities.copyMatrix(realityEditor.sceneGraph.getCSSMatrix(frameId));
        let finalMatrix = [];
        let modelMatrix = realityEditor.sceneGraph.getModelMatrixLookingAt(frameId, 'CAMERA');
        let modelViewMatrix = [];
        this.arUtilities.multiplyMatrix(modelMatrix, realityEditor.sceneGraph.getViewMatrix(), modelViewMatrix);

        // In AR mode, we need to use this lookAt method, because camera up vec doesn't always match scene up vec
        if (realityEditor.device.environment.isARMode()) {
            this.arUtilities.multiplyMatrix(modelViewMatrix, globalStates.projectionMatrix, finalMatrix);
        } else {
            // the lookAt method isn't perfect – it has a singularity as you approach top or bottom
            // so let's correct the scale and remove the rotation – this works on desktop because camera up = scene up
            let scale = realityEditor.sceneGraph.getSceneNodeById(frameId).getVehicleScale();
            let constructedModelViewMatrix = [
                scale, 0, 0, 0,
                0, -scale, 0, 0,
                0, 0, scale, 0,
                modelViewMatrix[12], modelViewMatrix[13], modelViewMatrix[14], 1
            ];
            this.arUtilities.multiplyMatrix(constructedModelViewMatrix, globalStates.projectionMatrix, finalMatrix);
        }

        finalMatrix[14] = realityEditor.gui.ar.positioning.getFinalMatrixScreenZ(finalMatrix[14]);

        // normalize the matrix and clear the last column, to avoid some browser-specific bugs
        let normalizedMatrix = realityEditor.gui.ar.utilities.normalizeMatrix(finalMatrix);
        normalizedMatrix[3] = 0;
        normalizedMatrix[7] = 0;
        normalizedMatrix[11] = 0;

        // if tool is rendering while it should be behind the camera, visually hide it (for now)
        if (normalizedMatrix[14] < 0) {
            iconDiv.classList.add('elementBehindCamera');
        } else {
            iconDiv.classList.remove('elementBehindCamera');
        }

        iconDiv.style.transform = 'matrix3d(' + normalizedMatrix.toString() + ')';
    }

    createIconDiv(frameId, src, isCopy) {
        let container = document.createElement('div');
        if (!isCopy) {
            container.id = 'envelopeIcon_' + frameId;
            globalDOMCache['envelopeIcon_' + frameId] = container;
        }
        container.classList.add('main', 'visibleFrameContainer', 'minimizedEnvelopeContainer');
        this.gui.appendChild(container);

        let icon = document.createElement('img');
        icon.src = src;
        icon.classList.add('minimizedEnvelopeIcon', 'tool-color-gradient');
        container.appendChild(icon);

        icon.addEventListener('pointerup', () => {
            realityEditor.envelopeManager.focusEnvelope(frameId);
        });

        return container;
    }

    resetDrag() {
        let draggedIcon = this.dragState.draggedIcon;
        // if we have a draggedIcon, remove it
        if (draggedIcon && draggedIcon.parentElement) {
            let boundingRect = draggedIcon.getBoundingClientRect();
            let x = parseInt(draggedIcon.style.left) + boundingRect.width/2;
            let y = parseInt(draggedIcon.style.top) + boundingRect.height/2;

            // delete the associated tool if the icon is over the trash zone
            if (realityEditor.device.isPointerInTrashZone(x, y)) {
                // delete it
                let frame = realityEditor.getFrame(this.dragState.target.objectId, this.dragState.target.frameId);
                if (frame) {
                    realityEditor.device.tryToDeleteSelectedVehicle(frame);
                }
            }
            draggedIcon.parentElement.removeChild(draggedIcon);
        }

        this.dragState = {
            pointerDown: false,
            didStartDrag: false,
            target: {
                icon: null,
                objectId: null,
                frameId: null
            },
            draggedIcon: null
        }

        this.callbacks.onIconStopDrag.forEach(cb => cb());
    }

    setDragTarget(objectId, frameId) {
        this.dragState.target.icon = document.getElementById('envelopeIcon_' + frameId); // this.getIcon(frameId);
        this.dragState.target.objectId = objectId;
        this.dragState.target.frameId = frameId;
    }

    onIconPointerDown(event) {
        const iconElt = event.target;
        this.setDragTarget(iconElt.dataset.objectId, iconElt.dataset.frameId);
        this.dragState.pointerDown = true;
    }

    onIconPointerUp() {
        this.dragState.pointerDown = false;
    }

    onIconPointerOut(event) {
        // this.hoveredFrameId = null;

        const iconElt = event.target;
        if (this.dragState.pointerDown) {
            if (this.dragState.target.frameId &&
                this.dragState.target.frameId === iconElt.dataset.frameId) {
                this.activateDrag();
            }
        }
    }

    activateDrag() {
        if (this.dragState.didStartDrag) return;
        this.dragState.didStartDrag = true;

        //create ghost of button
        let target = this.dragState.target;
        // let draggedIcon = this.createIconImg(target.objectId, target.frameId);

        let object = objects[target.objectId];
        let frame = object.frames[target.frameId];
        let port = realityEditor.network.getPort(object);
        let path = '/frames/' + frame.src + '/icon-foreground.svg';
        let src = realityEditor.network.getURL(object.ip, port, path);
        let draggedIcon = this.createIconDiv(target.frameId, src, true);
        let iconImg = draggedIcon.querySelector('.minimizedEnvelopeIcon');
        // iconImg.classList.remove('tool-color-gradient');
        iconImg.style.transform = 'scale(0.25)';

        draggedIcon.style.opacity = '.75';
        draggedIcon.style.pointerEvents = 'none';
        document.body.appendChild(draggedIcon);
        this.dragState.draggedIcon = draggedIcon;

        this.callbacks.onIconStartDrag.forEach(cb => cb());
    }

    onPointerMove(event) {
        if (!this.dragState.pointerDown) return;
        if (!this.dragState.didStartDrag) return;
        if (!this.dragState.draggedIcon) return;

        let boundingRect = this.dragState.draggedIcon.getBoundingClientRect();

        this.dragState.draggedIcon.style.left = `${event.pageX - boundingRect.width/2}px`;
        this.dragState.draggedIcon.style.top = `${event.pageY - boundingRect.height/2}px`;

        if (realityEditor.device.isPointerInTrashZone(event.pageX, event.pageY)) {
            overlayDiv.classList.add('overlayNegative');
        } else {
            overlayDiv.classList.remove('overlayNegative');
        }
    }
}

realityEditor.gui.envelopeIconRenderer = new EnvelopeIconRenderer();
