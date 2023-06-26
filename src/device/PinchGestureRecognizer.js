export class PinchGestureRecognizer {
    constructor() {
        this.unprocessedScroll = 0;
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
        let isMultitouchGestureActive = false;
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
                    this.unprocessedScroll -= 5 * (currentDistance - lastDistance);
                    lastDistance = currentDistance;
                    this.callbacks.onPinchChange.forEach(callback => {
                        callback(this.unprocessedScroll);
                    });
                    this.unprocessedScroll = 0;
                }
            }
        }

        // Add multitouch event listeners to the document
        document.addEventListener('touchstart', (event) => {
            if (!realityEditor.device.utilities.isEventHittingBackground(event)) return;

            isMultitouchGestureActive = true;

            if (event.touches.length === 2) {
                initialDistance = 0; // Reset pinch distance
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
