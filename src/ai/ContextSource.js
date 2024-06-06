/**
 * @class ContextSource
 * Generalized class that anything that wishes to provide context to the AI system can instantiate.
 * The `getContext` function must be implemented by subclasses; it will be called when the compositor asks for context.
 */
export class ContextSource {
    constructor(id) {
        this.id = id;
    }

    /**
     * Returns an object of the current context that should be provided to the AI interface from this source
     * @return {{}}
     */
    getContext() {
        throw new Error('Subclass should override ContextSource.getContext');
    }
}
