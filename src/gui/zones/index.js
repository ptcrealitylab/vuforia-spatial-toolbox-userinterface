/*
* Copyright © 2018 PTC
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace('realityEditor.gui.zones');

(function(exports) {

    const LOAD_PREVIOUS_ZONES = true;
    const DEBUG_SHOW_CANVAS = false;
    let zoneInfo = {};
    let bitmapSize = 128;
    const planeWidth = 50000;
    const planeHeight = 50000;
    const COLORS = Object.freeze({
        Pencil: '#ffffff',
        Eraser: '#000000'
    });
    let zoneVisibilityToggle;
    let zoneVisibilityCallbacks = [];
    let currentZones = [];

    function initService() {
        update(); // start update loop
        realityEditor.network.addObjectDiscoveredCallback(onObjectDiscovered);
        realityEditor.gui.ar.draw.addVisibleObjectModifier(modifyVisibleObjects);

        zoneVisibilityToggle = realityEditor.gui.settings.addToggle('View Zones', 'render borders of Zone Objects', 'viewZones',  '../../../svg/powerSave.svg', false, function(newValue) {
            console.log('View Zones toggled');
            if (newValue) {
                showZones();
            } else {
                hideZones();
            }
            zoneVisibilityCallbacks.forEach(function(callback) {
                callback(newValue);
            })
        });
    }

    /**
     * This gets triggered at the beginning of gui.ar.draw.update
     * We use this function to inject zone objects into the visibleObjects
     * @param visibleObjects
     */
    function modifyVisibleObjects(visibleObjects) {
        // if there's no visible world object other than the world_local, ignore all this code
        let bestWorldObject = realityEditor.worldObjects.getBestWorldObject();
        if (!bestWorldObject || bestWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
            return;
        }

        currentZones.forEach(function(zoneId) {
            // the visibleObjects matrix of its world
            let objectMatrix = realityEditor.getObject(zoneId).matrix || realityEditor.gui.ar.utilities.newIdentityMatrix();

            let sceneNode = realityEditor.sceneGraph.getSceneNodeById(zoneId);
            if (sceneNode) {
                let worldObjectSceneNode = realityEditor.sceneGraph.getSceneNodeById(bestWorldObject.objectId);
                sceneNode.setParent(worldObjectSceneNode);
                sceneNode.setLocalMatrix(objectMatrix);
            }

            visibleObjects[zoneId] = objectMatrix;
        });
    }

    function update() {
        try {
            // if (realityEditor.gui.settings.toggleStates.viewZones) {
            //     showZones();
            // } else {
            //     hideZones();
            // }

            let worldNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.worldObjects.getBestWorldObject().objectId);
            let cameraPositionInWorld = realityEditor.sceneGraph.getCameraNode().getMatrixRelativeTo(worldNode);
            let cameraPosition = {
                x: cameraPositionInWorld[12]/cameraPositionInWorld[15],
                y: cameraPositionInWorld[13]/cameraPositionInWorld[15],
                z: cameraPositionInWorld[14]/cameraPositionInWorld[15]
            };

            currentZones = []; // should there only be one at a time?

            forEachLocalizedZone(function(zoneId) {
                let thisZone = zoneInfo[zoneId];
                if (!thisZone.hull) { return; }
                // let camCoords = worldToHullCoordinates(cameraPosition.x, cameraPosition.z, bitmapSize, planeWidth);
                let camCoords = worldToHullCoordinates(cameraPosition.x, cameraPosition.z, bitmapSize, planeWidth);
                let isInsideZone = checkPointConcave(camCoords.x, camCoords.y, thisZone.hull);
                if (isInsideZone) {
                    if (thisZone.hullGroup && thisZone.hullGroup.children.length > 0 && thisZone.hullGroup.children[0].children.length > 0) {
                        thisZone.hullGroup.children[0].children[1].material.color.setHex(0xffffff);
                        thisZone.hullGroup.children[0].children[2].material.opacity = 0.2;
                        currentZones.push(zoneId);
                    }
                } else {
                    if (thisZone.hullGroup && thisZone.hullGroup.children.length > 0 && thisZone.hullGroup.children[0].children.length > 0) {
                        thisZone.hullGroup.children[0].children[1].material.color.setHex(0x01fffc);
                        thisZone.hullGroup.children[0].children[2].material.opacity = 0.3;
                    }
                }
            });
        } catch (e) {
            console.warn(e);
        }

        requestAnimationFrame(update);
    }

    /**
     * Uses the even-odd rule (https://en.wikipedia.org/wiki/Even–odd_rule) to check if a point is inside the shape.
     * Casts a ray horizontally to the right from this point and counts the number of segment intersections
     * @param {number} x
     * @param {number} y
     * @param {Array.<Array.<number>>} hull - list of points that form the hull [[x1, y1], [x2, y2], ...]
     * @returns {boolean}
     */
    function checkPointConcave(x, y, hull) {
        let evenOddCounter = 0;
        for (let i = 0; i < hull.length; i++) {
            let x1 = hull[i][0];
            let y1 = hull[i][1];
            let x2, y2;
            if (i+1 < hull.length) {
                x2 = hull[i+1][0];
                y2 = hull[i+1][1];
            } else {
                x2 = hull[0][0]; // edge case for last segment
                y2 = hull[0][1];
            }

            if (x1 < x && x2 < x) {
                continue;
            }

            if (y1 < y && y2 > y || y1 > y && y2 < y) {
                evenOddCounter += 1; // intersection between horizontal ray and segment
            }
        }

        return evenOddCounter % 2 === 1;
    }
    
    function forEachLocalizedZone(callback) {
        for (let zoneId in zoneInfo) {
            let object = realityEditor.getObject(zoneId);
            if (object && object.worldId && object.worldId === realityEditor.worldObjects.getBestWorldObject().objectId) {
                callback(zoneId);
            }
        }
    }
    
    function triggerShowZones() {
        zoneVisibilityToggle.setValue(true);
        showZones();
    }
    
    function triggerHideZones() {
        zoneVisibilityToggle.setValue(false);
        hideZones();
    }

    function showZones() {
        if (realityEditor.worldObjects.getBestWorldObject() && realityEditor.worldObjects.getBestWorldObject().objectId === realityEditor.worldObjects.getLocalWorldId()) {
            return;
        }

        console.log('show zones');
        const THREE = realityEditor.gui.threejsScene.THREE;

        forEachLocalizedZone(function(zoneId) {
            let thisZone = zoneInfo[zoneId];

            if (!thisZone.ctx) {
                thisZone.ctx = document.createElement('canvas').getContext('2d');
                thisZone.ctx.canvas.width = bitmapSize;
                thisZone.ctx.canvas.height = bitmapSize;
                thisZone.ctx.canvas.style.backgroundColor = 'transparent';

                if (LOAD_PREVIOUS_ZONES) {
                    if (thisZone.loadedImage && thisZone.loadedImage.complete) {
                        let img = new Image();

                        img.onload = function() {
                            console.log('img loaded... draw', img);

                            let width = img.width;
                            let height = img.height;

                            thisZone.ctx.drawImage(thisZone.loadedImage, 0, 0);

                            if (DEBUG_SHOW_CANVAS) { // adjust transparency for better visual effect only if it will be seen
                                let image1 = thisZone.ctx.getImageData(0, 0, width, height);
                                let imageData1 = image1.data;

                                let stride = 4;
                                let tolerance = 20;
                                for (let i = 0; i < imageData1.length; i += stride) {
                                    if (imageData1[i] < tolerance && imageData1[i + 1] < tolerance && imageData1[i + 2] < tolerance) {
                                        imageData1[i + 3] = 0; // set black to transparent
                                    }
                                }
                                image1.data = imageData1;
                                thisZone.ctx.putImageData(image1, 0, 0);
                            }

                            renderUpdates(thisZone);
                        }
                        img.src = thisZone.loadedImage.src;
                    }
                }
            }

            if (!thisZone.mesh) {
                const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

                thisZone.texture = new THREE.CanvasTexture(thisZone.ctx.canvas);

                const material = new THREE.MeshBasicMaterial({
                    map: thisZone.texture,
                    transparent: true
                });

                thisZone.mesh = new THREE.Mesh(geometry, material);
                thisZone.mesh.rotation.x = -Math.PI / 2;

                // TODO: perhaps add parameters {occluded: true} or {worldObjectId: realityEditor.getObject(zoneId).worldId}
                realityEditor.gui.threejsScene.addToScene(thisZone.mesh); // , {worldObjectId: realityEditor.getObject(zoneId).worldId, occluded: true});
            }

            thisZone.mesh.position.y = 200;
            thisZone.mesh.visible = DEBUG_SHOW_CANVAS; // mesh is the canvas
            if (thisZone.hullGroup) {
                thisZone.hullGroup.visible = true; // hullGroup is the 3D model of the zone
            }
        });
    }

    function hideZones() {
        console.log('hide zones');
        for (let zoneId in zoneInfo) {
            let thisZone = zoneInfo[zoneId];
            if (!thisZone.mesh) { return; }
            thisZone.mesh.visible = false;
            if (thisZone.hullGroup) {
                thisZone.hullGroup.visible = false; // hullGroup is the 3D model of the zone
            }

            console.log(zoneId, thisZone.mesh.visible);
        }
    }

    function onObjectDiscovered(object, objectKey) {
        if (object.type === 'zone') {
            if (typeof zoneInfo[objectKey] !== 'undefined') { return; }
            
            zoneInfo[objectKey] = { name: object.name, color: COLORS.Pencil }; // pencil color is interpreted as the zone when forming convex hull

            // try to load bitmap for zone territory map - it is stored in the target.jpg for this object
            let bitmapUrl = 'http://' + object.ip + ':' + realityEditor.network.getPort(object) + '/obj/' + object.name + '/target/target.jpg';

            var xhr = new XMLHttpRequest();
            xhr.open("GET", bitmapUrl);
            xhr.responseType = "blob";
            xhr.onload = function() {
                var urlCreator = window.URL || window.webkitURL;
                var imageUrl = urlCreator.createObjectURL(this.response);
                let image = document.createElement('img');
                image.src = imageUrl;
                zoneInfo[objectKey].loadedImage = image;
                console.log('created image from loaded target');
                console.log(imageUrl);
            };
            xhr.send();
        }
    }

    function renderUpdates(thisZone) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        let ctx = thisZone.ctx;

        let imageData = ctx.getImageData(0, 0, bitmapSize, bitmapSize).data;
        let hull = calculateConvexHull(imageData, bitmapSize, thisZone.color, 10);

        thisZone.hull = hull;

        let worldCoordinates = hullToWorldCoordinates(hull, bitmapSize, planeWidth);

        if (!thisZone.hullGroup) {
            thisZone.hullGroup = new THREE.Group();
            realityEditor.gui.threejsScene.addToScene(thisZone.hullGroup);
        }

        // clear the group
        while (thisZone.hullGroup.children.length) {
            thisZone.hullGroup.remove(thisZone.hullGroup.children[0]);
        }

        let mesh = realityEditor.gui.zones.mesh.pathToMesh(worldCoordinates);
        
        // set Y position of mesh to be on floor
        if (!realityEditor.device.environment.shouldCreateDesktopSocket()) {
            mesh.position.y = -1200;
        } else {
            mesh.position.y = 100;
        }
        
        thisZone.hullGroup.add(mesh);
    }

    function calculateConvexHull(imageData, size, colorHex, concavity) {
        let hullPoints = [];

        let tolerance = 10;
        const stride = 4;

        let rgb = hexToRgbA(colorHex);

        for (let i = 0; i < imageData.length; i += stride) {
            let x = Math.floor((i % (size * stride)) / stride);
            let y = Math.floor(i / (size * stride));

            let dr = Math.abs(imageData[i] - rgb.r);
            let dg = Math.abs(imageData[i+1] - rgb.g);
            let db = Math.abs(imageData[i+2] - rgb.b);

            if (dr < tolerance && dg <= tolerance && db <= tolerance && imageData[i+3] === 255) {
                hullPoints.push([x, y]);
            }
        }

        return hull(hullPoints, concavity || Infinity);
    }

    function hexToRgbA(hex){
        var c;
        if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
            c= hex.substring(1).split('');
            if(c.length === 3){
                c= [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c= '0x'+c.join('');
            // return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+',1)';
            return {
                r: (c>>16)&255,
                g: (c>>8)&255,
                b: c&255
            }
        }
        throw new Error('Bad Hex');
    }

    function hullToWorldCoordinates(hull, bitmapSize, planeSize) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const utils = realityEditor.gui.ar.utilities;

        let worldTransform = realityEditor.sceneGraph.getSceneNodeById(realityEditor.worldObjects.getBestWorldObject().objectId).worldMatrix;

        let newHullPoints = hull.map(function(pt) {
            // convert from bitmap (x,y) -> plane (x,0,z), where plane's center is at (0,0,0)
            let untransformed = [(pt[0] / bitmapSize - 0.5) * planeSize, 0, (pt[1] / bitmapSize - 0.5) * planeSize, 1];
            // align plane coordinates with world coordinates
            let transformed = utils.multiplyMatrix4(untransformed, worldTransform);
            return new THREE.Vector3(transformed[0], 0, transformed[2]);
        });
        return newHullPoints;
    }

    function worldToHullCoordinates(x, y, bitmapSize, planeSize) {
        return {
            x: (x / planeSize + 0.5) * bitmapSize,
            y: (y / planeSize + 0.5) * bitmapSize
        };
    }
    
    function getZoneInfo() {
        return zoneInfo;
    }
    
    function onZoneVisibilityToggled(callback) {
        zoneVisibilityCallbacks.push(callback);
    }

    exports.initService = initService;
    exports.renderUpdates = renderUpdates;
    exports.getZoneInfo = getZoneInfo;
    exports.hideZones = triggerHideZones;
    exports.showZones = triggerShowZones;
    exports.onZoneVisibilityToggled = onZoneVisibilityToggled;
    
})(realityEditor.gui.zones);
