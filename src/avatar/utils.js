createNameSpace("realityEditor.avatar.utils");

/**
 * @fileOverview realityEditor.avatar.utils
 * Miscellaneous helper functions for avatars
 */

(function(exports) {
    exports.AVATAR_ID_PREFIX = '_AVATAR_';
    exports.TOOL_NAME = 'Avatar'; // these need to match the way the server intializes the tool and node
    exports.NODE_NAME = 'storage';
    exports.PUBLIC_DATA_KEYS = {
        touchState: 'touchState',
        userProfile: 'userProfile'
    };

    // other modules in the project can use this to reliably check whether an object is an avatar
    exports.isAvatarObject = function(object) {
        if (!object) { return false; }
        return object.type === 'avatar' || object.objectId.indexOf('_AVATAR_') === 0;
    }

    // returns a random but consistent color for a provided avatar object's editorId
    exports.getColor = function(avatarObject) {
        if (!this.isAvatarObject(avatarObject)) { return null; }
        let editorId = avatarObject.objectId.split('_AVATAR_')[1].split('_')[0];
        let id = Math.abs(this.hashCode(editorId));
        return `hsl(${(id % Math.PI) * 360 / Math.PI}, 100%, 50%)`;
    }
    
    exports.getColorLighter = function(avatarObject) {
        let defaultColor = this.getColor(avatarObject);
        if (defaultColor) {
            return defaultColor.replace('50%', '70%'); // increase the HSL lightness to 70%
        }
        return null;
    }

    // helper function to generate an integer hash from a string (https://stackoverflow.com/a/15710692)
    exports.hashCode = function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    }

    // helper function returns first and last capitalized initials from name (https://stackoverflow.com/a/63763497)
    exports.getInitialsFromName = function(name) {
        if (!name) { return null; }
        return name.match(/(\b\S)?/g).join("").match(/(^\S|\S$)?/g).join("").toUpperCase();
    }

    // helper to calculate if the matrices are identical by returning a simple sum of how different they are
    exports.sumOfElementDifferences = function(M1, M2) {
        // assumes M1 and M2 are of equal length
        let sum = 0;
        for (let i = 0; i < M1.length; i++) {
            sum += Math.abs(M1[i] - M2[i]);
        }
        return sum;
    }

    // generates a unique id for this avatar, based on this client's editorId (aka. tempUuid)
    exports.getAvatarName = function() {
        // TODO: we may need to use different criteria in the future to categorize devices, although this is only to help with debugging for now
        const deviceSuffix = realityEditor.device.environment.variables.supportsAreaTargetCapture ? '_iOS' : '_desktop';
        return this.AVATAR_ID_PREFIX + globalStates.tempUuid + deviceSuffix;
    }

    // returns the {objectKey, frameKey, nodeKey} address of the avatar storeData node on this avatar object
    exports.getAvatarNodeInfo = function (avatarObject) {
        if (!avatarObject) { return null; }

        let avatarObjectKey = avatarObject.objectId;
        let avatarFrameKey = Object.keys(avatarObject.frames).find(name => name.includes(this.TOOL_NAME));
        let myAvatarTool = realityEditor.getFrame(avatarObjectKey, avatarFrameKey);
        if (!myAvatarTool) { return null; }

        let avatarNodeKey = Object.keys(myAvatarTool.nodes).find(name => name.includes(this.NODE_NAME));
        if (!avatarNodeKey) { return null; }

        return {
            objectKey: avatarObjectKey,
            frameKey: avatarFrameKey,
            nodeKey: avatarNodeKey
        }
    }

    // sort the list of connected avatars. currently moves yourself to the front.
    // in future could also sort by join time or recent activity
    exports.sortAvatarList = function(connectedAvatars) {
        let keys = Object.keys(connectedAvatars);
        let first = this.getAvatarName(); // move yourself to the font of the list
        keys.sort(function(x,y){ return x.includes(first) ? -1 : y.includes(first) ? 1 : 0; });
        return keys;
    }

}(realityEditor.avatar.utils));
