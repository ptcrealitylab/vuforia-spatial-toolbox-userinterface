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
        labelContainer.style.transform = 'translateX(-50%) translateY(-100%) translateZ(3000px) scale(' + scale + ')';
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

// TODO: complete this
const SpaghettiSelectionState = {
    NONE: {
        onPointerDown: (_spaghetti, _e) => {
            // let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [this.horizontalMesh, this.wallMesh]);
            // TODO: handle intersections
        },
        onPointerMove: (_spaghetti, _e) => {},
        updateMesh: (_spaghetti) => {}
    },
    SINGLE: {
        onPointerDown: (_spaghetti, _e) => {
            // let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [this.horizontalMesh, this.wallMesh]);
            // TODO: handle intersections
        },
        onPointerMove: (_spaghetti, _e) => {},
        updateMesh: (_spaghetti) => {}
    },
    RANGE: {
        onPointerDown: (_spaghetti, _e) => {
            // let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [this.horizontalMesh, this.wallMesh]);
            // TODO: handle intersections
        },
        onPointerMove: (_spaghetti, _e) => {},
        updateMesh: (_spaghetti) => {}
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
        this.hoverIndex = -1; // TODO: ensure this is updated where appropriate
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
            pt.hoverColor = [threeHighlightColor.r * 255, threeHighlightColor.g * 255, threeHighlightColor.b * 255];
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
        // let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [this.horizontalMesh, this.wallMesh]);
        // TODO: handle intersections
        
        // TODO: show measurement label when hovering over a second point
        // this.getMeasurementLabel().goToPointer(e.pageX, e.pageY);
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
    
    updateMesh() {
        // TODO: consider calling on frame update instead of whenever
        this.selectionState.updateMesh(this);
    }

    updateMeshWithComparer() {
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

        this.hoverIndex = index;
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
            return;
        }

        // TODO: set highlightRegion
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
        // TODO: reset state
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
