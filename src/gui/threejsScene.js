createNameSpace("realityEditor.gui.threejsScene");

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { FBXLoader } from '../../thirdPartyCode/three/FBXLoader.js';
import { GLTFLoader } from '../../thirdPartyCode/three/GLTFLoader.module.js';
import { mergeBufferGeometries } from '../../thirdPartyCode/three/BufferGeometryUtils.module.js';
import { MeshBVH, acceleratedRaycast } from '../../thirdPartyCode/three-mesh-bvh.module.js';
import { TransformControls } from '../../thirdPartyCode/three/TransformControls.js';
import { InfiniteGridHelper } from '../../thirdPartyCode/THREE.InfiniteGridHelper/InfiniteGridHelper.module.js';
import { RoomEnvironment } from '../../thirdPartyCode/three/RoomEnvironment.module.js';
import { ViewFrustum, frustumVertexShader, frustumFragmentShader, MAX_VIEW_FRUSTUMS, UNIFORMS } from './ViewFrustum.js';

(function(exports) {

    var camera, scene, renderer;
    var rendererWidth = window.innerWidth;
    var rendererHeight = window.innerHeight;
    var aspectRatio = rendererWidth / rendererHeight;
    var isProjectionMatrixSet = false;
    const animationCallbacks = [];
    let lastFrameTime = Date.now();
    const worldObjectGroups = {}; // Parent objects for objects attached to world objects
    const worldOcclusionObjects = {}; // Keeps track of initialized occlusion objects per world object
    let groundPlaneCollider;
    let raycaster;
    let mouse;
    let distanceRaycastVector = new THREE.Vector3();
    let distanceRaycastResultPosition = new THREE.Vector3();
    let originBoxes = {};
    let hasGltfScene = false;

    const DISPLAY_ORIGIN_BOX = true;

    let customMaterials;
    let materialCullingFrustums = {}; // used in remote operator to cut out points underneath the point-clouds

    let areaTargetMaterials = [];

    // for now, this contains everything not attached to a specific world object
    var threejsContainerObj;
    
    let debug_fov = 30;
    let debug_ratio = 6;
    let debug_near = 10;
    let debug_far = 5000;
    let debug_offset_linear = 1.7;
    let debug_offset_ratio_x = 1;
    let debug_offset_ratio_y = 0.4;
    // todo Steve: instead of just multiplying phoneNdcSpaceXY x and y with a single ratio value,
    // todo Steve: maybe I should instead set 4 sliders for the phoneNdcSpaceXY x and y ranges, 
    // todo Steve: and then in the shader, normalize this range to 0 - 1

    function initService() {
        // create a fullscreen webgl renderer for the threejs content
        const domElement = document.getElementById('mainThreejsCanvas');
        renderer = new THREE.WebGLRenderer({canvas: domElement, alpha: true, antialias: false});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(rendererWidth, rendererHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.autoClear = false;

        camera = new THREE.PerspectiveCamera(70, aspectRatio, 1, 1000);
        camera.matrixAutoUpdate = false;
        scene = new THREE.Scene();
        scene.add(camera); // Normally not needed, but needed in order to add child objects relative to camera

        realityEditor.device.layout.onWindowResized(({width, height}) => {
            renderer.setSize(width, height);
        });

        // create a parent 3D object to contain all the non-world-aligned three js objects
        // we can apply the transform to this object and all of its children objects will be affected
        threejsContainerObj = new THREE.Object3D();
        threejsContainerObj.matrixAutoUpdate = false; // this is needed to position it directly with matrices
        scene.add(threejsContainerObj);

        setupLighting();

        customMaterials = new CustomMaterials();

        // Add the BVH optimized raycast function from three-mesh-bvh.module.js
        // Assumes the BVH is available on the `boundsTree` variable
        THREE.Mesh.prototype.raycast = acceleratedRaycast;

        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // additional 3d content can be added to the scene like so:
        // var radius = 75;
        // var geometry = new THREE.IcosahedronGeometry( radius, 1 );
        // var materials = [
        //     new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading, vertexColors: THREE.VertexColors, shininess: 0 } ),
        //     new THREE.MeshBasicMaterial( { color: 0x000000, shading: THREE.FlatShading, wireframe: true, transparent: true } )
        // ];
        // mesh = SceneUtils.createMultiMaterialObject( geometry, materials );
        // threejsContainerObj.add( mesh );
        // mesh.position.setZ(150);

        addGroundPlaneCollider(); // invisible object for raycasting intersections with ground plane

        let pmremGenerator = new THREE.PMREMGenerator(renderer);
        pmremGenerator.compileEquirectangularShader();

        let neutralEnvironment = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        scene.environment = neutralEnvironment;

        // this triggers with a requestAnimationFrame on remote operator,
        // or at frequency of Vuforia updates on mobile
        realityEditor.gui.ar.draw.addUpdateListener(renderScene);

        if (DISPLAY_ORIGIN_BOX) {
            realityEditor.gui.settings.addToggle('Display Origin Boxes', 'show debug cubes at origin', 'displayOriginCubes',  '../../../svg/move.svg', false, function(newValue) {
                toggleDisplayOriginBoxes(newValue);
            }, { dontPersist: true });
        }

        addDebugSliders();
    }
    
    function addDebugSliders() {
        const container = document.createElement('div');
        container.classList.add('slider-container');

        {
            // 1st slider: FOV
            const slider1 = document.createElement("input");
            slider1.classList.add('debug-slider');
            slider1.setAttribute("type", "range");
            slider1.setAttribute("id", "debug-fov-slider");
            slider1.setAttribute("min", "10");
            slider1.setAttribute("max", "90");
            slider1.setAttribute("step", "1");
            slider1.setAttribute("value", `${debug_fov}`);
    
            const label1 = document.createElement("label");
            label1.id = 'debug-fov-label';
            label1.setAttribute("for", "debug-fov-slider");
            label1.textContent = `FOV: ${debug_fov}`;
    
            slider1.addEventListener("input", (event) => {
                label1.textContent = `FOV: ${event.target.value}`;
                debug_fov = event.target.value;
            });
    
            container.appendChild(slider1);
            container.appendChild(label1);
            container.appendChild(document.createElement('br'));
        }

        {
            // 2nd slider: Ratio
            const slider2 = document.createElement("input");
            slider2.classList.add('debug-slider');
            slider2.setAttribute("type", "range");
            slider2.setAttribute("id", "debug-ratio-slider");
            slider2.setAttribute("min", "0.33");
            slider2.setAttribute("max", "10");
            slider2.setAttribute("step", "0.01");
            slider2.setAttribute("value", `${debug_ratio}`);
    
            const label2 = document.createElement("label");
            label2.id = 'debug-ratio-label';
            label2.setAttribute("for", "debug-ratio-slider");
            label2.textContent = `Ratio: ${debug_ratio}`;
    
            slider2.addEventListener("input", (event) => {
                label2.textContent = `Ratio: ${event.target.value}`;
                debug_ratio = event.target.value;
            });
    
            container.appendChild(slider2);
            container.appendChild(label2);
            container.appendChild(document.createElement('br'));
        }

        {
            // 3rd slider: near plane
            const slider3 = document.createElement("input");
            slider3.classList.add('debug-slider');
            slider3.setAttribute("type", "range");
            slider3.setAttribute("id", "debug-near-slider");
            slider3.setAttribute("min", "1");
            slider3.setAttribute("max", "30");
            slider3.setAttribute("step", "1");
            slider3.setAttribute("value", `${debug_near}`);
    
            const label3 = document.createElement("label");
            label3.id = 'debug-near-label';
            label3.setAttribute("for", "debug-near-slider");
            label3.textContent = `Near plane: ${debug_near}`;
    
            slider3.addEventListener("input", (event) => {
                label3.textContent = `Near plane: ${event.target.value}`;
                debug_near = event.target.value;
            });
    
            container.appendChild(slider3);
            container.appendChild(label3);
            container.appendChild(document.createElement('br'));
        }

        {
            // 4th slider: far plane
            const slider4 = document.createElement("input");
            slider4.classList.add('debug-slider');
            slider4.setAttribute("type", "range");
            slider4.setAttribute("id", "debug-far-slider");
            slider4.setAttribute("min", "1000");
            slider4.setAttribute("max", "10000");
            slider4.setAttribute("step", "10");
            slider4.setAttribute("value", `${debug_far}`);

            const label5 = document.createElement("label");
            label5.id = 'debug-far-label';
            label5.setAttribute("for", "debug-far-slider");
            label5.textContent = `Far plane: ${debug_far}`;

            slider4.addEventListener("input", (event) => {
                label5.textContent = `Far plane: ${event.target.value}`;
                debug_far = event.target.value;
            });

            container.appendChild(slider4);
            container.appendChild(label5);
            container.appendChild(document.createElement('br'));

            document.body.appendChild(container);
        }

        {
            // 5th slider: frustum shader offset linear
            const slider5 = document.createElement("input");
            slider5.classList.add('debug-slider');
            slider5.setAttribute("type", "range");
            slider5.setAttribute("id", "debug-offset-linear-slider");
            slider5.setAttribute("min", "-3");
            slider5.setAttribute("max", "5.8");
            slider5.setAttribute("step", "0.1");
            slider5.setAttribute("value", `${debug_offset_linear}`);

            const label5 = document.createElement("label");
            label5.id = 'debug-offset-linear-label';
            label5.setAttribute("for", "debug-offset-linear-slider");
            label5.textContent = `Frustum shader linear offset: ${debug_offset_linear}`;

            slider5.addEventListener("input", (event) => {
                label5.textContent = `Frustum shader linear offset: ${event.target.value}`;
                debug_offset_linear = event.target.value;
            });

            container.appendChild(slider5);
            container.appendChild(label5);
            container.appendChild(document.createElement('br'));

            document.body.appendChild(container);
        }

        {
            // 6th slider: frustum shader x ratio
            const slider6 = document.createElement("input");
            slider6.classList.add('debug-slider');
            slider6.setAttribute("type", "range");
            slider6.setAttribute("id", "debug-offset-ratio-x-slider");
            slider6.setAttribute("min", "0.1");
            slider6.setAttribute("max", "5");
            slider6.setAttribute("step", "0.1");
            slider6.setAttribute("value", `${debug_offset_ratio_x}`);

            const label6 = document.createElement("label");
            label6.id = 'debug-offset-ratio-x-label';
            label6.setAttribute("for", "debug-offset-ratio-x-slider");
            label6.textContent = `Frustum shader uv x ratio: ${debug_offset_ratio_x}`;

            slider6.addEventListener("input", (event) => {
                label6.textContent = `Frustum shader uv x ratio: ${event.target.value}`;
                debug_offset_ratio_x = event.target.value;
            });

            container.appendChild(slider6);
            container.appendChild(label6);
            container.appendChild(document.createElement('br'));

            document.body.appendChild(container);
        }

        {
            // 7th slider: frustum shader y ratio
            const slider7 = document.createElement("input");
            slider7.classList.add('debug-slider');
            slider7.setAttribute("type", "range");
            slider7.setAttribute("id", "debug-offset-ratio-y-slider");
            slider7.setAttribute("min", "0.1");
            slider7.setAttribute("max", "5");
            slider7.setAttribute("step", "0.1");
            slider7.setAttribute("value", `${debug_offset_ratio_y}`);

            const label7 = document.createElement("label");
            label7.id = 'debug-offset-ratio-y-label';
            label7.setAttribute("for", "debug-offset-ratio-y-slider");
            label7.textContent = `Frustum shader uv y ratio: ${debug_offset_ratio_y}`;

            slider7.addEventListener("input", (event) => {
                label7.textContent = `Frustum shader uv y ratio: ${event.target.value}`;
                debug_offset_ratio_y = event.target.value;
            });

            container.appendChild(slider7);
            container.appendChild(label7);
            container.appendChild(document.createElement('br'));

            document.body.appendChild(container);
        }
    }

    // light the scene with a combination of ambient and directional white light
    function setupLighting() {
        // This doesn't seem to work with the area target model material, but adding it for everything else
        let ambLight = new THREE.AmbientLight(0xffffff, 0.3);
        scene.add(ambLight);

        // attempts to light the scene evenly with directional lights from each side, but mostly from the top
        let dirLightTopDown = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLightTopDown.position.set(0, 1, 0); // top-down
        dirLightTopDown.lookAt(0, 0, 0);
        scene.add(dirLightTopDown);

        // let dirLightXLeft = new THREE.DirectionalLight(0xffffff, 0.5);
        // dirLightXLeft.position.set(1, 0, 0);
        // scene.add(dirLightXLeft);

        // let dirLightXRight = new THREE.DirectionalLight(0xffffff, 0.5);
        // dirLightXRight.position.set(-1, 0, 0);
        // scene.add(dirLightXRight);

        // let dirLightZLeft = new THREE.DirectionalLight(0xffffff, 0.5);
        // dirLightZLeft.position.set(0, 0, 1);
        // scene.add(dirLightZLeft);

        // let dirLightZRight = new THREE.DirectionalLight(0xffffff, 0.5);
        // dirLightZRight.position.set(0, 0, -1);
        // scene.add(dirLightZRight);
    }

    // use this helper function to update the camera matrix using the camera matrix from the sceneGraph
    function setCameraPosition(matrix) {
        setMatrixFromArray(camera.matrix, matrix);
        if (customMaterials) {
            let forwardVector = realityEditor.gui.ar.utilities.getForwardVector(matrix);
            customMaterials.updateCameraDirection(new THREE.Vector3(forwardVector[0], forwardVector[1], forwardVector[2]));
        }
    }

    // adds an invisible plane to the ground that you can raycast against to fill in holes in the area target
    // this is different from the ground plane visualizer element
    function addGroundPlaneCollider() {
        const sceneSizeInMeters = 100; // not actually infinite, but relative to any area target this should cover it
        const geometry = new THREE.PlaneGeometry( 1000 * sceneSizeInMeters, 1000 * sceneSizeInMeters);
        const material = new THREE.MeshBasicMaterial( {color: 0x88ffff, side: THREE.DoubleSide} );
        const plane = new THREE.Mesh( geometry, material );
        plane.rotateX(Math.PI/2);
        plane.visible = false;
        addToScene(plane, {occluded: true});
        plane.name = 'groundPlaneCollider';
        groundPlaneCollider = plane;
    }

    function renderScene() {
        const deltaTime = Date.now() - lastFrameTime; // In ms
        lastFrameTime = Date.now();

        // additional modules, e.g. spatialCursor, should trigger their update function with an animationCallback
        animationCallbacks.forEach(callback => {
            callback(deltaTime);
        });

        if (globalStates.realProjectionMatrix && globalStates.realProjectionMatrix.length > 0) {
            setMatrixFromArray(camera.projectionMatrix, globalStates.realProjectionMatrix);
            camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
            isProjectionMatrixSet = true;
        }

        const worldObjectIds = realityEditor.worldObjects.getWorldObjectKeys();
        worldObjectIds.forEach(worldObjectId => {
            if (!worldObjectGroups[worldObjectId]) {
                const group = new THREE.Group();
                group.name = worldObjectId + '_group';
                worldObjectGroups[worldObjectId] = group;
                group.matrixAutoUpdate = false; // this is needed to position it directly with matrices
                scene.add(group);

                // Helps visualize world object origin point for debugging
                if (DISPLAY_ORIGIN_BOX && worldObjectId !== realityEditor.worldObjects.getLocalWorldId() && !realityEditor.device.environment.variables.hideOriginCube) {
                    const originBox = new THREE.Mesh(new THREE.BoxGeometry(10,10,10),new THREE.MeshNormalMaterial());
                    const xBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0xff0000}));
                    const yBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0x00ff00}));
                    const zBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0x0000ff}));
                    xBox.position.x = 15;
                    yBox.position.y = 15;
                    zBox.position.z = 15;
                    group.add(originBox);
                    originBox.scale.set(10,10,10);
                    originBox.add(xBox);
                    originBox.add(yBox);
                    originBox.add(zBox);

                    originBoxes[worldObjectId] = originBox;
                    if (typeof realityEditor.gui.settings.toggleStates.displayOriginCubes !== 'undefined') {
                        originBox.visible = realityEditor.gui.settings.toggleStates.displayOriginCubes;
                    }
                }
            }

            // each of the world object containers has its origin set to the origin matrix of that world object
            const group = worldObjectGroups[worldObjectId];
            const worldMatrix = realityEditor.sceneGraph.getSceneNodeById(worldObjectId).worldMatrix;
            if (worldMatrix) {
                setMatrixFromArray(group.matrix, worldMatrix);
                group.visible = true;

                if (worldOcclusionObjects[worldObjectId]) {
                    setMatrixFromArray(worldOcclusionObjects[worldObjectId].matrix, worldMatrix);
                    worldOcclusionObjects[worldObjectId].visible = true;
                }
            } else {
                group.visible = false;

                if (worldOcclusionObjects[worldObjectId]) {
                    worldOcclusionObjects[worldObjectId].visible = false;
                }
            }
        });

        // the main three.js container object has its origin set to the ground plane origin
        const rootMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
        if (rootMatrix) {
            setMatrixFromArray(threejsContainerObj.matrix, rootMatrix);
        }

        customMaterials.update();

        // only render the scene if the projection matrix is initialized
        if (isProjectionMatrixSet) {
            renderer.clear();
            // render the ground plane visualizer first
            camera.layers.set(2);
            renderer.render(scene, camera);
            renderer.clearDepth();
            if (hasGltfScene) {
                // Set rendered layer to 1: only the background, i.e. the
                // static gltf mesh
                camera.layers.set(1);
                renderer.render(scene, camera);
                // Leaves only the color from the render, discarding depth and
                // stencil
                renderer.clear(false, true, true);
            }
            // Set layer to 0: everything but the background
            camera.layers.set(0);
            renderer.render(scene, camera);
        }
    }

    function toggleDisplayOriginBoxes(newValue) {
        Object.values(originBoxes).forEach((box) => {
            box.visible = newValue;
        });
    }

    function addToScene(obj, parameters) {
        if (!parameters) {
            parameters = {};
        }
        const occluded = parameters.occluded;
        const parentToCamera = parameters.parentToCamera;
        const worldObjectId = parameters.worldObjectId;
        const attach = parameters.attach;
        const layer = parameters.layer;
        if (occluded) {
            const queue = [obj];
            while (queue.length > 0) {
                const currentObj = queue.pop();
                currentObj.renderOrder = 2;
                currentObj.children.forEach(child => queue.push(child));
            }
        }
        if (parentToCamera) {
            if (attach) {
                camera.attach(obj);
            } else {
                camera.add(obj);
            }
        } else if (worldObjectId) {
            if (attach) {
                worldObjectGroups[worldObjectId].attach(obj);
            } else {
                worldObjectGroups[worldObjectId].add(obj);
            }
        } else {
            if (attach) {
                threejsContainerObj.attach(obj);
            } else {
                threejsContainerObj.add(obj);
            }
        }
        if (layer) {
            obj.layers.set(layer);
        }
    }

    function removeFromScene(obj) {
        if (obj && obj.parent) {
            obj.parent.remove(obj);
        }
    }

    function onAnimationFrame(callback) {
        animationCallbacks.push(callback);
    }

    function removeAnimationCallback(callback) {
        if (animationCallbacks.includes(callback)) {
            animationCallbacks.splice(animationCallbacks.indexOf(callback), 1);
        }
    }

    function addOcclusionGltf(pathToGltf, objectId) {
        // Code remains here, but likely won't be used due to distance-based fading looking better

        if (worldOcclusionObjects[objectId]) {
            console.log(`occlusion gltf already loaded`);
            return; // Don't try creating multiple occlusion objects for the same world object
        }

        const gltfLoader = new GLTFLoader();
        console.log('loading occlusion gltf');
        gltfLoader.load(pathToGltf, function(gltf) {
            const geometries = [];
            gltf.scene.traverse(obj => {
                if (obj.geometry) {
                    obj.geometry.deleteAttribute('uv'); // Messes with merge if present in some geometries but not others
                    obj.geometry.deleteAttribute('uv2'); // Messes with merge if present in some geometries but not others
                    geometries.push(obj.geometry);
                }
            });

            let geometry = geometries[0];
            if (geometries.length > 1) {
                const mergedGeometry = mergeBufferGeometries(geometries);
                geometry = mergedGeometry;
            }

            // SimplifyModifier seems to freeze app
            // if (geometry.index) {
            //     geometry = new SimplifyModifier().modify(geometry, geometry.index.count * 0.2);
            // } else {
            //     geometry = new SimplifyModifier().modify(geometry, geometry.attributes.position.count * 0.2);
            // }
            geometry.computeVertexNormals();

            // Add the BVH to the boundsTree variable so that the acceleratedRaycast can work
            geometry.boundsTree = new MeshBVH( geometry );

            const material = new THREE.MeshNormalMaterial();
            material.colorWrite = false; // Makes it invisible
            const mesh = new THREE.Mesh(geometry, material);
            mesh.renderOrder = 1;
            mesh.scale.set(1000, 1000, 1000); // convert meters -> mm
            const group = new THREE.Group(); // mesh needs to be in group so scale doesn't get overriden by model view matrix
            group.add(mesh);
            group.matrixAutoUpdate = false; // allows us to update with the model view matrix
            scene.add(group);
            worldOcclusionObjects[objectId] = group;

            console.log(`loaded occlusion gltf for ${objectId}`, pathToGltf);
        });
    }

    function getObjectForWorldRaycasts(objectId) {
        return worldOcclusionObjects[objectId] || scene.getObjectByName('areaTargetMesh');
    }

    function isOcclusionActive(objectId) {
        return !!worldOcclusionObjects[objectId];
    }

    /**
     * Key function for the remote operator. Loads and adds a GLTF model to the
     * scene as a static reference mesh.
     * @param {string} pathToGltf - url of gltf
     * @param {{x: number, y: number, z: number}} originOffset - offset of model for ground plane being aligned with y=0
     * @param {{x: number, y: number, z: number}} originRotation - rotation for up to be up
     * @param {number} maxHeight - maximum (ceiling) height of model
     * @param {{x: number, y: number, z: number}} center - center of model for loading animation
     * @param {function} callback - Called on load with gltf's threejs object
     *
    /* For my example area target:
        pathToGltf = './svg/BenApt1_authoring.glb' // put in arbitrary local directory to test
        originOffset = {x: -600, y: 0, z: -3300};
        originRotation = {x: 0, y: 2.661627109291353, z: 0};
        maxHeight = 2.3 // use to slice off the ceiling above this height (meters)
     */
    function addGltfToScene(pathToGltf, originOffset, originRotation, maxHeight, center, callback) {
        const gltfLoader = new GLTFLoader();

        gltfLoader.load(pathToGltf, function(gltf) {
            let wireMesh;
            let wireMaterial = customMaterials.areaTargetMaterialWithTextureAndHeight(new THREE.MeshStandardMaterial({
                wireframe: true,
                color: 0x777777,
            }), {
                maxHeight: maxHeight,
                center: center,
                animateOnLoad: true,
                inverted: true,
                useFrustumCulling: false
            });

            if (gltf.scene.geometry) {
                if (typeof maxHeight !== 'undefined') {
                    if (!gltf.scene.material) {
                        console.warn('no material', gltf.scene);
                    } else {
                        gltf.scene.material = customMaterials.areaTargetMaterialWithTextureAndHeight(gltf.scene.material, {
                            maxHeight: maxHeight,
                            center: center,
                            animateOnLoad: true,
                            inverted: false,
                            useFrustumCulling: true
                        });
                    }
                }
                gltf.scene.geometry.computeVertexNormals();
                gltf.scene.geometry.computeBoundingBox();

                // Add the BVH to the boundsTree variable so that the acceleratedRaycast can work
                gltf.scene.geometry.boundsTree = new MeshBVH( gltf.scene.geometry );

                wireMesh = new THREE.Mesh(gltf.scene.geometry, wireMaterial);
            } else {
                let allMeshes = [];
                gltf.scene.traverse(child => {
                    if (child.material && child.geometry) {
                        allMeshes.push(child);
                    }
                });

                allMeshes.forEach(child => {
                    if (typeof maxHeight !== 'undefined') {
                        child.material = customMaterials.areaTargetMaterialWithTextureAndHeight(child.material, {
                            maxHeight: maxHeight,
                            center: center,
                            animateOnLoad: true,
                            inverted: false,
                            useFrustumCulling: true
                        });
                    }

                    // the attributes must be non-indexed in order to add a barycentric coordinate buffer
                    child.geometry = child.geometry.toNonIndexed();

                    // we assign barycentric coordinates to each vertex in order to render a wireframe shader
                    let positionAttribute = child.geometry.getAttribute('position');
                    let barycentricBuffer = [];
                    const count = positionAttribute.count / 3;
                    for (let i = 0; i < count; i++) {
                        barycentricBuffer.push(
                            0, 0, 1,
                            0, 1, 0,
                            1, 0, 0
                        );
                    }

                    child.geometry.setAttribute('a_barycentric', new THREE.BufferAttribute(new Uint8Array(barycentricBuffer), 3));
                });
                const mergedGeometry = mergeBufferGeometries(allMeshes.map(child => {
                  let geo = child.geometry.clone();
                  geo.deleteAttribute('uv');
                  geo.deleteAttribute('uv2');
                  return geo;
                }));
                mergedGeometry.computeVertexNormals();
                mergedGeometry.computeBoundingBox();

                // Add the BVH to the boundsTree variable so that the acceleratedRaycast can work
                allMeshes.map(child => {
                    child.geometry.boundsTree = new MeshBVH(child.geometry);
                });

                wireMesh = new THREE.Mesh(mergedGeometry, wireMaterial);
            }

            // align the coordinate systems
            gltf.scene.scale.set(1000, 1000, 1000); // convert meters -> mm
            wireMesh.scale.set(1000, 1000, 1000); // convert meters -> mm
            if (typeof originOffset !== 'undefined') {
                gltf.scene.position.set(originOffset.x, originOffset.y, originOffset.z);
                wireMesh.position.set(originOffset.x, originOffset.y, originOffset.z);
            }
            if (typeof originRotation !== 'undefined') {
                gltf.scene.rotation.set(originRotation.x, originRotation.y, originRotation.z);
                wireMesh.rotation.set(originRotation.x, originRotation.y, originRotation.z);
            }

            wireMesh.layers.set(1);
            gltf.scene.layers.set(1);
            gltf.scene.traverse(child => {
                if (child.layers) {
                    child.layers.set(1);
                }
            });
            hasGltfScene = true;

            threejsContainerObj.add( wireMesh );
            setTimeout(() => {
                threejsContainerObj.remove(wireMesh);
            }, 5000);
            threejsContainerObj.add( gltf.scene );

            console.log('loaded gltf', pathToGltf);

            if (callback) {
              callback(gltf.scene, wireMesh);
            }
        });
    }

    // small helper function for setting three.js matrices from the custom format we use
    function setMatrixFromArray(matrix, array) {
        matrix.set( array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }

    // this module exports this utility so that other modules can perform hit tests
    // objectsToCheck defaults to scene.children (all objects in the scene) if unspecified
    // NOTE: returns the coordinates in threejs scene world coordinates:
    //       may need to call objectToCheck.worldToLocal(results[0].point) to get the result in the right system
    function getRaycastIntersects(clientX, clientY, objectsToCheck) {
        mouse.x = ( clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( clientY / window.innerHeight ) * 2 + 1;

        //2. set the picking ray from the camera position and mouse coordinates
        raycaster.setFromCamera( mouse, camera );

        raycaster.firstHitOnly = true; // faster (using three-mesh-bvh)

        // add object layer to raycast layer mask
        objectsToCheck.forEach(obj => {
            raycaster.layers.mask = raycaster.layers.mask | obj.layers.mask;
        });

        //3. compute intersections
        // add object layer to raycast layer mask
        objectsToCheck.forEach(obj => {
            raycaster.layers.mask = raycaster.layers.mask | obj.layers.mask;
        });
        let results = raycaster.intersectObjects( objectsToCheck || scene.children, true );
        results.forEach(intersection => {
            intersection.rayDirection = raycaster.ray.direction;
        });
        return results;
    }

    /**
     * Returns the 3D coordinate which is [distance] mm in front of the screen pixel coordinates [clientX, clientY]
     * @param {number} clientX - in screen pixels
     * @param {number} clientY - in screen pixels
     * @param {number} distance - in millimeters
     * @returns {Vector3} - position relative to camera
     */
    function getPointAtDistanceFromCamera(clientX, clientY, distance) {
        distanceRaycastVector.set(
            ( clientX / window.innerWidth ) * 2 - 1,
            - ( clientY / window.innerHeight ) * 2 + 1,
            0
        );
        distanceRaycastVector.unproject(camera);
        distanceRaycastVector.normalize();
        distanceRaycastResultPosition.set(0, 0, 0).add(distanceRaycastVector.multiplyScalar(distance));
        return distanceRaycastResultPosition;
    }

    function getObjectByName(name) {
        return scene.getObjectByName(name);
    }
    
    // return all objects with the name
    function getObjectsByName(name) {
        if (name === undefined) return;
        const objects = [];
        scene.traverse((object) => {
            if (object.name === name) objects.push(object);
        })
        return objects;
    }

    function getGroundPlaneCollider() {
        return groundPlaneCollider;
    }

    /**
     * Helper function to create a new ViewFrustum instance with preset camera internals
     * @returns {ViewFrustum}
     */
    const createCullingFrustum = function() {
        areaTargetMaterials.forEach(material => {
            material.transparent = true;
        });

        // TODO: get these camera parameters dynamically?
        const iPhoneVerticalFOV = 41.22673; // https://discussions.apple.com/thread/250970597
        const widthToHeightRatio = 1920/1080;

        const MAX_DIST_OBSERVED = 5000;
        const FAR_PLANE_MM = Math.min(MAX_DIST_OBSERVED, 5000) + 100; // extend it slightly beyond the extent of the LiDAR sensor
        const NEAR_PLANE_MM = 10;

        let frustum = new ViewFrustum();
        frustum.setCameraInternals(iPhoneVerticalFOV * 0.95, widthToHeightRatio, NEAR_PLANE_MM / 1000, FAR_PLANE_MM / 1000);
        return frustum;
    }

    /**
     * Creates a frustum, or updates the existing frustum with this id, to move it to this position and orientation.
     * Returns the parameters that define the planes of this frustum after moving it.
     * @param {string} id – id of the virtualizer
     * @param {number[]} cameraPosition - position in model coordinates. this may be meters, not millimeters.
     * @param {number[]} cameraLookAtPosition – position where the camera is looking. if you subtract cameraPosition, you get direction
     * @param {number[]} cameraUp - normalized up vector of camera orientation
     * @param {number} maxDepthMeters - furthest point detected by the LiDAR sensor this frame
     * @returns {{normal1: Vector3, normal2: Vector3, normal3: Vector3, normal4: Vector3, normal5: Vector3, normal6: Vector3, D1: number, D2: number, D3: number, D4: number, D5: number, D6: number}}
     */
    function updateMaterialCullingFrustum(id, cameraPosition, cameraLookAtPosition, cameraUp, maxDepthMeters, depthMap, phoneViewMatrix) {
        if (typeof materialCullingFrustums[id] === 'undefined') {
            materialCullingFrustums[id] = createCullingFrustum();
        }

        let frustum = materialCullingFrustums[id];

        let phoneProjectionMatrix = null;
        if (typeof maxDepthMeters !== 'undefined') {
            // let phoneProjectionMatrixArray = frustum.setCameraInternals(frustum.angle, frustum.ratio, frustum.nearD, (frustum.farD + maxDepthMeters) / 2, true);
            frustum.setCameraInternals(frustum.angle, frustum.ratio, frustum.nearD, (frustum.farD + maxDepthMeters) / 2, true);
            let phoneProjectionMatrixArray = frustum.projectionMatrixFrom(debug_fov, debug_ratio, debug_near, debug_far);
            phoneProjectionMatrix = new THREE.Matrix4().fromArray(phoneProjectionMatrixArray);
        }

        frustum.setCameraDef(cameraPosition, cameraLookAtPosition, cameraUp);

        let viewingCameraForwardVector = realityEditor.gui.ar.utilities.getForwardVector(realityEditor.sceneGraph.getCameraNode().worldMatrix);
        let viewAngleSimilarity = realityEditor.gui.ar.utilities.dotProduct(materialCullingFrustums[id].planes[5].normal, viewingCameraForwardVector);
        viewAngleSimilarity = Math.max(0, viewAngleSimilarity); // limit it to 0 instead of going to -1 if viewing from anti-parallel direction
        
        return {
            planes: {
                normal1: array3ToXYZ(materialCullingFrustums[id].planes[0].normal),
                normal2: array3ToXYZ(materialCullingFrustums[id].planes[1].normal),
                normal3: array3ToXYZ(materialCullingFrustums[id].planes[2].normal),
                normal4: array3ToXYZ(materialCullingFrustums[id].planes[3].normal),
                normal5: array3ToXYZ(materialCullingFrustums[id].planes[4].normal),
                normal6: array3ToXYZ(materialCullingFrustums[id].planes[5].normal),
                D1: materialCullingFrustums[id].planes[0].D,
                D2: materialCullingFrustums[id].planes[1].D,
                D3: materialCullingFrustums[id].planes[2].D,
                D4: materialCullingFrustums[id].planes[3].D,
                D5: materialCullingFrustums[id].planes[4].D,
                D6: materialCullingFrustums[id].planes[5].D,
                viewAngleSimilarity: viewAngleSimilarity,
                phoneViewMatrix: phoneViewMatrix,
                phoneProjectionMatrix: phoneProjectionMatrix,
                offsetLinear: debug_offset_linear,
                offsetRatioX: debug_offset_ratio_x,
                offsetRatioY: debug_offset_ratio_y
            },
            depthMap: depthMap
        }
    }

    /**
     * Helper function to convert [x,y,z] from toolbox math format to three.js vector
     * @param {number[]} arr3 – [x, y, z] array
     * @returns {Vector3}
     */
    function array3ToXYZ(arr3) {
        return new THREE.Vector3(arr3[0], arr3[1], arr3[2]);
    }

    /**
     * Deletes the ViewFrustum that corresponds with the virtualizer id
     * @param {string} id
     */
    function removeMaterialCullingFrustum(id) {
        delete materialCullingFrustums[id];

        if (Object.keys(materialCullingFrustums).length === 0) {
            areaTargetMaterials.forEach(material => {
                material.transparent = false; // optimize by turning off transparency when no virtualizers are connected
            });
        }
    }

    class CustomMaterials {
        constructor() {
            this.materialsToAnimate = [];
            this.lastUpdate = -1;
        }
        areaTargetVertexShader({useFrustumCulling, useLoadingAnimation, center}) {
            if (!useLoadingAnimation && !useFrustumCulling) return THREE.ShaderChunk.meshphysical_vert;
            if (useLoadingAnimation && !useFrustumCulling) {
                return this.loadingAnimationVertexShader(center);
            }
            return frustumVertexShader({useLoadingAnimation: useLoadingAnimation, center: center});
        }
        areaTargetFragmentShader({useFrustumCulling, useLoadingAnimation, inverted}) {
            if (!useLoadingAnimation && !useFrustumCulling) return THREE.ShaderChunk.meshphysical_frag;
            if (useLoadingAnimation && !useFrustumCulling) {
                return this.loadingAnimationFragmentShader(inverted);
            }
            return frustumFragmentShader({useLoadingAnimation: useLoadingAnimation, inverted: inverted});
        }
        loadingAnimationVertexShader(center) {
            return THREE.ShaderChunk.meshphysical_vert
                .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
    len = length(position - vec3(${center.x}, ${center.y}, ${center.z}));
    `).replace('#include <common>', `#include <common>
    varying float len;
    `);
        }
        loadingAnimationFragmentShader(inverted) {
            let condition = 'if (len > maxHeight) discard;';
            if (inverted) {
                // condition = 'if (len < maxHeight || len > (maxHeight + 8.0) / 2.0) discard;';
                condition = 'if (len < maxHeight) discard;';
            }
            return THREE.ShaderChunk.meshphysical_frag
                .replace('#include <clipping_planes_fragment>', `
                         ${condition}
                         #include <clipping_planes_fragment>`)
                .replace(`#include <common>`, `
                         #include <common>
                         varying float len;
                         uniform float maxHeight;
                         `);
        }
        buildDefaultFrustums(numFrustums) {
            let frustums = [];
            for (let i = 0; i < numFrustums; i++) {
                frustums.push({
                    normal1: {x: 1, y: 0, z: 0},
                    normal2: {x: 1, y: 0, z: 0},
                    normal3: {x: 1, y: 0, z: 0},
                    normal4: {x: 1, y: 0, z: 0},
                    normal5: {x: 1, y: 0, z: 0},
                    normal6: {x: 1, y: 0, z: 0},
                    D1: 0,
                    D2: 0,
                    D3: 0,
                    D4: 0,
                    D5: 0,
                    D6: 0,
                    viewAngleSimilarity: 0,
                    phoneViewMatrix: new THREE.Matrix4(),
                    phoneProjectionMatrix: new THREE.Matrix4(),
                    offsetLinear: debug_offset_linear,
                    offsetRatioX: debug_offset_ratio_x,
                    offsetRatioY: debug_offset_ratio_y
                })
            }
            return frustums;
        }
        updateCameraDirection(cameraDirection) {
            areaTargetMaterials.forEach(material => {
                for (let i = 0; i < material.uniforms[UNIFORMS.numFrustums].value; i++) {
                    let thisFrustum = material.uniforms[UNIFORMS.frustums].value[i];
                    let frustumDir = [thisFrustum.normal6.x, thisFrustum.normal6.y, thisFrustum.normal6.z];
                    let viewingDir = [cameraDirection.x, cameraDirection.y, cameraDirection.z];
                    // set to 1 if parallel, 0 if perpendicular. lower bound clamped to 0 instead of going to -1 if antiparallel
                    thisFrustum.viewAngleSimilarity = Math.max(0, realityEditor.gui.ar.utilities.dotProduct(frustumDir, viewingDir));
                }
            });
        }
        areaTargetMaterialWithTextureAndHeight(sourceMaterial, {maxHeight, center, animateOnLoad, inverted, useFrustumCulling}) {
            let material = sourceMaterial.clone();
            
            // for the shader to work, we must fully populate the frustums uniform array
            // with placeholder data (e.g. normals and constants for all 5 frustums),
            // but as long as numFrustums is 0 then it won't have any effect
            let defaultFrustums = this.buildDefaultFrustums(MAX_VIEW_FRUSTUMS);

            let depthMap2 = new THREE.Texture();
            depthMap2.minFilter = THREE.LinearFilter;
            depthMap2.magFilter = THREE.LinearFilter;
            depthMap2.generateMipmaps = false;
            depthMap2.isVideoTexture = true;
            
            material.uniforms = THREE.UniformsUtils.merge([
                THREE.ShaderLib.physical.uniforms,
                {
                    depthMap: depthMap2,
                    maxHeight: {value: maxHeight},
                    numFrustums: {value: 0},
                    frustums: {value: defaultFrustums}
                }
            ]);

            material.vertexShader = this.areaTargetVertexShader({
                useFrustumCulling: useFrustumCulling,
                useLoadingAnimation: animateOnLoad,
                center: center
            });
            material.fragmentShader = this.areaTargetFragmentShader({
                useFrustumCulling: useFrustumCulling,
                useLoadingAnimation: animateOnLoad,
                inverted: inverted
            });

            material.transparent = (Object.keys(materialCullingFrustums).length > 0);
            areaTargetMaterials.push(material);

            if (animateOnLoad) {
                this.materialsToAnimate.push({
                    material: material,
                    currentHeight: -15, // -maxHeight,
                    maxHeight: maxHeight * 4,
                    animationSpeed: 0.02 / 2
                });
            }

            material.type = 'thecoolermeshstandardmaterial';

            material.needsUpdate = true;

            return material;
        }
        update() {
            if (this.materialsToAnimate.length === 0) { return; }

            let now = window.performance.now();
            if (this.lastUpdate < 0) {
                this.lastUpdate = now;
            }
            let dt = now - this.lastUpdate;
            this.lastUpdate = now;

            let indicesToRemove = [];
            this.materialsToAnimate.forEach(function(entry, index) {
                let material = entry.material;
                if (entry.currentHeight < entry.maxHeight) {
                    entry.currentHeight += entry.animationSpeed * dt;
                    material.uniforms['maxHeight'].value = entry.currentHeight;
                } else {
                    indicesToRemove.push(index);
                }
            });

            for (let i = indicesToRemove.length-1; i > 0; i--) {
                let matIndex = indicesToRemove[i];
                this.materialsToAnimate.splice(matIndex, 1);
            }
        }
    }

    /**
     * @param object {THREE.Mesh}
     * @param options {{size: number?, hideX: boolean?, hideY: boolean?, hideZ: boolean?}}
     * @param onChange {function?}
     * @param onDraggingChanged {function?}
     * @returns {TransformControls}
     */
    function addTransformControlsTo(object, options, onChange, onDraggingChanged) {
        let transformControls = new TransformControls(camera, renderer.domElement);
        if (options && typeof options.hideX !== 'undefined') {
            transformControls.showX = !options.hideX;
        }
        if (options && typeof options.hideY !== 'undefined') {
            transformControls.showY = !options.hideY;
        }
        if (options && typeof options.hideZ !== 'undefined') {
            transformControls.showZ = !options.hideZ;
        }
        if (options && typeof options.size !== 'undefined') {
            transformControls.size = options.size;
        }
        transformControls.attach(object);
        scene.add(transformControls);

        if (typeof onChange === 'function') {
            transformControls.addEventListener('change', onChange);
        }
        if (typeof onDraggingChanged === 'function') {
            transformControls.addEventListener('dragging-changed', onDraggingChanged)
        }
        return transformControls;
    }

    exports.createInfiniteGridHelper = function(size1, size2, thickness, color, maxVisibilityDistance) {
        return new InfiniteGridHelper(size1, size2, thickness, color, maxVisibilityDistance);
    }

    // source: https://github.com/mrdoob/three.js/issues/78
    exports.getScreenXY = function(meshPosition) {
        let pos = meshPosition.clone();
        let projScreenMat = new THREE.Matrix4();
        projScreenMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        pos.applyMatrix4(projScreenMat);
        
        // check if the position is behind the camera, if so, manually flip the screen position, b/c the screen position somehow is inverted when behind the camera
        let meshPosWrtCamera = meshPosition.clone();
        meshPosWrtCamera.applyMatrix4(camera.matrixWorldInverse);
        if (meshPosWrtCamera.z > 0) {
            pos.negate();
        }

        return {
            x: ( pos.x + 1 ) * window.innerWidth / 2,
            y: ( -pos.y + 1) * window.innerHeight / 2
        };
    };

    // source: https://stackoverflow.com/questions/29758233/three-js-check-if-object-is-still-in-view-of-the-camera
    exports.isPointOnScreen = function(pointPosition) {
        let frustum = new THREE.Frustum();
        let matrix = new THREE.Matrix4();
        matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(matrix);
        if (frustum.containsPoint(pointPosition)) {
            return true;
        } else {
            return false;
        }
    }

    // gets the position relative to groundplane (common coord system for threejsScene)
    exports.getToolPosition = function(toolId) {
        let toolSceneNode = realityEditor.sceneGraph.getSceneNodeById(toolId);
        let groundPlaneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        // console.log('%c debugging tool position', 'color: orange');
        // console.log(realityEditor.sceneGraph.convertToNewCoordSystem({x: 0, y: 0, z: 0}, toolSceneNode, groundPlaneNode));
        return realityEditor.sceneGraph.convertToNewCoordSystem({x: 0, y: 0, z: 0}, toolSceneNode, groundPlaneNode);
    }

    // gets the direction the tool is facing, within the coordinate system of the groundplane
    exports.getToolDirection = function(toolId) {
        let toolSceneNode = realityEditor.sceneGraph.getSceneNodeById(toolId);
        let groundPlaneNode = realityEditor.sceneGraph.getGroundPlaneNode();
        let toolMatrix = realityEditor.sceneGraph.convertToNewCoordSystem(realityEditor.gui.ar.utilities.newIdentityMatrix(), toolSceneNode, groundPlaneNode);
        let forwardVector = realityEditor.gui.ar.utilities.getForwardVector(toolMatrix);
        // console.log(new THREE.Vector3(forwardVector[0], forwardVector[1], forwardVector[2]));
        return new THREE.Vector3(forwardVector[0], forwardVector[1], forwardVector[2]);
    }

    /**
     * @return {{
           camera: THREE.PerspectiveCamera,
           renderer: THREE.WebGLRenderer,
           scene: THREE.Scene,
       }} Various internal objects necessary for advanced (hacky) functions
     */
    exports.getInternals = function getInternals() {
        return {
            camera,
            renderer,
            scene,
        };
    };

    exports.initService = initService;
    exports.setCameraPosition = setCameraPosition;
    exports.addOcclusionGltf = addOcclusionGltf;
    exports.isOcclusionActive = isOcclusionActive;
    exports.addGltfToScene = addGltfToScene;
    exports.onAnimationFrame = onAnimationFrame;
    exports.removeAnimationCallback = removeAnimationCallback;
    exports.addToScene = addToScene;
    exports.removeFromScene = removeFromScene;
    exports.getRaycastIntersects = getRaycastIntersects;
    exports.getPointAtDistanceFromCamera = getPointAtDistanceFromCamera;
    exports.getObjectByName = getObjectByName;
    exports.getObjectsByName = getObjectsByName;
    exports.getGroundPlaneCollider = getGroundPlaneCollider;
    exports.setMatrixFromArray = setMatrixFromArray;
    exports.getObjectForWorldRaycasts = getObjectForWorldRaycasts;
    exports.addTransformControlsTo = addTransformControlsTo;
    exports.toggleDisplayOriginBoxes = toggleDisplayOriginBoxes;
    exports.updateMaterialCullingFrustum = updateMaterialCullingFrustum;
    exports.removeMaterialCullingFrustum = removeMaterialCullingFrustum;
    exports.THREE = THREE;
    exports.FBXLoader = FBXLoader;
    exports.GLTFLoader = GLTFLoader;
})(realityEditor.gui.threejsScene);
