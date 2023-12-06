import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { frustumVertexShader, frustumFragmentShader, MAX_VIEW_FRUSTUMS, UNIFORMS } from './ViewFrustum.js';

class CustomMaterials {
    constructor() {
        this.materialsToAnimate = [];
        this.heightMapMaterials = [];
        this.gradientMapMaterials = [];
        this.lastUpdate = -1;
        this.areaTargetMaterials = [];
    }
    /**
     * 
     * @param {boolean} isTransparent 
     */
    setAreaTargetMaterialsTransparent(isTransparent) {
        this.areaTargetMaterials.forEach(material => {
            material.transparent = isTransparent;
        });
    }

    /**
     * 
     * @param {number} count 
     */
    setAreaTargetMaterialsFrustumCount(count) {
        this. areaTargetMaterials.forEach(material => {
            material.uniforms[UNIFORMS.numFrustums].value = count;
        });
    }
    areaTargetVertexShader({useFrustumCulling, useLoadingAnimation, center}) {
        if (!useLoadingAnimation && !useFrustumCulling) return THREE.ShaderChunk.meshphysical_vert;
        if (useLoadingAnimation && !useFrustumCulling) {
            return this.loadingAnimationVertexShader(center);
        }
        return frustumVertexShader({useLoadingAnimation: useLoadingAnimation, center: center});
    }
    areaTargetFragmentShader({useFrustumCulling, useLoadingAnimation, inverted}) {
        if (!useLoadingAnimation && !useFrustumCulling) return THREE.ShaderChunk.meshphysical_frag;
        if (useLoadingAnimation && !useFrustumCulling) {
            return this.loadingAnimationFragmentShader(inverted);
        }
        return frustumFragmentShader({useLoadingAnimation: useLoadingAnimation, inverted: inverted});
    }
    loadingAnimationVertexShader(center) {
        return THREE.ShaderChunk.meshphysical_vert
            .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
len = length(position - vec3(${center.x}, ${center.y}, ${center.z}));
`).replace('#include <common>', `#include <common>
varying float len;
`);
    }
    loadingAnimationFragmentShader(inverted) {
        let condition = 'if (len > maxHeight) discard;';
        if (inverted) {
            // condition = 'if (len < maxHeight || len > (maxHeight + 8.0) / 2.0) discard;';
            condition = 'if (len < maxHeight) discard;';
        }
        return THREE.ShaderChunk.meshphysical_frag
            .replace('#include <clipping_planes_fragment>', `
                     ${condition}
                     #include <clipping_planes_fragment>`)
            .replace(`#include <common>`, `
                     #include <common>
                     varying float len;
                     uniform float maxHeight;
                     `);
    }
    buildDefaultFrustums(numFrustums) {
        let frustums = [];
        for (let i = 0; i < numFrustums; i++) {
            frustums.push({
                normal1: {x: 1, y: 0, z: 0},
                normal2: {x: 1, y: 0, z: 0},
                normal3: {x: 1, y: 0, z: 0},
                normal4: {x: 1, y: 0, z: 0},
                normal5: {x: 1, y: 0, z: 0},
                normal6: {x: 1, y: 0, z: 0},
                D1: 0,
                D2: 0,
                D3: 0,
                D4: 0,
                D5: 0,
                D6: 0,
                viewAngleSimilarity: 0
            })
        }
        return frustums;
    }
    updateCameraDirection(cameraDirection) {
        this.areaTargetMaterials.forEach(material => {
            for (let i = 0; i < material.uniforms[UNIFORMS.numFrustums].value; i++) {
                let thisFrustum = material.uniforms[UNIFORMS.frustums].value[i];
                let frustumDir = [thisFrustum.normal6.x, thisFrustum.normal6.y, thisFrustum.normal6.z];
                let viewingDir = [cameraDirection.x, cameraDirection.y, cameraDirection.z];
                // set to 1 if parallel, 0 if perpendicular. lower bound clamped to 0 instead of going to -1 if antiparallel
                thisFrustum.viewAngleSimilarity = Math.max(0, realityEditor.gui.ar.utilities.dotProduct(frustumDir, viewingDir));
            }
        });
    }
    heightMapMaterial(sourceMaterial, {ceilingAndFloor}) {
        let material = sourceMaterial.clone();

        material.uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.physical.uniforms,
            {
                heightMap_maxY: {value: ceilingAndFloor.ceiling},
                heightMap_minY: {value: ceilingAndFloor.floor},
                distanceToCamera: {value: 0} // todo Steve; later in the code, need to set gltf.scene.material.uniforms['....'] to desired value
            }
        ]);

        material.vertexShader = realityEditor.gui.shaders.heightMapVertexShader();
        
        material.fragmentShader = realityEditor.gui.shaders.heightMapFragmentShader();

        material.type = 'verycoolheightmapmaterial';

        material.needsUpdate = true;
        
        this.heightMapMaterials.push(material);

        return material;
    }
    gradientMapMaterial(sourceMaterial) {
        let material = sourceMaterial.clone();

        material.uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.physical.uniforms,
            {
                gradientMap_minAngle: {value: 0},
                gradientMap_maxAngle: {value: 25},
                gradientMap_outOfRangeAreaOriginalColor: {value: false},
                distanceToCamera: {value: 0}
            }
        ]);

        material.vertexShader = realityEditor.gui.shaders.gradientMapVertexShader();

        material.fragmentShader = realityEditor.gui.shaders.gradientMapFragmentShader();

        material.type = 'verycoolgradientmapmaterial';

        material.needsUpdate = true;

        this.gradientMapMaterials.push(material);

        return material;
    }
    highlightWalkableArea(isOn) {
        this.gradientMapMaterials.forEach((material) => {
            material.uniforms['gradientMap_outOfRangeAreaOriginalColor'].value = isOn;
        });
    }
    updateGradientMapThreshold(minAngle, maxAngle) {
        this.gradientMapMaterials.forEach((material) => {
            material.uniforms['gradientMap_minAngle'].value = minAngle;
            material.uniforms['gradientMap_maxAngle'].value = maxAngle;
        });
    }
    areaTargetMaterialWithTextureAndHeight(sourceMaterial, {maxHeight, center, animateOnLoad, inverted, useFrustumCulling}, isTransparent) {
        let material = sourceMaterial.clone();
        
        // for the shader to work, we must fully populate the frustums uniform array
        // with placeholder data (e.g. normals and constants for all 5 frustums),
        // but as long as numFrustums is 0 then it won't have any effect
        let defaultFrustums = this.buildDefaultFrustums(MAX_VIEW_FRUSTUMS);
        
        material.uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.physical.uniforms,
            {
                maxHeight: {value: maxHeight},
                numFrustums: {value: 0},
                frustums: {value: defaultFrustums}
            }
        ]);

        material.vertexShader = this.areaTargetVertexShader({
            useFrustumCulling: useFrustumCulling,
            useLoadingAnimation: animateOnLoad,
            center: center
        });
        material.fragmentShader = this.areaTargetFragmentShader({
            useFrustumCulling: useFrustumCulling,
            useLoadingAnimation: animateOnLoad,
            inverted: inverted
        });

        material.transparent = isTransparent;
        this.areaTargetMaterials.push(material);

        if (animateOnLoad) {
            this.materialsToAnimate.push({
                material: material,
                currentHeight: -15, // -maxHeight,
                maxHeight: maxHeight * 4,
                animationSpeed: 0.02 / 2
            });
        }

        material.type = 'thecoolermeshstandardmaterial';

        material.needsUpdate = true;

        return material;
    }
    update() {
        if (this.materialsToAnimate.length === 0) { return; }

        let now = window.performance.now();
        if (this.lastUpdate < 0) {
            this.lastUpdate = now;
        }
        let dt = now - this.lastUpdate;
        this.lastUpdate = now;

        let indicesToRemove = [];
        this.materialsToAnimate.forEach(function(entry, index) {
            let material = entry.material;
            if (entry.currentHeight < entry.maxHeight) {
                entry.currentHeight += entry.animationSpeed * dt;
                material.uniforms['maxHeight'].value = entry.currentHeight;
            } else {
                indicesToRemove.push(index);
            }
        });

        for (let i = indicesToRemove.length-1; i >= 0; i--) {
            let matIndex = indicesToRemove[i];
            this.materialsToAnimate.splice(matIndex, 1);
        }
    }
}

export default CustomMaterials
