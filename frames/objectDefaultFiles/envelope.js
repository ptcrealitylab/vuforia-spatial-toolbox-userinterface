(function(exports) {
    /**
     * @fileOverview
     * How to use:
     * 
     * In a frame that you want to be an envelope (a container for other frames that can be opened and closed):
     * 
     * 1. instantiate envelope = new Envelope(...) object with a reference to a RealityInterface and other parameters
     * 2. Use envelope APIs like envelope.open(), envelope.close(), envelope.onFrameAdded(...), ...
     * 3. To send a message to frames dropped into this envelope, use:
          envelope.sendMessageToAllContainedFrames({
            exampleMessageName: messageData
          });
          (You can also use sendMessageToFrameWithId or sendMessageToFrameAtIndex to send to a specific one)
     * 4. To listen for messages from contained frames, use:
          envelope.onMessageFromContainedFrame(function(message) {
            if (typeof message.exampleMessageName !== 'undefined') { 
              // respond to message.exampleMessageName
            }
          });
     * 5. Ensure that all frames you want to be compatible with this envelope follow the instructions in envelopeContents.js
     */

    // makes sure this only gets loaded once per iframe
    if (typeof exports.Envelope !== 'undefined') {
        return;
    }

    /**
     * @constructor
     * Defines an interface that declares this frame to be an "envelope" frame that can contain other frames to
     * form some form of a relationship between them all. Envelopes have an "open" state, where they take up the
     * fullscreen 2D UI, and a "closed" state, where they are minimized into a small 3D icon in space. Their contained
     * frames are only visible when the envelope is open.
     * 
     * @param {RealityInterface} realityInterface - reference to the RealityInterface API object
     * @param {Array.<string>} compatibleFrameTypes - array of types of frames that can be added to this envelope
     * @param {HTMLElement} rootElementWhenOpen - a containing div that will be rendered when open (fullscreen 2D)
     * @param {HTMLElement} rootElementWhenClosed - a containing div that will be rendered when closed (small 3D icon)
     * @param {boolean|undefined} isStackable - defaults to false
     * @param {boolean|undefined} areFramesOrdered - defaults to false
     */
    function Envelope(realityInterface, compatibleFrameTypes, rootElementWhenOpen, rootElementWhenClosed, isStackable, areFramesOrdered) {
        if (typeof compatibleFrameTypes === 'undefined' || compatibleFrameTypes.length === 0) {
            console.warn('You must specify at least one compatible frame type for this envelope');
        }
        if (typeof isStackable === 'undefined') { isStackable = false; }
        if (typeof areFramesOrdered === 'undefined') { areFramesOrdered = false; }

        /**
         * A pointer to the envelope frame's RealityInterface object, so that this can interact with the other JavaScript APIs
         */
        this.realityInterface = realityInterface;
        /**
         * The names of which frames can be added to this envelope
         * @type {Array.<string>}
         */
        this.compatibleFrameTypes = compatibleFrameTypes;
        /**
         * If other envelopes can be open at the same time or not
         * @type {boolean}
         */
        this.isStackable = isStackable;
        /**
         * Should this keep track of the ordering of its contained frames, or are they an unordered set
         * @type {boolean}
         */
        this.areFramesOrdered = areFramesOrdered;
        /**
         * A map of all the frameIds -> frame data for each frame added to the envelope
         * @type {Object.<string, Object>}
         */
        this.containedFrames = {};
        /**
         * A list of frameIds. The order they appear here determines their ordering / indices.
         * Only used if areFramesOrdered===true.
         * @type {Array}
         */
        this.frameIdOrdering = [];
        /**
         * Whether the envelope is opened in a fullscreen/maximized way, or minimized as a small 3D icon in space
         * @type {boolean}
         */
        this.isOpen = false;
        /**
         * Callbacks for various events from contained frames or the reality editor
         * @type {{onFrameAdded: Array, onFrameDeleted: Array, onMessageFromContainedFrame: Array, onOpen: Array, onClose: Array}}
         */
        this.callbacks = {
            /**
             * Triggered when the envelope is open and a compatible frame is created
             */
            onFrameAdded: [],
            /**
             * Triggered when a contained frame is deleted. Automatically updates ordering, etc, but you may need to update UI
             */
            onFrameDeleted: [],
            /**
             * Triggered when a contained frame sends a message to the envelope (e.g. "stepCompleted")
             */
            onMessageFromContainedFrame: [],
            /**
             * Triggered when the user taps on the envelope or otherwise opens it. May need to update UI for fullscreen
             */
            onOpen: [],
            /**
             * Triggered when the user closes/minimizes the envelope, or another non-stackable envelope kicks this one out of fullscreen
             */
            onClose: []
        };
        /**
         * The actual width and height of the screen, used to set the size of the frame when the envelope is opened
         * These are default values, that get overridden in the constructor using realityInterface.getScreenDimensions
         * @type {{width: number, height: number}}
         */
        this.screenDimensions = {
            width: 736,
            height: 414
        };
        /**
         * default 400ms when closed, gets overwritten if you change realityInterface.setMoveDelay
         * @type {number}
         */
        this.moveDelayBeforeOpen = 400;
        
        // finish setting up the envelope by adding default callbacks and listeners for certain events
        
        // listen to post messages from the editor to trigger certain envelope events
        window.addEventListener('message', this.onWindowMessage.bind(this));
        
        // these keep the list of contained frames and the ordering up-to-date
        // add your own callback to adjust the UI based on frames being added or removed
        this.onFrameAdded(this._defaultOnFrameAdded.bind(this));
        this.onFrameDeleted(this._defaultOnFrameDeleted.bind(this));

        // these update the UI automatically when the frame is opened or closed to switch between its two container divs
        this.onOpen(this._defaultOnOpen.bind(this));
        this.onClose(this._defaultOnClose.bind(this));
        
        // Uses the RealityInterface frame messaging system to listen for messages from contained frames.
        realityInterface.addFrameMessageListener(this._defaultFrameMessageListener.bind(this));
        
        // read from persistent storage to restore any relationships with contained frames when this loads
        realityInterface.addReadPublicDataListener('storage', 'envelopeContents', this._defaultPublicDataListener.bind(this));
        
        // registers the envelope with the editor
        this.realityInterface.sendEnvelopeMessage({
            isEnvelope: true,
            compatibleFrameTypes: this.compatibleFrameTypes
        });

        // automatically ensure that there is a node called 'storage' on the envelope frame to store the publicData
        let params = {
            name: 'storage',
            x: 0,
            y: 0,
            groundplane: false,
            type: 'storeData',
            noDuplicate: true // only create if doesn't already exist
        };
        this.realityInterface.sendCreateNode(params.name, params.x, params.y, params.groundplane, params.type, params.noDuplicate);

        // this adjusts the size of the body to be fullscreen based on accurate device screen size
        realityInterface.getScreenDimensions(function(width, height) {
            this.screenDimensions = {
                width: width,
                height: height
            };

            // changing the root element size should reposition everything else nicely relative to it
            // if necessary, reposition/resize any element with manual adjustments
            rootElementWhenOpen.style.width = width + 'px';
            rootElementWhenOpen.style.height = height + 'px';
        }.bind(this));

        // Manage the UI for open and closed states
        this.rootElementWhenOpen = rootElementWhenOpen;
        this.rootElementWhenClosed = rootElementWhenClosed;
        if (this.isOpen) {
            this.rootElementWhenClosed.style.display = 'none';
        } else {
            this.rootElementWhenOpen.style.display = 'none';
        }
    }
    
    // Envelope API - these methods can / should be called from the frame you build
    {
        /**
         * API to trigger the envelope to open if it's closed, which means it becomes sticky fullscreen and triggers onOpen events
         */
        Envelope.prototype.open = function() {
            if (this.isOpen) { return; }

            this.isOpen = true;
            this.realityInterface.setStickyFullScreenOn(); // currently assumes envelopes want 'sticky' fullscreen, not regular
            if (!this.isStackable) {
                this.realityInterface.setExclusiveFullScreenOn(function() {
                    this.close(); // trigger all the side-effects related to the envelope closing
                }.bind(this));
            }

            this.triggerCallbacks('onOpen', {});

            this.realityInterface.sendEnvelopeMessage({
                open: true
            });
        };

        /**
         * API to trigger the envelope to close if it's open, which means it turns off fullscreen and triggers onClosed events
         */
        Envelope.prototype.close = function() {
            if (!this.isOpen) { return; }

            this.isOpen = false;
            this.realityInterface.setFullScreenOff();

            this.triggerCallbacks('onClose', {});

            this.realityInterface.sendEnvelopeMessage({
                close: true
            });
        };

        /**
         * API to subscribe to a compatible frame being added to the envelope.
         * The envelope already automatically adds it to the containedFrames and updates the ordering if needed.
         * @param {function<{objectId: string, frameId: string, frameType: string}>} callback
         */
        Envelope.prototype.onFrameAdded = function(callback) {
            this.addCallback('onFrameAdded', callback);
        };

        /**
         * API to subscribe to a contained frame being deleted from the envelope.
         * The envelope already automatically removes it from the containedFrames and updates the ordering if needed.
         * @param {function<{objectId: string, frameId: string, frameType: string}>} callback
         */
        Envelope.prototype.onFrameDeleted = function(callback) {
            this.addCallback('onFrameDeleted', callback);
        };

        /**
         * API to subscribe to arbitrary messages being sent to the envelope by its contained frames.
         * @param {function<Object>} callback
         */
        Envelope.prototype.onMessageFromContainedFrame = function(callback) {
            this.addCallback('onMessageFromContainedFrame', callback);
        };

        /**
         * API to respond to the envelope opening.
         * Its UI already automatically requests fullscreen and changes from rootElementWhenClosed to rootElementWhenOpen.
         * @param {function<>} callback
         */
        Envelope.prototype.onOpen = function(callback) {
            this.addCallback('onOpen', callback);
        };

        /**
         * API to respond to the envelope closing.
         * Its UI already automatically removes fullscreen and changes from rootElementWhenOpen to rootElementWhenClosed.
         * @param {function<>} callback
         */
        Envelope.prototype.onClose = function(callback) {
            this.addCallback('onClose', callback);
        };

        /**
         * API to send a JSON message to a particular contained frame, if there is one matching that ID.
         * @param {string} id - the uuid of the frame
         * @param {Object} message
         */
        Envelope.prototype.sendMessageToFrameWithId = function(id, message) {
            this.realityInterface.sendMessageToFrame(id, {
                envelopeMessage: message
            });
        };

        /**
         * API to send a JSON message to all contained frames.
         * @param {Object} message
         */
        Envelope.prototype.sendMessageToAllContainedFrames = function(message) {
            this.forEachFrame(function(frameId, _frameData) {
                this.sendMessageToFrameWithId(frameId, message);
            }.bind(this));
        };

        /**
         * API to send a JSON message to the contained frame in a certain index of the ordering.
         * @param {number} index
         * @param {Object} message
         */
        Envelope.prototype.sendMessageToFrameAtIndex = function(index, message) {
            if (!this.areFramesOrdered) {
                console.warn('You cannot send a message by index if the frames are unordered');
                return;
            }
            this.sendMessageToFrameWithId(this.getFrameIdAtIndex(index), message);
        };

        /**
         * API to move the frame with the specified ID to the new index.
         * Note - this hasn't been fully tested in practice yet.
         * @param {string} frameId
         * @param {number} newIndex
         */
        Envelope.prototype.reorderFrames = function(frameId, newIndex) {
            if (!this.areFramesOrdered) {
                console.warn('You cannot reorder frames if the frames are unordered');
                return;
            }
            let currentIndex = this.frameIdOrdering.indexOf(frameId);
            if (currentIndex > -1) {
                // moves element from currentIndex to newIndex - see https://stackoverflow.com/a/2440723/1190267
                this.frameIdOrdering.splice(newIndex, 0, this.frameIdOrdering.splice(currentIndex, 1)[0]);

                // notify all frames of their new indices
                this.frameIdOrdering.forEach(function(id, index) {
                    this.sendMessageToFrameWithId(id, {
                        onOrderUpdated: {
                            index: index,
                            total: this.frameIdOrdering.length
                        }
                    });
                }.bind(this));
            }
        };
    }

    // Internal helper functions, not actually private but don't need to be called from the frame you build
    // In conjunction with the constructor, these set up all the behind-the-scenes functionality to make envelopes work
    {
        /**
         * Triggers all callbacks functions when the iframe receives an 'envelopeMessage' POST message from the parent window.
         * @param {string} msg - stringified JSON message
         */
        Envelope.prototype.onWindowMessage = function(msg) {
            let msgContent = JSON.parse(msg.data);
            if (typeof msgContent.envelopeMessage === 'undefined') {
                return;
            }
            
            // if any keys that envelopeMessage contains match the name of any callbacks, those callbacks will be triggered
            for (let callbackKey in msgContent.envelopeMessage) {
                if (typeof this.callbacks[callbackKey] === 'undefined') { continue; }
                this.callbacks[callbackKey].forEach(function(addedCallback) {
                    addedCallback(msgContent.envelopeMessage[callbackKey]);
                });
            }

            if (typeof msgContent.envelopeMessage.sendMessageToContents !== 'undefined') {
                this.sendMessageToAllContainedFrames(msgContent.envelopeMessage.sendMessageToContents);
            }
            if (typeof msgContent.envelopeMessage.open !== 'undefined') {
                this.open();
            }
            if (typeof msgContent.envelopeMessage.close !== 'undefined') {
                this.close();
            }
        };

        /**
         * Maintains set of contained frames when a compatible frame is added
         * @param {{objectId: string, frameId: string, frameType: string}} frameAddedMessage
         */
        Envelope.prototype._defaultOnFrameAdded = function(frameAddedMessage) {
            // update containedFrames and ordering
            this.containedFrames[frameAddedMessage.frameId] = new FrameData(frameAddedMessage.frameId, frameAddedMessage.frameType);
            if (this.areFramesOrdered) {
                this.frameIdOrdering.push(frameAddedMessage.frameId);
            }
            // send messages to trigger events and save persistently
            this.orderingUpdated();
            this.containedFramesUpdated();
            this.savePersistentData();
        };

        /**
         * Maintains set of contained frames when a contained frame is deleted
         * @param {{objectId: string, frameId: string, frameType: string}} frameDeletedMessage
         */
        Envelope.prototype._defaultOnFrameDeleted = function(frameDeletedMessage) {
            // update containedFrames and ordering
            delete this.containedFrames[frameDeletedMessage.frameId];
            if (this.areFramesOrdered) {
                let index = this.frameIdOrdering.indexOf(frameDeletedMessage.frameId);
                if (index > -1) {
                    this.frameIdOrdering.splice(index, 1);
                }
            }
            // send messages to trigger events and save persistently
            this.orderingUpdated();
            this.containedFramesUpdated();
            this.savePersistentData();
        };

        /**
         * Updates the UI and relevant frame properties when the envelope should become fullscreen.
         */
        Envelope.prototype._defaultOnOpen = function() {
            this.rootElementWhenClosed.style.display = 'none';
            this.rootElementWhenOpen.style.display = 'inline';
            // change the iframe and touch overlay size (including visual feedback corners) when the frame changes size
            this.realityInterface.changeFrameSize(parseInt(this.rootElementWhenOpen.clientWidth), parseInt(this.rootElementWhenOpen.clientHeight));
            this.moveDelayBeforeOpen = realityInterface.getMoveDelay() || 400;
            this.realityInterface.setMoveDelay(-1); // can't move it while fullscreen
        };

        /**
         * Resets the UI and relevant frame properties when the envelope is closed.
         */
        Envelope.prototype._defaultOnClose = function() {
            this.rootElementWhenClosed.style.display = 'inline';
            this.rootElementWhenOpen.style.display = 'none';
            // change the iframe and touch overlay size (including visual feedback corners) when the frame changes size
            this.realityInterface.changeFrameSize(parseInt(this.rootElementWhenClosed.clientWidth), parseInt(this.rootElementWhenClosed.clientHeight));
            this.realityInterface.setMoveDelay(this.moveDelayBeforeOpen); // restore to previous value
        };

        /**
         * Uses the RealityInterface frame messaging system to listen for messages from contained frames.
         * @param {{msgContent: Object, sourceFrame: string, destinationFrame: string}} message
         */
        Envelope.prototype._defaultFrameMessageListener = function(message) {
            if (typeof message.msgContent.containedFrameMessage !== 'undefined') {
                // console.warn('contents received envelope message', msgContent, sourceFrame, destinationFrame);
                this.triggerCallbacks('onMessageFromContainedFrame', message.msgContent.containedFrameMessage);
            }
        };

        /**
         * Read from persistent storage to restore any relationships with contained frames when this loads.
         * @param {{containedFrames: Object|undefined, frameIdOrdering: Array.<string>|undefined}} savedContents
         */
        Envelope.prototype._defaultPublicDataListener = function(savedContents) {             
            console.log('saved envelope contents', savedContents);
            if (typeof savedContents.containedFrames !== 'undefined') {
                this.containedFrames = savedContents.containedFrames;
                this.containedFramesUpdated();
            }
            if (typeof savedContents.frameIdOrdering !== 'undefined') {
                this.frameIdOrdering = savedContents.frameIdOrdering;
                this.orderingUpdated();
            }
        };

        /**
         * Sends a message to the editor with all contained frames so editor has an accurate map of envelopes->containedFrames.
         * Gets triggered automatically when frames are added or removed.
         */
        Envelope.prototype.containedFramesUpdated = function() {
            this.realityInterface.sendEnvelopeMessage({
                containedFrameIds: Object.keys(this.containedFrames)
            });
        };

        /**
         * Sends a message (if areFramesOrdered) to all contained frames updating them about which index they
         * are in the ordering, and how many contained frames there are in total.
         * Gets triggered automatically when frames are added or removed.
         */
        Envelope.prototype.orderingUpdated = function() {
            if (!this.areFramesOrdered) { return; }
            // send a message to each frame with their order
            this.frameIdOrdering.forEach(function(frameId, index) {
                this.sendMessageToFrameWithId(frameId, {
                    onOrderUpdated: {
                        index: index,
                        total: this.frameIdOrdering.length
                    }
                })
            }.bind(this));

        };

        /**
         * Writes the containedFrames and frameIdOrdering to publicData so that the relationships persist across sessions.
         * Gets triggered automatically when frames are added or removed.
         */
        Envelope.prototype.savePersistentData = function() {
            let envelopeContents = {
                containedFrames: this.containedFrames
            };
            if (this.areFramesOrdered) {
                envelopeContents.frameIdOrdering = this.frameIdOrdering;
            }
            console.log('savePersistentData', envelopeContents);
            this.realityInterface.writePublicData('storage', 'envelopeContents',  envelopeContents);
        };

        /**
         * Method to manually trigger callbacks via the envelope object, rather than reacting to post message events.
         * Used e.g. to trigger onOpen and onClose when the API's open() and close() functions are used.
         * Otherwise, callbacks usually get triggered via the window.addEventListener('message', ...) callback handler.
         * @param {string} callbackName
         * @param {Object} msgContent
         */
        Envelope.prototype.triggerCallbacks = function(callbackName, msgContent) {
            if (this.callbacks[callbackName]) { // only trigger for callbacks that have been set
                this.callbacks[callbackName].forEach(function(addedCallback) {
                    addedCallback(msgContent);
                });
            }
        };

        /**
         * Helper function to correctly add a callback function
         * @param {string} callbackName - should match one of the keys in this.callbacks
         * @param {function<*>} callbackFunction
         */
        Envelope.prototype.addCallback = function(callbackName, callbackFunction) {
            if (typeof this.callbacks[callbackName] === 'undefined') {
                console.warn('Creating a new envelope callback that wasn\'t defined in the constructor');
                this.callbacks[callbackName] = [];
            }
            
            this.callbacks[callbackName].push(callbackFunction);
        };

        /**
         * Gets the frame id that corresponds to a certain index in the ordering.
         * @param {number} index
         */
        Envelope.prototype.getFrameIdAtIndex = function(index) {
            if (!this.areFramesOrdered) {
                console.warn('You cannot send a message by index if the frames are unordered');
                return;
            }
            return this.frameIdOrdering[index];
        };

        /**
         * Helper function to iterate over all contained frames.
         * @param {function<string, FrameData>} callback
         */
        Envelope.prototype.forEachFrame = function(callback) {
            for (let frameId in this.containedFrames) {
                callback(frameId, this.containedFrames[frameId]);
            }
        };
    }

    /**
     * @constructor
     * This contains all the necessary information to keep track of a frame that the envelope contains.
     * More params can be added as necessary for more features.
     *
     * @param {string} id - the frame uuid, used as an address to send messages to it
     * @param {string} type - the frame type, used to ensure it is a compatible with this envelope or to distinguish between different contained frames' capabilities
     */
    function FrameData(id, type) {
        this.id = id;
        this.type = type;
    }
    
    exports.Envelope = Envelope;

})(window);
