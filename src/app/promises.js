createNameSpace("realityEditor.app.promises");

/**
 * @fileOverview
 * Provides a simpler interface to some APIs defined in app/index.js, by wrapping them in a Promise
 * APIs that return a single value vs those that return multiple values should be accessed like:
 * getDeviceReady().then(deviceName => {})
 * addNewMarker('target.xml').then(({success, fileName}) => {})
 * APIs for subscriptions, such as the matrix stream, should still be accessed directly using app/index.js
 */
(function(exports) {
    const app = realityEditor.app;

    // resolves to deviceName: string
    exports.getDeviceReady = makeAPI(app.getDeviceReady.bind(app));
    // resolves to success: boolean
    exports.didGrantNetworkPermissions = makeAPI(app.didGrantNetworkPermissions.bind(app));
    // resolves to success: boolean
    exports.getVuforiaReady = makeAPI(app.getVuforiaReady.bind(app));
    // resolves to success: boolean
    exports.doesDeviceHaveDepthSensor = makeAPI(app.doesDeviceHaveDepthSensor.bind(app));
    //resolves to baseURL: string
    exports.getManagerBaseURL = makeAPI(app.getManagerBaseURL.bind(app));

    // params: [markerName], resolves to: {success: boolean, fileName: string]}
    exports.addNewMarker = makeAPI(app.addNewMarker.bind(app), ['success', 'fileName']);
    // params: [markerName, objectID, targetWidthMeters], resolves to: {success: boolean, fileName: string]}
    exports.addNewMarkerJPG = makeAPI(app.addNewMarkerJPG.bind(app), ['success', 'fileName']);

    // resolves to providerId: string
    exports.getProviderId = makeAPI(app.getProviderId.bind(app));
    
    // resolves to {texture: string, textureDepth: string}
    exports.get3dSnapshot = makeAPI(app.get3dSnapshot.bind(app), ['texture', 'textureDepth']);

    // adapted from: https://stackoverflow.com/a/34637436
    class Deferred {
        constructor(onFinally) {
            this.promise = new Promise((resolve, reject) => {
                this.reject = reject;
                this.resolve = resolve;
            });
            this.promise.finally(onFinally); // use this to clean up state after it's done
        }
    }

    // exposes randomly generated public function signatures to resolve the deferred promises when the native code returns
    exports._callbackProxies = {};

    // Helper function to wrap the appFunctionCall in a deferred promise that will resolve when the native code finishes
    // The name of each resolve param should be included iff the native API returns multiple values
    function makeAPI(appFunctionCall, resolveParams) {
        return function() {
            const functionUuid = '_proxy_' + realityEditor.device.utilities.uuidTime();

            // when the API is called, create a new Promise
            let deferred = new Deferred(() => {
                delete realityEditor.app.promises._callbackProxies[functionUuid];
            });

            // create a new function to be used as the callback that is passed to the native code
            realityEditor.app.promises._callbackProxies[functionUuid] = function() {
                // when the callback is triggered, resolve the promise
                if (Array.from(arguments).length < 2) {
                    deferred.resolve.apply(null, arguments);
                    return;
                }

                // if the native code returned multiple arguments, pack them into an object and resolve
                let argMap = {};
                Array.from(arguments).forEach((arg, i) => {
                    argMap[resolveParams[i]] = arg;
                });
                deferred.resolve(argMap);
            };

            // the APIs in app/index.js expect the callback signature as the final argument
            const argumentsPlusCallback = Array.from(arguments);
            argumentsPlusCallback.push('realityEditor.app.promises._callbackProxies.' + functionUuid);
            appFunctionCall.apply(null, argumentsPlusCallback);
            return deferred.promise;
        }
    }

})(realityEditor.app.promises);
