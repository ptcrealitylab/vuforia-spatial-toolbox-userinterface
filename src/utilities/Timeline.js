/**
 * A Region represents a chunk of time [startTime, endTime) with a given value.
 */
export class Region {
    /**
     * @param {number} startTime - The start of the Region
     * @param {number} endTime - The end of the Region
     * @param {*} value - The value assigned to this Region
     */
    constructor(startTime, endTime, value) {
        if (startTime > endTime) {
            this.startTime = endTime;
            this.endTime = startTime
        } else {
            this.startTime = startTime;
            this.endTime = endTime;
        }
        this.value = value;
    }

    /**
     * Returns true iff the two Regions have equal properties.
     * @param {Region} other
     * @returns {boolean}
     */
    equals(other) {
        return this.startTime === other.startTime && this.endTime === other.endTime && this.value === other.value;
    }

    /**
     * Returns true iff the two Regions have equal start and end times.
     * @param {Region} other
     * @returns {boolean}
     */
    rangeEquals(other) {
        return this.startTime === other.startTime && this.endTime === other.endTime;
    }

    /**
     * Returns true iff other is a (loose) subset of this.
     * @param {Region} other
     * @returns {boolean}
     */
    isSubsetOf(other) {
        return other.startTime <= this.startTime && other.endTime >= this.endTime;
    }

    /**
     * Returns true iff other is a (loose) superset of this.
     * @param {Region} other
     * @returns {boolean}
     */
    isSupersetOf(other) {
        return other.isSubsetOf(this);
    }

    /**
     * Returns true iff other overlaps with this.
     * @param {Region} other
     * @returns {boolean}
     */
    hasOverlapWith(other) {
        return this.includes(other.startTime) || other.includes(this.startTime);
    }

    /**
     * Returns true iff other is immediately before or immediately after this.
     * @param {Region} other
     * @returns {boolean}
     */
    isAdjacentTo(other) {
        return this.startTime === other.endTime || this.endTime === other.startTime;
    }

    /**
     * Returns true iff other is entirely before this.
     * @param {Region} other
     * @returns {boolean}
     */
    isEntirelyBefore(other) {
        return this.endTime <= other.startTime;
    }

    /**
     * Returns true iff other is entirely after this.
     * @param {Region} other
     * @returns {boolean}
     */
    isEntirelyAfter(other) {
        return other.isEntirelyBefore(this);
    }

    /**
     * Returns true iff time is in the Region's range
     * @param {number} time
     * @returns {boolean}
     */
    includes(time) {
        return time >= this.startTime && time < this.endTime;
    }

    /**
     * Returns an array of Regions representing what results from subtracting another Region from this Region.
     * @param {Region} other - The Region to subtract from this Region.
     * @returns {Region[]} - The resulting Regions.
     */
    subtract(other) {
        if (!this.hasOverlapWith(other)) {
            return [this.clone()];
        }
        if (this.isSubsetOf(other)) {
            return [];
        }
        if (this.isSupersetOf(other)) {
            return [
                new Region(this.startTime, other.startTime, this.value),
                new Region(other.endTime, this.endTime, this.value)
            ].filter(region => region.startTime !== region.endTime);
        }
        if (this.startTime < other.startTime) {
            return [new Region(this.startTime, other.startTime, this.value)];
        }
        return [new Region(other.endTime, this.endTime, this.value)];
    }

    /**
     * Merges this Region with another. This is done by taking the outermost bounds of the regions and treating them as
     * contiguous.
     * @param {Region} other - The Region to merge with this Region.
     * @returns {Region} - The resulting Region.
     */
    merge(other) {
        if (this.value !== other.value) {
            throw new Error('Cannot merge Regions of different values');
        }
        return new Region(Math.min(this.startTime, other.startTime), Math.max(this.endTime, other.endTime), this.value);
    }

    /**
     * Returns an identical Region
     * @returns {Region}
     */
    clone() {
        return new Region(this.startTime, this.endTime, this.value);
    }

    /**
     * @returns {Object} - A JSON representation for storage purposes
     */
    toJSON() {
        return {
            startTime: this.startTime,
            endTime: this.endTime,
            value: this.value
        };
    }

    /**
     * Returns a new Region that represents the data stored in the given json object
     * @param {Object} json
     * @returns {Region}
     */
    static fromJSON(json) {
        return new Region(json.startTime, json.endTime, json.value);
    }
}

/**
 * Manages a non-overlapping, sorted list of Regions that are annotated with values.
 * Added Regions overwrite overlapped parts of existing Regions.
 */
export class Timeline {
    constructor() {
        /** @type {Region[]} */
        this.regions = [];
    }

    /**
     * Used internally by the class to insert Regions and keep the array sorted, could be sped up with a binary search if needed.
     * Assumes space has already been cleared out for the new Region.
     * @param {Region} region - The Region to be added.
     */
    addRegion(region) {
        for (let index = 0; index < this.regions.length; index++) {
            if (this.regions[index].isAdjacentTo(region) && this.regions[index].value === region.value) {
                if (index < this.regions.length - 1 && this.regions[index + 1].isAdjacentTo(region) && this.regions[index + 1].value === region.value) {
                    const mergedRegion = this.regions[index].merge(region).merge(this.regions[index + 1]);
                    this.regions.splice(index, 2, mergedRegion);
                    return;
                }
                this.regions[index] = this.regions[index].merge(region);
                return;
            }
            if (this.regions[index].isEntirelyAfter(region)) {
                this.regions.splice(index, 0, region);
                return;
            }
        }
        this.regions.push(region);
    }

    /**
     * Used internally by the class to simplify Region removal, could be sped up with a binary search.
     * @param {Region} region - The Region to be removed.
     */
    removeRegion(region) {
        if (this.regions.includes(region)) {
            this.regions.splice(this.regions.indexOf(region), 1);
        }
    }

    /**
     * Used internally by the class to modify its Regions before adding a new one, could be sped up with a binary search.
     * @param {Region} newRegion - The Region to make room for.
     */
    makeRoomForRegion(newRegion) {
        let startRemovalIndex = -1;
        let endRemovalIndex = -1;
        for (let index = 0; index < this.regions.length; index++) {
            const region = this.regions[index];
            if (newRegion.rangeEquals(region)) {
                this.removeRegion(region);
                return; // Only a single operation is needed, return immediately
            }
            if (newRegion.isSubsetOf(region)) {
                this.removeRegion(region);
                // There are (up to) two Regions on either side of newRegion that need to be re-added
                region.subtract(newRegion).forEach(remainingRegion => {
                    this.addRegion(remainingRegion);
                })
                return; // Only a single operation is needed, return immediately
            }
            if (newRegion.isSupersetOf(region)) {
                if (startRemovalIndex === -1) {
                    startRemovalIndex = index;
                }
                endRemovalIndex = index;
                continue; // Multiple removals may be needed, continue
            }
            if (newRegion.hasOverlapWith(region)) {
                // Guaranteed to be contiguous after subtraction since newRegion is not a subset
                // Region can be replaced in place without breaking for loop
                this.regions[index] = region.subtract(newRegion)[0];
                continue; // Multiple removals may be needed, continue
            }
            if (newRegion.isEntirelyBefore(region)) {
                // No more elements to consider
                break; // Given that the regions array is sorted, we can now remove regions queued for removal
            }
        }
        if (startRemovalIndex === -1) {
            return; // No removals were necessary
        }
        this.regions.splice(startRemovalIndex, endRemovalIndex - startRemovalIndex + 1);
    }

    /**
     * Creates and inserts a Region into the Timeline
     * @param {number} startTime - the start of the region
     * @param {number} endTime - the end of the region
     * @param {*} value - the value for the region to take
     */
    insert(startTime, endTime, value) {
        const region = new Region(startTime, endTime, value);
        this.makeRoomForRegion(region);
        this.addRegion(region);
    }

    /**
     * Modifies and removes Regions within the given range to clear that range on the Timeline
     * @param {number} startTime - the start of the region
     * @param {number} endTime - the end of the region
     */
    clear(startTime, endTime) {
        const regionToClear = new Region(startTime, endTime, "");
        this.makeRoomForRegion(regionToClear);
    }

    /**
     * Returns true iff the given region is a subset of an existing region of the same type
     * @param {number} startTime - the start of the region
     * @param {number} endTime - the end of the region
     * @param {*} value - the value for the region to take
     * @returns {boolean}
     */
    isRegionPresent(startTime, endTime, value) {
        const testRegion = new Region(startTime, endTime, value);
        return this.regions.some(region => region.isSupersetOf(testRegion) && region.value === testRegion.value);
    }

    /**
     * @param {number} time - The time to get the value from
     * @returns {*} - The value at the given time, null if no range matches that time
     */
    getValue(time) {
        const region = this.regions.find(region => region.includes(time));
        if (!region) {
            return null;
        }
        return region.value;
    }

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @returns {*} - The value for the given range, null if no single region covers that range
     */
    getValueForRegion(startTime, endTime) {
        const testRegion = new Region(startTime, endTime, null);
        const region = this.regions.find(region => region.isSupersetOf(testRegion));
        if (region) {
            return region.value;
        }
        return null;
    }

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @returns {Timeline} - A subset of this Timeline that starts and ends at `startTime` and `endTime`
     */
    subset(startTime, endTime) {
        const subsetRegion = new Region(startTime, endTime, null);
        const timeline = new Timeline();
        this.regions.filter(region => region.hasOverlapWith(subsetRegion)).forEach(region => {
            if (!region.isSubsetOf(subsetRegion)) {
                // Region needs to be cut off
                if (region.isSupersetOf(subsetRegion)) {
                    timeline.addRegion(new Region(startTime, endTime, region.value));
                    return;
                }
                if (region.startTime < startTime) {
                    timeline.addRegion(new Region(startTime, region.endTime, region.value));
                    return;
                }
                timeline.addRegion(new Region(region.startTime, endTime, region.value));
                return;
            }
            timeline.addRegion(region.clone());
        });
        return timeline;
    }

    /**
     * Clears this Timeline and replicates the contents of `other`
     * @param {Timeline} other
     * @returns {Timeline} this
     */
    copy(other) {
        this.regions.splice(0, this.regions.length);
        other.regions.forEach(region => {
            this.addRegion(region.clone());
        });
        return this;
    }

    /**
     * @returns {Object} - A JSON representation for storage purposes
     */
    toJSON() {
        return {
            regions: this.regions.map(region => region.toJSON())
        };
    }

    /**
     * Modifies this Timeline to represent the data stored in the given json object
     * @param {Object} json
     * @returns {Timeline} - this
     */
    fromJSON(json) {
        this.copy(Timeline.fromJSON(json));
        return this;
    }

    /**
     * Returns a new Timeline that represents the data stored in the given json object
     * @param {Object} json
     * @returns {Timeline}
     */
    static fromJSON(json) {
        const timeline = new Timeline();
        json.regions.map(regionData => Region.fromJSON(regionData)).forEach(region => {
            timeline.addRegion(region);
        });
        return timeline;
    }
}
