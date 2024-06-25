export class ImportStepsButton {
    constructor(motionStudy, windchill) {
        this.motionStudy = motionStudy;
        this.windchill = windchill;

        this.onImportClick = this.onImportClick.bind(this);

        this.container = document.createElement('div');
        this.container.id = 'analytics-step-file-upload-container';
        this.container.classList.add('analytics-button-container');

        this.stepFileInputLabel = document.createElement('label');
        // this.stepFileInputLabel.classList.add('analytics-step');
        this.stepFileInputLabel.setAttribute('for', 'analytics-step-file');
        this.stepFileInputLabel.textContent = 'Load Process Plan';

        this.stepFileInput = document.createElement('input');
        this.stepFileInput.id = 'analytics-step-file';
        this.stepFileInput.type = 'button';
        this.stepFileInput.addEventListener('click', this.onImportClick);

        this.container.appendChild(this.stepFileInputLabel);
        this.container.appendChild(this.stepFileInput);
    }

    show() {
        this.container.style.display = '';
    }

    hide() {
        this.container.style.display = 'none';
    }

    async onImportClick() {
        let plans = await this.windchill.getProcessPlans('VR_DEMO_PP');
        console.log('found process plans', plans);
        let plan = plans[0];
        this.motionStudy.setProcessPlan(plan);
        this.motionStudy.titleInput.textContent = plan.name;
    }
}
