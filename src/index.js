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
 ******************************************** global namespace *******************************************************
 **********************************************************************************************************************/


var objects = {};

var realityEditor = realityEditor || {
        app:{
            callbacks: {}
        },
		device: {
		    security:{},
            utilities: {},
            speechProcessor: {},
            speechPerformer: {},
            touchInputs : {},
            keyboardEvents: {},
            touchPropagation: {},
            desktopAdapter: {},
            hololensAdapter: {},
            distanceScaling: {}
        },
		gui: {
			ar: {
				draw: {
                    visibleObjects : "",
                    globalCanvas : {}
				},
                positioning: {},
                grouping: {},
                lines: {},
                frameHistoryRenderer: {},
                desktopRenderer: {},
                utilities: {}
            },
            crafting: {
                blockMenu: {},
                eventHandlers: {},
                eventHelper: {},
                grid: {},
                utilities: {}
            },
            memory: {
			    nodeMemories: {}
            },
            settings: {
                logo:{}
            },
            buttons: {},
            frames:{},
            instantConnect:{},
            menus:{},
            pocket: {},
            screenExtension : {},
            search:{},
            utilities: {},
            canvasCache: {},
            domCache: {},
            setup: {},
            modal: {},
            dropdown: {}
		},
        network: {
            realtime: {},
            utilities: {},
            realtime: {},
            frameContentAPI: {}
        },
        moduleCallbacks: {},
        worldObjects: {}
	};

/**
 * @desc This function generates all required namespaces and initializes a namespace if not existing.
 * Additional it includes pointers to each subspace.
 *
 * Inspired by code examples from:
 * https://www.kenneth-truyers.net/2013/04/27/javascript-namespaces-and-modules/
 *
 * @param namespace string of the full namespace path
 * @return object that presents the actual used namespace
 **/
var createNameSpace = createNameSpace || function (namespace) {
		var splitNameSpace = namespace.split("."), object = this, object2;
		for (var i = 0; i < splitNameSpace.length; i++) {
			object = object[splitNameSpace[i]] = object[splitNameSpace[i]] || {};
			object2 = this;
			for (var e = 0; e < i; e++) {
				object2 = object2[splitNameSpace[e]];
				object[splitNameSpace[e]] = object[splitNameSpace[e]] || object2;
				object.cout = this.cout;
			}
		}
		return object;
	};

createNameSpace("realityEditor");

realityEditor.objects = objects;

if(typeof shadowObjects !== "undefined")
realityEditor.shadowObjects = shadowObjects;


realityEditor.getShadowObject = function (objectKey){
    if(!objectKey) return null;
    
    if(!this.shadowObjects[objectKey]){
        this.shadowObjects[objectKey] = {};
        this.shadowObjects[objectKey].frames = {};
    }
    return  this.shadowObjects[objectKey];
};

realityEditor.getShadowFrame = function (objectKey, frameKey){
    if(!objectKey) return null;
    if(!frameKey) return null;
    
    if(!this.shadowObjects[objectKey]){
        this.shadowObjects[objectKey] = {};
        this.shadowObjects[objectKey].frames = {};
    }
    if(!this.shadowObjects[objectKey].frames[frameKey]){
        this.shadowObjects[objectKey].frames[frameKey] = {};
        this.shadowObjects[objectKey].links = {};
        this.shadowObjects[objectKey].nodes = {};
    }
    return  this.shadowObjects[objectKey].frames[frameKey];
};

realityEditor.getShadowNode = function (objectKey, frameKey, nodeKey){
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!nodeKey) return null;
    
    if(!this.shadowObjects[objectKey]){
        this.shadowObjects[objectKey] = {};
        this.shadowObjects[objectKey].frames = {};
    }
    if(!this.shadowObjects[objectKey].frames[frameKey]){
        this.shadowObjects[objectKey].frames[frameKey] = {};
        this.shadowObjects[objectKey].links = {};
        this.shadowObjects[objectKey].nodes = {};
    }

    if(!this.shadowObjects[objectKey].frames[frameKey].nodes[nodeKey]){
        this.shadowObjects[objectKey].frames[frameKey].nodes[nodeKey] = {};
    }
    return  this.shadowObjects[objectKey].frames[frameKey].nodes[nodeKey] ;
};

// return the object
/**
 * @param objectKey
 * @return {Objects|null}
 */
realityEditor.getObject = function (objectKey){
    if(!objectKey) return null;
    // if (objectKey === worldObjectId) { return worldObject; }
    if(!(objectKey in this.objects)) return null;
    return this.objects[objectKey];
};

// return a frame located in the object
/**
 * @param objectKey
 * @param frameKey
 * @return {Frame|null}
 */
realityEditor.getFrame = function (objectKey, frameKey){
    if(!objectKey) return null;
    if(!frameKey) return null;
    // if (objectKey === worldObjectId) { return worldObject.frames[frameKey]; }
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    return this.objects[objectKey].frames[frameKey];
};

// return a node located in the object frame
/**
 * @param objectKey
 * @param frameKey
 * @param nodeKey
 * @return {Node|null}
 */
realityEditor.getNode = function (objectKey, frameKey, nodeKey){
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!nodeKey) return null;
    // if (objectKey === worldObjectId) { return worldObject.frames[frameKey].nodes[nodeKey]; }
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    if(!(nodeKey in this.objects[objectKey].frames[frameKey].nodes)) return null;
    return this.objects[objectKey].frames[frameKey].nodes[nodeKey];
};

/**
 * Returns the frame or node specified by the path, if one exists.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string|undefined} nodeKey
 * @return {Frame|Node|null}
 */
realityEditor.getVehicle = function(objectKey, frameKey, nodeKey) {
    if (nodeKey) {
        return realityEditor.getNode(objectKey, frameKey, nodeKey);
    } else {
        return realityEditor.getFrame(objectKey, frameKey);
    }
};

// return a link located in a frame
realityEditor.getLink = function (objectKey, frameKey, linkKey){
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!linkKey) return null;
    // if (objectKey === worldObjectId) { return worldObject.frames[frameKey].links[linkKey]; }
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    if(!(linkKey in this.objects[objectKey].frames[frameKey].links)) return null;
    return this.objects[objectKey].frames[frameKey].links[linkKey];
};

// return a block in a logic node
realityEditor.getBlock = function (objectKey, frameKey, nodeKey, block){
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!nodeKey) return null;
    if(!block) return null;
    // if (objectKey === worldObjectId) { return worldObject.frames[frameKey].nodes[nodeKey].blocks[block]; }
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    if(!(nodeKey in this.objects[objectKey].frames[frameKey].nodeKey)) return null;
    if(!(block in this.objects[objectKey].frames[frameKey].nodes[nodeKey].blocks)) return null;
    return this.objects[objectKey].frames[frameKey].nodes[nodeKey].blocks[block];
};

// return a block link in a logic node
realityEditor.getBlockLink = function (objectKey, frameKey, nodeKey, linkKey){
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!nodeKey) return null;
    if(!linkKey) return null;
    // if (objectKey === worldObjectId) { return worldObject.frames[frameKey].nodes[nodeKey].links[linkKey]; }
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    if(!(nodeKey in this.objects[objectKey].frames[frameKey].nodeKey)) return null;
    if(!(linkKey in this.objects[objectKey].frames[frameKey].nodes[nodeKey].links)) return null;
    return this.objects[objectKey].frames[frameKey].nodes[nodeKey].links[linkKey];
};

// helper methods to cleanly iterate over all objects / frames / nodes

/**
 * Perform the callback with each (object, objectKey) pair for all objects
 * @param callback 
 */
realityEditor.forEachObject = function(callback){
    for (var objectKey in objects) {
        var object = realityEditor.getObject(objectKey);
        if (object) {
            callback(object, objectKey);
        }
    }
};

/**
 * Perform the callback on each (objectKey, frameKey, nodeKey) pair for all objects, frames, and nodes
 * @param callback
 */
realityEditor.forEachNodeInAllObjects = function(callback) {
    for (var objectKey in objects) {
        realityEditor.forEachNodeInObject(objectKey, callback);
    }
};

/**
 * Perform the callback on each (objectKey, frameKey, nodeKey) pair for the given object
 * @param objectKey
 * @param callback
 */
realityEditor.forEachNodeInObject = function(objectKey, callback) {
    var object = realityEditor.getObject(objectKey);
    if (!object) return;
    for (var frameKey in object.frames) {
        if (!object.frames.hasOwnProperty(frameKey)) continue;
        realityEditor.forEachNodeInFrame(objectKey, frameKey, callback);
    }
};

/**
 * Perform the callback for each (objectKey, frameKey, nodeKey) pair for the given frame
 * @param objectKey
 * @param frameKey
 * @param callback
 */
realityEditor.forEachNodeInFrame = function(objectKey, frameKey, callback) {
    var frame = realityEditor.getFrame(objectKey, frameKey);
    if (!frame) return;
    for (var nodeKey in frame.nodes) {
        if (!frame.nodes.hasOwnProperty(nodeKey)) continue;
        callback(objectKey, frameKey, nodeKey);
    }
};

/**
 * Perform the callback on each (objectKey, frameKey, nodeKey) pair for all objects, frames, and nodes
 * @param callback
 */
realityEditor.forEachFrameInAllObjects = function(callback) {
    for (var objectKey in objects) {
        realityEditor.forEachFrameInObject(objectKey, callback);
    }
};

/**
 * Perform the callback for each (objectKey, frameKey) pair for the given object
 * @param objectKey
 * @param callback
 */
// TODO: simplify signature: doesnt need to include objectKey in callback since its an arg
realityEditor.forEachFrameInObject = function(objectKey, callback) {
    var object = realityEditor.getObject(objectKey);
    if (!object) return;
    for (var frameKey in object.frames) {
        if (!object.frames.hasOwnProperty(frameKey)) continue;
        callback(objectKey, frameKey);
    }
};

/**
 * Extracts the object and/or frame and/or node keys depending on the type of vehicle
 * @param {Object|Frame|Node} vehicle
 * @return {{objectKey: string|null, frameKey: string|null, nodeKey: string|null}}
 */
realityEditor.getKeysFromVehicle = function(vehicle) {
    var objectKey = null;
    var frameKey = null;
    var nodeKey = null;

    if (typeof vehicle.objectId !== 'undefined') {
        objectKey = vehicle.objectId;
    }
    if (typeof vehicle.frameId !== 'undefined') {
        frameKey = vehicle.frameId;
    }
    if (typeof vehicle.uuid !== 'undefined' || (typeof vehicle.type !== 'undefined' && vehicle.type !== 'ui')) {
        if (objectKey && frameKey) {
            if (typeof vehicle.uuid === 'undefined') {
                vehicle.uuid = frameKey + vehicle.name;
            }
            nodeKey = vehicle.uuid;
        } else if (objectKey) {
            frameKey = vehicle.uuid;
        } else {
            objectKey = vehicle.uuid;
        }
    }
    
    return {
        objectKey: objectKey,
        frameKey: frameKey,
        nodeKey: nodeKey
    };
};
