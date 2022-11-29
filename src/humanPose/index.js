// import * as THREE from "../../thirdPartyCode/three/three.module";

createNameSpace("realityEditor.humanPose");

import * as network from './network.js'
import * as draw from './draw.js'
import * as utils from './utils.js'
import { MeshPath } from "../gui/ar/meshPath.js";

(function(exports) {
    // Re-export submodules for use in legacy code
    exports.network = network;
    exports.draw = draw;
    exports.utils = utils;
    
    const USE_MOCK_PATH_DATA = true;

    const MAX_FPS = 20;
    const IDLE_TIMEOUT_MS = 2000;

    let humanPoseObjects = {};
    let nameIdMap = {};
    let lastRenderTime = Date.now();
    let lastUpdateTime = Date.now();
    let lastRenderedPoses = {};
    
    let spaghettiMesh = null;
    
    let spaghettiPlane = [0, 0, 0];
    let cursor3d = null;
    let cursorDestination = null;
    let cursorSnapDestination = null;

    // let isPointerDown = false;
    // let lastSelected = {
    //     start: {
    //         index: null,
    //         prevRgb: null
    //     },
    //     end: {
    //         index: null,
    //         prevRgb: null
    //     }
    // }
    
    class KeyframeComparer {
        constructor() {
            this.reset();
            this.previousColors = [];
        }
        reset() {
            this.firstPoint = null;
            this.secondPoint = null;
        }
        setMeshPath(meshPath) {
            this.meshPath = meshPath;
        }
        setPoint(index) {
            if (!this.firstPoint) {
                this.firstPoint = index;
            } /* else if (!this.secondPoint) {
                this.secondPoint = index;
            } */ else {
                this.reset();
            }
            this.updateMeshPath();
        }
        setEndPoint(index) {
            if (!this.firstPoint) return;
            if (index === this.firstPoint) return;
            this.secondPoint = index;
            this.updateMeshPath();
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
        updateMeshPath() {
            if (!this.meshPath) return;
            
            let indicesToUpdate = this.restorePreviousColors(); // start with these, then also update any newly-selected points

            // // reset previous colors
            // ['start' /*, 'end'*/].forEach(elt => {
            //     if (lastSelected[elt].index !== null) {
            //         spaghettiMesh.currentPoints[lastSelected[elt].index].color = lastSelected[elt].prevRgb;
            //         indicesToUpdate.push(lastSelected[elt].index);
            //     }
            // });

            if (this.firstPoint) {
                this.savePreviousColor(this.firstPoint, this.meshPath.currentPoints[this.firstPoint].color);
                this.meshPath.currentPoints[this.firstPoint].color = [0, 255, 0];
                indicesToUpdate.push(this.firstPoint);
            }
            
            if (this.secondPoint) {
                this.savePreviousColor(this.secondPoint, this.meshPath.currentPoints[this.secondPoint].color);
                this.meshPath.currentPoints[this.secondPoint].color = [255, 0, 0];
                indicesToUpdate.push(this.secondPoint);
                
                // set all points in between first and second
                let biggerIndex = Math.max(this.firstPoint, this.secondPoint);
                let smallerIndex = Math.min(this.firstPoint, this.secondPoint);
                for (let i = smallerIndex + 1; i < biggerIndex; i++) {
                    this.savePreviousColor(i, this.meshPath.currentPoints[i].color);
                    this.meshPath.currentPoints[i].color = [255, 255, 0];
                    indicesToUpdate.push(i);
                }
                
                let distance = this.meshPath.getDistanceAlongPath(this.firstPoint, this.secondPoint);
                console.log('distance along selected path = ' + distance);
                
                let time = 0;
                let firstTimestamp = this.meshPath.currentPoints[this.firstPoint].timestamp;
                let secondTimestamp = this.meshPath.currentPoints[this.secondPoint].timestamp;
                if (typeof firstTimestamp !== 'undefined' && typeof secondTimestamp !== 'undefined') {
                    time = Math.abs(firstTimestamp - secondTimestamp);
                }

                // let endPoint = this.meshPath.currentPoints[this.secondPoint];
                // let endPosition = new THREE.Vector3(endPoint.x, endPoint.y, endPoint.z);
                // let screenCoords = realityEditor.gui.threejsScene.getScreenXY(endPosition);
                // let scale = 1;
                // distanceLabelContainer.style.transform = 'translateX(-50%) translateY(-50%) translateZ(3000px) scale(' + scale + ')';
                // // distanceLabelContainer.style.left = screenCoords.x + 'px'; // position it centered on the pointer sphere
                // distanceLabelContainer.style.top = screenCoords.y + 'px';

                // let touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                // distanceLabelContainer.style.left = touchPosition.x + 'px'; // position it centered on the pointer sphere
                // distanceLabelContainer.style.top = touchPosition.y + 'px';
                
                let distanceMeters = (distance / 1000).toFixed(1); // (2)
                
                // round to the nearest 0.5 seconds
                let timeSeconds = Math.round(time / 500) / 2; //.toFixed(0);
                let timeString = '';
                if (timeSeconds > 0) {
                    timeString = ' traveled in ' + timeSeconds + 's';
                } else {
                    timeString = ' traveled in < 1s';
                }
                distanceLabelContainer.children[0].innerText = distanceMeters + 'm' + timeString;
                distanceLabelContainer.style.display = 'inline';
            
            } else {
                distanceLabelContainer.style.display = 'none';
            }

            // record new indices and colors
            // let pointIndex = spaghettiMesh.getPointFromFace([intersect.face.a, intersect.face.b, intersect.face.c]);
            // lastSelected.start.index = pointIndex;
            // lastSelected.start.prevRgb = spaghettiMesh.currentPoints[lastSelected.start.index].color;

            // change the colors
            // spaghettiMesh.currentPoints[lastSelected.start.index].color = [255, 0, 0];
            // spaghettiMesh.currentPoints[lastSelected.end.index].color = [255, 0, 0];

            // indicesToUpdate.push(lastSelected.start.index);

            this.meshPath.updateColors(indicesToUpdate);
        }
    }

    /**
     * Ray-casts from (screenX, screenY) onto the XY plane, and returns the (x,y,z) intersect.
     * The result is calculated in the tool's parent (object) coordinate system.
     * @param {number[]} planeOrigin
     * @param {number[]} planeNormal
     * @param {number} screenX
     * @param {number} screenY
     * @returns {{x: number, y: number, z: number}}
     */
    function getLocalPointAtScreenXY(planeOrigin, planeNormal, screenX, screenY) {
        const utils = realityEditor.gui.ar.utilities;

        // let toolNode = realityEditor.sceneGraph.getSceneNodeById(activeVehicle.uuid);
        // let toolPoint = realityEditor.sceneGraph.getWorldPosition(activeVehicle.uuid);
        // let planeOrigin = [toolPoint.x, toolPoint.y, toolPoint.z];
        // let planeNormal = utils.getForwardVector(toolNode.worldMatrix);
        let cameraPoint = realityEditor.sceneGraph.getWorldPosition('CAMERA');
        let rootCoordinateSystem = realityEditor.sceneGraph.getSceneNodeById('ROOT'); // camera is in this system
        const SEGMENT_LENGTH = 1000; // arbitrary, just need to calculate one point so we can solve parametric equation
        let testPoint = realityEditor.sceneGraph.getPointAtDistanceFromCamera(screenX, screenY, SEGMENT_LENGTH, rootCoordinateSystem);

        let rayOrigin = [cameraPoint.x, cameraPoint.y, cameraPoint.z];
        let rayDirection = utils.normalize(utils.subtract([testPoint.x, testPoint.y, testPoint.z], rayOrigin));

        let planeIntersection = utils.rayPlaneIntersect(planeOrigin, planeNormal, rayOrigin, rayDirection);
        if (!planeIntersection) return undefined; // can't move if plane is parallel to ray

        let worldCoordinates = {x: planeIntersection[0], y: planeIntersection[1], z: planeIntersection[2]};
        let objectCoordinateSystem = realityEditor.sceneGraph.getGroundPlaneNode(); // toolNode.parent;
        return realityEditor.sceneGraph.convertToNewCoordSystem(worldCoordinates, rootCoordinateSystem, objectCoordinateSystem);
        // return worldCoordinates;
    }

    // adds a circular label with enough space for two initials, e.g. "BR" (but hides it if no initials provided)
    function createTextLabel(text) {
        let labelContainer = document.createElement('div');
        labelContainer.id = 'meshPathDistanceLabelContainer';
        labelContainer.classList.add('avatarBeamLabel');
        labelContainer.style.width = '240px';
        labelContainer.style.fontSize = '18px';
        let scale = 1.33;
        labelContainer.style.transform = 'translateX(-50%) translateY(-100%) translateZ(3000px) scale(' + scale + ')';
        document.body.appendChild(labelContainer);

        let label = document.createElement('div');
        label.id = 'meshPathDistanceLabel';
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
    
    let comparer = new KeyframeComparer();

    let distanceLabelContainer = createTextLabel();

    function initService() {
        console.log('init humanPose module', network, draw, utils);

        realityEditor.worldObjects.onLocalizedWithinWorld((_worldObjectKey) => {
            let mockData = window.localStorage.getItem('mockSpaghettiData');
            if (mockData && USE_MOCK_PATH_DATA) {
                let startTime = Date.now();
                let cachedMockData = JSON.parse(mockData).map((point, i) => {
                    return {
                        x: point.x,
                        y: (point.z), // flip y and z for mock data // + 500
                        z: point.y, // flip y and z
                        // color: 
                        // weight: 0.1 + 3.0 * Math.sin(i / Math.PI)
                        timestamp: startTime + 1000 * (i / 10) // 1 second to walk 10 points
                    };
                }).slice(50, 250);
                
                let topColor = 0xffff00;
                let wallColor = 0x888800;
                const SIZE = 50;
                let params = {
                    width_mm: SIZE,
                    height_mm: SIZE,
                    topColor: topColor,
                    wallColor: wallColor,
                    usePerVertexColors: true,
                    wallBrightness: 0.6,
                    bottomScale: 1.0 // bottom is slightly wider than top
                }

                let mesh = new MeshPath(cachedMockData.map((point, _i) => {
                    point.y += 900;
                    // let r = Math.floor(100 * Math.pow((i / cachedMockData.length), 2));
                    // let g = Math.floor(100 * Math.pow((i / cachedMockData.length), 2));
                    // let b = Math.floor(255 * Math.pow((i / cachedMockData.length), 2));
                    let r = 25;
                    let g = 25;
                    let b = 155;
                    point.color = [r, g, b]; // 1.0 - (i / newMockPath.length)
                    return point;
                }), params);
                realityEditor.gui.threejsScene.addToScene(mesh);

                let yPoints = mesh.currentPoints.map(pt => pt.y);
                let minY = Math.min.apply(Math, yPoints);
                let maxY = Math.max.apply(Math, yPoints);
                let avgY = (minY + maxY) / 2;
                // spaghettiPlane = [0, avgY, 0]
                let rootCoords = realityEditor.sceneGraph.getSceneNodeById('ROOT');
                let groundPlaneCoords = realityEditor.sceneGraph.getGroundPlaneNode();
                spaghettiPlane = realityEditor.sceneGraph.convertToNewCoordSystem([0, avgY, 0], groundPlaneCoords, rootCoords);

                spaghettiMesh = mesh;
                comparer.setMeshPath(spaghettiMesh);

                const ANIMATE = false;
                if (ANIMATE) {
                    let i = 1;
                    setInterval(() => {
                        if (i > cachedMockData.length) i = 0;

                        let newMockPath = cachedMockData.slice(0, 15+i);

                        newMockPath.forEach((point, i) => {
                            point.scale = 2.0 * i / newMockPath.length; // Math.cos(i * Math.PI / cachedMockData.length);
                            
                            let r = Math.floor(255 * Math.pow((i / newMockPath.length), 2));
                            let g = Math.floor(255 * Math.pow((i / newMockPath.length), 2));
                            let b = Math.floor(255 * Math.pow((i / newMockPath.length), 2));
                            
                            point.color = [r, g, b]; // 1.0 - (i / newMockPath.length)
                        });
                        
                        i += 3;
                        mesh.setPoints(newMockPath);
                    }, 33);
                }
            }
        });

        realityEditor.app.callbacks.subscribeToPoses((poseJoints) => {
            let pose = utils.makePoseFromJoints('device' + globalStates.tempUuid + '_pose1', poseJoints);
            let poseObjectName = utils.getPoseObjectName(pose);

            if (typeof nameIdMap[poseObjectName] === 'undefined') {
                tryCreatingObjectFromPose(pose, poseObjectName);
            } else {
                let objectId = nameIdMap[poseObjectName];
                if (humanPoseObjects[objectId]) {
                    tryUpdatingPoseObject(pose, humanPoseObjects[objectId]);
                }
            }
        });

        network.onHumanPoseObjectDiscovered((object, objectKey) => {
            handleDiscoveredObject(object, objectKey);
        });

        network.onHumanPoseObjectDeleted((objectKey) => {
            let objectToDelete = humanPoseObjects[objectKey];
            if (!objectToDelete) return;

            delete nameIdMap[objectToDelete.name];
            delete humanPoseObjects[objectKey];
        });

        realityEditor.gui.ar.draw.addUpdateListener(() => {
            try {
                if (cursor3d && cursorDestination) {
                    let animatedPos = {
                        x: 0.5 * cursorDestination[0] + 0.5 * cursor3d.position.x,
                        y: 0.5 * cursorDestination[1] + 0.5 * cursor3d.position.y,
                        z: 0.5 * cursorDestination[2] + 0.5 * cursor3d.position.z
                    };
                    cursor3d.position.set(animatedPos.x, animatedPos.y, animatedPos.z);
                }
                
                // main update runs at ~60 FPS, but we can save some compute by limiting the pose rendering FPS
                if (Date.now() - lastRenderTime < (1000.0 / MAX_FPS)) return;
                lastRenderTime = Date.now();

                if (lastRenderTime - lastUpdateTime > IDLE_TIMEOUT_MS) {
                    // Clear out all human pose renderers because we've
                    // received no updates from any of them
                    draw.renderHumanPoseObjects([]);
                    lastUpdateTime = Date.now();
                    return;
                }

                // further reduce rendering redundant poses by only rendering if any pose data has been updated
                if (!areAnyPosesUpdated(humanPoseObjects)) return;

                lastUpdateTime = Date.now();

                draw.renderHumanPoseObjects(Object.values(humanPoseObjects));

                for (const [id, obj] of Object.entries(humanPoseObjects)) {
                    lastRenderedPoses[id] = utils.getPoseStringFromObject(obj);
                }
            } catch (e) {
                console.warn('error in renderHumanPoseObjects', e);
            }
        });
        
        let THREE = realityEditor.gui.threejsScene.THREE;
        cursor3d = new THREE.Mesh(new THREE.SphereGeometry(50,12,12), new THREE.MeshBasicMaterial({color:0xff0000})); // new THREE.MeshNormalMaterial());
        cursor3d.visible = false;
        realityEditor.gui.threejsScene.addToScene(cursor3d);

        // document.addEventListener('pointerup', (_e) => {
        //     isPointerDown = false;
        // });
        
        document.addEventListener('pointerdown', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) return;
            
            // isPointerDown = true;
            // highlightRaycast(e.pageX, e.pageY);
            setPointFromRaycast(e.pageX, e.pageY, {isEndPoint: false});
        });

        document.addEventListener('pointermove', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) return;

            // if (!isPointerDown) { return; }
            // highlightRaycast(e.pageX, e.pageY);
            
            if (!comparer.firstPoint) { return; }

            let touchPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
            if (distanceLabelContainer && touchPosition) {
                distanceLabelContainer.style.left = touchPosition.x + 'px'; // position it centered on the pointer sphere
                const VERTICAL_MARGIN = 10;
                distanceLabelContainer.style.top = (touchPosition.y - VERTICAL_MARGIN) + 'px';
            }
            
            let pointOnPlane = getLocalPointAtScreenXY(spaghettiPlane, [0, 1, 0], touchPosition.x, touchPosition.y);
            // console.log(pointOnPlane);
            // cursor3d.position.set(pointOnPlane.x, pointOnPlane.y, pointOnPlane.z);
            cursorDestination = [pointOnPlane.x, pointOnPlane.y, pointOnPlane.z];
            cursor3d.material.color.setHex(0xffffff);
            cursor3d.scale.set(1,1,1);

            // snap cursor to closest point in line
            let cursorPosition = {
                x: cursorDestination[0],
                y: cursorDestination[1],
                z: cursorDestination[2]
            }
            let distanceSquaredToEachPoint = spaghettiMesh.currentPoints.map(point => {
                return (point.x - cursorPosition.x) * (point.x - cursorPosition.x) +
                    // (point.y - cursor3d.position.y) * (point.y - cursor3d.position.y) + // ignore y-distance, only x-z distance matters for snapping
                    (point.z - cursorPosition.z) * (point.z - cursorPosition.z);
            });
            let closestIndex = indexOfMin(distanceSquaredToEachPoint);
            let closestDistance = Math.sqrt(distanceSquaredToEachPoint[closestIndex]);

            let params = {
                isEndPoint: true
            };
            
            // let cameraDistance = realityEditor.sceneGraph.getWorldPosition('CAMERA');
            // let unconstrainedDistance = 200;
            // let SNAP_DISTANCE = Math.max(100, Math.min(1000, unconstrainedDistance)); // depends on zoom level of camera
            const SNAP_DISTANCE = 250;
            if (closestDistance < SNAP_DISTANCE) {
                let closestPoint = spaghettiMesh.currentPoints[closestIndex];
                let adjacentPoint = closestIndex < (spaghettiMesh.currentPoints.length-1) ? spaghettiMesh.currentPoints[closestIndex+1] : spaghettiMesh.currentPoints[closestIndex-1];

                // cursor3d.position.set(closestPoint.x, pointOnPlane.y, closestPoint.z);
                
                // snap to halfway point between two endpoints of the selected segment
                cursorSnapDestination = [(closestPoint.x + adjacentPoint.x) / 2, pointOnPlane.y, (closestPoint.z + adjacentPoint.z) / 2];
                // console.log(cursorDestination, cursor3d.position);

                params.precalculatedIndex = closestIndex;
                cursor3d.material.color.setHex(0xff0000);
                cursor3d.scale.set(1.5, 1.5, 1.5);
            }
            
            setPointFromRaycast(e.pageX, e.pageY, params);
        });
    }

    function indexOfMin(arr) {
        if (arr.length === 0) {
            return -1;
        }

        let min = arr[0];
        let minIndex = 0;

        for (let i = 1; i < arr.length; i++) {
            if (arr[i] < min) {
                minIndex = i;
                min = arr[i];
            }
        }

        return minIndex;
    }
    
    function setPointFromRaycast(screenX, screenY, {isEndPoint, precalculatedIndex}) {
        // let pointIndex = precalculatedIndex;
        // if (typeof pointIndex !== 'number') {
            let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [spaghettiMesh]);
            if (intersects.length === 0) {

                if (!isEndPoint) {
                    comparer.reset();
                    comparer.updateMeshPath();
                    cursor3d.visible = false;
                }
                if (precalculatedIndex) { // happens when snapping cursor to path
                    cursorDestination = cursorSnapDestination;
                } else {
                    return; // don't update the comparer if we aren't snapped and mouse doesn't intersect the path
                }
            }
            let pointIndex = precalculatedIndex;
            if (intersects.length > 0) {
                let intersect = intersects[0];
                // cursor3d.position.set(intersect.point.x, spaghettiPlane.y, intersect.point.z);
                pointIndex = spaghettiMesh.getPointFromFace([intersect.face.a, intersect.face.b, intersect.face.c]);
                // cursorDestination = [0, 0, 0];
            }

        // }
        
        if (isEndPoint) {
            comparer.setEndPoint(pointIndex);
            cursor3d.visible = true;
        } else {
            comparer.setPoint(pointIndex);
            cursor3d.visible = false;
        }
    }

    // function highlightRaycast(screenX, screenY) {
    //     let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [spaghettiMesh]);
    //     if (intersects.length > 0) {
    //         console.log('clicked on spaghetti path');
    //         console.log(intersects);
    //         let intersect = intersects[0];
    //         // let face = intersect.face; // a = 8235, b = 8236, c = 8237, normal = {x,y,z}, materialIndex = 0
    //         // let faceIndex = intersect.faceIndex; // faceIndex = 2745
    //         // let point = intersect.point; // x, y, z
    //         // let distance = intersect.distance; // 8811.21
    //
    //         // let indicesToUpdate = [];
    //         //
    //         // // reset previous colors
    //         // ['start' /*, 'end'*/].forEach(elt => {
    //         //     if (lastSelected[elt].index !== null) {
    //         //         spaghettiMesh.currentPoints[lastSelected[elt].index].color = lastSelected[elt].prevRgb;
    //         //         indicesToUpdate.push(lastSelected[elt].index);
    //         //     }
    //         // });
    //         //
    //         //
    //         // // record new indices and colors
    //         let pointIndex = spaghettiMesh.getPointFromFace([intersect.face.a, intersect.face.b, intersect.face.c]);
    //         // lastSelected.start.index = pointIndex;
    //         // lastSelected.start.prevRgb = spaghettiMesh.currentPoints[lastSelected.start.index].color;
    //         // // lastSelected.end.index = pointIndex < spaghettiMesh.currentPoints.length - 1 ? (pointIndex + 1) : (pointIndex - 1);
    //         // // lastSelected.end.prevRgb = spaghettiMesh.currentPoints[lastSelected.end.index].color;
    //         //
    //         // // change the colors
    //         // spaghettiMesh.currentPoints[lastSelected.start.index].color = [255, 0, 0];
    //         // // spaghettiMesh.currentPoints[lastSelected.end.index].color = [255, 0, 0];
    //         //
    //         // indicesToUpdate.push(lastSelected.start.index);
    //         //
    //         // // for (let i = 0; i < 5; i++) {
    //         // //     if (pointIndex + i < spaghettiMesh.currentPoints.length) {
    //         // //         let r = 255;
    //         // //         let g = 0;
    //         // //         let b = 0;
    //         // //         spaghettiMesh.currentPoints[pointIndex + i].color = [r, g, b];
    //         // //     }
    //         // // }
    //         // spaghettiMesh.updateColors(indicesToUpdate);
    //
    //         // spaghettiMesh.setPoints(spaghettiMesh.currentPoints);
    //        
    //         comparer.setPoint(pointIndex);
    //     }
    // }

    function areAnyPosesUpdated(poseObjects) {
        for (const [id, obj] of Object.entries(poseObjects)) {
            if (typeof lastRenderedPoses[id] === 'undefined') return true;
            let newPoseHash = utils.getPoseStringFromObject(obj);
            if (newPoseHash !== lastRenderedPoses[id]) {
                return true;
            }
        }
        return false;
    }

    function tryUpdatingPoseObject(pose, humanPoseObject) {
        // update the object position to be the average of the pose.joints
        // update each of the tool's positions to be the position of the joint relative to the average
        console.log('try updating pose object', pose, humanPoseObject);

        pose.joints.forEach((jointInfo, index) => {
            let jointName = Object.values(utils.JOINTS)[index];
            let frameId = Object.keys(humanPoseObject.frames).find(key => {
                return key.endsWith(jointName);
            });
            if (!frameId) {
                console.warn('couldn\'t find frame for joint ' + jointName + ' (' + index + ')');
                return;
            }
            const SCALE = 1000;
            // let jointFrame = humanPoseObject.frames[frameId];
            // set position of jointFrame
            let positionMatrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                jointInfo.x * SCALE, jointInfo.y * SCALE, jointInfo.z * SCALE, 1,
            ];
            let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(frameId);
            frameSceneNode.setLocalMatrix(positionMatrix); // this will broadcast it realtime, and sceneGraph will upload it every ~1 second for persistence
        });
    }

    let objectsInProgress = {};

    function tryCreatingObjectFromPose(pose, poseObjectName) {
        if (objectsInProgress[poseObjectName]) { return; }
        objectsInProgress[poseObjectName] = true;

        let worldObject = realityEditor.worldObjects.getBestWorldObject(); // subscribeToPoses only triggers after we localize within a world

        realityEditor.network.utilities.verifyObjectNameNotOnWorldServer(worldObject, poseObjectName, () => {
            network.addHumanPoseObject(worldObject.objectId, poseObjectName, (data) => {
                console.log('added new human pose object', data);
                nameIdMap[poseObjectName] = data.id;
                // myAvatarId = data.id;
                // connectionStatus.isMyAvatarCreated = true;
                // refreshStatusUI();
                delete objectsInProgress[poseObjectName];

            }, (err) => {
                console.warn('unable to add human pose object to server', err);
                delete objectsInProgress[poseObjectName];

            });
        }, () => {
            console.warn('human pose already exists on server');
            delete objectsInProgress[poseObjectName];

        });
    }

    // initialize the human pose object
    function handleDiscoveredObject(object, objectKey) {
        if (!utils.isHumanPoseObject(object)) { return; }
        if (typeof humanPoseObjects[objectKey] !== 'undefined') { return; }
        humanPoseObjects[objectKey] = object; // keep track of which human pose objects we've processed so far

        // TODO: subscribe to public data, etc
    }

    exports.initService = initService;
}(realityEditor.humanPose));

export const initService = realityEditor.humanPose.initService;
