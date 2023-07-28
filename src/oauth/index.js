createNameSpace("realityEditor.oauth");

import { loadToken } from './tokens.js';

(function(exports) {
    function getToolboxEdgeBasePath() {
        const windowPath = window.location.pathname;
        return windowPath.split('/').slice(0,6).join('/'); // => /stable/n/networkId/s/networkSecret
    }
    
    function initService() {
        realityEditor.network.addPostMessageHandler('getOAuthToken', (msgData) => {
            const { frame, authorizationUrl, clientId } = msgData;
            const object = Object.values(realityEditor.objects).find(obj => {
                return Object.keys(obj.frames).includes(frame);
            });
            // The edge server that will handle the processing of the auth code to receive an auth token
            const edgeServer = window.location.origin.includes('toolboxedge') ? window.location.origin + getToolboxEdgeBasePath() : `http://${object.ip}:${object.port}`;

            let frameName = realityEditor.getFrame(object.objectId,frame).src;
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
