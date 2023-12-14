createNameSpace("realityEditor.motionStudy");

import {MotionStudy} from './motionStudy.js'
import {MotionStudyMobile} from './MotionStudyMobile.js'

(function(exports) {
    /**
     * @param {string} frame - frame id associated with instance of
     * motionStudy
     */
    function makeMotionStudy(frame) {
        if (realityEditor.device.environment.isDesktop()) {
            return new MotionStudy(frame);
        } else {
            return new MotionStudyMobile(frame);
        }
    }

    const noneFrame = 'none';
    let activeFrame = '';
    let motionStudyByFrame = {};
    
    function getDefaultMotionStudy() {
        return motionStudyByFrame[noneFrame];
    }
    exports.getDefaultMotionStudy = getDefaultMotionStudy;

    /**
     * @return {MotionStudy}
     */
    function getActiveMotionStudy() {
        return motionStudyByFrame[activeFrame];
    }
    exports.getActiveMotionStudy = getActiveMotionStudy;
    
    function getMotionStudyByFrame(frame) {
        return motionStudyByFrame[frame];
    }
    exports.getMotionStudyByFrame = getMotionStudyByFrame;

    /**
     * @return {HumanPoseAnalyzer}
     */
    function getActiveHumanPoseAnalyzer() {
        let motionStudy = getActiveMotionStudy();
        if (!motionStudy) {
            return;
        }
        return motionStudy.humanPoseAnalyzer;
    }
    exports.getActiveHumanPoseAnalyzer = getActiveHumanPoseAnalyzer;

    /**
     * @return {Timeline}
     */
    function getActiveTimeline() {
        let motionStudy = getActiveMotionStudy();
        if (!motionStudy) {
            return;
        }
        return motionStudy.timeline;
    }
    exports.getActiveTimeline = getActiveTimeline;

    function onVehicleDeleted(event) {
        if (!event.objectKey || !event.frameKey || event.nodeKey) {
            return;
        }
        if (!motionStudyByFrame[event.frameKey]) {
            return;
        }
        motionStudyByFrame[event.frameKey].close();
        delete motionStudyByFrame[event.frameKey];
        if (activeFrame === event.frameKey) {
            activeFrame = noneFrame;
        }
    }

    function initService() {
        activeFrame = noneFrame;
        motionStudyByFrame[noneFrame] = makeMotionStudy(noneFrame);
        motionStudyByFrame[noneFrame].show3D();
        const settingsUi = motionStudyByFrame[noneFrame].humanPoseAnalyzer.settingsUi;
        if (settingsUi) {
            settingsUi.markLive();
        }

        realityEditor.network.addPostMessageHandler('analyticsOpen', (msgData) => {
            if (!motionStudyByFrame[msgData.frame]) {
                motionStudyByFrame[msgData.frame] = makeMotionStudy(msgData.frame);
            }
            activeFrame = msgData.frame;
            motionStudyByFrame[msgData.frame].open();
            realityEditor.app.enableHumanTracking();
        });

        realityEditor.network.addPostMessageHandler('analyticsClose', (msgData) => {
            if (!motionStudyByFrame[msgData.frame]) {
                return;
            }
            motionStudyByFrame[msgData.frame].close();
            if (activeFrame === msgData.frame) {
                activeFrame = noneFrame;
            }
        });

        realityEditor.network.addPostMessageHandler('analyticsFocus', (msgData) => {
            if (!motionStudyByFrame[msgData.frame]) {
                motionStudyByFrame[msgData.frame] = makeMotionStudy(msgData.frame);
            }
            if (activeFrame !== msgData.frame) {
                const activeMotionStudy = getActiveMotionStudy();
                if (activeMotionStudy !== realityEditor.motionStudy.getDefaultMotionStudy()) {
                    activeMotionStudy.blur(); // Default motionStudy should only lose 2D UI manually via menu bar
                }
            }
            activeFrame = msgData.frame;
            motionStudyByFrame[msgData.frame].focus();
        });

        realityEditor.network.addPostMessageHandler('analyticsBlur', (msgData) => {
            if (!motionStudyByFrame[msgData.frame]) {
                return;
            }
            motionStudyByFrame[msgData.frame].blur();
            if (activeFrame === msgData.frame) {
                activeFrame = noneFrame;
            }
        });

        realityEditor.network.addPostMessageHandler('analyticsSetDisplayRegion', (msgData) => {
            if (!motionStudyByFrame[msgData.frame]) {
                return;
            }
            motionStudyByFrame[msgData.frame].setDisplayRegion(msgData.displayRegion);
        });

        realityEditor.network.addPostMessageHandler('analyticsHydrate', (msgData) => {
            if (!motionStudyByFrame[msgData.frame]) {
                return;
            }
            motionStudyByFrame[msgData.frame].hydrateMotionStudy(msgData.analyticsData);
        });

        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', onVehicleDeleted); // deleted using server
    }
    exports.initService = initService;
}(realityEditor.motionStudy));

export const initService = realityEditor.motionStudy.initService;
