import * as THREE from '../../thirdPartyCode/three/three.module.js';

import {Timeline} from './timeline.js';
import {DraggableMenu} from '../utilities/DraggableMenu.js';
import {TableView} from '../utilities/TableView.js';
import {
    RegionCard,
    RegionCardState,
} from './regionCard.js';
import {HumanPoseAnalyzer} from '../humanPose/HumanPoseAnalyzer.js';
import {
    postPersistRequest,
} from './utils.js';
import {ValueAddWasteTimeManager} from './ValueAddWasteTimeManager.js';
import {makeTextInput} from '../utilities/makeTextInput.js';
import {MURI_SCORES, MURI_CONFIG} from '../humanPose/MuriScore.js';
import {HUMAN_TRACKING_FPS} from '../humanPose/constants.js';
import {ImportStepsButton} from './ImportStepsButton.js';
import {CreateStepSensorsButton} from './CreateStepSensorsButton.js';
import {Windchill} from './Windchill.js';

const RecordingState = {
    empty: 'empty',
    recording: 'recording',
    saving: 'saving',
    done: 'done',
};

export class MotionStudy {
    /**
     * @param {string} frame - frame id associated with instance of
     * motionStudy
     * @param {MotionStudySensors} sensors
     */
    constructor(frame, sensors) {
        this.frame = frame;
        this.sensors = sensors;

        this.windchill = new Windchill();

        this.shown2D = false;

        this.container = document.createElement('div');
        this.container.id = 'analytics-container';

        this.timelineContainer = document.createElement('div');
        this.timelineContainer.id = 'analytics-timeline-container';

        this.patchFilter = this.patchFilter.bind(this);

        this.container.appendChild(this.timelineContainer);
        this.timeline = new Timeline(this, this.timelineContainer);

        this.createStepLabelComponent();

        this.createStepSensorsButton = new CreateStepSensorsButton(this);
        this.createStepSensorsButton.hide();

        this.threejsContainer = new THREE.Group();
        this.humanPoseAnalyzer = new HumanPoseAnalyzer(this, this.threejsContainer);
        this.opened = false;
        this.loadingHistory = false;
        this.lastHydratedData = null;
        this.writeMSDataTimeout = null;
        this.livePlayback = false;
        this.lastDisplayRegion = null;
        this.pinnedRegionCards = [];
        this.pinnedRegionCardToShow = null;
        this.activeRegionCard = null;
        this.activeLens = this.humanPoseAnalyzer.activeLens;
        this.nextStepNumber = 1;
        this.steps = [];
        this.pinnedRegionCardsContainer = null;
        this.exportLinkContainer = null;
        this.tableViewMenu = null;
        this.createNewPinnedRegionCardsContainer();
        this.valueAddWasteTimeManager = new ValueAddWasteTimeManager();

        this.pinnedRegionCardsContainer.appendChild(this.createStepSensorsButton.container);

        this.videoPlayer = null;

        this.draw = this.draw.bind(this);

        requestAnimationFrame(this.draw);
    }

    createStepLabelComponent() {
        this.stepLabelContainer = document.createElement('div');
        this.stepLabelContainer.id = 'analytics-step-label-container';
        // this.stepLabelContainer.style.display = '';

        this.stepLabel = null;
        // this.stepLabel.classList.add('analytics-step');
        // this.stepLabel.textContent = 'Step 1';

        // this.stepLabelContainer.appendChild(this.stepLabel);

        this.container.appendChild(this.stepLabelContainer);
    }

    createTableView() {
        this.tableViewMenu = new DraggableMenu('analytics-table-view-root', 'Table View', {});
        // const rowNames = ['Step 1', 'Step 2', 'Step 3', 'Step 4'];
        // const columnNames = ['Head', 'Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'];
        // const data = [
        //     [4, 5, 1, 2, 6, 4],
        //     [6, 4, 3, 3, 3, 5],
        //     [5, 7, 4, 5, 7, 4],
        //     [8, 8, 4, 2, 3, 3],
        // ];
        // this.tableView = new TableView(rowNames, columnNames, data, this.tableViewMenu.body);
        this.updateTableView();
        this.tableViewMenu.initialize();
    }

    // TODO: Clear modified data when card durations get changed, maybe save a hash of a card as a key for the data
    updateTableView() {
        // regionCards.map(step => {
        //     const poses = this.humanPoseAnalyzer.getPosesInTimeInterval(step.startTime, step.endTime);
        //     poses.map(pose => pose.)
        //     this.humanPoseAnalyzer.muriLens.getTableViewValue(joint)
        // })
        
        this.tableViewMenu.body.innerHTML = ''; // Remove old table view if it exists
        const lens = this.humanPoseAnalyzer.activeLens;
        const jointNameMap = value => value.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
        const jointNames = lens.getTableViewJoints().map(jointNameMap);
        const invertJointNameMap = value => lens.getTableViewJoints().find(name => jointNameMap(name) === value);
        const data = [];
        const regionCards = this.pinnedRegionCards;
        const stepNames = regionCards.map(card => card.getLabel());
        if (regionCards.length === 0) {
            this.tableViewMenu.body.innerHTML = '<p>Please record ≥1 step to see the table view.</p>'
            return;
        }
        regionCards.forEach(step => {
            let dataRow = [];
            const poses = this.humanPoseAnalyzer.getPosesInTimeInterval(step.startTime, step.endTime);
            if (poses.length === 0) {
                dataRow = Array.from({length: jointNames.length}).map(() => 0);
            } else {
                poses.forEach((pose, i) => {
                    const jointValues = Object.values(pose.joints);
                    jointNames.forEach((jointName, j) => {
                        const joint = jointValues.find(joint => jointNameMap(joint.name) === jointName);
                        if (i === 0) {
                            dataRow.push(lens.getTableViewValue(joint));
                        } else {
                            dataRow[j] = dataRow[j] + lens.getTableViewValue(joint);
                        }
                    });
                });
                dataRow.forEach((val, i) => {
                    dataRow[i] = val / poses.length; // Average the values
                    dataRow[i] = Math.round(dataRow[i] * 10) / 10; // Round to tenth place
                })
            }
            data.push(dataRow);
        });
        this.tableView = new TableView(stepNames, jointNames, data, this.tableViewMenu.body, {
            colorFunction: (value, columnName) => {
                return lens.getTableViewColorForValue(value, invertJointNameMap(columnName));
            },
            headerImages: lens.getTableViewImages(),
            persistId: `${this.frame}-${lens.name}`
        });
        this.tableView.onSelection(selection => {
            const selectedRows = Array.from(new Set(selection.map(cell => cell.row)));
            const selectedColumns = Array.from(new Set(selection.map(cell => cell.column)));
            const regionCards = this.pinnedRegionCards.filter(card => selectedRows.includes(card.getLabel()));

            if (selectedColumns.length === 1) {
                const jointName = invertJointNameMap(selectedColumns[0]);
                this.humanPoseAnalyzer.setActiveJointByName(jointName);
                this.humanPoseAnalyzer.setHistoricalHistoryLinesVisible(false);
            } else {
                this.humanPoseAnalyzer.clearActiveJoint();
                this.humanPoseAnalyzer.setHistoricalHistoryLinesVisible(true);
            }

            if (selectedRows.length === 1) {
                const card = regionCards.find(card => card.getLabel() === selectedRows[0]);
                this.setActiveRegionCard(card);
                this.setHighlightRegion({
                    startTime: card.startTime,
                    endTime: card.endTime,
                    label: card.getLabel()
                }, false);
            } else {
                this.setActiveRegionCard(null);
            }

            if (selection.length === 0) {
                this.setHighlightRegion({startTime: Number.MIN_VALUE, endTime: Number.MAX_VALUE}, false);
            } else {
                const startTime = regionCards.reduce((prev, curr) => Math.min(prev, curr.startTime), Number.MAX_VALUE);
                const endTime = regionCards.reduce((prev, curr) => Math.max(prev, curr.endTime), Number.MIN_VALUE);
                this.setHighlightRegion({startTime, endTime}, false);
            }
        });

        const setInteractable = () => {
            this.tableView.setInteractable(this.tableViewMenu.showing && this.tableViewMenu.maximized)
        }
        this.tableViewMenu.on('show', () => setInteractable());
        this.tableViewMenu.on('maximize', () => setInteractable());
        this.tableViewMenu.on('hide', () => setInteractable());
        this.tableViewMenu.on('minimize', () => setInteractable());
        setInteractable();
    }

    createStepFileUploadComponent() {
        this.importStepsButton = new ImportStepsButton(this, this.windchill);
        this.pinnedRegionCardsContainer.appendChild(this.importStepsButton.container);
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
        this.shown2D = true;
        if (!this.container.parentElement) {
            document.body.appendChild(this.container);
        }
        if (this.humanPoseAnalyzer.settingsUi) {
            this.humanPoseAnalyzer.settingsUi.show();
        }
        this.updateVideoPlayerShowHideButtonText();

        if (this.pinnedRegionCardToShow) {
            this.pinnedRegionCardToShow.show();
            this.pinnedRegionCardToShow = null;
        }
    }

    /**
     * Hides all 2D UI
     */
    hide2D() {
        this.shown2D = false;
        if (this.container.parentElement) {
            document.body.removeChild(this.container);
        }
        if (this.humanPoseAnalyzer.settingsUi) {
            this.humanPoseAnalyzer.settingsUi.hide();
        }
        this.tableViewMenu.hide();
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
        if (this.videoPlayer) {
            this.videoPlayer.hide();
        }
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
        if (this.videoPlayer) {
            pinnedRegionCardsContainer.classList.add('analytics-has-video');
        }
        // Prevent camera control from stealing attempts to scroll the container
        pinnedRegionCardsContainer.addEventListener('wheel', (event) => {
            event.stopPropagation();
        });
        this.container.appendChild(pinnedRegionCardsContainer);

        this.pinnedRegionCardsContainer = pinnedRegionCardsContainer;
        this.pinnedRegionCards = [];

        this.createTitleInput();

        this.exportLinkContainer = document.createElement('div');
        this.exportLinkContainer.classList.add('analytics-button-container');
        this.exportLinkContainer.classList.add('analytics-export-link-container');

        this.exportLinkPinnedRegionCards = document.createElement('a');
        this.exportLinkPinnedRegionCards.classList.add('analytics-export-link');
        this.exportLinkPinnedRegionCards.setAttribute('download', 'spatial analytics timeline region cards.csv');
        this.exportLinkPinnedRegionCards.textContent = 'Export Cards';

        this.exportLinkPoseData = document.createElement('a');
        this.exportLinkPoseData.classList.add('analytics-export-link');
        this.exportLinkPoseData.setAttribute('download', 'spatial analytics pose data.json');
        this.exportLinkPoseData.textContent = 'Export Poses';

        this.exportLinkContainer.style.display = 'none';
        this.exportLinkContainer.appendChild(this.exportLinkPinnedRegionCards);
        this.exportLinkContainer.appendChild(this.exportLinkPoseData);
        this.pinnedRegionCardsContainer.appendChild(this.exportLinkContainer);

        this.createTableView();

        this.createStepFileUploadComponent();
    }

    createTitleInput() {
        this.titleInput = document.createElement('div');
        this.titleInput.classList.add('analytics-button-container');
        this.titleInput.classList.add('analytics-title');
        this.titleInput.contentEditable = true;
        this.titleInput.textContent = '';
        makeTextInput(this.titleInput, () => {
            this.writeMotionStudyData();
        });
        this.pinnedRegionCardsContainer.appendChild(this.titleInput);
    }

    getTitle() {
        return this.titleInput.textContent;
    }

    setTitle(title) {
        if (this.titleInput.textContent === title) {
            return;
        }
        this.titleInput.textContent = title;
    }

    draw() {
        if (this.container.parentElement) {
            this.timeline.draw();
            if (this.lastDisplayRegion) {
                this.updateStepLabel();
            }
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

        if (!this.humanPoseAnalyzer.isAnimationPlaying() && this.videoPlayer) {
            this.videoPlayer.currentTime = (time - this.videoStartTime) / 1000;
        }
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
            this.recordingState = region.recordingState;
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

        if (this.lastHydratedData) {
            this.hydrateMotionStudy(this.lastHydratedData);
        }
    }

    updateStepVisibility(recordingState) {
        switch (recordingState) {
            case RecordingState.empty:
            case RecordingState.recording:
                this.stepLabelContainer.style.display = '';
                this.exportLinkContainer.style.display = 'none';
                break;
            case RecordingState.done:
            default:
                this.stepLabelContainer.style.display = 'none';
                this.exportLinkContainer.style.display = '';
                break;
        }
        if (this.plan) {
            this.importStepsButton.hide();
        } else {
            this.importStepsButton.show();
        }
        this.updateStepLabel();
    }

    async setProcessPlan(plan) {
        this.plan = plan;
        const operations = await this.windchill.getOperations(plan.id);
        this.setSteps(operations);
        this.importStepsButton.hide();
    }

    setSteps(steps) {
        this.steps = steps;
        this.updateStepLabel();

        this.createStepDataList();
    }

    createStepDataList() {
        const datalist = document.createElement('datalist');
        datalist.id = 'analytics-step-names';
        for (const step of this.steps) {
            const option = document.createElement('option');
            option.value = this.windchill.getOperationLabel(step);
            datalist.appendChild(option);
        }
        this.container.appendChild(datalist);
    }

    getStep() {
        const i = this.nextStepNumber;
        if (i <= this.steps.length) {
            return this.steps[i - 1];
        }
        return null;
    }

    getStepLabel() {
        const i = this.nextStepNumber;
        let label = 'Step ' + i;
        if (i <= this.steps.length) {
            const step = this.getStep();
            label = this.windchill.getOperationLabel(step);
        }
        return label;
    }

    getStepColor() {
        let hue = (this.nextStepNumber * 37 + 180) % 360;
        return `hsl(${hue} 100% 60%)`;
    }

    updateStepLabel() {
        let startTime = this.lastDisplayRegion?.startTime || Date.now();
        if (this.pinnedRegionCards.length > 0) {
            startTime = this.pinnedRegionCards.at(-1).endTime;
        }
        let endTime = Date.now();
        let poses = this.getPosesInTimeIntervalWithFallback(startTime, endTime);
        let step = this.getStep();
        if (!this.stepLabel) {
            this.stepLabel = new RegionCard(this, this.stepLabelContainer, poses, {
                startTime,
                endTime,
                step,
            });
        } else {
            this.stepLabel.setWindchillData(step);
            if (poses.length === 0) {
                this.stepLabel.startTime = startTime;
                this.stepLabel.endTime = endTime;
            } else {
                let newPosesStartTime = poses[0].timestamp;
                let newPosesEndTime = poses.at(-1).timestamp;
                if (Math.abs(this.stepLabel.startTime - newPosesStartTime) > 200 ||
                    Math.abs(this.stepLabel.endTime - newPosesEndTime) > 200) {
                    this.stepLabel.setPoses(poses);
                }
            }
        }
        this.stepLabel.element.classList.remove('minimized');
        this.stepLabel.setLabel(this.getStepLabel());
        this.stepLabel.setAccentColor(this.getStepColor());
        if (this.activeLens) {
            this.stepLabel.setActiveLens(this.activeLens);
        }
        this.stepLabel.updateWindchillSection();
    }

    /**
     * @param {MotionStudyLens} lens - the lens to set as active
     */
    setActiveLens(lens) {
        this.activeLens = lens;
        for (const regionCard of this.pinnedRegionCards) {
            regionCard.setActiveLens(lens);
        }
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

        this.lastHydratedData = data;

        const videoUrlsAreValid = data.videoUrls &&
            data.videoUrls.color &&
            data.videoUrls.rvl &&
            data.videoUrls.color.split('/').at(-1).length > '.mp4'.length &&
            data.videoUrls.rvl.split('/').at(-1).length > '.dat'.length;
        if (!this.videoPlayer && videoUrlsAreValid) {

            this.videoPlayer = new realityEditor.gui.ar.videoPlayback.VideoPlayer('video' + this.frame, data.videoUrls);
            let matches = /\/rec(\d+)/.exec(data.videoUrls.color);
            if (matches && matches[1]) {
                this.videoStartTime = parseFloat(matches[1]);
            }
            this.videoPlayer.hide();
            const colorVideo = this.videoPlayer.colorVideo;

            colorVideo.style.display = '';
            colorVideo.controls = true;
            colorVideo.classList.add('analytics-video');

            // This could expand to cover all the various orientations but for
            // now we just care about iPad (landscape) vs iPhone
            const isPortrait = parseInt(data.orientation) === 1;
            if (isPortrait) {
                colorVideo.classList.add('analytics-video-portrait');
                colorVideo.controls = false;
            }
            this.pinnedRegionCardsContainer.classList.add('analytics-has-video');

            this.createVideoPlayerShowHideButton();

            const videoPlayerBackground = document.createElement('div');
            videoPlayerBackground.classList.add('analytics-video-background');
            this.container.appendChild(videoPlayerBackground);

            this.container.appendChild(colorVideo);
        }

        if (data.valueAddWasteTime) {
            this.valueAddWasteTimeManager.fromJSON(data.valueAddWasteTime);
            let valueAddWasteTimeLens = this.humanPoseAnalyzer.getLensByName("Value Add/Waste Time");
            if (valueAddWasteTimeLens) {
                this.humanPoseAnalyzer.reprocessLens(valueAddWasteTimeLens);
            }
        }

        data.regionCards.sort((rcDescA, rcDescB) => {
            return rcDescA.startTime - rcDescB.startTime;
        });

        if (data.title) {
            this.setTitle(data.title);
        }

        for (let pinnedRegionCard of this.pinnedRegionCards) {
            pinnedRegionCard.updated = false;
        }

        for (let desc of data.regionCards) {
            let poses = this.getPosesInTimeIntervalWithFallback(desc.startTime, desc.endTime);
            let regionCard = new RegionCard(this, this.pinnedRegionCardsContainer, poses, desc);
            regionCard.state = RegionCardState.Pinned;
            if (desc.label) {
                regionCard.setLabel(desc.label);
            }

            if (desc.label &&
                desc.label.startsWith('Step ') &&
                !isNaN(desc.label.slice(5)) &&
                !isNaN(parseInt(desc.label.slice(5)))) {
                const stepNumber = parseInt(desc.label.slice(5));
                if (stepNumber >= this.nextStepNumber) {
                    this.nextStepNumber = stepNumber + 1;
                }
            }

            if (this.activeLens) {
                regionCard.setActiveLens(this.activeLens);
            }

            regionCard.removePinAnimation();
            this.addRegionCard(regionCard);
        }

        this.pinnedRegionCards = this.pinnedRegionCards.filter(pinnedRegionCard => {
            if (pinnedRegionCard.updated) {
                return true;
            }
            pinnedRegionCard.remove();
            return false;
        });

        this.sortPinnedRegionCards();

        if (data.plan && data.plan.id !== this.plan?.id) {
            this.windchill.getProcessPlans(data.plan.name).then(plans => {
                this.setProcessPlan(plans[0]);
            });
        }

        if (this.pinnedRegionCards.length > 0) {
            this.createStepSensorsButton.show();
        }
        this.updateSummarizedState();
    }

    getPosesInTimeIntervalWithFallback(startTime, endTime) {
        let poses = this.humanPoseAnalyzer.getPosesInTimeInterval(startTime, endTime);
        if (poses.length === 0) {
            let defaultMotionStudy = realityEditor.motionStudy.getDefaultMotionStudy();
            poses = defaultMotionStudy.humanPoseAnalyzer.getPosesInTimeInterval(startTime, endTime);
        }
        return poses;
    }

    createVideoPlayerShowHideButton() {
        this.videoPlayerShowHideButton = document.createElement('div');
        this.videoPlayerShowHideButton.classList.add('analytics-video-toggle');
        this.videoPlayerShowHideButton.classList.add('analytics-button-container');
        this.videoPlayerShowHideButton.textContent = 'Show Spatial Video';
        this.videoPlayerShowHideButton.addEventListener('pointerup', () => {
            if (this.videoPlayer.isShown()) {
                this.videoPlayer.hide();
            } else {
                this.videoPlayer.show();
            }
            this.updateVideoPlayerShowHideButtonText();
        });
        this.container.appendChild(this.videoPlayerShowHideButton);
    }

    updateVideoPlayerShowHideButtonText() {
        if (!this.videoPlayerShowHideButton || !this.videoPlayer) {
            return;
        }

        if (this.videoPlayer.isShown()) {
            this.videoPlayerShowHideButton.textContent = 'Hide Spatial Video';
        } else {
            this.videoPlayerShowHideButton.textContent = 'Show Spatial Video';
        }
    }

    addRegionCard(regionCard) {
        // Allow for a small amount of inaccuracy in timestamps, e.g. when
        // switching from live to historical clone source
        const tolerance = 500;
        for (let pinnedRegionCard of this.pinnedRegionCards) {
            const sameTimes = (Math.abs(pinnedRegionCard.startTime - regionCard.startTime) < tolerance) &&
               (Math.abs(pinnedRegionCard.endTime - regionCard.endTime) < tolerance);
            const sameLabel = pinnedRegionCard.getLabel() &&
                (pinnedRegionCard.getLabel() === regionCard.getLabel());
            if (sameTimes || sameLabel) {
                // New region card already exists in the list, remove it but
                // harvest it for data
                regionCard.remove()

                pinnedRegionCard.updated = true;

                // pinned was created earlier and missed data
                if (pinnedRegionCard.poses.length <= regionCard.poses.length) {
                    pinnedRegionCard.setPoses(regionCard.poses);
                }

                // Removed region card may have an updated label
                // TODO have better criteria than starting with Step
                const newLabel = regionCard.getLabel();
                if (newLabel && !newLabel.startsWith('Step ')) {
                    pinnedRegionCard.setLabel(newLabel);
                }
                return;
            }
        }
        this.pinnedRegionCards.push(regionCard);
        regionCard.updateValueAddWasteTimeUi(this.valueAddWasteTimeManager);

        regionCard.setWindchillData(this.getStep());

        if (window.location.hash && regionCard.step) {
            if (window.location.hash.includes(regionCard.step.id)) {
                if (this.shown2D) {
                    regionCard.show();
                } else {
                    this.pinnedRegionCardToShow = regionCard;
                }
            }
        }

        if (regionCard.getLabel().length === 0) {
            regionCard.setLabel(this.getStepLabel());
            if (this.steps.length > 0) {
                if (this.writeMSDataTimeout) {
                    clearTimeout(this.writeMSDataTimeout);
                }
                this.writeMSDataTimeout = setTimeout(() => {
                    this.writeMotionStudyData();
                    this.writeMSDataTimeout = null;
                }, 1000);
            }
        }

        regionCard.setAccentColor(this.getStepColor());

        this.nextStepNumber += 1;

        this.updateStepLabel();
        this.updateTableView();

        this.updateExportLinks();

        // wider tolerance for associating local cameravis patches with
        // potentially remote region cards
        const patchTolerance = 3000;
        if (Math.abs(regionCard.endTime - Date.now()) > patchTolerance) {
            return;
        }

        try {
            const desktopRenderer = realityEditor.gui.ar.desktopRenderer;
            if (!desktopRenderer) {
                return;
            }

            const patches = desktopRenderer.cloneCameraVisPatches('HIDDEN');
            if (!patches) {
                return;
            }
        } catch (e) {
            console.warn('Unable to clone patches', e);
        }

        // Hide cloned patches after brief delay to not clutter the space
        // setTimeout(() => {
        //     for (const patch of Object.values(patches)) {
        //         patch.visible = false;
        //     }
        // }, patchTolerance);
    }

    /**
     * Bubble sort pinned region cards along with their elements because we
     * want to modify the html as little as possible (reducing chance of losing
     * the current edit cursor, and providing vaguely better perf)
     */
    sortPinnedRegionCards() {
        for (let i = this.pinnedRegionCards.length - 1; i >= 0; i--) {
            const bubblingCard = this.pinnedRegionCards[i];
            let insertBeforeThisCard = null;
            let insertBeforeThisIndex = 0;
            for (let j = i - 1; j >= 0; j--) {
                const card = this.pinnedRegionCards[j];
                if (card.startTime < bubblingCard.startTime) {
                    // Sorted
                    break;
                }
                insertBeforeThisCard = card;
                insertBeforeThisIndex = j;
            }
            if (insertBeforeThisCard) {
                this.pinnedRegionCardsContainer.insertBefore(bubblingCard.element, insertBeforeThisCard.element);
                // Remove bubblingCard from its current index
                this.pinnedRegionCards.splice(i, 1);
                // Insert it into the list at its new index
                this.pinnedRegionCards.splice(insertBeforeThisIndex, 0, bubblingCard);
                // Process the new element at index `i` since it changed
                i++;
            }
        }
    }

    writeMotionStudyData() {
        // Write region card descriptions to public data of currently active envelope
        let openEnvelopes = realityEditor.envelopeManager.getOpenEnvelopes();

        for (let regionCard of this.pinnedRegionCards) {
            let operation = this.windchill.getOperationByLabel(regionCard.getLabel());
            // If ids match or both step descriptions are null
            if (regionCard.step?.id === operation?.id) {
                continue;
            }
            regionCard.setWindchillData(operation);
            regionCard.updateWindchillSection();
        }

        let allCards = this.pinnedRegionCards.map(regionCard => {
            return {
                startTime: regionCard.startTime,
                endTime: regionCard.endTime,
                label: regionCard.getLabel(),
                step: regionCard.step,
            };
        });

        allCards.sort((rcDescA, rcDescB) => {
            return rcDescA.startTime - rcDescB.startTime;
        });

        for (let envelope of openEnvelopes) {
            let objectKey = envelope.object;
            let frameKey = envelope.frame;
            if (frameKey !== this.frame) {
                continue;
            }
            const motionStudyData = Object.assign(
                {},
                this.lastHydratedData || {},
                {
                    plan: this.plan && {
                        id: this.plan.id,
                        name: this.plan.name,
                    },
                    regionCards: allCards,
                    valueAddWasteTime: this.valueAddWasteTimeManager.toJSON()
                },
            );
            if (this.getTitle()) {
                motionStudyData.title = this.getTitle();
            }
            realityEditor.network.realtime.writePublicData(objectKey, frameKey, frameKey + 'storage', 'analyticsData', motionStudyData);

            if ((this.recordingState === RecordingState.done ||
                this.recordingState === RecordingState.saving) &&
                this.plan) {
                this.windchill.writeProcessPlanData(this.plan, this.pinnedRegionCards);
            }
        }

        if (this.pinnedRegionCards.length > 0) {
            this.createStepSensorsButton.show();
        }

        this.updateSummarizedState();
    }

    updateSummarizedState() {
        if (!realityEditor?.ai?.updateSummarizedState) {
            return;
        }

        let title = this.getTitle();
        let operationCount = this.pinnedRegionCards.length;
        let summary = `The process plan's motion study is labeled "${title}" and contains ${operationCount} operations. `;
        let cardSummaries = this.pinnedRegionCards.map((card, i) => {
            let cardSummary = `Operation ${i} is "${card.getLabel()}", `;
            let duration = Math.round((card.endTime - card.startTime) / 1000) + ' seconds';
            cardSummary += `took ${duration} to complete, `;
            if (card.step) {
                let prefix = `was planned in `;
                if (card.step.laborTimeSeconds > 0.5) { // Interesting non-zero planned time
                    prefix = `was planned to take ${card.step.laborTimeSeconds} seconds in `;
                }
                let stepDesc = prefix + `WindChill operation id "${card.step.id}", `;
                cardSummary += stepDesc;
            }
            let rebaAvg = card.graphSummaryValues?.REBA?.average;
            if (!rebaAvg) {
                cardSummary += 'and is missing information on repetitive strain. ';
            } else {
                cardSummary += 'and has ';
                if (rebaAvg < 4) {
                    cardSummary += 'a safe '
                } else if (rebaAvg < 8) {
                    cardSummary += 'a potentially unsafe ';
                } else {
                    cardSummary += 'an unsafe ';
                }
                cardSummary += 'level of repetitive strain.';
            }
            return cardSummary;
        });
        summary += cardSummaries.join(' ');

        summary += '\n' + this.getSummarizedTimelineState();

        realityEditor.ai.updateSummarizedState(this.frame, summary);
    }

    getSummarizedTimelineState() {
        const allPoses = this.getPosesInTimeIntervalWithFallback(
            this.lastDisplayRegion.startTime,
            this.lastDisplayRegion.endTime,
        );
        if (allPoses.length === 0) {
            return;
        }

        let events = [];
        for (let sensorFrame of this.sensors.getSensorFrames()) {
             events = events.concat(this.getSensorEvents(sensorFrame, allPoses));
        }
        events.sort((a, b) => {
            return a.time - b.time;
        });
        const startTime = this.lastDisplayRegion.startTime;
        return events.map(event => {
            let dir = event.enter ? 'entered' : 'left';
            return ` - ${Math.round((event.time - startTime) / 1000)} seconds: the person ${dir} ${event.sensor}`;
        }).join('\n');
    }

    getSensorEvents(sensorFrame, poses) {
        let lastPoseActive = false; // creates a default 'entered' event if the sensor was already active
        let events = [];
        for (const pose of poses) {
            const poseActive = this.sensors.isSensorActive(sensorFrame, pose);
            const isSwap = poseActive !== lastPoseActive;
            if (!isSwap) {
                lastPoseActive = poseActive;
                continue;
            }

            events.push({
                 enter: poseActive,
                 time: pose.timestamp,
                 sensor: sensorFrame,
            });

            lastPoseActive = poseActive;
        }

        return events;
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

            this.sortPinnedRegionCards();
        }, 750);
    }

    unpinRegionCard(regionCard) {
        this.pinnedRegionCards = this.pinnedRegionCards.filter(prc => {
            return prc !== regionCard;
        });
        this.updateExportLinks();
        this.writeMotionStudyData();
        this.updateTableView();
    }

    updateExportLinks() {
        this.updatePinnedRegionCardsExportLink();
        this.updatePoseDataExportLink();
    }

    aggregateRegionCardSummaryValues(regionCards) {
        if (regionCards.length === 0) {
            return {};
        }
        if (!regionCards[0].hasOwnProperty('graphSummaryValues') ||
            !regionCards[0].graphSummaryValues.hasOwnProperty('REBA')) {
            console.error('first region card missing summary values');
            return {};
        }

        // initialize the object with aggregated stats
        let result = {
            startTime: regionCards[0].startTime,
            endTime: regionCards[0].endTime,
            durationMs: 0,
            distanceMm: 0,
            graphSummaryValues: {}
        };

        ['Accel', 'REBA', 'MURI'].forEach(name => {
            result.graphSummaryValues[name] = {
                average: 0,
                minimum: regionCards[0].graphSummaryValues[name].minimum,
                maximum: regionCards[0].graphSummaryValues[name].maximum,
                sum: 0,
                count: 0
            };
        });

        Object.values(MURI_SCORES).forEach(scoreName => {
            let name = 'MURI ' + scoreName;
            result.graphSummaryValues[name] = {
                average: 0,
                minimum: regionCards[0].graphSummaryValues[name].minimum,
                maximum: regionCards[0].graphSummaryValues[name].maximum,
                sum: 0,
                count: 0,
                levelCounts: new Array(MURI_CONFIG.scoreWeights.length).fill(0),
                levelDurations: new Array(MURI_CONFIG.scoreWeights.length + 1).fill(0),
                levelDurationPercentages: new Array(MURI_CONFIG.scoreWeights.length + 1).fill(0)
            };
        });

        // aggregate values which can be summed or min/max can be calculated
        for (let regionCard of regionCards) {
            if (regionCard.poses.length === 0) {
                continue;
            }

            if (regionCard.startTime < result.startTime) {
                result.startTime = regionCard.startTime;
            }
            if (regionCard.endTime > result.endTime) {
                result.endTime = regionCard.endTime;
            }
            result.durationMs += regionCard.durationMs;
            result.distanceMm += regionCard.distanceMm;
        
            ['Accel', 'REBA', 'MURI'].forEach(name => {
                if (regionCard.graphSummaryValues[name].minimum < result.graphSummaryValues[name].minimum) {
                    result.graphSummaryValues[name].minimum = regionCard.graphSummaryValues[name].minimum;
                }
                if (regionCard.graphSummaryValues[name].maximum > result.graphSummaryValues[name].maximum) {
                    result.graphSummaryValues[name].maximum = regionCard.graphSummaryValues[name].maximum;
                }
                result.graphSummaryValues[name].sum += regionCard.graphSummaryValues[name].sum;
                result.graphSummaryValues[name].count += regionCard.graphSummaryValues[name].count;
            });

            Object.values(MURI_SCORES).forEach(scoreName => {
                let key = 'MURI ' + scoreName;
                if (regionCard.graphSummaryValues[key].minimum < result.graphSummaryValues[key].minimum) {
                    result.graphSummaryValues[key].minimum = regionCard.graphSummaryValues[key].minimum;
                }
                if (regionCard.graphSummaryValues[key].maximum > result.graphSummaryValues[key].maximum) {
                    result.graphSummaryValues[key].maximum = regionCard.graphSummaryValues[key].maximum;
                }
                result.graphSummaryValues[key].sum += regionCard.graphSummaryValues[key].sum;
                result.graphSummaryValues[key].count += regionCard.graphSummaryValues[key].count;
                
                result.graphSummaryValues[key].levelCounts.forEach((count, index, arr) => {
                    arr[index] += regionCard.graphSummaryValues[key].levelCounts[index];
                });
            });
        }

        // compute averages
        ['Accel', 'REBA', 'MURI'].forEach(name => {
            result.graphSummaryValues[name].average = result.graphSummaryValues[name].sum / result.graphSummaryValues[name].count;
        });

        // compute averages and convert individual level counts to time durations and their percentages 
        const singlePoseStandardTime =  1000 / HUMAN_TRACKING_FPS; // in ms
        Object.values(MURI_SCORES).forEach(scoreName => {
            let key = 'MURI ' + scoreName;
            result.graphSummaryValues[key].average = result.graphSummaryValues[key].sum / result.graphSummaryValues[key].count;

            // for more explanation, see RegionCard.getSummaryValuesExtended
            let levelDurationSum = 0;
            for (let i = 0; i < result.graphSummaryValues[key].levelCounts.length; i++) {
                result.graphSummaryValues[key].levelDurations[i] = result.graphSummaryValues[key].levelCounts[i] * singlePoseStandardTime;
                levelDurationSum += result.graphSummaryValues[key].levelDurations[i];
            }
            if (levelDurationSum > result.durationMs) {
                // it is possible to go bit over 100% because of theoretic regular singlePoseStandardTime
                // normalize durations to 100% of total step duration
                result.graphSummaryValues[key].levelDurations.forEach((duration, index, arr) => {
                    arr[index] = (duration / levelDurationSum) * result.durationMs;
                });
            }
            else {
                 // calculate duration when the value is unknown
                 result.graphSummaryValues[key].levelDurations[result.graphSummaryValues[key].levelDurations.length - 1] = result.durationMs - levelDurationSum;
            }
            
            result.graphSummaryValues[key].levelDurationPercentages.forEach((count, index, arr) => {
                arr[index] = (result.graphSummaryValues[key].levelDurations[index] / result.durationMs) * 100;
            }); 
        });

        return result; 
    }

    updatePinnedRegionCardsExportLink() {
        if (this.pinnedRegionCards.length === 0) {
            this.exportLinkPinnedRegionCards.href = '#';
            this.exportLinkPinnedRegionCards.classList.add('missing');
            return;
        }
        this.exportLinkPinnedRegionCards.classList.remove('missing');

        // compute total stats over all region cards
        // make a pseudo region card
        let totalCard = this.aggregateRegionCardSummaryValues(this.pinnedRegionCards);
        totalCard.getLabel = function() {
            return 'All steps';
        };
        totalCard.poses = [1]; // dummy member
        let regionCards = this.pinnedRegionCards.slice();
        regionCards.push(totalCard);

        let header = [
            'label',
            'start', 'end', 'duration seconds', 'distance meters',
            'accel avg', 'accel min', 'accel max',
            'reba avg', 'reba min', 'reba max', 'reba sum', 'reba count',
            'muri avg', 'muri min', 'muri max', 'muri sum', 'muri count'
        ];

        let sortedScoreWeights = MURI_CONFIG.scoreWeights.toSorted((a, b) => a - b);

        Object.values(MURI_SCORES).forEach(scoreName => {
            let titleTexts = ['muri ' + scoreName + ' avg',
                          'muri ' + scoreName + ' sum',
                          'muri ' + scoreName + ' count'];
            // sample counts for score levels
            sortedScoreWeights.forEach(weight => {
                titleTexts.push('muri ' + scoreName + ' level' + weight + ' count')
            });
            // time duration for score levels
            sortedScoreWeights.forEach(weight => {
                titleTexts.push('muri ' + scoreName + ' level' + weight + ' duration')
            });
            titleTexts.push('muri ' + scoreName + ' unknown duration')
            // time % for score levels
            sortedScoreWeights.forEach(weight => {
                titleTexts.push('muri ' + scoreName + ' level' + weight + ' %')
            });
            titleTexts.push('muri ' + scoreName + ' unknown %')

            header.push(...titleTexts);
        });

        let lines = [header];
        for (let regionCard of regionCards) {
            if (regionCard.poses.length < 2) {
                // 0: no poses
                // 1: insufficient poses for analytics (avoiding weird bug too)
                continue;
            }

            let values = [
                regionCard.getLabel(),
                new Date(regionCard.startTime).toISOString(),
                new Date(regionCard.endTime).toISOString(),
                regionCard.durationMs / 1000,
                regionCard.distanceMm / 1000,
                regionCard.graphSummaryValues['Accel'].average,
                regionCard.graphSummaryValues['Accel'].minimum,
                regionCard.graphSummaryValues['Accel'].maximum,
                regionCard.graphSummaryValues['REBA'].average,
                regionCard.graphSummaryValues['REBA'].minimum,
                regionCard.graphSummaryValues['REBA'].maximum,
                regionCard.graphSummaryValues['REBA'].sum,
                regionCard.graphSummaryValues['REBA'].count,
                regionCard.graphSummaryValues['MURI'].average,
                regionCard.graphSummaryValues['MURI'].minimum,
                regionCard.graphSummaryValues['MURI'].maximum,
                regionCard.graphSummaryValues['MURI'].sum,
                regionCard.graphSummaryValues['MURI'].count,
            ];

            Object.values(MURI_SCORES).forEach(scoreName => {
                let key = 'MURI ' + scoreName;
                let selectedValuesForKey = [regionCard.graphSummaryValues[key].average, regionCard.graphSummaryValues[key].sum, regionCard.graphSummaryValues[key].count];
                selectedValuesForKey.push(...regionCard.graphSummaryValues[key].levelCounts);
                let levelDurationsSec = regionCard.graphSummaryValues[key].levelDurations.map(val => val / 1000);
                selectedValuesForKey.push(...levelDurationsSec);
                selectedValuesForKey.push(...regionCard.graphSummaryValues[key].levelDurationPercentages);
                values.push(...selectedValuesForKey);
            });

            lines.push(values);
        }

        

        let dataUrl = 'data:text/plain;charset=UTF-8,' + encodeURIComponent(lines.map(line => {
            return line.join(',');
        }).join('\n'));

        this.exportLinkPinnedRegionCards.href = dataUrl;
        // window.open(dataUrl, '_blank');
    }

    updatePoseDataExportLink() {
        const allPoses = this.humanPoseAnalyzer.getPosesInTimeInterval(0, Number.MAX_VALUE);

        if (allPoses.length === 0) {
            this.exportLinkPoseData.href = '#';
            this.exportLinkPoseData.classList.add('missing');
            return;
        }

        this.exportLinkPoseData.classList.remove('missing');

        // Create array manually since we can go over the JSON.stringify and string
        // length limits
        const poseStrings = ['['];

        for (const pose of allPoses) {
            let filteredPose = {
                joints: {},
                timestamp: pose.timestamp,
                metadata: {}
            };

            for (const jointKey of Object.keys(pose.joints)) {
                const jointData = pose.joints[jointKey];
                // Clone to modify pose data (filter out unnecessary info)
                filteredPose.joints[jointKey] = Object.assign({}, jointData);
                delete filteredPose.joints[jointKey].poseObjectId;
                delete filteredPose.joints[jointKey].rebaColor;
                delete filteredPose.joints[jointKey].rebaColorOverall;
                delete filteredPose.joints[jointKey].overallRebaColor;
                delete filteredPose.joints[jointKey].muriColor;
                delete filteredPose.joints[jointKey].position;
                delete filteredPose.joints[jointKey].acceleration;
                delete filteredPose.joints[jointKey].velocity;
                delete filteredPose.joints[jointKey].confidence;
            }

            // export muri related data 
            filteredPose.metadata.ergonomics = pose.metadata.ergonomics;
            filteredPose.metadata.muriScores = pose.metadata.muriScores;
            filteredPose.metadata.overallMuriScore = pose.metadata.overallMuriScore; 

            poseStrings.push(JSON.stringify(filteredPose));
            poseStrings.push(',');
        }
        poseStrings.pop();
        poseStrings.push(']');

        const blob = new Blob(poseStrings, {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        this.exportLinkPoseData.href = url;
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

        if (!this.activeRegionCard || !this.activeRegionCard.step) {
            window.location.hash = '';
        } else {
            window.location.hash = this.activeRegionCard.step.id;
        }

    }

    /**
     * Shows any region card matching the label of
     * regionCardToMatch
     * @param {RegionCard} regionCardToMatch
     * @return {boolean} whether a card was shown
     */
    showMatchingRegionCard(regionCardToMatch) {
        // const idToMatch = regionCardToMatch.step?.id;
        const labelToMatch = regionCardToMatch.getLabel();
        if (!labelToMatch) {
            return false;
        }

        const matchingRegionCard = this.pinnedRegionCards.find((regionCard) => {
            const label = regionCard.getLabel();
            if (!label) {
                return false;
            }

            return label === labelToMatch;
        });

        if (!matchingRegionCard) {
            return false;
        }

        matchingRegionCard.show();

        return true;
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

        this.updateExportLinks();
        //this.writeMotionStudyData();
    }

}
