import Module from './rvl.js';

new Module().then(module => {
  const width = 256;
  const height = 144;

  const buf = module._malloc(width * height * Int16Array.BYTES_PER_ELEMENT); // sizeof(short)
  const outBuf = module._malloc(width * height * Int16Array.BYTES_PER_ELEMENT * 2);

  rvl.compress = (pixels) => {
    const raw = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
    module.HEAPU8.set(raw, buf);

    const bytesWritten = module.ccall(
      'compressRVL', 'number',
      ['number', 'number', 'number'],
      [buf, outBuf, width * height]);

    return module.HEAPU8.subarray(outBuf, outBuf + bytesWritten);
  };

  rvl.decompress = (compressed) => {
    module.HEAPU8.set(compressed, outBuf);

    const bytesWritten = module.ccall(
      'decompressRVL', null,
      ['number', 'number', 'number'],
      [outBuf, buf, width * height]);

    let raw = module.HEAPU8.subarray(buf, buf + 2 * width * height);
    return new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / Int16Array.BYTES_PER_ELEMENT);
  };
});

export const rvl = {
    compress: null,
    decompress: null,
};
