export function subtractVec3<M extends [number, number, number]>(a: M, b: M) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as M;
}

export function lenVec3<M extends [number, number, number]>(a: M) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export function normalizeVec3<M extends [number, number, number]>(a: M) {
  const length = lenVec3(a);

  return [a[0] / length, a[1] / length, a[2] / length] as M;
}

export function crossVec3<M extends [number, number, number]>(a: M, b: M) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ] as M;
}

export function dotVec3<M extends [number, number, number]>(a: M, b: M) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
