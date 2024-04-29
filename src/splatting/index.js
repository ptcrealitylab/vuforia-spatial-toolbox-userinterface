import SplatRenderer from './Splatting.js';

createNameSpace("realityEditor.splatting");

(function(exports) {
    
    exports.toggleGSRaycast = SplatRenderer.toggleGSRaycast;
    exports.showGSSettingsPanel = SplatRenderer.showGSSettingsPanel;
    exports.hideGSSettingsPanel = SplatRenderer.hideGSSettingsPanel;
    
}(realityEditor.splatting));
