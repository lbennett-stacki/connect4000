import { Coin } from '../net/stream';
import { RenderableCoin } from '../render/types';
import { getDiscPosition } from './interaction';

export const makeRenderableCoins = (coins: Coin[][]): RenderableCoin[] => {
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
