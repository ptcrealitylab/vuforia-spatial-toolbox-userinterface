/*
* Copyright © 2018 PTC
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace('realityEditor.gui.zones.mesh');

(function(exports) {

    let pathMeshResources;

    // Allows us to reuse materials and geometries
    const getPathMeshResources = (THREE, lightWidth, lightLength, reuseMaterials) => {
        if (reuseMaterials) {
            if (!pathMeshResources) {
                const lightGeometry = new THREE.BoxGeometry(lightWidth,2,lightLength);
                const lightMaterial = new THREE.MeshBasicMaterial({color:0xFFFFCC, transparent:true});
                const topMaterial = new THREE.MeshBasicMaterial({color:0x000000, transparent:true});
                const wallMaterial = new THREE.MeshBasicMaterial({color:0x01fffc, transparent:true, opacity:0.8});
                pathMeshResources = {lightGeometry, lightMaterial, topMaterial, wallMaterial};
            }
            return pathMeshResources;
        } else {
            const lightGeometry = new THREE.BoxGeometry(lightWidth,2,lightLength);
            const lightMaterial = new THREE.MeshBasicMaterial({color:0xFFFFCC, transparent:true});
            const topMaterial = new THREE.MeshBasicMaterial({color:0x000000, transparent:true});
            const wallMaterial = new THREE.MeshBasicMaterial({color:0x01fffc, transparent:true, opacity:0.8});

            return {lightGeometry, lightMaterial, topMaterial, wallMaterial};
        }
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
        const pathHeight = 250; // 50mm
        const topGeometry = new THREE.BufferGeometry(); // The top represents the flat black top of the line
        const wallGeometry = new THREE.BufferGeometry(); // The wall represents the yellow sides of the line
        let topVertices = [];
        let wallVertices = [];
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

        const resources = getPathMeshResources(THREE, lightWidth, lightLength, false);
        // const lightGeometry = resources.lightGeometry;
        // const lightMaterial = resources.lightMaterial;
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
        }

        topGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(topVertices), 3));
        wallGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(wallVertices), 3));
        const topMesh = new THREE.Mesh(topGeometry, topMaterial);
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        const group = new THREE.Group();
        group.add(topMesh);
        group.add(wallMesh);
        // group.add(lightGroup);
        group.onRemove = () => {
            // Since these geometries are not reused, they MUST be disposed to prevent memory leakage
            topGeometry.dispose();
            wallGeometry.dispose();
        }
        return group;
    }

    exports.pathToMesh = pathToMesh;
})(realityEditor.gui.zones.mesh);
