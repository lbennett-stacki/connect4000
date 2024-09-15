import { GridDimensions } from '../render/render';

export const renderGrid = (dimensions: GridDimensions): Uint8Array[] => {
  const row = new Uint8Array(dimensions.rows).fill(0);
  const columns = new Array(dimensions.columns).fill(row);

  return columns;
};
