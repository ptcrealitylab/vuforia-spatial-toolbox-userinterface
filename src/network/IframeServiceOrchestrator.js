import { uuidTime } from '../utilities/uuid.js';

export class IframeAPIOrchestrator {
    constructor() {
        this.apiRegistry = {}; // stores the index of all known APIs per frame type and id
        this.responsePromises = {}; // keep track of pending promises
        this.container = null; // debug UI container for triggering registered APIs

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
            }
        });
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
        });
        this.updateUI();
    }

    async triggerAPI(applicationName, applicationId, apiName, parameterInfo) {
        const parameters = parameterInfo.map(param => {
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

    updateUI() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'temp-ui-container';
            document.body.appendChild(this.container);
        }

        this.container.innerHTML = ''; // Clear existing UI
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
}
