export class PinchGestureRecognizer {
    constructor() {
        this.mouseInput = {
            unprocessedDX: 0,
            unprocessedDY: 0,
            unprocessedScroll: 0,
            isPointerDown: false,
            isRightClick: false,
            isRotateRequested: false,
            isStrafeRequested: false,
            first: { x: 0, y: 0 },
            last: { x: 0, y: 0 },
            lastWorldPos: [0, 0, 0],
        };
        this.callbacks = {
            onPinchChange: [],
            onPinchStart: [],
            onPinchEnd: []
        };
        this.addMultitouchEvents();
    }
    onPinchChange(callback) {
        this.callbacks.onPinchChange.push(callback);
    }
    onPinchStart(callback) {
        this.callbacks.onPinchStart.push(callback);
    }
    onPinchEnd(callback) {
        this.callbacks.onPinchEnd.push(callback);
    }
    addMultitouchEvents() {
        // on mobile browsers, we add touch controls instead of mouse controls, to move the camera. additional
        // code is added to avoid iOS's pesky safari gestures, such as pull-to-refresh and swiping between tabs

        let isMultitouchGestureActive = false;
        let didMoveAtAll = false;
        let initialPosition = null;
        let initialDistance = 0;
        let lastDistance = 0;

        // Prevent the default pinch gesture response (zooming) on mobile browsers
        document.addEventListener('gesturestart', (event) => {
            event.preventDefault();
        });

        // Handle pinch to zoom
        const handlePinch = (event) => {
            event.preventDefault();
            if (event.touches.length === 2) {
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

                if (initialDistance === 0) { // indicates the start of the pinch gesture
                    initialDistance = currentDistance;
                    lastDistance = initialDistance;
                    this.callbacks.onPinchStart.forEach(callback => {
                        callback();
                    });
                } else {
                    // Calculate the pinch scale based on the change in distance over time.
                    // 5 is empirically determined to feel natural. -= so bigger distance leads to closer zoom
                    this.mouseInput.unprocessedScroll -= 5 * (currentDistance - lastDistance);
                    lastDistance = currentDistance;
                    this.callbacks.onPinchChange.forEach(callback => {
                        callback(this.mouseInput.unprocessedScroll);
                    });
                    this.mouseInput.unprocessedScroll = 0;
                }
            }
        }

        // Add multitouch event listeners to the document
        document.addEventListener('touchstart', (event) => {
            if (!realityEditor.device.utilities.isEventHittingBackground(event)) return;

            isMultitouchGestureActive = true;

            if (event.touches.length === 2) {
                initialDistance = 0; // Reset pinch distance
                this.mouseInput.last.x = 0;
                this.mouseInput.last.y = 0;
            }
        });
        document.addEventListener('touchmove', (event) => {
            if (!isMultitouchGestureActive) return;
            event.preventDefault();

            // Ensure regular zoom level
            document.documentElement.style.zoom = '1';
            // Ensure no page offset
            window.scrollTo(0, 0);

            if (event.touches.length === 2) {
                // zooms based on changing distance between fingers
                handlePinch(event);
                didMoveAtAll = true;
            }
        });
        document.addEventListener('touchend', (_event) => {
            initialDistance = 0;
            isMultitouchGestureActive = false;
            this.callbacks.onPinchEnd.forEach(callback => {
                callback();
            });
        });
    }
}
