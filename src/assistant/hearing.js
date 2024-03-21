/* global webkitSpeechRecognition */

import {speak} from './speech.js';
import {answerQuestion} from './assistant.js';

const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

let isRecognitionRunning = false;

recognition.onstart = () => {
    isRecognitionRunning = true;
};

recognition.onend = () => {
    isRecognitionRunning = false;
};

recognition.onerror = error => {
    console.log('Recognition error', error);
    // Check if the error is 'no-speech'
    if (error.error === 'no-speech') {
        console.log('No speech detected, restarting recognition...');
        setTimeout(() => {
            recognition.start();
        }, 0);
    } else {
        console.error('Fatal recognition error', error);
        isRecognitionRunning = false;
    }
};

let answerTimeout = null;
let silenceMs = 1500;

let answering = false;

/**
 * Need to do a rolling submission window or something
 * because you won't get isFinal
 */
recognition.onresult = event => {
    if (answering) {
        return;
    }
    const newMessages = [];
    console.info('onresult', event);
    Array.from(event.results).forEach(result => {
        newMessages.push(result[0].transcript);
    });

    if (newMessages.length > 0) {
        const transcription = newMessages.join(' ').trim();
        if (answerTimeout) {
            clearTimeout(answerTimeout);
            answerTimeout = null;
        }
        answerTimeout = setTimeout(() => {
            onNewTranscription(transcription);
        }, silenceMs);
    }
};

window.startAssistantRecognition = function() {
    if (!isRecognitionRunning) {
        recognition.start();
    }
}

async function onNewTranscription(transcription) {
    answering = true;
    recognition.stop();
    if (transcription.toLowerCase().includes('mercury')) {
        let question = transcription.split('ercury').at(-1);
        try {
            const answer = await answerQuestion(question);
            await speak(answer);
        } catch (e) {
            console.error('unable to answer question', e);
        }
    }
    const elt = document.createElement('p');
    elt.textContent = transcription;
    document.body.appendChild(elt);

    setTimeout(() => {
        answering = false;
        recognition.start();
    }, 2000);
}
