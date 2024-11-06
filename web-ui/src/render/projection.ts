import { Camera } from '../app/camera';

function createPerspectiveProjectionMatrix(
  fov: number,
  aspectRatio: number,
  near: number,
  far: number
) {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);

  out[0] = f / aspectRatio;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;

  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;

  out[8] = 0;
  out[9] = 0;
  out[10] = (far + near) * nf;
  out[11] = -1;

  out[12] = 0;
  out[13] = 0;
  out[14] = 2 * far * near * nf;
  out[15] = 0;

  return out;
}
//
// function createTranslationMatrix(
//   transformX: number,
//   transformY: number
// ): Float32Array {
//   const out = createMat4();
//   out[12] = transformX;
//   out[13] = transformY;
//   return out;
// }

export function createProjectionMatrix(aspectRatio: number, camera: Camera) {
  const fov = (45 * Math.PI) / 180; // 45-degree field of view
  const near = 0.1;
  const far = 100.0;

  const projectionMatrix = createPerspectiveProjectionMatrix(
    fov,
    aspectRatio,
    near,
    far
    // camera.scale
  );
  // const translationMatrix = createTranslationMatrix(camera.x, camera.y);

  // const transformationMatrix = multiplyMat4(
  //   createMat4(),
  //   // translationMatrix,
  //   projectionMatrix
  // );

  return projectionMatrix;
}
