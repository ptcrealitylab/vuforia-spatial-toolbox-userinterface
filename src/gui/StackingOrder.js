// decomposes the application into parent stacking contexts that ensure a consistent z-index of various elements in the scene
// the three main categories consist of whether the content is part of the 3D scene, behind it, or in front of it on the 2D GUI layer
// within these layers, you can order children by z-index to define more granular stacking order between elements
const LAYERS = Object.freeze({
    // background
    BACKGROUND: 'BACKGROUND', // any 2D content that is guaranteed to be behind all 3d content, at the very back
    // the 3D scene
    SCENE_BACKGROUND: 'SCENE_BACKGROUND', // the layer of the three.js area target scan canvas (or the AR camera image)
    SCENE_APP_BACKGROUND: 'SCENE_APP_BACKGROUND', // the layer of 3D content that is rendered directly on top of the scan / AR background (e.g gl-proxy canvas)
    SCENE_APP_ICONS_AND_WIDGETS: 'SCENE_APP_ICONS_AND_WIDGETS', // the layer of 2D content on top of the gl-proxy but still in the 3D scene (e.g. app icons)
    SCENE_FOREGROUND: 'SCENE_FOREGROUND', // 3D content / canvases that should render on top of app icons but below fullscreen apps and GUI buttons
    // foreground GUI
    GUI_APP_FOREGROUND: 'GUI_APP_FOREGROUND', // the layer that fullscreen tools can go to if they want to be directly behind the GUI buttons, e.g. chat app
    GUI_BUTTONS: 'GUI_BUTTONS', // the default layer of all screen-space buttons
    GUI_MENUS: 'GUI_MENUS', // the default layer of all screen-space menus that can cover up buttons
    GUI_MODALS: 'GUI_MODALS', // the layer for all modals, etc, that need to be in front of all other GUI elements
    GUI_POINTER: 'GUI_POINTER', // the layer for anything snapped to the pointer that should render on top of everything else
});
realityEditor.gui.LAYERS = LAYERS;

class StackingOrder {
    constructor() {
        this.layers = {};
        this.setupLayers();
        this.assignHTMLToLayers();
    }

    setupLayers() {
        this.createLayer(LAYERS.BACKGROUND, 10);

        this.createLayer(LAYERS.SCENE_BACKGROUND, 20);
        this.createLayer(LAYERS.SCENE_APP_BACKGROUND, 30);
        this.createLayer(LAYERS.SCENE_APP_ICONS_AND_WIDGETS, 40);
        this.createLayer(LAYERS.SCENE_FOREGROUND, 50);

        this.createLayer(LAYERS.GUI_APP_FOREGROUND, 60);
        this.createLayer(LAYERS.GUI_BUTTONS, 70);
        this.createLayer(LAYERS.GUI_MENUS, 80);
        this.createLayer(LAYERS.GUI_MODALS, 90);
        this.createLayer(LAYERS.GUI_POINTER, 100);
    }

    // the divs from index.html need to be moved to the right layers
    // all divs added programmatically should be added to a layer when they are created
    assignHTMLToLayers() {
        this.addToLayer(document.querySelector('.memoryBackground'), LAYERS.BACKGROUND);

        this.addToLayer(document.getElementById('mainThreejsCanvas'), LAYERS.SCENE_BACKGROUND);

        this.addToLayer(document.getElementById('glcanvas'), LAYERS.SCENE_APP_BACKGROUND);

        this.addToLayer(document.querySelector('.canvas-node-connections'), LAYERS.SCENE_FOREGROUND);
        this.addToLayer(document.getElementById('p5WebGL'), LAYERS.SCENE_FOREGROUND);
        this.addToLayer(document.getElementById('groupLassoSVG'), LAYERS.SCENE_FOREGROUND);
        this.addToLayer(document.getElementById('groupSVG'), LAYERS.SCENE_FOREGROUND);

        this.addToLayer(document.getElementById('GUI'), LAYERS.SCENE_APP_ICONS_AND_WIDGETS);

        this.addToLayer(document.getElementById('UIButtons'), LAYERS.GUI_BUTTONS);

        this.addToLayer(document.getElementById('craftingBoard'), LAYERS.GUI_MENUS);
        this.addToLayer(document.getElementById('settingsIframe'), LAYERS.GUI_MENUS);
        this.addToLayer(document.querySelector('.pocket'), LAYERS.GUI_MENUS);

        this.addToLayer(document.querySelector('.memoryPointerContainer'), LAYERS.GUI_POINTER);
        this.addToLayer(document.querySelector('.memoryDragContainer'), LAYERS.GUI_POINTER);
        this.addToLayer(document.querySelector('.memoryDragContainer'), LAYERS.GUI_POINTER);
        this.addToLayer(document.getElementById('overlay'), LAYERS.GUI_POINTER);
    }

    createLayer(layerName, zIndex) {
        let layer = document.createElement('div');
        layer.id = layerName;
        layer.classList.add('stacking-layer');
        layer.style.zIndex = zIndex;
        layer.style.transform = `translateZ(${zIndex})`;
        document.body.appendChild(layer);
        this.layers[layerName] = layer;
    }

    addToLayer(element, layerName) {
        if (!element || !this.layers[layerName]) {
            console.warn('error adding to layer');
            return;
        }

        this.layers[layerName].appendChild(element);
    }
}

realityEditor.gui.stackingOrder = new StackingOrder();
