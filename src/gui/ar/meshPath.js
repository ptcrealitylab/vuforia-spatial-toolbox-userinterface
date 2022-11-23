import * as THREE from '../../../thirdPartyCode/three/three.module.js';

let cachedMaterials = {};

let VERT_PATH = Object.freeze({
    x: 'x',
    y: 'y',
    z: 'z',
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
    start: 'start',
    end: 'end'
});

// lets you reuse materials that share identical properties
const getMaterialKey = (color, opacity, usePerVertexColors) => {
    return JSON.stringify(color) + JSON.stringify(opacity) + JSON.stringify(usePerVertexColors)
}

// lets you reuse materials that share identical properties
const getMaterial = (color, opacity = 1, usePerVertexColors = false) => {
    if (usePerVertexColors) { color = 0xFFFFFF; } // if color isn't white, vertex colors blend un-intuitively
    let materialKey = getMaterialKey(color, opacity, usePerVertexColors);
    if (typeof cachedMaterials[materialKey] === 'undefined') {
        let params = {
            color: color || 0xFFFFFF
        };
        if (opacity < 1) {
            params.transparent = true
            params.opacity = opacity
        }
        if (usePerVertexColors) {
            params.vertexColors = true;
        }
        cachedMaterials[materialKey] = new THREE.MeshBasicMaterial(params);
    }
    return cachedMaterials[materialKey]; // allows us to reuse materials that have the exact same params
}

/**
 * MeshPath is similar to MeshLine but is an extruded rectangular path where you can also specify color and size
 * for each of the points on the path. It is aligned so that its "top" faces the global up vector. Different colors can
 * be given to its "top" vs its "walls".
 * 
 * Note: as of now, MeshPath doesn't include a bottom face along the path, but this could easily be added
 */
class MeshPath extends THREE.Group
{
    constructor(path, {width_mm, height_mm, topColor, wallColor, wallBrightness, usePerVertexColors, bottomScale, opacity}) {
        super();

        this.width_mm = width_mm || 10; // 10mm default
        this.height_mm = height_mm || 10;
        this.topColor = topColor || 0xFFFFFF;
        this.wallColor = wallColor || 0xABABAB;
        this.wallBrightness = wallBrightness || 0.8; // sides are by default a bit darker than the top, to make more visible
        this.usePerVertexColors = usePerVertexColors || false;
        this.bottomScale = bottomScale || 1; // if > 1, bottom of path flares out a bit to make sides more visible
        this.opacity = opacity || 1;

        this.topPositionsBuffer = [];
        this.wallPositionsBuffer = [];
        this.topColorsBuffer = [];
        this.wallColorsBuffer = [];

        this.setPoints(path);
    }

    resetPoints() {
        this.topPositionsBuffer = [];
        this.topColorsBuffer = [];
        this.wallPositionsBuffer = [];
        this.wallColorsBuffer = [];

        this.children.forEach(childMesh => {
            this.remove(childMesh);
        });

        if (typeof this.onRemove === 'function') {
            this.onRemove(); // dispose of geometry to avoid memory leak
        }
    }
    
    getPointFromFace(vertexIndices) {
        let approximatePointIndex = Math.floor(vertexIndices[0] / 24);
        return Math.max(0, Math.min(this.currentPoints.length - 1, (this.currentPoints.length - approximatePointIndex) - 2)); // this.currentPoints[approximatePointIndex];
    }
    
    getBufferIndices(pointIndex) {
        // if i = length-1, indices = 0-23
        // if i = length-2, indices = 24-47
        // if i = length-3, indices = 48-71
        // ...
        // if i = length-N, indices = (24 * (N-1)) to (24 * N - 1) 
        // if i = 0, indices = (24 * (length-1)) to (24 * length - 1 - 12) // special case only has 12 not 24
        
        let positionsPerPoint = 24;
        let componentsPerPosition = 3; // color=[r,g,b] or position=[x,y,z]
        
        let length = this.currentPoints.length;
        let i = length - pointIndex;
        let startBufferIndex = (positionsPerPoint * componentsPerPosition) * (i-2);
        let endBufferIndex = (positionsPerPoint * componentsPerPosition) * (i-1) - 1; // last index has half as many positions
        if (i === length - 1) {
            endBufferIndex -= (positionsPerPoint * componentsPerPosition) * 0.5;
        }
        console.log('start', startBufferIndex, 'end', endBufferIndex);
        let bufferIndices = [];
        for (let j = startBufferIndex; j <= endBufferIndex; j += componentsPerPosition) {
            bufferIndices.push(Math.floor(j/3));
        }
        return bufferIndices;
    }
    
    updateColors(pointIndicesThatNeedUpdate) {
        if (this.usePerVertexColors) {
            // const normalized = true; // maps the uints from 0-255 to 0-1
            let geometry = this.getGeometry();
            
            // TODO: pass in a range of points to recompute, and replace the colorsBuffer entries with recomputed values
            
            let topColorAttribute = geometry.top.getAttribute('color');
            let wallColorAttribute = geometry.wall.getAttribute('color');
            
            pointIndicesThatNeedUpdate.forEach(index => {
                let bufferIndices = this.getBufferIndices(index); // []; // todo: get each corresponding index from this.topColorsBuffer and this.wallColorsBuffer
                console.log('pointIndex ' + index + ' yields buffer indices', bufferIndices);
                bufferIndices.forEach(bfrIndex => {
                    let newColor = {
                        r: this.currentPoints[index].color[0],
                        g: this.currentPoints[index].color[1],
                        b: this.currentPoints[index].color[2]
                    }
                    topColorAttribute.setXYZ(bfrIndex, newColor.r, newColor.g, newColor.b);
                    console.log('set colorAttribute[' + bfrIndex + '] to ' + newColor);
                    wallColorAttribute.setXYZ(bfrIndex, newColor.r, newColor.g, newColor.b);
                    // this.topColorsBuffer[bfrIndex] = this.currentPoints[index].color[0]; // get color from point
                    // this.topColorsBuffer[bfrIndex+1] = this.currentPoints[index].color[1]; // get color from point
                    // this.topColorsBuffer[bfrIndex+2] = this.currentPoints[index].color[2]; // get color from point
                });
            })
            
            // let colorAttribute = new THREE.BufferAttribute(new Uint8Array(this.topColorsBuffer), 3, normalized);
            // colorAttribute.setXYZ()
            
            // geometry.top.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.topColorsBuffer), 3, normalized));
            // geometry.wall.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.wallColorsBuffer), 3, normalized));
            
            geometry.top.attributes.color.needsUpdate = true;
            geometry.wall.attributes.color.needsUpdate = true;
        }
    }

    setPoints(points) {
        this.resetPoints(); // removes the previous mesh from the scene and disposes of its geometry
        
        this.currentPoints = points;

        if (points.length < 2) return;

        const topGeometry = new THREE.BufferGeometry(); // The top represents the flat black top of the line
        const wallGeometry = new THREE.BufferGeometry(); // The wall represents the yellow sides of the line
        const up = new THREE.Vector3(0,1,0);

        const topMaterial = getMaterial(this.topColor, this.opacity, this.usePerVertexColors);
        const wallMaterial = getMaterial(this.wallColor, this.opacity, this.usePerVertexColors);

        for (let i = points.length - 1; i > 0; i--) {
            const start = points[i];
            const end = points[i-1];
            const direction = new THREE.Vector3().subVectors(end, start);
            const startTaperFactor = (typeof start.scale !== 'undefined') ? start.scale : 1;
            const endTaperFactor = (typeof end.scale !== 'undefined') ? end.scale : 1;
            const cross = new THREE.Vector3().crossVectors(direction, up).normalize().multiplyScalar(this.width_mm / 2);
            // Base should be wider to allow visibility while moving along line
            const bottomCross = cross.clone().multiplyScalar(this.bottomScale);
            const vertex = this.createVertexComponents(start, end, cross, bottomCross, startTaperFactor, endTaperFactor);

            let colors = {};
            colors[VERT_PATH.start] = {};
            colors[VERT_PATH.end] = {};
            colors[VERT_PATH.start].top = (typeof start.color !== 'undefined') ? start.color : this.topColor;
            colors[VERT_PATH.end].top = (typeof end.color !== 'undefined') ? end.color : this.topColor;
            colors[VERT_PATH.start].wall = (typeof start.color !== 'undefined') ? start.color : this.wallColor;
            colors[VERT_PATH.end].wall = (typeof end.color !== 'undefined') ? end.color : this.wallColor;

            // First top triangle
            this.addTopVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.top, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.top, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

            // Second top triangle
            this.addTopVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.top, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

            // First bottom triangle
            this.addTopVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.bottom, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.bottom, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);

            // Second bottom triangle
            this.addTopVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.bottom, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);

            // First left triangle
            this.addWallVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.bottom, colors);
            this.addWallVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.top, colors);
            this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);

            // Second left triangle
            this.addWallVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.top, colors);
            this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);
            this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);

            // First right triangle
            this.addWallVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.top, colors);
            this.addWallVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.bottom, colors);
            this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);

            // Second right triangle
            this.addWallVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.bottom, colors);
            this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);
            this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);

            // Handle bends by adding extra geometry bridging this segment to the next segment
            if (i > 1) {
                const nextDirection = new THREE.Vector3().subVectors(points[i-2],end);
                const nextCross = new THREE.Vector3().crossVectors(nextDirection, up).normalize().multiplyScalar(this.width_mm / 2);
                const nextBottomCross = nextCross.clone().multiplyScalar(this.bottomScale);
                const nextVertex = this.createVertexComponents(start, end, nextCross, nextBottomCross, startTaperFactor, endTaperFactor);

                // First top triangle
                this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);
                this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
                this.addTopVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

                // Second top triangle
                this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
                this.addTopVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
                this.addTopVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

                // First bottom triangle
                this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);
                this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);
                this.addTopVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);

                // Second bottom triangle
                this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);
                this.addTopVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);
                this.addTopVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);

                // First left triangle
                this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);
                this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);
                this.addWallVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);

                // Second left triangle
                this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);
                this.addWallVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);
                this.addWallVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);

                // First right triangle
                this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
                this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);
                this.addWallVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);

                // Second right triangle
                this.addWallVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);
                this.addWallVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);
                this.addWallVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
            }
        }

        topGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.topPositionsBuffer), 3));
        wallGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.wallPositionsBuffer), 3));

        if (this.usePerVertexColors) {
            const normalized = true; // maps the uints from 0-255 to 0-1
            topGeometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.topColorsBuffer), 3, normalized));
            wallGeometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.wallColorsBuffer), 3, normalized));
        }

        const topMesh = new THREE.Mesh(topGeometry, topMaterial);
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        this.add(topMesh);
        this.add(wallMesh);

        this.onRemove = () => {
            // Since these geometries are not reused, they MUST be disposed to prevent memory leakage
            if (topGeometry) topGeometry.dispose();
            if (wallGeometry) wallGeometry.dispose();
        }
        
        this.getGeometry = () => {
            return {
                top: topGeometry,
                wall: wallGeometry
            }
        }
    }

    // internal helper function
    addTopVertex(x, y, z, color) {
        this.topPositionsBuffer.push(x, y, z);
        if (this.usePerVertexColors) {
            this.topColorsBuffer.push(color[0], color[1], color[2]);
        }
    }

    // internal helper function
    addWallVertex(x, y, z, color) {
        this.wallPositionsBuffer.push(x, y, z);
        if (this.usePerVertexColors) {
            let r = Math.max(0, color[0] * this.wallBrightness);
            let g = Math.max(0, color[1] * this.wallBrightness);
            let b = Math.max(0, color[2] * this.wallBrightness);
            this.wallColorsBuffer.push(r, g, b);
        }
    }

    // internal helper function - adds the vertex information to the topMesh
    addTopVertexHelper(vertexComponents, startEnd, leftRight, topBottom, colors) {
        let thisVertex = vertexComponents[startEnd][topBottom][leftRight];
        this.addTopVertex(thisVertex.x, thisVertex.y, thisVertex.z, colors[startEnd].top);
    }

    // internal helper function - adds the vertex information to the wallMesh
    addWallVertexHelper(vertexComponents, startEnd, leftRight, topBottom, colors) {
        let thisVertex = vertexComponents[startEnd][topBottom][leftRight];
        this.addWallVertex(thisVertex.x, thisVertex.y, thisVertex.z, colors[startEnd].wall);
    }

    // internal helper function - constructs all the vertices that we'll need to render the faces of this segment
    createVertexComponents(start, end, cross, bottomCross, startTaperFactor, endTaperFactor) {
        let components = {};
        [VERT_PATH.start, VERT_PATH.end].forEach((startEnd) => {
            components[startEnd] = {};
            let point = startEnd === VERT_PATH.start ? start : end;
            let taperFactor = startEnd === VERT_PATH.start ? startTaperFactor : endTaperFactor;
            [VERT_PATH.top, VERT_PATH.bottom].forEach((topBottom) => {
                components[startEnd][topBottom] = {};
                let heightOffset = topBottom === VERT_PATH.top ? this.height_mm : 0;
                [VERT_PATH.left, VERT_PATH.right].forEach((leftRight) => {
                    let crossMultiplier = leftRight === VERT_PATH.left ? -1 : 1;
                    components[startEnd][topBottom][leftRight] = {
                        x: point.x + (crossMultiplier * cross.x * taperFactor),
                        y: point.y + (heightOffset * taperFactor),
                        z: point.z + (crossMultiplier * cross.z * taperFactor)
                    }
                });
            });
        });
        return components;
    }
}

export { MeshPath };
