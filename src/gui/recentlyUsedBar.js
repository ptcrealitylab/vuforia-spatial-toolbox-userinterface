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
    }

    initService() {
        document.body.appendChild(this.container);
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
}

realityEditor.gui.recentlyUsedBar = new RecentlyUsedBar();
