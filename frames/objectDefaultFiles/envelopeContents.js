(function(exports) {

    /* eslint no-inner-declarations: "off" */
    // makes sure this only gets loaded once per iframe
    if (typeof exports.EnvelopeContents !== 'undefined') {
        return;
    }

    /**
     * @constructor
     */
    function EnvelopeContents(realityInterface) {
        this.realityInterface = realityInterface;
        this.envelopeId = null;
        
        // this.isOrdered = false;
        // this.orderIndex = -1;
        // this.totalNumberOfFramesInEnvelope = 1;
        
        /**
         * Callbacks for various events from contained frames or the reality editor
         * @type {{onFrameAdded: null, onFrameDeleted: null, onMessageFromFrame: null, onOpen: null, onClose: null}}
         */
        this.callbacks = {
            /**
             * Triggered when a the frame's order changes for any reason
             */
            onOrderUpdated: [],
            /**
             * Triggered when another contained frame sends a message to this one (e.g. "stepCompleted")
             */
            onMessageFromFrame: [],
            /**
             * Triggered when the envelope frame sends a message directly to this one
             */
            onMessageFromEnvelope: []
        };

        /**
         * Triggers all callbacks functions when the iframe receives an 'envelopeMessage' POST message from the parent window.
         * It is the responsibility of each callback function to filter out messages that aren't directed to it.
         */
        window.addEventListener('message', function (msg) {
            let msgContent = JSON.parse(msg.data);
            if (typeof msgContent.envelopeMessage === 'undefined') {
                return;
            }
            for (let callbackKey in this.callbacks) {
                if (this.callbacks[callbackKey]) { // only trigger for callbacks that have been set
                    this.callbacks[callbackKey].forEach(function(addedCallback) {
                        addedCallback(msgContent.envelopeMessage)
                    });
                }
            }
        }.bind(this));

        this.onMessageFromEnvelope(function(messageFromEnvelope) {
            if (!this.envelopeId) {
                this.envelopeId = messageFromEnvelope.sourceFrame; // received first message from an envelope. you now belong to that one.
            }
        }.bind(this));
        
        // // this keeps the list of contained frames and the ordering up-to-date
        // this.onOrderUpdated(function(orderUpdatedMessage) {
        //     this.orderIndex = orderUpdatedMessage.index;
        //     this.totalNumberOfFramesInEnvelope = orderUpdatedMessage.total;
        // }.bind(this));
    }

    //
    // Methods to subscribe to events from contained frames or from the reality editor 
    //

    EnvelopeContents.prototype.onMessageFromFrame = function(callback) {
        this.addCallback('onMessageFromFrame', callback);
    };

    EnvelopeContents.prototype.onMessageFromEnvelope = function(callback) {
        // this.addCallback('onMessageFromEnvelope', callback);
        this.addCallback('onMessageFromEnvelope', function(messageFromEnvelope) {
            if (!this.envelopeId || this.envelopeId === messageFromEnvelope.sourceFrame) {
                callback(messageFromEnvelope); // pre-filter out messages from different envelopes
            }
        });
    };
    
    EnvelopeContents.prototype.onOrderUpdated = function(callback) {
        this.addCallback('onOrderUpdated', callback);
    };

    /**
     * Helper function to correctly add a callback function
     * @param {string} callbackName - should match one of the keys in this.callbacks
     * @param {function} callbackFunction
     */
    EnvelopeContents.prototype.addCallback = function(callbackName, callbackFunction) {
        if (typeof this.callbacks[callbackName] === 'undefined') {
            console.warn('Creating a new envelope callback that wasn\'t defined in the constructor');
            this.callbacks[callbackName] = [];
        }

        this.callbacks[callbackName].push(function(envelopeMessage) {
            if (typeof envelopeMessage[callbackName] === 'undefined') { return; }
            callbackFunction(envelopeMessage[callbackName]);
        });
    };

    exports.EnvelopeContents = EnvelopeContents;
    
})(window);


