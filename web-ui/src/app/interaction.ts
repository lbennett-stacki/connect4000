import { Coords } from './run';

export function getDiscPosition({
  column,
  row,
}: {
  column: number;
  row: number;
}): Coords {
  const x = column + 0.5;

  const y = row + 0.5;

  return { x, y };
}
