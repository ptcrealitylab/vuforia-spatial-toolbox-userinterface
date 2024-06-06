import { ContextSource } from './ContextSource.js';

/**
 * @class ChatHistorySource
 * This stores the history of messages (user messages, assistant responses, and system function call messages)
 * so that they can be provided as context to the ChatInterface.
 * @todo: still needs some way to limit the max number of tokens sent as context
 */
export class ChatHistorySource extends ContextSource {
    constructor() {
        super('ChatHistory');

        this.history = [];

        // TODO: implement something like this.
        //  But not too short, or a complex sequence of function calls might get cropped out too soon.
        // this.PAST_MESSAGES_INCLUDED = 20;
    }

    addToHistory(role, content, functionCall) {
        console.log(`added message { role: ${role}, content: ${content} } to chat history`);
        if (functionCall && typeof functionCall.fnName === 'string' && typeof functionCall.fnArgs !== 'undefined') {
            // These messages should be stored like:
            // {"role": "system", "content": "call_function", "function": "get_weather", "args": {"location": "New York"}}
            let message = { role, content };
            message['function'] = functionCall.fnName;
            message['args'] = functionCall.fnArgs;
            this.history.push(message);
        } else {
            this.history.push( { role, content });
        }
    }

    resetHistory() {
        this.history = [];
    }

    getContext() {
        // TODO: limit this to a maximum number of previous messages
        //   or even better, use some compression or relevance algorithm to filter
        return this.history;
    }

}
