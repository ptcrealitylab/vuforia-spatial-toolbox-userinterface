createNameSpace("realityEditor.gui.threejsScene");

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { FBXLoader } from '../../thirdPartyCode/three/FBXLoader.js';
import { GLTFLoader } from '../../thirdPartyCode/three/GLTFLoader.module.js';
import { BufferGeometryUtils } from '../../thirdPartyCode/three/BufferGeometryUtils.module.js';

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
    let raycaster;
    let mouse;
    let distanceRaycastVector = new THREE.Vector3();
    let distanceRaycastResultPosition = new THREE.Vector3();

    const DISPLAY_ORIGIN_BOX = true;

    let customMaterials;

    // for now, this contains everything not attached to a specific world object
    // todo: in future, move three.js camera instead of moving the scene
    var threejsContainerObj;

    function initService() {
        // create a fullscreen webgl renderer for the threejs content and add to the dom
        renderer = new THREE.WebGLRenderer( { alpha: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( rendererWidth, rendererHeight );
        renderer.domElement.id = 'mainThreejsCanvas'; // this applies some css to make it fullscreen
        document.body.appendChild( renderer.domElement );
        camera = new THREE.PerspectiveCamera( 70, aspectRatio, 1, 1000 );
        scene = new THREE.Scene();
        scene.add(camera); // Normally not needed, but needed in order to add child objects relative to camera

        // create a parent 3D object to contain all the non-world-aligned three js objects
        // we can apply the transform to this object and all of its children objects will be affected
        threejsContainerObj = new THREE.Object3D();
        threejsContainerObj.matrixAutoUpdate = false; // this is needed to position it directly with matrices
        scene.add(threejsContainerObj);

        // light the scene with a combination of ambient and directional white light
        var ambLight = new THREE.AmbientLight(0xffffff);
        scene.add(ambLight);
        var dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(-10, -10, 1000);
        scene.add(dirLight);
        var spotLight = new THREE.SpotLight(0xffffff);
        spotLight.position.set(-30, -30, 150);
        spotLight.castShadow = true;
        scene.add(spotLight);

        customMaterials = new CustomMaterials();

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

        addGroundPlaneCollisionObject(); // invisible object for raycasting intersections with ground plane

        renderScene(); // update loop
    }

    function addGroundPlaneCollisionObject() {
        const sceneSizeInMeters = 10;
        const geometry = new THREE.PlaneGeometry( 1000 * sceneSizeInMeters, 1000 * sceneSizeInMeters);
        const material = new THREE.MeshBasicMaterial( {color: 0x00ffff, side: THREE.DoubleSide} );
        const plane = new THREE.Mesh( geometry, material );
        plane.rotateX(Math.PI/2);
        plane.visible = false;
        addToScene(plane, {occluded: true});
        plane.name = 'groundPlaneElement';
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

                    // const plane =

                    // const geometry = new THREE.PlaneGeometry( 1000, 1000 );
                    // const material = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
                    // const groundplaneMesh = new THREE.Mesh( geometry, material );
                    // group.add(groundplaneMesh);
                    // // realityEditor.gui.threejsScene.addToScene(groundplaneMesh, {attach: true});
                }
            }
            const group = worldObjectGroups[worldObjectId];
            const modelViewMatrix = realityEditor.sceneGraph.getModelViewMatrix(worldObjectId);
            if (modelViewMatrix) {
                setMatrixFromArray(group.matrix, modelViewMatrix);
                group.visible = true;

                if (worldOcclusionObjects[worldObjectId]) {
                    setMatrixFromArray(worldOcclusionObjects[worldObjectId].matrix, modelViewMatrix);
                    worldOcclusionObjects[worldObjectId].visible = true;
                }
            } else {
                group.visible = false;

                if (worldOcclusionObjects[worldObjectId]) {
                    worldOcclusionObjects[worldObjectId].visible = false;
                }
            }
        });

        const rootModelViewMatrix = realityEditor.sceneGraph.getGroundPlaneModelViewMatrix();
        if (rootModelViewMatrix) {
            setMatrixFromArray(threejsContainerObj.matrix, rootModelViewMatrix);
        }

        customMaterials.update();

        // only render the scene if the projection matrix is initialized
        if (isProjectionMatrixSet) {
            renderer.render( scene, camera );
        }

        requestAnimationFrame(renderScene);
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
        console.log('loading occlusion gltf');
        gltfLoader.load(pathToGltf, function(gltf) {
            let geometry;
            if (gltf.scene.children[0].geometry) {
                geometry = gltf.scene.children[0].geometry;
            } else {
                const geometries = gltf.scene.children[0].children.map(child=>child.geometry);
                geometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
            }

            // SimplifyModifier seems to freeze app
            // if (geometry.index) {
            //     geometry = new SimplifyModifier().modify(geometry, geometry.index.count * 0.2);
            // } else {
            //     geometry = new SimplifyModifier().modify(geometry, geometry.attributes.position.count * 0.2);
            // }
            geometry.computeVertexNormals();
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

    function isOcclusionActive(objectId) {
        return !!worldOcclusionObjects[objectId];
    }

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
                color: 0x00ffff,
            }), maxHeight, center, true, true);

            if (gltf.scene.children[0].geometry) {
                if (typeof maxHeight !== 'undefined') {
                    gltf.scene.children[0].material = customMaterials.areaTargetMaterialWithTextureAndHeight(gltf.scene.children[0].material, maxHeight, center, true);
                }
                gltf.scene.children[0].geometry.computeVertexNormals();
                gltf.scene.children[0].geometry.computeBoundingBox();
                wireMesh = new THREE.Mesh(gltf.scene.children[0].geometry, wireMaterial);
            } else {
                gltf.scene.children[0].children.forEach(child => {
                    if (typeof maxHeight !== 'undefined') {
                        child.material = customMaterials.areaTargetMaterialWithTextureAndHeight(child.material, maxHeight, center, true);
                    }
                });
                const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(gltf.scene.children[0].children.map(child=>child.geometry));
                mergedGeometry.computeVertexNormals();
                mergedGeometry.computeBoundingBox();
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
              callback(gltf.scene);
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
    function getRaycastIntersects(clientX, clientY, objectsToCheck) {
        mouse.x = ( clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( clientY / window.innerHeight ) * 2 + 1;

        //2. set the picking ray from the camera position and mouse coordinates
        raycaster.setFromCamera( mouse, camera );

        //3. compute intersections
        return raycaster.intersectObjects( objectsToCheck || scene.children, true );
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

    class CustomMaterials {
        constructor() {
            this.materialsToAnimate = [];
            this.lastUpdate = -1;
        }
        areaTargetVertexShader(center) {
            return THREE.ShaderChunk.meshphysical_vert
                .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
    vPosition = position;
    len = length(vPosition - vec3(${center.x}, ${center.y}, ${center.z}));
    vWorldPosition = (modelMatrix * vec4( transformed, 1.0 )).xyz;`).replace('#include <common>', `#include <common>
    varying vec3 vPosition;
    varying float len;
    varying vec3 vWorldPosition;`);

            /*`
            #define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}
          `*/
        }
        areaTargetFragmentShader(inverted) {
            let condition = 'if (len > maxHeight) discard;';
            if (inverted) {
                condition = 'if (len < maxHeight || len > (maxHeight + 8.0) / 2.0) discard;';
            }
            // let condition = 'if (vPosition.y > maxHeight) discard;';
            // if (inverted) {
            //     condition = 'if (vPosition.y < maxHeight) discard;';
            // }
            return `
#define STANDARD
#ifdef PHYSICAL
	#define REFLECTIVITY
	#define CLEARCOAT
	#define TRANSMISSION
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
uniform float maxHeight;
#ifdef TRANSMISSION
	uniform float transmission;
#endif
#ifdef REFLECTIVITY
	uniform float reflectivity;
#endif
#ifdef CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheen;
#endif
varying vec3 vWorldPosition;
varying vec3 vPosition;
varying float len;
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <transmissionmap_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
    ${condition}
    // if (maxHeight > 0.5) discard;
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#ifdef TRANSMISSION
		float totalTransmission = transmission;
	#endif
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <transmissionmap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#ifdef TRANSMISSION
		diffuseColor.a *= mix( saturate( 1. - totalTransmission + linearToRelativeLuminance( reflectedLight.directSpecular + reflectedLight.indirectSpecular ) ), 1.0, metalness );
	#endif
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}
          `
        }
        areaTargetMaterialWithTextureAndHeight(sourceMaterial, maxHeight, center, animateOnLoad, inverted) {
            let material = sourceMaterial.clone();
            console.log(material);
            material.uniforms = THREE.UniformsUtils.merge([
                THREE.ShaderLib.standard.uniforms,
                {
                    maxHeight: {value: maxHeight},
                }
            ]);

            material.vertexShader = this.areaTargetVertexShader(center);
            material.fragmentShader = this.areaTargetFragmentShader(inverted);

            if (animateOnLoad) {
                this.materialsToAnimate.push({
                    material: material,
                    currentHeight: -10, // -maxHeight,
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

    exports.initService = initService;
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
    exports.setMatrixFromArray = setMatrixFromArray;
    exports.THREE = THREE;
    exports.FBXLoader = FBXLoader;
    exports.GLTFLoader = GLTFLoader;
})(realityEditor.gui.threejsScene);
