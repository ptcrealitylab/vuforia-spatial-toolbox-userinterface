import {
    postPersistRequest,
} from './utils.js';

export class AnalyticsMobile {
    constructor() {
        this.livePlayback = false;
    }

    open() {
    }

    close() {
    }

    focus() {
    }

    blur() {
    }

    appendPose() {
    }

    setCursorTime() {
    }

    setHighlightRegion() {
    }

    /**
     * @param {{startTime: number, endTime: number}} region
     * @param {boolean} _fromSpaghetti - unused
     */
    async setDisplayRegion(region, _fromSpaghetti) {
        let livePlayback = region.startTime < 0 || region.endTime < 0;
        if (this.livePlayback && !livePlayback) {
            await postPersistRequest();
        }
        this.livePlayback = livePlayback;
    }

    hydrateRegionCards() {
    }

    setLens() {
    }

    setLensDetail() {
    }

    setSpaghettiAttachPoint() {
    }

    setSpaghettiVisible() {
    }

    setAllClonesVisible() {
    }
}
