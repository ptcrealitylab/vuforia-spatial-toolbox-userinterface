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
const POSITIONS_PER_POINT = 24; // each point on the path has 8 triangles
const COMPONENTS_PER_POSITION = 3; // each vertex has 3 position components (x,y,z)
const COMPONENTS_PER_COLOR = 4; // each color has 4 components (r,g,b,a)

// Vertex shader
const vertexShader = `
  attribute vec4 color;

  varying vec4 vColor;

  void main() {
    vColor = color;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader
const fragmentShader = `
  varying vec4 vColor;

  void main() {
    gl_FragColor = vec4(vColor.rgb, vColor.a);
  }
`;

/**
 * MeshPath is similar to MeshLine but is an extruded rectangular path where you can also specify color and size
 * for each of the points on the path. It is aligned so that its top faces the global up vector. Different colors can
 * be given to its "horizontal" vs its "wall" faces.
 */
export class MeshPath extends THREE.Group
{
    constructor(path, {widthMm, heightMm, horizontalColor, wallColor, wallBrightness, usePerVertexColors, bottomScale, opacity, colorBlending}) {
        super();

        this.widthMm = widthMm || 10; // 10mm default
        this.heightMm = heightMm || 10;
        this.horizontalColor = horizontalColor || 0xFFFFFF;
        this.wallColor = wallColor || 0xABABAB;
        this.wallBrightness = wallBrightness || 0.8; // sides are by default a bit darker than the horizontal, to make more visible
        this.usePerVertexColors = usePerVertexColors || false;
        this.bottomScale = bottomScale || 1; // if > 1, bottom of path flares out a bit to make sides more visible
        this.opacity = opacity || 1;
        // if true, multiplies perVertexColors by horizontal and wallColors - otherwise vertexColors override the default
        this.colorBlending = colorBlending || false;

        this.horizontalPositionsBuffer = [];
        this.wallPositionsBuffer = [];
        this.horizontalColorsBuffer = [];
        this.wallColorsBuffer = [];

        this.setPoints(path);
    }

    resetPoints() {
        this.horizontalPositionsBuffer = [];
        this.horizontalColorsBuffer = [];
        this.wallPositionsBuffer = [];
        this.wallColorsBuffer = [];

        if (this.horizontalMesh) {
            this.remove(this.horizontalMesh);
        }

        if (this.wallMesh) {
            this.remove(this.wallMesh);
        }

        if (typeof this.onRemove === 'function') {
            this.onRemove(); // dispose of geometry to avoid memory leak
            this.onRemove = null;
        }
    }

    /**
     * @typedef {Vector3} MeshPathPoint
     * @property {(number[]|THREE.Color)} color - The color of the point [0-255, 0-255, 0-255] (only used if perVertexColors=true)
     * @property {number} [scale] - The scale of the point (1.0 = default)
     */
    
    // call this to build (or rebuild) the mesh given an updated array of [{x,y,z}, ...] values
    // each point can also have parameters:
    // - color: [0-255, 0-255, 0-255] (only used if perVertexColors=true)
    // - scale: float (1.0 = default)
    /**
     * Sets the points on the path
     * @param points {MeshPathPoint[]}
     */
    setPoints(points) {
        this.resetPoints(); // removes the previous mesh from the scene and disposes of its geometry
        
        this.currentPoints = points;
        this.currentPoints.forEach(point => {
            // Convert THREE.Color colors into the correct format
            if (point.color && point.color.isColor) {
                point.color = [point.color.r * 255, point.color.g * 255, point.color.b * 255];
            }
            if (point.color.length === 3) {
                point.color.push(255);
            }
        });

        if (points.length < 2) return;

        const horizontalGeometry = new THREE.BufferGeometry(); // The horizontal represents the flat top and bottom of the line
        const wallGeometry = new THREE.BufferGeometry(); // The wall represents the two sides of the line
        const up = new THREE.Vector3(0,1,0);

        const horizontalMaterial = getMaterial(this.horizontalColor, this.opacity, this.usePerVertexColors, this.colorBlending);
        const wallMaterial = getMaterial(this.wallColor, this.opacity, this.usePerVertexColors, this.colorBlending);

        for (let i = points.length - 1; i > 0; i--) {
            const start = points[i];
            const end = points[i-1];
            const direction = new THREE.Vector3().subVectors(end, start);
            const startTaperFactor = (typeof start.scale !== 'undefined') ? start.scale : 1;
            const endTaperFactor = (typeof end.scale !== 'undefined') ? end.scale : 1;
            const cross = new THREE.Vector3().crossVectors(direction, up).normalize().multiplyScalar(this.widthMm / 2);
            // Base can be wider to allow visibility while moving along line
            const bottomCross = cross.clone().multiplyScalar(this.bottomScale);
            const vertex = this.createVertexComponents(start, end, cross, bottomCross, startTaperFactor, endTaperFactor);

            let colors = {};
            colors[VERT_PATH.start] = {};
            colors[VERT_PATH.end] = {};
            colors[VERT_PATH.start].horizontal = (typeof start.color !== 'undefined') ? start.color : this.horizontalColor;
            colors[VERT_PATH.end].horizontal = (typeof end.color !== 'undefined') ? end.color : this.horizontalColor;
            colors[VERT_PATH.start].wall = (typeof start.color !== 'undefined') ? start.color : this.wallColor;
            colors[VERT_PATH.end].wall = (typeof end.color !== 'undefined') ? end.color : this.wallColor;

            // First top triangle
            this.addHorizontalVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.top, colors);
            this.addHorizontalVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.top, colors);
            this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

            // Second top triangle
            this.addHorizontalVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.top, colors);
            this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
            this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

            // First bottom triangle
            this.addHorizontalVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.bottom, colors);
            this.addHorizontalVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.bottom, colors);
            this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);

            // Second bottom triangle
            this.addHorizontalVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.bottom, colors);
            this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);
            this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);

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
                const nextCross = new THREE.Vector3().crossVectors(nextDirection, up).normalize().multiplyScalar(this.widthMm / 2);
                const nextBottomCross = nextCross.clone().multiplyScalar(this.bottomScale);
                const nextVertex = this.createVertexComponents(start, end, nextCross, nextBottomCross, startTaperFactor, endTaperFactor);

                // First top triangle
                this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);
                this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
                this.addHorizontalVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

                // Second top triangle
                this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
                this.addHorizontalVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
                this.addHorizontalVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

                // First bottom triangle
                this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);
                this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);
                this.addHorizontalVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);

                // Second bottom triangle
                this.addHorizontalVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);
                this.addHorizontalVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.bottom, colors);
                this.addHorizontalVertexHelper(nextVertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.bottom, colors);

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

        horizontalGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.horizontalPositionsBuffer), COMPONENTS_PER_POSITION));
        wallGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.wallPositionsBuffer), COMPONENTS_PER_POSITION));

        if (this.usePerVertexColors) {
            const normalized = true; // maps the uints from 0-255 to 0-1
            horizontalGeometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.horizontalColorsBuffer), COMPONENTS_PER_COLOR, normalized));
            wallGeometry.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(this.wallColorsBuffer), COMPONENTS_PER_COLOR, normalized));
        }

        const horizontalMesh = new THREE.Mesh(horizontalGeometry, horizontalMaterial);
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        this.add(horizontalMesh);
        this.add(wallMesh);

        // can be accessed publicly
        this.horizontalMesh = horizontalMesh;
        this.wallMesh = wallMesh;
        
        this.onRemove = () => {
            // Since these geometries are not reused, they MUST be disposed to prevent memory leakage
            if (horizontalGeometry) horizontalGeometry.dispose();
            if (wallGeometry) wallGeometry.dispose();
        }
        
        this.getGeometry = () => {
            return {
                horizontal: horizontalGeometry,
                wall: wallGeometry
            }
        }
    }
    
    addPoints(points) { // TODO: replace with optimized version that appends to the mesh if performance is an issue
        this.setPoints(this.currentPoints.concat(points));
    }

    // internal helper function - adds the vertex information to the horizontalMesh
    addHorizontalVertexHelper(vertexComponents, startEnd, leftRight, topBottom, colors) {
        let thisVertex = vertexComponents[startEnd][topBottom][leftRight];
        this.addHorizontalVertex(thisVertex.x, thisVertex.y, thisVertex.z, colors[startEnd].horizontal);
    }

    // internal helper function - adds the vertex information to the wallMesh
    addWallVertexHelper(vertexComponents, startEnd, leftRight, topBottom, colors) {
        let thisVertex = vertexComponents[startEnd][topBottom][leftRight];
        this.addWallVertex(thisVertex.x, thisVertex.y, thisVertex.z, colors[startEnd].wall);
    }

    // internal helper function
    addHorizontalVertex(x, y, z, color) {
        this.horizontalPositionsBuffer.push(x, y, z);
        if (this.usePerVertexColors) {
            this.horizontalColorsBuffer.push(color[0], color[1], color[2], color[3]);
        }
    }

    // internal helper function
    addWallVertex(x, y, z, color) {
        this.wallPositionsBuffer.push(x, y, z);
        if (this.usePerVertexColors) {
            let r = Math.max(0, color[0] * this.wallBrightness);
            let g = Math.max(0, color[1] * this.wallBrightness);
            let b = Math.max(0, color[2] * this.wallBrightness);
            let a = color[3];
            this.wallColorsBuffer.push(r, g, b, a);
        }
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
                let heightOffset = topBottom === VERT_PATH.top ? this.heightMm : 0;
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

    // given a list of the vertex indices defining a face (such as those returned by a raycast intersection),
    // returns the index of the point on the path that contains that face
    getPointFromFace(vertexIndices) {
        let approximatePointIndex = Math.floor(vertexIndices[0] / POSITIONS_PER_POINT);
        return Math.max(0, Math.min(this.currentPoints.length - 1, (this.currentPoints.length - approximatePointIndex) - 2));
    }

    /**
     * Get the index of the point in the currentPoints array that the intersect is closest to
     * @param {Object} intersect - the intersect object returned by three.js raycasting
     * @return {number} index of the point in the currentPoints array that the intersect is closest to
     */
    getPointFromIntersect(intersect) {
        const face = intersect.face;
        return this.getPointFromFace([face.a, face.b, face.c]);
    }

    // use this to get the indices in the color and position BufferAttributes that correspond to a certain point in the path
    // geometry is constructed backwards, from length-1 down to 0, so buffer attribute indices are "opposite" what you may expect
    getBufferIndices(pointIndex, componentsPerIndex) {
        // if i = length-1, indices = 0-23... if i = length-2, indices = 24-47... if i = length-3, indices = 48-71...
        // generalized formula: if i = length-N, indices = (24 * (N-1)) to (24 * N - 1)
        // special case: if i = 0, indices = (24 * (length-1)) to (24 * length - 1 - 12) // last index only has 12 not 24

        const length = this.currentPoints.length;
        const i = length - pointIndex;
        const startBufferIndex = (POSITIONS_PER_POINT * componentsPerIndex) * (i-2); // todo: this was off by 1 on my first attempt so i'm subtracting (i-2) instead of (i-1), but i'm not sure why
        let endBufferIndex = (POSITIONS_PER_POINT * componentsPerIndex) * (i-1) - 1;
        if (i === length - 1) {
            endBufferIndex -= (POSITIONS_PER_POINT * componentsPerIndex) * 0.5; // last index has half as many positions
        }

        let bufferIndices = [];
        for (let j = startBufferIndex; j <= endBufferIndex; j += componentsPerIndex) {
            bufferIndices.push(Math.floor(j/componentsPerIndex));
        }
        return bufferIndices;
    }

    // calculates the sum of distances between the two points on the path
    getDistanceAlongPath(firstIndex, secondIndex) {
        const smallerIndex = Math.min(firstIndex, secondIndex);
        const biggerIndex = Math.max(firstIndex, secondIndex);
        let totalDistance = 0;
        for (let i = smallerIndex; i < biggerIndex; i++) {
            let thisPoint = this.currentPoints[i];
            let nextPoint = this.currentPoints[i+1];
            let dx = nextPoint.x - thisPoint.x;
            let dy = nextPoint.y - thisPoint.y;
            let dz = nextPoint.z - thisPoint.z;
            let segmentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            totalDistance += segmentDistance;
        }
        return totalDistance;
    }

    // pass in a range of points to recompute, and it replaces the colorsBuffer entries with recomputed values
    // note: modify the point.color beforehand, then call this for the color to be applied
    updateColors(pointIndicesThatNeedUpdate) {
        if (!this.usePerVertexColors) return; // no effect on single-colored paths
        if (typeof this.getGeometry === 'undefined') return; // no geometry yet

        let geometry = this.getGeometry();
        let horizontalColorAttribute = geometry.horizontal.getAttribute('color');
        let wallColorAttribute = geometry.wall.getAttribute('color');
        let brightness = this.wallBrightness;

        pointIndicesThatNeedUpdate.forEach(index => {
            let colorBufferIndices = this.getBufferIndices(index, COMPONENTS_PER_COLOR);
            colorBufferIndices.forEach(bfrIndex => {
                let newColor = {
                    r: this.currentPoints[index].color[0],
                    g: this.currentPoints[index].color[1],
                    b: this.currentPoints[index].color[2],
                    a: this.currentPoints[index].length === 3 ? 255 : this.currentPoints[index].color[3]
                }
                horizontalColorAttribute.setXYZW(bfrIndex, newColor.r, newColor.g, newColor.b, newColor.a);
                wallColorAttribute.setXYZW(bfrIndex, newColor.r * brightness, newColor.g * brightness, newColor.b * brightness, newColor.a);
            });
        })
        geometry.horizontal.attributes.color.needsUpdate = true;
        geometry.wall.attributes.color.needsUpdate = true;
    }
    // todo: add an updatePositions method similar to updateColors that can be used to update the mesh instead of rebuilding it entirely with setPoints
}

/**
 * Lets you reuse materials that share identical properties by generating a hash of those material parameters
 * @param {number|string} color - hex color
 * @param {number} opacity
 * @param {boolean} usePerVertexColors
 * @returns {string}
 */
function getMaterialKey(color, opacity, usePerVertexColors) {
    return JSON.stringify(color) + JSON.stringify(opacity) + JSON.stringify(usePerVertexColors);
}

/**
 * Creates a new material, or returns a cached material, with the provided parameters
 * @param {number|string} color - used if !usePerVertexColors
 * @param {number} opacity - defaults to 1
 * @param {boolean} usePerVertexColors - defaults to false
 * @param {boolean} colorBlending - defaults to false
 * @returns {THREE.MeshBasicMaterial}
 */
function getMaterial(color, opacity = 1, usePerVertexColors = false, colorBlending = false) {
    if (usePerVertexColors && !colorBlending) { color = 0xFFFFFF; } // if color isn't white, vertex colors blend
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
        // cachedMaterials[materialKey] = new THREE.MeshBasicMaterial(params);
        cachedMaterials[materialKey] = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });
    }
    return cachedMaterials[materialKey]; // allows us to reuse materials that have the exact same params
}
