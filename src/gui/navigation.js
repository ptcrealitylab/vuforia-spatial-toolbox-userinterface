createNameSpace("realityEditor.gui.navigation");

/**
 * @fileOverview realityEditor.app.targetDownloader.js
 * Compartmentalizes the functions related to pathfinding within a space
 */
 
(function(exports) {
    const trackedObjectIDs = [];
    const navigationObjects = {};
    let initialized = false;
    
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
            const relativePath = indexPath.map(index => indexToPos(navmesh, index)).map(pos => scalePos(pos, 1000));
            relativePath[0].x = cameraRelativePosition.x;
            relativePath[0].z = cameraRelativePosition.z;
            
            // building threejs path and adding to scene
            const topPoints = relativePath.map(pos => new THREE.Vector3(pos.x, pos.y+1000, pos.z));
            // const bottomPoints = relativePath.map(pos => new THREE.Vector3(pos.x, pos.y+1000-5, pos.z));
            const topGeometry = new THREE.BufferGeometry().setFromPoints(topPoints);
            // const bottomGeometry = new THREE.BufferGeometry().setFromPoints(bottomPoints);
            const topMaterial = new THREE.LineBasicMaterial({color:0xffff00, linewidth:7.5});
            // const bottomMaterial = new THREE.LineBasicMaterial({color:0x000000, linewidth:10});
            const topNavLine = new THREE.Line(topGeometry, topMaterial);
            // const bottomNavLine = new THREE.Line(bottomGeometry, bottomMaterial);
            realityEditor.gui.threejsScene.addToScene(topNavLine, areaTargetNode.id, true);
            // realityEditor.gui.threejsScene.addToScene(bottomNavLine, areaTargetNode.id, true);
            // The occluded lines are the ones that are visible when the path is occluded
            const topOccludedMaterial = new THREE.LineDashedMaterial({color:0xffff00, linewidth:7.5, dashSize:1, gapSize:1, scale:1/80});
            // const bottomOccludedMaterial = new THREE.LineDashedMaterial({color:0x000000, linewidth:10, dashSize:1, gapSize:1, scale:1/80});
            const topOccludedNavLine = new THREE.Line(topGeometry, topOccludedMaterial);
            // const bottomOccludedNavLine = new THREE.Line(bottomGeometry, bottomOccludedMaterial);
            topOccludedNavLine.computeLineDistances(); // Needed for LineDashedMaterial
            // bottomOccludedNavLine.computeLineDistances(); // Needed for LineDashedMaterial
            realityEditor.gui.threejsScene.addToScene(topOccludedNavLine, areaTargetNode.id);
            // realityEditor.gui.threejsScene.addToScene(bottomOccludedNavLine, areaTargetNode.id);
            const goalObj = new THREE.Mesh(new THREE.BoxGeometry(50,50,50),new THREE.MeshStandardMaterial({color:0xffff00}));
            goalObj.position.x = topPoints[topPoints.length-1].x;
            goalObj.position.y = topPoints[topPoints.length-1].y;
            goalObj.position.z = topPoints[topPoints.length-1].z;
            realityEditor.gui.threejsScene.addToScene(goalObj, areaTargetNode.id);
            navigationObjects[goalID] = [topNavLine, topOccludedNavLine, goalObj];
        }
        else {
            console.log('no navmeshes available');
        }
    }
    
    const removeNavigationPath = (goalID) => {
        if (navigationObjects[goalID]) {
            navigationObjects[goalID].forEach(obj => {
                realityEditor.gui.threejsScene.removeFromScene(obj);
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
    
    // const relativePosToWorldPos = (pos, sceneNode) => {
    //     const worldMatrix = sceneNode.worldMatrix;
    //     const relativePositionMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
    //     relativePositionMatrix[12] = pos.x;
    //     relativePositionMatrix[13] = pos.y;
    //     relativePositionMatrix[14] = pos.z;
    //     const worldPositionMatrix = realityEditor.gui.ar.utilities.newIdentityMatrix();
    //     realityEditor.gui.ar.utilities.multiplyMatrix(worldMatrix, relativePositionMatrix, worldPositionMatrix);
    //     return matrixToPos(worldPositionMatrix);
    // }
    
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
        return Math.sqrt((goalX-x)*(goalX-x) + (goalY-y)*(goalY-y)); // Distance
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