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
        this.onVehicleDeleted = this.onVehicleDeleted.bind(this);
    }

    initService() {
        this.gui = document.getElementById('GUI');

        realityEditor.device.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using server

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
        }

        // We ALWAYS want the icon to face the camera, so don't need to check if frame.alwaysFaceCamera is true
        // let finalMatrix = this.arUtilities.copyMatrix(realityEditor.sceneGraph.getCSSMatrix(frameId));
        let finalMatrix = [];
        let modelMatrix = realityEditor.sceneGraph.getModelMatrixLookingAt(frameId, 'CAMERA');
        let modelViewMatrix = [];
        this.arUtilities.multiplyMatrix(modelMatrix, realityEditor.sceneGraph.getViewMatrix(), modelViewMatrix);
        this.arUtilities.multiplyMatrix(modelViewMatrix, globalStates.projectionMatrix, finalMatrix);

        iconDiv.style.transform = 'matrix3d(' + finalMatrix.toString() + ')';
    }

    createIconDiv(frameId, src) {
        let container = document.createElement('div');
        container.id = 'envelopeIcon_' + frameId;
        container.classList.add('main', 'visibleFrameContainer', 'minimizedEnvelopeContainer');
        this.gui.appendChild(container);

        let icon = document.createElement('img');
        icon.src = src;
        icon.classList.add('minimizedEnvelopeIcon', 'tool-color-gradient');
        container.appendChild(icon);

        icon.addEventListener('pointerup', () => {
            realityEditor.envelopeManager.focusEnvelope(frameId);
        });

        globalDOMCache['envelopeIcon_' + frameId] = container;
        return container;
    }
}

realityEditor.gui.envelopeIconRenderer = new EnvelopeIconRenderer();
