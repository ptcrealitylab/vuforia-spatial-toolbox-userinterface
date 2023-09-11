import { saveToken } from "./tokens.js";

window.onload = () => {
    const parameters = new URLSearchParams(window.location.search);
    // Success: ?code=<code>&state=<state>
    // Error: ?error=<error_code>&state=<state>
    const code = parameters.get('code');
    const error = parameters.get('error');
    const nonce = parameters.get('state');
    if (localStorage.getItem('activeOAuthNonce') !== nonce) {
        // TODO: error handling
        console.log(`${localStorage.getItem('activeOAuthNonce')} does not match ${nonce}`);
        localStorage.removeItem('activeOAuthNonce');
        localStorage.removeItem('activeOAuthState');
        return;
    }
    const state = JSON.parse(localStorage.getItem('activeOAuthState'));
    localStorage.removeItem('activeOAuthNonce');
    localStorage.removeItem('activeOAuthState');
    if (code) {
        const data = {
            'code': code,
            'redirect_uri': window.location.origin + window.location.pathname,
            'client_id': state.clientId,
            'client_secret': state.clientSecret
        }
        const serverUrl = `${state.edgeServer}/oauthAcquire`;
        fetch(`${serverUrl}/${state.accessTokenUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(data)
        }).then(response => {
            return response.json();
        }).then(data => {
            saveToken(data, state.frame, state.authorizationUrl);
            window.location = state.toolboxUrl;
        }).catch(error => {
            console.error(error);
        });
    } else {
        // TODO: error handling
        document.querySelector('h1').innerText = `SERVER ERROR`;
        console.error(error);
    }
}
