import { vertex, fragment } from './shader/index.js';

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width * dpr;
    canvas.style.width = `${width}px`;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
  }
}

export async function initWebGPU(canvas: HTMLCanvasElement) {
  if (!('gpu' in navigator) || !navigator.gpu) {
    throw new Error('WebGPU not supported on this browser.');
  }

  const gpu = navigator.gpu;

  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    throw new Error('Failed to get GPU adapter.');
  }

  resizeCanvasToDisplaySize(canvas);

  const device = await adapter.requestDevice();

  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('WebGPU not supported on this browser.');
  }

  const format = gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format,
  });

  const pipelines = await createRenderPipelines({
    device,
    format: 'bgra8unorm',
  });

  return { device, context, format, canvas, pipelines };
}

async function createGridRenderPipeline({
  device,
  format,
  vertexModule,
  fragmentModule,
  buffers,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  vertexModule: GPUShaderModule;
  fragmentModule: GPUShaderModule;
  buffers: GPUVertexBufferLayout[];
}) {
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: vertexModule,
      entryPoint: 'main',
      buffers,
    },
    fragment: {
      module: fragmentModule,
      entryPoint: 'main',
      targets: [
        {
          format,
        },
      ],
    },
    primitive: {
      topology: 'line-list',
    },
  });

  return pipeline;
}

async function createCoinRenderPipeline({
  device,
  format,
  vertexModule,
  fragmentModule,
  buffers,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  vertexModule: GPUShaderModule;
  fragmentModule: GPUShaderModule;
  buffers: GPUVertexState['buffers'];
}) {
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: vertexModule,
      entryPoint: 'main',
      buffers,
    },
    fragment: {
      module: fragmentModule,
      entryPoint: 'main',
      targets: [
        {
          format,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  return pipeline;
}

export async function createRenderPipelines({
  device,
  format,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
}) {
  const vertexModule = device.createShaderModule({
    code: vertex,
  });

  const fragmentModule = device.createShaderModule({
    code: fragment,
  });
  const buffers = [
    {
      arrayStride: 5 * 4, // position (2 floats) + color (3 floats)
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float32x2' as const,
        },
        {
          shaderLocation: 1,
          offset: 2 * 4,
          format: 'float32x3' as const,
        },
      ],
    },
  ];

  const grid = await createGridRenderPipeline({
    device,
    format,
    vertexModule,
    fragmentModule,
    buffers,
  });

  const coin = await createCoinRenderPipeline({
    device,
    format,
    vertexModule,
    fragmentModule,
    buffers,
  });

  return { grid, coin };
}
