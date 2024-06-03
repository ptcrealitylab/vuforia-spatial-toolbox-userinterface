createNameSpace("realityEditor.ai");

import * as THREE from '../../thirdPartyCode/three/three.module.js';
import { ChatInterface } from './ChatInterface.js';

(function(exports) {
    
    let aiPrompt = '';
    let categorize_prompt = 'Which one of the following items best describes my question? 1. "summary", 2. "debug", 3. "tools", 4. "pdf", 5. "tool content", 6. "not relevant". You can only return one of these items in string.';
    let callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('ai');
    let chatInterface = null;
    
    let partMap = {};
    
    function getPartInfo(partId) {
        return partMap[partId];
    }

    function registerCallback(functionName, callback) {
        if (!callbackHandler) {
            callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('ai');
        }
        callbackHandler.registerCallback(functionName, callback);
    }
    
    function setupSystemEventListeners() {
        map.setupEventListeners();
        realityEditor.gui.pocket.registerCallback('frameAdded', (params) => {
            let avatarId = realityEditor.avatar.getAvatarObjectKeyFromSessionId(globalStates.tempUuid);
            onFrameAdded(params, avatarId);
        });
        realityEditor.network.registerCallback('frameAdded', (params) => {
            onFrameAdded(params, params.additionalInfo.avatarName);
        });
        // todo Steve: add tool reposition event triggering for the user who added the tool themselves
        realityEditor.network.registerCallback('frameRepositioned', (params) => {
            onFrameRepositioned(params, params.additionalInfo.avatarName);
        });
        realityEditor.device.registerCallback('vehicleDeleted', (params) => {
            let avatarId = realityEditor.avatar.getAvatarObjectKeyFromSessionId(globalStates.tempUuid);
            onFrameDeleted(params, avatarId);
        });
        realityEditor.network.registerCallback('vehicleDeleted', (params) => {
            onFrameDeleted(params, params.additionalInfo.avatarName);
        });
    }
    
    function focusOnFrame(frameKey) {

        let spatialReference = window.chatInterface.spatialUuidMapper.spatialReferenceMap[frameKey];
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
        // }
        
        
        // if (frameKey.includes('_part_')) {
        //     // special case for parts
        //     let partInfo = partMap[frameKey];
        //     if (partInfo) {
        //         console.log(partInfo);
        //         let floorOffset = realityEditor.gui.ar.areaCreator.calculateFloorOffset();
        //         let partPosition = new THREE.Vector3(partInfo.position.x, partInfo.position.y - floorOffset, partInfo.position.z);
        //         // let framePosition = realityEditor.gui.threejsScene.getToolPosition(frameKey);
        //         let cameraPosition = realityEditor.gui.threejsScene.getCameraPosition();
        //         let partDirection = cameraPosition.clone().sub(partPosition).normalize();
        //         callbackHandler.triggerCallbacks('shouldFocusVirtualCamera', {
        //             pos: {x: partPosition.x, y: partPosition.y, z: partPosition.z},
        //             dir: {x: partDirection.x, y: partDirection.y, z: partDirection.z},
        //             zoomDistanceMm: 1000
        //         });
        //     }
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
        console.log(newInfo);
        // let newInfo = `${avatarId} added ${frameId} at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        // let newInfo = `The user ${avatarName} id:${avatarId} added a tool ${frameType} id:${frameId} at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        aiPrompt += `\n${newInfo}`;
    }
    
    function onFrameRepositioned(params, avatarId = 'Anonymous id') {
        let objectId = params.objectKey;
        let frameId = params.frameKey;
        let frameType = params.additionalInfo.frameType;
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
        aiPrompt += `\n${newInfo}`;
    }
    
    function onFrameDeleted(params, avatarId = 'Anonymous id') {
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
            aiPrompt += `\n${newInfo}`;
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
        aiPrompt += `\n${newInfo}`;
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
        aiPrompt += `\n${newInfo}`;
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
        aiPrompt += `\n${newInfo}`;
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
    let PAST_MESSAGES_INCLUDED = 20;
    let map;
    
    function initService() {
        aiContainer = document.getElementById('ai-chat-tool-container');
        endpointArea = document.getElementById('ai-endpoint-text-area');
        apiKeyArea = document.getElementById('ai-api-key-text-area');
        searchTextArea = document.getElementById('searchTextArea');
        searchTextArea.style.display = 'none'; // initially, before inputting endpoint and api key, hide the search text area
        dialogueContainer = document.getElementById('ai-chat-tool-dialogue-container');

        map = realityEditor.ai.mapping;
        
        scrollToBottom();
        initTextAreaSize();
        adjustTextAreaSize();
        setupEventListeners();
        setupSystemEventListeners();
        hideEndpointApiKeyAndShowSearchTextArea();

        chatInterface = new ChatInterface();
        window.chatInterface = chatInterface; // Note: temporarily exposed as global variable for debugging
    }

    function makeSafeString(input) {
        return input.replace(/\s+/g, '_');
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
                    let _cloneDataStart = motionStudy.humanPoseAnalyzer.getClonesByTimestamp(startTime);
                    let _cloneDataEnd = motionStudy.humanPoseAnalyzer.getClonesByTimestamp(endTime);
                }
            }
        }
        // return;
        
        let dialogueLengthTotal = dialogueContainer.children.length;
        let maxDialogueLength = Math.min(PAST_MESSAGES_INCLUDED, dialogueLengthTotal);
        let firstDialogueIndex = dialogueLengthTotal - maxDialogueLength - (PAST_MESSAGES_INCLUDED >= dialogueLengthTotal ? 0 : 1);
        let lastDialogueIndex = firstDialogueIndex + maxDialogueLength + (PAST_MESSAGES_INCLUDED >= dialogueLengthTotal ? 0 : 1);
        let conversation = {};
        for (let i = firstDialogueIndex; i < lastDialogueIndex; i++) {
            let child = dialogueContainer.children[i];
            let conversationObjectIndex = i;
            if (child.classList.contains('ai-chat-tool-dialogue-my')) {
                if (i === lastDialogueIndex - 1) { // last dialogue, need to include the categorize question here
                    conversation[conversationObjectIndex] = { role: "user", 
                        content: `${aiPrompt}\n${map.preprocess(child.innerHTML)}`, 
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

        // askQuestion();
        chatInterface.askQuestion(getMostRecentMessage().content);
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
    exports.registerCallback = registerCallback;
    exports.askQuestion = askQuestion;
    exports.getAnswer = getAnswer;
    exports.displayAnswer = displayAnswer;
    exports.getToolAnswer = getToolAnswer;
    exports.pushDialogueFromOtherUser = pushDialogueFromOtherUser;
    exports.onOpen = onOpen;
    exports.onClose = onClose;
    exports.onBlur = onBlur;
    exports.onFrameAdded = onFrameAdded;
    exports.onFrameRepositioned = onFrameRepositioned;
    exports.onFrameDeleted = onFrameDeleted;
    exports.onAvatarChangeName = onAvatarChangeName;
    exports.showDialogue = showDialogue;
    exports.hideDialogue = hideDialogue;
    exports.hideEndpointApiKeyAndShowSearchTextArea = hideEndpointApiKeyAndShowSearchTextArea;
    exports.focusOnFrame = focusOnFrame;
    exports.getPartInfo = getPartInfo;
    
}(realityEditor.ai));
