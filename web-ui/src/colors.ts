const colors: Record<number, string> = {
  1: 'red',
  2: 'yellow',
  3: 'orange',
  4: 'purple',
};

const colorsFlipped: Record<string, number> = Object.fromEntries(
  Object.entries(colors).map(([key, value]) => [value, parseInt(key)])
);

export class Color {
  constructor(private readonly color: string) { }

  serialize(): number {
    return colorsFlipped[this.color];
  }

  static deserialize(input: number): Color {
    const color = colors[input];

    if (!color) {
      throw new Error('invalid color');
    }

    return new Color(color);
  }

  toString() {
    return this.color;
  }
}
