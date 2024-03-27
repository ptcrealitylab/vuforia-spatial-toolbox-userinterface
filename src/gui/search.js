createNameSpace('realityEditor.gui.search');

let searchElement;
let searchInput;
let searchVisible = false;

function getFrameText(frame) {
    if (frame.src === 'communication') {
        const storage = Object.values(frame.nodes)[0];
        const messages = storage.publicData.messages;
        if (!messages) {
            return 'communication';
        }
        let text = 'communication\n';
        for (const message of messages) {
            text += `${message.author}: ${message.messageText}\n`;
        }
        return text;
    } else if (frame.src === 'spatialPatch') {
        const storage = Object.values(frame.nodes)[0];
        const serialization =  storage.publicData.serialization;
        if (!serialization) {
            return 'photo';
        }
        return serialization.description || 'photo';
    } else if (frame.src === 'linkedFile') {
        const storage = Object.values(frame.nodes)[0];
        const summary = storage.publicData.summary;
        return summary || 'linked file';
    }
    return frame.src;
}

export {getFrameText};

function createSearch() {
    searchElement = document.createElement('div');
    searchElement.classList.add('search-container');
    searchElement.classList.add('search-container-hidden');

    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.classList.add('search-input');
    searchInput.addEventListener('keyup', e => e.stopPropagation());
    searchInput.addEventListener('keydown', e => {
        e.stopPropagation();
    });
    searchInput.addEventListener('input', () => {
        updateSearchHighlights();
    });
    searchInput.addEventListener('keypress', e => e.stopPropagation());

    searchElement.appendChild(searchInput);
    document.body.appendChild(searchElement);
}

let animations = {};

function setFrameHighlight(frame, isHighlighted) {
    const frameId = frame.uuid;
    let animation = animations[frameId];
    if (!isHighlighted) {
        if (!animation) {
            return;
        }
        animation.hoveredFrameId = null;
        if (animation.hoverAnimationPercent <= 0) {
            realityEditor.gui.recentlyUsedBar.removeAnimation(animation);
            delete animations[frameId];
        }
        return;
    }

    if (!animation) {
        animation = realityEditor.gui.recentlyUsedBar.createAnimation(frameId, true);
        animations[frameId] = animation;
    } else {
        animation.hoveredFrameId = frameId;
    }
}


function updateSearchHighlights() {
    let frames = realityEditor.worldObjects.getBestWorldObject().frames;
    for (const frameId in frames) {
        const frame = frames[frameId];
        let matches = false;
        let searchText = searchInput.value.toLowerCase();
        if (searchText.length > 0) {
            let envText = getFrameText(frame);
            matches = envText.toLowerCase().includes(searchText);
        }
        setFrameHighlight(frame, matches);
    }
}

function toggleShowSearch() {
    if (!searchElement) {
        createSearch();
    }
    searchVisible = !searchVisible;
    if (searchVisible) {
        searchElement.classList.remove('search-container-hidden');
        searchInput.focus();
    } else {
        searchElement.classList.add('search-container-hidden');
    }
}

export const initService = function initService() {
    realityEditor.device.keyboardEvents.registerCallback('keyUpHandler', function (params) {
        if (params.event.key !== '`') {
            return;
        }
        toggleShowSearch();
    });
};

realityEditor.gui.search.initService = initService;
