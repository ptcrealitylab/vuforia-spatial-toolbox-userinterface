var realityElements = [
/*
    {
        name: 'background',
        width: 660,
        height: 430,
        nodes: [
        ]
    },*/

    /*{
        name: 'sensor-graph',
        width: 304,
        height: 304,
        nodes: [
            'value'
        ]
    },
    {
        name: 'sensor-linear',
        width: 204,
        height: 52,
        nodes: [
            'value'
        ]
    },
    {
        name: 'sensor-digital',
        width: 100,
        height: 100,
        nodes: [
            'value'
        ]
    },*/
    // {
    //     name: 'dancer',
    //     width: 568,
    //     height: 320,
    //     nodes: [
    //     ]
    // },
    // {
    //     name: 'turtle',
    //     width: 568,
    //     height: 320,
    //     nodes: [
    //     ]
    // },
    /*
    {
        name: 'videoCapture',
        width: 568,
        height: 320,
        nodes: [
            {name: 'play', type: 'node', x: 0, y: -27, scaleFactor: 0.75},
            // {name: 'progress', type: 'node'},
            // {name: 'next', type: 'node', x: 0, y: 100},
            {name: 'next', type: 'node', x: 50, y: 100, scaleFactor: 0.6},
            {name: 'prev', type: 'node', x: -50, y: 100, scaleFactor: 0.6},

            // {name: 'show', type: 'node', x: 0, y: -200},
            // {name: 'hide', type: 'node', x: 0, y: -100},

            {name: 'storage', type: 'storeData'}
        ]
    },*/
    {
        name: 'slider',
        width: 206,
        height: 526,
        nodes: [
            {name: 'value', type: "node", x:0, y:0}
        ]
    },
    {
        name: 'slider-2d',
        width: 526,
        height: 526,
        nodes: [
            {name: 'valueX', type: "node", x:-50, y:-50},
            {name: 'valueY', type: "node", x:50, y:50}
        ]
    },
    {
        name: 'switch',
        width: 570,
        height: 270,
        nodes: [
            {name: 'value', type: "node", x:0, y:0}
        ]
    },
    {
        name: 'draw',
        width: 600,
        height: 650,
        nodes: [
            {name: 'storage', type: "storeData", x:0, y:0}
        ]
    },
    {
        name: 'graphUI',
        width: 690,
        height: 410,
        nodes: [
            {name: 'value', type: "node", x:0, y:0}
        ]
    },
    {
        name: 'count',
        width: 515,
        height: 400,
        nodes: [
            {name: 'count', type: "count", x:-50, y:0},
            {name: 'reset', type: "node", x:50, y:0}
        ]
    },
    
    {
        name: 'twoSidedLimiter',
        width: 600,
        height: 505,
        nodes: [
            {name: 'in_out', type: "twoSidedLimiter", x:0, y:0}
        ]
    },/*
    {
        name: 'limiter',
        width: 510,
        height: 540,
        nodes: [
            {name: 'in_out', type: "limiter"}
        ]
    },*/
    {
        name: 'progress',
        width: 275,
        height: 415,
        nodes: [
            {name: 'value', type: "node", x:0, y:0}
        ]
    },
    {
        name: 'label',
        width: 450,
        height: 150,
        nodes: [
            {name: 'storage', type: "storeData", x:0, y:0}
        ]
    },    
    {
        name: 'value',
        width: 440,
        height: 145,
        nodes: [
            {name: 'value', type: "node", x:0, y:0}
        ]
    },
   
    {
        name: 'buttonOn',
        width: 270,
        height: 270,
        nodes: [
            {name: 'value', type: "node", x:0, y:0}
        ]
    },
    {
        name: 'buttonOff',
        width: 270,
        height: 270,
        nodes: [
            {name: 'value', type: "node", x:0, y:0}
        ]
    },

  
    {
        name: 'complete',
        width: 600,
        height: 600,
        nodes: [
            {name: 'state', type: "node", x:0, y:0}
        ]
    },
    {
        name: 'error',
        width: 600,
        height: 600,
        nodes: [
            {name: 'state', type: "node", x:0, y:0}
        ]
    },
    {
        name: 'warning',
        width: 600,
        height: 600,
        nodes: [
            {name: 'state', type: "node", x:0, y:0}
        ]
    },
    {
        name: 'inProgress',
        width: 600,
        height: 600,
        nodes: [
            {name: 'state', type: "node", x:0, y:0}
        ]
    },

    /*
    // /*  
    {
        name: 'skyNews',
        width: 660,
        height: 430,
        nodes: [
            {name: 'play', type: "node"}
        ]
    },/*
    {
        name: 'ptcStockUI',
        width: 600,
        height: 500,
        nodes: [
        ]
    },
    {
        name: 'ptcTwitter',
        width: 400,
        height: 400,
        nodes: [
        ]
    },*/
    // */
    {
        name: 'pushMe',
        width: 600,
        height: 600,
        nodes: [
        ]
    },
    {
        name: 'machine-gltf',
        width: 568,
        height: 320,
        nodes: [
        ]
    },
    {
        name: 'sphere',
        width: 568,
        height: 320,
        nodes: [
            // {name: 'hue', type: "node"},
            // {name: 'saturation', type: "node"},
            // {name: 'lightness', type: "node"}
        ]
    },
    {
        name: 'easterEgg',
        width: 604,
        height: 324,
        nodes: [
            {name: 'x', type: "node", x:-150, y:0},
            {name: 'y', type: "node", x:0, y:0},
            {name: 'reset', type: "node", x:150, y:0}
        ]
    }
];
