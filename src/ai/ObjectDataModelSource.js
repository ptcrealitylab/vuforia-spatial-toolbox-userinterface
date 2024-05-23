import { ContextSource } from './ContextSource.js';

export class ObjectDataModelSource extends ContextSource {
    constructor() {
        super('ObjectDataModel');
    }

    getContext() {
        let dataModel = {
            objects: {}
        };

        realityEditor.forEachFrameInAllObjects((objectKey, frameKey) => {
            let object = realityEditor.getObject(objectKey);
            if (realityEditor.avatar.utils.isAvatarObject(object)) return; // skip avatar objects in this summary
            let frame = realityEditor.getFrame(objectKey, frameKey);
            if (typeof dataModel.objects[objectKey] === 'undefined') {
                // let objectSceneNode = realityEditor.sceneGraph.getSceneNodeById(objectKey);
                let objectWorldPosition = realityEditor.sceneGraph.getWorldPosition(objectKey);
                objectWorldPosition.x = Math.round(objectWorldPosition.x);
                objectWorldPosition.y = Math.round(objectWorldPosition.y);
                objectWorldPosition.z = Math.round(objectWorldPosition.z);
                dataModel.objects[objectKey] = {
                    // objectId: objectKey,
                    objectType: object.type,
                    worldPosition: objectWorldPosition,
                    // worldMatrix: objectSceneNode.worldMatrix.map(elt => {
                    //     return parseFloat(elt.toFixed(2));
                    // }),
                    // localMatrix: objectSceneNode.localMatrix,
                    childApplications: {}
                };

                let objectScrambledId = realityEditor.ai.crc.generateChecksum(objectKey);
                // map.addToMap(avatarId, avatarName, avatarScrambledId);
                realityEditor.ai.mapping.addToMap(objectKey, object.name, objectScrambledId);
            }
            if (typeof dataModel.objects[objectKey].childApplications[frameKey] === 'undefined') {
                // let frameSceneNode = realityEditor.sceneGraph.getSceneNodeById(frameKey);
                let frameWorldPosition = realityEditor.sceneGraph.getWorldPosition(frameKey);
                frameWorldPosition.x = Math.round(frameWorldPosition.x);
                frameWorldPosition.y = Math.round(frameWorldPosition.y);
                frameWorldPosition.z = Math.round(frameWorldPosition.z);
                dataModel.objects[objectKey].childApplications[frameKey] = {
                    // applicationId: frame.uuid,
                    applicationType: frame.src,
                    worldPosition: frameWorldPosition,
                    // worldMatrix: frameSceneNode.worldMatrix.map(elt => {
                    //     return parseFloat(elt.toFixed(2));
                    // }),
                    // localMatrix: frameSceneNode.localMatrix,
                }

                // let timestamp = getFormattedTime();
                // let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
                // let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
                let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameKey);
                // map.addToMap(avatarId, avatarName, avatarScrambledId);
                realityEditor.ai.mapping.addToMap(frameKey, frame.src, frameScrambledId);
            }
        });

        return dataModel;
    }
}
