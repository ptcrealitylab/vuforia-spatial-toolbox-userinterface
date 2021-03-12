createNameSpace("realityEditor.gui.glRenderer");

(function(exports) {
    let workerIds = {};
    let nextWorkerId = 1;
    let toolIdToProxy = {};
    let proxies = [];

    const MAX_PROXIES = 32; // maximum number that can be safely rendered each frame

    /**
     * Mediator between the worker iframe and the gl implementation
     */
    class WorkerGLProxy {
        /**
         * @param {Element} worker - worker iframe
         * @param {WebGLContext} gl
         * @param {number|string} workerId - unique identifier of worker
         * @param {string} toolId - unique identifier of associated tool
         */
        constructor(worker, gl, workerId, toolId) {
            this.worker = worker;
            this.gl = gl;
            this.workerId = workerId;
            this.toolId = toolId;

            this.uncloneables = {};

            this.commandBuffer = [];
            this.lastUseProgram = null;
            this.lastActiveTexture = {
                name: 'activeTexture',
                args: [this.gl.TEXTURE0],
            };
            this.lastTargettedBinds = {};
            this.lastTextureBinds = {};
            this.buffering = false;

            this.onMessage = this.onMessage.bind(this);
            window.addEventListener('message', this.onMessage);

            this.frameEndListener = null;
        }

        onMessage(e) {
            const message = e.data;
            if (message.workerId !== this.workerId) {
                return;
            }

            if (this.frameEndListener && message.isFrameEnd) {
                this.frameEndListener();
                return;
            }

            if (this.buffering) {
                this.commandBuffer.push(message);
                return;
            }

            const res = this.executeCommand(message);

            if (message.wantsResponse) {
                this.worker.postMessage({
                    id: message.id,
                    result: res,
                }, '*');
            }
        }

        executeCommand(message) {
            if (message.messages) {
                for (let bufferedMessage of message.messages) {
                    this.executeOneCommand(bufferedMessage);
                }
            } else {
                this.executeOneCommand(message);
            }
        }

        executeOneCommand(message) {
            for (let i = 0; i < message.args.length; i++) {
                let arg = message.args[i];
                if (arg && arg.fakeClone) {
                    message.args[i] = this.uncloneables[arg.index];
                }
            }

            if (!this.gl[message.name]) {
                return;
            }

            const blacklist = {
                clear: true,
            };

            if (blacklist[message.name]) {
                return;
            }

            if (message.name === 'useProgram') {
                this.lastUseProgram = message;
            }

            if (message.name === 'activeTexture') {
                this.lastActiveTexture = message;
            }

            const targettedBinds = {
                bindAttribLocation: true,
                bindBuffer: true,
                bindFramebuffer: true,
                bindRenderbuffer: true,
                // bindTexture: true, // can't be here because of activeTexture nonsense
                // pixelStorei: true,
                // texParameterf: true, // 2 hmm
                // texParameteri: true, // 2
                // texImage2D: true,
            };

            if (targettedBinds[message.name]) {
                this.lastTargettedBinds[message.name + '-' + message.args[0]] = message;
            }
            if (message.name === 'bindTexture') {
                let activeTexture = this.lastActiveTexture.args[0];
                if (!this.lastTextureBinds[activeTexture]) {
                    this.lastTextureBinds[activeTexture] = {};
                }
                this.lastTextureBinds[activeTexture][message.name + '-' + message.args[0]] = message;
            }

            let res = this.gl[message.name].apply(this.gl, message.args);
            if (typeof res === 'object') {
                this.uncloneables[message.id] = res;
                res = {fakeClone: true, index: message.id};
            }
            return res;
        }

        logCommandBuffer() {
            let program = [];
            for (let command of this.commandBuffer) {
                let messages = command.messages || [command];
                for (let message of messages) {
                    let args = message.args.map(arg => {
                        // if (arg.hasOwnProperty('0') && typeof arg !== 'string') {}
                        if (typeof arg === 'object' && arg) {
                            // let arrayArg = [];
                            // for (let a of Array.from(arg)) {
                            //   arrayArg.push(typeof a);
                            // }
                            if (arg.length || arg[0]) {
                                arg = [(typeof arg[0]) || 'object', arg.length || Object.keys(arg).length];
                            } else {
                                return arg.toString();
                            }
                        }
                        return JSON.stringify(arg);
                    });
                    program.push(`gl.${message.name}(${args.join(', ')})`);
                }
            }
            let frame = program.join('\n');
            if (!window.lastFrames) {
                window.lastFrames = {};
            }
            if (!window.lastFrames[frame]) {
                window.lastFrames[frame] = true;

                console.log(`frame workerId=${this.workerId}`);
                console.log(frame);
            }
        }

        executeFrameCommands() {
            this.buffering = false;

            let setup = [];
            if (this.lastUseProgram) {
                setup.push(this.lastUseProgram);
            }
            for (let activeTexture in this.lastTextureBinds) {
                setup.push({
                    name: 'activeTexture',
                    args: [activeTexture],
                });
                for (let command of Object.values(this.lastTextureBinds[activeTexture])) {
                    setup.push(command);
                }
            }
            if (this.lastActiveTexture) {
                setup.push(this.lastActiveTexture);
            }
            if (this.lastTargettedBinds) {
                for (let command of Object.values(this.lastTargettedBinds)) {
                    setup.push(command);
                }
            }
            this.commandBuffer = setup.concat(this.commandBuffer);

            for (let message of this.commandBuffer) {
                this.executeCommand(message);
            }
            // this.logCommandBuffer();
            this.commandBuffer = [];
        }

        dropFrameCommands() {
            this.buffering = false;
            this.commandBuffer = [];
        }

        getFrameCommands() {
            this.buffering = true;
            this.worker.postMessage({name: 'frame', time: Date.now()}, '*');
            return new Promise((res) => {
                this.frameEndListener = res;
            });
        }
    }

    let canvas;
    let gl;
    const functions = [];
    const constants = {};

    function initService() {
        // canvas = globalCanvas.canvas;
        canvas = document.querySelector('#glcanvas');
        canvas.width = globalStates.height;
        canvas.height = globalStates.width;
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
        gl = canvas.getContext('webgl');

        // If we don't have a GL context, give up now

        if (!gl) {
            alert('Unable to initialize WebGL. Your browser or machine may not support it.');
            return;
        }

        for (let key in gl) {
            switch (typeof gl[key]) {
            case 'function':
                functions.push(key);
                break;
            case 'number':
                constants[key] = gl[key];
                break;
            }
        }

        setTimeout(renderFrame, 500);

        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
        realityEditor.network.registerCallback('vehicleDeleted', onVehicleDeleted);
    }

    /**
     * Returns n random elements from the array. Fast and non-destructive.
     * @author https://stackoverflow.com/a/19270021
     * @param {Array} arr
     * @param {number} n
     * @return {Array}
     */
    function getRandom(arr, n) {
        var result = new Array(n),
            len = arr.length,
            taken = new Array(len);
        if (n > len)
            throw new RangeError("getRandom: more elements taken than available");
        while (n--) {
            var x = Math.floor(Math.random() * len);
            result[n] = arr[x in taken ? taken[x] : x];
            taken[x] = --len in taken ? taken[len] : len;
        }
        return result;
    }

    /**
     * If there are too many proxies, chooses a random subset of them
     * @return {Array}
     */
    function getSafeProxySubset(proxiesToConsider) {
        if (proxiesToConsider.length < MAX_PROXIES) {
            return proxiesToConsider;
        } else {
            // choose N random elements from the proxies array
            return getRandom(proxiesToConsider, MAX_PROXIES);
        }
    }

    async function renderFrame() {
        let proxiesToConsider = [];
        proxies.forEach(function(thisProxy) {
            let toolId = thisProxy.toolId;
            let element = globalDOMCache['object' + toolId];
            if (element && window.getComputedStyle(element).display !== 'none') {
                proxiesToConsider.push(thisProxy);
            }
        });

        let proxiesToBeRenderedThisFrame = getSafeProxySubset(proxiesToConsider);

        // Get all the commands from the worker iframes
        await Promise.all(proxiesToBeRenderedThisFrame.map(proxy => proxy.getFrameCommands()));

        gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Execute all pending commands for this frame
        proxiesToBeRenderedThisFrame.forEach(function(proxy) {
            proxy.executeFrameCommands();
        });

        requestAnimationFrame(renderFrame);
    }

    function generateWorkerIdForTool(toolId) {
        // generate workerIds incrementally
        workerIds[toolId] = nextWorkerId;
        nextWorkerId += 1;
        return workerIds[toolId];
    }

    function addWebGlProxy(toolId) {
        const worker = globalDOMCache['iframe' + toolId].contentWindow;
        let proxy = new WorkerGLProxy(worker, gl, generateWorkerIdForTool(toolId), toolId);
        proxies.push(proxy);
        toolIdToProxy[toolId] = proxy;

        worker.postMessage(JSON.stringify({
            workerId: workerIds[toolId]
        }), '*');

        setTimeout(() => {
            worker.postMessage({name: 'bootstrap', functions, constants}, '*');
        }, 200);
    }

    function removeWebGlProxy(toolId) {
        let proxy = toolIdToProxy[toolId];
        let index = proxies.indexOf(proxy);
        if (index !== -1) {
            proxies.splice(index, 1);
        }
        delete workerIds[toolId];
        delete toolIdToProxy[toolId];
    }

    function onVehicleDeleted(params) {
        if (params.objectKey && params.frameKey && !params.nodeKey) { // only react to frames, not nodes
            if (typeof toolIdToProxy[params.frameKey] !== 'undefined') {
                removeWebGlProxy(params.frameKey);
            }
        }
    }

    exports.initService = initService;
    exports.addWebGlProxy = addWebGlProxy;
    exports.removeWebGlProxy = removeWebGlProxy;

})(realityEditor.gui.glRenderer);
