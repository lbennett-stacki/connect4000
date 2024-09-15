import { Color } from '../colors';
import { uint8ArrayToU64 } from '../numbers';
import { Coin } from './transport';

export const deserializeSnapshot = (snapshot: Uint8Array) => {
  const coins: Array<Coin[]> = [];
  const winnerId = uint8ArrayToU64(snapshot.slice(1, 9));
  const columns = uint8ArrayToU64(snapshot.slice(9, 17));
  const rows = uint8ArrayToU64(snapshot.slice(17, 25));

  const headerOffset = BigInt(25);

  for (let columnIndex = BigInt(0); columnIndex < columns; columnIndex++) {
    const newColumn = [];
    for (let rowIndex = BigInt(0); rowIndex < rows; rowIndex++) {
      let index = columnIndex * rows + rowIndex;
      index += headerOffset;
      const coin = snapshot[index as unknown as number];
      if (coin === 0) {
        continue;
      }

      // TODO: is group important on clientside?
      newColumn.push({ color: Color.deserialize(coin), group: BigInt(0) });
    }
    coins.push(newColumn);
  }

  return { coins, winnerId, columns, rows };
};
