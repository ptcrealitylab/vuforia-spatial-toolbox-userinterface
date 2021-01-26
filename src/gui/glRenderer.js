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

            this.cache = {};

            this.commandBuffer = [];
            this.lastTargettedBinds = {};
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

            const targettedBinds = {
                bindBuffer: true,
                bindFramebuffer: true,
                bindRenderbuffer: true,
                bindTexture: true,
            };

            if (targettedBinds[message.name]) {
                this.lastTargettedBinds[message.name + '-' + message.args[0]] = message;
            }

            let res = this.gl[message.name].apply(this.gl, message.args);
            if (res && typeof res !== 'object') {
                if (!this.cache[message.name]) {
                    this.cache[message.name] = [];
                }
                this.cache[message.name].push({
                    args: message.args,
                    res: res,
                });
            }
            if (typeof res === 'object') {
                this.uncloneables[message.id] = res;
                res = {fakeClone: true, index: message.id};
            }
            return res;
        }

        executeFrameCommands() {
            this.buffering = false;
            for (let message of this.commandBuffer) {
                this.executeCommand(message);
            }
            this.commandBuffer = [];
        }

        dropFrameCommands() {
            this.buffering = false;
            this.commandBuffer = [];
        }

        getFrameCommands() {
            this.buffering = true;
            if (this.lastUseProgram) {
                this.commandBuffer.push(this.lastUseProgram);
            }
            if (this.lastTargettedBinds) {
                for (let command of Object.values(this.lastTargettedBinds)) {
                    this.commandBuffer.push(command);
                }
            }
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
