createNameSpace("realityEditor.analytics");

import {Analytics} from './analytics.js'
import {AnalyticsMock} from './AnalyticsMock.js'

(function(exports) {
    const DEBUG_ALWAYS_ADD = false;
    const analytics = realityEditor.device.environment.isDesktop() ?
        new Analytics() :
        new AnalyticsMock();
    exports.analytics = analytics;

    exports.analytics.initService = function() {
        if (DEBUG_ALWAYS_ADD) {
            exports.analytics.add();
        }

        realityEditor.network.addPostMessageHandler('analyticsAdd', () => {
            analytics.add();
        });

        realityEditor.network.addPostMessageHandler('analyticsRemove', () => {
            analytics.remove();
        });

        realityEditor.network.addPostMessageHandler('analyticsSetCursorTime', (msgData) => {
            analytics.setCursorTime(msgData.time);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetHighlightRegion', (msgData) => {
            analytics.setHighlightRegion(msgData.highlightRegion);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetDisplayRegion', (msgData) => {
            analytics.setDisplayRegion(msgData.displayRegion);
        });

        realityEditor.network.addPostMessageHandler('analyticsHydrateRegionCards', (msgData) => {
            analytics.hydrateRegionCards(msgData.regionCards);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetLens', (msgData) => {
            analytics.setLens(msgData.lens);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetLensDetail', (msgData) => {
            analytics.setLensDetail(msgData.lensDetail);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetSpaghettiAttachPoint', (msgData) => {
            analytics.setSpaghettiAttachPoint(msgData.spaghettiAttachPoint);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetSpaghettiVisible', (msgData) => {
            analytics.setSpaghettiVisible(msgData.spaghettiVisible);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetAllClonesVisible', (msgData) => {
            analytics.setSpaghettiVisible(msgData.allClonesVisible);
        });
    };
}(realityEditor));

export const initService = realityEditor.analytics.initService;

