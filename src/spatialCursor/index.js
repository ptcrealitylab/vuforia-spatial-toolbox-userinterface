createNameSpace("realityEditor.spatialCursor");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {

    const SNAP_CURSOR_TO_TOOLS = false; // the snapping doesn't do anything yet, so turn off for now
    const DEFAULT_SPATIAL_CURSOR_ON = true; // applied after we localize within a target / download occlusion mesh

    let isCursorEnabled = false; // always starts off, turns on after localize
    let isUpdateLoopRunning = false;
    let occlusionDownloadInterval = null;
    let cachedOcclusionObject = null;
    let cachedWorldObject = null;

    let worldIntersectPoint = {};
    let opacityFactor = 1;
    let innerRadius = 0.1;
    let innerRadiusSpeed = -0.01;
    let scaleFactor = 0;
    let indicator1; // top indicator --- a ring with a dot in the center
    let indicator2; // bottom indicator --- a filled circle with avatar color
    let overlapped = false;
    let isMyColorDetermined = false;
    let isHighlighted = false;
    let isOnGroundPlane = false;
    let isMeasureMode = false;
    let isCloseLoop = false;
    let shouldCrossRotate = false;
    let t11 = 0; // when toggle on/off measure mode, interpolate between filled circle / cross. 0 -- filled circle; 1 -- cross
    let t22 = 0; // when inside measure mode, when user idle for a while, trigger 2 rotations
    let t33 = 0; // when inside measure mode, when cursor intersect a vertex & able to close a loop, interpolate between cross / hollow circle. 0 -- cross; 1 -- hollow circle

    // contains spatial cursors of other users – updated by their avatar's publicData
    let otherSpatialCursors = {};

    let clock = new THREE.Clock();
    
    // offset the spatial cursor with the worldIntersectPoint to avoid clipping plane issues
    const topCursorOffset = 15;
    const bottomCursorOffset = 1;
    const indicatorAxis = new THREE.Vector3(0, 0, 1);
    // const normalCursorMaterial = new THREE.ShaderMaterial({
    //     vertexShader: realityEditor.spatialCursor.shader.vertexShader.vertexShaderCode,
    //     fragmentShader: realityEditor.spatialCursor.shader.normalCursorFragmentShader.normalCursorFragmentShaderCode,
    //     uniforms: uniforms,
    //     transparent: true,
    //     side: THREE.DoubleSide,
    // });
    const vertexShader = `
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
    varying vec2 vUv;
    //uniform EPSILON;
    
    void main() {
        ${THREE.ShaderChunk.logdepthbuf_vertex}
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
    `;
    const commonShader = `
        float Remap01 (float x, float low, float high) {
            return clamp((x - low) / (high - low), 0., 1.);
        }
    
        float Remap (float x, float lowIn, float highIn, float lowOut, float highOut) {
            return lowOut + (highOut - lowOut) * Remap01(x, lowIn, highIn);
        }
    
        vec2 Rot(vec2 uv, float a) {
            return mat2(cos(a), -sin(a), sin(a), cos(a)) * vec2(uv);
        }
        
        float sdRoundedBox( in vec2 p, in vec2 b, in vec4 r, in float a )
        {
            p = Rot(p, a);
            r.xy = (p.x>0.0)?r.xy : r.zw;
            r.x  = (p.y>0.0)?r.x  : r.y;
            vec2 q = abs(p)-b+r.x;
            return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r.x;
        }
    
        float sdCross( in vec2 uv, in vec2 size, in vec4 r, in float a ) {
            float box1 = sdRoundedBox(uv, size, r, 0. + a);
            box1 = S(blur, -blur, box1);
    
            float box2 = sdRoundedBox(uv, size, r, PI / 2. + a);
            box2 = S(blur, -blur, box2);
    
            float boxes = box1 + box2;
            boxes = clamp(boxes, 0., 1.);
            return boxes;
        }
    
        float hollowCircle( in vec2 uv, in float r, in float thickness) {
            float d = abs(length(uv)-r)-thickness;
            return S(blur, -blur, d);
        }
    
        float fillCircle( in vec2 uv, in float r) {
            float d = length(uv) - r;
            return S(blur, -blur, d);
        }
    `;
    const normalFragmentShader = `
    #define blur 0.01
    #define PI 3.14159
    #define S(a, b, n) smoothstep(a, b, n)
    #define innerRadiusLow 0.1
    #define innerRadiusHigh 0.5
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    varying vec2 vUv;
    uniform float opacityFactor;
    uniform float innerRadius;
    uniform bool isMeasureMode;
    uniform float t11;
    uniform float t22;
    uniform float t33;
    
    // changing top cursor to colored when outside of the mesh
    uniform bool isColored;
    struct AvatarColor {
        vec3 color;
        vec3 colorLighter;
    };
    uniform AvatarColor avatarColor[1];
    
    ${commonShader}
    
    void main(void) {
        ${THREE.ShaderChunk.logdepthbuf_fragment}
        vec2 uv = -1.0 + 2.0 * vUv;
        vec3 col = vec3(0.);
        float alpha = 0.;
        float d = 0.;
        
        // outer hollow circle --- all the time
        float outerHollowCircle = hollowCircle(uv, 1., 0.1);
        d += outerHollowCircle;
        
        // inner fill circle --- normal mode
        float innerRadiusCopy = clamp(innerRadius, innerRadiusLow, innerRadiusHigh);
        float dNormalMode = fillCircle(uv, innerRadiusCopy);
        
        // middle circle / cross morph --- measure mode
        float width = 0.1;
        float t1 = t11;
        t1 = -(t1 - 1.) * (t1 - 1.) + 1.; // ease out animation for transition between circle & cross
        width = mix(0.1, 0.05, t1);
        t1 = Remap(t1, 0., 1., width, 0.4);

        float t2 = t22;
        t2 = -(t2 - 1.) * (t2 - 1.) + 1.;
        t2 = Remap(t2, 0., 1., 0., -PI);

        vec2 size = vec2(t1, width);
        vec4 roundness = vec4(width);

        float innerCircleCross = sdCross(uv, size, roundness, t2);

        // inner hollow circle --- measure mode close loop hint
        float innerHollowCircle = hollowCircle(uv, 0.36, 0.05);

        float t3 = t33; // 
        
        float dMeasureMode = mix(innerCircleCross, innerHollowCircle, t3);

        bool isMeasure = isMeasureMode;
        d += isMeasure ? dMeasureMode : dNormalMode;
        
        col = d * (isColored ? avatarColor[0].color : vec3(1.));
        alpha = d;
        gl_FragColor = vec4(col, alpha * 0.5 * opacityFactor);
    }
    `;
    const colorFragmentShader = `
    uniform float time;
    varying vec2 vUv;
    
    void main(void) {
        vec2 position = -1.0 + 2.0 * vUv;
        vec2 translate = vec2(-0.5, 0);
        position += translate;
    
        float r = abs(sin(position.x * position.y + time / 2.0));
        float g = abs(sin(position.x * position.y + time / 4.0));
        float b = abs(sin(position.x * position.y + time / 6.0));
    
        gl_FragColor = vec4(r, g, b, 1.0);
    }
    `;

    let color = 'rgb(0, 255, 255)', colorLighter = 'rgb(255, 255, 255)';
    let finalColor = [{
        color: new THREE.Color(color),
        colorLighter: new THREE.Color(colorLighter)
    }];
    
    let uniforms = {
        'EPSILON': {value: Number.EPSILON},
        'time': {value: 0},
        'opacityFactor': {value: opacityFactor},
        'innerRadius': {value: innerRadius},
        'isMeasureMode': {value: isMeasureMode},
        't11': {value: t11},
        't22': {value: t22},
        't33': {value: t33},

        'isColored': {value: false},
        'avatarColor': {value: finalColor},
    };
    // remember to set depthTest=false and depthWrite=false after creating the material, to prevent visual glitches
    const normalCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: normalFragmentShader,
        uniforms: uniforms,
        transparent: true,
        side: THREE.DoubleSide,
    });
    const colorCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: colorFragmentShader,
        uniforms: uniforms,
        transparent: true,
        side: THREE.DoubleSide,
    });
    
    let uniforms2 = {
        'EPSILON': {value: Number.EPSILON},
        'avatarColor': {value: finalColor},
        'opacityFactor': {value: opacityFactor},
    };
    const testCursorFragmentShader = `
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    varying vec2 vUv;
    uniform float opacityFactor;
    
    // set up color uniforms
    struct AvatarColor {
        vec3 color;
        vec3 colorLighter;
    };
    uniform AvatarColor avatarColor[1];
    
    void main(void) {
        ${THREE.ShaderChunk.logdepthbuf_fragment}
        vec3 color = avatarColor[0].color;
        gl_FragColor = vec4(color, 0.5 * opacityFactor);
    }
    `;
    const testCursorMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: testCursorFragmentShader,
        uniforms: uniforms2,
        transparent: true,
        // blending: THREE.CustomBlending,
        // blendEquation: THREE.AddEquation,
        // blendSrc: THREE.SrcColorFactor,
        // blendDst: THREE.OneMinusSrcAlphaFactor,
        side: THREE.DoubleSide,
    });
    // const testCursorMaterial = new THREE.ShaderMaterial({
    //     vertexShader: vertexShader,
    //     fragmentShader: testCursorFragmentShader,
    //     uniforms: uniforms2,
    //     transparent: true,
    //     blending: THREE.AdditiveBlending,
    //     side: THREE.DoubleSide,
    // });

    const clamp = (x, low, high) => {
        return Math.min(Math.max(x, low), high);
    }

    const remap01 = (x, low, high) => {
        return clamp((x - low) / (high - low), 0, 1);
    }

    const remap = (x, lowIn, highIn, lowOut, highOut) => {
        return lowOut + (highOut - lowOut) * remap01(x, lowIn, highIn);
    }
    
    const fract = (x) => {
        return x - Math.floor(x);
    }

    async function getMyAvatarColor() {
        let myAvatarColor = await realityEditor.avatar.getMyAvatarColor();
        color = `${myAvatarColor.color}`;
        colorLighter = `${myAvatarColor.colorLighter}`;
        finalColor[0] = {
            color: new THREE.Color(color),
            colorLighter: new THREE.Color(colorLighter)
        };

        // show the cursor if it was hidden while this function resolves
        isMyColorDetermined = true;
        if (isCursorEnabled && !isUpdateLoopRunning) {
            indicator1.visible = true;
            indicator2.visible = true;
            update(); // restart the update loop
        }
    }

    function onLoadOcclusionObject(callback) {
        occlusionDownloadInterval = setInterval(() => {
            if (!cachedWorldObject) {
                cachedWorldObject = realityEditor.worldObjects.getBestWorldObject();
            }
            if (!cachedWorldObject) {
                return;
            }
            if (cachedWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
                cachedWorldObject = null; // don't accept the local world object
            }
            if (cachedWorldObject && !cachedOcclusionObject) {
                cachedOcclusionObject = realityEditor.gui.threejsScene.getObjectForWorldRaycasts(cachedWorldObject.objectId);
                if (cachedOcclusionObject) {
                    // trigger the callback and clear the interval
                    callback(cachedWorldObject, cachedOcclusionObject);
                    clearInterval(occlusionDownloadInterval);
                    occlusionDownloadInterval = null;
                }
            }
        }, 1000);
    }

    async function initService() {
        onLoadOcclusionObject((worldObject, occlusionObject) => {
            cachedWorldObject = worldObject;
            cachedOcclusionObject = occlusionObject;

            if (DEFAULT_SPATIAL_CURSOR_ON) {
                toggleDisplaySpatialCursor(true);
            }
        });

        realityEditor.worldObjects.onLocalizedWithinWorld(function(worldObjectKey) {
            if (worldObjectKey === realityEditor.worldObjects.getLocalWorldId()) {
                return;
            }

            if (DEFAULT_SPATIAL_CURSOR_ON) {
                toggleDisplaySpatialCursor(true);
            }
        });
        
        addSpatialCursor();
        addTestSpatialCursor();
        toggleDisplaySpatialCursor(false);
        updateCursorDirectionArray();

        registerKeyboardFlyMode();
        
        await getMyAvatarColor();
        uniforms2['avatarColor'].value = finalColor;

        const ADD_SEARCH_TOOL_WITH_CURSOR = false;
        
        document.addEventListener('pointerdown', () => {
            // make the spatial cursor inner white circle pulse
            innerRadiusSpeed += 0.15;
        })

        addPostMessageHandlers();

        if (ADD_SEARCH_TOOL_WITH_CURSOR) {
            document.addEventListener('pointerdown', (e) => {
                if (!indicator2 || !indicator2.visible) return;
                if (realityEditor.device.isMouseEventCameraControl(e)) return;
                if (!realityEditor.device.utilities.isEventHittingBackground(e)) return; // if clicking on a button, etc, don't trigger this

                // raycast against the spatial cursor
                let intersects = realityEditor.gui.threejsScene.getRaycastIntersects(e.clientX, e.clientY, [indicator2]);
                if (intersects.length > 0) {
                    addToolAtScreenCenter('searchDigitalThread', { moveToCursor: true });
                }
            });
        }

        realityEditor.network.addPostMessageHandler('getSpatialCursorEvent', (_, fullMessageData) => {
            let tmpRaycastResult = getRaycastCoordinates(screenX, screenY, false);
            let threejsIntersectPoint = tmpRaycastResult.point === undefined ? undefined : {
                x: tmpRaycastResult.point.x,
                y: tmpRaycastResult.point.y,
                z: tmpRaycastResult.point.z,
            }
            realityEditor.network.postMessageIntoFrame(fullMessageData.frame, {
                spatialCursorEvent: {
                    clientX: screenX,
                    clientY: screenY,
                    x: screenX,
                    y: screenY,
                    projectedZ: projectedZ,
                    threejsIntersectPoint: threejsIntersectPoint
                }
            });
        });
    }

    // publicly accessible function to add a tool at the spatial cursor position (or floating in front of you)
    function addToolAtScreenCenter(toolName, { moveToCursor = false, onToolUploadComplete = null} = {}) {
        
        let spatialCursorMatrix = null;
        if (moveToCursor) {
            spatialCursorMatrix = realityEditor.spatialCursor.getOrientedCursorRelativeToWorldObject();
        } else {
            let info = realityEditor.spatialCursor.getOrientedCursorIfItWereAtScreenCenter();
            if (info.didFindCenterPoint) {
                spatialCursorMatrix = info.matrix;
            }
        }

        // verify that the matrix is valid, otherwise tool can init with NaN values
        if (!realityEditor.gui.ar.utilities.isValidMatrix4x4(spatialCursorMatrix)) {
            spatialCursorMatrix = null;
        }

        let addedElement = realityEditor.gui.pocket.createFrame(toolName, {
            noUserInteraction: true,
            pageX: window.innerWidth / 2,
            pageY: window.innerHeight / 2,
            initialMatrix: (spatialCursorMatrix) ? spatialCursorMatrix : undefined,
            onUploadComplete: () => {
                realityEditor.network.postVehiclePosition(addedElement);
                if (typeof onToolUploadComplete === 'function') {
                    onToolUploadComplete(addedElement);
                }
            }
        });

        if (!moveToCursor && !spatialCursorMatrix) {
            let worldCenterPoint = getRaycastCoordinates(window.innerWidth/2, window.innerHeight/2);
            if (worldCenterPoint.point === undefined) {
                let rotateCenterId = 'rotateCenter'+'_VISUAL_ELEMENT';
                if (realityEditor.sceneGraph.getSceneNodeById(rotateCenterId) !== undefined) {
                    // when on desktop, there is rotation center
                    let dist = realityEditor.sceneGraph.getDistanceToCamera(rotateCenterId);
                    console.log(dist);
                    realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid, dist);
                } else {
                    // when on phone, there's no rotation center
                    realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid, 1000);
                }
            } else {
                // when there is area target mesh at screen center
                let worldCamPoint = new THREE.Vector3();
                realityEditor.gui.threejsScene.getInternals().camera.getWorldPosition(worldCamPoint);
                realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid, worldCenterPoint.point.distanceTo(worldCamPoint));
            }
        }
        return addedElement;
    }

    // publicly accessible function to add a tool at the spatial cursor position (or floating in front of you)
    // tool added at screen coordinates
    function addToolAtSpecifiedCoords(toolName, { moveToCursor = false, screenX, screenY }) {

        // TODO: what happens if you drop tool into the sky, looking up – make it drop close in front of you
        let spatialCursorMatrix = null;
        if (moveToCursor) {
            spatialCursorMatrix = realityEditor.spatialCursor.getOrientedCursorRelativeToWorldObject();
        } else if (screenX !== null && screenY !== null){
            //set spatialCursorMatrix equal to screen coordinates
            let info = realityEditor.spatialCursor.getOrientedCursorAtSpecificCoords(screenX, screenY);
            if (info.didFindMouseCoords) {
                spatialCursorMatrix = info.matrix;
            }
        } else {
            let info = realityEditor.spatialCursor.getOrientedCursorIfItWereAtScreenCenter();
            if (info.didFindCenterPoint) {
                spatialCursorMatrix = info.matrix;
            }
        }

        // verify that the matrix is valid, otherwise tool can init with NaN values
        if (!realityEditor.gui.ar.utilities.isValidMatrix4x4(spatialCursorMatrix)) {
            spatialCursorMatrix = null;
        }

        let addedElement = realityEditor.gui.pocket.createFrame(toolName, {
            noUserInteraction: true,
            pageX: screenX,
            pageY: screenY,
            initialMatrix: (spatialCursorMatrix) ? spatialCursorMatrix : undefined,
            onUploadComplete: () => {
                realityEditor.network.postVehiclePosition(addedElement);
            }
        });

        if (!moveToCursor && !spatialCursorMatrix) {
            let worldCenterPoint = getRaycastCoordinates(screenX, screenY);
            if (worldCenterPoint.point === undefined) {
                let rotateCenterId = 'rotateCenter'+'_VISUAL_ELEMENT';
                if (realityEditor.sceneGraph.getSceneNodeById(rotateCenterId) !== undefined) {
                    // when on desktop, there is rotation center
                    let dist = realityEditor.sceneGraph.getDistanceToCamera(rotateCenterId);
                    console.log(dist);
                    realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid, dist);
                } else {
                    // when on phone, there's no rotation center
                    realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid, 1000);
                }
            } else {
                // when there is area target mesh at screen center
                let worldCamPoint = new THREE.Vector3();
                realityEditor.gui.threejsScene.getInternals().camera.getWorldPosition(worldCamPoint);
                realityEditor.gui.ar.positioning.moveFrameToCamera(addedElement.objectId, addedElement.uuid, worldCenterPoint.point.distanceTo(worldCamPoint));
            }
        }
        return addedElement;
    }

    let screenX, screenY;
    let lastScreenX, lastScreenY;
    let isFlying = false;
    function registerKeyboardFlyMode() {
        realityEditor.device.keyboardEvents.registerCallback('enterFlyMode', function (params) {
            isFlying = params.isFlying;
            let mousePosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
            lastScreenX = mousePosition.x;
            lastScreenY = mousePosition.y;
            screenX = window.innerWidth / 2;
            screenY = window.innerHeight / 2;
        });

        realityEditor.device.keyboardEvents.registerCallback('enterNormalMode', function (params) {
            isFlying = params.isFlying;
            screenX = lastScreenX;
            screenY = lastScreenY;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isFlying) {
                screenX = e.pageX;
                screenY = e.pageY;
            }
        });
    }

    let hasSubscribedToUpdates = false;
    function update() {
        if (hasSubscribedToUpdates) return;
        hasSubscribedToUpdates = true;
        realityEditor.gui.threejsScene.onAnimationFrame(updateLoop);
    }

    // allow external module to move the cursor to a certain screen position,
    // as if the user moved their mouse to that position (useful e.g. if pointerevents are blocked)
    function setCursorPosition(x, y) {
        screenX = x;
        screenY = y;
    }

    // allow external module to update some visual properties of the cursor
    function setCursorStyle({highlighted}) {
        isHighlighted = highlighted;
    }

    // allow external module to check whether cursor is currently on world mesh
    function isCursorOnValidPosition() {
        return Object.keys(worldIntersectPoint).length > 0;
    }
    
    function addPostMessageHandlers() {
        realityEditor.network.addPostMessageHandler('spatialCursorToggleMeasureMode', toggleMeasureMode);
        realityEditor.network.addPostMessageHandler('spatialCursorToggleCrossRotation', toggleCrossRotation);
        realityEditor.network.addPostMessageHandler('spatialCursorToggleCloseLoop', toggleCloseLoop);
    }
    
    let measureFalseId = null;
    function toggleMeasureMode(boolean) { // bug: spam-toggling has visual mode bugs
        if (boolean) {
            isMeasureMode = true;
            innerRadius = 0.1;
            if (measureFalseId !== null) clearTimeout(measureFalseId);
            uniforms['isMeasureMode'].value = true;
        } else {
            isMeasureMode = false;
            innerRadius = 0.1;
            measureFalseId = setTimeout(() => { // wait for the cross -> circle animation to finish before switching back to normal mode
                uniforms['isMeasureMode'].value = false;
            }, 3000);
        }
    }

    function toggleCrossRotation(boolean) {
        shouldCrossRotate = boolean;
    }
    
    function toggleCloseLoop(boolean) {
        isCloseLoop = boolean;
    }
    
    function updateT11() {
        if ((isMeasureMode && t11 === 1) || (!isMeasureMode && t11 === 0)) return;
        t11 += (isMeasureMode ? 1 : -1) * 0.03;
        t11 = clamp(t11, 0, 1);
        uniforms['t11'].value = t11;
    }
    
    function updateT22() { // only allow cross to rotate twice
        if (!shouldCrossRotate) {
            uniforms['t22'].value = 0;
            return;
        }
        if (t22 > 2) {
            t22 = 0;
            uniforms['t22'].value = 0;
            shouldCrossRotate = false;
            return;
        }
        t22 += 0.008;
        uniforms['t22'].value = fract(t22);
    }

    function updateT33() {
        if ((isCloseLoop && t33 === 1) || (!isCloseLoop && t33 === 0)) return;
        t33 += (isCloseLoop ? 1 : -1) * 0.06;
        t33 = clamp(t33, 0, 1);
        uniforms['t33'].value = t33;
    }
    
    function updateCursorMeasureStyle() {
        updateT11();
        updateT22();
        updateT33();
    }

    function updateLoop() {
        if (!isCursorEnabled || !isMyColorDetermined) {
            isUpdateLoopRunning = false;
            indicator1.visible = false;
            indicator2.visible = false;
            return; // need to call update() again when isCursorEnabled gets toggled on again
        }
        isUpdateLoopRunning = true;

        try {
            // for iPhone usage, keep spatial cursor at the center of the screen
            if (!realityEditor.device.environment.isDesktop()) {
                screenX = window.innerWidth / 2;
                screenY = window.innerHeight / 2;
            }
            worldIntersectPoint = getRaycastCoordinates(screenX, screenY);
            updateScaleFactor();
            updateOpacityFactor();
            updateInnerRadius();
            updateSpatialCursor();
            updateTestSpatialCursor();
            tweenCursorDirection();
            uniforms['time'].value = clock.getElapsedTime() * 10;
            updateCursorMeasureStyle();

            if (SNAP_CURSOR_TO_TOOLS) {
                trySnappingCursorToTools(screenX, screenY);
            }
        } catch (e) {
            console.warn('error in spatialCursor', e);
        }
    }

    function trySnappingCursorToTools(screenX, screenY) {
        // todo Steve: when viewing the tool from different angles, the tool changes direction to face user, but
        // todo Steve: the spatial cursor snaps doesn't change direction, should fix it, that would also affect the
        // todo Steve: getToolDirection() function inside spatial search in remote operator
        // constantly check if the screen center overlaps any iframes
        let overlappingDivs = realityEditor.device.utilities.getAllDivsUnderCoordinate(screenX, screenY);
        overlapped = overlappingDivs.some(element => {
            return element.tagName === 'IFRAME' && typeof element.dataset.objectKey !== 'undefined';
        });
        if (overlapped) {
            let overlappingIframe = overlappingDivs.find(element => element.tagName === 'IFRAME');
            let tool = realityEditor.getFrame(overlappingIframe.dataset.objectKey, overlappingIframe.dataset.frameKey);
            if (tool.fullScreen) {
                overlapped = false;
            } else {
                let position = realityEditor.gui.threejsScene.getToolPosition(overlappingIframe.dataset.frameKey);
                indicator1.position.set(position.x, position.y, position.z);
                indicator1.quaternion.setFromUnitVectors(indicatorAxis, realityEditor.gui.threejsScene.getToolDirection(overlappingIframe.dataset.frameKey));
            }
        }
    }

    /**
     * Moves the spatial cursor for this avatar to the specified position.
     * Creates the spatial cursor if it doesn't exist yet.
     * @param {string} objectKey
     * @param {number[]} cursorMatrix
     * @param {string} cursorColorHSL - hsl string of color
     * @param {string} isColored - if cursor within area target mesh, isColored === true; otherwise false
     * @param {string} relativeToWorldId
     */
    function renderOtherSpatialCursor(objectKey, cursorMatrix, cursorColorHSL, isColored, relativeToWorldId) {
        if (relativeToWorldId !== realityEditor.sceneGraph.getWorldId()) return; // ignore cursors in other worlds
        if (typeof cursorColorHSL !== 'string') return; // color is required to initialize the material

        if (typeof otherSpatialCursors[objectKey] === 'undefined') {
            let cursorGroup = addOtherSpatialCursor(cursorColorHSL, isColored);
            otherSpatialCursors[objectKey] = {
                group: cursorGroup,
                worldId: relativeToWorldId,
                matrix: cursorMatrix
            }
            realityEditor.gui.threejsScene.addToScene(cursorGroup);
        }

        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(relativeToWorldId);
        let groundPlaneSceneNode = realityEditor.sceneGraph.getGroundPlaneNode();

        if (!worldSceneNode || !groundPlaneSceneNode) return;

        otherSpatialCursors[objectKey].group.matrix = realityEditor.sceneGraph.convertToNewCoordSystem(
            cursorMatrix, worldSceneNode, groundPlaneSceneNode);
        let scaleFactor = isColored ? 0 : 1;
        otherSpatialCursors[objectKey].group.children[1].scale.set(scaleFactor, scaleFactor, scaleFactor);
        otherSpatialCursors[objectKey].group.children[0].material.uniforms['isColored'].value = isColored;
    }

    /**
     * Helper function to create and return the THREE.Group for another client's cursor
     * The material is more transparent than your own cursor.
     * @returns {Group}
     */
    function addOtherSpatialCursor(cursorColorHSL, isColored) {
        const geometry1 = new THREE.CircleGeometry(geometryLength, 32);
        // todo Steve: use ShaderMaterial.clone() to prevent the other cursor inner circles from playing the same expanding animation
        // todo Steve: probably a better idea to separate the inner & outer circles of all indicator1's, and animate the scale property, b/c that way animation can reflect to other clients when I click
        const indicator1 = new THREE.Mesh(geometry1, normalCursorMaterial.clone());
        indicator1.material.uniforms['avatarColor'].value = [{
            color: new THREE.Color(cursorColorHSL),
            colorLighter: new THREE.Color(cursorColorHSL)
        }];
        indicator1.renderOrder = 5 + Object.keys(otherSpatialCursors).length * 2 + 1;

        const geometry2 = new THREE.CircleGeometry(geometryLength, 32);
        const material2 = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: testCursorFragmentShader,
            uniforms: {
                'EPSILON': {value: Number.EPSILON},
                'avatarColor': {value: [{
                        color: new THREE.Color(cursorColorHSL),
                        colorLighter: new THREE.Color(cursorColorHSL)
                    }]
                },
                'opacityFactor': { value: 0.4 }, // alpha = 0.5 * opacityFactor
                'isColored': {value: isColored},
            },
            transparent: true,
            side: THREE.DoubleSide,
        });

        const indicator2 = new THREE.Mesh(geometry2, material2);
        indicator2.name = 'coloredCursorMesh';
        indicator2.renderOrder = 5 + Object.keys(otherSpatialCursors).length * 2;

        const cursorGroup = new THREE.Group();
        cursorGroup.add(indicator1);
        cursorGroup.add(indicator2);

        cursorGroup.matrixAutoUpdate = false;

        return cursorGroup;
    }

    function deleteOtherSpatialCursor(objectKey) {
        if (typeof otherSpatialCursors[objectKey] !== 'undefined') {
            realityEditor.gui.threejsScene.removeFromScene(otherSpatialCursors[objectKey].group);
            delete otherSpatialCursors[objectKey];
        }
    }

    const geometryLength = 50;
    
    function addSpatialCursor() {
        const geometry = new THREE.CircleGeometry(geometryLength, 32);
        indicator1 = new THREE.Mesh(geometry, normalCursorMaterial);
        indicator1.renderOrder = 4;
        indicator1.material.depthTest = false; // fixes visual glitch by preventing occlusion from area target
        indicator1.material.depthWrite = false;
        realityEditor.gui.threejsScene.addToScene(indicator1);
    }
    
    function addTestSpatialCursor() {
        const geometry = new THREE.CircleGeometry(geometryLength, 32);
        indicator2 = new THREE.Mesh(geometry, testCursorMaterial);
        indicator2.renderOrder = 3;
        indicator2.material.depthTest = false; // fixes visual glitch by preventing occlusion from area target
        indicator2.material.depthWrite = false;
        realityEditor.gui.threejsScene.addToScene(indicator2);
    }

    let scaleAccelerationFactor = 0.002, scaleAcceleration = scaleAccelerationFactor, scaleSpeed = 0;
    function updateScaleFactor() {
        let MAX_SCALE_FACTOR = isHighlighted ? 3 : 1; // get larger when in "highlighted" state
        
        if (Object.keys(worldIntersectPoint).length === 0 || worldIntersectPoint.isOnGroundPlane) {
            isOnGroundPlane = true;
            // if doesn't intersect any point in world || intersects with ground plane
            if (scaleFactor === 0) return;
            if (scaleAcceleration === scaleAccelerationFactor) {
                // if previously, intersects with some point in world
                scaleAcceleration = -scaleAccelerationFactor;
                scaleSpeed = 0;
            }
            scaleSpeed += scaleAcceleration * (isHighlighted ? 6 : 1); // get larger faster when highlighted
            scaleFactor += scaleSpeed;
            scaleFactor = clamp(scaleFactor, 0, MAX_SCALE_FACTOR);
            indicator2.scale.set(scaleFactor, scaleFactor, scaleFactor); // indicator 2: the lower fill color indicator
            indicator1.material.uniforms['isColored'].value = true;
        } else {
            isOnGroundPlane = false;
            // if intersects with other meshes in the world
            if (scaleFactor === MAX_SCALE_FACTOR) return;
            if (scaleAcceleration === -scaleAccelerationFactor) {
                // if previously, doesn't intersect with some point in world
                scaleAcceleration = scaleAccelerationFactor;
                scaleSpeed = 0;
            }
            scaleSpeed += scaleAcceleration * (isHighlighted ? 6 : 1);
            scaleFactor += scaleSpeed;
            scaleFactor = clamp(scaleFactor, 0, MAX_SCALE_FACTOR);
            indicator2.scale.set(scaleFactor, scaleFactor, scaleFactor);
            indicator1.material.uniforms['isColored'].value = false;
        }
    }
    
    let fadeOutDistance = 500, maxOpacityDistance = 1000;
    let opacityLow = 0.1, opacityHigh = 1;
    function updateOpacityFactor() {
        if (typeof worldIntersectPoint.distance !== 'undefined') {
            opacityFactor = remap(worldIntersectPoint.distance, fadeOutDistance, maxOpacityDistance, opacityLow, opacityHigh);
        }
    }
    
    function updateInnerRadius() {
        innerRadiusSpeed -= 0.003;
        innerRadiusSpeed = clamp(innerRadiusSpeed, -0.01, 0.3);
        innerRadius += innerRadiusSpeed;
        innerRadius = clamp(innerRadius, 0.1, 0.3);
        indicator1.material.uniforms.innerRadius.value = innerRadius;
    }
    
    let cursorDirections = [];
    let clockForCursorDirection = new THREE.Clock(false);
    let updateInterval = 200;
    function updateCursorDirectionArray() {
        setInterval(() => {
            if (Object.keys(worldIntersectPoint).length === 0) return;
            if (cursorDirections.length < 2) {
                cursorDirections.push(worldIntersectPoint.normalVector.clone());
                return;
            }
            cursorDirections.push(worldIntersectPoint.normalVector.clone());
            cursorDirections.shift();
            clockForCursorDirection.start();
        }, updateInterval);
    }
    
    function tweenCursorDirection() {
        if (typeof worldIntersectPoint.point === 'undefined') return;
        // if cursorDirections[] has 1 entry, set indicator quaternion to that direction
        if (cursorDirections.length === 1) {
            indicator1.quaternion.setFromUnitVectors(indicatorAxis, cursorDirections[0]);
            return;
        }
        // if cursorDirections[] has 2 entries, interpolate between the two quaternions in the cursorDirections[] array every frame
        if (cursorDirections.length === 2) {
            let oldQuaternion = new THREE.Quaternion().setFromUnitVectors(indicatorAxis, cursorDirections[0]);
            let desQuaternion = new THREE.Quaternion().setFromUnitVectors(indicatorAxis, cursorDirections[1]);
            let percentage = clockForCursorDirection.getElapsedTime() * 1000 / updateInterval;
            indicator1.quaternion.slerpQuaternions(oldQuaternion, desQuaternion, percentage);
            indicator2.quaternion.slerpQuaternions(oldQuaternion, desQuaternion, percentage);
        }
    }
    
    function updateSpatialCursor() {
        if (typeof worldIntersectPoint.point !== 'undefined') {
            indicator1.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
            let offset = worldIntersectPoint.normalVector.clone().multiplyScalar(topCursorOffset);
            indicator1.position.add(offset);
        }
        indicator1.material = overlapped ? colorCursorMaterial : normalCursorMaterial;
        indicator1.material.uniforms.opacityFactor.value = opacityFactor;
    }

    function updateTestSpatialCursor() {
        if (typeof worldIntersectPoint.point !== 'undefined') {
            indicator2.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
            let offset = worldIntersectPoint.normalVector.clone().multiplyScalar(bottomCursorOffset);
            indicator2.position.add(offset);
        }
        indicator2.material.uniforms.opacityFactor.value = opacityFactor;
    }

    function toggleDisplaySpatialCursor(newValue) {
        isCursorEnabled = newValue;
        indicator1.visible = newValue;
        indicator2.visible = newValue;

        if (isCursorEnabled && !isUpdateLoopRunning) {
            update(); // restart the update loop
        }
    }
    
    let gsActive = false;
    function isGSActive() {
        return gsActive;
    }
    function gsToggleActive(active) {
        gsActive = active;
    }
    let gsPosition = null;
    function gsSetPosition(position) {
        gsPosition = position;
    }

    let projectedZ = null;
    function getRaycastCoordinates(screenX, screenY, includeGroundPlane = true) {
        if (gsActive) {
            if (gsPosition === null) {
                return {};
            }
            let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');
            let gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE + realityEditor.sceneGraph.TAGS.ROTATE_X);
            if (!gpNode) {
                gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE);
            }
            let newCamMatrix = cameraNode.getMatrixRelativeTo(gpNode);
            let cInP = new THREE.Vector3(newCamMatrix[12], newCamMatrix[13], newCamMatrix[14]); // camera in ground plane coords
            let offset = new THREE.Vector3().subVectors(cInP, gsPosition)
            let n = offset.clone().normalize();
            let d = offset.length();
            let rd = n.clone().negate();
            return {
                point: gsPosition,
                normalVector: n,
                distance: d,
                rayDirection: rd,
            }
        }
        let worldIntersectPoint = null;
        let objectsToCheck = [];
        if (cachedOcclusionObject) {
            objectsToCheck.push(cachedOcclusionObject);
        }
        // if (realityEditor.gui.threejsScene.getGroundPlaneCollider()) {
        //     objectsToCheck.push(realityEditor.gui.threejsScene.getGroundPlaneCollider());
        // }
        if (includeGroundPlane && (realityEditor.gui.threejsScene.isGroundPlanePositionSet() || !realityEditor.gui.threejsScene.isWorldMeshLoadedAndProcessed())) {
            let groundPlane = realityEditor.gui.threejsScene.getGroundPlaneCollider();
            groundPlane.updateWorldMatrix(true, false);
            objectsToCheck.push(groundPlane);
        }
        if (cachedWorldObject && objectsToCheck.length > 0) {
            // by default, three.js raycast returns coordinates in the top-level scene coordinate system
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, objectsToCheck);
            if (raycastIntersects.length > 0) {
                // console.log(raycastIntersects[0].object.name);
                projectedZ = raycastIntersects[0].distance;
                let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
                let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
                inverseGroundPlaneMatrix.invert();
                raycastIntersects[0].point.applyMatrix4(inverseGroundPlaneMatrix);
                let trInvGroundPlaneMat = inverseGroundPlaneMatrix.clone().transpose();
                // check if the camera & normalVector face the same direction. If so, invert the normalVector to face towards the camera
                let normalVector = raycastIntersects[0].face.normal.clone().applyMatrix4(trInvGroundPlaneMat).normalize();
                let cameraDirection = new THREE.Vector3();
                realityEditor.gui.threejsScene.getInternals().camera.getWorldDirection(cameraDirection);
                if (cameraDirection.dot(normalVector) > 0) {
                    normalVector.negate();
                }
                worldIntersectPoint = {
                    point: raycastIntersects[0].point,
                    normalVector: normalVector,
                    distance: raycastIntersects[0].distance,
                    isOnGroundPlane: raycastIntersects[0].object.name === 'groundPlaneCollider',
                }
                return worldIntersectPoint; // these are relative to the world object
            }
        }
        worldIntersectPoint = {};
        return worldIntersectPoint;
    }

    function getCursorRelativeToWorldObject() {
        if ((!cachedWorldObject || !cachedOcclusionObject) && !realityEditor.gui.threejsScene.isGroundPlanePositionSet()) { return null; }

        let cursorMatrix = indicator1.matrixWorld.clone(); // in ROOT coordinates
        let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
        return realityEditor.sceneGraph.convertToNewCoordSystem(cursorMatrix, realityEditor.sceneGraph.getSceneNodeById('ROOT'), worldSceneNode);
    }

    function getOrientedCursorIfItWereAtScreenCenter() {
        // move cursor to center, then get the matrix, then move the cursor back to where it was
        worldIntersectPoint = getRaycastCoordinates(window.innerWidth / 2, window.innerHeight / 2);
        if (!realityEditor.device.environment.isDesktop() && worldIntersectPoint.distance > 10000) {
            worldIntersectPoint.distance = 1000;

            let camPos = new THREE.Vector3();
            realityEditor.gui.threejsScene.getInternals().camera.getWorldPosition(camPos);
            let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
            let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
            inverseGroundPlaneMatrix.invert();
            camPos.applyMatrix4(inverseGroundPlaneMatrix);

            let originalPoint = worldIntersectPoint.point;
            worldIntersectPoint.point = camPos.add(originalPoint.clone().sub(camPos).normalize().multiplyScalar(1000));
        }
        updateSpatialCursor();
        updateTestSpatialCursor();
        indicator1.updateMatrixWorld(); // update immediately before doing the calculations

        let result = getOrientedCursorRelativeToWorldObject();
        let didFindCenterPoint = !!worldIntersectPoint.point;

        // move it back
        let pointerPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
        worldIntersectPoint = getRaycastCoordinates(pointerPosition.x, pointerPosition.y);
        updateSpatialCursor();
        updateTestSpatialCursor();
        indicator1.updateMatrixWorld();

        return { matrix: result, didFindCenterPoint: didFindCenterPoint };
    }

    //function to orient cursor to specific screen coordinates
    function getOrientedCursorAtSpecificCoords(screenX, screenY) {
        // get specific coordinates of cursor
        worldIntersectPoint = getRaycastCoordinates(screenX, screenY);
        if (!realityEditor.device.environment.isDesktop() && worldIntersectPoint.distance > 10000) {
            worldIntersectPoint.distance = 1000;

            let camPos = new THREE.Vector3();
            realityEditor.gui.threejsScene.getInternals().camera.getWorldPosition(camPos);
            let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
            let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
            realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
            inverseGroundPlaneMatrix.invert();
            camPos.applyMatrix4(inverseGroundPlaneMatrix);

            let originalPoint = worldIntersectPoint.point;
            worldIntersectPoint.point = camPos.add(originalPoint.clone().sub(camPos).normalize().multiplyScalar(1000));
        }
        updateSpatialCursor();
        updateTestSpatialCursor();
        indicator1.updateMatrixWorld(); // update immediately before doing the calculations

        let result = getOrientedCursorRelativeToWorldObject();
        let didFindMouseCoords = !!worldIntersectPoint.point;

        // move it back
        let pointerPosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
        worldIntersectPoint = getRaycastCoordinates(pointerPosition.x, pointerPosition.y);
        updateSpatialCursor();
        updateTestSpatialCursor();
        indicator1.updateMatrixWorld();

        return { matrix: result, didFindMouseCoords: didFindMouseCoords };
    }

    // we need to apply multiple transformations to rotate the spatial cursor so that its local up vector is
    // best aligned with the global up, it faces towards the camera rather than away, and if it's on a
    // horizontal surface, it rotates so that its local up vector is in line with the camera forward vector
    function getOrientedCursorRelativeToWorldObject() {
        if (!indicator1.visible) { return null; }

        let spatialCursorMatrix = getCursorRelativeToWorldObject();
        if (spatialCursorMatrix) {
            const utils = realityEditor.gui.ar.utilities;
            let rotatedMatrix = utils.copyMatrix(spatialCursorMatrix.elements);
            let forwardVector = utils.getForwardVector(rotatedMatrix);
            // TODO: may need to convert this relative to world object, but for now global up and world up are aligned anyways
            let globalUpVector = [0, -1, 0];

            // crossing forward vector with desired up vector yields new right vector
            // then cross new right with forward to get orthogonal local up vector (similar to camera lookAt math)

            let newRightVector = utils.normalize(utils.crossProduct(forwardVector, globalUpVector));
            // handle co-linear case by reverting to original axis
            if (isNaN(newRightVector[0])) { newRightVector = utils.getRightVector(rotatedMatrix); }

            let newUpVector = utils.normalize(utils.crossProduct(newRightVector, forwardVector));
            if (isNaN(newUpVector[0])) { newUpVector = utils.getUpVector(rotatedMatrix); }

            let worldSceneNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId());
            let cameraRelativeToWorldObject = realityEditor.sceneGraph.convertToNewCoordSystem(utils.newIdentityMatrix(), realityEditor.sceneGraph.getCameraNode(), worldSceneNode);

            // compute dot product of camera forward and new tool forward to see whether it's facing towards or away from you
            let cameraForward = utils.normalize(utils.getForwardVector(cameraRelativeToWorldObject));

            // check if it is upright enough to be considered on a horizontal surface – 0.9 seems to work well
            if (Math.abs(utils.dotProduct(forwardVector, globalUpVector)) > 0.9) {
                // math works out same as above, except the camera forward is the desired "up vector" in this case
                newRightVector = utils.normalize(utils.crossProduct(forwardVector, cameraForward));
                if (isNaN(newRightVector[0])) { newRightVector = utils.getRightVector(rotatedMatrix); }

                newUpVector = utils.normalize(utils.crossProduct(newRightVector, forwardVector));
                if (isNaN(newUpVector[0])) { newUpVector = utils.getUpVector(rotatedMatrix); }
            }

            // if normals are inverted and tool ends up facing away from camera instead of towards it, flip it left-right again
            let dotProduct = utils.dotProduct(cameraForward, forwardVector);

            // assign the new right and up vectors to the tool matrix, keeping its forward the same
            rotatedMatrix[0] = newRightVector[0] * Math.sign(dotProduct);
            rotatedMatrix[1] = newRightVector[1] * Math.sign(dotProduct);
            rotatedMatrix[2] = newRightVector[2] * Math.sign(dotProduct);
            rotatedMatrix[4] = newUpVector[0];
            rotatedMatrix[5] = newUpVector[1];
            rotatedMatrix[6] = newUpVector[2];

            return rotatedMatrix;
        }

        return null;
    }

    exports.initService = initService;
    exports.getRaycastCoordinates = getRaycastCoordinates;
    exports.isGSActive = isGSActive;
    exports.gsToggleActive = gsToggleActive;
    exports.gsSetPosition = gsSetPosition;
    exports.getCursorRelativeToWorldObject = getCursorRelativeToWorldObject;
    exports.getOrientedCursorRelativeToWorldObject = getOrientedCursorRelativeToWorldObject;
    exports.getOrientedCursorIfItWereAtScreenCenter = getOrientedCursorIfItWereAtScreenCenter;
    exports.getOrientedCursorAtSpecificCoords = getOrientedCursorAtSpecificCoords;
    exports.toggleDisplaySpatialCursor = toggleDisplaySpatialCursor;
    exports.isSpatialCursorEnabled = () => { return isCursorEnabled; }
    exports.isSpatialCursorOnGroundPlane = () => { return isOnGroundPlane; }
    exports.getWorldIntersectPoint = () => { return worldIntersectPoint; };
    exports.addToolAtScreenCenter = addToolAtScreenCenter;
    exports.addToolAtSpecifiedCoords = addToolAtSpecifiedCoords;
    exports.renderOtherSpatialCursor = renderOtherSpatialCursor;
    exports.deleteOtherSpatialCursor = deleteOtherSpatialCursor;
    exports.setCursorPosition = setCursorPosition;
    exports.setCursorStyle = setCursorStyle;
    exports.isCursorOnValidPosition = isCursorOnValidPosition;
}(realityEditor.spatialCursor));
