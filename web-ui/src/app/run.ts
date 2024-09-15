import { Color } from '../colors';
import { PayloadType, ViewSubscription } from '../net/stream';
import { initWebGPU, resizeCanvasToDisplaySize } from '../render/gpu';
import {
  GridDimensions,
  initRender,
  render,
  RenderableCoin,
} from '../render/render';
import { resetCamera } from './camera';
import { makeRenderableCoins } from './coins';
import { MIN_ROWS } from './const';
import { renderGrid } from './grid';
import { getDiscPosition } from './interaction';
import {
  adjustScale,
  getMousePosition,
  getProjectedMousePosition,
  translateCamera,
} from './mouse';

export interface Coords {
  x: number;
  y: number;
}

export const runApp = async ({
  canvas,
  dropCoin,
  viewSubscription,
}: {
  canvas: HTMLCanvasElement;
  dropCoin: (column: bigint) => void;
  viewSubscription: ViewSubscription;
}) => {
  const { device, context, pipelines } = await initWebGPU(canvas);

  let winnerId = 0n;
  let coins: RenderableCoin[] = [];

  let aspectRatio = canvas.width / canvas.height;
  const resetAspectRatio = () => {
    aspectRatio = canvas.width / canvas.height;
  };
  const dimensions: GridDimensions = {
    columns: 0,
    rows: 0,
  };

  let camera = resetCamera(dimensions);

  const currentPlayer = { id: 1n, color: new Color('red') };

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
          console.log('SET WINNER', view, winnerId);
          winnerId = view.winnerId;
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

  let mouseDownPosition: Coords | null = null;
  let startingMouseDownPosition: Coords | null = null;
  let mousePosition: Coords | null = null;

  const onMouseDown = (event: MouseEvent) => {
    mouseDownPosition = getMousePosition(event);
    startingMouseDownPosition = { ...mouseDownPosition };
  };

  canvas.addEventListener('mousedown', onMouseDown);

  const onWheel = (event: WheelEvent) => {
    camera = adjustScale(event, canvas, camera, aspectRatio);
    mousePosition = getProjectedMousePosition(
      event,
      canvas,
      camera,
      aspectRatio
    );
  };

  canvas.addEventListener('wheel', onWheel);

  const onMouseMove = (event: MouseEvent) => {
    mousePosition = getProjectedMousePosition(
      event,
      canvas,
      camera,
      aspectRatio
    );

    if (!mouseDownPosition) {
      return;
    }

    camera = translateCamera(event, camera, mouseDownPosition);

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
      winnerId,
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
