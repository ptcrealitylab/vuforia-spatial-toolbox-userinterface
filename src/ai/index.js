createNameSpace("realityEditor.ai");

import { ChatInterface } from './ChatInterface.js';

/**
 * @fileOverview - Note: most of the AI system has been refactored to ChatInterface.js and associated classes
 * This file currently contains some code that connects the logic of the ChatInterface with the actual GUI of
 * the chat DOM elements, and some helper functions for interacting with those DOM elements.
 * @todo: Most of this can probably eventually be refactored out of here and into additional AI classes.
 */
(function(exports) {
    
    let callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('ai');
    let chatInterface = null;

    function registerCallback(functionName, callback) {
        if (!callbackHandler) {
            callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('ai');
        }
        callbackHandler.registerCallback(functionName, callback);
    }

    function focusOnFrame(frameKey) {

        let spatialReference = chatInterface.spatialUuidMapper.spatialReferenceMap[frameKey];
        if (spatialReference) {
            // console.log(`found ${this.hoveredFrameId} in spatialReferenceMap`);
            let position3d = realityEditor.gui.threejsScene.convertToVector3(spatialReference.position);

            // console.log(partInfo);
            let floorOffset = realityEditor.gui.ar.areaCreator.calculateFloorOffset();
            // let partPosition = new THREE.Vector3(partInfo.position.x, partInfo.position.y - floorOffset, partInfo.position.z);
            // let framePosition = realityEditor.gui.threejsScene.getToolPosition(frameKey);

            position3d.y -= floorOffset; // TODO: is this correction always necessary? is there a cleaner place to add it?
            
            let cameraPosition = realityEditor.gui.threejsScene.getCameraPosition();
            let cameraDirection = cameraPosition.clone().sub(position3d).normalize();
            callbackHandler.triggerCallbacks('shouldFocusVirtualCamera', {
                pos: {x: position3d.x, y: position3d.y, z: position3d.z},
                dir: {x: cameraDirection.x, y: cameraDirection.y, z: cameraDirection.z},
                zoomDistanceMm: 1000
            });

        } else {
            let framePosition = realityEditor.gui.threejsScene.getToolPosition(frameKey);
            let cameraPosition = realityEditor.gui.threejsScene.getCameraPosition();
            let frameDirection = cameraPosition.clone().sub(framePosition).normalize();
            callbackHandler.triggerCallbacks('shouldFocusVirtualCamera', {
                pos: {x: framePosition.x, y: framePosition.y, z: framePosition.z},
                dir: {x: frameDirection.x, y: frameDirection.y, z: frameDirection.z},
                zoomDistanceMm: 3000
            });
        }
    }
    
    function onAvatarChangeName(oldName, _newName) {
        // todo Steve: after switching from getavatarIdFromSessionId() to getAvatarObjectKeyFromSessionId(), this still stays the old way. Need to change later
        let _timestamp = getFormattedTime();
        if (oldName === null) {
            // let newInfo = `User ${newName} joined the space at ${timestamp}`;
            // aiPrompt += `\n${newInfo}`;
        } else {
            // let newInfo = `User ${oldName} has changed their name to ${newName}`;
            // aiPrompt += `\n${newInfo}`;
        }
    }
    
    function getFormattedTime() {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    let aiContainer;
    let endpointArea, apiKeyArea;
    let searchTextArea;
    let dialogueContainer;
    
    let keyPressed = {
        'Shift': false,
        'Enter': false,
    };
    let map;
    
    function initService() {
        aiContainer = document.getElementById('ai-chat-tool-container');
        endpointArea = document.getElementById('ai-endpoint-text-area');
        apiKeyArea = document.getElementById('ai-api-key-text-area');
        searchTextArea = document.getElementById('searchTextArea');
        searchTextArea.style.display = 'none'; // initially, before inputting endpoint and api key, hide the search text area
        dialogueContainer = document.getElementById('ai-chat-tool-dialogue-container');

        map = realityEditor.ai.mapping;
        map.setupEventListeners();
        
        scrollToBottom();
        initTextAreaSize();
        adjustTextAreaSize();
        setupEventListeners();
        // setupSystemEventListeners();
        hideEndpointApiKeyAndShowSearchTextArea();

        // This is where the magic happens
        chatInterface = new ChatInterface();

        // Note: temporarily exposed as global variable for experimental purposes.
        // If possible, minimize the use of directly accessing this outside of the ai modules.
        realityEditor.ai.chatInterface = chatInterface;
    }

    /**
     * This provides an alternative way to update the AI system's knowledge of the state of a tool.
     * The primary method is using the languageInterface.updateSummarizedState API within iframes.
     *
     * @param {string} toolId
     * @param {string} stateSummary - While JSON would work (or JSON.stringified object), I hypothesize that it works
     *                                best wrapped in a bit of natural language, e.g. `The tool has ${numLines} lines.`
     */
    function updateSummarizedState(toolId, stateSummary) {
        if (!chatInterface) {
            console.warn('updateSummarizedState: chatInterface not initialized yet');
            return;
        }
        
        if (!chatInterface.objectDataModelSource) {
            console.warn('updateSummarizedState: chatInterface doesnt have a objectDataModelSource');
            return;
        }

        chatInterface.objectDataModelSource.updateSummarizedState({
            applicationId: toolId,
            summarizedState: stateSummary
        });
    }
    
    function displayAnswer(answer) {
        // let html = map.postprocess(answer);
        // console.log(map.postprocessBen(answer));

        // let html = map.postprocessBen(answer);
        // pushAIDialogue(html);

        let html = answer.replace(/\n/g, '<br>');
        let d = document.createElement('div');
        d.classList.add('ai-chat-tool-dialogue', 'ai-chat-tool-dialogue-ai');
        d.innerHTML = html;
        pushAIDialogue(d);
    }

    function showDialogue() {
        aiContainer.style.animation = `slideToRight 0.2s ease-in forwards`;
        setTimeout(() => {
            let searchArea = document.getElementById('searchTextArea');
            searchArea.focus();
        }, 500);
    }
    
    function hideDialogue() {
        aiContainer.style.animation = `slideToLeft 0.2s ease-in forwards`;
    }
    
    function hideEndpointApiKeyAndShowSearchTextArea() {
        endpointArea.style.display = 'none';
        apiKeyArea.style.display = 'none';
        searchTextArea.style.display = 'block';
        adjustTextAreaSize();
    }

    function setupEventListeners() {
        // endpointArea.addEventListener('keydown', (e) => {
        //     e.stopPropagation();
        //     if (e.key === 'Enter') {
        //         e.preventDefault();
        //         if (endpointArea.value === '' || apiKeyArea.value === '') return;
        //         realityEditor.network.postAiApiKeys(endpointArea.value, apiKeyArea.value, true);
        //     }
        // })
        // apiKeyArea.addEventListener('keydown', (e) => {
        //     e.stopPropagation();
        //     if (e.key === 'Enter') {
        //         e.preventDefault();
        //         if (endpointArea.value === '' || apiKeyArea.value === '') return;
        //         realityEditor.network.postAiApiKeys(endpointArea.value, apiKeyArea.value, true);
        //     }
        // })
        //
        // searchTextArea.addEventListener('input', function() {
        //     // adjustTextAreaSize();
        // });
        
        searchTextArea.addEventListener('pointerdown', (e) => {e.stopPropagation();});
        searchTextArea.addEventListener('pointerup', (e) => {e.stopPropagation();});
        searchTextArea.addEventListener('pointermove', (e) => {e.stopPropagation();});
        searchTextArea.addEventListener('contextmenu', (e) => {e.stopPropagation();});

        searchTextArea.addEventListener('keydown', (e) => {
            e.stopPropagation();
            adjustTextAreaSize();
            
            if (e.key === 'Enter') {
                e.preventDefault();
                keyPressed['Enter'] = true;

                if (keyPressed['Shift'] === true) {
                    searchTextArea.value += '\n';
                    adjustTextAreaSize();
                    return;
                }

                pushMyDialogue(searchTextArea.value);
                clearMyDialogue();
                adjustTextAreaSize();
            } else if (e.key === 'Shift') {
                e.preventDefault();
                keyPressed['Shift'] = true;

                if (keyPressed['Enter'] === true) {
                    searchTextArea.value += '\n';
                    adjustTextAreaSize();
                }
            }
        });

        searchTextArea.addEventListener('keyup', (e) => {
            e.stopPropagation();
            
            if (e.key === 'Enter') {
                keyPressed['Enter'] = false;
            } else if (e.key === 'Shift') {
                keyPressed['Shift'] = false;
            }
        });

        window.addEventListener('blur', () => {
            keyPressed['Enter'] = false;
            keyPressed['Shift'] = false;
        });

        dialogueContainer.addEventListener('wheel', (e) => {
            e.stopPropagation();
        });

        window.addEventListener('resize', () => {
            adjustTextAreaSize();
        });
    }

    let originalHeight = null;
    function initTextAreaSize() {
        originalHeight = searchTextArea.scrollHeight;
    }
    
    function adjustTextAreaSize() {
        // searchTextArea.style.flexShrink = '1';
        // searchTextArea.style.height = 'auto';
        if (searchTextArea.scrollHeight > window.innerHeight / 4) {
            searchTextArea.style.height = (window.innerHeight / 4) + 'px';
        } else {
            searchTextArea.style.height = (searchTextArea.scrollHeight) + 'px';
            // todo Steve: this function is buggy, doesn't return the smallest scroll height of the text box
        }
        // searchTextArea.style.flexShrink = '0';
    }
    
    function resetTextAreaSize() {
        if (originalHeight === null) {
            originalHeight = searchTextArea.scrollHeight;
            searchTextArea.style.height = originalHeight + 'px';
        } else {
            searchTextArea.style.height = originalHeight + 'px';
        }
    }
    
    function pushToolDialogue(frames, result) {
        let d = document.createElement('div');
        d.classList.add('ai-chat-tool-dialogue', 'ai-chat-tool-dialogue-ai', 'ai-chat-tool-dialogue-tools');
        d.innerText = `Here are all the ${result} tools:`;
        
        for (let frame of frames) {
            let b = document.createElement('button');
            let frameKey = frame.uuid;
            b.innerText = `${frame.src} tool`;
            b.addEventListener('click', () => {
                focusOnFrame(frameKey);
            });
            d.appendChild(b);
        }
        
        dialogueContainer.append(d);
        scrollToBottom();
    }

    function getMostRecentMessage() {
        if (dialogueContainer.childElementCount === 0) return null;
        let mostRecentMessageDiv = dialogueContainer.lastChild;
        return {
            role: "user",
            content: `${map.preprocess(mostRecentMessageDiv.innerHTML)}`
        }
    }

    function pushMyDialogue(text) {
        if (!text.trim()) {
            console.log('error');
            return;
        }
        let d = document.createElement('div');
        d.classList.add('ai-chat-tool-dialogue', 'ai-chat-tool-dialogue-my');
        d.innerText = text;
        dialogueContainer.append(d);
        realityEditor.avatar.network.sendAiDialogue(realityEditor.avatar.getMyAvatarNodeInfo(), d.outerHTML);
        scrollToBottom();

        chatInterface.askQuestion(getMostRecentMessage().content);
    }

    function pushAIDialogue(html) {
        dialogueContainer.append(html);
        realityEditor.avatar.network.sendAiDialogue(realityEditor.avatar.getMyAvatarNodeInfo(), html.outerHTML);
        scrollToBottom();
    }

    // TODO: adapt multi-user conversations to ensure compatibility with new ChatHistory class
    function pushDialogueFromOtherUser(html) {
        dialogueContainer.insertAdjacentHTML('beforeend', html);
    }

    function scrollToBottom() {
        dialogueContainer.scrollTop = dialogueContainer.scrollHeight;
    }

    function clearMyDialogue() {
        searchTextArea.value = '';
        resetTextAreaSize();
    }

    exports.initService = initService;
    exports.registerCallback = registerCallback;
    exports.displayAnswer = displayAnswer;
    exports.pushDialogueFromOtherUser = pushDialogueFromOtherUser;
    exports.onAvatarChangeName = onAvatarChangeName;
    exports.showDialogue = showDialogue;
    exports.hideDialogue = hideDialogue;
    exports.hideEndpointApiKeyAndShowSearchTextArea = hideEndpointApiKeyAndShowSearchTextArea;
    exports.focusOnFrame = focusOnFrame;
    exports.updateSummarizedState = updateSummarizedState;
    
}(realityEditor.ai));
