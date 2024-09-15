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

export interface CreatePolygon {
  centerX: number;
  centerY: number;
  radius: number;
  color: [number, number, number];
  sides: number;
  rotation: number;
}

export function createPolygonVertices({
  centerX,
  centerY,
  radius,
  color,
  sides,
  rotation,
}: CreatePolygon): Float32Array {
  const vertices = [];
  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);

  for (let i = 0; i < sides; i++) {
    const theta1 = (i / sides) * 2 * Math.PI;
    const theta2 = ((i + 1) / sides) * 2 * Math.PI;

    const x1 = centerX + radius * Math.cos(theta1);
    const y1 = centerY + radius * Math.sin(theta1);
    const x2 = centerX + radius * Math.cos(theta2);
    const y2 = centerY + radius * Math.sin(theta2);

    const rotatedX1 =
      centerX + (x1 - centerX) * cosRotation - (y1 - centerY) * sinRotation;
    const rotatedY1 =
      centerY + (x1 - centerX) * sinRotation + (y1 - centerY) * cosRotation;
    const rotatedX2 =
      centerX + (x2 - centerX) * cosRotation - (y2 - centerY) * sinRotation;
    const rotatedY2 =
      centerY + (x2 - centerX) * sinRotation + (y2 - centerY) * cosRotation;

    vertices.push(centerX, centerY, ...color);
    vertices.push(rotatedX1, rotatedY1, ...color);
    vertices.push(rotatedX2, rotatedY2, ...color);
  }
  return new Float32Array(vertices);
}

export function createPentagonVertices(
  args: Omit<CreatePolygon, 'sides' | 'rotation'>
) {
  return createPolygonVertices({ ...args, sides: 5, rotation: Math.PI / 10 });
}

export function createSquareVertices(
  args: Omit<CreatePolygon, 'sides' | 'rotation'>
) {
  return createPolygonVertices({ ...args, sides: 4, rotation: Math.PI / 4 });
}
