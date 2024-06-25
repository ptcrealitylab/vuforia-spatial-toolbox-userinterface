export class CreateStepSensorsButton {
    constructor(motionStudy) {
        this.motionStudy = motionStudy;

        this.onClick = this.onClick.bind(this);

        this.container = document.createElement('div');
        this.container.classList.add('analytics-button-container');

        const id = 'analytics-create-step-sensors';

        this.buttonInputLabel = document.createElement('label');
        this.buttonInputLabel.setAttribute('for', id);
        this.buttonInputLabel.textContent = 'Create Step Sensors';

        this.buttonInput = document.createElement('input');
        this.buttonInput.id = id;
        this.buttonInput.classList.add('analytics-button-input');
        this.buttonInput.type = 'button';
        this.buttonInput.addEventListener('click', this.onClick);

        this.container.appendChild(this.buttonInputLabel);
        this.container.appendChild(this.buttonInput);
    }

    show() {
        this.container.style.display = '';
    }

    hide() {
        this.container.style.display = 'none';
    }

    async onClick() {
        for (let regionCard of this.motionStudy.pinnedRegionCards) {
            regionCard.createPolygonSensor();
        }
    }
}

