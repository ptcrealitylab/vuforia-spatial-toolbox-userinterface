import {Timeline} from './timeline.js';
import {
    RegionCard,
    RegionCardState,
} from './regionCard.js';
import {
    setHighlightRegion,
    setDisplayRegion,
    setCursorTime,
    clearHistoricalData,
    showAnalyzerSettingsUI,
    hideAnalyzerSettingsUI, getPosesInTimeInterval
} from '../humanPose/draw.js';
import {
    loadHistory
} from '../humanPose/index.js';
import {
    postPersistRequest,
} from './utils.js';

export class Analytics {
    constructor() {
        this.container = document.createElement('div');
        this.container.id = 'analytics-container';

        this.timelineContainer = document.createElement('div');
        this.timelineContainer.id = 'analytics-timeline-container';

        this.container.appendChild(this.timelineContainer);
        this.timeline = new Timeline(this.timelineContainer);
        this.added = false;
        this.loadingHistory = false;
        this.livePlayback = false;
        this.pinnedRegionCards = [];
        this.activeRegionCard = null;
        this.nextStepNumber = 1;
        this.pinnedRegionCardsContainer = null;
        this.pinnedRegionCardsCsvLink = null;
        this.draw = this.draw.bind(this);

        requestAnimationFrame(this.draw);
    }

    add() {
        this.createNewPinnedRegionCardsContainer();
        document.body.appendChild(this.container);
        this.added = true;
        showAnalyzerSettingsUI();
    }

    remove() {
        document.body.removeChild(this.container);
        clearHistoricalData();
        this.added = false;
        this.timeline.reset();
        hideAnalyzerSettingsUI();
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

    toggle() {
        if (this.added) {
            this.remove();
        } else {
            this.add();
        }
    }

    draw() {
        if (this.container.parentElement) {
            this.timeline.draw();
        }
        requestAnimationFrame(this.draw);
    }

    appendPose(pose) {
        this.timeline.appendPose(pose);
    }

    /**
     * @param {{startTime: number, endTime: number}} highlightRegion
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    setCursorTime(time, fromSpaghetti) {
        this.timeline.setCursorTime(time);
        setCursorTime(time, fromSpaghetti);
    }

    /**
     * @param {{startTime: number, endTime: number}} highlightRegion
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
        setHighlightRegion(highlightRegion, fromSpaghetti);
    }

    /**
     * @param {{startTime: number, endTime: number}} region
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    async setDisplayRegion(region, fromSpaghetti) {
        this.timeline.setDisplayRegion(region);
        let livePlayback = region.startTime < 0 || region.endTime < 0;
        if (this.livePlayback && !livePlayback) {
            await postPersistRequest();
        }
        this.livePlayback = livePlayback;
        this.loadingHistory = true;
        await loadHistory(region);
        this.loadingHistory = false;
        if (region && !fromSpaghetti) {
            setDisplayRegion(region);
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
            let regionCard = new RegionCard(this.pinnedRegionCardsContainer, getPosesInTimeInterval(desc.startTime, desc.endTime));
            regionCard.state = RegionCardState.Pinned;
            regionCard.setLabel(desc.label || ('Step ' + this.nextStepNumber));
            this.nextStepNumber += 1;
            regionCard.removePinAnimation();
            this.addRegionCard(regionCard);
        }
    }

    addRegionCard(regionCard) {
        for (let pinnedRegionCard of this.pinnedRegionCards) {
            if (pinnedRegionCard.startTime === regionCard.startTime &&
                pinnedRegionCard.endTime === regionCard.endTime) {
                // New region card already exists in the list
                return;
            }
        }
        this.pinnedRegionCards.push(regionCard);

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
            regionCard.moveTo(35, 120 + (14 + 14 * 3 + 10) * this.pinnedRegionCards.length);
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
