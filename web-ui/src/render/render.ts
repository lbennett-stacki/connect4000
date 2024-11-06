// import { Coords } from '../app/run';
import { createCircleVertices } from './factory';
import { createDepthTexture } from './depth';
import { RenderableCoin } from './types';

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
      label: 'circle-vertex-buffer',
      size: circleVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(circleVertexBuffer, 0, circleVertices);

    renderPass.setVertexBuffer(0, circleVertexBuffer);
    renderPass.draw(circleVertices.length / 9, 1, 0, 0);
  });
}

// function renderMouse({
//   mousePosition,
//   renderPass,
//   device,
//   aspectRatio,
// }: {
//   mousePosition: Coords | null;
//   device: GPUDevice;
//   renderPass: GPURenderPassEncoder;
//   aspectRatio: number;
// }) {
//   if (!mousePosition) {
//     return;
//   }
//
//   const circleVertices = createCircleVertices({
//     centerX: mousePosition.x,
//     centerY: mousePosition.y,
//     radius: (1 / 20) * aspectRatio,
//     color: [0, 1, 0],
//   });
//
//   const circleVertexBuffer = device.createBuffer({
//     size: circleVertices.byteLength,
//     usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
//   });
//
//   device.queue.writeBuffer(circleVertexBuffer, 0, circleVertices);
//
//   renderPass.setVertexBuffer(0, circleVertexBuffer);
//   renderPass.draw(circleVertices.length / 5, 1, 0, 0);
// }
//
export function render({
  device,
  canvas,
  context,
  grid,
  coin,
  coins,
  aspectRatio,
  // mouse,
  // mousePosition,
}: {
  device: GPUDevice;
  context: GPUCanvasContext;
  canvas: HTMLCanvasElement;
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
  // mouse: {
  //   pipeline: GPURenderPipeline;
  //   bindGroup: GPUBindGroup;
  // };
  // mousePosition: Coords | null;
  aspectRatio: number;
}) {
  const commandEncoder = device.createCommandEncoder({
    label: 'command-encoder',
  });
  const textureView = context.getCurrentTexture().createView({
    label: 'texture-view',
  });

  const depthTexture = createDepthTexture(device, canvas);
  const renderPass = commandEncoder.beginRenderPass({
    label: 'render-pass',
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 1, g: 1, b: 1, a: 1 }, // White background
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView({
        label: 'depth-texture-view',
      }),
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
      depthClearValue: 1.0,
    },
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

  // renderPass.setPipeline(mouse.pipeline);
  // renderPass.setBindGroup(0, mouse.bindGroup);

  // renderMouse({
  //   mousePosition,
  //   renderPass,
  //   device,
  //   aspectRatio,
  // });

  renderPass.end();
  device.queue.submit([commandEncoder.finish()]);
}
