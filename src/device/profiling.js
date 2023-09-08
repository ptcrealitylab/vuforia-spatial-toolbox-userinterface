createNameSpace("realityEditor.device.profiling");

import { ProfilerSettingsUI } from "../gui/ProfilerSettingsUI.js";

(function(exports) {
    let isShown = false;
    let isActivated = false;
    let profilerSettingsUI = null;

    let processTimes = {};
    let processCategories = {};
    let lastUpdateTimes = {};
    let displayCooldowns = {};

    function initService() {
        console.log('init profiling');
    }

    // computes the FNV-1a hash of a string - useful as a UUID for a stringified matrix
    function getShortHashForString(str) {
        let hash = 2166136261n; // Initialize to an offset_basis for FNV-1a 32bit
        for(let i = 0; i < str.length; i++) {
            hash ^= BigInt(str.charCodeAt(i));
            hash *= 16777619n;
        }
        return (hash & 0xFFFFFFFFn).toString(16).padStart(8, '0');
    }

    function startTimeProcess(processTitle, options = { useDateNow: false }) {
        if (!isShown) return;
        if (!isActivated) return;

        if (typeof processTimes[processTitle] === 'undefined') {
            processTimes[processTitle] = {};
        }
        processTimes[processTitle].start = options.useDateNow ? Date.now() : performance.now();
        if (options.numStopsRequired) {
            processTimes[processTitle].numStopsRequired = options.numStopsRequired;
            processTimes[processTitle].numStopsAccumulated = 0;
        }
    }

    function stopTimeProcess(processTitle, category, options = { showMessage: false, showAggregate: false, displayTimeout: 3000, exactTimestamp: null}) {
        if (!isShown) return;
        if (!isActivated) return;
        if (!profilerSettingsUI) return;

        let process = processTimes[processTitle];
        if (typeof process === 'undefined') {
            return;
        }

        if (typeof processTimes[processTitle].numStopsRequired !== 'undefined') {
            processTimes[processTitle].numStopsAccumulated += 1;
            if (processTimes[processTitle].numStopsAccumulated < processTimes[processTitle].numStopsRequired) {
                return; // wait until we receive enough stops
            }
        }

        process.end = options.exactTimestamp || performance.now();

        let timeBetweenCategoryUpdates = process.end - (lastUpdateTimes[category] || 0);
        // console.log('time between updates', timeBetweenCategoryUpdates);
        lastUpdateTimes[processTitle] = performance.now();

        if (category) {
            lastUpdateTimes[category] = lastUpdateTimes[processTitle];
        }

        if (!process.start || !process.end) return;

        let time = (process.end - process.start)
        let displayTime = time.toFixed(2);
        let numStopsText = processTimes[processTitle].numStopsAccumulated ? `(${processTimes[processTitle].numStopsAccumulated} stops)` : '';
        let labelText = `${processTitle}: ${yellow(displayTime)} ms ${numStopsText}`;

        setTimeout(() => {
            delete processTimes[processTitle];
        }, 10);
        
        if (options.showMessage) {
            logIndividualProcess(processTitle, labelText, options);
            // profilerSettingsUI.addOrUpdateLabel(processTitle, labelText);
            // // remove after 3 seconds if no updates between now and then
            // setTimeout(() => {
            //     let timeSinceLastUpdate = performance.now() - lastUpdateTimes[processTitle];
            //     if (timeSinceLastUpdate > (options.displayTimeout - 100)) {
            //         // console.log(`remove ${processTitle}`);
            //         profilerSettingsUI.removeLabel(processTitle);
            //     }
            // }, options.displayTimeout);
        }

        if (!category) return;
        if (!options.showAggregate) return;

        let info = updateCategory(category, time, timeBetweenCategoryUpdates);
        if (info) {
            // let count = info.processCategories[category].count;
            // let numResets = info.processCategories[category].numDisplayResets;
            let meanT = info.mean.toFixed(2);
            let minT = info.fastest.toFixed(2);
            let maxT = info.slowest.toFixed(2);

            // if (typeof displayCooldowns[category] !== 'undefined' && displayCooldowns[category] > 0) {
            //     displayCooldowns[category]--;
            //     return;
            // } // don't slow down process by rendering too often
            // displayCooldowns[category] = 5;

            let meanLabelText = `${category} (${info.count}) –– mean: ${yellow(meanT)} –– min: ${yellow(minT)} –– max: ${yellow(maxT)}`;
            profilerSettingsUI.addOrUpdateLabel(`mean_${category}`, meanLabelText, { pinToTop: true });
        } else {
            console.warn('no category info', category, processTitle, processCategories);
        }
    }
    
    function logIndividualProcess(processTitle, options = { displayTimeout: 3000, labelText: null }) {
        if (!isShown) return;
        if (!isActivated) return;
        if (!profilerSettingsUI) return;
        
        profilerSettingsUI.addOrUpdateLabel(processTitle, options.labelText || processTitle);
        
        // remove after 3 seconds if no updates between now and then
        setTimeout(() => {
            let timeSinceLastUpdate = performance.now() - lastUpdateTimes[processTitle];
            if (timeSinceLastUpdate > (options.displayTimeout - 100)) {
                // console.log(`remove ${processTitle}`);
                profilerSettingsUI.removeLabel(processTitle);
            }
        }, options.displayTimeout);
    }
    
    function logProcessCount(processTitle) {
        if (!isShown) return;
        if (!isActivated) return;
        if (!profilerSettingsUI) return;
        
        let categoryName = `${processTitle}_count`;
        // let info = updateCategory(processTitle, time, timeBetweenCategoryUpdates);
        if (typeof processCategories[categoryName] === 'undefined') {
            processCategories[categoryName] = {
                count: 1
            };
        } else {
            processCategories[categoryName].count += 1;
        }
        
        let countLabelText = `${categoryName} has happened (${processCategories[categoryName].count}) times`;
        profilerSettingsUI.addOrUpdateLabel(`${categoryName}`, countLabelText, { pinToTop: true });
    }

    // show aggregate mean/min/max times for recent tasks of this category
    function updateCategory(category, time, timeBetweenCategoryUpdates) {
        if (typeof processCategories[category] === 'undefined') {
            processCategories[category] = {
                fastest: time, // ignore the first datapoint so we don't throw off the average
                slowest: time,
                mean: time,
                count: 1,
                numDisplayResets: 0
            };
        } else if (timeBetweenCategoryUpdates > 5000) {
            let numDisplayResets = processCategories[category].numDisplayResets + 1;
            processCategories[category] = {
                fastest: time,
                slowest: time,
                mean: time,
                count: 1,
                numDisplayResets: numDisplayResets
            };
        } else {
            let prevCount = processCategories[category].count;
            let prevMean = processCategories[category].mean;

            processCategories[category].fastest = Math.min(processCategories[category].fastest, time);
            processCategories[category].slowest = Math.max(processCategories[category].slowest, time);
            processCategories[category].mean = (prevCount * prevMean + time) / (prevCount + 1); // update mean
            processCategories[category].count += 1;
        }

        return processCategories[category];
    }

    function yellow(text) {
        return `<span class='debugTime'>${text}</span>`;
    }

    function show() {
        isShown = true;
        if (!profilerSettingsUI) {
            profilerSettingsUI = new ProfilerSettingsUI();
        }
        profilerSettingsUI.show();
        profilerSettingsUI.setEnableMetrics(true);
    }

    function hide() {
        isShown = false;
        if (profilerSettingsUI) {
            profilerSettingsUI.hide();
        }
    }

    function activate() {
        isActivated = true;
    }

    function deactivate() {
        isActivated = false;
    }

    exports.initService = initService;
    exports.show = show;
    exports.hide = hide;
    exports.activate = activate;
    exports.deactivate = deactivate;
    // logging methods
    exports.startTimeProcess = startTimeProcess;
    exports.stopTimeProcess = stopTimeProcess;
    exports.logIndividualProcess = logIndividualProcess;
    exports.logProcessCount = logProcessCount;
    // helper function
    exports.getShortHashForString = getShortHashForString;
}(realityEditor.device.profiling));

window.postIntoIframe = (contentWindow, message, targetOrigin = '*') => {
    // console.log('postIntoIframe');
    // realityEditor.device.profiling.startTimeProcess('postIntoIframe');
    contentWindow.postMessage(message, targetOrigin);
    // realityEditor.device.profiling.stopTimeProcess('postIntoIframe', 'postIntoIframe', { showAggregate: true });
    
    realityEditor.device.profiling.logProcessCount('postIntoIframe');
};

export const initService = realityEditor.device.profiling.initService;
