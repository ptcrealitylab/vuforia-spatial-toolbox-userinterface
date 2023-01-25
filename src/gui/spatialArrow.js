createNameSpace("realityEditor.gui.spatialArrow");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function (exports) {
    
    let canvasContainer;
    let canvas;
    let ctx;
    let screenW, screenH;
    let screenRatio;
    
    let color, colorLighter;

    function initService() {
        console.log('%c spatial arrow init!', 'color: green');
        addCanvas();
        resizeCanvas();
        initCanvas();
        update();
    }

    // for testing purpose on js fiddle, don't include it in final code
    const windowRatio = 1;

    window.addEventListener('resize', () => {
        resizeCanvas();
        initCanvas();
        update();
    });

    // todo: dynamically set style.top based on menu bar's height -- making the arrow canvas right below the menu bar
    const menuBarHeight = 30;

    function addCanvas() {
        canvasContainer = document.createElement('div');
        canvasContainer.className = 'arrow-canvas-container';
        canvasContainer.style.position = 'absolute';
        canvasContainer.style.top = '0';
        canvasContainer.style.left = '0';
        document.body.appendChild(canvasContainer);

        canvas = document.createElement('canvas');
        canvas.className = 'arrow-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = `${menuBarHeight}px`;
        canvas.style.left = '0';
        canvas.style.zIndex = '3001';
        canvas.style.border = '2px solid black';
        canvasContainer.appendChild(canvas);

        ctx = canvas.getContext("2d");
    }

    function resizeCanvas() {
        if (canvas !== undefined) {
            screenW = window.innerWidth * windowRatio;
            screenH = (window.innerHeight - menuBarHeight) * windowRatio;
            screenRatio = screenH / screenW;
            canvas.width = screenW;
            canvas.height = screenH;
        }
    }

    function Rot(a) {
        let s = sin(a), c = cos(a);
        return [[c, -s], [s, c]];
    }

    const Clamp = (x, low, high) => {
        return Math.min(Math.max(x, low), high);
    }

    const Remap01 = (x, low, high) => {
        return Clamp((x - low) / (high - low), 0, 1);
    }

    const Remap = (x, low1, high1, low2, high2) => {
        return low2 + (high2 - low2) * Remap01(x, low1, high1);
    }

    let translateX = 0, translateY = 0;

    function Translate(x, y) {
        translateX += x;
        translateY += y;
        ctx.translate(x, y);
    }

    let rotation = 0;

    function Rotate(a) {
        rotation += a;
        ctx.rotate(a);
    }

    let scaleX = 1, scaleY = 1;

    function Scale(x, y) {
        scaleX *= x;
        scaleY *= y;
        ctx.scale(x, y);
    }

    function clear() {
        ctx.clearRect(-translateX, -translateY, screenW, screenH);
    }

    // draw a rect at (x, y) center
    function Rect(x, y, width, height, rotation = 0) {
        Translate(x, y);
        Rotate(rotation);
        ctx.fillRect(-width / 2,-height / 2, width, height);
        Rotate(-rotation);
        Translate(-x, -y);
    }

    // draw an arrow at (x, y) center
    function Arrow(x, y, rotation, scale, innerColor='rgb(0, 255, 255)', outerColor='rgb(255, 255, 255)') {
        Translate(x, y);
        Scale(scale, scale);
        Rotate(rotation);
        
        // draw path
        let region = new Path2D();
        region.moveTo(0, -3);
        region.lineTo(-2, 2);
        // region.lineTo(0, 1);
        region.lineTo(2, 2);
        region.closePath();
        // fill path
        ctx.fillStyle = innerColor;
        // ctx.fillStyle = innerColor;
        ctx.fill(region, 'evenodd');
        // stroke path
        ctx.strokeStyle = outerColor;
        // ctx.strokeStyle = outerColor;
        ctx.lineWidth = .4;
        ctx.stroke(region);
        
        Rotate(-rotation);
        Scale(1 / scale, 1 / scale);
        Translate(-x, -y);
    }

    function initCanvas() {
        // make (0, 0) the center of canvas
        Translate(screenW / 2, screenH / 2);
        clear();
    }
    
    let indicators = [];
    function searchForIndicators() {
        // todo: auto detect the indicator names, instead of hard-coded 'cylinderIndicator'
        indicators = realityEditor.gui.threejsScene.getObjectsByName('cylinderIndicator');
    }
    
    let worldPos = new THREE.Vector3();
    let screenX, screenY;
    let screenBorderFactor = 0.97;
    let desX = 0, desY = 0;
    let angle = 0;
    let k;
    
    let finalPosX = 0, finalPosY = 0;
    
    // prevent sudden shifting / jumping behavior of arrow indicator, when screenX & screenY suddenly both changes +/- symbol
    let lastScreenX, lastScreenY;
    let flag = false;
    
    function determineObjectScreenPosition() {
        indicators.forEach((indicator) => {
            indicator.getWorldPosition(worldPos);
            
            // todo: if the object is off screen, then reverse its original screen position, then add the indicator
            if (!realityEditor.gui.threejsScene.isObjectOnScreen(worldPos)) {
                let screenXY = realityEditor.gui.threejsScene.getScreenXY(worldPos);
                
                screenX = screenXY.x;
                screenY = screenXY.y;
                
                if (lastScreenX !== undefined && lastScreenY !== undefined) {
                    if ((lastScreenX > 0 && lastScreenY < 0 && screenX < 0 && screenY > 0) || (lastScreenX < 0 && lastScreenY > 0 && screenX > 0 && screenY < 0)) {
                        // console.warn('reached singularity point!!!');
                        flag = true;
                    } else {
                        flag = false;
                    }
                }

                // console.log(screenX, screenY, lastScreenX, lastScreenY);
                
                if (flag === true) {
                    // todo: figure out why this method won't work
                    // todo: replicate the problem: uncomment below code -> run remote operator -> make cylinder indicators go out of left bound -> make cylinder indicators go out of upper bound -> the arrows are on the left bound instead of upper bound
                    // todo: replicate the problem: it seems that from left -> upper / upper -> left transitions always have issues.
                    // todo: other transitions don't have any issue.
                    // todo: take a look at my screen inequality sketch, figure out why transition between top & left side cause problem
                    // screenX *= -1;
                    // screenY *= -1;
                }

                // todo: from unity tutorial. Figure out why this won't work
                // // 相当于 "float angle = Mathf.Atan2(screenPos.y, screenPos.x) 里的 screenPos.y, screenPos.x
                // desX = Remap(screenX, 0, screenW, -screenW/2, screenW/2);
                // desY = Remap(screenY, 0, screenH, -screenH/2, screenH/2);
                //
                // angle = Math.atan2(desY, desX);
                // angle -= Math.PI / 2;
                //
                // let cos = Math.cos(angle);
                // let sin = -Math.sin(angle);
                // let m = cos / sin;
                //
                // // 相当于两个 screen bounds
                // desX *= screenBorderFactor;
                // desY *= screenBorderFactor;
                //
                // // check up and down first
                // if (cos > 0) {
                //     // up
                //     finalPosX = desY / m;
                //     finalPosY = desY;
                // } else {
                //     // down
                //     finalPosX = -desY / m;
                //     finalPosY = -desY;
                // }
                // // out of bounds
                // if (screenX > desX) {
                //     finalPosX = desX;
                //     finalPosY = desX * m;
                // } else if (screenX < desX) {
                //     finalPosX = -desX;
                //     finalPosY = -desX * m;
                // }
                // Arrow(finalPosX, finalPosY, angle, 5);

                desX = Remap(screenX, 0, screenW, -screenW/2, screenW/2);
                desY = Remap(screenY, 0, screenH, -screenH/2, screenH/2);

                // angle = Math.atan2(desX, desY);
                angle = Math.atan2(desY, desX);
                angle += Math.PI / 2;

                k = (screenY - screenH / 2) / (screenX - screenW / 2);

                // console.log(screenX, screenY);

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

                Arrow(finalPosX, finalPosY, angle, 5, indicator.avatarColor, indicator.avatarColorLighter);
            } else {
                // todo: if object on screen, then don't add the indicator
                return;
            }
            
            lastScreenX = screenX;
            lastScreenY = screenY;
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
