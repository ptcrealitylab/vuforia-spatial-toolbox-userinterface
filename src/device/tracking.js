createNameSpace("realityEditor.device.tracking");

(function(exports) {

    let isRelocalizing = false;
    let timeRelocalizing = 0;
    let relocalizingStartTime = null;
    
    let currentStatusInfo = null;

    function initService() {
        realityEditor.app.subscribeToAppLifeCycleEvents('realityEditor.device.tracking.onAppLifeCycleEvent');

        realityEditor.app.callbacks.handleDeviceTrackingStatus(handleTrackingStatus);

        let cameraExists = realityEditor.sceneGraph && realityEditor.sceneGraph.getSceneNodeById('CAMERA');
        let isTrackingInitialized = false;
        if (cameraExists && !realityEditor.gui.ar.utilities.isIdentityMatrix(realityEditor.sceneGraph.getSceneNodeById('CAMERA').worldMatrix)) {
            isTrackingInitialized = true;
        }

        if (!isTrackingInitialized) {
            waitForTracking(true);
        }
    }

    function waitForTracking(noDescriptionText) {
        let headerText = 'Initializing AR Tracking...';
        let descriptionText = noDescriptionText ? '' : 'Move your camera around to speed up the process';
        
        let notification = realityEditor.gui.modal.showSimpleNotification(
            headerText, descriptionText,function () {
                console.log('closed...');
            }
        );

        realityEditor.app.callbacks.onTrackingInitialized(function() {
            notification.dismiss();
        });
    }

    function onAppLifeCycleEvent(eventName) {
        console.log('APP LIFE-CYCLE EVENT:');
        console.log(eventName);

        switch (eventName) {
            case 'appDidBecomeActive':
                // realityEditor.app.getCameraMatrixStream('realityEditor.app.callbacks.receiveCameraMatricesFromAR');
                break;
            case 'appWillResignActive':
                break;
            case 'appDidEnterBackground':
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
            console.log('limited tracking (' + trackingStatusInfo + ')');
            // show the UI
            showLimitedTrackingUI(trackingStatusInfo);
            currentStatusInfo = trackingStatusInfo;

            // switch (trackingStatusInfo) {
            //     case 'INITIALIZING':
            //         break;
            //     case 'RELOCALIZING':
            //         break;
            //     case 'EXCESSIVE_MOTION':
            //         break;
            //     case 'INSUFFICIENT_FEATURES':
            //         break;
            //     case 'INSUFFICIENT_LIGHT':
            //         break;
            //     case 'NO_DETECTION_RECOMMENDING_GUIDANCE':
            //         break;
            //     default:
            //         break;
            // }

            // if (trackingStatusInfo === 'INITIALIZING') {
            //    
            // } else if (trackingStatusInfo === 'RELOCALIZING') {
            //    
            // } else if (trackingStatusInfo === 'EXCESSIVE_MOTION') {
            //    
            // }

        } else {
            // hide the UI
            hideTrackingStatusUI();
            
            currentStatusInfo = null;
        }
    }

    function showLimitedTrackingUI(statusInfo) {
        let readableStatus = 'Limited AR tracking';
        let isLongMessage = false;

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

                if (timeRelocalizing > 4000) {
                    readableStatus = 'Trouble relocalizing - move device to the same position it was at when app' +
                        ' last closed, or tap here to restart AR tracking';
                    isLongMessage = true;
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
        let trackingStatusUI = document.getElementById('trackingStatusUI');
        let textContainer = document.getElementById('trackingStatusText')
        if (!trackingStatusUI) {
            trackingStatusUI = document.createElement('div');
            trackingStatusUI.id = 'trackingStatusUI';
            trackingStatusUI.classList.add('statusBar');
            document.body.appendChild(trackingStatusUI);
            
            textContainer = document.createElement('div');
            textContainer.id = 'trackingStatusText';
            trackingStatusUI.classList.add('statusBarText');
            trackingStatusUI.appendChild(textContainer);

            // trackingStatusUI.addEventListener('pointerup', statusBarPointerDown);
            trackingStatusUI.addEventListener('pointerup', statusBarPointerUp);
        }

        // show and populate with message
        trackingStatusUI.classList.remove('statusBarHidden');
        textContainer.innerText = readableStatus;
        
        if (isLongMessage) {
            trackingStatusUI.classList.add('statusTextLong');
        } else {
            trackingStatusUI.classList.remove('statusTextLong');
        }
    }

    function statusBarPointerUp() {
        if (currentStatusInfo === 'RELOCALIZING') {
            console.log('tapped on relocalizing banner');
            realityEditor.app.restartDeviceTracker();
        }
    }

    function hideTrackingStatusUI() {
        let trackingStatusUI = document.getElementById('trackingStatusUI');
        if (!trackingStatusUI) { return; } // no need to hide it if it doesn't exist

        trackingStatusUI.classList.add('statusBarHidden');
    }

    exports.initService = initService;
    exports.onAppLifeCycleEvent = onAppLifeCycleEvent; // public so accessible as native app API callback

}(realityEditor.device.tracking));
