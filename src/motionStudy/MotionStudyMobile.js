import {MotionStudy} from './motionStudy.js';

export class MotionStudyMobile extends MotionStudy {
    constructor(frame) {
        super(frame);
    }

    show2D() {
        // Only show timeline and other simple 2d ui
        if (!this.container.parentElement) {
            document.body.appendChild(this.container);
            this.timelineContainer.style.display = 'none';
        }
    }
}
