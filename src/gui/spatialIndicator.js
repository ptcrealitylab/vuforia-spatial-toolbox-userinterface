createNameSpace("realityEditor.gui.spatialIndicator");

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { mergeBufferGeometries } from '../../thirdPartyCode/three/BufferGeometryUtils.module.js';

(function (exports) {
    let camera;

    const DISABLE_SPATIAL_INDICATORS = true;
    
    const vertexShader = `
    varying vec2 vUv;
    
    void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
    }
    `;
    
    const cylinderFragmentShader = `
        #define S(a, b, x) smoothstep(a, b, x)
        #define PI 3.14159
        // #define blur 0.002
        #define blur 0.1
        #define brightness 0.001
        
        #define black vec3(0.)
        #define white vec3(1.)
        #define red vec3(1., 0., 0.)
        #define green vec3(0., 1., 0.)
        #define blue vec3(0., 0., 1.)
        #define cyan vec3(0., 1., 1.)
        
        struct Lines {
            float width;
            float height;
            float x;
            float y;
            float speed;
        };
        
        uniform int amount;
        // cannot initialize the lines[] array with variable size
        // so update the amount in the js file and shader always the same
        uniform Lines lines[5];
        
        // set up color uniforms
        struct AvatarColor {
            vec3 color;
            vec3 colorLighter;
        };
        uniform AvatarColor avatarColor[1];
        
        varying vec2 vUv;
        
        // draw a vertical line segment at p with width w and height h
        float line(vec2 uv, vec2 p, float w, float h) {
            uv -= p;
            // un-comment below line to find out what I did wrong
            // float horizontal = S(.01, 0., abs(length(uv.x - w / 2.)));
            float horizontal = S(blur, 0., abs(uv.x)- w / 2.);
            float vertical = S(blur, 0., abs(uv.y) - h / 2.);
            return horizontal * vertical;
        }
        
        float GlowingLine(vec2 uv, vec2 p, float w, float h) {
            uv -= p;
            float horizontal = S(blur, 0., abs(uv.x)- w / 2.);
            float vertical = S(blur, 0., abs(uv.y) - h / 2.);
            float d = horizontal * vertical;
            float fx = brightness / abs(d - 1.);
            fx = pow(fx, .5);
            return fx;
        }
        
        void main(void) {
            vec2 uv = vUv;
        
            vec3 col = vec3(0.);
            float alpha = 0.;
            
            // draw the ascending lines
            for (int i = 0; i < amount; i++) {
                float x = lines[i].x, y = lines[i].y, width = lines[i].width, height = lines[i].height;
                float d = GlowingLine(uv, vec2(x, y), width, height);
                col += avatarColor[0].color * d;
                alpha += d;
            }
        
            col *= .1;
            alpha *= .1;
            if (alpha < .35) alpha = 0.;
        
            // draw the fluctuating upper alpha fade out boundary
            // float boundary = S(0.0, 0.8, 1. - uv.y);
            // float boundary = S(0.8, 0.0, 1. - uv.y);
            // col = mix(col, red, boundary);
        
            // float boundary = S(0.2, 0.0, 1. - uv.y);
            // alpha = mix(alpha, 0., boundary);
        
            gl_FragColor = vec4(col, alpha);
        }
    `;

    // the amount variable always needs to be identical to the lines[] array in fragment shader
    const amount = 5;
    let lines = [];

    let color = 'rgb(0, 255, 255)', colorLighter = 'rgb(255, 255, 255)';
    let finalColor = [{
        color: new THREE.Color(color),
        colorLighter: new THREE.Color(colorLighter)
    }];
    let uniforms = {
        'avatarColor': {value: finalColor},
        'amount': {value: amount},
        'lines': {value: lines},
    };

    const cylinderMaterial = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: cylinderFragmentShader,
        uniforms: uniforms,
        transparent: true,
        side: THREE.DoubleSide,
    });

    const clamp = (x, low, high) => {
        return Math.min(Math.max(x, low), high);
    }

    const remap01 = (x, low, high) => {
        return clamp((x - low) / (high - low), 0, 1);
    }

    const remap = (x, lowIn, highIn, lowOut, highOut) => {
        return lowOut + (highOut - lowOut) * remap01(x, lowIn, highIn);
    }

    if (!DISABLE_SPATIAL_INDICATORS) {
        window.addEventListener('pointerdown', (e) => {
            if (realityEditor.device.isMouseEventCameraControl(e)) return;
            if (!realityEditor.device.utilities.isEventHittingBackground(e)) return;
            handleMouseClick(e);
        });
    }

    let worldIntersectPoint = {};
    function getRaycastCoordinates(screenX, screenY) {
        // todo: get objectsToCheck outside of this function & stop resetting & pushing every time this function runs,
        // todo: in order to make the calculation more efficient
        let objectsToCheck = [];
        if (cachedOcclusionObject) {
            objectsToCheck.push(cachedOcclusionObject);
        }
        objectsToCheck = objectsToCheck.concat(indicatorList);
        // if (realityEditor.gui.threejsScene.getGroundPlaneCollider()) {
        //     objectsToCheck.push(realityEditor.gui.threejsScene.getGroundPlaneCollider());
        // }
        if (cachedWorldObject && objectsToCheck.length > 0) {
            // by default, three.js raycast returns coordinates in the top-level scene coordinate system
            let raycastIntersects = realityEditor.gui.threejsScene.getRaycastIntersects(screenX, screenY, objectsToCheck);
            if (raycastIntersects.length > 0) {
                // if hit a cylinder indicator, then make the cylinders expand and last longer
                if (raycastIntersects[0].object.parent.name === 'cylinderIndicator') {
                    raycastIntersects[0].object.parent.iclick++;
                    return;
                }
                let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
                let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
                realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
                inverseGroundPlaneMatrix.invert();
                raycastIntersects[0].point.applyMatrix4(inverseGroundPlaneMatrix);
                let trInvGroundPlaneMat = inverseGroundPlaneMatrix.clone().transpose();
                worldIntersectPoint = {
                    point: raycastIntersects[0].point,
                    normalVector: raycastIntersects[0].face.normal.clone().applyMatrix4(trInvGroundPlaneMat).normalize(),
                }
            }
        }
        return worldIntersectPoint; // these are relative to the world object
    }
    
    async function getMyAvatarColor() {
        let myAvatarColor = await realityEditor.avatar.getMyAvatarColor();
        color = `${myAvatarColor.color}`;
        colorLighter = `${myAvatarColor.colorLighter}`;
        finalColor[0] = {
            color: new THREE.Color(color),
            colorLighter: new THREE.Color(colorLighter)
        };
    }
    
    let spatialIndicatorActivated = false;
    function handleMouseClick(e) {
        // if (!avatarActive) return;
        spatialIndicatorActivated = true;
        worldIntersectPoint = getRaycastCoordinates(e.clientX, e.clientY);
        if (worldIntersectPoint !== undefined) addSpatialIndicator();
    }

    const indicatorAxis = new THREE.Vector3(0, 1, 0);
    const indicatorHeight = 400;
    const indicatorName = 'cylinderIndicator';
    const iDuration = 5;
    const iAnimDuration = 1;
    const iScaleFactor = 1.1;
    let indicatorList = [];
    
    let innerWidth = 20;
    let innerBottomHeight = 70;
    let innerTopHeight = 250;
    let innerHeightOffset = 50;
    
    function addSpatialIndicator() {
        console.info('should add a cylinder to the scene');
        // add an indicator group
        const indicatorGroup = new THREE.Group();
        indicatorGroup.position.set(worldIntersectPoint.point.x, worldIntersectPoint.point.y, worldIntersectPoint.point.z);
        // make worldIntersectPoint normalVector always point towards the same side of the camera
        let normalVector = worldIntersectPoint.normalVector.clone();
        let camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);
        let dotProduct = normalVector.dot(camPos.sub(worldIntersectPoint.point));
        if (dotProduct < 0) {
            normalVector.negate();
        }
        indicatorGroup.quaternion.setFromUnitVectors(indicatorAxis, normalVector);
        realityEditor.gui.threejsScene.addToScene(indicatorGroup);
        // store name & avatar colors in the indicator groups, so that spatialArrows can grab them as properties and render to correct colors
        indicatorGroup.name = indicatorName;
        indicatorGroup.avatarColor = color;
        indicatorGroup.avatarColorLighter = colorLighter;
        const material1 = new THREE.MeshStandardMaterial( {
            color: finalColor[0].color,
            transparent: true,
            opacity: 1,
            flatShading: true,
        });
        
        // add inner cones
        const bottomConeGeometry = new THREE.ConeGeometry(innerWidth, innerBottomHeight, 4, 1, true);
        bottomConeGeometry.translate(0, innerBottomHeight / 2, 0);
        bottomConeGeometry.rotateX(Math.PI);
        const topConeGeometry = new THREE.ConeGeometry(innerWidth, innerTopHeight, 4, 1, true);
        topConeGeometry.translate(0, innerTopHeight / 2, 0);
        const innerConeGeometry = mergeBufferGeometries([bottomConeGeometry, topConeGeometry]);
        const innerCone = new THREE.Mesh(innerConeGeometry, material1);
        innerCone.position.y = innerBottomHeight + innerHeightOffset;
        indicatorGroup.add(innerCone);
        
        // add outer cylinder
        const geometry2 = new THREE.CylinderGeometry( 50, 50, indicatorHeight, 32, 1, true );
        const cylinder2 = new THREE.Mesh(geometry2, cylinderMaterial);
        cylinder2.position.set(0, indicatorHeight / 2, 0);
        indicatorGroup.add(cylinder2);
        // add a clock and duration value to the indicatorGroup, to keep track of the time to scale the cylinder indicators
        let clock = new THREE.Clock();
        indicatorGroup.iclock = clock;
        indicatorGroup.iclick = 0;
        indicatorList.push(indicatorGroup);
    }

    let occlusionDownloadInterval = null;
    let cachedOcclusionObject = null;
    let cachedWorldObject = null;

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
        });
        
        // initialize 20 line data
        for (let i = 0; i < amount; i++) {
            let width = remap(Math.random(), 0, 1, .002, .006);
            let height = remap(Math.random(), 0, 1, .2, .4);
            let x = remap(Math.random(), 0, 1, width / 2, 1 - width / 2);
            let y = 0;
            let speed = remap(Math.random(), 0, 1, 2, 6);

            lines.push({
                width: width,
                height: height,
                x: x,
                y: y,
                speed: speed
            });
        }
        
        finalColor[0] = {
            color: new THREE.Color(color),
            colorLighter: new THREE.Color(colorLighter)
        };
        
        camera = realityEditor.gui.threejsScene.getInternals().camera;
        
        update();

        await getMyAvatarColor();
        uniforms['avatarColor'].value = finalColor;
    }
    
    function updateUniforms() {
        if (!spatialIndicatorActivated) return;
        
        // change the Lines data here
        lines.forEach(line => {
            if (line.y >= 1) {
                line.width = remap(Math.random(), 0, 1, .004, .012);
                line.height = remap(Math.random(), 0, 1, .2, .4);
                line.x = remap(Math.random(), 0, 1, line.width / 2, 1 - line.width / 2);
                line.y = 0;
                line.speed = remap(Math.random(), 0, 1, 2, 6);
            } else {
                line.y += .01 * line.speed;
            }
        })
        
        uniforms['lines'].value = lines;
    }
    
    function changeIndicatorTransforms() {
        for (let i = 0; i < indicatorList.length; i++) {
            let item = indicatorList[i];
            let iClock = item.iclock;
            let iClick = item.iclick;
            let iTime = iClock.getElapsedTime();
            // translate up/down and rotate the inner cones
            let innerCone = item.children[0];
            innerCone.position.y = remap(Math.sin(iTime * 4), -1, 1, innerBottomHeight + innerHeightOffset + 60, innerBottomHeight + innerHeightOffset - 60);
            innerCone.rotation.y = iTime;
            // change the entire indicator group scale
            let y1 = Math.pow(iScaleFactor, iClick) * (-1 / iAnimDuration * (iTime - 0.3 * iClick) + (iDuration + iAnimDuration) / iAnimDuration);
            let y2 = Math.min(Math.pow(iScaleFactor, iClick), Math.max(0, y1));
            if (y2 <= 0) {
                // if indicator scale <= 0, remove it from the scene & indicatorList
                realityEditor.gui.threejsScene.removeFromScene(item);
                indicatorList.splice(i, 1);
                i--;
            } else {
                // if indicator scale > 0, then make indicator scale the same as y2
                item.scale.set(y2, y2, y2);
            }
        }
    }
    
    function update() {
        updateUniforms();
        changeIndicatorTransforms();
        window.requestAnimationFrame(update);
    }
    
    function getIndicatorName() {
        return indicatorName;
    }
    
    exports.initService = initService;
    exports.getIndicatorName = getIndicatorName;
    
})(realityEditor.gui.spatialIndicator);
