createNameSpace("realityEditor.app.pathfinding");

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { MeshLine, MeshLineMaterial } from "../../thirdPartyCode/three/THREE.MeshLine.js";

(function(exports) {
    
    let mapData, steepnessMapData, heightMapData;
    let MIN_STEEPNESS = 0, MAX_STEEPNESS = 25; // slope / tangent of mesh vertex, in degrees
    
    function initService(map, steepnessMap, heightMap) {
        size = 1 / realityEditor.app.targetDownloader.getNavmeshResolution();
        
        mapData = map;
        steepnessMapData = steepnessMap;
        heightMapData = heightMap;
        
        setupEventListener();

        return buildMeshFromMapData();
    }
    
    function setupEventListener() {
        realityEditor.network.addPostMessageHandler('measureAppSetPathPoint', (evt) => {
            if (evt.point === undefined) return;
            if (evt.type === 'start') {
                resetStartAndEndIndices();
                worldPosToNavmeshIndex(new THREE.Vector3(evt.point[0], evt.point[1], evt.point[2]));
            } else if (evt.type === 'end') {
                worldPosToNavmeshIndex(new THREE.Vector3(evt.point[0], evt.point[1], evt.point[2]));
                findPath();
                // findPath().then((result) => {
                //     buildPath(result);
                // }).catch((error) => {
                //     console.log(`%c ${error}`, 'color: red');
                // });
            }
        });
    }

    const vertexShader = `
        attribute vec3 color;
        varying vec3 vColor;
        
        void main() {
            vColor = color;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        }
    `;
    
    const fragmentShader = `
        varying vec3 vColor;
        
        void main() {
            gl_FragColor = vec4(vColor, 1.);
        }
    `;

    const CYAN = new THREE.Vector3(0, 1, 1); // map START quad color
    const ORANGE = new THREE.Vector3(1, 0.5, 0); // map END quad color
    const BLACK = new THREE.Vector3(0, 0, 0);
    const WHITE = new THREE.Vector3(1, 1, 1);

    let start = {}, end = {};
    
    let size = null; // 1 meter / (# of pixels per meter, set in navmeshWorker.js)
    let index = 0;
    let posArr = [];
    let indices = [];
    let colArr = [];
    let posAttri, colAttri;

    function ijToIndex(i, j) {
        return (i + j * mapData[0].length) * 4;
    }

    function _indexToIJ(index) {
        index = Math.floor(index / 4);
        let j = Math.floor(index / mapData[0].length);
        let i = index - j * mapData[0].length;
        return {i, j};
    }
    
    function buildMeshFromMapData() {
        // populate the posArr
        for (let j = 0; j < mapData.length; j++) { // j --- quads in a column
            for (let i = 0; i < mapData[0].length; i++) { // i --- quads in a row
                // buildQuad(i * size, 0, j * size, size);
                // if (mapData[j][i] === 1) { // walkable area
                if (mapData[j][i] !== 0) { // walkable area, todo Steve: switch to count map to see what happens
                    buildQuad(j * size, 0, i * size, size, index, true);
                } else { // un-walkable area
                    buildQuad(j * size, 0, i * size, size, index, false);
                }
                index += 4; // increment 4 to the next set of indices
            }
        }
    
        // build the geometry -- walkable area
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(indices);
        posAttri = new THREE.BufferAttribute( new Float32Array(posArr), 3 );
        colAttri = new THREE.BufferAttribute( new Float32Array(colArr), 3 );
        geometry.setAttribute( 'position', posAttri );
        geometry.setAttribute( 'color', colAttri );
        // geometry.translate(-mapData[0].length * size / 2, 0, -mapData.length * size / 2);
        // geometry.translate(-mapData.length * size / 2, 0, -mapData[0].length * size / 2);
        // todo Steve: find the origin point of the area target mesh point
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader
        });
        const mesh = new THREE.Mesh( geometry, material );
        // mesh.position.set(-mapData[0].length * size / 2, 0, -mapData.length * size / 2);
        return mesh;
    }
    
    function buildQuad(x, y, z, size, index, isWalkable) { // (x, y, z) --- top left corner of the quad, size --- side length of the quad
        posArr.push(x, y, z);
        posArr.push(x, y, z + size);
        posArr.push(x + size, y, z + size);
        posArr.push(x + size, y, z);
    
        if (isWalkable) {
            colArr.push(WHITE.x, WHITE.y, WHITE.z);
            colArr.push(WHITE.x, WHITE.y, WHITE.z);
            colArr.push(WHITE.x, WHITE.y, WHITE.z);
            colArr.push(WHITE.x, WHITE.y, WHITE.z);
        } else {
            colArr.push(BLACK.x, BLACK.y, BLACK.z);
            colArr.push(BLACK.x, BLACK.y, BLACK.z);
            colArr.push(BLACK.x, BLACK.y, BLACK.z);
            colArr.push(BLACK.x, BLACK.y, BLACK.z);
        }
    
        indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
    }

    function worldPosToNavmeshIndex(pos) { // converts threejsScene.js threeJsContainerObj coords to navmesh index (i, j)
        let ij = threejsContainerObjPositionToIJ(pos);
        let i = ij.i;
        let j = ij.j;
        // console.log(i, j)

        // index in buffer attribute indices array, to change the corresponding mesh color
        let index = ijToIndex(j, i);
        // console.log(index);

        setMapStartOrEndIndices(j, i, index); // j -- z pos, i -- x pos
    }
    
    function resetStartAndEndIndices() {
        start = {};
        end = {};
        isSettingMapStart = true;
        isSettingMapLocked = false;
        indexCount = 0;
    }

    let isSettingMapStart = true; // whether should set map start indices OR end indices
    let isSettingMapLocked = false; // lock the setting map start / end points
    let indexCount = 0;
    function setMapStartOrEndIndices(i, j, index) {
        // console.log(i, j, index);
        if (isSettingMapLocked) return;
        // if (mapData[j][i] === 0 || steepnessMapData[j][i] < MIN_STEEPNESS || steepnessMapData[j][i] > MAX_STEEPNESS) {
        if (steepnessMapData[j][i] < MIN_STEEPNESS || steepnessMapData[j][i] > MAX_STEEPNESS) { // todo Steve: changed for 9/18 demo, only consider steepness map
            console.error('This point is within the un-walkable area. Try to set another point.');
            return;
        }

        indexCount++;
        if (indexCount <= 2) { // the first 2 points are strictly start & end points
            if (indexCount === 1) { // set start point
                start.i = i;
                start.j = j;
                start.index = index;
                start.height = heightMapData[j][i];
                changeMeshColorFromIndex(start.index, CYAN);
                // console.log(`Setting start node: (${start.i}, ${start.j})`);
                // console.log(`This node has height: ${heightMapData[start.j][start.i]}`);
            } else if (indexCount === 2) { // set end point
                end.i = i;
                end.j = j;
                end.index = index;
                end.height = heightMapData[j][i];
                changeMeshColorFromIndex(end.index, ORANGE);
                // console.log(`Setting end node: (${end.i}, ${end.j})`);
                // console.log(`This node has height: ${heightMapData[end.j][end.i]}`);
            }
        } else { // press button to switch from setting start / end points
            if (isSettingMapStart) {
                changeMeshColorFromIndex(start.index, WHITE); // todo Steve: this is assuming we ONLY click on walkable area. Fixed by checking & error when clicking on un-walkable area
                start.i = i;
                start.j = j;
                start.index = index;
                start.height = heightMapData[j][i];
                changeMeshColorFromIndex(start.index, CYAN);
                // console.log(`Setting start node: (${start.i}, ${start.j})`);
                // console.log(`This node has height: ${heightMapData[start.j][start.i]}`);
            } else {
                changeMeshColorFromIndex(end.index, WHITE);
                end.i = i;
                end.j = j;
                end.index = index;
                end.height = heightMapData[j][i];
                changeMeshColorFromIndex(end.index, ORANGE);
                // console.log(`Setting end node: (${end.i}, ${end.j})`);
                // console.log(`This node has height: ${heightMapData[end.j][end.i]}`);
            }
        }
    }

    function changeMeshColorFromIndex(index, color) {
        colAttri.setXYZ(index, color.x, color.y, color.z);
        colAttri.setXYZ(index + 1, color.x, color.y, color.z);
        colAttri.setXYZ(index + 2, color.x, color.y, color.z);
        colAttri.setXYZ(index + 3, color.x, color.y, color.z);
        colAttri.needsUpdate = true;
    }
    
    function _ijToThreejsContainerObjPosition(i, j) {
        let pos = new THREE.Vector3(j * size, 0, i * size);
        pos.multiplyScalar(1000);
        let gltfBoundingBox = realityEditor.gui.threejsScene.getGltfBoundingBox();
        pos.add(new THREE.Vector3(gltfBoundingBox.min.x * 1000, 0, gltfBoundingBox.min.z * 1000));
        pos.y += 50;
        return pos;
    }
    
    function threejsContainerObjPositionToIJ(pos) {
        let gltfBoundingBox = realityEditor.gui.threejsScene.getGltfBoundingBox();
        pos.sub(new THREE.Vector3(gltfBoundingBox.min.x * 1000, 0, gltfBoundingBox.min.z * 1000));
        pos.divideScalar(1000);
        return {i: Math.floor(pos.x / size), j: Math.floor(pos.z / size)};
    }
    
    /* <------------------- anything from here is concerned with pathfinding -----------------------> */
    function computeDistance(a, b) { // if we can take on diagonals, use Chebyshev distance; otherwise, use Manhattan distance instead
        let di = Math.abs(a.i - b.i);
        let dj = Math.abs(a.j - b.j);
        return 14 * Math.min(di, dj) + 10 * Math.abs(di - dj);
    }
    
    function isEqual(a, b) {
        return a.i === b.i && a.j === b.j && a.index === b.index;
    }

    function isDiagonal(parent, current) { // check if current node is the diagonal node of parent
        return (current.i === parent.i - 1 && current.j === parent.j - 1) || (current.i === parent.i + 1 && current.j === parent.j - 1) || (current.i === parent.i - 1 && current.j === parent.j + 1) || (current.i === parent.i + 1 && current.j === parent.j + 1);
    }

    function isNodeInArray(n2, arr) {
        const found = arr.find((n1) => isEqual(n1, n2));
        return found !== undefined;
    }

    function findNodeInArray(n2, arr) {
        return arr.find((n1) => isEqual(n1, n2));
    }

    function computeGCost(parent, current) { // d (current - start)
        if (isDiagonal(parent, current)) current.gCost = parent.gCost + 14;
        else current.gCost = parent.gCost + 10;
        return current.gCost;
    }

    function computeHCost(n) { // d (end - current)
        n.hCost = computeDistance(n, end);
        return n.hCost;
    }

    function computeFCost(parent, current) { // G cost + H cost, compute current node's g & f cost based on parent node's g cost
        current.fCost = computeGCost(parent, current) * 0.6 + computeHCost(current) * 0.4;
        return current.fCost;
    }
    
    function sortNodeArray(arr) {
        // for performance, open[] array should sort F Cost from low to high (if F Cost the same, then sort H Cost from low to high)
        // b/c in the while loop, later we push nodes with higher F Costs to the end of array
        // sorting from low to high keeps the array pretty much the same, with minimal entries shifting around
        const compareFn = (a, b) => {
            if (a.fCost === b.fCost) {
                if (a.hCost === b.hCost) return 0;
                else if (a.hCost > b.hCost) return 1;
                return -1;
            }
            else if (a.fCost > b.fCost) return 1;
            else return -1;
        }
        arr.sort(compareFn);
    }

    function updateNewPathCost(n, open) {
        // if (!isNodeInArray(n, open)) return false;
        let nOriginal = findNodeInArray(n, open);
        if (n.fCost < nOriginal.fCost) {
            nOriginal.gCost = n.gCost;
            nOriginal.fCost = n.fCost;
        }
    }
    
    function findNeighbor(n) {
        let neighbors = [];
        for (let j = n.j - 1; j <= n.j + 1; j++) {
            for (let i = n.i - 1; i <= n.i + 1; i++) {
                if (i === n.i && j === n.j) continue;
                // console.log(`For node (${i},${j}), steepness: ${steepnessMapData[j][i]}, height: ${heightMapData[j][i]}`);
                neighbors.push({
                    i: i,
                    j: j,
                    index: ijToIndex(i, j),
                    height: heightMapData[j][i],
                });
            }
        }
        neighbors = neighbors.filter(neighbor => neighbor.i >= 0 && neighbor.i < mapData[0].length && neighbor.j >= 0 && neighbor.j < mapData.length);
        // compute the f/g/h costs for each neighbor
        neighbors.forEach((x) => {
            computeFCost(n, x);
        });
        return neighbors;
    }
    
    function buildPath(current) {
        console.log('%c Found a path!', 'color: green');
        pathNodeArr = [];
        pathPosArr = [];
        addNodeToPath(current);
        
        computePathLength();
        // addPathMeshToScene();
        sendPathToMeasureTool();
    }
    
    let pathNodeArr = [];
    let pathPosArr = [];
    let pathLength = null;
    function addNodeToPath(n) {
        if (n.parent !== undefined) {
            pathNodeArr.push(n.parent);
            // pathPosArr.push(ijToThreejsContainerObjPosition(n.parent.i, n.parent.j));
            // changeMeshColorFromIndex(ijToIndex(n.parent.i, n.parent.j), GREEN);
            addNodeToPath(n.parent);
        }
    }
    
    function _addPathMeshToScene() {
        const line = new MeshLine();
        line.setPoints(pathPosArr);
        const material = new MeshLineMaterial({color: new THREE.Color(0xffff00),lineWidth: 15});
        const mesh = new THREE.Mesh(line, material);
        realityEditor.gui.threejsScene.addToScene(mesh);
    }
    
    function sendPathToMeasureTool() {
        let focusedEnvelopes = realityEditor.envelopeManager.getFocusedEnvelopes();
        let objectkey = focusedEnvelopes[0].object;
        let framekey = focusedEnvelopes[0].frame;
        let gltfBoundingBox = realityEditor.gui.threejsScene.getGltfBoundingBox();

        let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
        let inverseGroundPlaneMatrix = new THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
        inverseGroundPlaneMatrix.invert();
        
        if (realityEditor.envelopeManager.getFrameTypeFromKey(objectkey, framekey) === 'spatialMeasure') {
            let iframe = document.getElementById('iframe' + framekey);
            iframe.contentWindow.postMessage(JSON.stringify({
                cellSize: size,
                pathArr: pathNodeArr,
                pathLength: pathLength,
                offset: {
                    inverseGroundPlaneMatrix: inverseGroundPlaneMatrix,
                    minX: gltfBoundingBox.min.x * 1000,
                    minZ: gltfBoundingBox.min.z * 1000,
                }
            }), '*');
        }
    }
    
    function computePathLength() {
        pathLength = pathNodeArr[pathNodeArr.length - 1].fCost / 10 * size;
        console.log(`Length of the path is: ${pathLength}`);
    }
    
    function findPath() { // start & end are objects, containing following fields: start.i, start.j, start.index
        if (Object.keys(start).length === 0 || Object.keys(end).length === 0) {
            console.warn('Start / end point missing. Need to define both to find path');
            return;
        }
        // console.log(steepnessMapData);
        // return new Promise((resolve, reject) => {
            let open = [];
            let closed = [];

            // manually compute start node's f/g/h costs, b/c we have to manually set start's gCost to 0
            start.gCost = 0;
            start.hCost = computeHCost(start);
            start.fCost = start.gCost + start.hCost;

            open.push(start);

            while(open.length !== 0) {
                sortNodeArray(open); // sort the open[] array, compute & store the corresponding F/G/H cost in nodes
                let current = open.shift();
                closed.push(current);
                // color closed to red

                if (isEqual(current, end)) {
                    buildPath(current);
                    return;
                    // resolve(current);
                }

                let neighbors = findNeighbor(current);
                for (let i = 0; i < neighbors.length; i++) {
                    let n = neighbors[i];
                    // console.log(steepnessMapData[n.j][n.i]);
                    // if (mapData[n.j][n.i] === 0 || steepnessMapData[n.j][n.i] < MIN_STEEPNESS || steepnessMapData[n.j][n.i] > MAX_STEEPNESS || isNodeInArray(n, closed)) continue;
                    if (steepnessMapData[n.j][n.i] < MIN_STEEPNESS || steepnessMapData[n.j][n.i] > MAX_STEEPNESS || isNodeInArray(n, closed)) continue; // todo Steve: changed for 9/18 demo, only consider steepness map

                    if (!isNodeInArray(n, open)) { // if neighbor not in open[], push it to open[]
                        n.parent = current;
                        open.push(n);
                    } else { // if neighbor is already in open[], but has a lower f cost than what's originally in open[], update f cost
                        n.parent = current;
                        updateNewPathCost(n, open);
                    }
                }
            }
            console.log(`%c Cannot find a path.`, 'color: red');
            // reject('Cannot find a path.');
        // })
    }
    
    function updateSteepnessRange(min, max) {
        MIN_STEEPNESS = min;
        MAX_STEEPNESS = max;
    }
    
    exports.initService = initService;
    exports.buildMeshFromMapData = buildMeshFromMapData;
    exports.resetStartAndEndIndices = resetStartAndEndIndices;
    exports.worldPosToNavmeshIndex = worldPosToNavmeshIndex;
    exports.updateSteepnessRange = updateSteepnessRange;

}(realityEditor.app.pathfinding));
