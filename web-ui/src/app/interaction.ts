export function getDiscPosition({
  column,
  row,
}: {
  column: number;
  row: number;
}): { x: number; y: number } {
  const x = column + 0.5;

  const y = row + 0.5;

  return { x, y };
}
