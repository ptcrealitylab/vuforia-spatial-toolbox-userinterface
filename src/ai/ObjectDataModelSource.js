import { ContextSource } from './ContextSource.js';
import { uuidTime } from '../utilities/uuid.js';

/**
 * @class ObjectDataModelSource
 * One of the largest ContextSources for the AI system. Builds a modified version of the object data model,
 * Which the AI system can think of as the `sceneHierarchy`. It is the tree of objects -> tools, with their locations.
 * Within each tool, it also adds as much context as possible from the IframeServiceOrchestrator, including:
 * - the summarizedStates - a selected (developer-specified) description of the contents of the tool
 * - the spatialReferences - a list of uuid<>name<>position references within the tool, that can appear as hyperlinks
 * - the aiStateSummaries - a gen-AI description of the contents of the tool (if state and prompts are specified)
 */
export class ObjectDataModelSource extends ContextSource {
    constructor() {
        super('ObjectDataModel');
        
        this.spatialReferences = {};
        this.summarizedStates = {};
        this.statesForSummarizerPrompts = {};
        this.stateSummarizerPrompts = {};
        this.aiStateSummaries = {};
    }

    updateSpatialReference(data) {
        if (typeof data.spatialReferences === 'undefined') return;
        if (typeof data.applicationId === 'undefined') return;

        // this.spatialReferences[data.applicationId] = data.spatialReferences;
        this.spatialReferences[data.applicationId] = {};

        Object.keys(data.spatialReferences).forEach(referenceUuid => {
            let fullUuid = `${data.applicationId}_${referenceUuid}`;
            this.spatialReferences[data.applicationId][fullUuid] = data.spatialReferences[referenceUuid].position;
        });
    }

    updateSummarizedState(data) {
        if (typeof data.summarizedState === 'undefined') return null;
        if (typeof data.applicationId === 'undefined') return null;

        this.summarizedStates[data.applicationId] = data.summarizedState;
    }

    updateToolStateForAiProcessing(data) {
        if (typeof data.state === 'undefined') return null;
        if (typeof data.applicationId === 'undefined') return null;

        this.statesForSummarizerPrompts[data.applicationId] = data.state;

        let isIdenticalToExisting = this.checkStateAndPrompts(data.applicationId, this.statesForSummarizerPrompts[data.applicationId], this.stateSummarizerPrompts[data.applicationId]);

        return {
            state: this.statesForSummarizerPrompts[data.applicationId],
            prompts: this.stateSummarizerPrompts[data.applicationId],
            isIdenticalToExisting,
        };
    }

    updateToolStateProcessingPrompts(data) {
        if (typeof data.prompts === 'undefined') return;
        if (typeof data.applicationId === 'undefined') return;
        
        this.stateSummarizerPrompts[data.applicationId] = data.prompts;

        let isIdenticalToExisting = this.checkStateAndPrompts(data.applicationId, this.summarizedStates[data.applicationId], this.stateSummarizerPrompts[data.applicationId]);

        return {
            state: this.statesForSummarizerPrompts[data.applicationId],
            prompts: this.stateSummarizerPrompts[data.applicationId],
            isIdenticalToExisting,
        };
    }

    checkStateAndPrompts(applicationId, state, prompts) {
        // skip redundant calls
        let isIdenticalToExisting = false;
        let existingProcessedSummary = this.aiStateSummaries[applicationId];
        if (existingProcessedSummary) {
            let newStateChecksum = uuidTime(); // TODO: generate a real checksum using state
            let newPromptChecksum = uuidTime(); // TODO: generate a real checksum using prompts
            isIdenticalToExisting = (newStateChecksum === existingProcessedSummary.stateChecksum &&
                newPromptChecksum === existingProcessedSummary.promptChecksum); // skip processing
        }
        return isIdenticalToExisting;
    }

    updateAiProcessedState(applicationId, state, prompts, aiStateSummaryResponse) {
        let stateChecksum = uuidTime(); // TODO: generate a real checksum
        let promptChecksum = uuidTime(); // TODO: generate a real checksum
        this.aiStateSummaries[applicationId] = {
            stateChecksum,
            promptChecksum,
            summary: aiStateSummaryResponse
        };
        console.log('aiStateSummaries', this.aiStateSummaries);
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

                // add additional information from the LanguageInterface, if provided
                if (this.summarizedStates[frameKey]) {
                    dataModel.objects[objectKey].childApplications[frameKey].stateSummary = this.summarizedStates[frameKey];
                }
                if (this.spatialReferences[frameKey]) {
                    dataModel.objects[objectKey].childApplications[frameKey].childSpatialReferences = this.spatialReferences[frameKey];
                }
                if (this.aiStateSummaries[frameKey]) {
                    dataModel.objects[objectKey].childApplications[frameKey].contentDescription = this.aiStateSummaries[frameKey].summary;
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
