createNameSpace("realityEditor.device.keyboardEvents");

/**
 * @fileOverview realityEditor.device.keyboardEvents.js
 * Provides a central location where document keyboard events are handled.
 * Additional modules and experiments can plug into these for touch interaction.
 */

(function(exports) {
    
    var callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('device/keyboardEvents');
    let keyboardCurrentlyOpen = false;

    // register normal/flying mode callbacks, so that when enter fly mode in remote operator, spatialCursor & spatialIndicator's screenX & screenY also switches to screen center
    let isFlying = false, lastScreenX, lastScreenY;

    /**
     * Public init method sets up module and registers callbacks in other modules
     */
    function initService() {
        window.addEventListener('keyup', keyUpHandler);
        window.addEventListener('keydown', keyDownHandler);
        window.addEventListener('keyup', (e) => handleFlyMode(e));
        realityEditor.network.addPostMessageHandler('resetScroll', function() {
            resetScroll();
            setTimeout(function() {
                resetScroll(); // also do it after a slight delay
            }, 100); 
        });
    }

    /**
     * Corrects any buggy scrolling that may have occurred when typing in a frame
     * @deprecated - shouldn't be needed if frames use the new openKeyboard/closeKeyboard API
     */
    function resetScroll() {
        if (window.scrollX !== 0 || window.scrollY !== 0) {
            window.scrollTo(0,0);
        }
    }

    /**
     * key up event handler that is always present.
     * @param {KeyboardEvent} event
     */
    function keyUpHandler(event) {
        callbackHandler.triggerCallbacks('keyUpHandler', {event: event});
    }

    /**
     * key down event handler that is always present.
     * @param {KeyboardEvent} event
     */
    function keyDownHandler(event) {
        callbackHandler.triggerCallbacks('keyDownHandler', {event: event});
    }

    /**
     * Adds a callback function that will be invoked when the specified button is pressed
     * @param {string} functionName
     * @param {function} callback
     */
    function registerCallback(functionName, callback) {
        if (!callbackHandler) {
            callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('device/keyboardEvents');
        }
        callbackHandler.registerCallback(functionName, callback);
    }

    function handleFlyMode(e) {
        if (isKeyboardActive()) return; // ignore if a tool is using the keyboard
        if (e.key === 'f' || e.key === 'F') {
            isFlying = !isFlying;
            if (isFlying) {
                let mousePosition = realityEditor.gui.ar.positioning.getMostRecentTouchPosition();
                lastScreenX = mousePosition.x;
                lastScreenY = mousePosition.y;
                callbackHandler.triggerCallbacks('enterFlyMode', {
                    isFlying: true,
                    screenX: window.innerWidth / 2,
                    screenY: window.innerHeight / 2
                });
            } else {
                callbackHandler.triggerCallbacks('enterNormalMode', {
                    isFlying: false,
                    screenX: lastScreenX,
                    screenY: lastScreenY
                });
            }
        }
    }

    /**
     * Creates an invisible contenteditable div that we can focus on to open the keyboard.
     * This allows frames to use an API to safely open a keyboard and listen to events without encountering webkit keyboard bugs.
     */
    function createKeyboardInputDiv() {
        var keyboardInput = document.createElement('div');
        keyboardInput.id = 'keyboardInput';
        keyboardInput.setAttribute('contenteditable', 'true');
        document.body.appendChild(keyboardInput);
        keyboardInput.style.position = 'absolute';
        keyboardInput.style.left = 0;
        keyboardInput.style.top = 0;
        keyboardInput.style.opacity = 0;

        document.getElementById('keyboardInput').addEventListener('focusout', function() {
            console.log('keyboard hidden');
            callbackHandler.triggerCallbacks('keyboardHidden', null);
        });
    }

    /**
     * Programmatically opens the keyboard by focusing on a placeholder element.
     * @todo: there is a bug where multiple frames can think they have keyboard focus if you don't call closeKeyboard between each openKeyboard
     */
    function openKeyboard() {
        if (!document.getElementById('keyboardInput')) {
            createKeyboardInputDiv();
        }

        // todo: if the keyboard is already open, notify previous active iframe that something else opened it
        // closeKeyboard(); // this almost works (if you also add a setTimeout on the focus(), but it cancels the current iframe's focus, too)

        document.getElementById('keyboardInput').focus();

        keyboardCurrentlyOpen = true;
    }

    /**
     * Programmatically closes the keyboard by blurring (un-focusing) and disabling the placeholder element
     * From: https://stackoverflow.com/a/11160055/1190267
     */
    function closeKeyboard() {
        if (!document.getElementById('keyboardInput')) {
            createKeyboardInputDiv();
        }

        document.getElementById('keyboardInput').setAttribute('readonly', 'readonly');
        document.getElementById('keyboardInput').setAttribute('disabled', 'true');

        setTimeout(function() {
            document.getElementById('keyboardInput').blur();
            document.getElementById('keyboardInput').removeAttribute('readonly');
            document.getElementById('keyboardInput').removeAttribute('disabled');
        }, 100);

        keyboardCurrentlyOpen = false;
    }

    function isKeyboardActive() {
        return keyboardCurrentlyOpen;
    }

    exports.initService = initService;
    exports.registerCallback = registerCallback;
    exports.openKeyboard = openKeyboard;
    exports.closeKeyboard = closeKeyboard;
    exports.isKeyboardActive = isKeyboardActive;

})(realityEditor.device.keyboardEvents);
