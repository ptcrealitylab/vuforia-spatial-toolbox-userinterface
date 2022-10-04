import {rvl} from './index.js';

const DEPTH_WIDTH = 256;
const DEPTH_HEIGHT = 144;

export default class RVLParser {
    /**
     * @param {ArrayBuffer} buf
     */
    constructor(buf) {
        this.buf = buf;
        this.offset = 0;
        this.startTime = 0;
        this.currentFrame = null;
        this.nextFrame = null;

        this.currentFrame = this.parseNextFrame();
        this.nextFrame = this.parseNextFrame();
        this.startTime = this.currentFrame.timeMono;
    }

    getFrameFromDeltaTimeSeconds(deltaTimeSeconds) {
        while (this.nextFrame && this.nextFrame.timeMono - this.startTime <= deltaTimeSeconds) {
            this.currentFrame = this.nextFrame;
            this.nextFrame = this.parseNextFrame();
        }
        return this.currentFrame;
    }

    parseNextFrame() {
        /**
         * double secondsSince1970;
         * double timeMono;
         * int32 rvlBufferLen
         * int32 payloadLen
         * [u8; payloadLen]
         * [u8; rvlBufferLen]
         */
        if (this.offset >= this.buf.byteLength - 12) {
            return null;
        }
        const _header = this.readDouble();
        const secondsSince1970 = this.readDouble();
        const timeMono = this.readDouble();
        const rvlBufferLen = this.readInt32();
        const payloadLen = this.readInt32();
        const payload = this.readBytes(payloadLen);
        this.offset += (8 - (payloadLen % 8)) % 8;
        const rvlBuf = this.readBytes(rvlBufferLen);
        this.offset += (8 - (rvlBufferLen % 8)) % 8;

        return {
            secondsSince1970,
            timeMono,
            rvlBuf,
            payload,
        };
    }

    getFrameRawDepth(frame) {
        return rvl.decompress(frame.rvlBuf);
    }

    drawFrame(frame, context, imageData) {
        const rawDepth = this.getFrameRawDepth(frame);
        if (!rawDepth) {
            console.warn('RVL wasm not loaded');
            return;
        }
        for (let i = 0; i < DEPTH_WIDTH * DEPTH_HEIGHT; i++) {
            // We get 14 bits of depth information from the RVL-encoded
            // depth buffer. Note that this means the blue channel is
            // always zero
            let depth24Bits = rawDepth[i] << (24 - 14); // * 5 / (1 << 14);
            if (depth24Bits > 0xffffff) {
                depth24Bits = 0xffffff;
            }
            let b = depth24Bits & 0xff;
            let g = (depth24Bits >> 8) & 0xff;
            let r = (depth24Bits >> 16) & 0xff;
            imageData.data[4 * i + 0] = r;
            imageData.data[4 * i + 1] = g;
            imageData.data[4 * i + 2] = b;
            imageData.data[4 * i + 3] = 255;
        }
        context.putImageData(imageData, 0, 0);
    }

    readDouble() {
        let arr = new Float64Array(this.buf, this.offset, 1)
        this.offset += Float64Array.BYTES_PER_ELEMENT;
        return arr[0];
    }
    readInt32() {
        let arr = new Int32Array(this.buf, this.offset, 1)
        this.offset += Int32Array.BYTES_PER_ELEMENT;
        return arr[0];
    }
    readBytes(len) {
        let arr = new Uint8Array(this.buf, this.offset, len);
        this.offset += len;
        return arr;
    }
}

