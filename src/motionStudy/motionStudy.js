import * as THREE from '../../thirdPartyCode/three/three.module.js';

import {Timeline} from './timeline.js';
import {
    RegionCard,
    RegionCardState,
} from './regionCard.js';
import {HumanPoseAnalyzer} from '../humanPose/HumanPoseAnalyzer.js';
import {
    postPersistRequest,
} from './utils.js';
import {ValueAddWasteTimeManager} from "./ValueAddWasteTimeManager.js";

const RecordingState = {
    empty: 'empty',
    recording: 'recording',
    done: 'done',
};

export class MotionStudy {
    /**
     * @param {string} frame - frame id associated with instance of
     * motionStudy
     */
    constructor(frame) {
        this.frame = frame;

        this.container = document.createElement('div');
        this.container.id = 'analytics-container';

        this.timelineContainer = document.createElement('div');
        this.timelineContainer.id = 'analytics-timeline-container';

        this.patchFilter = this.patchFilter.bind(this);

        this.container.appendChild(this.timelineContainer);
        this.timeline = new Timeline(this, this.timelineContainer);

        this.createStepLabelComponent();

        this.onStepFileChange = this.onStepFileChange.bind(this);

        this.threejsContainer = new THREE.Group();
        this.humanPoseAnalyzer = new HumanPoseAnalyzer(this, this.threejsContainer);
        this.opened = false;
        this.loadingHistory = false;
        this.livePlayback = false;
        this.lastDisplayRegion = null;
        this.pinnedRegionCards = [];
        this.activeRegionCard = null;
        this.nextStepNumber = 1;
        this.stepLabels = [];
        this.pinnedRegionCardsContainer = null;
        this.pinnedRegionCardsCsvLink = null;
        this.createNewPinnedRegionCardsContainer();
        this.valueAddWasteTimeManager = new ValueAddWasteTimeManager();

        this.videoPlayer = null;

        this.draw = this.draw.bind(this);

        requestAnimationFrame(this.draw);
    }

    createStepLabelComponent() {
        this.stepLabelContainer = document.createElement('div');
        this.stepLabelContainer.id = 'analytics-step-label-container';
        // this.stepLabelContainer.style.display = '';

        this.onStepFileChange = this.onStepFileChange.bind(this);
        this.stepLabel = document.createElement('span');
        this.stepLabel.classList.add('analytics-step');
        this.stepLabel.textContent = 'Step 1';

        this.stepLabelContainer.appendChild(this.stepLabel);

        this.container.appendChild(this.stepLabelContainer);
    }

    createStepFileUploadComponent() {
        this.stepFileUploadContainer = document.createElement('div');
        this.stepFileUploadContainer.id = 'analytics-step-file-upload-container';
        this.stepFileUploadContainer.classList.add('analytics-button-container');

        this.stepFileInputLabel = document.createElement('label');
        // this.stepFileInputLabel.classList.add('analytics-step');
        this.stepFileInputLabel.setAttribute('for', 'analytics-step-file');
        this.stepFileInputLabel.textContent = 'Import Step File';

        this.stepFileInput = document.createElement('input');
        this.stepFileInput.id = 'analytics-step-file';
        this.stepFileInput.type = 'file';
        this.stepFileInput.accept = '.xml,text/xml';
        this.stepFileInput.addEventListener('change', this.onStepFileChange);

        this.stepFileUploadContainer.appendChild(this.stepFileInputLabel);
        this.stepFileUploadContainer.appendChild(this.stepFileInput);

        this.pinnedRegionCardsContainer.appendChild(this.stepFileUploadContainer);
    }

    /**
     * On envelope open
     * add, load pinned region cards, load spaghetti, set timeline
     */
    open() {
        this.show2D();
        this.show3D();
    }

    /**
     * Shows all 2D UI
     */
    show2D() {
        if (!this.container.parentElement) {
            document.body.appendChild(this.container);
        }
        if (this.humanPoseAnalyzer.settingsUi) {
            this.humanPoseAnalyzer.settingsUi.show();
        }
    }

    /**
     * Hides all 2D UI
     */
    hide2D() {
        if (this.container.parentElement) {
            document.body.removeChild(this.container);
        }
        if (this.humanPoseAnalyzer.settingsUi) {
            this.humanPoseAnalyzer.settingsUi.hide();
        }
    }

    /**
     * Shows all 3D UI (spaghetti and clones)
     */
    show3D() {
        if (!this.threejsContainer.parent) {
            realityEditor.gui.threejsScene.addToScene(this.threejsContainer);
        }
    }

    /**
     * Hides all 3D UI (spaghetti and clones)
     */
    hide3D() {
        if (this.threejsContainer.parent) {
            realityEditor.gui.threejsScene.removeFromScene(this.threejsContainer);
        }
        this.resetPatchVisibility();
        // Reset the highlight region (and any animation)
        this.setHighlightRegion(null);
    }

    /**
     * On envelope close
     * remove pinned region cards, remove timeline, remove spaghetti
     */
    close() {
        this.hide2D();
        this.hide3D();

        // if memory limited then clearing all historical data makes sense
        // this.humanPoseAnalyzer.clearHistoricalData();
    }

    /**
     * On envelope focus (unblur)
     */
    focus() {
        this.show2D();
        this.show3D();
    }

    /**
     * On envelope blur
     * Remove all 2d ui
     */
    blur() {
        this.hide2D();
    }

    /**
     * Add a new container for pinned region cards, removing the old one if applicable
     */
    createNewPinnedRegionCardsContainer() {
        if (this.pinnedRegionCardsContainer) {
            this.container.removeChild(this.pinnedRegionCardsContainer);
        }
        const pinnedRegionCardsContainer = document.createElement('div');
        pinnedRegionCardsContainer.classList.add('analytics-pinned-region-cards-container');
        // Prevent camera control from stealing attempts to scroll the container
        pinnedRegionCardsContainer.addEventListener('wheel', (event) => {
            event.stopPropagation();
        });
        this.container.appendChild(pinnedRegionCardsContainer);

        this.pinnedRegionCardsContainer = pinnedRegionCardsContainer;
        this.pinnedRegionCards = [];

        this.pinnedRegionCardsCsvContainer = document.createElement('div');
        this.pinnedRegionCardsCsvContainer.classList.add('analytics-button-container');
        this.pinnedRegionCardsCsvLink = document.createElement('a');
        this.pinnedRegionCardsCsvLink.classList.add('analytics-pinned-region-cards-csv');
        this.pinnedRegionCardsCsvLink.setAttribute('download', 'spatial analytics timeline regions.csv');
        this.pinnedRegionCardsCsvLink.textContent = 'Export CSV';
        this.pinnedRegionCardsCsvContainer.style.display = 'none';
        this.pinnedRegionCardsCsvContainer.appendChild(this.pinnedRegionCardsCsvLink);
        this.pinnedRegionCardsContainer.appendChild(this.pinnedRegionCardsCsvContainer);
        this.createStepFileUploadComponent();
    }

    draw() {
        if (this.container.parentElement) {
            this.timeline.draw();
        }
        requestAnimationFrame(this.draw);
    }

    /**
     * @param {CameraVisPatch} patch
     * @return {boolean}
     */
    patchFilter(patch) {
        if (!this.lastDisplayRegion) {
            return true;
        }

        if (this.lastDisplayRegion.startTime > 0 &&
            patch.creationTime < this.lastDisplayRegion.startTime) {
            return false;
        }

        if (this.lastDisplayRegion.endTime > 0 &&
            patch.creationTime > this.lastDisplayRegion.endTime) {
            return false;
        }

        return true;
    }

    /**
     * We take control over CameraVis patch visibility for
     * animation reasons so this restores them all
     */
    resetPatchVisibility() {
        const desktopRenderer = realityEditor.gui.ar.desktopRenderer;
        if (!desktopRenderer) {
            return;
        }

        const patches = Object.values(desktopRenderer.getCameraVisPatches() || {}).filter(this.patchFilter);

        for (const patch of patches) {
            patch.show();
            patch.resetShaderMode();
        }
    }

    /**
     * Processes the given historical poses and renders them efficiently
     * @param {Pose[]}  poses - the poses to render
     */
    bulkRenderHistoricalPoses(poses) {
        if (realityEditor.humanPose.draw.is2DPoseRendered()) return;
        poses.forEach(pose => {
            this.timeline.appendPose({
                time: pose.timestamp,
            });
        });
        this.humanPoseAnalyzer.bulkHistoricalPosesUpdated(poses);

    }

    /**
     * @param {number} time - absolute time within timeline
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    setCursorTime(time, fromSpaghetti) {
        this.timeline.setCursorTime(time);
        this.humanPoseAnalyzer.setCursorTime(time, fromSpaghetti);
    }

    /**
     * @typedef {Object} TimeRegion
     * @property {number} startTime - start of time interval in ms
     * @property {number} endTime - end of time interval in ms
     */

    /**
     * Sets the time interval to highlight
     * @param {TimeRegion} highlightRegion
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    setHighlightRegion(highlightRegion, fromSpaghetti) {
        if (!highlightRegion && this.activeRegionCard) {
            // Unexpectedly deactivated from outside of region card logic
            this.activeRegionCard.displayActive = false;
            this.activeRegionCard.updateDisplayActive();
            this.activeRegionCard = null;
        }
        this.timeline.setHighlightRegion(highlightRegion);
        this.humanPoseAnalyzer.setHighlightRegion(highlightRegion, fromSpaghetti);
    }

    /**
     * Sets the time interval to display. Syncs state across timeline and
     * humanPoseAnalyzer
     * @param {TimeRegion} region - the time interval to display
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    async setDisplayRegion(region, fromSpaghetti) {
        if (region.recordingState) {
            this.updateStepVisibility(region.recordingState);
        }

        if (this.lastDisplayRegion) {
            if (Math.abs(this.lastDisplayRegion.startTime - region.startTime) < 1 &&
                Math.abs(this.lastDisplayRegion.endTime - region.endTime) < 1) {
                return;
            }
        }

        this.lastDisplayRegion = region;

        this.timeline.setDisplayRegion(region);
        let livePlayback = region.startTime < 0 || region.endTime < 0;
        if (this.livePlayback && !livePlayback) {
            await postPersistRequest();
        }
        this.livePlayback = livePlayback;

        this.loadingHistory = true;
        this.humanPoseAnalyzer.resetLiveHistoryClones();
        this.humanPoseAnalyzer.resetLiveHistoryLines();
        if (region.startTime >= 0 && region.endTime >= 0) {
            // Only load history if display region is unbounded, new tools set displayRegion to (Date.now(), -1)
            await realityEditor.humanPose.loadHistory(region, this);
        }
        this.loadingHistory = false;
        if (region && !fromSpaghetti) {
            this.humanPoseAnalyzer.setDisplayRegion(region);
        }
    }

    updateStepVisibility(recordingState) {
        switch (recordingState) {
            case RecordingState.empty:
            case RecordingState.recording:
                this.stepLabelContainer.style.display = '';
                this.pinnedRegionCardsCsvContainer.style.display = 'none';
                break;
            case RecordingState.done:
            default:
                this.stepLabelContainer.style.display = 'none';
                this.pinnedRegionCardsCsvContainer.style.display = '';
                break;
        }
        if (recordingState !== RecordingState.empty) {
            this.stepFileUploadContainer.style.display = 'none';
            this.stepLabelContainer.classList.add('analytics-step-label-container-active');
        } else {
            this.stepFileUploadContainer.style.display = '';
        }
        this.updateStepLabel();
    }

    onStepFileChange() {
        if (this.stepFileInput.files.length === 0) {
            return;
        }
        const file = this.stepFileInput.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          let parser = new DOMParser();
          let doc = parser.parseFromString(e.target.result, 'text/xml');
          let elts = doc.querySelectorAll('TextAS-KD');
          this.stepLabels = Array.from(elts).map(elt => elt.textContent);
          this.updateStepLabel();
        };
        reader.onerror = (e) => {
            console.error(e);
        };
        reader.readAsText(file);
    }

    getStepLabel() {
        const i = this.nextStepNumber;
        let label = 'Step ' + i;
        if (i <= this.stepLabels.length) {
            label = this.stepLabels[i - 1];
        }
        return label;
    }

    getStepColor() {
        let hue = (this.nextStepNumber * 17) % 360;
        return `hsl(${hue} 100% 70%)`;
    }

    updateStepLabel() {
        this.stepLabelContainer.style.borderColor = this.getStepColor();
        this.stepLabel.textContent = this.getStepLabel();
    }

    /**
     * @param {'reba'|'motion'} lens
     */
    setLens(lens) {
        console.error('setLens unimplemented', lens);
    }

    /**
     * @param {'bone'|'pose'} lensDetail
     */
    setLensDetail(lensDetail) {
        console.error('setLensDetail unimplemented', lensDetail);
    }

    /**
     * @param {string} spaghettiAttachPoint
     */
    setSpaghettiAttachPoint(spaghettiAttachPoint) {
        console.error('setSpaghettiAttachPoint unimplemented', spaghettiAttachPoint);
    }

    /**
     * @param {string} spaghettiVisible
     */
    setSpaghettiVisible(spaghettiVisible) {
        console.error('setSpaghettiVisible unimplemented', spaghettiVisible);
    }

    /**
     * @param {string} allClonesVisible
     */
    setAllClonesVisible(allClonesVisible) {
        console.error('setAllClonesVisible unimplemented', allClonesVisible);
    }

    hydrateMotionStudy(data) {
        if (this.loadingHistory) {
            setTimeout(() => {
                this.hydrateMotionStudy(data);
            }, 100);
            return;
        }

        if (!this.videoPlayer && data.videoUrls) {
            this.videoPlayer = new realityEditor.gui.ar.videoPlayback.VideoPlayer('video' + this.frame, data.videoUrls);
            let matches = /\/rec(\d+)/.exec(data.videoUrls.color);
            if (matches && matches[1]) {
                this.videoStartTime = parseFloat(matches[1]);
            }
            this.videoPlayer.hide();
            this.videoPlayer.colorVideo.controls = true;
            this.videoPlayer.colorVideo.style.display = '';
            this.videoPlayer.colorVideo.classList.add('analytics-video');
            this.container.appendChild(this.videoPlayer.colorVideo);
        }

        if (data.valueAddWasteTime) {
            this.valueAddWasteTimeManager.fromJSON(data.valueAddWasteTime);
            this.humanPoseAnalyzer.reprocessLens(this.humanPoseAnalyzer.valueAddWasteTimeLens);
        }

        data.regionCards.sort((rcDescA, rcDescB) => {
            return rcDescA.startTime - rcDescB.startTime;
        });

        for (let desc of data.regionCards) {
            let poses = this.humanPoseAnalyzer.getPosesInTimeInterval(desc.startTime, desc.endTime);
            if (poses.length === 0) {
                let defaultMotionStudy = realityEditor.motionStudy.getDefaultMotionStudy();
                poses = defaultMotionStudy.humanPoseAnalyzer.getPosesInTimeInterval(desc.startTime, desc.endTime);
            }
            let regionCard = new RegionCard(this, this.pinnedRegionCardsContainer, poses, desc);
            regionCard.state = RegionCardState.Pinned;
            if (desc.label) {
                regionCard.setLabel(desc.label);
            }
            regionCard.removePinAnimation();
            this.addRegionCard(regionCard);
        }
    }

    addRegionCard(regionCard) {
        // Allow for a small amount of inaccuracy in timestamps, e.g. when
        // switching from live to historical clone source
        const tolerance = 500;
        for (let pinnedRegionCard of this.pinnedRegionCards) {
            if ((Math.abs(pinnedRegionCard.startTime - regionCard.startTime) < tolerance) &&
               (Math.abs(pinnedRegionCard.endTime - regionCard.endTime) < tolerance)) {
                // New region card already exists in the list
                regionCard.remove();
                return;
            }
        }
        this.pinnedRegionCards.push(regionCard);
        regionCard.updateValueAddWasteTimeUi(this.valueAddWasteTimeManager);

        if (regionCard.getLabel().length === 0) {
            regionCard.setLabel(this.getStepLabel());
        }

        regionCard.setAccentColor(this.getStepColor());

        this.nextStepNumber += 1;

        this.updateStepLabel();

        this.updateCsvExportLink();

        // wider tolerance for associating local cameravis patches with
        // potentially remote region cards
        const patchTolerance = 3000;
        if (Math.abs(regionCard.endTime - Date.now()) > patchTolerance) {
            return;
        }

        const desktopRenderer = realityEditor.gui.ar.desktopRenderer;
        if (!desktopRenderer) {
            return;
        }

        const patches = desktopRenderer.cloneCameraVisPatches('HIDDEN');
        if (!patches) {
            return;
        }

        // Hide cloned patches after brief delay to not clutter the space
        // setTimeout(() => {
        //     for (const patch of Object.values(patches)) {
        //         patch.visible = false;
        //     }
        // }, patchTolerance);
    }

    writeMotionStudyData() {
        // Write region card descriptions to public data of currently active envelope
        let openEnvelopes = realityEditor.envelopeManager.getOpenEnvelopes();
        let allCards = this.pinnedRegionCards.map(regionCard => {
            return {
                startTime: regionCard.startTime,
                endTime: regionCard.endTime,
                label: regionCard.getLabel(),
            };
        });

        allCards.sort((rcDescA, rcDescB) => {
            return rcDescA.startTime - rcDescB.startTime;
        });

        for (let envelope of openEnvelopes) {
            let objectKey = envelope.object;
            let frameKey = envelope.frame;
            const motionStudyData = {
                regionCards: allCards,
                valueAddWasteTime: this.valueAddWasteTimeManager.toJSON()
            }
            realityEditor.network.realtime.writePublicData(objectKey, frameKey, frameKey + 'storage', 'analyticsData', motionStudyData);
        }
    }

    pinRegionCard(regionCard) {
        regionCard.state = RegionCardState.Pinned;
        if (regionCard.getLabel() === 'Step') {
            regionCard.setLabel('Step ' + this.nextStepNumber);
            this.nextStepNumber += 1;
        }
        setTimeout(() => {
            regionCard.moveTo(35, 120 + 240 * this.pinnedRegionCards.length);
        }, 10);

        setTimeout(() => {
            regionCard.removePinAnimation();

            this.addRegionCard(regionCard);
            this.writeMotionStudyData();

            regionCard.switchContainer(this.pinnedRegionCardsContainer);
        }, 750);
    }

    unpinRegionCard(regionCard) {
        this.pinnedRegionCards = this.pinnedRegionCards.filter(prc => {
            return prc !== regionCard;
        });
        this.updateCsvExportLink();
        this.writeMotionStudyData();
    }

    updateCsvExportLink() {
        let header = [
            'label',
            'start', 'end', 'duration seconds', 'distance meters',
            'reba avg', 'reba min', 'reba max',
            'accel avg', 'accel min', 'accel max',
        ];
        let lines = [header];
        for (let regionCard of this.pinnedRegionCards) {
            if (regionCard.poses.length === 0) {
                continue;
            }

            lines.push([
                regionCard.getLabel(),
                new Date(regionCard.startTime).toISOString(),
                new Date(regionCard.endTime).toISOString(),
                regionCard.durationMs / 1000,
                regionCard.distanceMm / 1000,
                regionCard.graphSummaryValues['REBA'].average,
                regionCard.graphSummaryValues['REBA'].minimum,
                regionCard.graphSummaryValues['REBA'].maximum,
                regionCard.graphSummaryValues['Accel'].average,
                regionCard.graphSummaryValues['Accel'].minimum,
                regionCard.graphSummaryValues['Accel'].maximum,
            ]);
        }
        let dataUrl = 'data:text/plain;charset=UTF-8,' + encodeURIComponent(lines.map(line => {
            return line.join(',');
        }).join('\n'));

        this.pinnedRegionCardsCsvLink.href = dataUrl;
        // window.open(dataUrl, '_blank');
    }

    /**
     * @param {RegionCard} activeRegionCard
     */
    setActiveRegionCard(activeRegionCard) {
        if (this.activeRegionCard) {
            this.activeRegionCard.displayActive = false;
            this.activeRegionCard.updateDisplayActive();
        }
        this.activeRegionCard = activeRegionCard;
    }

    /**
     * @param {RegionCard} timelineRegionCard
     */
    setTimelineRegionCard(timelineRegionCard) {
        if (this.activeRegionCard) {
            this.activeRegionCard.setPoses(timelineRegionCard.poses);
        }
    }
    
    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    markWasteTime(startTime, endTime) {
        this.valueAddWasteTimeManager.markWasteTime(startTime, endTime);
        this.humanPoseAnalyzer.reprocessLens(this.humanPoseAnalyzer.valueAddWasteTimeLens);
        this.pinnedRegionCards.forEach(card => {
            card.updateValueAddWasteTimeUi();
        });
        this.writeMotionStudyData();
    }
    
    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    markValueAdd(startTime, endTime) {
        this.valueAddWasteTimeManager.markValueAdd(startTime, endTime);
        this.humanPoseAnalyzer.reprocessLens(this.humanPoseAnalyzer.valueAddWasteTimeLens);
        this.pinnedRegionCards.forEach(card => {
            card.updateValueAddWasteTimeUi();
        });
        this.writeMotionStudyData();
    }

    updateRegionCards() {
        this.pinnedRegionCards.forEach(card => {
            card.updateLensStatistics();
        });
        if (this.timeline.regionCard) {
            this.timeline.regionCard.updateLensStatistics();
        }

        this.updateCsvExportLink();
        //this.writeMotionStudyData();
    }

}
