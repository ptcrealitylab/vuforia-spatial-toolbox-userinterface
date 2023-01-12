createNameSpace("realityEditor.analytics");

import {Analytics} from './analytics.js'

(function(exports) {
    exports.analytics = new Analytics();
    exports.analytics.initService = function() {
        exports.analytics.add();
    };
}(realityEditor));

export const initService = realityEditor.analytics.initService;

