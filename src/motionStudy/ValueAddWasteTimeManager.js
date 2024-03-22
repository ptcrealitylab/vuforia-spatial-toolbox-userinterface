import {Timeline} from '../utilities/Timeline.js';

export const ValueAddWasteTimeTypes = {
    VALUE_ADD: "VALUE",
    WASTE_TIME: "WASTE"
}

export class ValueAddWasteTimeManager extends Timeline {
    constructor() {
        super();
    }

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    markValueAdd(startTime, endTime) {
        if (this.isRegionPresent(startTime, endTime, ValueAddWasteTimeTypes.VALUE_ADD)) {
            this.clear(startTime, endTime); // Toggle off if already set to value add
            return;
        }
        this.insert(startTime, endTime, ValueAddWasteTimeTypes.VALUE_ADD);
    }

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    markWasteTime(startTime, endTime) {
        if (this.isRegionPresent(startTime, endTime, ValueAddWasteTimeTypes.WASTE_TIME)) {
            this.clear(startTime, endTime); // Toggle off if already set to waste time
            return;
        }
        this.insert(startTime, endTime, ValueAddWasteTimeTypes.WASTE_TIME);
    }
}
