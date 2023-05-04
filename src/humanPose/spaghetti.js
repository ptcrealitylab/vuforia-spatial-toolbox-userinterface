import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { MeshPath } from "../gui/ar/meshPath.js";
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
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, spaghetti.meshPaths);
            const index = spaghetti.getPointFromIntersects(intersects);
            if (index === -1) {
                return;
            }
            SpaghettiSelectionState.SINGLE.transition(spaghetti, index);
        },
        onPointerMove: (spaghetti, e) => {
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, spaghetti.meshPaths);
            spaghetti.cursorIndex = spaghetti.getPointFromIntersects(intersects);
            if (spaghetti.cursorIndex === -1) {
                // Note: Cannot set analytics cursor time to -1 here because other spaghettis may be hovering, handled by HPA
                return;
            }
            setAnimationMode(AnimationMode.cursor);
            if (spaghetti.analytics) {
                spaghetti.analytics.setCursorTime(spaghetti.points[spaghetti.cursorIndex].timestamp, true);
            }
        },
        colorPoints: (spaghetti) => {
            spaghetti.points.forEach((point, index) => {
                if (index === spaghetti.cursorIndex) {
                    point.color = [...point.cursorColor];
                } else {
                    point.color = [...point.originalColor];
                }
            });
        },
        isIndexSelectable: (_spaghetti, _index) => {
            return true;
        },
        transition: (spaghetti) => {
            spaghetti.highlightRegion = {
                startIndex: -1,
                endIndex: -1,
            }
            spaghetti.selectionState = SpaghettiSelectionState.NONE;

            spaghetti.getMeasurementLabel().requestVisible(false, spaghetti.pathId);
            
            // Cannot set animation mode here, other spaghetti may be selected, HPA update function resolves this
        }
    },
    SINGLE: {
        onPointerDown: (spaghetti, e) => {
            let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, spaghetti.meshPaths);
            const index = spaghetti.getPointFromIntersects(intersects);
            if (index === -1) {
                SpaghettiSelectionState.NONE.transition(spaghetti);
                return;
            }
            const initialSelectionIndex = spaghetti.highlightRegion.startIndex;
            if (index === initialSelectionIndex) {
                SpaghettiSelectionState.NONE.transition(spaghetti);
            } else {
                const minIndex = Math.min(index, initialSelectionIndex);
                const maxIndex = Math.max(index, initialSelectionIndex);
                SpaghettiSelectionState.RANGE.transition(spaghetti, minIndex, maxIndex);
            }
        },
        onPointerMove: (spaghetti, e) => {
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, spaghetti.meshPaths);
            spaghetti.cursorIndex = spaghetti.getPointFromIntersects(intersects);
            if (spaghetti.cursorIndex === -1) {
                // Note: Cannot set cursor time to -1 here because other spaghettis may be hovering, handled by HPA
                return;
            }

            const initialSelectionIndex = spaghetti.highlightRegion.startIndex
            const minIndex = Math.min(spaghetti.cursorIndex, initialSelectionIndex);
            const maxIndex = Math.max(spaghetti.cursorIndex, initialSelectionIndex);

            if (spaghetti.analytics) {
                spaghetti.analytics.setCursorTime(spaghetti.points[spaghetti.cursorIndex].timestamp, true);
                spaghetti.analytics.setHighlightRegion({
                    startTime: spaghetti.points[minIndex].timestamp,
                    endTime: spaghetti.points[maxIndex].timestamp
                }, true);
            }
            setAnimationMode(AnimationMode.regionAll);

            const points = spaghetti.points;
            const distanceMm = spaghetti.getDistanceAlongPath(minIndex, maxIndex);
            const timeMs = points[maxIndex].timestamp - points[minIndex].timestamp;
            spaghetti.getMeasurementLabel().updateTextLabel(distanceMm, timeMs);
            spaghetti.getMeasurementLabel().requestVisible(true, spaghetti.pathId);
            spaghetti.getMeasurementLabel().goToPointer(e.pageX, e.pageY);
        },
        colorPoints: (spaghetti) => {
            spaghetti.points.forEach((point, index) => {
                if (index === spaghetti.cursorIndex || index === spaghetti.highlightRegion.startIndex) {
                    // Highlight handles (cursor point and selected point)
                    point.color = [...point.cursorColor];
                } else {
                    if (spaghetti.cursorIndex === -1 || spaghetti.cursorIndex === spaghetti.highlightRegion.startIndex) {
                        // If no cursor, or cursor still on selection point, show faded color everywhere
                        point.color = [...point.fadedColor];
                    } else {
                        // If cursor, show original color for points within handles, faded color for points outside
                        const minIndex = Math.min(spaghetti.cursorIndex, spaghetti.highlightRegion.startIndex);
                        const maxIndex = Math.max(spaghetti.cursorIndex, spaghetti.highlightRegion.startIndex);
                        if (index >= minIndex && index <= maxIndex) {
                            point.color = [...point.originalColor];
                        } else {
                            point.color = [...point.fadedColor];
                        }
                    }
                }
            });
        },
        isIndexSelectable: (_spaghetti, _index) => {
            return true;
        },
        transition: (spaghetti, index) => {
            spaghetti.highlightRegion.startIndex = index;
            spaghetti.highlightRegion.endIndex = index;
            spaghetti.selectionState = SpaghettiSelectionState.SINGLE;

            spaghetti.getMeasurementLabel().requestVisible(false, spaghetti.pathId);
        }
    },
    RANGE: {
        onPointerDown: (spaghetti, e) => {
            let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, spaghetti.meshPaths);
            const index = spaghetti.getPointFromIntersects(intersects);
            if (index === -1) {
                SpaghettiSelectionState.NONE.transition(spaghetti);
                return;
            }

            SpaghettiSelectionState.SINGLE.transition(spaghetti, index);
        },
        onPointerMove: (spaghetti, e) => {
            const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, spaghetti.meshPaths);
            const index = spaghetti.getPointFromIntersects(intersects); // Ensures if index is returned, it is within the selection range
            if (index === -1) {
                spaghetti.cursorIndex = -1;
                return;
            }

            spaghetti.cursorIndex = index;
            setAnimationMode(AnimationMode.cursor);
            if (spaghetti.analytics) {
                spaghetti.analytics.setCursorTime(spaghetti.points[spaghetti.cursorIndex].timestamp, true);
            }
        },
        colorPoints: (spaghetti) => {
            spaghetti.points.forEach((point, index) => {
                if (index === spaghetti.highlightRegion.startIndex || index === spaghetti.highlightRegion.endIndex) {
                    // Highlight handles (selected points)
                    point.color = [...point.cursorColor];
                } else if (index === spaghetti.cursorIndex && spaghetti.cursorIndex >= spaghetti.highlightRegion.startIndex && spaghetti.cursorIndex <= spaghetti.highlightRegion.endIndex) {
                    // Highlight cursor point as well if it is within the selection range
                    point.color = [...point.cursorColor];
                } else {
                    if (index >= spaghetti.highlightRegion.startIndex && index <= spaghetti.highlightRegion.endIndex) {
                        point.color = [...point.originalColor];
                    } else {
                        point.color = [...point.fullFadedColor];
                    }
                }
            });
        },
        isIndexSelectable: (spaghetti, index) => {
            return index >= spaghetti.highlightRegion.startIndex && index <= spaghetti.highlightRegion.endIndex;
        },
        transition: (spaghetti, startIndex, endIndex) => {
            spaghetti.highlightRegion.startIndex = startIndex;
            spaghetti.highlightRegion.endIndex = endIndex;
            spaghetti.selectionState = SpaghettiSelectionState.RANGE;

            spaghetti.getMeasurementLabel().requestVisible(false, spaghetti.pathId);

            if (spaghetti.analytics) {
                spaghetti.analytics.setCursorTime(spaghetti.points[spaghetti.highlightRegion.startIndex].timestamp, true);
                spaghetti.analytics.setHighlightRegion({
                    startTime: spaghetti.points[startIndex].timestamp,
                    endTime: spaghetti.points[endIndex].timestamp
                }, true);
            }
            setAnimationMode(AnimationMode.region);
        }
    }
}

/**
 * A spaghetti object handles the rendering of multiple paths and the touch events for selecting on those paths
 */
export class Spaghetti extends THREE.Group {
    constructor(points, analytics, name, params) {
        super();
        this.points = [];
        this.analytics = analytics; // Null when used outside of pose analytics, e.g. camera spaghetti lines 
        this.name = name;
        this.meshPathParams = params; // Used for mesh path creation
        this.meshPaths = [];
        this.pathId = realityEditor.device.utilities.uuidTime(); // Used for measurement label

        this._selectionState = SpaghettiSelectionState.NONE;
        this.highlightRegion = {
            startIndex: -1,
            endIndex: -1
        }
        this._cursorIndex = -1;

        this.setupPointerEvents();
        this.addPoints(points);
    }
    
    get selectionState() {
        return this._selectionState;
    }
    
    set selectionState(state) {
        this._selectionState = state;
        this.updateColors();
    }
    
    get cursorIndex() {
        return this._cursorIndex;
    }
    
    set cursorIndex(index) {
        if (index === this._cursorIndex) {
            return;
        }
        this._cursorIndex = index;
        this.updateColors();
    }

    /**
     * Adds points to the spaghetti line, creating new mesh paths as needed.
     * Only supports appending points to the end of the spaghetti line.
     * @param {Array} points - points to add
     */
    addPoints(points) {
        if (points.length === 0) {
            return;
        }
        let pointsToAdd = []; // Queue up points that will be part of the same MeshPath into a buffer to enable adding them in bulk
        points.forEach((point) => {
            // [0-255, 0-255, 0-255] format
            if (!point.color.isColor) {
                point.color = new THREE.Color(point.color[0] / 255, point.color[1] / 255, point.color[2] / 255);
            }
            point.originalColor = [point.color.r * 255, point.color.g * 255, point.color.b * 255, 255];
            const fadeColor = AnalyticsColors.fade(point.color, 0.2);
            point.fadedColor = [fadeColor.r * 255, fadeColor.g * 255, fadeColor.b * 255, 0.5 * 255];
            point.fullFadedColor = [fadeColor.r * 255, fadeColor.g * 255, fadeColor.b * 255, 0.3 * 255];
            const cursorColor = AnalyticsColors.highlight(point.color);
            point.cursorColor = [cursorColor.r * 255, cursorColor.g * 255, cursorColor.b * 255, 255];
            
            if (this.points.length === 0) {
                // Create a new mesh path for the first point of the spaghetti line
                const initialMeshPath = new MeshPath([point], this.meshPathParams);
                this.meshPaths.push(initialMeshPath);
                this.add(initialMeshPath);
                this.points.push(point);
                return;
            }

            // Get the most recent point on the spaghetti line including the points we plan to add
            const lastPoint = pointsToAdd.length > 0 ?
                pointsToAdd[pointsToAdd.length - 1] :
                this.points[this.points.length - 1];
            const lastPointVector = new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z);
            const currentPointVector = new THREE.Vector3(point.x, point.y, point.z);

            // Split into separate mesh paths if the distance between points is too large
            if (lastPointVector.distanceToSquared(currentPointVector) > 800 * 800) {
                // lastMeshPath is guaranteed to exist if there is a lastPoint
                const lastMeshPath = this.meshPaths[this.meshPaths.length - 1];
                // Add bulk points to most recent path
                lastMeshPath.addPoints(pointsToAdd);
                this.points.push(...pointsToAdd);
                pointsToAdd = [];
                // Create a new path for the current point
                const newMeshPath = new MeshPath([point], this.meshPathParams);
                this.meshPaths.push(newMeshPath);
                this.add(newMeshPath);
                this.points.push(point);
            } else {
                // Queue up the point to be added in bulk if close enough to be part of the same MeshPath
                pointsToAdd.push(point);
            }
        });
        // Add any remaining points to the last mesh path
        if (pointsToAdd.length > 0) {
            const lastMeshPath = this.meshPaths[this.meshPaths.length - 1];
            lastMeshPath.addPoints(pointsToAdd);
            this.points.push(...pointsToAdd);
        }

        this.updateColors();
    }
    
    setPoints(points) {
        this.reset();
        this.addPoints(points);
    }

    /**
     * Deallocates all mesh paths and points, and removes them from the scene
     */
    reset() {
        this.meshPaths.forEach((meshPath) => {
            meshPath.resetPoints();
            this.remove(meshPath);
        });
        this.points = [];
        this.meshPaths = [];
        SpaghettiSelectionState.NONE.transition(this);
        this.cursorIndex = -1;
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

    /**
     * @param {number} timestamp - time that is hovered in ms
     */
    setCursorTime(timestamp) {
        let index = -1;
        for (let i = 0; i < this.points.length; i++) {
            let point = this.points[i];
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

        let startIndex = -1;
        let endIndex = -1;
        for (let i = 0; i < this.points.length; i++) {
            let point = this.points[i];
            if (startIndex < 0 && point.timestamp >= firstTimestamp) {
                startIndex = i;
            }
            if (endIndex < 0 && point.timestamp >= secondTimestamp) {
                endIndex = i;
                break;
            }
        }
        if (startIndex >= 0 && endIndex < 0) {
            endIndex = this.points.length - 1;
        }
        if (startIndex < 0 || endIndex < 0 || startIndex === endIndex) {
            if (this.selectionState !== SpaghettiSelectionState.NONE) {
                SpaghettiSelectionState.NONE.transition(this);
            }
            return;
        }

        // NOTE: this transition is done manually to prevent animation modes from being replaced when timeline sets it
        // to regionAll during a drag selection
        this.highlightRegion = {
            startIndex,
            endIndex
        }
        this.selectionState = SpaghettiSelectionState.RANGE;
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
        for (let i = 0; i < this.points.length; i++) {
            let point = this.points[i];
            if (firstIndex < 0 && point.timestamp >= firstTimestamp) {
                firstIndex = i;
            }
            if (secondIndex < 0 && point.timestamp >= secondTimestamp) {
                secondIndex = i;
                break;
            }
        }
        if (firstIndex >= 0 && secondIndex < 0) {
            secondIndex = this.points.length - 1;
        }
        if (firstIndex < 0 || secondIndex < 0 || firstIndex === secondIndex) {
            return;
        }

        // this.setPoints(this.points.slice(firstIndex, secondIndex + 1)); // TODO: re-evaluate how this is done
        if (this.selectionState !== SpaghettiSelectionState.NONE) {
            SpaghettiSelectionState.NONE.transition(this);
        }
    }
    
    getDistanceAlongPath(index1, index2) {
        const minIndex = Math.min(index1, index2);
        const maxIndex = Math.max(index1, index2);
        let distance = 0;
        let meshPath = this.getMeshPathFromIndex(minIndex);
        let finalMeshPath = this.getMeshPathFromIndex(maxIndex);
        if (meshPath === finalMeshPath) {
            return meshPath.getDistanceAlongPath(this.getIndexWithinPath(minIndex), this.getIndexWithinPath(maxIndex));
        }
        distance += meshPath.getDistanceAlongPath(this.getIndexWithinPath(minIndex), meshPath.currentPoints.length - 1);
        for (let i = this.meshPaths.indexOf(meshPath) + 1; i < this.meshPaths.indexOf(finalMeshPath); i++) {
            distance += this.meshPaths[i].getDistanceAlongPath(0, this.meshPaths[i].currentPoints.length - 1);
        }
        distance += finalMeshPath.getDistanceAlongPath(0, this.getIndexWithinPath(maxIndex));
        return distance;
    }

    getMeasurementLabel() {
        if (!sharedMeasurementLabel) {
            sharedMeasurementLabel = new MeasurementLabel();
        }
        return sharedMeasurementLabel;
    }

    onPointerDown(e) {
        this.selectionState.onPointerDown(this, e);
    }

    onPointerMove(e) {
        this.selectionState.onPointerMove(this, e);
    }

    updateColors() {
        this.selectionState.colorPoints(this)
        this.meshPaths.forEach((meshPath) => {
            meshPath.updateColors(meshPath.currentPoints.map((pt, index) => index));
        });
    }
    
    getMeshPathFromIndex(index) {
        if (index < 0) {
            return this.meshPaths[0];
        } else if (index >= this.points.length) {
            return this.meshPaths[this.meshPaths.length - 1];
        }
        let meshPathIndex = 0;
        let meshPath = this.meshPaths[meshPathIndex];
        let i = 0;
        while (i + meshPath.currentPoints.length - 1 < index) {
            i += meshPath.currentPoints.length;
            meshPathIndex++;
            meshPath = this.meshPaths[meshPathIndex];
        }
        return meshPath;
    }
    
    getIndexWithinPath(index) {
        if (index < 0) {
            return 0;
        } else if (index >= this.points.length) {
            return this.meshPaths[this.meshPaths.length - 1].currentPoints.length - 1;
        }
        let meshPathIndex = 0;
        let meshPath = this.meshPaths[meshPathIndex];
        let i = 0;
        while (i + meshPath.currentPoints.length - 1 < index) {
            i += meshPath.currentPoints.length;
            meshPathIndex++;
            meshPath = this.meshPaths[meshPathIndex];
        }
        return index - i;
    }

    /**
     * Get the index of the point in the currentPoints array that the closest valid intersect is closest to
     * @param {Array} intersects - the array of intersect objects returned by three.js raycasting
     * @return {number} index of the point in the currentPoints array that the closest valid intersect is closest to
     */
    getPointFromIntersects(intersects) {
        for (let i = 0; i < intersects.length; i++) {
            const intersect = intersects[i];
            const index = this.getPointFromIntersect(intersect);
            if (this.selectionState.isIndexSelectable(this, index)) {
                return index;
            }
        }
        return -1;
    }
    
    getPointFromIntersect(intersect) {
        const meshPath = intersect.object.parent;
        const indexWithinMeshPath = meshPath.getPointFromIntersect(intersect);
        const meshPathIndex = this.meshPaths.indexOf(meshPath);
        const priorMeshPathPointCount = this.meshPaths.slice(0, meshPathIndex).reduce((sum, meshPath) => sum + meshPath.currentPoints.length, 0);
        return priorMeshPathPointCount + indexWithinMeshPath;
    }

    /**
     * @return {number} start time of mesh path or -1 if zero-length
     */
    getStartTime() {
        if (this.points.length === 0) {
            return -1;
        }
        return this.points[0].timestamp;
    }

    /**
     * @return {number} end time of mesh path or -1 if zero-length
     */
    getEndTime() {
        if (this.points.length === 0) {
            return -1;
        }
        return this.points[this.points.length - 1].timestamp;
    }
}
