export function loadToken(frameName, authorizationUrl, clientId, edgeServer) {
    const key = `token-${frameName}`
    const token = JSON.parse(localStorage.getItem(key));

    if (!token) {
        const nonce = generateNonce();
        let state = JSON.stringify({
            edgeServer: edgeServer, // For knowing which server to use for OAuth requests
            toolboxUrl: window.location.href, // For redirecting back to toolbox after server gets token
            frameName: frameName // For associating received token with tool
        });
        // OAuth state parameter is specifically for nonces, NOT application state
        localStorage.setItem('activeOAuthNonce', nonce);
        localStorage.setItem('activeOAuthState', state);
        
        let redirectUri = window.location.origin;
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === '::1') {
            redirectUri = `${window.location.protocol}//localhost:${window.location.port}`;
        }

        // Redirect URI has to be the same origin to share localStorage state
        window.location = `${authorizationUrl}?response_type=code&redirect_uri=${redirectUri}/src/oauth/redirect.html&client_id=${encodeURIComponent(clientId)}&state=${nonce}`
        // Returns a dummy promise since we will be navigating away from the page
        return Promise.reject();
    } else {
        if (token.expires_time > Date.now()) {
            return Promise.resolve(token.access_token);
        }
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
