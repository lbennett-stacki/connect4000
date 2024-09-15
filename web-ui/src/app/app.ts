import { initWebGPU } from '../render/gpu.js';
import {
  RenderableCoin,
  render,
  initRender,
  GridDimensions,
} from '../render/render.js';
import { getDiscPosition } from './interaction.js';

const runApp = async ({
  canvas,
  dimensions,
}: {
  canvas: HTMLCanvasElement;
  dimensions: GridDimensions;
}) => {
  const { device, context, pipelines } = await initWebGPU(canvas);

  const aspectRatio = canvas.width / canvas.height;

  const { grid, coin } = initRender({
    dimensions,
    pipelines,
    device,
    aspectRatio,
  });

  let currentPlayer = 1; // 1 for red, 2 for yellow
  const renderGrid: number[][] = Array.from({ length: dimensions.rows }, () =>
    Array(dimensions.columns).fill(0)
  );
  const coins: RenderableCoin[] = [];

  render({
    device,
    context,
    grid,
    coin,
    coins,
    cellSize: dimensions.cellSize,
  });

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1; // Normalized coordinates

    const column = Math.floor((x + 1) / dimensions.cellSize);

    if (column < 0 || column >= dimensions.columns) return;

    for (let row = dimensions.rows - 1; row >= 0; row--) {
      if (renderGrid[row][column] === 0) {
        renderGrid[row][column] = currentPlayer;

        const [x, y] = getDiscPosition(
          column,
          dimensions.columns,
          row,
          dimensions.rows,
          aspectRatio
        );

        const color: [number, number, number] =
          currentPlayer === 1 ? [1.0, 0.0, 0.0] : [1.0, 1.0, 0.0]; // Red or Yellow

        coins.push({ x, y, color });

        currentPlayer = currentPlayer === 1 ? 2 : 1; // Switch player
        break;
      }
    }

    render({
      device,
      context,
      grid,
      coin,
      coins,
      cellSize: dimensions.cellSize,
    });
  });
};

export const App = async ({ document }: { document: Document }) => {
  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';

  const dimensions = { rows: 6, columns: 6, cellSize: 2 / 6 };

  const init = async () => {
    runApp({
      canvas,
      dimensions,
    });
  };

  return { canvas, init, onRead };
};
