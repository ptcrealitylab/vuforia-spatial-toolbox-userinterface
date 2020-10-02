/**
 * @preserve
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *      ╦═╗┌─┐┌─┐┬  ┬┌┬┐┬ ┬  ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐  ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *      ╠╦╝├┤ ├─┤│  │ │ └┬┘  ║╣  │││ │ │ │├┬┘  ╠═╝├┬┘│ │ │├┤ │   │
 *      ╩╚═└─┘┴ ┴┴─┘┴ ┴  ┴   ╚═╝─┴┘┴ ┴ └─┘┴└─  ╩  ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2015 Valentin Heun
 * Modified by Valentin Heun 2014, 2015, 2016, 2017
 * Modified by Benjamin Reynholds 2016, 2017
 * Modified by James Hobin 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* exported httpPort, defaultHttpPort, timeForContentLoaded, timeCorrection, boundListeners, TEMP_DISABLE_MEMORIES, globalStates, globalCanvas, publicDataCache, pocketItemId, globalScaleAdjustment, pocketFrame, pocketNode, globalDOMCache, shadowObjects, globalProgram, rotateX, rotationXMatrix, editingAnimationsMatrix, pocketDropAnimation, pocketBegin, visibleObjectTapInterval, visibleObjectTapDelay, overlayDiv, CRAFTING_GRID_WIDTH, CRAFTING_GRID_HEIGHT, DEBUG_DATACRAFTING */

/**********************************************************************************************************************
 ******************************************** constant settings *******************************************************
 **********************************************************************************************************************/

var httpPort = 8080;
var defaultHttpPort = 8080;
var timeForContentLoaded = 100; // temporary set to 10000 with the UI Recording mode for video recording
var timeCorrection = {delta: 0, now: 0, then: 0};
var boundListeners = {};

var TEMP_DISABLE_MEMORIES = false;

// noinspection JSSuspiciousNameCombination - (width is based on innerHeight and vice versa)
/**********************************************************************************************************************
 ******************************************** global variables  *******************************************************
 **********************************************************************************************************************/

var globalStates = {
    spatial: {
        whereIs: {},
        howFarIs: {},
        whereWas: {},
        velocityOf: {}
    },
    craftingMoveDelay: 400,
    tempUuid: "0000",
    debug: false,
    debugSpeechConsole: false,
    device: "",
    // drawWithLines
    ballDistance: 14,
    ballSize: 6,
    ballAnimationCount: 0,
    nodeSpeechHighlightCounter: 0,

    width: window.innerHeight,
    height: window.innerWidth,
    guiState: "ui", // possible values: "ui"=(frames visible), "node"=(nodes visible), "logic"=(crafting board)
    UIOffMode: false,
    settingsButtonState: false,
    currentLogic: null,

    developerState: false,
    sendMatrix3d: false,
    sendAcl: false,

    lockingMode: false,
    //authenticatedUser: null,
    lockPassword: null,
    
    // setting this to FALSE speeds up rendering while in node view by NOT also rendering the frames (semi-transparently)
    renderFrameGhostsInNodeViewEnabled: true,
    
    pocketButtonState: false,

    deviceOrientationRight: null,
    
    freezeButtonState: false,
    logButtonState: false,
    editingMode: false,
    tempEditingMode: false,
    editingNode: false,
    editingFrame: false,
    guiURL: "",
    newURLText: "",
    platform: navigator.platform,
    lastLoop: 0,
    notLoading: "",
    drawDotLine: false,
    drawDotLineX: 0,
    drawDotLineY: 0,
    pointerPosition: [0, 0],
    projectionMatrix: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    realProjectionMatrix: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    unflippedRealProjectionMatrix: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    webglProjectionMatrix: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ],
    acceleration:{
        x : 0,
        y : 0,
        z : 0,
        alpha: 0,
        beta: 0,
        gamma: 0,
        motion:0
    },
    sendAcceleration : false,
    angX: 0,
    angY: 0,
    angZ: 0,
    unconstrainedPositioning: false,
    distanceEditingMode: false,

    thisAndthat : {
        interval: undefined,
        timeout: undefined
    },
    // constants for screen extension
    framePullThreshold: 50,

    // default scale for new frames and nodes
    defaultScale: 0.5,

    // retail
    reality: false,
    interface: "gui",

    useGroundPlane: true,
    numFunctionCalls: {
        multiplyMatrix: 0,
        invertMatrix: 0,
        copyMatrix: 0
    }
};

function printNumFunctionCalls() {
    let calls = globalStates.numFunctionCalls;
    let total = calls.multiplyMatrix + calls.invertMatrix + calls.copyMatrix;
    console.log('\n' + total + ' matrix computations');
    console.log(calls.multiplyMatrix + ' multiplyMatrix');
    console.log(calls.invertMatrix + ' invertMatrix');
    console.log(calls.copyMatrix + ' copyMatrix');

    calls.multiplyMatrix = 0;
    calls.invertMatrix = 0;
    calls.copyMatrix = 0;
}

setInterval(function() {
    printNumFunctionCalls();
}, 1000);

var globalCanvas = {};

var publicDataCache = {};

var pocketItem  = {"pocket" : new Objects()};
pocketItem["pocket"].frames["pocket"] = new Frame();
var pocketItemId = "";

var globalScaleAdjustment = 0.5;

// reduces size of nodes on new frames compared to how they were rendered on old frames, to make rendering backwards compatible
// eslint-disable-next-line no-unused-vars
var newNodeScaleFactor = 0.5;

/**
 * @typedef {Object} PocketContainer
 * @desc A data structure holding the frame or node to be dropped in from the pocket, with additional state.
 * @property {string} type
 * @property {Frame|Node} vehicle
 * @property {string} closestObjectKey
 * @property {{pageX: number, pageY: number}} positionOnLoad
 * @property {boolean} waitingToRender
 */

/**
 * Holds a frame when it is being dropped in from the pocket
 * @type {PocketContainer}
 */
var pocketFrame = {
    type: 'ui',
    vehicle: null,
    closestObjectKey: null,
    positionOnLoad: null,
    waitingToRender: false
};

/**
 * Holds a logic node when it is being dropped in from the pocket
 * @type {PocketContainer}
 */
var pocketNode = {
    type: 'logic',
    vehicle: null,
    positionOnLoad: null,
    closestObjectKey: null,
    closestFrameKey: null,
    waitingToRender: false
};

var globalDOMCache = {};
var shadowObjects = {};

var globalProgram = {
    objectA: false,
    frameA: false,
    nodeA: false,
    logicA:false,
    objectB: false,
    frameB: false,
    nodeB: false,
    logicB:false,
    logicSelector:4
};

var rotateX = [
    1, 0, 0, 0,
    0, -1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

var makeRotationX =  function ( theta ) {

    var c = Math.cos( theta ), s = Math.sin( theta );

    return [  1, 0, 0, 0,
        0, c, - s, 0,
        0, s, c, 0,
        0, 0, 0, 1];
};

var rotationXMatrix =  makeRotationX(-(Math.PI/2));

var editingAnimationsMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

var pocketDropAnimation = null;

// pocketBegin is a hard-coded value that places a new frame in a nice spot relative to the camera when it spawns
var pocketBegin = [1138.6973538592133,13.991065713633931,0.06988535562447923,0.06993400512601616,-16.11745909667903,1136.2485938902328,0.08978962416316712,0.08976110615564072,138.96584170397102,73.32506513216471,-2.5095775949204446,-2.505473059727466,34327.448087541634,-2445.6806878581046,428.02424166124865,430.5078316680102];
// old value: [1137.549909421903,12.017532798048029,-0.03482891256371417,-0.03475932439627283,-11.812648290367441,1137.738228161505,0.005875104883220343,0.005863366423640215,-22.38728737682625,11.161969977619812, -2.003692935114902, -1.9996895566225437, -9437.22693164777, 6368.974843939889, 793.5453413849068, 795.955841789644]

var visibleObjectTapInterval = null;
var visibleObjectTapDelay = 1000;

var overlayDiv;

var CRAFTING_GRID_WIDTH = 506;
var CRAFTING_GRID_HEIGHT = 320;

var DEBUG_DATACRAFTING = false; // when TRUE -> shows crafting board just by tapping on first menu item (DEBUG mode)
