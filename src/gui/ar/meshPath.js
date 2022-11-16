import * as THREE from '../../../thirdPartyCode/three/three.module.js';

let pathMeshResources = {};

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
const getMaterialKey = (color, isTransparent, opacity, perVertexColors) => {
    return JSON.stringify(color) + JSON.stringify(isTransparent) + JSON.stringify(opacity) + JSON.stringify(perVertexColors)
}

// lets you reuse materials that share identical properties
const getMaterial = (color, isTransparent = false, opacity = 1.0, perVertexColors = false) => {
    let materialKey = getMaterialKey(color, isTransparent, opacity);
    if (typeof pathMeshResources[materialKey] === 'undefined') {
        let params = {
            color: color||0x000000,
            transparent: isTransparent
        };
        if (isTransparent) {
            params.opacity = opacity
        }
        if (perVertexColors) {
            params.vertexColors = true;
        }
        pathMeshResources[materialKey] = new THREE.MeshBasicMaterial(params);
    }
    return pathMeshResources[materialKey]; // allows us to reuse materials that have the exact same params
}

class MeshPath extends THREE.Group
{
    constructor(path, {width_mm, height_mm, topColor, wallColor, wallBrightness, perVertexColors, bottomScale}) {
        super();

        this.width_mm = width_mm || 10; // 10mm default
        this.height_mm = height_mm || 10;
        this.topColor = topColor || 0xFFFFFF;
        this.wallColor = wallColor || 0xABABAB;
        this.wallBrightness = wallBrightness || 0.8; // sides are by default a bit darker than the top, to make more visible
        this.perVertexColors = perVertexColors || false;
        this.bottomScale = bottomScale || 1.4; // bottom of path flares out a bit to make sides more visible

        this.topVertices = [];
        this.topColors = [];
        this.wallVertices = [];
        this.wallColors = [];

        this.setPoints(path);
    }

    resetPoints() {
        this.topVertices = [];
        this.topColors = [];
        this.wallVertices = [];
        this.wallColors = [];

        this.children.forEach(childMesh => {
            this.remove(childMesh);
        });

        if (typeof this.onRemove === 'function') {
            this.onRemove(); // dispose of geometry to avoid memory leak
        }
    }

    setPoints(points) {
        this.resetPoints();

        if (points.length < 2) return;

        const topGeometry = new THREE.BufferGeometry(); // The top represents the flat black top of the line
        const wallGeometry = new THREE.BufferGeometry(); // The wall represents the yellow sides of the line
        const up = new THREE.Vector3(0,1,0);

        // Base should be wider to allow visibility while moving along line
        const topMaterial = getMaterial(this.topColor, false, 1, this.perVertexColors);
        const wallMaterial = getMaterial(this.wallColor, false, 1, this.perVertexColors);

        for (let i = points.length - 1; i > 0; i--) {
            const start = points[i];
            const end = points[i-1];
            const direction = new THREE.Vector3().subVectors(end, start);

            const startWidthFactor = (typeof start.weight !== 'undefined') ? start.weight : 1;
            const endWidthFactor = (typeof end.weight !== 'undefined') ? end.weight : 1;

            const cross = new THREE.Vector3().crossVectors(direction, up).normalize().multiplyScalar(this.width_mm / 2);
            const bottomCross = cross.clone().multiplyScalar(this.bottomScale);

            const startTaperFactor = startWidthFactor; // lightDistanceTraveled >= Math.abs(rampLength) ? 1 : lightDistanceTraveled / rampLength;
            const endTaperFactor = endWidthFactor; // lightDistanceTraveled + direction.length() >= Math.abs(rampLength) ? 1 : (lightDistanceTraveled + direction.length()) / rampLength;

            const vertex = this.createVertexComponents(start, end, cross, bottomCross, startTaperFactor, endTaperFactor);

            let startColor = [Math.pow((i / points.length), 2), 0.0, 1.0 - (i / points.length)]; //0xFF00FF;
            let endColor = [Math.pow(((i+1) / points.length), 2), 0.0, 1.0 - ((i+1) / points.length)]; //0xFF00FF;

            if (typeof start.color !== 'undefined') {
                startColor = (typeof start.color !== 'undefined') ? start.color : 0xFFFFFF;
                endColor = (typeof end.color !== 'undefined') ? end.color : 0xFFFFFF;
            }

            let colors = {};
            colors[VERT_PATH.start] = startColor;
            colors[VERT_PATH.end] = endColor;

            // First top triangle
            this.addTopVertexHelper(vertex, VERT_PATH.start, VERT_PATH.left, VERT_PATH.top, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.top, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

            // Second top triangle
            this.addTopVertexHelper(vertex, VERT_PATH.start, VERT_PATH.right, VERT_PATH.top, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.right, VERT_PATH.top, colors);
            this.addTopVertexHelper(vertex, VERT_PATH.end, VERT_PATH.left, VERT_PATH.top, colors);

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

        topGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.topVertices), 3));
        wallGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.wallVertices), 3));

        if (this.perVertexColors) {
            topGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.topColors), 3));
            wallGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.wallColors), 3));
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
    }

    // internal helper function
    addTopVertex(x, y, z, color) {
        this.topVertices.push(x, y, z);
        if (this.perVertexColors) {
            this.topColors.push(color[0], color[1], color[2]);
        }
    }

    // internal helper function
    addWallVertex(x, y, z, color) {
        this.wallVertices.push(x, y, z);
        if (this.perVertexColors) {
            let r = Math.max(0, color[0] * this.wallBrightness);
            let g = Math.max(0, color[1] * this.wallBrightness);
            let b = Math.max(0, color[2] * this.wallBrightness);
            this.wallColors.push(r, g, b);
        }
    }

    // internal helper function - adds the vertex information to the topMesh
    addTopVertexHelper(vertexComponents, startEnd, leftRight, topBottom, colors) {
        let thisVertex = vertexComponents[startEnd][topBottom][leftRight];
        this.addTopVertex(thisVertex.x, thisVertex.y, thisVertex.z, colors[startEnd]);
    }

    // internal helper function - adds the vertex information to the wallMesh
    addWallVertexHelper(vertexComponents, startEnd, leftRight, topBottom, colors) {
        let thisVertex = vertexComponents[startEnd][topBottom][leftRight];
        this.addWallVertex(thisVertex.x, thisVertex.y, thisVertex.z, colors[startEnd]);
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
