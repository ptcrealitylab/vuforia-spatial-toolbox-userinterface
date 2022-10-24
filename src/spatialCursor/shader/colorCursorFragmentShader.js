createNameSpace("realityEditor.spatialCursor.shader.colorCursorFragmentShader");

(function(exports) {
    const colorCursorFragmentShaderCode = `
        uniform float time;
        varying vec2 vUv;
        
        void main(void) {
            vec2 position = -1.0 + 2.0 * vUv;
            vec2 translate = vec2(-0.5, 0);
            position += translate;
        
            float r = abs(sin(position.x * position.y + time / 2.0));
            float g = abs(sin(position.x * position.y + time / 4.0));
            float b = abs(sin(position.x * position.y + time / 6.0));
        
            gl_FragColor = vec4(r, g, b, 1.0);
        }
    `;
    exports.colorCursorFragmentShaderCode = colorCursorFragmentShaderCode;
})(realityEditor.spatialCursor.shader.colorCursorFragmentShader);
