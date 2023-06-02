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

    function initService() {
        activeFrame = noneFrame;
        analyticsByFrame[noneFrame] = makeAnalytics(noneFrame);
        analyticsByFrame[noneFrame].show3D();

        realityEditor.network.addPostMessageHandler('analyticsOpen', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                analyticsByFrame[msgData.frame] = makeAnalytics(msgData.frame);
            }
            activeFrame = msgData.frame;
            analyticsByFrame[msgData.frame].open();
            realityEditor.app.enableHumanTracking();
        });

        realityEditor.network.addPostMessageHandler('analyticsClose', (msgData) => {
            if (!analyticsByFrame[msgData.frame] || activeFrame !== msgData.frame) {
                return;
            }
            activeFrame = noneFrame;
            analyticsByFrame[msgData.frame].close();
        });

        realityEditor.network.addPostMessageHandler('analyticsFocus', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                analyticsByFrame[msgData.frame] = makeAnalytics(msgData.frame);
            }
            if (activeFrame !== msgData.frame) {
                getActiveAnalytics().blur();
            }
            activeFrame = msgData.frame;
            analyticsByFrame[msgData.frame].focus();
        });

        realityEditor.network.addPostMessageHandler('analyticsBlur', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            if (activeFrame === msgData.frame) {
                activeFrame = noneFrame;
            }
            analyticsByFrame[msgData.frame].blur();
        });

        realityEditor.network.addPostMessageHandler('analyticsSetCursorTime', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].setCursorTime(msgData.time);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetHighlightRegion', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].setHighlightRegion(msgData.highlightRegion);
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
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].setLens(msgData.lens);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetLensDetail', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].setLensDetail(msgData.lensDetail);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetSpaghettiAttachPoint', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].setSpaghettiAttachPoint(msgData.spaghettiAttachPoint);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetSpaghettiVisible', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].setSpaghettiVisible(msgData.spaghettiVisible);
        });

        realityEditor.network.addPostMessageHandler('analyticsSetAllClonesVisible', (msgData) => {
            if (!analyticsByFrame[msgData.frame]) {
                return;
            }
            analyticsByFrame[msgData.frame].setSpaghettiVisible(msgData.allClonesVisible);
        });
    }
    exports.initService = initService;
}(realityEditor.analytics));

export const initService = realityEditor.analytics.initService;
