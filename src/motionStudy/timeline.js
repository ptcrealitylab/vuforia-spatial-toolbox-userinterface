import {RegionCard, RegionCardState} from './regionCard.js';
import {
    setAnimationMode,
    AnimationMode, getPosesInTimeInterval,
} from '../humanPose/draw.js';
import {ValueAddWasteTimeTypes} from './ValueAddWasteTimeManager.js';

const needleTopPad = 4;
const needleTipWidth = 12;
const needlePad = 12;
const needleWidth = 3;
const needleDragWidth = 12;

const rowPad = 4;
const rowHeight = 24;
const boardHeight = 4 * (rowPad + rowHeight) + rowPad;
const boardStart = needlePad + needleTopPad;
const minimapHeight = 16;
const minimapStart = boardStart + boardHeight + rowPad;

const ROW_REGION_CARDS = 1;
const N_INTERACTABLE_ROWS = 3;

const labelPad = 4;

const DEFAULT_MAX_WIDTH_MS = 1024 / 0.00004;
const MIN_WIDTH_MS = 1024 / 0.12;

const DragMode = {
    NONE: 'none',
    SELECT: 'select',
    PAN: 'pan',
};

const DEFAULT_WIDTH_MS = 60 * 1000;

const Colors = {
    highlightFill: '#00ffff',
    cursorFill: 'white',
    boardBackgroundFill: 'rgba(0, 0, 0, 0.1)',
    pinnedRegionCardActiveStroke: 'white',
    patchFill: 'rgb(200, 200, 200)',
    wasteFill: '#880000',
    valueAddFill: '#008800',
};

/**
 * Convert an rgba color array to a css color string
 * @param {number[4]} rgba
 * @return {string}
 */
function rgbaToString(rgba) {
    return `rgba(${Math.round(rgba[0])}, ${Math.round(rgba[1])}, ${Math.round(rgba[2])}, ${Math.round(rgba[3])})`;
}

/**
 * Approximate equality between two rgba color arrays
 * @param {number[4]} rgba1
 * @param {number[4]} rgba2
 * @return boolean
 */
function rgbaEquals(rgba1, rgba2) {
  // >> 0 is the fastest to-int method on Chrome
  return (rgba1[0] >> 0) === (rgba2[0] >> 0) &&
    (rgba1[1] >> 0) === (rgba2[1] >> 0) &&
    (rgba1[2] >> 0) === (rgba2[2] >> 0) &&
    (rgba1[3] >> 0) === (rgba2[3] >> 0);
}

export class Timeline {
    /**
     * @param {MotionStudy} motionStudy - parent MotionStudy instance of this timeline
     * @param {Element} container - where to insert timeline
     */
    constructor(motionStudy, container) {
        this.motionStudy = motionStudy;
        this.container = container;

        this.canvas = document.createElement('canvas');
        this.canvas.classList.add('analytics-timeline');
        this.gfx = this.canvas.getContext('2d');

        this.pixelsPerMs = 0.01; // 1024 * 100 / (24 * 60 * 60 * 1000);
        this.timeMin = Date.now() - DEFAULT_WIDTH_MS;
        this.resetBounds();
        this.widthMs = DEFAULT_WIDTH_MS;
        this.scrolled = false;
        container.appendChild(this.canvas);

        this.width = -1;
        this.displayRegion = null;
        this.height = minimapStart + minimapHeight;
        this.highlightRegion = null;
        this.highlightStartTime = -1;
        this.regionCard = null;
        this.lastRegionCardCacheKey = '';

        this.dragMode = DragMode.NONE;
        this.mouseX = -1;
        this.mouseY = -1;
        this.cursorTime = -1;

        this.lastDraw = Date.now();

        this.controlsCanvas = document.createElement('canvas');
        this.controlsCanvas.classList.add('analytics-timeline-controls');
        this.controlsGfx = this.controlsCanvas.getContext('2d');
        let dpr = window.devicePixelRatio;
        this.controlsCanvas.width = (rowHeight + rowPad) * dpr;
        this.controlsCanvas.height = this.height * dpr;
        this.controlsCanvas.style.width = (rowHeight + rowPad) + 'px';
        this.controlsCanvas.style.height = this.height + 'px';
        container.appendChild(this.controlsCanvas);

        this.iconPlay = document.createElement('img');
        this.iconPlay.src = './png/playing.png';

        this.iconPause = document.createElement('img');
        this.iconPause.src = './png/paused.png';

        this.boardLabelLeft = document.createElement('div');
        this.boardLabelLeft.classList.add('timelineBoardLabel');
        container.appendChild(this.boardLabelLeft);

        this.boardLabelRight = document.createElement('div');
        this.boardLabelRight.classList.add('timelineBoardLabel');
        container.appendChild(this.boardLabelRight);

        this.dateFormat = new Intl.DateTimeFormat('default', {
            dateStyle: 'short',
            timeStyle: 'medium',
            hour12: false,
        });

        this.timeFormat = new Intl.DateTimeFormat('default', {
            timeStyle: 'medium',
            hour12: false,
        });

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerOver = this.onPointerOver.bind(this);
        this.onPointerOut = this.onPointerOut.bind(this);
        this.onWheel = this.onWheel.bind(this);

        this.onControlsPointerDown = this.onControlsPointerDown.bind(this);
        this.onControlsPointerUp = this.onControlsPointerUp.bind(this);

        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        this.canvas.addEventListener('pointerover', this.onPointerOver);
        this.canvas.addEventListener('pointerout', this.onPointerOut);

        function stopPropagation(e) {
            e.stopPropagation();
        }
        this.canvas.addEventListener('mousedown', stopPropagation);
        this.canvas.addEventListener('mousemove', stopPropagation);
        this.canvas.addEventListener('mouseup', stopPropagation);
        this.canvas.addEventListener('touchstart', stopPropagation);
        this.canvas.addEventListener('touchend', stopPropagation);

        this.canvas.addEventListener('wheel', this.onWheel);

        this.controlsCanvas.addEventListener('pointerdown', this.onControlsPointerDown);
        this.controlsCanvas.addEventListener('pointerup', this.onControlsPointerUp);

        realityEditor.device.layout.onWindowResized(this.recomputeSize.bind(this));
    }

    reset() {
        this.displayRegion = null;
        this.highlightRegion = null;
        this.highlightStartTime = -1;
        this.timeMin = Date.now() - DEFAULT_WIDTH_MS;
        this.widthMs = DEFAULT_WIDTH_MS;
        this.scrolled = false;
        this.lastRegionCardCacheKey = '';
        this.resetBounds();
    }

    recomputeSize() {
        let rect = this.canvas.getBoundingClientRect();
        if (rect.width <= 0) {
            return;
        }

        this.width = rect.width;
        this.pixelsPerMs = rect.width / this.widthMs;

        this.canvas.width = rect.width;
        this.canvas.height = this.height;
        this.gfx.width = rect.width;
        this.gfx.height = this.height;
    }

    draw() {
        let dt = Date.now() - this.lastDraw;
        this.lastDraw += dt;

        if (this.width < 0) {
            this.recomputeSize();
        }

        if (this.timeMin > 0 && !this.scrolled) {
            const newTimeMin = Date.now() - this.widthMs;
            if (newTimeMin > this.timeMin) {
                this.timeMin = newTimeMin;
                if (this.timeMin + this.widthMs > this.maxTimeMax) {
                    this.timeMin = this.maxTimeMax - this.widthMs;
                }
            }
        }

        if (this.dragMode === DragMode.SELECT) {
            // If mouse is far to either side of timeline during selection,
            // scroll the timeline in that direction
            const dragSpeedBase = 0.5;
            const dragStart = 0.15;
            if (this.mouseX < this.width * dragStart) {
                let velX = this.width * (dragStart + 0.05) - this.mouseX;
                let velTime = velX / this.pixelsPerMs * dragSpeedBase;
                this.timeMin -= velTime * dt / 1000;
                this.limitTimeMin();
            } else if (this.mouseX > this.width * (1 - dragStart)) {
                let velX = this.mouseX - this.width * (1 - dragStart - 0.05);
                let velTime = velX / this.pixelsPerMs * dragSpeedBase;
                this.timeMin += velTime * dt / 1000;
                this.limitTimeMin();
            }
        }

        this.gfx.clearRect(0, 0, this.width, this.height);

        this.gfx.fillStyle = Colors.boardBackgroundFill;
        this.gfx.fillRect(0, boardStart, this.width, boardHeight);

        this.rowIndex = 0;
        this.calculateAndDrawTicks();
        this.drawPoses();
        this.drawPinnedRegionCards();
        this.drawPatches();
        this.drawValueAddWasteTime();
        this.drawSensors();

        this.drawHighlightRegion();

        this.drawCursor();

        this.drawMinimap();

        this.drawControls();

        this.updateBoardLabels();
        this.updateRegionCard();
    }

    drawHighlightRegion() {
        if (!this.highlightRegion) {
            return;
        }

        let startX = this.timeToX(this.highlightRegion.startTime);
        this.gfx.fillStyle = Colors.highlightFill;
        this.gfx.beginPath();
        this.gfx.moveTo(startX + needleWidth / 2, 0);
        this.gfx.lineTo(startX + needleWidth / 2, this.height);
        this.gfx.lineTo(startX - needleWidth / 2, this.height);
        this.gfx.lineTo(startX - needleWidth / 2, needleTipWidth);
        this.gfx.lineTo(startX - needleWidth / 2 - needleTipWidth, 0);
        this.gfx.closePath();
        this.gfx.fill();

        let endX = this.timeToX(this.highlightRegion.endTime);
        this.gfx.beginPath();
        this.gfx.moveTo(endX - needleWidth / 2, 0);
        this.gfx.lineTo(endX - needleWidth / 2, this.height);
        this.gfx.lineTo(endX + needleWidth / 2, this.height);
        this.gfx.lineTo(endX + needleWidth / 2, needleTipWidth);
        this.gfx.lineTo(endX + needleWidth / 2 + needleTipWidth, 0);
        this.gfx.closePath();
        this.gfx.fill();
    }

    drawCursor() {
        if (this.cursorTime < this.timeMin || this.cursorTime > this.timeMin + this.widthMs) {
            return;
        }
        let x = this.timeToX(this.cursorTime);
        this.gfx.fillStyle = Colors.cursorFill;
        this.gfx.fillRect(x - needleWidth / 2, 0, needleWidth, boardHeight + needlePad * 2);
    }

    formatRangeToLabels(dateTimeFormat, dateStart, dateEnd) {
        const parts = dateTimeFormat.formatRangeToParts(dateStart, dateEnd);
        let startLabel = '';
        let endLabel = '';
        let started = false;
        for (const part of parts) {
            switch (part.source) {
            case 'shared':
                if (!started) {
                    startLabel += part.value;
                }
                break;
            case 'startRange':
                startLabel += part.value;
                started = true;
                break;
            case 'endRange':
                endLabel += part.value;
                break;
            }
        }
        return {
            startLabel,
            endLabel,
        };
    }

    updateBoardLabels() {
        const {startLabel, endLabel} = this.formatRangeToLabels(
            this.dateFormat,
            new Date(this.timeMin),
            new Date(this.timeMin + this.widthMs)
        );
        this.boardLabelLeft.textContent = startLabel;
        this.boardLabelRight.textContent = endLabel;

        this.boardLabelLeft.style.left = '0px';
        this.boardLabelLeft.style.bottom = `${this.height + labelPad - boardStart}px`;
        this.boardLabelRight.style.right = '0px';
        this.boardLabelRight.style.bottom = `${this.height + labelPad - boardStart}px`;
    }

    updateRegionCard() {
        if (!this.highlightRegion) {
            if (this.regionCard) {
                if (this.regionCard.state !== RegionCardState.Pinned) {
                    this.regionCard.remove();
                }
                this.regionCard = null;
            }
            return;
        }

        const leftTime = this.highlightRegion.startTime;
        const rightTime = this.highlightRegion.endTime;
        const midTime = (leftTime + rightTime) / 2;
        const midX = this.timeToX(midTime);

        let cacheKey = `${leftTime} ${rightTime} ${midX}`;
        if (this.lastRegionCardCacheKey === cacheKey &&
            this.regionCard && !this.regionCard.element.classList.contains('pinned')) {
            return;
        }
        this.lastRegionCardCacheKey = cacheKey;

        // regionCard was pinned (moved outside of timeline)
        if (this.regionCard && this.regionCard.state === RegionCardState.Pinned) {
            this.regionCard = null;
        }

        if (!this.regionCard) {
            this.regionCard = new RegionCard(this.motionStudy, this.container, getPosesInTimeInterval(leftTime, rightTime), {startTime: leftTime, endTime: rightTime});
        } else {
            this.regionCard.setPoses(getPosesInTimeInterval(leftTime, rightTime), leftTime, rightTime);
        }

        this.regionCard.moveTo(midX, this.height + labelPad + needleTopPad);

        this.motionStudy.setTimelineRegionCard(this.regionCard);
    }

    timeToX(timeMs) {
        return Math.round((timeMs - this.timeMin) * this.pixelsPerMs);
    }

    xToTime(x) {
        return x / this.pixelsPerMs + this.timeMin;
    }

    /**
     * @param {number} time
     * @return {boolean}
     */
    isHighlight(time) {
        if (!this.highlightRegion) {
            return true;
        }
        return time >= this.highlightRegion.startTime &&
            time <= this.highlightRegion.endTime;
    }

    rowIndexToRowY(index) {
        return boardStart + rowPad + (rowHeight + rowPad) * index;
    }

    drawPoses() {
        let hpa = realityEditor.motionStudy.getActiveHumanPoseAnalyzer();
        for (let spaghetti of Object.values(hpa.historyLines[hpa.activeLens.name].all)) {
            this.drawSpaghettiPoses(spaghetti.points);
        }
        this.rowIndex += 1;
    }

    /**
     * Dim, brighten, or keep an rgba color array the same based on whether
     * `time` is highlighted
     * @param {number} time
     * @param {number[4]} rgba
     * @return {number[4]}
     */
    recolorPoseForHighlight(time, rgba) {
        if (!this.highlightRegion) {
            return rgba;
        }
        const dim = 0.6;
        const bri = 1.3;
        if (this.isHighlight(time)) {
            return [
                Math.min(rgba[0] * bri, 255),
                Math.min(rgba[1] * bri, 255),
                Math.min(rgba[2] * bri, 255),
                Math.min(rgba[3] * bri, 255),
            ];
        }
        return [
            rgba[0] * dim,
            rgba[1] * dim,
            rgba[2] * dim,
            rgba[3] * dim,
        ];
    }

    drawSpaghettiPoses(poses) {
        let lastPose = poses[0];
        let lastPoseTime = lastPose.timestamp;
        let startSectionTime = lastPoseTime;
        const maxPoseDelayLenience = 500;

        const rowY = this.rowIndexToRowY(this.rowIndex);

        const timeMax = this.timeMin + this.widthMs;

        for (const pose of poses) {
            if (pose.timestamp < this.timeMin) {
                startSectionTime = pose.timestamp;
                lastPose = pose;
                lastPoseTime = lastPose.timestamp;
                continue;
            }
            if (pose.timestamp > this.timeMin + this.widthMs) {
                break;
            }
            const isGap = pose.timestamp - lastPoseTime > maxPoseDelayLenience;
            const poseColor = this.recolorPoseForHighlight(pose.timestamp, pose.originalColor);
            const lastPoseColor = this.recolorPoseForHighlight(lastPose.timestamp, lastPose.originalColor);
            const isColorSwap = !rgbaEquals(poseColor, lastPoseColor);
            if (!isGap && !isColorSwap) {
                lastPose = pose;
                lastPoseTime = lastPose.timestamp;
                continue;
            }
            this.gfx.fillStyle = rgbaToString(lastPoseColor);
            // When swapping highlight allow the pose section to clip on the
            // right side at the highlight region border
            if (isColorSwap && !isGap && this.highlightRegion) {
                // Swap point is either due to the start or the end, whichever
                // is between the two poses
                if (lastPoseTime < this.highlightRegion.startTime &&
                    this.highlightRegion.startTime < pose.timestamp) {
                    lastPoseTime = this.highlightRegion.startTime;
                }
                if (lastPoseTime < this.highlightRegion.endTime &&
                    this.highlightRegion.endTime < pose.timestamp) {
                    lastPoseTime = this.highlightRegion.endTime;
                }
            }

            const startX = this.timeToX(startSectionTime);
            const endX = this.timeToX(lastPoseTime);
            this.gfx.fillRect(
                startX,
                rowY,
                endX - startX,
                rowHeight
            );

            if (isColorSwap && !isGap) {
                // When swapping color extend the pose section
                // leftwards down to the highlight region border
                startSectionTime = lastPoseTime;
            } else {
                startSectionTime = pose.timestamp;
            }
            lastPose = pose;
            lastPoseTime = pose.timestamp;
        }

        if (timeMax - lastPoseTime < maxPoseDelayLenience) {
            lastPoseTime = timeMax;
        }

        const lastPoseColor = this.recolorPoseForHighlight(lastPose.timestamp, lastPose.originalColor);
        this.gfx.fillStyle = rgbaToString(lastPoseColor);
        const startX = this.timeToX(startSectionTime);
        const endX = this.timeToX(lastPoseTime);
        this.gfx.fillRect(
            startX,
            rowY,
            endX - startX,
            rowHeight
        );
    }

    drawPinnedRegionCards() {
        if (this.motionStudy.pinnedRegionCards.length === 0) {
            return;
        }

        const rowY = this.rowIndexToRowY(this.rowIndex);
        this.rowIndex += 1;

        const timeMax = this.timeMin + this.widthMs;

        let anyActive = false;
        for (const prc of this.motionStudy.pinnedRegionCards) {
            if (prc.displayActive) {
                anyActive = true;
            }
        }

        for (const prc of this.motionStudy.pinnedRegionCards) {
            if (!prc.accentColor) {
                continue;
            }

            let timeStart = prc.startTime;
            let timeEnd = prc.endTime;

            if (timeEnd < this.timeMin || timeStart > timeMax) {
                continue;
            }

            // Limit to timeline bounds
            timeStart = Math.max(timeStart, this.timeMin);
            timeEnd = Math.min(timeEnd, timeMax);

            const startX = this.timeToX(timeStart);
            const endX = this.timeToX(timeEnd);
            this.gfx.fillStyle = prc.accentColor;
            this.gfx.fillRect(
                startX,
                rowY,
                endX - startX,
                rowHeight
            );
            if (anyActive && !prc.displayActive) {
                this.gfx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                this.gfx.fillRect(
                    startX,
                    rowY,
                    endX - startX,
                    rowHeight
                );
            }

            if (prc.displayActive) {
                let offset = (Date.now() / 100) % 8;
                let dashes = [4, 4];
                this.gfx.lineDashOffset = offset;
                this.gfx.lineWidth = 3;
                this.gfx.setLineDash(dashes);
                this.gfx.strokeStyle = Colors.pinnedRegionCardActiveStroke;
                this.gfx.strokeRect(
                    startX,
                    rowY,
                    endX - startX,
                    rowHeight
                );
                this.gfx.setLineDash([]);
                this.gfx.lineWidth = 1;
            }
        }
    }

    drawPatches() {
        const desktopRenderer = realityEditor.gui.ar.desktopRenderer;
        if (!desktopRenderer) {
            return;
        }

        let patches = Object.values(desktopRenderer.getCameraVisPatches() || {})
            .filter(this.motionStudy.patchFilter);

        if (patches.length === 0) {
            return;
        }

        const timeMax = this.timeMin + this.widthMs;

        const rowY = this.rowIndexToRowY(this.rowIndex);
        this.rowIndex += 1;

        this.gfx.fillStyle = Colors.patchFill;

        for (const patch of patches) {
            let timeStart = patch.creationTime;
            let timeEnd = patch.creationTime + 1000;

            let patchVisible = this.cursorTime > timeStart && this.cursorTime < timeEnd;

            if (patchVisible) {
                patch.show();
            } else {
                patch.hide();
            }

            if (timeEnd < this.timeMin || timeStart > timeMax) {
                continue;
            }

            // Limit to timeline bounds
            timeStart = Math.max(timeStart, this.timeMin);
            timeEnd = Math.min(timeEnd, timeMax);

            const startX = this.timeToX(timeStart);
            const endX = this.timeToX(timeEnd);
            this.gfx.fillRect(
                startX,
                rowY,
                endX - startX,
                rowHeight
            );
        }
    }

    drawValueAddWasteTime() {
        if (this.motionStudy.valueAddWasteTimeManager.regions.length === 0) {
            return;
        }

        const rowY = this.rowIndexToRowY(this.rowIndex);
        this.rowIndex += 1;

        const timeMax = this.timeMin + this.widthMs;

        this.motionStudy.valueAddWasteTimeManager.regions.forEach(region => {
            if (region.endTime < this.timeMin || region.startTime > timeMax) {
                return;
            }
            const timeStart = Math.max(region.startTime, this.timeMin);
            const timeEnd = Math.min(region.endTime, timeMax);

            const startX = this.timeToX(timeStart);
            const endX = this.timeToX(timeEnd);

            this.gfx.fillStyle = region.value === ValueAddWasteTimeTypes.WASTE_TIME ?
                Colors.wasteFill :
                Colors.valueAddFill;
            this.gfx.fillRect(
                startX,
                rowY,
                endX - startX,
                rowHeight
            );
        });
    }

    drawSensors() {
        if (!this.motionStudy || !this.motionStudy.sensors) {
            return;
        }

        const sensorFrames = this.motionStudy.sensors.getSensorFrames();
        if (sensorFrames.length === 0) {
            return;
        }

        // TODO(hobinjk): use lens annotation for sensor activation to deduplicate work
        const poses = getPosesInTimeInterval(this.timeMin, this.timeMin + this.widthMs);
        if (poses.length === 0) {
            return;
        }

        const sensors = this.motionStudy.sensors;
        let lastPose = poses[0];
        let lastPoseTime = lastPose.timestamp;
        const lastPoseActives = sensorFrames.map(sensorFrame => {
            return sensors.isSensorActive(sensorFrame, lastPose);
        });
        const poseActives = [].concat(lastPoseActives);

        let startSectionTime = lastPoseTime;
        const maxPoseDelayLenience = 500;

        const timeMax = this.timeMin + this.widthMs;

        const sensorColors = sensorFrames.map(sensorFrame => {
            return sensors.getSensorColor(sensorFrame);
        });

        for (const pose of poses) {
            if (pose.timestamp < this.timeMin) {
                startSectionTime = pose.timestamp;
                lastPose = pose;
                lastPoseTime = lastPose.timestamp;
                continue;
            }
            if (pose.timestamp > this.timeMin + this.widthMs) {
                break;
            }
            const isGap = pose.timestamp - lastPoseTime > maxPoseDelayLenience;
            let isSwap = false;
            for (let i = 0; i < sensorFrames.length; i++) {
                const sensorFrame = sensorFrames[i];
                poseActives[i] = sensors.isSensorActive(sensorFrame, pose);
                if (lastPoseActives[i] !== poseActives[i]) {
                    isSwap = true;
                }
            }

            if (!isGap && !isSwap) {
                lastPose = pose;
                lastPoseTime = lastPose.timestamp;
                continue;
            }

            // When swapping highlight allow the pose section to clip on the
            // right side at the highlight region border
            if (isSwap && !isGap && this.highlightRegion) {
                // Swap point is either due to the start or the end, whichever
                // is between the two poses
                if (lastPoseTime < this.highlightRegion.startTime &&
                    this.highlightRegion.startTime < pose.timestamp) {
                    lastPoseTime = this.highlightRegion.startTime;
                }
                if (lastPoseTime < this.highlightRegion.endTime &&
                    this.highlightRegion.endTime < pose.timestamp) {
                    lastPoseTime = this.highlightRegion.endTime;
                }
            }

            this.drawSensorBars(lastPoseActives, sensorColors, startSectionTime, lastPoseTime);

            if (isSwap && !isGap) {
                // When swapping color extend the pose section
                // leftwards down to the highlight region border
                startSectionTime = lastPoseTime;
            } else {
                startSectionTime = pose.timestamp;
            }
            lastPose = pose;
            lastPoseTime = pose.timestamp;

            for (let i = 0; i < sensorFrames.length; i++) {
                lastPoseActives[i] = poseActives[i];
            }
        }

        if (timeMax - lastPoseTime < maxPoseDelayLenience) {
            lastPoseTime = timeMax;
        }

        this.drawSensorBars(lastPoseActives, sensorColors, startSectionTime, lastPoseTime);
        this.rowIndex += 1;
    }

    drawSensorBars(poseActives, sensorColors, startTime, endTime) {
        const startX = this.timeToX(startTime);
        const endX = this.timeToX(endTime);
        const rowY = this.rowIndexToRowY(this.rowIndex);

        let nActiveSensors = 0;
        for (let i = 0; i < poseActives.length; i++) {
            if (poseActives[i]) {
                nActiveSensors += 1;
            }
        }
        if (nActiveSensors === 0) {
            return;
        }

        let sensorsDrawn = 0;
        for (let i = 0; i < poseActives.length; i++) {
            if (!poseActives[i]) {
                continue;
            }
            this.gfx.fillStyle = sensorColors[i];

            this.gfx.fillRect(
                startX,
                rowY + (rowHeight / nActiveSensors) * sensorsDrawn,
                endX - startX,
                rowHeight / nActiveSensors
            );

            sensorsDrawn += 1;
        }
    }

    calculateAndDrawTicks() {
        const tickSpacings = [
            1000,
            10 * 1000,
            60 * 1000, // one minute
            120 * 1000,
            10 * 60 * 1000,
            60 * 60 * 1000, // one hour
            6 * 60 * 60 * 1000,
            12 * 60 * 60 * 1000,
            24 * 60 * 60 * 1000,
        ];

        let chosenTick = 1;
        while (chosenTick < tickSpacings.length) {
            if (this.widthMs < tickSpacings[chosenTick] * 12) {
                break;
            }
            chosenTick += 1;
        }

        if (chosenTick >= tickSpacings.length) {
            return;
        }

        let minorTick = tickSpacings[chosenTick - 1];
        if (chosenTick > 4) {
            minorTick = tickSpacings[chosenTick - 2];
        }
        let majorTick = tickSpacings[chosenTick];

        this.gfx.fillStyle = 'rgba(128, 128, 128, 0.3)';
        this.fillTicks(minorTick);
        this.gfx.fillStyle = 'rgba(128, 128, 128, 0.7)';
        this.fillTicks(majorTick);
    }

    fillTicks(tickAmountMs) {
        let tickMs = Math.floor(this.timeMin / tickAmountMs) * tickAmountMs;

        while (tickMs < this.timeMin + this.widthMs) {
            let tickX = this.timeToX(tickMs);
            tickMs += tickAmountMs;

            this.gfx.fillRect(tickX - 1, boardStart, 1, boardHeight);
        }
    }

    drawMinimap() {
        this.gfx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.gfx.fillRect(0, minimapStart, this.width, minimapHeight);

        this.gfx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        let min = this.minTimeMin;
        let max = this.maxTimeMax;
        let fullTimeWidth = max - min;
        let startX = (this.timeMin - this.minTimeMin) / fullTimeWidth * this.width;
        let width = this.widthMs / fullTimeWidth * this.width;
        this.gfx.fillRect(startX, minimapStart, width, minimapHeight);
    }

    drawControls() {
        this.controlsGfx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        let dpr = window.devicePixelRatio;
        this.controlsGfx.scale(dpr, dpr);
        this.controlsGfx.clearRect(0, boardStart + rowPad, rowHeight, rowHeight);
        this.controlsGfx.fillRect(0, boardStart + rowPad, rowHeight, rowHeight);

        let hpa = realityEditor.motionStudy.getActiveHumanPoseAnalyzer();
        if (hpa && hpa.animationMode === AnimationMode.region) {
            let icon = this.iconPlay;
            if (hpa.isAnimationPlaying()) {
                icon = this.iconPause;
            }
            const iconSize = rowHeight - 2 * rowPad;
            this.controlsGfx.drawImage(icon, rowPad, boardStart + 2 * rowPad, iconSize, iconSize);
        }
        this.controlsGfx.resetTransform(dpr, dpr);
    }

    onControlsPointerDown(event) {
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        if (event.offsetY < boardStart + rowPad) {
            return;
        }
        if (event.offsetY > boardStart + rowPad + rowHeight) {
            return;
        }

        event.stopPropagation();
    }

    /**
     * Handles pointer up (click end, presumably) events for the controls
     * sidebar. e.g. pause/play pose playback
     * @param {PointerEvent} event
     */
    onControlsPointerUp(event) {
        // Currently just the play/pause icon
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        if (event.offsetY < boardStart + rowPad) {
            return;
        }
        if (event.offsetY > boardStart + rowPad + rowHeight) {
            return;
        }

        let hpa = realityEditor.motionStudy.getActiveHumanPoseAnalyzer();
        if (hpa && hpa.animation) {
            hpa.animation.playing = !hpa.animation.playing;
        }

        event.stopPropagation();
    }

    updatePointer(event) {
        this.mouseX = event.offsetX;
        this.mouseY = event.offsetY;
    }

    isPointerOnRow() {
        return this.mouseY > boardStart &&
            this.mouseY < this.rowIndexToRowY(N_INTERACTABLE_ROWS) - rowPad;
    }

    isPointerOnBoard() {
        return this.mouseY > boardStart &&
            this.mouseY < boardStart + boardHeight;
    }

    isPointerOnNeedle() {
        return this.isPointerOnStartNeedle() ||
            this.isPointerOnEndNeedle();
    }

    isPointerOnStartNeedle() {
        if (!this.highlightRegion) {
            return false;
        }
        let startX = this.timeToX(this.highlightRegion.startTime);
        let width = needleDragWidth;
        if (this.mouseY < boardStart) {
            width = needleTipWidth + needlePad * 2;
            startX -= width / 2;
        }

        return Math.abs(this.mouseX - startX) < width / 2;
    }

    isPointerOnEndNeedle() {
        if (!this.highlightRegion) {
            return false;
        }
        let endX = this.timeToX(this.highlightRegion.endTime);
        let width = needleDragWidth;
        if (this.mouseY < boardStart) {
            width = needleTipWidth + needlePad * 2;
            endX += width / 2;
        }

        return Math.abs(this.mouseX - endX) < width / 2;
    }

    /**
     * @return {boolean}
     */
    isPointerOnRegionCard() {
        return !!this.getRegionCardUnderPointer();
    }

    /**
     * @return {RegionCard}
     */
    getRegionCardUnderPointer() {
        if (this.motionStudy.pinnedRegionCards.length === 0) {
            return null;
        }

        // PRCs are in row 1
        const cardRowStart = this.rowIndexToRowY(ROW_REGION_CARDS);
        const cardRowEnd = this.rowIndexToRowY(ROW_REGION_CARDS + 1);
        if (this.mouseY < cardRowStart || this.mouseY > cardRowEnd) {
            return null;
        }

        for (const prc of this.motionStudy.pinnedRegionCards) {
            if (!prc.accentColor) {
                continue;
            }

            const startX = this.timeToX(prc.startTime);
            const endX = this.timeToX(prc.endTime);

            if (this.mouseX < startX) {
                continue;
            }
            if (this.mouseX > endX) {
                continue;
            }

            return prc;
        }

        return null;
    }

    onPointerDown(event) {
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        this.updatePointer(event);

        // Needle is on top of everything followed by region card, row, then
        // finally the board (movement)
        if (this.isPointerOnRegionCard() && !this.isPointerOnNeedle()) {
            this.dragMode = DragMode.NONE;
        } else if (this.isPointerOnRow() || this.isPointerOnNeedle()) {
            this.dragMode = DragMode.SELECT;
            if (this.isPointerOnStartNeedle()) {
                this.highlightStartTime = this.highlightRegion.endTime;
            } else if (this.isPointerOnEndNeedle()) {
                this.highlightStartTime = this.highlightRegion.startTime;
            } else {
                this.highlightStartTime = this.xToTime(event.offsetX);
            }
            setAnimationMode(AnimationMode.regionAll);
        } else {
            this.dragMode = DragMode.PAN;
        }
        this.motionStudy.setCursorTime(-1);
        event.stopPropagation();
    }

    onPointerMove(event) {
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        this.updatePointer(event);

        switch (this.dragMode) {
        case DragMode.NONE:
            this.onPointerMoveDragModeNone(event);
            break;
        case DragMode.SELECT:
            this.onPointerMoveDragModeSelect(event);
            break;
        case DragMode.PAN:
            this.onPointerMoveDragModePan(event);
            break;
        }
        event.stopPropagation();
    }

    onPointerMoveDragModeNone(_event) {
        let cursor = 'default';
        if (this.isPointerOnNeedle()) {
            cursor = 'grab';
        } else if (this.isPointerOnRegionCard()) {
            cursor = 'pointer';
        } else if (this.isPointerOnRow()) {
            cursor = 'col-resize';
        } else if (this.isPointerOnBoard()) {
            cursor = 'move';
        }
        this.canvas.style.cursor = cursor;

        this.motionStudy.setCursorTime(this.xToTime(this.mouseX));
    }

    onPointerMoveDragModeSelect(_event) {
        this.canvas.style.cursor = 'col-resize';
        let highlightEndTime = this.xToTime(this.mouseX);

        let startTime = Math.min(this.highlightStartTime, highlightEndTime);
        let endTime = Math.max(this.highlightStartTime, highlightEndTime);
        this.motionStudy.setHighlightRegion({
            startTime,
            endTime,
        });
        setAnimationMode(AnimationMode.regionAll);
    }

    onPointerMoveDragModePan(event) {
        this.canvas.style.cursor = 'move';
        let dTime = event.movementX / this.pixelsPerMs;
        this.timeMin -= dTime;
        this.limitTimeMin();

        this.scrolled = true;
    }

    /**
     * Restricts timeMin based on current zoom level, minTimeMin, and
     * maxTimeMax.
     */
    limitTimeMin() {
        if (this.timeMin < this.minTimeMin) {
            this.timeMin = this.minTimeMin;
            return;
        }
        if (this.timeMin + this.widthMs > this.maxTimeMax) {
            this.timeMin = this.maxTimeMax - this.widthMs;
            return;
        }
    }

    setCursorTime(cursorTime) {
        this.cursorTime = cursorTime;
    }

    setHighlightRegion(highlightRegion) {
        this.highlightRegion = highlightRegion;
        if (!this.highlightRegion) {
            return;
        }

        if (this.highlightRegion.endTime < this.timeMin ||
            this.highlightRegion.startTime > this.timeMin + this.widthMs) {
            // Center on new highlight region
            this.timeMin = (this.highlightRegion.startTime + this.highlightRegion.endTime) / 2 - this.widthMs / 2;
        }
    }

    /**
     * @param {TimeRegion} displayRegion
     */
    setDisplayRegion(displayRegion) {
        this.displayRegion = Object.assign({}, displayRegion);
        if (!this.displayRegion) {
            this.resetBounds();
            return;
        }

        let {startTime, endTime} = this.displayRegion;
        let unbounded = endTime <= 0;

        if (!unbounded) {
            // Pin timeline to the bounds being set
            this.scrolled = true;
        }

        if (startTime <= 0) {
            startTime = Date.now();
            this.displayRegion.startTime = startTime;
        }
        if (endTime <= 0) {
            endTime = startTime + DEFAULT_WIDTH_MS;
            this.displayRegion.endTime = endTime;
        }

        // Snap zoom to equal entire displayRegion
        let newWidthMs = endTime - startTime;
        this.timeMin = startTime;
        this.widthMs = Math.max(newWidthMs, MIN_WIDTH_MS);
        this.minTimeMin = this.timeMin;
        if (this.width > 0) {
            this.pixelsPerMs = this.width / this.widthMs;
        } else {
            this.pixelsPerMs = -1;
        }

        if (unbounded) {
            this.maxTimeMax = Number.MAX_VALUE;
            this.maxWidthMs = DEFAULT_MAX_WIDTH_MS;
        } else {
            this.maxTimeMax = this.timeMin + this.widthMs;
            // Set maximum to be fully encompassing board
            this.maxWidthMs = this.widthMs;
        }
    }

    resetBounds() {
        this.maxWidthMs = DEFAULT_MAX_WIDTH_MS;
        this.minTimeMin = 0;
        this.maxTimeMax = Number.MAX_VALUE;
    }

    onPointerUp(event) {
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        this.updatePointer(event);

        const regionCard = this.getRegionCardUnderPointer();
        if (regionCard && this.dragMode === DragMode.NONE) {
            if (regionCard.displayActive) {
                regionCard.hide();
            } else {
                regionCard.show();
                realityEditor.motionStudy.showMatchingRegionCards(regionCard);
            }
        } else if (this.dragMode === DragMode.SELECT &&
            Math.abs(this.timeToX(this.highlightStartTime) - this.mouseX) < 3) {
            this.motionStudy.setHighlightRegion(null);
        } else {
            setAnimationMode(AnimationMode.region);
        }

        this.dragMode = DragMode.NONE;
        this.motionStudy.setCursorTime(-1);

        event.stopPropagation();
    }

    onPointerOver(event) {
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        this.updatePointer(event);
    }

    onPointerOut(event) {
        // Cancel ongoing drag
        if (this.dragMode === DragMode.SELECT) {
            this.onPointerUp(event);
        } else {
            this.dragMode = DragMode.NONE;
            this.motionStudy.setCursorTime(-1);
        }
    }

    onWheel(event) {
        this.updatePointer(event);

        const timeBefore = this.xToTime(this.mouseX);

        if (Math.abs(event.deltaY) * 1.3 > Math.abs(event.deltaX)) {
            let factor = 1 + Math.abs(event.deltaY) * 0.01;
            if (event.deltaY < 0) {
                // Preserves same scrolling speed
                factor = 1 / factor;
            }
            this.widthMs *= factor;
            if (this.widthMs > this.maxWidthMs) {
                this.widthMs = this.maxWidthMs;
                if (this.maxWidthMs !== DEFAULT_MAX_WIDTH_MS) {
                    this.timeMin = this.minTimeMin;
                }
            }
            if (this.widthMs < MIN_WIDTH_MS) {
                this.widthMs = MIN_WIDTH_MS;
            }

            // let timeCenter = this.timeMin + this.widthMs / 2;
            this.pixelsPerMs = this.width / this.widthMs;
            // this.timeMin = timeCenter - this.widthMs / 2;

            // Do some math to keep timeBefore at the same x value
            let newTimeMin = timeBefore - this.mouseX / this.pixelsPerMs;
            if (newTimeMin >= this.minTimeMin && newTimeMin <= this.maxTimeMax - this.widthMs) {
                this.timeMin = newTimeMin;
            }
        } else {
            let dTime = event.deltaX / this.pixelsPerMs;
            this.timeMin -= dTime;
        }

        this.limitTimeMin();

        this.scrolled = true;

        event.preventDefault();
        event.stopPropagation();
    }
}

