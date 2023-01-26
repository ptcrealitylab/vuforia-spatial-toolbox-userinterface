createNameSpace("realityEditor.analytics");

import {Analytics} from './analytics.js'

(function(exports) {
    const DEBUG_ALWAYS_ADD = false;

    exports.analytics = new Analytics();
    exports.analytics.initService = function() {
        if (DEBUG_ALWAYS_ADD) {
            exports.analytics.add();
        }
    };
}(realityEditor));

export const initService = realityEditor.analytics.initService;

