import { GridDimensions } from './render';

export function createGridVertices({
  dimensions,
}: {
  dimensions: GridDimensions;
}): Float32Array {
  const lines = [];
  const blue = [0, 0, 200 / 255];
  const green = [0, 200 / 255, 0];

  const endX = dimensions.columns;
  const endY = dimensions.rows;

  for (let i = 0; i <= dimensions.rows; i++) {
    const y = i;
    lines.push(0, y, ...blue);
    lines.push(endX, y, ...blue);
  }

  for (let i = 0; i <= dimensions.columns; i++) {
    const x = i;
    lines.push(x, 0, ...green);
    lines.push(x, endY, ...green);
  }

  return new Float32Array(lines);
}

export function createCircleVertices({
  centerX,
  centerY,
  radius,
  color,
  segments = 30,
}: {
  centerX: number;
  centerY: number;
  radius: number;
  color: [number, number, number];
  segments?: number;
}): Float32Array {
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
