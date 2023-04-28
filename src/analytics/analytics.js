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

export class Analytics {
    /**
     * @param {string} frame - frame id associated with instance of
     * analytics
     */
    constructor(frame) {
        this.frame = frame;

        this.container = document.createElement('div');
        this.container.id = 'analytics-container';

        this.timelineContainer = document.createElement('div');
        this.timelineContainer.id = 'analytics-timeline-container';

        this.container.appendChild(this.timelineContainer);
        this.timeline = new Timeline(this, this.timelineContainer);

        this.threejsContainer = new THREE.Group();
        this.humanPoseAnalyzer = new HumanPoseAnalyzer(this, this.threejsContainer);
        this.opened = false;
        this.loadingHistory = false;
        this.livePlayback = false;
        this.lastDisplayRegion = null;
        this.pinnedRegionCards = [];
        this.activeRegionCard = null;
        this.nextStepNumber = 1;
        this.pinnedRegionCardsContainer = null;
        this.pinnedRegionCardsCsvLink = null;
        this.createNewPinnedRegionCardsContainer();

        this.draw = this.draw.bind(this);

        requestAnimationFrame(this.draw);
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
            this.container.removeChild(this.pinnedRegionCardsCsvLink);
        }
        const pinnedRegionCardsContainer = document.createElement('div');
        pinnedRegionCardsContainer.classList.add('analytics-pinned-region-cards-container');
        // Prevent camera control from stealing attempts to scroll the container
        pinnedRegionCardsContainer.addEventListener('wheel', (event) => {
            event.stopPropagation();
        });
        this.container.appendChild(pinnedRegionCardsContainer);

        this.pinnedRegionCardsCsvLink = document.createElement('a');
        this.pinnedRegionCardsCsvLink.classList.add('analytics-pinned-region-cards-csv');
        this.pinnedRegionCardsCsvLink.setAttribute('download', 'spatial analytics timeline regions.csv');
        this.pinnedRegionCardsCsvLink.textContent = 'csv';
        this.container.appendChild(this.pinnedRegionCardsCsvLink);

        this.pinnedRegionCardsContainer = pinnedRegionCardsContainer;
        this.pinnedRegionCards = [];
    }

    draw() {
        if (this.container.parentElement) {
            this.timeline.draw();
        }
        requestAnimationFrame(this.draw);
    }

    /**
     * Processes the given historical poses and renders them efficiently
     * @param {Pose[]}  poses - the poses to render
     */
    bulkRenderHistoricalPoses(poses) {
        if (realityEditor.gui.poses.isPose2DSkeletonRendered()) return;
        poses.forEach(pose => {
            this.timeline.appendPose({
                time: pose.timestamp,
            });
        });
        this.humanPoseAnalyzer.bulkHistoricalPosesUpdated(poses);

    }

    /**
     * @param {{startTime: number, endTime: number}} highlightRegion
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
            this.activeRegionCard.updateShowButton();
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


    hydrateRegionCards(regionCardDescriptions) {
        if (this.loadingHistory) {
            setTimeout(() => {
                this.hydrateRegionCards(regionCardDescriptions);
            }, 100);
            return;
        }

        regionCardDescriptions.sort((rcDescA, rcDescB) => {
            return rcDescA.startTime - rcDescB.startTime;
        });

        for (let desc of regionCardDescriptions) {
            const poses = this.humanPoseAnalyzer.getPosesInTimeInterval(desc.startTime, desc.endTime);
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

        if (regionCard.getLabel().length === 0) {
            regionCard.setLabel('Step ' + this.nextStepNumber);
        }

        this.nextStepNumber += 1;

        this.updateCsvExportLink();
    }

    writeDehydratedRegionCards() {
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
            realityEditor.network.realtime.writePublicData(objectKey, frameKey, frameKey + 'storage', 'cards', allCards);
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
            this.writeDehydratedRegionCards();

            regionCard.switchContainer(this.pinnedRegionCardsContainer);
        }, 750);
    }

    unpinRegionCard(regionCard) {
        this.pinnedRegionCards = this.pinnedRegionCards.filter(prc => {
            return prc !== regionCard;
        });
        this.updateCsvExportLink();
        this.writeDehydratedRegionCards();
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
        let dataUrl = 'data:text/plain;base64,' + btoa(lines.map(line => {
            return line.join(',');
        }).join('\n'));

        this.pinnedRegionCardsCsvLink.href = dataUrl;
        // window.open(dataUrl, '_blank');
    }

    /**
     * @param {RegionCard} activeRegionCard
     */
    setActiveRegionCard(activeRegionCard) {
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
}
