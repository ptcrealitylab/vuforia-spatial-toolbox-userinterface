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
 * Modified by Benjamin Reynolds 2016, 2017
 * Modified by James Hobin 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Created by benreynolds on 2/7/17.
 */

createNameSpace("realityEditor.device.security");

/**
 * @fileOverview realityEditor.device.security.js
 * A collection of functions around user authentication and permissions.
 * A user can authenticate using a password and fingerprint, and then "lock" sets of nodes
 * and links to prevent unauthorized modifications.
 * @todo the security features are not currently fully supported anymore
 */

realityEditor.device.security.initService = function() {

    realityEditor.gui.buttons.registerCallbackForButton('lock', function(params) {
        if (params.newButtonState === 'up') {
            console.log("activate lock button");
            var LOCK_TYPE_FULL = "full";
            this.lockVisibleNodesAndLinks(LOCK_TYPE_FULL);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('halflock', function(params) {
        if (params.newButtonState === 'up') {
            console.log("activate halflock button");
            var LOCK_TYPE_HALF = "half";
            this.lockVisibleNodesAndLinks(LOCK_TYPE_HALF);
        }
    }.bind(this));

    realityEditor.gui.buttons.registerCallbackForButton('unlock', function(params) {
        if (params.newButtonState === 'up') {
            console.log("activate unlock button");
            this.unlockVisibleNodesAndLinks();
        }
    }.bind(this));
    
};

/**
 * Triggered by native iOS code when a fingerprint is presented, starting a locking session if successful. 
 * @param encryptedId
 */
realityEditor.device.security.authenticateSessionForUser = function(encryptedId) {
    console.log("js did run");
    console.log("authenticating with userId: " + encryptedId);
    if (encryptedId === null) {
        console.log("authentication failed");
        
        
        //if (document.getElementById("adminModeSwitch").checked) {
        //    document.getElementById("adminModeSwitch").click(); //.checked = false; // TODO: how to do this in new settings menu?       
        //}
        //realityEditor.gui.settings.setSettings("lockingState", false);
        //document.getElementById("settingsIframe").contentWindow.postMessage(JSON.stringify({getSettings: {lockingToggle: false}}), "*");

        globalStates.lockingMode = false;
        globalStates.lockPassword = null;
        
        // updates the settings iframe graphics to match the new lockingMode and lockPassword
        document.getElementById("settingsIframe").contentWindow.postMessage(JSON.stringify({getSettings: {
            extendedTracking: globalStates.extendedTracking,
            editingMode: globalStates.editingMode,
            clearSkyState: globalStates.clearSkyState,
            instantState: globalStates.instantState,
            speechState: globalStates.speechState,
            videoRecordingEnabled: globalStates.videoRecordingEnabled,
            matrixBroadcastEnabled: globalStates.matrixBroadcastEnabled,
            hololensModeEnabled: globalStates.hololensModeEnabled,
            groupingEnabled: globalStates.groupingEnabled,
            externalState: globalStates.externalState,
            discoveryState: globalStates.discoveryState,
            settingsButton : globalStates.settingsButtonState,
            lockingMode: globalStates.lockingMode,
            lockPassword: globalStates.lockPassword
        }
        }), "*");
        
        //globalStates.authenticatedUser = null;
        
    } else {
        console.log("authentication success");
        globalStates.lockingMode = true;
        //globalStates.authenticatedUser = encryptedId;
        console.log("Is locking mode on now? " + globalStates.lockingMode + " ...and lockPassword = " + globalStates.lockPassword);
    }
};

/**
 * @typedef {string} LockType
 * "full" = LOCK_TYPE_FULL
 *          prevents any modifications by anyone until unlocked with the same password
 * "half" = LOCK_TYPE_HALF
 *          allows all modifications but claims the node using the current password so
 *          that no one else can lock it until it is fully unlocked with the current password
 */

/**
 * Enables a lock with the current session password on all the unlocked nodes and links on currently visible objects
 * @param {LockType} lockType
 */
realityEditor.device.security.lockVisibleNodesAndLinks = function(lockType) {
    var visibleNodes = realityEditor.gui.ar.getVisibleNodes();
    console.log("visibleNodes = ", visibleNodes);

    visibleNodes.forEach( function(keys) {
        var content = {
            lockPassword: globalStates.lockPassword,
            lockType: lockType
        };
        realityEditor.network.postNewLockToNode(objects[keys.objectKey].ip, keys.objectKey, keys.frameKey, keys.nodeKey, content);
    });

    var visibleLinks = realityEditor.gui.ar.getVisibleLinks(visibleNodes);
    console.log("visibleLinks = ", visibleLinks);

    visibleLinks.forEach( function(keys) {
        var content = {
            lockPassword: globalStates.lockPassword,
            lockType: lockType
        };
        realityEditor.network.postNewLockToLink(objects[keys.objectKey].ip, keys.objectKey, keys.frameKey, keys.linkKey, content);
    });
};

/**
 * Removes a lock from all nodes and links on currently visible objects, if the lock password of that node matches the current session password.
 */
realityEditor.device.security.unlockVisibleNodesAndLinks = function() {
    var visibleNodes = realityEditor.gui.ar.getVisibleNodes();
    console.log("visibleNodes = ", visibleNodes);

    visibleNodes.forEach( function(keys) {
        realityEditor.network.deleteLockFromNode(objects[keys.objectKey].ip, keys.objectKey, keys.frameKey, keys.nodeKey, globalStates.lockPassword);
    });

    var visibleLinks = realityEditor.gui.ar.getVisibleLinks(visibleNodes);
    console.log("visibleLinks = ", visibleLinks);

    visibleLinks.forEach( function(keys) {
        realityEditor.network.deleteLockFromLink(objects[keys.objectKey].ip, keys.objectKey, keys.frameKey, keys.linkKey, globalStates.lockPassword);
    });
};

/**
 * @typedef {string} ActionType
 * "edit"
 * "create"
 * "lock"
 * "unlock"
 */

/**
 * Checks if the specified actionType is allowed on the specified node by checking how it is locked.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} nodeKey
 * @param {ActionType} actionType
 * @return {boolean}
 */
realityEditor.device.security.isNodeActionAllowed = function(objectKey, frameKey, nodeKey, actionType) {
    var node = realityEditor.getNode(objectKey, frameKey, nodeKey);
    
    // TODO: this shouldn't actually be necessary - why are we trying to perform an action on a node that doesn't exist?
    if (!node) {
        return false;
    }

    var lockPassword = node.lockPassword;
    var lockType = node.lockType;
    var isLocked = !!lockPassword && !!lockType;
    
    if (!isLocked) return true; // if the node isn't locked, of course this action is allowed
    
    if (lockType === "half" && !(actionType === "lock" || actionType === "unlock")) return true; // a half locked node can be modified but not un/locked unless correct password

    if ((lockPassword === globalStates.lockPassword) && (actionType === "lock" || actionType === "unlock")) return true; // if the user owns the lock, they can lock or unlock it
    
    return false; // otherwise nothing is allowed
};

// TODO: do we need separate methods for link and node, or are they equivalent?
/**
 * Checks if the specified actionType is allowed on the specified link by checking how it is locked.
 * @param {string} objectKey
 * @param {string} frameKey
 * @param {string} linkKey
 * @param {ActionType} actionType
 * @return {boolean}
 */
realityEditor.device.security.isLinkActionAllowed = function(objectKey, frameKey, linkKey, actionType) {
    var link = realityEditor.getLink(objectKey, frameKey, linkKey);
    var lockPassword = link.lockPassword;
    var lockType = link.lockType;
    var isLocked = !!lockPassword && !!lockType;
    
    if (!isLocked) return true; // if the link isn't locked, of couse this action is allowed

    if (lockType === "half" && !(actionType === "lock" || actionType === "unlock")) return true; // a half locked node can be modified but not un/locked unless correct password

    if ((lockPassword === globalStates.lockPassword) && (actionType === "lock" || actionType === "unlock")) return true; // if the user owns the lock, they can lock or unlock it 

    return false; // otherwise nothing is allowed
};

/**
 * Temporary method that can be called from the console to unlock all objects, in case they get locked by an inaccessible device
 * @todo auto-disable function if not in debug mode - shouldn't be possible to do in production
 */
realityEditor.device.security.debugUnlockAll = function() {
    for (var objectKey in objects) {
        for (var frameKey in objects[objectKey].frames) {
            var thisframe = realityEditor.getFrame(objectKey, frameKey);
            if (!thisframe) continue;

            // unlock all nodes
            for (var nodeKey in thisframe.nodes) {
                if (!thisframe.nodes.hasOwnProperty(nodeKey)) continue;

                realityEditor.network.deleteLockFromNode(objects[objectKey].ip, objectKey, frameKey, nodeKey, "DEBUG");
            }

            // unlock all links
            for (var linkKey in thisframe.links) {
                if (!thisframe.links.hasOwnProperty(linkKey)) continue;

                realityEditor.network.deleteLockFromLink(objects[objectKey].ip, objectKey, frameKey, linkKey, "DEBUG");
            }
        }
    }
};
