createNameSpace("realityEditor.gui.glRenderer");

/**
 * @typedef {import("./glState.js").GLState} GLState
 * @typedef {import("./glState.js").WebGL} WebGL
 * @typedef {import("./glState.js").Handle} Handle 
 * @typedef {*} HandleObj
 */

class CommandId {
    /**
     * 
     * @param {number} worker 
     * @param {number} buffer 
     * @param {number} command 
     */
    constructor(worker, buffer, command) {
        /**
         * @type {number}
         */
        this.worker = worker;

        /**
         * @type {number}
         */
        this.buffer = buffer;

        /**
         * @type {number}
         */
        this.command = command;
    }
}

class Command {
    /**
     * 
     * @param {string} name 
     * @param {any[]} args 
     * @param {number} handle
     */
    constructor(name, args, handle) {
        /**
         * @type {string}
         */
        this.name = name;

        /**
         * @type {any[]}
         */
        this.args = args;

        /**
         * @type {number}
         */
        this.handle = handle;
    }
}

class CommandBuffer {
    /**
     * 
     * @param {number} workerId 
     * @param {number} commandBufferId
     * @param {boolean} isRendering
     * @param {Command[]} commands 
     */
    constructor(workerId, commandBufferId, isRendering, commands) {
        this.workerId = workerId;
        this.commandBufferId = commandBufferId;
        this.isRendering = isRendering;
        this.commands = commands;
    }
}

/**
 * manages all received command buffers and the one that is used for rendering
 * 
 */
class CommandBufferManager {
    /**
     * 
     * @param {number} workerId 
     */
    constructor(workerId) {
        /**
         * @type {CommandBuffer[]}
         */
        this.commandBuffers = [];

        /**
         * @type {CommandBuffer}
         */
        this.renderCommandBuffer = new CommandBuffer(workerId, -1, true, []);
    }

    /**
     * 
     * @param {CommandBuffer} commandBuffer 
     */
    onCommandBufferReceived(commandBuffer) {
        console.log(`cmd(${commandBuffer.workerId}): received buffer[${commandBuffer.commands.length}]`);
        this.commandBuffers.push(commandBuffer);
    }

    /**
     * 
     * @returns {CommandBuffer} the newest commandbuffer marked for rendering for which all resources have been loaded
     */
    getRenderCommandBuffer() {
        // current code does not conform to the specs, let's process each buffer sequentially
        /*while (this.commandBuffers.length > 0) {
            const commandBuffer = this.commandBuffers[0];
            if (commandBuffer.isRendering) {
                // the command buffer was marked for rendering, remove it from the list and store it as the last known rendering command buffer 
                this.commandBuffers.shift();
                this.renderCommandBuffer = commandBuffer;
            } else {
                // the command buffer is marked for loading resources, return last know command buffer for rendering
                return this.renderCommandBuffer;
            }
        }
        return this.renderCommandBuffer;*/
        if (this.commandBuffers.length > 0) {
            const commandBuffer = this.commandBuffers[0];
            this.commandBuffers.shift();
            if (commandBuffer.isRendering) {
                // render buffers can be repeated
                this.renderCommandBuffer = commandBuffer;
            }
            return commandBuffer;
        }
        return this.renderCommandBuffer;
    }

    /**
     * 
     * @returns {CommandBuffer | null} the next resource commandbuffer if it exists
     */
    getResourceCommandBuffer() {
        // current code does not conform to the specs, let's process each buffer sequentially
        /*while (this.commandBuffers.length > 0) {
            const commandBuffer = this.commandBuffers[0];
            this.commandBuffers.shift();
            if (commandBuffer.isRendering) {
               // the command buffer was marked for rendering, update the last known rendering frame buffer, since we've loaded all resources
               this.renderCommandBuffer = commandBuffer;
            } else {
                // the command buffer was marked for resource loading, return it
                return commandBuffer;
            }
        } */
        console.log(`cmd(${this.renderCommandBuffer.workerId}) no resource buffer`)
        return null;
    }
}

(function(exports) {
    /**
     * @type {Object.<string, number>}
     */
    let workerIds = {};
    let nextWorkerId = 1;
    /**
     * @type {Object.<string, WorkerGLProxy>}
     */
    let toolIdToProxy = {};

    /**
     * @type {WorkerGLProxy[]}
     */
    let proxies = [];
    let rendering = false;

    const MAX_PROXIES = 32; // maximum number that can be safely rendered each frame

    /**
     * Mediator between the worker iframe and the gl implementation
     */
    class WorkerGLProxy {
        /**
         * @param {Window} worker - worker iframe
         * @param {WebGL} gl
         * @param {number} workerId - unique identifier of worker
         * @param {string} toolId - unique identifier of associated tool
         */
        constructor(worker, gl, workerId, toolId) {
            /**
             * @type {Window}
             */
            this.worker = worker;

            /**
             * @type {WebGL}
             */
            this.gl = gl;

            /**
             * @type {number}
             */
            this.workerId = workerId;

            /**
             * @type {string}
             */
            this.toolId = toolId;

            /**
             * @type {Map<number, HandleObj>}
             */
            this.unclonables = new Map();

            /**
             * @type {CommandBufferManager}
             */
            this.buffer = new CommandBufferManager(workerId);

            /**
             * @type {GLState}
             */
            this.lastState = new realityEditor.gui.glState.GLState(this.gl, this.unclonables);

            this.onMessage = this.onMessage.bind(this);
            window.addEventListener('message', this.onMessage);

            this.frameEndListener = null;
        }

        /**
         * 
         * @param {MessageEvent<any>} e 
         * @returns 
         */
        onMessage(e) {
            const message = e.data;
            if (message.workerId !== this.workerId) {
                return;
            }

            if (this.frameEndListener && message.isFrameEnd) {
                this.frameEndListener(true);
                return;
            }

            this.buffer.onCommandBufferReceived(message)
        }

        /**
         * 
         * @param {Command} command 
         * @param {CommandId} id 
         * @returns 
         */
        executeOneCommand(command, id) {
            if (command.args.length == undefined) {
                console.log("no length!");
            }
            //console.log(`command (${id.worker}, ${id.buffer}, ${id.command}) ${command.name}`);
            
            
            /**
             * @type {Command}
             */
            let localCommand = structuredClone(command);
            for (let i = 0; i < localCommand.args.length; i++) {
                let arg = localCommand.args[i];
                if (arg && arg.hasOwnProperty("handle")) {
                    localCommand.args[i] = this.unclonables.get(arg.handle);
                }
                if (arg && arg.hasOwnProperty("type") && arg.hasOwnProperty("data")) {
                    if (arg.type === "Float32Array") {
                        localCommand.args[i] = new Float32Array(arg.data);
                    } else if (arg.type === "Uint8Array") {
                        localCommand.args[i] = new Uint8Array(arg.data);
                    } else if (arg.type === "Uint16Array") {
                        localCommand.args[i] = new Uint16Array(arg.data);
                    }
                }
            }

            if (!this.gl[localCommand.name] && !localCommand.name.startsWith('extVao-')) {
                return;
            }

            if (localCommand.name === 'clear') {
                return;
            }

           this.lastState.preProcessOneCommand(localCommand);

            let res;

            if (localCommand.name.startsWith('extVao-')) {
                let fnName = localCommand.name.split('-')[1]; // e.g. createVertexArrayOES
                fnName = fnName.replace(/OES$/, '');
                res = this.gl[fnName].apply(this.gl, localCommand.args);
            } else {
                try {
                    res = this.gl[localCommand.name].apply(this.gl, localCommand.args);
                    const err = this.gl.getError();
                    if (err !== 0) {
                        console.error("glError: " + err + ", " + localCommand.name + "(" + command.args + ")");
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            this.lastState.postProcessOneCommand(command);

            if (typeof res === 'object') {

                this.unclonables.set(localCommand.handle, res);
                res = new Handle(localCommand.handle);
            }
            
            if (localCommand.name === "getProgramParameter") {
                this.worker.postMessage({
                    id: id,
                    result: res,
                }, '*')
            }
        }

        logCommandBuffer() {
            let program = [];
            for (let command of this.debug) {
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

        /**
         * 
         * @param {GLState} glState 
         * @returns 
         */
        executeFrameCommands(glState) {
            this.lastState.applyDiff(glState);

            // execute resources command buffer or rendering command buffer but never both during a frame
            let localCommandBuffer = this.buffer.getResourceCommandBuffer();

            if ((localCommandBuffer !== null) && (localCommandBuffer.commands.length !== 0)) {
                let commandId = 1;
                for (let command of localCommandBuffer.commands) {
                    const id = new CommandId(this.workerId, localCommandBuffer.commandBufferId, commandId++);
                    let res = this.executeOneCommand(command, id);
                }            
            } else {
                localCommandBuffer = this.buffer.getRenderCommandBuffer();
                let commandId = 1;
                for (let command of localCommandBuffer.commands) {
                    const id = new CommandId(this.workerId, localCommandBuffer.commandBufferId, commandId++);
                    let res = this.executeOneCommand(command, id);
                }
            }
            // this.logCommandBuffer();
            return this.lastState;
        }

        getFrameCommands() {
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

    /**
     * @type {HTMLCanvasElement | null}
     */
    let canvas;
    
    /**
     * @type {WebGL2RenderingContext | null}
     */
    let gl;
    const functions = [];
    const constants = {};
    let lastRender = Date.now();

    /**
     * @type {GLState | null}
     */
    let defaultGLState = null;

    function initService() {
        // canvas = globalCanvas.canvas;
        canvas = document.querySelector('#glcanvas');
        if (canvas !== null) {
            canvas.width = globalStates.height;
            canvas.height = globalStates.width;
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = canvas.height + 'px';
            gl = canvas.getContext('webgl2');
            const ext = gl?.getExtension('GMAN_debug_helper');
           
            // If we don't have a GL context, give up now

            if (!gl) {
                alert('Unable to initialize WebGL2. Your browser or machine may not support it.');
                return;
            } else {
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

                defaultGLState = realityEditor.gui.glState.GLState.createFromGLContext(gl, new Map());

                setTimeout(renderFrame, 500);
                setInterval(watchpuppy, 1000);

                realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
                realityEditor.network.registerCallback('vehicleDeleted', onVehicleDeleted);
            }
        }
    }

    /**
     * Returns n random elements from the array. Fast and non-destructive.
     * @author https://stackoverflow.com/a/19270021
     * @template T 
     * @param {T[]} arr
     * @param {number} n
     * @return {T[]}
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
     * @param {WorkerGLProxy[]} proxiesToConsider
     * @return {WorkerGLProxy[]}
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

        /**
         * @type {WorkerGLProxy[]}
         */
        let proxiesToConsider = [];
        function makeWatchdog() {
            return new Promise((res) => {
                setTimeout(res, 1000000, false);
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
            requestAnimationFrame(renderFrame);
            return;
        }

        if (gl !== null) {
            gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to black, fully opaque
            gl.clearDepth(1.0);                 // Clear everything
            gl.enable(gl.DEPTH_TEST);           // Enable depth testing
            gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

            // Clear the canvas before we start drawing on it.
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }

        let glState = defaultGLState;
        if (glState !== null) {
            glState.applyAll();
            // Execute all pending commands for this frame
            for (let i = 0; i < proxiesToBeRenderedThisFrame.length; i++) {
                let proxy = proxiesToBeRenderedThisFrame[i];
                if (!res[i]) {
                    console.warn('dropped proxy frame due to large delay', proxy);
                }
                glState = proxy.executeFrameCommands(glState);
            }
        }

        requestAnimationFrame(renderFrame);
        lastRender = Date.now();
        rendering = false;
    }

    function watchpuppy() {
        if (lastRender + 3000 < Date.now()) {
            renderFrame();
        }
    }

    /**
     * 
     * @param {string} toolId 
     * @returns {number}
     */
    function generateWorkerIdForTool(toolId) {
        // generate workerIds incrementally
        workerIds[toolId] = nextWorkerId;
        nextWorkerId += 1;
        return workerIds[toolId];
    }

    /**
     * 
     * @param {string} toolId
     */
    function addWebGlProxy(toolId) {
        if (defaultGLState === null) {
            console.error("webgl not initialized for tool", toolId);
            return;
        }
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

        // create gl context
        setTimeout(() => {
            worker.postMessage({
                name: 'bootstrap',
                functions,
                constants,
                width: height,
                height: width,
                glState: JSON.stringify(defaultGLState),
                deviceDesc: JSON.stringify(new DeviceDescription(gl))
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
