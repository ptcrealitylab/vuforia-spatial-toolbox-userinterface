import { credentials } from './APIKeys.js';

export class NetworkInterface {
    constructor() {
        this.postAiApiKeys(credentials.gpt4o.endPoint, credentials.gpt4o.apiKey, true).then(res => {
            console.log(`AI API Keys posted: ${res}`);
        }).catch(err => {
            console.warn(`Error posting AI API keys: ${err}`);
        });
    }

    postAiApiKeys(endpoint, azureApiKey, isInit = false) {
        return new Promise(async (resolve, reject) => {
            if (!endpoint || !azureApiKey) {
                reject(`Can't post API keys because endpoint or API key is invalid: ${endpoint}, ${azureApiKey}`);
            }

            let worldId = await this.findWorldId();
            let ip = worldId.ip;
            let port = realityEditor.network.getPort(worldId);
            let route = '/ai/init';

            realityEditor.network.postData(realityEditor.network.getURL(ip, port, route),
                {
                    endpoint: endpoint,
                    azureApiKey: azureApiKey,
                },
                function (err, res) {
                    if (err) {
                        console.warn();
                        reject(`/ai/init error: ${err}`);
                    } else {
                        if (res.answer === 'success') {
                            // change ai search text area to the actual search text area
                            console.log('ai init success');
                            realityEditor.ai.hideEndpointApiKeyAndShowSearchTextArea();
                            if (isInit) {
                                // todo Steve: broadcast this message to all avatars, and have them spin up their own Azure GPT-3.5 with the same API keys
                                //  subsequently triggered avatars' postAiApiKeys have isInit set to false, thus not triggering infinite loop of calling other avatars to trigger the same function
                                //  still need to consider the edge case where 2 avatars submit the same req at the same time, what's gon happen? Are they gon trigger an infinite loop of this function call?
                                //  ALSO NEED TO CONSIDER: if someone in the session already logged in with ai, people who joined later how do they know how to join?

                                // todo Steve: currently, one edge case: when a user later join the session, before subscribing all the avatars & get the ai api keys,
                                //  they input another ai api key. This way, even later users might get either api keys, maybe activating 2 different kinds of azure gpt instances
                                //  solution: need to store this info in the session storage, and once set, don't update it. This way later user will get this info faster, and cannot modify it
                                // console.log(`Broadcast endpoint and apikey to other avatars: ${endpoint}, ${azureApiKey}`);
                                realityEditor.avatar.network.sendAiApiKeys(realityEditor.avatar.getMyAvatarNodeInfo(), {
                                    endpoint: endpoint,
                                    azureApiKey: azureApiKey,
                                });
                            }
                            resolve('success');
                        } else {
                            reject(`Endpoint didn't successfully init AI API keys: ${endpoint}, ${azureApiKey}: ${res.answer}`);
                        }
                    }
                });
        });
    }

    async postFunctionResultToAI(functionCallId, functionResult) {
        let route = '/ai/continue-query';

        let worldId = realityEditor.worldObjects.getBestWorldObject();
        let ip = worldId.ip;
        let port = realityEditor.network.getPort(worldId);

        return new Promise((resolve, reject) => {

            realityEditor.network.postData(realityEditor.network.getURL(ip, port, route),
                { functionCallId, result: functionResult },
                function (err, res) {
                    // console.log(res);
                    if (err) {
                        console.warn('ai/continue-query error:', err);
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });

        });
    }

    // helper function to return the world ID once it's initialized
    findWorldId() {
        return new Promise((resolve) => {
            let worldId = undefined;
            let intervalId = setInterval(() => {
                worldId = realityEditor.worldObjects.getBestWorldObject();
                if (worldId !== undefined) {
                    clearInterval(intervalId);
                    resolve(worldId);
                }
            }, 100)
        });
    }
}
