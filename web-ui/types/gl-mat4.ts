declare module 'gl-mat4' {
  export function multiply(
    out: Float32Array,
    a: Float32Array,
    b: Float32Array
  ): Float32Array;
  export function create(): Float32Array;
}
