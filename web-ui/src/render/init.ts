import { Camera, resetCamera } from '../app/camera';
import { createMat4, multiplyMat4 } from '../utils/mat4';
import { createGridVertices } from './factory';
import { createProjectionMatrix } from './projection';
import { GridDimensions } from './types';

export function initRender({
  device,
  pipelines,
  aspectRatio,
  dimensions,
  camera,
  uniformBuffer: uniformBufferIn,
}: {
  dimensions: GridDimensions;
  aspectRatio: number;
  camera: Camera;
  device: GPUDevice;
  pipelines: { grid: GPURenderPipeline; coin: GPURenderPipeline };
  uniformBuffer: GPUBuffer | null;
}) {
  const projection = createProjectionMatrix(aspectRatio, camera);

  const camBase = resetCamera(dimensions);

  const uniformBuffer =
    uniformBufferIn ??
    device.createBuffer({
      size: projection.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

  const grid = createGrid({
    uniformBuffer,
    projection,
    device,
    pipeline: pipelines.grid,
    dimensions,
  });

  const coin = createCoin({
    uniformBuffer,
    projection,
    device,
    pipeline: pipelines.coin,
  });

  const mouse = createMouse({
    uniformBuffer,
    projection,
    device,
    pipeline: pipelines.coin,
  });

  const cam = createCam({
    uniformBuffer,
    projection,
    device,
    cam: camBase,
    pipeline: pipelines.coin,
  });

  return { uniformBuffer, projection, grid, coin, mouse, camera: cam };
}

function createCoin({
  device,
  pipeline,
  uniformBuffer,
  projection,
}: {
  uniformBuffer: GPUBuffer;
  projection: Float32Array;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
}) {
  const bindGroup = device.createBindGroup({
    label: 'coin',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  device.queue.writeBuffer(uniformBuffer, 0, projection);

  return { bindGroup, pipeline, uniformBuffer };
}

function createGrid({
  uniformBuffer,
  device,
  pipeline,
  dimensions,
  projection,
}: {
  dimensions: GridDimensions;
  uniformBuffer: GPUBuffer;
  projection: Float32Array;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
}) {
  const bindGroup = device.createBindGroup({
    label: 'grid',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  device.queue.writeBuffer(uniformBuffer, 0, projection);

  const vertices = createGridVertices({ dimensions });
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  return { vertices, vertexBuffer, bindGroup, pipeline };
}

function createMouse({
  device,
  pipeline,
  uniformBuffer,
  projection,
}: {
  uniformBuffer: GPUBuffer;
  projection: Float32Array;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
}) {
  const bindGroup = device.createBindGroup({
    label: 'mouse',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer,
        },
      },
    ],
  });

  device.queue.writeBuffer(uniformBuffer, 0, projection);

  return { bindGroup, pipeline };
}

function createCam({
  uniformBuffer,
  projection,
  device,
  cam,
  pipeline,
}: {
  projection: Float32Array;
  uniformBuffer: GPUBuffer;
  device: GPUDevice;
  cam: Camera;
  pipeline: GPURenderPipeline;
}) {
  const viewMatrix = cam.viewMatrix;

  const vpMatrix = multiplyMat4(createMat4(), projection, viewMatrix);

  device.queue.writeBuffer(uniformBuffer, 0, vpMatrix.buffer);

  const cameraPositionBuffer = device.createBuffer({
    size: 12, // 3 floats x 4 bytes
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    cameraPositionBuffer,
    0,
    new Float32Array(cam.position)
  );

  const bindGroup = device.createBindGroup({
    label: 'camera',
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: cameraPositionBuffer } },
    ],
  });

  return { bindGroup, cameraPositionBuffer };
}
