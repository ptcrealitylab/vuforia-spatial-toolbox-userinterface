createNameSpace("realityEditor.avatar.utils");

(function(exports) {
    const idPrefix = '_AVATAR_';
    exports.TOOL_NAME = 'Avatar'; // these need to match the way the server intializes the tool and node
    exports.NODE_NAME = 'storage';
    exports.PUBLIC_DATA_KEYS = {
        touchState: 'touchState',
        username: 'username'
    };

    exports.isAvatarObject = function(object) {
        return object.type === 'avatar' || object.objectId.indexOf('_AVATAR_') === 0;
    }
    
    exports.getColor = function(avatarObject) {
        let editorId = avatarObject.objectId.split('_AVATAR_')[1].split('_')[0];
        let id = Math.abs(this.hashCode(editorId));
        return `hsl(${(id % Math.PI) * 360 / Math.PI}, 100%, 50%)`;
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
    
    exports.sumOfElementDifferences = function(M1, M2) {
        // assumes M1 and M2 are of equal length
        let sum = 0;
        for (let i = 0; i < M1.length; i++) {
            sum += Math.abs(M1[i] - M2[i]);
        }
        return sum;
    }
    
    exports.getAvatarName = function() {
        const deviceSuffix = realityEditor.device.environment.variables.supportsAreaTargetCapture ? '_iOS' : '_desktop';
        return idPrefix + globalStates.tempUuid + deviceSuffix;
    }

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

}(realityEditor.avatar.utils));
