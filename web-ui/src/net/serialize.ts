import { Color } from '../colors';
import { Coin, PayloadType, SnapshotView } from './stream';

export function deserializeSnapshot(snapshot: Uint8Array): SnapshotView {
  const coins: Coin[][] = [];
  const winnerId = u64FromBigEndianBytes(snapshot.slice(1, 9));
  const columns = u64FromBigEndianBytes(snapshot.slice(9, 17));
  const rows = u64FromBigEndianBytes(snapshot.slice(17, 25));

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

      newColumn.push({ color: Color.deserialize(coin) });
    }
    coins.push(newColumn);
  }

  return { type: PayloadType.SNAPSHOT, coins, winnerId, columns, rows };
}

export function u64FromBigEndianBytes(array: Uint8Array) {
  const view = new DataView(array.buffer, 0);
  return view.getBigUint64(0);
}

export function u64ToBigEndianBytes(input: bigint): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);

  view.setBigInt64(0, input);

  const byteArray = new Uint8Array(buffer);

  return byteArray;
}
