createNameSpace("realityEditor.gui.navigation");

/**
 * @fileOverview realityEditor.app.targetDownloader.js
 * Compartmentalizes the functions related to pathfinding within a space
 */
 
(function(exports) {
    const trackedObjectIDs = [];
    const navigationObjects = {};
    let initialized = false;
    let pathMeshResources;
    
    const initialize = () => {
        initialized = true;
        realityEditor.gui.threejsScene.onAnimationFrame(() => {
            trackedObjectIDs.forEach(id => {
                // refresh path
                removeNavigationPath(id);
                addNavigationPath(id);
            });
        });
    }
    
    setInterval(() => {
        const whereIs = globalStates.spatial.whereIs;
        const newObjectIDs = [];
        for (const ip in whereIs) {
            for (const objectKey in whereIs[ip]) {
                newObjectIDs.push(whereIs[ip][objectKey].objectID);
            }
        }
        if (newObjectIDs.length > 0 && !initialized) {
            initialize();
        }
        trackedObjectIDs.filter(id=>!newObjectIDs.includes(id)).forEach(id=>{
            trackedObjectIDs.splice(trackedObjectIDs.indexOf(id),1);
            removeNavigationPath(id);
        });
        newObjectIDs.filter(id=>!trackedObjectIDs.includes(id)).forEach(id=>{
            trackedObjectIDs.push(id);
        });
    },300);
    
    // Allows us to reuse materials and geometries
    const getPathMeshResources = (THREE, lightWidth, lightLength) => {
        if (!pathMeshResources) {
            const lightGeometry = new THREE.BoxGeometry(lightWidth,2,lightLength);
            const lightMaterial = new THREE.MeshBasicMaterial({color:0xFFFFCC, transparent:true});
            const topMaterial = new THREE.MeshBasicMaterial({color:0x000000, transparent:true});
            const wallMaterial = new THREE.MeshBasicMaterial({color:0xffff00, transparent:true, opacity:0.8});
            
            // Fade effect
            const startFadeInDist = 600; // 0.6m
            const endFadeInDist = 750; // 0.75m
            const startFadeOutDist = 2000; // 2m
            const endFadeOutDist = 3000; // 3m
            [lightMaterial, topMaterial, wallMaterial].forEach(material => {
                material.onBeforeCompile = (shader) => {
                    shader.fragmentShader = shader.fragmentShader.replace(
                        'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
                        [
                            'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
                            'float z = gl_FragCoord.z / gl_FragCoord.w;',
                            `float s = z < float(${startFadeOutDist}) ? (z - float(${startFadeInDist})) / (float(${endFadeInDist - startFadeInDist})) : (float(${endFadeOutDist})-z) / float(${endFadeOutDist-startFadeOutDist});`,
                            'gl_FragColor.a *= clamp(s, 0.0, 1.0);',
                        ].join( '\n' )
                    )
                }
            });
            pathMeshResources = {lightGeometry, lightMaterial, topMaterial, wallMaterial};
        }
        return pathMeshResources;
    }
    
    // Converts a path in 3D space to a three.js mesh
    const pathToMesh = (path) => {
        const THREE = realityEditor.gui.threejsScene.THREE;
        if (path.length < 2) {
            return new THREE.Group();
        }
        const rampAngle = 35;
        const rampHeight = path[path.length - 1].y - path[0].y;
        const rampRatio = Math.tan(rampAngle * Math.PI / 180);
        const rampLength = rampHeight / rampRatio;
        path[path.length - 1].y = path[0].y; // Simplifies math later
        const pathWidth = 50; // 50mm
        const pathHeight = 50; // 50mm
        const topGeometry = new THREE.BufferGeometry(); // The top represents the flat black top of the line
        const wallGeometry = new THREE.BufferGeometry(); // The wall represents the yellow sides of the line
        let topVertices = [];
        let wallVertices = [];
        const up = new THREE.Vector3(0,1,0);
        // Base should be wider to allow visibility while moving along line
        const bottomScale = 1.4; // How much wider the bottom of the walls is
        let lightDistanceTraveled = 0; // Used to determine light placement
        const lightInterval = 128; // mm offset between lights
        const lightTimingInterval = 2000; // ms frequency of pulse
        const lightOnDuration = 60; // ms duration of pulse on per light
        const lightSpeed = 10; // pulse speed multiplier
        const lightWidth = 10; // mm width of lightSource
        const lightLength = 64; // mm length of light source
        const lightGroup = new THREE.Group();
        
        const resources = getPathMeshResources(THREE, lightWidth, lightLength);
        const lightGeometry = resources.lightGeometry;
        const lightMaterial = resources.lightMaterial;
        const topMaterial = resources.topMaterial;
        const wallMaterial = resources.wallMaterial;
        
        for (let i = path.length - 1; i > 0; i--) {
            const start = path[i];
            const end = path[i-1];
            const direction = new THREE.Vector3().subVectors(end, start);
            const cross = new THREE.Vector3().crossVectors(direction, up).normalize().multiplyScalar(pathWidth / 2);
            const bottomCross = cross.clone().multiplyScalar(bottomScale);
            
            const startRampHeight = lightDistanceTraveled >= Math.abs(rampLength) ? 0 : (rampLength - lightDistanceTraveled) * rampRatio;
            const endRampHeight = lightDistanceTraveled + direction.length() >= Math.abs(rampLength) ? 0 : (rampLength - (lightDistanceTraveled + direction.length())) * rampRatio;

            const startTaperFactor = lightDistanceTraveled >= Math.abs(rampLength) ? 1 : lightDistanceTraveled / rampLength;
            const endTaperFactor = lightDistanceTraveled + direction.length() >= Math.abs(rampLength) ? 1 : (lightDistanceTraveled + direction.length()) / rampLength;
            
            // First top triangle
            topVertices.push(start.x-cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z-cross.z*startTaperFactor);
            topVertices.push(start.x+cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z+cross.z*startTaperFactor);
            topVertices.push(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor);
            
            // Second top triangle
            topVertices.push(start.x+cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z+cross.z*startTaperFactor);
            topVertices.push(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor);
            topVertices.push(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor);
            
            // First left triangle
            wallVertices.push(start.x-bottomCross.x*startTaperFactor, start.y+startRampHeight, start.z-bottomCross.z*startTaperFactor);
            wallVertices.push(start.x-cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z-cross.z*startTaperFactor);
            wallVertices.push(end.x-bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-bottomCross.z*endTaperFactor);
            
            // Second left triangle
            wallVertices.push(start.x-cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z-cross.z*startTaperFactor);
            wallVertices.push(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor);
            wallVertices.push(end.x-bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-bottomCross.z*endTaperFactor);
            
            // First right triangle
            wallVertices.push(start.x+cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z+cross.z*startTaperFactor);
            wallVertices.push(start.x+bottomCross.x*startTaperFactor, start.y+startRampHeight, start.z+bottomCross.z*startTaperFactor);
            wallVertices.push(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor);
            
            // Second right triangle
            wallVertices.push(start.x+bottomCross.x*startTaperFactor, start.y+startRampHeight, start.z+bottomCross.z*startTaperFactor);
            wallVertices.push(end.x+bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z+bottomCross.z*endTaperFactor);
            wallVertices.push(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor);
            
            // Handle bends
            if (i > 1) {
                const nextDirection = new THREE.Vector3().subVectors(path[i-2],end);
                const nextCross = new THREE.Vector3().crossVectors(nextDirection, up).normalize().multiplyScalar(pathWidth / 2);
                const nextBottomCross = nextCross.clone().multiplyScalar(bottomScale);
                
                // First top triangle
                topVertices.push(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor);
                topVertices.push(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor);
                topVertices.push(end.x-nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-nextCross.z*endTaperFactor);
                
                // Second top triangle
                topVertices.push(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor);
                topVertices.push(end.x+nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+nextCross.z*endTaperFactor);
                topVertices.push(end.x-nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-nextCross.z*endTaperFactor);
                
                // First left triangle
                wallVertices.push(end.x-bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-bottomCross.z*endTaperFactor);
                wallVertices.push(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor);
                wallVertices.push(end.x-nextBottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-nextBottomCross.z*endTaperFactor);
                
                // Second left triangle
                wallVertices.push(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor);
                wallVertices.push(end.x-nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-nextCross.z*endTaperFactor);
                wallVertices.push(end.x-nextBottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-nextBottomCross.z*endTaperFactor);
                
                // First right triangle
                wallVertices.push(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor);
                wallVertices.push(end.x+bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z+bottomCross.z*endTaperFactor);
                wallVertices.push(end.x+nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+nextCross.z*endTaperFactor);
                
                // Second right triangle
                wallVertices.push(end.x+bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z+bottomCross.z*endTaperFactor);
                wallVertices.push(end.x+nextBottomCross.x*endTaperFactor, end.y+endRampHeight, end.z+nextBottomCross.z*endTaperFactor);
                wallVertices.push(end.x+nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+nextCross.z*endTaperFactor);
            }
            
            const lightPos = start.clone();
            
            let segLengthRemaining = direction.length();
            const directionNorm = direction.clone().normalize();
            while (segLengthRemaining > lightInterval - (lightDistanceTraveled % lightInterval)) {
                const intervalDistanceTraveled = lightInterval - (lightDistanceTraveled % lightInterval);
                lightDistanceTraveled += intervalDistanceTraveled;
                segLengthRemaining -= intervalDistanceTraveled;
                lightPos.addScaledVector(directionNorm, intervalDistanceTraveled);
                const isLightOn = (lightDistanceTraveled / lightSpeed + Date.now()) % lightTimingInterval < lightOnDuration;
                if (isLightOn) {
                    const frac = segLengthRemaining / direction.length();
                    const rampHeight = startRampHeight * frac + endRampHeight * (1-frac);
                    const taperFactor = startTaperFactor * frac + endTaperFactor * (1-frac);
                    const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
                    
                    lightMesh.position.copy(lightPos);
                    lightMesh.position.y += pathHeight * taperFactor + rampHeight;
                    
                    const lightEnd = end.clone();
                    lightEnd.y += pathHeight * endTaperFactor + endRampHeight;
                    lightMesh.lookAt(lightEnd);
                    
                    lightMesh.scale.x *= taperFactor;
                    lightMesh.scale.y *= taperFactor;
                    
                    lightGroup.add(lightMesh);
                }
            }
            lightDistanceTraveled += segLengthRemaining;
        }

        topGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(topVertices), 3));
        wallGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wallVertices), 3));
        const topMesh = new THREE.Mesh(topGeometry, topMaterial);
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        const group = new THREE.Group();
        group.add(topMesh);
        group.add(wallMesh);
        group.add(lightGroup);
        group.onRemove = () => {
            // Since these geometries are not reused, they MUST be disposed to prevent memory leakage
            topGeometry.dispose();
            wallGeometry.dispose();
        }
        return group;
    }
    
    const addNavigationPath = (goalID) => {
        const THREE = realityEditor.gui.threejsScene.THREE;
        const navmeshesWithNode = realityEditor.sceneGraph.getObjects()
            .map(sceneNode => {return {sceneNode, navmesh:JSON.parse(window.localStorage.getItem(`realityEditor.navmesh.${sceneNode.id}`))}})
            .filter(navmeshWithNode => navmeshWithNode.navmesh != null);
        if (navmeshesWithNode.length > 0) {
            const navmeshWithNode = navmeshesWithNode[0];
            const navmesh = navmeshWithNode.navmesh; //TODO: select navmesh based on which includes/is closest to the goal position
            const areaTargetNode = navmeshWithNode.sceneNode;
            const cameraRelativeMatrix = realityEditor.sceneGraph.getCameraNode().getMatrixRelativeTo(areaTargetNode);
            const goalRelativeMatrix = realityEditor.sceneGraph.getSceneNodeById(goalID).getMatrixRelativeTo(areaTargetNode);
            const cameraRelativeTranslationMatrix = realityEditor.gui.ar.utilities.extractTranslation(cameraRelativeMatrix);
            const goalRelativeTranslationMatrix = realityEditor.gui.ar.utilities.extractTranslation(goalRelativeMatrix);
            const cameraRelativePosition = matrixToPos(cameraRelativeTranslationMatrix);
            const goalRelativePosition = matrixToPos(goalRelativeTranslationMatrix);
            
            // area target and navmesh use meters, toolbox uses mm
            const cameraIndex = posToIndex(navmesh, scalePos(cameraRelativePosition, 1/1000));
            const goalIndex = posToIndex(navmesh, scalePos(goalRelativePosition, 1/1000));
            const indexPath = findPath(navmesh, cameraIndex, goalIndex);
            const pathHeightOffset = 750; // 0.75m
            const relativePath = indexPath.map(index => indexToPos(navmesh, index)).map(pos => scalePos(pos, 1000)).map(point => new THREE.Vector3(point.x, point.y + pathHeightOffset, point.z));
            relativePath[0].x = cameraRelativePosition.x;
            relativePath[0].z = cameraRelativePosition.z;
            relativePath.push(new THREE.Vector3(goalRelativePosition.x, goalRelativePosition.y, goalRelativePosition.z));
            
            const pathMesh = pathToMesh(relativePath);
            
            realityEditor.gui.threejsScene.addToScene(pathMesh, {worldObjectId: areaTargetNode.id, occluded: true});
            navigationObjects[goalID] = [pathMesh];
        }
        else {
            console.log('no navmeshes available');
        }
    }
    
    const removeNavigationPath = (goalID) => {
        if (navigationObjects[goalID]) {
            navigationObjects[goalID].forEach(obj => {
                realityEditor.gui.threejsScene.removeFromScene(obj);
                if (obj.onRemove) {
                    obj.onRemove();
                }
            });
            delete navigationObjects[goalID];
        }
    }
    
    const scalePos = (pos, scaleFactor) => {
        return {
            x: pos.x * scaleFactor,
            y: pos.y * scaleFactor,
            z: pos.z * scaleFactor
        }
    }
    
    const matrixToPos = (matrix) => {
        return {
            x: matrix[12],
            y: matrix[13],
            z: matrix[14],
        }
    }
    
    const indexToPos = (navmesh, index) => {
      const map = navmesh.map;
      const minX = navmesh.minX;
      const maxX = navmesh.maxX;
      // const minY = navmesh.minY;
      const minZ = navmesh.minZ;
      const maxZ = navmesh.maxZ;
      const floorOffset = navmesh.floorOffset;
      const xLength = map.length;
      const zLength = map[0].length;
      return {
        x: ((index.x) / xLength) * (maxX - minX) + minX,
        y: floorOffset,
        z: ((index.y) / zLength) * (maxZ - minZ) + minZ
      };
    }
    
    const posToIndex = (navmesh, pos) => {
        const map = navmesh.map;
        const minX = navmesh.minX;
        const maxX = navmesh.maxX;
        const minZ = navmesh.minZ;
        const maxZ = navmesh.maxZ;
        const xLength = map.length;
        const zLength = map[0].length;
        return {
            x: Math.floor((pos.x - minX) / (maxX - minX) * xLength),
            y: Math.floor((pos.z - minZ) / (maxZ - minZ) * zLength) // Flip z-coordinate to ensure top-down view (rather than bottom-up)
        };
    }
    
    const findNearestValidIndex = (map, index) => {
        if (index.x < 0) {
            index.x = 0;
        }
        if (index.x >= map.length) {
            index.x = map.length - 1;
        }
        if (index.y < 0) {
            index.y = 0;
        }
        if (index.y >= map[0].length) {
            index.y = map[0].length - 1;
        }
        
        const neighborPosArray = [
            {x:0,y:-1},
            {x:1,y:0},
            {x:0,y:1},
            {x:-1,y:0},
        ];
        
        const visitedArray = [];
        const queue = [index];
        while (queue.length != 0) {
            const currentIndex = queue.pop();
            if (currentIndex.x < 0 || currentIndex.x >= map.length) {
                continue;
            }
            if (currentIndex.y < 0 || currentIndex.y >= map[0].length) {
                continue;
            }
            if (visitedArray.some(visitedIndex=>visitedIndex.x === currentIndex.x && visitedIndex.y === currentIndex.y)) {
                continue;
            }
            visitedArray.push(currentIndex);
            if (map[currentIndex.x][currentIndex.y] === 1) {
                return currentIndex;
            }
            queue.splice(0,0,...neighborPosArray.map(offset=>{return{x:currentIndex.x+offset.x,y:currentIndex.y+offset.y}}));
        }
    }
  
    const findPathHeuristic = (x, y, goalX, goalY) => {
        return Math.sqrt((goalX-x)*(goalX-x) + (goalY-y)*(goalY-y)) * 1.1; // Distance
    }
    
    // Backtracks from the final node to the start
    const reconstructPath = (grid, node) => {
        const totalPath = [{x:node.x,y:node.y}];
        let cameFromIndices = node.cameFrom;
        while (cameFromIndices) {
           let node = grid[cameFromIndices.x][cameFromIndices.y];
           totalPath.unshift({x:node.x,y:node.y});
           cameFromIndices = node.cameFrom;
        }
        return totalPath;
    }
    
    // Given a start position and end position on the grid, finds a path
    // Pathfinding adapted from https://en.wikipedia.org/wiki/A*_search_algorithm#Pseudocode
    const findPath = (navmesh, startIndex, goalIndex) => {
        const grid = navmesh.map;
        startIndex = findNearestValidIndex(grid, startIndex); // Adjust for out-of-bounds coordinates
        goalIndex = findNearestValidIndex(grid, goalIndex); // Adjust for out-of-bounds coordinates
        const startX = startIndex.x;
        const startY = startIndex.y;
        const goalX = goalIndex.x;
        const goalY = goalIndex.y;
        
        const pathGrid = grid.map((row,x)=>row.map((value,y)=>{return{value,x,y}}));
        const openSet = [pathGrid[startX][startY]];
        pathGrid[startX][startY].gScore = 0; // gScore is the cost of the cheapest path from start
        pathGrid[startX][startY].fScore = findPathHeuristic(startX, startY, goalX, goalY); // fScore is gScore + heuristic

        while (openSet.length > 0) {
           const current = openSet.pop();
           if (current.x === goalX && current.y === goalY) {
              return simplifyPath(grid, reconstructPath(pathGrid, pathGrid[current.x][current.y]));
           }
           const neighborPosArray = [
               {x:-1,y:-1},
               {x:0,y:-1},
               {x:1,y:-1},
               {x:1,y:0},
               {x:1,y:1},
               {x:0,y:1},
               {x:-1,y:1},
               {x:-1,y:0},
           ];
           neighborPosArray.forEach(neighborPos => {
               const newPos = {x:current.x+neighborPos.x, y:current.y+neighborPos.y};
               if (newPos.x < 0 || newPos.x >= pathGrid.length || newPos.y < 0 || newPos.y >= pathGrid[0].length) {
                  return;
               }
               if (pathGrid[newPos.x][newPos.y].value === 0) { // Wall
                  return;
               }
               const neighbor = pathGrid[newPos.x][newPos.y];
               const tentativeGScore = current.gScore + Math.sqrt(neighborPos.x*neighborPos.x + neighborPos.y*neighborPos.y);
               if (neighbor.gScore === undefined || tentativeGScore < neighbor.gScore) {
                   neighbor.cameFrom = {x:current.x, y:current.y};
                   neighbor.gScore = tentativeGScore;
                   neighbor.fScore = tentativeGScore + findPathHeuristic(neighbor.x, neighbor.y, goalX, goalY);
                   if (!openSet.some(elem => elem.x === newPos.x && elem.y === newPos.y)) {
                       const insertIndex = openSet.findIndex(elem => elem.fScore < neighbor.fScore); // Keep smallest on top
                       openSet.splice(insertIndex,0,neighbor);
                   }
               }
           });
        }
        return null; // Failed to reach goal.
    }

    // Adapted from line rasterization example from https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm#All_cases
    const lineIsUnobstructed = (grid, start, end) => {
        let x = start.x;
        let y = start.y;
        const deltaX = Math.abs(end.x-start.x);
        const signX = start.x < end.x ? 1 : -1;
        const deltaY = -Math.abs(end.y-start.y);
        const signY = start.y < end.y ? 1 : -1;
        let err = deltaX + deltaY;

        while (Math.round(x) != end.x && Math.round(y) != end.y) {
           if (grid[Math.floor(x)][Math.floor(y)] === 0) {
               return false;
           }
           const e2 = 2*err;
           if (e2 >= deltaY) {
               err += deltaY;
               x += signX;
           }
           if (e2 <= deltaX) {
               err += deltaX;
               y += signY;
           }
        }
        return true;
    }

    // Simplifies paths by removing intervening points between points that can
    // be joined with a straight line. This allows for smoother (non-jagged) paths.
    const simplifyPath = (grid, path) => {
        const pathCopy = path.map(point=>{return{x:point.x,y:point.y}});
        let currentIndex = 0;
        while(currentIndex < pathCopy.length-2) {
           while(currentIndex+2 < pathCopy.length && lineIsUnobstructed(grid, pathCopy[currentIndex], pathCopy[currentIndex+2])) {
              pathCopy.splice(currentIndex+1,1);
           }
           currentIndex++;
        }
        return pathCopy;
    }
    
    exports.findPath = findPath;
})(realityEditor.gui.navigation);