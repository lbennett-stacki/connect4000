export const uint8ArrayToU64 = (array: Uint8Array) => {
  const view = new DataView(array.buffer, 0);
  return view.getBigUint64(0);
};
