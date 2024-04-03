createNameSpace('realityEditor.gui.settings.setupSettingsMenu');

(function(exports) {
    
    function initService() {
        // populate the default settings menus with toggle switches and text boxes, with associated callbacks
        realityEditor.gui.settings.addToggleWithText('Zone', 'limit object discovery to zone', 'zoneState', '../../../svg/zone.svg', false, 'enter zone name',
            function(_newValue) {
                // console.log('zone mode was set to ' + newValue);
            },
            function(_newValue) {
                // console.log('zone text was set to ' + newValue);
            }
        );

        realityEditor.gui.settings.addToggle('Power-Save Mode', 'turns off some effects for faster performance', 'powerSaveMode',  '../../../svg/powerSave.svg', false, function(newValue) {
            // only draw frame ghosts while in programming mode if we're not in power-save mode
            globalStates.renderFrameGhostsInNodeViewEnabled = !newValue;
        });

        realityEditor.gui.settings.addToggle('Grouping', 'double-tap background to draw group around frames', 'groupingEnabled',  '../../../svg/grouping.svg', false, function(newValue) {
            realityEditor.gui.ar.grouping.toggleGroupingMode(newValue);
        });

        realityEditor.gui.settings.addToggle('Realtime Collaboration', 'constantly synchronizes with other users', 'realtimeEnabled',  '../../../svg/realtime.svg', true, function(newValue) {
            if (newValue) {
                realityEditor.network.realtime.initService();
            } else {
                realityEditor.network.realtime.pauseRealtime();
            }
            // TODO: turning this off currently doesn't actually end the realtime mode unless you restart the app
        });

        realityEditor.gui.settings.addToggle('Show Tutorial', 'add tutorial frame on app start', 'tutorialState',  '../../../svg/tutorial.svg', false, function(_newValue) {
            // console.log('tutorial mode was set to ' + newValue);
        });

        let introToggle = realityEditor.gui.settings.addToggle('Show Intro Page', 'shows tips on app start', 'introTipsState',  '../../../svg/tutorial.svg', false, function(newValue) {
            if (newValue) {
                window.localStorage.removeItem('neverAgainShowIntroTips');
            } else {
                window.localStorage.setItem('neverAgainShowIntroTips', 'true');
            }
        });

        // add settings toggles for the Develop sub-menu

        realityEditor.gui.settings.addToggle('AR-UI Repositioning', 'instantly drag frames instead of interacting', 'editingMode',  '../../../svg/move.svg', false, function(newValue) {
            realityEditor.device.setEditingMode(newValue);
        }).moveToDevelopMenu();

        realityEditor.gui.settings.addToggle('Clear Sky Mode', 'hides all buttons', 'clearSkyState',  '../../../svg/clear.svg', false, function(_newValue) {
            // console.log('clear sky mode set to ' + newValue);
        }).moveToDevelopMenu();

        realityEditor.gui.settings.addToggleWithFrozenText('Interface URL', 'currently: ' + window.location.href, 'externalState',  '../../../svg/download.svg', false, (realityEditor.network.useHTTPS ? 'https' : 'http') + '://...', function(newValue, textValue) {

            if (newValue && textValue.length > 0) {
                // we still need to save this to native device storage to be backwards-compatible with how the interface is loaded
                realityEditor.app.saveExternalText(textValue);

                let isCurrentUrl = window.location.href.includes(textValue);
                if (!isCurrentUrl) {
                    setTimeout(function() { // load from external server when toggled on with a new url
                        realityEditor.app.appFunctionCall("loadNewUI", {reloadURL: textValue});
                    }.bind(this), 1000);
                }
            } else {
                realityEditor.app.saveExternalText('');
                setTimeout(function() { // reload from local server when toggled off
                    realityEditor.app.appFunctionCall("loadNewUI", {reloadURL: ''});
                }.bind(this), 1000);
            }

        }, { ignoreOnload: true }).moveToDevelopMenu().setValue(!window.location.href.includes('127.0.0.1') && !window.location.href.includes('localhost')); // default value is based on the current source

        realityEditor.gui.settings.addToggleWithFrozenText('Discovery Server', 'load objects from static server', 'discoveryState',  '../../../svg/discovery.svg', false, (realityEditor.network.useHTTPS ? 'https' : 'http') + '://...', function(newValue, textValue) {
            if (newValue) {
                setTimeout(function() {
                    realityEditor.network.discoverObjectsFromServer(textValue);
                }, 1000); // wait to make sure all the necessary modules for object discovery/creation are ready
            }

        }).moveToDevelopMenu();

        realityEditor.gui.settings.addToggle('Demo Aspect Ratio', 'set screen ratio to 16:9', 'demoAspectRatio',  '../../../svg/cameraZoom.svg', false, function() {
            const currentRatio = globalStates.height / globalStates.width;
            if (Math.abs(currentRatio - (16/9)) < 0.001) {
                realityEditor.app.setAspectRatio(0); // Resets to default
            } else {
                realityEditor.app.setAspectRatio(16/9);
            }
        }, { ignoreOnload: true }).moveToDevelopMenu();

        // Add a debug toggle to the develop menu that forces the targetDownloader to re-download each time instead of using the cache
        realityEditor.gui.settings.addToggle('Reset Target Cache', 'clear cache of downloaded target data', 'resetTargetCache',  '../../../svg/object.svg', false, function(newValue) {
            if (newValue) {
                realityEditor.app.targetDownloader.resetTargetDownloadCache();
            }
        }).moveToDevelopMenu();

        // Add a debug toggle to the develop menu that forces the targetDownloader to re-download each time instead of using the cache
        realityEditor.gui.settings.addToggle('Disable Unloading', 'don\'t unload offscreen tools', 'disableUnloading',  '../../../svg/object.svg', false, function(newValue) {
            globalStates.disableUnloading = newValue;
            // if (newValue) {
            //     // realityEditor.app.targetDownloader.resetTargetDownloadCache();
            // }
        }).moveToDevelopMenu();

        let enablePoseTrackingTimeout = null;
        // Add a toggle to enable virtualization features
        realityEditor.gui.settings.addToggle('Virtualization', 'enable virtualization and pose detection', 'enableVirtualization',  '../../../svg/object.svg', false, function(newValue) {
            if (newValue) {
                function enablePoseTracking() {
                    let bestWorldObject = realityEditor.worldObjects.getBestWorldObject();
                    if (!bestWorldObject || bestWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
                        enablePoseTrackingTimeout = setTimeout(enablePoseTracking, 100);
                        return;
                    }
                    realityEditor.app.appFunctionCall("enablePoseTracking", {ip: bestWorldObject.ip});

                    let recordButton = document.getElementById('recordPointCloudsButton');
                    if (!recordButton) {
                        recordButton = document.createElement('img');
                        recordButton.src = '../../../svg/recordButton3D-start.svg';
                        recordButton.id = 'recordPointCloudsButton';
                        document.body.appendChild(recordButton);

                        recordButton.addEventListener('pointerup', _e => {
                            if (recordButton.classList.contains('pointCloudButtonActive')) {
                                recordButton.classList.remove('pointCloudButtonActive');
                                recordButton.src = '../../../svg/recordButton3D-start.svg';
                                realityEditor.device.videoRecording.stop3DVideoRecording();
                            } else {
                                recordButton.classList.add('pointCloudButtonActive');
                                recordButton.src = '../../../svg/recordButton3D-stop.svg';
                                realityEditor.device.videoRecording.start3DVideoRecording();
                            }
                        });
                    }
                    recordButton.classList.remove('hiddenButtons');
                }
                enablePoseTracking();
            } else {
                if (enablePoseTrackingTimeout) {
                    clearTimeout(enablePoseTrackingTimeout);
                    enablePoseTrackingTimeout = null;
                }
                realityEditor.app.appFunctionCall("disablePoseTracking", {});
                let recordButton = document.getElementById('recordPointCloudsButton');
                if (recordButton) {
                    recordButton.classList.add('hiddenButtons');
                }
            }
        }, {ignoreOnload: true, dontPersist: true}).moveToDevelopMenu();

        let toggleCloudUrl = realityEditor.gui.settings.addURLView('Cloud URL', 'link to access your metaverse', 'cloudUrl', '../../../svg/zone.svg', false, 'unavailable',
            function(_newValue) {
                // console.log('user wants cloudConnection to be', newValue);
            },
            function(_newValue) {
                // console.log('cloud url text was set to', newValue);
            }
        );
        let toggleNewNetworkId = realityEditor.gui.settings.addToggleWithFrozenText('New Network ID', 'generate new network id for cloud connection', 'generateNewNetworkId',  '../../../svg/object.svg', false, 'unknown', function(_newValue) {
            // console.log('user wants newNetworkId to be', newValue);
        });
        let toggleNewSecret = realityEditor.gui.settings.addToggleWithFrozenText('New Secret', 'generate new secret for cloud connection', 'generateNewSecret',  '../../../svg/object.svg', false, 'unknown', function(_newValue) {
            // console.log('user wants newSecret to be', newValue);
        });

        let cachedSettings = {};
        const localSettingsHost = `localhost:${realityEditor.device.environment.getLocalServerPort()}`;

        function processNewSettings(settings) {
            let anyChanged = false;
            if (cachedSettings.isConnected !== settings.isConnected) {
                toggleCloudUrl.onToggleCallback(settings.isConnected);
                anyChanged = true;
            }
            if ((cachedSettings.serverUrl !== settings.serverUrl) ||
                (cachedSettings.networkUUID !== settings.networkUUID) ||
                (cachedSettings.networkSecret !== settings.networkSecret)) {
                anyChanged = true;
                toggleCloudUrl.onTextCallback(`https://${settings.serverUrl}/stable` +
                    `/n/${settings.networkUUID}` +
                    `/s/${settings.networkSecret}`);
                toggleNewNetworkId.onTextCallback(settings.networkUUID);
                toggleNewSecret.onTextCallback(settings.networkSecret);
            }
            cachedSettings = settings;
            if (anyChanged) {
                document.getElementById("settingsIframe").contentWindow.postMessage(JSON.stringify({
                    getSettings: realityEditor.gui.settings.generateGetSettingsJsonMessage(),
                    getMainDynamicSettings: realityEditor.gui.settings.generateDynamicSettingsJsonMessage(realityEditor.gui.settings.MenuPages.MAIN)
                }), "*");
            }
        }

        // If we're viewing this on localhost we can connect to and read settings
        // from the local server
        if (window.location.host.split(':')[0] === localSettingsHost.split(':')[0]) {
            fetch(`${realityEditor.network.useHTTPS ? 'https' : 'http'}://${localSettingsHost}/hardwareInterface/edgeAgent/settings`).then(res => res.json()).then(settings => {
                processNewSettings(settings);
            });
        }
        // Update settings when changed
        realityEditor.network.realtime.subscribeToInterfaceSettings('edgeAgent', settings => {
            processNewSettings(settings);
        });
        
    }
    exports.initService = initService;

})(realityEditor.gui.settings.setupSettingsMenu);
