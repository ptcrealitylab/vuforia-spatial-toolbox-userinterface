/*
* Created by Daniel Dangond on 12/06/21.
*
* Copyright (c) 2021 PTC Inc
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.gui.ar.areaCreator");

/**
 * @fileOverview realityEditor.gui.ar.areaCreator
 * Provides an API for tools to call in order to prompt the user to draw an area on their screen which then gets
 * returned to the tool
 */

realityEditor.gui.ar.areaCreator.Modes = {
    DISABLED: "DISABLED",
    DRAW_MODE_SELECT: "DRAW_MODE_SELECT",
    AREA_CREATE: "AREA_CREATE",
    HEIGHT_SET: "HEIGHT_SET",
}
realityEditor.gui.ar.areaCreator.mode = realityEditor.gui.ar.areaCreator.Modes.DISABLED;

realityEditor.gui.ar.areaCreator.pointerCallbacks = {
    down: () => {},
    up: () => {},
    move: () => {}
}

realityEditor.gui.ar.areaCreator.buttonCallbacks = {
    cancel: () => {},
    freehand: () => {},
    polygon: () => {},
    confirmArea: () => {},
    confirmHeight: () => {},
}

realityEditor.gui.ar.areaCreator.polygonPoints = [];
realityEditor.gui.ar.areaCreator.height = 1;

realityEditor.gui.ar.areaCreator.canDragTouch = false; // Avoid initial click on menu for dragging
realityEditor.gui.ar.areaCreator.lastFreehandTime = 0; // Prevents dropping too many points in freehand mode
realityEditor.gui.ar.areaCreator.lastPointerY = null; // Prevent jumping between points by tapping twice

realityEditor.gui.ar.areaCreator.areaRender = null;
realityEditor.gui.ar.areaCreator.needsRenderUpdate = false;

realityEditor.gui.ar.areaCreator.animationCallbacks = [];

realityEditor.gui.ar.areaCreator.initializedPrefabs = false;

realityEditor.gui.ar.areaCreator.initService = function() {
    realityEditor.network.addPostMessageHandler('promptForArea', this.promptForAreaHandler);
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.getPrefabs = function() {
    if (!this.initializedPrefabs) {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const pointPillarGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1, 8).translate(0, 0.5, 0).scale(1000,1000,1000);
        const pointPillarMaterial = new THREE.MeshBasicMaterial({color: 0x66FF66, opacity: 0.6, transparent: true});
        this.pointPillarSource = new THREE.Mesh(pointPillarGeometry, pointPillarMaterial);
        this.wallMaterial = new THREE.MeshBasicMaterial({color: 0x66FF66, opacity: 0.5, transparent: true, side: THREE.DoubleSide, wireframe: true});
        this.floorMaterial = new THREE.MeshBasicMaterial({color: 0x66FF66, opacity: 0.5, transparent: true, side: THREE.DoubleSide});
        this.initializedPrefabs = true;
    }
    return {
        pointPillarSource: this.pointPillarSource,
        wallMaterial: this.wallMaterial,
        floorMaterial: this.floorMaterial
    }
}.bind(realityEditor.gui.ar.areaCreator);

// TODO: Fix result not being received by tool if tool loses focus
realityEditor.gui.ar.areaCreator.promptForAreaHandler = function(msgData) {
    this.promptForArea(msgData.options).then(area => {
        realityEditor.network.postMessageIntoFrame(msgData.frameKey, {area: area, canceled: false});
    }).catch(() => {
        realityEditor.network.postMessageIntoFrame(msgData.frameKey, {area: {}, canceled: true});
    });
}.bind(realityEditor.gui.ar.areaCreator);

/**
 * returns a promise that rejects if the user cancels the area creation process and that resolves with an object
 * in the form {points: [{x:number,y:number}...], height?: number} if the user completes the area creation process.
 * @param {object} options takes the form {drawingMode:'FREEHAND'|'POLYGON'|undefined, defineHeight:boolean}
 */
realityEditor.gui.ar.areaCreator.promptForArea = function(options) {
    return new Promise((resolve, reject) => {
        globalStates.useGroundPlane = true;
        function confirmAreaCreation(area) {
            resolve({
                points: area.points,
                height: area.height * 1000,
                floorOffset: realityEditor.gui.ar.areaCreator.calculateFloorOffset()
            });
            realityEditor.gui.ar.areaCreator.disable();
        }
        
        function cancelAreaCreation() {
            reject();
            realityEditor.gui.ar.areaCreator.disable();
        }
        
        this.activateUI();
        this.buttonCallbacks.cancel = () => {
            cancelAreaCreation();
        }
        
        if (options.drawingMode === 'FREEHAND') {
            this.beginAreaCreation(options.drawingMode).then(points => {
                if (options.defineHeight) {
                    this.promptForHeight().then(height => {
                        confirmAreaCreation({points, height});
                    }).catch(cancelAreaCreation);
                } else {
                    confirmAreaCreation({points});
                }
            }).catch(cancelAreaCreation);
        } else if (options.drawingMode === 'POLYGON') {
            this.beginAreaCreation(options.drawingMode).then(points => {
                if (options.defineHeight) {
                    this.promptForHeight().then(height => {
                        confirmAreaCreation({points, height});
                    }).catch(cancelAreaCreation);
                } else {
                    confirmAreaCreation({points});
                }
            }).catch(cancelAreaCreation);
        } else {
            this.promptForDrawingMode().then(drawingMode => {
                this.beginAreaCreation(drawingMode).then(points => {
                    if (options.defineHeight) {
                        this.promptForHeight().then(height => {
                            confirmAreaCreation({points, height});
                        }).catch(cancelAreaCreation);
                    } else {
                        confirmAreaCreation({points});
                    }
                }).catch(cancelAreaCreation);
            }).catch(cancelAreaCreation);
        }
    });
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.promptForDrawingMode = function() {
    this.mode = this.Modes.DRAW_MODE_SELECT;
    return new Promise((resolve, reject) => {
        this.clearCallbacks();
        this.showDrawingModeSelectionMenu();
        
        this.buttonCallbacks.cancel = (event) => {
            reject();
            this.hideDrawingModeSelectionMenu();
            event.stopPropagation();
        }
        this.buttonCallbacks.freehand = (event) => {
            resolve('FREEHAND');
            this.hideDrawingModeSelectionMenu();
            event.stopPropagation();
        }
        this.buttonCallbacks.polygon = (event) => {
            resolve('POLYGON');
            this.hideDrawingModeSelectionMenu();
            event.stopPropagation();
        }
    });
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.beginAreaCreation = function(drawingMode) {
    this.mode = this.Modes.AREA_CREATE;
    return new Promise((resolve, reject) => {
        this.clearCallbacks();
        this.showAreaCreationMenu();
        
        this.buttonCallbacks.cancel = (event) => {
            reject();
            this.hideAreaCreationMenu();
            event.stopPropagation();
        }
        this.buttonCallbacks.confirmArea = (event) => {
            resolve(this.polygonPoints);
            this.hideAreaCreationMenu();
            event.stopPropagation();
        }
        
        this.pointerCallbacks.down = (event) => {
            const point = this.calculateGroundPlaneIntersection(event);
            if (point) {
                const flattenedPoint = new realityEditor.gui.threejsScene.THREE.Vector2(point.x, point.z);
                this.polygonPoints.push(flattenedPoint);
                if (this.polygonPoints.length >= 3) {
                    this.showAreaConfirmationButton();
                }
                this.needsRenderUpdate = true;
                // stop propagation if we hit, otherwise pass the event on to the rest of the application
                event.stopPropagation();
            }
            this.canDragTouch = true;
        }
        this.pointerCallbacks.up = () => {};
        this.pointerCallbacks.move = (event) => {
            const point = this.calculateGroundPlaneIntersection(event);
            if (point && this.canDragTouch) { // Ignore initial menu touch
                const flattenedPoint = new realityEditor.gui.threejsScene.THREE.Vector2(point.x, point.z);
                
                const pointInterval = 200; // 1 point per 200ms
                if (drawingMode === "FREEHAND" && Date.now() - this.lastFreehandTime > pointInterval) { // TODO: base this on distance between points, not time
                    this.lastFreehandTime = Date.now();
                    this.polygonPoints.push(flattenedPoint);
                    if (this.polygonPoints.length >= 3) {
                        this.showAreaConfirmationButton();
                    }
                } else {
                    this.polygonPoints[this.polygonPoints.length-1] = flattenedPoint; // Drag point in polygon mode
                }
                this.needsRenderUpdate = true;
                // stop propagation if we hit, otherwise pass the event on to the rest of the application
                event.stopPropagation();
            }
        };
        
        this.addAnimationCallback(this.areaAnimationCallback);
    })
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.promptForHeight = function() {
    this.mode = this.Modes.HEIGHT_SET;
    return new Promise((resolve, reject) => {
        this.clearCallbacks();
        this.showHeightDefinitionMenu();
        
        this.buttonCallbacks.cancel = (event) => {
            reject();
            this.hideHeightDefinitionMenu();
            event.stopPropagation();
        }
        this.buttonCallbacks.confirmHeight = (event) => {
            resolve(this.height);
            this.hideHeightDefinitionMenu();
            event.stopPropagation();
        }

        this.pointerCallbacks.move = (event) => {
            const movementFactor = 0.003;
            const distance = (this.lastPointerY ? this.lastPointerY - event.clientY : 0);
            this.height += distance * movementFactor;
            this.height = Math.max(0.001, Math.min(this.height, 1000));
            this.needsRenderUpdate = true;
        }

        this.addAnimationCallback(this.areaAnimationCallback);
    })
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.areaAnimationCallback = function() {
    if (this.needsRenderUpdate) {
        this.clearAreaRender();
        this.generateAreaRender();
        this.needsRenderUpdate = false;
    }
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.clearAreaRender = function() {
    realityEditor.gui.threejsScene.removeFromScene(this.areaRender);
    this.areaRender = null;
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.generateAreaRender = function() {
    const THREE = realityEditor.gui.threejsScene.THREE;
    this.areaRender = new THREE.Group();
    const relativePoints = this.polygonPoints.map(point => {
        return new THREE.Vector2(point.x - this.polygonPoints[0].x, point.y - this.polygonPoints[0].y);
    });
    // Draw pillars
    relativePoints.forEach(point => {
        const pointPillar = this.getPrefabs().pointPillarSource.clone();
        this.areaRender.add(pointPillar);
        pointPillar.position.copy(new THREE.Vector3(point.x, 0, point.y));
        pointPillar.scale.copy(new THREE.Vector3(1, this.height, 1));
    });
    if (relativePoints.length > 1) {
        // Draw walls
        for (let i = 0; i < relativePoints.length; i++) {
            const wallStart = relativePoints[i];
            const wallEnd = (i === relativePoints.length - 1) ? relativePoints[0] : relativePoints[i+1];
            const wallWidth = wallStart.distanceTo(wallEnd);
            const wallGeometry = new THREE.PlaneGeometry(wallWidth, this.height * 1000).translate(wallWidth / 2, this.height * 1000 / 2, 0);
            const wall = new THREE.Mesh(wallGeometry, this.getPrefabs().wallMaterial);
            this.areaRender.add(wall);
            wall.position.copy(new THREE.Vector3(wallStart.x, 0, wallStart.y));
            wall.lookAt(this.areaRender.localToWorld(new THREE.Vector3(wallEnd.x, 0, wallEnd.y)));
            wall.rotateY(-Math.PI / 2);
        }
    }
    const floorShape = new THREE.Shape(relativePoints);
    const floorGeometry = new THREE.ShapeGeometry(floorShape);
    floorGeometry.rotateX(Math.PI / 2); // Lay flat on ground, not vertical
    const floor = new THREE.Mesh(floorGeometry, this.getPrefabs().floorMaterial);
    this.areaRender.add(floor);
    realityEditor.gui.threejsScene.addToScene(this.areaRender);
    this.areaRender.position.copy(new THREE.Vector3(this.polygonPoints[0].x, 0, this.polygonPoints[0].y));
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.didAreaUpdate = function() {
    return this.needsRenderUpdate;
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.calculateGroundPlaneIntersection = function(event) {
    const intersects = realityEditor.gui.threejsScene.getRaycastIntersects(event.clientX, event.clientY);
    const groundPlane = realityEditor.gui.threejsScene.getGroundPlane();
    const intersect = intersects.find(intersect => intersect.object === groundPlane);
    if (intersect) {
        const point = realityEditor.gui.threejsScene.getPointAtDistanceFromCamera(event.clientX, event.clientY, intersect.distance);
        const worldObjectToolboxMatrix = realityEditor.sceneGraph.getModelViewMatrix(realityEditor.sceneGraph.getWorldId());
        const worldObjectThreeMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(worldObjectThreeMatrix, worldObjectToolboxMatrix);
        return point.applyMatrix4(worldObjectThreeMatrix.invert());
    }
}

realityEditor.gui.ar.areaCreator.calculateFloorOffset = function() {
    const worldObjectToolboxMatrix = realityEditor.sceneGraph.getModelViewMatrix(realityEditor.sceneGraph.getWorldId());
    const worldObjectThreeMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
    realityEditor.gui.threejsScene.setMatrixFromArray(worldObjectThreeMatrix, worldObjectToolboxMatrix);
    const groundPlaneToolboxMatrix = realityEditor.sceneGraph.getGroundPlaneModelViewMatrix();
    const groundPlaneThreeMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
    realityEditor.gui.threejsScene.setMatrixFromArray(groundPlaneThreeMatrix, groundPlaneToolboxMatrix);
    const groundToWorldMatrix = groundPlaneThreeMatrix.clone().invert().multiply(worldObjectThreeMatrix);
    const position = new realityEditor.gui.threejsScene.THREE.Vector3();
    position.setFromMatrixPosition(groundToWorldMatrix);
    return -position.y;
}

// ensures there's a div on top of everything that blocks touch events from reaching the tools when we're in this mode
realityEditor.gui.ar.areaCreator.getUI = function () {
    if (!this.UI) {
        this.UI = document.createElement('div');
        this.UI.style.position = 'absolute';
        this.UI.style.left = '0';
        this.UI.style.top = '0';
        this.UI.style.width = '100vw';
        this.UI.style.height = '100vh';
        this.UI.style.display = 'none';
        this.UI.style.pointerEvents = 'none';
        let uiZIndex = 2900; // above scene elements, below pocket and menus
        this.UI.style.zIndex = uiZIndex;
        this.UI.style.transform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + uiZIndex + ',1)';
        document.body.appendChild(this.UI);

        this.UI.addEventListener('pointerdown', (event) => {
            realityEditor.gui.ar.areaCreator.pointerCallbacks.down(event);
            realityEditor.gui.ar.areaCreator.lastPointerY = event.clientY;
        });
        this.UI.addEventListener('pointerup', (event) => {
            realityEditor.gui.ar.areaCreator.pointerCallbacks.up(event);
            realityEditor.gui.ar.areaCreator.lastPointerY = null;
        });
        this.UI.addEventListener('pointercancel', (event) => {realityEditor.gui.ar.areaCreator.pointerCallbacks.up(event)});
        this.UI.addEventListener('pointermove', (event) => {
            realityEditor.gui.ar.areaCreator.pointerCallbacks.move(event);
            realityEditor.gui.ar.areaCreator.lastPointerY = event.clientY;
        });
        this.UI.cancelButton = document.createElement('img');
        this.UI.cancelButton.src = '/svg/areaCreator/cancelButton.svg';
        this.UI.cancelButton.style.position = 'absolute';
        this.UI.cancelButton.style.left = '0';
        this.UI.cancelButton.style.top = '0';
        this.UI.cancelButton.style.width = '15vh';
        this.UI.cancelButton.style.height = '15vh';
        let cancelButtonZIndex = 2902; // above areaCreator menus
        this.UI.cancelButton.style.zIndex = `${cancelButtonZIndex}`;
        this.UI.cancelButton.style.transform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + cancelButtonZIndex + ',1)';
        this.UI.cancelButton.addEventListener('pointerdown', (event) => {realityEditor.gui.ar.areaCreator.buttonCallbacks.cancel(event)});

        this.UI.appendChild(this.UI.cancelButton)
        
        this.UI.infoDiv = document.createElement('div');
        this.UI.infoDiv.style.position = 'absolute';
        this.UI.infoDiv.style.top = '0';
        this.UI.infoDiv.style.left = '0';
        this.UI.infoDiv.style.width = '100vw';
        this.UI.infoDiv.style.height = '15vh';
        this.UI.infoDiv.style.textAlign = 'center';

        this.UI.appendChild(this.UI.infoDiv);
        
        this.UI.infoText = document.createElement('div');
        this.UI.infoText.style.display = 'inline-block';
        this.UI.infoText.style.margin = '0 auto';
        this.UI.infoText.style.border = '4px solid white';
        this.UI.infoText.style.backgroundColor = 'rgba(0,0,0,0.4)';
        this.UI.infoText.style.color = 'white';
        this.UI.infoText.style.textAlign = 'center';
        this.UI.infoText.innerText = '';
        this.UI.infoText.style.display = 'none';
        this.UI.infoDiv.appendChild(this.UI.infoText);
        
        this.UI.drawingModeMenu = document.createElement('div');
        this.UI.drawingModeMenu.style.display = 'flex';
        this.UI.drawingModeMenu.style.justifyContent = 'space-evenly';
        this.UI.drawingModeMenu.style.alignItems = 'center';
        this.UI.drawingModeMenu.style.width = '100%';
        this.UI.drawingModeMenu.style.height = '100%';
        this.UI.drawingModeMenu.style.padding = '0 auto';
        this.UI.drawingModeMenu.style.display = 'none';
        this.UI.drawingModeMenu.style.pointerEvents = 'none';
        let drawingModeMenuZIndex = 2901; // above scene elements, below pocket and menus
        this.UI.drawingModeMenu.style.zIndex = `${drawingModeMenuZIndex}`;
        this.UI.drawingModeMenu.style.transform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + drawingModeMenuZIndex + ',1)';

        const freehandButton = document.createElement('img');
        freehandButton.src = "/svg/areaCreator/freehandButton.svg";
        const polygonButton = document.createElement('img');
        polygonButton.src = "/svg/areaCreator/polygonButton.svg";
        [freehandButton,polygonButton].forEach(button => {
            button.style.width = '50vh';
            button.style.height = '50vh';
        })

        freehandButton.addEventListener('pointerdown', (event) => {realityEditor.gui.ar.areaCreator.buttonCallbacks.freehand(event)});
        polygonButton.addEventListener('pointerdown', (event) => {realityEditor.gui.ar.areaCreator.buttonCallbacks.polygon(event)});
        
        this.UI.drawingModeMenu.appendChild(freehandButton);
        this.UI.drawingModeMenu.appendChild(polygonButton);
        
        this.UI.appendChild(this.UI.drawingModeMenu);

        this.UI.areaCreationMenu = document.createElement('div');
        this.UI.areaCreationMenu.style.display = 'none';
        this.UI.areaCreationMenu.style.pointerEvents = 'none';

        this.UI.confirmAreaButton = document.createElement('img');
        this.UI.confirmAreaButton.src = '/svg/areaCreator/confirmButton.svg';
        this.UI.confirmAreaButton.style.position = 'absolute';
        this.UI.confirmAreaButton.style.left = '0';
        this.UI.confirmAreaButton.style.top = '15vh';
        this.UI.confirmAreaButton.style.width = '15vh';
        this.UI.confirmAreaButton.style.height = '15vh';
        let confirmAreaButtonZIndex = 2902; // above areaCreator menus
        this.UI.confirmAreaButton.style.zIndex = `${confirmAreaButtonZIndex}`;
        this.UI.confirmAreaButton.style.transform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + confirmAreaButtonZIndex + ',1)';
        this.UI.confirmAreaButton.style.display = 'none';
        this.UI.confirmAreaButton.style.pointerEvents = 'none';
        this.UI.confirmAreaButton.addEventListener('pointerdown', (event) => {realityEditor.gui.ar.areaCreator.buttonCallbacks.confirmArea(event)});
        
        this.UI.areaCreationMenu.appendChild(this.UI.confirmAreaButton);

        this.UI.appendChild(this.UI.areaCreationMenu);

        this.UI.heightDefinitionMenu = document.createElement('div');
        this.UI.heightDefinitionMenu.style.display = 'none';
        this.UI.heightDefinitionMenu.style.pointerEvents = 'none';

        const confirmHeightButton = document.createElement('img');
        confirmHeightButton.src = '/svg/areaCreator/confirmButton.svg';
        confirmHeightButton.style.position = 'absolute';
        confirmHeightButton.style.left = '0';
        confirmHeightButton.style.top = '15vh';
        confirmHeightButton.style.width = '15vh';
        confirmHeightButton.style.height = '15vh';
        let confirmHeightButtonZIndex = 2902; // above areaCreator menus
        confirmHeightButton.style.zIndex = `${confirmHeightButtonZIndex}`;
        confirmHeightButton.style.transform = 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,' + confirmHeightButtonZIndex + ',1)';
        confirmHeightButton.addEventListener('pointerdown', (event) => {realityEditor.gui.ar.areaCreator.buttonCallbacks.confirmHeight(event)});

        this.UI.heightDefinitionMenu.appendChild(confirmHeightButton);
        
        this.UI.appendChild(this.UI.heightDefinitionMenu);
    }
    return this.UI;
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.clearCallbacks = function () {
    this.pointerCallbacks = {
        down: () => {},
        up: () => {},
        move: () => {}
    }
    this.buttonCallbacks = {
        cancel: () => {},
        freehand: () => {},
        polygon: () => {},
        confirmArea: () => {},
        confirmHeight: () => {}
    }
    this.animationCallbacks = [];
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.addAnimationCallback = function (callback) {
    this.animationCallbacks.push(callback);
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.removeAnimationCallback = function (callback) {
    if (this.animationCallbacks.includes(callback)) {
        this.animationCallbacks.splice(this.animationCallbacks.indexOf(callback), 1);
    }
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.onAnimationFrame = function () {
    this.animationCallbacks.forEach(callback => {
        callback();
    })
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.activateUI = function () {
    this.getUI().style.display = '';
    this.getUI().style.pointerEvents = 'auto';
    this.getUI().infoText.innerText = '';
    this.getUI().infoText.style.display = 'none';
    realityEditor.gui.threejsScene.onAnimationFrame(this.onAnimationFrame);
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.deactivateUI = function () {
    this.getUI().style.display = 'none';
    this.getUI().style.pointerEvents = 'none';
    this.hideDrawingModeSelectionMenu();
    this.hideAreaCreationMenu();
    this.hideHeightDefinitionMenu();
    realityEditor.gui.threejsScene.removeAnimationCallback(this.onAnimationFrame);
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.showDrawingModeSelectionMenu = function () {
    this.getUI().drawingModeMenu.style.display = 'flex';
    this.getUI().drawingModeMenu.style.pointerEvents = 'auto';
    this.getUI().infoText.innerText = 'Select a drawing mode.';
    this.getUI().infoText.style.display = 'inline-block';
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.hideDrawingModeSelectionMenu = function () {
    this.getUI().drawingModeMenu.style.display = 'none';
    this.getUI().drawingModeMenu.style.pointerEvents = 'none';
    this.getUI().infoText.innerText = '';
    this.getUI().infoText.style.display = 'none';
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.showAreaCreationMenu = function () {
    this.getUI().areaCreationMenu.style.display = '';
    this.getUI().areaCreationMenu.style.pointerEvents = 'auto';
    this.getUI().infoText.innerText = 'Define an area by drawing on the ground.';
    this.getUI().infoText.style.display = 'inline-block';
    realityEditor.gui.ar.areaCreator.hideAreaConfirmationButton(); // Starts hidden because requires 3 points
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.hideAreaCreationMenu = function () {
    this.getUI().areaCreationMenu.display = 'none';
    this.getUI().areaCreationMenu.pointerEvents = 'none';
    this.getUI().infoText.innerText = '';
    this.getUI().infoText.style.display = 'none';
    realityEditor.gui.ar.areaCreator.hideAreaConfirmationButton();
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.showAreaConfirmationButton = function () {
    this.UI.confirmAreaButton.style.display = '';
    this.UI.confirmAreaButton.style.pointerEvents = 'auto';
}

realityEditor.gui.ar.areaCreator.hideAreaConfirmationButton = function () {
    this.UI.confirmAreaButton.style.display = 'none';
    this.UI.confirmAreaButton.style.pointerEvents = 'none';
}

realityEditor.gui.ar.areaCreator.showHeightDefinitionMenu = function () {
    this.getUI().heightDefinitionMenu.style.display = '';
    this.getUI().heightDefinitionMenu.style.pointerEvents = 'auto';
    this.getUI().infoText.innerText = 'Swipe vertically to set the height of the area.';
    this.getUI().infoText.style.display = 'inline-block';
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.hideHeightDefinitionMenu = function () {
    this.getUI().heightDefinitionMenu.style.display = 'none';
    this.getUI().heightDefinitionMenu.style.pointerEvents = 'none';
    this.getUI().infoText.innerText = '';
    this.getUI().infoText.style.display = 'none';
}.bind(realityEditor.gui.ar.areaCreator);

realityEditor.gui.ar.areaCreator.disable = function () {
    this.mode = this.Modes.DISABLED;
    this.clearCallbacks();
    this.polygonPoints = [];
    this.height = 1;
    this.canDragTouch = false;
    this.lastPointerY = null;
    if (this.areaRender) {
        this.clearAreaRender();
    }
    this.needsRenderUpdate = false;
    this.deactivateUI();
}.bind(realityEditor.gui.ar.areaCreator);
