import { Color } from '../colors.js';
import {
  Coin,
  PayloadType,
  PlayCoinCommand,
  PublishCommand,
  ViewSubscription,
} from '../net/stream.js';
import { initWebGPU, resizeCanvasToDisplaySize } from '../render/gpu.js';
import {
  RenderableCoin,
  render,
  initRender,
  GridDimensions,
} from '../render/render.js';
import { getDiscPosition } from './interaction.js';

const MIN_ROWS = 8;

const makeRenderableCoins = (coins: Coin[][]): RenderableCoin[] => {
  const renderableCoins: RenderableCoin[] = [];

  coins.forEach((column, columnIndex) => {
    column.forEach((coin, rowIndex) => {
      const { x, y } = getDiscPosition({
        column: columnIndex,
        row: rowIndex,
      });

      renderableCoins.push({ x, y, color: coin.color.toRgb() });
    });
  });

  return renderableCoins;
};

const runApp = async ({
  canvas,
  dropCoin,
  viewSubscription,
}: {
  canvas: HTMLCanvasElement;
  dropCoin: (column: bigint) => void;
  viewSubscription: ViewSubscription;
}) => {
  const { device, context, pipelines } = await initWebGPU(canvas);

  let coins: RenderableCoin[] = [];
  let aspectRatio = canvas.width / canvas.height;
  const resetAspectRatio = () => {
    console.log('resetting aspect ratio');
    aspectRatio = canvas.width / canvas.height;
    console.log({ aspectRatio });
  };
  const dimensions: GridDimensions = {
    columns: 0,
    rows: 0,
  };

  const camera = {
    x: (dimensions.columns / 2) * -1,
    y: (dimensions.rows / 2) * -1,
    scale: 0.1,
  };

  const resetCamera = (dimensions: GridDimensions) => {
    camera.x = (dimensions.columns / 2) * -1;
    camera.y = (dimensions.rows / 2) * -1;
    camera.scale = 0.1;
  };

  const currentPlayer = { id: 1n, color: new Color('red') };
  let winnerId: number = 0;

  const renderGrid = (dimensions: GridDimensions): Uint8Array[] => {
    const row = new Uint8Array(dimensions.rows).fill(0);
    const columns = new Array(dimensions.columns).fill(row);

    return columns;
  };

  const subscription = viewSubscription({
    onView: (view) => {
      switch (view.type) {
        case PayloadType.SNAPSHOT:
          coins = makeRenderableCoins(view.coins);

          if (view.columns > Number.MAX_SAFE_INTEGER) {
            throw new Error(
              `Web client currently only supports ${Number.MAX_SAFE_INTEGER} columns`
            );
          }

          if (view.rows > Number.MAX_SAFE_INTEGER) {
            throw new Error(
              `Web client currently only supports ${Number.MAX_SAFE_INTEGER} rows`
            );
          }

          dimensions.columns = Number(view.columns);
          dimensions.rows = Math.max(Number(view.rows), MIN_ROWS);
          winnerId = Number(view.winnerId);
          resetCamera(dimensions);
          break;
        case PayloadType.JOINED:
          currentPlayer.id = view.playerId;
          currentPlayer.color = Color.deserialize(view.color);
          break;
        default:
          throw new Error('Unsupported view type');
      }
    },
  });
  subscription.run();

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
    camera.scale = Math.max(0.01, camera.scale);

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

    const grid = renderGrid(dimensions);

    const columnArray = grid[column];

    for (let row = dimensions.rows - 1; row >= 0; row--) {
      const coin = columnArray[row];

      if (coin === 0) {
        grid[column][row] = currentPlayer.color.serialize();

        const { x, y } = getDiscPosition({
          column,
          row,
        });

        const coin = { x, y, color: currentPlayer.color.toRgb() };
        coins.push(coin);
        dropCoin(BigInt(column));

        break;
      }
    }
  };

  canvas.addEventListener('mouseup', onMouseUp);

  let uniformBuffer: GPUBuffer | null = null;

  const onResize = (_event: Event) => {
    resizeCanvasToDisplaySize(canvas);
    resetAspectRatio();
  };

  window.addEventListener('resize', onResize);

  const fps = 1 / 120;

  let gameLoopTimeout: number | null = null;
  let hasStopped = false;

  function gameLoop() {
    const {
      grid,
      coin,
      mouse,
      uniformBuffer: renderBuffer,
    } = initRender({
      dimensions,
      pipelines,
      device,
      aspectRatio,
      camera,
      uniformBuffer,
    });

    uniformBuffer = renderBuffer;

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

    if (gameLoopTimeout) {
      clearTimeout(gameLoopTimeout);
      gameLoopTimeout = null;
    }

    if (hasStopped) {
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

    subscription.abortController.abort();

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

  const init = async () => {
    const result = runApp({
      viewSubscription,
      canvas,
      dropCoin: async (column: bigint) => {
        await publishCommand(new PlayCoinCommand(column));
      },
    });

    return result;
  };

  return { canvas, init };
};
