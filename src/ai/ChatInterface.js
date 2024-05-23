import { ContextCompositor } from './ContextCompositor.js';
import { ObjectDataModelSource } from './ObjectDataModelSource.js';
import { UserListSource } from './UserListSource.js';
import { InteractionLogSource } from './InteractionLogSource.js';
import { ChatHistorySource } from './ChatHistorySource.js';
import { SpatialUUIDMapper } from './SpatialUUIDMapper.js';

/**
 * Sends user input and context to server.
 * Writes server responses to history.
 */
export class ChatInterface {
    constructor() {
        this.contextCompositor = new ContextCompositor();
        this.spatialUuidMapper = new SpatialUUIDMapper();

        let objectDataModelSource = new ObjectDataModelSource();
        let userListSource = new UserListSource();
        let interactionLogSource = new InteractionLogSource();
        // let semanticSegmentationSource = new ContextSource();

        // TODO: call addToHistory on the ChatHistorySource when a message is sent/received
        let chatHistorySource = new ChatHistorySource();

        this.contextCompositor.addSource(objectDataModelSource);
        this.contextCompositor.addSource(userListSource);
        this.contextCompositor.addSource(interactionLogSource);
        this.contextCompositor.addSource(chatHistorySource);
    }

    askQuestion(userInput) {
        let context = this.contextCompositor.getContext();
        console.log('current userInput = ', userInput);
        console.log('current context = ', context);

        let route = '/ai/query';  //'/ai/questionComplex';
        let worldId = realityEditor.worldObjects.getBestWorldObject();
        let ip = worldId.ip;
        let port = realityEditor.network.getPort(worldId);

        let preprocessedInput = this.spatialUuidMapper.preprocess(userInput);
        let preprocessedContext = this.spatialUuidMapper.preprocess(context);

        let body = {
            userInput: preprocessedInput,
            context: preprocessedContext
        };

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

        fetch(realityEditor.network.getURL(ip, port, route), {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Content-Type': 'application/json'
            },
        }).then(async (res) => {
            try {
                if (res.functionCallId) {
                    // TODO: we may need to postprocess the fnArgs to map them back from resilientUUIDs to IDs
                    realityEditor.ai.handleFunctionCall(res.functionCallId, res.fnName, res.fnArgs);
                } else {
                    // console.log(res.answer, res.apiAnswer);
                    // realityEditor.ai.getAnswerComplex(res.answer, res.apiAnswer);

                    let threeMap = realityEditor.ai.mapping.getMap();
                    let myRegex = new RegExp("\\b[a-zA-Z0-9]{6}\\b", 'g');
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
                    let processedAnswer = this.spatialUuidMapper.postprocess(res.answer, myRegex, replaceFunction);
                    console.log(processedAnswer);

                    realityEditor.ai.displayAnswer(res.answer);
                }

                // let data = await res.json();
            } catch(err) {
                console.error(err);
            }
        });
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
}
