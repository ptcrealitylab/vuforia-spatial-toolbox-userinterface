import { ContextCompositor } from './ContextCompositor.js';
import { ObjectDataModelSource } from './ObjectDataModelSource.js';
import { UserListSource } from './UserListSource.js';
import { InteractionLogSource } from './InteractionLogSource.js';
import { ChatHistorySource } from './ChatHistorySource.js';
import { SpatialUUIDMapper } from './SpatialUUIDMapper.js';
import { IframeAPIOrchestrator } from './IframeServiceOrchestrator.js';
import { NetworkInterface } from './NetworkInterface.js';

/**
 * Sends user input and context to server.
 * Writes server responses to history.
 */
export class ChatInterface {
    constructor() {
        this.contextCompositor = new ContextCompositor();
        this.spatialUuidMapper = new SpatialUUIDMapper();
        this.networkInterface = new NetworkInterface();
        this.apiOrchestrator = new IframeAPIOrchestrator();
        this.setupSpecialFunctionCases();

        let objectDataModelSource = new ObjectDataModelSource();
        this.objectDataModelSource = objectDataModelSource;
        let userListSource = new UserListSource();
        let interactionLogSource = new InteractionLogSource();
        // let semanticSegmentationSource = new SemanticSegmentationSource();

        // TODO: call addToHistory on the ChatHistorySource when a message is sent/received
        this.chatHistorySource = new ChatHistorySource();

        this.contextCompositor.addSource(objectDataModelSource);
        this.contextCompositor.addSource(userListSource);
        this.contextCompositor.addSource(interactionLogSource);
        this.contextCompositor.addSource(this.chatHistorySource);
        // this.contextCompositor.addSource(semanticSegmentationSource);

        this.apiOrchestrator.onSpatialReferenceUpdated(data => {
            this.spatialUuidMapper.updateSpatialReference(data);
            objectDataModelSource.updateSpatialReference(data);
        });

        this.apiOrchestrator.onSummarizedStateUpdated(async (data) => {
            objectDataModelSource.updateSummarizedState(data);

            // if (result && !result.isIdenticalToExisting) {
            //     await this.runStateSummarizerPrompts(data.applicationId, result.state, result.prompts);
            // }

            // if (this.stateSummarizerPrompts[data.applicationId]) {
            //     // run the summary through the AI prompts to arrive at a final result
            //     this.stateSummarizerPrompts[data.applicationId].forEach((prompt) => {
            //
            //     });
            // }
        });

        this.apiOrchestrator.onAiProcessingStateUpdated(async (data) => {
            let result = objectDataModelSource.updateToolStateForAiProcessing(data);

            if (result && !result.isIdenticalToExisting) {
                await this.runStateSummarizerPrompts(data.applicationId, result.state, result.prompts);
            }

            // if (this.stateSummarizerPrompts[data.applicationId]) {
            //     // run the summary through the AI prompts to arrive at a final result
            //     this.stateSummarizerPrompts[data.applicationId].forEach((prompt) => {
            //
            //     });
            // }
        });

        this.apiOrchestrator.onAiProcessingPromptsUpdated(async (data) => {
            // let toolSpecificStateSummarizerPrompts = {};
            let result = objectDataModelSource.updateToolStateProcessingPrompts(data);

            if (result && !result.isIdenticalToExisting) {
                await this.runStateSummarizerPrompts(data.applicationId, result.state, result.prompts);
            }
        });
    }
    
    async runStateSummarizerPrompts(applicationId, applicationState, applicationPrompts) {
        if (!applicationId || !applicationState || !applicationPrompts) return;

        this.networkInterface.processToolStateWithPrompts(applicationId, applicationState, applicationPrompts).then(res => {
            console.log('ChatInterface got processedState from runStateSummarizerPrompts', res);
            // TODO: store this in object.json along with a checksum for the summarizedState, so it doesn't need to be recomputed needlessly
            this.objectDataModelSource.updateAiProcessedState(applicationId, applicationState, applicationPrompts, res.answer);
        }).catch(err => {
            console.warn('error in getting processedState from runStateSummarizerPrompts', err);
        })
        
        // toolPrompts.forEach(async (prompt) => {
        //    
        // });
        // if (this.stateSummarizerPrompts[data.applicationId]) {
        //     // run the summary through the AI prompts to arrive at a final result
        //     this.stateSummarizerPrompts[data.applicationId].forEach((prompt) => {
        //
        //     });
        // }
    }

    // TODO: implement saveContext and loadContext (into server or client) so that we know what happened before refresh
    // saveContext() {
    //     window.localStorage.setItem('chatContext', this.contextCompositor.getContext());
    //     // TODO: save it to the server instead
    // }
    //
    // loadContext() {
    //     let initialContext = window.localStorage.getItem('chatContext');
    //     // TODO: feed this context into each data source as a starting point...
    // }

    askQuestion(userInput) {
        let context = this.contextCompositor.getContext();
        let apiRegistry = this.apiOrchestrator.getSpatialServiceRegistry();
        console.log('current context = ', context);

        let route = '/ai/v2/query';  //'/ai/questionComplex';
        let worldId = realityEditor.worldObjects.getBestWorldObject();
        let ip = worldId.ip;
        let port = realityEditor.network.getPort(worldId);

        let preprocessedInput = this.spatialUuidMapper.preprocess(userInput, { replaceMapIDs: true, replaceMapNames: true });
        let preprocessedContext = this.spatialUuidMapper.preprocess(context);
        let preprocessedApiRegistry = this.spatialUuidMapper.preprocess(apiRegistry);

        let body = {
            userInput: preprocessedInput,
            context: preprocessedContext,
            apiRegistry: preprocessedApiRegistry
        };

        // adds the unprocessed userInput to the chat history
        this.chatHistorySource.addToHistory('user', userInput);

        // {
        //     mostRecentMessage: mostRecentMessage,
        //     pastMessages: pastMessages,
        //     interactionLog: interactionLog,
        //     toolAPIs: toolAPIs,
        //     connectedUsers: connectedUsers,
        //     myUser: myUser,
        //     simplifiedDataModel: simplifiedDataModel,
        //     extra: extra,
        // }

        // TODO: update the URL to match the old postQuestionToAI implementation if you want to use cloud proxy

        // TODO: refactor this into the NetworkInterface
        fetch(realityEditor.network.getURL(ip, port, route), {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            },
        }).then((res) => {
            return res.json();
        }).then(async (res) => {
            try {
                if (res.functionCallId) {
                    // TODO: we may need to postprocess the fnArgs to map them back from resilientUUIDs to IDs
                    await this.handleFunctionCall(res.functionCallId, res.fnName, res.fnArgs);
                } else {
                    // adds the unprocessed response to the chat history
                    this.chatHistorySource.addToHistory('assistant', res.answer);

                    let processedAnswer = this.postprocessAnswer(res.answer);

                    if (res.answer && processedAnswer) {
                        realityEditor.ai.displayAnswer(processedAnswer);
                    } else {
                        realityEditor.ar.displayAnswer('error');
                    }
                }
            } catch(err) {
                console.error(err);
            }
        });
    }

    postprocessAnswer(answer) {
        let threeMap = realityEditor.ai.mapping.getMap();
        let myRegex = new RegExp("\\b[a-zA-Z0-9]{5,6}\\b", 'g'); // check any 5-6 character word more closely for exact match
        // this function will be applied to any parts of the answer matching the regex
        const replaceFunction = (potentialUuid) => {
            let replacement = null;
            threeMap.scrambledIdToId.forEach((id, uuid) => {
                if (potentialUuid === uuid) {
                    let span = this.createSpatialHyperlinkSpan(id);
                    // Use a temporary container to convert the element to HTML string
                    const container = document.createElement('div');
                    container.appendChild(span);
                    // Extract the HTML string from the container
                    replacement = container.innerHTML;
                    // replacement = `<span class='ai-highlight' data-id=${id}>${threeMap.idToName.get(id)}</span>`
                }
            });
            if (replacement) return replacement;
            return potentialUuid;
        };

        return this.spatialUuidMapper.postprocess(answer, myRegex, replaceFunction);
    }

    createSpatialHyperlinkSpan(id) {
        let threeMap = realityEditor.ai.mapping.getMap();

        // Create a new span element
        const span = document.createElement('span');
        span.className = 'ai-highlight';
        span.setAttribute('data-id', id);

        // Set the text content of the span to the name associated with the ID
        const name = threeMap.idToName.get(id);
        if (name) {
            span.textContent = name;
        }

        return span;
    }

    setupSpecialFunctionCases() {
        this.apiOrchestrator.handleSpecialCase('getPartNamesAndPositions', (res, toolName, toolId, parameterInfo, functionArgs) => {
            // console.log('apiOrchestrator special case', res);

            // if (res && res.length) {
            //     res.forEach(part => {
            //         // let timestamp = getFormattedTime();
            //         let partId = makeSafeString(`${toolId}_part_${part.name}`);
            //         let partName = part.name;
            //         // let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
            //         // let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
            //         let partScrambledId = realityEditor.ai.crc.generateChecksum(partId);
            //         map.addToMap(partId, partName, partScrambledId);
            //         // map.addToMap(frameId, frameType, frameScrambledId);
            //         // let newInfo = `User ${avatarScrambledId} added a ${frameScrambledId} tool at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
            //         // console.log(newInfo);
            //
            //         partMap[partId] = {
            //             name: partName,
            //             position: {
            //                 x: part.x,
            //                 y: part.y,
            //                 z: part.z
            //             }
            //         };
            //     });
            // }
        });

        this.apiOrchestrator.handleSpecialCase('setPartPosition', (res, toolName, toolId, parameterInfo, functionArgs) => {
            // console.log('apiOrchestrator setPartPosition special case', res);

            // let partName = functionArgs.partName;
            // if (!partName || !res) return;
            // let partId = makeSafeString(`${toolId}_part_${partName}`);
            //
            // partMap[partId] = {
            //     name: partName,
            //     position: {
            //         x: res.x,
            //         y: res.y,
            //         z: res.z
            //     }
            // };
        });
    }

    // TODO: this needs some way to determine which spatial application the call belongs to
    async handleFunctionCall(functionCallId, fnName, fnArgs) {
        console.log('ChatInterface handleFunctionCall', functionCallId, fnName, fnArgs);

        this.chatHistorySource.addToHistory('system', 'call_function', {
            fnName,
            fnArgs
        });
        // {"role": "system", "content": "call_function", "function": "get_weather", "args": {"location": "New York"}}

        let processedFunctionArgs = this.spatialUuidMapper.postprocessFunctionArgs(fnArgs);

        // perform the function on the client side
        let { result, applicationId } = await this.apiOrchestrator.processFunctionCall(fnName, processedFunctionArgs);
        console.log('handleFunctionCall got result', result, applicationId);
        
        // first process the result and see if any strings match the names of any spatialReferenceMap
        let processedResult = result;
        if (result && typeof result === 'string' || typeof result === 'object') {
            
            // first map from reference uuids to full uuids (including the tool id)
            processedResult = this.spatialUuidMapper.preprocessFunctionResult(result, applicationId);
            console.log('processed function result', processedResult);
            
            // then map full uuids to scrambled uuids
            processedResult = this.spatialUuidMapper.preprocess(processedResult);
        }

        // Send the result back to the server
        let res = await this.networkInterface.postFunctionResultToAI(functionCallId, processedResult);
        console.log(res);

        // await fetch('/ai/function-result', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ functionCallId, result: functionResult })
        // });

        // Wait for the server to process the result and provide the final response
        // const res = await fetch(`/ai/query-status?functionCallId=${functionCallId}`);
        // let res = await realityEditor.network.queryAIStatus(functionCallId);

        // const res = await response.json();
        if (res.functionCallId) {
            await this.handleFunctionCall(res.functionCallId, res.fnName, res.fnArgs);
        } else {

            // adds the unprocessed response to the chat history
            this.chatHistorySource.addToHistory('assistant', res.answer);

            let processedAnswer = this.postprocessAnswer(res.answer);

            if (res.answer && processedAnswer) {
                realityEditor.ai.displayAnswer(processedAnswer);
            } else {
                realityEditor.ar.displayAnswer('error');
            }
        }
    }

    clearChatHistory() {
        this.chatHistorySource.resetHistory();
    }
}
