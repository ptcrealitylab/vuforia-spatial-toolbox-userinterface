import {RegionCard, RegionCardState} from './regionCard.js';
import {
    setAnimationMode,
    AnimationMode, getPosesInTimeInterval,
} from '../humanPose/draw.js';

const needleTopPad = 4;
const needleTipWidth = 12;
const needlePad = 12;
const needleWidth = 3;
const needleDragWidth = 12;

const rowPad = 4;
const rowHeight = 16;
const boardHeight = 4 * (rowPad + rowHeight) + rowPad;
const boardStart = needlePad + needleTopPad;
const minimapHeight = rowHeight;
const minimapStart = boardStart + boardHeight + minimapHeight;

const labelPad = 4;

const DEFAULT_MAX_WIDTH_MS = 1024 / 0.00004;
const MIN_WIDTH_MS = 1024 / 0.12;

const DragMode = {
    NONE: 'none',
    SELECT: 'select',
    PAN: 'pan',
};

const DEFAULT_WIDTH_MS = 60 * 1000;

export class Timeline {
    /**
     * @param {Analytics} analytics - parent Analytics instance of this timeline
     * @param {Element} container - where to insert timeline
     */
    constructor(analytics, container) {
        this.analytics = analytics;
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
        this.poses = [];
        this.width = -1;
        this.displayRegion = null;
        this.height = boardHeight + boardStart + needlePad + minimapHeight;
        this.highlightRegion = null;
        this.highlightStartTime = -1;
        this.regionCard = null;
        this.lastRegionCardCacheKey = '';

        this.dragMode = DragMode.NONE;
        this.mouseX = -1;
        this.mouseY = -1;
        this.cursorTime = -1;

        this.lastDraw = Date.now();

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

        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        this.canvas.addEventListener('pointerover', this.onPointerOver);
        this.canvas.addEventListener('pointerout', this.onPointerOut);
        this.canvas.addEventListener('wheel', this.onWheel);

        realityEditor.device.layout.onWindowResized(this.recomputeSize.bind(this));
    }

    reset() {
        this.poses = [];
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

        this.gfx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.gfx.fillRect(0, boardStart, this.width, boardHeight);

        this.calculateAndDrawTicks();
        this.drawPoses();

        this.drawHighlightRegion();

        this.drawCursor();

        this.drawMinimap();

        this.updateBoardLabels();
        this.updateRegionCard();
    }

    drawHighlightRegion() {
        if (!this.highlightRegion) {
            return;
        }

        let startX = this.timeToX(this.highlightRegion.startTime);
        this.gfx.fillStyle = '#00ffff';
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
        this.gfx.fillStyle = 'white';
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

        if (this.regionCard) {
            if (this.regionCard.state !== RegionCardState.Pinned) {
                this.regionCard.remove();
            }
            this.regionCard = null;
        }
        this.regionCard = new RegionCard(this.analytics, this.container, getPosesInTimeInterval(leftTime, rightTime));

        this.regionCard.moveTo(midX, this.height + labelPad);

        this.analytics.setTimelineRegionCard(this.regionCard);
    }

    timeToX(timeMs) {
        return Math.round((timeMs - this.timeMin) * this.pixelsPerMs);
    }

    xToTime(x) {
        return x / this.pixelsPerMs + this.timeMin;
    }

    isHighlight(time) {
        if (!this.highlightRegion) {
            return false;
        }
        return time >= this.highlightRegion.startTime &&
            time <= this.highlightRegion.endTime;
    }

    drawPoses() {
        if (this.poses.length < 1) {
            return;
        }
        let lastPoseTime = this.poses[0].time;
        let startSectionTime = lastPoseTime;
        const maxPoseDelayLenience = 500;
        const rowY = boardStart + rowPad;
        const timeMax = this.timeMin + this.widthMs;

        let baseFill = 'hsl(120, 80%, 50%)';
        let baseFretFill = 'hsl(120, 100%, 66%)';
        let highlightFill = 'hsl(60, 100%, 50%)';
        let highlightFretFill = 'hsl(60, 100%, 66%)';

        let drawFrets = false && this.pixelsPerMs * 100 > 5;

        if (this.highlightRegion) {
            baseFill = 'hsl(120, 50%, 25%)';
        }

        let highlight = this.isHighlight(lastPoseTime);
        for (const pose of this.poses) {
            if (pose.time < this.timeMin) {
                startSectionTime = pose.time;
                lastPoseTime = pose.time;
                continue;
            }
            if (pose.time > this.timeMin + this.widthMs) {
                break;
            }
            const newHighlight = this.isHighlight(pose.time);
            const isHighlightSwap = highlight !== newHighlight;
            const isGap = pose.time - lastPoseTime > maxPoseDelayLenience;
            if (!isGap &&
                !isHighlightSwap) {
                lastPoseTime = pose.time;
                continue;
            }
            this.gfx.fillStyle =
                highlight ?
                highlightFill :
                baseFill;
            // When swapping highlight allow the pose section to clip on the
            // right side at the highlight region border
            let clippedRightTime = lastPoseTime;
            if (isHighlightSwap && !isGap) {
                if (newHighlight) {
                    clippedRightTime = this.highlightRegion.startTime;
                } else {
                    clippedRightTime = this.highlightRegion.endTime;
                }

                lastPoseTime = clippedRightTime;
            }

            highlight = newHighlight;
            const startX = this.timeToX(startSectionTime);
            const endX = this.timeToX(lastPoseTime);
            this.gfx.fillRect(
                startX,
                rowY,
                endX - startX,
                rowHeight
            );

            if (isHighlightSwap && !isGap) {
                // When swapping highlight extend the pose section
                // leftwards down to the highlight region border
                startSectionTime = lastPoseTime;
            } else {
                startSectionTime = pose.time;
            }
            lastPoseTime = pose.time;
        }

        if (timeMax - lastPoseTime < maxPoseDelayLenience) {
            lastPoseTime = timeMax;
        }

        highlight = this.isHighlight((startSectionTime + lastPoseTime) / 2);
        this.gfx.fillStyle =
            highlight ?
            highlightFill :
            baseFill;
        const startX = this.timeToX(startSectionTime);
        const endX = this.timeToX(lastPoseTime);
        this.gfx.fillRect(
            startX,
            rowY,
            endX - startX,
            rowHeight
        );


        if (drawFrets) {
            for (const pose of this.poses) {
                if (pose.time < this.timeMin) {
                    continue;
                }
                if (pose.time > this.timeMin + this.widthMs) {
                    break;
                }
                highlight = this.isHighlight(pose.time);
                this.gfx.fillStyle = highlight ?
                    highlightFretFill :
                    baseFretFill;

                this.gfx.beginPath();
                const x = this.timeToX(pose.time);
                const y = rowY + rowHeight / 2;
                this.gfx.arc(x, y, rowHeight / 5, 0, 2 * Math.PI);
                this.gfx.closePath();
                this.gfx.fill();
            }
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

    appendPose(pose) {
        this.poses.push(pose);
        if (this.timeMin < 0) {
            this.timeMin = pose.time - this.widthMs / 2;
        }
    }

    updatePointer(event) {
        this.mouseX = event.offsetX;
        this.mouseY = event.offsetY;
    }

    isPointerOnActiveRow() {
        return this.mouseY > boardStart &&
            this.mouseY < boardStart + rowPad * 2 + rowHeight;
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

    onPointerDown(event) {
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        this.updatePointer(event);

        if (this.isPointerOnActiveRow() || this.isPointerOnNeedle()) {
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
        this.analytics.setCursorTime(-1);
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
        } else if (this.isPointerOnActiveRow()) {
            cursor = 'col-resize';
        } else if (this.isPointerOnBoard()) {
            cursor = 'move';
        }
        this.canvas.style.cursor = cursor;

        this.analytics.setCursorTime(this.xToTime(this.mouseX));
    }

    onPointerMoveDragModeSelect(_event) {
        this.canvas.style.cursor = 'col-resize';
        let highlightEndTime = this.xToTime(this.mouseX);

        let startTime = Math.min(this.highlightStartTime, highlightEndTime);
        let endTime = Math.max(this.highlightStartTime, highlightEndTime);
        this.analytics.setHighlightRegion({
            startTime,
            endTime,
        });
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
        this.displayRegion = displayRegion;
        this.poses = [];
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
        this.widthMs = newWidthMs;
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

        if (this.dragMode === DragMode.SELECT &&
            Math.abs(this.timeToX(this.highlightStartTime) - this.mouseX) < 3) {
            this.analytics.setHighlightRegion(null);
        } else {
            setAnimationMode(AnimationMode.region);
        }

        this.dragMode = DragMode.NONE;
        this.analytics.setCursorTime(-1);

        event.stopPropagation();
    }

    onPointerOver(event) {
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        this.updatePointer(event);
    }

    onPointerOut(_event) {
        this.analytics.setCursorTime(-1);
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

