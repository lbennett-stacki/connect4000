import { Camera } from '../app/camera';
import { Coords } from '../app/run';
import { createCircleVertices, createGridVertices } from './factory';

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
  aspectRatio,
}: {
  coins: RenderableCoin[];
  device: GPUDevice;
  renderPass: GPURenderPassEncoder;
  aspectRatio: number;
}) {
  coins.forEach((coin) => {
    const circleVertices = createCircleVertices({
      centerX: coin.x,
      centerY: coin.y,
      radius: (1 / 25) * aspectRatio,
      color: coin.color,
    });
    const circleVertexBuffer = device.createBuffer({
      size: circleVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(circleVertexBuffer, 0, circleVertices);

    renderPass.setVertexBuffer(0, circleVertexBuffer);
    renderPass.draw(circleVertices.length / 5, 1, 0, 0);
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

  const circleVertices = createCircleVertices({
    centerX: mousePosition.x,
    centerY: mousePosition.y,
    radius: (1 / 20) * aspectRatio,
    color: [0, 1, 0],
  });

  const circleVertexBuffer = device.createBuffer({
    size: circleVertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(circleVertexBuffer, 0, circleVertices);

  renderPass.setVertexBuffer(0, circleVertexBuffer);
  renderPass.draw(circleVertices.length / 5, 1, 0, 0);
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
    aspectRatio,
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

function createMat4(): Float32Array {
  // prettier-ignore
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]);
}

function multiplyMat4(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array
): Float32Array {
  const a00 = a[0],
    a01 = a[1],
    a02 = a[2],
    a03 = a[3];
  const a10 = a[4],
    a11 = a[5],
    a12 = a[6],
    a13 = a[7];
  const a20 = a[8],
    a21 = a[9],
    a22 = a[10],
    a23 = a[11];
  const a30 = a[12],
    a31 = a[13],
    a32 = a[14],
    a33 = a[15];

  const b00 = b[0],
    b01 = b[1],
    b02 = b[2],
    b03 = b[3];
  const b10 = b[4],
    b11 = b[5],
    b12 = b[6],
    b13 = b[7];
  const b20 = b[8],
    b21 = b[9],
    b22 = b[10],
    b23 = b[11];
  const b30 = b[12],
    b31 = b[13],
    b32 = b[14],
    b33 = b[15];

  out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
  out[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
  out[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
  out[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;

  out[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
  out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
  out[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
  out[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;

  out[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
  out[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
  out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
  out[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;

  out[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
  out[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
  out[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
  out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

  return out;
}
