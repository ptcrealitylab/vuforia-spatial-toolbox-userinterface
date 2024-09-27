export const vsBoundaryPlane = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    }
`;

export const fsBoundaryPlane = `
    #define thickness 0.002
    varying vec2 vUv;
    
    float sdBox( in vec2 p, in vec2 b )
    {
        vec2 d = abs(p)-b;
        return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
    }
    
    float sdCircle( vec2 p, float r )
    {
        return length(p) - r;
    }
    
    void main() {
        vec2 uv = vUv * 2. - 1.;
        
        float rect = sdBox(uv, vec2(1.) * (1. - thickness));
        rect = smoothstep(-fwidth(rect), fwidth(rect), rect);
        vec3 col = mix(vec3(0.), vec3(1.), rect);
        float a = mix(0., 1., rect);
        
        gl_FragColor = vec4(col, a);
    }
`;

export const vsDummyMesh = `
    #define scaleFactor 10000.
    void main() {
        float camDist = length(cameraPosition);
        mat4 modelMatrixButOnlyTranslate = mat4(
            camDist / scaleFactor, 0., 0., 0.,
            0., camDist / scaleFactor, 0., 0.,
            0., 0., camDist / scaleFactor, 0.,
            modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2], 1.
        );
        gl_Position = projectionMatrix * viewMatrix * modelMatrixButOnlyTranslate * vec4(position, 1.);
    }
`;

export const fsDummyMesh = `
    void main() {
        gl_FragColor = vec4(0., 1., 1., 1.);
    }
`;
