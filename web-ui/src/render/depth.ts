export const createDepthTexture = (
  device: GPUDevice,
  canvas: HTMLCanvasElement
) => {
  const depthTexture = device.createTexture({
    label: 'depth-texture',
    size: [canvas.width, canvas.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  return depthTexture;
};
