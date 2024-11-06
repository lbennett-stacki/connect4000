import { Coords } from '../app/run';

export interface RenderableCoin extends Coords {
  color: [number, number, number];
}

export type GridDimensions = {
  columns: number;
  rows: number;
};
