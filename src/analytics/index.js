createNameSpace("realityEditor.analytics");

import {Analytics} from './analytics.js'
import {AnalyticsMobile} from './AnalyticsMobile.js'

(function(exports) {
    /**
     * @param {string} frame - frame id associated with instance of
     * analytics
     */
    function makeAnalytics(frame) {
        if (realityEditor.device.environment.isDesktop()) {
            return new Analytics(frame);
        } else {
            return new AnalyticsMobile(frame);
        }
    }

    const noneFrame = 'none';
    let activeFrame = '';
    let analyticsByFrame = {};
    
    function getDefaultAnalytics() {
        return analyticsByFrame[noneFrame];
    }
    exports.getDefaultAnalytics = getDefaultAnalytics;

    /**
     * @return {Analytics}
     */
    function getActiveAnalytics() {
        return analyticsByFrame[activeFrame];
    }
    exports.getActiveAnalytics = getActiveAnalytics;
    
    function getAnalyticsByFrame(frame) {
        return analyticsByFrame[frame];
    }
    exports.getAnalyticsByFrame = getAnalyticsByFrame;

    /**
     * @return {HumanPoseAnalyzer}
     */
    function getActiveHumanPoseAnalyzer() {
        let analytics = getActiveAnalytics();
        if (!analytics) {
            return;
        }
        return analytics.humanPoseAnalyzer;
    }
    exports.getActiveHumanPoseAnalyzer = getActiveHumanPoseAnalyzer;

    /**
     * @return {Timeline}
     */
    function getActiveTimeline() {
        let analytics = getActiveAnalytics();
        if (!analytics) {
            return;
        }
        return analytics.timeline;
    }
    exports.getActiveTimeline = getActiveTimeline;

    function onVehicleDeleted(event) {
        if (!event.objectKey || !event.frameKey || event.nodeKey) {
            return;
        }
        if (!analyticsByFrame[event.frameKey]) {
            return;
        }
        analyticsByFrame[event.frameKey].close();
        delete analyticsByFrame[event.frameKey];
        if (activeFrame === event.frameKey) {
            activeFrame = noneFrame;
        }
    }

    function initService() {
        activeFrame = noneFrame;
        analyticsByFrame[noneFrame] = makeAnalytics(noneFrame);
        analyticsByFrame[noneFrame].show3D();
        const settingsUi = analyticsByFrame[noneFrame].humanPoseAnalyzer.settingsUi;
        if (settingsUi) {
            settingsUi.markLive();
        }

        realityEditor.network.addPostMessageHandler('analyticsOpen', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                analyticsByFrame[msgData.frame] = makeAnalytics(msgData.frame);
            }
            activeFrame = msgData.frame;
            analyticsByFrame[msgData.frame].open();
            realityEditor.app.enableHumanTracking();
        });

        realityEditor.network.addPostMessageHandler('analyticsClose', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].close();
            if (activeFrame === msgData.frame) {
                activeFrame = noneFrame;
            }
        });

        realityEditor.network.addPostMessageHandler('analyticsFocus', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                analyticsByFrame[msgData.frame] = makeAnalytics(msgData.frame);
            }
            if (activeFrame !== msgData.frame) {
                const activeAnalytics = getActiveAnalytics();
                if (activeAnalytics !== realityEditor.analytics.getDefaultAnalytics()) {
                    activeAnalytics.blur(); // Default analytics should only lose 2D UI manually via menu bar
                }
            }
            activeFrame = msgData.frame;
            analyticsByFrame[msgData.frame].focus();
        });

        realityEditor.network.addPostMessageHandler('analyticsBlur', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].blur();
            if (activeFrame === msgData.frame) {
                activeFrame = noneFrame;
            }
        });

        realityEditor.network.addPostMessageHandler('analyticsSetDisplayRegion', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].setDisplayRegion(msgData.displayRegion);
        });

        realityEditor.network.addPostMessageHandler('analyticsHydrateRegionCards', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].hydrateRegionCards(msgData.regionCards);
        });

        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', onVehicleDeleted); // deleted using server
    }
    exports.initService = initService;
}(realityEditor.analytics));

export const initService = realityEditor.analytics.initService;
