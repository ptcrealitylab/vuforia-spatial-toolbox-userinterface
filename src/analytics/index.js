createNameSpace("realityEditor.analytics");

import {Analytics} from './analytics.js'
import {AnalyticsMobile} from './AnalyticsMobile.js'

(function(exports) {
    const DEBUG_ALWAYS_OPEN = false;
    const analytics = realityEditor.device.environment.isDesktop() ?
        new Analytics() :
        new AnalyticsMobile();
    exports.analytics = analytics;

    exports.analytics.initService = function() {
        if (DEBUG_ALWAYS_OPEN) {
            exports.analytics.open();
        }

        realityEditor.network.addPostMessageHandler('analyticsOpen', (msgData) => {
            analytics.open(msgData.frame);
            realityEditor.app.enableHumanTracking();
        });

        realityEditor.network.addPostMessageHandler('analyticsClose', (msgData) => {
            analytics.close(msgData.frame);
            // Could disable proactively, not a priority since it may lead to
            // unexpected behavior
            // realityEditor.app.disableHumanTracking();
        });

        realityEditor.network.addPostMessageHandler('analyticsFocus', (msgData) => {
            analytics.focus(msgData.frame);
        });

        realityEditor.network.addPostMessageHandler('analyticsBlur', (msgData) => {
            analytics.blur(msgData.frame);
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

