import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { MeshPath } from "../gui/ar/meshPath.js";
import * as utils from './utils.js'

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

// creates a Path that you can click on to measure the time and distance between points on the path
export class SpaghettiMeshPath extends MeshPath {
    constructor(path, params) {
        super(path, params);

        this.pathId = realityEditor.device.utilities.uuidTime();
        this.comparer = new KeyframeComparer();
        this.comparer.setMeshPath(this);
        this.cursor = this.createCursor(this.widthMm);
        this.setupPointerEvents();
        
        this.cursorDestination = null;
        this.cursorSnapDestination = null;
        
        realityEditor.gui.ar.draw.addUpdateListener(() => {
            if (this.cursor && this.cursorDestination) {
                let animatedPos = {
                    x: 0.5 * this.cursorDestination[0] + 0.5 * this.cursor.position.x,
                    y: 0.5 * this.cursorDestination[1] + 0.5 * this.cursor.position.y,
                    z: 0.5 * this.cursorDestination[2] + 0.5 * this.cursor.position.z
                };
                this.cursor.position.set(animatedPos.x, animatedPos.y, animatedPos.z);
            }
        });
    }
    
    setPoints(points) {
        super.setPoints(points);
        
        // calculate the horizontal plane at the average Y height of the path
        let yPoints = this.currentPoints.map(pt => pt.y);
        let avgY = yPoints.reduce((a, b) => a + b, 0) / yPoints.length;
        
        let rootCoords = realityEditor.sceneGraph.getSceneNodeById('ROOT');
        let groundPlaneCoords = realityEditor.sceneGraph.getGroundPlaneNode();
        this.planeOrigin = realityEditor.sceneGraph.convertToNewCoordSystem([0, avgY, 0], groundPlaneCoords, rootCoords);
        this.planeNormal = [0, 1, 0];
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

        let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [this.horizontalMesh, this.wallMesh]);
        if (intersects.length > 0 &&
            this.comparer.selectionState === SelectionState.SECOND) {
            this.comparer.selectionState = SelectionState.TIMELINE;
            this.frozen = true;
            return;
        }

        const isHover = false;
        this.selectFirstPathPoint(e.pageX, e.pageY, isHover);
    }
    
    onPointerMove(e) {
        if (this.frozen) {
            let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.pageX, e.pageY, [this.horizontalMesh, this.wallMesh]);
            if (intersects.length === 0) {
                return;
            }
            this.prevState = {
                firstPointIndex: this.comparer.firstPointIndex,
                secondPointIndex: this.comparer.secondPointIndex
            };
            this.frozen = false;
            this.comparer.reset();
        }

        if (this.comparer.firstPointIndex === null || this.comparer.selectionState === SelectionState.FIRST) {
            const isHover = true;
            this.selectFirstPathPoint(e.pageX, e.pageY, isHover);
            if (this.comparer.firstPointIndex === null && this.prevState) {
                this.frozen = true;
                this.comparer.setFirstPoint(this.prevState.firstPointIndex, false);
                this.comparer.setEndPoint(this.prevState.secondPointIndex);
                this.comparer.selectionState = SelectionState.TIMELINE;
                this.updateMeshWithComparer();
            }

            return;
        }

        this.getMeasurementLabel().goToPointer(e.pageX, e.pageY);

        // move cursor to where the pointer coordinates hit the plane that the spaghetti lies on
        let pointOnPlane = this.raycastOntoPathPlane(e.pageX, e.pageY);
        this.cursorDestination = [pointOnPlane.x, pointOnPlane.y, pointOnPlane.z];
        this.cursor.material.color.setHex(0xffffff);
        this.cursor.scale.set(1,1,1);

        // figure out where cursor would snap to the closest point on the path
        // for now, ignore y-distance... only x-z distance matters for snapping
        let snapIndex = null;
        let distanceSquaredToEachPoint = this.currentPoints.map(point => {
            return (point.x - this.cursorDestination[0]) * (point.x - this.cursorDestination[0]) +
                // (point.y - this.cursorDestination[1]) * (point.y - this.cursorDestination[1]) +
                (point.z - this.cursorDestination[2]) * (point.z - this.cursorDestination[2]);
        });

        let closestIndex = utils.indexOfMin(distanceSquaredToEachPoint);
        const SNAP_DISTANCE = 250;
        if (distanceSquaredToEachPoint[closestIndex] < SNAP_DISTANCE * SNAP_DISTANCE) {
            snapIndex = closestIndex;

            let closestPoint = this.currentPoints[closestIndex];
            let adjacentPoint = closestIndex < (this.currentPoints.length-1) ? this.currentPoints[closestIndex+1] : this.currentPoints[closestIndex-1];

            // snap to halfway point between two endpoints of the selected segment
            let avgX = (closestPoint.x + adjacentPoint.x) / 2;
            let avgY = ((closestPoint.y + this.heightMm/2) + (adjacentPoint.y + this.heightMm/2)) / 2;
            let avgZ = (closestPoint.z + adjacentPoint.z) / 2;
            this.cursorSnapDestination = [avgX, avgY, avgZ];

            this.cursor.material.color.setHex(0xff0000);
            this.cursor.scale.set(1.5, 1.5, 1.5);
        }

        this.selectSecondPathPoint(e.pageX, e.pageY, snapIndex);
    }

    isVisible() {
        return this.visible && this.parent && this.parent.visible;
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

    raycastOntoPathPlane(screenX, screenY) {
        let cameraNode = realityEditor.sceneGraph.getCameraNode();
        let pointOnPlane = realityEditor.gui.ar.utilities.getPointOnPlaneFromScreenXY(this.planeOrigin, this.planeNormal, cameraNode, screenX, screenY);
        let rootCoords = realityEditor.sceneGraph.getSceneNodeById('ROOT');
        let groundPlaneCoords = realityEditor.sceneGraph.getGroundPlaneNode();
        return realityEditor.sceneGraph.convertToNewCoordSystem(pointOnPlane, rootCoords, groundPlaneCoords);
    }
    
    selectFirstPathPoint(screenX, screenY, isHover) {
        if (this.resetIfNoGeometry()) return;

        let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [this.horizontalMesh, this.wallMesh]);
        if (intersects.length === 0) {
            this.comparer.reset();
            this.updateMeshWithComparer();
            this.updateAnalyticsHighlightRegion();
            this.cursor.visible = false;
            return;
        }
        let intersect = intersects[0];
        let pointIndex = this.getPointFromFace([intersect.face.a, intersect.face.b, intersect.face.c]);
        if (this.comparer.selectionState === SelectionState.SECOND) {
            this.comparer.reset();
            this.cursor.visible = false;
        } else {
            this.comparer.setFirstPoint(pointIndex, isHover);
        }
        this.updateMeshWithComparer();
        this.updateAnalyticsHighlightRegion();
    }

    selectSecondPathPoint(screenX, screenY, possibleSnapIndex) {
        if (this.resetIfNoGeometry()) return;

        let pointIndex = possibleSnapIndex;
        let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [this.horizontalMesh, this.wallMesh]);
        if (intersects.length > 0) {
            pointIndex = this.getPointFromFace([intersects[0].face.a, intersects[0].face.b, intersects[0].face.c]);
        } else if (typeof possibleSnapIndex === 'number') {
            this.cursorDestination = this.cursorSnapDestination;
        }
        this.comparer.setEndPoint(pointIndex);
        this.cursor.visible = true;
        this.updateMeshWithComparer();
        this.updateAnalyticsHighlightRegion();
        this.prevState = null;
    }
    
    resetIfNoGeometry() {
        if (!this.horizontalMesh || !this.wallMesh) {
            this.comparer.reset();
            this.updateMeshWithComparer();
            this.cursor.visible = false;
            return true;
        }
        return false;
    }

    updateAnalyticsHighlightRegion() {
        const comparer = this.comparer;
        const points = this.currentPoints;

        if (comparer.firstPointIndex !== null) {
            const firstTimestamp = points[comparer.firstPointIndex].timestamp;
            if (comparer.secondPointIndex !== null) {
                const secondTimestamp = points[comparer.secondPointIndex].timestamp;
                realityEditor.analytics.setHighlightRegion({
                    startTime: Math.min(firstTimestamp, secondTimestamp),
                    endTime: Math.max(firstTimestamp, secondTimestamp),
                }, true);
            } else {
                realityEditor.analytics.setCursorTime(firstTimestamp, true);
            }
        }
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
    setHoverTime(timestamp) {
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

        if (index < 0) {
            return;
        }

        this.comparer.selectionState = SelectionState.TIMELINE;
        this.comparer.setFirstPoint(index, true);
        this.updateMeshWithComparer();
    }

    /**
     * @param {number} firstTimestamp - start of interval in ms
     * @param {number} secondTimestamp - end of interval in ms
     */
    setHighlightTimeInterval(firstTimestamp, secondTimestamp) {
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

        this.frozen = true;
        this.comparer.setFirstPoint(firstIndex, false);
        this.comparer.setEndPoint(secondIndex);
        this.comparer.selectionState = SelectionState.TIMELINE;
        this.updateMeshWithComparer();
    }

    /**
     * Limits currentPoints to a subset of allPoints based on firstTimestamp
     * and secondTimestamp
     *
     * @param {number} firstTimestamp - start of interval in ms
     * @param {number} secondTimestamp - end of interval in ms
     */
    setDisplayTimeInterval(firstTimestamp, secondTimestamp) {
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
        this.comparer.reset();
        this.updateMeshWithComparer();
    }


    createCursor(radius = 50) {
        let cursorMesh = new THREE.Mesh(new THREE.SphereGeometry(radius,12,12), new THREE.MeshBasicMaterial({color:0xff0000})); // new THREE.MeshNormalMaterial());
        cursorMesh.visible = false;
        this.add(cursorMesh);
        return cursorMesh;
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

const SelectionState = {
    FIRST: 'first',
    SECOND: 'second',
    TIMELINE: 'timeline',
};

// Handles some state management for comparing two points on a MeshPath to each other
export class KeyframeComparer {
    constructor() {
        this.reset();
        this.previousColors = [];
    }
    reset() {
        this.selectionState = SelectionState.FIRST;
        this.firstPointIndex = null;
        this.secondPointIndex = null;
    }
    setMeshPath(meshPath) {
        this.meshPath = meshPath;
    }
    setFirstPoint(index, isHover) {
        if (isHover) {
            this.selectionState = SelectionState.FIRST;
        } else {
            this.selectionState = SelectionState.SECOND;
        }
        this.firstPointIndex = index;
    }
    setEndPoint(index) {
        if (this.firstPointIndex === null) return;
        if (index === this.firstPointIndex) return;
        this.secondPointIndex = index;
    }
    savePreviousColor(index, color) {
        this.previousColors.push({
            index: index,
            rgb: [color[0], color[1], color[2]]
        });
    }
    restorePreviousColors() {
        let restoredIndices = [];
        this.previousColors.forEach(elt => {
            this.meshPath.currentPoints[elt.index].color = [elt.rgb[0], elt.rgb[1], elt.rgb[2]];
            restoredIndices.push(elt.index);
        });
        this.previousColors = [];
        return restoredIndices;
    }
}
