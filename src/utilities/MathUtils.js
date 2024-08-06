// output the fractional part of a number
export function fract(x) {
    return x - Math.floor(x);
}

// clamps a number ∈ [low, high]
export function clamp(x, low, high) {
    return Math.min(Math.max(x, low), high);
}

// output a number ∈ [a, b]; when n === 0, output a; when n === 1, output b
export function mix(a, b, n) {
    n = clamp(n, 0, 1);
    return a * (1 - n) + b * n;
}

// inverse function of mix(), output a number ∈ [0, 1]; when x === low, output 0; when x === b, output 1
export function remap01(x, low, high) {
    return clamp((x - low) / (high - low), 0, 1);
}

// remaps x from [lowIn, highIn] to [lowOut, highOut]
export function remap(x, lowIn, highIn, lowOut, highOut) {
    return mix(lowOut, highOut, remap01(x, lowIn, highIn));
}

/**
 * function that generates an s-curve ∈ [0, 1], sort of like:
 * a ∈ [2, 4, 6, 8, 10, ...]. a ↑ --> curve approaches y = x
     __
    /
   |
__/
**/
export function remap01CurveS(x, low, high, a = 2) {
    let r = remap01(x, low, high);
    a = Math.ceil(Math.max(a, 2) / 2) * 2;
    return (1 - r) * Math.pow(r, a) + r * (-Math.pow(r - 1, a) + 1);
}

/**
 * function that generates a curve within [0, 1] that tapers off, sort of like:
 * a ∈ [2, 4, 6, 8, 10, ...]. a ↑ --> curve initial slope becomes bigger
    __
  /
 |
|
**/
export function remap01CurveEaseOut(x, low, high, a = 2) {
    let r = remap01(x, low, high);
    a = Math.ceil(Math.max(a, 2) / 2) * 2;
    return -Math.pow(r - 1, a) + 1;
}

export function remapCurveEaseOut(x, lowIn, highIn, lowOut, highOut) {
    return mix(lowOut, highOut, remap01CurveEaseOut(x, lowIn, highIn));
}

export const mathUtilShader = `
    float Remap01 (float x, float low, float high) {
        return clamp((x - low) / (high - low), 0., 1.);
    }

    float Remap (float x, float lowIn, float highIn, float lowOut, float highOut) {
        return mix(lowOut, highOut, Remap01(x, lowIn, highIn));
    }
`;
