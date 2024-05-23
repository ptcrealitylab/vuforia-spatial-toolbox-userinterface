import { ContextSource } from './ContextSource.js';

export class ChatHistorySource extends ContextSource {
    constructor() {
        super('ChatHistory');

        this.history = [];
    }

    addToHistory(role, content) {
        console.log(`added message { role: ${role}, content: ${content} } to chat history`);
        this.history.push({ role, content });
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
