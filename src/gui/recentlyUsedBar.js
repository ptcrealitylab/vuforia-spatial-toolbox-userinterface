class RecentlyUsedBar {
    constructor() {
        this.container = document.createElement('div');
        this.container.classList.add('ru-container');
        if (realityEditor.device.environment.isDesktop()) {
            this.container.classList.add('ru-desktop');
        } else {
            this.container.classList.add('ru-mobile');
        }
        this.iconElts = [];
        this.capacity = 3;
        this.onVehicleDeleted = this.onVehicleDeleted.bind(this);
        this.onIconPointerOver = this.onIconPointerOver.bind(this);
        this.onIconPointerOut = this.onIconPointerOut.bind(this);
        this.hoveredFrameId = null;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'ru-canvas';
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx = this.canvas.getContext("2d");
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
        iconElt.dataset.lastActive = Date.now();

        realityEditor.envelopeManager.getOpenEnvelopes().forEach(function(envelope) {
            if (envelope.hasFocus) {
                realityEditor.envelopeManager.closeEnvelope(envelope.frame);
            }
        });
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
            this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            if (this.hoveredFrameId) {
                let frameScreenPosition = realityEditor.sceneGraph.getScreenPosition(this.hoveredFrameId, [0, 0, 0, 1]);
                let iconElt = this.iconElts.find((iconElt) => {
                    return iconElt.dataset.frameId === this.hoveredFrameId;
                });
                if (!iconElt) {
                    this.hoveredFrameId = null;
                } else {
                    let iconScreenPosition = iconElt.getBoundingClientRect();
                    let iconBottom = {
                        x: iconScreenPosition.left + iconScreenPosition.width/2,
                        y: iconScreenPosition.bottom
                    }
                    // draw a line from iconScreenPosition to frameScreenPosition
                    this.ctx.beginPath();
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.moveTo(iconBottom.x, iconBottom.y + 5);
                    this.ctx.lineTo(iconBottom.x, iconBottom.y + 15);
                    this.ctx.lineTo(frameScreenPosition.x, iconBottom.y + 15);
                    this.ctx.lineTo(frameScreenPosition.x, frameScreenPosition.y);
                    this.ctx.stroke();
                    this.ctx.closePath();
                }
            }
        } catch (e) {
            console.warn(e);
        }
        requestAnimationFrame(this.renderCanvas.bind(this));
    }
}

realityEditor.gui.recentlyUsedBar = new RecentlyUsedBar();
