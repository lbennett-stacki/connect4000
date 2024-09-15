import { createCircleVertices, createGridVertices } from './factory';

export interface RenderableCoin {
  x: number;
  y: number;
  color: [number, number, number];
}

export type GridDimensions = {
  columns: number;
  rows: number;
  cellSize: number;
};

function createCoin({
  device,
  pipeline,
  projectionMatrix,
}: {
  projectionMatrix: Float32Array;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
}) {
  const uniformBuffer = device.createBuffer({
    size: projectionMatrix.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

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

  device.queue.writeBuffer(uniformBuffer, 0, projectionMatrix);

  return { bindGroup, pipeline };
}

function createGrid({
  device,
  pipeline,
  projectionMatrix,
  aspectRatio,
  dimensions,
}: {
  dimensions: GridDimensions;
  aspectRatio: number;
  projectionMatrix: Float32Array;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
}) {
  const uniformBuffer = device.createBuffer({
    size: projectionMatrix.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

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

  device.queue.writeBuffer(uniformBuffer, 0, projectionMatrix);

  const vertices = createGridVertices({ aspectRatio, dimensions });
  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  return { vertices, vertexBuffer, bindGroup, pipeline };
}

export function initRender({
  device,
  pipelines,
  aspectRatio,
  dimensions,
}: {
  dimensions: GridDimensions;
  aspectRatio: number;
  device: GPUDevice;
  pipelines: { grid: GPURenderPipeline; coin: GPURenderPipeline };
}) {
  const projectionMatrix = createProjectionMatrix(aspectRatio);

  const grid = createGrid({
    projectionMatrix,
    aspectRatio,
    device,
    pipeline: pipelines.grid,
    dimensions,
  });

  const coin = createCoin({
    projectionMatrix,
    device,
    pipeline: pipelines.coin,
  });

  return { projectionMatrix, grid, coin };
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
  cellSize,
  device,
}: {
  coins: RenderableCoin[];
  cellSize: number;
  device: GPUDevice;
  renderPass: GPURenderPassEncoder;
}) {
  coins.forEach((coin) => {
    const circleVertices = createCircleVertices(
      coin.x,
      coin.y,
      cellSize / 2.5,
      coin.color
    );
    const circleVertexBuffer = device.createBuffer({
      size: circleVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(circleVertexBuffer, 0, circleVertices);

    renderPass.setVertexBuffer(0, circleVertexBuffer);
    renderPass.draw(circleVertices.length / 5, 1, 0, 0);
  });
}

export function render({
  device,
  context,
  grid,
  coin,
  coins,
  cellSize,
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
  cellSize: number;
}) {
  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
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
    cellSize,
    device,
  });

  renderPass.end();
  device.queue.submit([commandEncoder.finish()]);
}

function createProjectionMatrix(aspectRatio: number): Float32Array {
  const matrix = new Float32Array([
    1 / aspectRatio,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  ]);
  return matrix;
}

function updateProjectionMatrix(
  canvas: HTMLCanvasElement,
  device: GPUDevice,
  uniformBuffer: GPUBuffer
) {
  const aspectRatio = canvas.width / canvas.height;
  const projectionMatrix = createProjectionMatrix(aspectRatio);
  device.queue.writeBuffer(uniformBuffer, 0, projectionMatrix);
}
