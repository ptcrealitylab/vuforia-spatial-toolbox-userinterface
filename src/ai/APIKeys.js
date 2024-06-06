/**
 * @fileOverview - DON'T COMMIT THESE KEYS TO GIT.
 * These keys make the system work when working on localhost.
 * When connected via the cloud proxy, the keys are provided on the backend.
 */

/**
 * OpenAI credentials
 * @type {Readonly<{gpt4andOlder: {endPoint: string, apiKey: string}, gpt4o: {endPoint: string, apiKey: string}}>}
 */
export const credentials = Object.freeze({
    gpt4o: {
        endPoint: '',
        apiKey: ''
    },
    gpt4andOlder: {
        endPoint: '',
        apiKey: ''
    }
});
