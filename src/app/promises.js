createNameSpace("realityEditor.app.promises");

// provides a simpler interface to some native APIs which are essentially getters but act
// asynchronously because of the communication channel with the native app
(function(exports) {
    const app = realityEditor.app;

    // promises must be resolved externally due to the inner workings of how callbacks signatures get passed to swift.
    // in the current implementation, if multiple calls to the same API are made before any of them resolve, then all
    // pending API calls of that type will be resolved when the first API returns. this works for getters that will
    // return a consistent value, but the approach should change in order to support other types of APIs
    let deferredPromises = {
        getDeviceReady: [],
        didGrantNetworkPermissions: [],
        getVuforiaReady: [],
        doesDeviceHaveDepthSensor: []
    };

    exports.getDeviceReady = makeAPI(deferredPromises.getDeviceReady, app.getDeviceReady.bind(app), '_getDeviceReadyCallback');
    exports._getDeviceReadyCallback = makeAPICallback(deferredPromises.getDeviceReady);

    exports.didGrantNetworkPermissions = makeAPI(deferredPromises.didGrantNetworkPermissions, app.didGrantNetworkPermissions.bind(app), '_didGrantNetworkPermissionsCallback');
    exports._didGrantNetworkPermissionsCallback = makeAPICallback(deferredPromises.didGrantNetworkPermissions);

    exports.getVuforiaReady = makeAPI(deferredPromises.getVuforiaReady, app.getVuforiaReady.bind(app), '_getVuforiaReadyCallback');
    exports._getVuforiaReadyCallback = makeAPICallback(deferredPromises.getVuforiaReady);

    exports.doesDeviceHaveDepthSensor = makeAPI(deferredPromises.doesDeviceHaveDepthSensor, app.doesDeviceHaveDepthSensor.bind(app), '_doesDeviceHaveDepthSensorCallback');
    exports._doesDeviceHaveDepthSensorCallback = makeAPICallback(deferredPromises.doesDeviceHaveDepthSensor);
    
    exports.addNewMarker = makeUniqueAPI(app.addNewMarker.bind(app));
    
    exports.callbackProxies = {};
    exports.callbackUuidToDeferred = {};

    function makeUniqueAPI(appFunctionCall, localCallbackSignature) {

        return function() {

            let deferred = new Deferred(undefined, () => {
                delete realityEditor.app.promises.callbackProxies[functionUuid];
            });
            
            // realityEditor.app.promises.callbackUuidToDeferred[functionUuid] = deferred;

            const functionUuid = realityEditor.device.utilities.uuidTime();
            realityEditor.app.promises.callbackProxies[functionUuid] = function() {
                console.log('realityEditor.app.promises.' + localCallbackSignature);
                // realityEditor.app.promises.callbackProxies[functionUuid].apply(null, arguments);
                // realityEditor.app.promises[localCallbackSignature].apply(null, arguments);

                deferred.resolve.apply(null, arguments);
            };

            const argumentsPlusCallback = Array.from(arguments);
            argumentsPlusCallback.push('realityEditor.app.promises.callbackProxies.' + functionUuid);
            appFunctionCall.apply(null, argumentsPlusCallback); //arguments, 'realityEditor.app.promises.callbackProxies.' + functionUuid);
            return deferred.promise;
        }
    }

    // adapted from: https://stackoverflow.com/a/34637436 and https://www.30secondsofcode.org/articles/s/javascript-await-timeout
    class Deferred {
        constructor(maxDelay, onFinally) {
            let promiseList = [
                new Promise((resolve, reject) => {
                    this.reject = reject;
                    this.resolve = resolve;
                })
            ];
            if (typeof maxDelay !== 'undefined') {
                promiseList.push(
                    new Promise((resolve, reject) => {
                        setTimeout(() => {
                            reject('API Timeout (' + maxDelay + 'ms)');
                        }, maxDelay)
                    })
                );
            }
            this.promise = Promise.race(promiseList);
            this.promise.finally(onFinally); // use this to clean up state after it's done
        }
    }

    function makeAPI(deferredPromiseList, appFunctionCall, localCallbackSignature) {
        return function(timeoutMs = undefined) { // timeout is optional, and will cause the API to reject if it exceeds this length
            let deferred = new Deferred(timeoutMs, () => {
                deferredPromiseList.splice(deferredPromiseList.indexOf(deferred), 1);
            });
            deferredPromiseList.push(deferred);
            appFunctionCall('realityEditor.app.promises.' + localCallbackSignature);
            return deferred.promise;
        }
    }

    function makeAPICallback(deferredPromiseList) {
        return function() {
            deferredPromiseList.forEach(deferred => {
                deferred.resolve.apply(null, arguments);
            });
        }
    }

})(realityEditor.app.promises);
