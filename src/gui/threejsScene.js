createNameSpace("realityEditor.gui.threejsScene");

import * as THREE from 'https://unpkg.com/three@0.126.1/build/three.module.js';
import { SceneUtils }  from 'https://unpkg.com/three@0.126.1/examples/jsm/utils/SceneUtils.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.126.1/examples/jsm/loaders/GLTFLoader.js';
import { BufferGeometryUtils } from 'https://unpkg.com/three@0.126.1/examples/jsm/utils/BufferGeometryUtils.js';

(function(exports) {

    var camera, scene, renderer;

    // for now, everything gets added to this and then this moves based on the modelview matrix of the world origin
    // todo: in future, move three.js camera instead of scene
    var threejsContainerObj;

    var isProjectionMatrixSet = false;

    var rendererWidth = window.innerWidth;
    var rendererHeight = window.innerHeight;
    var aspectRatio = rendererWidth / rendererHeight;

    // let originOffset = {x: -600, y: 0, z: -3300};
    // let originRotation = {x: 0, y: 2.661627109291353, z: 0};

    function initService() {
        console.log('threejsScene initialized');
        // return;

        // create a fullscreen webgl renderer for the threejs content and add to the dom
        renderer = new THREE.WebGLRenderer( { alpha: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( rendererWidth, rendererHeight );
        renderer.domElement.id = 'mainThreejsCanvas';
        document.body.appendChild( renderer.domElement );

        // create a threejs camera and scene
        camera = new THREE.PerspectiveCamera( 70, aspectRatio, 1, 1000 );
        scene = new THREE.Scene();

        // create a parent 3D object to contain all the three js objects
        // we can apply the marker transform to this object and all of its
        // children objects will be affected
        threejsContainerObj = new THREE.Object3D();
        threejsContainerObj.matrixAutoUpdate = false;
        scene.add(threejsContainerObj);

        // light the scene with a combination of ambient and directional white light
        var ambLight = new THREE.AmbientLight(0x404040);
        scene.add(ambLight);
        var dirLight1 = new THREE.DirectionalLight(0xffffff, 1);
        dirLight1.position.set(100, 100, 100);
        scene.add(dirLight1);
        var dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
        dirLight2.position.set(-100, -100, -100);
        scene.add(dirLight2);

        var dirLight3 = new THREE.DirectionalLight(0xffffff, 1);
        dirLight3.position.set(-10, -10, 1000);
        scene.add(dirLight3);

        // add an icosahedron 3d model to the container object 
        // var radius = 75;
        // var geometry = new THREE.IcosahedronGeometry( radius, 1 );
        // var materials = [
        //     new THREE.MeshPhongMaterial( { color: 0xffffff, shading: THREE.FlatShading, vertexColors: THREE.VertexColors, shininess: 0 } ),
        //     new THREE.MeshBasicMaterial( { color: 0x000000, shading: THREE.FlatShading, wireframe: true, transparent: true } )
        // ];
        // mesh = SceneUtils.createMultiMaterialObject( geometry, materials );
        // threejsContainerObj.add( mesh );
        // mesh.position.setZ(150);

        // add spotlight for the shadows
        var spotLight = new THREE.SpotLight(0xffffff);
        spotLight.position.set(-30, -30, 150);
        spotLight.castShadow = true;
        scene.add(spotLight);


        // whenever we receive new matrices from the editor, update the 3d scene
        // realityInterface.addMatrixListener(renderScene);
        
        renderScene();
    }

    function setMatrixFromArray(matrix, array) {
        matrix.set( array[0], array[4], array[8], array[12],
            array[1], array[5], array[9], array[13],
            array[2], array[6], array[10], array[14],
            array[3], array[7], array[11], array[15]
        );
    }

    function renderScene() {
        // only set the projection matrix for the camera 1 time, since it stays the same
        if (!isProjectionMatrixSet && globalStates.realProjectionMatrix && globalStates.realProjectionMatrix.length > 0) {
            setMatrixFromArray(camera.projectionMatrix, globalStates.realProjectionMatrix);
            isProjectionMatrixSet = true;
        }
        
        // this gets the model view matrix of the world object. ignores the WORLD_local
        let modelViewMatrix = null;
        let worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (worldObject && worldObject.objectId !== realityEditor.worldObjects.getLocalWorldId()) {
            modelViewMatrix = realityEditor.sceneGraph.getModelViewMatrix(worldObject.objectId);
        }

        // only render the scene if we're localized within a world object and the projection matrix is initialized
        if (isProjectionMatrixSet && modelViewMatrix) {
            
            // let camPos = realityEditor.sceneGraph.getWorldPosition('CAMERA');
            // camera.position.set(camPos.x, -camPos.y, camPos.z); // Set position like this
            // camera.lookAt(new THREE.Vector3(0,0,0)); // Set look at coordinate like this

            // update models with newest values from the reality editor
            // mesh.children[0].material.color.setHSL( hue, saturation, lightness );
            // mesh.rotation.x += 0.005; // slow rotation, for aesthetic effect
            // mesh.rotation.y += 0.01;
            // update model view matrix
            setMatrixFromArray(threejsContainerObj.matrix, modelViewMatrix);
            // render the scene
            threejsContainerObj.visible = true;
            renderer.render( scene, camera );
        }
        
        requestAnimationFrame(renderScene);
    }
    
    /* For my example area target:
        pathToGltf = './svg/BenApt1_authoring.glb'
        originOffset = {x: -600, y: 0, z: -3300};
        originRotation = {x: 0, y: 2.661627109291353, z: 0};
     */
    function addGltfToScene(pathToGltf, originOffset, originRotation) {

        const gltfLoader = new GLTFLoader();
        // gltfLoader.load('./svg/apt_navmesh.glb', function(gltf) {
        // gltfLoader.load('./svg/Ben.glb', function(gltf) {
        // gltfLoader.load('./svg/BenApt1_authoring.glb', function(gltf) {
        gltfLoader.load(pathToGltf, function(gltf) {

            // var newMaterial = new THREE.MeshStandardMaterial({color: 0xff0000});
            // let newMaterial = new THREE.MeshBasicMaterial({ map: gltf.texture, side: THREE.DoubleSide });
            // model.traverse((o) => {
            //     if (o.isMesh) o.material = newMaterial;
            // });

            if (gltf.scene.children[0].geometry) {
                // gltf.scene.children[0].material = new THREE.MeshStandardMaterial( { color: 0xaaaaaa, side: THREE.BackSide } );
                // gltf.scene.children[0].material.side = THREE.BackSide;
                gltf.scene.children[0].geometry.computeVertexNormals();
                gltf.scene.children[0].geometry.computeBoundingBox();
                // getXZHeatmap(gltf.scene.children[0].geometry, heatmapResolution);
            } else {
                gltf.scene.children[0].children.forEach(child => {
                    child.material = new THREE.MeshBasicMaterial( {color: new THREE.Color(Math.random(), Math.random(), Math.random()) }); //, side: THREE.BackSide })
                });
                const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(gltf.scene.children[0].children.map(child=>child.geometry));
                mergedGeometry.computeVertexNormals();
                mergedGeometry.computeBoundingBox();
                // getXZHeatmap(mergedGeometry, heatmapResolution);
            }

            // gltf.scene.traverse( function ( child ) {
            //     console.log('child');
            //     if ( child.isMesh ) {
            //         // TOFIX RoughnessMipmapper seems to be broken with WebGL 2.0
            //         // roughnessMipmapper.generateMipmaps( child.material );
            //        
            //         // child.material = newMaterial;
            //         // child.material.side = THREE.DoubleSide;
            //         child.material.side = THREE.BackSide;
            //
            //         // child.geometry.computeBoundingBox();
            //         // console.log(child.geometry.boundingBox.min.z, child.geometry.boundingBox.max.z);
            //         //
            //         // for (let i = child.geometry.vertices.length-1; i >= 0; i--) {
            //         //     if (Math.random() > 0.75) {
            //         //         child.geometry.vertices.splice(i, 1);
            //         //     }
            //         // }
            //         // child.geometry.vertices.forEach(function(vertex, i) {
            //         //    
            //         // });
            //
            //         // if (child.geometry.boundingBox.min.z < -3) {
            //         // if (Math.random() > 0.5) {
            //         //     child.geometry.dispose();
            //         //     child.material.dispose();
            //         //     gltf.scene.remove(child);
            //         //     console.log('removed child');
            //         // } else {
            //         //     // console.log('saved child');
            //         // }
            //         //
            //         // child.geometry.verticesNeedUpdate = true;
            //     }
            // });

            gltf.scene.scale.set(1000, 1000, 1000); // meters -> mm
            gltf.scene.position.set(originOffset.x, originOffset.y, originOffset.z);
            gltf.scene.rotation.set(originRotation.x, originRotation.y, originRotation.z);

            // gltf.scene.rotation.y = Math.PI;
            // gltf.scene.rotation.set(new THREE.Vector3( 0, 0, Math.PI / 2));

            threejsContainerObj.add( gltf.scene );

            // roughnessMipmapper.dispose();

            // render();

            console.log('loaded gltf', gltf);
        });
    }

    exports.initService = initService;
})(realityEditor.gui.threejsScene);
