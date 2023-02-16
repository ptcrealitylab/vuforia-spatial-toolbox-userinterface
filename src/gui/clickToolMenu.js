createNameSpace('realityEditor.gui.clickToolMenu');

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { CSS3DObject, CSS3DSprite, CSS3DRenderer } from '../../thirdPartyCode/three/CSS3DRenderer.module.js';

(function(exports) {
    let cssRenderer;
    let scene, camera;
    let cssObjects = [];
    let focusPoint = null;
    
    function initService() {
        initRenderer();
        getThreejsSceneInfo();
        setupKeyboardEvents();
        animate();
    }
    
    function initRenderer() {
        cssRenderer = new CSS3DRenderer();
        cssRenderer.setSize(window.innerWidth, window.innerHeight);
        let cssRendererDom = cssRenderer.domElement;
        cssRendererDom.style.position = 'absolute';
        cssRendererDom.style.top = '0px';
        cssRendererDom.style.left = '0px';
        document.body.appendChild(cssRendererDom);
    }

    function getThreejsSceneInfo() {
        let info = realityEditor.gui.threejsScene.getInternals();
        scene = info.scene;
        camera = info.camera;
    }
    
    function setupKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            // todo: press g key to delete all the tool menus
            if (e.key === 'g' || e.key === 'G') {
                cssObjects.forEach((item) => {
                    realityEditor.gui.threejsScene.removeFromScene(item);
                })
                cssObjects.length = 0;
                return;
            }
            // todo: press r key to focus on the focus point
            if (e.key === 'r' || e.key === 'R') {
                focusOnPoint();
            }
        });
        
        window.addEventListener('click', (e) => {
            // if left click, then add a tool menu
            if (e.button === 0) {
                addToolMenuAtMousePosition();
                // if right click, then add a focus point
            } else if (e.button === 2) {
                addFocusPoint();
            }
        });

        window.addEventListener('resize', onWindowResize);
    }

    // todo: add the tool menu at mouse position
    function addToolMenuAtMousePosition() {
        let worldIntersectPoint = realityEditor.spatialCursor.getWorldIntersectPoint().point;
        let toolMenu = createToolMenu(worldIntersectPoint.x, worldIntersectPoint.y, worldIntersectPoint.z);
        // console.log(toolMenu);
        realityEditor.gui.threejsScene.addToScene(toolMenu);
        render();
    }
    
    function createToolMenu(x, y, z) {
        const css3DDiv = document.createElement('div');
        css3DDiv.className = 'css-3d-div';
        
        // const css3DText = document.createElement('div');
        // css3DText.className = 'css-3d-text';
        // css3DText.textContent = 'Text';
        // css3DDiv.appendChild(css3DText);
        
        // todo: create a button container, that centers at the div
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        css3DDiv.appendChild(buttonContainer);
        
        // todo: create 4 buttons with animations
        const topButton = document.createElement('div');
        topButton.className = 'top-button';
        // topButton.textContent = 'top';
        buttonContainer.appendChild(topButton);
        
        const rightButton = document.createElement('div');
        rightButton.className = 'right-button';
        // rightButton.textContent = 'right';
        buttonContainer.appendChild(rightButton);
        
        const bottomButton = document.createElement('div');
        bottomButton.className = 'bottom-button';
        // bottomButton.textContent = 'bottom';
        buttonContainer.appendChild(bottomButton);
        
        const leftButton = document.createElement('div');
        leftButton.className = 'left-button';
        // leftButton.textContent = 'left';
        buttonContainer.appendChild(leftButton);

        // todo: create an exit button
        const exitButton = document.createElement('div');
        exitButton.className = 'exit-button';
        exitButton.onclick = () => {
            topButton.style.animation = 'move-top 0.5s ease-out 0.1s reverse backwards';
            rightButton.style.animation = 'move-right 0.5s ease-out 0.1s reverse backwards';
            bottomButton.style.animation = 'move-bottom 0.5s ease-out 0.1s reverse backwards';
            leftButton.style.animation = 'move-left 0.5s ease-out 0.1s reverse backwards';
            exitButton.style.animation = 'exit-button-fade-in 0.5s ease-out 0.1s reverse backwards';
        }
        buttonContainer.appendChild(exitButton);
        
        const cssObject = new CSS3DObject(css3DDiv);
        cssObject.position.set(x, y, z);
        cssObject.lookAt(realityEditor.gui.threejsScene.getCameraWorldPosition());
        cssObjects.push(cssObject);
        return cssObject;
    }
    
    function animate() {
        requestAnimationFrame(animate);
        // todo: on every frame, cssObjects look at the current camera
        cssObjects.forEach((item) => {
            item.lookAt(realityEditor.gui.threejsScene.getCameraWorldPosition());
        })
        render();
    }
    
    
    function render() {
        cssRenderer.render(scene, camera);
    }
    
    function addFocusPoint() {
        let worldIntersectPoint = realityEditor.spatialCursor.getWorldIntersectPoint().point;
        if (focusPoint === null) {
            focusPoint = new THREE.Mesh(
                new THREE.BoxGeometry(20, 20, 20),
                new THREE.MeshBasicMaterial({color: 0x00ff00})
            );
            focusPoint.position.copy(worldIntersectPoint);
            realityEditor.gui.threejsScene.addToScene(focusPoint);
        } else {
            focusPoint.position.copy(worldIntersectPoint);
        }
    }

    let virtualCamera;
    const zoomFactor = 3000;
    function focusOnPoint() {
        if (!focusPoint.position) return;
        if (virtualCamera === null) {
            virtualCamera = realityEditor.device.desktopCamera.getVirtualCamera().virtualCamera;
        }
        // todo: it appears that I cannot get the virtual camera from remote operator addon
        // todo: ask Ben how to fix this
        if (virtualCamera === null || virtualCamera === undefined) {
            console.warn('virtual camera cannot get');
            return;
        }
        console.log(virtualCamera);
        // todo: get the camera world position --> normalize (camera position - focus point position) -->
        // todo: add this value to the focus point position --> get the position camera should move to
        let currentCamPos = realityEditor.gui.threejsScene.getCameraWorldPosition();
        let destCamPos = focusPoint.position.clone().add(currentCamPos.sub(focusPoint.position).normalize().multiplyScalar(zoomFactor));
        virtualCamera.focus(destCamPos.x, destCamPos.y, destCamPos.z, focusPoint.position.x, focusPoint.position.y, focusPoint.position.z);
    }
    
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth, window.innerHeight );

        render();
    }
    
    exports.initService = initService;
}(realityEditor.gui.clickToolMenu));
