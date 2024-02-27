let getDesktopLinkData = io.parseUrl(window.location.pathname, realityEditor.network.desktopURLSchema);
const isCloud = !!getDesktopLinkData;

function getBasePath() {
    if (window.location.href.includes('/n/')) {
        const slashParts = window.location.href.split('/');
        const toRemoveIndex = 3; // stable, etc.
        slashParts.splice(toRemoveIndex, 1);
        if (!slashParts.includes('i')) {
            slashParts.splice(toRemoveIndex, 0, 'i', 'random');
        }
        return new URL(slashParts.join('/'));
    }
    return new URL(window.location.pathname, window.location.origin);
}

function getBaseEdgePath() {
    const url = getBasePath();
    if (url.href.includes('/n/')) {
        return url;
    }
    url.port = '8080'; // TODO: actually get port, don't hardcode
    return url;
}

function jsonFetch(endpoint) {
    return fetch(endpoint).then(res => res.json());
}

function withTimeout(promise, duration, rejectReason) {
    return new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
            reject(rejectReason);
        }, duration);
        promise.then(result => {
            clearTimeout(timeout);
            resolve(result);
        }).catch(err => {
            reject(err);
        });
    });
}

function checkMessageRate(socket, timeoutSeconds) {
    return new Promise((resolve, reject) => {
        let messagesIn = 0;
        let messagesOut = 0;

        socket.addEventListener('message', () => {
            messagesIn++;
        });

        let originalSend = socket.send.bind(socket);
        socket.send = (...args) => {
            messagesOut++;
            originalSend(...args);
        }

        setTimeout(() => {
            const inRate = (messagesIn / timeoutSeconds).toFixed(2);
            const outRate = (messagesOut / timeoutSeconds).toFixed(2);
            const inMessage = messagesIn === 0 ? 'Did not receive any messages' : `Received message rate: ${inRate} per second`;
            const outMessage = messagesOut === 0 ? 'Did not send any messages' : `Sent message rate: ${outRate} per second`;
            const message = `${inMessage}\n${outMessage}`;
            if (messagesIn === 0 || messagesOut === 0) {
                reject(message);
                return;
            }
            resolve(message);
        }, timeoutSeconds * 1000);
    });
}

const CheckStatus = {
    NOT_STARTED: 'NOT_STARTED',
    IN_PROGRESS: 'IN_PROGRESS',
    PASSED: 'PASSED',
    FAILED: 'FAILED'
}

class Check {
    constructor(name, test) {
        this.name = name;
        this.test = test;
        this.status = CheckStatus.NOT_STARTED;
        this._startTime = 0;
        this.duration = 0;
        this.result = null;
    }

    reset() {
        this.status = CheckStatus.NOT_STARTED;
        this._startTime = 0;
        this.duration = 0;
        this.result = null;
    }

    run() {
        this.status = CheckStatus.IN_PROGRESS;
        this._startTime = Date.now();
        return this.test().then(result => {
            this.duration = Date.now() - this._startTime;
            this.status = CheckStatus.PASSED;
            this.result = result;
        }).catch(err => {
            this.duration = Date.now() - this._startTime;
            this.status = CheckStatus.FAILED;
            this.result = err;
        });
    }
}

class Checklist {
    constructor(checks) {
        this.checks = [...checks];
        this._runNumber = 0;
    }

    reset() {
        this.checks.forEach(check => {
            check.reset();
        });
        this._runNumber++;
    }

    run(cb) {
        const runNumber = this._runNumber;
        this.checks.forEach(check => {
            check.run().finally(() => {
                if (runNumber !== this._runNumber) {
                    return;
                }
                cb(check);
            });
        });
    }
}

const containerDiv = document.createElement('div');
containerDiv.addEventListener('wheel', e => {
    e.stopPropagation();
});
containerDiv.className = 'status-page-container hidden';
const headerDiv = document.createElement('div');
headerDiv.className = 'status-page-header';
const title = document.createElement('div');
title.className = 'status-page-title';
title.innerText = 'Status Check';
const entriesDiv = document.createElement('div');
entriesDiv.className = 'status-page-entries';
const runButton = document.createElement('div');
runButton.className = 'status-page-button';
runButton.innerText = 'Run tests';
const closeButton = document.createElement('div');
closeButton.className = 'status-page-button';
closeButton.innerText = 'Close menu';
headerDiv.appendChild(title);
headerDiv.appendChild(runButton);
headerDiv.appendChild(closeButton);
containerDiv.appendChild(headerDiv);
containerDiv.appendChild(entriesDiv);
const elements = {};

function statusClassFromStatus(status) {
    switch (status) {
        case CheckStatus.NOT_STARTED:
            return 'status-page-not-started'
        case CheckStatus.IN_PROGRESS:
            return 'status-page-in-progress'
        case CheckStatus.PASSED:
            return 'status-page-passed'
        case CheckStatus.FAILED:
            return 'status-page-failed'
    }
}

function initializePage() {
    document.body.prepend(containerDiv);
}

function setupPage(checklist) {
    entriesDiv.innerHTML = '';
    checklist.checks.forEach(check => {
        const div = document.createElement('div');
        div.className = 'status-page-entry status-page-hide-data';
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'status-page-indicator';
        statusIndicator.classList.add(statusClassFromStatus(check.status));
        div.appendChild(statusIndicator);
        const dataDiv = document.createElement('div');
        dataDiv.className = 'status-page-data-container';
        div.appendChild(dataDiv);
        const nameElement = document.createElement('span');
        nameElement.className = 'status-page-name';
        nameElement.innerText = check.name;
        nameElement.addEventListener('click', () => {
            div.classList.toggle('status-page-hide-data');
        });
        dataDiv.appendChild(nameElement);
        const durationElement = document.createElement('span');
        durationElement.className = 'status-page-duration';
        nameElement.appendChild(durationElement);
        const dataElement = document.createElement('div');
        dataElement.className = 'status-page-data';
        dataDiv.appendChild(dataElement);
        entriesDiv.appendChild(div);
        elements[check.name] = {
            indicator: statusIndicator,
            duration: durationElement,
            data: dataElement
        };
    });
}

function updateCheckElements(check) {
    elements[check.name].indicator.className = 'status-page-indicator';
    elements[check.name].indicator.classList.add(statusClassFromStatus(check.status));
    elements[check.name].duration.innerText = check.status === CheckStatus.NOT_STARTED ? '' : (check.status === CheckStatus.IN_PROGRESS ? '...' : ` in ${check.duration}ms`)
    elements[check.name].data.innerText = (check.status === CheckStatus.NOT_STARTED || check.status === CheckStatus.IN_PROGRESS) ? '' : (check.result);
    elements[check.name].data.className = 'status-page-data';
    elements[check.name].data.classList.add(statusClassFromStatus(check.status));
}

const checklist = new Checklist([
    new Check('HTTP API', () => {
        const url = new URL('availableFrames', getBaseEdgePath());
        return jsonFetch(url).then(frames => {
            return `${Object.keys(frames).length} frames found\nframes\n${JSON.stringify(frames)}`;
        }).catch(() => {
            throw `Failed to get available frames from ${url}`;
        });
    }),
    new Check('World object check', () => {
        const worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (worldObject) {
            return Promise.resolve(`Found world object with name: ${worldObject.name}`);
        }
        return Promise.reject(`Failed to find world object`);
    }),
    new Check('World object ToolSocket connection', () => {
        const worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (!worldObject) {
            return Promise.reject('Failed to find world object, cannot connect to server socket for world object');
        }
        const socket = realityEditor.network.realtime.getServerSocketForObject(worldObject.objectId);
        if (!socket) {
            return Promise.reject(`World object ToolSocket (realityEditor.network.realtime.getServerSocketForObject(${worldObject.objectId})) is undefined`);
        }
        if (socket.readyState === socket.OPEN) {
            return Promise.resolve(`World object ToolSocket connection is OPEN`);
        }
        return Promise.reject(`World object ToolSocket connection is not OPEN (realityEditor.cloud.socket.readyState = ${socket.readyState})\nsocket\n${JSON.stringify(socket)}`);
    }),
    new Check('World object ToolSocket passive reception', () => {
        const timeoutSeconds = 10;
        const worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (!worldObject) {
            return Promise.reject('Failed to find world object, cannot connect to server socket for world object');
        }
        const socket = realityEditor.network.realtime.getServerSocketForObject(worldObject.objectId);
        if (!socket) {
            return Promise.reject(`World object ToolSocket (realityEditor.network.realtime.getServerSocketForObject(${worldObject.objectId})) is undefined`);
        }
        return withTimeout(new Promise((resolve) => {
            socket.socket.on('io', () => {
                resolve(`Received io message via ToolSocket`);
            });
        }), timeoutSeconds * 1000, `Did not receive io message within ${timeoutSeconds} second timeout\nsocket\n${JSON.stringify(socket)}`);
    }),
    new Check('World object ToolSocket message rate', () => {
        const timeoutSeconds = 5;
        const worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (!worldObject) {
            return Promise.reject('Failed to find world object, cannot connect to server socket for world object');
        }
        const socket = realityEditor.network.realtime.getServerSocketForObject(worldObject.objectId);
        if (!socket) {
            return Promise.reject(`World object ToolSocket (realityEditor.network.realtime.getServerSocketForObject(${worldObject.objectId})) is undefined`);
        }
        return checkMessageRate(socket.socket.socket, timeoutSeconds);
    }),
    new Check('Desktop ToolSocket connection', () => {
        if (!realityEditor.device.environment.shouldCreateDesktopSocket()) {
            return Promise.resolve('Desktop ToolSocket not used on this platform (realityEditor.device.environment.shouldCreateDesktopSocket() is false)');
        }
        const socket = realityEditor.network.realtime.getDesktopSocket();
        if (!socket) {
            return Promise.reject('Desktop ToolSocket (realityEditor.cloud.socket) is undefined');
        }
        if (socket.readyState === socket.OPEN) {
            return Promise.resolve(`Desktop ToolSocket connection is OPEN`);
        }
        return Promise.reject(`Desktop ToolSocket connection is not OPEN (realityEditor.cloud.socket.readyState = ${socket.readyState})\nsocket\n${JSON.stringify(socket)}`);
    }),
    new Check('Desktop ToolSocket passive reception', () => {
        if (!realityEditor.device.environment.shouldCreateDesktopSocket()) {
            return Promise.resolve('Desktop ToolSocket not used on this platform (realityEditor.device.environment.shouldCreateDesktopSocket() is false)');
        }
        const socket = realityEditor.network.realtime.getDesktopSocket();
        if (!socket) {
            return Promise.reject('Desktop ToolSocket (realityEditor.network.realtime.getDesktopSocket()) is undefined');
        }
        const timeoutSeconds = 10;
        return withTimeout(new Promise(resolve => {
            socket.socket.socket.addEventListener('message', msg => {
                // TODO: Make this better
                // Stupid hack
                // When connected via cloud proxy, cloud proxy bounces back ping messages with pong, ignore those, we're looking for lack of /udp/beat, /udp/action messages, which come from edge server
                const msgData = JSON.parse(msg.data);
                if (msgData.r === 'action/ping') {
                    return;
                }
                resolve(`Received message via ToolSocket`);
            });
        }), timeoutSeconds * 1000, `Did not receive any messages via ToolSocket within ${timeoutSeconds} second timeout\nsocket\n${JSON.stringify(socket)}`);
    }),
    new Check('Desktop ToolSocket WebRTC signalling', () => {
        if (!realityEditor.device.environment.shouldCreateDesktopSocket()) {
            return Promise.resolve('Desktop ToolSocket not used on this platform (realityEditor.device.environment.shouldCreateDesktopSocket() is false)');
        }
        const socket = realityEditor.network.realtime.getDesktopSocket();
        if (!socket) {
            return Promise.reject('Desktop ToolSocket (realityEditor.network.realtime.getDesktopSocket()) is undefined');
        }

        const signallingMessage = {
            command: 'joinNetwork',
            src: 'cam' + Math.floor(Math.random() * 1000),
            role: 'consumer'
        }
        let identifier = 'unused';
        const worldObject = realityEditor.worldObjects.getBestWorldObject();
        if (worldObject) {
            identifier = worldObject.port;
        }
        socket.emit(realityEditor.network.getIoTitle(identifier, '/signalling'), signallingMessage);
        
        const timeoutSeconds = 10;
        
        return withTimeout(new Promise(resolve => {
            socket.on('/signalling', () => {
                resolve(`Received signalling message via ToolSocket`);
            });
        }), timeoutSeconds * 1000, `Did not receive any messages via ToolSocket within ${timeoutSeconds} second timeout\nsocket\n${JSON.stringify(socket)}`);
    }),
    new Check('Desktop ToolSocket message rate', () => {
        const timeoutSeconds = 5;
        if (!realityEditor.device.environment.shouldCreateDesktopSocket()) {
            return Promise.resolve('Desktop ToolSocket not used on this platform (realityEditor.device.environment.shouldCreateDesktopSocket() is false)');
        }
        const socket = realityEditor.network.realtime.getDesktopSocket();
        if (!socket) {
            return Promise.reject('Desktop ToolSocket (realityEditor.network.realtime.getDesktopSocket()) is undefined');
        }

        return checkMessageRate(socket.socket.socket, timeoutSeconds);
    }),
    new Check('Cloud ToolSocket connection', () => {
        if (!isCloud) {
            return Promise.resolve('Cloud ToolSocket not used on this platform (window.location.pathname does not match realityEditor.network.desktopURLSchema)');
        }
        const socket = realityEditor.cloud.socket;
        if (!socket) {
            return Promise.reject('Cloud ToolSocket (realityEditor.cloud.socket) is undefined');
        }
        if (socket.readyState === socket.OPEN) {
            return Promise.resolve(`Cloud ToolSocket connection is OPEN`);
        }
        return Promise.reject(`Cloud ToolSocket connection is not OPEN (realityEditor.cloud.socket.readyState = ${socket.readyState})\nsocket\n${JSON.stringify(socket)}`);
    }), 
    new Check('Cloud ToolSocket passive beat reception', () => {
        if (!isCloud) {
            return Promise.resolve('Cloud ToolSocket not used on this platform (window.location.pathname does not match realityEditor.network.desktopURLSchema)');
        }
        const socket = realityEditor.cloud.socket;
        if (!socket) {
            return Promise.reject('Cloud ToolSocket (realityEditor.cloud.socket) is undefined');
        }
        const timeoutSeconds = 10;
        return withTimeout(new Promise(resolve => {
            socket.on('beat', function (_route, body) {
                resolve(`Received beat via ToolSocket\nbeat\n${JSON.stringify(body)}`);
            });
            socket.on('action', function (_route, body) {
                resolve(`Received action via ToolSocket\naction\n${JSON.stringify(body)}`);
            });
        }), timeoutSeconds * 1000, `Did not receive any beats via ToolSocket within ${timeoutSeconds} second timeout\nsocket\n${JSON.stringify(socket)}`);
    }),
    new Check('Cloud ToolSocket message rate', () => {
        if (!isCloud) {
            return Promise.resolve('Cloud ToolSocket not used on this platform (window.location.pathname does not match realityEditor.network.desktopURLSchema)');
        }
        const socket = realityEditor.cloud.socket;
        if (!socket) {
            return Promise.reject('Cloud ToolSocket (realityEditor.cloud.socket) is undefined');
        }
        const timeoutSeconds = 5;
        return checkMessageRate(socket.socket, timeoutSeconds);
    })
]);

initializePage();
setupPage(checklist);

runButton.addEventListener('click', () => {
    checklist.reset();
    checklist.run(updateCheckElements);
    checklist.checks.forEach(check => {
        updateCheckElements(check);
    });
});

closeButton.addEventListener('click', () => {
    containerDiv.classList.add('hidden');
});

export function toggleStatusPage() {
    containerDiv.classList.toggle('hidden');
}
