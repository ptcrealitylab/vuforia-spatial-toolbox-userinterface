createNameSpace("realityEditor.gui.glRenderer");

(function(exports) {
    let workerIds = {};
    let nextWorkerId = 1;
    let toolIdToProxy = {};
    let proxies = [];
    let rendering = false;

    const MAX_PROXIES = 32; // maximum number that can be safely rendered each frame

    /**
     * heavily inspired by three.js, this returns a copy of the matrix without changing the original
     * @param {number[]} matrix 
     * @returns {number[]}
     */
    function invert(matrix) {
        let ret = [];

        // based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
        const te = matrix,

            n11 = te[ 0 ], n21 = te[ 1 ], n31 = te[ 2 ], n41 = te[ 3 ],
			n12 = te[ 4 ], n22 = te[ 5 ], n32 = te[ 6 ], n42 = te[ 7 ],
			n13 = te[ 8 ], n23 = te[ 9 ], n33 = te[ 10 ], n43 = te[ 11 ],
			n14 = te[ 12 ], n24 = te[ 13 ], n34 = te[ 14 ], n44 = te[ 15 ],

			t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
			t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
			t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
			t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

        const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

        if ( det === 0 ) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        const detInv = 1 / det;

        ret.push(t11 * detInv);
        ret.push(( n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44 ) * detInv);
        ret.push(( n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44 ) * detInv);
        ret.push(( n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43 ) * detInv);

        ret.push(t12 * detInv);
        ret.push(( n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44 ) * detInv);
        ret.push(( n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44 ) * detInv);
        ret.push(( n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43 ) * detInv);

        ret.push(t13 * detInv);
        ret.push(( n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44 ) * detInv);
        ret.push(( n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44 ) * detInv);
        ret.push(( n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43 ) * detInv);

        ret.push(t14 * detInv);
        ret.push(( n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34 ) * detInv);
        ret.push(( n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34 ) * detInv);
        ret.push(( n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33 ) * detInv);
        
        return ret;
    }

    /**
     * heavily inspired by three.js, this returns a copy of the matrix without changing the original
     * @param {number[]} matA 
     * @param {number[]} matB
     * @returns {number[]}
     */
    function multiply(matA, matB) {
        let ret = [];

        const ae = matA;
		const be = matB;

		const a11 = ae[ 0 ], a12 = ae[ 4 ], a13 = ae[ 8 ], a14 = ae[ 12 ];
		const a21 = ae[ 1 ], a22 = ae[ 5 ], a23 = ae[ 9 ], a24 = ae[ 13 ];
		const a31 = ae[ 2 ], a32 = ae[ 6 ], a33 = ae[ 10 ], a34 = ae[ 14 ];
		const a41 = ae[ 3 ], a42 = ae[ 7 ], a43 = ae[ 11 ], a44 = ae[ 15 ];

		const b11 = be[ 0 ], b12 = be[ 4 ], b13 = be[ 8 ], b14 = be[ 12 ];
		const b21 = be[ 1 ], b22 = be[ 5 ], b23 = be[ 9 ], b24 = be[ 13 ];
		const b31 = be[ 2 ], b32 = be[ 6 ], b33 = be[ 10 ], b34 = be[ 14 ];
		const b41 = be[ 3 ], b42 = be[ 7 ], b43 = be[ 11 ], b44 = be[ 15 ];

        // reordered to fit the push

		ret.push(a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41);
		ret.push(a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41);
        ret.push(a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41);
        ret.push(a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41);

        ret.push(a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42);
	    ret.push(a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42);
        ret.push(a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42);
        ret.push(a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42);

        ret.push(a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43);
        ret.push(a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43);
        ret.push(a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43);
        ret.push(a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43);

		ret.push(a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44);
        ret.push(a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44);
        ret.push(a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44);
        ret.push(a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44);

		return ret;
    }

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
            this.buffering = false;

            this.onMessage = this.onMessage.bind(this);
            window.addEventListener('message', this.onMessage);

            this.frameEndListener = null;

            /**
             * @type {Map<float, float>}
             */
            this.shaderMap = new Map();
            this.shaderMapLastActive;
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
            if (message.name === 'useProgram') {
                if (message.args[0].hasOwnProperty("fakeClone")) {
                    this.shaderMapLastActive = message.args[0].index;
                }
            } else if (message.name === 'getUniformLocation') {
                if (message.args[1] === "modelViewMatrix") { 
                    this.shaderMap.set(message.args[0].index, {location: message.id});
                    this.shaderMapLastActive = message.args[0].index;
                }
            } else if (message.name === 'uniformMatrix4fv'){
                if(this.shaderMap.has(this.shaderMapLastActive)) {
                    if(this.shaderMap.get(this.shaderMapLastActive).location === message.args[0].index) { 
                        this.shaderMap.get(this.shaderMapLastActive).modelMatrix = message.args[2];
                    }
                }
            } else if ((message.name === 'drawArrays') || (message.name === 'drawElements')) {
                if(this.shaderMap.has(this.shaderMapLastActive)) {
                    const viewMatrix = invert(realityEditor.sceneGraph.getSceneNodeById('CAMERA').worldMatrix);
                    const drawInfo = this.shaderMap.get(this.shaderMapLastActive);
                    this.gl.uniformMatrix4fv(this.uncloneables[drawInfo.location], false, multiply(drawInfo.modelMatrix, viewMatrix));
                }
            }

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
                setTimeout(res, 2000, false);
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
