// Author: Fyrestar https://mevedia.com (https://github.com/Fyrestar/THREE.InfiniteGridHelper)
// modified by Ben Reynolds (breynolds@ptc.com) on July 21, 2022 to remove everything except the module imports and exports
// modified by Steve Xie (kaxie@ptc.com) on Jan 27, 2023 to add thickness support for the Infinite Grid custom shader

import {
    DoubleSide,
    Mesh,
    Color,
    PlaneBufferGeometry,
    ShaderMaterial,
} from '../three/three.module.js';

class InfiniteGridHelper extends Mesh {

    constructor ( size1, size2, thickness, color, distance, axes = 'xzy' ) {

        color = color || new Color( 'white' );
        size1 = size1 || 10;
        size2 = size2 || 100;
        thickness = thickness || 0.1;

        distance = distance || 8000;

        const planeAxes = axes.substr( 0, 2 );

        const geometry = new PlaneBufferGeometry( 2, 2, 1, 1 );

        const material = new ShaderMaterial( {

            side: DoubleSide,

            uniforms: {
                uSize1: {
                    value: size1
                },
                uSize2: {
                    value: size2
                },
                uThickness: {
                    value: thickness
                },
                uColor: {
                    value: color
                },
                uDistance: {
                    value: distance
                }
            },
            transparent: true,
            vertexShader: `
                varying vec3 worldPosition;
                uniform float uDistance;
                
                void main() {
                    vec3 pos = position.${axes} * uDistance;
                    //pos.${planeAxes} += cameraPosition.${planeAxes};
                    worldPosition = pos;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
           `,

            fragmentShader: `
            #define S(a, b, n) smoothstep(a, b, n)
            #define blur 0.001
            
            varying vec3 worldPosition;
            uniform float uSize1;
            uniform float uSize2;
            uniform float uThickness;
            uniform vec3 uColor;
            uniform float uDistance;
            
            float Remap01(float x, float low, float high) {
                return clamp((x - low) / (high - low), 0., 1.);
            }
            
            float Remap(float x, float lowIn, float highIn, float lowOut, float highOut) {
                return lowOut + (highOut - lowOut) * Remap01(x, lowIn, highIn);
            }
            
            float getGrid(float size, float thickness) {
                vec2 r = worldPosition.${planeAxes} / size;
                // vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
                // float line = min(grid.x, grid.y);
                // return 1.0 - min(line, 1.0);
                vec2 grid = abs(fract(r - 0.5) - 0.5);
                // float h = step(thickness, grid.y);
                // float v = step(thickness, grid.x);
                float h = S(thickness - blur, thickness + blur, grid.y);
                float v = S(thickness - blur, thickness + blur, grid.x);
                return 1. - h * v;
            }
            
            void main() {
                float d = 1.0 - min(distance(cameraPosition.${planeAxes}, worldPosition.${planeAxes}) / uDistance, 1.0);
                float thickness = Remap(uThickness, 0., 1., 0., .5);
                
                // float g1 = getGrid(uSize1);
                // float g2 = getGrid(uSize2);
                // gl_FragColor = vec4(uColor.rgb, mix(g2, g1, g1) * pow(d, 3.0));
                // gl_FragColor.a = mix(0.5 * gl_FragColor.a, gl_FragColor.a, g2);
                
                float g1 = getGrid(uSize1, thickness);
                gl_FragColor.rgb = uColor.rgb * g1;
                gl_FragColor.a = g1 * pow(d, 3.0) * .4;
                if ( gl_FragColor.a <= 0.0 ) discard;
            }
           `,

            extensions: {
                derivatives: true
            }
        } );

        super( geometry, material );

        this.frustumCulled = false;

    }

}

export { InfiniteGridHelper };
