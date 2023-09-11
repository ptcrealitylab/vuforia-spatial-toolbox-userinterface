/**
 *
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

createNameSpace("realityEditor.network.utilities");

/**
 * @desc rename object[before] to object[after], deleting object[before]
 * @param {Object} object
 * @param {String} before
 * @param {String} after
 * @return {Object}
 **/

realityEditor.network.utilities.rename = function(object, before, after) {
    if (typeof object[before] !== "undefined") {
        object[after] = object[before];
        delete object[before];
    }
};

/**
 * Updates the logic blocks on the origin (a logic node) to match those of the remote
 * @param {Node} origin - the logic node you want to update
 * @param {Object.<{string: Block}>} remoteBlocks - set of blocks mapped by their uuid
 */
realityEditor.network.utilities.syncBlocksWithRemote = function(origin, remoteBlocks) {
    // delete old blocks
    for (var blockKey in origin.blocks) {
        if (!origin.blocks.hasOwnProperty(blockKey)) continue;
        if (this.shouldSyncBlock(origin, blockKey, "delete")) {
            var domElement = origin.guiState.blockDomElements[blockKey];
            if (domElement) {
                domElement.parentNode.removeChild(domElement);
                delete origin.guiState.blockDomElements[blockKey];
            }
            delete origin.blocks[blockKey];
        }
    }

    // add missing blocks (updates existing ones too)
    for (blockKey in remoteBlocks) {
        if (!remoteBlocks.hasOwnProperty(blockKey)) continue;
        if (this.shouldSyncBlock(origin, blockKey, "create")) {
            origin.blocks[blockKey] = new Block();
            for (var key in remoteBlocks[blockKey]){
                origin.blocks[blockKey][key] = remoteBlocks[blockKey][key];
            }
        }
    }
};

/**
 * Based on whether you're creating or deleting a block, tells whether the local resource needs to be updated
 * @param {Node} origin
 * @param {string} blockKey
 * @param {string} mode - "create" or "delete"
 * @return {boolean}
 */
realityEditor.network.utilities.shouldSyncBlock = function(origin, blockKey, mode) {
    if (mode === "create") {
        if (!origin.blocks[blockKey]) return true;
    } else if (mode === "delete") {
        if (!origin.blocks[blockKey]) return false;
    }
    // if not create or delete mode, upload it unless it is an inOutBlock - as of 9/10/19 this path is never reached
    return realityEditor.gui.crafting.eventHelper.shouldUploadBlock(origin.blocks[blockKey]); // && (origin.blocks[blockKey].x !== -1)
};

/**
 * Updates the links on the origin (a frame) to match those of the remote
 * @param {Frame} origin - the frame you want to update
 * @param {Object.<{string: Link}>} remoteLinks - set of links mapped by their uuid
 */
realityEditor.network.utilities.syncLinksWithRemote = function(origin, remoteLinks) {
    // delete old links
    for (var linkKey in origin.links) {
        if (!origin.links.hasOwnProperty(linkKey)) continue;
        delete origin.links[linkKey];
    }

    // add missing links (update existing links too)
    for (linkKey in remoteLinks) {
        if (!remoteLinks.hasOwnProperty(linkKey)) continue;
        
        origin.links[linkKey] = new BlockLink();
        for (var key in remoteLinks[linkKey]){
            origin.links[linkKey][key] = remoteLinks[linkKey][key];
        }
    }
};

/**
 * Returns a simplified json object with the persistent data that gets posted into a frame's iframe.
 * Avoids serializing cyclic data structures by only including minimal information needed for node iframe.
 * (keys such as grid and links sometimes contain cyclic references)
 * @param {Object.<{string: Node}>} nodes
 * @return {Object.<{string: Node}>}
 */
realityEditor.network.utilities.getNodesJsonForIframes = function(nodes) {
    var simpleNodes = {};
    var keysToExclude = ["links", "blocks", "grid", "guiState"];
    for (var node in nodes) {
        if (!nodes.hasOwnProperty(node)) continue;
        simpleNodes[node] = {};
        for (var key in nodes[node]) {
            if (!nodes[node].hasOwnProperty(key)) continue;
            if (keysToExclude.indexOf(key) === -1) {
                simpleNodes[node][key] = nodes[node][key];
            }
        }
    }
    return simpleNodes;
};

// Check if an object with this name exists on the server
realityEditor.network.utilities.verifyObjectNameNotOnWorldServer = function(serverWorldObject, objectName, onDoesntExist, onExists) {
    let downloadUrl = realityEditor.network.getURL(serverWorldObject.ip, realityEditor.network.getPort(serverWorldObject), '/object/' + objectName);
    realityEditor.network.getData(null, null, null, downloadUrl, (objectKey, _frameKey, _nodeKey, msg) => {
        if (msg) {
            onExists(msg);
        } else {
            onDoesntExist();
        }
    });
}
