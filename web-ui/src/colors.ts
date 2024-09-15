const coinColors: Record<number, string> = {
  1: 'red',
  2: 'yellow',
  3: 'orange',
  4: 'purple',
};

const coinColorsFlipped: Record<string, number> = Object.fromEntries(
  Object.entries(coinColors).map(([key, value]) => [value, parseInt(key)])
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
}
