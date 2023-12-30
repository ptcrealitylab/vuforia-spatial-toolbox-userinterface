/*
* Created by Ben Reynolds on 10/08/20.
*
* Copyright (c) 2020 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

// import * as THREE from "../../../thirdPartyCode/three/three.module";
import {InfiniteGridHelper} from "../../../thirdPartyCode/THREE.InfiniteGridHelper/InfiniteGridHelper.module.js"

createNameSpace("realityEditor.gui.ar.groundPlaneRenderer");

(function(exports) {

    const maxVisibilityDistanceInMm = 50000; // grid fades into distance 50 meters away from camera
    const gridSquareSizeInMm = 500;
    const gridRegionSizeInMm = gridSquareSizeInMm * 10; // each 10 grid squares are grouped by a thicker line

    let shouldVisualize = false;
    var isUpdateListenerRegistered = false;

    let gridHelper = null; // this is the actual groundplane (THREE.InfiniteGridHelper)
    let origin = null; // a small cube that is placed on the groundplane origin
    let target = null; // this is where the center of the screen raycasts against the groundplane
    let cachedGroundPlaneCollider = null;

    let centerPoint = new WebKitPoint(globalStates.height/2, globalStates.width/2);

    /**
     * Public init method to enable rendering ghosts of edited frames while in editing mode.
     */
    function initService() {

        let defaultShow = realityEditor.device.environment.variables.defaultShowGroundPlane;
        realityEditor.gui.settings.addToggle('Visualize Ground Plane', 'shows detected ground plane', 'visualizeGroundPlane',  '../../../svg/powerSave.svg', defaultShow, function(newValue) {
            // only draw frame ghosts while in programming mode if we're not in power-save mode
            shouldVisualize = newValue;

            if (newValue) {
                globalStates.useGroundPlane = true; // makes sure the groundPlane position gets recalculated
                startVisualization();
                realityEditor.gui.menus.switchToMenu('groundPlane');
            } else {
                stopVisualization();
                realityEditor.gui.menus.switchToMenu('main');
            }
        }, { dontPersist: true });

        // register callbacks to various buttons to perform commits
        realityEditor.gui.buttons.registerCallbackForButton('groundPlaneReset', function(params) {
            if (params.newButtonState === 'down') {
                // search for groundplane when button is pressed
                realityEditor.app.callbacks.startGroundPlaneTrackerIfNeeded();
            }
        });

        // when the app loads, check once if it needs groundPlane and start up the tracker if so
        // TODO: wait until camera moves enough before trying to detect groundplane or it goes to origin
        setTimeout(function() {
            realityEditor.app.callbacks.startGroundPlaneTrackerIfNeeded();
        }, 1000);
    }

    function startVisualization() {
        globalStates.useGroundPlane = true;
        if (!gridHelper) {
            // check that the ground plane exists before we start the visualization
            let gpId = realityEditor.sceneGraph.NAMES.GROUNDPLANE;
            let gpRxId = gpId + realityEditor.sceneGraph.TAGS.ROTATE_X;
            let groundPlaneSceneNode = realityEditor.sceneGraph.getSceneNodeById(gpRxId);
            if (!groundPlaneSceneNode) {
                groundPlaneSceneNode = realityEditor.sceneGraph.getSceneNodeById(gpId);
            }

            // Ground plane must exist... if it doesn't reschedule this to happen later
            if (!groundPlaneSceneNode) {
                setTimeout(function() {
                    startVisualization();
                }, 100);
                return;
            }
        }

        const THREE = realityEditor.gui.threejsScene.THREE;

        // create an infinite grid that fades into the distance, along the groundplane
        if (!gridHelper) {
            const colorGrid = new THREE.Color(realityEditor.device.environment.variables.groundWireframeColor);
            gridHelper = new InfiniteGridHelper(gridSquareSizeInMm, gridRegionSizeInMm, 0.075, colorGrid, maxVisibilityDistanceInMm);
            gridHelper.name = 'groundPlaneVisualizer';
            realityEditor.gui.threejsScene.addToScene(gridHelper, {occluded: true});
            realityEditor.gui.threejsScene.getInternals().renderer3D.addScaleListener((deviceScale, sceneScale) => {
                const worldScale = sceneScale * deviceScale;
                gridHelper.setSizesAndDistance(gridSquareSizeInMm * worldScale, gridRegionSizeInMm * worldScale, maxVisibilityDistanceInMm * worldScale);
            });
        }

        // don't show origin on devices that don't support AR tracking, because it's to help debug the groundplane tracker
        if (!origin && realityEditor.device.environment.variables.waitForARTracking) {
            origin = new THREE.Group();
            const length = 100;
            const height = 10;
            const crossHairColor = 0xffffff;

            let horizontal = new THREE.Mesh(new THREE.BoxGeometry(length,height,height), new THREE.MeshBasicMaterial({color: crossHairColor}));
            origin.add(horizontal);
            let vertical = new THREE.Mesh(new THREE.BoxGeometry(height,height,length), new THREE.MeshBasicMaterial({color: crossHairColor}));
            origin.add(vertical);

            realityEditor.gui.threejsScene.addToScene(origin, {occluded: false});
        }

        // create a moving panel on the ground with four corners (using 8 boxes for the lines) and a center dot
        if (!target && realityEditor.device.environment.variables.waitForARTracking) {
            target = new THREE.Group();
            realityEditor.gui.threejsScene.addToScene(target, {occluded: true});

            const halfWidth = 64;
            const cornerSize = halfWidth/4;
            const cornerHeight = cornerSize/4;
            const cornerColor = 0x00ffff;

            // add a dot in the middle that is similarly sized to each of the corners
            let center = new THREE.Mesh(new THREE.BoxGeometry(cornerSize,cornerHeight,cornerSize), new THREE.MeshBasicMaterial({color:0x00ffff}));
            target.add(center);

            // x and z position the corner origin
            // dx and dz adjust the position of each of the two crossbars that form that corner
            let corners = {
                topLeft: { x: -1, z: -1, rot: 0 },
                bottomLeft: { x: -1, z: 1, rot: Math.PI/2 },
                bottomRight: { x: 1, z: 1, rot: Math.PI },
                topRight: { x: 1, z: -1, rot: Math.PI*3/2 }
            };

            Object.values(corners).forEach(info => {
                let corner = new THREE.Group();
                corner.position.set(info.x * halfWidth, 0, info.z * halfWidth);
                corner.rotateY(info.rot);
                target.add(corner);

                let horizontal = new THREE.Mesh(new THREE.BoxGeometry(cornerHeight,cornerHeight,cornerSize), new THREE.MeshBasicMaterial({color: cornerColor}));
                horizontal.position.set(-cornerSize/2, 0, 0);
                corner.add(horizontal);

                let vertical = new THREE.Mesh(new THREE.BoxGeometry(cornerSize,cornerHeight,cornerHeight), new THREE.MeshBasicMaterial({color: cornerColor}));
                vertical.position.set(0, 0, -cornerSize/2);
                corner.add(vertical);
            });
        }

        // add/activate the update loop
        if (!isUpdateListenerRegistered) {
            // registers a callback to the gui.ar.draw.update loop so that this module can manage its own rendering
            realityEditor.gui.ar.draw.addUpdateListener(onUpdate);
            isUpdateListenerRegistered = true;
        }
    }

    function stopVisualization() {
        globalStates.useGroundPlane = false;
        if (gridHelper) {
            realityEditor.gui.threejsScene.removeFromScene(gridHelper);
            gridHelper = null;
        }
        if (target) {
            realityEditor.gui.threejsScene.removeFromScene(target);
            target = null;
        }
        if (origin) {
            realityEditor.gui.threejsScene.removeFromScene(origin);
            origin = null;
        }
    }

    function onUpdate(_visibleObjects) {
        // render the ground plane visualizer
        if (!shouldVisualize) { return; } // TODO: actively unsubscribe on stop, so we don't have to ignore loop here

        if (!cachedGroundPlaneCollider) {
            cachedGroundPlaneCollider = realityEditor.gui.threejsScene.getGroundPlaneCollider(); // grid helper has holes so use plane collider
        }
        if (!cachedGroundPlaneCollider) {
            return;
        }

        if (target) {
            // raycast from center of screen onto groundplane and move the visualizer to the resulting (x,y)
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(centerPoint.x, centerPoint.y, [cachedGroundPlaneCollider]);
            if (raycastIntersects.length === 0) { return; }

            // transform the world coordinate into the groundplane coordinate system
            gridHelper.worldToLocal(raycastIntersects[0].point);

            target.position.set(raycastIntersects[0].point.x, 0, raycastIntersects[0].point.z);
        }
    }

    exports.updateGridStyle = ({color, thickness}) => {
        if (!gridHelper) return;
        const THREE = realityEditor.gui.threejsScene.THREE;
        if (typeof color !== 'undefined') {
            gridHelper.material.color = new THREE.Color(color);
            gridHelper.material.uniforms.uColor.value = new THREE.Color(color);
        }
        if (typeof thickness !== 'undefined') {
            gridHelper.material.uniforms.uThickness.value = thickness;
        }
    };

    exports.initService = initService;
    exports.startVisualization = startVisualization;
    exports.stopVisualization = stopVisualization;

}(realityEditor.gui.ar.groundPlaneRenderer));
