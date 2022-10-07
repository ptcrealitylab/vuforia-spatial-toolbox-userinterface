createNameSpace("realityEditor.app.promises");

// provides a simpler interface to the native APIs
(function(exports) {
    // assume APIs fail if they take longer than 3 seconds to resolve, they should be almost instantaneous
    const TIMEOUT = 3000;
    const app = realityEditor.app;

    // promises must be resolved externally due to the inner workings of how callbacks signatures get passed to swift
    let deferredPromises = {
        getDeviceReady: [],
        doesDeviceHaveDepthSensor: [],
        didGrantNetworkPermissions: []
    };

    exports.getDeviceReady = makeAPI(deferredPromises.getDeviceReady, app.getDeviceReady.bind(app), '_getDeviceReadyCallback');
    exports._getDeviceReadyCallback = makeAPICallback(deferredPromises.getDeviceReady);

    exports.didGrantNetworkPermissions = makeAPI(deferredPromises.didGrantNetworkPermissions, app.didGrantNetworkPermissions.bind(app), '_didGrantNetworkPermissionsCallback');
    exports._didGrantNetworkPermissionsCallback = makeAPICallback(deferredPromises.didGrantNetworkPermissions);

    exports.getVuforiaReady = makeAPI(deferredPromises.getVuforiaReady, app.getVuforiaReady.bind(app), '_getVuforiaReadyCallback');
    exports._getVuforiaReadyCallback = makeAPICallback(deferredPromises.getVuforiaReady);

    exports.doesDeviceHaveDepthSensor = makeAPI(deferredPromises.doesDeviceHaveDepthSensor, app.doesDeviceHaveDepthSensor.bind(app), '_doesDeviceHaveDepthSensorCallback');
    exports._doesDeviceHaveDepthSensorCallback = makeAPICallback(deferredPromises.doesDeviceHaveDepthSensor);


    // adapted from: https://stackoverflow.com/a/34637436 and https://www.30secondsofcode.org/articles/s/javascript-await-timeout
    class Deferred {
        constructor(maxDelay, onFinally) {
            this.promise = Promise.race([
                new Promise((resolve, reject) => {
                    this.reject = reject;
                    this.resolve = resolve;
                }),
                new Promise(resolve => {
                    setTimeout(() => {
                        resolve(); // todo: should this be a reject?
                    }, maxDelay)
                })
            ]);
            this.promise.finally(onFinally); // use this to clean up state after it's done
        }
    }

    function makeAPI(deferredPromiseList, appFunctionCall, localCallbackSignature) {
        return function() {
            let deferred = new Deferred(TIMEOUT, () => {
                deferredPromiseList.splice(deferredPromiseList.indexOf(deferred), 1);
            });
            deferredPromiseList.push(deferred);
            appFunctionCall('realityEditor.app.promises.' + localCallbackSignature);
            // realityEditor.app.getDeviceReady('realityEditor.app.promises._getDeviceReadyCallback');
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
