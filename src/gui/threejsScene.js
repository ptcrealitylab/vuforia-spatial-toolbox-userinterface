createNameSpace("realityEditor.gui.threejsScene");

// three.js libraries are loaded from a CDN since we don't currently use a build system for the userinterface
import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader }  from 'https://unpkg.com/three@0.126.1/src/loaders/TextureLoader.js'
import { MeshStandardMaterial}  from 'https://unpkg.com/three@0.126.1/src/materials/MeshStandardMaterial.js';
import { BufferGeometryUtils } from 'https://unpkg.com/three@0.126.1/examples/jsm/utils/BufferGeometryUtils.js';
// import { SceneUtils }  from 'https://unpkg.com/three@0.126.1/examples/jsm/utils/SceneUtils.js';

let DEBUG_CEILING_HEIGHT = 2.3;

(function(exports) {

    var camera, scene, renderer;
    var rendererWidth = window.innerWidth;
    var rendererHeight = window.innerHeight;
    var aspectRatio = rendererWidth / rendererHeight;
    var isProjectionMatrixSet = false;
    const animationCallbacks = [];
    let lastFrameTime = Date.now();
    
    const DISPLAY_ORIGIN_BOX = false;
    
    let thisMaterial = null;

    // for now, everything gets added to this and then this moves based on the modelview matrix of the world origin
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

        // create a parent 3D object to contain all the three js objects
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
        
        if (DISPLAY_ORIGIN_BOX) {
            const originBox = new THREE.Mesh(new THREE.BoxGeometry(10,10,10),new THREE.MeshNormalMaterial());
            const xBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0xff0000}));
            const yBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0x00ff00}));
            const zBox = new THREE.Mesh(new THREE.BoxGeometry(5,5,5),new THREE.MeshBasicMaterial({color:0x0000ff}));
            xBox.position.x = 15;
            yBox.position.y = 15;
            zBox.position.z = 15;
            threejsContainerObj.add(originBox);
            originBox.scale.set(10,10,10);
            originBox.add(xBox);
            originBox.add(yBox);
            originBox.add(zBox);
            // onAnimationFrame(deltaT => {
            //   originBox.scale.x = 100 * Math.abs(Math.sin(Date.now()/2));
            //   originBox.scale.y = 100 * Math.abs(Math.sin(Date.now()/2));
            //   originBox.scale.z = 100 * Math.abs(Math.sin(Date.now()/2));
            // });
        }

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
        
        if (globalStates.realProjectionMatrix && globalStates.realProjectionMatrix.length > 0) {
            setMatrixFromArray(camera.projectionMatrix, globalStates.realProjectionMatrix);
            isProjectionMatrixSet = true;
        }
        
        // this gets the model view matrix of the world object. ignores the WORLD_local
        let modelViewMatrix = null;
        let worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (worldObject && worldObject.objectId !== realityEditor.worldObjects.getLocalWorldId()) {
            // TODO: modify addToScene to addToAreaTarget and use positions relative to that
            // This also allows for multiple containers with different mvMatrices for each area target
            modelViewMatrix = realityEditor.sceneGraph.getModelViewMatrix(worldObject.objectId);
        }

        // only render the scene if we're localized within a world object and the projection matrix is initialized
        if (isProjectionMatrixSet && modelViewMatrix) {

            // children of the threejsContainerObject can be animated here
            // mesh.rotation.x += 0.25 * deltaT / 1000; // slow rotation, for aesthetic effect
            // mesh.rotation.y += 0.5 * deltaT / 1000;
            
            animationCallbacks.forEach(callback => {
                callback(deltaTime);
            });

            // update model view matrix and render the scene
            setMatrixFromArray(threejsContainerObj.matrix, modelViewMatrix);
            renderer.render( scene, camera );
        }
        
        requestAnimationFrame(renderScene);
        
        if (thisMaterial) {
            const time = performance.now() * 0.0005;
            thisMaterial.uniforms[ "time" ].value = time;
        }
    }
    
    function addToScene(obj) {
      threejsContainerObj.add(obj);
    }
    
    function removeFromScene(obj) {
      threejsContainerObj.remove(obj);
    }
    
    function onAnimationFrame(callback) {
      animationCallbacks.push(callback);
    }
    
    function removeAnimationCallback(callback) {
      if (animationCallbacks.includes(callback)) {
        animationCallbacks.splice(animationCallbacks.indexOf(callback), 1);
      }
    }

    function vertexShader() {
        return `
        varying vec3 vUv; 
    
        void main() {
          vUv = position; 
    
          vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * modelViewPosition; 
        }
      `
    }
    
    //             gl_FragColor = vec4(mix(colorA, colorB, vUv.y), 1.0);
    function fragmentShader() {
        return `
          uniform vec3 colorA; 
          uniform vec3 colorB;
          uniform float maxHeight;
          uniform sampler2D benTexture;
          varying vec3 vUv;
    
          void main() {
            gl_FragColor = vec4(mix(colorA, colorB, vUv.y), 1.0);
             
            if (vUv.y > maxHeight)
              discard;
          }
      `
    }

    function simpleVertexShader() {
        return `
        varying vec3 vUv; 
    
        void main() {
          vUv = position; 
    
          vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * modelViewPosition; 
        }
      `
    }

    function simpleFragmentShader() {
        return `
          uniform sampler2D textureSampler;
          varying vec3 vUv;
    
          void main() {
            gl_FragColor = texture2D(textureSampler, vUv);
          }
      `
    }

    function createMaterial(sourceTexture) {
        // create a texture loader.
        const textureLoader = new TextureLoader();

        // load a texture
        const texture = textureLoader.load(
            '/png/blue.png',
        );

        // create a "standard" material using
        // the texture we just loaded as a color map
        const material = new MeshStandardMaterial({
            map: sourceTexture,
        });

        // return material;

        // return new THREE.RawShaderMaterial( {
        //     uniforms: {
        //         "map": { value: texture },
        //         "time": { value: 0.0 },
        //         "colorB": {type: 'vec3', value: new THREE.Color(0xACB6E5)},
        //         "colorA": {type: 'vec3', value: new THREE.Color(0x74ebd5)},
        //         "maxHeight": {value: DEBUG_CEILING_HEIGHT}
        //     },
        //     vertexShader: simpleVertexShader(), //document.getElementById( 'vshader' ).textContent,
        //     fragmentShader: fragmentShader(), //document.getElementById( 'fshader' ).textContent,
        //     depthTest: true,
        //     depthWrite: true
        // } );

        // return new THREE.RawShaderMaterial({
        //     uniforms: {
        //         // benTexture: {type: 't', value: THREE.ImageUtils.loadTexture(image)},
        //         colorB: {type: 'vec3', value: new THREE.Color(0xACB6E5)},
        //         colorA: {type: 'vec3', value: new THREE.Color(0x74ebd5)},
        //         maxHeight: {value: DEBUG_CEILING_HEIGHT},
        //         map: { value: texture },
        //         time: { value: 0.0 },
        //     },
        //     vertexShader: document.getElementById( 'vshader' ).textContent, //simpleVertexShader(),
        //     fragmentShader: document.getElementById( 'fshader' ).textContent //fragmentShader()
        // });
        
        // if (!thisMaterial) {
        //    
        //     // this works, blue stripes animate over time
        //     // thisMaterial = new THREE.RawShaderMaterial({
        //     //
        //     //     uniforms: {
        //     //         "time": {value: 1.0},
        //     //         "sineTime": {value: 1.0}
        //     //     },
        //     //     vertexShader: document.getElementById('vertexShader').textContent,
        //     //     fragmentShader: document.getElementById('fragmentShader').textContent,
        //     //     side: THREE.DoubleSide,
        //     //     transparent: true
        //     //
        //     // });
        //
        //     thisMaterial = new THREE.RawShaderMaterial({
        //
        //         uniforms: {
        //             "time": {value: 1.0},
        //             "sineTime": {value: 1.0},
        //             "map": { value: sourceTexture }
        //         },
        //         vertexShader: document.getElementById('vertexShader').textContent,
        //         fragmentShader: document.getElementById('fshader').textContent,
        //         side: THREE.DoubleSide,
        //         transparent: true
        //
        //     });
        // }
        //
        // return thisMaterial;
        
        return new THREE.RawShaderMaterial({

            uniforms: {
                "time": {value: 1.0},
                "sineTime": {value: 1.0},
                "map": { value: sourceTexture },
                "maxHeight": {value: DEBUG_CEILING_HEIGHT}
            },
            vertexShader: document.getElementById('vertexShader').textContent,
            fragmentShader: document.getElementById('fshader').textContent,
            side: THREE.DoubleSide,
            transparent: true

        });
    }

    /* For my example area target:
        pathToGltf = './svg/BenApt1_authoring.glb' // put in arbitrary local directory to test
        originOffset = {x: -600, y: 0, z: -3300};
        originRotation = {x: 0, y: 2.661627109291353, z: 0};
     */
    function addGltfToScene(pathToGltf, originOffset, originRotation) {
        const gltfLoader = new GLTFLoader();
        
        let lastMaterial = null;

        gltfLoader.load(pathToGltf, function(gltf) {
            
            if (gltf.scene.children[0].geometry) {
                // gltf.scene.children[0].material = new THREE.MeshStandardMaterial( { color: 0xaaaaaa } );
                gltf.scene.children[0].geometry.computeVertexNormals();
                gltf.scene.children[0].geometry.computeBoundingBox();
            } else {
                let uniforms = {
                    colorB: {type: 'vec3', value: new THREE.Color(0xACB6E5)},
                    colorA: {type: 'vec3', value: new THREE.Color(0x74ebd5)},
                    maxHeight: {value: DEBUG_CEILING_HEIGHT}
                };
                let customMaterial =  new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    fragmentShader: fragmentShader(),
                    vertexShader: vertexShader(),
                });

                // var loader = new THREE.TextureLoader;
                // let image = loader.load('/png/blue.png');

                gltf.scene.children[0].children.forEach(child => {
                    // child.material = new THREE.MeshBasicMaterial( {color: new THREE.Color(Math.random(), Math.random(), Math.random()) }); //, side: THREE.BackSide })

                    // let image = child.material.map;
                    //
                    // // const texture = new THREE.CanvasTexture( imageBitmap );
                    // // const material = new THREE.MeshBasicMaterial( { map: texture } );
                    //
                    // // var creatureImage = textureLoader.load('texture.png');
                    // // creatureImage.magFilter = THREE.NearestFilter;
                    //
                    // var mat = new THREE.ShaderMaterial({
                    //     uniforms: {
                    //         benTexture: {type: 't', value: THREE.ImageUtils.loadTexture(image)},
                    //         colorB: {type: 'vec3', value: new THREE.Color(0xACB6E5)},
                    //         colorA: {type: 'vec3', value: new THREE.Color(0x74ebd5)},
                    //         maxHeight: {value: DEBUG_CEILING_HEIGHT}
                    //     },
                    //     vertexShader: simpleVertexShader(),
                    //     fragmentShader: fragmentShader()
                    // });
                    // // THREE.UniformsUtils.merge() call THREE.clone() on
                    // // each uniform. We don't want our texture to be
                    // // duplicated, so I assign it to the uniform value
                    // // right here.
                    // // mat.uniforms.textureSampler.value = texture;
                    //
                    // // mat.uniforms.textureSampler.value = image;
                    //
                    // // var _material = new THREE.ShaderMaterial({
                    // //     fragmentShader: simpleFragmentShader(),
                    // //     vertexShader: simpleVertexShader(),
                    // //     uniforms: {
                    // //         colorB: {type: 'vec3', value: new THREE.Color(0xACB6E5)},
                    // //         colorA: {type: 'vec3', value: new THREE.Color(0x74ebd5)},
                    // //         maxHeight: {value: DEBUG_CEILING_HEIGHT},
                    // //         // texture: {type: "t", value: image},
                    // //         map: texture
                    // //     }
                    // // });
                    // child.material = mat;
                    
                    
                    child.material = createMaterial(child.material.map);
                    
                    // lastMaterial = child.material;
                });
                // const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(gltf.scene.children[0].children.map(child=>child.geometry));
                // mergedGeometry.computeVertexNormals();
                // mergedGeometry.computeBoundingBox();
                
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

            // setTimeout(function() {
            //     // Force shaders to be built
            //     renderer.compile(scene, camera);
            //
            //     // Get the GL context:
            //     const gl = renderer.getContext();
            //
            //     // Print the shader source!
            //     console.log(
            //         gl.getShaderSource(lastMaterial.program.fragmentShader)
            //     );
            // }, 1000);

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
    exports.addGltfToScene = addGltfToScene;
    exports.onAnimationFrame = onAnimationFrame;
    exports.removeAnimationCallback = removeAnimationCallback;
    exports.addToScene = addToScene;
    exports.removeFromScene = removeFromScene;
    exports.THREE = THREE;
})(realityEditor.gui.threejsScene);
