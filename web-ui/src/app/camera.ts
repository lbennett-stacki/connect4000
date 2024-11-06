import { GridDimensions } from '../render/types';
import {
  crossVec3,
  dotVec3,
  lenVec3,
  normalizeVec3,
  subtractVec3,
} from '../utils/vec3';
import { Coords } from './run';

export interface CameraLegacy extends Coords {
  scale: number;
}

export const resetCamera = (dimensions: GridDimensions): Camera => {
  const camBase = new Camera(
    [dimensions.columns / 2, dimensions.rows / 2, 10], // Position
    [dimensions.columns / 2, dimensions.rows / 2, 0], // Target
    [0, 1, 0] // Up vector
  );

  return camBase;
};

function lookAt(
  eye: [number, number, number],
  center: [number, number, number],
  up: [number, number, number]
) {
  const zAxis = normalizeVec3(subtractVec3(eye, center));
  const xAxis = normalizeVec3(crossVec3(up, zAxis));
  const yAxis = crossVec3(zAxis, xAxis);

  const viewMatrix = new Float32Array(16);
  viewMatrix[0] = xAxis[0];
  viewMatrix[1] = yAxis[0];
  viewMatrix[2] = zAxis[0];
  viewMatrix[3] = 0;

  viewMatrix[4] = xAxis[1];
  viewMatrix[5] = yAxis[1];
  viewMatrix[6] = zAxis[1];
  viewMatrix[7] = 0;

  viewMatrix[8] = xAxis[2];
  viewMatrix[9] = yAxis[2];
  viewMatrix[10] = zAxis[2];
  viewMatrix[11] = 0;

  viewMatrix[12] = -dotVec3(xAxis, eye);
  viewMatrix[13] = -dotVec3(yAxis, eye);
  viewMatrix[14] = -dotVec3(zAxis, eye);
  viewMatrix[15] = 1;

  return viewMatrix;
}

type Vec3 = [number, number, number];

export class Camera {
  constructor(
    public readonly position: Vec3,
    private readonly target: Vec3,
    private readonly up: Vec3,
    public viewMatrix = this.computeViewMatrix(position, target, up)
  ) {}

  computeViewMatrix(position?: Vec3, target?: Vec3, up?: Vec3) {
    return lookAt(
      position ?? this.position,
      target ?? this.target,
      up ?? this.up
    );
  }

  orbit(angleX: number, angleY: number) {
    const radius = lenVec3(subtractVec3(this.position, this.target));
    const theta = angleX;
    const phi = angleY;

    this.position[0] =
      this.target[0] + radius * Math.sin(phi) * Math.cos(theta);
    this.position[1] = this.target[1] + radius * Math.cos(phi);
    this.position[2] =
      this.target[2] + radius * Math.sin(phi) * Math.sin(theta);

    this.viewMatrix = this.computeViewMatrix();
  }
}
