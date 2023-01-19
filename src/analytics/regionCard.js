import {getMeasurementTextLabel} from '../humanPose/spaghetti.js';

const cardWidth = 200;
const rowHeight = 22;

const svgNS = 'http://www.w3.org/2000/svg';

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
     * @param {Array<SpaghettiMeshPoint>} points - Each point should have x, y,
     *                                    z, color, overallRebaScore, timestamp
     */
    constructor(container, points) {
        this.container = container;
        this.points = points;
        this.element = document.createElement('div');
        this.dateTimeFormat = new Intl.DateTimeFormat('default', {
            // dateStyle: 'short',
            timeStyle: 'medium',
            hour12: false,
        });
        this.onPointerOver = this.onPointerOver.bind(this);
        this.onPointerOut = this.onPointerOut.bind(this);

        this.createCard();

        this.element.addEventListener('pointerover', this.onPointerOver);
        this.element.addEventListener('pointerout', this.onPointerOut);
        this.container.appendChild(this.element);
    }

    onPointerOver() {
        this.element.classList.remove('minimized');
    }

    onPointerOut() {
        this.element.classList.add('minimized');
    }

    createCard() {
        if (this.points.length === 0) {
            return;
        }
        this.startTime = this.points[0].timestamp;
        this.endTime = this.points[this.points.length - 1].timestamp;
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

        this.createGraphSection('REBA', 'overallRebaScore');

    }

    getMotionSummaryText() {
        let distanceMm = 0;

        for (let i = 1; i < this.points.length; i++) {
            const prev = this.points[i - 1];
            const point = this.points[i];
            let dx = point.x - prev.x;
            let dy = point.y - prev.y;
            let dz = point.z - prev.z;
            distanceMm += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }

        return getMeasurementTextLabel(distanceMm, this.endTime - this.startTime);
    }

    createGraphSection(titleText, pointKey) {
        let title = document.createElement('div');
        title.classList.add('analytics-region-card-graph-section-title');
        title.textContent = titleText;

        let sparkLine = document.createElementNS(svgNS, 'svg');
        sparkLine.classList.add('analytics-region-card-graph-section-sparkline');
        sparkLine.setAttribute('width', cardWidth / 3);
        sparkLine.setAttribute('height', rowHeight);
        sparkLine.setAttribute('xmlns', svgNS);

        let summaryValues = this.getSummaryValues(pointKey);

        let path = document.createElementNS(svgNS, 'path');
        path.setAttribute('stroke-width', '1');
        path.setAttribute('d', this.getSparkLinePath(pointKey, summaryValues));

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

    getSparkLinePath(pointKey, summaryValues) {
        let minX = this.startTime;
        let maxX = this.endTime;
        let minY = summaryValues.minimum - 0.5;
        let maxY = summaryValues.maximum + 0.5;
        let width = cardWidth / 3;
        let height = rowHeight;
        let path = 'M ';
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const val = point[pointKey];
            const x = Math.round((point.timestamp - minX) / (maxX - minX) * width);
            const y = Math.round((maxY - val) / (maxY - minY) * height);
            path += x + ' ' + y;
            if (i < this.points.length - 1) {
                let nextPoint = this.points[i + 1];
                if (nextPoint.timestamp - point.timestamp < 500) {
                    path += ' L ';
                } else {
                    path += ' M ';
                }
            }
        }
        return path;
    }

    getSummaryValues(pointKey) {
        let average = 0;
        let minimum = 9001 * 9001;
        let maximum = -minimum;
        for (const point of this.points) {
            const val = point[pointKey];
            average += val;
            minimum = Math.min(minimum, val);
            maximum = Math.max(maximum, val);
        }
        average /= this.points.length;
        return {
            average,
            minimum,
            maximum,
        };
    }

    moveTo(x, y) {
        this.element.style.left = x + 'px';
        this.element.style.bottom = y + 'px';
    }

    remove() {
        this.container.removeChild(this.element);
    }
}
