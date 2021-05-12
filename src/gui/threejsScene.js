createNameSpace("realityEditor.gui.threejsScene");

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { GLTFLoader } from '../../thirdPartyCode/three/GLTFLoader.module.js';
import { TextureLoader }  from 'https://unpkg.com/three@0.126.1/src/loaders/TextureLoader.js'
import { MeshStandardMaterial }  from 'https://unpkg.com/three@0.126.1/src/materials/MeshStandardMaterial.js';
import { BufferGeometryUtils } from '../../thirdPartyCode/three/BufferGeometryUtils.module.js';
// import { SimplifyModifier } from '../../thirdPartyCode/three/SimplifyModifier.module.js';

let maxCeilingHeight = 2.3;
window.DEBUG_CEILING_HEIGHT = 0;

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
    
    const DISPLAY_ORIGIN_BOX = false;
    
    let thisMaterial = null;
    
    let materialPointers = [];

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

        renderScene(); // update loop 
    }

    function renderScene() {
        const deltaTime = Date.now() - lastFrameTime; // In ms
        lastFrameTime = Date.now();
        
        animationCallbacks.forEach(callback => {
            callback(deltaTime);
        });
        
        if (globalStates.realProjectionMatrix && globalStates.realProjectionMatrix.length > 0) {
            setMatrixFromArray(camera.projectionMatrix, globalStates.realProjectionMatrix);
            isProjectionMatrixSet = true;
        }
        
        const worldObjectIds = realityEditor.worldObjects.getWorldObjectKeys();
        worldObjectIds.forEach(worldObjectId => {
            if (!worldObjectGroups[worldObjectId]) {
                const group = new THREE.Group();
                worldObjectGroups[worldObjectId] = group;
                group.matrixAutoUpdate = false; // this is needed to position it directly with matrices
                scene.add(group);
                
                // Helps visualize world object origin point for debugging
                if (DISPLAY_ORIGIN_BOX && worldObjectId !== realityEditor.worldObjects.getLocalWorldId()) {
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
        
        // only render the scene if the projection matrix is initialized
        if (isProjectionMatrixSet) {
            renderer.render( scene, camera );
        }
        
        requestAnimationFrame(renderScene);
        
        if (thisMaterial) {
            const time = performance.now() * 0.0005;
            thisMaterial.uniforms[ "time" ].value = time;
        }
        
        materialPointers.forEach(function(mat) {
            if (window.DEBUG_CEILING_HEIGHT < maxCeilingHeight) {
                window.DEBUG_CEILING_HEIGHT += 0.0001;
                mat.uniforms[ "maxHeight" ].value = window.DEBUG_CEILING_HEIGHT;
            }
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

    function vertexShader() {
        return `
        precision highp float;

        uniform float sineTime;
        uniform float time;
        
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        
        attribute vec3 position;
        attribute vec3 offset;
        attribute vec4 color;
        attribute vec4 orientationStart;
        attribute vec4 orientationEnd;
        attribute vec3 translate;
        attribute vec2 uv;
        
        varying vec3 vPosition;
        varying vec4 vColor;
        varying float vScale;
        varying vec2 vUv;
        
        void main(){
        
            vPosition = offset * max( abs( sineTime * 2.0 + 1.0 ), 0.5 ) + position;
            vec4 orientation = normalize( mix( orientationStart, orientationEnd, sineTime ) );
            vec3 vcV = cross( orientation.xyz, vPosition );
            vPosition = vcV * ( 2.0 * orientation.w ) + ( cross( orientation.xyz, vcV ) * 2.0 + vPosition );
        
            vec3 trTime = vec3(translate.x + time,translate.y + time,translate.z + time);
            float scale =  sin( trTime.x * 2.1 ) + sin( trTime.y * 3.2 ) + sin( trTime.z * 4.3 );
            vScale = scale;
        
            vColor = color;
            vUv = uv;
        
            gl_Position = projectionMatrix * modelViewMatrix * vec4( vPosition, 1.0 );
        
        }
      `
    }
    
    function fragmentShader() {
        return `
        precision highp float;
        
        uniform sampler2D map;
        uniform float maxHeight;
        
        varying vec2 vUv;
        varying float vScale;
        varying vec3 vPosition;
        
        void main() {
            gl_FragColor = texture2D( map, vUv );
            
            if (vPosition.y > maxHeight) discard;
        }
      `
    }

    function createMaterial(sourceTexture) {
        return new THREE.RawShaderMaterial({
            uniforms: {
                "time": {value: 1.0},
                "sineTime": {value: 1.0},
                "map": { value: sourceTexture },
                "maxHeight": {value: window.DEBUG_CEILING_HEIGHT}
            },
            vertexShader: vertexShader(),
            fragmentShader: fragmentShader(),
            side: THREE.FrontSide
        });
    }
    
    /* For my example area target:
        pathToGltf = './svg/BenApt1_authoring.glb' // put in arbitrary local directory to test
        originOffset = {x: -600, y: 0, z: -3300};
        originRotation = {x: 0, y: 2.661627109291353, z: 0};
     */
    function addGltfToScene(pathToGltf, originOffset, originRotation) {
        const gltfLoader = new GLTFLoader();
        
        gltfLoader.load(pathToGltf, function(gltf) {
            
            if (gltf.scene.children[0].geometry) {
                gltf.scene.children[0].material = createMaterial(gltf.scene.children[0].material.map);
                gltf.scene.children[0].geometry.computeVertexNormals();
                gltf.scene.children[0].geometry.computeBoundingBox();
            } else {
                gltf.scene.children[0].children.forEach(child => {
                    child.material = createMaterial(child.material.map);
                    materialPointers.push(child.material);
                });
                const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(gltf.scene.children[0].children.map(child=>child.geometry));
                mergedGeometry.computeVertexNormals();
                mergedGeometry.computeBoundingBox();
            }

            // align the coordinate systems
            gltf.scene.scale.set(1000, 1000, 1000); // convert meters -> mm
            if (typeof originOffset !== 'undefined') {
                gltf.scene.position.set(originOffset.x, originOffset.y, originOffset.z);
            }
            if (typeof originRotation !== 'undefined') {
                gltf.scene.rotation.set(originRotation.x, originRotation.y, originRotation.z);
            }

            threejsContainerObj.add( gltf.scene );

            console.log('loaded gltf', pathToGltf);
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
    
    // /////////////////////////////////////////////////////////
    // // Generates custom shader using an updatable
    // // dynamic texture generated programmatically
    // //
    // /////////////////////////////////////////////////////////
    // function createShader (options) {
    //
    //     // Vertex Shader code
    //     const vertexShader = options.vertexShader || `
    //   attribute float pointSize;
    //   attribute vec4 color;
    //   varying vec4 vColor;
    //   void main() {
    //     vec4 vPosition = modelViewMatrix * vec4(position, 1.0);
    //     gl_Position = projectionMatrix * vPosition;
    //     gl_PointSize = pointSize;
    //     vColor = color;
    //   }
    // `
    //
    //     // Fragment Shader code
    //     const fragmentShader = options.fragmentShader || `
    //   uniform sampler2D texture;
    //   varying vec4 vColor;
    //   void main() {
    //     vec4 tex = texture2D(texture, gl_PointCoord);
    //     if (tex.a < 0.2) discard;
    //     if (vColor.a == 0.0) {
    //       gl_FragColor = vec4(tex.r, tex.g, tex.b, tex.a);
    //     } else {
    //       gl_FragColor = vColor;
    //     }
    //   }
    // `
    //
    //     const tex = options.texture || defaultTex
    //
    //     // Shader material parameters
    //     const shaderParams = options.shaderParams || {
    //         side: THREE.DoubleSide,
    //         depthWrite: false,
    //         depthTest: false,
    //         fragmentShader,
    //         vertexShader,
    //         opacity: 0.5,
    //         attributes: {
    //             pointSize: {
    //                 type: 'f',
    //                 value: []
    //             },
    //             color: {
    //                 type: 'v4',
    //                 value: []
    //             }
    //         },
    //         uniforms: {
    //             texture: {
    //                 value: THREE.ImageUtils.loadTexture(tex),
    //                 type: 't'
    //             }
    //         }
    //     }
    //
    //     // creates shader material
    //     const material =
    //         new THREE.ShaderMaterial(
    //             shaderParams)
    //
    //     const generateCanvasTexture = () => {
    //
    //         const canvas = document.createElement("canvas")
    //         const ctx = canvas.getContext('2d')
    //
    //         ctx.font = '20pt Arial'
    //         ctx.textAlign = 'center'
    //         ctx.textBaseline = 'middle'
    //         ctx.fillText(new Date().toLocaleString(),
    //             canvas.width / 2, canvas.height / 2)
    //
    //         const canvasTexture = new THREE.Texture(canvas)
    //
    //         canvasTexture.needsUpdate = true
    //         canvasTexture.flipX = false
    //         canvasTexture.flipY = false
    //
    //         return canvasTexture
    //     }
    //
    //     const stopwatch = new Stopwatch()
    //
    //     let radius = 0.0
    //
    //     return {
    //         setTexture: (tex) => {
    //
    //             const {texture} = shaderParams.uniforms
    //
    //             texture.value = THREE.ImageUtils.loadTexture(tex)
    //
    //             texture.needsUpdate = true
    //
    //         },
    //         update: () => {
    //
    //             const dt = stopwatch.getElapsedMs() * 0.001
    //
    //             radius += dt * 0.25
    //
    //             radius = radius > 0.5 ? 0.0 : radius
    //
    //             const {texture} = shaderParams.uniforms
    //
    //             texture.value = generateCanvasTexture();
    //
    //             texture.needsUpdate = true
    //
    //         },
    //         material
    //     }
    // }

    exports.initService = initService;
    exports.addOcclusionGltf = addOcclusionGltf;
    exports.isOcclusionActive = isOcclusionActive;
    exports.addGltfToScene = addGltfToScene;
    exports.onAnimationFrame = onAnimationFrame;
    exports.removeAnimationCallback = removeAnimationCallback;
    exports.addToScene = addToScene;
    exports.removeFromScene = removeFromScene;
    exports.THREE = THREE;
})(realityEditor.gui.threejsScene);
