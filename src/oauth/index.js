createNameSpace("realityEditor.oauth");

import { loadToken } from './tokens.js';

(function(exports) {
    function initService() {
        realityEditor.network.addPostMessageHandler('getOAuthToken', (msgData) => {
            const { frame, urls, clientId, clientSecret } = msgData;
            loadToken(frame, urls, clientId, clientSecret).then(token => {
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
