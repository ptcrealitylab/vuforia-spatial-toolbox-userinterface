import {Analytics} from './analytics.js';

export class AnalyticsMobile extends Analytics {
    constructor(frame) {
        super(frame);
    }

    show2D() {
        // intentional no-op
    }
}
