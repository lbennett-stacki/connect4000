export function getDiscPosition(
  column: number,
  columnCount: number,
  row: number,
  rowCount: number,
  aspectRatio: number
): [number, number] {
  const x = ((column + 0.5) / columnCount) * 2 - 1;
  const y = ((row + 0.5) / rowCount) * 2 - 1;
  return [x * aspectRatio, y];
}
