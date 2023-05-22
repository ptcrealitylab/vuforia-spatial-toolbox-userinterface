class RecentlyUsedBar {
    constructor() {
        this.container = document.createElement('div');
        this.container.classList.add('ru-container');
        if (realityEditor.device.environment.isDesktop()) {
            this.container.classList.add('ru-desktop');
        } else {
            this.container.classList.add('ru-mobile');
        }
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'ru-canvas';
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx = this.canvas.getContext('2d');

        this.iconElts = [];
        this.capacity = 3;
        this.hoveredFrameId = null;
        this.hoverAnimationPercent = 0;
        this.hoverAnimationDurationMs = 100; // speed of the slowest part of the line
        this.lastAnimationPositions = null;
        this.lastDraw = Date.now();
        this.canvasHasContent = false;

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
        this.onIconPointerDown = this.onIconPointerDown.bind(this);
        this.onIconPointerUp = this.onIconPointerUp.bind(this);
        this.onIconPointerOver = this.onIconPointerOver.bind(this);
        this.onIconPointerOut = this.onIconPointerOut.bind(this);
        this.onEnvelopeRegistered = this.onEnvelopeRegistered.bind(this);
        this.onOpen = this.onOpen.bind(this);
        this.onClose = this.onClose.bind(this);
        this.resetDrag = this.resetDrag.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
    }

    initService() {
        document.body.appendChild(this.container);
        document.body.appendChild(this.canvas);

        document.addEventListener('pointercancel', this.resetDrag);
        document.addEventListener('pointerup', this.resetDrag);
        document.addEventListener('pointermove', this.onPointerMove);

        realityEditor.device.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using server

        realityEditor.device.layout.onWindowResized(this.resizeCanvas.bind(this));
        this.renderCanvas();
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
        this.dragState.target.icon = this.getIcon(frameId);
        this.dragState.target.objectId = objectId;
        this.dragState.target.frameId = frameId;
    }

    onVehicleDeleted(event) {
        if (!event.objectKey || !event.frameKey || event.nodeKey) {
            return;
        }

        this.iconElts = this.iconElts.filter((iconElt) => {
            if (iconElt.dataset.frameId !== event.frameKey) {
                return true;
            }
            this.container.removeChild(iconElt);
            return false;
        });
        this.updateIconPositions();
    }

    onIconPointerDown(event) {
        const iconElt = event.target;
        this.setDragTarget(iconElt.dataset.objectId, iconElt.dataset.frameId);
        this.dragState.pointerDown = true;
    }

    onIconPointerUp(event) {
        const iconElt = event.target;
        const frameId = iconElt.dataset.frameId;
        let isFirstIcon = frameId === this.iconElts[0].dataset.frameId;
        iconElt.dataset.lastActive = Date.now();

        this.dragState.pointerDown = false;

        let alreadyFocused = false;
        realityEditor.envelopeManager.getOpenEnvelopes().forEach(function(envelope) {
            if (envelope.hasFocus) {
                if (envelope.frame === frameId && isFirstIcon) {
                    alreadyFocused = true;
                    return;
                }

                if (envelope.isFull2D) {
                    realityEditor.envelopeManager.closeEnvelope(envelope.frame);
                } else {
                    realityEditor.envelopeManager.blurEnvelope(envelope.frame);
                }
            }
        });

        if (alreadyFocused) {
            return;
        }

        realityEditor.envelopeManager.openEnvelope(frameId, false);
        realityEditor.envelopeManager.focusEnvelope(frameId, false);
    }

    onIconPointerOver(event) {
        const iconElt = event.target;
        this.hoveredFrameId = iconElt.dataset.frameId;
    }

    onIconPointerOut(event) {
        this.hoveredFrameId = null;

        const iconElt = event.target;
        if (this.dragState.pointerDown &&
            this.dragState.target.frameId === iconElt.dataset.frameId) {
            this.activateDrag();
        }
    }

    activateDrag() {
        if (this.dragState.didStartDrag) return;
        this.dragState.didStartDrag = true;

        //create ghost of button
        let target = this.dragState.target;
        let draggedIcon = this.createIconImg(target.objectId, target.frameId);
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

    onEnvelopeRegistered(frame) {
        const publicData = publicDataCache[frame.uuid];
        if (!publicData || !publicData.storage) {
            return;
        }
        if (typeof publicData.storage.envelopeLastOpen !== 'number') {
            return;
        }

        this.updateIcon(frame, publicData.storage.envelopeLastOpen);
    }

    onOpen(envelope) {
        const object = objects[envelope.object];
        if (!object) {
            return;
        }
        const frame = object.frames[envelope.frame];
        if (!frame) {
            return;
        }
        this.updateIcon(frame, Date.now());

        const icon = this.getIcon(envelope.frame);
        if (!icon) {
            return;
        }
        icon.classList.add('ru-icon-active');
    }

    onClose(envelope) {
        const icon = this.getIcon(envelope.frame);
        if (!icon) {
            return;
        }
        icon.classList.remove('ru-icon-active');
    }

    getIcon(frameId) {
        for (let i = 0; i < this.iconElts.length; i++) {
            if (this.iconElts[i].dataset.frameId === frameId) {
                return this.iconElts[i];
            }
        }
    }

    createIconImg(objectId, frameId) {
        let object = objects[objectId];
        let frame = object.frames[frameId];

        let icon = document.createElement('img');
        icon.classList.add('ru-icon');
        icon.dataset.newlyAdded = true;
        icon.style.position = 'absolute';
        // arbitrary amount to make the animation look good
        icon.style.top = '66px';

        if (object && frame) {
            icon.dataset.frameId = frame.uuid;
            icon.dataset.objectId = frame.objectId;
            let name = frame.src;
            icon.src = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/frames/' + name + '/icon.gif');
        }

        return icon;
    }

    updateIcon(frame, lastActive) {
        let icon = this.getIcon(frame.uuid);

        if (!icon) {
            icon = this.createIconImg(frame.objectId, frame.uuid);

            icon.addEventListener('pointerdown', this.onIconPointerDown);
            icon.addEventListener('pointerup', this.onIconPointerUp);
            // hovering over the button only makes sense on a desktop environment – touchscreens don't have hover
            if (realityEditor.device.environment.requiresMouseEvents()) {
                icon.addEventListener('pointerover', this.onIconPointerOver);
            }
            icon.addEventListener('pointerout', this.onIconPointerOut);
            icon.addEventListener('pointercancel', this.onIconPointerUp);

            this.iconElts.push(icon);

            this.container.prepend(icon);
        }

        icon.dataset.lastActive = lastActive;

        this.updateIconPositions();
    }

    updateIconPositions() {
        const animDur = 200;

        this.iconElts.sort((a, b) => {
            return parseFloat(b.dataset.lastActive) -
                parseFloat(a.dataset.lastActive);
        });
        realityEditor.gui.utilities.animateTranslations(this.iconElts, () => {
            // Match DOM order with our internal order
            for (let iconElt of this.iconElts) {
                if (iconElt.dataset.newlyAdded) {
                    delete iconElt.dataset.newlyAdded;
                    iconElt.style.position = '';
                    iconElt.style.transform = '';
                }
                this.container.removeChild(iconElt);
                this.container.appendChild(iconElt);
            }
        }, {
            duration: animDur,
            easing: 'ease-out',
        });

        for (let i = 0; i < this.capacity && i < this.iconElts.length; i++) {
            let iconInBar = this.iconElts[i];
            if (iconInBar.style.display !== 'none') {
                continue;
            }
            iconInBar.style.display = '';
            iconInBar.animate([{
                opacity: 0,
            }, {
                opacity: 1,
            }], {
                duration: animDur * 0.5,
                fill: 'both',
            });
        }

        for (let i = this.capacity; i < this.iconElts.length; i++) {
            let iconOutOfBar = this.iconElts[i];
            if (iconOutOfBar.style.display === 'none') {
                continue;
            }
            iconOutOfBar.animate([{
                opacity: 1,
            }, {
                opacity: 0,
            }], {
                duration: animDur * 0.5,
                fill: 'both',
            });

            setTimeout(() => {
                iconOutOfBar.style.display = 'none';
            }, animDur * 0.5);
        }
    }

    resizeCanvas() {
        if (this.canvas !== undefined) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    renderCanvas() {
        try {
            if (this.canvasHasContent) {
                this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            }

            this.updateAnimationPercent();

            if (this.hoverAnimationPercent <= 0) {
                this.lastAnimationPositions = null;
            } else {
                this.renderAnimation();
            }
        } catch (e) {
            console.warn(e);
        }
        requestAnimationFrame(this.renderCanvas.bind(this));
    }

    updateAnimationPercent() {
        let dt = Date.now() - this.lastDraw;
        this.lastDraw += dt;
        // the line animates forwards and backwards over time
        if (this.hoveredFrameId) {
            this.hoverAnimationPercent = Math.min(1,
                this.hoverAnimationPercent + (dt / this.hoverAnimationDurationMs));
        } else {
            // https://www.nngroup.com/articles/animation-duration/
            // "animating objects appearing or entering the screen usually need
            // a subtly longer duration than objects disappearing or exiting the screen"
            this.hoverAnimationPercent = Math.max(0,
                this.hoverAnimationPercent - 1.5 * (dt / this.hoverAnimationDurationMs));
        }
    }

    renderAnimation() {
        // draw animated line from hovered icon element to tool
        // if we stop hovering, draw a receding animation back to the last hovered icon element 
        if (!this.hoveredFrameId && !this.lastAnimationPositions) return;

        let frameScreenPosition = this.hoveredFrameId ?
            realityEditor.sceneGraph.getScreenPosition(this.hoveredFrameId, [0, 0, 0, 1]) :
            this.lastAnimationPositions.frame;

        let iconElt = this.getIcon(this.hoveredFrameId);
        if (this.hoveredFrameId && !iconElt) {
            this.hoveredFrameId = null;
            return;
        }

        let iconRect = this.hoveredFrameId ? iconElt.getBoundingClientRect() : null;
        let iconBottom = this.hoveredFrameId ?
            { x: iconRect.left + iconRect.width / 2,  y: iconRect.bottom } :
            this.lastAnimationPositions.icon;

        let lineStartX = iconBottom.x;
        let lineStartY = iconBottom.y + 5;
        let lineNextY = iconBottom.y + 15;

        // the line gets a fast, smooth, fade-in animation by having
        // multiple layers animate in/out with different speeds
        let animationLayers = [
            { speed: 1, opacity: 0.4 },
            { speed: 2, opacity: 0.2 },
            { speed: 3, opacity: 0.1 }
        ];

        animationLayers.forEach(layer => {
            this.ctx.beginPath();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = `rgba(255,255,255,${layer.opacity})`;
            this.ctx.moveTo(lineStartX, lineStartY);
            this.ctx.lineTo(lineStartX, lineNextY);

            let adjustedAnimPercent = Math.min(1, this.hoverAnimationPercent * layer.speed);

            // this calculates an animated endpoint for the line based on the hoverAnimationPercent
            let horizontalDistance = frameScreenPosition.x - lineStartX;
            let verticalDistance = frameScreenPosition.y - lineNextY;
            let horizontalPercent = Math.abs(horizontalDistance) / (Math.abs(horizontalDistance) + Math.abs(verticalDistance));
            let lineEndX = lineStartX + horizontalDistance *
                Math.min(1, adjustedAnimPercent / horizontalPercent);
            this.ctx.lineTo(lineEndX, lineNextY);
            let lineEndY = lineNextY + verticalDistance *
                Math.max(0, Math.min(1, (adjustedAnimPercent - horizontalPercent) / (1 - horizontalPercent)));
            this.ctx.lineTo(lineEndX, lineEndY);

            this.ctx.stroke();
            this.ctx.closePath();
        });

        this.canvasHasContent = true; // so we can clear the canvas only when necessary

        // keep track of the line's start and end, so we can do reverse animation
        // when you stop hovering over the active icon element
        if (this.hoveredFrameId) {
            this.lastAnimationPositions = {
                icon: { x: iconBottom.x, y: iconBottom.y },
                frame: { x: frameScreenPosition.x, y: frameScreenPosition.y }
            }
        }
    }
}

realityEditor.gui.recentlyUsedBar = new RecentlyUsedBar();
