import {GLState, Handle, DeviceDescription} from "/objectDefaultFiles/glState.js"
import {CommandId, Command, CommandBufferManager} from "/objectDefaultFiles/glCommandBuffer.js"
import {useWebWorkers} from "/objectDefaultFiles/WorkerFactory.js"

createNameSpace("realityEditor.gui.glRenderer");

const debug_glRenderer = false;

/**
 * @typedef {WebGLRenderingContext | WebGL2RenderingContext} WebGL
 * @typedef {GLuint} HandleObj
 */

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

const functions = [];
const constants = {};

const MAX_PROXIES = 32; // maximum number that can be safely rendered each frame

/**
 * Mediator between the worker iframe and the gl implementation
 */
class WorkerGLProxy {
    static STATE_CONSTRUCTED = 0;
    static STATE_BOOTSTRAP = 1;
    static STATE_BOOTSTRAP_DONE = 2;
    static STATE_BOOTSTRAP_SYNC = 3;
    static STATE_FRAME = 4;
    static STATE_FRAME_DONE = 5;
    static STATE_FRAME_SYNC = 6;
    static STATE_CONTEXT_LOST = 7;
    static STATE_CONTEXT_RESTORED = 8;
    static STATE_CONTEXT_RESTORED_DONE = 9;
    static STATE_CONTEXT_RESTORED_SYNC = 10;

    /**
     * @param {Window} worker - worker iframe contentWindow
     * @param {WebGL} gl - webGL rendering context used for excuting the received webgl commands
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
         * @type {number}
         */
        this.serverState = WorkerGLProxy.STATE_CONSTRUCTED;

        /**
         * list of handles opened by the client and used for argument resolution
         * contains objects that are not transferable over the message system
         * @type {Map<number, HandleObj>}
         */
        this.unclonables = new Map();

        /**
         * manages the received command buffer and the execution policy/strategy
         * @type {CommandBufferManager}
         */
        this.buffer = new CommandBufferManager(workerId);

        /**
         * current viewport of the webgl context
         */
        const viewport = this.gl.getParameter(this.gl.VIEWPORT);
        
        /**
         * the last known webgl state before yielding control to the server
         * @type {GLState}
         */
        this.lastState = new GLState(this.gl, this.unclonables, viewport);

        // bind message handler for client messages
        this.onMessage = this.onMessage.bind(this);
        window.addEventListener('message', this.onMessage);

        // we're not awaiting an end of frame
        this.frameEndListener = null;

        /**
         * @type {Int32Array|null} if this is not 1, the worker thread is locked until it receives a response on the last comitted resource Command List
         */
        this.synclock = null;
        // check which combination of worker and webgl sync strategy are needed
        if (useWebWorkers()) {
            this.synclock = new Int32Array(new SharedArrayBuffer(4));
            Atomics.store(this.synclock, 0, 1);
        } 
    }

    /**
     * bootstraps the client by starting the communication
     */
    bootstrap() {
        if (this.serverState === WorkerGLProxy.STATE_CONSTRUCTED) {
            this.worker.postMessage(JSON.stringify({
                workerId: this.workerId
            }), '*');
        
            const {width, height} = globalStates;
        
            // create gl context
            // we repeat the workerId for the graphics subsytem to receive all information in one message
            this.serverState = WorkerGLProxy.STATE_BOOTSTRAP;
            this.worker.postMessage({
                name: 'bootstrap',
                functions,
                constants,
                workerId: this.workerId,
                width: height,
                height: width,
                glState: JSON.stringify(defaultGLState),
                deviceDesc: JSON.stringify(new DeviceDescription(gl)),
                synclock: this.synclock
            }, '*');
        } else {
            console.error("Worker " + this.workerId + " wrong state to run bootstrap " + this.serverState);
        }
    }

    /**
     * Receives messages from the client
     * @param {MessageEvent<any>} e 
     */
    onMessage(e) {
        const message = e.data;
        // check if the worker id matches
        if (message.workerId !== this.workerId) {
            return;
        }

        switch (this.serverState) {
            case WorkerGLProxy.STATE_BOOTSTRAP:
            case WorkerGLProxy.STATE_BOOTSTRAP_SYNC:
            case WorkerGLProxy.STATE_FRAME: 
            case WorkerGLProxy.STATE_FRAME_SYNC:
            case WorkerGLProxy.STATE_CONTEXT_RESTORED:
            case WorkerGLProxy.STATE_CONTEXT_RESTORED_SYNC:
                if (message.isFrameEnd) {
                    switch (this.serverState) {
                        case WorkerGLProxy.STATE_BOOTSTRAP_SYNC:
                        case WorkerGLProxy.STATE_FRAME_SYNC:
                        case WorkerGLProxy.STATE_CONTEXT_RESTORED_SYNC:
                            // we only send the endframe command to indicate no more frames will be send until the client is unlocked 
                            break;
                        case WorkerGLProxy.STATE_BOOTSTRAP:
                            this.serverState = WorkerGLProxy.STATE_BOOTSTRAP_DONE;
                            break;
                        case WorkerGLProxy.STATE_FRAME:
                            this.serverState = WorkerGLProxy.STATE_FRAME_DONE;
                            break;
                        case WorkerGLProxy.STATE_CONTEXT_RESTORED:
                            this.serverState = WorkerGLProxy.STATE_CONTEXT_RESTORED_DONE;
                            break;
                        default:
                            console.error("received end frame in wrong state");
                            break;
                    }
                    // make sure we stop waiting form more command buffers when the client indicates the work for this frame is done
                    if (this.frameEndListener) {
                        this.frameEndListener(true);
                    }
                    return;
                }
                break;
            default:
                break;
        }
        switch (this.serverState) {
            case WorkerGLProxy.STATE_FRAME:
            case WorkerGLProxy.STATE_BOOTSTRAP:
            case WorkerGLProxy.STATE_CONTEXT_RESTORED:
                // if the message is none of the above, it's a command buffer. notify the commandbuffermanager about the received command buffer.
                this.buffer.onCommandBufferReceived(message);
                if ((this.synclock !== null) && (Atomics.load(this.synclock, 0) === 0)) {
                    switch (this.serverState) {
                        case WorkerGLProxy.STATE_BOOTSTRAP:
                            this.serverState = WorkerGLProxy.STATE_BOOTSTRAP_SYNC;
                            break;
                        case WorkerGLProxy.STATE_FRAME:
                            this.serverState = WorkerGLProxy.STATE_FRAME_SYNC;
                            break;
                        case WorkerGLProxy.STATE_CONTEXT_RESTORED:
                            this.serverState = WorkerGLProxy.STATE_CONTEXT_RESTORED_SYNC;
                            break;
                        default:
                            break;
                    }
                }
                break;
            default:
                break;
        }
    }

    /**
     * Executes an WebGL command on the server context and does basic error checking when debugging is enabled
     * @param {string} name The function to call
     * @param {Array<any>} args contains the internal arguments used by the WebGL instance (Handles translated to internal objects)
     * @param {Array<any>} displayArgs contains the arguments received from the client (Handles etc...), displaying handles is more relevant when debugging than the real arguments that the handle represents. Handles can be traced back to the client code, the real parameters only exist on the server side.
     * @returns {any}
     */
    executeGL(name, args, displayArgs) {
        let res = null;
        try {
            res = this.gl[name].apply(this.gl, args);
            if (debug_glRenderer) {
                const err = this.gl.getError();
                if (err !== 0) {
                    console.error("glError: " + err + ", " + name + "(" + displayArgs + ")");
                }
            }
        } catch (e) {
            console.error(e);
        }
        return res;
    }

    /**
     * Processes an entry from the command buffer, by resolving the input arguments, executing the command and processing the optional results 
     * @param {Command} command The entry from the command buffer to execute
     * @param {CommandId} id The command id
     */
    executeOneCommand(command, id) {
        if (debug_glRenderer) {
            console.log(`command (${id.worker}, ${id.buffer}, ${id.command}) ${command.name}`);
        }
        
        /**
         * We make a copy of the command, so we can translate the arguments without changeing the original received input, that we can use for debugging
         * @type {Command}
         */
        let localCommand = structuredClone(command);
        // resolve arguments
        for (let i = 0; i < localCommand.args.length; i++) {
            let arg = localCommand.args[i];
            // resolve Handles
            if (arg && arg.hasOwnProperty("handle")) {
                localCommand.args[i] = this.unclonables.get(arg.handle);
            }
            // resolve arrays
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

        // validate gl command is executable
        if (!this.gl[localCommand.name] && !localCommand.name.startsWith('extVao-') && !localCommand.name.endsWith("_bufferSize")) {
            return;
        }

        // don't allow clear, ever
        if (localCommand.name === 'clear') {
            return;
        }

        // update gl state so it matches the state after execution
        this.lastState.preProcessOneCommand(localCommand);

        let res;
        // filter vertex array extension
        if (localCommand.name.startsWith('extVao-')) {
            let fnName = localCommand.name.split('-')[1]; // e.g. createVertexArrayOES
            fnName = fnName.replace(/OES$/, '');
            res = this.gl[fnName].apply(this.gl, localCommand.args);
        } else {
            // execute command
            // we filter the _bufferSize postfix. This postFix informs us to return the size of the result in the responseBuffer, rather than the real result of the executed command.
            // this is used if we want to return a variable length string in a shared buffer, but we don't know it's size.
            // for example, the getActiveUniform returns the name of the uniform, before we can send back the name of the uniform, we need to know it's length
            // the second call wil, be without the _bufferSize postfix and will indicate that the buffer is big enough to fit the result
            res = this.executeGL(localCommand.name.endsWith("_bufferSize") ? localCommand.name.substring(0, localCommand.name.length - 11) : localCommand.name, localCommand.args, command.args);
        }

        // some state changes can only be done after execution
        this.lastState.postProcessOneCommand(command);

        // if a command has a handle assigned to a command, the resulting internal object should be stored in the uncloneables list, so it can be resolved to the correct object next time it is referenced.
        if (localCommand.handle !== null) {
            this.unclonables.set(localCommand.handle, res);
        }
        
        // some commands have a responsebuffer assigned to them, these are blocking commands, where the client awaits a response form the server on the send commandbuffer
        // we translate the result into bytes and store them in the SharedArrayBuffer, unblocking the thread happens after the buffer has been processed.
        // in theory we can execute several commands in succession and fill the assigned SharedArrayBuffer responseBuffers and then unlock the client.
        if (localCommand.name === "getActiveAttrib_bufferSize") {
            // send the size of the required buffer instead of the struct itself
            // the struct itself contains a name with zero termination, a size attribute and a type attribute. Size and Type are both 32-bit so with the zero termination we need to reserve an aditional 9 bytes to store the returned structure.
            new Int32Array(localCommand.responseBuffer)[0] = res.name.length + 9;   
        } else if (localCommand.name === "getActiveAttrib") {
            let utf8TextEncoder = new TextEncoder();
            new Uint8Array(localCommand.responseBuffer, 0, res.name.length + 1).set(utf8TextEncoder.encode(res.name));
            let sizeTypeBufMem = new ArrayBuffer(8);
            let sizeTypeBuf = new Int32Array(sizeTypeBufMem);
            sizeTypeBuf[0] = res.size;
            sizeTypeBuf[1] = res.type;
            new Uint8Array(localCommand.responseBuffer, res.name.length + 1, 8).set(new Uint8Array(sizeTypeBufMem));   
        } else if (localCommand.name === "getActiveUniform_bufferSize") {
            // send the size of the required buffer instead of the struct itself
             // the struct itself contains a name with zero termination, a size attribute and a type attribute. Size and Type are both 32-bit so with the zero termination we need to reserve an aditional 9 bytes to store the returned structure.
            new Int32Array(localCommand.responseBuffer)[0] = res.name.length + 9;   
        } else if (localCommand.name === "getActiveUniform") {
            let utf8TextEncoder = new TextEncoder();
            new Uint8Array(localCommand.responseBuffer, 0, res.name.length + 1).set(utf8TextEncoder.encode(res.name));
            let sizeTypeBufMem = new ArrayBuffer(8);
            let sizeTypeBuf = new Int32Array(sizeTypeBufMem);
            sizeTypeBuf[0] = res.size;
            sizeTypeBuf[1] = res.type;
            new Uint8Array(localCommand.responseBuffer, res.name.length + 1, 8).set(new Uint8Array(sizeTypeBufMem));   
        } else if (localCommand.name === "getProgramParameter") {
            new Int32Array(localCommand.responseBuffer)[0] = res;
        } else if (localCommand.name === "getAttribLocation") {
            new Int32Array(localCommand.responseBuffer)[0] = res;
        }
    }

    /**
     * Executes a frame for the proxy, it will try to collect the first available resource command buffer and execute it, after that it will execute the latest render command buffer to render
     * resource command buffers contain run once instruction, render command buffers contain repeatable instruction that can be repeated to draw frames
     * @param {GLState} glState The current state of the WebGL context
     * @returns {GLState} The of the WebGL context after execution
     */
    onRenderFrame(glState) {
        // restore the opengl state to the last known state of this proxy
        this.lastState.applyDiff(glState);

        // get the resource command buffer for this frame if there is one
        let localCommandBuffer = this.buffer.getResourceCommandBuffer();
        if ((localCommandBuffer !== null) && localCommandBuffer.commands && (localCommandBuffer.commands.length !== 0)) {
            // execute the resource commandbuffer
            let commandId = 1;
            // is the client locked and awaiting a response
            if ((this.synclock === null) || (Atomics.load(this.synclock, 0) === 1)) {
                // normal unlocked execution of the resource command buffer
                // itterate the commandbuffer and execute each command, generating an id for tracing
                for (let command of localCommandBuffer.commands) {
                    const id = new CommandId(this.workerId, localCommandBuffer.commandBufferId, commandId++);
                    this.executeOneCommand(command, id);
                }
            } else {
                // the worker is locked and can't send additional buffers
                // loop all resource command buffers
                // if we don;t do this the client will stay locked and unresponsive
                while (localCommandBuffer !== null) {
                    // itterate the commandbuffer and execute each command, generating an id for tracing
                    for (let command of localCommandBuffer.commands) {
                        const id = new CommandId(this.workerId, localCommandBuffer.commandBufferId, commandId++);
                        this.executeOneCommand(command, id);
                    } 
                    // get next resource commandbuffer form the manager
                    localCommandBuffer = this.buffer.getResourceCommandBuffer();
                }
                switch(this.serverState) {
                    case WorkerGLProxy.STATE_FRAME_SYNC:
                        this.serverState = WorkerGLProxy.STATE_FRAME;
                        break;
                    case WorkerGLProxy.STATE_BOOTSTRAP_SYNC:
                        this.serverState = WorkerGLProxy.STATE_BOOTSTRAP;
                        break;
                    case WorkerGLProxy.STATE_CONTEXT_RESTORED_SYNC:
                        this.serverState = WorkerGLProxy.STATE_CONTEXT_RESTORED;
                        break;
                }
                // unlock the thread to signal that all responsebuffers have been filled
                Atomics.store(this.synclock, 0, 1);
                Atomics.notify(this.synclock, 0, 1);
            }        
        } else {
            // render command buffers are repeatable and can't contain commands that block the client
            // unlocking the client is not a repeatable command
            // get the latest render command buffer
            localCommandBuffer = this.buffer.getRenderCommandBuffer();
            let commandId = 1;
            // itterate the commandbuffer and execute each command, generating an id for tracing
            for (let command of localCommandBuffer.commands) {
                const id = new CommandId(this.workerId, localCommandBuffer.commandBufferId, commandId++);
                this.executeOneCommand(command, id);
            }
        }
        // the current WebGL state after executing one or more command buffers
        return this.lastState;
    }

    // requests a new frame from the client
    // the client is able to create one or more resource command buffers and/or one render commandbuffer.
    // incase the client generates a command which locks the client for a response, all scheduled resource command buffers will be executed immediatly, to unlock the client and progress the frame rendering.
    // when the client has send all the command buffers it wants to schedule it will end the frame with an endframe message, for which we schedule a Promise to wait for that message
    /**
     * 
     */
    async onRequestFrameCommands() {
        switch (this.serverState) {
            case WorkerGLProxy.STATE_CONSTRUCTED:
                this.bootstrap();
                return Promise.race([this.makeWatchdog(), new Promise((res) => {this.frameEndListener = res;})]);
            case WorkerGLProxy.STATE_BOOTSTRAP_DONE:
            case WorkerGLProxy.STATE_FRAME_DONE: 
            case WorkerGLProxy.STATE_CONTEXT_RESTORED_DONE:
                this.serverState = WorkerGLProxy.STATE_FRAME;
                this.worker.postMessage({name: 'frame', time: Date.now(), workerId: this.workerId}, '*');
                return Promise.race([this.makeWatchdog(), new Promise((res) => {this.frameEndListener = res;})]);
            case WorkerGLProxy.STATE_FRAME:
            case WorkerGLProxy.STATE_BOOTSTRAP:
            case WorkerGLProxy.STATE_CONTEXT_RESTORED:
                // execute without asking for additional buffers
                return true;
            default:
                console.error("Server is in a wrong state to ask for more frames. serverState: " + this.serverState);
                return true;
        }
    }

    /**
     * Releases resources when we remove a proxy
     * we can stop waiting for a end frame message and we can remove our message event listener
     */
    remove() {
        this.frameEndListener = null;
        window.removeEventListener('message', this.onMessage);
        // unlock the thread if needed
        if (Atomics.load(this.synclock, 0) === 0) {
            Atomics.store(this.synclock, 0, 1);
            Atomics.notify(this.synclock, 0, 1);
        }
    }

    /**
     * 
     * @param {WebGLContextEvent} e 
     */
    onContextLost(e) {
        e.preventDefault();
        switch (this.serverState) {
            case WorkerGLProxy.STATE_BOOTSTRAP_SYNC:
            case WorkerGLProxy.STATE_FRAME_SYNC:
            case WorkerGLProxy.STATE_CONTEXT_RESTORED_SYNC:
                Atomics.store(this.synclock, 0, 1);
                Atomics.notify(this.synclock, 0, 1);
            case WorkerGLProxy.STATE_BOOTSTRAP_DONE:
            case WorkerGLProxy.STATE_FRAME_DONE:
            case WorkerGLProxy.STATE_CONTEXT_RESTORED_DONE:
            case WorkerGLProxy.STATE_BOOTSTRAP:
            case WorkerGLProxy.STATE_CONTEXT_RESTORED:
            case WorkerGLProxy.STATE_FRAME:
                this.serverState = WorkerGLProxy.STATE_CONTEXT_LOST;
                break;
            case WorkerGLProxy.STATE_CONSTRUCTED:
                // do nothing since no buffers have been received yet so nothing changed in this brand new webgl context
                break;
            default:
                console.log("unexpected state for context lost: " + this.serverState);
                break;
        }
        this.worker.postMessage({name: "context_lost", workerId: this.workerId}, '*');
        this.buffer.onContextLost();
        this.unclonables.clear();
        this.lastState.onContextLost();
    }

    /**
     * 
     * @param {WebGLContextEvent} e 
     */
    onContextRestored(e) {
        if (this.serverState === WorkerGLProxy.STATE_CONTEXT_LOST) {
            this.serverState = WorkerGLProxy.STATE_CONTEXT_RESTORED;
        } else {
            console.log("unexpected state for context restored: " + this.serverState);
        }
        const {width, height} = globalStates;
        this.worker.postMessage({name: "context_restored", workerId: this.workerId, width: width, height: height}, '*');
    }

    /**
     * 
     * @returns {Promise<boolean>}
     */
    makeWatchdog() {
        return new Promise((res) => {
            setTimeout(res, 3000, false);
        });
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
let lastRender = Date.now();

/**
 * @type {GLState | null}
 */
let defaultGLState = null;

function initService() {
    console.log("renderer is in a secure context: " + isSecureContext + " and isolated: " + crossOriginIsolated);
    // canvas = globalCanvas.canvas;
    canvas = document.querySelector('#glcanvas');
    if (canvas !== null) {
        canvas.width = globalStates.height;
        canvas.height = globalStates.width;
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
        canvas.addEventListener("webglcontextlost", (e) => {for (const proxy of proxies) proxy.onContextLost(e);}, false);
        canvas.addEventListener("webglcontextrestored", (e) => {for (const proxy of proxies) proxy.onContextRestored(e);}, false);
        canvas.addEventListener("webglcontextcreationerror", (e) => {console.log("can't create context: " + (e.statusMessage || "Unknown error"))}, false);
        //gl = WebGLDebugUtils.makeDebugContext(canvas.getContext('webgl2'));
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

        defaultGLState = GLState.createFromGLContext(gl, new Map());

        setTimeout(renderFrame, 500);
        setInterval(watchpuppy, 1000);

        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
        realityEditor.network.registerCallback('vehicleDeleted', onVehicleDeleted);
        
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
    
    proxies.forEach(function(thisProxy) {
        let toolId = thisProxy.toolId;
        let element = globalDOMCache['object' + toolId];
        if (element && window.getComputedStyle(element).display !== 'none') {
            proxiesToConsider.push(thisProxy);
        }
    });

    let proxiesToBeRenderedThisFrame = getSafeProxySubset(proxiesToConsider);

    // Get all the commands from the worker iframes
    let prommies = proxiesToBeRenderedThisFrame.map(proxy => proxy.onRequestFrameCommands());
    let res = await Promise.all(prommies);
    if (!res) {
        console.warn('glRenderer watchdog is barking');
        requestAnimationFrameIfNotPending();
        return;
    }

    // we start rendering synchroneously, don't use async here or the commands will be executed between frames, which the next few lines will throw away
    if (gl !== null) {
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
       
        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    
    let glState = defaultGLState;
    if (glState !== null) {
        glState.applyAll();
        for (let i = 0; i < proxiesToBeRenderedThisFrame.length; i++) {
            let proxy = proxiesToBeRenderedThisFrame[i];
            glState = proxy.onRenderFrame(glState);
        }
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

realityEditor.gui.glRenderer.initService = initService;
realityEditor.gui.glRenderer.addWebGlProxy = addWebGlProxy;
realityEditor.gui.glRenderer.removeWebGlProxy = removeWebGlProxy;
realityEditor.gui.glRenderer.renderFrame = renderFrame;
