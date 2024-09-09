createNameSpace("realityEditor.gui.glRenderer");

(function(exports) {
    let workerIds = {};
    let nextWorkerId = 1;
    let toolIdToProxy = {};
    let proxies = [];
    let rendering = false;

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
            this.previousCommandBuffer = [];
            this.lastUseProgram = null;
            this.lastActiveTexture = {
                name: 'activeTexture',
                args: [this.gl.TEXTURE0],
            };
            this.lastTargettedBinds = {};
            this.lastTextureBinds = {};
            this.lastCapabilities = {};
            this.lastBindVertexArray = {
                name: 'bindVertexArray',
                args: [null],
            };
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
                this.frameEndListener(true);
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

            if (!this.gl[message.name] && !message.name.startsWith('extVao-')) {
                return;
            }

            if (message.name === 'clear') {
                return;
            }

            if (message.name === 'useProgram') {
                this.lastUseProgram = message;
            }

            if (message.name === 'activeTexture') {
                this.lastActiveTexture = message;
            }

            if (message.name === 'bindVertexArray') {
                this.lastBindVertexArray = message;
            }

            const targettedBinds = {
                // Note that all targetted binds should be stored using a VAO

                // bindAttribLocation: true,
                // bindBuffer: true,
                // bindFramebuffer: true,
                // bindRenderbuffer: true,

                // bindTexture: true, // can't be here because of activeTexture nonsense
                // pixelStorei: true,
                // texParameterf: true, // 2 hmm
                // texParameteri: true, // 2
                // texImage2D: true,
            };

            if (message.name === 'disable' || message.name === 'enable') {
                let capaId = message.args[0];
                if (!this.lastCapabilities.hasOwnProperty(capaId)) {
                    let isEnabled = this.gl.isEnabled(capaId);
                    this.lastCapabilities[capaId] = isEnabled;
                }
                let isReturnToDefault =
                    (this.lastCapabilities[capaId] && message.name === 'enable') ||
                    ((!this.lastCapabilities[capaId]) && message.name === 'disable');
                if (isReturnToDefault) {
                    delete this.lastCapabilities[capaId];
                }
            }

            if (targettedBinds.hasOwnProperty(message.name)) {
                this.lastTargettedBinds[message.name + '-' + message.args[0]] = message;
            }
            if (message.name === 'bindTexture') {
                let activeTexture = this.lastActiveTexture.args[0];
                if (!this.lastTextureBinds[activeTexture]) {
                    this.lastTextureBinds[activeTexture] = {};
                }
                this.lastTextureBinds[activeTexture][message.name + '-' + message.args[0]] = message;
            }

            let res;

            if (message.name.startsWith('extVao-')) {
                let fnName = message.name.split('-')[1]; // e.g. createVertexArrayOES
                fnName = fnName.replace(/OES$/, '');
                res = this.gl[fnName].apply(this.gl, message.args);
            } else {
                res = this.gl[message.name].apply(this.gl, message.args);
            }

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
            if (this.lastBindVertexArray) {
                setup.push(this.lastBindVertexArray);
            }
            if (this.lastUseProgram) {
                setup.push(this.lastUseProgram);
            }
            for (let activeTexture in this.lastTextureBinds) {
                setup.push({
                    name: 'activeTexture',
                    args: [parseInt(activeTexture)],
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
            let teardown = [];
            for (let capaId in this.lastCapabilities) {
                let val = this.lastCapabilities[capaId];
                teardown.push({
                    name: val ? 'enable' : 'disable',
                    args: [parseInt(capaId)],
                });
            }
            this.commandBuffer = setup.concat(this.commandBuffer).concat(teardown);

            for (let message of this.commandBuffer) {
                this.executeCommand(message);
            }
            // this.logCommandBuffer();
            this.previousCommandBuffer = this.commandBuffer;
            this.commandBuffer = [];
        }

        /**
         * Execute last successful frame's command buffer
         */
        executePreviousFrameCommands() {
            for (let message of this.previousCommandBuffer) {
                this.executeCommand(message);
            }
        }

        getFrameCommands() {
            this.buffering = true;
            this.commandBuffer = [];
            this.worker.postMessage({name: 'frame', time: Date.now()}, '*');
            return new Promise((res) => {
                this.frameEndListener = res;
            });
        }

        remove() {
            this.frameEndListener = null;
            window.removeEventListener('message', this.onMessage);
        }
    }

    let canvas;
    let gl;
    const functions = [];
    const constants = {};
    let lastRender = Date.now();

    function initService() {
        // canvas = globalCanvas.canvas;
        canvas = document.querySelector('#glcanvas');
        canvas.width = globalStates.height;
        canvas.height = globalStates.width;
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
        gl = canvas.getContext('webgl2');

        realityEditor.device.layout.onWindowResized(({width, height}) => {
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            // note: don't need to update canvas.width and height, just style.width and height
            // because there's no mechanism for sending the new canvas pixel dimensions to the proxied frame
        });

        // If we don't have a GL context, give up now

        if (!gl) {
            alert('Unable to initialize WebGL2. Your browser or machine may not support it.');
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
            if (key === 'canvas') {
                constants[key] = {
                    width: gl[key].width,
                    height: gl[key].height,
                };
            }
        }

        setTimeout(() => {
            requestAnimationFrameIfNotPending();
        }, 500);
        setInterval(watchpuppy, 1000);

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
        if (rendering) {
            console.error('renderFrame called during another renderFrame');
            return;
        }
        rendering = true;
        let proxiesToConsider = [];
        function makeWatchdog() {
            return new Promise((res) => {
                setTimeout(res, 100, false);
            });
        }
        proxies.forEach(function(thisProxy) {
            let toolId = thisProxy.toolId;
            let element = globalDOMCache['object' + toolId];
            if (element && window.getComputedStyle(element).display !== 'none') {
                proxiesToConsider.push(thisProxy);
            }
        });

        let proxiesToBeRenderedThisFrame = getSafeProxySubset(proxiesToConsider);

        // Get all the commands from the worker iframes
        let prommies = proxiesToBeRenderedThisFrame.map(proxy => Promise.race([makeWatchdog(), proxy.getFrameCommands()]));
        let res = await Promise.all(prommies);
        if (!res) {
            console.warn('glRenderer watchdog is barking');
            requestAnimationFrameIfNotPending();
            return;
        }

        gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Execute all pending commands for this frame
        for (let i = 0; i < proxiesToBeRenderedThisFrame.length; i++) {
            let proxy = proxiesToBeRenderedThisFrame[i];
            if (!res[i]) {
                console.warn('dropped proxy frame due to large delay', proxy);
                proxy.executePreviousFrameCommands();
                continue;
            }
            proxy.executeFrameCommands();
        }

        lastRender = Date.now();
        rendering = false;
        animationFrameRequest = null;
        requestAnimationFrameIfNotPending();
    }

    let animationFrameRequest = null;
    function requestAnimationFrameIfNotPending() {
        if (animationFrameRequest) {
            return;
        }
        animationFrameRequest = requestAnimationFrame(renderFrame);
    }

    function watchpuppy() {
        if (lastRender + 3000 < Date.now()) {
            requestAnimationFrameIfNotPending();
        }
    }

    function generateWorkerIdForTool(toolId) {
        // generate workerIds incrementally
        workerIds[toolId] = nextWorkerId;
        nextWorkerId += 1;
        return workerIds[toolId];
    }

    function addWebGlProxy(toolId) {
        if (toolIdToProxy.hasOwnProperty(toolId)) {
            console.error('overwriting webglproxy for tool', toolId);
            removeWebGlProxy(toolId);
        }
        const worker = globalDOMCache['iframe' + toolId].contentWindow;
        let proxy = new WorkerGLProxy(worker, gl, generateWorkerIdForTool(toolId), toolId);
        proxies.push(proxy);
        toolIdToProxy[toolId] = proxy;

        worker.postMessage(JSON.stringify({
            workerId: workerIds[toolId]
        }), '*');

        const {width, height} = globalStates;

        setTimeout(() => {
            worker.postMessage({
                name: 'bootstrap',
                functions,
                constants,
                width: height,
                height: width,
            }, '*');
        }, 200);
    }

    function removeWebGlProxy(toolId) {
        let proxy = toolIdToProxy[toolId];
        let index = proxies.indexOf(proxy);
        if (index !== -1) {
            proxies.splice(index, 1);
        }
        proxy.remove();
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
    exports.renderFrame = renderFrame;

})(realityEditor.gui.glRenderer);
