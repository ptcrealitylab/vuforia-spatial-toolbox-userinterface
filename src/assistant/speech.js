import {apiKey11} from './config.js';

const voiceId = 'CYw3kZ02Hs0563khs1Fj'; // Dave
const model = 'eleven_monolingual_v1';
const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${model}`;

export function speak(text) {
    return new Promise(resolve => {
        if (!sourceBuffer) {
            console.warn('media source unavailable');
            resolve();
            return;
        }

        if (!apiKey11) {
            console.error('missing api key');
            resolve();
            return;
        }

        // TODO find out what prevents websocket reuse
        const socket = new WebSocket(wsUrl);

        socket.onopen = function onopen() {
            const bosMessage = {
                text: ' ',
                voice_settings: {
                    'stability': 0.5,
                    'similarity_boost': 0.8
                },
                xi_api_key: apiKey11,
            };

            socket.send(JSON.stringify(bosMessage));

            const textMessage = {
                text,
                try_trigger_generation: true,
            };
            socket.send(JSON.stringify(textMessage));

            // 4. Send the EOS message with an empty string
            const eosMessage = {
                text: ''
            };

            socket.send(JSON.stringify(eosMessage));
        }

        // 5. Handle server responses
        socket.onmessage = async function (event) {
            const response = JSON.parse(event.data);

            if (response.audio) {
                // decode and handle the audio data (e.g., play it)
                const audioChunk = atob(response.audio);  // decode base64
                const audioBuf = Uint8Array.from(audioChunk, c => c.charCodeAt(0))
                buffersToAppend.push(audioBuf);
            } else {
                console.log('No audio data in the response');
            }

            if (response.isFinal) {
                // the generation is complete
            }

            if (response.normalizedAlignment) {
                // use the alignment info if needed
            }
        };

        // Handle errors
        socket.onerror = function (error) {
            console.error(`WebSocket Error: ${error}`);
        };

        // Handle socket closing
        socket.onclose = function (event) {
            if (event.wasClean) {
                console.info(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
            } else {
                console.warn('Connection died');
            }
            resolve();
        };
    });
}

const audio = document.createElement('audio');
const mediaSource = new MediaSource();
let sourceBuffer;
let buffersToAppend = [];
mediaSource.addEventListener('sourceopen', function() {
    sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
    setInterval(() => {
        if (buffersToAppend.length === 0) {
            return;
        }
        if (sourceBuffer.updating) {
            return;
        }

        sourceBuffer.appendBuffer(buffersToAppend.shift());

        if (audio.paused) {
          audio.play();
        }
    }, 50);
});

audio.src = URL.createObjectURL(mediaSource);
