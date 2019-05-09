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

/**********************************************************************************************************************
 ******************************************** constant settings *******************************************************
 **********************************************************************************************************************/

var disp = {};
var uiButtons;
var httpPort = 8080;
var timeForContentLoaded = 100; // temporary set to 10000 with the UI Recording mode for video recording
var timeCorrection = {delta: 0, now: 0, then: 0};
var boundListeners = {};

var TEMP_DISABLE_MEMORIES = false;

// noinspection JSSuspiciousNameCombination - (width is based on innerHeight and vice versa)
/**********************************************************************************************************************
 ******************************************** global variables  *******************************************************
 **********************************************************************************************************************/

var globalStates = {
	craftingMoveDelay : 400,
	tempUuid : "0000",
	debug: false,
    debugSpeechConsole: false,
	overlay: 0,
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
	extendedTracking: false,
    zoneText: "",
    zoneState: false,
	currentLogic: null,

	extendedTrackingState: false,
	developerState: false,
	clearSkyState: false,
    realityState: false,
	externalState: "",
    discoveryState: "",
    speechState: false,
	sendMatrix3d: false,
	sendAcl: false,
    
    lockingMode: false,
    //authenticatedUser: null,
    lockPassword: null,

    videoRecordingEnabled: false,
    // videoRecordingMode: true,
    renderFrameGhostsInNodeViewEnabled: true,

    // if enabled, forwards the matrix stream to a connected desktop editor via UDP messages
    matrixBroadcastEnabled: false,
    hololensModeEnabled: false,
    groupingEnabled: false,

	pocketButtonState: false,
    
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

    /**
     * @type {Array.<string>} list of frameKeys that have been edited at any point. later in array = more recently edited.
     */
    mostRecentlyEditedFrames: [],

    /**
     * @type {Array.<string>} list of nodeKeys that have been edited at any point. later in array = more recently edited.
     */
    mostRecentlyEditedNodes: [],

    rightEdgeOffset: (window.innerWidth === 856 && window.innerHeight === 375) ? (74) : ((window.innerWidth >= 812 && window.innerHeight >= 375) ? (37) : (0)) // if iPhone X, offset the right edge by 74px
};

var globalCanvas = {};

var globalLogic ={
	size:0,
	x:0,
	y:0,
	rectPoints: [],
	farFrontElement:"",
	frontDepth: 1000000
};

var publicDataCache = {};

// reconstructs the grouping structure on the UI side
/**
 * @type {Object.<string, Set.<string>>}
 */
var groupStruct = {};
/**
 * @type {Object.<string, string>}
 */
var frameToObj = {};

var pocketItem  = {"pocket" : new Objects()};
pocketItem["pocket"].frames["pocket"] = new Frame();
var pocketItemId = "";

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
var globalMatrix = {
	temp: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	begin: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	end: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	r: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	r2: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	copyStillFromMatrixSwitch: false
};

var consoleText = "";

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

var rotationXMartrix =  makeRotationX(-(Math.PI/2));

var editingAnimationsMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

var pocketDropAnimation = null;

var pocketBegin = [1137.549909421903,12.017532798048029,-0.03482891256371417,-0.03475932439627283,-11.812648290367441,1137.738228161505,0.005875104883220343,0.005863366423640215,-22.38728737682625,11.161969977619812, -2.003692935114902, -1.9996895566225437, -9437.22693164777, 6368.974843939889, 793.5453413849068, 795.955841789644];

var visibleObjectTapInterval = null;
var visibleObjectTapDelay = 1000;

var testInterlink = {};

var overlayDiv;
//var overlayImg;
//var overlayImage = [];

var CRAFTING_GRID_WIDTH = 506;
var CRAFTING_GRID_HEIGHT = 320;

/**********************************************************************************************************************
 ***************************************** datacrafting variables  ****************************************************
 **********************************************************************************************************************/

// var blockColorMap = {
//    bright:["#2DFFFE", "#29FD2F", "#FFFD38", "#FC157D"], // blue, green, yellow, red
//    faded:["#EAFFFF", "#EAFFEB", "#FFFFEB", "#FFE8F2"] // lighter: blue, green, yellow, red
//}

var menuBarWidth = 62;
var blockColorMap = ["#00FFFF", "#00FF00", "#FFFF00", "#FF007C"];
var columnHighlightColorMap = ["rgba(0,255,255,0.15)", "rgba(0,255,0,0.15)", "rgba(255,255,0,0.15)", "rgba(255,0,124,0.15)"];
//var activeBlockColor = "#E6E6E6"; // added blocks are grey
//var movingBlockColor = "#FFFFFF"; // blocks turn white when you start to drag them

var DEBUG_DATACRAFTING = false; // when TRUE -> shows crafting board just by tapping on first menu item (DEBUG mode)

var blockIconCache = {};

