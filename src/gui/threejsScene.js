createNameSpace("realityEditor.gui.threejsScene");

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { FBXLoader } from '../../thirdPartyCode/three/FBXLoader.js';
import { GLTFLoader } from '../../thirdPartyCode/three/GLTFLoader.module.js';
import { DRACOLoader } from '../../thirdPartyCode/three/DRACOLoader.module.js';
import { mergeBufferGeometries } from '../../thirdPartyCode/three/BufferGeometryUtils.module.js';
import { MeshBVH, acceleratedRaycast } from '../../thirdPartyCode/three-mesh-bvh.module.js';
import { TransformControls } from '../../thirdPartyCode/three/TransformControls.js';
import { InfiniteGridHelper } from '../../thirdPartyCode/THREE.InfiniteGridHelper/InfiniteGridHelper.module.js';
import { RoomEnvironment } from '../../thirdPartyCode/three/RoomEnvironment.module.js';

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

    const DISPLAY_ORIGIN_BOX = true;

    let customMaterials;

    // for now, this contains everything not attached to a specific world object
    var threejsContainerObj;

    function initService() {
        // create a fullscreen webgl renderer for the threejs content
        const domElement = document.getElementById('mainThreejsCanvas');
        renderer = new THREE.WebGLRenderer({canvas: domElement, alpha: true, antialias: false});
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(rendererWidth, rendererHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputEncoding = THREE.sRGBEncoding;
        camera = new THREE.PerspectiveCamera(70, aspectRatio, 1, 1000);
        camera.matrixAutoUpdate = false;
        scene = new THREE.Scene();
        scene.add(camera); // Normally not needed, but needed in order to add child objects relative to camera

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

        renderScene(); // update loop

        if (DISPLAY_ORIGIN_BOX) {
            realityEditor.gui.settings.addToggle('Display Origin Boxes', 'show debug cubes at origin', 'displayOriginCubes',  '../../../svg/move.svg', false, function(newValue) {
                toggleDisplayOriginBoxes(newValue);
            }, { dontPersist: true });
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
            renderer.render( scene, camera );
        }

        requestAnimationFrame(renderScene);
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

        // Optional: Provide a DRACOLoader instance to decode compressed mesh data
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'thirdPartyCode/three/draco/' );
        gltfLoader.setDRACOLoader( dracoLoader );
        
        console.log('loading occlusion gltf');
        gltfLoader.load(pathToGltf, function(gltf) {
            const geometries = [];
            gltf.scene.traverse(obj => {
                if (obj.geometry) {
                    obj.geometry.deleteAttribute('uv'); // Messes with merge if present in some geometries but not others
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

        // Optional: Provide a DRACOLoader instance to decode compressed mesh data
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'thirdPartyCode/three/draco/' ); // './draco/' );
        gltfLoader.setDRACOLoader( dracoLoader );

        gltfLoader.load(pathToGltf, function(gltf) {
            let wireMesh;
            let wireMaterial = customMaterials.areaTargetMaterialWithTextureAndHeight(new THREE.MeshStandardMaterial({
                wireframe: true,
                color: 0x777777,
            }), maxHeight, center, true, true);

            if (gltf.scene.geometry) {
                if (typeof maxHeight !== 'undefined') {
                    if (!gltf.scene.material) {
                        console.warn('no material', gltf.scene);
                    } else {
                        gltf.scene.material = customMaterials.areaTargetMaterialWithTextureAndHeight(gltf.scene.material, maxHeight, center, true);
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
                        child.material = customMaterials.areaTargetMaterialWithTextureAndHeight(child.material, maxHeight, center, true);
                    }
                });
                const mergedGeometry = mergeBufferGeometries(allMeshes.map(child => {
                  let geo = child.geometry.clone();
                  geo.deleteAttribute('uv');
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

            threejsContainerObj.add( wireMesh );
            setTimeout(() => {
                threejsContainerObj.remove(wireMesh);
            }, 10000);
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

        //3. compute intersections
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

    function getGroundPlaneCollider() {
        return groundPlaneCollider;
    }

    class CustomMaterials {
        constructor() {
            this.materialsToAnimate = [];
            this.lastUpdate = -1;
        }
        areaTargetVertexShader(center) {
            return THREE.ShaderChunk.meshphysical_vert
                .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
    len = length(position - vec3(${center.x}, ${center.y}, ${center.z}));
    `).replace('#include <common>', `#include <common>
    varying float len;
    `);
        }
        areaTargetFragmentShader(inverted) {
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
        areaTargetMaterialWithTextureAndHeight(sourceMaterial, maxHeight, center, animateOnLoad, inverted) {
            let material = sourceMaterial.clone();
            material.uniforms = THREE.UniformsUtils.merge([
                THREE.ShaderLib.physical.uniforms,
                {
                    maxHeight: {value: maxHeight},
                }
            ]);

            material.vertexShader = this.areaTargetVertexShader(center);
            material.fragmentShader = this.areaTargetFragmentShader(inverted);

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

    exports.createInfiniteGridHelper = function(size1, size2, color, maxVisibilityDistance) {
        return new InfiniteGridHelper(size1, size2, color, maxVisibilityDistance)
    }

    // source: https://github.com/mrdoob/three.js/issues/78
    exports.getScreenXY = function(meshPosition) {
        let pos = meshPosition.clone();
        let projScreenMat = new THREE.Matrix4();
        projScreenMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        pos.applyMatrix4(projScreenMat);

        return {
            x: ( pos.x + 1 ) * window.innerWidth / 2,
            y: ( -pos.y + 1) * window.innerHeight / 2
        };
    }

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
    exports.getGroundPlaneCollider = getGroundPlaneCollider;
    exports.setMatrixFromArray = setMatrixFromArray;
    exports.getObjectForWorldRaycasts = getObjectForWorldRaycasts;
    exports.addTransformControlsTo = addTransformControlsTo;
    exports.toggleDisplayOriginBoxes = toggleDisplayOriginBoxes;
    exports.THREE = THREE;
    exports.FBXLoader = FBXLoader;
    exports.GLTFLoader = GLTFLoader;
})(realityEditor.gui.threejsScene);
