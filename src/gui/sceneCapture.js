/**
 * Coordinates with canvases in the scene to asynchronously take a screenshot at the proper time in the render loop
 *
 * To make use of this with a new canvas, do the following:
 * 1. import { getPendingCapture } from './sceneCapture.js';
 *    ...
 *    // In the main render loop, directly after finishing drawing, do:
 *    let pendingCapture = getPendingCapture('thisCanvasId');
 *    if (pendingCapture) {
 *      pendingCapture.performCapture();
 *    }
 * 2. Then when you want to take a screenshot of the canvas elsewhere, do:
 *    import { captureScreenshot } from '../../src/gui/sceneCapture.js';
 *    ...
 *    captureScreenshot('thisCanvasId', options).then(screenshotImageSrc => {
 *      console.log(screenshotImageSrc);
 *    });
 */
class SceneCapture {
    constructor() {
        this.pendingCaptures = {};
    }

    /**
     * Resolves a pending capture with a base-64 encoded image of the specified canvas
     * @param {string} canvasId
     * @param {number|undefined} outputWidth
     * @param {number|undefined} outputHeight
     * @param {Object} [compressionOptions]
     * @param {boolean} [compressionOptions.useJpg] - Uses PNG if false, JPG if true
     * @param {number} [compressionOptions.quality] - Quality of JPG, if used (0 to 1)
     */
    capture(canvasId, outputWidth, outputHeight, compressionOptions) {
        let sourceCanvas = document.getElementById(canvasId); // document.getElementById('mainThreejsCanvas');
        if (!sourceCanvas) {
            console.warn(`trying to capture a non-existent canvas ${canvasId}`);
            return;
        }
        let pendingCapture = this.pendingCaptures[canvasId];
        if (!pendingCapture) {
            console.warn(`capture called on ${canvasId} when there are no pendingCaptures waiting on this data`);
            return;
        }

        if (outputWidth || outputHeight) {
            let originalWidth = sourceCanvas.width;
            let originalHeight = sourceCanvas.height;

            if (!outputHeight) {
                // Calculate height to preserve aspect ratio
                outputHeight = outputWidth * (originalHeight / originalWidth);
            } else if (!outputWidth) {
                // Calculate width to preserve aspect ratio
                outputWidth = outputHeight * (originalWidth / originalHeight);
            }

            // Create an off-screen canvas for resizing
            let offScreenCanvas = document.createElement('canvas');
            offScreenCanvas.width = outputWidth;
            offScreenCanvas.height = outputHeight;
            let ctx = offScreenCanvas.getContext('2d');

            // Draw the original canvas onto the off-screen canvas at the desired size
            ctx.drawImage(sourceCanvas, 0, 0, offScreenCanvas.width, offScreenCanvas.height);
            sourceCanvas = offScreenCanvas;
        }

        let mostRecentCapture;
        if (compressionOptions.useJpg) {
            // Get the data URL of the resized canvas as JPEG
            let quality = compressionOptions.quality || 0.7; // Adjust the quality parameter (0.0 to 1.0) as needed
            mostRecentCapture = sourceCanvas.toDataURL('image/jpeg', quality);
        } else {
            mostRecentCapture = sourceCanvas.toDataURL('image/png');
        }

        if (pendingCapture.promiseResolve) {
            pendingCapture.promiseResolve(mostRecentCapture);
            pendingCapture.promiseResolve = null;
        }
        delete this.pendingCaptures[canvasId];
    }
}

/**
 * Pending canvas capture information, which can be performed at a future time using its `SceneCapture` instance
 */
class PendingCapture {
    /**
     * @param {SceneCapture} sceneCaptureInstance
     * @param {string} canvasId
     * @param {number|undefined} outputWidth
     * @param {number|undefined} outputHeight
     * @param {boolean} useJpgCompression
     * @param {number} jpgQuality
     */
    constructor(sceneCaptureInstance, canvasId, outputWidth, outputHeight, useJpgCompression, jpgQuality) {
        this.sceneCaptureInstance = sceneCaptureInstance;
        this.canvasId = canvasId;
        this.outputWidth = outputWidth;
        this.outputHeight = outputHeight;
        this.jpgCompression = {
            useJpg: useJpgCompression,
            quality: jpgQuality
        };
        this.promiseResolve = null; // gets set after initialization
    }

    /**
     * Triggers the actual capture
     */
    performCapture() {
        this.sceneCaptureInstance.capture(this.canvasId, this.outputWidth, this.outputHeight, this.jpgCompression);
    }
}

const sceneCapture = new SceneCapture();

/**
 * Captures a screenshot of the canvas by creating a PendingCapture and returning a promise that will resolve when
 * the PendingCapture finishes performing the capture
 * @param {string} canvasId
 * @param {Object} [options] - The options for capturing the screenshot.
 * @param {number} [options.outputWidth] - The desired width. Only one of width/height needs to be specified.
 * @param {number} [options.outputHeight] - The desired height. If both unspecified, uses full width/height of canvas.
 * @param {boolean} [options.useJpgCompression=false] - Uses PNG if false, JPG if true.
 * @param {number} [options.jpgQuality=0.7] - The quality of the JPG compression, if used. Value should be between 0 and 1.
 * @return {Promise<string>} - resolves with the screenshot src as a base-64 encoded string (from `canvas.toDataURL`)
 */
export const captureScreenshot = (canvasId, options = {outputWidth: undefined, outputHeight: undefined, useJpgCompression: false, jpgQuality: 0.7}) => {
    if (sceneCapture.pendingCaptures[canvasId]) console.warn('wait for previous capture to finish before capturing again');

    let pendingCapture = new PendingCapture(sceneCapture, canvasId,
        options.outputWidth, options.outputHeight, options.useJpgCompression, options.jpgQuality);

    sceneCapture.pendingCaptures[canvasId] = pendingCapture;

    return new Promise((resolve) => {
        pendingCapture.promiseResolve = resolve;
    });
};

/**
 * Checks if there is a pending capture for the specified canvas
 * @param {string} canvasId
 * @return {PendingCapture}
 */
export const getPendingCapture = (canvasId) => {
    return sceneCapture.pendingCaptures[canvasId];
};



