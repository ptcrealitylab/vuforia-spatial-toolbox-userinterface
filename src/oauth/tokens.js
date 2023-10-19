const isCloud = location => {
    try {
        location = new URL(location);
    } catch (e) {
        console.error(`Passed a non-fully-formed URL to isCloud: ${location}`);
        return false;
    }
    return !location.port || location.port === "443";
}

const isLocalServer = location => {
    return location.port === "49368";
}

/**
 * Transforms deepLink=newScan URLs into a join URL, makes no changes to deepLink=joinScan URLs
 * @return {string}
 */
const getLocalJoinUrl = () => {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.set('deepLink', 'joinScan');
    queryParams.set('toolboxWorldId', realityEditor.sceneGraph.getWorldId());
    return `${window.location.origin}${window.location.pathname}?${queryParams.toString()}`;
}

function storeNetworkIdAndSecret() {
    const windowPath = window.location.pathname;
    const pathFragments = windowPath.split('/'); // => '', 'stable', 'n', 'networkId', 's', 'networkSecret', ''
    const networkId = pathFragments[3];
    const networkSecret = pathFragments[5];
    localStorage.setItem('networkId', networkId);
    localStorage.setItem('networkSecret', networkSecret);
}

export function loadToken(frameName, authorizationUrl, clientId, edgeServer) {
    const key = `token-${frameName}`
    const token = JSON.parse(localStorage.getItem(key));

    if (!token) {
        const nonce = generateNonce();
        let state = JSON.stringify({
            // For knowing which server to use for OAuth requests
            edgeServer: edgeServer,
            // For redirecting back to toolbox after server gets token, special case for local server redirect on new scan page to prevent being redirected to the new scan page
            toolboxUrl: isLocalServer(window.location) ? getLocalJoinUrl() : window.location.href,
            // For associating received token with tool
            frameName: frameName
        });
        // OAuth state parameter is specifically for nonces, NOT application state
        localStorage.setItem('activeOAuthNonce', nonce);
        localStorage.setItem('activeOAuthState', state);
        
        let redirectUri = window.location.origin;
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === '::1') {
            redirectUri = `${window.location.protocol}//localhost:${window.location.port}`;
        }
        let path = isCloud(redirectUri) ? '/stable/oauth/redirect' : '/src/oauth/redirect.html'
        
        if (isCloud(redirectUri)) {
            storeNetworkIdAndSecret(); // Needed in order for /stable/oauth/redirect to return us to the right metaverse
        }

        // Redirect URI has to be the same origin to share localStorage state
        window.location = `${authorizationUrl}?response_type=code&redirect_uri=${redirectUri}${path}&client_id=${encodeURIComponent(clientId)}&state=${nonce}`
        // Returns a dummy promise since we will be navigating away from the page
        return Promise.reject();
    } else {
        return new Promise((resolve, reject) => {
            const data = {
                'frameName': frameName,
                'refresh_token': token.refresh_token,
            }
            const serverUrl = `${edgeServer}/oauthRefresh`;
            fetch(serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams(data)
            }).then(response => {
                return response.json();
            }).then(data => {
                if (data.error) {
                    reject(data);
                    return;
                }
                saveToken(data, frameName, authorizationUrl);
                resolve(data.access_token);
            }).catch(error => {
                reject(error);
            });
        })
    }
}

export function saveToken(data, frameName) {
    const { access_token, refresh_token, expires_in } = data;
    const key = `token-${frameName}`;
    localStorage.setItem(key, JSON.stringify({
        access_token: access_token,
        refresh_token: refresh_token,
        expires_in: expires_in,
        expires_time: Date.now() + expires_in * 1000
    }));
}

function generateNonce() {
    let nonce = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        nonce += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return nonce;
}
