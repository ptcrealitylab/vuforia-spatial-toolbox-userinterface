import {Timeline} from './timeline.js';
import {
    setHistoryTimeInterval,
} from '../humanPose/draw.js';

export class Analytics {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'analytics-container';
        this.timelineContainer = document.createElement('div');
        this.timelineContainer.id = 'analytics-timeline-container';
        this.container.appendChild(this.timelineContainer);
        this.timeline = new Timeline(this.timelineContainer);
        this.draw = this.draw.bind(this);
        requestAnimationFrame(this.draw);
        this.added = false;
    }

    add() {
        document.body.appendChild(this.container);
        this.added = true;
    }

    remove() {
        document.body.removeChild(this.container);
        this.added = false;
    }

    toggle() {
        if (this.added) {
            this.remove();
        } else {
            this.add();
        }
    }

    draw() {
        if (this.container.parentElement) {
            this.timeline.draw();
        }
        requestAnimationFrame(this.draw);
    }

    appendPose(pose) {
        this.timeline.appendPose(pose);
    }

    /**
     * @param {{startTime: number, endTime: number}} highlightRegion
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    setCursorTime(time, fromSpaghetti) {
        this.timeline.setCursorTime(time);
        if (time > 0 && !fromSpaghetti) {
            // setHistoryTimeInterval(time, -1);
        }
    }

    /**
     * @param {{startTime: number, endTime: number}} highlightRegion
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    setHighlightRegion(highlightRegion, fromSpaghetti) {
        this.timeline.setHighlightRegion(highlightRegion);
        if (highlightRegion && !fromSpaghetti) {
            setHistoryTimeInterval(highlightRegion.startTime, highlightRegion.endTime);
        }
    }
}
