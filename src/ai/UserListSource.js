import { ContextSource } from './ContextSource.js';

/**
 * @class UserListSource
 * Provides the list of connected users (avatars) to the ContextCompositor, as well as extra information about
 * the avatar corresponding to this user's client. Currently just provides name and cursor position.
 * @todo: provide more info, like join time, viewer position, following state, isPointerActive, etc.
 */
export class UserListSource extends ContextSource {
    constructor() {
        super('UserList');
    }

    getContext() {
        let connectedUsers = [];
        realityEditor.forEachObject((object, _objectId) => {
            try {
                if (realityEditor.avatar.utils.isAvatarObject(object)) {
                    // avatarObjects.push(object);
                    let avatarNodePath = realityEditor.avatar.utils.getAvatarNodeInfo(object);
                    let node = realityEditor.getNode(avatarNodePath.objectKey, avatarNodePath.frameKey, avatarNodePath.nodeKey);
                    console.log(node);
                    let userProfile = node.publicData.userProfile;
                    let cursorState = node.publicData.cursorState;
                    connectedUsers.push({
                        name: userProfile.name || 'Anonymous User',
                        spatialCursorPosition: [
                            Math.round(cursorState.matrix.elements[12]),
                            Math.round(cursorState.matrix.elements[13]),
                            Math.round(cursorState.matrix.elements[14])]
                    });
                }
            } catch (e) {
                console.log('error getting username of connected user', object)
            }
        });
        return {
            myUser: this.getMyUser(),
            allConnectedUsers: connectedUsers
        };
    }

    getMyUser() {
        let myAvatarId = realityEditor.avatar.getMyAvatarId();
        let myAvatarObject = realityEditor.getObject(myAvatarId);
        if (!myAvatarObject) return null;
        let avatarNodePath = realityEditor.avatar.utils.getAvatarNodeInfo(myAvatarObject);
        let node = realityEditor.getNode(avatarNodePath.objectKey, avatarNodePath.frameKey, avatarNodePath.nodeKey);
        let userProfile = node.publicData.userProfile;
        let cursorState = node.publicData.cursorState;
        // return realityEditor.avatar.utils.getAvatarName();
        return {
            name: userProfile.name || 'Anonymous User',
            spatialCursorPosition: [
                Math.round(cursorState.matrix.elements[12]),
                Math.round(cursorState.matrix.elements[13]),
                Math.round(cursorState.matrix.elements[14])]
        };
    }
}
