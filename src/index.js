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

var objects = {}; // TODO: this is a duplicate definition from src/objects.js

// this is an empty template that mirrors the src/ file tree. Used for auto-completion.
// the code will run correctly without this assuming you call:
//  createNameSpace("realityEditor.[module].[etc]")  correctly at the top of each file
var realityEditor = realityEditor || {
    app: {
        callbacks: {},
        targetDownloader: {}
    },
    device: {
        distanceScaling: {},
        environment: {},
        keyboardEvents: {},
        layout: {},
        onLoad: {},
        touchInputs: {},
        touchPropagation: {},
        utilities: {},
        videoRecording: {}
    },
    gui: {
        ar: {
            anchors: {},
            draw: {},
            frameHistoryRenderer: {},
            groundPlaneRenderer: {},
            grouping: {},
            lines: {},
            moveabilityOverlay: {},
            positioning: {},
            utilities: {}
        },
        spatial: {
            whereIs: {},
            draw: {},
            timeRecorder: {},
        },
        crafting: {
            blockMenu: {},
            eventHandlers: {},
            eventHelper: {},
            grid: {},
            utilities: {}
        },
        memory: {
            nodeMemories: {},
            pointer: {}
        },
        settings: { // todo: combine gui/settings/index.js with gui/settings.js
            logo: {},
            states: {}
        },
        buttons: {},
        dropdown: {},
        menus:{},
        modal: {},
        moveabilityCorners: {},
        pocket: {},
        screenExtension : {},
        utilities: {}
    },
    network: {
        frameContentAPI: {},
        availableFrames: {},
        realtime: {},
        utilities: {}
    },
    sceneGraph: {
        sceneNode: {},
        network: {}
    },
    envelopeManager: {},
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
 * @param {string} namespace string of the full namespace path
 * @return {*} object that presents the actual used namespace
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

if (typeof shadowObjects !== "undefined") {
    realityEditor.shadowObjects = shadowObjects;
}

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

/**
 * return the object given its uuid
 * @param {string} objectKey
 * @return {Objects|null}
 */
realityEditor.getObject = function (objectKey) {
    if(!objectKey) return null;
    if(!(objectKey in this.objects)) return null;
    return this.objects[objectKey];
};

/**
 * return a frame located in the object given both uuids
 * @param {string} objectKey
 * @param {string} frameKey
 * @return {Frame|null}
 */
realityEditor.getFrame = function (objectKey, frameKey) {
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    return this.objects[objectKey].frames[frameKey];
};

/**
 * return a node located in the object frame given all their uuids
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @return {Node|null}
 */
realityEditor.getNode = function (objectKey, frameKey, nodeKey) {
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!nodeKey) return null;
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    if(!(nodeKey in this.objects[objectKey].frames[frameKey].nodes)) return null;
    return this.objects[objectKey].frames[frameKey].nodes[nodeKey];
};

/**
 * Returns the frame or node specified by the path, if one exists.
 * Pass in null for nodeKey (or exclude it altogether) to get a frame, otherwise tries to find the node
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

/**
 * return a link located in a frame
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @return {Link|null}
 */
realityEditor.getLink = function (objectKey, frameKey, linkKey){
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!linkKey) return null;
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    if(!(linkKey in this.objects[objectKey].frames[frameKey].links)) return null;
    return this.objects[objectKey].frames[frameKey].links[linkKey];
};

/**
 * return a block in a logic node
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {Block} block
 * @return {Block|null}
 */
realityEditor.getBlock = function (objectKey, frameKey, nodeKey, block){
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!nodeKey) return null;
    if(!block) return null;
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    if(!(nodeKey in this.objects[objectKey].frames[frameKey].nodeKey)) return null;
    if(!(block in this.objects[objectKey].frames[frameKey].nodes[nodeKey].blocks)) return null;
    return this.objects[objectKey].frames[frameKey].nodes[nodeKey].blocks[block];
};

/**
 * return a block link in a logic node
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {string} linkKey
 * @return {BlockLink|null}
 */
realityEditor.getBlockLink = function (objectKey, frameKey, nodeKey, linkKey){
    if(!objectKey) return null;
    if(!frameKey) return null;
    if(!nodeKey) return null;
    if(!linkKey) return null;
    if(!(objectKey in this.objects)) return null;
    if(!(frameKey in this.objects[objectKey].frames)) return null;
    if(!(nodeKey in this.objects[objectKey].frames[frameKey].nodeKey)) return null;
    if(!(linkKey in this.objects[objectKey].frames[frameKey].nodes[nodeKey].links)) return null;
    return this.objects[objectKey].frames[frameKey].nodes[nodeKey].links[linkKey];
};

// helper methods to cleanly iterate over all objects / frames / nodes

/**
 * Perform the callback with each (object, objectKey) pair for all objects
 * @param {function} callback
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
 * @param {function} callback
 */
realityEditor.forEachNodeInAllObjects = function(callback) {
    for (var objectKey in objects) {
        realityEditor.forEachNodeInObject(objectKey, callback);
    }
};

/**
 * Perform the callback on each (objectKey, frameKey, nodeKey) pair for the given object
 * @param {string} objectKey
 * @param {function} callback
 */
realityEditor.forEachNodeInObject = function(objectKey, callback) {
    var object = realityEditor.getObject(objectKey);
    if (!object) return;
    for (var frameKey in object.frames) {
        // if (!object.frames.hasOwnProperty(frameKey)) continue;
        realityEditor.forEachNodeInFrame(objectKey, frameKey, callback);
    }
};

/**
 * Perform the callback for each (objectKey, frameKey, nodeKey) pair for the given frame
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {function} callback
 */
realityEditor.forEachNodeInFrame = function(objectKey, frameKey, callback) {
    var frame = realityEditor.getFrame(objectKey, frameKey);
    if (!frame) return;
    for (var nodeKey in frame.nodes) {
        // if (!frame.nodes.hasOwnProperty(nodeKey)) continue;
        callback(objectKey, frameKey, nodeKey);
    }
};

/**
 * Perform the callback on each (objectKey, frameKey, nodeKey) pair for all objects, frames, and nodes
 * @param {function} callback
 */
realityEditor.forEachFrameInAllObjects = function(callback) {
    for (var objectKey in objects) {
        realityEditor.forEachFrameInObject(objectKey, callback);
    }
};

/**
 * Perform the callback for each (objectKey, frameKey) pair for the given object
 * @param {string} objectKey
 * @param {function} callback
 * @todo: simplify signature: doesnt need to include objectKey in callback since its an arg
 */
realityEditor.forEachFrameInObject = function(objectKey, callback) {
    var object = realityEditor.getObject(objectKey);
    if (!object) return;
    for (var frameKey in object.frames) {
        // if (!object.frames.hasOwnProperty(frameKey)) continue;
        callback(objectKey, frameKey);
    }
};

realityEditor.vehicleKeyCache = {}; // improves efficiency of getKeysFromVehicle by saving the search results

/**
 * Extracts the object and/or frame and/or node keys depending on the type of vehicle
 * @param {Objects|Frame|Node} vehicle
 * @return {{objectKey: string|null, frameKey: string|null, nodeKey: string|null}}
 */
realityEditor.getKeysFromVehicle = function(vehicle) {

    // load from cache if possible
    if (typeof vehicle.uuid !== 'undefined') {
        if (typeof this.vehicleKeyCache[vehicle.uuid] !== 'undefined') {
            return this.vehicleKeyCache[vehicle.uuid];
        }
    }

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

    this.vehicleKeyCache[vehicle.uuid] = {
        objectKey: objectKey,
        frameKey: frameKey,
        nodeKey: nodeKey
    };

    return this.vehicleKeyCache[vehicle.uuid];
};

/**
 * Helper function to check if the argument is a frame or if it's a node
 * @param {Frame|Node} vehicle
 * @return {boolean}
 */
realityEditor.isVehicleAFrame = function(vehicle) {
    return (vehicle.type === 'ui' || typeof vehicle.type === 'undefined');
};

/**
 * Helper function loops over all links on all objects to find ones starting or ending at this node
 * @param {string} nodeKey
 * @return {{linksToNode: Array.<Link>, linksFromNode: Array.<Link>}}
 */
realityEditor.getLinksToAndFromNode = function(nodeKey) {
    let linksToNode = [];
    let linksFromNode = [];

    // loop through all frames
    realityEditor.forEachFrameInAllObjects(function(thatObjectKey, thatFrameKey) {
        var thatFrame = realityEditor.getFrame(thatObjectKey, thatFrameKey);

        // loop through all links in that frame
        for (var linkKey in thatFrame.links) {
            var link = thatFrame.links[linkKey];

            if (link.nodeA === nodeKey) {
                linksFromNode.push(link);
            } else if (link.nodeB === nodeKey) {
                linksToNode.push(link);
            }
        }
    });

    return {
        linksToNode: linksToNode,
        linksFromNode: linksFromNode
    };
};
