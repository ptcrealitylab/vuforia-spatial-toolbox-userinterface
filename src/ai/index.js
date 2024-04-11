createNameSpace("realityEditor.ai");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {
    
    let question1 = '';
    let categorize_prompt = 'Which one of the following items best describes my question? 1. "summary", 2. "debug", 3. "tools", 4. "pdf", 5. "tool content", 6. "not relevant". You can only return one of these items in string.';
    
    function setupSystemEventListeners() {
        map.setupEventListeners();
        realityEditor.gui.pocket.registerCallback('frameAdded', (params) => {
            let avatarId = realityEditor.avatar.getAvatarObjectKeyFromSessionId(globalStates.tempUuid);
            onFrameAdded(params, avatarId);
        });
        // todo Steve: add tool reposition event triggering for the user who added the tool themselves
        realityEditor.device.registerCallback('vehicleDeleted', (params) => {
            let avatarId = realityEditor.avatar.getAvatarObjectKeyFromSessionId(globalStates.tempUuid);
            onVehicleDeleted(params, avatarId);
        });
    }
    
    function focusOnFrame(frameKey) {
        let framePosition = realityEditor.gui.threejsScene.getToolPosition(frameKey);
        let cameraPosition = realityEditor.gui.threejsScene.getCameraPosition();
        let frameDirection = cameraPosition.clone().sub(framePosition).normalize();
        realityEditor.device.desktopCamera.focusVirtualCamera(framePosition, frameDirection);
    }
    
    function onFrameAdded(params, avatarId = 'Anonymous id') {
        let objectId = params.objectKey;
        let frameId = params.frameKey;
        let frameType = params.frameType;
        let frame = realityEditor.getFrame(objectId, frameId);
        
        let m = frame.ar.matrix;
        let position = new THREE.Vector3(m[12], m[13], m[14]);
        let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
        let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
        inverseGroundPlaneMatrix.invert();
        position.applyMatrix4(inverseGroundPlaneMatrix);

        let timestamp = getFormattedTime();
        let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
        let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
        let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
        map.addToMap(avatarId, avatarName, avatarScrambledId);
        map.addToMap(frameId, frameType, frameScrambledId);
        let newInfo = `User ${avatarScrambledId} added a ${frameScrambledId} tool at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        // let newInfo = `${avatarId} added ${frameId} at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        // let newInfo = `The user ${avatarName} id:${avatarId} added a tool ${frameType} id:${frameId} at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        question1 += `\n${newInfo}`;
    }
    
    function onFrameRepositioned(params, avatarId = 'Anonymous id') {
        let objectId = params.objectKey;
        let frameId = params.frameKey;
        let frameType = params.frameType;
        let frame = realityEditor.getFrame(objectId, frameId);

        let m = frame.ar.matrix;
        let position = new THREE.Vector3(m[12], m[13], m[14]);
        let groundPlaneMatrix = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
        let inverseGroundPlaneMatrix = new realityEditor.gui.threejsScene.THREE.Matrix4();
        realityEditor.gui.threejsScene.setMatrixFromArray(inverseGroundPlaneMatrix, groundPlaneMatrix);
        inverseGroundPlaneMatrix.invert();
        position.applyMatrix4(inverseGroundPlaneMatrix);

        let timestamp = getFormattedTime();
        let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
        let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
        let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
        map.addToMap(avatarId, avatarName, avatarScrambledId);
        map.addToMap(frameId, frameType, frameScrambledId);
        let newInfo = `User ${avatarScrambledId} repositioned a ${frameScrambledId} tool at ${timestamp} to (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        // let newInfo = `The user ${avatarName} id:${avatarId} repositioned a tool ${frameType} id:${frameId} at ${timestamp} to (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        question1 += `\n${newInfo}`;
    }
    
    function onVehicleDeleted(params, avatarId = 'Anonymous id') {
        if (params.objectKey && params.frameKey && !params.nodeKey) { // only send message about frames, not nodes
            let frameId = params.frameKey;
            let frameType = params.additionalInfo.frameType;

            let timestamp = getFormattedTime();
            let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
            let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
            let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
            map.addToMap(avatarId, avatarName, avatarScrambledId);
            map.addToMap(frameId, frameType, frameScrambledId);
            let newInfo = `User ${avatarScrambledId} deleted a ${frameScrambledId} tool at ${timestamp}`;
            // let newInfo = `The user ${avatarName} id:${avatarId} deleted a tool ${frameType} id:${frameId} at ${timestamp}`;
            question1 += `\n${newInfo}`;
        }
    }
    
    function onOpen(envelope, avatarId = 'Anonymous id') {
        const object = objects[envelope.object];
        if (!object) {
            return;
        }
        const frame = object.frames[envelope.frame];
        if (!frame) {
            return;
        }
        
        let timestamp = getFormattedTime();
        let frameId = frame.uuid;
        let frameType = frame.src;
        let additionalDescription = '';
        if (frameType === 'spatialDraw') {
            additionalDescription = ' and annotated the space';
        } else if (frameType === 'spatialAnalytics') {
            additionalDescription = " and started recording the worker's pose for later analysis";
        } else if (frameType === 'spatialMeasure') {
            additionalDescription = ' and measured some objects in the space';
        } else if (frameType === 'communication') {
            additionalDescription = ' and discussed about some issues';
        }
        let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
        let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
        let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
        map.addToMap(avatarId, avatarName, avatarScrambledId);
        map.addToMap(frameId, frameType, frameScrambledId);
        let newInfo = `User ${avatarScrambledId} opened a ${frameScrambledId} tool at ${timestamp} ${additionalDescription}`;
        question1 += `\n${newInfo}`;
    }

    function onClose(envelope, avatarId = 'Anonymous id') {
        const object = objects[envelope.object];
        if (!object) {
            return;
        }
        const frame = object.frames[envelope.frame];
        if (!frame) {
            return;
        }

        let timestamp = getFormattedTime();
        let frameId = frame.uuid;
        let frameType = frame.src;
        let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
        let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
        let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
        map.addToMap(avatarId, avatarName, avatarScrambledId);
        map.addToMap(frameId, frameType, frameScrambledId);
        let newInfo = `User ${avatarScrambledId} closed a ${frameScrambledId} tool at ${timestamp}`;
        question1 += `\n${newInfo}`;
    }

    function onBlur(envelope, avatarId = 'Anonymous id') {
        const object = objects[envelope.object];
        if (!object) {
            return;
        }
        const frame = object.frames[envelope.frame];
        if (!frame) {
            return;
        }

        let timestamp = getFormattedTime();
        let frameId = frame.uuid;
        let frameType = frame.src;
        let avatarName = realityEditor.avatar.getAvatarNameFromObjectKey(avatarId);
        let avatarScrambledId = realityEditor.ai.crc.generateChecksum(avatarId);
        let frameScrambledId = realityEditor.ai.crc.generateChecksum(frameId);
        map.addToMap(avatarId, avatarName, avatarScrambledId);
        map.addToMap(frameId, frameType, frameScrambledId);
        let newInfo = `User ${avatarScrambledId} minimized a ${frameScrambledId} tool at ${timestamp}`;
        // let newInfo = `The user ${avatarName} id:${avatarId} minimized a tool ${frameType} id:${frame.uuid} at ${timestamp}`;
        question1 += `\n${newInfo}`;
    }
    
    function onAvatarChangeName(oldName, _newName) {
        // todo Steve: after switching from getavatarIdFromSessionId() to getAvatarObjectKeyFromSessionId(), this still stays the old way. Need to change later
        let _timestamp = getFormattedTime();
        if (oldName === null) {
            // let newInfo = `User ${newName} joined the space at ${timestamp}`;
            // question1 += `\n${newInfo}`;
        } else {
            // let newInfo = `User ${oldName} has changed their name to ${newName}`;
            // question1 += `\n${newInfo}`;
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
    let INCLUDE_TEST_HISTORY_MESSAGE = true;
    let PAST_MESSAGES_INCLUDED = 20 - (INCLUDE_TEST_HISTORY_MESSAGE ? 1 : 0);
    let map;
    
    function initService() {
        aiContainer = document.getElementById('ai-chat-tool-container');
        endpointArea = document.getElementById('ai-endpoint-text-area');
        apiKeyArea = document.getElementById('ai-api-key-text-area');
        searchTextArea = document.getElementById('searchTextArea');
        searchTextArea.style.display = 'none'; // initially, before inputting endpoint and api key, hide the search text area
        dialogueContainer = document.getElementById('ai-chat-tool-dialogue-container');

        map = realityEditor.ai.map;
        
        scrollToBottom();
        initTextAreaSize();
        adjustTextAreaSize();
        setupEventListeners();
        setupSystemEventListeners();
    }
    
    function authorSetToString(authorSet) {
        let authorSetArr = Array.from(authorSet);
        let authorSetString = '';
        if (authorSetArr.length === 1) {
            authorSetString = `${authorSetArr[0]}`;
            return authorSetString;
        }
        for (let i = 0; i < authorSetArr.length; i++) {
            if (i === 0) {
                authorSetString += authorSetArr[0];
            } else if (i === authorSetArr.length - 1) {
                authorSetString += `, and ${authorSetArr[authorSetArr.length - 1]}`;
            } else {
                authorSetString += `, ${authorSetArr[i]}`;
            }
        }
        return authorSetString;
    }
    
    function askQuestion() {
        let authorAll = [];
        let chatAll = [];
        // todo Steve: for the MS recording
        let frames = realityEditor.worldObjects.getBestWorldObject().frames;
        for (const frameId in frames) {
            const frame = frames[frameId];
            if (frame.src === 'communication') {
                const storage = Object.values(frame.nodes)[0];
                const messages = storage.publicData.messages;
                if (messages === undefined) continue;
                let authorSet = new Set();
                let chat = '';
                for (const message of messages) {
                    authorSet.add(message.author);
                    chat += message.messageText;
                    chat += '. ';
                }
                authorAll.push(authorSetToString(authorSet));
                chatAll.push(chat);
            } else if (frame.src === 'spatialAnalytics') {
                console.log(frame);
                let hpos = realityEditor.humanPose.returnHumanPoseObjects();
                console.log(hpos);
                
                const storage = Object.values(frame.nodes)[0];
                const regionCards = storage.publicData.analyticsData.regionCards;
                for (let i = 0; i < regionCards.length; i++) {
                    let _label = regionCards[i].label;
                    let startTime = regionCards[i].startTime;
                    let endTime = regionCards[i].endTime;
                    let motionStudy = realityEditor.motionStudy.getMotionStudyByFrame(frameId);
                    if (motionStudy === undefined) continue;
                    let _cloneDataStart = motionStudy.humanPoseAnalyzer.getDataByTimestamp(startTime);
                    let _cloneDataEnd = motionStudy.humanPoseAnalyzer.getDataByTimestamp(endTime);
                }
            }
        }
        // return;
        
        let dialogueLengthTotal = dialogueContainer.children.length;
        let maxDialogueLength = Math.min(PAST_MESSAGES_INCLUDED, dialogueLengthTotal);
        let firstDialogueIndex = dialogueLengthTotal - maxDialogueLength - (PAST_MESSAGES_INCLUDED >= dialogueLengthTotal ? 0 : 1);
        let lastDialogueIndex = firstDialogueIndex + maxDialogueLength + (PAST_MESSAGES_INCLUDED >= dialogueLengthTotal ? 0 : 1);
        // firstDialogueIndex += (INCLUDE_TEST_HISTORY_MESSAGE ? 1 : 0);
        let conversation = {};
        for (let i = firstDialogueIndex; i < lastDialogueIndex; i++) {
            let child = dialogueContainer.children[i];
            let conversationObjectIndex = i + (INCLUDE_TEST_HISTORY_MESSAGE ? 1 : 0);
            if (child.classList.contains('ai-chat-tool-dialogue-my')) {
                if (i === lastDialogueIndex - 1) { // last dialogue, need to include the categorize question here
                    // conversation[conversationObjectIndex] = { role: "user", content: `${child.innerText}`, extra: `${categorize_prompt}` };
                    conversation[conversationObjectIndex] = { role: "user", 
                        content: `${question1}\n${map.preprocess(child.innerHTML)}`, 
                        extra: `${categorize_prompt}`, 
                        communicationToolInfo: {
                            authorAll,
                            chatAll
                        } 
                    };
                } else {
                    conversation[conversationObjectIndex] = {role: "user", content: `${map.preprocess(child.innerHTML)}`};
                }
            } else if (child.classList.contains('ai-chat-tool-dialogue-ai')) {
                conversation[conversationObjectIndex] = { role: "assistant", content: `${map.preprocess(child.innerHTML)}` };
            }
        }
        if (INCLUDE_TEST_HISTORY_MESSAGE) {
            // conversation[0] = { role: "user", content: `${question1}` };
        }
        // todo Steve: include extra information here to provide to ai
        let extra = {
            worldObjectId: realityEditor.worldObjects.getBestWorldObject().objectId,
        }
        console.log(conversation);
        realityEditor.network.postQuestionToAI(conversation, extra);
    }
    
    function getAnswer(category, answer) {
        console.log(`%c This question is of category ${category}`, 'color: blue');
        
        // todo Steve new: preprocess the answer in map.js, and then send out the processed answer to the dialogue
        //  but since the processed answer got fed straight into the ai prompt, not sure if this is a good idea, or the names need to be converted to ids again, and fed back to the ai
        let html = map.postprocess(answer);
        pushAIDialogue(html);
    }
    
    function getToolAnswer(category, tools) {
        console.log(`%c This question is of category ${category}`, 'color: blue');
        
        let result = tools.split('\n');
        console.log(result);
        let bestWorldObject = realityEditor.worldObjects.getBestWorldObject();
        let frames = [];
        for (let frame of Object.values(bestWorldObject.frames)) {
            if (!result.includes(frame.src)) continue;
            frames.push(frame);
        }
        pushToolDialogue(frames, result);
    }
    
    function showDialogue() {
        aiContainer.style.animation = `slideToRight 0.2s ease-in forwards`;
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
        endpointArea.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                if (endpointArea.value === '' || apiKeyArea.value === '') return;
                realityEditor.network.postAiApiKeys(endpointArea.value, apiKeyArea.value, true);
            }
        })
        apiKeyArea.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                if (endpointArea.value === '' || apiKeyArea.value === '') return;
                realityEditor.network.postAiApiKeys(endpointArea.value, apiKeyArea.value, true);
            }
        })
        
        searchTextArea.addEventListener('input', function() {
            // adjustTextAreaSize();
        });
        
        // todo Steve: below 4 doesn't work
        searchTextArea.addEventListener('mousedown', (e) => {e.stopPropagation();});
        searchTextArea.addEventListener('mouseup', (e) => {e.stopPropagation();});
        searchTextArea.addEventListener('mousemove', (e) => {e.stopPropagation();});
        searchTextArea.addEventListener('contextmenu', (e) => {
            e.stopPropagation();
        })
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'g' || e.key === 'G') {
                // console.log('%c G clicked', 'color: red');
            }
        })

        searchTextArea.addEventListener('focus', () => {
            // console.log('focus');
            // realityEditor.device.keyboardEvents.openKeyboard();
        });

        searchTextArea.addEventListener('blur', () => {
            // console.log('blur');
            // realityEditor.device.keyboardEvents.closeKeyboard();
        });

        searchTextArea.addEventListener('keydown', (e) => {
            // todo Steve: bug: press g/G still focuses the camera to target. Is it b/c remote operator event listener is added later than searchTextBar listener? Figure out how the orders & layers work
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

        dialogueContainer.addEventListener('wheel', (e) => {
            e.stopPropagation();
        })

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

        askQuestion();
    }

    function pushAIDialogue(html) {
        dialogueContainer.append(html);
        realityEditor.avatar.network.sendAiDialogue(realityEditor.avatar.getMyAvatarNodeInfo(), html.outerHTML);
        scrollToBottom();
    }
    
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
    exports.askQuestion = askQuestion;
    exports.getAnswer = getAnswer;
    exports.getToolAnswer = getToolAnswer;
    exports.pushDialogueFromOtherUser = pushDialogueFromOtherUser;
    exports.onOpen = onOpen;
    exports.onClose = onClose;
    exports.onBlur = onBlur;
    exports.onFrameAdded = onFrameAdded;
    exports.onFrameRepositioned = onFrameRepositioned;
    exports.onVehicleDeleted = onVehicleDeleted;
    exports.onAvatarChangeName = onAvatarChangeName;
    exports.showDialogue = showDialogue;
    exports.hideDialogue = hideDialogue;
    exports.hideEndpointApiKeyAndShowSearchTextArea = hideEndpointApiKeyAndShowSearchTextArea;
    exports.focusOnFrame = focusOnFrame;
    
}(realityEditor.ai));
