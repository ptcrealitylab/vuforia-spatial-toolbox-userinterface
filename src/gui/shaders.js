import {ShaderChunk} from "../../thirdPartyCode/three/three.module.js";

createNameSpace("realityEditor.gui.shaders");

(function(exports) {
    const commonShader = `
        vec3 HSLToRGB(float h, float s, float l) {
            s /= 100.0;
            l /= 100.0;
            
            float k0 = mod((0.0 + h / 30.0), 12.0);
            float k4 = mod((8.0 + h / 30.0), 12.0);
            float k8 = mod((4.0 + h / 30.0), 12.0);
            
            float a = s * min(l, 1.0 - l);
            
            float f0 = l - a * max(-1.0, min(k0 - 3.0, min(9.0 - k0, 1.0)));
            float f4 = l - a * max(-1.0, min(k4 - 3.0, min(9.0 - k4, 1.0)));
            float f8 = l - a * max(-1.0, min(k8 - 3.0, min(9.0 - k8, 1.0)));
            
            return vec3(255.0 * f0, 255.0 * f8, 255.0 * f4) / 255.0;
        }
     
        float Remap01 (float x, float low, float high) {
            return clamp((x - low) / (high - low), 0., 1.);
        }
    
        float Remap (float x, float lowIn, float highIn, float lowOut, float highOut) {
            return lowOut + (highOut - lowOut) * Remap01(x, lowIn, highIn);
        }
    `;
    function heightMapVertexShader() {
        // return `
        //     // #include <worldpos_vertex>
        //     // todo Steve: varying vec3 vWorldPosition; somehow vWorldPosition has almost near 0. x, y, and z values. Further investigate
        //     varying vec3 vPosition;
        //     void main() {
        //         vPosition = position.xyz;
        //         // vPosition = vWorldPosition.xyz;
        //         gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        //     }
        // `;
        return ShaderChunk.meshphysical_vert
            .replace('#include <common>', `#include <common>
                varying vec3 vPosition;
                varying vec3 vNormal2;
            `)
            .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
                vPosition = position.xyz; // makes position accessible in the fragment shader
                vNormal2 = normal.xyz;
            `);
    }
    
    function gradientMapVertexShader() {
        return ShaderChunk.meshphysical_vert
            .replace('#include <common>', `#include <common>
                attribute vec4 tangent;
                varying vec4 vTangent;
                varying vec3 vPosition;
                varying vec3 vNormal2;
            `)
            .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
                vTangent = tangent.xyzw;
                vPosition = position.xyz;
                vNormal2 = normal.xyz;
            `)
    }
    
    function gradientMapFragmentShader() {
        return ShaderChunk.meshphysical_frag
            .replace('#include <common>', `#include <common>
                #define heightMap_blur 0.01
                
                varying vec4 vTangent;
                varying vec3 vPosition;
                varying vec3 vNormal2;
                
                uniform float gradientMap_minAngle;
                uniform float gradientMap_maxAngle;
                uniform bool gradientMap_outOfRangeAreaOriginalColor;
                
                ${commonShader}
            `)
            .replace('#include <dithering_fragment>', `#include <dithering_fragment>
                if (true) {
                    vec3 col = vec3(0.);               
                    
                    // gradient map colored heat map
                    // // method 1:
                    // float a = Remap01(vTangent.y, -1., 1.);
                    // // method 2:
                    // float a = Remap01(abs(vTangent.y), 0., 1.);
                    // // method 3:
                    // float a = Remap01(abs(dot(vTangent, normalize(vec3(vTangent.x, 0., vTangent.z)))), 0., 1.);
                    // // method 4:
                    float steepness = abs(dot(normalize(vNormal2), vec3(0., 1., 0.))); // Range [0., 1.]. 0. ~ very steep; 1. ~ very flat
                    float angle = degrees(acos(steepness));
                    float a = Remap(angle, gradientMap_minAngle, gradientMap_maxAngle, .1, .8);
                    col = HSLToRGB(a * 360. + 70., 100., 50.) * 0.5;
                    
                    float mapAlpha = gradientMap_outOfRangeAreaOriginalColor ? (angle < gradientMap_minAngle || angle > gradientMap_maxAngle ? 0. : 1.) : 1.;
                    // col *= mapAlpha;
                    if (gradientMap_outOfRangeAreaOriginalColor == true) {
                        col = mapAlpha == 0. ? vec3(1., 0., 0.) : vec3(0., 1., 0.);
                        col *= 0.5;
                    }
                    
                    // height map grid lines, 0.5 m per line
                    float thickness = 0.01;
                    thickness *= pow(1. - steepness, 1.); // attenuate thickness regarding angle of flatness. The flatter the surface, the thinner the line should be to avoid having a very thick line that doesn't look like height map lines
                    float b = mod(vPosition.y, 0.5);
                    float d = b - thickness;
                    // d = smoothstep(heightMap_blur, -heightMap_blur, d);
                    d = smoothstep(fwidth(b), -fwidth(b), d);
                    col += vec3(1.) * d;
                    
                    // gl_FragColor.rgb *= 0.5;
                    if (gradientMap_outOfRangeAreaOriginalColor == true || mapAlpha == 1.) {
                    // if (mapAlpha == 1.) {
                        gl_FragColor.rgb *= 0.5;
                    }
                    gl_FragColor += vec4(col, 1.);
                    
                    // gl_FragColor = vec4(0., steepness, 0., 1.);
                }
            `);
    }

    function heightMapFragmentShader() {
        return ShaderChunk.meshphysical_frag
            .replace('#include <common>', `#include <common>
                #define heightMap_blur 0.01
                
                varying vec3 vPosition; // --- vPosition.y approximately [-1.05, 1.5] for office new, [-2.4, 1.6] for harpak ulma machine
                varying vec3 vNormal2;
            
                uniform float heightMap_maxY;
                uniform float heightMap_minY;
                
                ${commonShader}
            `)
            .replace('#include <dithering_fragment>', `
                #include <dithering_fragment>

                if (true) {
                    vec3 col = vec3(0.);       
                    
                    float steepness = abs(dot(normalize(vNormal2), vec3(0., 1., 0.))); // Range [0., 1.]. 0. ~ very steep; 1. ~ very flat        
                    
                    // height map colored heat map
                    float a = Remap01(vPosition.y, heightMap_minY, heightMap_maxY);
                    a = Remap(a, 0., 1., .1, .8); // remap the range to [0.1, 0.8] to get the color range between red and dark purple, and avoid looping the color
                    col = HSLToRGB(a * 360. - 290., 100., 50.) * 0.5; // attenuate height map color with a fraction
                    
                    // height map grid lines, 0.5 m per line
                    float thickness = 0.01;
                    
                    thickness *= pow(1. - steepness, 1.); // attenuate thickness regarding angle of flatness. The flatter the surface, the thinner the line should be to avoid having a very thick line that doesn't look like height map lines
                    
                    // float b = mod(vPosition.y + (heightMap_maxY + heightMap_minY) / 2., 0.5); // this one almost (still not quite perfectly accurate) got the grid lines to appear at y === 0., but one issue emerged: a large portion of the ground gets colored white
                    float b = mod(vPosition.y, 0.5);
                    float d = b - thickness;
                    // d = smoothstep(heightMap_blur, -heightMap_blur, d);
                    d = smoothstep(fwidth(b), -fwidth(b), d);
                    col += vec3(1.) * d;
                    
                    gl_FragColor.rgb *= 0.5; // attenuate original mesh texture color with a fraction
                    gl_FragColor += vec4(col, 1.);
                }
            `);
    }
    
    exports.heightMapVertexShader = heightMapVertexShader;
    exports.heightMapFragmentShader = heightMapFragmentShader;
    
    exports.gradientMapVertexShader = gradientMapVertexShader;
    exports.gradientMapFragmentShader = gradientMapFragmentShader;
})(realityEditor.gui.shaders);
