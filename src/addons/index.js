createNameSpace("realityEditor.addons");

(function(exports) {
    // Fetch the list of all add-ons to inject
    fetch('/addons/sources').then((res) => {
        return res.json();
    }).then((addonSources) => {
        // Inject all scripts, counting on them to load asynchronously and add
        // their own callbacks
        for (const source of addonSources) {
            const scriptNode = document.createElement('script');
            scriptNode.src = source;
            document.head.appendChild(scriptNode);
        }
    });

    const callbacks = {
        init: [],
        networkSetSettings: [],
    };

    // Whether our onInit function has been called
    let initialized = false;

    /**
     * On init call all init callbacks
     */
    function onInit() {
        initialized = true;
        callbacks['init'].forEach(cb => {
            cb();
        });
    }

    /**
     * On receiving a network message with a setSettings payload call all
     * callbacks
     * @param {Object} setSettings - the payload
     */
    function onNetworkSetSettings(setSettings) {
        callbacks['networkSetSettings'].forEach(cb => {
            cb(setSettings);
        });
    }

    /**
     * Add a callback to an event, throws if eventName is unknown
     * @param {string} eventName
     * @param {Function} callback
     */
    function addCallback(eventName, callback) {
        callbacks[eventName].push(callback);

        // Invoke onInit callbacks if they missed the boat
        if (eventName === 'init' && initialized) {
            callback();
        }
    }

    exports.onInit = onInit;
    exports.onNetworkSetSettings = onNetworkSetSettings;
    exports.addCallback = addCallback;
}(realityEditor.addons));
