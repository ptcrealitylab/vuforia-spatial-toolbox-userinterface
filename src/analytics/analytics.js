import {Timeline} from './timeline.js';
import {
    setHighlightTimeInterval,
    setDisplayTimeInterval,
    setHoverTime,
    setHistoryLinesVisible,
} from '../humanPose/draw.js';
import {
    loadHistory
} from '../humanPose/index.js';

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
        setHistoryLinesVisible(true);
        this.added = true;
    }

    remove() {
        document.body.removeChild(this.container);
        setHistoryLinesVisible(false);
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
        if (!fromSpaghetti) {
            setHoverTime(time);
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
            setHighlightTimeInterval(highlightRegion.startTime, highlightRegion.endTime);
        }
    }

    /**
     * @param {{startTime: number, endTime: number}} region
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    async setDisplayRegion(region, fromSpaghetti) {
        this.timeline.setDisplayRegion(region);
        await loadHistory(region);
        if (region && !fromSpaghetti) {
            setDisplayTimeInterval(region.startTime, region.endTime);
        }
    }

    /**
     * @param {'reba'|'motion'} lens
     */
    setLens(lens) {
        console.error('setLens unimplemented', lens);
    }

    /**
     * @param {'bone'|'pose'} lensDetail
     */
    setLensDetail(lensDetail) {
        console.error('setLensDetail unimplemented', lensDetail);
    }

    /**
     * @param {string} spaghettiAttachPoint
     */
    setSpaghettiAttachPoint(spaghettiAttachPoint) {
        console.error('setSpaghettiAttachPoint unimplemented', spaghettiAttachPoint);
    }

    /**
     * @param {string} spaghettiVisible
     */
    setSpaghettiVisible(spaghettiVisible) {
        console.error('setSpaghettiVisible unimplemented', spaghettiVisible);
    }

    /**
     * @param {string} allClonesVisible
     */
    setAllClonesVisible(allClonesVisible) {
        console.error('setAllClonesVisible unimplemented', allClonesVisible);
    }
}
