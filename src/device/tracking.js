createNameSpace("realityEditor.device.tracking");

/**
 * @fileOverview
 * This module is responsible for responding to information about the device's tracking state and capabilities,
 * It can enable/disable/restart behavior as needed and communicate the tracking status to the user.
 */
(function(exports) {

    let isRelocalizing = false;
    let timeRelocalizing = 0;
    let relocalizingStartTime = null;
    
    let currentStatusInfo = null;

    function initService() {
        realityEditor.app.subscribeToAppLifeCycleEvents('realityEditor.device.tracking.onAppLifeCycleEvent');

        realityEditor.app.callbacks.handleDeviceTrackingStatus(handleTrackingStatus);

        let cameraExists = realityEditor.sceneGraph && realityEditor.sceneGraph.getSceneNodeById('CAMERA');
        
        let isTrackingInitialized = !realityEditor.device.environment.waitForARTracking();
        
        if (cameraExists && !realityEditor.gui.ar.utilities.isIdentityMatrix(realityEditor.sceneGraph.getSceneNodeById('CAMERA').worldMatrix)) {
            isTrackingInitialized = true;
        }

        if (!isTrackingInitialized) {
            waitForTracking(true);
        }
    }

    function waitForTracking(noDescriptionText) {

        // hide all AR elements and canvas lines
        document.getElementById('GUI').classList.add('hiddenWhileLoading');
        document.getElementById('canvas').classList.add('hiddenWhileLoading');

        let headerText = 'Initializing AR Tracking...';
        let descriptionText = noDescriptionText ? '' : 'Move your camera around to speed up the process';
        
        let notification = realityEditor.gui.modal.showSimpleNotification(
            headerText, descriptionText, function () {
                console.log('closed...');
            }, realityEditor.device.environment.variables.layoutUIForPortrait);

        const dismissNotification = () => {
            document.getElementById('GUI').classList.remove('hiddenWhileLoading');
            document.getElementById('canvas').classList.remove('hiddenWhileLoading');
            notification.dismiss();
        };

        realityEditor.app.callbacks.onTrackingInitialized(dismissNotification);
        realityEditor.app.callbacks.onVuforiaInitFailure(dismissNotification);
    }

    function onAppLifeCycleEvent(eventName) {
        console.log('APP LIFE-CYCLE EVENT: ' + eventName);

        switch (eventName) {
            case 'appDidBecomeActive':
                break;
            case 'appWillResignActive':
                break;
            case 'appDidEnterBackground':
                // hide AR elements and show UI until we receive a new valid camera matrix
                waitForTracking();
                break;
            case 'appWillEnterForeground':
                break;
            case 'appWillTerminate':
                break;
            default:
                break;
        }
    }


    /*
     NORMAL,                             ///< Status is normal, ie not \ref NO_POSE or \ref LIMITED.
     UNKNOWN,                            ///< Unknown reason for the tracking status.
     INITIALIZING,                       ///< The tracking system is currently initializing.
     RELOCALIZING,                       ///< The tracking system is currently relocalizing.
     EXCESSIVE_MOTION,                   ///< The device is moving too fast.
     INSUFFICIENT_FEATURES,              ///< There are insufficient features available in the scene.
     INSUFFICIENT_LIGHT,                 ///< There is insufficient light available in the scene.
     NO_DETECTION_RECOMMENDING_GUIDANCE  ///< Could not snap the target
     */

    function handleTrackingStatus(trackingStatus, trackingStatusInfo) {
        if (trackingStatus === 'LIMITED') {
            // show the UI
            showLimitedTrackingUI(trackingStatusInfo);
            currentStatusInfo = trackingStatusInfo;

        } else {
            currentStatusInfo = null;
        }
    }

    function showLimitedTrackingUI(statusInfo) {
        let readableStatus = 'Limited AR tracking';

        switch (statusInfo) {
            case 'INITIALIZING':
                readableStatus += ' - Initializing';
                break;
            case 'RELOCALIZING':
                if (!isRelocalizing) {
                    relocalizingStartTime = Date.now();
                    isRelocalizing = true;
                } else {
                    timeRelocalizing = Date.now() - relocalizingStartTime;
                }

                // TODO: only bother relocalizing if any tools have been added to world local - otherwise it
                //  shouldn't matter whether you restart tracking immediately
                if (timeRelocalizing > 4000) {
                    if (willRelocalizingHaveEffect()) {
                        readableStatus = 'Trouble re-localizing - move device to the same position it was at when the app was last closed, or tap here to restart AR tracking';
                    } else {
                        realityEditor.app.restartDeviceTracker();
                    }
                } else {
                    readableStatus += ' - Re-localizing device';
                }
                break;
            case 'EXCESSIVE_MOTION':
                readableStatus += ' - Excessive motion';
                break;
            case 'INSUFFICIENT_FEATURES':
                readableStatus += ' - Insufficient features in view';
                break;
            case 'INSUFFICIENT_LIGHT':
                readableStatus += ' - View is too dark';
                break;
            case 'NO_DETECTION_RECOMMENDING_GUIDANCE':
                break;
            default:
                break;
        }
        
        if (statusInfo !== 'RELOCALIZING') {
            isRelocalizing = false;
            relocalizingStartTime = null;
            timeRelocalizing = 0;
        }

        // create UI if needed
        // showBannerNotification removes notification after set time so no additional function is needed
        let trackingStatusUI = document.getElementById('trackingStatusUI');
        if (!trackingStatusUI) {
            realityEditor.gui.modal.showBannerNotification(readableStatus, 'trackingStatusUI', 'trackingStatusText', 5000);
            let trackingStatusNotification = document.getElementById('trackingStatusUI');
            trackingStatusNotification.addEventListener('pointerup', statusBarPointerUp);
        }
    }

    function willRelocalizingHaveEffect() {
        // if there are no tools attached to _WORLD_local, it doesn't matter, so just restart instead of prompting user
        let localWorldObject = realityEditor.getObject(realityEditor.worldObjects.getLocalWorldId());
        return (localWorldObject && Object.keys(localWorldObject.frames).length > 0);
    }

    function statusBarPointerUp() {
        if (currentStatusInfo === 'RELOCALIZING') {
            console.log('tapped on relocalizing banner');
            realityEditor.app.restartDeviceTracker();
        }
    }

    exports.initService = initService;
    exports.onAppLifeCycleEvent = onAppLifeCycleEvent; // public so accessible as native app API callback

}(realityEditor.device.tracking));
