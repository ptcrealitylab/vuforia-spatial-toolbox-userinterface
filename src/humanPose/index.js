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
                
                let distanceMeters = (distance / 1000).toFixed(2);
                distanceLabelContainer.children[0].innerText = distanceMeters + 'm';
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

    // adds a circular label with enough space for two initials, e.g. "BR" (but hides it if no initials provided)
    function createTextLabel(text) {
        let labelContainer = document.createElement('div');
        labelContainer.id = 'meshPathDistanceLabelContainer';
        labelContainer.classList.add('avatarBeamLabel');
        labelContainer.style.width = '120px';
        let scale = 1;
        labelContainer.style.transform = 'translateX(-50%) translateY(-50%) translateZ(3000px) scale(' + scale + ')';
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
                let cachedMockData = JSON.parse(mockData).map((point, _i) => {
                    return {
                        x: point.x,
                        y: (point.z + 500), // flip y and z for mock data
                        z: point.y, // flip y and z
                        // color: 
                        // weight: 0.1 + 3.0 * Math.sin(i / Math.PI)
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
                    point.y += 300;
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
                distanceLabelContainer.style.top = touchPosition.y + 'px';
            }
            
            setPointFromRaycast(e.pageX, e.pageY, {isEndPoint: true});
        });
    }
    
    function setPointFromRaycast(screenX, screenY, {isEndPoint}) {
        let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, [spaghettiMesh]);
        if (intersects.length === 0) {
            if (!isEndPoint) {
                comparer.reset();
                comparer.updateMeshPath();
            }
            return;
        }
        let intersect = intersects[0];
        let pointIndex = spaghettiMesh.getPointFromFace([intersect.face.a, intersect.face.b, intersect.face.c]);
        if (isEndPoint) {
            comparer.setEndPoint(pointIndex);
        } else {
            comparer.setPoint(pointIndex);
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
