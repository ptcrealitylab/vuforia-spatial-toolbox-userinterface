/* eslint-env worker */
/* global globalThis */

// ***** On Using Web Workers *****
// Web Workers allow scripts to execute code in a background thread. In this
//   case, we use one for loading the GLBs for the area targets and generating
//   the corresponding navmeshes, as this is a computationally intensive process
//   that would otherwise block the main app.
//
// The onmessage function is called whenever the script that spawned the worker
//   (src/app/targetDownloader.js) sends a message to it.
// The postMessage function allows the worker to send messages back to the
//   script that spawned the worker.
// Workers can use the importScripts function to load in scripts from other
//   files.

// This file receives a URL for a GLB file as well as the corresponding objectID
//   through the Web Worker messaging interface and returns the resulting
//   navmesh through the same interface

import {Cache, LoadingManager, Ray, Texture, Vector3} from '../../thirdPartyCode/three/three.module.js';
import {GLTFLoader} from '../../thirdPartyCode/three/GLTFLoader.module.js';
import {mergeBufferGeometries} from '../../thirdPartyCode/three/BufferGeometryUtils.module.js';

Cache.enabled = true;
// Sets up a fake cache entry pointing to a blank texture since we can't load
// textures in this environment
const fakeCacheKey = 'fake';
Cache.add(fakeCacheKey, new Texture());

const manager = new LoadingManager();
manager.resolveURL = function(url) {
    if (url.endsWith('.glb')) {
        return url;
    }
    // Resolve to fake cache key (empty texture)
    return fakeCacheKey;
};

const gltfLoader = new GLTFLoader(manager);

globalThis.document = {
  createElementNS: function(ns, tag) {
    console.warn('createElementNS called for', tag, new Error().stack);
  }
};

const heatmapResolution = 10; // number of pixels per meter

onmessage = function(evt) {
  const fileName = evt.data.fileName;
  const objectID = evt.data.objectID;
  createNavmeshFromFile(fileName).then(navmesh => {
    postMessage({navmesh,objectID,fileName});
  }).catch(error => {
    console.error(error);
  });
}

const createNavmeshFromFile = (fileName) => {
  return new Promise(resolve => {
    gltfLoader.load(fileName, (gltf) => {
        const geometries = [];
        gltf.scene.traverse(obj => {
            if (obj.geometry) {
                obj.geometry.deleteAttribute('uv'); // Messes with merge if present in some geometries but not others
                obj.geometry.deleteAttribute('uv2'); // Messes with merge if present in some geometries but not others
                geometries.push(obj.geometry);
            }
        });
        if (geometries.length === 1) {
            resolve(createNavmesh(geometries[0], heatmapResolution));
        } else {
            const mergedGeometry = mergeBufferGeometries(geometries);
            resolve(createNavmesh(mergedGeometry, heatmapResolution));
        }
    });
  });
}

// Rasterization algorithm from http://www.sunshine2k.de/coding/java/TriangleRasterization/TriangleRasterization.html
const addLine = (array, startX, endX, z, value, ignoreValue) => {
  for (let x = Math.floor(startX); x <= Math.ceil(endX); x++) {
    if (array[x] === undefined) {
      continue;
    }
    if (array[x][z] === undefined) {
      continue;
    }
    if (ignoreValue) {
      array[x][z][2] = 1;
    } else {
      array[x][z][0] += value;
      array[x][z][1] += 1;
      array[x][z][2] = 1;
    }
  }
}

// v1 must be smallest z vertex, v3 must be the largest
const addBottomFlatTriangle = (array, v1, v2, v3, value, ignoreValue) => {
  const invslope1 = (v2.z-v1.z) === 0 ? 0 : (v2.x - v1.x) / (v2.z - v1.z);
  const invslope2 = (v3.z-v1.z) === 0 ? 0 : (v3.x - v1.x) / (v3.z - v1.z);
  
  let startX = v1.x;
  let endX = v1.x;
  
  for (let scanlineZ = Math.floor(v1.z); scanlineZ <= Math.ceil(v2.z); scanlineZ++) {
    addLine(array, startX, endX, scanlineZ, value, ignoreValue);
    startX += invslope1;
    endX += invslope2;
  }
}

// v1 must be smallest z vertex, v3 must be the largest
const addTopFlatTriangle = (array, v1, v2, v3, value, ignoreValue) => {
  const invslope1 = (v3.z-v1.z) === 0 ? 0 : (v3.x - v1.x) / (v3.z - v1.z);
  const invslope2 = (v3.z-v2.z) === 0 ? 0 : (v3.x - v2.x) / (v3.z - v2.z);
  
  let startX = v3.x;
  let endX = v3.x;
  
  for (let scanlineZ = Math.ceil(v3.z); scanlineZ >= Math.floor(v1.z); scanlineZ--) {
    addLine(array, startX, endX, scanlineZ, value, ignoreValue);
    startX -= invslope1;
    endX -= invslope2;
  }
}

const splitVertex = new Vector3();
const addTriangle = (array, v1, v2, v3, value, ignoreValue) => {
  const minZVertex = [v2,v3].reduce((min, current) => current.z < min.z ? current : min, v1);
  const maxZVertex = [v1,v2,v3].filter(vertex => vertex != minZVertex).reduce((max, current) => current.z > max.z ? current : max, [v1,v2,v3].filter(vertex => vertex != minZVertex)[0]);
  const midZVertex = [v1,v2,v3].filter(vertex => vertex != minZVertex && vertex != maxZVertex)[0];
  if (midZVertex.z === maxZVertex.z) {
    addBottomFlatTriangle(array, minZVertex, midZVertex, maxZVertex, value, ignoreValue);
  } else if (midZVertex.z === minZVertex.z) {
    addTopFlatTriangle(array, minZVertex, midZVertex, maxZVertex, value, ignoreValue);
  } else {
    splitVertex.x = minZVertex.x + (midZVertex.z - minZVertex.z) / (maxZVertex.z - minZVertex.z) * (maxZVertex.x - minZVertex.x);
    splitVertex.z = midZVertex.z;
    addBottomFlatTriangle(array, minZVertex, midZVertex, splitVertex, value, ignoreValue);
    addTopFlatTriangle(array, midZVertex, splitVertex, maxZVertex, value, ignoreValue);
  }
}

// Utility function for applying functions to values within a grid
const mapGrid = (grid, mapping) => {
  grid.forEach((row,i) => {
    row.forEach((value, j) => {
      row[j] = mapping(value,i,j);
    })
  });
}

const createNavmesh = (geometry, resolution) => { // resolution = number of pixels per meter
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  
  const minX = geometry.boundingBox.min.x;
  const maxX = geometry.boundingBox.max.x;
  const minY = geometry.boundingBox.min.y;
  const maxY = geometry.boundingBox.max.y;
  const minZ = geometry.boundingBox.min.z;
  const maxZ = geometry.boundingBox.max.z;
  
  const xLength = Math.ceil((maxX - minX) * resolution); // Navmesh size
  const zLength = Math.ceil((maxZ - minZ) * resolution); // Navmesh size
  const faceData = []; // Stores data about normal directions
  const outerHoles = []; // Stores data about areas that are part of the mesh
  const expandedWallMap = []; // Stores data about where the walls are, expanded to prevent pathfinding along walls
  const regionMap = []; // Stores data about isolated floor sections (to eliminate tables, countertops, etc.)
  for (let x = 0; x < xLength; x++) {
    const faceDataZArray = [];
    const outerHolesZArray = [];
    const expandedWallZArray = [];
    const regionMapZArray = [];
    for (let z = 0; z < zLength; z++) {
      faceDataZArray.push([0,0,0]); // [totalWeight, count, withinMesh]
      outerHolesZArray.push(0);
      expandedWallZArray.push(0);
      regionMapZArray.push(0);
    }
    faceData.push(faceDataZArray);
    outerHoles.push(outerHolesZArray);
    expandedWallMap.push(expandedWallZArray);
    regionMap.push(regionMapZArray);
  }
  
  const indexedFaceAttribute = geometry.index;
  const positionAttribute = geometry.attributes.position;
  
  // Re-use vector objects for efficiency
  const indexVector = new Vector3();
  const vertexVector1 = new Vector3();
  const vertexVector2 = new Vector3();
  const vertexVector3 = new Vector3();
  
  let vertexIndex = 0;
  const loadVertices = (v1, v2, v3) => {
    if (geometry.index) { // Have to handle indexed vertices differently from sequential vertices
      if (vertexIndex >= indexedFaceAttribute.count) {
        return false;
      }
      indexVector.fromBufferAttribute(indexedFaceAttribute, vertexIndex); // Gets indices of face vertices, not grouped by attribute so indexVector collects 3 at a time
      v1.fromBufferAttribute(positionAttribute, indexVector.x);
      v2.fromBufferAttribute(positionAttribute, indexVector.y);
      v3.fromBufferAttribute(positionAttribute, indexVector.z);
    } else {
      if (vertexIndex >= positionAttribute.count) {
        return false;
      }
      v1.fromBufferAttribute(positionAttribute, vertexIndex);
      v2.fromBufferAttribute(positionAttribute, vertexIndex+1);
      v3.fromBufferAttribute(positionAttribute, vertexIndex+2);
    }
    vertexIndex += 3;
    return true;
  }
  
  // We're looking for walkable space, so any faces in this range are obstacles
  const lowIgnoreHeight = 0.5; // 50cm ~= Knee height for tall people (like me)
  const highIgnoreHeight = 2; // 2m ~= slightly under door height
  
  // The floor offset will be set by looking down from the origin first, and if nothing is found, looking up
  let floorOffsetDown = 1; // Junk positive offset that will get replaced if there is a floor beneath the origin point
  let floorOffsetUp = -1; // Junk negative offset that will get replaced if there is a floor above the origin point
  const floorDetectionRayDown = new Ray(new Vector3(0,0,0), new Vector3(0,-1,0));
  const floorDetectionResultDown = new Vector3();
  const floorDetectionRayUp = new Ray(new Vector3(0,0,0), new Vector3(0,1,0));
  const floorDetectionResultUp = new Vector3();
  
  // Load the next face into our vertex vectors and evaluate until out of faces
  while(loadVertices(vertexVector1, vertexVector2, vertexVector3)) {
    
    // Use the average height of the vertices to determine the height of the face
    const faceY = (vertexVector1.y + vertexVector2.y + vertexVector3.y)/3;
    
    if (floorDetectionRayDown.intersectTriangle(vertexVector1, vertexVector2, vertexVector3, false, floorDetectionResultDown)) {
      if (faceY > floorOffsetDown || floorOffsetDown > 0) {
        floorOffsetDown = faceY; // Find the highest face below the origin to set as the floor height
      }
    }
    
    if (floorDetectionRayUp.intersectTriangle(vertexVector1, vertexVector2, vertexVector3, false, floorDetectionResultUp)) {
      if (faceY < floorOffsetUp || floorOffsetUp < 0) {
        floorOffsetUp = faceY; // Find the lowest face above the origin to set as the floor height
      }
    }
    
    // If something is out of the vertical range for obstacles, we don't want
    // to have it contribute to the weight of that point, but we do want the
    // pixels covered by that face to be considered walkable if no other
    // obstacles are found there, so we want addTriangle to mark it as occupied
    let ignoreWeight = false;
    if (vertexVector1.y - minY < lowIgnoreHeight && vertexVector2.y - minY < lowIgnoreHeight && vertexVector3.y - minY < lowIgnoreHeight) {
      ignoreWeight = true;
    }
    if (vertexVector1.y - minY > highIgnoreHeight && vertexVector2.y - minY > highIgnoreHeight && vertexVector3.y - minY > highIgnoreHeight) {
      ignoreWeight = true;
    }
    
    // Converting positions to navmesh coordinates to allow for rasterization of face
    [vertexVector1, vertexVector2, vertexVector3].forEach(vertex => {
      vertex.x = Math.floor((vertex.x - minX) / (maxX - minX) * xLength);
      vertex.z = Math.floor((vertex.z - minZ) / (maxZ - minZ) * zLength); // Flip z-coordinate to ensure top-down view (rather than bottom-up)
    });
    const weight = 1;
    
    // Rasterize face data onto navmesh
    addTriangle(faceData, vertexVector1, vertexVector2, vertexVector3, weight, ignoreWeight);
  }
  
  const floorOffset = minY; // set the floorOffset to the lowest part of the scanned mesh
  
  // Calculate average weight of faces within pixels
  mapGrid(faceData, value => [value[1] === 0 ? 0 : value[0] / value[1], value[2], 0]);
  
  // Pixels without obstacles but within the mesh are considered walkable, other pixels are not
  const normalCutoff = 0.1;
  mapGrid(faceData, value => value[0] < normalCutoff ? [0, value[1], 0] : [value[0], 0, 0]);
  
  // Filling outer holes (non-mesh pixels), defined as non-walkable pixels reachable from edge of grid
  const outerHolesStack = [];
  const isHole = (x,z) => {
    return faceData[x][z][0] === 0 && faceData[x][z][1] === 0 && outerHoles[x][z] === 0;
  }
  
  // Expands search outwards
  const pushAdjacent = (x,z,stack) => {
    stack.push([x-1,z]);
    stack.push([x+1,z]);
    stack.push([x,z-1]);
    stack.push([x,z+1]);
  }
  
  // Initializing search at borders
  for (let x = 0; x < xLength; x++) {
    if (isHole(x,0)) {
      outerHoles[x][0] = 1;
      pushAdjacent(x,0,outerHolesStack);
    }
    if (isHole(x,zLength-1)) {
      outerHoles[x][zLength-1] = 1;
      pushAdjacent(x,zLength-1,outerHolesStack);
    }
  }
  
  // Initializing search at borders
  for (let z = 0; z < zLength; z++) {
    if (isHole(0,z)) {
      outerHoles[0][z] = 1;
      pushAdjacent(0,z,outerHolesStack);
    }
    if (isHole(xLength-1,z)) {
      outerHoles[xLength-1][z] = 1;
      pushAdjacent(xLength-1,z,outerHolesStack);
    }
  }
  
  // Breadth-first spread
  while (outerHolesStack.length != 0) {
    const coords = outerHolesStack.pop();
    const x = coords[0];
    const z = coords[1];
    
    // Skips out-of-bounds and visited pixels
    if (x < 0 || x >= xLength || z < 0 || z >= zLength || !isHole(x,z)) {
      continue;
    }
    outerHoles[x][z] = 1;
    pushAdjacent(x,z,outerHolesStack);
  }
  
  // Fills holes in grid
  for (let x = 0; x < xLength; x++) {
    for (let z = 0; z < zLength; z++) {
      if (isHole(x,z)) {
        faceData[x][z][1] = 1;
      } else {
        faceData[x][z][0] = 0;
      }
    }
  }
  
  faceData.forEach((xRow, x) => {
    xRow.forEach((value, z) => {
      if (x-1 >= 0 && faceData[x-1][z][1] === 0) {
        expandedWallMap[x][z] = 1;
        return;
      }
      if (z-1 >= 0 && faceData[x][z-1][1] === 0) {
        expandedWallMap[x][z] = 1;
        return;
      }
      if (x+1 < faceData.length && faceData[x+1][z][1] === 0) {
        expandedWallMap[x][z] = 1;
        return;
      }
      if (z+1 < faceData[x].length && faceData[x][z+1][1] === 0) {
        expandedWallMap[x][z] = 1;
        return;
      }
      if (x-1 >= 0 && z-1 >= 0 && faceData[x-1][z-1][1] === 0) {
        expandedWallMap[x][z] = 1;
        return;
      }
      if (x+1 < faceData.length && z-1 >= 0 && faceData[x+1][z-1][1] === 0) {
        expandedWallMap[x][z] = 1;
        return;
      }
      if (x+1 < faceData.length && z+1 < faceData[x].length && faceData[x+1][z+1][1] === 0) {
        expandedWallMap[x][z] = 1;
        return;
      }
      if (x-1 >= 0 && z+1 < faceData[x].length && faceData[x-1][z+1][1] === 0) {
        expandedWallMap[x][z] = 1;
        return;
      }
    })
  });
  
  // Finding largest contiguous region for floor
  let regionNumber = 1; // Number of current region
  let maxRegionNumber = 0; // Number of largest region
  let maxRegionCount = 0; // Number of pixels in largest region
  const isMapped = (x,z) => {
    return regionMap[x][z] != 0 || expandedWallMap[x][z] === 1;
  }
  for (let x = 0; x < xLength; x++) {
    for (let z = 0; z < zLength; z++) {
      if (!isMapped(x,z)) {
        regionMap[x][z] = regionNumber;
        let regionCount = 1;
        const regionFillStack = [];
        pushAdjacent(x,z,regionFillStack);
        // Breadth-first spread again, this time navigating along adjacent walkable pixels to determine pixels in same region
        while (regionFillStack.length != 0) {
          const coords = regionFillStack.pop();
          const x = coords[0];
          const z = coords[1];
          if (x < 0 || x >= xLength || z < 0 || z >= zLength || isMapped(x,z)) {
            continue;
          }
          regionMap[x][z] = regionNumber;
          regionCount++;
          pushAdjacent(x,z,regionFillStack);
        }
        if (regionCount > maxRegionCount) {
          maxRegionNumber = regionNumber;
          maxRegionCount = regionCount;
        }
        regionNumber++;
      }
    }
  }
  
  // Replace regionMap with only those pixels belonging to the largest region
  // This is our walkable space for navigation
  mapGrid(regionMap, rNum => rNum === maxRegionNumber ? 1 : 0);
  
  // Share bounding box positions so we can scale real-world positions to grid properly
  return {
    map: regionMap,
    minX: minX,
    maxX: maxX,
    minY: minY,
    maxY: maxY,
    minZ: minZ,
    maxZ: maxZ,
    floorOffset: floorOffset
  }
}
