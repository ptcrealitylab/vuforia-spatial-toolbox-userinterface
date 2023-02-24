import {Timeline} from './timeline.js';
import {
    RegionCard,
    RegionCardState,
} from './regionCard.js';
import {
    getHistoryPointsInTimeInterval,
    setHighlightTimeInterval,
    setDisplayTimeInterval,
    setHoverTime,
    setHistoryLinesVisible,
} from '../humanPose/draw.js';
import {
    loadHistory
} from '../humanPose/index.js';

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
        this.pinnedRegionCards = [];
        this.pinnedRegionCardsContainer = null;
        this.draw = this.draw.bind(this);

        requestAnimationFrame(this.draw);
    }

    add() {
        this.createNewPinnedRegionCardsContainer();

        document.body.appendChild(this.container);
        setHistoryLinesVisible(true);
        this.added = true;
    }

    remove() {
        document.body.removeChild(this.container);
        setHistoryLinesVisible(false);
        this.added = false;
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
        this.container.appendChild(pinnedRegionCardsContainer);

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
        if (!fromSpaghetti) {
            setHoverTime(time);
        }
    }

    /**
     * @param {{startTime: number, endTime: number}} highlightRegion
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    setHighlightRegion(highlightRegion, fromSpaghetti) {
        this.timeline.setHighlightRegion(highlightRegion);
        if (highlightRegion && !fromSpaghetti) {
            setHighlightTimeInterval(highlightRegion.startTime, highlightRegion.endTime);
        }
    }

    /**
     * @param {{startTime: number, endTime: number}} region
     * @param {boolean} fromSpaghetti - prevents infinite recursion from
     *                  modifying human pose spaghetti which calls this function
     */
    async setDisplayRegion(region, fromSpaghetti) {
        this.timeline.setDisplayRegion(region);
        this.loadingHistory = true;
        await loadHistory(region);
        this.loadingHistory = false;
        if (region && !fromSpaghetti) {
            setDisplayTimeInterval(region.startTime, region.endTime);
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
        for (let desc of regionCardDescriptions) {
            let regionCard = new RegionCard(this.pinnedRegionCardsContainer, getHistoryPointsInTimeInterval(desc.startTime, desc.endTime));
            regionCard.state = RegionCardState.Pinned;
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
    }

    writeDehydratedRegionCards() {
        // Write region card descriptions to public data of currently active envelope
        let openEnvelopes = realityEditor.envelopeManager.getOpenEnvelopes();
        let allCards = this.pinnedRegionCards.map(regionCard => {
            return {
                startTime: regionCard.startTime,
                endTime: regionCard.endTime,
            };
        });
        for (let envelope of openEnvelopes) {
            let objectKey = envelope.object;
            let frameKey = envelope.frame;
            realityEditor.network.realtime.writePublicData(objectKey, frameKey, frameKey + 'storage', 'cards', allCards);
        }
    }

    pinRegionCard(regionCard) {
        setTimeout(() => {
            regionCard.moveTo(35, 120 + (14 + 14 * 2 + 10) * this.pinnedRegionCards.length);
        }, 10);

        setTimeout(() => {
            regionCard.removePinAnimation();

            this.addRegionCard(regionCard);
            this.writeDehydratedRegionCards();

            regionCard.switchContainer(this.pinnedRegionCardsContainer);
        }, 750);
    }
}
