createNameSpace("realityEditor.gui.spatialArrow");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function (exports) {
    
    let canvasContainer;
    let canvas;
    let ctx;
    let screenW, screenH;
    let screenRatio;

    function initService() {
        addCanvas();
        resizeCanvas();
        initCanvas();
        update();
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        initCanvas();
        update();
    });
    
    let menuBarHeight;

    function addCanvas() {
        canvasContainer = document.createElement('div');
        canvasContainer.className = 'arrow-canvas-container';
        canvasContainer.style.position = 'absolute';
        canvasContainer.style.top = '0';
        canvasContainer.style.left = '0';
        canvasContainer.style.pointerEvents = 'none';
        document.body.appendChild(canvasContainer);

        canvas = document.createElement('canvas');
        canvas.className = 'arrow-canvas';
        canvas.style.position = 'absolute';
        menuBarHeight = realityEditor.device.environment.variables.screenTopOffset;
        canvas.style.top = `${menuBarHeight}px`;
        canvas.style.left = '0';
        canvas.style.zIndex = '3001';
        canvasContainer.appendChild(canvas);

        ctx = canvas.getContext("2d");
    }

    function resizeCanvas() {
        if (canvas !== undefined) {
            screenW = window.innerWidth;
            screenH = window.innerHeight - menuBarHeight;
            screenRatio = screenH / screenW;
            canvas.width = screenW;
            canvas.height = screenH;
        }
    }

    const clamp = (x, low, high) => {
        return Math.min(Math.max(x, low), high);
    }

    const remap01 = (x, low, high) => {
        return clamp((x - low) / (high - low), 0, 1);
    }

    const remap = (x, lowIn, highIn, lowOut, highOut) => {
        return lowOut + (highOut - lowOut) * remap01(x, lowIn, highIn);
    }

    let translateX = 0, translateY = 0;

    function translate(x, y) {
        translateX += x;
        translateY += y;
        ctx.translate(x, y);
    }

    function rotate(a) {
        ctx.rotate(a);
    }

    function scale(x, y) {
        ctx.scale(x, y);
    }

    function clear() {
        ctx.clearRect(-translateX, -translateY, screenW, screenH);
    }

    // draw an arrow at (x, y) center
    function drawArrow(x, y, rotation, scaleFactor, innerColor='rgb(0, 255, 255)', outerColor='rgb(255, 255, 255)') {
        translate(x, y);
        scale(scaleFactor, scaleFactor);
        rotate(rotation);
        
        // draw path
        let region = new Path2D();
        region.moveTo(0, -3);
        region.lineTo(-2, 2);
        region.lineTo(2, 2);
        region.closePath();
        // fill path
        ctx.fillStyle = innerColor;
        ctx.fill(region, 'evenodd');
        // stroke path
        ctx.strokeStyle = outerColor;
        ctx.lineWidth = .4;
        ctx.stroke(region);
        
        rotate(-rotation);
        scale(1 / scaleFactor, 1 / scaleFactor);
        translate(-x, -y);
    }

    function initCanvas() {
        // make (0, 0) the center of canvas
        translate(screenW / 2, screenH / 2);
        clear();
    }
    
    let indicators = [];
    function searchForIndicators() {
        // todo: auto detect the indicator names, instead of hard-coded 'cylinderIndicator'
        indicators = realityEditor.gui.threejsScene.getObjectsByName('cylinderIndicator');
    }
    
    let finalPosX = 0, finalPosY = 0;
    
    function determineObjectScreenPosition() {
        
        let worldPos = new THREE.Vector3();
        let screenX, screenY;
        let screenBorderFactor = 0.97;
        let desX = 0, desY = 0;
        let angle = 0;
        let k;
        
        indicators.forEach((indicator) => {
            indicator.getWorldPosition(worldPos);
            
            // if the object is off screen, then reverse its original screen position, then add the indicator
            if (!realityEditor.gui.threejsScene.isPointOnScreen(worldPos)) {
                let screenXY = realityEditor.gui.threejsScene.getScreenXY(worldPos);
                
                screenX = screenXY.x;
                screenY = screenXY.y;

                desX = remap(screenX, 0, screenW, -screenW/2, screenW/2);
                desY = remap(screenY, 0, screenH, -screenH/2, screenH/2);
                
                angle = Math.atan2(desY, desX);
                angle += Math.PI / 2;

                k = (screenY - screenH / 2) / (screenX - screenW / 2);

                if (k < 0) {
                    if (Math.abs(k) < screenRatio) {
                        if (screenX < screenW / 2) {
                            // left side bottom half
                            finalPosX = - screenW / 2;
                            finalPosY = finalPosX * k;
                        } else {
                            // right side top half
                            finalPosX = screenW / 2;
                            finalPosY = finalPosX * k;
                        }
                    } else {
                        if (screenX < screenW / 2) {
                            // bottom side left half
                            finalPosY = screenH / 2;
                            finalPosX = finalPosY / k;
                        } else {
                            // top side right half
                            finalPosY = - screenH / 2;
                            finalPosX = finalPosY / k;
                        }
                    }
                } else {
                    if (Math.abs(k) < screenRatio) {
                        if (screenX < screenW / 2) {
                            // left side top half
                            finalPosX = - screenW / 2;
                            finalPosY = finalPosX * k;
                        } else {
                            // right side bottom half
                            finalPosX = screenW / 2;
                            finalPosY = finalPosX * k;
                        }
                    } else {
                        if (screenX < screenW / 2) {
                            // top side left half
                            finalPosY = - screenH / 2;
                            finalPosX = finalPosY / k;
                        } else {
                            // bottom side right half
                            finalPosY = screenH / 2;
                            finalPosX = finalPosY / k;
                        }
                    }
                }

                finalPosX *= screenBorderFactor;
                finalPosY *= screenBorderFactor;

                drawArrow(finalPosX, finalPosY, angle, 5, indicator.avatarColor, indicator.avatarColorLighter);
            }
        })
    }
    
    function drawIndicatorArrows() {
        searchForIndicators();
        determineObjectScreenPosition();
        // draw a single test arrow at the screen center
        
    }

    function update() {
        clear();
        drawIndicatorArrows();
        window.requestAnimationFrame(update);
    }

    exports.initService = initService;
})(realityEditor.gui.spatialArrow);
