createNameSpace("realityEditor.ai");

import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function(exports) {
    
    let questionList = `
        When was Microsoft founded?
        What is PTC Reality Lab?
        Give me some example links on some state-of-the-art AR works.
        What is Microsoft Azure OpenAI?
    `;

    let question_list = `
        My question list is:
        1. What happened in the space?
        2. What happened while I wasn’t there?
        3. Give me a summary of the space
        4. Give me the data on the Harpak Alma machine
        5. How do I fix this machine?
        6. What’s wrong with this machine?
        7. Give me the voltage of this machine on 2022/12/12 6:00am
        8. Navigate me to the latest spatial drawing tool anyone put in the scene
        9. Give me a summary of the pdf
        10. How do I fix this machine? Is there any related manuals?
        11. Show me all the chat tools
        12. List all the tools in the space. // todo Steve: need to develop a custom function for this
        13. What did user A write in the chat tool?
        14. What did user B draw in the spatial drawing tool?
        15. What measurements did user C make in the latest spatial measure tool?
    `;

    let question0 = `
        Metaverse was created on 2023.12.5 timestamp 17. The name of the metaverse is harpak_ulma_000017, it is created with the center of a packaging machine.
        User A logged into the scene.
        User A created a spatial drawing tool at timestamp 173. The drawing tool has coordinates (489, 2345, 384).
        User B logged into the scene.
        User B opened the drawing tool at timestamp 175.
        User A used laser pointer to point around (1200, 500, 300).
        User B drew a circle centered around (1234, 458, 275).
        User B minimized the drawing tool.
        User A logged out.
        User B created a chat tool at timestamp 200 and added some text “We need to fix this machine here.” The chat tool has coordinates (900, 456, 213).
        User A logged into the scene.
        User A opened the chat tool and added some text “I used a wrench to displace the bolts. Will need to order some spare parts online.” He closed the chat tool.
        User A opened the drawing tool and added a cross at (0, 234, 21).
        User A closed the drawing tool.
        User B closed the chat tool.
        User B added an OnShape tool at (19, 321, 50). He downloaded a 3D model of a workbench and added it to the scene.
        User C logged into the scene.
        User C added a measurement tool into the scene, with center around coordinates (67, 139, 486).
        User C added a measure line from (3, 349, 22) to (254, 463, 956). The length is xxx.
    `;
    let question2 = `
    Metaverse was created by Ben Reynolds on March 20th, 2024 at 15:03, with the name "Harpak Ulma Troubleshooting".
    James Hobin joined the space at 15:08.
    Daniel Dangond joined the space at 15:08.
    Keranie Theodosiou joined the space at 15:08.
    Steve Xie joined the space at 15:08.
    Ben Reynolds added a spatialDraw tool at 15:10 with coordinates (982, 92, 222).
    James Hobin, Daniel Dangond, Keranie Theodosiou, and Steve Xie opened the spatialDraw tool and annotated the space.
    Keranie Theodosiou added a communication tool at 15:11.
    Keranie, Ben, and Steve reviewed the cable connections in the communication tool.
    James Hobin added a communication tool at 15:12, mentioning the cable falled out in testing.
    Ben Reynolds added a spatialAnalytics tool at 16:10, and started recording the worker's pose for later analysis.`;

    // todo Steve: for the MS recording
    let question3 = `
    James Hobin joined the space at 15:08
    Daniel Dangond joined the space at 15:08
    Keranie Theodosiou joined the space at 15:08
    Steve Xie joined the space at 15:08
    Ben Reynolds added a spatialDraw tool at 15:09 with coordinates (1109, -825, -820)
    Ben Reynolds opened a spatialDraw tool at 15:10 and annotated the space
    James Hobin opened a spatialDraw tool at 15:10 and annotated the space
    Daniel Dangond opened a spatialDraw tool at 15:10 and annotated the space
    Keranie Theodosiou opened a spatialDraw tool at 15:10 and annotated the space
    Steve Xie opened a spatialDraw tool at 15:10 and annotated the space
    Keranie Theodosiou closed a spatialDraw tool at 15:11
    Ben Reynolds closed a spatialDraw tool at 15:11
    Keranie Theodosiou added a communication tool at 15:11 with coordinates (334, -762, -1752)
    Keranie Theodosiou opened a communication tool at 15:11 and and discussed about some issues
    Ben Reynolds opened a communication tool at 15:11 and discussed about some issues
    Ben Reynolds closed a communication tool at 15:11
    Steve Xie closed a spatialDraw tool at 15:12
    Steve Xie opened a communication tool at 15:12 and discussed about some issues
    James Hobin closed a spatialDraw tool at 15:12
    James Hobin added a communication tool at 15:12 with coordinates (983, 229, -1435)
    James Hobin opened a communication tool at 15:13 and discussed about some issues
    Ben Reynolds opened a communication tool at 15:13 and discussed about some issues
    Ben Reynolds closed a communication tool at 15:15
    Ben Reynolds added a spatialAnalytics tool at 16:10
    Ben Reynolds opened a spatialAnalytics tool at 16:10 and started recording the worker's pose for later analysis
    Keranie Theodosiou opened a spatialAnalytics tool at 16:10 and started recording the worker's pose for later analysis
    James Hobin opened a spatialAnalytics tool at 16:10 and started recording the worker's pose for later analysis
    Ben Reynolds opened a communication tool at 16:12 and discussed about some issues`;
    
    let question1 = '';
    
    // let categorize_prompt = 'Categorize this question into one or more of the 5 categories: 1. summary, what did I miss, what happened; 2. debug, fix stuff, machine data, data source; 3. 3D scene understanding; 4. summarize documents, pdfs, txts, manuals, images; 5. tool contents. 6. Other. Your answer will be formatted in "number, <the corresponding question>" if only 1 category, and ["number, <the corresponding question>", "number, <the corresponding question>", ...] if multiple categories.';
    // let categorize_prompt = 'Categorize this question into one of the 6 categories: 1. summary, what did I miss, what happened; 2. debug, fix stuff, machine data, data source; 3. 3D scene understanding, spatial draw, chat, communication, spatial video, spatial recording, spatial analytics, onShape, spatial measurement, tool types; 4. summarize documents, pdfs, txts, manuals, images; 5. tool contents; 6. Other. You can only choose one of the following number as your answer: 1, 2, 3, 4, 5, 6.';
    // let categorize_prompt = 'Categorize this question into one of the 6 categories: 1. summary, what did I miss, what happened; 2. debug, fix stuff, machine data, data source; 3. 3D scene understanding, tool types; 4. summarize documents, pdfs, txts, manuals, images; 5. tool contents; 6. Other. You can only choose one of the following number as your answer: 1, 2, 3, 4, 5, 6.';
    // let categorize_prompt = 'Categorize this question into one of the 6 categories: 1. summary, what did I miss, what happened; 2. debug, fix stuff, machine data, data source; 3. 3D scene understanding, tools in the space, tool types; 4. summarize documents, pdfs, txts, manuals, images; 5. tool contents; 6. Other. You can only choose one of the following number as your answer: 1, 2, 3, 4, 5, 6.';
    // let categorize_prompt = 'Categorize this question into one of the 6 categories: 1. "summary", 2. "debug", 3. "tools", 4. "pdf", 5. "tool content", 6. "other". You can only return one of these categories in string.';
    // let categorize_prompt = 'Which one of the following items best describes my question? 1. "summary", 2. "debug", 3. "tools", 4. "pdf", 5. "tool content", 6. "not relevant". You can only return one of these items in string.';
    let categorize_prompt = 'Which one of the following items best describes my question? 1. "summary", 2. "debug", 3. "tools", 4. "pdf", 5. "tool content", 6. "not relevant". You can only return one of these items in string.';
    
    let potential_question = 'Give me all the spatial drawing tools';
    
    let history = '';
    
    function setupSystemEventListeners() {
        realityEditor.gui.pocket.registerCallback('frameAdded', (params) => {
            let avatarName = realityEditor.avatar.getAvatarNameFromSessionId(globalStates.tempUuid);
            onFrameAdded(params, avatarName);
        });
        // todo Steve: add tool reposition event triggering for the user who added the tool themselves
        realityEditor.device.registerCallback('vehicleDeleted', (params) => {
            let avatarName = realityEditor.avatar.getAvatarNameFromSessionId(globalStates.tempUuid);
            onVehicleDeleted(params, avatarName);
        });
    }
    
    function focusOnFrame(frameKey) {
        let framePosition = realityEditor.gui.threejsScene.getToolPosition(frameKey);
        let cameraPosition = realityEditor.gui.threejsScene.getCameraPosition();
        let frameDirection = cameraPosition.clone().sub(framePosition).normalize();
        realityEditor.device.desktopCamera.focusVirtualCamera(framePosition, frameDirection);
    }
    
    function onFrameAdded(params, avatarName = 'Anonymous user') {
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
        let newInfo = `${avatarName} added a ${frameType} tool at ${timestamp} at (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        question1 += `\n${newInfo}`;
    }
    
    function onFrameRepositioned(params, avatarName = 'Anonymous user') {
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
        let newInfo = `${avatarName} repositioned a ${frameType} tool at ${timestamp} to (${position.x.toFixed(0)},${position.y.toFixed(0)},${position.z.toFixed(0)})`;
        question1 += `\n${newInfo}`;
    }
    
    function addTestCube(pos) {
        let geo = new THREE.BoxGeometry(50, 50, 50);
        let mat = new THREE.MeshBasicMaterial({color: 0xff0000});
        let cube = new THREE.Mesh(geo, mat);
        cube.position.copy(pos);
        realityEditor.gui.threejsScene.addToScene(cube);
    }
    
    function onVehicleDeleted(params, avatarName = 'Anonymous user') {
        if (params.objectKey && params.frameKey && !params.nodeKey) { // only send message about frames, not nodes
            let objectId = params.objectKey;
            let frameId = params.frameKey;
            let frameType = params.additionalInfo.frameType;
            let frame = realityEditor.getFrame(objectId, frameId);

            let timestamp = getFormattedTime();
            let newInfo = `${avatarName} deleted a ${frameType} tool at ${timestamp}`;
            question1 += `\n${newInfo}`;
        }
    }
    
    function onOpen(envelope, avatarName = 'Anonymous user') {
        const object = objects[envelope.object];
        if (!object) {
            return;
        }
        const frame = object.frames[envelope.frame];
        if (!frame) {
            return;
        }
        
        let timestamp = getFormattedTime();
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
        let newInfo = `${avatarName} opened a ${frameType} tool at ${timestamp} ${additionalDescription}`;
        question1 += `\n${newInfo}`;
    }

    function onClose(envelope, avatarName = 'Anonymous user') {
        const object = objects[envelope.object];
        if (!object) {
            return;
        }
        const frame = object.frames[envelope.frame];
        if (!frame) {
            return;
        }

        let timestamp = getFormattedTime();
        let frameType = frame.src;
        let newInfo = `${avatarName} closed a ${frameType} tool at ${timestamp}`;
        question1 += `\n${newInfo}`;
    }

    function onBlur(envelope, avatarName = 'Anonymous user') {
        const object = objects[envelope.object];
        if (!object) {
            return;
        }
        const frame = object.frames[envelope.frame];
        if (!frame) {
            return;
        }

        let timestamp = getFormattedTime();
        let frameType = frame.src;
        let newInfo = `${avatarName} minimized a ${frameType} tool at ${timestamp}`;
        question1 += `\n${newInfo}`;
    }
    
    function onAvatarChangeName(oldName, newName) {
        // return; // todo Steve: for the MS recording
        let timestamp = getFormattedTime();
        if (oldName === null) {
            let newInfo = `User ${newName} joined the space at ${timestamp}`;
            question1 += `\n${newInfo}`;
        } else {
            let newInfo = `User ${oldName} has changed their name to ${newName}`;
            question1 += `\n${newInfo}`;
        }
    }
    
    function getFormattedTime() {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            // second: '2-digit',
            hour12: false // Set to true for AM/PM format
        });
    }

    let aiContainer;
    let searchTextArea;
    let dialogueContainer;

    let isAiContainerMinimized = false;
    let keyPressed = {
        'Shift': false,
        'Enter': false,
    };
    let INCLUDE_TEST_HISTORY_MESSAGE = true;
    let PAST_MESSAGES_INCLUDED = 20 - (INCLUDE_TEST_HISTORY_MESSAGE ? 1 : 0);
    
    function initService() {
        console.log('ai init service');
        aiContainer = document.getElementById('ai-chat-tool-container');
        searchTextArea = document.getElementById('searchTextArea');
        dialogueContainer = document.getElementById('ai-chat-tool-dialogue-container');

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
                let authorSet = new Set();
                let chat = '';
                for (const message of messages) {
                    authorSet.add(message.author);
                    chat += message.messageText;
                    chat += '. ';
                }
                authorAll.push(authorSetToString(authorSet));
                chatAll.push(chat);
            }
        }
        // authorAll = ["Keranie Theodosiou, Ben Reynolds, and Steve Xie", "James Hobin and Ben Reynolds"];
        // chatAll = ["Please check the connections here. Ok, we'll have our technician take a look. The top left corner cables look correct. Verified. Everything was reviewed. ", "Is this one connected properly? Remember this falling out in testing. We will check this."]
        let dialogueLengthTotal = dialogueContainer.children.length;
        let maxDialogueLength = Math.min(PAST_MESSAGES_INCLUDED, dialogueLengthTotal);
        let firstDialogueIndex = dialogueLengthTotal - maxDialogueLength - (PAST_MESSAGES_INCLUDED >= dialogueLengthTotal ? 0 : 1);
        let lastDialogueIndex = firstDialogueIndex + maxDialogueLength + (PAST_MESSAGES_INCLUDED >= dialogueLengthTotal ? 0 : 1);
        // firstDialogueIndex += (INCLUDE_TEST_HISTORY_MESSAGE ? 1 : 0);
        let conversation = {};
        console.log(firstDialogueIndex, lastDialogueIndex);
        console.log(dialogueContainer.children);
        for (let i = firstDialogueIndex; i < lastDialogueIndex; i++) {
            let child = dialogueContainer.children[i];
            let conversationObjectIndex = i + (INCLUDE_TEST_HISTORY_MESSAGE ? 1 : 0);
            if (child.classList.contains('ai-chat-tool-dialogue-my')) {
                if (i === lastDialogueIndex - 1) { // last dialogue, need to include the categorize question here
                    // conversation[conversationObjectIndex] = { role: "user", content: `${child.innerText}`, extra: `${categorize_prompt}` };
                    conversation[conversationObjectIndex] = { role: "user", 
                        content: `${question1}\n${child.innerText}`, 
                        extra: `${categorize_prompt}`, 
                        communicationToolInfo: {
                            authorAll,
                            chatAll
                        } 
                    };
                } else {
                    conversation[conversationObjectIndex] = {role: "user", content: `${child.innerText}`};
                }
            } else if (child.classList.contains('ai-chat-tool-dialogue-ai')) {
                conversation[conversationObjectIndex] = { role: "assistant", content: `${child.innerText}` };
            }
        }
        if (INCLUDE_TEST_HISTORY_MESSAGE) {
            // conversation[0] = { role: "user", content: `${question1}` };
        }
        console.log(conversation);
        realityEditor.network.postQuestionToAI(conversation);
    }
    
    function getAnswer(category, answer) {
        console.log(`%c This question is of category ${category}`, 'color: blue');
        
        pushAIDialogue(answer);
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

    function setupEventListeners() {
        searchTextArea.addEventListener('input', function(e) {
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

        searchTextArea.addEventListener('focus', (e) => {
            // console.log('focus');
            // realityEditor.device.keyboardEvents.openKeyboard();
        });

        searchTextArea.addEventListener('blur', (e) => {
            // console.log('blur');
            // realityEditor.device.keyboardEvents.closeKeyboard();
        });

        searchTextArea.addEventListener('keydown', (e) => {
            // e.preventDefault();
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
                // e.preventDefault();
                keyPressed['Enter'] = false;
            } else if (e.key === 'Shift') {
                // e.preventDefault();
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
        console.log(frames);
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
        scrollToBottom();

        askQuestion();
    }

    function pushAIDialogue(text) {
        console.log(text);
        if (!text.trim()) {
            console.log('error');
            return;
        }
        let html = text.replace(/\n/g, '<br><br>');
        let d = document.createElement('div');
        d.classList.add('ai-chat-tool-dialogue', 'ai-chat-tool-dialogue-ai');
        // d.innerText = text;
        d.innerHTML = html;
        dialogueContainer.append(d);
        scrollToBottom();
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
    exports.onOpen = onOpen;
    exports.onClose = onClose;
    exports.onBlur = onBlur;
    exports.onFrameAdded = onFrameAdded;
    exports.onFrameRepositioned = onFrameRepositioned;
    exports.onVehicleDeleted = onVehicleDeleted;
    exports.onAvatarChangeName = onAvatarChangeName;
    exports.showDialogue = showDialogue;
    exports.hideDialogue = hideDialogue;
    exports.focusOnFrame = focusOnFrame;
    
}(realityEditor.ai));
