import { Camera } from './camera';
import { Coords } from './run';

export const getMousePosition = (event: MouseEvent) => {
  const position = {
    x: event.clientX,
    y: event.clientY,
  };

  return position;
};

const scaleSpeed = 0.001;

export const adjustScale = (
  event: WheelEvent,
  canvas: HTMLCanvasElement,
  camera: Camera,
  aspectRatio: number
): Camera => {
  const rect = canvas.getBoundingClientRect();
  const normalizedX =
    (((event.clientX - rect.left) / rect.width) * 2 - 1) * aspectRatio;
  const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  const projectedX = normalizedX / camera.scale - camera.x;
  const projectedY = (normalizedY * -1) / camera.scale - camera.y;

  let scale = camera.scale - event.deltaY * scaleSpeed;
  scale = Math.max(0.01, scale);

  const newProjectedX = normalizedX / camera.scale - camera.x;
  const newProjectedY = (normalizedY * -1) / camera.scale - camera.y;

  let x = camera.x + (projectedX - newProjectedX) * -1;
  let y = camera.y + (projectedY - newProjectedY) * -1;

  return {
    x,
    y,
    scale,
  };
};

export const getProjectedMousePosition = (
  event: MouseEvent,
  canvas: HTMLCanvasElement,
  camera: Camera,
  aspectRatio: number
) => {
  const rect = canvas.getBoundingClientRect();

  const normalizedX =
    (((event.clientX - rect.left) / rect.width) * 2 - 1) * aspectRatio;
  const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

  const projectedX = normalizedX / camera.scale - camera.x;
  const projectedY = (normalizedY * -1) / camera.scale - camera.y;

  return {
    x: projectedX,
    y: projectedY,
  };
};

const translateSpeed = 0.01;

export const translateCamera = (
  event: MouseEvent,
  camera: Camera,
  mouseDownPosition: Coords
) => {
  let x = (mouseDownPosition.x - event.clientX) * translateSpeed;
  let y = (mouseDownPosition.y - event.clientY) * translateSpeed;

  x = camera.x + x * -1;
  y = camera.y + y;

  return {
    x,
    y,
    scale: camera.scale,
  };
};
