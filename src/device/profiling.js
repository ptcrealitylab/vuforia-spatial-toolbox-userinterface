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
        realityEditor.network.addPostMessageHandler('profilerStartTimeProcess', (msgContent, _fullMessage) => {
            startTimeProcess(msgContent.name, { numStopsRequired: msgContent.numStopsRequired || null });
        });

        realityEditor.network.addPostMessageHandler('profilerStopTimeProcess', (msgContent, _fullMessage) => {
            let showMessage = typeof msgContent.showMessage === 'boolean' ? msgContent.showMessage : false;
            let showAggregate = typeof msgContent.showAggregate === 'boolean' ? msgContent.showAggregate : true;
            let displayTimeout = msgContent.displayTimeout || 3000;
            let includeCount = typeof msgContent.includeCount === 'boolean' ? msgContent.includeCount : true;
            stopTimeProcess(msgContent.name, msgContent.category, { showMessage, showAggregate, displayTimeout, includeCount });
        });

        realityEditor.network.addPostMessageHandler('profilerLogMessage', (msgContent, _fullMessage) => {
            let formattedTime = formatLogTime();
            let displayText = `${msgContent.message} <span style='color:grey'>${formattedTime}</span>`
            logIndividualProcess(displayText, { displayTimeout: msgContent.displayTimeout || 3000 });
        });

        realityEditor.network.addPostMessageHandler('profilerCountMessage', (msgContent, _fullMessage) => {
            logProcessCount(msgContent.message);
        });
    }

    function formatLogTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

        // Output will be like: [12:34:56.789]
        return `[${hours}:${minutes}:${seconds}.${milliseconds}]`;
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

    function startTimeProcess(processTitle, options = { numStopsRequired: null }) {
        if (!isShown) return;
        if (!isActivated) return;

        if (typeof processTimes[processTitle] === 'undefined') {
            processTimes[processTitle] = {};
        }
        processTimes[processTitle].start = performance.now();
        if (options.numStopsRequired) {
            processTimes[processTitle].numStopsRequired = options.numStopsRequired;
            processTimes[processTitle].numStopsAccumulated = 0;
        }
    }

    function stopTimeProcess(processTitle, category, options = { showMessage: false, showAggregate: false, displayTimeout: 3000, includeCount: true }) {
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

        process.end = performance.now();

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
            
            let countString = options.includeCount ? ` (${info.count})` : '';

            let meanLabelText = `${category}${countString} –– mean: ${yellow(meanT)} –– min: ${yellow(minT)} –– max: ${yellow(maxT)}`;
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
            // TODO: if logging as part of stopTime with aggregate, don't remove later labels when earlier labels' timeouts trigger
            profilerSettingsUI.removeLabel(processTitle);
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

        let countLabelText = `${processTitle}: <span style='color:grey'>${processCategories[categoryName].count} times</span>`;
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

    function isEnabled() {
        return isShown && isActivated;
    }

    exports.initService = initService;
    exports.show = show;
    exports.hide = hide;
    exports.activate = activate;
    exports.deactivate = deactivate;
    exports.isEnabled = isEnabled;
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
