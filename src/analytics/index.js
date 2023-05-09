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

    /**
     * @return {Analytics}
     */
    function getActiveAnalytics() {
        return analyticsByFrame[activeFrame];
    }
    exports.getActiveAnalytics = getActiveAnalytics;

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

    function initService() {
        activeFrame = noneFrame;
        analyticsByFrame[noneFrame] = makeAnalytics(noneFrame);
        analyticsByFrame[noneFrame].show3D();

        realityEditor.network.addPostMessageHandler('analyticsOpen', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                analyticsByFrame[msgData.frame] = makeAnalytics(msgData.frame);
            }
            activeFrame = msgData.frame;
            getActiveAnalytics().open();
            realityEditor.app.enableHumanTracking();
        });

        realityEditor.network.addPostMessageHandler('analyticsClose', (msgData) => {
            if (!analyticsByFrame[msgData.frame] || activeFrame !== msgData.frame) {
                return;
            }
            getActiveAnalytics().close();

            // Could disable proactively, not a priority since it may lead to
            // unexpected behavior
            // realityEditor.app.disableHumanTracking();
        });

        realityEditor.network.addPostMessageHandler('analyticsFocus', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                analyticsByFrame[msgData.frame] = makeAnalytics(msgData.frame);
            }
            if (activeFrame !== msgData.frame) {
                getActiveAnalytics().blur();
            }
            activeFrame = msgData.frame;
            getActiveAnalytics().focus();
        });

        realityEditor.network.addPostMessageHandler('analyticsBlur', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].blur();
        });

        realityEditor.network.addPostMessageHandler('analyticsSetCursorTime', (msgData) => {
            getActiveAnalytics().setCursorTime(msgData.time);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetHighlightRegion', (msgData) => {
            getActiveAnalytics().setHighlightRegion(msgData.highlightRegion);
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

        realityEditor.network.addPostMessageHandler('analyticsSetLens', (msgData) => {
            getActiveAnalytics().setLens(msgData.lens);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetLensDetail', (msgData) => {
            getActiveAnalytics().setLensDetail(msgData.lensDetail);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetSpaghettiAttachPoint', (msgData) => {
            getActiveAnalytics().setSpaghettiAttachPoint(msgData.spaghettiAttachPoint);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetSpaghettiVisible', (msgData) => {
            getActiveAnalytics().setSpaghettiVisible(msgData.spaghettiVisible);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetAllClonesVisible', (msgData) => {
            getActiveAnalytics().setSpaghettiVisible(msgData.allClonesVisible);
        });
    }
    exports.initService = initService;
}(realityEditor.analytics));

export const initService = realityEditor.analytics.initService;
