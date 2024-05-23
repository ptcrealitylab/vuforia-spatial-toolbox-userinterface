import { ContextSource } from './ContextSource.js';
import * as THREE from '../../thirdPartyCode/three/three.module.js';

export class InteractionLogSource extends ContextSource {
    constructor() {
        super('InteractionLog');
        this.eventLog = [];
        this.setupSystemEventListeners();
    }

    /**
     * The one required function to override from ContextSource superclass
     */
    getContext() {
        return this.eventLog;
    }

    // TODO: subscribe to more events
    setupSystemEventListeners() {
        // map.setupEventListeners();
        realityEditor.gui.pocket.registerCallback('frameAdded', (params) => {
            let avatarId = realityEditor.avatar.getAvatarObjectKeyFromSessionId(globalStates.tempUuid);
            this.onFrameAdded(params, avatarId);
        });
        realityEditor.network.registerCallback('frameAdded', (params) => {
            this.onFrameAdded(params, params.additionalInfo.avatarName);
        });
        // todo Steve: add tool reposition event triggering for the user who added the tool themselves
        realityEditor.network.registerCallback('frameRepositioned', (params) => {
            // NOTE: this doesn't actually trigger in the current implementation
            this.onFrameRepositioned(params, params.additionalInfo.avatarName);
        });
        realityEditor.device.registerCallback('vehicleDeleted', (params) => {
            let avatarId = realityEditor.avatar.getAvatarObjectKeyFromSessionId(globalStates.tempUuid);
            this.onFrameDeleted(params, avatarId);
        });
        realityEditor.network.registerCallback('vehicleDeleted', (params) => {
            this.onFrameDeleted(params, params.additionalInfo.avatarName);
        });
        // realityEditor.envelopeManager.onEnvelopeOpened((params) => {
        //
        // });
        // realityEditor.envelopeManager.onEnvelopeClosed((params) => {
        //
        // });
        // realityEditor.envelopeManager.onEnvelopeFocused((params) => {
        //
        // });
        // realityEditor.envelopeManager.onEnvelopeBlurred((params) => {
        //
        // });
    }

    onFrameAdded(params, avatarId = 'Anonymous id') {
        let objectId = params.objectKey;
        let frameId = params.frameKey;
        let frameType = params.frameType;
        let frame = realityEditor.getFrame(objectId, frameId);

        let m = frame.ar.matrix;
        let position = new THREE.Vector3(m[12], m[13], m[14]);
        let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
        let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
        inverseGroundPlaneMatrix.invert();
        position.applyMatrix4(inverseGroundPlaneMatrix);

        // TODO: apply mapping in between chat interface and POST /query to server
        let timestamp = this.getFormattedTime();
        let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
        let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
        let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
        realityEditor.ai.mapping.addToMap(avatarId, avatarName, avatarScrambledId);
        realityEditor.ai.mapping.addToMap(frameId, frameType, frameScrambledId);
        // let newInfo = `User ${avatarScrambledId} added a ${frameScrambledId} tool at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;

        let newInfo = `The user ${avatarId} added a ${frameType} tool (ID: ${frameId}) at ${timestamp} at ${this.getPositionRoundedString(position)}.`;
        console.log(newInfo);
        // let newInfo = `${avatarId} added ${frameId} at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        // let newInfo = `The user ${avatarName} id:${avatarId} added a tool ${frameType} id:${frameId} at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        // aiPrompt += `\n${newInfo}`;

        this.eventLog.push(newInfo);
    }

    onFrameRepositioned(params, avatarId = 'Anonymous id') {
        let objectId = params.objectKey;
        let frameId = params.frameKey;
        let frameType = params.additionalInfo.frameType;
        let frame = realityEditor.getFrame(objectId, frameId);

        let m = frame.ar.matrix;
        let position = new THREE.Vector3(m[12], m[13], m[14]);
        let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
        let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
        inverseGroundPlaneMatrix.invert();
        position.applyMatrix4(inverseGroundPlaneMatrix);

        let timestamp = this.getFormattedTime();
        let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
        let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
        let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
        realityEditor.ai.mapping.addToMap(avatarId, avatarName, avatarScrambledId);
        realityEditor.ai.mapping.addToMap(frameId, frameType, frameScrambledId);
        // let newInfo = `User ${avatarScrambledId} repositioned a ${frameScrambledId} tool at ${timestamp} to (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        let newInfo = `The user ${avatarId} repositioned a ${frameType} tool (ID: ${frameId}) at ${timestamp} to ${this.getPositionRoundedString(position)}.`;

        // let newInfo = `The user ${avatarName} id:${avatarId} repositioned a tool ${frameType} id:${frameId} at ${timestamp} to (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        // aiPrompt += `\n${newInfo}`;

        this.eventLog.push(newInfo);
    }

    onFrameDeleted(params, avatarId = 'Anonymous id') {
        if (!params.objectKey || !params.frameKey || params.nodeKey) { // only send message about frames, not nodes
            return;
        }

        let frameId = params.frameKey;
        let frameType = params.additionalInfo.frameType;

        let timestamp = this.getFormattedTime();
        let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
        let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
        let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
        realityEditor.ai.mapping.addToMap(avatarId, avatarName, avatarScrambledId);
        realityEditor.ai.mapping.addToMap(frameId, frameType, frameScrambledId);
        // let newInfo = `User ${avatarScrambledId} deleted a ${frameScrambledId} tool at ${timestamp}`;
        // let newInfo = `The user ${avatarName} id:${avatarId} deleted a tool ${frameType} id:${frameId} at ${timestamp}.`;
        // aiPrompt += `\n${newInfo}`;

        let newInfo = `The user ${avatarId} deleted a ${frameType} tool (ID: ${frameId}) at ${timestamp}.`;

        this.eventLog.push(newInfo);
    }

    getPositionRoundedString(position) {
        let x = Math.round(position.x);
        let y = Math.round(position.y);
        let z = Math.round(position.z);
        return `(${x},${y},${z})`;
    }

    getFormattedTime() {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
}
