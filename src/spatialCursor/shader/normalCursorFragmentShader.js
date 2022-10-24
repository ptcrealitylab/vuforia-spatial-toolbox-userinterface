createNameSpace("realityEditor.spatialCursor.shader.normalCursorFragmentShader");

(function(exports) {
    const normalCursorFragmentShaderCode = `
        uniform float time;
        varying vec2 vUv;
        
        void main(void) {
            vec2 position = -1.0 + 2.0 * vUv;
            vec2 origin = vec2(0.0);
            float color = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
            float alpha = distance(position, origin) > 0.9 || distance(position, origin) < 0.1 ? 1.0 : 0.0;
            gl_FragColor = vec4(color, color, color, alpha);
        }
    `;
    exports.normalCursorFragmentShaderCode = normalCursorFragmentShaderCode;
})(realityEditor.spatialCursor.shader.normalCursorFragmentShader);
