import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { MeshPath } from "../gui/ar/meshPath.js";
import * as utils from './utils.js'
import {
    setAnimationMode,
    AnimationMode,
} from './draw.js';
import {AnalyticsColors} from "./AnalyticsColors.js";

// Approximate milliseconds between points (10 fps)
const POINT_RES_MS = 100;

// we will lazily instantiate a shared label that all SpaghettiMeshPaths can use
let sharedMeasurementLabel = null;

export function getMeasurementTextLabel(distanceMm, timeMs) {
    // round time and distance to 1 decimal place
    let distanceMeters = (distanceMm / 1000).toFixed(1);
    let timeSeconds = (timeMs / 1000).toFixed(1);
    let timeString = '';
    if (timeSeconds > 0) {
        timeString = ' traveled in ' + timeSeconds + 's';
    } else {
        timeString = ' traveled in < 1s';
    }

    return distanceMeters + 'm' + timeString;
}

class MeasurementLabel {
    constructor() {
        this.container = this.createTextLabel();
        this.visibilityRequests = {};
    }

    requestVisible(wantsVisible, pathId) {
        this.visibilityRequests[pathId] = wantsVisible;

        // go through all visibility requests, and hide the label if nothing needs it
        let anythingWantsVisible = Object.values(this.visibilityRequests).reduce((a, b) => a || b, false);
        this.container.style.display = anythingWantsVisible ? 'inline' : 'none';
    }

    goToPointer(pageX, pageY) {
        this.container.style.left = pageX + 'px'; // position it centered on the pointer sphere
        this.container.style.top = (pageY - 10) + 'px'; // slightly offset in y
    }

    updateTextLabel(distanceMm, timeMs) {
        this.container.children[0].innerText = getMeasurementTextLabel(distanceMm, timeMs);
    }

    createTextLabel(text, width = 240, fontSize = 18, scale = 1.33) {
        let labelContainer = document.createElement('div');
        labelContainer.classList.add('avatarBeamLabel');
        labelContainer.style.width = width + 'px';
        labelContainer.style.fontSize = fontSize + 'px';
        labelContainer.style.transform = 'translateX(-50%) translateY(-135%) translateZ(3000px) scale(' + scale + ')';
        document.body.appendChild(labelContainer);

        let label = document.createElement('div');
        labelContainer.appendChild(label);

        if (text) {
            label.innerText = text;
            labelContainer.classList.remove('displayNone');
        } else {
            label.innerText = text;
            labelContainer.classList.add('displayNone');
        }

        return labelContainer;
    }
}

const SpaghettiSelectionState = {
    NONE: {
        onPointerDown: (spaghetti, e) => {
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [spaghetti.horizontalMesh, spaghetti.wallMesh]);
            if (intersects.length === 0) {
                return;
            }
            const index = spaghetti.getPointFromIntersect(intersects[0]);
            SpaghettiSelectionState.SINGLE.transition(spaghetti, index);
        },
        onPointerMove: (spaghetti, e) => {
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [spaghetti.horizontalMesh, spaghetti.wallMesh]);
            if (intersects.length === 0) {
                spaghetti.cursorIndex = -1;
                // Note: Cannot set cursor time to -1 here because other spaghettis may be hovering, handled by HPA
                return;
            }
            spaghetti.cursorIndex = spaghetti.getPointFromIntersect(intersects[0]);
            setAnimationMode(AnimationMode.cursor);
            realityEditor.analytics.setCursorTime(spaghetti.currentPoints[spaghetti.cursorIndex].timestamp, true);
        },
        colorPoints: (spaghetti) => {
            spaghetti.currentPoints.forEach((point, index) => {
                if (index === spaghetti.cursorIndex) {
                    point.color = [...point.cursorColor];
                } else {
                    point.color = [...point.originalColor];
                }
            });
        },
        transition: (spaghetti) => {
            spaghetti.selectionState = SpaghettiSelectionState.NONE;
            spaghetti.highlightRegion.start = -1;
            spaghetti.highlightRegion.end = -1;

            spaghetti.getMeasurementLabel().requestVisible(false, spaghetti.pathId);
            
            // Cannot set animation mode here, other spaghetti may be selected, HPA update function resolves this
        }
    },
    SINGLE: {
        onPointerDown: (spaghetti, e) => {
            let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [spaghetti.horizontalMesh, spaghetti.wallMesh]);
            if (intersects.length === 0) {
                SpaghettiSelectionState.NONE.transition(spaghetti);
                return;
            }
            const index = spaghetti.getPointFromIntersect(intersects[0]);
            if (index === spaghetti.highlightRegion.start) {
                SpaghettiSelectionState.NONE.transition(spaghetti);
            } else {
                const minIndex = Math.min(index, spaghetti.highlightRegion.start);
                const maxIndex = Math.max(index, spaghetti.highlightRegion.start);
                SpaghettiSelectionState.RANGE.transition(spaghetti, minIndex, maxIndex);
            }
        },
        onPointerMove: (spaghetti, e) => {
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [spaghetti.horizontalMesh, spaghetti.wallMesh]);
            if (intersects.length === 0) {
                spaghetti.cursorIndex = -1;
                // Note: Cannot set cursor time to -1 here because other spaghettis may be hovering, handled by HPA
                return;
            }
            spaghetti.cursorIndex = spaghetti.getPointFromIntersect(intersects[0]);
            
            const minIndex = Math.min(spaghetti.cursorIndex, spaghetti.highlightRegion.start);
            const maxIndex = Math.max(spaghetti.cursorIndex, spaghetti.highlightRegion.start);

            realityEditor.analytics.setCursorTime(spaghetti.currentPoints[spaghetti.cursorIndex].timestamp, true);
            realityEditor.analytics.setHighlightRegion({
                startTime: spaghetti.currentPoints[minIndex].timestamp,
                endTime: spaghetti.currentPoints[maxIndex].timestamp
            }, true);
            setAnimationMode(AnimationMode.regionAll);

            const points = spaghetti.currentPoints;
            const distanceMm = spaghetti.getDistanceAlongPath(minIndex, maxIndex);
            const timeMs = points[maxIndex].timestamp - points[minIndex].timestamp;
            spaghetti.getMeasurementLabel().updateTextLabel(distanceMm, timeMs);
            spaghetti.getMeasurementLabel().requestVisible(true, spaghetti.pathId);
            spaghetti.getMeasurementLabel().goToPointer(e.pageX, e.pageY);
        },
        colorPoints: (spaghetti) => {
            spaghetti.currentPoints.forEach((point, index) => {
                if (index === spaghetti.cursorIndex || index === spaghetti.highlightRegion.start) {
                    // Highlight handles (cursor point and selected point)
                    point.color = [...point.cursorColor];
                } else {
                    if (spaghetti.cursorIndex === -1 || spaghetti.cursorIndex === spaghetti.highlightRegion.start) {
                        // If no cursor, or cursor still on selection point, show faded color everywhere
                        point.color = [...point.fadedColor];
                    } else {
                        // If cursor, show original color for points within handles, faded color for points outside
                        const minIndex = Math.min(spaghetti.cursorIndex, spaghetti.highlightRegion.start);
                        const maxIndex = Math.max(spaghetti.cursorIndex, spaghetti.highlightRegion.start);
                        if (index >= minIndex && index <= maxIndex) {
                            point.color = [...point.originalColor];
                        } else {
                            point.color = [...point.fadedColor];
                        }
                    }
                }
            });
        },
        transition: (spaghetti, index) => {
            spaghetti.selectionState = SpaghettiSelectionState.SINGLE;
            spaghetti.highlightRegion.start = index;
            spaghetti.highlightRegion.end = index;

            spaghetti.getMeasurementLabel().requestVisible(false, spaghetti.pathId);
        }
    },
    RANGE: {
        onPointerDown: (spaghetti, e) => {
            let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [spaghetti.horizontalMesh, spaghetti.wallMesh]);
            if (intersects.length === 0) {
                SpaghettiSelectionState.NONE.transition(spaghetti);
                return;
            }
            const index = spaghetti.getPointFromIntersect(intersects[0]);
            SpaghettiSelectionState.SINGLE.transition(spaghetti, index);
        },
        onPointerMove: (spaghetti, e) => {
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [spaghetti.horizontalMesh, spaghetti.wallMesh]);
            if (intersects.length === 0) {
                spaghetti.cursorIndex = -1;
                return;
            }
            const index = spaghetti.getPointFromIntersect(intersects[0]);
            if (index >= spaghetti.highlightRegion.start && index <= spaghetti.highlightRegion.end) {
                spaghetti.cursorIndex = index;
                setAnimationMode(AnimationMode.cursor);
                realityEditor.analytics.setCursorTime(spaghetti.currentPoints[spaghetti.cursorIndex].timestamp, true);
            }
        },
        colorPoints: (spaghetti) => {
            spaghetti.currentPoints.forEach((point, index) => {
                if (index === spaghetti.highlightRegion.start || index === spaghetti.highlightRegion.end) {
                    // Highlight handles (selected points)
                    point.color = [...point.cursorColor];
                } else if (index === spaghetti.cursorIndex && spaghetti.cursorIndex >= spaghetti.highlightRegion.start && spaghetti.cursorIndex <= spaghetti.highlightRegion.end) {
                    // Highlight cursor point as well if it is within the selection range
                    point.color = [...point.cursorColor];
                } else {
                    if (index >= spaghetti.highlightRegion.start && index <= spaghetti.highlightRegion.end) {
                        point.color = [...point.originalColor];
                    } else {
                        point.color = [...point.fadedColor];
                    }
                }
            });
        },
        transition: (spaghetti, startIndex, endIndex) => {
            spaghetti.selectionState = SpaghettiSelectionState.RANGE;
            spaghetti.highlightRegion.start = startIndex;
            spaghetti.highlightRegion.end = endIndex;

            spaghetti.getMeasurementLabel().requestVisible(false, spaghetti.pathId);

            realityEditor.analytics.setCursorTime(spaghetti.currentPoints[spaghetti.highlightRegion.start].timestamp, true);
            realityEditor.analytics.setHighlightRegion({
                startTime: spaghetti.currentPoints[startIndex].timestamp,
                endTime: spaghetti.currentPoints[endIndex].timestamp
            }, true);
            setAnimationMode(AnimationMode.region);
        }
    }
}

// creates a Path that you can click on to measure the time and distance between points on the path
export class SpaghettiMeshPath extends MeshPath {
    constructor(path, params) {
        super(path, params);
        this.allPoints = this.currentPoints;

        this.pathId = realityEditor.device.utilities.uuidTime();
        this.setupPointerEvents();
        
        this.selectionState = SpaghettiSelectionState.NONE;
        this.highlightRegion = {
            start: -1,
            end: -1
        }
        this.cursorIndex = -1;
        
        realityEditor.gui.threejsScene.onAnimationFrame(() => {
            this.updateColors();
        })
    }
    
    setAllPoints(points) {
        this.allPoints = points;
        this.setPoints(points);
    }

    /**
     * @typedef {MeshPathPoint} SpaghettiMeshPathPoint
     * @property {number} timestamp - the time in milliseconds since the start of the path
     */

    /**
     * Sets the points of the path, and also calculates the horizontal plane at the average Y height of the path
     * @param {SpaghettiMeshPathPoint[]} points - the points to set
     */
    setPoints(points) {
        super.setPoints(points);
        this.currentPoints.forEach(pt => {
            pt.originalColor = [...pt.color];
            const threeFadeColor = AnalyticsColors.fade(new THREE.Color(pt.color[0] / 255, pt.color[1] / 255, pt.color[2] / 255), 0.2);
            pt.fadedColor = [threeFadeColor.r * 255, threeFadeColor.g * 255, threeFadeColor.b * 255];
            const threeHighlightColor = AnalyticsColors.highlight(new THREE.Color(pt.color[0] / 255, pt.color[1] / 255, pt.color[2] / 255));
            pt.cursorColor = [threeHighlightColor.r * 255, threeHighlightColor.g * 255, threeHighlightColor.b * 255];
        }); // [0-255, 0-255, 0-255] format
    }

    getMeasurementLabel() {
        if (!sharedMeasurementLabel) {
            sharedMeasurementLabel = new MeasurementLabel();
        }
        return sharedMeasurementLabel;
    }

    onPointerDown(e) {
        if (!this.horizontalMesh || !this.wallMesh) {
            return;
        }

        this.selectionState.onPointerDown(this, e);
    }

    onPointerMove(e) {
        if (!this.horizontalMesh || !this.wallMesh) {
            return;
        }

        this.selectionState.onPointerMove(this, e);
    }

    isVisible() {
        let ancestorsAllVisible = true;
        let parent = this.parent;
        while (parent) {
            if (!parent.visible) {
                ancestorsAllVisible = false;
                break;
            }
            parent = parent.parent;
        }
        return this.visible && ancestorsAllVisible;
    }

    setupPointerEvents() {
        document.addEventListener('pointerdown', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) {
                this.getMeasurementLabel().requestVisible(false, this.pathId);
                return;
            }
            if (!this.isVisible()) {
                return;
            }
            this.onPointerDown(e);
        });
        document.addEventListener('pointermove', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) return;
            if (!this.isVisible()) {
                return;
            }
            this.onPointerMove(e);
        });
    }
    
    updateColors() {
        // update colors of points based on selection state and cursor index
        this.selectionState.colorPoints(this);
        super.updateColors(this.currentPoints.map((pt, index) => index));
    }

    updateMeshWithComparer() { // TODO: take measurement label code from here
        let comparer = this.comparer;
        let points = this.currentPoints;

        // revert to original state, and store indices of each vertex whose color changed
        let indicesToUpdate = this.comparer.restorePreviousColors();

        // refresh the color of the first point
        if (comparer.firstPointIndex !== null && points[comparer.firstPointIndex].color) {
            comparer.savePreviousColor(comparer.firstPointIndex, points[comparer.firstPointIndex].color);
            if (comparer.selectionState === SelectionState.FIRST) {
                points[comparer.firstPointIndex].color = [200, 255, 200];
            } else if (comparer.selectionState === SelectionState.SECOND) {
                points[comparer.firstPointIndex].color = [0, 127, 255];
            } else {
                points[comparer.firstPointIndex].color = [255, 255, 0];
            }
            indicesToUpdate.push(comparer.firstPointIndex);
        }

        // refresh the color of the second point, and color all the points in between
        // also displays a text label showing the time and distance along the path

        if (comparer.secondPointIndex === null) {
            this.getMeasurementLabel().requestVisible(false, this.pathId);
        } else {
            if (points[comparer.secondPointIndex].color) {
                // set all points in between first and second
                let biggerIndex = Math.max(comparer.firstPointIndex, comparer.secondPointIndex);
                let smallerIndex = Math.min(comparer.firstPointIndex, comparer.secondPointIndex);
                for (let i = smallerIndex + 1; i < biggerIndex; i++) {
                    comparer.savePreviousColor(i, points[i].color);
                    points[i].color = [255, 255, 0];
                    indicesToUpdate.push(i);
                }

                if (comparer.selectionState !== SelectionState.TIMELINE) {
                    comparer.savePreviousColor(comparer.secondPointIndex, points[comparer.secondPointIndex].color);
                    points[comparer.secondPointIndex].color = [255, 0, 0];
                    indicesToUpdate.push(comparer.secondPointIndex);
                }
            }

            let distanceMm = this.getDistanceAlongPath(comparer.firstPointIndex, comparer.secondPointIndex);
            let timeMs = 0;
            let firstTimestamp = points[comparer.firstPointIndex].timestamp;
            let secondTimestamp = points[comparer.secondPointIndex].timestamp;
            if (typeof firstTimestamp !== 'undefined' && typeof secondTimestamp !== 'undefined') {
                timeMs = Math.abs(firstTimestamp - secondTimestamp);
            }
            this.getMeasurementLabel().updateTextLabel(distanceMm, timeMs);
            if (!this.frozen) {
                this.getMeasurementLabel().requestVisible(true, this.pathId);
            }
        }

        // update the mesh buffer attributes to render the updated point colors
        this.updateColors(indicesToUpdate);
    }

    /**
     * @param {number} timestamp - time that is hovered in ms
     */
    setCursorTime(timestamp) {
        let index = -1;
        for (let i = 0; i < this.currentPoints.length; i++) {
            let point = this.currentPoints[i];
            if (Math.abs(point.timestamp - timestamp) < 0.9 * POINT_RES_MS) {
                index = i;
                break;
            }
            if (point.timestamp > timestamp) {
                // Exit early if we will never find a matching point
                break;
            }
        }

        this.cursorIndex = index;
    }

    /**
     * @param {{startTime: number, endTime: number}} highlightRegion
     */
    setHighlightRegion(highlightRegion) {
        const firstTimestamp = highlightRegion.startTime;
        const secondTimestamp = highlightRegion.endTime;

        let firstIndex = -1;
        let secondIndex = -1;
        for (let i = 0; i < this.currentPoints.length; i++) {
            let point = this.currentPoints[i];
            if (firstIndex < 0 && point.timestamp >= firstTimestamp) {
                firstIndex = i;
            }
            if (secondIndex < 0 && point.timestamp >= secondTimestamp) {
                secondIndex = i;
                break;
            }
        }
        if (firstIndex >= 0 && secondIndex < 0) {
            secondIndex = this.currentPoints.length - 1;
        }
        if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex) {
            if (this.selectionState !== SpaghettiSelectionState.NONE) {
                SpaghettiSelectionState.NONE.transition(this);
            }
            return;
        }

        // NOTE: this transition is done manually to prevent animation modes from being replaced when timeline sets it
        // to regionAll during a drag selection
        this.selectionState = SpaghettiSelectionState.RANGE;
        this.highlightRegion.start = firstIndex;
        this.highlightRegion.end = secondIndex;
    }

    /**
     * Limits currentPoints to a subset of allPoints based on the display
     * region
     *
     * @param {{startTime: number, endTime: number}} displayRegion
     */
    setDisplayRegion(displayRegion) {
        const firstTimestamp = displayRegion.startTime;
        const secondTimestamp = displayRegion.endTime;

        let firstIndex = -1;
        let secondIndex = -1;
        for (let i = 0; i < this.allPoints.length; i++) {
            let point = this.allPoints[i];
            if (firstIndex < 0 && point.timestamp >= firstTimestamp) {
                firstIndex = i;
            }
            if (secondIndex < 0 && point.timestamp >= secondTimestamp) {
                secondIndex = i;
                break;
            }
        }
        if (firstIndex >= 0 && secondIndex < 0) {
            secondIndex = this.allPoints.length - 1;
        }
        if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex) {
            return;
        }

        this.setPoints(this.allPoints.slice(firstIndex, secondIndex + 1));
        if (this.selectionState !== SpaghettiSelectionState.NONE) {
            SpaghettiSelectionState.NONE.transition(this);
        }
    }

    /**
     * @return {number} start time of mesh path or -1 if zero-length
     */
    getStartTime() {
        if (!this.currentPoints || this.currentPoints.length === 0) {
            return -1;
        }
        return this.currentPoints[0].timestamp;
    }

    /**
     * @return {number} end time of mesh path or -1 if zero-length
     */
    getEndTime() {
        if (!this.currentPoints || this.currentPoints.length === 0) {
            return -1;
        }
        return this.currentPoints[this.currentPoints.length - 1].timestamp;
    }
}
