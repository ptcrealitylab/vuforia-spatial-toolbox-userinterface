import * as THREE from '../../thirdPartyCode/three/three.module.js';

class AnalyticsColor extends THREE.Color {
    constructor(...args) {
        super(...args);
        const h = this.getHSL({}).h;
        this.faded = new THREE.Color().setHSL(h, 0.8, 0.3); 
    }
}

/**
 * A collection of colors used in the analytics system.
 * They are created here to ensure that they are only created once.
 */
const AnalyticsColors = {
    undefined: new AnalyticsColor(1, 0, 1),
    base: new AnalyticsColor(0, 0.5, 1),
    red: new AnalyticsColor(1, 0, 0),
    yellow: new AnalyticsColor(1, 1, 0),
    green: new AnalyticsColor(0, 1, 0),
    blue: new AnalyticsColor(0, 0, 1)
};

export default AnalyticsColors;

