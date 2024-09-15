import { Camera } from '../app/camera';
import { create as createMat4, multiply as multiplyMat4 } from 'gl-mat4';
import { Coords } from '../app/run';
import {
  createCircleVertices,
  createGridVertices,
  createPentagonVertices,
  createSquareVertices,
} from './factory';

export interface RenderableCoin extends Coords {
  color: [number, number, number];
}

export type GridDimensions = {
  columns: number;
  rows: number;
};

function createCoin({
  device,
  pipeline,
  uniformBuffer,
  transformationMatrix,
}: {
  uniformBuffer: GPUBuffer;
  transformationMatrix: Float32Array;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
}) {
  const bindGroup = device.createBindGroup({
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

  device.queue.writeBuffer(uniformBuffer, 0, transformationMatrix);

  return { bindGroup, pipeline, uniformBuffer };
}

function createGrid({
  uniformBuffer,
  device,
  pipeline,
  dimensions,
  transformationMatrix,
}: {
  dimensions: GridDimensions;
  uniformBuffer: GPUBuffer;
  transformationMatrix: Float32Array;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
}) {
  const bindGroup = device.createBindGroup({
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

  device.queue.writeBuffer(uniformBuffer, 0, transformationMatrix);

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
  transformationMatrix,
}: {
  uniformBuffer: GPUBuffer;
  transformationMatrix: Float32Array;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
}) {
  const bindGroup = device.createBindGroup({
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

  device.queue.writeBuffer(uniformBuffer, 0, transformationMatrix);

  return { bindGroup, pipeline };
}

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
  const { projectionMatrix, transformationMatrix } = createTransformationMatrix(
    aspectRatio,
    camera
  );

  const uniformBuffer =
    uniformBufferIn ??
    device.createBuffer({
      size: projectionMatrix.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

  const grid = createGrid({
    uniformBuffer,
    transformationMatrix,
    device,
    pipeline: pipelines.grid,
    dimensions,
  });

  const coin = createCoin({
    uniformBuffer,
    transformationMatrix,
    device,
    pipeline: pipelines.coin,
  });

  const mouse = createMouse({
    uniformBuffer,
    transformationMatrix,
    device,
    pipeline: pipelines.coin,
  });

  return { uniformBuffer, projectionMatrix, grid, coin, mouse };
}

function renderGrid({
  renderPass,
  vertices,
  vertexBuffer,
}: {
  renderPass: GPURenderPassEncoder;
  vertices: Float32Array;
  vertexBuffer: GPUBuffer;
}) {
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.draw(vertices.length / 5, 1, 0, 0);
}

function renderCoins({
  coins,
  renderPass,
  device,
  width,
}: {
  coins: RenderableCoin[];
  device: GPUDevice;
  renderPass: GPURenderPassEncoder;
  width: number;
}) {
  coins.forEach((coin) => {
    const pentagons = createSquareVertices({
      centerX: coin.x,
      centerY: coin.y,
      radius: width,
      color: coin.color,
    });
    const circleVertexBuffer = device.createBuffer({
      size: pentagons.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(circleVertexBuffer, 0, pentagons);

    renderPass.setVertexBuffer(0, circleVertexBuffer);
    renderPass.draw(pentagons.length / 5, 1, 0, 0);
  });
}

function renderMouse({
  mousePosition,
  renderPass,
  device,
  aspectRatio,
}: {
  mousePosition: Coords | null;
  device: GPUDevice;
  renderPass: GPURenderPassEncoder;
  aspectRatio: number;
}) {
  if (!mousePosition) {
    return;
  }

  const circle = createCircleVertices({
    centerX: mousePosition.x,
    centerY: mousePosition.y,
    radius: (1 / 20) * aspectRatio,
    color: [0, 1, 0],
  });

  const circleVertexBuffer = device.createBuffer({
    size: circle.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(circleVertexBuffer, 0, circle);

  renderPass.setVertexBuffer(0, circleVertexBuffer);
  renderPass.draw(circle.length / 5, 1, 0, 0);
}

export function render({
  device,
  context,
  grid,
  coin,
  coins,
  aspectRatio,
  mouse,
  mousePosition,
  winnerId,
}: {
  device: GPUDevice;
  context: GPUCanvasContext;
  grid: {
    pipeline: GPURenderPipeline;
    bindGroup: GPUBindGroup;
    vertexBuffer: GPUBuffer;
    vertices: Float32Array;
  };
  coin: {
    pipeline: GPURenderPipeline;
    bindGroup: GPUBindGroup;
  };
  coins: RenderableCoin[];
  mouse: {
    pipeline: GPURenderPipeline;
    bindGroup: GPUBindGroup;
  };
  mousePosition: Coords | null;
  aspectRatio: number;
  winnerId: bigint;
}) {
  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 1, g: 1, b: 1, a: 1 }, // White background
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });

  renderPass.setPipeline(grid.pipeline);
  renderPass.setBindGroup(0, grid.bindGroup);

  renderGrid({
    renderPass,
    vertexBuffer: grid.vertexBuffer,
    vertices: grid.vertices,
  });

  renderPass.setPipeline(coin.pipeline);
  renderPass.setBindGroup(0, coin.bindGroup);

  renderCoins({
    coins,
    renderPass,
    device,
    width: 0.5 * aspectRatio,
  });

  renderPass.setPipeline(mouse.pipeline);
  renderPass.setBindGroup(0, mouse.bindGroup);

  renderMouse({
    mousePosition,
    renderPass,
    device,
    aspectRatio,
  });

  renderPass.end();
  device.queue.submit([commandEncoder.finish()]);
}

function createProjectionMatrix(
  aspectRatio: number,
  scale: number
): Float32Array {
  const out = createMat4();
  out[0] = scale / aspectRatio;
  out[5] = scale;
  out[10] = 1;
  out[15] = 1;
  return out;
}

function createTranslationMatrix(
  transformX: number,
  transformY: number
): Float32Array {
  const out = createMat4();
  out[12] = transformX;
  out[13] = transformY;
  return out;
}

function createTransformationMatrix(aspectRatio: number, camera: Camera) {
  const projectionMatrix = createProjectionMatrix(aspectRatio, camera.scale);
  const translationMatrix = createTranslationMatrix(camera.x, camera.y);

  const transformationMatrix = multiplyMat4(
    createMat4(),
    translationMatrix,
    projectionMatrix
  );

  return { transformationMatrix, translationMatrix, projectionMatrix };
}
