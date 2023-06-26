export function loadToken(frame, urls, clientId, clientSecret) {
    const key = `token-${frame}-${urls.authorizationUrl}`
    const token = JSON.parse(localStorage.getItem(key));
    const object = Object.values(realityEditor.objects).find(obj => {
        return Object.keys(obj.frames).includes(frame);
    });
    // The edge server that will handle the processing of the auth code to receive an auth token
    const edgeServer = `http://${object.ip}:${object.port}`; // TODO: more resilient way to do this, not sure if toolbox edge allows connecting via ip:port

    if (!token) {
        const nonce = generateNonce();
        let state = JSON.stringify({
            edgeServer: edgeServer,
            authorizationUrl: urls.authorizationUrl,
            accessTokenUrl: urls.accessTokenUrl,
            clientId: clientId,
            clientSecret: clientSecret,
            toolboxUrl: window.location.href,
            frame: frame
        });
        // OAuth state parameter is specifically for nonces, NOT application state
        localStorage.setItem('activeOAuthNonce', nonce);
        localStorage.setItem('activeOAuthState', state);
        
        let redirectUri = window.location.origin;
        if (window.location.hostname === '127.0.0.1' || window.location.hostname === '::1') {
            redirectUri = `${window.location.protocol}//localhost:${window.location.port}`;
        }

        // Redirect URI has to be the same origin to share localStorage state
        window.location = `${urls.authorizationUrl}?response_type=code&redirect_uri=${redirectUri}/src/oauth/redirect.html&client_id=${encodeURIComponent(clientId)}&state=${nonce}`
        // Returns a dummy promise since we will be navigating away from the page
        return Promise.reject();
    } else {
        if (token.expires_time > Date.now()) {
            return Promise.resolve(token.access_token);
        }
        return new Promise((resolve, reject) => {
            const data = {
                'refresh_token': token.refresh_token,
                'client_id': clientId,
                'client_secret': clientSecret
            }
            const serverUrl = `${edgeServer}/oauthRefresh`;
            fetch(`${serverUrl}/${urls.accessTokenUrl}`, {
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
                saveToken(data, frame, urls.authorizationUrl);
                resolve(data.access_token);
            }).catch(error => {
                reject(error);
            });
        })
    }
}

export function saveToken(data, frame, authorizationUrl) {
    const { access_token, refresh_token, expires_in } = data;
    const key = `token-${frame}-${authorizationUrl}`;
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
