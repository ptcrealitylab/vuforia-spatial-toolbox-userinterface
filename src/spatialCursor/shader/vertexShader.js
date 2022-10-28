createNameSpace("realityEditor.spatialCursor.shader.vertexShader");

(function(exports) {
    const vertexShaderCode = `
        varying vec2 vUv;
        
        void main() {
            vUv = uv;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;
    exports.vertexShaderCode = vertexShaderCode;
})(realityEditor.spatialCursor.shader.vertexShader);
