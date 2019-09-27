(function(exports) {
    /**
     * @fileOverview
     * How to use:
     *
     * In a frame that you want to be able to be added to an envelope:
     *
     * 1. instantiate a new envelopeContents(...) object
          let envelopeContents = new EnvelopeContents(realityInterface, document.body);
     * 2. Use envelopeContents APIs like envelope.onOrderUpdated(), ...
     * 3. To send a message to the envelope this belongs to, use:
          envelopeContents.sendMessageToEnvelope({
            exampleMessageName: messageData
          });
     * 4. To listen for messages from the envelope it belongs to, use:
          envelopeContents.onMessageFromEnvelope(function(message) {
            if (typeof message.exampleMessageName !== 'undefined') { 
              // respond to message.exampleMessageName
            }
          });
     * 5. Note that it is the responsibility of the envelope to declare which frames it can contain, not the
     *    responsibility of the contained frame to declare which envelopes it can be added to.
     */

    /* eslint no-inner-declarations: "off" */
    // makes sure this only gets loaded once per iframe
    if (typeof exports.EnvelopeContents !== 'undefined') {
        return;
    }

    /**
     * @constructor
     * Defines an interface that declares this frame to be able to be added to envelope frames.
     * By doing so, it will automatically be added to compatible envelopes if they are open when it is created, and
     * if so, it will hide and show when that envelope is opened and closed. A number of events also become available.
     * 
     * @param {RealityInterface} realityInterface
     * @param {HTMLElement} rootElement
     */
    function EnvelopeContents(realityInterface, rootElement) {
        this.realityInterface = realityInterface;
        this.rootElement = rootElement; // the HTML element to show or hide when the envelope opens and closes
        this.envelopeId = null;
        
        /**
         * Callbacks for various events from contained frames or the reality editor
         * @type {{onOrderUpdated: Array, onMessageFromEnvelope: Array}}
         */
        this.callbacks = {
            /**
             * Triggered when a the frame's order changes for any reason
             */
            onOrderUpdated: [],
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

        /**
         * Listen for envelope messages using the Reality Interface frame messaging system
         */
        realityInterface.addFrameMessageListener(function(message) {
            if (typeof message.msgContent.envelopeMessage !== 'undefined') {
                
                if (!this.envelopeId) {
                    this.envelopeId = message.sourceFrame; // received first message from an envelope. you now belong to that one.
                }
                
                if (this.envelopeId !== message.sourceFrame) {
                    return; // pre-filter out messages from different envelopes
                }

                let envelopeMessage = message.msgContent.envelopeMessage;

                // console.warn('contents received envelope message', msgContent, sourceFrame, destinationFrame);
                this.triggerCallbacks('onMessageFromEnvelope', envelopeMessage);
            }
        }.bind(this));

        /**
         * Automatically show and hide the rootElement of the frame when its envelope opens or closes
         */
        this.onMessageFromEnvelope(function(envelopeMessage) {
            
            // trigger onOrderUpdated if needed
            if (typeof envelopeMessage.onOrderUpdated !== 'undefined') {
                this.triggerCallbacks('onOrderUpdated', envelopeMessage.onOrderUpdated);
            }
            
            // show/hide in response to envelope opening/closing
            if (typeof envelopeMessage.showContainedFrame !== 'undefined') {
                if (envelopeMessage.showContainedFrame) {
                    this.show();
                } else {
                    this.hide();
                }
            }
            
        }.bind(this));
    }

    // Envelope API - these methods can / should be called from the frame you build
    {
        /**
         * API to subscribe to arbitrary messages being sent from the envelope this belongs to.
         * @param {function<Object>} callback
         */
        EnvelopeContents.prototype.onMessageFromEnvelope = function(callback) {
            this.addCallback('onMessageFromEnvelope', callback);
        };

        /**
         * API to subscribe to updates in what order this frame is in the sequence of contained frames.
         * Only gets triggered if the envelope this was added to has areFramesOrdered=true.
         * @param {function<{index: number, total: number}>} callback
         */
        EnvelopeContents.prototype.onOrderUpdated = function(callback) {
            this.addCallback('onOrderUpdated', callback);
        };

        /**
         * API to send an arbitrary message to the envelope that this frame belongs to.
         * @param {Object} message
         */
        EnvelopeContents.prototype.sendMessageToEnvelope = function(message) {
            this.realityInterface.sendMessageToFrame(this.envelopeId, {
                containedFrameMessage: message
            });
        };
    }

    // Internal helper functions, not actually private but don't need to be called from the frame you build
    // In conjunction with the constructor, these set up all the behind-the-scenes functionality to make envelopes work
    {
        /**
         * Show the frame and allow touch interaction again.
         */
        EnvelopeContents.prototype.show = function() {
            this.rootElement.style.display = '';
            this.realityInterface.ignoreAllTouches(false);
        };

        /**
         * Hide the frame and disable all touch interaction so touches pass through it with no chance of interception.
         */
        EnvelopeContents.prototype.hide = function() {
            this.rootElement.style.display = 'none';
            this.realityInterface.ignoreAllTouches(true);
        };

        /**
         * Method to manually trigger callbacks via the envelopeContents object, rather than reacting to post message events.
         * Used e.g. to trigger onMessageFromEnvelope
         * Otherwise, callbacks usually get triggered via the window.addEventListener('message', ...) callback handler.
         * @param {string} callbackName
         * @param {Object} msgContent
         */
        EnvelopeContents.prototype.triggerCallbacks = function(callbackName, msgContent) {
            if (this.callbacks[callbackName]) { // only trigger for callbacks that have been set
                this.callbacks[callbackName].forEach(function(addedCallback) {
                    var msgObject = {};
                    msgObject[callbackName] = msgContent;
                    addedCallback(msgObject);
                });
            }
        };

        /**
         * Helper function to correctly add a callback function.
         * @param {string} callbackName - should match one of the keys in this.callbacks
         * @param {function} callbackFunction
         */
        EnvelopeContents.prototype.addCallback = function(callbackName, callbackFunction) {
            if (typeof this.callbacks[callbackName] === 'undefined') {
                console.warn('Creating a new envelope callback that wasn\'t defined in the constructor');
                this.callbacks[callbackName] = [];
            }

            // TODO: provide same functionality without doubling the number of function allocations per callback
            this.callbacks[callbackName].push(function(envelopeMessage) {
                if (typeof envelopeMessage[callbackName] === 'undefined') { return; }
                callbackFunction(envelopeMessage[callbackName]);
            });
        };
    }

    exports.EnvelopeContents = EnvelopeContents;
    
})(window);


