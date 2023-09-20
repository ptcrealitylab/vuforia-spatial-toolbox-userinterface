import {Analytics} from './analytics.js';

export class AnalyticsMobile extends Analytics {
    constructor(frame) {
        super(frame);
    }

    show2D() {
        // Only show timeline and other simple 2d ui
        if (!this.container.parentElement) {
            document.body.appendChild(this.container);
        }
    }
}
