import {getMeasurementTextLabel} from '../humanPose/spaghetti.js';
import {JOINTS} from '../humanPose/constants.js';
import {ValueAddWasteTimeTypes} from './ValueAddWasteTimeManager.js';

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
     * @param {MotionStudy} motionStudy - parent instance of MotionStudy
     * @param {Element} container
     * @param {Array<Pose>} poses - the poses to process in this region card
     * @param {{startTime: number, endTime: number}?} desc - If present, the
     * dehydrated description of this card
     */
    constructor(motionStudy, container, poses, desc) {
        this.motionStudy = motionStudy;
        this.container = container;
        this.poses = poses;
        this.element = document.createElement('div');
        this.dateTimeFormat = new Intl.DateTimeFormat('default', {
            // dateStyle: 'short',
            timeStyle: 'medium',
            hour12: false,
        });
        this.state = RegionCardState.Tooltip;
        this.accentColor = '';
        // If a region card has control over the timeline's displayed points
        this.displayActive = false;
        this.onPointerOver = this.onPointerOver.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerOut = this.onPointerOut.bind(this);
        this.onClickPin = this.onClickPin.bind(this);
        this.onClickShow = this.onClickShow.bind(this);

        this.createCard();
        if (desc) {
            this.startTime = desc.startTime;
            this.endTime = desc.endTime;
        }
        this.setPoses(poses);
        this.updateValueAddWasteTimeUi();

        this.element.addEventListener('pointerover', this.onPointerOver);
        this.element.addEventListener('pointerdown', this.onPointerDown);
        this.element.addEventListener('pointermove', this.onPointerMove);
        this.element.addEventListener('pointerout', this.onPointerOut);
        this.container.appendChild(this.element);
    }

    onPointerOver() {
        this.element.classList.remove('minimized');
        // if (this.state === RegionCardState.Pinned) {
        //     this.motionStudy.setHighlightRegion({
        //         startTime: this.startTime,
        //         endTime: this.endTime,
        //     });
        // }
    }

    onPointerOut() {
        this.element.classList.add('minimized');
    }

    onPointerDown(e) {
        e.stopPropagation();
    }

    onPointerMove(e) {
        e.stopPropagation();
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

    onClickShow() {
        switch (this.state) {
        case RegionCardState.Tooltip:
            this.pin();
            break;
        case RegionCardState.Pinned:
            if (this.displayActive) {
                this.motionStudy.setActiveRegionCard(null);
                this.motionStudy.setHighlightRegion(null);
                this.motionStudy.setCursorTime(-1);
                this.displayActive = false;
            } else {
                this.motionStudy.setActiveRegionCard(this);
                this.motionStudy.setHighlightRegion({
                    startTime: this.startTime,
                    endTime: this.endTime,
                    label: this.getLabel(),
                });
                this.displayActive = true;
            }
            break;
        }
        this.updateDisplayActive();
    }

    pin() {
        this.state = RegionCardState.Pinned;
        const rect = this.element.getBoundingClientRect();

        this.switchContainer(document.body);

        this.element.style.bottom = 'auto';
        this.moveTo(rect.left, rect.top);
        this.element.classList.add('pinAnimation', 'minimized');
        this.updatePinButtonText();

        this.motionStudy.pinRegionCard(this);
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
        this.updatePinButtonText();
    }

    unpin() {
        this.remove();
        this.motionStudy.unpinRegionCard(this);
    }

    updatePinButtonText() {
        let pinButton = this.element.querySelector('#analytics-region-card-step');
        if (pinButton) {
            pinButton.textContent = this.state === RegionCardState.Pinned ? 'Remove Step' : 'Mark Step';
        }
        this.updateDisplayActive();
    }

    updateDisplayActive() {
        let showButton = this.element.querySelector('#analytics-region-card-show');
        if (!showButton) {
            console.warn('regioncard missing element');
            return;
        }

        if (this.state === RegionCardState.Pinned) {
            showButton.style.opacity = '1';
        } else {
            showButton.style.opacity = '0';
        }

        showButton.textContent = this.displayActive ? 'Hide' : 'Show';

        if (this.displayActive) {
            this.element.classList.add('displayActive');
        } else {
            this.element.classList.remove('displayActive');
        }
    }

    createCard() {
        this.element.classList.add('analytics-region-card');
        this.element.classList.add('minimized');

        const dateTimeTitle = document.createElement('div');
        dateTimeTitle.classList.add(
            'analytics-region-card-title',
            'analytics-region-card-date-time'
        );

        const colorDot = document.createElement('div');
        colorDot.classList.add(
            'analytics-region-card-dot'
        );

        const motionSummary = document.createElement('div');
        motionSummary.classList.add(
            'analytics-region-card-subtitle',
            'analytics-region-card-motion-summary'
        );
        
        this.valueAddWasteTimeSummary = document.createElement('div');
        this.valueAddWasteTimeSummary.classList.add('analytics-region-card-value-add-waste-time-summary');
        this.valueAddWasteTimeSummary.setValues = (valuePercent, wastePercent) => {
            this.valueAddWasteTimeSummary.innerHTML = `Value Add: ${valuePercent}%, Waste Time: ${wastePercent}%`;
        }
        this.valueAddWasteTimeSummary.setValues(0, 0);

        this.element.appendChild(dateTimeTitle);
        this.element.appendChild(colorDot);
        this.element.appendChild(motionSummary);
        this.element.appendChild(this.valueAddWasteTimeSummary);

        this.labelElement = document.createElement('div');
        this.labelElement.classList.add('analytics-region-card-label');
        this.labelElement.setAttribute('contenteditable', true);
        this.setLabel('');

        let debouncedSave = null;
        this.labelElement.addEventListener('keydown', (event) => {
            const code = event.keyCode || event.which;
            // 13 is Enter
            if (code === 13) {
                event.preventDefault();
                this.labelElement.blur();
            }
            event.stopPropagation();
        });
        this.labelElement.addEventListener('keypress', (event) => {
            event.stopPropagation();
        });
        this.labelElement.addEventListener('keyup', (event) => {
            event.stopPropagation();

            if (debouncedSave) {
                clearTimeout(debouncedSave);
            }
            debouncedSave = setTimeout(() => {
                this.motionStudy.writeMotionStudyData();
                debouncedSave = null;
            }, 1000);
        });

        this.element.appendChild(this.labelElement);

        this.graphSummaryValues = {};
        this.createGraphSection('reba', 'REBA');
        this.createGraphSection('accel', 'Accel');
        
        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('analytics-region-card-button-container');
        this.element.appendChild(buttonContainer);

        const pinButton = document.createElement('div');
        pinButton.classList.add('analytics-region-card-button');
        pinButton.id = 'analytics-region-card-step';
        pinButton.textContent = this.state === RegionCardState.Pinned ? 'Remove Step' : 'Mark Step';
        pinButton.addEventListener('click', this.onClickPin);
        buttonContainer.appendChild(pinButton);

        const showButton = document.createElement('div');
        showButton.classList.add('analytics-region-card-button');
        showButton.id = 'analytics-region-card-show';
        showButton.addEventListener('click', this.onClickShow);
        buttonContainer.appendChild(showButton);

        const valueAddWasteTimeDiv = document.createElement('div');
        valueAddWasteTimeDiv.classList.add('analytics-value-add-waste-time-container');
        buttonContainer.appendChild(valueAddWasteTimeDiv);

        const wasteTimeButton = document.createElement('div');
        wasteTimeButton.classList.add('analytics-waste-time-item');
        wasteTimeButton.textContent = 'Waste';
        wasteTimeButton.addEventListener('click', () => {
            if (this.state === RegionCardState.Pinned) {
                this.motionStudy.markWasteTime(this.startTime, this.endTime);
            } else {
                const highlightRegion = this.motionStudy.timeline.highlightRegion;
                this.motionStudy.markWasteTime(highlightRegion.startTime, highlightRegion.endTime);
                this.updateValueAddWasteTimeUi(); // Needed for Tooltips, since the motionStudy session does not track or update them
            }
        });
        this.wasteTimeButton = wasteTimeButton;
        valueAddWasteTimeDiv.appendChild(wasteTimeButton);

        const valueAddButton = document.createElement('div');
        valueAddButton.classList.add('analytics-value-add-item');
        valueAddButton.textContent = 'Value';
        valueAddButton.addEventListener('click', () => {
            if (this.state === RegionCardState.Pinned) {
                this.motionStudy.markValueAdd(this.startTime, this.endTime);
            } else {
                const highlightRegion = this.motionStudy.timeline.highlightRegion;
                this.motionStudy.markValueAdd(highlightRegion.startTime, highlightRegion.endTime);
                this.updateValueAddWasteTimeUi(); // Needed for Tooltips, since the motionStudy session does not track or update them
            }
        });
        this.valueAddButton = valueAddButton;
        valueAddWasteTimeDiv.appendChild(valueAddButton);
        
        this.updateDisplayActive();
    }

    setPoses(poses) {
        this.poses = poses;

        // Getting times from poses is more accurate to the local data
        if (this.poses.length > 0) {
            this.poses.sort((a, b) => {
                return a.timestamp - b.timestamp;
            });
            let filteredPoses = [];
            let lastTs = 0;
            for (let pose of this.poses) {
              if (pose.timestamp - lastTs < 50) {
                continue;
              }
              lastTs = pose.timestamp;
              filteredPoses.push(pose);
            }
            this.poses = filteredPoses;

            this.startTime = this.poses[0].timestamp;
            this.endTime = this.poses[this.poses.length - 1].timestamp;
        }

        try {
            const dateTimeTitle = this.element.querySelector('.analytics-region-card-date-time');
            dateTimeTitle.textContent = this.dateTimeFormat.formatRange(
                new Date(this.startTime),
                new Date(this.endTime),
            );
        } catch (_) {
            // formatRange failed for some time-related reason
        }

        if (this.poses.length === 0) {
            return;
        }

        const motionSummary = this.element.querySelector('.analytics-region-card-motion-summary');
        motionSummary.textContent = this.getMotionSummaryText();

        this.graphSummaryValues = {};
        const minReba = 1;
        const maxReba = 12;
        this.updateGraphSection('reba', 'REBA', pose => pose.getJoint(JOINTS.HEAD).overallRebaScore, minReba, maxReba);
        this.updateGraphSection('accel', 'Accel', pose => {
            let maxAcceleration = 0;
            pose.forEachJoint(joint => {
                maxAcceleration = Math.max(maxAcceleration, joint.accelerationMagnitude || 0);
            });
            return maxAcceleration;
        }, 0, 40);
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

        this.distanceMm = distanceMm;
        this.durationMs = this.endTime - this.startTime;

        return getMeasurementTextLabel(distanceMm, this.endTime - this.startTime);
    }

    createGraphSection(id, titleText) {
        let title = document.createElement('div');
        title.classList.add('analytics-region-card-graph-section-title');
        title.textContent = titleText;

        let sparkLine = document.createElementNS(svgNS, 'svg');
        sparkLine.classList.add('analytics-region-card-graph-section-sparkline');
        sparkLine.setAttribute('width', cardWidth / 3);
        sparkLine.setAttribute('height', rowHeight);
        sparkLine.setAttribute('xmlns', svgNS);

        let path = document.createElementNS(svgNS, 'path');
        path.classList.add('analytics-region-card-graph-section-sparkline-path-' + id);
        path.setAttribute('stroke-width', '1');

        sparkLine.appendChild(path);

        let average = document.createElement('div');
        average.classList.add(
            'analytics-region-card-graph-section-value',
            'analytics-region-card-graph-section-average-' + id
        );

        let minimum = document.createElement('div');
        minimum.classList.add(
            'analytics-region-card-graph-section-value',
            'analytics-region-card-graph-section-minimum-' + id
        );

        let maximum = document.createElement('div');
        maximum.classList.add(
            'analytics-region-card-graph-section-value',
            'analytics-region-card-graph-section-maximum-' + id
        );

        this.element.appendChild(title);
        this.element.appendChild(sparkLine);
        this.element.appendChild(average);
        this.element.appendChild(minimum);
        this.element.appendChild(maximum);
    }

    updateGraphSection(id, titleText, poseValueFunction, minValue, maxValue) {
        let summaryValues = this.getSummaryValues(poseValueFunction);
        this.graphSummaryValues[titleText] = summaryValues;

        let path = this.element.querySelector('.analytics-region-card-graph-section-sparkline-path-' + id);
        path.setAttribute('d', this.getSparkLinePath(poseValueFunction, summaryValues));

        let average = this.element.querySelector('.analytics-region-card-graph-section-average-' + id);
        // average.innerHTML = '';
        average.textContent = 'Avg: ';
        average.appendChild(this.makeSummaryValue(summaryValues.average, minValue, maxValue));

        let minimum = this.element.querySelector('.analytics-region-card-graph-section-minimum-' + id);
        minimum.textContent = 'Min: ';
        minimum.appendChild(this.makeSummaryValue(summaryValues.minimum, minValue, maxValue));

        let maximum = this.element.querySelector('.analytics-region-card-graph-section-maximum-' + id);
        maximum.textContent = 'Max: ';
        maximum.appendChild(this.makeSummaryValue(summaryValues.maximum, minValue, maxValue));
    }

    /**
     * @param {number} val
     * @param {number} min
     * @param {number} max
     * @return {Element} span containing text val with color based on val's position within min and max
     */
    makeSummaryValue(val, min, max) {
        let span = document.createElement('span');
        if (max < 1000) {
            span.textContent = val.toFixed(1);
        } else {
            if (val < 1000) {
                span.textContent = val.toFixed(0);
            } else {
                // limit to thousands, e.g. 1234 -> 1.2k
                let valThousands = (val / 1000).toFixed(1);
                if (val > 100000) {
                    valThousands = (val / 1000).toFixed(0);
                }
                span.textContent = `${valThousands}K`;
            }
        }
        if (val > max) {
            // Prevent overflowing scale
            val = max;
        }
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

    getLabel() {
        return this.labelElement.textContent;
    }

    setLabel(label) {
        this.labelElement.textContent = label;
    }

    setAccentColor(accentColor) {
        this.accentColor = accentColor;
        const colorDot = this.element.querySelector('.analytics-region-card-dot');
        if (colorDot) {
            colorDot.style.backgroundColor = this.accentColor;
        }
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

    updateValueAddWasteTimeUi() {
        const regionValue = this.motionStudy.valueAddWasteTimeManager.getValueForRegion(this.startTime, this.endTime);

        if (regionValue === ValueAddWasteTimeTypes.WASTE_TIME) {
            this.wasteTimeButton.classList.add('selected');
            this.valueAddButton.classList.remove('selected');
        } else if (regionValue === ValueAddWasteTimeTypes.VALUE_ADD) {
            this.valueAddButton.classList.add('selected');
            this.wasteTimeButton.classList.remove('selected');
        } else {
            this.valueAddButton.classList.remove('selected');
            this.wasteTimeButton.classList.remove('selected');
        }
        
        const subset = this.motionStudy.valueAddWasteTimeManager.subset(this.startTime, this.endTime);
        let totalValueAdd = 0;
        let totalWasteTime = 0;
        const totalTime = this.endTime - this.startTime;
        subset.regions.forEach(region => {
            if (region.value === ValueAddWasteTimeTypes.VALUE_ADD) {
                totalValueAdd += region.duration;
            } else if (region.value === ValueAddWasteTimeTypes.WASTE_TIME) {
                totalWasteTime += region.duration;
            }
        });
        if (totalTime === 0) {
            console.warn('Region Card has 0 duration, cannot set Value Add/Waste Time ui');
            return;
        }
        const valuePercent = Math.round(totalValueAdd / totalTime * 100);
        const wastePercent = Math.round(totalWasteTime / totalTime * 100);
        
        this.valueAddWasteTimeSummary.setValues(valuePercent, wastePercent);
    }
}
