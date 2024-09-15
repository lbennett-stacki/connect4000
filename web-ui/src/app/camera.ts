import { GridDimensions } from '../render/render';
import { Coords } from './run';

export interface Camera extends Coords {
  scale: number;
}

export const resetCamera = (dimensions: GridDimensions): Camera => {
  return {
    x: (dimensions.columns / 2) * -1,
    y: (dimensions.rows / 2) * -1,
    scale: 0.1,
  };
};
