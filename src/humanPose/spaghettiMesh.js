import * as THREE from '../../thirdPartyCode/three/three.module.js';

let pathMeshResources;
const LINE_WIDTH_POWER = 1.2;
const CELL_SIZE_MM = 250;

// Allows us to reuse materials and geometries
const getPathMeshResources = (THREE, lightWidth, lightLength, reuseMaterials, topColor, wallColor) => {
    if (reuseMaterials) {
        if (!pathMeshResources) {
            const lightGeometry = new THREE.BoxGeometry(lightWidth,2,lightLength);
            const lightMaterial = new THREE.MeshBasicMaterial({color:0xFFFFCC, transparent:true});
            const topMaterial = new THREE.MeshBasicMaterial({color:topColor||0x000000, transparent:true});
            const wallMaterial = new THREE.MeshBasicMaterial({color:wallColor||0xffffff, transparent:true, opacity:0.8});
            const floorMaterial = new THREE.MeshBasicMaterial({color:0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide});
            pathMeshResources = {lightGeometry, lightMaterial, topMaterial, wallMaterial, floorMaterial};
        }
        return pathMeshResources;
    } else {
        const lightGeometry = new THREE.BoxGeometry(lightWidth,2,lightLength);
        const lightMaterial = new THREE.MeshBasicMaterial({color:0xFFFFCC, transparent:true});
        // const topMaterial = new THREE.MeshBasicMaterial({color:topColor||0x000000, transparent:true});
        // const wallMaterial = new THREE.MeshBasicMaterial({color:wallColor||0xffffff, transparent:true, opacity:0.8});

        const topMaterial = new THREE.MeshBasicMaterial({vertexColors: true});
        const wallMaterial = new THREE.MeshBasicMaterial({vertexColors: true});

        const floorMaterial = new THREE.MeshBasicMaterial({color:0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide});

        return {lightGeometry, lightMaterial, topMaterial, wallMaterial, floorMaterial};
    }
}

function calculatePathWeights(path) {
    if (!path || path.length === 0) { return; }

    // create a grid big enough to cover all of the points
    let xPoints = path.map(pose => pose.x);
    let yPoints = path.map(pose => pose.y);
    let zPoints = path.map(pose => pose.z);
    let minX = Math.min.apply(Math, xPoints);
    let minY = Math.min.apply(Math, yPoints);
    let minZ = Math.min.apply(Math, zPoints);
    let maxX = Math.max.apply(Math, xPoints);
    let maxY = Math.max.apply(Math, yPoints);
    let maxZ = Math.max.apply(Math, zPoints);
    let width = maxX - minX;
    let height = maxZ - minZ;
    let grid = new Grid(minX, minZ, width, height, Math.floor(height / CELL_SIZE_MM), Math.floor(width / CELL_SIZE_MM));
    
    // count how many points are in each cell by adding each point to the grid
    grid.recomputeCells(path);

    for (let i = 0; i < path.length - 1; i++) {
        let point = path[i];
        let containingCell = grid.getCellContaining(point.x, point.z);
        if (containingCell) {
            point.weight = Math.pow(containingCell.pointCount, LINE_WIDTH_POWER);
            // ctx.lineWidth = Math.pow(containingCell0.pointCount, LINE_WIDTH_POWER); // scale less-than-linearly with pointCount
        } else {
            point.weight = 1;
            // ctx.lineWidth = 1;
        }
        
        point.y = (maxY + minY) * 0.5;
    }
}

function calculatePathSpeeds(path) {
    
    function distance(pointA, pointB) {
        return Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2) + Math.pow(pointA.z - pointB.z, 2));
    }
    
    let window = 10;
    for (let i = 0; i < path.length - 1; i++) {
        let rollingAverage = 0;
        if (i > window) {
            for (let j = i - window; j < i - 1; j++) {
                let pointA = path[j];
                let pointB = path[j+1];
                rollingAverage += distance(pointA, pointB);
            }
        }
        path[i].speed = rollingAverage;
    }
}

// Converts a path in 3D space to a three.js mesh
function pathToMesh(path, width, height, topColor, wallColor) {
    calculatePathWeights(path);
    calculatePathSpeeds(path);
    if (path.length < 2) {
        return new THREE.Group();
    }
    const rampAngle = 35;
    const rampHeight = path[path.length - 1].y - path[0].y;
    const rampRatio = Math.tan(rampAngle * Math.PI / 180);
    const rampLength = rampHeight / rampRatio;
    path[path.length - 1].y = path[0].y; // Simplifies math later
    const pathWidth = width || 50; // 50mm
    const pathHeight = height || 50; // 50mm
    const topGeometry = new THREE.BufferGeometry(); // The top represents the flat black top of the line
    const wallGeometry = new THREE.BufferGeometry(); // The wall represents the yellow sides of the line
    let topVertices = [];
    let wallVertices = [];
    let floorVertices = [];
    let topColors = [];
    let wallColors = [];
    const up = new THREE.Vector3(0,1,0);
    // Base should be wider to allow visibility while moving along line
    const bottomScale = 1.4; // How much wider the bottom of the walls is
    let lightDistanceTraveled = 0; // Used to determine light placement
    // const lightInterval = 128; // mm offset between lights
    // const lightTimingInterval = 2000; // ms frequency of pulse
    // const lightOnDuration = 60; // ms duration of pulse on per light
    // const lightSpeed = 10; // pulse speed multiplier
    const lightWidth = 10; // mm width of lightSource
    const lightLength = 64; // mm length of light source
    // const lightGroup = new THREE.Group();

    const resources = getPathMeshResources(THREE, lightWidth, lightLength, false, topColor, wallColor);
    // const lightGeometry = resources.lightGeometry;
    // const lightMaterial = resources.lightMaterial;
    const topMaterial = resources.topMaterial;
    const wallMaterial = resources.wallMaterial;
    const floorMaterial = resources.floorMaterial;

    const floorShape = new THREE.Shape();

    floorShape.moveTo(path[path.length-1].x, path[path.length-1].z);
    
    function addTopVertex(x, y, z, color) {
        topVertices.push(x, y, z);
        topColors.push(color[0], color[1], color[2]);
    }
    
    function addWallVertex(x, y, z, color) {
        wallVertices.push(x, y, z);
        let darken = 0.5;
        let r = Math.max(0, color[0] * darken);
        let g = Math.max(0, color[1] * darken);
        let b = Math.max(0, color[2] * darken);
        wallColors.push(r, g, b);
    }

    function getColor(point, minSpeed, maxSpeed) {
        let speed = typeof point.speed !== 'undefined' ? point.speed : 0;
        let mappedSpeed = (speed - minSpeed) / (maxSpeed - minSpeed);
        
        if (mappedSpeed > 0.5) {
            return [0, 0.25, 1];
        } else if (mappedSpeed > 0.4) {
            return [1, 1, 0];
        } else {
            return [1, 0, 0];
        }
        
        // let r = mappedSpeed; // Math.pow(1.0 - mappedSpeed, 2);
        // let g = 0.5 - Math.abs(mappedSpeed - 0.5);
        // let b = Math.pow(mappedSpeed, 2);
        // return [r, g, b];
    }

    let speeds = path.map(point => point.speed).filter(speed => { return typeof speed !== 'undefined' });
    const minSpeed = Math.min.apply(Math, speeds);
    const maxSpeed = Math.max.apply(Math, speeds);

    for (let i = path.length - 1; i > 0; i--) {
        const start = path[i];
        const end = path[i-1];
        const direction = new THREE.Vector3().subVectors(end, start);
        
        const preventZFighting = 0.1 * (i / path.length);
        const startWidthFactor = preventZFighting + (typeof start.weight !== 'undefined') ? start.weight : 1;
        const endWidthFactor = preventZFighting + (typeof end.weight !== 'undefined') ? end.weight : 1;
        
        const cross = new THREE.Vector3().crossVectors(direction, up).normalize().multiplyScalar(pathWidth / 2);
        const bottomCross = cross.clone().multiplyScalar(bottomScale);

        const startRampHeight = 1; // lightDistanceTraveled >= Math.abs(rampLength) ? 0 : (rampLength - lightDistanceTraveled) * rampRatio;
        const endRampHeight = 1; // lightDistanceTraveled + direction.length() >= Math.abs(rampLength) ? 0 : (rampLength - (lightDistanceTraveled + direction.length())) * rampRatio;

        const startTaperFactor = startWidthFactor; // lightDistanceTraveled >= Math.abs(rampLength) ? 1 : lightDistanceTraveled / rampLength;
        const endTaperFactor = endWidthFactor; // lightDistanceTraveled + direction.length() >= Math.abs(rampLength) ? 1 : (lightDistanceTraveled + direction.length()) / rampLength;

        let startColor = [(i / path.length), 0.0, 1.0 - (i / path.length)]; //0xFF00FF;
        let endColor = [((i+1) / path.length), 0.0, 1.0 - ((i+1) / path.length)]; //0xFF00FF;

        startColor = getColor(start, minSpeed, maxSpeed);
        endColor = getColor(end, minSpeed, maxSpeed);

        // let startData = {
        //     point: start,
        //     taperFactor: startTaperFactor,
        //     rampHeight: startRampHeight,
        //     color: startColor
        // }
        //
        // let endData = {
        //     point: end,
        //     taperFactor: endTaperFactor,
        //     rampHeight: endRampHeight,
        //     color: endColor
        // }

        // First top triangle
        addTopVertex(start.x-cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z-cross.z*startTaperFactor, startColor);
        addTopVertex(start.x+cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z+cross.z*startTaperFactor, startColor);
        addTopVertex(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor, endColor);

        // Second top triangle
        addTopVertex(start.x+cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z+cross.z*startTaperFactor, startColor);
        addTopVertex(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor, endColor);
        addTopVertex(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor, endColor);

        // First left triangle
        addWallVertex(start.x-bottomCross.x*startTaperFactor, start.y+startRampHeight, start.z-bottomCross.z*startTaperFactor, startColor);
        addWallVertex(start.x-cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z-cross.z*startTaperFactor, startColor);
        addWallVertex(end.x-bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-bottomCross.z*endTaperFactor, endColor);

        // Second left triangle
        addWallVertex(start.x-cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z-cross.z*startTaperFactor, startColor);
        addWallVertex(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor, endColor);
        addWallVertex(end.x-bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-bottomCross.z*endTaperFactor, endColor);

        // First right triangle
        addWallVertex(start.x+cross.x*startTaperFactor, start.y+pathHeight*startTaperFactor+startRampHeight, start.z+cross.z*startTaperFactor, startColor);
        addWallVertex(start.x+bottomCross.x*startTaperFactor, start.y+startRampHeight, start.z+bottomCross.z*startTaperFactor, startColor);
        addWallVertex(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor, endColor);

        // Second right triangle
        addWallVertex(start.x+bottomCross.x*startTaperFactor, start.y+startRampHeight, start.z+bottomCross.z*startTaperFactor, startColor);
        addWallVertex(end.x+bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z+bottomCross.z*endTaperFactor, endColor);
        addWallVertex(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor, endColor);

        // Handle bends
        if (i > 1) {
            const nextDirection = new THREE.Vector3().subVectors(path[i-2],end);
            const nextCross = new THREE.Vector3().crossVectors(nextDirection, up).normalize().multiplyScalar(pathWidth / 2);
            const nextBottomCross = nextCross.clone().multiplyScalar(bottomScale);

            // First top triangle
            addTopVertex(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor, endColor);
            addTopVertex(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor, endColor);
            addTopVertex(end.x-nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-nextCross.z*endTaperFactor, endColor);

            // Second top triangle
            addTopVertex(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor, endColor);
            addTopVertex(end.x+nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+nextCross.z*endTaperFactor, endColor);
            addTopVertex(end.x-nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-nextCross.z*endTaperFactor, endColor);

            // First left triangle
            addWallVertex(end.x-bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-bottomCross.z*endTaperFactor, endColor);
            addWallVertex(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor, endColor);
            addWallVertex(end.x-nextBottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-nextBottomCross.z*endTaperFactor, endColor);

            // Second left triangle
            addWallVertex(end.x-cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-cross.z*endTaperFactor, endColor);
            addWallVertex(end.x-nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z-nextCross.z*endTaperFactor, endColor);
            addWallVertex(end.x-nextBottomCross.x*endTaperFactor, end.y+endRampHeight, end.z-nextBottomCross.z*endTaperFactor, endColor);

            // First right triangle
            addWallVertex(end.x+cross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+cross.z*endTaperFactor, endColor);
            addWallVertex(end.x+bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z+bottomCross.z*endTaperFactor, endColor);
            addWallVertex(end.x+nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+nextCross.z*endTaperFactor, endColor);

            // Second right triangle
            addWallVertex(end.x+bottomCross.x*endTaperFactor, end.y+endRampHeight, end.z+bottomCross.z*endTaperFactor, endColor);
            addWallVertex(end.x+nextBottomCross.x*endTaperFactor, end.y+endRampHeight, end.z+nextBottomCross.z*endTaperFactor, endColor);
            addWallVertex(end.x+nextCross.x*endTaperFactor, end.y+pathHeight*endTaperFactor+endRampHeight, end.z+nextCross.z*endTaperFactor, endColor);
        }

        // const lightPos = start.clone();
        //
        // let segLengthRemaining = direction.length();
        // const directionNorm = direction.clone().normalize();
        // while (segLengthRemaining > lightInterval - (lightDistanceTraveled % lightInterval)) {
        //     const intervalDistanceTraveled = lightInterval - (lightDistanceTraveled % lightInterval);
        //     lightDistanceTraveled += intervalDistanceTraveled;
        //     segLengthRemaining -= intervalDistanceTraveled;
        //     lightPos.addScaledVector(directionNorm, intervalDistanceTraveled);
        //     const isLightOn = (lightDistanceTraveled / lightSpeed + Date.now()) % lightTimingInterval < lightOnDuration;
        //     if (isLightOn) {
        //         const frac = segLengthRemaining / direction.length();
        //         const rampHeight = startRampHeight * frac + endRampHeight * (1-frac);
        //         const taperFactor = startTaperFactor * frac + endTaperFactor * (1-frac);
        //         const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
        //
        //         lightMesh.position.copy(lightPos);
        //         lightMesh.position.y += pathHeight * taperFactor + rampHeight;
        //
        //         const lightEnd = end.clone();
        //         lightEnd.y += pathHeight * endTaperFactor + endRampHeight;
        //         lightMesh.lookAt(lightEnd);
        //
        //         lightMesh.scale.x *= taperFactor;
        //         lightMesh.scale.y *= taperFactor;
        //
        //         lightGroup.add(lightMesh);
        //     }
        // }
        // lightDistanceTraveled += segLengthRemaining;

        floorShape.lineTo(start.x, start.z);
    }

    floorShape.lineTo(path[path.length-1].x, path[path.length-1].z);

    const floorGeometry = new THREE.ShapeGeometry(floorShape); // This is a wide flat surface inside the path

    topGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(topVertices), 3));
    wallGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wallVertices), 3));

    topGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(topColors), 3));
    wallGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(wallColors), 3));

    const topMesh = new THREE.Mesh(topGeometry, topMaterial);
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = Math.PI / 2;
    const group = new THREE.Group();
    group.add(topMesh);
    group.add(wallMesh);
    // group.add(floorMesh);
    // group.add(lightGroup);
    group.onRemove = () => {
        // Since these geometries are not reused, they MUST be disposed to prevent memory leakage
        topGeometry.dispose();
        wallGeometry.dispose();
    }
    return group;
}

function getMockData() {
    return JSON.parse(
        '[{"x":-375.99066162109375,"y":244.294921875,"z":24.56105613708496},{"x":-543.0173950195312,"y":55.57632064819336,"z":83.91928100585938},{"x":-607.261962890625,"y":-43.736385345458984,"z":130.1407928466797},{"x":-657.388427734375,"y":-113.93836975097656,"z":193.109130859375},{"x":-677.9588012695312,"y":-216.65643310546875,"z":108.14539337158203},{"x":-644.9172973632812,"y":-185.55075073242188,"z":208.3302001953125},{"x":-678.1205444335938,"y":-213.30116271972656,"z":103.01103210449219},{"x":-571.2301635742188,"y":-244.75999450683594,"z":0.7304986119270325},{"x":-495.7721252441406,"y":-205.8726043701172,"z":-101.62065124511719},{"x":-441.8619079589844,"y":-164.6898651123047,"z":-185.40647888183594},{"x":-481.8182067871094,"y":-99.99909973144531,"z":-254.4620361328125},{"x":-576.2536010742188,"y":-127.65504455566406,"z":-215.04214477539062},{"x":-646.3054809570312,"y":-187.0659942626953,"z":-174.85247802734375},{"x":-733.993896484375,"y":-239.3717803955078,"z":-162.80740356445312},{"x":-824.4600219726562,"y":-264.45166015625,"z":-276.4211120605469},{"x":-748.6368408203125,"y":-221.69659423828125,"z":-351.0700988769531},{"x":-622.5831298828125,"y":-161.8859405517578,"z":-372.50091552734375},{"x":-501.5324401855469,"y":-82.66122436523438,"z":-385.3371276855469},{"x":-372.6900329589844,"y":-1.0948917865753174,"z":-402.983154296875},{"x":-251.85470581054688,"y":63.44490432739258,"z":-420.5785217285156},{"x":-130.24020385742188,"y":121.46295928955078,"z":-428.0047912597656},{"x":-15.524059295654297,"y":157.58114624023438,"z":-433.7489318847656},{"x":102.2258529663086,"y":186.26771545410156,"z":-439.3536071777344},{"x":29.862497329711914,"y":271.8401794433594,"z":-447.5238037109375},{"x":-31.087779998779297,"y":361.1811828613281,"z":-444.265869140625},{"x":-84.80274963378906,"y":491.2099304199219,"z":-447.0948181152344},{"x":-142.53993225097656,"y":573.5298461914062,"z":-452.1474609375},{"x":-217.20721435546875,"y":649.8809814453125,"z":-442.4753723144531},{"x":-309.6764831542969,"y":739.3751831054688,"z":-410.8558654785156},{"x":-361.5542907714844,"y":852.7072143554688,"z":-408.021484375},{"x":-394.3440856933594,"y":964.9578857421875,"z":-412.8228759765625},{"x":-462.11016845703125,"y":1087.798583984375,"z":-408.2248229980469},{"x":-512.834228515625,"y":1196.04931640625,"z":-419.2402038574219},{"x":-526.9329833984375,"y":1311.4112548828125,"z":-442.8211364746094},{"x":-537.9931030273438,"y":1437.90576171875,"z":-454.0491027832031},{"x":-543.5577392578125,"y":1565.831298828125,"z":-450.2752990722656},{"x":-536.3020629882812,"y":1675.236083984375,"z":-455.1629333496094},{"x":-517.4773559570312,"y":1776.9537353515625,"z":-460.1511535644531},{"x":-495.5506286621094,"y":1876,"z":-454.5565490722656},{"x":-484.85400390625,"y":1982.1239013671875,"z":-445.5539245605469},{"x":-481.52728271484375,"y":2085.737548828125,"z":-467.7055969238281},{"x":-473.5550231933594,"y":2216.78173828125,"z":-425.6163635253906},{"x":-521.0978393554688,"y":2338.78759765625,"z":-401.23834228515625},{"x":-568.115478515625,"y":2453.28369140625,"z":-413.74615478515625},{"x":-596.5391845703125,"y":2606.563720703125,"z":-424.97900390625},{"x":-630.784423828125,"y":2781.35986328125,"z":-414.2987060546875},{"x":-638.6370849609375,"y":2946.4853515625,"z":-417.6772155761719},{"x":-600.6090087890625,"y":3123.73681640625,"z":-428.2222900390625},{"x":-513.850830078125,"y":3330.183349609375,"z":-440.1222839355469},{"x":-417.3072509765625,"y":3400.43701171875,"z":-421.6228332519531},{"x":-456.4542236328125,"y":3275.931640625,"z":-399.6417236328125},{"x":-505.2366638183594,"y":3153.822509765625,"z":-388.16754150390625},{"x":-533.3500366210938,"y":3052.993408203125,"z":-379.6955261230469},{"x":-571.76025390625,"y":2923.519775390625,"z":-370.2034912109375},{"x":-596.2605590820312,"y":2789.286376953125,"z":-372.3182067871094},{"x":-589.5233154296875,"y":2649.635498046875,"z":-364.288818359375},{"x":-571.7684936523438,"y":2482.470703125,"z":-344.360595703125},{"x":-551.5372314453125,"y":2293.1171875,"z":-345.4083251953125},{"x":-540.5661010742188,"y":2117.682373046875,"z":-351.35260009765625},{"x":-541.9321899414062,"y":1951.3037109375,"z":-334.3017578125},{"x":-551.865234375,"y":1790.7725830078125,"z":-328.5793762207031},{"x":-547.2013549804688,"y":1644.885986328125,"z":-334.9021911621094},{"x":-521.8911743164062,"y":1494.71630859375,"z":-311.4481506347656},{"x":-498.4764709472656,"y":1334.4169921875,"z":-288.1441955566406},{"x":-476.5863037109375,"y":1181.537353515625,"z":-305.74078369140625},{"x":-466.8349304199219,"y":1037.30908203125,"z":-304.7193298339844},{"x":-448.20660400390625,"y":900.9100341796875,"z":-291.4696044921875},{"x":-435.2280578613281,"y":760.5453491210938,"z":-275.24041748046875},{"x":-409.08551025390625,"y":464.4205017089844,"z":-267.7709045410156},{"x":-397.9734802246094,"y":355.15155029296875,"z":-261.344970703125},{"x":-398.3798828125,"y":235.2526092529297,"z":-268.430908203125},{"x":-435.97711181640625,"y":136.8900146484375,"z":-276.1773376464844},{"x":-512.245849609375,"y":53.34694290161133,"z":-257.2114562988281},{"x":-487.4244079589844,"y":-38.33183288574219,"z":-225.23519897460938},{"x":-422.66619873046875,"y":-136.81349182128906,"z":-227.1142578125},{"x":-321.5405578613281,"y":-170.467041015625,"z":-246.89157104492188},{"x":-212.58035278320312,"y":-158.02386474609375,"z":-276.7846374511719},{"x":-236.1907196044922,"y":-63.4890251159668,"z":-336.9031066894531},{"x":-218.94468688964844,"y":84.87306213378906,"z":-364.9883117675781},{"x":-196.26150512695312,"y":225.64016723632812,"z":-384.9173889160156},{"x":-195.2700958251953,"y":330.81121826171875,"z":-372.2056884765625},{"x":-231.9048309326172,"y":452.77655029296875,"z":-377.0559997558594},{"x":-336.42388916015625,"y":539.6475219726562,"z":-385.0030517578125},{"x":-529.5590209960938,"y":722.3941040039062,"z":-370.7302551269531},{"x":-563.8394775390625,"y":845.7889404296875,"z":-369.13604736328125},{"x":-570.6229858398438,"y":951.8536376953125,"z":-359.46697998046875},{"x":-571.4610595703125,"y":1098.51806640625,"z":-348.1841735839844},{"x":-640.8906860351562,"y":1261.5706787109375,"z":-335.3008728027344},{"x":-632.6453247070312,"y":1410.5198974609375,"z":-368.572998046875},{"x":-647.6185913085938,"y":1553.495361328125,"z":-372.4735107421875},{"x":-663.5347900390625,"y":1696.006591796875,"z":-362.530029296875},{"x":-681.3651123046875,"y":1871.8267822265625,"z":-369.0101318359375},{"x":-696.7887573242188,"y":2044.33056640625,"z":-379.7572937011719},{"x":-699.0809326171875,"y":2220.48046875,"z":-366.8678283691406},{"x":-697.7083129882812,"y":2398.876953125,"z":-350.0546875},{"x":-691.7320556640625,"y":2572.571533203125,"z":-360.2370300292969},{"x":-702.5165405273438,"y":2742.085693359375,"z":-352.6451110839844},{"x":-688.1470336914062,"y":2914.81494140625,"z":-329.7098388671875},{"x":-653.8021240234375,"y":3098.03271484375,"z":-333.9570007324219},{"x":-596.8329467773438,"y":3251.572021484375,"z":-320.3107604980469},{"x":-524.8057250976562,"y":3395.638916015625,"z":-276.3009338378906},{"x":-419.51654052734375,"y":3529.353271484375,"z":-265.87139892578125},{"x":-308.70947265625,"y":3636.164306640625,"z":-242.80123901367188},{"x":-207.65049743652344,"y":3710.02587890625,"z":-220.0342559814453},{"x":-46.6671142578125,"y":3774.765869140625,"z":-203.8720245361328},{"x":56.38201904296875,"y":3799.5322265625,"z":-215.66384887695312},{"x":154.80416870117188,"y":3812.44384765625,"z":-232.9929656982422},{"x":255.2702178955078,"y":3809.076416015625,"z":-247.7141571044922},{"x":551.5722045898438,"y":3779.900146484375,"z":-259.2248840332031},{"x":701.89697265625,"y":3758.95361328125,"z":-257.45709228515625},{"x":894.0657958984375,"y":3723.560302734375,"z":-217.1580352783203},{"x":993.6070556640625,"y":3703.341796875,"z":-202.4656982421875},{"x":1167.314453125,"y":3654.82763671875,"z":-214.50924682617188},{"x":1265.2811279296875,"y":3623.37939453125,"z":-229.68849182128906},{"x":1420.5255126953125,"y":3538.99462890625,"z":-230.68429565429688},{"x":1510.39599609375,"y":3451.760498046875,"z":-220.5107421875},{"x":1611.947021484375,"y":3355.662353515625,"z":-191.476318359375},{"x":1712.8856201171875,"y":3260.231689453125,"z":-198.05955505371094},{"x":1784.9515380859375,"y":3184.157470703125,"z":-194.74464416503906},{"x":1767.189453125,"y":3330.563720703125,"z":-198.73727416992188},{"x":1740.7421875,"y":3452.057373046875,"z":-195.01231384277344},{"x":1727.9615478515625,"y":3558.049560546875,"z":-192.78662109375},{"x":1757.2344970703125,"y":3673.84619140625,"z":-178.76394653320312},{"x":1854.9619140625,"y":3759.31298828125,"z":-194.08990478515625},{"x":1954.849609375,"y":3740.110595703125,"z":-179.29331970214844},{"x":1882.967041015625,"y":3653.540771484375,"z":-177.73260498046875},{"x":1805.536865234375,"y":3551.31005859375,"z":-184.51455688476562},{"x":1751.265380859375,"y":3456.50830078125,"z":-196.53172302246094},{"x":1737.84521484375,"y":3355.52880859375,"z":-190.07168579101562},{"x":1794.057861328125,"y":3244.06787109375,"z":-195.64181518554688},{"x":1706.999755859375,"y":3306.093505859375,"z":-198.08645629882812},{"x":1645.9598388671875,"y":3390.751708984375,"z":-211.05209350585938},{"x":1622.4197998046875,"y":3511.48486328125,"z":-220.51657104492188},{"x":1564.615234375,"y":3610.54345703125,"z":-222.68637084960938},{"x":1444.9918212890625,"y":3697.06591796875,"z":-223.70823669433594},{"x":1311.2373046875,"y":3745.646484375,"z":-218.61199951171875},{"x":1186.0205078125,"y":3784.7119140625,"z":-212.25465393066406},{"x":1063.0750732421875,"y":3801.225341796875,"z":-192.62265014648438},{"x":905.4424438476562,"y":3813.42578125,"z":-174.00033569335938},{"x":710.0770263671875,"y":3828.36865234375,"z":-179.92066955566406},{"x":514.0892333984375,"y":3839.693115234375,"z":-195.01400756835938},{"x":340.6750793457031,"y":3853.649658203125,"z":-192.64251708984375},{"x":169.58790588378906,"y":3865.03369140625,"z":-171.90037536621094},{"x":70.29595184326172,"y":3877.59423828125,"z":-169.7827911376953},{"x":-202.12107849121094,"y":3903.9853515625,"z":-189.2625274658203},{"x":-335.615478515625,"y":3918.7119140625,"z":-177.65750122070312},{"x":-495.1733703613281,"y":3932.2255859375,"z":-185.06907653808594},{"x":-604.5991821289062,"y":3943.77880859375,"z":-196.10641479492188},{"x":-708.2020874023438,"y":3927.04052734375,"z":-183.60765075683594},{"x":-579.2330322265625,"y":3967.27490234375,"z":-186.3840789794922},{"x":-483.5653076171875,"y":4002.89306640625,"z":-179.2281494140625},{"x":-392.0914611816406,"y":4060.718994140625,"z":-173.56500244140625},{"x":-301.76800537109375,"y":4127.939453125,"z":-176.6822967529297},{"x":-168.42935180664062,"y":4171.56689453125,"z":-158.6736297607422},{"x":-51.2179069519043,"y":4173.39453125,"z":-157.77267456054688},{"x":104.71988677978516,"y":4167.71435546875,"z":-183.75189208984375},{"x":227.1339874267578,"y":4194.57177734375,"z":-189.11611938476562},{"x":348.0069885253906,"y":4239.1162109375,"z":-176.31834411621094},{"x":464.0609130859375,"y":4329.7529296875,"z":-166.46456909179688},{"x":559.8056640625,"y":4424.65966796875,"z":-172.3753662109375},{"x":638.5113525390625,"y":4537.125,"z":-174.1011962890625},{"x":733.6593017578125,"y":4689.4111328125,"z":-168.22567749023438},{"x":778.9494018554688,"y":4811.0888671875,"z":-181.7599639892578},{"x":810.6685180664062,"y":4956.7158203125,"z":-179.5651092529297},{"x":840.3902587890625,"y":5130.23486328125,"z":-172.81455993652344},{"x":857.4939575195312,"y":5231.46142578125,"z":-185.59744262695312},{"x":943.7565307617188,"y":5677.7607421875,"z":-208.40113830566406},{"x":966.2932739257812,"y":5868.01953125,"z":-221.86676025390625},{"x":975.94580078125,"y":6056.63330078125,"z":-219.74685668945312},{"x":1006.0617065429688,"y":6253.0283203125,"z":-211.67901611328125},{"x":1022.6770629882812,"y":6351.880859375,"z":-220.35418701171875},{"x":1072.541259765625,"y":6528.97802734375,"z":-232.5324249267578},{"x":1138.9674072265625,"y":6700.09619140625,"z":-226.98681640625},{"x":1223.0323486328125,"y":6861.44091796875,"z":-232.72796630859375},{"x":1290.789306640625,"y":7001.828125,"z":-254.78167724609375},{"x":1344.88427734375,"y":7142.31884765625,"z":-253.26873779296875},{"x":1399.722412109375,"y":7304.6953125,"z":-228.8523712158203},{"x":1469.5301513671875,"y":7490.49560546875,"z":-237.13308715820312},{"x":1507.0452880859375,"y":7635.0068359375,"z":-239.73696899414062},{"x":1533.485107421875,"y":7801.1240234375,"z":-220.8638458251953},{"x":1555.100341796875,"y":7954.5302734375,"z":-244.4318084716797},{"x":1550.094970703125,"y":8096.216796875,"z":-237.29705810546875},{"x":1546.73828125,"y":8270.0400390625,"z":-219.93898010253906},{"x":1532.49365234375,"y":8442.978515625,"z":-225.85244750976562},{"x":1485.5023193359375,"y":8553.04296875,"z":-230.9930877685547},{"x":1391.335693359375,"y":8627.78125,"z":-227.41441345214844},{"x":1280.294677734375,"y":8658.7451171875,"z":-229.32254028320312},{"x":1134.498779296875,"y":8667.0419921875,"z":-216.4237823486328},{"x":1028.27392578125,"y":8660.0576171875,"z":-220.40542602539062},{"x":898.455810546875,"y":8624.4892578125,"z":-221.5628662109375},{"x":799.72412109375,"y":8594.20703125,"z":-216.4681396484375},{"x":712.8895874023438,"y":8544.03515625,"z":-231.81759643554688},{"x":823.8306274414062,"y":8530.1142578125,"z":-238.828369140625},{"x":978.2498779296875,"y":8579.55078125,"z":-241.68856811523438},{"x":1107.46533203125,"y":8626.169921875,"z":-249.77122497558594},{"x":1276.5633544921875,"y":8674.1630859375,"z":-249.9400177001953},{"x":1421.7672119140625,"y":8699.5908203125,"z":-236.5946502685547},{"x":1549.9083251953125,"y":8707.849609375,"z":-228.90603637695312},{"x":1680.553466796875,"y":8716.611328125,"z":-257.0109558105469},{"x":1783.748046875,"y":8742.2646484375,"z":-258.7345886230469},{"x":1898.588134765625,"y":8770.9296875,"z":-255.9490509033203},{"x":2038.9921875,"y":8791.4951171875,"z":-247.96775817871094},{"x":2162.700927734375,"y":8782.9931640625,"z":-262.10064697265625},{"x":2115.96923828125,"y":8678.5771484375,"z":-267.7841491699219},{"x":2001.807373046875,"y":8654.7275390625,"z":-269.0387878417969},{"x":1839.60009765625,"y":8617.720703125,"z":-257.2106018066406},{"x":1689.7493896484375,"y":8579.791015625,"z":-273.6954345703125},{"x":1598.15380859375,"y":8475.021484375,"z":-267.8365478515625},{"x":1539.67236328125,"y":8362.2333984375,"z":-241.54835510253906},{"x":1464.76513671875,"y":8208.0244140625,"z":-255.5179443359375},{"x":1417.0948486328125,"y":8103.27587890625,"z":-265.78857421875},{"x":1336.7882080078125,"y":7894.25,"z":-261.3247985839844},{"x":1282.4150390625,"y":7711.8896484375,"z":-272.023193359375},{"x":1270.6561279296875,"y":7520.3310546875,"z":-272.824462890625},{"x":1273.7777099609375,"y":7329.09423828125,"z":-248.16859436035156},{"x":1262.1546630859375,"y":7184.5224609375,"z":-247.2877197265625},{"x":1240.327880859375,"y":7001.1728515625,"z":-262.79974365234375},{"x":1217.4599609375,"y":6897.87548828125,"z":-261.91668701171875},{"x":1170.1800537109375,"y":6700.49365234375,"z":-246.93800354003906},{"x":1142.568115234375,"y":6597.61328125,"z":-247.7239990234375},{"x":1134.9207763671875,"y":6488.41943359375,"z":-250.4747772216797},{"x":1111.29296875,"y":6305.25439453125,"z":-257.2035827636719},{"x":1105.1185302734375,"y":6176.1396484375,"z":-226.36062622070312},{"x":1077.0548095703125,"y":5989.7138671875,"z":-235.0845947265625},{"x":1050.0936279296875,"y":5832.443359375,"z":-247.8055419921875},{"x":1014.280029296875,"y":5651.2353515625,"z":-237.00723266601562},{"x":991.2529296875,"y":5540.8046875,"z":-221.49522399902344},{"x":960.28125,"y":5425.3583984375,"z":-209.09722900390625},{"x":933.3464965820312,"y":5306.150390625,"z":-214.8850860595703},{"x":918.7626953125,"y":5201.07763671875,"z":-224.47071838378906},{"x":896.2848510742188,"y":5000.09619140625,"z":-208.2924041748047},{"x":880.7069091796875,"y":4900.4384765625,"z":-196.76954650878906},{"x":864.2978515625,"y":4791.7744140625,"z":-194.87075805664062},{"x":845.2772827148438,"y":4684.97900390625,"z":-203.90316772460938},{"x":818.499267578125,"y":4579.38623046875,"z":-202.40052795410156},{"x":781.3132934570312,"y":4485.9775390625,"z":-197.633056640625},{"x":690.6033325195312,"y":4322.0732421875,"z":-178.8650665283203},{"x":564.2783203125,"y":4187.3740234375,"z":-166.17559814453125},{"x":552.9552001953125,"y":4050.892578125,"z":-158.24118041992188},{"x":440.6080627441406,"y":3896.486328125,"z":-143.1153564453125},{"x":298.51739501953125,"y":3762.71044921875,"z":-165.9506378173828},{"x":121.87089538574219,"y":3646.40478515625,"z":-169.17332458496094},{"x":0.34914493560791016,"y":3590.4052734375,"z":-154.22140502929688},{"x":-181.87905883789062,"y":3559.982666015625,"z":-142.8355712890625},{"x":-341.49072265625,"y":3495.3271484375,"z":-149.8975830078125},{"x":-490.7068176269531,"y":3456.482421875,"z":-153.53225708007812},{"x":-647.4459228515625,"y":3465.094482421875,"z":-133.21324157714844},{"x":-790.1168823242188,"y":3477.277587890625,"z":-129.6235809326172},{"x":-926.649658203125,"y":3543.71875,"z":-71.6588363647461},{"x":-840.2303466796875,"y":3444.378662109375,"z":-130.52587890625},{"x":-706.0322875976562,"y":3351.397216796875,"z":-148.1990966796875},{"x":-594.809814453125,"y":3253.793701171875,"z":-147.33154296875},{"x":-526.6849975585938,"y":3135.228515625,"z":-141.17718505859375},{"x":-487.0201416015625,"y":3003.78173828125,"z":-131.94143676757812},{"x":-463.0194091796875,"y":2881.099609375,"z":-136.28082275390625},{"x":-443.888427734375,"y":2778.751220703125,"z":-153.62889099121094},{"x":-403.382080078125,"y":2608.540771484375,"z":-177.7742156982422},{"x":-364.242919921875,"y":1563.1680908203125,"z":-173.5487518310547},{"x":-360.41326904296875,"y":1453.2415771484375,"z":-197.65719604492188},{"x":-346.47412109375,"y":1313.7271728515625,"z":-203.53956604003906},{"x":-324.6888732910156,"y":1151.389892578125,"z":-194.81678771972656},{"x":-296.8421936035156,"y":972.7978515625,"z":-216.91677856445312},{"x":-297.0404968261719,"y":830.6616821289062,"z":-215.6316680908203},{"x":-295.98980712890625,"y":710.199951171875,"z":-204.32647705078125},{"x":-314.48065185546875,"y":596.8995971679688,"z":-212.52789306640625},{"x":-325.1391906738281,"y":482.31634521484375,"z":-223.06173706054688},{"x":-327.8634948730469,"y":378.23583984375,"z":-214.4351043701172},{"x":-328.9898986816406,"y":277.8921813964844,"z":-194.54348754882812},{"x":-333.1666259765625,"y":138.56956481933594,"z":-171.9897003173828},{"x":-369.9863586425781,"y":40.580562591552734,"z":-154.0856475830078},{"x":-502.4472351074219,"y":15.897357940673828,"z":-147.29257202148438},{"x":-616.4868774414062,"y":32.71574401855469,"z":-145.60720825195312},{"x":-515.5468139648438,"y":74.06510162353516,"z":-158.20326232910156},{"x":-290.57537841796875,"y":-3.6165075302124023,"z":-137.20054626464844},{"x":-301.27685546875,"y":532.3241577148438,"z":-159.618896484375},{"x":-240.65809631347656,"y":664.9324951171875,"z":-172.27809143066406},{"x":-173.55734252929688,"y":762.3941650390625,"z":-170.5303955078125},{"x":-69.79405212402344,"y":847.0826416015625,"z":-160.434326171875},{"x":71.90373229980469,"y":919.4684448242188,"z":-170.87283325195312},{"x":211.20437622070312,"y":980.4592895507812,"z":-196.6923828125},{"x":380.563232421875,"y":1023.3483276367188,"z":-211.2180633544922},{"x":515.6559448242188,"y":1043.8209228515625,"z":-207.58323669433594},{"x":667.794921875,"y":1055.9600830078125,"z":-220.5439453125},{"x":782.33642578125,"y":1045.3411865234375,"z":-244.84579467773438},{"x":914.7144775390625,"y":1023.991943359375,"z":-223.10362243652344},{"x":1044.665771484375,"y":1000.0579833984375,"z":-224.73089599609375},{"x":1162.9661865234375,"y":987.3845825195312,"z":-239.54551696777344},{"x":1276.296142578125,"y":985.0309448242188,"z":-219.24505615234375},{"x":1397.5350341796875,"y":986.1751708984375,"z":-218.8860321044922},{"x":1297.3214111328125,"y":908.7552490234375,"z":-235.76461791992188},{"x":1180.72314453125,"y":906.9046630859375,"z":-226.55374145507812},{"x":1031.659912109375,"y":917.7444458007812,"z":-226.0865936279297},{"x":794.6929931640625,"y":962.508056640625,"z":-223.94793701171875},{"x":638.2946166992188,"y":1007.7352294921875,"z":-215.01052856445312},{"x":470.1760559082031,"y":1053.7620849609375,"z":-214.5442352294922},{"x":305.18597412109375,"y":1094.6611328125,"z":-226.81924438476562},{"x":147.9656982421875,"y":1144.851806640625,"z":-217.7042694091797},{"x":-17.767780303955078,"y":1219.624267578125,"z":-199.6894989013672},{"x":-172.65968322753906,"y":1313.29931640625,"z":-217.9488983154297},{"x":-300.2252197265625,"y":1420.6845703125,"z":-220.89402770996094},{"x":-431.4269104003906,"y":1558.8056640625,"z":-200.81390380859375},{"x":-496.91693115234375,"y":1637.3359375,"z":-198.27220153808594},{"x":-596.9134521484375,"y":1805.06787109375,"z":-206.2047882080078},{"x":-649.8297729492188,"y":1971.84375,"z":-208.16343688964844},{"x":-664.6417236328125,"y":2146.572265625,"z":-210.63645935058594},{"x":-673.0916137695312,"y":2320.62353515625,"z":-237.70266723632812},{"x":-977.0541381835938,"y":3534.8037109375,"z":-139.72512817382812},{"x":-944.5851440429688,"y":3634.042236328125,"z":-148.5373992919922},{"x":-845.5673828125,"y":3709.66650390625,"z":-168.23887634277344},{"x":-712.7233276367188,"y":3742.07177734375,"z":-180.49732971191406},{"x":-531.3485107421875,"y":3740.4951171875,"z":-181.74765014648438},{"x":-348.29376220703125,"y":3710.47265625,"z":-184.04656982421875},{"x":-172.0532989501953,"y":3675.374267578125,"z":-190.19268798828125},{"x":20.961181640625,"y":3657.723876953125,"z":-183.02633666992188},{"x":125.98619842529297,"y":3650.20751953125,"z":-187.3651885986328},{"x":226.1161651611328,"y":3641.339111328125,"z":-198.39707946777344},{"x":406.8050842285156,"y":3610.492431640625,"z":-201.82334899902344},{"x":521.2659912109375,"y":3585.65185546875,"z":-189.68695068359375},{"x":673.183837890625,"y":3551.08740234375,"z":-184.7848663330078},{"x":854.5778198242188,"y":3524.4619140625,"z":-196.9839324951172},{"x":1009.1863403320312,"y":3500.092041015625,"z":-192.16720581054688},{"x":1184.78662109375,"y":3466.069091796875,"z":-169.88250732421875},{"x":1611.6630859375,"y":3369.208740234375,"z":-166.08917236328125},{"x":1726.0308837890625,"y":3346.766845703125,"z":-162.86550903320312},{"x":1834.5198974609375,"y":3303.334716796875,"z":-161.46693420410156},{"x":1710.4217529296875,"y":3408.422607421875,"z":-204.93380737304688},{"x":1581.518310546875,"y":3440.21337890625,"z":-213.7364959716797},{"x":1393.45458984375,"y":3461.870361328125,"z":-212.51583862304688},{"x":1231.148681640625,"y":3471.9453125,"z":-212.04452514648438},{"x":1098.6563720703125,"y":3513.40576171875,"z":-202.994140625},{"x":970.3920288085938,"y":3600.69775390625,"z":-195.45875549316406},{"x":845.788330078125,"y":3727.0546875,"z":-214.06507873535156},{"x":775.76025390625,"y":3817.379638671875,"z":-211.3485107421875},{"x":714.2064208984375,"y":3946.9326171875,"z":-204.8962860107422},{"x":669.8955078125,"y":4118.1181640625,"z":-196.0361328125},{"x":657.5479125976562,"y":4409.65185546875,"z":-210.15826416015625},{"x":665.941162109375,"y":4510.48583984375,"z":-209.73880004882812},{"x":683.1536865234375,"y":4614.8056640625,"z":-209.33787536621094},{"x":703.3743286132812,"y":4729.150390625,"z":-218.4308319091797},{"x":712.01318359375,"y":4833.2080078125,"z":-233.87063598632812},{"x":721.294189453125,"y":4934.5703125,"z":-229.9901580810547},{"x":728.9224243164062,"y":5036.36376953125,"z":-219.9118194580078},{"x":743.3154296875,"y":5144.07080078125,"z":-207.9811553955078},{"x":760.546142578125,"y":5261.51123046875,"z":-203.4359130859375},{"x":781.5830078125,"y":5380.83349609375,"z":-213.8401336669922},{"x":812.105712890625,"y":5490.71484375,"z":-221.64730834960938},{"x":843.3241577148438,"y":5592.79345703125,"z":-219.47784423828125},{"x":994.87841796875,"y":6091.18017578125,"z":-223.71710205078125},{"x":1016.5721435546875,"y":6221.0888671875,"z":-217.24481201171875},{"x":1052.072265625,"y":6387.455078125,"z":-207.56097412109375},{"x":1076.8599853515625,"y":6498.71533203125,"z":-218.5220947265625},{"x":1102.0791015625,"y":6601.58642578125,"z":-231.55169677734375},{"x":1134.455322265625,"y":6700.8505859375,"z":-236.59347534179688},{"x":1220.893798828125,"y":6977.86279296875,"z":-221.98086547851562},{"x":1248.310546875,"y":7076.15966796875,"z":-230.48580932617188},{"x":1280.1978759765625,"y":7260.0078125,"z":-249.0132598876953},{"x":1307.5987548828125,"y":7476.857421875,"z":-219.30670166015625},{"x":1334.272216796875,"y":7648.74072265625,"z":-218.271728515625},{"x":1348.0980224609375,"y":7751.2373046875,"z":-227.43190002441406},{"x":1384.130126953125,"y":7933.84521484375,"z":-234.69100952148438},{"x":1424.4735107421875,"y":8127.32568359375,"z":-222.77366638183594},{"x":1437.9971923828125,"y":8261.3798828125,"z":-239.156494140625},{"x":1428.0640869140625,"y":8419.6904296875,"z":-236.35360717773438},{"x":1404.9090576171875,"y":8533.48828125,"z":-221.0889892578125},{"x":1378.806884765625,"y":8672.1435546875,"z":-219.8031005859375},{"x":1357.3538818359375,"y":8781.939453125,"z":-231.83982849121094},{"x":1299.4794921875,"y":8868.146484375,"z":-232.8631134033203},{"x":1199.455078125,"y":8835.40625,"z":-241.95249938964844},{"x":1110.5699462890625,"y":8774.0703125,"z":-234.74920654296875},{"x":1044.638671875,"y":8682.7685546875,"z":-240.2288360595703},{"x":1006.2321166992188,"y":8583.685546875,"z":-229.0609130859375},{"x":905.9638671875,"y":8605.630859375,"z":-242.17669677734375},{"x":803.5595703125,"y":8631.2255859375,"z":-219.3228302001953},{"x":693.0226440429688,"y":8637.15625,"z":-175.90065002441406},{"x":619.5746459960938,"y":8551.8564453125,"z":-156.69212341308594},{"x":642.6378784179688,"y":8446.388671875,"z":-149.6607666015625},{"x":727.3097534179688,"y":8497.5498046875,"z":-181.42100524902344},{"x":766.4940185546875,"y":8552.7216796875,"z":-259.752197265625},{"x":870.03955078125,"y":8591.0322265625,"z":-281.1913146972656},{"x":1002.0275268554688,"y":8568.654296875,"z":-269.1759338378906},{"x":1163.375,"y":8556.3505859375,"z":-273.0065612792969},{"x":1257.264892578125,"y":8620.1435546875,"z":-285.1521911621094},{"x":1355.7537841796875,"y":8726.2978515625,"z":-290.22198486328125},{"x":1475.5810546875,"y":8782.5498046875,"z":-281.2506408691406},{"x":1588.72314453125,"y":8735.904296875,"z":-275.6956481933594},{"x":1686.6070556640625,"y":8694.40234375,"z":-294.28662109375},{"x":1794.1375732421875,"y":8608.9794921875,"z":-290.8707580566406},{"x":1702.4959716796875,"y":8564.8828125,"z":-275.47509765625},{"x":1535.7320556640625,"y":8513.1748046875,"z":-274.5182189941406},{"x":1490.078857421875,"y":8374.6513671875,"z":-248.7597198486328},{"x":1457.8272705078125,"y":8220.0947265625,"z":-253.81625366210938},{"x":1430.0103759765625,"y":8059.908203125,"z":-256.4281311035156},{"x":1401.987060546875,"y":7901.93798828125,"z":-249.50088500976562},{"x":1365.4136962890625,"y":7727.36767578125,"z":-254.78518676757812},{"x":1351.3565673828125,"y":7626.162109375,"z":-269.29010009765625},{"x":1341.5245361328125,"y":7449.603515625,"z":-268.7956237792969},{"x":1318.1661376953125,"y":7265.0126953125,"z":-251.0709686279297},{"x":1296.263427734375,"y":7162.9541015625,"z":-253.404541015625},{"x":1268.4305419921875,"y":7062.8203125,"z":-257.7303466796875},{"x":1193.9005126953125,"y":6892.97607421875,"z":-273.8706970214844},{"x":1106.697509765625,"y":6743.73486328125,"z":-264.62896728515625},{"x":995.7372436523438,"y":6625.044921875,"z":-276.1340026855469},{"x":902.260009765625,"y":6537.998046875,"z":-284.19830322265625},{"x":792.0725708007812,"y":6464.083984375,"z":-261.34515380859375},{"x":654.4287109375,"y":6431.1513671875,"z":-254.24435424804688},{"x":500.1017761230469,"y":6452.73193359375,"z":-248.7386474609375},{"x":383.37030029296875,"y":6481.1611328125,"z":-239.73681640625},{"x":229.37353515625,"y":6539.29345703125,"z":-252.5561065673828},{"x":94.50223541259766,"y":6623.77783203125,"z":-263.1619873046875},{"x":22.137006759643555,"y":6703.39208984375,"z":-261.74713134765625},{"x":-32.883975982666016,"y":6788.3203125,"z":-253.32266235351562},{"x":59.941566467285156,"y":6833.42236328125,"z":-244.603515625},{"x":184.01568603515625,"y":6777.83935546875,"z":-240.8012237548828},{"x":335.0666809082031,"y":6680.16455078125,"z":-246.3255157470703},{"x":470.0013122558594,"y":6563.4736328125,"z":-241.53187561035156},{"x":606.1810913085938,"y":6427.732421875,"z":-229.80247497558594},{"x":672.799072265625,"y":6343.3544921875,"z":-212.8927459716797},{"x":748.5950927734375,"y":6250.1484375,"z":-206.87973022460938},{"x":814.015625,"y":6154.1982421875,"z":-209.2655029296875},{"x":860.2921142578125,"y":6055.07666015625,"z":-212.75680541992188},{"x":892.601806640625,"y":5954.1923828125,"z":-215.86355590820312},{"x":918.974853515625,"y":5847.30859375,"z":-211.75807189941406},{"x":935.7671508789062,"y":5725.51611328125,"z":-203.7787628173828},{"x":943.2332763671875,"y":5598.900390625,"z":-217.5615997314453},{"x":949.6790161132812,"y":5479.734375,"z":-226.1894073486328},{"x":963.1397705078125,"y":5380.07861328125,"z":-222.29736328125},{"x":956.8733520507812,"y":5267.81103515625,"z":-215.40773010253906},{"x":954.4944458007812,"y":5159.02001953125,"z":-205.70201110839844},{"x":942.8724975585938,"y":5044.1123046875,"z":-197.42919921875},{"x":915.6271362304688,"y":4933.35107421875,"z":-196.4282989501953},{"x":869.5302124023438,"y":4831.23291015625,"z":-207.69371032714844},{"x":662.3191528320312,"y":4582.55810546875,"z":-213.47311401367188},{"x":558.141357421875,"y":4458.9580078125,"z":-223.10964965820312},{"x":504.6201477050781,"y":4373.88720703125,"z":-228.87533569335938},{"x":300.02874755859375,"y":4131.60205078125,"z":-278.9368591308594},{"x":312.2668151855469,"y":4043.68798828125,"z":-210.6494903564453},{"x":251.9998779296875,"y":3943.768310546875,"z":-215.8098602294922},{"x":194.5568389892578,"y":3853.54150390625,"z":-226.85357666015625},{"x":131.7781982421875,"y":3756.61767578125,"z":-230.95166015625},{"x":75.24137115478516,"y":3667.43359375,"z":-231.2392578125},{"x":20.00724220275879,"y":3583.666748046875,"z":-219.4630889892578},{"x":-96.6246566772461,"y":3456.844482421875,"z":-187.0535888671875},{"x":-151.93344116210938,"y":3366.3017578125,"z":-195.8094940185547},{"x":-193.77259826660156,"y":3271.523193359375,"z":-203.82308959960938},{"x":-250.1451873779297,"y":3117.6259765625,"z":-207.64976501464844},{"x":-293.066162109375,"y":2984.1728515625,"z":-199.69276428222656},{"x":-343.52142333984375,"y":2801.416748046875,"z":-206.71051025390625},{"x":-393.5751647949219,"y":2650.933837890625,"z":-214.9368133544922},{"x":-441.07830810546875,"y":2451.398193359375,"z":-217.2692108154297},{"x":-375.0165100097656,"y":1416.1536865234375,"z":-241.18927001953125},{"x":-352.564453125,"y":1263.5506591796875,"z":-226.6255645751953},{"x":-337.6260986328125,"y":1091.708740234375,"z":-238.14315795898438},{"x":-316.57574462890625,"y":949.2941284179688,"z":-248.48324584960938},{"x":-300.3669738769531,"y":813.864501953125,"z":-241.82269287109375},{"x":-284.654541015625,"y":666.3706665039062,"z":-232.36968994140625},{"x":-276.3374328613281,"y":531.2098999023438,"z":-235.9767303466797},{"x":-283.7627258300781,"y":427.2669677734375,"z":-233.76913452148438},{"x":-298.5613708496094,"y":321.0663146972656,"z":-223.25230407714844},{"x":-319.703369140625,"y":218.2068634033203,"z":-225.90155029296875},{"x":-347.53253173828125,"y":121.21514129638672,"z":-214.89146423339844},{"x":-415.3191223144531,"y":44.06507110595703,"z":-214.95343017578125},{"x":-538.3870849609375,"y":75.79183197021484,"z":-217.50559997558594},{"x":-668.6266479492188,"y":74.63887786865234,"z":-197.78416442871094},{"x":-539.8720092773438,"y":197.2925567626953,"z":-213.73214721679688},{"x":-441.9700622558594,"y":400.0397033691406,"z":-220.27891540527344},{"x":-406.4515686035156,"y":539.9664306640625,"z":-216.98211669921875},{"x":-339.16717529296875,"y":670.59228515625,"z":-216.7875213623047},{"x":-235.58197021484375,"y":745.3079833984375,"z":-203.25936889648438},{"x":-83.35387420654297,"y":814.0948486328125,"z":-194.4137420654297},{"x":88.6442642211914,"y":862.0767211914062,"z":-208.12803649902344},{"x":263.6009521484375,"y":922.0614624023438,"z":-198.15538024902344},{"x":418.10906982421875,"y":943.5222778320312,"z":-167.41322326660156},{"x":607.826416015625,"y":958.5545043945312,"z":-178.07899475097656},{"x":745.5659790039062,"y":961.7695922851562,"z":-195.71607971191406},{"x":931.7433471679688,"y":972.9888305664062,"z":-194.99826049804688},{"x":1128.2174072265625,"y":977.48095703125,"z":-164.11634826660156},{"x":1289.7274169921875,"y":972.333740234375,"z":-139.50497436523438},{"x":1398.987548828125,"y":956.185302734375,"z":-123.79974365234375},{"x":1245.63916015625,"y":1036.1453857421875,"z":-161.97708129882812},{"x":1120.0145263671875,"y":1074.80517578125,"z":-159.34213256835938},{"x":975.9757690429688,"y":1084.7974853515625,"z":-163.3812713623047},{"x":867.9854125976562,"y":1072.574462890625,"z":-171.3629608154297},{"x":769.0988159179688,"y":1047.8436279296875,"z":-172.0865478515625},{"x":594.1441650390625,"y":1022.40234375,"z":-173.31407165527344},{"x":413.9480895996094,"y":1047.14306640625,"z":-158.3561553955078},{"x":260.52020263671875,"y":1089.6112060546875,"z":-167.4496307373047},{"x":62.61400604248047,"y":1154.071533203125,"z":-193.00146484375},{"x":-105.54163360595703,"y":1242.7708740234375,"z":-204.48294067382812},{"x":-263.40643310546875,"y":1362.7396240234375,"z":-204.3539276123047},{"x":-328.1736755371094,"y":1441.1204833984375,"z":-214.617431640625},{"x":-388.7701721191406,"y":1580.162353515625,"z":-220.43618774414062},{"x":-440.12457275390625,"y":1790.034423828125,"z":-214.99893188476562},{"x":-469.3135070800781,"y":1891.3134765625,"z":-207.03675842285156},{"x":-506.0223388671875,"y":2076.5810546875,"z":-224.0013885498047},{"x":-526.3563842773438,"y":2240.304931640625,"z":-232.0473175048828},{"x":-536.7685546875,"y":2420.189697265625,"z":-230.3448486328125},{"x":-519.3402099609375,"y":2604.394775390625,"z":-247.76919555664062},{"x":-500.6192932128906,"y":2757.366455078125,"z":-243.08740234375},{"x":-500.5697326660156,"y":2882.859130859375,"z":-234.29202270507812},{"x":-506.5195617675781,"y":2983.719482421875,"z":-226.8683319091797},{"x":-587.58154296875,"y":3240.051025390625,"z":-231.31675720214844},{"x":-790.9555053710938,"y":3535.636962890625,"z":-187.07594299316406},{"x":-852.9847412109375,"y":3622.662109375,"z":-175.70794677734375},{"x":-922.1554565429688,"y":3714.868408203125,"z":-155.33453369140625},{"x":-989.1417236328125,"y":3793.77197265625,"z":-140.3725128173828},{"x":-903.11474609375,"y":3766.775634765625,"z":-194.54296875},{"x":-806.9669189453125,"y":3787.391845703125,"z":-213.69100952148438},{"x":-683.8927001953125,"y":3823.0546875,"z":-220.6681365966797},{"x":-565.7932739257812,"y":3852.96435546875,"z":-226.10693359375},{"x":-377.9985656738281,"y":3880.663330078125,"z":-215.41502380371094},{"x":-217.7192840576172,"y":3887.048828125,"z":-206.2433624267578},{"x":-93.96611785888672,"y":3886.436767578125,"z":-207.50648498535156},{"x":83.63262176513672,"y":3880.326416015625,"z":-209.23794555664062},{"x":184.27932739257812,"y":3870.414794921875,"z":-210.5027618408203},{"x":294.1581115722656,"y":3856.861083984375,"z":-193.0906982421875},{"x":479.1273193359375,"y":3826.291259765625,"z":-187.7449493408203},{"x":923.6560668945312,"y":3774.2529296875,"z":-219.07559204101562},{"x":1101.7486572265625,"y":3721.6181640625,"z":-218.93328857421875},{"x":1256.411376953125,"y":3668.2890625,"z":-220.3524169921875},{"x":1396.5792236328125,"y":3603.15966796875,"z":-206.7607879638672},{"x":1604.581787109375,"y":3504.950439453125,"z":-174.0752716064453},{"x":1816.5816650390625,"y":3421.602783203125,"z":-175.28977966308594},{"x":1742.208740234375,"y":3506.23095703125,"z":-197.14315795898438},{"x":1603.3653564453125,"y":3568.05810546875,"z":-210.5767822265625},{"x":1416.064453125,"y":3609.336181640625,"z":-213.62745666503906},{"x":1313.1595458984375,"y":3629.547607421875,"z":-206.41603088378906},{"x":1186.1837158203125,"y":3658.1787109375,"z":-208.24774169921875},{"x":1018.765625,"y":3712.88720703125,"z":-223.2650146484375},{"x":884.2308349609375,"y":3793.87060546875,"z":-222.135986328125},{"x":812.8406372070312,"y":3914.956787109375,"z":-211.36978149414062},{"x":747.1883544921875,"y":4064.17333984375,"z":-232.542236328125},{"x":708.5103149414062,"y":4179.12744140625,"z":-245.39602661132812},{"x":684.79296875,"y":4352.1025390625,"z":-244.67596435546875},{"x":667.9347534179688,"y":4478.658203125,"z":-237.174072265625},{"x":660.9493408203125,"y":4584.931640625,"z":-241.59629821777344},{"x":693.4027709960938,"y":4782.87109375,"z":-240.02049255371094},{"x":730.745361328125,"y":4940.1748046875,"z":-224.08958435058594},{"x":761.5372314453125,"y":5048.8828125,"z":-208.43104553222656},{"x":783.2639770507812,"y":5170.7314453125,"z":-211.54629516601562},{"x":807.0342407226562,"y":5300.189453125,"z":-225.58023071289062},{"x":826.2647094726562,"y":5462.423828125,"z":-242.78309631347656},{"x":850.3368530273438,"y":5691.28466796875,"z":-220.51119995117188},{"x":868.8845825195312,"y":5794.94873046875,"z":-226.24658203125},{"x":938.7833251953125,"y":5957.97216796875,"z":-244.80775451660156},{"x":1030.9320068359375,"y":6188.6591796875,"z":-227.61480712890625},{"x":1079.901123046875,"y":6369.5185546875,"z":-243.57093811035156},{"x":1132.613525390625,"y":6602.697265625,"z":-240.6827392578125},{"x":1152.943115234375,"y":6710.28076171875,"z":-235.02304077148438},{"x":1179.8017578125,"y":6817.53271484375,"z":-223.81370544433594},{"x":1248.57470703125,"y":6995.17236328125,"z":-205.80947875976562},{"x":1296.4168701171875,"y":7130.78369140625,"z":-218.33627319335938},{"x":1321.9581298828125,"y":7234.17578125,"z":-221.99063110351562},{"x":1344.94287109375,"y":7342.33642578125,"z":-220.77041625976562},{"x":1362.390625,"y":7460.83837890625,"z":-221.3303680419922},{"x":1377.7108154296875,"y":7631.29736328125,"z":-237.29920959472656},{"x":1384.052490234375,"y":7817.12353515625,"z":-246.44712829589844},{"x":1389.6046142578125,"y":7959.146484375,"z":-236.85244750976562},{"x":1403.8194580078125,"y":8131.59228515625,"z":-235.91415405273438},{"x":1444.0435791015625,"y":8311.4111328125,"z":-242.52804565429688},{"x":1468.374755859375,"y":8421.9267578125,"z":-232.88638305664062},{"x":1492.43212890625,"y":8535.15625,"z":-222.18287658691406},{"x":1530.643310546875,"y":8734.5859375,"z":-232.81671142578125},{"x":1546.2347412109375,"y":8846.8544921875,"z":-245.43971252441406},{"x":1575.40185546875,"y":8957.5234375,"z":-231.74758911132812},{"x":1627.34716796875,"y":9053.2919921875,"z":-244.47384643554688},{"x":1688.21484375,"y":8922.1787109375,"z":-248.93714904785156},{"x":1676.0845947265625,"y":8811.205078125,"z":-258.22882080078125},{"x":1626.6812744140625,"y":8670.6064453125,"z":-265.6624755859375},{"x":1545.00146484375,"y":8468.96484375,"z":-264.8114929199219},{"x":1501.84716796875,"y":8331.5400390625,"z":-253.650146484375},{"x":1474.38427734375,"y":8144.58447265625,"z":-241.85946655273438},{"x":1467.28369140625,"y":8030.59619140625,"z":-253.27362060546875},{"x":1430.5423583984375,"y":7882.1591796875,"z":-274.91192626953125},{"x":1382.802490234375,"y":7719.09912109375,"z":-258.7013244628906},{"x":1331.5638427734375,"y":7486.91552734375,"z":-242.21878051757812},{"x":1309.765625,"y":7340.00048828125,"z":-256.9759826660156},{"x":1302.425537109375,"y":7222.51025390625,"z":-264.12225341796875},{"x":1286.6700439453125,"y":7072.3671875,"z":-266.06219482421875},{"x":1275.9691162109375,"y":6960.6240234375,"z":-259.7960205078125},{"x":1268.3397216796875,"y":6847.83056640625,"z":-255.93194580078125},{"x":1249.8748779296875,"y":6737.83984375,"z":-265.03662109375},{"x":1216.5400390625,"y":6599.8828125,"z":-265.2559814453125},{"x":1169.0096435546875,"y":6425.900390625,"z":-247.34091186523438},{"x":1131.20166015625,"y":6311.9248046875,"z":-235.12413024902344},{"x":1079.3306884765625,"y":6084.279296875,"z":-250.49697875976562},{"x":1067.6663818359375,"y":5974.64013671875,"z":-251.4727325439453},{"x":1048.2525634765625,"y":5795.42529296875,"z":-235.73561096191406},{"x":1028.3699951171875,"y":5641.5224609375,"z":-224.13877868652344},{"x":983.4337158203125,"y":5415.82568359375,"z":-231.6207733154297},{"x":955.0528564453125,"y":5305.3583984375,"z":-230.12513732910156},{"x":924.01025390625,"y":5200.587890625,"z":-225.2293243408203},{"x":875.4633178710938,"y":5036.24951171875,"z":-225.54786682128906},{"x":811.8618774414062,"y":4801.84033203125,"z":-234.45635986328125},{"x":350.1590881347656,"y":3953.3427734375,"z":-218.11956787109375},{"x":254.2540283203125,"y":3844.244140625,"z":-229.26486206054688},{"x":154.0619659423828,"y":3698.7431640625,"z":-239.8997344970703},{"x":14.033796310424805,"y":3510.04736328125,"z":-225.00572204589844},{"x":-70.128662109375,"y":3396.7744140625,"z":-220.56822204589844},{"x":-155.28294372558594,"y":3286.890869140625,"z":-234.80029296875},{"x":-267.03656005859375,"y":3133.156005859375,"z":-240.57456970214844},{"x":-354.9300231933594,"y":2958.0673828125,"z":-225.95460510253906},{"x":-504.148193359375,"y":2314.019775390625,"z":-233.97097778320312},{"x":-532.3738403320312,"y":2129.6943359375,"z":-249.4571533203125},{"x":-543.6765747070312,"y":2009.58154296875,"z":-248.4209747314453},{"x":-561.3239135742188,"y":1718.7236328125,"z":-244.59063720703125},{"x":-561.5316772460938,"y":1594.265869140625,"z":-254.0474395751953},{"x":-546.5149536132812,"y":1479.2740478515625,"z":-254.5933074951172},{"x":-503.1639099121094,"y":1243.69775390625,"z":-236.12025451660156},{"x":-481.1227722167969,"y":1107.89306640625,"z":-246.1612091064453},{"x":-474.0146179199219,"y":998.0747680664062,"z":-256.5157165527344},{"x":-480.2068176269531,"y":850.0924072265625,"z":-247.2298126220703},{"x":-494.4603271484375,"y":730.7713623046875,"z":-241.21755981445312},{"x":-516.1519775390625,"y":585.9374389648438,"z":-247.3609619140625},{"x":-526.820556640625,"y":461.1087341308594,"z":-236.90098571777344},{"x":-529.0567016601562,"y":360.06402587890625,"z":-221.5171661376953},{"x":-528.5516967773438,"y":219.968017578125,"z":-208.3961944580078},{"x":-537.117919921875,"y":124.93755340576172,"z":-177.69454956054688},{"x":-574.2603759765625,"y":45.85200119018555,"z":-119.0926742553711},{"x":-632.8195190429688,"y":-15.277764320373535,"z":-53.65733337402344},{"x":-705.0574951171875,"y":-61.1204719543457,"z":20.069660186767578},{"x":-669.694580078125,"y":-136.49827575683594,"z":93.946533203125},{"x":-642.4535522460938,"y":-209.67457580566406,"z":167.3356170654297},{"x":-656.967529296875,"y":-111.77991485595703,"z":66.57410430908203}]'
    );
}

// class Point {
//     constructor(x, y) {
//         this.x = x;
//         this.y = y;
//     }
//     average(point) {
//         return new Point((this.x + point.x) / 2, (this.y + point.y) / 2);
//     }
// }

class Cell {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.pointCount = 0;
    }
    addPoint() {
        this.pointCount++;
    }
}

class Grid {
    constructor(originX, originZ, width, height, numRows, numCols) {
        this.origin = {
            x: originX,
            z: originZ
        }
        this.width = width;
        this.height = height;
        this.numRows = numRows;
        this.numCols = numCols;
        this.recomputeCells();
    }
    recomputeCells(points = null) {
        this.cells = [];
        for (let r = 0; r < this.numRows; r++) {
            let row = [];
            for (let c = 0; c < this.numCols; c++) {
                row.push(new Cell(r, c));
            }
            this.cells.push(row);
        }

        if (points) {
            for (let i = 0; i < points.length - 1; i++) {
                // calculate which cell this point falls into
                let cell = this.getCellContaining(points[i].x, points[i].z);
                if (cell) {
                    cell.addPoint();
                }
            }
        }
    }
    getCellContaining(x, y) {
        let column = Math.floor(((x - this.origin.x) / this.width) * this.numCols);
        let row = Math.floor(((y - this.origin.z) / this.height) * this.numRows);
        return this.getCell(row, column);
    }
    getCell(row, col) {
        if (this.cells[row]) {
            return this.cells[row][col];
        }
        return null;
    }
    getCellRect(cell) {
        let cellWidth = this.width / this.numCols;
        let cellHeight = this.height / this.numRows;
        return {
            x: this.origin.x + cell.col * cellWidth,
            z: this.origin.z + cell.row * cellHeight,
            width: cellWidth,
            height: cellHeight
        };
    }
    forEachCell(callback) {
        for (let r = 0; r < this.numRows; r++) {
            for (let c = 0; c < this.numCols; c++) {
                let cell = this.getCell(r, c);
                if (cell) {
                    callback(cell);
                }
            }
        }
    }
}

export {
    pathToMesh,
    getMockData
};
