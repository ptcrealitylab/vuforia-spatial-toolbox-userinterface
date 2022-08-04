# rvl

wasm bundle of RVL code from Microsoft https://www.microsoft.com/en-us/research/uploads/prod/2018/09/p100-wilson.pdf

Compiled with `emcc -sEXPORTED_RUNTIME_METHODS=ccall -sEXPORTED_FUNCTIONS=_malloc,_compressRVL,_decompressRVL -sNO_EXIT_RUNTIME=1 -sEXPORT_ES6=1 -sMODULARIZE=1 rvl.c -o rvl.js`
