const coinColors: Record<number, string> = {
  1: 'orange',
  2: 'blue',
  3: 'red',
  4: 'yellow',
  5: 'orange',
  6: 'purple',
};

const colorRgb: Record<string, [number, number, number]> = {
  orange: [1.0, 0.5, 0.0],
  blue: [0.0, 0.0, 1.0],
  red: [1.0, 0.0, 0.0],
  yellow: [1.0, 0.0, 0.0],
  purple: [0.5, 0.0, 1.0],
};

const coinColorsFlipped: Record<string, number> = Object.fromEntries(
  Object.entries(coinColors).map(([key, value]) => [value, parseInt(key, 10)])
);

export class Color {
  constructor(private readonly color: string) {}

  serialize(): number {
    return coinColorsFlipped[this.color];
  }

  static deserialize(input: number): Color {
    const color = coinColors[input];

    if (!color) {
      throw new Error('invalid color');
    }

    return new Color(color);
  }

  toString() {
    return this.color;
  }

  toRgb(): [number, number, number] {
    return colorRgb[this.color];
  }
}
