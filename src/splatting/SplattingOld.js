import * as THREE from '../../thirdPartyCode/three/three.module.js';

let gsInitialized = false;
let gsActive = false;
let gsContainer;
let carousel = true;

let cameras = [
    {
        id: 0,
        img_name: "00001",
        width: window.innerWidth,
        height: window.innerHeight,
        position: [
            0, 0, 0,
        ],
        rotation: [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ],
        fy: 1253,
        fx: 1253,
    },
    
];

const camera = cameras[0];

function getProjectionMatrix(fx, fy, width, height) {
    const znear = 0.2;
    const zfar = 200;
    return [
        [(2 * fx) / width, 0, 0, 0],
        [0, -(2 * fy) / height, 0, 0],
        [0, 0, zfar / (zfar - znear), 1],
        [0, 0, -(zfar * znear) / (zfar - znear), 0],
    ].flat();
}

function getViewMatrix(camera) {
    const R = camera.rotation.flat();
    const t = camera.position;
    const camToWorld = [
        [R[0], R[1], R[2], 0],
        [R[3], R[4], R[5], 0],
        [R[6], R[7], R[8], 0],
        [
            -t[0] * R[0] - t[1] * R[3] - t[2] * R[6],
            -t[0] * R[1] - t[1] * R[4] - t[2] * R[7],
            -t[0] * R[2] - t[1] * R[5] - t[2] * R[8],
            1,
        ],
    ].flat();
    return camToWorld;
}

function multiply4(a, b) {
    return [
        b[0] * a[0] + b[1] * a[4] + b[2] * a[8] + b[3] * a[12],
        b[0] * a[1] + b[1] * a[5] + b[2] * a[9] + b[3] * a[13],
        b[0] * a[2] + b[1] * a[6] + b[2] * a[10] + b[3] * a[14],
        b[0] * a[3] + b[1] * a[7] + b[2] * a[11] + b[3] * a[15],
        b[4] * a[0] + b[5] * a[4] + b[6] * a[8] + b[7] * a[12],
        b[4] * a[1] + b[5] * a[5] + b[6] * a[9] + b[7] * a[13],
        b[4] * a[2] + b[5] * a[6] + b[6] * a[10] + b[7] * a[14],
        b[4] * a[3] + b[5] * a[7] + b[6] * a[11] + b[7] * a[15],
        b[8] * a[0] + b[9] * a[4] + b[10] * a[8] + b[11] * a[12],
        b[8] * a[1] + b[9] * a[5] + b[10] * a[9] + b[11] * a[13],
        b[8] * a[2] + b[9] * a[6] + b[10] * a[10] + b[11] * a[14],
        b[8] * a[3] + b[9] * a[7] + b[10] * a[11] + b[11] * a[15],
        b[12] * a[0] + b[13] * a[4] + b[14] * a[8] + b[15] * a[12],
        b[12] * a[1] + b[13] * a[5] + b[14] * a[9] + b[15] * a[13],
        b[12] * a[2] + b[13] * a[6] + b[14] * a[10] + b[15] * a[14],
        b[12] * a[3] + b[13] * a[7] + b[14] * a[11] + b[15] * a[15],
    ];
}

function invert4(a) {
    let b00 = a[0] * a[5] - a[1] * a[4];
    let b01 = a[0] * a[6] - a[2] * a[4];
    let b02 = a[0] * a[7] - a[3] * a[4];
    let b03 = a[1] * a[6] - a[2] * a[5];
    let b04 = a[1] * a[7] - a[3] * a[5];
    let b05 = a[2] * a[7] - a[3] * a[6];
    let b06 = a[8] * a[13] - a[9] * a[12];
    let b07 = a[8] * a[14] - a[10] * a[12];
    let b08 = a[8] * a[15] - a[11] * a[12];
    let b09 = a[9] * a[14] - a[10] * a[13];
    let b10 = a[9] * a[15] - a[11] * a[13];
    let b11 = a[10] * a[15] - a[11] * a[14];
    let det =
        b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    return [
        (a[5] * b11 - a[6] * b10 + a[7] * b09) / det,
        (a[2] * b10 - a[1] * b11 - a[3] * b09) / det,
        (a[13] * b05 - a[14] * b04 + a[15] * b03) / det,
        (a[10] * b04 - a[9] * b05 - a[11] * b03) / det,
        (a[6] * b08 - a[4] * b11 - a[7] * b07) / det,
        (a[0] * b11 - a[2] * b08 + a[3] * b07) / det,
        (a[14] * b02 - a[12] * b05 - a[15] * b01) / det,
        (a[8] * b05 - a[10] * b02 + a[11] * b01) / det,
        (a[4] * b10 - a[5] * b08 + a[7] * b06) / det,
        (a[1] * b08 - a[0] * b10 - a[3] * b06) / det,
        (a[12] * b04 - a[13] * b02 + a[15] * b00) / det,
        (a[9] * b02 - a[8] * b04 - a[11] * b00) / det,
        (a[5] * b07 - a[4] * b09 - a[6] * b06) / det,
        (a[0] * b09 - a[1] * b07 + a[2] * b06) / det,
        (a[13] * b01 - a[12] * b03 - a[14] * b00) / det,
        (a[8] * b03 - a[9] * b01 + a[10] * b00) / det,
    ];
}


function createWorker(self) {
    let buffer;
    let vertexCount = 0;
    let viewProj;
    // 6*4 + 4 + 4 = 8*4
    // XYZ - Position (Float32)
    // XYZ - Scale (Float32)
    // RGBA - colors (uint8)
    // IJKL - quaternion/rot (uint8)
    const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
    let lastProj = [];
    let depthIndex = new Uint32Array();

    const runSort = (viewProj) => {
        if (!buffer) return;

        const f_buffer = new Float32Array(buffer);
        const u_buffer = new Uint8Array(buffer);

        const covA = new Float32Array(3 * vertexCount);
        const covB = new Float32Array(3 * vertexCount);

        const center = new Float32Array(3 * vertexCount);
        const color = new Float32Array(4 * vertexCount);

        if (depthIndex.length == vertexCount) {
            let dot =
                lastProj[2] * viewProj[2] +
                lastProj[6] * viewProj[6] +
                lastProj[10] * viewProj[10];
            if (Math.abs(dot - 1) < 0.01) {
                return;
            }
        }

        let maxDepth = -Infinity;
        let minDepth = Infinity;
        let sizeList = new Int32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) {
            let depth =
                ((viewProj[2] * f_buffer[8 * i + 0] +
                        viewProj[6] * f_buffer[8 * i + 1] +
                        viewProj[10] * f_buffer[8 * i + 2]) *
                    4096) |
                0;
            sizeList[i] = depth;
            if (depth > maxDepth) maxDepth = depth;
            if (depth < minDepth) minDepth = depth;
        }
        // console.time("sort");

        // This is a 16 bit single-pass counting sort
        let depthInv = (256 * 256) / (maxDepth - minDepth);
        let counts0 = new Uint32Array(256*256);
        for (let i = 0; i < vertexCount; i++) {
            sizeList[i] = ((sizeList[i] - minDepth) * depthInv) | 0;
            counts0[sizeList[i]]++;
        }
        let starts0 = new Uint32Array(256*256);
        for (let i = 1; i < 256*256; i++) starts0[i] = starts0[i - 1] + counts0[i - 1];
        depthIndex = new Uint32Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) depthIndex[starts0[sizeList[i]]++] = i;


        lastProj = viewProj;
        // console.timeEnd("sort");
        for (let j = 0; j < vertexCount; j++) {
            const i = depthIndex[j];

            center[3 * j + 0] = f_buffer[8 * i + 0];
            center[3 * j + 1] = f_buffer[8 * i + 1];
            center[3 * j + 2] = f_buffer[8 * i + 2];

            color[4 * j + 0] = u_buffer[32 * i + 24 + 0] / 255;
            color[4 * j + 1] = u_buffer[32 * i + 24 + 1] / 255;
            color[4 * j + 2] = u_buffer[32 * i + 24 + 2] / 255;
            color[4 * j + 3] = u_buffer[32 * i + 24 + 3] / 255;

            let scale = [
                f_buffer[8 * i + 3 + 0],
                f_buffer[8 * i + 3 + 1],
                f_buffer[8 * i + 3 + 2],
            ];
            let rot = [
                (u_buffer[32 * i + 28 + 0] - 128) / 128,
                (u_buffer[32 * i + 28 + 1] - 128) / 128,
                (u_buffer[32 * i + 28 + 2] - 128) / 128,
                (u_buffer[32 * i + 28 + 3] - 128) / 128,
            ];

            const R = [
                1.0 - 2.0 * (rot[2] * rot[2] + rot[3] * rot[3]),
                2.0 * (rot[1] * rot[2] + rot[0] * rot[3]),
                2.0 * (rot[1] * rot[3] - rot[0] * rot[2]),

                2.0 * (rot[1] * rot[2] - rot[0] * rot[3]),
                1.0 - 2.0 * (rot[1] * rot[1] + rot[3] * rot[3]),
                2.0 * (rot[2] * rot[3] + rot[0] * rot[1]),

                2.0 * (rot[1] * rot[3] + rot[0] * rot[2]),
                2.0 * (rot[2] * rot[3] - rot[0] * rot[1]),
                1.0 - 2.0 * (rot[1] * rot[1] + rot[2] * rot[2]),
            ];

            // Compute the matrix product of S and R (M = S * R)
            const M = [
                scale[0] * R[0],
                scale[0] * R[1],
                scale[0] * R[2],
                scale[1] * R[3],
                scale[1] * R[4],
                scale[1] * R[5],
                scale[2] * R[6],
                scale[2] * R[7],
                scale[2] * R[8],
            ];

            covA[3 * j + 0] = M[0] * M[0] + M[3] * M[3] + M[6] * M[6];
            covA[3 * j + 1] = M[0] * M[1] + M[3] * M[4] + M[6] * M[7];
            covA[3 * j + 2] = M[0] * M[2] + M[3] * M[5] + M[6] * M[8];
            covB[3 * j + 0] = M[1] * M[1] + M[4] * M[4] + M[7] * M[7];
            covB[3 * j + 1] = M[1] * M[2] + M[4] * M[5] + M[7] * M[8];
            covB[3 * j + 2] = M[2] * M[2] + M[5] * M[5] + M[8] * M[8];
        }

        self.postMessage({ covA, center, color, covB, viewProj }, [
            covA.buffer,
            center.buffer,
            color.buffer,
            covB.buffer,
        ]);

        // console.timeEnd("sort");
    };

    function processPlyBuffer(inputBuffer) {
        const ubuf = new Uint8Array(inputBuffer);
        // 10KB ought to be enough for a header...
        const header = new TextDecoder().decode(ubuf.slice(0, 1024 * 10));
        const header_end = "end_header\n";
        const header_end_index = header.indexOf(header_end);
        if (header_end_index < 0)
            throw new Error("Unable to read .ply file header");
        const vertexCount = parseInt(/element vertex (\d+)\n/.exec(header)[1]);
        console.log("Vertex Count", vertexCount);
        let row_offset = 0,
            offsets = {},
            types = {};
        const TYPE_MAP = {
            double: "getFloat64",
            int: "getInt32",
            uint: "getUint32",
            float: "getFloat32",
            short: "getInt16",
            ushort: "getUint16",
            uchar: "getUint8",
        };
        for (let prop of header
            .slice(0, header_end_index)
            .split("\n")
            .filter((k) => k.startsWith("property "))) {
            const [p, type, name] = prop.split(" ");
            const arrayType = TYPE_MAP[type] || "getInt8";
            types[name] = arrayType;
            offsets[name] = row_offset;
            row_offset += parseInt(arrayType.replace(/[^\d]/g, "")) / 8;
        }
        console.log("Bytes per row", row_offset, types, offsets);

        let dataView = new DataView(
            inputBuffer,
            header_end_index + header_end.length,
        );
        let row = 0;
        const attrs = new Proxy(
            {},
            {
                get(target, prop) {
                    if (!types[prop]) throw new Error(prop + " not found");
                    return dataView[types[prop]](
                        row * row_offset + offsets[prop],
                        true,
                    );
                },
            },
        );

        console.time("calculate importance");
        let sizeList = new Float32Array(vertexCount);
        let sizeIndex = new Uint32Array(vertexCount);
        for (row = 0; row < vertexCount; row++) {
            sizeIndex[row] = row;
            if (!types["scale_0"]) continue;
            const size =
                Math.exp(attrs.scale_0) *
                Math.exp(attrs.scale_1) *
                Math.exp(attrs.scale_2);
            const opacity = 1 / (1 + Math.exp(-attrs.opacity));
            sizeList[row] = size * opacity;
        }
        console.timeEnd("calculate importance");

        console.time("sort");
        sizeIndex.sort((b, a) => sizeList[a] - sizeList[b]);
        console.timeEnd("sort");

        // 6*4 + 4 + 4 = 8*4
        // XYZ - Position (Float32)
        // XYZ - Scale (Float32)
        // RGBA - colors (uint8)
        // IJKL - quaternion/rot (uint8)
        const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
        const buffer = new ArrayBuffer(rowLength * vertexCount);

        console.time("build buffer");
        for (let j = 0; j < vertexCount; j++) {
            row = sizeIndex[j];

            const position = new Float32Array(buffer, j * rowLength, 3);
            const scales = new Float32Array(buffer, j * rowLength + 4 * 3, 3);
            const rgba = new Uint8ClampedArray(
                buffer,
                j * rowLength + 4 * 3 + 4 * 3,
                4,
            );
            const rot = new Uint8ClampedArray(
                buffer,
                j * rowLength + 4 * 3 + 4 * 3 + 4,
                4,
            );

            if (types["scale_0"]) {
                const qlen = Math.sqrt(
                    attrs.rot_0 ** 2 +
                    attrs.rot_1 ** 2 +
                    attrs.rot_2 ** 2 +
                    attrs.rot_3 ** 2,
                );

                rot[0] = (attrs.rot_0 / qlen) * 128 + 128;
                rot[1] = (attrs.rot_1 / qlen) * 128 + 128;
                rot[2] = (attrs.rot_2 / qlen) * 128 + 128;
                rot[3] = (attrs.rot_3 / qlen) * 128 + 128;

                scales[0] = Math.exp(attrs.scale_0);
                scales[1] = Math.exp(attrs.scale_1);
                scales[2] = Math.exp(attrs.scale_2);
            } else {
                scales[0] = 0.01;
                scales[1] = 0.01;
                scales[2] = 0.01;

                rot[0] = 255;
                rot[1] = 0;
                rot[2] = 0;
                rot[3] = 0;
            }

            position[0] = attrs.x;
            position[1] = attrs.y;
            position[2] = attrs.z;

            if (types["f_dc_0"]) {
                const SH_C0 = 0.28209479177387814;
                rgba[0] = (0.5 + SH_C0 * attrs.f_dc_0) * 255;
                rgba[1] = (0.5 + SH_C0 * attrs.f_dc_1) * 255;
                rgba[2] = (0.5 + SH_C0 * attrs.f_dc_2) * 255;
            } else {
                rgba[0] = attrs.red;
                rgba[1] = attrs.green;
                rgba[2] = attrs.blue;
            }
            if (types["opacity"]) {
                rgba[3] = (1 / (1 + Math.exp(-attrs.opacity))) * 255;
            } else {
                rgba[3] = 255;
            }
        }
        console.timeEnd("build buffer");
        return buffer;
    }

    const throttledSort = () => {
        if (!sortRunning) {
            sortRunning = true;
            let lastView = viewProj;
            runSort(lastView);
            setTimeout(() => {
                sortRunning = false;
                if (lastView !== viewProj) {
                    throttledSort();
                }
            }, 0);
        }
    };

    let sortRunning;
    self.onmessage = (e) => {
        if (e.data.ply) {
            vertexCount = 0;
            runSort(viewProj);
            buffer = processPlyBuffer(e.data.ply);
            vertexCount = Math.floor(buffer.byteLength / rowLength);
            postMessage({ buffer: buffer });
        } else if (e.data.buffer) {
            buffer = e.data.buffer;
            vertexCount = e.data.vertexCount;
        } else if (e.data.vertexCount) {
            vertexCount = e.data.vertexCount;
        } else if (e.data.view) {
            viewProj = e.data.view;
            throttledSort();
        }
    };
}

const vertexShaderSource = `
    precision mediump float;
    attribute vec2 position;

    attribute vec4 color;
    attribute vec3 center;
    attribute vec3 covA;
    attribute vec3 covB;

    uniform mat4 projection, view;
    uniform vec2 focal;
    uniform vec2 viewport;

    varying vec4 vColor;
    varying vec2 vPosition;

    mat3 transpose(mat3 m) {
        return mat3(
                m[0][0], m[1][0], m[2][0],
                m[0][1], m[1][1], m[2][1],
                m[0][2], m[1][2], m[2][2]
        );
    }

    void main () {
        vec4 camspace = view * vec4(center, 1);
        vec4 pos2d = projection * camspace;

        float bounds = 1.2 * pos2d.w;
        if (pos2d.z < -pos2d.w || pos2d.x < -bounds || pos2d.x > bounds
         || pos2d.y < -bounds || pos2d.y > bounds) {
                gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
                return;
        }

        mat3 Vrk = mat3(
                covA.x, covA.y, covA.z, 
                covA.y, covB.x, covB.y,
                covA.z, covB.y, covB.z
        );
    
        mat3 J = mat3(
                focal.x / camspace.z, 0., -(focal.x * camspace.x) / (camspace.z * camspace.z), 
                0., -focal.y / camspace.z, (focal.y * camspace.y) / (camspace.z * camspace.z), 
                0., 0., 0.
        );

        mat3 W = transpose(mat3(view));
        mat3 T = W * J;
        mat3 cov = transpose(T) * Vrk * T;
        
        vec2 vCenter = vec2(pos2d) / pos2d.w;

        float diagonal1 = cov[0][0] + 0.3;
        float offDiagonal = cov[0][1];
        float diagonal2 = cov[1][1] + 0.3;

    float mid = 0.5 * (diagonal1 + diagonal2);
    float radius = length(vec2((diagonal1 - diagonal2) / 2.0, offDiagonal));
    float lambda1 = mid + radius;
    float lambda2 = max(mid - radius, 0.1);
    vec2 diagonalVector = normalize(vec2(offDiagonal, lambda1 - diagonal1));
    vec2 v1 = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 v2 = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);


        vColor = color;
        vPosition = position;

        gl_Position = vec4(
                vCenter 
                        + position.x * v1 / viewport * 2.0 
                        + position.y * v2 / viewport * 2.0, 0.0, 1.0);

    }
`;

const fragmentShaderSource = `
precision mediump float;

    varying vec4 vColor;
    varying vec2 vPosition;

    void main () {    
        float A = -dot(vPosition, vPosition);
        if (A < -4.0) discard;
        float B = exp(A) * vColor.a;
        gl_FragColor = vec4(B * vColor.rgb, B);
    }
`;

let defaultViewMatrix = [
    0.47, 0.04, 0.88, 0, -0.11, 0.99, 0.02, 0, -0.88, -0.11, 0.47, 0, 0.07,
    0.03, 6.55, 1,
];
let viewMatrix = defaultViewMatrix;
let activeDownsample = null

async function main() {

    try {
        viewMatrix = JSON.parse(decodeURIComponent(location.hash.slice(1)));
        carousel = false;
    } catch (err) {}
    const url = new URL("https://huggingface.co/cakewalk/splat-data/resolve/main/train.splat");
    const req = await fetch(url, {
        mode: "cors", // no-cors, *cors, same-origin
        credentials: "omit", // include, *same-origin, omit
    });
    // console.log(req);
    if (req.status != 200) {
        throw new Error(req.status + " Unable to load " + req.url);
    }
    const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
    const reader = req.body.getReader();
    let splatData = new Uint8Array(req.headers.get("content-length"));

    const downsample =
        splatData.length / rowLength > 500000 ? 1 : 1 / devicePixelRatio;


    const worker = new Worker(
        URL.createObjectURL(
            new Blob(["(", createWorker.toString(), ")(self)"], {
                type: "application/javascript",
            }),
        ),
    );

    const canvas = document.getElementById("gsCanvas");
    canvas.width = innerWidth / downsample;
    canvas.height = innerHeight / downsample;

    const fps = document.getElementById("gsFps");

    let projectionMatrix = getProjectionMatrix(
        camera.fx / downsample,
        camera.fy / downsample,
        canvas.width,
        canvas.height,
    );

    const gl = canvas.getContext("webgl");
    const ext = gl.getExtension("ANGLE_instanced_arrays");

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(vertexShader));

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(fragmentShader));

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.error(gl.getProgramInfoLog(program));

    gl.disable(gl.DEPTH_TEST); // Disable depth testing

    // Enable blending
    gl.enable(gl.BLEND);

    // Set blending function
    gl.blendFuncSeparate(
        gl.ONE_MINUS_DST_ALPHA,
        gl.ONE,
        gl.ONE_MINUS_DST_ALPHA,
        gl.ONE,
    );

    // Set blending equation
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

    // projection
    const u_projection = gl.getUniformLocation(program, "projection");
    gl.uniformMatrix4fv(u_projection, false, projectionMatrix);

    // viewport
    const u_viewport = gl.getUniformLocation(program, "viewport");
    gl.uniform2fv(u_viewport, new Float32Array([canvas.width, canvas.height]));

    // focal
    const u_focal = gl.getUniformLocation(program, "focal");
    gl.uniform2fv(
        u_focal,
        new Float32Array([camera.fx / downsample, camera.fy / downsample]),
    );

    // view
    const u_view = gl.getUniformLocation(program, "view");
    gl.uniformMatrix4fv(u_view, false, viewMatrix);

    // positions
    const triangleVertices = new Float32Array([-2, -2, 2, -2, 2, 2, -2, 2]);
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
    const a_position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    // center
    const centerBuffer = gl.createBuffer();
    const a_center = gl.getAttribLocation(program, "center");
    gl.enableVertexAttribArray(a_center);
    gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
    gl.vertexAttribPointer(a_center, 3, gl.FLOAT, false, 0, 0);
    ext.vertexAttribDivisorANGLE(a_center, 1); // Use the extension here

    // color
    const colorBuffer = gl.createBuffer();
    const a_color = gl.getAttribLocation(program, "color");
    gl.enableVertexAttribArray(a_color);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(a_color, 4, gl.FLOAT, false, 0, 0);
    ext.vertexAttribDivisorANGLE(a_color, 1); // Use the extension here

    // cov
    const covABuffer = gl.createBuffer();
    const a_covA = gl.getAttribLocation(program, "covA");
    gl.enableVertexAttribArray(a_covA);
    gl.bindBuffer(gl.ARRAY_BUFFER, covABuffer);
    gl.vertexAttribPointer(a_covA, 3, gl.FLOAT, false, 0, 0);
    ext.vertexAttribDivisorANGLE(a_covA, 1); // Use the extension here

    const covBBuffer = gl.createBuffer();
    const a_covB = gl.getAttribLocation(program, "covB");
    gl.enableVertexAttribArray(a_covB);
    gl.bindBuffer(gl.ARRAY_BUFFER, covBBuffer);
    gl.vertexAttribPointer(a_covB, 3, gl.FLOAT, false, 0, 0);
    ext.vertexAttribDivisorANGLE(a_covB, 1); // Use the extension here

    let lastProj = [];
    let lastData;

    worker.onmessage = (e) => {
        if (e.data.buffer) {
            splatData = new Uint8Array(e.data.buffer);
            const blob = new Blob([splatData.buffer], {
                type: "application/octet-stream",
            });
            // TODO (Dan): don't download, send to server
            const link = document.createElement("a");
            link.download = "model.splat";
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } else {
            let { covA, covB, center, color, viewProj } = e.data;
            lastData = e.data;

            activeDownsample = downsample

            lastProj = viewProj;
            vertexCount = center.length / 3;

            gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, center, gl.DYNAMIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, color, gl.DYNAMIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, covABuffer);
            gl.bufferData(gl.ARRAY_BUFFER, covA, gl.DYNAMIC_DRAW);

            gl.bindBuffer(gl.ARRAY_BUFFER, covBBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, covB, gl.DYNAMIC_DRAW);
        }
    };


    const sourceMatrix =   [1, 0, 0,0,
                            0,-1, 0,0,
                            0, 0,-1,0,
                            0, 0, 0,1];


    let transformationMatrix = new THREE.Matrix4();
    transformationMatrix.fromArray(sourceMatrix);
    let isKeyPressed = false;

    function ResetCamParameter()
    {}

    const rotationLevels = [0.1, 1, 15];
    const translationLevels = [0.01, 0.1, 1];
    const scaleLevels = [1.01, 1.05, 1.1]
    let transformIndex = 0; 


    let rotateValue = rotationLevels[transformIndex];
    let translateValue = translationLevels[transformIndex];
    let scaleValue = scaleLevels[transformIndex];


    document.addEventListener('keydown', function(event) {
        if (isKeyPressed) return;  // If the key is already pressed, return early
        switch(event.code) {
            case "NumpadAdd": // Move up the levels for rotation and translation
                transformIndex = (transformIndex + 1) % 3;
                rotateValue = rotationLevels[transformIndex];
                translateValue = translationLevels[transformIndex];
                scaleValue = scaleLevels[transformIndex];
                console.log("New rotateValue:", rotateValue, "New translateValue:", translateValue);
                console.log("New scale:", scaleValue);
                isKeyPressed = true;
                break;
    
            case "Numpad6": // Rotate about Y+
                let rotationMatrixY_ = new THREE.Matrix4();
                rotationMatrixY_.makeRotationY(THREE.MathUtils.degToRad(rotateValue)); // Rotate 10 degrees
                transformationMatrix.multiply(rotationMatrixY_);  // Apply incremental rotation
                console.log("Rotating about Y by", rotateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "Numpad4": // Rotate about Y-
                let rotationMatrixY = new THREE.Matrix4();
                rotationMatrixY.makeRotationY(THREE.MathUtils.degToRad(-rotateValue)); // Rotate 10 degrees
                transformationMatrix.multiply(rotationMatrixY);  // Apply incremental rotation
                console.log("Rotating about Y by", -rotateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "Numpad8": // Rotate about X+
                let rotationMatrixX_ = new THREE.Matrix4();
                rotationMatrixX_.makeRotationX(THREE.MathUtils.degToRad(rotateValue)); // Rotate 10 degrees
                transformationMatrix.multiply(rotationMatrixX_);  // Apply incremental rotation
                console.log("Rotating about X by", rotateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "Numpad5": // Rotate about X-
                let rotationMatrixX = new THREE.Matrix4();
                rotationMatrixX.makeRotationX(THREE.MathUtils.degToRad(-rotateValue)); // Rotate 10 degrees
                transformationMatrix.multiply(rotationMatrixX);  // Apply incremental rotation
                console.log("Rotating about X by", -rotateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "Numpad7": // Rotate about Z+
                let rotationMatrixZ_ = new THREE.Matrix4();
                rotationMatrixZ_.makeRotationZ(THREE.MathUtils.degToRad(rotateValue)); // Rotate 10 degrees
                transformationMatrix.multiply(rotationMatrixZ_);  // Apply incremental rotation
                console.log("Rotating about Z by", rotateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "Numpad9": // Rotate about Z-
                let rotationMatrixZ = new THREE.Matrix4();
                rotationMatrixZ.makeRotationZ(THREE.MathUtils.degToRad(-rotateValue)); // Rotate 10 degrees
                transformationMatrix.multiply(rotationMatrixZ);  // Apply incremental rotation
                console.log("Rotating about Z by", -rotateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            
            case "KeyA": // Translate along X+
                let translationMatrixX_ = new THREE.Matrix4();
                translationMatrixX_.makeTranslation(translateValue, 0, 0);
                transformationMatrix.multiply(translationMatrixX_);
                console.log("Translating along X by", translateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "KeyD": // Translate along X-
                let translationMatrixX = new THREE.Matrix4();
                translationMatrixX.makeTranslation(-translateValue, 0, 0);
                transformationMatrix.multiply(translationMatrixX);
                console.log("Translating along X by", -translateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
    
            case "KeyE": // Translate along Y+
                let translationMatrixY_ = new THREE.Matrix4();
                translationMatrixY_.makeTranslation(0, translateValue, 0);
                transformationMatrix.multiply(translationMatrixY_);
                console.log("Translating along Y by", translateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "KeyQ": // Translate along Y-
                let translationMatrixY = new THREE.Matrix4();
                translationMatrixY.makeTranslation(0, -translateValue, 0);
                transformationMatrix.multiply(translationMatrixY);
                console.log("Translating along Y by", -translateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
    
            case "KeyW": // Translate along Z
                let translationMatrixZ_ = new THREE.Matrix4();
                translationMatrixZ_.makeTranslation(0, 0, translateValue);
                transformationMatrix.multiply(translationMatrixZ_);
                console.log("Translating along Z by", translateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "KeyS": // Translate along Z-
                let translationMatrixZ = new THREE.Matrix4();
                translationMatrixZ.makeTranslation(0, 0, -translateValue);
                transformationMatrix.multiply(translationMatrixZ);
                console.log("Translating along Z by", -translateValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "Numpad1": // Scale up
                let scaleMatrixUp = new THREE.Matrix4();
                scaleMatrixUp.makeScale(scaleValue, scaleValue, scaleValue);
                transformationMatrix.multiply(scaleMatrixUp);
                console.log("Scale up by", scaleValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            case "Numpad2": // Scale down
                let scaleMatrixDown = new THREE.Matrix4();
                scaleMatrixDown.makeScale(1/scaleValue, 1/scaleValue, 1/scaleValue);
                transformationMatrix.multiply(scaleMatrixDown);
                console.log("Scale up down", scaleValue);
                console.log("New Transformed matrix:", transformationMatrix);
                isKeyPressed = true;
                ResetCamParameter();
                break;
            //... Add cases for other keys and their transformations here
        }
    });
    
    document.addEventListener('keyup', function(event) {
        if (event.code === "Numpad7"  || event.code === "Numpad8" || event.code === "Numpad9" || 
            event.code === "Numpad4"  || event.code === "Numpad5" || event.code === "Numpad6" ||
            event.code === "KeyW"     || event.code === "KeyS"    || event.code === "KeyA"    ||
            event.code === "KeyD"     || event.code === "KeyQ"    || event.code === "KeyE"    ||
            event.code === "NumpadAdd"|| event.code === "Numpad1" || event.code === "Numpad2")  
        {
            isKeyPressed = false;
        }
        //... Reset flags for other keys if needed
    });



    let vertexCount = 0;
    let lastFrame = 0;
    let avgFps = 0;
    let start = 0;

    const frame = (now) => {

        //start YC testing
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');

        let gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE + realityEditor.sceneGraph.TAGS.ROTATE_X);
        if (!gpNode) {
            gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE);
        }
        let newCamMatrix = cameraNode.getMatrixRelativeTo(gpNode);

        const SCALE = 1 / 1000;
        const scaleF = 1.0  
        const offset_x = 0;
        const offset_y = 0;
        const offset_z = 0;
        const floorOffset = realityEditor.gui.ar.areaCreator.calculateFloorOffset() // in my example, it returns -1344.81
        newCamMatrix[12] = (newCamMatrix[12]*SCALE + offset_x)*scaleF;
        newCamMatrix[13] = ((newCamMatrix[13] + floorOffset)*SCALE + offset_y)*scaleF;
        // newCamMatrix[13] = (newCamMatrix[13]*SCALE + offset_y)*scaleF;
        newCamMatrix[14] = (newCamMatrix[14]*SCALE + offset_z)*scaleF;

        function ApplyTransMatrix(sourceMatrix, transMatrix, scaleF)
        {
            let resultMatrix = new Array(16).fill(0);

            for(let row = 0; row < 4; row++) {
                for(let col = 0; col < 4; col++) {
                    let sum = 0; // Initialize sum for each element
                    for(let k = 0; k < 4; k++) {
                        sum += sourceMatrix[row * 4 + k] * transMatrix[k * 4 + col];
                    }
                    resultMatrix[row * 4 + col] = sum; // Assign the calculated value
                }
            }
    
            resultMatrix[12] = resultMatrix[12] * scaleF;
            resultMatrix[13] = resultMatrix[13] * scaleF;
            resultMatrix[14] = resultMatrix[14] * scaleF;

            return resultMatrix
        }
        function transpose(matrix) {
            if (matrix.length !== 16) {
                console.error("Matrix is not a 4x4 matrix");
                return;
            }
        
            return [
                matrix[0], matrix[4], matrix[8], matrix[12],
                matrix[1], matrix[5], matrix[9], matrix[13],
                matrix[2], matrix[6], matrix[10], matrix[14],
                matrix[3], matrix[7], matrix[11], matrix[15]
            ];
        }

        // console.log("processed cam matrix");
        // console.log(newCamMatrix);

        let transformMatrix1D = transformationMatrix.elements;
        // let resultMatrix_1 = ApplyTransMatrix(newCamMatrix, transformMatrix1D, scaleF)
        let resultMatrix_1 = ApplyTransMatrix(transformMatrix1D, newCamMatrix, scaleF)
        let actualViewMatrix = invert4(resultMatrix_1);
        // console.log("actual view matrix");
        // console.log(actualViewMatrix);


        const viewProj = multiply4(projectionMatrix, actualViewMatrix);
        // console.log('project matrix');
        // console.log(projectionMatrix);

        worker.postMessage({ view: viewProj });
        // worker.postMessage({ view: projectionMatrix });

        const currentFps = 1000 / (now - lastFrame) || 0;
        avgFps = avgFps * 0.9 + currentFps * 0.1;
        if (vertexCount > 0) {
            document.getElementById("gsSpinner").style.display = "none";
            gl.uniformMatrix4fv(u_view, false, actualViewMatrix);
            ext.drawArraysInstancedANGLE(gl.TRIANGLE_FAN, 0, 4, vertexCount);
        } else {
            gl.clear(gl.COLOR_BUFFER_BIT);
            document.getElementById("gsSpinner").style.display = "";
            start = Date.now() + 2000;
        }
        fps.innerText = Math.round(avgFps) + " fps";
        lastFrame = now;
        requestAnimationFrame(frame);
    };

    frame();

    const selectFile = (file) => {
        const fr = new FileReader();
        if (/\.json$/i.test(file.name)) {
            fr.onload = () => {
                cameras = JSON.parse(fr.result);
                viewMatrix = getViewMatrix(cameras[0]);
                projectionMatrix = getProjectionMatrix(
                    camera.fx / downsample,
                    camera.fy / downsample,
                    canvas.width,
                    canvas.height,
                );
                gl.uniformMatrix4fv(u_projection, false, projectionMatrix);

                console.log("Loaded Cameras");
            };
            fr.readAsText(file);
        } else {
            stopLoading = true;
            fr.onload = () => {
                splatData = new Uint8Array(fr.result);
                console.log("Loaded", Math.floor(splatData.length / rowLength));

                if (
                    splatData[0] == 112 &&
                    splatData[1] == 108 &&
                    splatData[2] == 121 &&
                    splatData[3] == 10
                ) {
                    // ply file magic header means it should be handled differently
                    worker.postMessage({ ply: splatData.buffer });
                } else {
                    worker.postMessage({
                        buffer: splatData.buffer,
                        vertexCount: Math.floor(splatData.length / rowLength),
                    });
                }
            };
            fr.readAsArrayBuffer(file);
        }
    };

    // TODO: avoid using hash in toolbox
    window.addEventListener("hashchange", (e) => {
        try {
            viewMatrix = JSON.parse(decodeURIComponent(location.hash.slice(1)));
            carousel = false;
        } catch (err) {}
    });

    const preventDefault = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    gsContainer.addEventListener("dragenter", preventDefault);
    gsContainer.addEventListener("dragover", preventDefault);
    gsContainer.addEventListener("dragleave", preventDefault);
    gsContainer.addEventListener("drop", (e) => {
        preventDefault(e);
        selectFile(e.dataTransfer.files[0]);
    });

    window.addEventListener('resize', (e) => {
        const canvas = document.getElementById("gsCanvas");
        canvas.width = innerWidth / activeDownsample;
        canvas.height = innerHeight / activeDownsample;
    })

    let bytesRead = 0;
    let lastVertexCount = -1;
    let stopLoading = false;

    while (true) {
        const { done, value } = await reader.read();
        if (done || stopLoading) break;

        splatData.set(value, bytesRead);
        bytesRead += value.length;

        if (vertexCount > lastVertexCount) {
            worker.postMessage({
                buffer: splatData.buffer,
                vertexCount: Math.floor(bytesRead / rowLength),
            });
            lastVertexCount = vertexCount;
        }

        
    }
    if (!stopLoading) {
        worker.postMessage({
            buffer: splatData.buffer,
            vertexCount: Math.floor(bytesRead / rowLength),
        });
    }
}

window.addEventListener("keydown", e => {
    if (e.key === ',') {

        if (!gsInitialized) {
            gsInitialized = true;
            gsContainer = document.querySelector('#gsContainer');
            gsContainer.style.opacity = 1.0;
            main().catch((err) => {
                document.getElementById("gsSpinner").style.display = "none";
                document.getElementById("gsMessage").innerText = err.toString();
            });
        }
        gsContainer.classList.toggle('hidden');
        gsActive = !gsContainer.classList.contains('hidden');
        carousel = false;
    }
});

export default {
    setMatrix(matrix) {
        viewMatrix = matrix;
    }
}
