createNameSpace("realityEditor.ai.mapping");

/**
 * @fileOverview realityEditor.ai.mapping
 * When a new "spatial action" (eg: add/reposition/delete/open/minimize/close a tool, avatar name change, etc) takes place,
 * add a mapping of the corresponding {id, name, scrambled id (crc.js encoded id)} as a reference.
 * These mappings will be used later to convert between ids and human-readable names when prompting & getting answer from the AI chatbot.
 */

(function(exports) {
    
    let bestWorldObjectId = '_WORLD_';
    let toolRegex = new RegExp(bestWorldObjectId);
    let avatarRegex = new RegExp('_AVATAR_');
    // let toolRegex = new RegExp("\\b[a-zA-Z0-9]{6}\\b");
    // let avatarRegex = new RegExp("\\b[a-zA-Z0-9]{6}\\b");
    let animations = {};

    // {id, scrambled id}, {scrambled id, id}, and {id, name} maps, with id as the unique identifier field, similar to traditional databases
    class ThreeMap {
        constructor() {
            this.idToScrambledId = new Map();
            this.scrambledIdToId = new Map();
            this.idToName = new Map();
        }

        set(key, value, scrambledKey) {
            if (this.idToScrambledId.has(key)) return;
            this.idToScrambledId.set(key, scrambledKey);
            this.scrambledIdToId.set(scrambledKey, key);
            this.idToName.set(key, value);
        }
    }
    
    let threeMap = new ThreeMap();
    
    function addToMap(key, value, scrambledKey) {
        console.log(`threeMap.set(${key}, ${value}, ${scrambledKey}`);
        threeMap.set(key, value, scrambledKey);
    }
    
    function printMap() {
        console.log(threeMap);
    }
    
    // preprocess the historical message that got fed into ai prompt, to replace actual names with id names
    // function preprocess(html) {
    //     // take the inner html, and convert id's back to scrambled id's, and replace name's with scrambled id's
    //     let resultHTML = new DOMParser().parseFromString(html, 'text/html');
    //     threeMap.idToScrambledId.forEach((value, key) => {
    //         let spans = [...resultHTML.querySelectorAll(`span[data-id="${key}"]`)];
    //         spans.forEach(span => {
    //             span.textContent = value;
    //         });
    //     })
    //     return resultHTML.body.innerText;
    // }

    function preprocess(html) {
        // take the inner html, and convert id's back to scrambled id's, and replace name's with scrambled id's
        let resultHTML = new DOMParser().parseFromString(html, 'text/html');
        // threeMap.idToScrambledId.forEach((value, key) => {
        //     let spans = [...resultHTML.querySelectorAll(`span[data-id="${key}"]`)];
        //     spans.forEach(span => {
        //         span.textContent = value;
        //     });
        // })
        return resultHTML.body.innerText;
    }
    
    // postprocess ai answer, to replace id names with actual names, and set links to trigger highlights
    function postprocess(text) {
        if (!text.trim()) {
            console.log('error: post processing but no text');
            return;
        }
        let html = text.replace(/\n/g, '<br>');
        
        threeMap.scrambledIdToId.forEach((value, key) => {
            let regex = new RegExp(`${key}`, 'g');
            if (html.match(regex)) {
                html = html.replace(regex, `<span class='ai-highlight' data-id=${value}>${threeMap.idToName.get(value)}</span>`); // convert name back to actual id, for mouse click --> line animation
            }
        });

        let d = document.createElement('div');
        d.classList.add('ai-chat-tool-dialogue', 'ai-chat-tool-dialogue-ai');
        d.innerHTML = html;
        
        return d;
    }
    
    function postprocessBen(text) {

        if (!text.trim()) {
            console.log('error: post processing but no text');
            return;
        }
        let html = text.replace(/\n/g, '<br>');

        // threeMap.scrambledIdToId.forEach((value, key) => {
        //     let regex = new RegExp(`${key}`, 'g');
        //     if (html.match(regex)) {
        //         html = html.replace(regex, `<span class='ai-highlight' data-id=${value}>${threeMap.idToName.get(value)}</span>`); // convert name back to actual id, for mouse click --> line animation
        //     }
        // });
        
        for (const [id, name] of threeMap.idToName.entries()) {
            console.log(`id: ${id}, name: ${name}`);

            let regex = new RegExp(`${name}`, 'g');
            if (html.match(regex)) {
                html = html.replace(regex, `<span class='ai-highlight' data-id=${id}>${name}</span>`); // convert name back to actual id, for mouse click --> line animation
            }
        }

        let d = document.createElement('div');
        d.classList.add('ai-chat-tool-dialogue', 'ai-chat-tool-dialogue-ai');
        d.innerHTML = html;

        return d;
    }
    
    function setupEventListeners() {
        let currentDiv = null;

        function onMouseDown() {
            realityEditor.ai.focusOnFrame(currentDiv.dataset.id);
        }

        function onMouseLeave() {
            setFrameHighlight(currentDiv.dataset.id, false);
            currentDiv.removeEventListener('mousedown', onMouseDown);
            currentDiv.removeEventListener('mouseleave', onMouseLeave);
        }
        
        let dialogueContainer = document.getElementById('ai-chat-tool-dialogue-container');
        dialogueContainer.addEventListener('mouseover', (e) => {
            currentDiv = e.target;
            if (currentDiv.classList.contains('ai-highlight')) {
                if (currentDiv.dataset.id.includes('_part_')) {
                    // console.log('mouseover part', currentDiv);
                }
                if (currentDiv.dataset.id.match(avatarRegex)) {
                    // todo Steve: make a line link to the corresponding avatar icon? Or turn camera to the avatar cube?
                } else if (currentDiv.dataset.id.match(toolRegex)) {
                    let rect = currentDiv.getBoundingClientRect();
                    setFrameHighlight(currentDiv.dataset.id, true, {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2});

                    currentDiv.addEventListener('mousedown', onMouseDown);
                    
                    currentDiv.addEventListener('mouseleave', onMouseLeave);
                }
            }
        })
    }

    function setFrameHighlight(frameId, isHighlighted, startPos) {
        let animation = animations[frameId];
        if (!isHighlighted) {
            if (!animation) {
                return;
            }
            animation.hoveredFrameId = null;
            // if (animation.hoverAnimationPercent <= 0) {
                realityEditor.gui.recentlyUsedBar.removeAnimation(animation);
                delete animations[frameId];
            // }
            return;
        }

        if (!animation) {
            animation = realityEditor.gui.recentlyUsedBar.createAnimation(frameId, false, true, startPos);
            animations[frameId] = animation;
        } else {
            animation.hoveredFrameId = frameId;
        }
    }
    
    exports.setupEventListeners = setupEventListeners;
    exports.addToMap = addToMap;
    exports.printMap = printMap;
    exports.preprocess = preprocess;
    exports.postprocess = postprocess;
    exports.postprocessBen = postprocessBen;
    
}(realityEditor.ai.mapping));
