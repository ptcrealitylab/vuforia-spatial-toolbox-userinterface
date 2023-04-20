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
        this.ctx = this.canvas.getContext("2d");

        this.iconElts = [];
        this.capacity = 3;
        this.hoveredFrameId = null;
        this.hoverAnimationPercent = 0;
        this.hoverAnimationDurationMs = 60; // speed of the slowest part of the line
        this.lastAnimationPositions = null;
        this.lastDraw = Date.now();
        this.canvasHasContent = false;

        this.onVehicleDeleted = this.onVehicleDeleted.bind(this);
        this.onIconPointerDown = this.onIconPointerDown.bind(this);
        this.onIconPointerOver = this.onIconPointerOver.bind(this);
        this.onIconPointerOut = this.onIconPointerOut.bind(this);
        this.onEnvelopeRegistered = this.onEnvelopeRegistered.bind(this);
        this.onOpen = this.onOpen.bind(this);
        this.onClose = this.onClose.bind(this);
    }

    initService() {
        document.body.appendChild(this.container);
        document.body.appendChild(this.canvas);

        realityEditor.device.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', this.onVehicleDeleted); // deleted using server

        realityEditor.device.layout.onWindowResized(this.resizeCanvas.bind(this));
        this.renderCanvas();
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
        const frameId = iconElt.dataset.frameId;
        let isFirstIcon = frameId === this.iconElts[0].dataset.frameId;
        iconElt.dataset.lastActive = Date.now();

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

    onIconPointerOut(_event) {
        this.hoveredFrameId = null;
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

    updateIcon(frame, lastActive) {
        let object = objects[frame.objectId];
        let icon = this.getIcon(frame.uuid);

        if (!icon) {
            // Don't bother adding icons that won't appear in the final list
            // due to being old
            if (this.iconElts.length === this.capacity) {
                let oldestIcon = this.iconElts[this.iconElts.length - 1];
                let oldestTime = parseFloat(oldestIcon.dataset.lastActive);
                if (oldestTime > lastActive) {
                    return;
                }
            }

            icon = document.createElement('img');
            icon.classList.add('ru-icon');
            icon.dataset.frameId = frame.uuid;
            icon.dataset.newlyAdded = true;
            icon.style.position = 'absolute';
            // arbitrary amount to make the animation look good
            icon.style.top = '66px';

            let name = frame.src;
            icon.src = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/frames/' + name + '/icon.gif');

            icon.addEventListener('pointerdown', this.onIconPointerDown);
            icon.addEventListener('pointerover', this.onIconPointerOver);
            icon.addEventListener('pointerout', this.onIconPointerOut);

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

        if (this.iconElts.length > this.capacity) {
            let last = this.iconElts.pop();
            last.animate([{
                opacity: 1,
            }, {
                opacity: 0,
            }], {
                duration: animDur * 0.5,
                fill: 'both',
            });

            setTimeout(() => {
                this.container.removeChild(last);
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

        let iconRect = this.hoveredFrameId ? this.getIcon(this.hoveredFrameId).getBoundingClientRect() : null;
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
