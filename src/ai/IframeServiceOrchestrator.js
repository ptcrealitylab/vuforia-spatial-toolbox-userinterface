import { uuidTime } from '../utilities/uuid.js';

export class IframeAPIOrchestrator {
    constructor() {
        this.apiRegistry = {}; // stores the index of all known APIs per frame type and id
        this.responsePromises = {}; // keep track of pending promises
        this.container = null; // debug UI container for triggering registered APIs

        // for communication with other modules (not related to iframe communication)
        this.callbacks = {
            onSpatialReferenceUpdated: []
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
            }
        });
    }

    onSpatialReferenceUpdated(cb) {
        this.callbacks.onSpatialReferenceUpdated.push(cb);
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
    
    processApiAnswer(apiAnswer) {
        let jsonObjects = this.extractJsonObjects(apiAnswer);
        console.log(jsonObjects);
        
        this.processApiMatches(jsonObjects);
        
        // jsonObjects.forEach(apiRequest => {
        //    
        // });
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

    extractJsonObjects(inputString) {
        // Find all braces and attempt to parse the contents between them
        let braceStack = [];
        let potentialJsonBlocks = [];
        let lastChar = '';

        // Scan each character and keep track of positions of braces
        for (let i = 0; i < inputString.length; i++) {
            let char = inputString[i];
            if (char === '{' && lastChar !== '\\') {
                braceStack.push(i);
            } else if (char === '}' && lastChar !== '\\' && braceStack.length > 0) {
                let start = braceStack.pop();
                let block = inputString.substring(start, i + 1);
                try {
                    let parsedJson = JSON.parse(block);
                    potentialJsonBlocks.push(parsedJson);
                } catch (error) {
                    // If parsing fails, do not add to results
                    console.error("Parsing failed at block: ", block);
                }
            }
            lastChar = char;
        }

        return potentialJsonBlocks;
    }

// // Example usage with a known complex JSON embedded in text
//     const inputString = `Here is some text before the JSON {
//     "applicationId": "_WORLD_instantScanyU16ciu1_09rj746ig2lspatialDraw1g23rb16hifvh",
//     "apiName": "addLine",
//     "arguments": [
//         {
//             "startPoint": [0, 0, 0],
//             "endPoint": [1, 2, 3],
//             "color": "blue"
//         }
//     ]
// } and here is some text after it.`;
//     const results = extractJsonObjects(inputString);
//     console.log(results);


    // extractJsonObjects(inputString) {
    //     // Regex pattern to loosely match what could be JSON objects or arrays
    //     const pattern = /(\{[\s\S]*?\}|\[[\s\S]*?\])/g;
    //
    //     // Initialize an array to hold all valid JSON objects
    //     let jsonObjects = [];
    //
    //     // Use the regex to find matches and iterate over them
    //     let match;
    //     while ((match = pattern.exec(inputString)) !== null) {
    //         try {
    //             // Parse each matched string as a JSON object
    //             const parsedObject = JSON.parse(match[0]);
    //             // Check if the parsed object is what we are interested in
    //             if (Array.isArray(parsedObject) || (parsedObject.hasOwnProperty('applicationId') && parsedObject.hasOwnProperty('apiName') && parsedObject.hasOwnProperty('parameterInfo'))) {
    //                 jsonObjects.push(parsedObject);
    //             }
    //         } catch (error) {
    //             console.error("Failed to parse JSON: ", error);
    //         }
    //     }
    //
    //     // Return the array of JSON objects
    //     return jsonObjects;
    // }

    // extractJsonObjects(inputString) {
    //     // Regex pattern to match the JSON objects with specific keys
    //     const pattern = /{[\s\n]*"applicationId"\s*:\s*"([^"]+)"\s*,[\s\n]*"apiName"\s*:\s*"([^"]+)"\s*,[\s\n]*"arguments"\s*:\s*\[\s*(.*?)\s*\][\s\n]*}/g;
    //
    //     // Initialize an array to hold all valid JSON objects
    //     let jsonObjects = [];
    //
    //     // Use the regex to find matches and iterate over them
    //     let match;
    //     while ((match = pattern.exec(inputString)) !== null) {
    //         try {
    //             // Parse each matched string as a JSON object
    //             const jsonObject = JSON.parse(match[0]);
    //             jsonObjects.push(jsonObject);
    //         } catch (error) {
    //             console.error("Failed to parse JSON: ", error);
    //         }
    //     }
    //
    //     // Return the array of JSON objects
    //     return jsonObjects;
    // }

    // // Example usage:
    //     const inputString = 'Some non-JSON text { "applicationId": "_WORLD_instantScanyU16ciu1_09rj746ig2lspatialDraw1Dxbmvs3q4gji", "apiName": "clearCanvas", "parameterInfo": [] } more text';
    //     const results = extractJsonObjects(inputString);
    //     console.log(results);

    processApiMatches(matches) {
        // matches is a list like:
        // {
        //     applicationId: match[1],
        //         apiName: match[2]
        // }
        
        matches.forEach(match => {
            Object.keys(this.apiRegistry).forEach(applicationName => {
                let appRegistry = this.apiRegistry[applicationName];
                let matchingApplicationId = Object.keys(appRegistry).find(frameId => {
                    return frameId === match.applicationId || frameId.includes(match.applicationId);
                });
                if (matchingApplicationId && typeof appRegistry[matchingApplicationId] !== 'undefined') {
                    if (typeof appRegistry[matchingApplicationId][match.apiName] !== 'undefined') {
                        console.log(`found matching API on application ID: ${matchingApplicationId}: ${match.apiName}`);
                        this.triggerAPI(applicationName, matchingApplicationId, match.apiName, appRegistry[matchingApplicationId][match.apiName].parameterInfo, match.arguments).then(res => {
                            console.log(res);
                        }).catch(err => {
                            console.warn(err);
                        }).finally(() => {
                            console.log('API invocation is done.');
                        });
                    }
                }
            });
        });
    }

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
