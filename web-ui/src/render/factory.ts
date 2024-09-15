import { GridDimensions } from './render';

export function createGridVertices({
  dimensions,
  aspectRatio,
}: {
  dimensions: GridDimensions;
  aspectRatio: number;
}): Float32Array {
  const lines = [];
  const color = [0.0, 1.0, 1.0]; // cyan vertices

  for (let i = 0; i <= dimensions.columns; i++) {
    const x = ((i / dimensions.columns) * 2 - 1) * aspectRatio;
    lines.push(x, -1, ...color);
    lines.push(x, 1, ...color);
  }

  for (let i = 0; i <= dimensions.rows; i++) {
    const y = (i / dimensions.rows) * 2 - 1;
    lines.push(-aspectRatio, y, ...color);
    lines.push(aspectRatio, y, ...color);
  }

  return new Float32Array(lines);
}

export function createCircleVertices(
  centerX: number,
  centerY: number,
  radius: number,
  color: [number, number, number],
  segments: number = 30
): Float32Array {
  const vertices = [];

  for (let i = 0; i < segments; i++) {
    const theta1 = (i / segments) * 2 * Math.PI;
    const theta2 = ((i + 1) / segments) * 2 * Math.PI;

    vertices.push(centerX, centerY, ...color);
    vertices.push(
      centerX + radius * Math.cos(theta1),
      centerY + radius * Math.sin(theta1),
      ...color
    );
    vertices.push(
      centerX + radius * Math.cos(theta2),
      centerY + radius * Math.sin(theta2),
      ...color
    );
  }

  return new Float32Array(vertices);
}
