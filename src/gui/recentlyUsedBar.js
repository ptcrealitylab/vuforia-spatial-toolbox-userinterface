class RecentlyUsedBar {
    constructor() {
        this.container = document.createElement('div');
        this.container.classList.add('ru-container');
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
        realityEditor.envelopeManager.openEnvelope(frameId, false);
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
    }

    updateIcon(frame, lastActive) {
        let object = objects[frame.objectId];
        let icon;
        for (let i = 0; i < this.iconElts.length; i++) {
            if (this.iconElts[i].dataset.frameId === frame.uuid) {
                icon = this.iconElts[i];
                break;
            }
        }

        if (!icon) {
            icon = document.createElement('img');
            icon.classList.add('ru-icon');
            icon.dataset.frameId = frame.uuid;
            icon.dataset.newlyAdded = true;
            icon.style.position = 'absolute';
            // width-ish amount to make the animation look good
            icon.style.left = '-54px';

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
        const animDur = 1000;

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
            // easing: 'linear',
        });

        if (this.iconElts.length > this.capacity) {
            let last = this.iconElts.pop();
            last.animate([{
                opacity: 1,
            }, {
                opacity: 0,
            }], {
                duration: animDur,
            });

            setTimeout(() => {
                this.container.removeChild(last);
            }, animDur);
        }
    }
}

realityEditor.gui.recentlyUsedBar = new RecentlyUsedBar();
