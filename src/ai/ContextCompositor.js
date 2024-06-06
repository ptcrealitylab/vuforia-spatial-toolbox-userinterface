/**
 * @class ContextCompositor
 * Keeps track of all the relevant context for the AI system, by adding ContextSources to it.
 * Calling getContext on the compositor returns the aggregated context of all its sources.
 */
export class ContextCompositor {
    constructor() {
        this.sources = [];
    }

    /**
     * Adds a source to be tracked and included in context when the user makes a query
     * @param {ContextSource} contextSource
     */
    addSource(contextSource) {
        this.sources.push(contextSource);
    }

    /**
     * Gives the complete set of current contexts when the user makes a query
     * @return {Object.<string, Object>}
     */
    getContext() {
        let context = {};
        this.sources.forEach(source => {
            context[source.id] = source.getContext();
        });
        return context;
    }
}
