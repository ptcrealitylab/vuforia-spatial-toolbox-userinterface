import { uuidTime } from '../utilities/uuid.js';

/**
 * @class IframeAPIOrchestrator
 * Manages a bidirectional flow of post messages to keep track of the tool iframe's SpatialApplicationAPIs.
 * Is able to listen for API declarations from iframes, and compile them into an index known as the `apiRegistry`.
 * The apiRegistry can be provided to GPT APIs to specify a set of functions that can be called by the AI system.
 *
 * Since this class is already monitoring the post messages coming from iframes, it is also given the task of listening
 * for LanguageInterface messages (such as state summaries and spatial reference lists), but it does not process these
 * itself; rather, these messages trigger events that other modules (e.g. the ChatInterface) can react to.
 * 
 * @todo: there is a problem: if multiple of the same tool type exist (e.g. two spatialDraw tools), it just picks one of
 *   the tools at random to perform the function call. Ideally the function signature would include the tool ID.
 */
export class IframeAPIOrchestrator {
    constructor() {
        this.apiRegistry = {}; // stores the index of all known APIs per frame type and id
        this.responsePromises = {}; // keep track of pending promises
        this.container = null; // debug UI container for triggering registered APIs

        // for communication with other modules (not related to iframe communication)
        this.callbacks = {
            onSpatialReferenceUpdated: [],
            onSummarizedStateUpdated: [],
            onAiProcessingStateUpdated: [],
            onAiProcessingPromptsUpdated: [],
        };

        // this creates uuids for specific things that can be operated on by the ai interface
        this.specialCaseHandlers = {};

        this.listenForAPIDefinitions();

        realityEditor.device.registerCallback('vehicleDeleted', this.onVehicleDeleted.bind(this));
        realityEditor.network.registerCallback('vehicleDeleted', this.onVehicleDeleted.bind(this));

        this.updateUI();
    }

    listenForAPIDefinitions() {
        window.addEventListener('message', (event) => {
            if (event.data.type === 'API_DEFINITION') {
                console.log('got API_DEFINITION message');
                this.registerAPI(event.data.objectId, event.data.applicationId, event.data.applicationName, event.data.apiDefinitions);

            } else if (event.data.type === 'API_RESPONSE') {
                // handleAPIResponse(event.data);
                if (this.responsePromises[event.data.callId]) {
                    this.responsePromises[event.data.callId].resolve(event.data.result);
                    delete this.responsePromises[event.data.callId]; // Clean up after resolving
                }

            } else if (event.data.type === 'UPDATE_SPATIAL_REFERENCES') {
                // also track the mapping of uuids -> positions that can be used by SpatialUUIDMapper
                this.callbacks.onSpatialReferenceUpdated.forEach(cb => {
                    cb(event.data);
                });
            } else if (event.data.type === 'UPDATE_SUMMARIZED_STATE') {
                this.callbacks.onSummarizedStateUpdated.forEach(cb => {
                    cb(event.data);
                });
            } else if (event.data.type === 'UPDATE_AI_PROCESSING_STATE') {
                this.callbacks.onAiProcessingStateUpdated.forEach(cb => {
                    cb(event.data);
                });
            } else if (event.data.type === 'UPDATE_AI_PROCESSING_PROMPTS') {
                this.callbacks.onAiProcessingPromptsUpdated.forEach(cb => {
                    cb(event.data);
                });
            }
        });
    }

    onSpatialReferenceUpdated(cb) {
        this.callbacks.onSpatialReferenceUpdated.push(cb);
    }

    onSummarizedStateUpdated(cb) {
        this.callbacks.onSummarizedStateUpdated.push(cb);
    }

    onAiProcessingPromptsUpdated(cb) {
        this.callbacks.onAiProcessingPromptsUpdated.push(cb);
    }

    onAiProcessingStateUpdated(cb) {
        this.callbacks.onAiProcessingStateUpdated.push(cb);
    }

    registerAPI(objectId, applicationId, applicationName, apiDefinitions) {
        if (!this.apiRegistry[applicationName]) {
            this.apiRegistry[applicationName] = {};
        }
        if (!this.apiRegistry[applicationName][applicationId]) {
            this.apiRegistry[applicationName][applicationId] = {};
        }
        apiDefinitions.forEach(({name, parameterInfo, returnInfo}) => {
            // console.log(`registering API: ${name} for ${applicationName}-${applicationId}`, parameterInfo, returnInfo);
            this.apiRegistry[applicationName][applicationId][name] = {
                call: async (parameters) => {
                    let callId = uuidTime();

                    return new Promise((resolve, reject) => {
                        this.responsePromises[callId] = { resolve, reject }; // store the promise executors by uuid in a map
                        // console.log(`posting into ${applicationName}-${applicationId}:${name}`);
                        let iframeElt = document.getElementById('iframe' + applicationId);
                        if (!iframeElt) return;
                        iframeElt.contentWindow.postMessage({
                            type: 'API_CALL',
                            applicationName,
                            applicationId,
                            name,
                            parameters,
                            callId: callId
                        }, '*');
                    });

                },
                parameterInfo,
                returnInfo,
                applicationId,
                objectId
            };

            // let timestamp = getFormattedTime();
            // let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
            // let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
            // let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
            // map.addToMap(avatarId, avatarName, avatarScrambledId);
            // map.addToMap(frameId, frameType, frameScrambledId);
        });
        this.updateUI();
    }

    async triggerAPI(applicationName, applicationId, apiName, parameterInfo, apiArguments) {
        console.log(parameterInfo);
        const parameters = parameterInfo.map(param => {

            // match structure 1
            let matchingArgument = apiArguments.find(thisArg => {
                return thisArg && typeof thisArg[param.name] !== 'undefined'; // thisArgName === param.name;
            });
            if (matchingArgument) {
                return matchingArgument[param.name];
            }

            // match structure 2
            matchingArgument = apiArguments.find(thisArg => {
                return thisArg && thisArg.name === param.name; // thisArgName === param.name;
            });
            if (matchingArgument && typeof matchingArgument.value !== 'undefined') {
                return matchingArgument.value;
            }

            return prompt(`Enter value for ${param.name} (${param.type}):`);
        });

        try {
            let apiHandler = this.apiRegistry[applicationName][applicationId][apiName];
            const result = await apiHandler.call(parameters);
            return result;
        } catch (error) {
            console.warn('API call failed:', error);
        }
    }

    async processFunctionCall(functionName, functionArgs) {
        return new Promise((resolve, reject) => {

            // iterate over all applicationName/applicationId pairs within the registry to find the first one that contains a matching functionName
            let matchingTool = null;
            Object.keys(this.apiRegistry).forEach(applicationName => {
                let appRegistry = this.apiRegistry[applicationName];
                Object.keys(appRegistry).forEach(applicationId => {
                    let applicationAPIs = appRegistry[applicationId];
                    if (typeof applicationAPIs[functionName] !== 'undefined' && !matchingTool) {
                        matchingTool = {
                            name: applicationName,
                            id: applicationId
                        };
                    }
                });
            });

            if (matchingTool) {
                console.log(`found matching API on application ID: ${matchingTool.id}: ${functionName}`);
                let apiInfo = this.apiRegistry[matchingTool.name][matchingTool.id][functionName];
                this.triggerFunctionCall(matchingTool.name, matchingTool.id, functionName, apiInfo.parameterInfo, functionArgs).then(res => {
                    if (typeof this.specialCaseHandlers[functionName] !== 'undefined') {
                        this.specialCaseHandlers[functionName].forEach(handler => {
                            handler(res, matchingTool.name, matchingTool.id, apiInfo.parameterInfo, functionArgs);
                        });
                    }
                    console.log(res);
                    resolve({
                        result: res,
                        applicationId: matchingTool.id
                    });
                }).catch(err => {
                    console.warn(err);
                    reject(err);
                }).finally(() => {
                    console.log('API invocation is done.');
                });
            } else {
                console.warn('found no matching tool for this API... what should we do now?');
                reject('found no matching tool for this API... what should we do now?');
            }
        });
    }

    async triggerFunctionCall(applicationName, applicationId, apiName, parameterInfo, apiArguments) {
        console.log(parameterInfo);
        const parameters = parameterInfo.map(param => {
            return apiArguments[param.name];
            // // match structure 1
            // let matchingArgument = apiArguments.find(thisArg => {
            //     return thisArg && typeof thisArg[param.name] !== 'undefined'; // thisArgName === param.name;
            // });
            // if (matchingArgument) {
            //     return matchingArgument[param.name];
            // }
            //
            // // match structure 2
            // matchingArgument = apiArguments.find(thisArg => {
            //     return thisArg && thisArg.name === param.name; // thisArgName === param.name;
            // });
            // if (matchingArgument && typeof matchingArgument.value !== 'undefined') {
            //     return matchingArgument.value;
            // }
            //
            // return prompt(`Enter value for ${param.name} (${param.type}):`);
        });

        try {
            let apiHandler = this.apiRegistry[applicationName][applicationId][apiName];
            const result = await apiHandler.call(parameters);
            return result;
        } catch (error) {
            console.warn('API call failed:', error);
        }
    }

    // NOTE: this UI is purely for debugging purposes, especially for earlier versions of the system.
    // To enable the UI, find #temp-ui-container in index.css and remove its `visibility: hidden;`
    updateUI() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'temp-ui-container';
            document.body.appendChild(this.container);
        }

        this.container.innerHTML = ''; // Clear existing UI

        let titleDiv = document.createElement('div');
        titleDiv.innerText = 'API List (Debugger)';


        Object.keys(this.apiRegistry).forEach(applicationName => {
            Object.keys(this.apiRegistry[applicationName]).forEach(applicationId => {
                const apis = this.apiRegistry[applicationName][applicationId];
                Object.keys(apis).forEach(apiName => {
                    const api = apis[apiName];

                    let objectId = api.objectId;
                    let shortAppId = applicationId.replace(objectId, '');

                    // Create a div to group the label and button
                    const apiGroup = document.createElement('div');
                    apiGroup.style.marginBottom = '10px';

                    // Create and setup the label
                    const apiLabel = document.createElement('label');
                    apiLabel.textContent = `API: ${apiName} (App ID: ${shortAppId})`;
                    apiLabel.style.marginRight = '10px';

                    // Create and setup the button
                    const apiButton = document.createElement('button');
                    apiButton.textContent = `Call ${apiName}`;
                    apiButton.onclick = async () => {
                        const result = await this.triggerAPI(applicationName, applicationId, apiName, api.parameterInfo);
                        console.log(`Result from ${apiName}: ${result}`);
                    };

                    // Append label and button to the group div
                    apiGroup.appendChild(apiLabel);
                    apiGroup.appendChild(apiButton);

                    // Append the group div to the container
                    this.container.appendChild(apiGroup);
                });
            });
        });
    }

    onVehicleDeleted(params) {
        if (params.objectKey && params.frameKey && !params.nodeKey) { // only send message about frames, not nodes
            Object.keys(this.apiRegistry).forEach(applicationName => {
                Object.keys(this.apiRegistry[applicationName]).forEach(applicationId => {
                    if (applicationId === params.frameKey) {
                        delete this.apiRegistry[applicationName][applicationId];
                        if (Object.keys(this.apiRegistry[applicationName]).length === 0) {
                            delete this.apiRegistry[applicationName];
                        }
                    }
                });
            });
        }
        this.updateUI();
    }

    getSpatialServiceRegistry() {
        return JSON.parse(JSON.stringify(this.apiRegistry)); // return a deep copy to omit the function handler and prevent tampering
    }

    handleSpecialCase(apiName, handler) {
        if (typeof this.specialCaseHandlers[apiName] === 'undefined') {
            this.specialCaseHandlers[apiName] = [];
        }
        this.specialCaseHandlers[apiName].push(handler);
    }
}
