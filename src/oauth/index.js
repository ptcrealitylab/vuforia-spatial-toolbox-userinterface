createNameSpace("realityEditor.oauth");

import { loadToken } from './tokens.js';

(function(exports) {
    function initService() {
        realityEditor.network.addPostMessageHandler('getOAuthToken', (msgData) => {
            const { frame, authorizationUrl, clientId } = msgData;
            const object = Object.values(realityEditor.objects).find(obj => {
                return Object.keys(obj.frames).includes(frame);
            });
            // The edge server that will handle the processing of the auth code to receive an auth token
            const edgeServer = `http://${object.ip}:${object.port}`; // TODO: more resilient way to do this, not sure if toolbox edge allows connecting via ip:port

            let frameName = frame;
            realityEditor.forEachFrameInAllObjects((objectKey, frameKey) => { // TODO: make postMessages automatically pass the originating frame to callbacks, make things cleaner here
                if (frameKey === frame) {
                    frameName = realityEditor.getFrame(objectKey,frameKey).src;
                }
            });
            loadToken(frameName, authorizationUrl, clientId, edgeServer).then(token => {
                realityEditor.network.postMessageIntoFrame(frame, {
                    onOAuthToken: {
                        token: token,
                        error: null
                    }
                });
            }).catch(error => {
                realityEditor.network.postMessageIntoFrame(frame, {
                    onOAuthToken: {
                        token: null,
                        error: error
                    }
                });
            });
        });
    }
    exports.initService = initService;
}(realityEditor.oauth));

export const initService = realityEditor.oauth.initService;
