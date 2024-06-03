import { ContextSource } from './ContextSource.js';

export class ChatHistorySource extends ContextSource {
    constructor() {
        super('ChatHistory');

        this.history = [];
    }

    addToHistory(role, content, functionCall) {
        console.log(`added message { role: ${role}, content: ${content} } to chat history`);
        if (functionCall && typeof functionCall.fnName === 'string' && typeof functionCall.fnArgs !== 'undefined') {
            let message = { role, content };
            message['function'] = functionCall.fnName;
            message['args'] = functionCall.fnArgs;
            this.history.push(message);
            // {"role": "system", "content": "call_function", "function": "get_weather", "args": {"location": "New York"}}
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
