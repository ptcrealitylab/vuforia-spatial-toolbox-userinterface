import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { MeshPath } from "../gui/ar/meshPath.js";
import * as utils from './utils.js'

// creates a Path that you can click on to measure the time and distance between points on the path
export class SpaghettiMeshPath extends MeshPath {
    constructor(path, params) {
        super(path, params);
        
        this.comparer = new KeyframeComparer();
        this.comparer.setMeshPath(this);
        this.cursor = this.createCursor(this.width_mm);
        this.setupPointerEvents();
        
        this.cursorDestination = null;
        this.cursorSnapDestination = null;
        this.distanceLabelContainer = this.createTextLabel();
        
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

    onPointerDown(e) {
        const isHover = false;
        this.selectFirstPathPoint(e.pageX, e.pageY, isHover);
    }
    
    onPointerMove(e) {
        if (this.comparer.firstPointIndex === null || this.comparer.selectionState === 'first') {
            const isHover = true;
            this.selectFirstPathPoint(e.pageX, e.pageY, isHover);
            return;
        }

        if (this.distanceLabelContainer) {
            this.distanceLabelContainer.style.left = e.pageX + 'px'; // position it centered on the pointer sphere
            this.distanceLabelContainer.style.top = (e.pageY - 10) + 'px'; // slightly offset in y
        }

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
            let avgY = ((closestPoint.y + this.height_mm/2) + (adjacentPoint.y + this.height_mm/2)) / 2;
            let avgZ = (closestPoint.z + adjacentPoint.z) / 2;
            this.cursorSnapDestination = [avgX, avgY, avgZ];

            this.cursor.material.color.setHex(0xff0000);
            this.cursor.scale.set(1.5, 1.5, 1.5);
        }

        this.selectSecondPathPoint(e.pageX, e.pageY, snapIndex);
    }
    
    setupPointerEvents() {
        document.addEventListener('pointerdown', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) return;
            this.onPointerDown(e);
        });
        document.addEventListener('pointermove', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) return;
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
            this.cursor.visible = false;
            return;
        }
        let intersect = intersects[0];
        let pointIndex = this.getPointFromFace([intersect.face.a, intersect.face.b, intersect.face.c]);
        if (this.comparer.selectionState === 'second') {
            this.comparer.reset();
            this.cursor.visible = false;
        } else {
            this.comparer.setFirstPoint(pointIndex, isHover);
        }
        this.updateMeshWithComparer();
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
    
    updateMeshWithComparer() {
        let comparer = this.comparer;
        let points = this.currentPoints;

        // revert to original state, and store indices of each vertex whose color changed
        let indicesToUpdate = this.comparer.restorePreviousColors();

        // refresh the color of the first point
        if (comparer.firstPointIndex !== null && points[comparer.firstPointIndex].color) {
            comparer.savePreviousColor(comparer.firstPointIndex, points[comparer.firstPointIndex].color);
            if (comparer.selectionState === 'first') {
                points[comparer.firstPointIndex].color = [200, 255, 200];
            } else {
                points[comparer.firstPointIndex].color = [0, 255, 0];
            }
            indicesToUpdate.push(comparer.firstPointIndex);
        }

        // refresh the color of the second point, and color all the points in between
        // also displays a text label showing the time and distance along the path

        if (comparer.secondPointIndex === null) {
            this.distanceLabelContainer.style.display = 'none';
        } else {
            if (points[comparer.secondPointIndex].color) {
                comparer.savePreviousColor(comparer.secondPointIndex, points[comparer.secondPointIndex].color);
                points[comparer.secondPointIndex].color = [255, 0, 0];
                indicesToUpdate.push(comparer.secondPointIndex);

                // set all points in between first and second
                let biggerIndex = Math.max(comparer.firstPointIndex, comparer.secondPointIndex);
                let smallerIndex = Math.min(comparer.firstPointIndex, comparer.secondPointIndex);
                for (let i = smallerIndex + 1; i < biggerIndex; i++) {
                    comparer.savePreviousColor(i, points[i].color);
                    points[i].color = [255, 255, 0];
                    indicesToUpdate.push(i);
                }
            }

            let distance_mm = this.getDistanceAlongPath(comparer.firstPointIndex, comparer.secondPointIndex);
            let time_ms = 0;
            let firstTimestamp = points[comparer.firstPointIndex].timestamp;
            let secondTimestamp = points[comparer.secondPointIndex].timestamp;
            if (typeof firstTimestamp !== 'undefined' && typeof secondTimestamp !== 'undefined') {
                time_ms = Math.abs(firstTimestamp - secondTimestamp);
            }
            this.updateTextLabel(distance_mm, time_ms);
        }

        // update the mesh buffer attributes to render the updated point colors
        this.updateColors(indicesToUpdate);
    }
    
    updateTextLabel(distance_mm, time_ms) {
        // round time and distance to 1 decimal place
        let distanceMeters = (distance_mm / 1000).toFixed(1);
        let timeSeconds = (time_ms / 1000).toFixed(1);
        let timeString = '';
        if (timeSeconds > 0) {
            timeString = ' traveled in ' + timeSeconds + 's';
        } else {
            timeString = ' traveled in < 1s';
        }
        this.distanceLabelContainer.children[0].innerText = distanceMeters + 'm' + timeString;
        this.distanceLabelContainer.style.display = 'inline';
    }

    createCursor(radius = 50) {
        let cursorMesh = new THREE.Mesh(new THREE.SphereGeometry(radius,12,12), new THREE.MeshBasicMaterial({color:0xff0000})); // new THREE.MeshNormalMaterial());
        cursorMesh.visible = false;
        this.add(cursorMesh);
        // realityEditor.gui.threejsScene.addToScene(cursorMesh);
        return cursorMesh;
    }

    // adds a circular label with enough space for two initials, e.g. "BR" (but hides it if no initials provided)
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

// Handles the logic of comparing two points on a MeshPath to each other
export class KeyframeComparer {
    constructor() {
        this.reset();
        this.previousColors = [];
    }
    reset() {
        this.selectionState = 'first';
        this.firstPointIndex = null;
        this.secondPointIndex = null;
    }
    setMeshPath(meshPath) {
        this.meshPath = meshPath;
    }
    setFirstPoint(index, isHover) {
        if (isHover) {
            this.selectionState = 'first';
        } else {
            this.selectionState = 'second';
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
