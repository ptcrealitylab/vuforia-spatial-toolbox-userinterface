createNameSpace("realityEditor.addons");

(function(exports) {
    // Fetch the list of all add-ons to inject
    fetch('/addons/sources').then((res) => {
        return res.json();
    }).then((addonSources) => {
        // Inject all scripts, counting on them to load asynchronously and add
        // their own callbacks
        for (let source of addonSources) {
            const scriptNode = document.createElement('script');
            if (source.startsWith('/')) {
              source = '.' + source;
            }
            scriptNode.src = source;
            scriptNode.type = 'module';
            document.head.appendChild(scriptNode);
        }
    });

    // Also fetch CSS addons
    fetch('/addons/styles').then((res) => {
        return res.json();
    }).then((addonSources) => {
        // Inject all stylesheets
        for (const source of addonSources) {
            const styleNode = document.createElement('link');
            styleNode.rel = 'stylesheet';
            styleNode.type = 'text/css';
            styleNode.href = source;
            document.head.appendChild(styleNode);
        }
    });

    // Also fetch image resources and store references to them at the correct path
    let resourcePaths = [];
    fetch('/addons/resources').then((res) => {
        return res.json();
    }).then((addonSources) => {
        resourcePaths = addonSources;
        onResourcesLoaded(addonSources);
    });

    const callbacks = {
        init: [],
        networkSetSettings: [],
        resourcesLoaded: []
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
     * When img resource paths are retrieved from the server, call all callbacks
     * @param {Array.<string>} resourcePaths
     */
    function onResourcesLoaded(resourcePaths) {
        callbacks['resourcesLoaded'].forEach(cb => {
            cb(JSON.parse(JSON.stringify(resourcePaths)));
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

        if (eventName === 'resourcesLoaded' && resourcePaths.length > 0) {
            callback(resourcePaths);
        }
    }

    exports.onInit = onInit;
    exports.onNetworkSetSettings = onNetworkSetSettings;
    exports.addCallback = addCallback;
}(realityEditor.addons));
