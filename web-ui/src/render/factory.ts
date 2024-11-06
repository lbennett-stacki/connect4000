import { GridDimensions } from './types';

export function createGridVertices({
  dimensions,
}: {
  dimensions: GridDimensions;
}) {
  const lines = [];
  const color = [0.8, 0.8, 0.8]; // Light grey color
  const endX = dimensions.columns;
  const endY = dimensions.rows;

  // Horizontal lines
  for (let i = 0; i <= dimensions.rows; i++) {
    const y = i;
    lines.push(0, y, 0, ...color);
    lines.push(endX, y, 0, ...color);
  }

  // Vertical lines
  for (let i = 0; i <= dimensions.columns; i++) {
    const x = i;
    lines.push(x, 0, 0, ...color);
    lines.push(x, endY, 0, ...color);
  }

  return new Float32Array(lines);
}

export function createDiscVertices({
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
}) {
  const vertices = [];
  const normal = [0, 0, 1]; // Facing +Z direction

  for (let i = 0; i < segments; i++) {
    const theta1 = (i / segments) * 2 * Math.PI;
    const theta2 = ((i + 1) / segments) * 2 * Math.PI;

    // Center vertex
    vertices.push(centerX, centerY, 0, ...normal, ...color);

    // First outer vertex
    vertices.push(
      centerX + radius * Math.cos(theta1),
      centerY + radius * Math.sin(theta1),
      0,
      ...normal,
      ...color
    );

    // Second outer vertex
    vertices.push(
      centerX + radius * Math.cos(theta2),
      centerY + radius * Math.sin(theta2),
      0,
      ...normal,
      ...color
    );
  }

  return new Float32Array(vertices);
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
