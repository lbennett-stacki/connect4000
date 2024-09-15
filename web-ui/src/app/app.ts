import {
  Coin,
  PlayCoinCommand,
  PublishCommand,
  ViewSubscription,
} from '../net/stream.js';
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
  dropCoin,
  viewSubscription,
}: {
  canvas: HTMLCanvasElement;
  dimensions: GridDimensions;
  dropCoin: (column: bigint) => void;
  viewSubscription: ViewSubscription,
}) => {
  const { device, context, pipelines } = await initWebGPU(canvas);

  const aspectRatio = canvas.width / canvas.height;

  const camera = {
    x: (dimensions.columns / 2) * -1,
    y: (dimensions.rows / 2) * -1,
    scale: 0.019,
  };

  let currentPlayer = 1; // 1 for red, 2 for yellow
  const renderGrid: number[][] = Array.from({ length: dimensions.rows }, () =>
    Array(dimensions.columns).fill(0)
  );
  let coins: RenderableCoin[] = [];

  const makeRenderableCoins = (coins: Coin[][]): RenderableCoin[] => {
    const renderableCoins: RenderableCoin[] = [];

    coins.forEach((column, columnIndex) => {
      column.forEach((coin, rowIndex) => {
        const { x, y } = getDiscPosition({
          column: columnIndex,
          row: rowIndex,
        });

        const color: [number, number, number] =
          coin.color.toString() === 'red' ? [1.0, 0.0, 0.0] : [1.0, 1.0, 0.0]; // Red or Yellow
        renderableCoins.push({ x, y, color });
      });
    });

    return renderableCoins;
  }

  const subscription = viewSubscription((view) => {
    console.info({
      view
    });
    coins = makeRenderableCoins(view.coins)
  });

  let mouseDownPosition: { x: number; y: number } | null = null;
  let startingMouseDownPosition: { x: number; y: number } | null = null;
  let mousePosition: { x: number; y: number } | null = null;

  const scaleSpeed = 0.001;
  const translateSpeed = 0.01;

  const onMouseDown = (event: MouseEvent) => {
    mouseDownPosition = {
      x: event.clientX,
      y: event.clientY,
    };
    startingMouseDownPosition = { ...mouseDownPosition };
  };

  canvas.addEventListener('mousedown', onMouseDown);

  const onWheel = (event: WheelEvent) => {
    const rect = canvas.getBoundingClientRect();
    const normalizedX =
      (((event.clientX - rect.left) / rect.width) * 2 - 1) * aspectRatio;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    const projectedX = normalizedX / camera.scale - camera.x;
    const projectedY = (normalizedY * -1) / camera.scale - camera.y;

    camera.scale -= event.deltaY * scaleSpeed;
    camera.scale = Math.max(0.001, camera.scale);

    const newProjectedX = normalizedX / camera.scale - camera.x;
    const newProjectedY = (normalizedY * -1) / camera.scale - camera.y;

    camera.x += (projectedX - newProjectedX) * -1;
    camera.y += (projectedY - newProjectedY) * -1;
  };

  canvas.addEventListener('wheel', onWheel);

  const onMouseMove = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();

    const normalizedX =
      (((event.clientX - rect.left) / rect.width) * 2 - 1) * aspectRatio;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    const projectedX = normalizedX / camera.scale - camera.x;
    const projectedY = (normalizedY * -1) / camera.scale - camera.y;

    mousePosition = {
      x: projectedX,
      y: projectedY,
    };

    if (!mouseDownPosition) {
      return;
    }

    let x = (mouseDownPosition.x - event.clientX) * translateSpeed;
    let y = (mouseDownPosition.y - event.clientY) * translateSpeed;

    camera.x += x * -1;
    camera.y += y;
    mouseDownPosition.x = event.clientX;
    mouseDownPosition.y = event.clientY;
  };

  canvas.addEventListener('mousemove', onMouseMove);

  const onMouseUp = (event: MouseEvent) => {
    const moveMargin = 0.1;
    const delta = event.clientX - (startingMouseDownPosition?.x || 0);
    const hasMoved =
      startingMouseDownPosition &&
      (delta < moveMargin * -1 || delta > moveMargin);

    mouseDownPosition = null;
    startingMouseDownPosition = null;

    if (hasMoved) {
      return;
    }

    const rect = canvas.getBoundingClientRect();

    const normalizedX =
      (((event.clientX - rect.left) / rect.width) * 2 - 1) * aspectRatio;

    const projectedX = normalizedX / camera.scale - camera.x;

    const column = Math.floor(projectedX);

    if (column < 0 || column >= dimensions.columns) return;

    for (let row = dimensions.rows - 1; row >= 0; row--) {
      if (renderGrid[row][column] === 0) {
        renderGrid[row][column] = currentPlayer;

        const { x, y } = getDiscPosition({
          column,
          row,
        });

        const color: [number, number, number] =
          currentPlayer === 1 ? [1.0, 0.0, 0.0] : [1.0, 1.0, 0.0]; // Red or Yellow

        const coin = { x, y, color };
        coins.push(coin);
        dropCoin(BigInt(column));

        currentPlayer = currentPlayer === 1 ? 2 : 1; // Switch player
        break;
      }
    }
  };

  canvas.addEventListener('mouseup', onMouseUp);

  const onResize = (_event: Event) => { };

  window.addEventListener('resize', onResize);

  const fps = 1 / 120;

  let gameLoopTimeout: number | null = null;
  let hasStopped = false;

  function gameLoop() {
    const { grid, coin, mouse } = initRender({
      dimensions,
      pipelines,
      device,
      aspectRatio,
      camera,
    });

    render({
      aspectRatio,
      device,
      context,
      grid,
      coin,
      coins,
      mouse,
      mousePosition,
    });

    if (hasStopped) {
      if (gameLoopTimeout) {
        clearTimeout(gameLoopTimeout);
        gameLoopTimeout = null;
      }
      return;
    }

    gameLoopTimeout = setTimeout(() => gameLoop(), fps * 1000);
  }

  gameLoop();

  const tearDown = () => {
    hasStopped = true;
    if (gameLoopTimeout) {
      clearTimeout(gameLoopTimeout);
      gameLoopTimeout = null;
    }

    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('resize', onResize);
  };

  return { tearDown };
};

export const App = async ({
  document,
  publishCommand,
  viewSubscription,
}: {
  document: Document;
  publishCommand: PublishCommand;
  viewSubscription: ViewSubscription;
}) => {
  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';

  const dimensions = { rows: 4, columns: 8 };

  const init = async () => {
    const result = runApp({
      viewSubscription,
      canvas,
      dimensions,
      dropCoin: async (column: bigint) => {
        await publishCommand(new PlayCoinCommand(column));
      },
    });

    return result;
  };

  return { canvas, init };
};
