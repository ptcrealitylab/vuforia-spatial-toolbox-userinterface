import {RegionCard} from './regionCard.js';
import {
    getHistoryPointsInTimeInterval,
} from '../humanPose/draw.js';

const needleTopPad = 4;
const needleTipWidth = 12;
const needlePad = 12;
const needleWidth = 3;
const needleDragWidth = 8;

const rowPad = 4;
const rowHeight = 10;
const boardHeight = 6 * (rowPad + rowHeight) + rowPad;
const boardStart = needlePad + needleTopPad;

const labelPad = 4;

const DragMode = {
    NONE: 'none',
    SELECT: 'select',
    PAN: 'pan',
};

class TextLabel {
    constructor(container) {
        this.element = document.createElement('div');
        this.element.classList.add('timelineBoardLabel');
        container.appendChild(this.element);
    }

    show() {
        this.element.classList.add('shown');
    }

    hide() {
        this.element.classList.remove('shown');
    }

    setText(text) {
        this.element.textContent = text;
    }

    moveTo(x, y) {
        this.element.style.left = x + 'px';
        this.element.style.bottom = y + 'px';
    }
}

export class Timeline {
    constructor(container) {
        this.container = container;

        this.canvas = document.createElement('canvas');
        this.canvas.classList.add('analytics-timeline');
        this.gfx = this.canvas.getContext('2d');
        this.pixelsPerMs = 0.01; // 1024 * 100 / (24 * 60 * 60 * 1000);
        this.timeMin = -1;
        this.widthMs = -1;
        this.scrolled = true;
        container.appendChild(this.canvas);
        this.poses = [];
        this.width = -1;
        this.height = boardHeight + boardStart + needlePad;
        this.highlightRegion = null;
        this.regionCard = null;
        this.lastRegionCardCacheKey = '';

        this.dragMode = DragMode.NONE;
        this.mouseX = -1;
        this.mouseY = -1;

        this.boardLabelLeft = new TextLabel(container);
        this.boardLabelRight = new TextLabel(container);

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
    }

    draw() {
        if (this.width < 0) {
            let rect = this.canvas.getBoundingClientRect();
            if (rect.width <= 0) {
                return;
            }

            this.width = rect.width;
            this.widthMs = this.width / this.pixelsPerMs;
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.gfx.width = this.width;
            this.gfx.height = this.height;
        }
        if (this.timeMin > 0 && !this.scrolled) {
            this.timeMin = Date.now() - this.widthMs / 2;
        }

        this.gfx.clearRect(0, 0, this.width, this.height);

        this.gfx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.gfx.fillRect(0, boardStart, this.width, boardHeight);

        this.drawPoses();

        if (this.highlightRegion) {
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

        this.updateBoardLabels();
        this.updateRegionCard();
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
        this.boardLabelLeft.setText(startLabel);
        this.boardLabelRight.setText(endLabel);

        this.boardLabelLeft.moveTo(0, this.height + labelPad - boardStart);
        this.boardLabelRight.moveTo(this.width, this.height + labelPad - boardStart);

        this.boardLabelLeft.show();
        this.boardLabelRight.show();
    }

    updateRegionCard() {
        if (!this.highlightRegion) {
            if (this.regionCard) {
                if (!this.regionCard.pinned) {
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
            if (!this.regionCard.pinned) {
                this.regionCard.remove();
            }
            this.regionCard = null;
        }
        this.regionCard = new RegionCard(this.container, getHistoryPointsInTimeInterval(leftTime, rightTime));

        this.regionCard.moveTo(midX, this.height + labelPad);
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

        highlight = this.isHighlight(lastPoseTime);
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
            this.highlightStartX = event.offsetX;
        } else {
            this.dragMode = DragMode.PAN;
        }
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
        if (this.isPointerOnActiveRow() || this.isPointerOnNeedle()) {
            cursor = 'col-resize';
        } else if (this.isPointerOnBoard()) {
            cursor = 'move';
        }
        this.canvas.style.cursor = cursor;

        realityEditor.analytics.setCursorTime(this.xToTime(this.mouseX));
    }

    onPointerMoveDragModeSelect(_event) {
        this.canvas.style.cursor = 'col-resize';
        let highlightEndX = this.mouseX;

        let startTime = this.xToTime(Math.min(this.highlightStartX, highlightEndX));
        let endTime = this.xToTime(Math.max(this.highlightStartX, highlightEndX));
        realityEditor.analytics.setHighlightRegion({
            startTime,
            endTime,
        });
    }

    onPointerMoveDragModePan(event) {
        this.canvas.style.cursor = 'move';
        let dTime = event.movementX / this.pixelsPerMs;
        this.timeMin -= dTime;
    }

    setCursorTime(cursorTime) {
        this.cursorTime = cursorTime;
    }

    setHighlightRegion(highlightRegion) {
        this.highlightRegion = highlightRegion;
        if (this.highlightRegion.endTime < this.timeMin ||
            this.highlightRegion.startTime > this.timeMin + this.widthMs) {
            // Center on new highlight region
            this.timeMin = (this.highlightRegion.startTime + this.highlightRegion.endTime) / 2 - this.widthMs / 2;
        }
    }

    onPointerUp(event) {
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        this.updatePointer(event);

        if (this.dragMode === DragMode.SELECT &&
            Math.abs(this.highlightStartX - this.mouseX) < 3) {
            this.setHighlightRegion(null);
        }

        this.dragMode = DragMode.NONE;
        realityEditor.analytics.setCursorTime(-1);

        event.stopPropagation();
    }

    onPointerOver(event) {
        if (realityEditor.device.isMouseEventCameraControl(event)) return;

        this.updatePointer(event);
    }

    onPointerOut(_event) {
        realityEditor.analytics.setCursorTime(-1);
    }

    onWheel(event) {
        this.updatePointer(event);

        const timeBefore = this.xToTime(this.mouseX);

        if (Math.abs(event.deltaY) * 1.3 > Math.abs(event.deltaX)) {
            const factor = 1 + event.deltaY * -0.01;
            this.pixelsPerMs *= factor;
            if (this.pixelsPerMs > 0.12) {
                this.pixelsPerMs = 0.12;
            } else if (this.pixelsPerMs < 0.0001) {
                this.pixelsPerMs = 0.0001;
            }

            // let timeCenter = this.timeMin + this.widthMs / 2;
            this.widthMs = this.width / this.pixelsPerMs;
            // this.timeMin = timeCenter - this.widthMs / 2;

            // Do some math to keep timeBefore at the same x value
            this.timeMin = timeBefore - this.mouseX / this.pixelsPerMs;
        } else {
            let dTime = event.deltaX / this.pixelsPerMs;
            this.timeMin -= dTime;
        }

        event.preventDefault();
        event.stopPropagation();
    }
}

