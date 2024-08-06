createNameSpace("realityEditor.motionStudy");

import {MotionStudy} from './motionStudy.js';
import {MotionStudyMobile} from './MotionStudyMobile.js';
import {MotionStudySensors} from './MotionStudySensors.js';
import {StepAnimationManager} from './StepAnimationManager.js';

(function(exports) {
    /**
     * @param {string} frame - frame id associated with instance of
     * motionStudy
     */
    function makeMotionStudy(frame) {
        if (realityEditor.device.environment.isDesktop()) {
            return new MotionStudy(frame, sensors);
        } else {
            return new MotionStudyMobile(frame, sensors);
        }
    }

    const noneFrame = 'none';
    let activeFrame = '';
    let motionStudyByFrame = {};
    let sensors = new MotionStudySensors();
    let synchronizationEnabled = true;
    
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

    /**
     * For every current motion study, show any region card with
     * step info matching regionCard
     * @param {RegionCard} regionCard
     */
    function showMatchingRegionCards(regionCard) {
        if (!synchronizationEnabled) {
            return;
        }
        const animations = [];

        for (const frameKey in motionStudyByFrame) {
            const motionStudy = motionStudyByFrame[frameKey];
            let didShow = motionStudy.showMatchingRegionCard(regionCard);
            if (!didShow) {
                continue;
            }
            animations.push(motionStudy.humanPoseAnalyzer.animation);
        }

        if (animations.length > 0) {
            let stepAnimationManager = new StepAnimationManager(animations);

            stepAnimationManager.update();
        }
    }
    exports.showMatchingRegionCards = showMatchingRegionCards;

    /**
     * Whether to synchronize across motion studies
     * @param {boolean} enabled
     */
    function setSynchronizationEnabled(enabled) {
        synchronizationEnabled = enabled;
    }
    exports.setSynchronizationEnabled = setSynchronizationEnabled;

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
            realityEditor.app.disableHumanTracking();
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

        realityEditor.network.addPostMessageHandler('analyticsSetSensor', (msgData) => {
            console.log('set sensor', msgData);
            sensors.setSensor(msgData.frame, msgData.sensor);
        });

        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted); // deleted using userinterface
        realityEditor.network.registerCallback('vehicleDeleted', onVehicleDeleted); // deleted using server

        sensors.attachListeners();
    }
    exports.initService = initService;
}(realityEditor.motionStudy));

export const initService = realityEditor.motionStudy.initService;
