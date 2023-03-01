import {getMeasurementTextLabel} from '../humanPose/spaghetti.js';
import {JOINTS} from "../humanPose/utils.js";

const cardWidth = 200;
const rowHeight = 22;

const svgNS = 'http://www.w3.org/2000/svg';

export const RegionCardState = {
    Tooltip: 'Tooltip', // an ephemeral tooltip on the timeline
    Pinned: 'Pinned', // a regioncard displayed with statistics
};

/**
 * A Region Card contains a full summary of a given [start time, end time]
 * region on the timeline
 *
 * For example:
 * 12/12/22, 12:10:58 - 12:11:20
 * 5m traveled in 22s
 * REBA <sparkline>
 * Avg: 4 Low: 1
 * MoEc <sparkline>
 * Avg: 12 Low: 2
 */
export class RegionCard {
    /**
     * @param {Element} container
     * @param {Array<Pose>} poses - the poses to process in this region card
     */
    constructor(container, poses) {
        this.container = container;
        this.poses = poses;
        this.element = document.createElement('div');
        this.dateTimeFormat = new Intl.DateTimeFormat('default', {
            // dateStyle: 'short',
            timeStyle: 'medium',
            hour12: false,
        });
        this.state = RegionCardState.Tooltip;
        // If a region card has control over the timeline's displayed points
        this.displayActive = false;
        this.onPointerOver = this.onPointerOver.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerOut = this.onPointerOut.bind(this);
        this.onClickPin = this.onClickPin.bind(this);
        this.onClickView = this.onClickView.bind(this);

        this.createCard();

        this.element.addEventListener('pointerover', this.onPointerOver);
        this.element.addEventListener('pointerdown', this.onPointerDown);
        this.element.addEventListener('pointerout', this.onPointerOut);
        this.container.appendChild(this.element);
    }

    onPointerOver() {
        this.element.classList.remove('minimized');
        // if (this.state === RegionCardState.Pinned) {
        //     realityEditor.analytics.setHighlightRegion({
        //         startTime: this.startTime,
        //         endTime: this.endTime,
        //     });
        // }
    }

    onPointerOut() {
        this.element.classList.add('minimized');
    }

    onPointerDown() {
    }

    onClickPin() {
        switch (this.state) {
        case RegionCardState.Tooltip:
            this.pin();
            break;
        case RegionCardState.Pinned:
            this.unpin();
            break;
        }

        event.stopPropagation();
    }

    onClickView() {
        switch (this.state) {
        case RegionCardState.Tooltip:
            this.pin();
            break;
        case RegionCardState.Pinned:
            if (this.displayActive) {
                realityEditor.analytics.setHighlightRegion(null);
            } else {
                realityEditor.analytics.setHighlightRegion({
                    startTime: this.startTime,
                    endTime: this.endTime,
                });
            }
            this.displayActive = !this.displayActive;
            break;
        }
    }

    pin() {
        this.state = RegionCardState.Pinned;
        const rect = this.element.getBoundingClientRect();

        this.switchContainer(document.body);

        this.element.style.bottom = 'auto';
        this.moveTo(rect.left, rect.top);
        this.element.classList.add('pinAnimation', 'minimized');

        realityEditor.analytics.pinRegionCard(this);
    }

    save() {
        let addedTool = realityEditor.spatialCursor.addToolAtScreenCenter('spatialAnalytics');
        const frameKey = addedTool.uuid;
        const publicData = {
            startTime: this.startTime,
            endTime: this.endTime,
            summary: this.element.outerHTML,
        };
        const write = () => {
            realityEditor.network.realtime.writePublicData(addedTool.objectId, frameKey, frameKey + 'storage', 'status', publicData);
        };
        setTimeout(write, 1000);
        setTimeout(write, 2000);
    }

    removePinAnimation() {
        this.element.classList.remove('pinAnimation');
        this.element.classList.add('pinned');
        this.element.style.top = 'auto';
        this.element.style.left = 'auto';
    }

    unpin() {
        console.log('unpin');
        this.remove();
        if (this.displayActive) {
            realityEditor.analytics.setDisplayRegion(null);
        }
    }

    createCard() {
        if (this.poses.length === 0) {
            return;
        }
        this.startTime = this.poses[0].timestamp;
        this.endTime = this.poses[this.poses.length - 1].timestamp;
        this.element.classList.add('analytics-region-card');
        this.element.classList.add('minimized');

        const dateTimeTitle = document.createElement('div');
        dateTimeTitle.classList.add('analytics-region-card-title');
        dateTimeTitle.textContent = this.dateTimeFormat.formatRange(
            new Date(this.startTime),
            new Date(this.endTime),
        );

        const motionSummary = document.createElement('div');
        motionSummary.classList.add('analytics-region-card-subtitle');
        motionSummary.textContent = this.getMotionSummaryText();

        this.element.appendChild(dateTimeTitle);
        this.element.appendChild(motionSummary);

        this.createGraphSection('REBA', pose => pose.getJoint(JOINTS.HEAD).overallRebaScore);

        const pinButton = document.createElement('a');
        pinButton.href = '#';
        pinButton.classList.add('analytics-region-card-pin');
        pinButton.textContent = 'Pin';
        pinButton.addEventListener('click', this.onClickPin);
        this.element.appendChild(pinButton);

        const viewButton = document.createElement('a');
        viewButton.href = '#';
        viewButton.classList.add('analytics-region-card-view');
        viewButton.textContent = 'View';
        viewButton.addEventListener('click', this.onClickView);
        this.element.appendChild(viewButton);
    }

    getMotionSummaryText() {
        let distanceMm = 0;
        
        this.poses.forEach((pose, index) => {
            if (index === 0) return;
            const previousPose = this.poses[index - 1];
            const joint = pose.getJoint(JOINTS.HEAD);
            const previousJoint = previousPose.getJoint(JOINTS.HEAD);
            const dx = joint.position.x - previousJoint.position.x;
            const dy = joint.position.y - previousJoint.position.y;
            const dz = joint.position.z - previousJoint.position.z;
            distanceMm += Math.sqrt(dx * dx + dy * dy + dz * dz);
        });

        return getMeasurementTextLabel(distanceMm, this.endTime - this.startTime);
    }

    createGraphSection(titleText, poseValueFunction) {
        let title = document.createElement('div');
        title.classList.add('analytics-region-card-graph-section-title');
        title.textContent = titleText;

        let sparkLine = document.createElementNS(svgNS, 'svg');
        sparkLine.classList.add('analytics-region-card-graph-section-sparkline');
        sparkLine.setAttribute('width', cardWidth / 3);
        sparkLine.setAttribute('height', rowHeight);
        sparkLine.setAttribute('xmlns', svgNS);

        let summaryValues = this.getSummaryValues(poseValueFunction);

        let path = document.createElementNS(svgNS, 'path');
        path.setAttribute('stroke-width', '1');
        path.setAttribute('d', this.getSparkLinePath(poseValueFunction, summaryValues));

        sparkLine.appendChild(path);

        let minReba = 1;
        let maxReba = 12;

        let average = document.createElement('div');
        average.classList.add('analytics-region-card-graph-section-value');
        average.textContent = 'Avg: ';
        average.appendChild(this.makeSummaryValue(summaryValues.average, minReba, maxReba));

        let minimum = document.createElement('div');
        minimum.classList.add('analytics-region-card-graph-section-value');
        minimum.textContent = 'Min: ';
        minimum.appendChild(this.makeSummaryValue(summaryValues.minimum, minReba, maxReba));

        let maximum = document.createElement('div');
        maximum.classList.add('analytics-region-card-graph-section-value');
        maximum.textContent = 'Max: ';
        maximum.appendChild(this.makeSummaryValue(summaryValues.maximum, minReba, maxReba));

        this.element.appendChild(title);
        this.element.appendChild(sparkLine);
        this.element.appendChild(average);
        this.element.appendChild(minimum);
        this.element.appendChild(maximum);
    }

    /**
     * @param {number} val
     * @param {number} min
     * @param {number} max
     * @return {Element} span containing text val with color based on val's position within min and max
     */
    makeSummaryValue(val, min, max) {
        let span = document.createElement('span');
        span.textContent = val.toFixed(1);
        let hue = (max - val) / (max - min) * 120;
        span.style.color = `hsl(${hue}, 100%, 50%)`;
        return span;
    }

    getSparkLinePath(poseValueFunction, summaryValues) {
        let minX = this.startTime;
        let maxX = this.endTime;
        let minY = summaryValues.minimum - 0.5;
        let maxY = summaryValues.maximum + 0.5;
        let width = cardWidth / 3;
        let height = rowHeight;
        let path = 'M ';
        for (let i = 0; i < this.poses.length; i++) {
            const pose = this.poses[i];
            const val = poseValueFunction(pose);
            const x = Math.round((pose.timestamp - minX) / (maxX - minX) * width);
            const y = Math.round((maxY - val) / (maxY - minY) * height);
            path += x + ' ' + y;
            if (i < this.poses.length - 1) {
                let nextPose = this.poses[i + 1];
                if (nextPose.timestamp - pose.timestamp < 500) {
                    path += ' L ';
                } else {
                    path += ' M ';
                }
            }
        }
        return path;
    }

    getSummaryValues(poseValueFunction) {
        let average = 0;
        let minimum = 9001 * 9001;
        let maximum = -minimum;
        for (const pose of this.poses) {
            const val = poseValueFunction(pose);
            average += val;
            minimum = Math.min(minimum, val);
            maximum = Math.max(maximum, val);
        }
        average /= this.poses.length;
        return {
            average,
            minimum,
            maximum,
        };
    }

    moveTo(x, y) {
        this.element.style.left = x + 'px';
        if (this.state === RegionCardState.Pinned) {
            this.element.style.top = y + 'px';
        } else {
            this.element.style.bottom = y + 'px';
        }
    }

    remove() {
        this.container.removeChild(this.element);
    }

    switchContainer(newContainer) {
        this.remove();
        this.container = newContainer;
        this.container.appendChild(this.element);
    }
}
